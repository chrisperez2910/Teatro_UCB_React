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
          reservaButacaEjemplo: remote.data.occupied,
          workshopCounts: remote.data.workshopCounts,
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
      warning: useDatabase ? "" : warning,
      account,
      useDatabase,
      authenticate,
      logout,
    }),
    [
      activeCatalog,
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
