import { useState } from "react";
import { Link } from "react-router-dom";
import { useTheater } from "../TheaterContext.jsx";
import {
  assetUrl,
  getAuthors,
  performancesFor,
  functionDate,
} from "../services/theater.js";
export default function FeaturedCarousel() {
  const { catalog } = useTheater(),
    [index, setIndex] = useState(0);
  const works = catalog.obras.filter((w) =>
    catalog.producciones.some(
      (p) => p.id_obra === w.id_obra && p.estado === "CARTELERA",
    ),
  );
  if (!works.length) return null;
  const safeIndex = index % works.length,
    work = works[safeIndex],
    shows = performancesFor(catalog, work);
  return (
    <section
      className="featured container"
      aria-label="Obras destacadas"
      aria-roledescription="carrusel"
    >
      <div className="featured-top">
        <p className="eyebrow">
          <span className="gold-line" />
          EN CARTELERA
        </p>
        <div className="featured-controls">
          <span aria-live="polite">
            {String(safeIndex + 1).padStart(2, "0")} /{" "}
            {String(works.length).padStart(2, "0")}
          </span>
          <button
            type="button"
            aria-label="Obra anterior"
            onClick={() =>
              setIndex((safeIndex - 1 + works.length) % works.length)
            }
          >
            ←
          </button>
          <button
            type="button"
            aria-label="Obra siguiente"
            onClick={() => setIndex((safeIndex + 1) % works.length)}
          >
            →
          </button>
        </div>
      </div>
      <article className="featured-card" aria-live="polite">
        <div className="featured-poster">
          <img
            src={assetUrl(`assets/images/${work.imagen}`)}
            alt={`Imagen de ${work.titulo}`}
          />
        </div>
        <div className="featured-copy">
          <p className="eyebrow">
            {work.genero} · {work.duracion_minutos} MIN APROX.
          </p>
          <h2>{work.titulo}</h2>
          <p className="featured-author">
            Una obra de {getAuthors(catalog, work.id_obra)}
          </p>
          <p>{work.sinopsis}</p>
          {shows[0] && (
            <p className="featured-date">
              PRÓXIMA FUNCIÓN · {functionDate(shows[0])}
            </p>
          )}
          <Link className="button outline" to={`/obras/${work.id_obra}`}>
            Conoce la obra
          </Link>
        </div>
      </article>
      <div className="featured-dots" aria-label="Elegir obra destacada">
        {works.map((w, i) => (
          <button
            key={w.id_obra}
            aria-label={`Mostrar ${w.titulo}`}
            aria-current={i === safeIndex ? "true" : undefined}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </section>
  );
}
