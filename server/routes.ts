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

  // Helper function to get Well Seeker Pro auth token using session credentials
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

    // Get credentials from session
    const credentials = req.session.wellSeekerCredentials;
    if (!credentials) {
      throw new Error("Well Seeker Pro credentials not found in session");
    }

    // Authenticate with Well Seeker Pro API
    const authRequest: WellSeekerAuthRequest = {
      userName: credentials.userName,
      password: credentials.password,
      productKey: credentials.productKey,
    };

    const response = await fetch("https://www.icpwebportal.com/api/authToken", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(authRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Well Seeker Pro authentication failed: ${errorText}`);
    }

    const authResponse: WellSeekerAuthResponse = await response.json();
    
    // Cache the token in session
    req.session.wellSeekerToken = authResponse.access_token;

    return authResponse.access_token;
  }

  // Helper function to make authenticated API calls to Well Seeker Pro
  async function callWellSeekerAPI<T>(req: any, endpoint: string): Promise<T> {
    const token = await getWellSeekerToken(req);

    const response = await fetch(`https://www.icpwebportal.com/api/${endpoint}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.status === 401) {
      // Token expired, clear session token and retry once
      req.session.wellSeekerToken = undefined;
      const newToken = await getWellSeekerToken(req);
      
      const retryResponse = await fetch(`https://www.icpwebportal.com/api/${endpoint}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${newToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!retryResponse.ok) {
        throw new Error(`Well Seeker Pro API error: ${retryResponse.statusText}`);
      }

      return retryResponse.json();
    }

    if (!response.ok) {
      throw new Error(`Well Seeker Pro API error: ${response.statusText}`);
    }

    return response.json();
  }

  // Authentication endpoints
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      // Get product key from environment
      const productKey = process.env.WELLSEEKER_PRODUCT_KEY;
      if (!productKey) {
        console.error("WELLSEEKER_PRODUCT_KEY not configured");
        return res.status(500).json({ error: "Server configuration error. Please contact support." });
      }

      // Store credentials in session
      req.session.wellSeekerCredentials = {
        userName: email,
        password: password,
        productKey: productKey,
      };

      // Validate credentials by attempting to get a Well Seeker Pro token
      // This verifies the user has valid Well Seeker Pro access
      try {
        req.session.wellSeekerToken = undefined; // Clear any cached token
        await getWellSeekerToken(req); // This will throw if credentials are invalid
        
        // If successful, create session
        req.session.userId = email;
        req.session.userEmail = email;

        res.json({ success: true, email });
      } catch (error) {
        console.error("Well Seeker Pro authentication failed:", error);
        // Clear credentials from session on failure
        req.session.wellSeekerCredentials = undefined;
        return res.status(401).json({ error: "Invalid Well Seeker Pro credentials" });
      }
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

      const wellsData = await callWellSeekerAPI<any[]>(req, "wellList");
      
      // Transform Well Seeker Pro API response to our Well format
      const wells: Well[] = wellsData.map((well, index) => ({
        id: well.jobNumber || String(index + 1),
        jobNum: well.jobNumber || '',
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

      const wellData = await callWellSeekerAPI<any>(req, `wellDetails/${wellId}`);
      
      // Transform Well Seeker Pro API response to our WellDetails format
      const wellDetails: WellDetails = {
        wellName: wellData.wellName || wellData.actualWell || '',
        jobNumber: wellData.jobNumber || wellId,
        operator: wellData.operator || '',
        rig: wellData.rig || '',
        latitude: wellData.latitude || wellData.lat || '',
        longitude: wellData.longitude || wellData.lon || '',
        depthIn: wellData.depthIn || '',
        depthOut: wellData.depthOut || '',
        totalFootage: wellData.totalFootage || '',
        magCorrection: wellData.magCorrection || wellData.magCorr || '',
        gridConv: wellData.gridConv || wellData.gridConvergence || '',
        btotal: wellData.btotal || wellData.bTotal || '',
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

      const bhaData = await callWellSeekerAPI<any[]>(req, `wells/${wellId}/bha/${bhaNumber}`);
      
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

      const paramsData = await callWellSeekerAPI<any>(req, `wells/${wellId}/drillingParameters`);
      
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

      const bhaRunsData = await callWellSeekerAPI<any[]>(req, `wells/${wellId}/bhaRuns`);
      
      // Transform to array of BHA run numbers
      const bhaRuns = bhaRunsData.map((run, index) => run.bhaNumber || run.runNumber || index);

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

      const componentsData = await callWellSeekerAPI<any[]>(req, `wells/${wellId}/toolComponents`);
      
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
