import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexte/AuthContext";
import "./Auth.css";

export default function Connexion() {
  const { login, logout } = useAuth();
  const navigate = useNavigate();

  const isAdminRole = (role) => {
    const normalized = String(role || "")
      .trim()
      .toLowerCase();
    return normalized === "admin" || normalized === "administrateur";
  };

  const [form, setForm] = useState({ email: "", mot_de_passe: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const getErrorMessage = (err) => {
    const detail = err?.response?.data?.detail;
    if (!detail) return "Une erreur est survenue";

    if (typeof detail === "string") return detail;

    if (Array.isArray(detail)) {
      const messages = detail
        .map((item) => item?.msg)
        .filter(Boolean)
        .join(" | ");
      return messages || "Une erreur est survenue";
    }

    if (typeof detail === "object") {
      if (detail.message) {
        if (detail.retry_after) {
          return `${detail.message} (Reessayez dans ${detail.retry_after}s)`;
        }
        if (detail.code === "en_attente") {
          return "⏳ " + detail.message;
        }
        if (detail.code === "refuse") {
          return "❌ Demande refusée : " + detail.message;
        }
        return detail.message;
      }
      return "Une erreur est survenue";
    }

    return "Une erreur est survenue";
  };

  const validate = () => {
    const errs = {};
    if (!form.email.trim()) {
      errs.email = "Email requis";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = "Email invalide";
    }
    if (!form.mot_de_passe.trim()) {
      errs.mot_de_passe = "Mot de passe requis";
    }
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
      const user = await login(form.email, form.mot_de_passe);
      if (isAdminRole(user.role)) {
        await logout();
        setServerError("Compte admin detecte. Utilisez /admin_login.");
        return;
      }

      if (user.role === "organisateur") navigate("/organisateur");
      else navigate("/");
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='auth-wrapper auth-login'>
      <div className='auth-left'>
        <div className='auth-tagline'>
          <h1>Bienvenue sur EventHub</h1>
          <p>Rejoignez des milliers d'organisateurs et participants.</p>
        </div>
        <div className='auth-decoration'>
          <div className='deco-circle c1' />
          <div className='deco-circle c2' />
          <div className='deco-circle c3' />
        </div>
      </div>

      <div className='auth-right'>
        <div className='auth-card'>
          <Link
            to='/'
            className='auth-back-link'
            aria-label="Retour a l'accueil"
          >
            <span aria-hidden='true'>&larr;</span> Retour a l'accueil
          </Link>

          <div className='auth-card-header'>
            <h2>Bon retour !</h2>
            <p>Connectez-vous à votre compte</p>
          </div>

          {serverError && (
            <div className='alert-error'>
              <span>⚠</span> {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className={`field-group ${errors.email ? "has-error" : ""}`}>
              <label>Email</label>
              <div className='input-wrapper'>
                <input
                  type='email'
                  name='email'
                  placeholder='votre@email.com'
                  value={form.email}
                  onChange={handleChange}
                  autoComplete='email'
                />
              </div>
              {errors.email && (
                <span className='field-error'>{errors.email}</span>
              )}
            </div>

            <div
              className={`field-group ${errors.mot_de_passe ? "has-error" : ""}`}
            >
              <label>Mot de passe</label>
              <div className='input-wrapper password-input-wrapper'>
                <input
                  type={showPassword ? "text" : "password"}
                  name='mot_de_passe'
                  placeholder='••••••••••••••'
                  value={form.mot_de_passe}
                  onChange={handleChange}
                  autoComplete='current-password'
                />
                <button
                  type='button'
                  className='password-toggle'
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={
                    showPassword
                      ? "Masquer le mot de passe"
                      : "Afficher le mot de passe"
                  }
                >
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
              {errors.mot_de_passe && (
                <span className='field-error'>{errors.mot_de_passe}</span>
              )}
            </div>

            <Link to='/forgot-password' className='forgot-password'>
              Mot de passe oublié ?
            </Link>

            <button type='submit' className='btn-primary' disabled={loading}>
              {loading ? <span className='spinner' /> : "Se connecter"}
            </button>
          </form>

          <div className='auth-divider'>
            <span>ou</span>
          </div>

          <p className='auth-switch'>
            Pas encore de compte ? <Link to='/inscription'>S'inscrire</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
