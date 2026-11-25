import { assetUrl } from "../services/theater.js";
export default function Scene({ name, children }) {
  return (
    <div
      className={`theater-scene scene-${name}`}
      style={{
        "--scene-image": `url("${assetUrl("assets/images/portada-teatro.png")}")`,
      }}
    >
      {children}
    </div>
  );
}
