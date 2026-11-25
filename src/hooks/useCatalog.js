import { useCallback, useEffect, useReducer, useState } from "react";
import { fetchCatalog } from "../services/catalog.js";
const initial = { status: "loading", data: null, error: "" };
export function catalogReducer(state, action) {
  switch (action.type) {
    case "LOAD":
      return initial;
    case "SUCCESS":
      return { status: "success", data: action.data, error: "" };
    case "ERROR":
      return { status: "error", data: null, error: action.message };
    default:
      return state;
  }
}
export function useCatalog() {
  const [state, dispatch] = useReducer(catalogReducer, initial),
    [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((v) => v + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 15000);
    dispatch({ type: "LOAD" });
    async function load() {
      try {
        const data = await fetchCatalog(controller.signal);
        if (!controller.signal.aborted) dispatch({ type: "SUCCESS", data });
      } catch (error) {
        if (timedOut)
          dispatch({
            type: "ERROR",
            message: "La carga está tardando demasiado. Vuelve a intentarlo.",
          });
        else if (!controller.signal.aborted)
          dispatch({
            type: "ERROR",
            message: error.message || "No se pudo cargar la cartelera.",
          });
      } finally {
        clearTimeout(timeout);
      }
    }
    load();
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [attempt]);
  return { ...state, retry };
}
