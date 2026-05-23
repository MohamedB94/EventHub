import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexte/AuthContext";
import api from "../../services/api";
import "./EventDetail.css";

const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDateShort = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
};

export default function EventDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reservationMsg, setReservationMsg] = useState({});
  const [reserving, setReserving] = useState(null);

  useEffect(() => {
    api.get(`/events/public/${id}`)
      .then((res) => setEvent(res.data))
      .catch(() => setError("Événement introuvable ou non publié."))
      .finally(() => setLoading(false));
  }, [id]);

  const handleReserver = async (billetId) => {
    if (!user) {
      navigate("/connexion");
      return;
    }
    setReserving(billetId);
    setReservationMsg((prev) => ({ ...prev, [billetId]: "" }));
    try {
      await api.post("/reservations/", {
        id_billet: billetId,
        mode_paiement: "en ligne",
      });
      setReservationMsg((prev) => ({ ...prev, [billetId]: "success" }));
      const res = await api.get(`/events/public/${id}`);
      setEvent(res.data);
    } catch (err) {
      const detail = err?.response?.data?.detail || "Erreur lors de la réservation.";
      setReservationMsg((prev) => ({ ...prev, [billetId]: detail }));
    } finally {
      setReserving(null);
    }
  };

  if (loading) {
    return (
      <div className='event-detail-page'>
        <div className='event-detail-loading'>Chargement...</div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className='event-detail-page'>
        <div className='event-detail-error'>
          <p>{error || "Événement introuvable."}</p>
          <Link to='/' className='event-back-link'>← Retour à l'accueil</Link>
        </div>
      </div>
    );
  }

  const gratuit = !event.billets || event.billets.length === 0;
  const prixMin = gratuit ? null : Math.min(...event.billets.map((b) => b.prix));

  return (
    <div className='event-detail-page'>
      <nav className='event-detail-nav'>
        <Link to='/' className='brand'>EventHub</Link>
        <Link to='/' className='event-back-link'>← Retour aux événements</Link>
      </nav>

      <div className='event-detail-layout'>
        <div className='event-detail-main'>
          <div className='event-detail-hero'>
            <div className='event-detail-image' />
          </div>

          <div className='event-detail-body'>
            {event.categorie && (
              <span className='event-detail-tag'>{event.categorie}</span>
            )}
            <h1>{event.titre}</h1>

            <div className='event-detail-meta'>
              <div className='event-meta-item'>
                <span className='event-meta-label'>📅 Date de début</span>
                <span>{formatDate(event.date_debut)}</span>
              </div>
              <div className='event-meta-item'>
                <span className='event-meta-label'>📅 Date de fin</span>
                <span>{formatDate(event.date_fin)}</span>
              </div>
              <div className='event-meta-item'>
                <span className='event-meta-label'>📍 Lieu</span>
                <span>{event.lieu}</span>
              </div>
              <div className='event-meta-item'>
                <span className='event-meta-label'>👥 Capacité</span>
                <span>{event.capacite_max} personnes</span>
              </div>
            </div>

            {event.description && (
              <div className='event-detail-description'>
                <h2>À propos de l'événement</h2>
                <p>{event.description}</p>
              </div>
            )}
          </div>
        </div>

        <aside className='event-detail-sidebar'>
          <div className='event-sidebar-card'>
            <div className='event-sidebar-price'>
              {gratuit ? (
                <span className='event-price-free'>Gratuit</span>
              ) : (
                <>
                  <span className='event-price-from'>À partir de</span>
                  <span className='event-price-amount'>{prixMin.toFixed(2)} €</span>
                </>
              )}
            </div>

            <div className='event-billets-section'>
              <h3>Billets disponibles</h3>
              {gratuit ? (
                <p className='event-no-billets'>Aucun billet configuré pour cet événement.</p>
              ) : (
                <div className='event-billets-list'>
                  {event.billets.map((b) => (
                    <div key={b.id_billet} className='event-billet-item'>
                      <div className='event-billet-info'>
                        <strong>{b.type}</strong>
                        <span className='event-billet-price'>
                          {b.prix === 0 ? "Gratuit" : `${Number(b.prix).toFixed(2)} €`}
                        </span>
                        <span className='event-billet-qty'>
                          {b.quantite_disponible > 0
                            ? `${b.quantite_disponible} place(s) restante(s)`
                            : "Complet"}
                        </span>
                        {b.dat_limite_vente && (
                          <span className='event-billet-limit'>
                            Vente jusqu'au {formatDateShort(b.dat_limite_vente)}
                          </span>
                        )}
                      </div>
                      {reservationMsg[b.id_billet] === "success" ? (
                        <span className='event-billet-success'>✓ Réservé !</span>
                      ) : (
                        <button
                          type='button'
                          className='event-reserve-btn'
                          disabled={b.quantite_disponible === 0 || reserving === b.id_billet}
                          onClick={() => handleReserver(b.id_billet)}
                        >
                          {reserving === b.id_billet ? "..." : b.quantite_disponible === 0 ? "Complet" : "Réserver"}
                        </button>
                      )}
                      {reservationMsg[b.id_billet] && reservationMsg[b.id_billet] !== "success" && (
                        <p className='event-billet-error'>{reservationMsg[b.id_billet]}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!user && (
              <p className='event-login-hint'>
                <Link to='/connexion'>Connectez-vous</Link> pour réserver un billet.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
