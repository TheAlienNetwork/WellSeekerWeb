import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import type { WellSeekerAuthResponse, Well, WellDetails, BHAComponent, DrillingParameters, ToolComponent } from "@shared/schema";

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
    wellSeekerRefreshToken?: string;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "peeker-dev-secret",
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
    // Debug session data
    console.log("Session ID:", req.sessionID);
    console.log("Session data:", JSON.stringify(req.session, null, 2));
    console.log("Session wellSeekerToken exists:", !!req.session.wellSeekerToken);

    // Use session token if available
    if (req.session.wellSeekerToken) {
      console.log("Using Well Seeker token from session");
      return req.session.wellSeekerToken;
    }

    // Fallback to environment token (for backward compatibility)
    const providedToken = process.env.WELLSEEKER_ACCESS_TOKEN;
    if (providedToken) {
      console.log("Using WELLSEEKER_ACCESS_TOKEN from environment");
      return providedToken;
    }

    throw new Error("No authentication token available. Please log in.");
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
      const { email, password, directToken } = req.body;

      // Allow direct token input (bypass authentication)
      if (directToken && directToken.length > 50) {
        console.log("Using direct token input (bypassing authentication)");
        console.log("Token length:", directToken.length);
        
        // Store in session
        req.session.userId = email;
        req.session.userEmail = email;
        req.session.wellSeekerToken = directToken;
        
        req.session.save((err) => {
          if (err) {
            console.error("Error saving session:", err);
            return res.status(500).json({ error: "Failed to save session" });
          }
          console.log("Session saved with direct token for:", email);
          res.json({ success: true, email });
        });
        return;
      }

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      // Authenticate with Well Seeker Pro API to get fresh tokens
      const productKey = "02c041de-9058-443e-ad5d-76475b3e7a74";

      console.log("Attempting to authenticate with Well Seeker Pro API");
      console.log("  - userName:", email);
      console.log("  - password length:", password.length);
      console.log("  - password first char:", password.charAt(0));
      console.log("  - productKey:", productKey);

      const requestBody = new URLSearchParams({
        userName: email,
        password: password,
        productKey: productKey
      }).toString();
      
      console.log("Request body:", requestBody);

      const authResponse = await fetch("https://www.icpwebportal.com/api/authToken", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: requestBody,
      });

      if (!authResponse.ok) {
        const errorBody = await authResponse.text();
        console.error("Authentication failed:", errorBody);
        return res.status(401).json({ error: "Invalid Well Seeker Pro credentials" });
      }

      // Get raw response text first
      const rawResponseText = await authResponse.text();
      console.log("=== RAW AUTH RESPONSE TEXT ===");
      console.log(rawResponseText);
      console.log("=== END RAW RESPONSE ===");

      // Parse JSON
      const authData: any = JSON.parse(rawResponseText);

      console.log("=== PARSED AUTH RESPONSE ===");
      console.log(JSON.stringify(authData, null, 2));
      console.log("=== END PARSED RESPONSE ===");
      console.log("Auth response keys:", Object.keys(authData));
      console.log("Has access_token:", !!authData.access_token);
      console.log("access_token value:", authData.access_token);
      console.log("access_token type:", typeof authData.access_token);
      console.log("access_token stringified:", JSON.stringify(authData.access_token));
      console.log("Has error:", !!authData.error);
      console.log("Token length:", authData.access_token?.length);
      console.log("Token is empty string?:", authData.access_token === '');
      console.log("Token is null?:", authData.access_token === null);
      console.log("Token is undefined?:", authData.access_token === undefined);

      // Extract token - the API returns it as 'access_token'
      const token = authData.access_token;

      // IMPORTANT: Prioritize valid token over error fields
      // The API sometimes returns both error fields AND a valid token
      // If we have a non-empty token, authentication succeeded regardless of error fields
      if (!token || token === '') {
        console.error("Authentication failed - no valid token received");
        console.error("Error from API:", authData.error, authData.error_description);
        return res.status(401).json({ 
          error: authData.error_description || "Invalid Peeker credentials" 
        });
      }

      // We have a valid token - authentication succeeded
      console.log("Authentication successful for:", email);
      console.log("Token received, length:", token.length);
      console.log("Note: Ignoring error fields since valid token was received");

      // Store credentials and tokens in session
      req.session.userId = email;
      req.session.userEmail = email;
      req.session.wellSeekerCredentials = {
        userName: email,
        password: password,
        productKey: productKey
      };
      req.session.wellSeekerToken = token;

      // Store refresh token if available
      if (authData.refresh_token) {
        req.session.wellSeekerRefreshToken = authData.refresh_token;
        console.log("Stored new refresh token in session from login");
      }

      // Explicitly save session before responding to ensure token is available for next request
      req.session.save((err) => {
        if (err) {
          console.error("Error saving session:", err);
          return res.status(500).json({ error: "Failed to save session" });
        }
        console.log("Session saved with token for:", email);
        res.json({ success: true, email });
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Token refresh endpoint
  app.post("/api/auth/refresh-token", async (req, res) => {
    try {
      if (!req.session.wellSeekerCredentials) {
        return res.status(401).json({ error: "No saved credentials. Please log in again." });
      }

      const { userName, password, productKey } = req.session.wellSeekerCredentials;

      console.log("Refreshing token for:", userName);

      const authResponse = await fetch("https://www.icpwebportal.com/api/authToken", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          userName,
          password,
          productKey
        }).toString(),
      });

      if (!authResponse.ok) {
        const errorBody = await authResponse.text();
        console.error("Token refresh failed:", errorBody);
        // Clear session if credentials are no longer valid
        req.session.destroy(() => {});
        return res.status(401).json({ error: "Token refresh failed. Please log in again." });
      }

      const authData: WellSeekerAuthResponse = await authResponse.json();
      req.session.wellSeekerToken = authData.access_token;

      // Store new refresh token if provided
      if (authData.refresh_token) {
        req.session.wellSeekerRefreshToken = authData.refresh_token;
        console.log("Updated refresh token in session");
      }

      console.log("Token refreshed successfully for:", userName);

      // Explicitly save session before responding
      req.session.save((err) => {
        if (err) {
          console.error("Error saving session:", err);
          return res.status(500).json({ error: "Failed to save session" });
        }
        res.json({ success: true });
      });
    } catch (error) {
      console.error("Token refresh error:", error);
      res.status(500).json({ error: "Token refresh failed" });
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

  // BHA Runs endpoint
  app.get("/api/bha-runs/:wellId", async (req, res) => {
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
        console.error("Failed to fetch wells list");
        return res.status(500).json({ error: "Failed to fetch wells list from Well Seeker Pro API" });
      }

      const wellsData = await wellsResponse.json();
      
      // Extract jobNum from wellId if it's in format "job-{jobNum}-{index}"
      let wellIdToMatch = wellId;
      let jobNumToMatch = '';
      if (String(wellId).startsWith('job-')) {
        const parts = String(wellId).split('-');
        if (parts.length >= 3) {
          // Format: job-XXXX-XXXX-XXXX-{index}
          jobNumToMatch = parts.slice(1, parts.length - 1).join('-');
        }
      }
      
      const selectedWell = Array.isArray(wellsData) 
        ? wellsData.find(w => {
            const wId = String(w.id || '');
            const wJobNum = String(w.jobNum || '');
            const wActual = String(w.actualWell || '');
            
            return wId === wellIdToMatch || 
                   wJobNum === wellIdToMatch || 
                   wActual === wellIdToMatch ||
                   (jobNumToMatch && (wJobNum === jobNumToMatch || wId.includes(jobNumToMatch)));
          })
        : null;

      if (!selectedWell) {
        console.log("Well not found - wellId:", wellId, "jobNum:", jobNumToMatch);
        console.log("Available wells:", Array.isArray(wellsData) ? wellsData.slice(0, 3).map(w => ({ id: w.id, jobNum: w.jobNum, actualWell: w.actualWell })) : 'N/A');
        return res.status(404).json({ error: "Well not found" });
      }

      const wellName = selectedWell.actualWell || selectedWell.wellName || selectedWell.name || String(wellId);
      console.log(`Fetching BHA headers for well: ${wellName} (ID: ${wellId})`);

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
        console.error("Failed to fetch BHA headers");
        return res.status(500).json({ error: "Failed to fetch BHA runs from Well Seeker Pro API" });
      }

      const headersData = await headersResponse.json();
      console.log(`BHA headers raw data:`, JSON.stringify(headersData).substring(0, 500));
      
      // Check if the response is an object with a data property or directly an array
      const headers = Array.isArray(headersData) ? headersData : (headersData.data || []);

      // Transform headers to BHARun format
      const bhaRuns: any[] = headers.map((header: any, index: number) => {
        const bhaNum = header.bhaNum || header.bha || header.BhaNum || header.Bha || (index + 1);
        const runNum = header.runNum || header.RunNum || (index + 1);
        const mwdNum = header.mwd || header.mwdNum || header.Mwd || header.MwdNum || 0;
        
        return {
          id: `${wellId}-run-${bhaNum}`,
          runNumber: runNum,
          bhaNumber: bhaNum,
          mwdNumber: mwdNum,
          wellId: wellId
        };
      });

      console.log(`Fetched ${bhaRuns.length} BHA runs for well ${wellId}:`, bhaRuns.map(r => `Run ${r.runNumber}, BHA ${r.bhaNumber}`));
      res.json(bhaRuns);
    } catch (error) {
      console.error("Error fetching BHA runs:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch BHA runs";
      res.status(500).json({ error: errorMessage });
    }
  });

  // Well Dashboard Data endpoint
  app.get("/api/dashboard/well-data", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { wellId, runId } = req.query;

      if (!wellId || !runId) {
        return res.status(400).json({ error: "wellId and runId are required" });
      }

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
        return res.status(500).json({ error: "Failed to fetch wells list" });
      }

      const wellsData = await wellsResponse.json();
      
      // Extract jobNum from wellId if it's in format "job-{jobNum}-{index}"
      let wellIdToMatch = String(wellId);
      let jobNumToMatch = '';
      if (wellIdToMatch.startsWith('job-')) {
        const parts = wellIdToMatch.split('-');
        if (parts.length >= 3) {
          // Format: job-XXXX-XXXX-XXXX-{index}
          jobNumToMatch = parts.slice(1, parts.length - 1).join('-');
        }
      }
      
      const selectedWell = Array.isArray(wellsData) 
        ? wellsData.find(w => {
            const wId = String(w.id || '');
            const wJobNum = String(w.jobNum || '');
            const wActual = String(w.actualWell || '');
            
            return wId === wellIdToMatch || 
                   wJobNum === wellIdToMatch || 
                   wActual === wellIdToMatch ||
                   (jobNumToMatch && (wJobNum === jobNumToMatch || wId.includes(jobNumToMatch)));
          })
        : null;

      if (!selectedWell) {
        return res.status(404).json({ error: "Well not found" });
      }

      // Try to get well name from multiple possible fields
      const wellName = selectedWell.actualWell || selectedWell.wellName || selectedWell.name || String(wellId);
      
      if (!wellName) {
        return res.status(404).json({ error: "Could not determine well name" });
      }

      // Parse BHA number from runId - support both formats: "wellId-run-X" and direct BHA numbers
      let bhaNumber: string;
      const runIdStr = String(runId);
      if (runIdStr.includes('-run-')) {
        bhaNumber = runIdStr.split('-run-')[1] || '1';
      } else {
        // If runId is just a number or doesn't contain '-run-', use it directly
        bhaNumber = runIdStr.replace(/[^0-9]/g, '') || '1';
      }

      // Fetch well info for location and other metadata
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
        return res.status(500).json({ error: "Failed to fetch well information from Well Seeker Pro API" });
      }

      const wellInfo = await wellInfoResponse.json();

      // Call getBhaHeaders to get the specific run's data
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
        return res.status(500).json({ error: "Failed to fetch BHA headers" });
      }

      const headersData = await headersResponse.json();

      // Find the specific run by matching the BHA number
      const bhaHeader = Array.isArray(headersData) 
        ? headersData.find(h => String(h.bhaNum || h.bha) === bhaNumber)
        : headersData;

      if (!bhaHeader) {
        return res.status(404).json({ error: `BHA run ${bhaNumber} not found for well ${wellName}` });
      }

      // Fetch getBha data for component details
      let bhaDetails: any = {};
      try {
        const bhaResponse = await fetch("https://www.icpwebportal.com/api/well/drillString/getBha", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            userName: req.session.userEmail || '',
            wellName: wellName,
            bhaNum: String(bhaNumber),
            productKey: productKey
          }).toString(),
        });

        if (bhaResponse.ok) {
          const bhaData = await bhaResponse.json();
          bhaDetails = Array.isArray(bhaData) ? bhaData[0] || {} : bhaData;
        }
      } catch (err) {
        console.warn("Failed to fetch BHA details, continuing with available data");
      }

      // Fetch getMagnetics data for magnetic field information
      let magData: any = {};
      try {
        const magsResponse = await fetch("https://www.icpwebportal.com/api/well/getMagnetics", {
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

        if (magsResponse.ok) {
          const magsData = await magsResponse.json();
          // Get most recent active magnetic data
          magData = Array.isArray(magsData) 
            ? magsData.sort((a, b) => new Date(b.magDate || 0).getTime() - new Date(a.magDate || 0).getTime()).find((m: any) => m.isActive !== false) || {}
            : magsData;
          console.log('Magnetic Data retrieved:', Object.keys(magData));
        }
      } catch (err) {
        console.warn("Failed to fetch magnetic data, continuing with available data");
      }

      // Fetch motorReport data for motor/MWD information
      let motorData: any = {};
      try {
        const motorResponse = await fetch("https://www.icpwebportal.com/api/well/motorReport", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            userName: req.session.userEmail || '',
            wellName: wellName,
            bhaNum: String(bhaNumber),
            productKey: productKey
          }).toString(),
        });

        if (motorResponse.ok) {
          const motorResponseData = await motorResponse.json();
          motorData = Array.isArray(motorResponseData) ? motorResponseData[0] || {} : motorResponseData;
          console.log('Motor/MWD Data retrieved:', Object.keys(motorData));
        }
      } catch (err) {
        console.warn("Failed to fetch motor data, continuing with available data");
      }

      // Fetch actualWellData for well run information
      let wellRunData: any = {};
      try {
        const wellDataResponse = await fetch("https://www.icpwebportal.com/api/well/actualWellData", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            userName: req.session.userEmail || '',
            wellName: wellName,
            bhaNum: String(bhaNumber),
            productKey: productKey
          }).toString(),
        });

        if (wellDataResponse.ok) {
          const wellDataResponseData = await wellDataResponse.json();
          wellRunData = Array.isArray(wellDataResponseData) ? wellDataResponseData[0] || {} : wellDataResponseData;
          console.log('Well Run Data retrieved:', Object.keys(wellRunData));
        }
      } catch (err) {
        console.warn("Failed to fetch well run data, continuing with available data");
      }

      // Safe numeric conversion with fallback
      const safeNumber = (val: any, defaultVal: number = 0): number => {
        const parsed = parseFloat(val);
        return isNaN(parsed) ? defaultVal : parsed;
      };

      const safeInt = (val: any, defaultVal: number = 0): number => {
        const parsed = parseInt(val);
        return isNaN(parsed) ? defaultVal : parsed;
      };

      // Transform to WellDashboardData format using data from all endpoints
      const wellData: any = {
        wellId: String(wellId),
        runId: String(runId),
        operator: selectedWell.operator || '',
        rig: selectedWell.rig || '',
        well: selectedWell.actualWell || '',
        jobNumber: selectedWell.jobNum || '',
        wellbore: `${selectedWell.actualWell} - Wellbore 1`,
        mwdNumber: safeInt(bhaHeader.mwd || bhaHeader.mwdNum),
        bhaNumber: safeInt(bhaHeader.bhaNum || bhaHeader.bha || bhaNumber),
        section: bhaHeader.section || wellInfo.section || 'N/A',
        county: wellInfo.county || selectedWell.county || '',
        state: wellInfo.state || selectedWell.state || '',
        lat: safeNumber(wellInfo.lat || selectedWell.lat),
        long: safeNumber(wellInfo.lon || wellInfo.long || selectedWell.lon || selectedWell.long),
        northRef: (wellInfo.northRef !== false),
        vs: safeNumber(wellInfo.vs || bhaHeader.vs),
        gridConv: safeNumber(wellInfo.gridConv || bhaHeader.gridConv),
        declination: safeNumber(magData.declination || wellInfo.dec || wellInfo.declination || bhaHeader.declination),
        magField: safeNumber(magData.bTotal || magData.magField || wellInfo.bTotal || wellInfo.magField || bhaHeader.magField),
        dip: safeNumber(magData.dip || wellInfo.dip || bhaHeader.dip),
        magModel: magData.magModel || wellInfo.magModel || bhaHeader.magModel || 'User defined',
        magDate: magData.magDate || wellInfo.magDate || bhaHeader.magDate || new Date().toISOString().split('T')[0],
        plugIn: bhaHeader.plugIn || null,
        unplug: bhaHeader.unplug || null,
        timeIn: bhaHeader.timeIn || null,
        timeOut: bhaHeader.timeOut || '',
        depthIn: safeNumber(bhaHeader.depthIn),
        depthOut: safeNumber(bhaHeader.depthOut),
        circHrs: safeNumber(bhaHeader.circHrs),
        drillingHrs: safeNumber(bhaHeader.drillingHrs || bhaHeader.drillHours),
        brtHrs: safeNumber(bhaHeader.brtHrs),
        motorFail: bhaHeader.motorFail === true,
        mwdFail: bhaHeader.mwdFail === true,
        pooh: bhaHeader.pooh || bhaHeader.reasonPOOH || '',
        mwdComments: bhaHeader.mwdComments || '',
        pw: safeInt(bhaHeader.pw),
        ssq: safeInt(bhaHeader.ssq),
        tfsq: safeInt(bhaHeader.tfsq),
        crossover: safeInt(bhaHeader.crossover),
        gcf: safeInt(bhaHeader.gcf),
        dao: safeInt(bhaHeader.dao),
        surfaceSystemVersion: safeInt(bhaHeader.surfaceSystemVersion),
        svyOffset: safeNumber(bhaHeader.svyOffset),
        gamOffset: safeNumber(bhaHeader.gamOffset),
        stickup: safeNumber(bhaHeader.stickup),
        retrievable: safeNumber(bhaHeader.retrievable),
        pinToSetScrew: safeNumber(bhaHeader.pinToSetScrew),
        probeOrder: safeNumber(bhaHeader.probeOrder),
        itemizedBHA: bhaHeader.itemizedBHA || 'See BHA tab',
        mwdMake: bhaHeader.mwdMake || '',
        mwdModel: bhaHeader.mwdModel || '',
        ubhoSN: String(bhaDetails.ubhoSN || bhaDetails.ubhoSn || bhaHeader.ubhoSN || bhaHeader.ubhoSn || ''),
        helixSN: String(bhaDetails.helixSN || bhaDetails.helixSn || bhaHeader.helixSN || bhaHeader.helixSn || ''),
        helixType: String(bhaDetails.helixType || bhaHeader.helixType || ''),
        pulserSN: String(bhaDetails.pulserSN || bhaDetails.pulserSn || bhaHeader.pulserSN || bhaHeader.pulserSn || ''),
        gammaSN: String(bhaDetails.gammaSN || bhaDetails.gammaSn || bhaHeader.gammaSN || bhaHeader.gammaSn || ''),
        directionalSN: bhaDetails.directionalSN || bhaDetails.directionalSn || bhaHeader.directionalSN || bhaHeader.directionalSn || '',
        batterySN: String(bhaDetails.batterySN || bhaDetails.batterySn || bhaHeader.batterySN || bhaHeader.batterySn || ''),
        batterySN2: String(bhaDetails.batterySN2 || bhaDetails.batterySn2 || bhaHeader.batterySN2 || bhaHeader.batterySn2 || ''),
        shockToolSN: String(bhaDetails.shockToolSN || bhaDetails.shockToolSn || bhaHeader.shockToolSN || bhaHeader.shockToolSn || ''),
        lih: bhaHeader.lih === true,
        stalls: safeInt(bhaHeader.stalls),
        npt: safeNumber(bhaHeader.npt),
        mwdCoordinator: bhaHeader.mwdCoordinator || '',
        directionalCoordinator: bhaHeader.directionalCoordinator || '',
        ddLead: bhaHeader.ddLead || '',
        mwdLead: bhaHeader.mwdLead || '',
        pushTimeStamp: bhaHeader.pushTimeStamp || 'No Recent Push',
        planName: bhaHeader.planName || '',
        mwdDay: bhaHeader.mwdDay || '',
        mwdNight: bhaHeader.mwdNight || '',
        bhaDescription: bhaHeader.bhaDescription || `BHA # ${bhaNumber}`,
        apiNumber: wellInfo.apiNumber || bhaHeader.apiNumber || '',
        pulserVersion: safeInt(bhaHeader.pulserVersion),
        mwdMinTemp: safeNumber(bhaHeader.mwdMinTemp),
        mwdMaxTemp: safeNumber(bhaHeader.mwdMaxTemp),
        corrShockToolSN: bhaHeader.corrShockToolSN || '',
        totalCirculatingHours: safeNumber(bhaHeader.totalCirculatingHours || bhaHeader.circHrs),
        mudType: bhaHeader.mudType || '',
        mudWeight: bhaHeader.mudWeight || '',
        correctingMDG: bhaHeader.correctingMDG || '',
        battery3: String(bhaHeader.battery3 || ''),
        babelfishSN: String(bhaHeader.babelfishSN || bhaHeader.babelfishSn || ''),
        muleShoe: String(bhaHeader.muleShoe || ''),
      };

      res.json(wellData);
    } catch (error) {
      console.error("Error fetching well dashboard data:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch well dashboard data";
      res.status(500).json({ error: errorMessage });
    }
  });

  // Dashboard overrides endpoint
  app.post("/api/dashboard/overrides", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { wellId, runId, overrides } = req.body;

      if (!wellId || !runId || !overrides) {
        return res.status(400).json({ error: "wellId, runId, and overrides are required" });
      }

      await storage.updateWellDashboardOverrides(wellId, runId, overrides);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating dashboard overrides:", error);
      res.status(500).json({ error: "Failed to update dashboard overrides" });
    }
  });

  // MWD Survey Station POST endpoint
  app.post("/api/survey-station", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { wellName, latitude, longitude, altitudeMeters, date, model } = req.body;

      if (!wellName || latitude === undefined || longitude === undefined || !date || !model) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const token = await getWellSeekerToken(req);
      const productKey = "02c041de-9058-443e-ad5d-76475b3e7a74";

      // Call calcMagnetics endpoint to calculate magnetic values for the survey station
      const calcResponse = await fetch("https://www.icpwebportal.com/api/magnetics/calcMagnetics", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          userName: req.session.userEmail || '',
          lat: String(latitude),
          long: String(longitude),
          altitudeMeters: String(altitudeMeters),
          date: date,
          model: model,
          productKey: productKey
        }).toString(),
      });

      let calcData = {};
      if (calcResponse.ok) {
        calcData = await calcResponse.json();
        console.log("Calculated magnetic data:", calcData);
      } else {
        console.warn("Failed to calculate magnetic data, continuing");
      }

      // Call addSurveyStation endpoint to store the survey station data
      const addResponse = await fetch("https://www.icpwebportal.com/api/well/addSurveyStation", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          userName: req.session.userEmail || '',
          wellName: wellName,
          lat: String(latitude),
          long: String(longitude),
          altitudeMeters: String(altitudeMeters),
          date: date,
          model: model,
          productKey: productKey
        }).toString(),
      });

      if (!addResponse.ok) {
        const errorBody = await addResponse.text();
        console.error("Failed to add survey station:", errorBody);
        return res.status(500).json({ error: "Failed to add survey station to Well Seeker Pro" });
      }

      const result = await addResponse.json();

      res.json({
        success: true,
        message: "Survey station added successfully",
        data: {
          wellName,
          latitude,
          longitude,
          altitudeMeters,
          date,
          model,
          calculatedMagnetics: calcData,
          serverResponse: result,
        },
      });
    } catch (error) {
      console.error("Error adding survey station:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to add survey station" });
    }
  });

  // Component report data endpoint
  app.get("/api/component-report/:wellId/:runId/:componentType", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { wellId, runId, componentType } = req.params;
      const userEmail = req.session.userEmail || "";

      // Extract username from email (first part before period)
      const username = userEmail.split('@')[0].split('.')[0];

      const reportData = await storage.getComponentReportData(wellId, runId, componentType);

      // Add username to report data
      const finalData = {
        ...reportData,
        personUpdatingActivity: username,
      };

      res.json(finalData);
    } catch (error) {
      console.error("Error fetching component report data:", error);
      res.status(500).json({ error: "Failed to fetch component report data" });
    }
  });

  // Well Seeker Pro API endpoints
  app.get("/api/wells", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 100;
      const search = (req.query.search as string) || '';

      // Call wells endpoint with POST method and required parameters
      let token = await getWellSeekerToken(req);
      const productKey = "02c041de-9058-443e-ad5d-76475b3e7a74";

      console.log(`Calling Wells API (page ${page}, limit ${limit})...`);

      const makeWellsRequest = async (authToken: string) => {
        return await fetch("https://www.icpwebportal.com/api/wells", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${authToken}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            userName: req.session.userEmail || '',
            productKey: productKey,
            getFootage: 'true',
            databaseOrg: ''
          }).toString(),
        });
      };

      let response = await makeWellsRequest(token);

      console.log(`Wells API Response Status: ${response.status} ${response.statusText}`);
      console.log(`Response Headers:`, Object.fromEntries(response.headers.entries()));

      // If 401, try to refresh token using saved credentials
      if (response.status === 401) {
        if (req.session.wellSeekerCredentials) {
          console.log("Access token expired, attempting to refresh with saved credentials...");
          try {
            const { userName, password, productKey: credProductKey } = req.session.wellSeekerCredentials;

            const refreshResponse = await fetch("https://www.icpwebportal.com/api/authToken", {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                userName,
                password,
                productKey: credProductKey
              }).toString(),
            });

            console.log(`Refresh response status: ${refreshResponse.status}`);

            if (refreshResponse.ok) {
              const authResponse: WellSeekerAuthResponse = await refreshResponse.json();
              console.log("Auth response structure:", {
                has_access_token: !!authResponse.access_token,
                access_token_length: authResponse.access_token?.length,
                has_refresh_token: !!authResponse.refresh_token,
                response_keys: Object.keys(authResponse)
              });

              // Check if the response contains an error (invalid credentials)
              if (authResponse.error === "invalid_grant" || !authResponse.access_token) {
                console.error("Invalid credentials - clearing session and forcing re-login");
                req.session.destroy(() => {});
                throw new Error("TOKEN_EXPIRED: Your session has expired. Please log in again.");
              }

              const newToken = authResponse.access_token;

              req.session.wellSeekerToken = newToken;

              // Store new refresh token if provided
              if (authResponse.refresh_token) {
                req.session.wellSeekerRefreshToken = authResponse.refresh_token;
                console.log("Updated refresh token in session");
              }

              console.log("Token refreshed successfully, retrying wells request...");
              console.log(`New token starts with: ${newToken.substring(0, 20)}...`);
              console.log(`New token length: ${newToken.length} characters`);

              // Retry with new token
              response = await makeWellsRequest(newToken);

              if (response.ok) {
                console.log("Wells request succeeded with refreshed token");
              } else {
                console.error(`Wells request still failed after token refresh: ${response.status}`);
              }
            } else {
              const refreshError = await refreshResponse.text();
              console.error(`Token refresh failed: ${refreshResponse.status} - ${refreshError}`);
              // Clear session on failed refresh
              req.session.destroy(() => {});
            }
          } catch (refreshError) {
            console.error("Token refresh failed:", refreshError);
          }
        }

        // If still 401 after refresh attempt
        if (response.status === 401) {
          const errorBody = await response.text();
          console.error(`Wells API 401 Error Response Body: ${errorBody}`);
          throw new Error(`TOKEN_EXPIRED: Your session has expired. Please log in again.`);
        }
      }

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Wells API Error Response: ${errorBody}`);
        throw new Error(`Well Seeker Pro API error: ${response.statusText}`);
      }

      const wellsData = await response.json();

      // Transform Well Seeker Pro API response to our Well format
      let wells: Well[] = Array.isArray(wellsData) ? wellsData.map((well, index) => ({
        id: well.id ? String(well.id) : (well.jobNum ? `job-${well.jobNum}-${index}` : `well-${index}`),
        jobNum: well.jobNum || '',
        actualWell: well.actualWell || well.wellName || '',
        rig: well.rig || '',
        operator: well.operator || '',
        wellStatus: well.wellStatus || 'N/A',
      })) : [];

      // Apply search filter if provided
      if (search) {
        const searchLower = search.toLowerCase();
        wells = wells.filter(well => 
          well.actualWell.toLowerCase().includes(searchLower) ||
          well.jobNum.toLowerCase().includes(searchLower) ||
          well.operator.toLowerCase().includes(searchLower) ||
          well.rig.toLowerCase().includes(searchLower)
        );
      }

      // Calculate pagination
      const total = wells.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedWells = wells.slice(startIndex, endIndex);

      console.log(`Successfully fetched ${total} wells, returning page ${page} (${paginatedWells.length} items)`);

      res.json({
        wells: paginatedWells,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
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

      if (!selectedWell) {
        throw new Error("Well not found");
      }

      const wellName = selectedWell.actualWell || selectedWell.wellName || selectedWell.name || String(wellId);

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

      if (!selectedWell) {
        throw new Error("Well not found");
      }

      const wellName = selectedWell.actualWell || selectedWell.wellName || selectedWell.name || String(wellId);

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

      if (!selectedWell) {
        throw new Error("Well not found");
      }

      const wellName = selectedWell.actualWell || selectedWell.wellName || selectedWell.name || String(wellId);

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

      if (!selectedWell) {
        return res.json([0]);
      }

      const wellName = selectedWell.actualWell || selectedWell.wellName || selectedWell.name || String(wellId);

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

  // MWD Surveys endpoint
  app.get("/api/surveys/:wellId", async (req, res) => {
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
      
      // Extract jobNum from wellId if it's in format "job-{jobNum}-{index}"
      let wellIdToMatch = String(wellId);
      let jobNumToMatch = '';
      if (wellIdToMatch.startsWith('job-')) {
        const parts = wellIdToMatch.split('-');
        if (parts.length >= 3) {
          jobNumToMatch = parts.slice(1, parts.length - 1).join('-');
        }
      }
      
      const selectedWell = Array.isArray(wellsData) 
        ? wellsData.find(w => {
            const wId = String(w.id || '');
            const wJobNum = String(w.jobNum || '');
            const wActual = String(w.actualWell || '');
            
            return wId === wellIdToMatch || 
                   wJobNum === wellIdToMatch || 
                   wActual === wellIdToMatch ||
                   (jobNumToMatch && (wJobNum === jobNumToMatch || wId.includes(jobNumToMatch)));
          })
        : null;

      if (!selectedWell) {
        throw new Error("Well not found");
      }

      const wellName = selectedWell.actualWell || selectedWell.wellName || selectedWell.name || String(wellId);

      // Call getSurveys endpoint to get survey data
      const surveysResponse = await fetch("https://www.icpwebportal.com/api/survey/getSurveys", {
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

      if (!surveysResponse.ok) {
        console.warn(`Failed to fetch surveys (${surveysResponse.status}), returning empty array`);
        return res.json([]);
      }

      const surveys = await surveysResponse.json();
      console.log(`Fetched ${Array.isArray(surveys) ? surveys.length : 0} surveys for well: ${wellName}`);
      
      res.json(Array.isArray(surveys) ? surveys : []);
    } catch (error) {
      console.error("Error fetching surveys:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to fetch surveys" });
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

      if (!selectedWell) {
        throw new Error("Well not found");
      }

      const wellName = selectedWell.actualWell || selectedWell.wellName || selectedWell.name || String(wellId);

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

  // Update MWD Probe Order endpoint
  app.post("/api/update-probe-order", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { wellName, bhaNum, probeOrder } = req.body;

      if (!wellName || !bhaNum || !probeOrder) {
        return res.status(400).json({ error: "wellName, bhaNum, and probeOrder are required" });
      }

      const token = await getWellSeekerToken(req);
      const productKey = "02c041de-9058-443e-ad5d-76475b3e7a74";

      // Convert probeOrder array to JSON string for the API
      const probeOrderJson = typeof probeOrder === 'string' ? probeOrder : JSON.stringify(probeOrder);

      // Call updateMwdProbeOrder endpoint
      const updateResponse = await fetch("https://www.icpwebportal.com/api/well/drillString/updateMwdProbeOrder", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          userName: req.session.userEmail || '',
          productKey: productKey,
          wellName: wellName,
          bhaNum: String(bhaNum),
          probeOrder: probeOrderJson
        }).toString(),
      });

      if (!updateResponse.ok) {
        const errorBody = await updateResponse.text();
        console.error(`Failed to update probe order: ${updateResponse.status} - ${errorBody}`);
        return res.status(500).json({ error: `Failed to update probe order: ${updateResponse.statusText}` });
      }

      const result = await updateResponse.json();
      console.log(`Probe order updated successfully for well ${wellName}, BHA ${bhaNum}`);
      
      res.json({
        success: true,
        message: "Probe order updated successfully",
        data: result
      });
    } catch (error) {
      console.error("Error updating probe order:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to update probe order" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}