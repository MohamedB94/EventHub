import { Navigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexte/AuthContext";
import "./OrganisateurDashboard.css";
import api from "../../services/api";

const navItems = [
  { label: "Tableau de bord", targetId: "dashboard-top" },
  { label: "Mes evenements", targetId: "mes-evenements" },
  { label: "Creer un evenement", targetId: "creation-evenement" },
  { label: "Billets", targetId: "billets" },
  { label: "Statistiques", targetId: "statistiques" },
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
  const [eventFilter, setEventFilter] = useState("tous");
  const [editingEvent, setEditingEvent] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);
  const [selectedStatEvent, setSelectedStatEvent] = useState(null);

  const [billetEventId, setBilletEventId] = useState(null);
  const [billets, setBillets] = useState([]);
  const [billetMessage, setBilletMessage] = useState("");

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
        error?.response?.data?.detail || "Impossible de charger les evenements.",
      );
    } finally {
      setEventsLoading(false);
    }
  };

  const fetchBillets = async (eventId) => {
    if (!eventId) { setBillets([]); return; }
    try {
      const res = await api.get(`/billets/event/${eventId}`);
      setBillets(Array.isArray(res.data) ? res.data : []);
    } catch {
      setBillets([]);
    }
  };

  useEffect(() => {
    if (user?.role === "organisateur") fetchEvents();
  }, [user?.role]);

  useEffect(() => {
    fetchBillets(billetEventId);
  }, [billetEventId]);

  const stats = useMemo(() => {
    const publishedCount = events.filter((e) => e.statut).length;
    const draftCount = events.length - publishedCount;
    const totalCapacity = events.reduce((sum, e) => sum + (e.capacite_max || 0), 0);
    const nextEvent = [...events]
      .filter((e) => new Date(e.date_debut).getTime() >= Date.now())
      .sort((a, b) => new Date(a.date_debut) - new Date(b.date_debut))[0];
    return [
      { label: "Evenements actifs", value: String(publishedCount), trend: `${draftCount} brouillon(s)` },
      { label: "Total evenements", value: String(events.length), trend: "Synchronise avec la base" },
      { label: "Capacite totale", value: String(totalCapacity), trend: "Somme des capacites max" },
      { label: "Prochain evenement", value: nextEvent ? formatDate(nextEvent.date_debut) : "Aucun", trend: nextEvent ? nextEvent.titre : "Ajoutez un evenement" },
    ];
  }, [events]);

  if (loading) return <div className='organisateur-loading'>Chargement...</div>;
  if (!user) return <Navigate to='/connexion' replace />;
  if (user.role !== "organisateur") return <Navigate to='/' replace />;

  const initials = `${user.prenom?.[0] || ""}${user.nom?.[0] || ""}`.toUpperCase();

  const handleEditClick = (event) => {
    setEditingEvent(event);
    setSubmitMessage("");
    goToSection("creation-evenement");
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm("Supprimer cet événement ?")) return;
    try {
      await api.delete(`/events/${eventId}`);
      setOpenMenu(null);
      await fetchEvents();
    } catch (error) {
      alert(error?.response?.data?.detail || "Erreur lors de la suppression.");
    }
  };

  const handleCreateEvent = async (e, publish) => {
    e.preventDefault();
    setSubmitMessage("");
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    const payload = {
      titre: data.titre,
      description: data.description,
      date_debut: data.date_debut,
      date_fin: data.date_fin,
      lieu: data.lieu,
      capacite_max: parseInt(data.capacite, 10),
      categorie: data.categorie || null,
      statut: publish,
    };
    try {
      setSubmitLoading(true);
      if (editingEvent) {
        await api.put(`/events/${editingEvent.id_evenement}`, payload);
        setEditingEvent(null);
        setSubmitMessage("Événement modifié avec succès.");
      } else {
        await api.post("/events/create", payload);
        setSubmitMessage(publish ? "Événement publié avec succès." : "Brouillon sauvegardé.");
      }
      e.target.reset();
      await fetchEvents();
    } catch (error) {
      setSubmitMessage(`Erreur: ${error?.response?.data?.detail || error.message}`);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCreateBillet = async (e) => {
    e.preventDefault();
    setBilletMessage("");
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    const payload = {
      type: data.type,
      prix: parseFloat(String(data.prix).replace(",", ".")) || 0,
      quantite_disponible: parseInt(data.quantite_disponible, 10),
      dat_limite_vente: data.dat_limite_vente || null,
      id_evenement: billetEventId,
    };
    try {
      await api.post("/billets/", payload);
      setBilletMessage("Billet ajouté avec succès.");
      e.target.reset();
      await fetchBillets(billetEventId);
    } catch (error) {
      setBilletMessage(`Erreur: ${error?.response?.data?.detail || error.message}`);
    }
  };

  const handleDeleteBillet = async (billetId) => {
    if (!window.confirm("Supprimer ce type de billet ?")) return;
    try {
      await api.delete(`/billets/${billetId}`);
      await fetchBillets(billetEventId);
    } catch (error) {
      alert(error?.response?.data?.detail || "Erreur lors de la suppression.");
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
            <a href='#billets'>Billets</a>
            <a href='#statistiques'>Statistiques</a>
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
              <div className='org-event-filters'>
                {["tous", "publie", "brouillon"].map((f) => (
                  <button
                    key={f}
                    type='button'
                    className={`org-filter-pill ${eventFilter === f ? "active" : ""}`}
                    onClick={() => setEventFilter(f)}
                  >
                    {f === "tous" ? "Tous" : f === "publie" ? "Publiés" : "Brouillons"}
                  </button>
                ))}
              </div>
              <span>
                {eventFilter === "tous" ? events.length : eventFilter === "publie" ? events.filter((e) => e.statut).length : events.filter((e) => !e.statut).length}{" "}
                evenement(s)
              </span>
            </div>
            <div className='org-table-wrapper'>
              <table className='org-table'>
                <thead>
                  <tr>
                    <th>Evenement</th>
                    <th>Date</th>
                    <th>Capacite</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {eventsLoading && <tr><td colSpan='5'>Chargement des evenements...</td></tr>}
                  {!eventsLoading && eventsError && <tr><td colSpan='5'>{eventsError}</td></tr>}
                  {!eventsLoading && !eventsError && events.length === 0 && (
                    <tr><td colSpan='5'>Aucun evenement pour le moment.</td></tr>
                  )}
                  {!eventsLoading && !eventsError && events
                    .filter((e) => eventFilter === "tous" ? true : eventFilter === "publie" ? e.statut : !e.statut)
                    .map((event) => (
                      <tr key={event.id_evenement}>
                        <td>{event.titre}</td>
                        <td>{formatDate(event.date_debut)}</td>
                        <td>{event.capacite_max}</td>
                        <td>
                          <span className={`org-status ${event.statut ? "published" : "draft"}`}>
                            {event.statut ? "Publie" : "Brouillon"}
                          </span>
                        </td>
                        <td>
                          <div className='org-actions'>
                            <button
                              type='button'
                              className='org-secondary-button'
                              onClick={() => handleEditClick(event)}
                            >
                              Modifier
                            </button>
                            <div className='org-menu-wrap'>
                              <button
                                type='button'
                                className='org-icon-button'
                                onClick={() => setOpenMenu(openMenu === event.id_evenement ? null : event.id_evenement)}
                              >
                                ···
                              </button>
                              {openMenu === event.id_evenement && (
                                <div className='org-dropdown'>
                                  <button
                                    type='button'
                                    className='org-dropdown-item danger'
                                    onClick={() => handleDeleteEvent(event.id_evenement)}
                                  >
                                    Supprimer
                                  </button>
                                </div>
                              )}
                            </div>
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
              <h2>{editingEvent ? "Modifier l'événement" : "Creer un nouvel evenement"}</h2>
              {editingEvent && (
                <button type='button' className='org-secondary-button' onClick={() => setEditingEvent(null)}>
                  Annuler la modification
                </button>
              )}
            </div>
            <form key={editingEvent?.id_evenement ?? "new"} className='org-form' onSubmit={(e) => e.preventDefault()}>
              <div className='org-field full'>
                <label htmlFor='titre'>Titre de l'evenement</label>
                <input
                  id='titre'
                  name='titre'
                  type='text'
                  placeholder='Ex : Festival de Jazz Paris 2025'
                  defaultValue={editingEvent?.titre ?? ""}
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
                    defaultValue={editingEvent ? toDateTimeLocal(editingEvent.date_debut) : toDateTimeLocal(new Date().toISOString())}
                    required
                  />
                </div>
                <div className='org-field'>
                  <label htmlFor='date-fin'>Date de fin</label>
                  <input
                    id='date-fin'
                    name='date_fin'
                    type='datetime-local'
                    defaultValue={editingEvent ? toDateTimeLocal(editingEvent.date_fin) : toDateTimeLocal(new Date().toISOString())}
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
                    defaultValue={editingEvent?.lieu ?? ""}
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
                    defaultValue={editingEvent?.capacite_max ?? ""}
                    required
                  />
                </div>
                <div className='org-field'>
                  <label htmlFor='categorie'>Categorie</label>
                  <select id='categorie' name='categorie' defaultValue={editingEvent?.categorie ?? "Musique"}>
                    <option>Musique</option>
                    <option>Conference</option>
                    <option>Atelier</option>
                    <option>Sport</option>
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
                  defaultValue={editingEvent?.description ?? ""}
                />
              </div>
              {submitMessage && (
                <p className={submitMessage.startsWith("Erreur") ? "org-form-error" : "org-form-success"}>
                  {submitMessage}
                </p>
              )}
              <div className='org-form-actions'>
                <button
                  type='button'
                  className='org-primary-button submit'
                  disabled={submitLoading}
                  onClick={(e) => handleCreateEvent({ preventDefault: () => {}, target: e.target.closest("form") }, true)}
                >
                  {submitLoading ? "Enregistrement..." : "Publier l'événement"}
                </button>
                <button
                  type='button'
                  className='org-secondary-button'
                  disabled={submitLoading}
                  onClick={(e) => handleCreateEvent({ preventDefault: () => {}, target: e.target.closest("form") }, false)}
                >
                  Sauvegarder en brouillon
                </button>
                <button type='reset' className='org-secondary-button'>Annuler</button>
              </div>
            </form>
          </section>

          <section className='org-panel' id='billets'>
            <div className='org-panel-header'>
              <h2>Gestion des billets</h2>
            </div>

            <div className='org-stats-selector' style={{ padding: "0 18px 16px" }}>
              <label htmlFor='billet-event-select'>Événement concerné</label>
              <select
                id='billet-event-select'
                value={billetEventId ?? ""}
                onChange={(e) => setBilletEventId(parseInt(e.target.value) || null)}
              >
                <option value=''>-- Choisir un événement --</option>
                {events.map((e) => (
                  <option key={e.id_evenement} value={e.id_evenement}>
                    {e.titre} {e.statut ? "✓" : "(brouillon)"}
                  </option>
                ))}
              </select>
            </div>

            {billetEventId && (
              <>
                <div className='org-table-wrapper'>
                  <table className='org-table'>
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Prix (EUR)</th>
                        <th>Disponibles</th>
                        <th>Limite vente</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {billets.length === 0 && (
                        <tr><td colSpan='5'>Aucun billet pour cet événement.</td></tr>
                      )}
                      {billets.map((b) => (
                        <tr key={b.id_billet}>
                          <td>{b.type}</td>
                          <td>{Number(b.prix).toFixed(2)}</td>
                          <td>{b.quantite_disponible}</td>
                          <td>{b.dat_limite_vente || "—"}</td>
                          <td>
                            <button
                              type='button'
                              className='org-secondary-button'
                              onClick={() => handleDeleteBillet(b.id_billet)}
                            >
                              Supprimer
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <form onSubmit={handleCreateBillet} className='org-form' style={{ marginTop: "16px" }}>
                  <h3 style={{ margin: "0 0 12px", fontSize: "15px" }}>Ajouter un type de billet</h3>
                  <div className='org-form-grid'>
                    <div className='org-field'>
                      <label>Type</label>
                      <input name='type' type='text' placeholder='Standard, VIP, Étudiant...' required />
                    </div>
                    <div className='org-field'>
                      <label>Prix (EUR)</label>
                      <input name='prix' type='number' min='0' step='0.01' placeholder='0.00' required />
                    </div>
                    <div className='org-field'>
                      <label>Quantité disponible</label>
                      <input name='quantite_disponible' type='number' min='1' step='1' placeholder='100' required />
                    </div>
                    <div className='org-field'>
                      <label>Date limite de vente</label>
                      <input name='dat_limite_vente' type='date' />
                    </div>
                  </div>
                  {billetMessage && (
                    <p className={billetMessage.startsWith("Erreur") ? "org-form-error" : "org-form-success"}>
                      {billetMessage}
                    </p>
                  )}
                  <div className='org-form-actions'>
                    <button type='submit' className='org-primary-button submit'>Ajouter le billet</button>
                  </div>
                </form>
              </>
            )}

            {!billetEventId && events.length > 0 && (
              <p className='org-muted' style={{ padding: "0 18px 18px" }}>
                Sélectionne un événement pour gérer ses types de billets.
              </p>
            )}
            {events.length === 0 && (
              <p className='org-muted' style={{ padding: "0 18px 18px" }}>
                Crée d'abord un événement avant d'ajouter des billets.
              </p>
            )}
          </section>

          <section className='org-panel' id='statistiques'>
            <div className='org-panel-header'>
              <h2>Statistiques</h2>
            </div>
            <div className='org-stats-detail'>
              <div className='org-stat-row'>
                <span>Événements publiés</span>
                <strong>{events.filter((e) => e.statut).length}</strong>
              </div>
              <div className='org-stat-row'>
                <span>Événements en brouillon</span>
                <strong>{events.filter((e) => !e.statut).length}</strong>
              </div>
              <div className='org-stat-row'>
                <span>Capacité totale (publiés)</span>
                <strong>{events.filter((e) => e.statut).reduce((s, e) => s + (e.capacite_max || 0), 0)} places</strong>
              </div>
            </div>

            <div className='org-stats-selector'>
              <label htmlFor='stat-event-select'>Voir le détail d'un événement</label>
              <select
                id='stat-event-select'
                value={selectedStatEvent?.id_evenement ?? ""}
                onChange={(e) => {
                  const found = events.find((ev) => ev.id_evenement === parseInt(e.target.value));
                  setSelectedStatEvent(found || null);
                }}
              >
                <option value=''>-- Choisir un événement --</option>
                {events.map((e) => (
                  <option key={e.id_evenement} value={e.id_evenement}>
                    {e.titre} {e.statut ? "✓" : "(brouillon)"}
                  </option>
                ))}
              </select>
            </div>

            {selectedStatEvent && (
              <div className='org-stats-event-detail'>
                <h3>{selectedStatEvent.titre}</h3>
                <div className='org-stats-detail'>
                  <div className='org-stat-row'>
                    <span>Statut</span>
                    <span className={`org-status ${selectedStatEvent.statut ? "published" : "draft"}`}>
                      {selectedStatEvent.statut ? "Publié" : "Brouillon"}
                    </span>
                  </div>
                  <div className='org-stat-row'>
                    <span>Date</span>
                    <strong>{formatDate(selectedStatEvent.date_debut)} → {formatDate(selectedStatEvent.date_fin)}</strong>
                  </div>
                  <div className='org-stat-row'>
                    <span>Lieu</span>
                    <strong>{selectedStatEvent.lieu}</strong>
                  </div>
                  <div className='org-stat-row'>
                    <span>Capacité max.</span>
                    <strong>{selectedStatEvent.capacite_max} places</strong>
                  </div>
                  <div className='org-stat-row'>
                    <span>Billets vendus</span>
                    <strong className='org-muted-inline'>— (à venir)</strong>
                  </div>
                  <div className='org-stat-row'>
                    <span>Revenu réalisé</span>
                    <strong className='org-muted-inline'>— (à venir)</strong>
                  </div>
                </div>
              </div>
            )}
            {!selectedStatEvent && events.length > 0 && (
              <p className='org-muted' style={{ padding: "0 18px 18px" }}>
                Sélectionne un événement ci-dessus pour voir ses statistiques détaillées.
              </p>
            )}
            {events.length === 0 && (
              <p className='org-muted' style={{ padding: "0 18px 18px" }}>Aucun événement créé.</p>
            )}
          </section>

        </section>
      </main>
    </div>
  );
}
