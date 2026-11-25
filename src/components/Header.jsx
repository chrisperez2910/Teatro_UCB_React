import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useTheater } from "../TheaterContext.jsx";
import { assetUrl } from "../services/theater.js";
export default function Header() {
  const [open, setOpen] = useState(false),
    toggle = useRef(null),
    location = useLocation();
  const { state, account, useDatabase } = useTheater();
  useEffect(() => setOpen(false), [location.key]);
  useEffect(() => {
    const desktop = matchMedia("(min-width: 1025px)");
    const close = () => setOpen(false);
    const escape = (e) => {
      if (e.key === "Escape" && open) {
        close();
        toggle.current?.focus();
      }
    };
    desktop.addEventListener("change", close);
    document.addEventListener("keydown", escape);
    return () => {
      desktop.removeEventListener("change", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return (
    <header className="site-header">
      <Link className="brand" to="/#inicio" aria-label="Teatro UCB, inicio">
        <img
          src={assetUrl("assets/images/marca.svg")}
          width="40"
          height="40"
          alt=""
        />
        <span>
          TEATRO <b>UCB</b>
          <small>UN ESPACIO PARA SENTIR</small>
        </span>
      </Link>
      <button
        ref={toggle}
        className="menu-toggle"
        aria-controls="navegacion"
        aria-expanded={open}
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        onClick={() => setOpen((v) => !v)}
      >
        <span />
        <span />
      </button>
      <nav
        id="navegacion"
        className={open ? "is-open" : ""}
        aria-label="Navegación principal"
      >
        <Link to="/#cartelera">Cartelera</Link>
        <Link to="/#archivo">Archivo</Link>
        <Link to="/#talleres">Talleres</Link>
        <NavLink to="/cuenta">
          {account ? `Hola, ${account.nombre.split(" ")[0]}` : "Mi cuenta"}
        </NavLink>
        {account?.rol === "ADMIN" && (
          <NavLink to="/administracion">Administrar</NavLink>
        )}
        <NavLink className="nav-reservas" to="/reservas">
          Mis reservas{" "}
          <span>
            {state.reservas.filter((r) => r.estado === "CONFIRMADA").length}
          </span>
        </NavLink>
      </nav>
    </header>
  );
}
