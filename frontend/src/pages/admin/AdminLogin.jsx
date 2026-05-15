import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexte/AuthContext";
import "../auth/Auth.css";

export default function AdminLogin() {
  const { loginAdmin } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", mot_de_passe: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
    setServerError("");
  };

  const validate = () => {
    const errs = {};
    if (!form.email.trim()) errs.email = "Email requis";
    if (!form.mot_de_passe.trim()) errs.mot_de_passe = "Mot de passe requis";
    return errs;
  };

  const getErrorMessage = (err) => {
    const detail = err?.response?.data?.detail;
    if (!detail) return "Une erreur est survenue";
    if (typeof detail === "string") return detail;
    if (typeof detail === "object" && detail.message) return detail.message;
    return "Une erreur est survenue";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      await loginAdmin(form.email, form.mot_de_passe);
      navigate("/admin");
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
          <h1>Espace administration</h1>
          <p>Connexion reservee aux comptes administrateurs.</p>
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
            <h2>Connexion admin</h2>
            <p>Acces strictement reserve a l'administration</p>
          </div>

          {serverError && (
            <div className='alert-error'>
              <span>!</span> {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className={`field-group ${errors.email ? "has-error" : ""}`}>
              <label>Email</label>
              <div className='input-wrapper'>
                <input
                  type='email'
                  name='email'
                  placeholder='admin@eventhub.com'
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
              <div className='input-wrapper'>
                <input
                  type='password'
                  name='mot_de_passe'
                  placeholder='••••••••••••••'
                  value={form.mot_de_passe}
                  onChange={handleChange}
                  autoComplete='current-password'
                />
              </div>
              {errors.mot_de_passe && (
                <span className='field-error'>{errors.mot_de_passe}</span>
              )}
            </div>

            <button type='submit' className='btn-primary' disabled={loading}>
              {loading ? <span className='spinner' /> : "Se connecter"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
