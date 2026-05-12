import { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Au démarrage on vérifie si l'utilisateur est connecté via /me
  useEffect(() => {
    api.get("/auth/me")
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
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