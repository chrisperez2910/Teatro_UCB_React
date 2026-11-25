export const percentage = (value) =>
  value === null || value === undefined
    ? "—"
    : `${new Intl.NumberFormat("es-BO", { maximumFractionDigits: 1 }).format(value)} %`;
export function reportInsights(report, now = Date.now()) {
  const active = report.funciones.filter(
    (f) =>
      f.estado === "PROGRAMADA" &&
      new Date(f.fecha_hora_inicio).getTime() > now,
  );
  const insights = [];
  const high = active.filter((f) => f.ocupacion >= 80);
  const low = active.filter(
    (f) =>
      f.ocupacion !== null &&
      f.ocupacion < 30 &&
      new Date(f.fecha_hora_inicio).getTime() - now <= 7 * 86400000,
  );
  if (high.length)
    insights.push({
      title: "Revisar capacidad",
      body: `${high.length} función(es) próxima(s) superan o alcanzan el 80 % de ocupación. Evalúa una nueva fecha antes de ampliar la difusión.`,
      tone: "gold",
    });
  if (low.length)
    insights.push({
      title: "Dar visibilidad esta semana",
      body: `${low.length} función(es) de los próximos siete días tienen menos del 30 % de ocupación. Prioriza su difusión y revisa el horario.`,
      tone: "wine",
    });
  if (report.resumen.reservas >= 5 && report.resumen.tasa_cancelacion >= 20)
    insights.push({
      title: "Revisar las cancelaciones",
      body: "Al menos el 20 % de las solicitudes fueron canceladas. Revisa la claridad de las fechas y el proceso de confirmación.",
      tone: "wine",
    });
  if (report.resumen.bloqueadas > 0)
    insights.push({
      title: "Comprobar la sala",
      body: `Hay ${report.resumen.bloqueadas} lugares bloqueados entre las funciones seleccionadas. Revisa cuáles pueden volver a habilitarse.`,
      tone: "gold",
    });
  if (!insights.length)
    insights.push({
      title: report.resumen.reservas
        ? "Seguir la evolución"
        : "Construir el primer registro",
      body: report.resumen.reservas
        ? "No se activaron alertas con los umbrales actuales. Compara la demanda de cada función antes de cambiar la programación."
        : "Todavía no hay reservas para esta selección. El informe se completará a medida que el público reserve.",
      tone: "neutral",
    });
  return insights;
}
// Neutraliza fórmulas al abrir CSV en Excel y conserva comillas/saltos de línea.
export function csvCell(value) {
  let text = String(value ?? "");
  if (/^\s*[=+\-@]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export function reportCsv(report) {
  const rows = [
    [
      "Función",
      "Obra",
      "Sala",
      "Inicio (America/La_Paz)",
      "Estado",
      "Aforo disponible para reserva",
      "Butacas reservadas",
      "Lugares libres",
      "Bloqueadas",
      "Reservas confirmadas",
      "Reservas canceladas",
      "Ocupación (%)",
    ],
  ];
  const date = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/La_Paz",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  for (const f of report.funciones)
    rows.push([
      f.id_funcion,
      f.titulo,
      f.sala,
      date.format(new Date(f.fecha_hora_inicio)),
      f.estado,
      f.capacidad,
      f.ocupadas,
      f.disponibles,
      f.bloqueadas,
      f.reservas_confirmadas,
      f.reservas_canceladas,
      f.ocupacion ?? "",
    ]);
  return "\uFEFF" + rows.map((row) => row.map(csvCell).join(";")).join("\r\n");
}
export function downloadReport(report) {
  const url = URL.createObjectURL(
    new Blob([reportCsv(report)], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `teatro-reporte-${report.generado_en.slice(0, 10)}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
