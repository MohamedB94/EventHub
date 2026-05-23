import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexte/AuthContext";
import Connexion from "./pages/auth/Connexion";
import Inscription from "./pages/auth/Inscription";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Home from "./pages/home/Home";
import OrganisateurDashboard from "./pages/organisateur/OrganisateurDashboard";
import OrganisateursList from "./pages/organisateurs/OrganisateursList";
import { useAuth } from "./contexte/AuthContext";

function RedirectToHome() {
  const { loading } = useAuth();

  if (loading) {
    return <div>Chargement...</div>; // Afficher un indicateur de chargement
  }

  return <Home />; // Afficher directement la page d'accueil
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path='/' element={<RedirectToHome />} />
          <Route path='/connexion' element={<Connexion />} />
          <Route path='/inscription' element={<Inscription />} />
          <Route path='/admin_login' element={<AdminLogin />} />
          <Route path='/admin' element={<AdminDashboard />} />
          <Route path='/organisateur' element={<OrganisateurDashboard />} />
          <Route path='/organisateurs' element={<OrganisateursList />} />
          <Route path='*' element={<Navigate to='/' replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
