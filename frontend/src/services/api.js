import axios from "axios";

const PUBLIC_PATHS = ["/connexion", "/inscription"];
const onPublicPage = () => PUBLIC_PATHS.some(p => window.location.pathname.startsWith(p));

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const isRefreshCall = original.url?.includes("/auth/refresh");

    // Sur une page publique ou déjà en retry → on rejette directement, sans refresh
    if (onPublicPage() || isRefreshCall || original._retry) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      original._retry = true;
      try {
        await api.post("/auth/refresh");
        return api(original);
      } catch {
        window.location.href = "/connexion";
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
