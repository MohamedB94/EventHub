import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Auth.css";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    email: "",
    mot_de_passe: "",
    confirmer_passe: "",
    role: "participant",
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const errs = {};
    if (!form.nom.trim()) errs.nom = "Le nom est obligatoire";
    else if (form.nom.trim().length < 2) errs.nom = "Minimum 2 caractères";

    if (!form.prenom.trim()) errs.prenom = "Le prénom est obligatoire";
    else if (form.prenom.trim().length < 2) errs.prenom = "Minimum 2 caractères";

    if (!form.email.trim()) errs.email = "L'email est obligatoire";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = "Format d'email invalide";

    if (!form.mot_de_passe) errs.mot_de_passe = "Le mot de passe est obligatoire";
    else if (form.mot_de_passe.length < 8)
      errs.mot_de_passe = "Minimum 8 caractères";
    else if (!/[A-Z]/.test(form.mot_de_passe))
      errs.mot_de_passe = "Au moins une majuscule requise";
    else if (!/[0-9]/.test(form.mot_de_passe))
      errs.mot_de_passe = "Au moins un chiffre requis";

    if (!form.confirmer_passe)
      errs.confirmer_passe = "Veuillez confirmer le mot de passe";
    else if (form.mot_de_passe !== form.confirmer_passe)
      errs.confirmer_passe = "Les mots de passe ne correspondent pas";

    return errs;
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
    setServerError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) return setErrors(errs);
    setLoading(true);
    try {
      const { confirmer_passe, ...data } = form;
      const user = await register(data);
      if (user.role === "organisateur") navigate("/organisateur");
      else navigate("/");
    } catch (err) {
      setServerError(err.response?.data?.detail || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = () => {
    const p = form.mot_de_passe;
    if (!p) return null;
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    if (score <= 1) return { label: "Faible", cls: "weak" };
    if (score === 2) return { label: "Moyen", cls: "medium" };
    if (score === 3) return { label: "Fort", cls: "strong" };
    return { label: "Très fort", cls: "very-strong" };
  };

  const strength = getPasswordStrength();

  return (
    <div className="auth-wrapper">
      <div className="auth-left">
        <div className="auth-brand">
          <span className="brand-icon">◈</span>
          <span className="brand-name">EventHub</span>
        </div>
        <div className="auth-tagline">
          <h1>Rejoignez<br />la communauté.</h1>
          <p>Des milliers d'événements vous attendent. Créez votre compte et participez.</p>
        </div>
        <div className="auth-decoration">
          <div className="deco-circle c1" />
          <div className="deco-circle c2" />
          <div className="deco-circle c3" />
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-card-header">
            <h2>Créer un compte</h2>
            <p>C'est gratuit et rapide ✨</p>
          </div>

          {serverError && (
            <div className="alert-error">
              <span>⚠</span> {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="field-row">
              <div className={`field-group ${errors.nom ? "has-error" : ""}`}>
                <label>Nom</label>
                <div className="input-wrapper">
                  <span className="input-icon">👤</span>
                  <input
                    type="text"
                    name="nom"
                    placeholder="Dupont"
                    value={form.nom}
                    onChange={handleChange}
                  />
                </div>
                {errors.nom && <span className="field-error">{errors.nom}</span>}
              </div>

              <div className={`field-group ${errors.prenom ? "has-error" : ""}`}>
                <label>Prénom</label>
                <div className="input-wrapper">
                  <span className="input-icon">👤</span>
                  <input
                    type="text"
                    name="prenom"
                    placeholder="Jean"
                    value={form.prenom}
                    onChange={handleChange}
                  />
                </div>
                {errors.prenom && <span className="field-error">{errors.prenom}</span>}
              </div>
            </div>

            <div className={`field-group ${errors.email ? "has-error" : ""}`}>
              <label>Adresse email</label>
              <div className="input-wrapper">
                <span className="input-icon">✉</span>
                <input
                  type="email"
                  name="email"
                  placeholder="exemple@email.com"
                  value={form.email}
                  onChange={handleChange}
                />
              </div>
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>

            <div className={`field-group ${errors.mot_de_passe ? "has-error" : ""}`}>
              <label>Mot de passe</label>
              <div className="input-wrapper">
                <span className="input-icon">⚿</span>
                <input
                  type="password"
                  name="mot_de_passe"
                  placeholder="Min. 8 caractères, 1 majuscule, 1 chiffre"
                  value={form.mot_de_passe}
                  onChange={handleChange}
                />
              </div>
              {strength && (
                <div className="password-strength">
                  <div className={`strength-bar ${strength.cls}`} />
                  <span className={`strength-label ${strength.cls}`}>{strength.label}</span>
                </div>
              )}
              {errors.mot_de_passe && <span className="field-error">{errors.mot_de_passe}</span>}
            </div>

            <div className={`field-group ${errors.confirmer_passe ? "has-error" : ""}`}>
              <label>Confirmer le mot de passe</label>
              <div className="input-wrapper">
                <span className="input-icon">⚿</span>
                <input
                  type="password"
                  name="confirmer_passe"
                  placeholder="••••••••"
                  value={form.confirmer_passe}
                  onChange={handleChange}
                />
              </div>
              {errors.confirmer_passe && (
                <span className="field-error">{errors.confirmer_passe}</span>
              )}
            </div>

            <div className="field-group">
              <label>Je suis</label>
              <div className="role-selector">
                <button
                  type="button"
                  className={`role-btn ${form.role === "participant" ? "active" : ""}`}
                  onClick={() => setForm({ ...form, role: "participant" })}
                >
                  🎟 Participant
                </button>
                <button
                  type="button"
                  className={`role-btn ${form.role === "organisateur" ? "active" : ""}`}
                  onClick={() => setForm({ ...form, role: "organisateur" })}
                >
                  🎪 Organisateur
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : "Créer mon compte"}
            </button>
          </form>

          <p className="auth-switch">
            Déjà un compte ? <Link to="/connexion">Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  );
}