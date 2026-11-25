// Consultas separadas por nivel para no multiplicar reservas al unir sus butacas.
export function reportFilters(params) {
  const filters = {
    desde: params.get("desde") || "",
    hasta: params.get("hasta") || "",
    obra: params.get("obra") || "",
  };
  for (const field of ["desde", "hasta"]) {
    const value = filters[field];
    if (
      value &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        !Number.isFinite(Date.parse(value)) ||
        new Date(value).toISOString().slice(0, 10) !== value)
    ) {
      throw Object.assign(new Error("Ingresa fechas válidas."), {
        status: 400,
      });
    }
  }
  if (filters.desde && filters.hasta && filters.desde > filters.hasta)
    throw Object.assign(
      new Error("La fecha inicial no puede ser posterior a la final."),
      { status: 400 },
    );
  if (
    filters.obra &&
    (!/^\d+$/.test(filters.obra) ||
      !Number.isSafeInteger(Number(filters.obra)) ||
      Number(filters.obra) < 1 ||
      Number(filters.obra) > 2147483647)
  )
    throw Object.assign(new Error("Selecciona una obra válida."), {
      status: 400,
    });
  return filters;
}
const scope = `WITH elegidas AS (
  SELECT f.*, o.id_obra, o.titulo, s.nombre AS sala FROM funcion f
  JOIN produccion p ON p.id_produccion=f.id_produccion
  JOIN obra o ON o.id_obra=p.id_obra JOIN sala s ON s.id_sala=f.id_sala
  WHERE ($1::date IS NULL OR (f.fecha_hora_inicio AT TIME ZONE 'America/La_Paz')::date >= $1::date)
    AND ($2::date IS NULL OR (f.fecha_hora_inicio AT TIME ZONE 'America/La_Paz')::date <= $2::date)
    AND ($3::integer IS NULL OR o.id_obra=$3::integer)
)`;
const percent = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : null);
export function summarizeReport(functions) {
  const scheduled = functions.filter((f) => f.estado === "PROGRAMADA");
  const sum = (list, key) => list.reduce((n, row) => n + row[key], 0);
  const total =
    sum(functions, "reservas_confirmadas") +
    sum(functions, "reservas_canceladas");
  const capacity = sum(scheduled, "capacidad");
  const occupied = sum(scheduled, "ocupadas");
  const works = new Map();
  for (const f of scheduled) {
    const w = works.get(f.id_obra) || {
      id_obra: f.id_obra,
      titulo: f.titulo,
      funciones: 0,
      capacidad: 0,
      ocupadas: 0,
      disponibles: 0,
      reservas: 0,
      canceladas: 0,
    };
    w.funciones++;
    w.capacidad += f.capacidad;
    w.ocupadas += f.ocupadas;
    w.disponibles += f.disponibles;
    w.reservas += f.reservas_confirmadas;
    w.canceladas += f.reservas_canceladas;
    works.set(f.id_obra, w);
  }
  return {
    resumen: {
      funciones: functions.length,
      programadas: scheduled.length,
      capacidad: capacity,
      ocupadas: occupied,
      disponibles: sum(scheduled, "disponibles"),
      bloqueadas: sum(scheduled, "bloqueadas"),
      reservas: total,
      confirmadas: sum(functions, "reservas_confirmadas"),
      canceladas: sum(functions, "reservas_canceladas"),
      ocupacion: percent(occupied, capacity),
      tasa_cancelacion: percent(sum(functions, "reservas_canceladas"), total),
    },
    obras: [...works.values()]
      .map((w) => ({ ...w, ocupacion: percent(w.ocupadas, w.capacidad) }))
      .sort(
        (a, b) => b.ocupadas - a.ocupadas || a.titulo.localeCompare(b.titulo),
      ),
  };
}
export async function getReport(pool, filters) {
  const db = await pool.connect();
  try {
    await db.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const values = [
      filters.desde || null,
      filters.hasta || null,
      filters.obra ? Number(filters.obra) : null,
    ];
    const functions = (
      await db.query(
        `${scope}, lugares AS (
      SELECT fb.id_funcion,fb.id_butaca,(fb.habilitada AND b.activa) AS habilitada,
        EXISTS(SELECT 1 FROM reserva_butaca rb JOIN reserva r ON r.id_reserva=rb.id_reserva
          WHERE rb.id_funcion=fb.id_funcion AND rb.id_butaca=fb.id_butaca AND rb.activa AND r.estado='CONFIRMADA') AS ocupada
      FROM funcion_butaca fb JOIN elegidas e ON e.id_funcion=fb.id_funcion
      JOIN butaca b ON b.id_butaca=fb.id_butaca AND b.id_sala=e.id_sala
    ), aforo AS (
      SELECT id_funcion,count(*)::integer AS total,
        count(*) FILTER(WHERE habilitada OR ocupada)::integer AS capacidad,
        count(*) FILTER(WHERE ocupada)::integer AS ocupadas,
        count(*) FILTER(WHERE habilitada AND NOT ocupada)::integer AS disponibles,
        count(*) FILTER(WHERE NOT habilitada AND NOT ocupada)::integer AS bloqueadas
      FROM lugares GROUP BY id_funcion
    ), solicitudes AS (
      SELECT r.id_funcion,count(*) FILTER(WHERE r.estado='CONFIRMADA')::integer AS confirmadas,
        count(*) FILTER(WHERE r.estado='CANCELADA')::integer AS canceladas
      FROM reserva r JOIN elegidas e ON e.id_funcion=r.id_funcion GROUP BY r.id_funcion
    ) SELECT e.id_funcion,e.id_obra,e.titulo,e.sala,e.fecha_hora_inicio,e.estado,
      coalesce(a.total,0) AS total,coalesce(a.capacidad,0) AS capacidad,coalesce(a.ocupadas,0) AS ocupadas,
      coalesce(a.disponibles,0) AS disponibles,coalesce(a.bloqueadas,0) AS bloqueadas,
      coalesce(s.confirmadas,0) AS reservas_confirmadas,coalesce(s.canceladas,0) AS reservas_canceladas
      FROM elegidas e LEFT JOIN aforo a USING(id_funcion) LEFT JOIN solicitudes s USING(id_funcion)
      ORDER BY e.fecha_hora_inicio,e.id_funcion`,
        values,
      )
    ).rows;
    const days = (
      await db.query(
        `${scope} SELECT (r.creada_en AT TIME ZONE 'America/La_Paz')::date::text AS dia,
      count(*)::integer AS total,count(*) FILTER(WHERE r.estado='CONFIRMADA')::integer AS confirmadas,
      count(*) FILTER(WHERE r.estado='CANCELADA')::integer AS canceladas
      FROM reserva r JOIN elegidas e ON e.id_funcion=r.id_funcion
      GROUP BY 1 ORDER BY 1 DESC LIMIT 30`,
        values,
      )
    ).rows.reverse();
    const clients = (
      await db.query(
        `${scope} SELECT count(DISTINCT r.id_usuario)::integer AS usuarios
      FROM reserva r JOIN elegidas e ON e.id_funcion=r.id_funcion WHERE r.estado='CONFIRMADA'`,
        values,
      )
    ).rows[0];
    const bookings = (
      await db.query(
        `${scope} SELECT r.codigo_reserva,r.estado,r.creada_en,e.titulo,e.fecha_hora_inicio,
      count(rb.id_butaca)::integer AS butacas FROM reserva r JOIN elegidas e ON e.id_funcion=r.id_funcion
      LEFT JOIN reserva_butaca rb ON rb.id_reserva=r.id_reserva GROUP BY r.id_reserva,e.titulo,e.fecha_hora_inicio
      ORDER BY r.creada_en DESC LIMIT 100`,
        values,
      )
    ).rows;
    await db.query("COMMIT");
    return {
      generado_en: new Date().toISOString(),
      filtros: filters,
      zona_horaria: "America/La_Paz",
      ...summarizeReport(functions),
      usuarios: clients.usuarios,
      funciones: functions.map((f) => ({
        ...f,
        ocupacion: percent(f.ocupadas, f.capacidad),
      })),
      dias: days,
      reservas: bookings,
    };
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally {
    db.release();
  }
}
