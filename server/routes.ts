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

      // Note: The actual Well Seeker Pro API endpoint for wells list is not documented
      // Using mock data until the correct endpoint is configured
      // TODO: Update with actual Well Seeker Pro API endpoint once available
      const wells: Well[] = [
        { id: '1', jobNum: 'ddmt-140146', actualWell: 'Limousin 6-3H2', rig: 'Nabors 784', operator: 'Continental Resources', wellStatus: 'EOW Sent' },
        { id: '2', jobNum: 'TEST-55555', actualWell: 'Test Well 5', rig: 'Test Rig 123', operator: 'Test Operator', wellStatus: 'N/A' },
        { id: '3', jobNum: 'TEST-44444', actualWell: 'Test Well 4', rig: 'Test Rig 123', operator: 'Test Operator', wellStatus: 'N/A' },
        { id: '4', jobNum: 'POCO-Prueba', actualWell: 'Ahora Valles - Wellbore 1', rig: 'MSES', operator: 'Addison Resources', wellStatus: 'N/A' },
        { id: '5', jobNum: 'MSPA-85479', actualWell: 'Circle H 105HC - Wellbore 1', rig: 'Patterson 572', operator: 'Chesapeake Appalachia, L.L.C.', wellStatus: 'EOW Sent' },
      ];

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

      // TODO: Update with actual Well Seeker Pro API endpoint once available
      const wellDetails: WellDetails = {
        wellName: 'Limousin 6-3H2',
        jobNumber: 'ddmt-140146',
        operator: 'Continental Resources',
        rig: 'Nabors 784',
        latitude: '48.76',
        longitude: '-102.572189',
        depthIn: '8,477',
        depthOut: '8,477',
        totalFootage: '6,590',
        magCorrection: '7.580',
        gridConv: '-1.542',
        btotal: '56508.3',
        vs: '267.480',
        dec: '7.58',
        dip: '73.10'
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

      // TODO: Update with actual Well Seeker Pro API endpoint once available
      const bhaComponents: BHAComponent[] = [
        { num: 1, bha: 0, description: '8 3/4 Security FXGSD', nm: 'N', id: '0.00', od: '8.75', length: '1.00', toBit: '1.00' },
        { num: 2, bha: 0, description: '6 3/4 7/8 5 7stg fxd @ 1.83°', nm: 'N', id: '0.00', od: '7.00', length: '25.40', toBit: '27.40' },
        { num: 3, bha: 0, description: 'UBHO', nm: 'Y', id: '3.13', od: '6.38', length: '3.47', toBit: '30.87' },
        { num: 4, bha: 0, description: 'NMDC', nm: 'Y', id: '2.88', od: '6.00', length: '29.46', toBit: '60.33' },
        { num: 5, bha: 0, description: 'NMDC', nm: 'Y', id: '2.81', od: '5.88', length: '28.53', toBit: '88.86' },
        { num: 6, bha: 0, description: 'X/O', nm: 'N', id: '2.88', od: '6.50', length: '3.26', toBit: '92.12' },
        { num: 7, bha: 0, description: '±5 HWDP', nm: 'N', id: '2.50', od: '6.50', length: '1375.24', toBit: '1467.36' },
      ];

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

      // TODO: Update with actual Well Seeker Pro API endpoint once available
      const parameters: DrillingParameters = {
        plugIn: '1/0/00 0:00',
        timeIn: '1/0/00 0:00',
        timeOut: '3/30/14 17:45',
        unplug: '1/0/00 0:00',
        depthIn: '8,477',
        depthOut: '8,477',
        totalFootage: '6,590',
        drillHours: '75.25',
        operHours: '100149.75',
        circHrs: '0.00',
        pluggedHrs: '0.00',
        bha: 1,
        mwd: 0,
        retrievable: 0,
        reasonPOOH: 'Change BHA'
      };

      res.json(parameters);
    } catch (error) {
      console.error("Error fetching drilling parameters:", error);
      res.status(500).json({ error: "Failed to fetch drilling parameters" });
    }
  });

  app.get("/api/wells/:wellId/tool-components", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { wellId } = req.params;

      // TODO: Update with actual Well Seeker Pro API endpoint once available
      const components: ToolComponent[] = [
        { name: 'UBHO', sn: '65207', snOverride: '', lih: 'Depth In: 1,887', failure: 'None', npt: '0.00' },
        { name: 'MuleShoe', sn: 'NA', snOverride: '', lih: 'Depth Out: 8,477', failure: 'None', npt: '0.00' },
        { name: 'Helix', sn: '0', snOverride: '', lih: 'Total: 6,590', failure: 'None', npt: '0.00' },
        { name: 'Pulser', sn: '0', snOverride: '', lih: '(Circ Hrs: 2.83)', failure: 'None', npt: '0.00' },
        { name: 'Gamma', sn: '0', snOverride: '', lih: 'Drill Hrs: 72.42', failure: 'None', npt: '0.00' },
        { name: 'SEA', sn: '0', snOverride: '', lih: 'Total: 22.00', failure: 'None', npt: '0.00' },
        { name: 'Battery', sn: '0', snOverride: '', lih: '', failure: 'None', npt: '0.00' },
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
