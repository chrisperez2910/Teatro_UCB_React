import { useState } from "react";
import { references } from "../services/references.js";
import { Link, useParams } from "react-router-dom";
import { useTheater } from "../TheaterContext.jsx";
import {
  assetUrl,
  getWork,
  getAuthors,
  performancesFor,
  functionDate,
} from "../services/theater.js";
import { usePageNavigation } from "../hooks/usePageNavigation.js";
export default function PlayDetailPage() {
  const [showTrailer, setShowTrailer] = useState(false);
  const { id } = useParams(),
    { catalog } = useTheater();
  const work = /^\d+$/.test(id) ? getWork(catalog, id) : null;
  usePageNavigation(
    work ? `${work.titulo} · Teatro UCB` : "Obra no encontrada · Teatro UCB",
  );
  if (!work)
    return (
      <section className="section container narrow">
        <h1 className="page-title">No encontramos esa obra.</h1>
        <Link className="button outline" to="/#cartelera">
          Volver a cartelera
        </Link>
      </section>
    );
  const performances = performancesFor(catalog, work);
  const candidate = references[work.id_obra];
  let reference = null;
  if (work.video_avance_url?.startsWith("https://")) {
    try {
      const url = new URL(work.video_avance_url);
      const videoId = ["www.youtube.com", "youtube.com"].includes(url.hostname)
        ? url.searchParams.get("v")
        : url.hostname === "youtu.be"
          ? url.pathname.slice(1)
          : null;
      reference = {
        ...(candidate?.expected === work.titulo
          ? candidate
          : { title: "Video de referencia de la obra" }),
        url: url.href,
        embed: /^[a-zA-Z0-9_-]{11}$/.test(videoId || "")
          ? `https://www.youtube-nocookie.com/embed/${videoId}`
          : null,
      };
    } catch {
      /* Si el enlace no es válido, la ficha sigue disponible. */
    }
  }
  return (
    <article className="container section detail-page">
      <Link className="text-button detail-back" to="/#cartelera">
        ← Volver a cartelera
      </Link>
      <div className="detail-layout">
        <img
          className="detail-poster"
          src={assetUrl(`assets/images/${work.imagen}`)}
          alt={`Imagen de ${work.titulo}`}
          width="600"
          height="750"
        />
        <div>
          <p className="eyebrow">TEATRO UCB / LA OBRA</p>
          <h1 className="page-title">{work.titulo}</h1>
          <p className="play-detail-meta">
            {getAuthors(catalog, work.id_obra)} · {work.genero} ·{" "}
            {work.duracion_minutos} minutos aprox.
          </p>
          <p className="detail-description">{work.sinopsis}</p>
          <h2 className="subheading">Elige tu función</h2>
          <div className="session-list">
            {performances.length ? (
              performances.map((f) => (
                <Link
                  className="session-button"
                  key={f.id_funcion}
                  to={`/?funcion=${f.id_funcion}#butacas`}
                >
                  <span>
                    {functionDate(f)}
                    <small>
                      {
                        catalog.salas.find((s) => s.id_sala === f.id_sala)
                          .nombre
                      }
                    </small>
                  </span>
                  <span>Elegir butacas ↗</span>
                </Link>
              ))
            ) : (
              <p className="muted">
                Este montaje forma parte del archivo. No tiene funciones
                programadas.
              </p>
            )}
          </div>
          {reference && (
            <section className="trailer-block" aria-labelledby="trailer-title">
              <p className="eyebrow">PARA CONOCER LA OBRA</p>
              <h2 id="trailer-title" className="subheading">
                Un vistazo al escenario.
              </h2>
              <p className="dialog-intro">
                Referencia: {reference.title}. Este video pertenece a otra
                producción; no corresponde a una función de la UCB.
              </p>
              {reference.embed &&
                (showTrailer ? (
                  <div className="video-frame">
                    <iframe
                      title={`Avance de ${work.titulo}`}
                      src={reference.embed}
                      allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  </div>
                ) : (
                  <button
                    className="trailer-preview"
                    onClick={() => setShowTrailer(true)}
                  >
                    <span aria-hidden="true">▶</span> Ver avance de referencia
                  </button>
                ))}
              <a
                className="text-button"
                href={reference.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {reference.embed
                  ? "Abrir el video en YouTube"
                  : "Ver el avance en su página de origen"}{" "}
                ↗
              </a>
            </section>
          )}
        </div>
      </div>
    </article>
  );
}
