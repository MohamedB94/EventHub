import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // ← envoie les cookies automatiquement
});

// Refresh token automatique si access token expiré
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const isRefreshCall = original.url?.includes("/auth/refresh");
    if (error.response?.status === 401 && !original._retry && !isRefreshCall) {
      original._retry = true;
      try {
        await api.post("/auth/refresh");
        return api(original);
      } catch {
        window.location.href = "/connexion";
      }
    }
    return Promise.reject(error);
  }
);

export default api;