import axios from "axios";

const PUBLIC_PATHS = ["/connexion", "/inscription"];
const onPublicPage = () =>
  PUBLIC_PATHS.some((p) => window.location.pathname.startsWith(p));
const PROTECTED_PATHS = ["/organisateur", "/admin", "/participant"];
const onProtectedPage = () =>
  PROTECTED_PATHS.some((p) => window.location.pathname.startsWith(p));

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // nécessaire pour envoyer le cookie refresh_token
});

// ----- Gestion de l'access token en mémoire -----
let _accessToken = null;

export function setAccessToken(token) {
  _accessToken = token;
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
}

export function clearAccessToken() {
  setAccessToken(null);
}

// ----- Intercepteur de réponse -----
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
        const res = await api.post("/auth/refresh");
        setAccessToken(res.data.access_token);
        return api(original);
      } catch {
        clearAccessToken();
        if (onProtectedPage()) {
          window.location.href = "/connexion";
        }
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
