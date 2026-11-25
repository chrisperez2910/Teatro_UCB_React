import { Link } from "react-router-dom";
import { usePageNavigation } from "../hooks/usePageNavigation.js";
export default function NotFoundPage() {
  usePageNavigation("Página no encontrada · Teatro UCB");
  return (
    <section className="container section narrow">
      <p className="eyebrow">404 / FUERA DE ESCENA</p>
      <h1 className="page-title">Este camino no lleva al escenario.</h1>
      <p className="dialog-intro">
        Puedes volver al inicio y elegir una obra de la cartelera.
      </p>
      <Link className="button gold" to="/">
        Volver al inicio
      </Link>
    </section>
  );
}
