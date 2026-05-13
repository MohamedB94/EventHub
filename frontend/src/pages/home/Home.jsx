import { Link } from "react-router-dom";
import { useAuth } from "../../contexte/AuthContext";
import "./Home.css";

const categories = [
  "Tous",
  "Musique",
  "Conferences",
  "Ateliers",
  "Art",
  "Sport",
];

const events = [
  {
    id: 1,
    title: "Festival Jazz en Seine",
    date: "Sam 19 avr. - Paris",
    category: "Musique",
    price: "29 EUR",
  },
  {
    id: 2,
    title: "Festival Jazz en Seine",
    date: "Sam 19 avr. - Paris",
    category: "Musique",
    price: "29 EUR",
  },
  {
    id: 3,
    title: "Festival Jazz en Seine",
    date: "Sam 19 avr. - Paris",
    category: "Musique",
    price: "29 EUR",
  },
  {
    id: 4,
    title: "Festival Jazz en Seine",
    date: "Sam 19 avr. - Paris",
    category: "Musique",
    price: "29 EUR",
  },
];

export default function Home() {
  const { user, logout } = useAuth();
  const fullName = [user?.prenom, user?.nom].filter(Boolean).join(" ").trim();

  return (
    <div className='home-page'>
      <header className='hero'>
        <nav className='hero-nav'>
          <div className='brand'>EventHub</div>

          <div className='hero-links'>
            <a href='#events'>Evenements</a>
            <a href='#events'>Organisateurs</a>
            <a href='#footer'>A propos</a>
          </div>

          <div className='hero-actions'>
            {user ? (
              <>
                <span className='welcome-user'>
                  Bonjour {fullName || user.email}
                </span>
                <button
                  type='button'
                  className='btn-nav btn-nav-logout'
                  onClick={logout}
                >
                  Deconnecter
                </button>
              </>
            ) : (
              <>
                <Link to='/connexion' className='btn-nav btn-nav-outline'>
                  Connexion
                </Link>
                <Link to='/inscription' className='btn-nav btn-nav-solid'>
                  Inscription
                </Link>
              </>
            )}
          </div>
        </nav>

        <div className='hero-content'>
          <h1>Decouvrez des evenements pres de chez vous</h1>
          <p>Des milliers d'evenements vous attendent...</p>
          <div className='search-wrap'>
            <input type='text' placeholder='Rechercher un evenement...' />
          </div>
        </div>
      </header>

      <main id='events' className='events-section'>
        <div className='category-row'>
          {categories.map((category) => (
            <button
              type='button'
              key={category}
              className={`category-pill ${category === "Tous" ? "active" : ""}`}
            >
              {category}
            </button>
          ))}
        </div>

        <h2>Evenements a la une</h2>

        <div className='event-grid'>
          {events.map((event) => (
            <article className='event-card' key={event.id}>
              <div className='event-image' />
              <p className='event-date'>{event.date}</p>
              <h3>{event.title}</h3>
              <span className='event-tag'>{event.category}</span>
              <p className='event-price'>{event.price}</p>
              <button type='button' className='reserve-btn'>
                reserver
              </button>
            </article>
          ))}
        </div>
      </main>

      <footer id='footer' className='site-footer'>
        <strong>Eventhub</strong>
        <span>© 2026 EventHub</span>
      </footer>
    </div>
  );
}
