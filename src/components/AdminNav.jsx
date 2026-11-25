import { NavLink } from "react-router-dom";
export default function AdminNav() {
  return (
    <nav className="admin-nav" aria-label="Administración">
      <NavLink to="/administracion" end>
        Gestionar butacas
      </NavLink>
      <NavLink to="/administracion/reportes">Reportes y decisiones</NavLink>
    </nav>
  );
}
