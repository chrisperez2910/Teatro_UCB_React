export const normalize = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
export const assetUrl = (path) =>
  `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
export const formatDate = (value) =>
  new Intl.DateTimeFormat("es-BO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "America/La_Paz",
  }).format(new Date(value.length === 10 ? `${value}T12:00:00-04:00` : value));
export const functionDate = (f) =>
  `${formatDate(f.fecha_hora_inicio)} · ${new Intl.DateTimeFormat("es-BO", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/La_Paz" }).format(new Date(f.fecha_hora_inicio))}`;
export const createId = () =>
  [...crypto.getRandomValues(new Uint8Array(16))]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
export const getWork = (c, id) => c.obras.find((o) => o.id_obra === Number(id));
export const getPerformance = (c, id) =>
  c.funciones.find((f) => f.id_funcion === Number(id));
export const getAuthors = (c, id) =>
  c.obraDramaturgo
    .filter((v) => v.id_obra === id)
    .map(
      (v) =>
        c.dramaturgos.find((d) => d.id_dramaturgo === v.id_dramaturgo)
          .nombre_completo,
    )
    .join(", ");
export const seatLabel = (c, id) => {
  const s = c.butacas.find((b) => b.id_butaca === id);
  return s ? `${s.fila}${s.numero}` : "";
};
export const workForPerformance = (c, f) =>
  getWork(
    c,
    c.producciones.find((p) => p.id_produccion === f.id_produccion).id_obra,
  );
export const performancesFor = (c, work) =>
  c.funciones
    .filter(
      (f) =>
        f.estado === "PROGRAMADA" &&
        c.producciones.some(
          (p) =>
            p.id_produccion === f.id_produccion && p.id_obra === work.id_obra,
        ),
    )
    .toSorted((a, b) => a.fecha_hora_inicio.localeCompare(b.fecha_hora_inicio));
export const STORAGE_KEY = "teatro-ucb-avance-v1";
export const emptyState = () => ({
  version: 1,
  reservas: [],
  inscripciones: [],
});
export function occupiedSeats(c, state, id) {
  return new Set([
    ...c.reservaButacaEjemplo
      .filter((b) => b.id_funcion === id && b.vigente)
      .map((b) => b.id_butaca),
    ...state.reservas
      .filter((r) => r.id_funcion === id && r.estado === "CONFIRMADA")
      .flatMap((r) => r.butacas),
  ]);
}
export function validateContact(values) {
  const errors = {};
  if (typeof values.nombre !== "string" || values.nombre.trim().length < 3)
    errors.nombre = "Escribe tu nombre, con al menos 3 caracteres.";
  else if (values.nombre.length > 80)
    errors.nombre = "Usa como máximo 80 caracteres.";
  if (
    typeof values.correo !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.correo.trim()) ||
    values.correo.length > 120
  )
    errors.correo = "Escribe un correo válido, por ejemplo nombre@correo.com.";
  return errors;
}
function requireContact(values) {
  const errors = validateContact(values);
  if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
}
export function buildReservation(c, state, id, selected, values) {
  requireContact(values);
  const f = getPerformance(c, id);
  if (!f || f.estado !== "PROGRAMADA")
    throw new Error("Esta función no está disponible.");
  if (
    !selected.length ||
    selected.length > 6 ||
    new Set(selected).size !== selected.length
  )
    throw new Error("Selecciona entre 1 y 6 butacas diferentes.");
  const taken = occupiedSeats(c, state, id);
  if (
    selected.some(
      (seat) =>
        taken.has(seat) ||
        !c.funcionButaca.some(
          (b) => b.id_funcion === id && b.id_butaca === seat && b.habilitada,
        ),
    )
  )
    throw new Error(
      "Una de las butacas ya no está disponible. Vuelve al mapa y elige otra.",
    );
  return {
    id_reserva: createId(),
    id_funcion: id,
    nombre_contacto: values.nombre.trim(),
    correo_contacto: values.correo.trim().toLowerCase(),
    codigo_reserva: `UCB-${createId().slice(0, 8).toUpperCase()}`,
    estado: "CONFIRMADA",
    creada_en: new Date().toISOString(),
    butacas: [...selected].sort((a, b) => a - b),
  };
}
export function buildEnrollment(c, state, id, values) {
  requireContact(values);
  const t = c.talleres.find((t) => t.id_taller === id);
  if (!t || t.estado !== "ABIERTO")
    throw new Error("Este taller no admite inscripciones.");
  const email = values.correo.trim().toLowerCase();
  const enrolled = state.inscripciones.filter(
    (i) => i.id_taller === id && i.estado !== "CANCELADA",
  );
  if (enrolled.some((i) => i.correo_participante.toLowerCase() === email))
    throw new Error(
      "Este correo ya está inscrito en este taller dentro de la demostración.",
    );
  if (enrolled.length >= t.cupo_maximo)
    throw new Error(
      "Se completaron los cupos de ejemplo. Puedes elegir otro taller.",
    );
  return {
    id_inscripcion: createId(),
    id_taller: id,
    nombre_participante: values.nombre.trim(),
    correo_participante: email,
    fecha_inscripcion: new Date().toISOString(),
    estado: "INSCRITA",
  };
}
export function validateStoredState(data, c) {
  try {
    if (
      !data ||
      data.version !== 1 ||
      !Array.isArray(data.reservas) ||
      !Array.isArray(data.inscripciones)
    )
      return false;
    const ids = new Set(),
      codes = new Set(),
      activeSeats = new Set(),
      emails = new Set();
    for (const r of data.reservas) {
      if (
        !r ||
        typeof r.id_reserva !== "string" ||
        ids.has(r.id_reserva) ||
        typeof r.codigo_reserva !== "string" ||
        codes.has(r.codigo_reserva) ||
        !["CONFIRMADA", "CANCELADA"].includes(r.estado) ||
        Object.keys(
          validateContact({
            nombre: r.nombre_contacto,
            correo: r.correo_contacto,
          }),
        ).length ||
        !getPerformance(c, r.id_funcion) ||
        !Array.isArray(r.butacas) ||
        !r.butacas.length ||
        r.butacas.length > 6 ||
        new Set(r.butacas).size !== r.butacas.length
      )
        return false;
      ids.add(r.id_reserva);
      codes.add(r.codigo_reserva);
      for (const id of r.butacas) {
        if (
          !c.funcionButaca.some(
            (b) =>
              b.id_funcion === r.id_funcion &&
              b.id_butaca === id &&
              b.habilitada,
          )
        )
          return false;
        const key = `${r.id_funcion}-${id}`;
        if (r.estado === "CONFIRMADA") {
          if (
            activeSeats.has(key) ||
            c.reservaButacaEjemplo.some(
              (b) =>
                b.vigente &&
                b.id_funcion === r.id_funcion &&
                b.id_butaca === id,
            )
          )
            return false;
          activeSeats.add(key);
        }
      }
    }
    for (const i of data.inscripciones) {
      if (
        !i ||
        typeof i.id_inscripcion !== "string" ||
        !["INSCRITA", "CANCELADA"].includes(i.estado) ||
        !c.talleres.some((t) => t.id_taller === i.id_taller) ||
        Object.keys(
          validateContact({
            nombre: i.nombre_participante,
            correo: i.correo_participante,
          }),
        ).length
      )
        return false;
      const key = `${i.id_taller}-${i.correo_participante.toLowerCase()}`;
      if (emails.has(key)) return false;
      emails.add(key);
    }
    return true;
  } catch {
    return false;
  }
}
export function receiptText(c, r) {
  const f = getPerformance(c, r.id_funcion);
  return `TEATRO UCB — RESERVA DE PRUEBA\n\nCódigo: ${r.codigo_reserva}\nObra: ${workForPerformance(c, f).titulo}\nFunción: ${functionDate(f)}\nButacas: ${r.butacas.map((id) => seatLabel(c, id)).join(", ")}\nNombre: ${r.nombre_contacto}\nCorreo: ${r.correo_contacto}\n\nAvance académico. Esta constancia no es una entrada real.\n`;
}
