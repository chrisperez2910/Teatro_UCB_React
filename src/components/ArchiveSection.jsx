import { useState } from "react";
import { useTheater } from "../TheaterContext.jsx";
import { assetUrl, getWork } from "../services/theater.js";
import Dialog from "./Dialog.jsx";
export default function ArchiveSection() {
  const { catalog } = useTheater(),
    [selected, setSelected] = useState(null),
    [index, setIndex] = useState(0);
  const imagesFor = (id) =>
    catalog.imagenes
      .filter((i) => i.id_produccion === id)
      .toSorted((a, b) => a.orden - b.orden);
  const images = selected ? imagesFor(selected.id_produccion) : [];
  return (
    <section
      className="section container"
      id="archivo"
      aria-labelledby="archive-title"
    >
      <header className="section-heading">
        <div>
          <p className="eyebrow">03 / MEMORIA DEL ESCENARIO</p>
          <h2 id="archive-title">
            El telón baja.
            <br />
            <em>Las historias se quedan.</em>
          </h2>
        </div>
        <p>Una mirada a los montajes que dejaron algo en nuestra sala.</p>
      </header>
      <div className="archive-grid">
        {catalog.producciones
          .filter((p) => p.estado === "ARCHIVO")
          .map((p) => {
            const work = getWork(catalog, p.id_obra),
              image = imagesFor(p.id_produccion)[0];
            return (
              <article className="archive-card" key={p.id_produccion}>
                <button
                  className="archive-image"
                  onClick={() => {
                    setIndex(0);
                    setSelected(p);
                  }}
                  aria-label={`Abrir galería de ${work.titulo}`}
                >
                  <picture>
                    <source
                      media="(max-width:767px)"
                      srcSet={assetUrl(image.url_pequena)}
                    />
                    <img
                      src={assetUrl(image.url_original)}
                      alt={image.texto_alternativo}
                      loading="lazy"
                      width="1000"
                      height="625"
                    />
                  </picture>
                </button>
                <div className="archive-meta">
                  <h3>{work.titulo}</h3>
                  <span>{p.temporada}</span>
                </div>
                {catalog.resenas
                  .filter((r) => r.id_produccion === p.id_produccion)
                  .map((r) => (
                    <blockquote key={r.id_resena}>
                      “{r.contenido}”<cite>{r.nombre_autor}</cite>
                    </blockquote>
                  ))}
              </article>
            );
          })}
      </div>

      {selected && (
        <Dialog
          id="gallery-dialog"
          labelledBy="gallery-title"
          closeLabel="Cerrar galería"
          onDismiss={() => setSelected(null)}
        >
          <div id="gallery-detail">
            <h2 id="gallery-title">
              {getWork(catalog, selected.id_obra).titulo}
            </h2>
            <p className="dialog-intro">
              {selected.nombre_montaje} · {selected.temporada}
            </p>
            <img
              src={assetUrl(images[index].url_original)}
              alt={images[index].texto_alternativo}
            />
            <div className="gallery-controls">
              <button
                onClick={() =>
                  setIndex((i) => (i - 1 + images.length) % images.length)
                }
              >
                ← Anterior
              </button>
              <span role="status">
                {index + 1} / {images.length}
              </span>
              <button onClick={() => setIndex((i) => (i + 1) % images.length)}>
                Siguiente →
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </section>
  );
}
