import { Link } from "react-router-dom";
import { assetUrl } from "../services/theater.js";
export default function Hero() {
  return (
    <section className="hero" id="inicio" aria-labelledby="hero-title">
      <div className="hero-copy">
        <p className="eyebrow">
          <span className="gold-line"></span> TEATRO UNIVERSITARIO · LA PAZ
        </p>
        <h1 id="hero-title">
          Nos encontramos
          <br />
          en <em>escena.</em>
        </h1>
        <p className="hero-description">
          Hay historias que se leen.
          <br />
          Otras, se viven frente a un escenario.
        </p>
        <Link to="/#cartelera" className="button gold">
          Descubre la cartelera
        </Link>
        <p className="hero-note">
          Una sala. Muchas historias. Tu próxima experiencia.
        </p>
      </div>
      <figure className="hero-art">
        <img
          src={assetUrl("assets/images/portada-teatro.png")}
          alt="Imagen ilustrativa de un escenario con telones de terciopelo y luz dorada"
          width="1536"
          height="1024"
          fetchPriority="high"
        />
        <figcaption>
          <span>EL TELÓN ESTÁ POR SUBIR</span>
          <b>¿Nos acompañas?</b>
        </figcaption>
        <span className="art-number" aria-hidden="true">
          TEMPORADA 2026
        </span>
      </figure>
      <Link className="scroll-cue" to="/#cartelera">
        <span aria-hidden="true">↓</span> LA FUNCIÓN EMPIEZA AQUÍ
      </Link>
    </section>
  );
}
