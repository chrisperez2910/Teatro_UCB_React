import { StrictMode } from "react";
import { MemoryRouter } from "react-router-dom";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { it, expect, vi, beforeEach } from "vitest";
import catalog from "../public/data/teatro.json";
import App from "../src/App.jsx";
import ContactForm from "../src/components/ContactForm.jsx";
import { TheaterProvider, useTheater } from "../src/TheaterContext.jsx";
import {
  STORAGE_KEY,
  emptyState,
  buildReservation,
} from "../src/services/theater.js";
const person = { nombre: "Persona de prueba", correo: "prueba@example.com" };
const saved = () => ({
  ...emptyState(),
  reservas: [buildReservation(catalog, emptyState(), 1, [1], person)],
});
function Probe() {
  const { state, reserve, warning } = useTheater();
  return (
    <>
      <p data-testid="count">{state.reservas.length}</p>
      <p>{warning}</p>
      <button onClick={() => reserve(1, [1], person)}>Guardar</button>
    </>
  );
}
function probe() {
  return render(
    <StrictMode>
      <TheaterProvider catalog={catalog}>
        <Probe />
      </TheaterProvider>
    </StrictMode>,
  );
}
function app(path = "/") {
  return render(
    <StrictMode>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </StrictMode>,
  );
}
beforeEach(() =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => structuredClone(catalog),
    })),
  ),
);
it("restaura reservas anteriores bajo StrictMode", () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved()));
  probe();
  expect(screen.getByTestId("count").textContent).toBe("1");
});
it("conserva el guardado corrupto y permite la sesión temporal", async () => {
  localStorage.setItem(STORAGE_KEY, "{incorrecto");
  probe();
  await userEvent.click(screen.getByText("Guardar"));
  expect(screen.getByTestId("count").textContent).toBe("1");
  expect(localStorage.getItem(STORAGE_KEY)).toBe("{incorrecto");
  expect(screen.getByText(/no se conservarán/)).toBeTruthy();
});
it("maneja almacenamiento bloqueado sin perder el estado en memoria", async () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("QuotaExceeded");
  });
  probe();
  await userEvent.click(screen.getByText("Guardar"));
  expect(screen.getByTestId("count").textContent).toBe("1");
  expect(screen.getByText(/no permite guardar/)).toBeTruthy();
});
it("sincroniza cambios de otra pestaña", () => {
  probe();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved()));
  act(() =>
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY })),
  );
  expect(screen.getByTestId("count").textContent).toBe("1");
});
it("valida campos y evita enviar dos veces", async () => {
  const onConfirm = vi.fn();
  render(<ContactForm onConfirm={onConfirm} buttonText="Confirmar" />);
  const u = userEvent.setup();
  await u.click(screen.getByText("Confirmar"));
  expect(onConfirm).not.toHaveBeenCalled();
  await u.type(screen.getByLabelText("Nombre completo"), "Ana Pérez");
  await u.type(screen.getByLabelText("Correo electrónico"), "ana@example.com");
  await u.dblClick(screen.getByText("Confirmar"));
  expect(onConfirm).toHaveBeenCalledTimes(1);
});
it("conserva los campos cuando una operación falla", async () => {
  render(
    <ContactForm
      onConfirm={() => {
        throw new Error("Sin disponibilidad");
      }}
      buttonText="Confirmar"
    />,
  );
  const u = userEvent.setup();
  await u.type(screen.getByLabelText("Nombre completo"), "Ana Pérez");
  await u.type(screen.getByLabelText("Correo electrónico"), "ana@example.com");
  await u.click(screen.getByText("Confirmar"));
  expect(screen.getByRole("alert").textContent).toBe("Sin disponibilidad");
  expect(screen.getByLabelText("Nombre completo").value).toBe("Ana Pérez");
});
it("filtra por autor sin tildes y muestra resultados vacíos", async () => {
  app();
  const input = await screen.findByRole("searchbox");
  await userEvent.type(input, "garcia");
  expect(screen.getByText("1 obra encontrada.")).toBeTruthy();
  await userEvent.clear(input);
  await userEvent.type(input, "noexiste");
  expect(
    screen.getByText(/No encontramos obras con esa búsqueda/),
  ).toBeTruthy();
});
it("reserva, muestra el historial y libera la butaca al cancelar", async () => {
  app();
  const u = userEvent.setup();
  await u.click(
    await screen.findByRole("button", { name: "Butaca A1, disponible" }),
  );
  await u.click(screen.getByRole("button", { name: "Continuar reserva" }));
  await u.type(screen.getByLabelText("Nombre completo"), person.nombre);
  await u.type(screen.getByLabelText("Correo electrónico"), person.correo);
  await u.click(screen.getByRole("button", { name: "Guardar reserva" }));
  await screen.findByRole("heading", { name: "Mis reservas." });
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).reservas).toHaveLength(
    1,
  );
  await u.click(screen.getByText("Cancelar reserva"));
  await u.click(screen.getByText("Sí, cancelar"));
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).reservas[0].estado).toBe(
    "CANCELADA",
  );
  await u.click(screen.getByRole("link", { name: "Cartelera" }));
  expect(
    (await screen.findByRole("button", { name: "Butaca A1, disponible" }))
      .disabled,
  ).toBe(false);
});
it("limpia la selección cuando cambia la función", async () => {
  app();
  await userEvent.click(
    await screen.findByRole("button", { name: "Butaca A1, disponible" }),
  );
  await userEvent.selectOptions(screen.getByLabelText("ELIGE TU FUNCIÓN"), "2");
  expect(
    screen.getByRole("button", { name: "Continuar reserva" }).disabled,
  ).toBe(true);
});
it("abre una obra por su ruta y elige su función", async () => {
  app("/obras/2");
  await screen.findByRole("heading", { name: "El avaro" });
  await userEvent.click(screen.getByRole("link", { name: /Elegir butacas/ }));
  expect((await screen.findByLabelText("ELIGE TU FUNCIÓN")).value).toBe("3");
});
it("maneja rutas desconocidas", async () => {
  app("/desconocida");
  expect(
    await screen.findByRole("heading", {
      name: "Este camino no lleva al escenario.",
    }),
  ).toBeTruthy();
});
it("muestra errores HTTP, reintenta y cancela peticiones al desmontar", async () => {
  fetch.mockResolvedValue({ ok: false, status: 500 });
  const mounted = app();
  expect((await screen.findByRole("alert")).textContent).toMatch(/500/);
  fetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => structuredClone(catalog),
  });
  await userEvent.click(screen.getByText("Volver a intentar"));
  await screen.findByRole("searchbox");
  const signal = fetch.mock.calls.at(-1)[1].signal;
  mounted.unmount();
  expect(signal.aborted).toBe(true);
});
