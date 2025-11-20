import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import type { WellSeekerAuthRequest, WellSeekerAuthResponse, Well, WellDetails, BHAComponent, DrillingParameters, ToolComponent } from "@shared/schema";

// Extend session data type
declare module 'express-session' {
  interface SessionData {
    userId?: string;
    userEmail?: string;
    wellSeekerCredentials?: {
      userName: string;
      password: string;
      productKey: string;
    };
    wellSeekerToken?: string;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "wellseeker-dev-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
      },
    })
  );

  // Helper function to get Well Seeker Pro auth token
  async function getWellSeekerToken(req: any): Promise<string> {
    // Check if we have a provided access token from environment
    const providedToken = process.env.WELLSEEKER_ACCESS_TOKEN;
    if (providedToken) {
      return providedToken;
    }

    // Check if we have a cached token in the session
    if (req.session.wellSeekerToken) {
      return req.session.wellSeekerToken;
    }

    throw new Error("No access token available. Please configure WELLSEEKER_ACCESS_TOKEN in secrets.");
  }

  // Helper function to make authenticated API calls to Well Seeker Pro
  async function callWellSeekerAPI<T>(req: any, endpoint: string): Promise<T> {
    const token = await getWellSeekerToken(req);
    const apiUrl = `https://www.icpwebportal.com/api/${endpoint}`;

    console.log(`Calling Well Seeker API: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    console.log(`API Response Status: ${response.status} ${response.statusText}`);

    if (response.status === 401) {
      // Token expired, try to refresh using refresh token
      const refreshToken = process.env.WELLSEEKER_REFRESH_TOKEN;
      if (refreshToken) {
        try {
          const refreshResponse = await fetch("https://www.icpwebportal.com/api/authToken/refresh", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });

          if (refreshResponse.ok) {
            const authResponse: WellSeekerAuthResponse = await refreshResponse.json();
            req.session.wellSeekerToken = authResponse.access_token;

            // Retry original request with new token
            const retryResponse = await fetch(`https://www.icpwebportal.com/api/${endpoint}`, {
              method: "GET",
              headers: {
                "Authorization": `Bearer ${authResponse.access_token}`,
                "Content-Type": "application/json",
              },
            });

            if (retryResponse.ok) {
              return retryResponse.json();
            }
          }
        } catch (refreshError) {
          console.error("Token refresh failed:", refreshError);
        }
      }
      
      throw new Error("Authentication token expired. Please update WELLSEEKER_ACCESS_TOKEN in Secrets.");
    }

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`API Error Response Body: ${errorBody}`);
      throw new Error(`Well Seeker Pro API error: ${response.statusText} - ${errorBody}`);
    }

    const data = await response.json();
    console.log(`API Response Data:`, JSON.stringify(data).substring(0, 200) + '...');
    return data;
  }

  // Authentication endpoints
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      // Check if access token is configured
      const accessToken = process.env.WELLSEEKER_ACCESS_TOKEN;
      if (!accessToken) {
        console.error("WELLSEEKER_ACCESS_TOKEN not configured in environment");
        return res.status(500).json({ 
          error: "Well Seeker Pro API token not configured. Please restart the application after adding WELLSEEKER_ACCESS_TOKEN to Secrets." 
        });
      }

      console.log("Access token found, creating session for:", email);

      // Simple session creation - token is already validated
      req.session.userId = email;
      req.session.userEmail = email;

      res.json({ success: true, email });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    res.json({ email: req.session.userEmail });
  });

  // Well Seeker Pro API endpoints
  app.get("/api/wells", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Use the correct endpoint from API documentation
      const wellsData = await callWellSeekerAPI<any[]>(req, "JobList");
      
      // Transform Well Seeker Pro API response to our Well format
      const wells: Well[] = wellsData.map((well, index) => ({
        id: well.jobNum || String(index + 1),
        jobNum: well.jobNum || '',
        actualWell: well.actualWell || well.wellName || '',
        rig: well.rig || '',
        operator: well.operator || '',
        wellStatus: well.wellStatus || 'N/A',
      }));

      res.json(wells);
    } catch (error) {
      console.error("Error fetching wells:", error);
      res.status(500).json({ error: "Failed to fetch wells" });
    }
  });

  app.get("/api/wells/:wellId", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { wellId } = req.params;

      const wellData = await callWellSeekerAPI<any>(req, `Job/${wellId}`);
      
      // Transform Well Seeker Pro API response to our WellDetails format
      const wellDetails: WellDetails = {
        wellName: wellData.actualWell || wellData.wellName || '',
        jobNumber: wellData.jobNum || wellId,
        operator: wellData.operator || '',
        rig: wellData.rig || '',
        latitude: wellData.lat || wellData.latitude || '',
        longitude: wellData.lon || wellData.longitude || '',
        depthIn: wellData.depthIn || '',
        depthOut: wellData.depthOut || '',
        totalFootage: wellData.totalFootage || '',
        magCorrection: wellData.magCorr || wellData.magCorrection || '',
        gridConv: wellData.gridConv || wellData.gridConvergence || '',
        btotal: wellData.bTotal || wellData.btotal || '',
        vs: wellData.vs || '',
        dec: wellData.dec || wellData.declination || '',
        dip: wellData.dip || ''
      };

      res.json(wellDetails);
    } catch (error) {
      console.error("Error fetching well details:", error);
      res.status(500).json({ error: "Failed to fetch well details" });
    }
  });

  app.get("/api/wells/:wellId/bha/:bhaNumber", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { wellId, bhaNumber } = req.params;

      const bhaData = await callWellSeekerAPI<any[]>(req, `BHA/${wellId}/${bhaNumber}`);
      
      // Transform Well Seeker Pro API response to our BHAComponent format
      const bhaComponents: BHAComponent[] = bhaData.map((component, index) => ({
        num: component.num || component.number || index + 1,
        bha: component.bha || parseInt(bhaNumber, 10),
        description: component.description || component.desc || '',
        nm: component.nm || component.nonMagnetic || 'N',
        id: component.id || component.innerDiameter || '0.00',
        od: component.od || component.outerDiameter || '0.00',
        length: component.length || component.len || '0.00',
        toBit: component.toBit || component.distanceToBit || '0.00'
      }));

      res.json(bhaComponents);
    } catch (error) {
      console.error("Error fetching BHA components:", error);
      res.status(500).json({ error: "Failed to fetch BHA components" });
    }
  });

  app.get("/api/wells/:wellId/drilling-parameters", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { wellId } = req.params;
      const { runNum } = req.query;

      // For drilling parameters, we need a run number - default to latest run
      const runNumber = runNum || '0';
      const paramsData = await callWellSeekerAPI<any>(req, `Run/${wellId}/${runNumber}`);
      
      // Transform Well Seeker Pro API response to our DrillingParameters format
      const parameters: DrillingParameters = {
        plugIn: paramsData.plugIn || paramsData.plugInTime || '',
        timeIn: paramsData.timeIn || '',
        timeOut: paramsData.timeOut || '',
        unplug: paramsData.unplug || paramsData.unplugTime || '',
        depthIn: paramsData.depthIn || '',
        depthOut: paramsData.depthOut || '',
        totalFootage: paramsData.totalFootage || paramsData.footage || '',
        drillHours: paramsData.drillHours || paramsData.drillingHours || '',
        operHours: paramsData.operHours || paramsData.operatingHours || '',
        circHrs: paramsData.circHrs || paramsData.circulationHours || '',
        pluggedHrs: paramsData.pluggedHrs || paramsData.pluggedHours || '',
        bha: paramsData.bha || 0,
        mwd: paramsData.mwd || 0,
        retrievable: paramsData.retrievable || 0,
        reasonPOOH: paramsData.reasonPOOH || paramsData.pullOutReason || ''
      };

      res.json(parameters);
    } catch (error) {
      console.error("Error fetching drilling parameters:", error);
      res.status(500).json({ error: "Failed to fetch drilling parameters" });
    }
  });

  app.get("/api/wells/:wellId/bha-runs", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { wellId } = req.params;

      const bhaRunsData = await callWellSeekerAPI<any[]>(req, `RunList/${wellId}`);
      
      // Transform to array of BHA run numbers
      const bhaRuns = bhaRunsData.map((run, index) => run.runNum || run.bhaNumber || run.runNumber || index);

      res.json(bhaRuns);
    } catch (error) {
      console.error("Error fetching BHA runs:", error);
      // Return default if API doesn't support this endpoint yet
      res.json([0, 1, 2]);
    }
  });

  app.get("/api/wells/:wellId/tool-components", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { wellId } = req.params;
      const { runNum } = req.query;

      // Tool components require a run number - default to latest run
      const runNumber = runNum || '0';
      const componentsData = await callWellSeekerAPI<any[]>(req, `ToolComponents/${wellId}/${runNumber}`);
      
      // Transform Well Seeker Pro API response to our ToolComponent format
      const components: ToolComponent[] = componentsData.map(component => ({
        name: component.name || component.toolName || '',
        sn: component.sn || component.serialNumber || '',
        snOverride: component.snOverride || component.serialNumberOverride || '',
        lih: component.lih || component.lifeInHole || '',
        failure: component.failure || component.failureMode || 'None',
        npt: component.npt || component.nonProductiveTime || '0.00'
      }));

      res.json(components);
    } catch (error) {
      console.error("Error fetching tool components:", error);
      res.status(500).json({ error: "Failed to fetch tool components" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
