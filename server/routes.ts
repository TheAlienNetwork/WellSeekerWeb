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
    wellSeekerRefreshToken?: string;
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
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      // Authenticate with Well Seeker Pro API to get fresh tokens
      const productKey = "02c041de-9058-443e-ad5d-76475b3e7a74";

      console.log("Attempting to authenticate with Well Seeker Pro API for:", email);

      const authResponse = await fetch("https://www.icpwebportal.com/api/authToken", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          userName: email,
          password: password,
          productKey: productKey
        }).toString(),
      });

      if (!authResponse.ok) {
        const errorBody = await authResponse.text();
        console.error("Authentication failed:", errorBody);
        return res.status(401).json({ error: "Invalid Well Seeker Pro credentials" });
      }

      const authData: any = await authResponse.json();

      console.log("Auth response data:", JSON.stringify(authData, null, 2));
      console.log("Available keys in authData:", Object.keys(authData));

      // Check if the API returned an error (even with HTTP 200)
      if (authData.error || authData.error_description) {
        console.error("Authentication error from API:", authData.error, authData.error_description);
        return res.status(401).json({ 
          error: authData.error_description || "Invalid Well Seeker Pro credentials" 
        });
      }

      // Extract token - the API returns it as 'access_token'
      const token = authData.access_token;
      
      if (!token || token === '') {
        console.error("No valid access_token in auth response! Keys:", Object.keys(authData));
        console.error("Full auth response:", authData);
        return res.status(401).json({ error: "Authentication failed - no token received" });
      }

      console.log("Authentication successful for:", email);
      console.log("Token received, length:", token.length);

      console.log("Token received, length:", token.length);

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
      const runs = await storage.getBHARuns(wellId);
      res.json(runs);
    } catch (error) {
      console.error("Error fetching BHA runs:", error);
      res.status(500).json({ error: "Failed to fetch BHA runs" });
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

      const wellData = await storage.getWellDashboardData(String(wellId), String(runId));
      res.json(wellData);
    } catch (error) {
      console.error("Error fetching well dashboard data:", error);
      res.status(500).json({ error: "Failed to fetch well dashboard data" });
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