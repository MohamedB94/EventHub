import { useState } from "react";
import {Link ,useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Auth.css";

export default function Connexion() {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState({ email: "", password: "" });
    const [errors, setErrors] = useState({});
    const [serverError, setServerError] = useState("");
    const [loading, setLoading] = useState(false);

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
            if (user.role ===  "organisateur") navigate("/organisateur");
            else if (user.role === "admin") navigate("/admin");
            else navigate("/");
        } catch (err) {
            setServerError(err.response?.data?.detail || "Une erreur est survenue");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-wrapper">
            <div className="auth-left">
                <div className="auth-brand">
                    <span className="brand-icon">◈</span>
                    <span className="brand-name">EventHub</span>
                </div>
                <div className="auth-tagline">
                    <h1>Vos evenements,<br />votre scène.</h1>
                    <p>Créez, gérez et réservez vos événements en toute simplicité..</p>
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
                    <h2>Connexion</h2>
                    <p>Bon retour parmi nous !</p>
                </div>

                {serverError &&(
                    <div className="alert-error">
                        <span>⚠</span> {serverError}
                    </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
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
                                autoComplete="email"
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
                                placeholder="**********"
                                value={form.mot_de_passe}
                                onChange={handleChange}
                                autoComplete="current-password"
                            />
                        </div>
                        {errors.mot_de_passe && <span className="field-error">{errors.mot_de_passe}</span>}
                    </div>

                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? <span className="spinner" /> : "Se connecter"}
                    </button>
                </form>

                <p className="auth-switch">
                    Pas encore de compte ?{" "}
                    <Link to="/inscription">Inscrivez-vous</Link>
                </p>
            </div>
        </div>
    </div>
    );
}