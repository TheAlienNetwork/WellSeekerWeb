import type { Well, WellDetails, BHAComponent, DrillingParameters, ToolComponent } from "@shared/schema";

export class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "APIError";
  }
}

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(endpoint, {
    ...options,
    credentials: "include", // Important for session cookies
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new APIError(response.status, error.error || "Request failed");
  }

  return response.json();
}

export const api = {
  auth: {
    login: (email: string, password: string, productKey: string) =>
      fetchAPI<{ success: boolean; email: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, productKey }),
      }),
    
    logout: () =>
      fetchAPI<{ success: boolean }>("/api/auth/logout", {
        method: "POST",
      }),
    
    me: () =>
      fetchAPI<{ email: string }>("/api/auth/me"),
  },

  wells: {
    list: () =>
      fetchAPI<Well[]>("/api/wells"),
    
    get: (wellId: string) =>
      fetchAPI<WellDetails>(`/api/wells/${wellId}`),
    
    getBHA: (wellId: string, bhaNumber: number) =>
      fetchAPI<BHAComponent[]>(`/api/wells/${wellId}/bha/${bhaNumber}`),
    
    getDrillingParameters: (wellId: string) =>
      fetchAPI<DrillingParameters>(`/api/wells/${wellId}/drilling-parameters`),
    
    getToolComponents: (wellId: string) =>
      fetchAPI<ToolComponent[]>(`/api/wells/${wellId}/tool-components`),
  },
};
