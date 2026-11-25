import { assetUrl } from "./theater.js";
import { useDatabase, apiRequest } from "./api.js";
export function validateCatalog(data) {
  const tables = [
    "obras",
    "dramaturgos",
    "obraDramaturgo",
    "producciones",
    "funciones",
    "salas",
    "butacas",
    "funcionButaca",
    "reservaButacaEjemplo",
    "imagenes",
    "resenas",
    "talleres",
  ];
  if (!data || !tables.every((key) => Array.isArray(data[key])))
    throw new Error("El catálogo no tiene el formato esperado.");
  const exists = (table, key, value) =>
    data[table].some((row) => row[key] === value);
  for (const [table, id] of [
    ["obras", "id_obra"],
    ["dramaturgos", "id_dramaturgo"],
    ["producciones", "id_produccion"],
    ["funciones", "id_funcion"],
    ["salas", "id_sala"],
    ["butacas", "id_butaca"],
    ["talleres", "id_taller"],
  ]) {
    if (
      !data[table].every(
        (row) => row && Number.isInteger(row[id]) && row[id] > 0,
      ) ||
      new Set(data[table].map((r) => r[id])).size !== data[table].length
    )
      throw new Error(`Revisa los identificadores de ${table}.`);
  }
  if (!data.obras.length || !data.funciones.length)
    throw new Error("El catálogo todavía no tiene funciones.");
  if (!data.producciones.every((p) => exists("obras", "id_obra", p.id_obra)))
    throw new Error("Hay un montaje sin obra.");
  if (
    !data.obraDramaturgo.every(
      (v) =>
        exists("obras", "id_obra", v.id_obra) &&
        exists("dramaturgos", "id_dramaturgo", v.id_dramaturgo),
    )
  )
    throw new Error("Hay una autoría incompleta.");
  if (
    !data.funciones.every(
      (f) =>
        exists("producciones", "id_produccion", f.id_produccion) &&
        exists("salas", "id_sala", f.id_sala) &&
        Number.isFinite(Date.parse(f.fecha_hora_inicio)),
    )
  )
    throw new Error("Hay una función incompleta.");
  if (
    !data.funcionButaca.every((fb) => {
      const f = data.funciones.find((f) => f.id_funcion === fb.id_funcion),
        b = data.butacas.find((b) => b.id_butaca === fb.id_butaca);
      return f && b && f.id_sala === b.id_sala;
    })
  )
    throw new Error("Una butaca no pertenece a la sala de su función.");
  return data;
}
function freeze(value) {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
export async function fetchCatalog(signal) {
  if (useDatabase)
    return freeze(validateCatalog(await apiRequest("catalog", { signal })));
  // Sin la base, los datos de demostración se cargan desde el archivo local.
  const response = await fetch(assetUrl("data/teatro.json"), { signal });
  if (!response.ok)
    throw new Error(
      response.status === 404
        ? "No encontramos el archivo de la cartelera (404)."
        : `No se pudo cargar la cartelera (HTTP ${response.status}).`,
    );
  return freeze(validateCatalog(await response.json()));
}
