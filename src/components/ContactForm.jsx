import { useId, useRef, useState } from "react";
import { validateContact } from "../services/theater.js";
export default function ContactForm({
  onConfirm,
  initialValues,
  buttonText,
  note,
  successMessage,
  successButtonText = "Datos guardados",
}) {
  const prefix = useId(),
    formRef = useRef(null),
    locked = useRef(false);
  const [values, setValues] = useState(
      initialValues || { nombre: "", correo: "" },
    ),
    [touched, setTouched] = useState({}),
    [status, setStatus] = useState({ kind: "idle", message: "" });
  const errors = validateContact(values),
    completed = status.kind === "success";
  function change(e) {
    const { name, value } = e.target;
    setValues((p) => ({ ...p, [name]: value }));
    setTouched((p) => ({ ...p, [name]: true }));
    if (status.kind === "error") setStatus({ kind: "idle", message: "" });
  }
  function submit(e) {
    e.preventDefault();
    if (locked.current || completed) return;
    setTouched({ nombre: true, correo: true });
    const valid = formRef.current.checkValidity();
    if (Object.keys(errors).length || !valid) {
      const field =
        Object.keys(errors)[0] ||
        [...formRef.current.elements].find(
          (i) => i.validity && !i.validity.valid,
        )?.name;
      formRef.current.elements.namedItem(field)?.focus();
      return;
    }
    locked.current = true;
    setStatus({ kind: "pending", message: "Guardando…" });
    Promise.resolve()
      .then(() => onConfirm(values))
      .then(() => {
        setStatus({ kind: "success", message: successMessage || "Guardado." });
      })
      .catch((error) => {
        locked.current = false;
        setStatus({ kind: "error", message: error.message });
      });
  }
  return (
    <form ref={formRef} noValidate onSubmit={submit}>
      {["nombre", "correo"].map((name) => (
        <div className="contact-field" key={name}>
          <label htmlFor={`${prefix}-${name}`}>
            {name === "nombre" ? "Nombre completo" : "Correo electrónico"}
          </label>
          <input
            id={`${prefix}-${name}`}
            name={name}
            type={name === "correo" ? "email" : "text"}
            autoComplete={name === "correo" ? "email" : "name"}
            required
            minLength={name === "nombre" ? 3 : undefined}
            maxLength={name === "nombre" ? 80 : 120}
            value={values[name]}
            onChange={change}
            readOnly={completed}
            aria-invalid={Boolean(touched[name] && errors[name])}
            aria-describedby={`${prefix}-${name}-error`}
          />
          <span className="field-error" id={`${prefix}-${name}-error`}>
            {touched[name] && errors[name]}
          </span>
        </div>
      ))}
      <p className="form-note">{note}</p>
      {status.message && (
        <p
          className={`form-status ${status.kind === "error" ? "error" : ""}`}
          role={status.kind === "error" ? "alert" : "status"}
        >
          {status.message}
        </p>
      )}
      <button
        className="button gold full"
        type="submit"
        disabled={completed || status.kind === "pending"}
      >
        {completed ? successButtonText : buttonText}
        <span aria-hidden="true">↗</span>
      </button>
    </form>
  );
}
