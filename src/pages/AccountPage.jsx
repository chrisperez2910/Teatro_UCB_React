import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTheater } from "../TheaterContext.jsx";
import { usePageNavigation } from "../hooks/usePageNavigation.js";
export default function AccountPage() {
  usePageNavigation("Mi cuenta · Teatro UCB");
  const { account, useDatabase, authenticate, logout } = useTheater();
  const navigate = useNavigate(),
    location = useLocation();
  const [register, setRegister] = useState(false),
    [show, setShow] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [values, setValues] = useState({
    nombre: "",
    correo: "",
    password: "",
    confirmation: "",
  });
  const change = (e) => {
    setValues({ ...values, [e.target.name]: e.target.value });
    setError("");
  };
  const destination = location.state?.returnTo?.startsWith("/")
    ? location.state.returnTo
    : "/reservas";
  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    if (register && values.password !== values.confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await authenticate(register ? "register" : "login", {
        nombre: values.nombre,
        correo: values.correo,
        password: values.password,
      });
      navigate(destination, {
        replace: true,
        state: { booking: location.state?.booking },
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function signOut() {
    setBusy(true);
    setError("");
    try {
      await logout();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (!useDatabase)
    return (
      <section className="account-page container section">
        <div className="account-panel">
          <p className="eyebrow">TU ESPACIO</p>
          <h1>Mi cuenta.</h1>
          <p className="dialog-intro">
            El acceso a cuentas no está disponible en este momento. Puedes
            seguir consultando la cartelera.
          </p>
          <Link className="button outline" to="/">
            Volver al inicio
          </Link>
        </div>
      </section>
    );
  if (account)
    return (
      <section className="account-page container section">
        <div className="account-panel">
          <p className="eyebrow">TU ESPACIO</p>
          <h1>Hola, {account.nombre}.</h1>
          <p className="dialog-intro">Sesión iniciada con {account.correo}.</p>
          <div className="account-actions">
            <Link className="button gold" to="/reservas">
              Mis reservas ↗
            </Link>
            <button
              className="button outline"
              onClick={signOut}
              disabled={busy}
            >
              Cerrar sesión
            </button>
          </div>
          {error && (
            <p className="form-status error" role="alert">
              {error}
            </p>
          )}
        </div>
      </section>
    );
  return (
    <section className="account-page container section">
      <div className="account-art">
        <p className="eyebrow">BIENVENIDO AL TEATRO</p>
        <h1>
          Una historia.
          <br />
          <em>Tu lugar.</em>
        </h1>
        <p>
          Guarda tus reservas, vuelve a consultarlas y acompáñanos en cada
          función.
        </p>
        <span>TEATRO UCB · LA PAZ</span>
      </div>
      <div className="account-panel">
        <p className="eyebrow">TU ESPACIO</p>
        <h2>{register ? "Crear cuenta" : "Iniciar sesión"}</h2>
        <p className="dialog-intro">
          {register
            ? "Completa tus datos para guardar tus reservas."
            : "Qué bueno verte de nuevo."}
        </p>
        <div className="account-tabs" aria-label="Acceso a la cuenta">
          <button
            type="button"
            aria-pressed={!register}
            onClick={() => {
              setRegister(false);
              setError("");
            }}
          >
            Ingresar
          </button>
          <button
            type="button"
            aria-pressed={register}
            onClick={() => {
              setRegister(true);
              setError("");
            }}
          >
            Crear cuenta
          </button>
        </div>
        <form onSubmit={submit}>
          {register && (
            <label>
              Nombre completo
              <input
                name="nombre"
                autoComplete="name"
                value={values.nombre}
                onChange={change}
                minLength="3"
                maxLength="80"
                required
              />
            </label>
          )}
          <label>
            Correo electrónico
            <input
              name="correo"
              type="email"
              autoComplete="email"
              value={values.correo}
              onChange={change}
              maxLength="120"
              required
            />
          </label>
          <label>
            Contraseña
            <input
              name="password"
              type={show ? "text" : "password"}
              autoComplete={register ? "new-password" : "current-password"}
              value={values.password}
              onChange={change}
              minLength="8"
              maxLength="128"
              required
            />
          </label>
          {register && (
            <label>
              Repetir contraseña
              <input
                name="confirmation"
                type={show ? "text" : "password"}
                autoComplete="new-password"
                value={values.confirmation}
                onChange={change}
                minLength="8"
                maxLength="128"
                required
              />
            </label>
          )}
          <button
            className="password-toggle"
            type="button"
            aria-pressed={show}
            onClick={() => setShow(!show)}
          >
            {show ? "Ocultar contraseña" : "Mostrar contraseña"}
          </button>
          {register && <p className="form-note">Usa al menos 8 caracteres.</p>}
          {error && (
            <p className="form-status error" role="alert">
              {error}
            </p>
          )}
          <button className="button gold full" disabled={busy} type="submit">
            {busy ? "Un momento…" : register ? "Crear cuenta" : "Ingresar"}{" "}
          </button>
        </form>
        <p className="form-note account-help">
          Tu cuenta reúne tus reservas y las actividades en las que participas.
        </p>
      </div>
    </section>
  );
}
