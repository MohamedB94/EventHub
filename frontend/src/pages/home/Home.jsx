import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexte/AuthContext";
import api from "../../services/api";
import "./Home.css";

const categories = ["Tous", "Musique", "Conferences", "Ateliers", "Art", "Sport"];

const VISIBLE = 4;

const formatDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
};

export default function Home() {
  const { user, logout } = useAuth();
  const [activeCategory, setActiveCategory] = useState("Tous");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const fullName = [user?.prenom, user?.nom].filter(Boolean).join(" ").trim();

  useEffect(() => {
    api.get("/events/public")
      .then((res) => setEvents(Array.isArray(res.data) ? res.data : []))
      .catch(() => setEvents([]))
      .finally(() => setEventsLoading(false));
  }, []);

  const filteredEvents = events.filter((e) => {
    const matchCategory =
      activeCategory === "Tous" ||
      (e.categorie || "").toLowerCase() === activeCategory.toLowerCase();
    const matchSearch = (e.titre || "").toLowerCase().includes(search.toLowerCase().trim());
    return matchCategory && matchSearch;
  });

  const totalPages = Math.ceil(filteredEvents.length / VISIBLE);
  const visibleEvents = filteredEvents.slice(page * VISIBLE, page * VISIBLE + VISIBLE);

  const handleCategoryChange = (cat) => {
    setActiveCategory(cat);
    setPage(0);
  };

  return (
    <div className='home-page'>
      <header className='hero'>
        <nav className='hero-nav'>
          <Link to='/' className='brand'>EventHub</Link>

          <div className='hero-links'>
            <a href='#events'>Evenements</a>
            <Link to='/organisateurs'>Organisateurs</Link>
            <a href='#footer'>A propos</a>
          </div>

          <div className='hero-actions'>
            {user ? (
              <>
                <span className='welcome-user'>
                  Bonjour {fullName || user.email}
                </span>
                {(user.role === "admin" || user.role === "administrateur") && (
                  <Link to='/admin' className='btn-nav btn-nav-outline'>
                    Dashboard Admin
                  </Link>
                )}
                {user.role === "organisateur" && (
                  <Link to='/organisateur' className='btn-nav btn-nav-outline'>
                    Mon espace
                  </Link>
                )}
                <button type='button' className='btn-nav btn-nav-logout' onClick={logout}>
                  Se Déconnecter
                </button>
              </>
            ) : (
              <>
                <Link to='/connexion' className='btn-nav btn-nav-outline'>Connexion</Link>
                <Link to='/inscription' className='btn-nav btn-nav-solid'>Inscription</Link>
              </>
            )}
          </div>
        </nav>

        <div className='hero-content'>
          <h1>Decouvrez des evenements pres de chez vous</h1>
          <p>Des milliers d'evenements vous attendent...</p>
          <div className='search-wrap'>
            <input
              type='text'
              placeholder='Rechercher un evenement...'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </header>

      <main id='events' className='events-section'>
        <div className='category-row'>
          {categories.map((category) => (
            <button
              type='button'
              key={category}
              className={`category-pill ${activeCategory === category ? "active" : ""}`}
              onClick={() => handleCategoryChange(category)}
            >
              {category}
            </button>
          ))}
        </div>

        <div className='events-header'>
          <h2>Evenements a la une</h2>
          {totalPages > 1 && (
            <div className='carousel-arrows'>
              <button
                type='button'
                className='carousel-arrow'
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 0}
                aria-label='Précédent'
              >
                &#8592;
              </button>
              <span className='carousel-count'>{page + 1} / {totalPages}</span>
              <button
                type='button'
                className='carousel-arrow'
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages - 1}
                aria-label='Suivant'
              >
                &#8594;
              </button>
            </div>
          )}
        </div>

        <div className='event-grid'>
          {eventsLoading ? (
            <p className='no-events'>Chargement des événements...</p>
          ) : filteredEvents.length === 0 ? (
            <p className='no-events'>Aucun événement trouvé.</p>
          ) : (
            visibleEvents.map((event) => (
              <Link
                to={`/evenements/${event.id_evenement}`}
                className='event-card'
                key={event.id_evenement}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div className='event-image' />
                <p className='event-date'>
                  {formatDate(event.date_debut)} — {event.lieu}
                </p>
                <h3>{event.titre}</h3>
                {event.categorie && (
                  <span className='event-tag'>{event.categorie}</span>
                )}
                <span className='reserve-btn'>Voir les détails →</span>
              </Link>
            ))
          )}
        </div>
      </main>

      <footer id='footer' className='site-footer'>
        <strong>Eventhub</strong>
        <span>© 2026 EventHub</span>
      </footer>
    </div>
  );
}
