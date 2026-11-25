export function LoadingState() {
  return (
    <section className="container loading-state" aria-busy="true">
      <p className="eyebrow">TEATRO UCB</p>
      <h1>El telón está por subir.</h1>
      <p role="status">Preparando la cartelera…</p>
      <div className="skeletons" aria-hidden="true">
        {[1, 2, 3].map((id) => (
          <span key={id} />
        ))}
      </div>
    </section>
  );
}
export function ErrorState({ message, onRetry }) {
  return (
    <section className="container error-state">
      <p className="eyebrow">TEATRO UCB</p>
      <h1>Algo quedó entre bambalinas.</h1>
      <p role="alert">{message}</p>
      <button className="button gold" onClick={onRetry}>
        Volver a intentar
      </button>
    </section>
  );
}
