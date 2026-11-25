import { Fragment, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheater } from "../TheaterContext.jsx";
import { useSeatSelection } from "../hooks/useSeatSelection.js";
import {
  functionDate,
  getAuthors,
  occupiedSeats,
  seatLabel,
  workForPerformance,
} from "../services/theater.js";
import Dialog from "./Dialog.jsx";
import ContactForm from "./ContactForm.jsx";
export default function BookingSection({
  performance,
  onFunctionChange,
  initialSeats = [],
}) {
  const { catalog, state, reserve, account, useDatabase } = useTheater(),
    navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);
  const occupied = useMemo(
    () => occupiedSeats(catalog, state, performance.id_funcion),
    [catalog, state, performance.id_funcion],
  );
  const selection = useSeatSelection(occupied, initialSeats);
  const work = workForPerformance(catalog, performance),
    sala = catalog.salas.find((s) => s.id_sala === performance.id_sala);
  const seats = catalog.butacas
    .filter((b) => b.id_sala === sala.id_sala && b.activa)
    .toSorted(
      (a, b) => a.posicion_y - b.posicion_y || a.posicion_x - b.posicion_x,
    );
  const enabled = new Set(
    catalog.funcionButaca
      .filter((b) => b.id_funcion === performance.id_funcion && b.habilitada)
      .map((b) => b.id_butaca),
  );
  return (
    <section
      className="booking-section"
      id="butacas"
      aria-labelledby="booking-title"
    >
      <div className="container">
        <header className="section-heading">
          <div>
            <p className="eyebrow">02 / TU LUGAR EN LA SALA</p>
            <h2 id="booking-title">
              La mejor vista
              <br />
              <em>empieza aquí.</em>
            </h2>
          </div>
          <p>
            Elige una función y marca tus butacas. Puedes reservar hasta seis
            lugares juntos en una misma solicitud.
          </p>
        </header>
        <div className="booking-layout">
          <div className="seat-panel">
            <label className="field-label" htmlFor="performance">
              ELIGE TU FUNCIÓN
            </label>
            <select
              id="performance"
              value={performance.id_funcion}
              onChange={(e) => onFunctionChange(Number(e.target.value))}
            >
              {catalog.funciones
                .filter((f) => f.estado === "PROGRAMADA")
                .map((f) => (
                  <option key={f.id_funcion} value={f.id_funcion}>
                    {workForPerformance(catalog, f).titulo} · {functionDate(f)}
                  </option>
                ))}
            </select>
            <div className="stage">ESCENARIO</div>
            <div
              className="seat-map"
              role="group"
              aria-label="Butacas de la sala"
            >
              {[...new Set(seats.map((b) => b.fila))].map((row) => (
                <Fragment key={row}>
                  <span className="row-label" aria-hidden="true">
                    {row}
                  </span>
                  {seats
                    .filter((b) => b.fila === row)
                    .map((b, i) => {
                      const taken = occupied.has(b.id_butaca),
                        disabled = taken || !enabled.has(b.id_butaca),
                        selected = selection.seats.includes(b.id_butaca);
                      return (
                        <Fragment key={b.id_butaca}>
                          {i === 4 && <span aria-hidden="true" />}
                          <button
                            className={`seat ${disabled ? "occupied" : ""}`}
                            disabled={disabled}
                            aria-pressed={selected}
                            aria-label={`Butaca ${b.fila}${b.numero}, ${taken ? "ocupada" : !enabled.has(b.id_butaca) ? "no habilitada" : selected ? "seleccionada" : "disponible"}`}
                            onClick={() => selection.toggle(b.id_butaca)}
                          >
                            {disabled ? "×" : b.numero}
                          </button>
                        </Fragment>
                      );
                    })}
                </Fragment>
              ))}
            </div>
            <ul className="seat-legend">
              <li>
                <i className="legend-seat" />
                Disponible
              </li>
              <li>
                <i className="legend-seat selected" />
                Tu selección
              </li>
              <li>
                <i className="legend-seat occupied">×</i>Ocupada
              </li>
            </ul>
            <p className="seat-help">
              Vista desde el público hacia el escenario.
            </p>
          </div>
          <aside
            className="reservation-summary"
            aria-label="Resumen de tu reserva"
          >
            <p className="eyebrow">TU PRÓXIMA FUNCIÓN</p>
            <h3>{work.titulo}</h3>
            <p className="muted">{getAuthors(catalog, work.id_obra)}</p>
            <dl className="ticket-details">
              <div>
                <dt>Función</dt>
                <dd>{functionDate(performance)}</dd>
              </div>
              <div>
                <dt>Sala</dt>
                <dd>{sala.nombre}</dd>
              </div>
              <div>
                <dt>Butacas</dt>
                <dd>
                  {selection.seats
                    .map((id) => seatLabel(catalog, id))
                    .join(", ") || "Por elegir"}
                </dd>
              </div>
            </dl>
            <p className="selection-status" role="status">
              {selection.message ||
                (selection.seats.length
                  ? `${selection.seats.length} ${selection.seats.length === 1 ? "butaca seleccionada" : "butacas seleccionadas"}.`
                  : "Selecciona tus butacas en el mapa.")}
            </p>
            <button
              className="button gold full"
              disabled={!selection.seats.length}
              onClick={() =>
                useDatabase && !account
                  ? navigate("/cuenta", {
                      state: {
                        returnTo: `/?funcion=${performance.id_funcion}#butacas`,
                        booking: {
                          id: performance.id_funcion,
                          seats: selection.seats,
                        },
                      },
                    })
                  : setFormOpen(true)
              }
            >
              Continuar reserva <span aria-hidden="true">↗</span>
            </button>
            <p className="fine-print">
              {useDatabase && !account
                ? "Inicia sesión para guardar tu reserva."
                : "Reserva de prueba · Sin pagos ni envío de correos."}
            </p>
          </aside>
        </div>
      </div>
      {formOpen && (
        <Dialog
          id="reservation-dialog"
          labelledBy="reservation-title"
          closeLabel="Cerrar reserva"
          onDismiss={() => setFormOpen(false)}
        >
          <p className="eyebrow">CASI ESTAMOS</p>
          <h2 id="reservation-title">Guarda tu lugar.</h2>
          <p className="dialog-intro">
            {work.titulo} · {functionDate(performance)}
            <br />
            Butacas:{" "}
            {selection.seats.map((id) => seatLabel(catalog, id)).join(", ")}
          </p>
          <ContactForm
            initialValues={
              account
                ? { nombre: account.nombre, correo: account.correo }
                : undefined
            }
            buttonText="Guardar reserva"
            successButtonText="Reserva guardada"
            successMessage="Abriendo mis reservas…"
            note="Reserva de prueba. En modo base de datos se guarda en PostgreSQL; no se envía ningún correo."
            onConfirm={async (values) => {
              const r = await reserve(
                performance.id_funcion,
                selection.seats,
                values,
              );
              navigate("/reservas", { state: { newCode: r.codigo_reserva } });
            }}
          />
        </Dialog>
      )}
    </section>
  );
}
