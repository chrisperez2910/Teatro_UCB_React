import { render, screen, waitFor } from "@testing-library/react";
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
const empty = {
  generado_en: "2026-11-01T12:00:00Z",
  resumen: {
    funciones: 0,
    programadas: 0,
    capacidad: 0,
    ocupadas: 0,
    disponibles: 0,
    bloqueadas: 0,
    reservas: 0,
    confirmadas: 0,
    canceladas: 0,
    ocupacion: null,
    tasa_cancelacion: null,
  },
  funciones: [],
  obras: [],
  dias: [],
  reservas: [],
  usuarios: 0,
};
function setup(role = "ADMIN") {
  apiRequest.mockReset();
  apiRequest.mockImplementation(async (path) => {
    if (path === "catalog") return structuredClone(catalog);
    if (path === "session")
      return {
        user: { nombre: "Admin", correo: "admin@example.com", rol: role },
        state: { reservas: [], inscripciones: [] },
        occupied: [],
        workshopCounts: [],
      };
    if (path.startsWith("admin/reportes?")) return empty;
    throw new Error(path);
  });
  render(
    <MemoryRouter initialEntries={["/administracion/reportes"]}>
      <App />
    </MemoryRouter>,
  );
}
it("muestra estado vacío, envía filtros y permite imprimir", async () => {
  setup();
  const user = userEvent.setup();
  await screen.findByText("No hay funciones en esta selección.");
  await user.selectOptions(screen.getByLabelText("Obra"), "2");
  await user.click(screen.getByRole("button", { name: "Aplicar filtros" }));
  await waitFor(() =>
    expect(apiRequest).toHaveBeenCalledWith(
      "admin/reportes?desde=&hasta=&obra=2",
      expect.anything(),
    ),
  );
  const print = vi.spyOn(window, "print").mockImplementation(() => {});
  await user.click(screen.getByRole("button", { name: "Imprimir / PDF" }));
  expect(print).toHaveBeenCalledOnce();
});
it("no consulta reportes con una cuenta normal", async () => {
  setup("USUARIO");
  await screen.findByText("Acceso restringido.");
  expect(
    apiRequest.mock.calls.some(([path]) => path.startsWith("admin/reportes")),
  ).toBe(false);
});
