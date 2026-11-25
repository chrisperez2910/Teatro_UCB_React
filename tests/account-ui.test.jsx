import { StrictMode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { it, expect, vi, beforeEach } from "vitest";
import catalog from "../public/data/teatro.json";
vi.mock("../src/services/api.js", () => ({
  useDatabase: true,
  apiRequest: vi.fn(),
}));
import { apiRequest } from "../src/services/api.js";
import App from "../src/App.jsx";
let currentUser, state, occupied;
const result = () => ({
  user: currentUser,
  state,
  occupied,
  workshopCounts: [],
});
beforeEach(() => {
  currentUser = null;
  state = { version: 1, reservas: [], inscripciones: [] };
  occupied = structuredClone(catalog.reservaButacaEjemplo);
  apiRequest.mockReset();
  apiRequest.mockImplementation(async (path, options = {}) => {
    if (path === "catalog") return structuredClone(catalog);
    if (path === "session") return result();
    if (path === "auth/register" || path === "auth/login") {
      const x = JSON.parse(options.body);
      currentUser = {
        id_usuario: "demo",
        nombre: x.nombre || "Ana Perez",
        correo: x.correo,
      };
      return result();
    }
    if (path === "auth/logout") {
      currentUser = null;
      state = { version: 1, reservas: [], inscripciones: [] };
      return result();
    }
    if (path === "reservas") {
      const x = JSON.parse(options.body);
      const r = {
        id_reserva: "r1",
        id_funcion: x.id_funcion,
        nombre_contacto: x.nombre,
        correo_contacto: x.correo,
        codigo_reserva: "UCB-TEST",
        estado: "CONFIRMADA",
        butacas: x.butacas,
        creada_en: new Date().toISOString(),
      };
      state = { ...state, reservas: [r] };
      occupied = [
        ...occupied,
        ...x.butacas.map((id) => ({
          id_funcion: x.id_funcion,
          id_butaca: id,
          vigente: true,
        })),
      ];
      return { ...result(), reservation: r };
    }
    throw new Error("Petición no prevista: " + path);
  });
});
it("el visitante crea una cuenta después de elegir butaca y completa su reserva", async () => {
  const u = userEvent.setup();
  render(
    <StrictMode>
      <MemoryRouter>
        <App />
      </MemoryRouter>
    </StrictMode>,
  );
  await u.click(
    await screen.findByRole("button", { name: "Butaca A1, disponible" }),
  );
  await u.click(screen.getByRole("button", { name: "Continuar reserva" }));
  await screen.findByRole("heading", { name: "Iniciar sesión" });
  await u.click(screen.getByRole("button", { name: "Crear cuenta" }));
  await u.type(screen.getByLabelText("Nombre completo"), "Ana Perez");
  await u.type(screen.getByLabelText("Correo electrónico"), "ana@example.com");
  await u.type(
    screen.getByLabelText("Contraseña", { exact: true }),
    "ClaveSegura12",
  );
  await u.type(screen.getByLabelText("Repetir contraseña"), "ClaveSegura12");
  await u.click(
    screen
      .getByRole("button", { name: "Crear cuenta", pressed: true })
      .closest("div")
      .parentElement.querySelector("button[type=submit]"),
  );
  expect(
    await screen.findByRole("button", { name: "Butaca A1, seleccionada" }),
  ).toBeTruthy();
  await u.click(screen.getByRole("button", { name: "Continuar reserva" }));
  expect(screen.getByLabelText("Nombre completo").value).toBe("Ana Perez");
  await u.click(screen.getByRole("button", { name: "Guardar reserva" }));
  expect(
    await screen.findByText(/Tu reserva UCB-TEST quedó guardada/),
  ).toBeTruthy();
  expect(apiRequest).toHaveBeenCalledWith(
    "reservas",
    expect.objectContaining({ method: "POST" }),
  );
});
it("el formulario impide registrar contraseñas distintas", async () => {
  const u = userEvent.setup();
  render(
    <MemoryRouter initialEntries={["/cuenta"]}>
      <App />
    </MemoryRouter>,
  );
  await screen.findByRole("heading", { name: "Iniciar sesión" });
  await u.click(screen.getByRole("button", { name: "Crear cuenta" }));
  await u.type(screen.getByLabelText("Nombre completo"), "Ana Perez");
  await u.type(screen.getByLabelText("Correo electrónico"), "ana@example.com");
  await u.type(
    screen.getByLabelText("Contraseña", { exact: true }),
    "ClaveSegura12",
  );
  await u.type(screen.getByLabelText("Repetir contraseña"), "OtraClave123");
  const buttons = screen.getAllByRole("button", { name: "Crear cuenta" });
  await u.click(buttons.find((b) => b.type === "submit"));
  expect(screen.getByRole("alert").textContent).toMatch(/no coinciden/);
  expect(apiRequest).not.toHaveBeenCalledWith(
    "auth/register",
    expect.anything(),
  );
});
