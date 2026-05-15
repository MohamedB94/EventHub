import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "../../contexte/AuthContext";
import api from "../../services/api";
import "./AdminDashboard.css";

const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("fr-FR");
};

export default function AdminDashboard() {
  const { user, loading, logout } = useAuth();
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState("");
  const normalizedRole = String(user?.role || "")
    .trim()
    .toLowerCase();
  const isAdmin =
    normalizedRole === "admin" || normalizedRole === "administrateur";

  const loadOverview = async () => {
    setOverviewLoading(true);
    setOverviewError("");
    try {
      const res = await api.get("/admin/overview");
      setOverview(res.data);
    } catch (error) {
      setOverviewError(
        error?.response?.data?.detail ||
          "Impossible de charger les donnees admin.",
      );
    } finally {
      setOverviewLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadOverview();
    }
  }, [isAdmin]);

  if (loading) {
    return <div className='organisateur-loading'>Chargement...</div>;
  }

  if (!user) {
    return <Navigate to='/admin_login' replace />;
  }

  if (!isAdmin) {
    return <Navigate to='/' replace />;
  }

  const stats = overview?.stats || {};
  const users = overview?.users || [];
  const events = overview?.events || [];
  const bruteforce = overview?.bruteforce || [];
  const refreshTokens = overview?.refresh_tokens || [];
  const notes = overview?.notes || {};

  return (
    <div className='admin-page'>
      <header className='admin-topbar'>
        <div className='admin-title'>
          <h1>Dashboard Admin</h1>
          <p>
            Bienvenue {user.prenom} {user.nom} - supervision globale de la
            plateforme.
          </p>
        </div>
        <div className='admin-actions'>
          <Link to='/' className='admin-btn'>
            Retour accueil
          </Link>
          <button type='button' className='admin-btn' onClick={loadOverview}>
            Actualiser
          </button>
          <button type='button' className='admin-btn' onClick={logout}>
            Deconnexion
          </button>
        </div>
      </header>

      {overviewError && <p className='admin-muted'>{overviewError}</p>}
      {overviewLoading && (
        <p className='admin-muted'>Chargement des donnees...</p>
      )}

      {!overviewLoading && (
        <>
          <section className='admin-grid'>
            <article className='admin-kpi'>
              <strong>{stats.total_users ?? 0}</strong>
              <span>Utilisateurs ({stats.active_users ?? 0} actifs)</span>
            </article>
            <article className='admin-kpi'>
              <strong>{stats.total_events ?? 0}</strong>
              <span>Evenements ({stats.active_events ?? 0} publies)</span>
            </article>
            <article className='admin-kpi'>
              <strong>{stats.total_bruteforce ?? 0}</strong>
              <span>Bruteforce ({stats.blocked_accounts ?? 0} bloques)</span>
            </article>
            <article className='admin-kpi'>
              <strong>{stats.total_refresh_tokens ?? 0}</strong>
              <span>
                Refresh tokens ({stats.active_refresh_tokens ?? 0} actifs)
              </span>
            </article>
            <article className='admin-kpi'>
              <strong>{stats.total_billets ?? 0}</strong>
              <span>
                Billets ({stats.total_reservations ?? 0} reservations)
              </span>
            </article>
          </section>

          <section className='admin-sections'>
            <article className='admin-panel'>
              <h2>Utilisateurs</h2>
              <div className='admin-table-wrap'>
                <table className='admin-table'>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nom complet</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Date inscription</th>
                      <th>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 && (
                      <tr>
                        <td colSpan='6'>Aucun utilisateur</td>
                      </tr>
                    )}
                    {users.map((u) => (
                      <tr key={u.id_utilisateur}>
                        <td>{u.id_utilisateur}</td>
                        <td>
                          {u.prenom} {u.nom}
                        </td>
                        <td>{u.email}</td>
                        <td>{u.role}</td>
                        <td>{formatDate(u.date_inscription)}</td>
                        <td>
                          <span
                            className={`admin-status-pill ${u.statut ? "active" : "inactive"}`}
                          >
                            {u.statut ? "Actif" : "Inactif"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className='admin-panel'>
              <h2>Evenements</h2>
              <div className='admin-table-wrap'>
                <table className='admin-table'>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Titre</th>
                      <th>Lieu</th>
                      <th>Date debut</th>
                      <th>Capacite</th>
                      <th>Statut</th>
                      <th>Organisateur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.length === 0 && (
                      <tr>
                        <td colSpan='7'>Aucun evenement</td>
                      </tr>
                    )}
                    {events.map((e) => (
                      <tr key={e.id_evenement}>
                        <td>{e.id_evenement}</td>
                        <td>{e.titre}</td>
                        <td>{e.lieu}</td>
                        <td>{formatDate(e.date_debut)}</td>
                        <td>{e.capacite_max}</td>
                        <td>
                          <span
                            className={`admin-status-pill ${e.statut ? "active" : "inactive"}`}
                          >
                            {e.statut ? "Publie" : "Brouillon"}
                          </span>
                        </td>
                        <td>{e.id_utilisateur}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className='admin-panel'>
              <h2>Bruteforce</h2>
              <div className='admin-table-wrap'>
                <table className='admin-table'>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Email</th>
                      <th>IP</th>
                      <th>Tentatives</th>
                      <th>Bloque jusqu'a</th>
                      <th>Derniere tentative</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bruteforce.length === 0 && (
                      <tr>
                        <td colSpan='6'>Aucune entree bruteforce</td>
                      </tr>
                    )}
                    {bruteforce.map((b) => (
                      <tr key={b.id}>
                        <td>{b.id}</td>
                        <td>{b.email}</td>
                        <td>{b.ip_address}</td>
                        <td>{b.failed_attempts}</td>
                        <td>{formatDate(b.blocked_until)}</td>
                        <td>{formatDate(b.last_attempt_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className='admin-panel'>
              <h2>Refresh Tokens</h2>
              <div className='admin-table-wrap'>
                <table className='admin-table'>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Utilisateur</th>
                      <th>Expire le</th>
                      <th>Revoked</th>
                      <th>Cree le</th>
                    </tr>
                  </thead>
                  <tbody>
                    {refreshTokens.length === 0 && (
                      <tr>
                        <td colSpan='5'>Aucun refresh token</td>
                      </tr>
                    )}
                    {refreshTokens.map((t) => (
                      <tr key={t.id}>
                        <td>{t.id}</td>
                        <td>{t.id_utilisateur}</td>
                        <td>{formatDate(t.expire_at)}</td>
                        <td>{t.revoked ? "Oui" : "Non"}</td>
                        <td>{formatDate(t.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className='admin-panel'>
              <h2>Billet</h2>
              <p className='admin-muted'>
                {notes.billet ||
                  "A brancher quand le modele Billet sera ajoute."}
              </p>
            </article>

            <article className='admin-panel'>
              <h2>Reservation (Reserver)</h2>
              <p className='admin-muted'>
                {notes.reserver ||
                  "A brancher quand le modele Reserver sera ajoute."}
              </p>
            </article>
          </section>
        </>
      )}
    </div>
  );
}
