import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../contexte/AuthContext";
import "./OrganisateursList.css";

export default function OrganisateursList() {
  const { user, logout } = useAuth();
  const fullName = [user?.prenom, user?.nom].filter(Boolean).join(" ").trim();
  const [organisateurs, setOrganisateurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/organisateurs")
      .then((res) => setOrganisateurs(res.data))
      .catch(() => setError("Impossible de charger les organisateurs."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="org-list-page">
      <header className="org-list-header">
        <nav className="org-list-nav">
          <Link to="/" className="brand">EventHub</Link>
          <div className="org-list-actions">
            {user ? (
              <>
                <span className="welcome-user">Bonjour {fullName || user.email}</span>
                <button type="button" className="btn-nav btn-nav-logout" onClick={logout}>
                  Se Déconnecter
                </button>
              </>
            ) : (
              <>
                <Link to="/connexion" className="btn-nav btn-nav-outline">Connexion</Link>
                <Link to="/inscription" className="btn-nav btn-nav-solid">Inscription</Link>
              </>
            )}
          </div>
        </nav>
        <div className="org-list-hero-content">
          <h1>Nos organisateurs</h1>
          <p>Découvrez les organisateurs qui animent la plateforme</p>
        </div>
      </header>

      <main className="org-list-main">
        {loading && <p className="org-list-status">Chargement...</p>}
        {error && <p className="org-list-status org-list-error">{error}</p>}
        {!loading && !error && organisateurs.length === 0 && (
          <p className="org-list-status">Aucun organisateur pour le moment.</p>
        )}
        <div className="org-grid">
          {organisateurs.map((org) => (
            <article className="org-card" key={org.id_utilisateur}>
              <div className="org-avatar">
                {org.prenom[0]}{org.nom[0]}
              </div>
              <h3>{org.prenom} {org.nom}</h3>
              <span className="org-events-count">
                {org.nb_evenements} événement{org.nb_evenements !== 1 ? "s" : ""}
              </span>
              <p className="org-since">
                Membre depuis{" "}
                {new Date(org.date_inscription).toLocaleDateString("fr-FR", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </article>
          ))}
        </div>
      </main>

      <footer className="site-footer">
        <strong>Eventhub</strong>
        <span>© 2026 EventHub</span>
      </footer>
    </div>
  );
}
