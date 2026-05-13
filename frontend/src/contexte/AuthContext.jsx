import { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Au démarrage on vérifie si l'utilisateur est connecté via /me
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await api.get("/auth/me");
        setUser(res.data);
      } catch (error) {
        // Si 401 et on n'a jamais essayé de refresh, c'est normal (pas connecté)
        // L'interceptor se chargera du refresh si nécessaire
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email, mot_de_passe) => {
    const res = await api.post("/auth/login", { email, mot_de_passe });
    setUser(res.data);
    return res.data;
  };

  const register = async (formData) => {
    const res = await api.post("/auth/register", formData);
    setUser(res.data);
    return res.data;
  };

  const logout = async () => {
    await api.post("/auth/logout");
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
