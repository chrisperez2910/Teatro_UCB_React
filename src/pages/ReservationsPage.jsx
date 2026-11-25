import { useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTheater } from "../TheaterContext.jsx";
import { usePageNavigation } from "../hooks/usePageNavigation.js";
import {
  getPerformance,
  workForPerformance,
  functionDate,
  seatLabel,
  receiptText,
} from "../services/theater.js";
export default function ReservationsPage() {
  usePageNavigation("Mis reservas · Teatro UCB");
  const { catalog, state, cancelReservation, account, useDatabase } =
      useTheater(),
    location = useLocation(),
    heading = useRef(null);
  const [confirmId, setConfirmId] = useState(null),
    [notice, setNotice] = useState("");
  if (useDatabase && !account)
    return (
      <section className="container section narrow">
        <p className="eyebrow">TU PASO POR EL TEATRO</p>
        <h1 className="page-title">Mis reservas.</h1>
        <p className="dialog-intro">
          Ingresa a tu cuenta para ver y gestionar tus reservas.
        </p>
        <Link
          className="button gold"
          to="/cuenta"
          state={{ returnTo: "/reservas" }}
        >
          Iniciar sesión
        </Link>
      </section>
    );
  function download(r) {
    const url = URL.createObjectURL(
      new Blob([receiptText(catalog, r)], { type: "text/plain;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `reserva-${r.codigo_reserva}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="container section narrow">
      <p className="eyebrow">TU PASO POR EL TEATRO</p>
      <h1 ref={heading} tabIndex="-1" className="page-title">
        Mis reservas.
      </h1>
      <p className="dialog-intro">
        {useDatabase
          ? "Aquí encontrarás las reservas de tu cuenta."
          : "Aquí quedan las reservas que hiciste desde este navegador."}
      </p>
      {location.state?.newCode &&
        state.reservas.some(
          (r) =>
            r.codigo_reserva === location.state.newCode &&
            r.estado === "CONFIRMADA",
        ) && (
          <p className="form-status" role="status">
            Tu reserva {location.state.newCode} quedó guardada.
          </p>
        )}
      {notice && (
        <p className="form-status" role="status">
          {notice}
        </p>
      )}
      {!state.reservas.length ? (
        <div className="empty-state">
          <p>Todavía no tienes reservas. La próxima historia te espera.</p>
          <Link className="button outline" to="/#cartelera">
            Explorar cartelera
          </Link>
        </div>
      ) : (
        state.reservas.toReversed().map((r) => {
          const f = getPerformance(catalog, r.id_funcion);
          return (
            <article className="history-item" key={r.id_reserva}>
              <p className="code">
                {r.codigo_reserva} ·{" "}
                {r.estado === "CONFIRMADA" ? "Confirmada" : "Cancelada"}
              </p>
              <h2 className="subheading">
                {workForPerformance(catalog, f).titulo}
              </h2>
              <p>{functionDate(f)}</p>
              <p>
                Butacas:{" "}
                {r.butacas.map((id) => seatLabel(catalog, id)).join(", ")}
              </p>
              <p>
                {r.nombre_contacto} · {r.correo_contacto}
              </p>
              {r.estado === "CONFIRMADA" && (
                <>
                  <div className="history-actions">
                    <button onClick={() => download(r)}>
                      Descargar constancia
                    </button>
                    <button
                      className="cancel"
                      onClick={() => setConfirmId(r.id_reserva)}
                    >
                      Cancelar reserva
                    </button>
                  </div>
                  {confirmId === r.id_reserva && (
                    <div className="cancel-confirm">
                      <p>
                        ¿Cancelar esta reserva? Las butacas volverán a estar
                        disponibles.
                      </p>
                      <div className="history-actions">
                        <button
                          className="cancel"
                          onClick={async () => {
                            try {
                              await cancelReservation(r.id_reserva);
                              setConfirmId(null);
                              setNotice(
                                "Reserva cancelada. Las butacas están disponibles nuevamente.",
                              );
                              heading.current.focus();
                            } catch (e) {
                              setNotice(e.message);
                            }
                          }}
                        >
                          Sí, cancelar
                        </button>
                        <button onClick={() => setConfirmId(null)}>
                          Conservar reserva
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </article>
          );
        })
      )}
      <p className="section-note">
        Estas constancias pertenecen a la demostración y no son entradas reales.
      </p>
    </section>
  );
}
