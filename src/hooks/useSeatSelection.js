import { useCallback, useEffect, useReducer } from "react";
export const initialSelection = { seats: [], message: "" };
export function selectionReducer(state, action) {
  switch (action.type) {
    case "TOGGLE":
      if (state.seats.includes(action.id))
        return {
          seats: state.seats.filter((id) => id !== action.id),
          message: "",
        };
      if (state.seats.length >= 6)
        return {
          ...state,
          message: "Puedes elegir hasta 6 butacas por reserva.",
        };
      return {
        seats: [...state.seats, action.id].sort((a, b) => a - b),
        message: "",
      };
    case "RECONCILE": {
      const seats = state.seats.filter((id) => !action.occupied.has(id));
      return seats.length === state.seats.length
        ? state
        : {
            seats,
            message:
              "Una butaca dejó de estar disponible. Revisa tu selección.",
          };
    }
    default:
      return state;
  }
}
export function useSeatSelection(occupied, initialSeats = []) {
  const [selection, dispatch] = useReducer(selectionReducer, {
    seats: initialSeats.filter((id) => !occupied.has(id)).slice(0, 6),
    message: "",
  });
  const toggle = useCallback((id) => dispatch({ type: "TOGGLE", id }), []);
  useEffect(() => {
    dispatch({ type: "RECONCILE", occupied });
  }, [occupied]);
  return { ...selection, toggle };
}
