import { describe, it, expect } from "vitest";
import catalog from "../public/data/teatro.json";
import {
  buildReservation,
  buildEnrollment,
  emptyState,
  occupiedSeats,
  validateStoredState,
  normalize,
} from "../src/services/theater.js";
import { validateCatalog } from "../src/services/catalog.js";
import {
  selectionReducer,
  initialSelection,
} from "../src/hooks/useSeatSelection.js";
const contact = {
  nombre: "  Christopher Pérez ",
  correo: " CHRIS@example.com ",
};
describe("Reservas y selección", () => {
  it("normaliza datos sin modificar la colección original", () => {
    const state = emptyState(),
      seats = [3, 1];
    const r = buildReservation(catalog, state, 1, seats, contact);
    expect(r.nombre_contacto).toBe("Christopher Pérez");
    expect(r.correo_contacto).toBe("chris@example.com");
    expect(r.butacas).toEqual([1, 3]);
    expect(state.reservas).toEqual([]);
    expect(seats).toEqual([3, 1]);
  });
  it("impide ocupar una butaca reservada", () => {
    expect(() =>
      buildReservation(
        catalog,
        {
          ...emptyState(),
          reservas: [buildReservation(catalog, emptyState(), 1, [2], contact)],
        },
        1,
        [2],
        contact,
      ),
    ).toThrow(/disponible/);
  });
  it("separa la ocupación por función", () => {
    const r = buildReservation(catalog, emptyState(), 1, [1], contact);
    const s = { ...emptyState(), reservas: [r] };
    expect(occupiedSeats(catalog, s, 1).has(1)).toBe(true);
    expect(() => buildReservation(catalog, s, 2, [1], contact)).not.toThrow();
  });
  it("cancelar libera la butaca", () => {
    const r = buildReservation(catalog, emptyState(), 1, [1], contact);
    expect(
      occupiedSeats(
        catalog,
        { ...emptyState(), reservas: [{ ...r, estado: "CANCELADA" }] },
        1,
      ).has(1),
    ).toBe(false);
  });
  it.each([[], [1, 1], [1, 3, 4, 5, 6, 7, 8], [999]])(
    "rechaza selección inválida %j",
    (seats) => {
      expect(() =>
        buildReservation(catalog, emptyState(), 1, seats, contact),
      ).toThrow();
    },
  );
  it("limita a seis y permite desmarcar", () => {
    let s = initialSelection;
    for (let id = 1; id <= 7; id++)
      s = selectionReducer(s, { type: "TOGGLE", id });
    expect(s.seats).toHaveLength(6);
    expect(s.message).toMatch(/6/);
    expect(selectionReducer(s, { type: "TOGGLE", id: 1 }).seats).not.toContain(
      1,
    );
  });
  it("reconcilia butacas ocupadas por otra pestaña", () => {
    expect(
      selectionReducer(
        { seats: [1, 3], message: "" },
        { type: "RECONCILE", occupied: new Set([1]) },
      ).seats,
    ).toEqual([3]);
  });
  it("rechaza guardados duplicados o incompletos", () => {
    const r = buildReservation(catalog, emptyState(), 1, [1], contact);
    expect(
      validateStoredState({ ...emptyState(), reservas: [r] }, catalog),
    ).toBe(true);
    expect(
      validateStoredState({ ...emptyState(), reservas: [r, r] }, catalog),
    ).toBe(false);
    expect(validateStoredState({}, catalog)).toBe(false);
  });
});
describe("Talleres y catálogo", () => {
  it("evita inscripciones repetidas con el mismo correo", () => {
    const i = buildEnrollment(catalog, emptyState(), 1, contact);
    expect(() =>
      buildEnrollment(catalog, { ...emptyState(), inscripciones: [i] }, 1, {
        ...contact,
        correo: "chris@example.com",
      }),
    ).toThrow(/inscrito/);
  });
  it("respeta el cupo disponible", () => {
    const small = {
      ...catalog,
      talleres: catalog.talleres.map((t) => ({ ...t, cupo_maximo: 1 })),
    };
    const i = buildEnrollment(small, emptyState(), 1, contact);
    expect(() =>
      buildEnrollment(small, { ...emptyState(), inscripciones: [i] }, 1, {
        nombre: "Otra persona",
        correo: "otra@example.com",
      }),
    ).toThrow(/cupos/);
  });
  it("valida la relación entre sala y butaca", () => {
    const invalid = structuredClone(catalog);
    invalid.funciones[0].id_sala = 999;
    expect(() => validateCatalog(invalid)).toThrow();
    expect(normalize("García")).toBe("garcia");
  });
});
