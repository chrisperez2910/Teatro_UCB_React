import { it, expect } from "vitest";
import { reportFilters, summarizeReport } from "../server/reports.js";
import {
  csvCell,
  reportCsv,
  reportInsights,
} from "../src/services/reporting.js";
it("calcula ocupación ponderada y excluye funciones canceladas del aforo", () => {
  const row = {
    id_obra: 1,
    titulo: "Obra",
    estado: "PROGRAMADA",
    disponibles: 0,
    bloqueadas: 0,
    reservas_confirmadas: 0,
    reservas_canceladas: 0,
  };
  const result = summarizeReport([
    { ...row, capacidad: 1, ocupadas: 1 },
    { ...row, capacidad: 99, ocupadas: 0 },
    { ...row, estado: "CANCELADA", capacidad: 100, ocupadas: 80 },
  ]);
  expect(result.resumen.ocupacion).toBe(1);
  expect(result.resumen.capacidad).toBe(100);
  expect(result.obras[0].funciones).toBe(2);
  expect(summarizeReport([]).resumen.ocupacion).toBeNull();
});
it("valida fechas reales y orden del intervalo", () => {
  expect(reportFilters(new URLSearchParams("desde=2024-02-29")).desde).toBe(
    "2024-02-29",
  );
  expect(() =>
    reportFilters(new URLSearchParams("desde=2026-02-29")),
  ).toThrow();
  expect(() => reportFilters(new URLSearchParams("obra=-1"))).toThrow();
});
it("exporta CSV sin fórmulas ejecutables y conserva comillas", () => {
  expect(csvCell("=1+2")).toBe('"\'=1+2"');
  expect(csvCell("  @SUM(A1)")).toBe('"\'  @SUM(A1)"');
  expect(csvCell('La "obra"')).toBe('"La ""obra"""');
  expect(reportCsv({ funciones: [] })).toContain("Ocupación (%)");
});
it("emite alertas solo para funciones futuras y datos suficientes", () => {
  const summary = { reservas: 0, tasa_cancelacion: null, bloqueadas: 0 };
  const past = {
    estado: "PROGRAMADA",
    ocupacion: 90,
    fecha_hora_inicio: "2020-01-01T00:00:00Z",
  };
  const empty = reportInsights(
    { resumen: summary, funciones: [past] },
    Date.parse("2026-01-01"),
  );
  expect(empty[0].title).toBe("Construir el primer registro");
  const future = { ...past, fecha_hora_inicio: "2026-01-05T00:00:00Z" };
  expect(
    reportInsights(
      { resumen: summary, funciones: [future] },
      Date.parse("2026-01-01"),
    )[0].title,
  ).toBe("Revisar capacidad");
});
