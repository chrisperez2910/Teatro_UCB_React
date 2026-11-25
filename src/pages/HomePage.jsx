import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useTheater } from "../TheaterContext.jsx";
import { usePageNavigation } from "../hooks/usePageNavigation.js";
import Hero from "../components/Hero.jsx";
import FeaturedCarousel from "../components/FeaturedCarousel.jsx";
import CatalogSection from "../components/CatalogSection.jsx";
import BookingSection from "../components/BookingSection.jsx";
import ArchiveSection from "../components/ArchiveSection.jsx";
import WorkshopsSection from "../components/WorkshopsSection.jsx";
import Faq from "../components/Faq.jsx";
export default function HomePage() {
  usePageNavigation("Teatro UCB · Nos encontramos en escena");
  const { catalog } = useTheater(),
    [params] = useSearchParams(),
    navigate = useNavigate(),
    location = useLocation();
  const functions = catalog.funciones.filter((f) => f.estado === "PROGRAMADA"),
    performance =
      functions.find((f) => f.id_funcion === Number(params.get("funcion"))) ||
      functions[0];
  return (
    <>
      <Hero />
      <aside className="demo-strip">
        <span className="demo-dot" />
        <strong>Avance académico</strong>
        <p>
          Las obras son reales; la programación y las reservas son de ejemplo.
        </p>
      </aside>
      <FeaturedCarousel />
      <CatalogSection />
      {performance && (
        <BookingSection
          key={performance.id_funcion}
          performance={performance}
          initialSeats={
            location.state?.booking?.id === performance.id_funcion
              ? location.state.booking.seats
              : []
          }
          onFunctionChange={(id) =>
            navigate(`/?funcion=${id}#butacas`, { replace: true })
          }
        />
      )}
      <ArchiveSection />
      <WorkshopsSection />
      <Faq />
    </>
  );
}
