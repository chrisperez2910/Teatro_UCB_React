import { Link } from "react-router-dom";
import { assetUrl } from "../services/theater.js";
export default function Footer() {
  return (
    <footer className="site-footer container">
      <Link className="brand" to="/#inicio">
        <img
          src={assetUrl("assets/images/marca.svg")}
          width="36"
          height="36"
          alt=""
        />
        <span>
          TEATRO <b>UCB</b>
          <small>NOS ENCONTRAMOS EN ESCENA</small>
        </span>
      </Link>
      <p>
        Teatro UCB · Un espacio para sentir
        <br />
        Universidad Católica Boliviana «San Pablo»
      </p>
      <Link to="/#inicio" className="back-top">
        Volver arriba <span aria-hidden="true">↑</span>
      </Link>
    </footer>
  );
}
