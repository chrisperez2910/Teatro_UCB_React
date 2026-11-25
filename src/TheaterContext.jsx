import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useEffect,
  useState,
} from "react";
import { useDatabase, apiRequest } from "./services/api.js";
import { LoadingState, ErrorState } from "./components/RequestState.jsx";
import { usePersistentState } from "./hooks/usePersistentState.js";
import { buildReservation, buildEnrollment } from "./services/theater.js";
const Context = createContext(null);
export function TheaterProvider({ catalog, children }) {
  const local = usePersistentState(catalog);
  const { updateState, warning } = local;
  const [remote, setRemote] = useState({
    status: "loading",
    data: null,
    error: "",
  });
  const [revision, setRevision] = useState(0);
  const [syncError, setSyncError] = useState("");
  // Una sola consulta en vuelo. Las respuestas antiguas no pisan una reserva recién confirmada.
  useEffect(() => {
    if (!useDatabase || remote.status !== "success") return;
    let active = true,
      pending = false;
    const refresh = async () => {
      if (pending || document.visibilityState === "hidden") return;
      pending = true;
      try {
        const data = await apiRequest("session");
        if (active) {
          setRemote({ status: "success", data, error: "" });
          setSyncError("");
        }
      } catch {
        if (active)
          setSyncError(
            "No pudimos actualizar la disponibilidad. Revisa tu conexión; cada reserva se valida al confirmar.",
          );
      } finally {
        pending = false;
      }
    };
    const timer = setInterval(refresh, 10000);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [remote]);
  useEffect(() => {
    if (!useDatabase) return;
    let active = true;
    apiRequest("session")
      .then((data) => {
        if (active) setRemote({ status: "success", data, error: "" });
      })
      .catch((error) => {
        if (active)
          setRemote({ status: "error", data: null, error: error.message });
      });
    return () => {
      active = false;
    };
  }, [revision]);
  const state = useDatabase ? remote.data?.state || local.state : local.state;
  const activeCatalog =
    useDatabase && remote.data
      ? {
          ...catalog,
          funciones: remote.data.funciones || catalog.funciones,
          reservaButacaEjemplo: remote.data.occupied,
          workshopCounts: remote.data.workshopCounts,
          funcionButaca: remote.data.funcionButaca || catalog.funcionButaca,
        }
      : catalog;
  const reload = () => setRevision((v) => v + 1);
  const account = useDatabase ? remote.data?.user : null;
  const authenticate = useCallback(
    (action, values) =>
      apiRequest(`auth/${action}`, {
        method: "POST",
        body: JSON.stringify(values),
      }).then((data) => {
        setRemote({ status: "success", data, error: "" });
        return data.user;
      }),
    [],
  );
  const logout = useCallback(
    () =>
      apiRequest("auth/logout", { method: "POST" }).then((data) =>
        setRemote({ status: "success", data, error: "" }),
      ),
    [],
  );
  const reserve = useCallback(
    (id, seats, values) => {
      if (useDatabase)
        return apiRequest("reservas", {
          method: "POST",
          body: JSON.stringify({ id_funcion: id, butacas: seats, ...values }),
        }).then((result) => {
          setRemote({ status: "success", data: result, error: "" });
          return { ...result.reservation, butacas: seats };
        });
      let reservation;
      updateState((previous) => {
        reservation = buildReservation(catalog, previous, id, seats, values);
        return { ...previous, reservas: [...previous.reservas, reservation] };
      });
      return reservation;
    },
    [catalog, updateState],
  );
  const cancelReservation = useCallback(
    (id) =>
      useDatabase
        ? apiRequest(`reservas/${id}/cancel`, { method: "POST" }).then(
            (result) => {
              setRemote({ status: "success", data: result, error: "" });
            },
          )
        : updateState((previous) => ({
            ...previous,
            reservas: previous.reservas.map((r) =>
              r.id_reserva === id ? { ...r, estado: "CANCELADA" } : r,
            ),
          })),
    [updateState],
  );
  const enroll = useCallback(
    (id, values) =>
      useDatabase
        ? apiRequest("inscripciones", {
            method: "POST",
            body: JSON.stringify({ id_taller: id, ...values }),
          }).then((result) => {
            setRemote({ status: "success", data: result, error: "" });
          })
        : updateState((previous) => ({
            ...previous,
            inscripciones: [
              ...previous.inscripciones,
              buildEnrollment(catalog, previous, id, values),
            ],
          })),
    [catalog, updateState],
  );
  const value = useMemo(
    () => ({
      catalog: activeCatalog,
      state,
      reserve,
      cancelReservation,
      enroll,
      warning: useDatabase ? syncError : warning,
      account,
      useDatabase,
      authenticate,
      logout,
    }),
    [
      activeCatalog,
      syncError,
      state,
      reserve,
      cancelReservation,
      enroll,
      warning,
      account,
      authenticate,
      logout,
    ],
  );
  if (useDatabase && remote.status === "loading") return <LoadingState />;
  if (useDatabase && remote.status === "error")
    return (
      <ErrorState
        message={`No se pudo conectar con la base de datos: ${remote.error}`}
        onRetry={reload}
      />
    );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useTheater() {
  const c = useContext(Context);
  if (!c) throw new Error("Falta TheaterProvider.");
  return c;
}
