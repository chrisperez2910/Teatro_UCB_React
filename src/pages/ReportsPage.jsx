import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTheater } from "../TheaterContext.jsx";
import { apiRequest } from "../services/api.js";
import { functionDate, formatDate } from "../services/theater.js";
import {
  downloadReport,
  percentage,
  reportInsights,
} from "../services/reporting.js";
import { usePageNavigation } from "../hooks/usePageNavigation.js";
import AdminNav from "../components/AdminNav.jsx";

export default function ReportsPage() {
  usePageNavigation("Reportes · Teatro UCB");
  const { account, catalog, useDatabase } = useTheater();
  const [draft, setDraft] = useState({ desde: "", hasta: "", obra: "" });
  const [filters, setFilters] = useState(draft);
  const [revision, setRevision] = useState(0);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const permitted = useDatabase && account?.rol === "ADMIN";
  useEffect(() => {
    if (!permitted) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    apiRequest(`admin/reportes?${new URLSearchParams(filters)}`, {
      signal: controller.signal,
    })
      .then((data) => {
        if (!controller.signal.aborted) setReport(data);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [permitted, filters, revision]);
  const change = (e) => setDraft({ ...draft, [e.target.name]: e.target.value });
  const submit = (e) => {
    e.preventDefault();
    if (draft.desde && draft.hasta && draft.desde > draft.hasta) {
      setError("La fecha inicial no puede ser posterior a la final.");
      return;
    }
    setFilters({ ...draft });
  };
  if (!permitted)
    return (
      <section className="container section narrow">
        <h1 className="page-title">Acceso restringido.</h1>
        <p className="dialog-intro">
          Los reportes están disponibles para la cuenta administradora.
        </p>
        <Link className="button outline" to="/cuenta">
          Ir a mi cuenta
        </Link>
      </section>
    );
  const summary = report?.resumen;
  const cards = summary
    ? [
        [
          "Ocupación",
          percentage(summary.ocupacion),
          "Butacas reservadas / aforo habilitado",
        ],
        [
          "Butacas reservadas",
          summary.ocupadas,
          `${summary.capacidad} lugares habilitados`,
        ],
        [
          "Lugares libres",
          summary.disponibles,
          `${summary.bloqueadas} bloqueados`,
        ],
        [
          "Reservas confirmadas",
          summary.confirmadas,
          `${report.usuarios} cuentas con reserva`,
        ],
        [
          "Cancelaciones",
          summary.canceladas,
          `${percentage(summary.tasa_cancelacion)} de las solicitudes`,
        ],
        ["Funciones", summary.funciones, `${summary.programadas} programadas`],
      ]
    : [];
  return (
    <section className="container section reports-page">
      <AdminNav />
      <header className="report-heading">
        <div>
          <p className="eyebrow">EL TEATRO EN CIFRAS</p>
          <h1 className="page-title">
            Cada lugar
            <br />
            <em>cuenta una historia.</em>
          </h1>
          <p className="report-lead">
            Una mirada a las reservas para planificar la próxima función.
          </p>
        </div>
        <div className="report-actions">
          <button
            className="button outline"
            disabled={loading}
            onClick={() => setRevision((x) => x + 1)}
          >
            Actualizar
          </button>
          <button
            className="button outline"
            disabled={loading || !!error || !report}
            onClick={() => downloadReport(report)}
          >
            Exportar CSV
          </button>
          <button
            className="button gold"
            disabled={loading || !!error || !report}
            onClick={() => window.print()}
          >
            Imprimir / PDF
          </button>
        </div>
      </header>
      <form className="report-filters" onSubmit={submit}>
        <label>
          Funciones desde
          <input
            name="desde"
            type="date"
            value={draft.desde}
            onChange={change}
          />
        </label>
        <label>
          Hasta
          <input
            name="hasta"
            type="date"
            min={draft.desde || undefined}
            value={draft.hasta}
            onChange={change}
          />
        </label>
        <label>
          Obra
          <select name="obra" value={draft.obra} onChange={change}>
            <option value="">Todas las obras</option>
            {catalog.obras.map((w) => (
              <option key={w.id_obra} value={w.id_obra}>
                {w.titulo}
              </option>
            ))}
          </select>
        </label>
        <button className="button gold" disabled={loading}>
          Aplicar filtros
        </button>
        <button
          className="text-button"
          type="button"
          onClick={() => {
            const clean = { desde: "", hasta: "", obra: "" };
            setDraft(clean);
            setFilters(clean);
          }}
        >
          Ver todo
        </button>
      </form>
      {loading && (
        <p className="report-feedback" role="status">
          Consultando las reservas…
        </p>
      )}
      {error && (
        <p className="form-status error" role="alert">
          {error}
        </p>
      )}
      {!loading && !error && report && (
        <div className="report-document">
          <p className="report-period">
            {filters.desde ? formatDate(filters.desde) : "Desde el inicio"} —{" "}
            {filters.hasta ? formatDate(filters.hasta) : "Todas las fechas"} ·{" "}
            {filters.obra
              ? catalog.obras.find((w) => w.id_obra === Number(filters.obra))
                  ?.titulo
              : "Todas las obras"}
            <span>
              Actualizado:{" "}
              {functionDate({ fecha_hora_inicio: report.generado_en })} · La Paz
            </span>
          </p>
          <div className="report-kpis">
            {cards.map(([title, value, detail]) => (
              <article className="report-kpi" key={title}>
                <h2>{title}</h2>
                <strong>{value}</strong>
                <p>{detail}</p>
              </article>
            ))}
          </div>
          {!report.funciones.length ? (
            <div className="report-empty">
              <h2>No hay funciones en esta selección.</h2>
              <p>Amplía las fechas o elige otra obra.</p>
            </div>
          ) : (
            <>
              <div className="report-columns">
                <section className="report-panel">
                  <p className="eyebrow">DEMANDA POR OBRA</p>
                  <h2>Las historias más elegidas.</h2>
                  <p className="muted">
                    Butacas reservadas en funciones programadas.
                  </p>
                  <ol className="report-bars">
                    {report.obras.map((w) => (
                      <li key={w.id_obra}>
                        <div>
                          <strong>{w.titulo}</strong>
                          <span>
                            {w.ocupadas} butacas · {percentage(w.ocupacion)}
                          </span>
                        </div>
                        <div className="report-track" aria-hidden="true">
                          <span
                            style={{
                              width: `${Math.min(100, w.ocupacion || 0)}%`,
                            }}
                          />
                        </div>
                        <small>
                          {w.funciones} función(es) · {w.disponibles} lugares
                          libres
                        </small>
                      </li>
                    ))}
                  </ol>
                </section>
                <section className="report-panel report-decisions">
                  <p className="eyebrow">PARA PLANIFICAR</p>
                  <h2>Qué revisar ahora.</h2>
                  {reportInsights(report).map((x) => (
                    <article className={`decision ${x.tone}`} key={x.title}>
                      <h3>{x.title}</h3>
                      <p>{x.body}</p>
                    </article>
                  ))}
                  <p className="report-footnote">
                    Alertas orientativas según ocupación, proximidad de la
                    función y cancelaciones. No son predicciones de asistencia.
                  </p>
                </section>
              </div>
              <section className="report-panel">
                <div className="report-panel-heading">
                  <div>
                    <p className="eyebrow">LA SALA, FUNCIÓN POR FUNCIÓN</p>
                    <h2>Disponibilidad y reservas.</h2>
                  </div>
                  <p>{report.funciones.length} funciones</p>
                </div>
                <div
                  className="report-table-wrap"
                  tabIndex="0"
                  role="region"
                  aria-label="Tabla de funciones"
                >
                  <table>
                    <caption className="sr-only">
                      Ocupación y reservas por función
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Obra / función</th>
                        <th scope="col">Estado</th>
                        <th scope="col">Aforo</th>
                        <th scope="col">Reservadas</th>
                        <th scope="col">Libres</th>
                        <th scope="col">Bloqueadas</th>
                        <th scope="col">Ocupación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.funciones.map((f) => (
                        <tr key={f.id_funcion}>
                          <th scope="row">
                            {f.titulo}
                            <small>
                              {functionDate(f)} · {f.sala}
                            </small>
                          </th>
                          <td>
                            <span
                              className={`report-badge ${f.estado === "CANCELADA" ? "cancelled" : ""}`}
                            >
                              {f.estado === "CANCELADA"
                                ? "Cancelada"
                                : new Date(f.fecha_hora_inicio) < new Date()
                                  ? "Iniciada"
                                  : "Programada"}
                            </span>
                          </td>
                          <td>{f.capacidad}</td>
                          <td>{f.ocupadas}</td>
                          <td>{f.disponibles}</td>
                          <td>{f.bloqueadas}</td>
                          <td>{percentage(f.ocupacion)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
              <div className="report-columns report-bottom">
                <section className="report-panel">
                  <p className="eyebrow">RITMO DE LAS RESERVAS</p>
                  <h2>Actividad por día.</h2>
                  <p className="muted">
                    Últimos 30 días con solicitudes para las funciones
                    seleccionadas; agrupados por fecha de creación.
                  </p>
                  {report.dias.length ? (
                    <ul className="daily-bars">
                      {report.dias.map((d) => (
                        <li key={d.dia}>
                          <span>{formatDate(d.dia)}</span>
                          <div className="report-track" aria-hidden="true">
                            <span
                              style={{
                                width: `${(d.total / Math.max(...report.dias.map((x) => x.total))) * 100}%`,
                              }}
                            />
                          </div>
                          <strong>{d.total}</strong>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="report-feedback">
                      Todavía no hay solicitudes.
                    </p>
                  )}
                </section>
                <section className="report-panel">
                  <p className="eyebrow">LECTURA DEL INFORME</p>
                  <h2>Los números, claros.</h2>
                  <dl className="report-definitions">
                    <dt>Una reserva puede incluir varias butacas.</dt>
                    <dd>
                      Las solicitudes y las butacas se cuentan por separado.
                    </dd>
                    <dt>Ocupación ponderada.</dt>
                    <dd>
                      Butacas con reserva activa divididas por aforo habilitado;
                      no es un promedio de porcentajes.
                    </dd>
                    <dt>Fechas y estados.</dt>
                    <dd>
                      El filtro usa la fecha de la función en La Paz. La
                      ocupación global excluye funciones canceladas; las
                      solicitudes incluyen todos los estados.
                    </dd>
                    <dt>Reservas, no asistencia.</dt>
                    <dd>
                      No se registran pagos ni control de ingreso. Este informe
                      no calcula ingresos ni espectadores presentes.
                    </dd>
                  </dl>
                </section>
              </div>
              <section className="report-panel">
                <p className="eyebrow">SEGUIMIENTO</p>
                <h2>Últimas solicitudes.</h2>
                <p className="muted">
                  Hasta 100 reservas de la selección, sin mostrar datos
                  personales.
                </p>
                <div
                  className="report-table-wrap"
                  tabIndex="0"
                  role="region"
                  aria-label="Últimas reservas"
                >
                  <table>
                    <caption className="sr-only">
                      Últimas solicitudes de reserva
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Código</th>
                        <th scope="col">Obra</th>
                        <th scope="col">Creada</th>
                        <th scope="col">Butacas</th>
                        <th scope="col">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.reservas.map((r) => (
                        <tr key={r.codigo_reserva}>
                          <th scope="row">{r.codigo_reserva}</th>
                          <td>{r.titulo}</td>
                          <td>
                            {functionDate({ fecha_hora_inicio: r.creada_en })}
                          </td>
                          <td>{r.butacas}</td>
                          <td>
                            {r.estado === "CONFIRMADA"
                              ? "Confirmada"
                              : "Cancelada"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!report.reservas.length && (
                    <p className="report-feedback">
                      No hay reservas registradas.
                    </p>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      )}
    </section>
  );
}
