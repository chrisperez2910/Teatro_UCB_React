import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheater } from "../TheaterContext.jsx";
import { formatDate } from "../services/theater.js";
import Dialog from "./Dialog.jsx";
import ContactForm from "./ContactForm.jsx";
export default function WorkshopsSection() {
  const { catalog, state, enroll, account, useDatabase } = useTheater(),
    navigate = useNavigate(),
    [selected, setSelected] = useState(null);
  return (
    <section
      className="workshop-section"
      id="talleres"
      aria-labelledby="workshop-title"
    >
      <div className="container workshop-layout">
        <header>
          <p className="eyebrow">04 / APRENDE HACIENDO</p>
          <h2 id="workshop-title">
            Del público
            <br />
            <em>al escenario.</em>
          </h2>
          <p>
            No necesitas haber actuado antes. Solo curiosidad, ganas de
            compartir y una historia por contar.
          </p>
          <span className="workshop-stamp">
            EXPLORA TU VOZ.
            <br />
            ENCUENTRA TU ESCENA.
          </span>
        </header>
        <div>
          {catalog.talleres.map((t) => {
            const available =
              t.cupo_maximo -
              (catalog.workshopCounts?.find((c) => c.id_taller === t.id_taller)
                ?.total ??
                state.inscripciones.filter(
                  (i) =>
                    i.id_taller === t.id_taller && i.estado !== "CANCELADA",
                ).length);
            return (
              <article className="workshop-card" key={t.id_taller}>
                <p className="eyebrow">TALLER · {t.horario}</p>
                <h3>{t.titulo}</h3>
                <p>{t.descripcion}</p>
                <div className="workshop-bottom">
                  <span>{available} cupos disponibles</span>
                  <button
                    disabled={
                      !useDatabase ||
                      available <= 0 ||
                      t.estado !== "ABIERTO" ||
                      t.fecha_limite_inscripcion <
                        new Intl.DateTimeFormat("sv-SE", {
                          timeZone: "America/La_Paz",
                        }).format(new Date())
                    }
                    onClick={() =>
                      useDatabase && !account
                        ? navigate("/cuenta", {
                            state: { returnTo: "/#talleres" },
                          })
                        : setSelected(t)
                    }
                  >
                    {!useDatabase
                      ? "Inscripción no disponible"
                      : t.fecha_limite_inscripcion <
                          new Intl.DateTimeFormat("sv-SE", {
                            timeZone: "America/La_Paz",
                          }).format(new Date())
                        ? "Inscripción cerrada"
                        : "Quiero participar"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
      {selected && (
        <Dialog
          id="workshop-dialog"
          labelledBy="workshop-dialog-title"
          closeLabel="Cerrar inscripción"
          onDismiss={() => setSelected(null)}
        >
          <p className="eyebrow">UN ESPACIO PARA APRENDER</p>
          <h2 id="workshop-dialog-title">{selected.titulo}</h2>
          <p className="dialog-intro">{selected.convocatoria_texto}</p>
          <p className="workshop-dates">
            Fechas: {formatDate(selected.fecha_inicio)} al{" "}
            {formatDate(selected.fecha_fin)}.<br />
            Inscripción hasta el {formatDate(selected.fecha_limite_inscripcion)}
            .
          </p>
          <ContactForm
            initialValues={
              account
                ? { nombre: account.nombre, correo: account.correo }
                : undefined
            }
            buttonText="Guardar inscripción"
            successButtonText="Inscripción guardada"
            successMessage="Tu inscripción quedó guardada. ¡Nos vemos en el taller!"
            note="Revisa tus datos antes de confirmar la inscripción."
            onConfirm={(values) => enroll(selected.id_taller, values)}
          />
        </Dialog>
      )}
    </section>
  );
}
