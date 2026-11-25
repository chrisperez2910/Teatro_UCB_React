import { useEffect } from "react";
import { useLocation } from "react-router-dom";
export function usePageNavigation(title) {
  const location = useLocation();
  useEffect(() => {
    document.title = title;
    const frame = requestAnimationFrame(() => {
      const target = document.getElementById(location.hash.slice(1));
      if (target) target.scrollIntoView({ behavior: "instant" });
      else {
        window.scrollTo({ top: 0, behavior: "instant" });
        if (!document.activeElement?.matches("input, textarea, select, button"))
          document.getElementById("contenido")?.focus({ preventScroll: true });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [title, location.pathname, location.hash, location.key]);
}
