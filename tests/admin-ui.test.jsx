import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { it, expect, vi } from "vitest";
import catalog from "../public/data/teatro.json";
vi.mock("../src/services/api.js", () => ({
  useDatabase: true,
  apiRequest: vi.fn(),
}));
import { apiRequest } from "../src/services/api.js";
import App from "../src/App.jsx";
it("el administrador bloquea y vuelve a habilitar una butaca desde el panel", async () => {
  let seats = [
    {
      id_butaca: 1,
      fila: "A",
      numero: 1,
      activa: true,
      habilitada: true,
      ocupada: false,
    },
    {
      id_butaca: 2,
      fila: "A",
      numero: 2,
      activa: true,
      habilitada: true,
      ocupada: true,
    },
  ];
  apiRequest.mockImplementation(async (path, options = {}) => {
    if (path === "catalog") return structuredClone(catalog);
    if (path === "session")
      return {
        user: {
          id_usuario: "admin-test",
          nombre: "Admin Teatro",
          correo: "admin@example.com",
          rol: "ADMIN",
        },
        state: { version: 1, reservas: [], inscripciones: [] },
        occupied: [],
        workshopCounts: [],
      };
    if (path === "admin/funciones/1/butacas")
      return { butacas: structuredClone(seats) };
    if (path === "admin/funciones/1/butacas/1") {
      seats = seats.map((s) =>
        s.id_butaca === 1
          ? { ...s, habilitada: JSON.parse(options.body).habilitada }
          : s,
      );
      return { butacas: structuredClone(seats) };
    }
    throw new Error("Ruta inesperada: " + path);
  });
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={["/administracion"]}>
      <App />
    </MemoryRouter>,
  );
  await user.click(
    await screen.findByRole("button", {
      name: "Butaca A1: disponible, bloquear",
    }),
  );
  expect(
    await screen.findByText("Butaca A1 bloqueada. Cambio guardado."),
  ).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Butaca A2: ocupada" }).disabled,
  ).toBe(true);
  await user.click(
    screen.getByRole("button", { name: "Butaca A1: bloqueada, habilitar" }),
  );
  expect(
    await screen.findByText("Butaca A1 habilitada. Cambio guardado."),
  ).toBeTruthy();
});
