import { createContext, useContext, useState, useEffect } from "react";
import api, { setAccessToken, clearAccessToken } from "../services/api";

const AuthContext = createContext();

const isAdminRole = (role) => {
  const normalized = String(role || "")
    .trim()
    .toLowerCase();
  return normalized === "admin" || normalized === "administrateur";
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Au démarrage on tente un refresh silencieux pour récupérer un access token
  // (le cookie refresh_token httpOnly est envoyé automatiquement)
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await api.post("/auth/refresh");
        setAccessToken(res.data.access_token);
        setUser(res.data.user);
      } catch {
        clearAccessToken();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email, mot_de_passe) => {
    const res = await api.post("/auth/login", { email, mot_de_passe });
    setAccessToken(res.data.access_token);
    setUser(res.data.user);
    return res.data.user;
  };

  const loginAdmin = async (email, mot_de_passe) => {
    const res = await api.post("/auth/login", { email, mot_de_passe });
    if (!isAdminRole(res.data?.user?.role)) {
      await api.post("/auth/logout");
      clearAccessToken();
      setUser(null);
      const err = new Error("Acces reserve aux administrateurs");
      err.response = { data: { detail: "Acces reserve aux administrateurs" } };
      throw err;
    }

    setAccessToken(res.data.access_token);
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (formData) => {
    const res = await api.post("/auth/register", formData);
    setAccessToken(res.data.access_token);
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = async () => {
    await api.post("/auth/logout");
    clearAccessToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, login, loginAdmin, register, logout, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
