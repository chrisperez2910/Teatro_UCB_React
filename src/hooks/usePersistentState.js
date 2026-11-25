import { useCallback, useEffect, useRef, useState } from "react";
import {
  emptyState,
  STORAGE_KEY,
  validateStoredState,
} from "../services/theater.js";
function readInitial(catalog) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { state: emptyState(), warning: "", persistent: true };
    const data = JSON.parse(raw);
    if (!validateStoredState(data, catalog))
      throw new Error("Datos incompatibles");
    return { state: data, warning: "", persistent: true };
  } catch {
    return {
      state: emptyState(),
      warning:
        "No pudimos leer el guardado local. Puedes probar el sitio, pero los cambios de esta sesión no se conservarán.",
      persistent: false,
    };
  }
}
export function usePersistentState(catalog) {
  const [initial] = useState(() => readInitial(catalog)),
    [state, setState] = useState(initial.state),
    [warning, setWarning] = useState(initial.warning);
  const persistent = useRef(initial.persistent),
    lastSaved = useRef(JSON.stringify(initial.state)),
    current = useRef(initial.state);
  // Se lee la última acción incluso antes del siguiente render.
  const updateState = useCallback(
    (update) => {
      let base = current.current;
      if (persistent.current) {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw && raw !== lastSaved.current) {
            const external = JSON.parse(raw);
            if (validateStoredState(external, catalog)) base = external;
          }
        } catch {
          /* El efecto de guardado muestra el aviso si falla. */
        }
      }
      const next = update(base);
      if (!validateStoredState(next, catalog))
        throw new Error("No se pudieron validar los datos de la operación.");
      current.current = next;
      setState(next);
    },
    [catalog],
  );
  useEffect(() => {
    const serialized = JSON.stringify(state);
    if (!persistent.current || serialized === lastSaved.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, serialized);
      lastSaved.current = serialized;
    } catch {
      persistent.current = false;
      setWarning(
        "El navegador no permite guardar. Tus cambios durarán mientras mantengas esta página abierta.",
      );
    }
  }, [state]);
  useEffect(() => {
    function synchronize(event) {
      if (
        !persistent.current ||
        (event.key !== STORAGE_KEY && event.key !== null)
      )
        return;
      try {
        const raw = localStorage.getItem(STORAGE_KEY),
          next = raw ? JSON.parse(raw) : emptyState();
        if (!validateStoredState(next, catalog))
          throw new Error("Datos incompatibles");
        lastSaved.current = JSON.stringify(next);
        current.current = next;
        setState(next);
      } catch {
        setWarning(
          "Otra pestaña guardó datos que no pudimos leer. Conservamos lo que tienes abierto.",
        );
      }
    }
    window.addEventListener("storage", synchronize);
    return () => window.removeEventListener("storage", synchronize);
  }, [catalog]);
  return { state, updateState, warning };
}
