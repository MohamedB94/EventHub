import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexte/AuthContext";
import Connexion from "./pages/auth/Connexion";
import Inscription from "./pages/auth/Inscription";
import Home from "./pages/home/Home";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/connexion' element={<Connexion />} />
          <Route path='/inscription' element={<Inscription />} />
          <Route path='*' element={<Navigate to='/' replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
