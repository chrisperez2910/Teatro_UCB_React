import AdminNav from "../components/AdminNav.jsx";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTheater } from "../TheaterContext.jsx";
import { apiRequest } from "../services/api.js";
import { functionDate, workForPerformance } from "../services/theater.js";
import { usePageNavigation } from "../hooks/usePageNavigation.js";

export default function AdminPage() {
  usePageNavigation("Administración · Teatro UCB");
  const { account, catalog, useDatabase } = useTheater();
  const [selected, setSelected] = useState(
    catalog.funciones[0]?.id_funcion || "",
  );
  const [seats, setSeats] = useState([]);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [start, setStart] = useState("");
  const [scheduleMessage, setScheduleMessage] = useState("");
  const allowed = useDatabase && account?.rol === "ADMIN";

  useEffect(() => {
    if (!allowed || !selected) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    apiRequest(`admin/funciones/${selected}/butacas`, {
      signal: controller.signal,
    })
      .then((data) => {
        if (!controller.signal.aborted) setSeats(data.butacas);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [allowed, selected, revision]);

  async function toggle(seat) {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const data = await apiRequest(
        `admin/funciones/${selected}/butacas/${seat.id_butaca}`,
        {
          method: "POST",
          body: JSON.stringify({ habilitada: !seat.habilitada }),
        },
      );
      setSeats(data.butacas);
      setMessage(
        `Butaca ${seat.fila}${seat.numero} ${seat.habilitada ? "bloqueada" : "habilitada"}. Cambio guardado.`,
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function schedule(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setScheduleMessage("");
    try {
      await apiRequest(`admin/funciones/${selected}/programacion`, {
        method: "POST",
        body: JSON.stringify({ inicio: `${start}:00-04:00` }),
      });
      setScheduleMessage(
        "Horario actualizado. La cartelera reflejará el cambio al actualizarse.",
      );
      setStart("");
    } catch (e) {
      setScheduleMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (!allowed)
    return (
      <section className="container section narrow">
        <p className="eyebrow">ADMINISTRACIÓN</p>
        <h1 className="page-title">Acceso restringido.</h1>
        <p className="dialog-intro">
          Necesitas una cuenta con permiso de administración para gestionar la
          sala.
        </p>
        <Link className="button outline" to="/cuenta">
          Ir a mi cuenta
        </Link>
      </section>
    );
  const taken = seats.filter((s) => s.ocupada).length;
  const blocked = seats.filter(
    (s) => !s.ocupada && (!s.habilitada || !s.activa),
  ).length;
  const available = seats.length - taken - blocked;
  return (
    <section className="container section admin-page">
      <AdminNav />
      <header className="section-heading">
        <div>
          <p className="eyebrow">DETRÁS DEL TELÓN</p>
          <h1 className="page-title">
            La sala, <em>en orden.</em>
          </h1>
        </div>
        <p>
          Organiza los lugares disponibles para cada función. Las butacas
          reservadas quedan protegidas.
        </p>
      </header>
      <div className="admin-toolbar">
        <label htmlFor="admin-function">
          Función
          <select
            id="admin-function"
            value={selected}
            disabled={busy}
            onChange={(e) => {
              setSelected(Number(e.target.value));
              setSeats([]);
              setMessage("");
              setStart("");
              setScheduleMessage("");
            }}
          >
            {catalog.funciones.map((f) => (
              <option key={f.id_funcion} value={f.id_funcion}>
                {workForPerformance(catalog, f)?.titulo} · {functionDate(f)} ·{" "}
                {f.estado}
              </option>
            ))}
          </select>
        </label>
        <button
          className="button outline"
          disabled={busy || loading}
          onClick={() => setRevision((v) => v + 1)}
        >
          Actualizar sala
        </button>
      </div>
      <form className="schedule-form" onSubmit={schedule}>
        <div>
          <h2>Programar esta función</h2>
          <p>
            Elige el nuevo inicio. La duración se toma de la ficha de la obra.
            Solo se permite si la función no tiene reservas confirmadas.
          </p>
        </div>
        <label>
          Fecha y hora en La Paz
          <input
            type="datetime-local"
            required
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
        <button className="button outline" disabled={busy}>
          Guardar horario
        </button>
        <p role="status">{scheduleMessage}</p>
      </form>
      {error && (
        <p className="form-status error" role="alert">
          {error}
        </p>
      )}
      <p className="admin-status" role="status">
        {loading ? "Consultando la sala…" : message}
      </p>
      {!loading && !error && (
        <>
          <dl className="admin-metrics">
            <div>
              <dt>Disponibles</dt>
              <dd>{available}</dd>
            </div>
            <div>
              <dt>Ocupadas</dt>
              <dd>{taken}</dd>
            </div>
            <div>
              <dt>Bloqueadas</dt>
              <dd>{blocked}</dd>
            </div>
          </dl>
          <div className="admin-map" aria-busy={busy}>
            <div className="stage">ESCENARIO</div>
            <p className="seat-help">
              Pulsa una butaca disponible para bloquearla, o una bloqueada para
              habilitarla.
            </p>
            <div
              className="admin-seats"
              role="group"
              aria-label="Administrar butacas"
            >
              {seats.map((seat) => {
                const blocked = !seat.habilitada || !seat.activa;
                return (
                  <button
                    key={seat.id_butaca}
                    type="button"
                    className={`admin-seat ${seat.ocupada ? "taken" : blocked ? "blocked" : "available"}`}
                    disabled={busy || seat.ocupada || !seat.activa}
                    aria-label={`Butaca ${seat.fila}${seat.numero}: ${seat.ocupada ? "ocupada" : blocked ? "bloqueada, habilitar" : "disponible, bloquear"}`}
                    onClick={() => toggle(seat)}
                  >
                    <strong>
                      {seat.fila}
                      {seat.numero}
                    </strong>
                    <small>
                      {seat.ocupada
                        ? "Ocupada"
                        : blocked
                          ? "Bloqueada"
                          : "Disponible"}
                    </small>
                  </button>
                );
              })}
            </div>
          </div>
          <p className="dialog-intro">
            Los cambios afectan únicamente a la función elegida. Cada cambio
            registra qué administrador lo realizó. Usa «Actualizar sala» para
            consultar las reservas más recientes.
          </p>
        </>
      )}
    </section>
  );
}
