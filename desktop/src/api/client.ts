import axios from "axios";
import { isOfflineMode, setOfflineMode, handleOfflineRequest } from "./offlineStore";

export { isOfflineMode, setOfflineMode };

export const getApiBaseUrl = (): string => {
  return localStorage.getItem("hrms_api_url") || (import.meta as any).env?.VITE_API_BASE_URL || "https://34-230-20-223.sslip.io/api/v1";
};

export const setApiBaseUrl = (value: string): void => {
  const normalized = value.trim().replace(/\/+$/, "");
  if (normalized) {
    localStorage.setItem("hrms_api_url", normalized);
  } else {
    localStorage.removeItem("hrms_api_url");
  }
};

export const apiClient = axios.create({
  headers: {
    "Content-Type": "application/json",
  },
});

// Standalone Offline Mode Adapter
const httpAdapter = axios.getAdapter(axios.defaults.adapter || ["xhr", "http", "fetch"]);

apiClient.defaults.adapter = async (config) => {
  if (isOfflineMode()) {
    const url = config.url || "";
    const method = config.method || "get";
    let body = config.data;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        // Keep string
      }
    }
    const result = handleOfflineRequest(url, method, body);
    if (result) {
      return {
        data: result.data,
        status: result.status,
        statusText: result.status >= 200 && result.status < 300 ? "OK" : "Error",
        headers: {},
        config,
        request: {},
      };
    }
  }

  return httpAdapter(config);
};

apiClient.interceptors.request.use(
  (config) => {
    config.baseURL = getApiBaseUrl();
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refresh = localStorage.getItem("refresh_token");
      if (refresh) {
        try {
          const res = await axios.post(`${getApiBaseUrl()}/auth/refresh/`, { refresh });
          localStorage.setItem("access_token", res.data.access);
          originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
          return apiClient(originalRequest);
        } catch (refreshErr) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          localStorage.removeItem("user_info");
          window.location.reload();
        }
      }
    }
    return Promise.reject(error);
  }
);

