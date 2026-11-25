import { useState } from "react";
import { Link } from "react-router-dom";
import { useTheater } from "../TheaterContext.jsx";
import {
  assetUrl,
  getAuthors,
  normalize,
  performancesFor,
  functionDate,
} from "../services/theater.js";
function PlayCard({ work, authors, performances }) {
  return (
    <article className="play-card">
      <Link
        className="play-poster"
        to={`/obras/${work.id_obra}`}
        aria-label={`Ver ${work.titulo}`}
      >
        <img
          src={assetUrl(`assets/images/${work.imagen}`)}
          alt={`Afiche ilustrado de ${work.titulo}`}
          width="600"
          height="750"
          loading="lazy"
        />
        <span className="poster-tag">EN CARTELERA</span>
      </Link>
      <p className="play-meta">
        <span>{work.genero}</span>
        <span>{work.duracion_minutos} MIN APROX.</span>
      </p>
      <h3>{work.titulo}</h3>
      <p className="play-author">{authors}</p>
      <details>
        <summary>De qué trata</summary>
        <p>{work.sinopsis}</p>
      </details>
      {performances[0] && (
        <p className="next-date">
          Función de ejemplo · {functionDate(performances[0])}
        </p>
      )}
      <div className="play-actions">
        <Link className="text-button" to={`/obras/${work.id_obra}`}>
          Ver obra y avance
        </Link>
        {performances[0] && (
          <Link
            className="button outline"
            to={`/?funcion=${performances[0].id_funcion}#butacas`}
          >
            Reservar <span aria-hidden="true">↗</span>
          </Link>
        )}
      </div>
    </article>
  );
}
export default function CatalogSection() {
  const { catalog } = useTheater();
  const [query, setQuery] = useState(""),
    [genre, setGenre] = useState("Todas");
  const works = catalog.obras.filter((w) =>
    catalog.producciones.some(
      (p) => p.id_obra === w.id_obra && p.estado === "CARTELERA",
    ),
  );
  const genres = ["Todas", ...new Set(works.map((w) => w.genero))];
  const cards = works
    .filter(
      (w) =>
        (genre === "Todas" || w.genero === genre) &&
        normalize(`${w.titulo} ${getAuthors(catalog, w.id_obra)}`).includes(
          normalize(query),
        ),
    )
    .map((work) => ({
      work,
      authors: getAuthors(catalog, work.id_obra),
      performances: performancesFor(catalog, work),
    }));
  return (
    <section
      className="section container"
      id="cartelera"
      aria-labelledby="catalog-title"
    >
      <header className="section-heading">
        <div>
          <p className="eyebrow">01 / EN ESCENA</p>
          <h2 id="catalog-title">
            Encuentra tu
            <br />
            <em>próxima historia.</em>
          </h2>
        </div>
        <p>
          Tres obras, distintas miradas. Elige la historia que quieres vivir
          desde tu butaca.
        </p>
      </header>
      <div className="catalog-toolbar">
        <div className="filters" aria-label="Filtrar por género">
          {genres.map((g) => (
            <button
              className={`filter ${g === genre ? "active" : ""}`}
              aria-pressed={g === genre}
              key={g}
              onClick={() => setGenre(g)}
            >
              {g}
            </button>
          ))}
        </div>
        <label className="search-field">
          <span aria-hidden="true">⌕</span>
          <span className="sr-only">Buscar obra o autor</span>
          <input
            type="search"
            placeholder="Busca una obra o un autor"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <p className="sr-only" role="status">
        {cards.length}{" "}
        {cards.length === 1 ? "obra encontrada." : "obras encontradas."}
      </p>
      {cards.length ? (
        <div className="play-grid">
          {cards.map((card) => (
            <PlayCard key={card.work.id_obra} {...card} />
          ))}
        </div>
      ) : (
        <p className="empty-state">
          No encontramos obras con esa búsqueda. Prueba con otro título o autor.
        </p>
      )}
    </section>
  );
}
