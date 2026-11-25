import { Link } from "react-router-dom";
import { assetUrl } from "../services/theater.js";
export default function Faq() {
  return (
    <section
      className="section container faq-section"
      aria-labelledby="faq-title"
    >
      <header>
        <p className="eyebrow">ANTES DE QUE SE ABRA EL TELÓN</p>
        <h2 id="faq-title">¿Alguna duda?</h2>
      </header>
      <div className="faq-list">
        <details>
          <summary>¿Cómo elijo mis butacas?</summary>
          <p>
            Selecciona una función y pulsa las butacas disponibles del mapa. Las
            doradas son tu selección; vuelve a pulsarlas para quitarlas. Después
            completa tu nombre y correo.
          </p>
        </details>
        <details>
          <summary>¿Dónde encuentro mi reserva?</summary>
          <p>
            En «Mis reservas», en la parte superior. Desde ahí puedes descargar
            una constancia o cancelar una reserva. Inicia sesión para consultar
            tus reservas.
          </p>
        </details>
        <details>
          <summary>¿Necesito experiencia para los talleres?</summary>
          <p>
            Los talleres están pensados para principiantes. Abre la convocatoria
            para revisar fechas, cupos y contenido antes de inscribirte.
          </p>
        </details>
        <details>
          <summary>¿Puedo cancelar mi reserva?</summary>
          <p>
            Sí. Abre «Mis reservas», elige la solicitud y confirma su
            cancelación antes del inicio de la función. Las butacas quedarán
            disponibles para otras personas.
          </p>
        </details>
      </div>
    </section>
  );
}
