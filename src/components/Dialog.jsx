import { useEffect, useRef } from "react";
export default function Dialog({
  id,
  labelledBy,
  closeLabel,
  onDismiss,
  children,
}) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current,
      trigger = document.activeElement,
      overflow = document.body.style.overflow;
    if (!dialog.open) dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      if (dialog.open) dialog.close();
      document.body.style.overflow = overflow;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      id={id}
      ref={ref}
      aria-labelledby={labelledBy}
      onCancel={(e) => {
        e.preventDefault();
        onDismiss();
      }}
    >
      <button
        className="dialog-close"
        type="button"
        onClick={onDismiss}
        aria-label={closeLabel}
      >
        ×
      </button>
      {children}
    </dialog>
  );
}
