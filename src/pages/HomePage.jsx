import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useTheater } from "../TheaterContext.jsx";
import { usePageNavigation } from "../hooks/usePageNavigation.js";
import { isUpcoming } from "../services/theater.js";
import Scene from "../components/Scene.jsx";
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
  const functions = catalog.funciones.filter(isUpcoming),
    performance =
      functions.find((f) => f.id_funcion === Number(params.get("funcion"))) ||
      functions[0];
  return (
    <>
      <Hero />
      <Scene name="featured">
        <FeaturedCarousel />
      </Scene>
      <Scene name="catalog">
        <CatalogSection />
      </Scene>
      <Scene name="booking">
        {performance ? (
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
        ) : (
          <section
            id="butacas"
            className="section container"
            aria-labelledby="next-functions-title"
          >
            <p className="eyebrow">TU LUGAR EN LA SALA</p>
            <h2 id="next-functions-title">
              La próxima función está por llegar.
            </h2>
            <p className="section-note">
              Estamos preparando la nueva programación. Aquí podrás elegir tu
              butaca cuando se abran las reservas.
            </p>
          </section>
        )}
      </Scene>
      <Scene name="archive">
        <ArchiveSection />
      </Scene>
      <Scene name="workshops">
        <WorkshopsSection />
      </Scene>
      <Scene name="faq">
        <Faq />
      </Scene>
    </>
  );
}
