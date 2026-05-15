import { Navigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexte/AuthContext";
import "./OrganisateurDashboard.css";
import api from "../../services/api";

const navItems = [
  { label: "Tableau de bord", targetId: "dashboard-top" },
  { label: "Mes evenements", targetId: "mes-evenements" },
  { label: "Billets & tarifs", targetId: "creation-evenement" },
  { label: "Ventes", targetId: "mes-evenements" },
  { label: "Statistiques", targetId: "dashboard-stats" },
  { label: "Parametres", targetId: "creation-evenement" },
];

const toDateTimeLocal = (isoDate) => {
  if (!isoDate) return "";
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatDate = (isoDate) => {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function OrganisateurDashboard() {
  const { user, logout, loading } = useAuth();
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [activeSection, setActiveSection] = useState("dashboard-top");

  const goToSection = (targetId) => {
    const section = document.getElementById(targetId);
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSection(targetId);
    }
  };

  const fetchEvents = async () => {
    setEventsLoading(true);
    setEventsError("");
    try {
      const res = await api.get("/events/mine");
      setEvents(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      setEventsError(
        error?.response?.data?.detail ||
          "Impossible de charger les evenements.",
      );
    } finally {
      setEventsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "organisateur") {
      fetchEvents();
    }
  }, [user?.role]);

  const stats = useMemo(() => {
    const publishedCount = events.filter((event) => event.statut).length;
    const draftCount = events.length - publishedCount;
    const totalCapacity = events.reduce(
      (sum, event) => sum + (event.capacite_max || 0),
      0,
    );

    const nextEvent = [...events]
      .filter((event) => new Date(event.date_debut).getTime() >= Date.now())
      .sort(
        (a, b) =>
          new Date(a.date_debut).getTime() - new Date(b.date_debut).getTime(),
      )[0];

    return [
      {
        label: "Evenements actifs",
        value: String(publishedCount),
        trend: `${draftCount} brouillon(s)`,
      },
      {
        label: "Total evenements",
        value: String(events.length),
        trend: "Synchronise avec la base",
      },
      {
        label: "Capacite totale",
        value: String(totalCapacity),
        trend: "Somme des capacites max",
      },
      {
        label: "Prochain evenement",
        value: nextEvent ? formatDate(nextEvent.date_debut) : "Aucun",
        trend: nextEvent ? nextEvent.titre : "Ajoutez un evenement",
      },
    ];
  }, [events]);

  if (loading) {
    return <div className='organisateur-loading'>Chargement...</div>;
  }

  if (!user) {
    return <Navigate to='/connexion' replace />;
  }

  if (user.role !== "organisateur") {
    return <Navigate to='/' replace />;
  }

  const initials =
    `${user.prenom?.[0] || ""}${user.nom?.[0] || ""}`.toUpperCase();

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setSubmitMessage("");
    const formData = new FormData(e.target);
    const event = Object.fromEntries(formData.entries());

    try {
      setSubmitLoading(true);
      await api.post("/events/create", {
        titre: event.titre,
        description: event.description,
        date_debut: event.date_debut,
        date_fin: event.date_fin,
        lieu: event.lieu,
        capacite_max: parseInt(event.capacite, 10),
        statut: event.statut === "publie",
      });
      e.target.reset();
      setSubmitMessage("Evenement cree avec succes.");
      await fetchEvents();
    } catch (error) {
      setSubmitMessage(
        `Erreur: ${error?.response?.data?.detail || error.message}`,
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className='org-page'>
      <aside className='org-sidebar'>
        <div>
          <div className='org-sidebar-label'>Organisateur</div>
          <nav className='org-menu'>
            {navItems.map((item) => (
              <button
                key={item.label}
                type='button'
                className={`org-menu-item ${activeSection === item.targetId ? "active" : ""}`}
                onClick={() => goToSection(item.targetId)}
              >
                <span className='org-menu-icon' />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <button type='button' className='org-logout' onClick={logout}>
          <span className='org-menu-icon' />
          Deconnexion
        </button>
      </aside>

      <main className='org-main'>
        <header className='org-topbar'>
          <div className='org-brand'>
            <span className='org-brand-name'>EventHub</span>
          </div>

          <nav className='org-topnav'>
            <a href='#mes-evenements'>Evenements</a>
            <a href='#mes-evenements'>Organisateurs</a>
            <a href='#creation-evenement'>A propos</a>
          </nav>

          <div className='org-avatar'>{initials || "OR"}</div>
        </header>

        <section className='org-content' id='dashboard-top'>
          <div className='org-content-header' id='dashboard-header'>
            <div>
              <p className='org-kicker'>Dashboard organisateur</p>
              <h1>Tableau de bord</h1>
            </div>

            <button
              type='button'
              className='org-primary-button'
              onClick={() => goToSection("creation-evenement")}
            >
              + Creer un evenement
            </button>
          </div>

          <section className='org-stats-grid' id='dashboard-stats'>
            {stats.map((stat) => (
              <article key={stat.label} className='org-stat-card'>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
                <small>{stat.trend}</small>
              </article>
            ))}
          </section>

          <section className='org-panel' id='mes-evenements'>
            <div className='org-panel-header'>
              <h2>Mes evenements</h2>
              <span>{events.length} evenements</span>
            </div>

            <div className='org-table-wrapper'>
              <table className='org-table'>
                <thead>
                  <tr>
                    <th>Evenement</th>
                    <th>Date</th>
                    <th>Ventes</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {eventsLoading && (
                    <tr>
                      <td colSpan='5'>Chargement des evenements...</td>
                    </tr>
                  )}
                  {!eventsLoading && eventsError && (
                    <tr>
                      <td colSpan='5'>{eventsError}</td>
                    </tr>
                  )}
                  {!eventsLoading && !eventsError && events.length === 0 && (
                    <tr>
                      <td colSpan='5'>Aucun evenement pour le moment.</td>
                    </tr>
                  )}
                  {!eventsLoading &&
                    !eventsError &&
                    events.map((event) => (
                      <tr key={event.id_evenement}>
                        <td>{event.titre}</td>
                        <td>{formatDate(event.date_debut)}</td>
                        <td>{event.capacite_max} max</td>
                        <td>
                          <span
                            className={`org-status ${event.statut ? "published" : "draft"}`}
                          >
                            {event.statut ? "Publie" : "Brouillon"}
                          </span>
                        </td>
                        <td>
                          <div className='org-actions'>
                            <button
                              type='button'
                              className='org-secondary-button'
                              disabled
                            >
                              Modifier
                            </button>
                            <button
                              type='button'
                              className='org-icon-button'
                              disabled
                            >
                              ...
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className='org-panel' id='creation-evenement'>
            <div className='org-panel-header'>
              <h2>Creer un nouvel evenement</h2>
            </div>

            <form className='org-form' onSubmit={handleCreateEvent}>
              <div className='org-field full'>
                <label htmlFor='titre'>Titre de l'evenement</label>
                <input
                  id='titre'
                  name='titre'
                  type='text'
                  placeholder='Ex : Festival de Jazz Paris 2025'
                  required
                />
              </div>

              <div className='org-form-grid'>
                <div className='org-field'>
                  <label htmlFor='date-debut'>Date de debut</label>
                  <input
                    id='date-debut'
                    name='date_debut'
                    type='datetime-local'
                    defaultValue={toDateTimeLocal(new Date().toISOString())}
                    required
                  />
                </div>

                <div className='org-field'>
                  <label htmlFor='date-fin'>Date de fin</label>
                  <input
                    id='date-fin'
                    name='date_fin'
                    type='datetime-local'
                    defaultValue={toDateTimeLocal(new Date().toISOString())}
                    required
                  />
                </div>

                <div className='org-field full'>
                  <label htmlFor='lieu'>Adresse</label>
                  <input
                    id='lieu'
                    name='lieu'
                    type='text'
                    placeholder='Adresse complete'
                    required
                  />
                </div>

                <div className='org-field'>
                  <label htmlFor='capacite'>Capacite max.</label>
                  <input
                    id='capacite'
                    name='capacite'
                    type='number'
                    min='1'
                    step='1'
                    placeholder='500'
                    required
                  />
                </div>

                <div className='org-field'>
                  <label htmlFor='categorie'>Categorie</label>
                  <select id='categorie' defaultValue='Musique'>
                    <option>Musique</option>
                    <option>Conference</option>
                    <option>Atelier</option>
                    <option>Sport</option>
                  </select>
                </div>

                <div className='org-field'>
                  <label htmlFor='statut'>Statut</label>
                  <select id='statut' name='statut' defaultValue='brouillon'>
                    <option value='brouillon'>Brouillon</option>
                    <option value='publie'>Publie</option>
                  </select>
                </div>
              </div>

              <div className='org-field full'>
                <label htmlFor='description'>Description</label>
                <textarea
                  id='description'
                  name='description'
                  rows='5'
                  placeholder='Decrivez votre evenement...'
                />
              </div>

              {submitMessage && <p>{submitMessage}</p>}

              <div className='org-form-actions'>
                <button
                  type='submit'
                  className='org-primary-button submit'
                  disabled={submitLoading}
                >
                  {submitLoading
                    ? "Enregistrement..."
                    : "Enregistrer l'evenement"}
                </button>
                <button type='reset' className='org-secondary-button'>
                  Annuler
                </button>
              </div>
            </form>
          </section>
        </section>
      </main>
    </div>
  );
}
