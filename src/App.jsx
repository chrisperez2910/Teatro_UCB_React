import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { useCatalog } from "./hooks/useCatalog.js";
import { TheaterProvider, useTheater } from "./TheaterContext.jsx";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import { LoadingState, ErrorState } from "./components/RequestState.jsx";
import HomePage from "./pages/HomePage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
const PlayDetailPage = lazy(() => import("./pages/PlayDetailPage.jsx"));
const ReportsPage = lazy(() => import("./pages/ReportsPage.jsx"));
const AdminPage = lazy(() => import("./pages/AdminPage.jsx"));
const AccountPage = lazy(() => import("./pages/AccountPage.jsx"));
const ReservationsPage = lazy(() => import("./pages/ReservationsPage.jsx"));
function TheaterApp() {
  const { warning } = useTheater();
  return (
    <>
      <a
        className="skip-link"
        href="#contenido"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("contenido").focus();
        }}
      >
        Saltar al contenido
      </a>
      <Header />
      {warning && (
        <aside className="storage-warning" role="status">
          {warning}
        </aside>
      )}
      <main id="contenido" tabIndex="-1">
        <Suspense fallback={<LoadingState />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/obras/:id" element={<PlayDetailPage />} />
            <Route path="/administracion/reportes" element={<ReportsPage />} />
            <Route path="/administracion" element={<AdminPage />} />
            <Route path="/cuenta" element={<AccountPage />} />
            <Route path="/reservas" element={<ReservationsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
export default function App() {
  const catalog = useCatalog();
  if (catalog.status === "loading") return <LoadingState />;
  if (catalog.status === "error")
    return <ErrorState message={catalog.error} onRetry={catalog.retry} />;
  return (
    <TheaterProvider catalog={catalog.data}>
      <TheaterApp />
    </TheaterProvider>
  );
}
