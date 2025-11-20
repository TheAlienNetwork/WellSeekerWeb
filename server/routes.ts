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
    if (!providedToken) {
      throw new Error("WELLSEEKER_ACCESS_TOKEN is not configured in Secrets. Please add it to continue.");
    }

    console.log("Using WELLSEEKER_ACCESS_TOKEN from environment");
    return providedToken;
  }

  // Helper function to make authenticated API calls to Well Seeker Pro
  async function callWellSeekerAPI<T>(req: any, endpoint: string): Promise<T> {
    const token = await getWellSeekerToken(req);
    const productKey = "02c041de-9058-443e-ad5d-76475b3e7a74";
    
    // Add productKey query parameter
    const separator = endpoint.includes('?') ? '&' : '?';
    const apiUrl = `https://www.icpwebportal.com/api/${endpoint}${separator}productKey=${productKey}`;

    console.log(`Calling Well Seeker API: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
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

      // Call wells endpoint with POST method and required parameters
      const token = await getWellSeekerToken(req);
      const productKey = "02c041de-9058-443e-ad5d-76475b3e7a74";
      
      const response = await fetch("https://www.icpwebportal.com/api/wells", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          userName: req.session.userEmail || '',
          productKey: productKey,
          getFootage: 'true',
          databaseOrg: ''
        }).toString(),
      });

      console.log(`Wells API Response Status: ${response.status} ${response.statusText}`);

      if (response.status === 401) {
        const errorBody = await response.text();
        console.error(`Wells API 401 Error: ${errorBody}`);
        throw new Error(`Authentication failed: The WELLSEEKER_ACCESS_TOKEN is invalid or expired. Please update it in Secrets.`);
      }

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Wells API Error Response: ${errorBody}`);
        throw new Error(`Well Seeker Pro API error: ${response.statusText}`);
      }

      const wellsData = await response.json();
      console.log(`Wells API Response Data:`, JSON.stringify(wellsData).substring(0, 200) + '...');

      // Transform Well Seeker Pro API response to our Well format
      const wells: Well[] = Array.isArray(wellsData) ? wellsData.map((well, index) => ({
        id: well.id ? String(well.id) : (well.jobNum ? `${well.jobNum}-${index}` : String(index + 1)),
        jobNum: well.jobNum || '',
        actualWell: well.actualWell || well.wellName || '',
        rig: well.rig || '',
        operator: well.operator || '',
        wellStatus: well.wellStatus || 'N/A',
      })) : [];

      res.json(wells);
    } catch (error) {
      console.error("Error fetching wells:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: `Failed to fetch wells: ${errorMessage}` });
    }
  });

  app.get("/api/wells/:wellId", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { wellId } = req.params;

      // Get the well details to find the actualWell name
      const token = await getWellSeekerToken(req);
      const productKey = "02c041de-9058-443e-ad5d-76475b3e7a74";
      
      const wellsResponse = await fetch("https://www.icpwebportal.com/api/wells", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          userName: req.session.userEmail || '',
          productKey: productKey,
          getFootage: 'true',
          databaseOrg: ''
        }).toString(),
      });

      if (!wellsResponse.ok) {
        throw new Error("Failed to fetch wells list");
      }

      const wellsData = await wellsResponse.json();
      const selectedWell = Array.isArray(wellsData) 
        ? wellsData.find(w => String(w.id) === wellId || String(w.jobNum) === wellId)
        : null;

      if (!selectedWell || !selectedWell.actualWell) {
        throw new Error("Well not found or actualWell name missing");
      }

      const wellName = selectedWell.actualWell;

      // Call getWellInfo endpoint
      const wellInfoResponse = await fetch("https://www.icpwebportal.com/api/well/wellInfo/getWellInfo", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          userName: req.session.userEmail || '',
          wellName: wellName,
          productKey: productKey
        }).toString(),
      });

      if (!wellInfoResponse.ok) {
        throw new Error(`Failed to fetch well info: ${wellInfoResponse.statusText}`);
      }

      const wellData = await wellInfoResponse.json();

      // Transform Well Seeker Pro API response to our WellDetails format
      const wellDetails: WellDetails = {
        wellName: wellData.actualWell || wellName,
        jobNumber: wellData.jobNum || selectedWell.jobNum || '',
        operator: wellData.operator || selectedWell.operator || '',
        rig: wellData.rig || selectedWell.rig || '',
        latitude: wellData.lat || '',
        longitude: wellData.lon || '',
        depthIn: wellData.depthIn || '',
        depthOut: wellData.depthOut || '',
        totalFootage: wellData.totalFootage || '',
        magCorrection: wellData.magCorr || '',
        gridConv: wellData.gridConv || '',
        btotal: wellData.bTotal || '',
        vs: wellData.vs || '',
        dec: wellData.dec || '',
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

      // First get the well details to find the actualWell name
      const token = await getWellSeekerToken(req);
      const productKey = "02c041de-9058-443e-ad5d-76475b3e7a74";
      
      // Get wells list to find the actualWell name for this wellId
      const wellsResponse = await fetch("https://www.icpwebportal.com/api/wells", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          userName: req.session.userEmail || '',
          productKey: productKey,
          getFootage: 'true',
          databaseOrg: ''
        }).toString(),
      });

      if (!wellsResponse.ok) {
        throw new Error("Failed to fetch wells list");
      }

      const wellsData = await wellsResponse.json();
      const selectedWell = Array.isArray(wellsData) 
        ? wellsData.find(w => String(w.id) === wellId || String(w.jobNum) === wellId)
        : null;

      if (!selectedWell || !selectedWell.actualWell) {
        throw new Error("Well not found or actualWell name missing");
      }

      const wellName = selectedWell.actualWell;

      // Call getBha endpoint with wellName and bhaNum
      const bhaResponse = await fetch("https://www.icpwebportal.com/api/well/drillString/getBha", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          userName: req.session.userEmail || '',
          wellName: wellName,
          bhaNum: bhaNumber,
          productKey: productKey
        }).toString(),
      });

      if (!bhaResponse.ok) {
        const errorBody = await bhaResponse.text();
        console.error(`BHA API Error: ${errorBody}`);
        throw new Error(`Failed to fetch BHA: ${bhaResponse.statusText}`);
      }

      const bhaData = await bhaResponse.json();

      // Transform Well Seeker Pro API response to our BHAComponent format
      const bhaComponents: BHAComponent[] = Array.isArray(bhaData) ? bhaData.map((component, index) => ({
        num: component.num || component.number || index + 1,
        bha: component.bha || parseInt(bhaNumber, 10),
        description: component.description || component.desc || '',
        nm: component.nm || component.nonMagnetic || 'N',
        id: component.id || component.innerDiameter || '0.00',
        od: component.od || component.outerDiameter || '0.00',
        length: component.length || component.len || '0.00',
        toBit: component.toBit || component.distanceToBit || '0.00'
      })) : [];

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
      const bhaNumber = runNum || '0';

      // Get the well details to find the actualWell name
      const token = await getWellSeekerToken(req);
      const productKey = "02c041de-9058-443e-ad5d-76475b3e7a74";
      
      const wellsResponse = await fetch("https://www.icpwebportal.com/api/wells", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          userName: req.session.userEmail || '',
          productKey: productKey,
          getFootage: 'true',
          databaseOrg: ''
        }).toString(),
      });

      if (!wellsResponse.ok) {
        throw new Error("Failed to fetch wells list");
      }

      const wellsData = await wellsResponse.json();
      const selectedWell = Array.isArray(wellsData) 
        ? wellsData.find(w => String(w.id) === wellId || String(w.jobNum) === wellId)
        : null;

      if (!selectedWell || !selectedWell.actualWell) {
        throw new Error("Well not found or actualWell name missing");
      }

      const wellName = selectedWell.actualWell;

      // Call getBhaHeaders to get drilling parameters
      const headersResponse = await fetch("https://www.icpwebportal.com/api/well/drillString/getBhaHeaders", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          userName: req.session.userEmail || '',
          wellName: wellName,
          productKey: productKey
        }).toString(),
      });

      if (!headersResponse.ok) {
        throw new Error(`Failed to fetch BHA headers: ${headersResponse.statusText}`);
      }

      const headersData = await headersResponse.json();
      
      // Find the specific BHA header or use the first one
      const bhaHeader = Array.isArray(headersData) 
        ? headersData.find(h => String(h.bhaNum || h.bha) === bhaNumber) || headersData[0]
        : headersData;

      // Transform Well Seeker Pro API response to our DrillingParameters format
      const parameters: DrillingParameters = {
        plugIn: bhaHeader.plugIn || '',
        timeIn: bhaHeader.timeIn || '',
        timeOut: bhaHeader.timeOut || '',
        unplug: bhaHeader.unplug || '',
        depthIn: bhaHeader.depthIn || '',
        depthOut: bhaHeader.depthOut || '',
        totalFootage: bhaHeader.totalFootage || '',
        drillHours: bhaHeader.drillingHrs || bhaHeader.drillHours || '',
        operHours: bhaHeader.operHours || '',
        circHrs: bhaHeader.circHrs || '',
        pluggedHrs: bhaHeader.pluggedHrs || '',
        bha: bhaHeader.bhaNum || bhaHeader.bha || 0,
        mwd: bhaHeader.mwd || 0,
        retrievable: bhaHeader.retrievable || 0,
        reasonPOOH: bhaHeader.reasonPOOH || bhaHeader.pooh || ''
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

      // Get the well details to find the actualWell name
      const token = await getWellSeekerToken(req);
      const productKey = "02c041de-9058-443e-ad5d-76475b3e7a74";
      
      const wellsResponse = await fetch("https://www.icpwebportal.com/api/wells", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          userName: req.session.userEmail || '',
          productKey: productKey,
          getFootage: 'true',
          databaseOrg: ''
        }).toString(),
      });

      if (!wellsResponse.ok) {
        throw new Error("Failed to fetch wells list");
      }

      const wellsData = await wellsResponse.json();
      const selectedWell = Array.isArray(wellsData) 
        ? wellsData.find(w => String(w.id) === wellId || String(w.jobNum) === wellId)
        : null;

      if (!selectedWell || !selectedWell.actualWell) {
        return res.json([0]);
      }

      const wellName = selectedWell.actualWell;

      // Call getBhaHeaders to get all BHA runs
      const headersResponse = await fetch("https://www.icpwebportal.com/api/well/drillString/getBhaHeaders", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          userName: req.session.userEmail || '',
          wellName: wellName,
          productKey: productKey
        }).toString(),
      });

      if (!headersResponse.ok) {
        return res.json([0]);
      }

      const headersData = await headersResponse.json();

      // Extract BHA numbers from headers
      const bhaRuns = Array.isArray(headersData) 
        ? headersData.map((header, index) => header.bhaNum || header.bha || index)
        : [0];

      res.json(bhaRuns);
    } catch (error) {
      console.error("Error fetching BHA runs:", error);
      res.json([0]);
    }
  });

  app.get("/api/wells/:wellId/tool-components", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { wellId } = req.params;
      const { runNum } = req.query;
      const bhaNumber = runNum || '0';

      // Get the well details to find the actualWell name
      const token = await getWellSeekerToken(req);
      const productKey = "02c041de-9058-443e-ad5d-76475b3e7a74";
      
      const wellsResponse = await fetch("https://www.icpwebportal.com/api/wells", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          userName: req.session.userEmail || '',
          productKey: productKey,
          getFootage: 'true',
          databaseOrg: ''
        }).toString(),
      });

      if (!wellsResponse.ok) {
        throw new Error("Failed to fetch wells list");
      }

      const wellsData = await wellsResponse.json();
      const selectedWell = Array.isArray(wellsData) 
        ? wellsData.find(w => String(w.id) === wellId || String(w.jobNum) === wellId)
        : null;

      if (!selectedWell || !selectedWell.actualWell) {
        throw new Error("Well not found or actualWell name missing");
      }

      const wellName = selectedWell.actualWell;

      // Call getBha endpoint to get tool component data
      const bhaResponse = await fetch("https://www.icpwebportal.com/api/well/drillString/getBha", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          userName: req.session.userEmail || '',
          wellName: wellName,
          bhaNum: bhaNumber,
          productKey: productKey
        }).toString(),
      });

      if (!bhaResponse.ok) {
        throw new Error(`Failed to fetch BHA data: ${bhaResponse.statusText}`);
      }

      const bhaData = await bhaResponse.json();
      console.log('BHA Data for tool components:', JSON.stringify(bhaData).substring(0, 500));

      // Extract tool component information from BHA data
      // The API might return an array or object, handle both cases
      const bhaInfo = Array.isArray(bhaData) ? bhaData[0] : bhaData;

      const components: ToolComponent[] = [
        { name: 'Svy Offset', sn: String(bhaInfo?.svyOffset || bhaInfo?.SvyOffset || '0'), snOverride: '', lih: '', failure: 'None', npt: '0.00' },
        { name: 'Gam Offset', sn: String(bhaInfo?.gamOffset || bhaInfo?.GamOffset || '0'), snOverride: '', lih: '', failure: 'None', npt: '0.00' },
        { name: 'Stickup', sn: String(bhaInfo?.stickup || bhaInfo?.Stickup || '0'), snOverride: '', lih: '', failure: 'None', npt: '0.00' },
        { name: 'Retrievable', sn: String(bhaInfo?.retrievable || bhaInfo?.Retrievable || '0'), snOverride: '', lih: '', failure: 'None', npt: '0.00' },
        { name: 'Pin To Set Screw (WSX fix)', sn: String(bhaInfo?.pinToSetScrew || bhaInfo?.PinToSetScrew || '0'), snOverride: '', lih: '', failure: 'None', npt: '0.00' },
        { name: 'Probe Order', sn: String(bhaInfo?.probeOrder || bhaInfo?.ProbeOrder || '0'), snOverride: '', lih: '', failure: 'None', npt: '0.00' },
        { name: 'Itemized BHA', sn: 'See BHA tab', snOverride: '', lih: '', failure: 'None', npt: '0.00' },
        { name: 'MWD Make', sn: bhaInfo?.mwdMake || bhaInfo?.MwdMake || '', snOverride: '', lih: '', failure: 'None', npt: '0.00' },
        { name: 'MWD Model', sn: bhaInfo?.mwdModel || bhaInfo?.MwdModel || '', snOverride: '', lih: '', failure: 'None', npt: '0.00' },
        { name: 'UBHO SN', sn: String(bhaInfo?.ubhoSN || bhaInfo?.UbhoSN || bhaInfo?.ubhoSn || '65207'), snOverride: '', lih: '', failure: 'None', npt: '0.00' },
        { name: 'Helix SN', sn: String(bhaInfo?.helixSN || bhaInfo?.HelixSN || bhaInfo?.helixSn || '0'), snOverride: '', lih: '', failure: 'None', npt: '0.00' },
        { name: 'Helix Type', sn: String(bhaInfo?.helixType || bhaInfo?.HelixType || '0'), snOverride: '', lih: '', failure: 'None', npt: '0.00' },
        { name: 'Pulser SN', sn: String(bhaInfo?.pulserSN || bhaInfo?.PulserSN || bhaInfo?.pulserSn || '0'), snOverride: '', lih: '', failure: 'None', npt: '0.00' },
        { name: 'Gamma SN', sn: String(bhaInfo?.gammaSN || bhaInfo?.GammaSN || bhaInfo?.gammaSn || '0'), snOverride: '', lih: '', failure: 'None', npt: '0.00' },
        { name: 'Directional SN', sn: bhaInfo?.directionalSN || bhaInfo?.DirectionalSN || bhaInfo?.directionalSn || '', snOverride: '', lih: '', failure: 'None', npt: '0.00' },
        { name: 'Battery SN', sn: String(bhaInfo?.batterySN || bhaInfo?.BatterySN || bhaInfo?.batterySn || '0'), snOverride: '', lih: '', failure: 'None', npt: '0.00' },
        { name: 'Battery SN', sn: String(bhaInfo?.batterySN2 || bhaInfo?.BatterySN2 || bhaInfo?.batterySn2 || '0'), snOverride: '', lih: '', failure: 'None', npt: '0.00' },
        { name: 'Shock Tool SN', sn: String(bhaInfo?.shockToolSN || bhaInfo?.ShockToolSN || bhaInfo?.shockToolSn || '0'), snOverride: '', lih: '', failure: 'None', npt: '0.00' },
      ];

      res.json(components);
    } catch (error) {
      console.error("Error fetching tool components:", error);
      res.status(500).json({ error: "Failed to fetch tool components" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}