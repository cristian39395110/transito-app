import {
  useState,
} from "react";

import api from "../api/api";

const CierreExternoForm = ({
  reclamo,
  onCerrado,
}) => {
  const [observaciones, setObservaciones] =
    useState("");

  const [guardando, setGuardando] =
    useState(false);

  const [error, setError] =
    useState("");

  const [mensaje, setMensaje] =
    useState("");

  const cerrar = async (
    event
  ) => {
    event.preventDefault();

    setError("");
    setMensaje("");

    const confirmar =
      window.confirm(
        `¿Confirmás que el reclamo externo #${reclamo.numeroReclamo} ya fue cerrado en el sistema oficial?`
      );

    if (!confirmar) {
      return;
    }

    try {
      setGuardando(true);

      await api.patch(
        `/reclamos/${reclamo.id}/cerrar-externo`,
        {
          observaciones:
            observaciones.trim() ||
            null,
        }
      );

      setMensaje(
        "Cierre externo registrado correctamente."
      );

      if (onCerrado) {
        await onCerrado();
      }
    } catch (err) {
      console.error(
        "Error cerrando reclamo externo:",
        err
      );

      setError(
        err.response?.data?.mensaje ||
          "No se pudo registrar el cierre."
      );
    } finally {
      setGuardando(false);
    }
  };

  const tipo =
    reclamo.TipoReclamo ||
    reclamo.tipoReclamo;

  return (
    <form
      onSubmit={cerrar}
      style={{
        maxWidth: "700px",
        padding: "18px",
        border:
          "1px solid #e5e7eb",
        borderRadius: "12px",
        background: "#ffffff",
      }}
    >
      <div
        style={{
          marginBottom: "18px",
        }}
      >
        <small
          style={{
            color: "#9ca3af",
            fontWeight: 700,
          }}
        >
          RECLAMO EXTERNO
        </small>

        <h1
          style={{
            margin: "2px 0",
          }}
        >
          #
          {
            reclamo.numeroReclamo
          }
        </h1>

        <p
          style={{
            margin: 0,
            color: "#6b7280",
          }}
        >
          {tipo?.nombre ||
            "Sin tipo"}
        </p>
      </div>

      <div
        style={{
          padding: "13px",
          marginBottom: "15px",
          borderRadius: "9px",
          background: "#ecfdf5",
          color: "#065f46",
          fontSize: "12px",
          lineHeight: 1.5,
        }}
      >
        Este reclamo ya fue resuelto
        dentro de nuestro sistema.
        Primero cerralo en el sistema
        externo y después confirmá el
        cierre acá.
      </div>

      <div
        style={{
          display: "grid",
          gap: "8px",
          marginBottom: "16px",
        }}
      >
        <Dato
          titulo="Dirección"
          valor={
            reclamo.direccion
          }
        />

        <Dato
          titulo="Estado interno"
          valor="RESUELTO"
        />

        <Dato
          titulo="Estado externo"
          valor="LISTO PARA CERRAR"
        />
      </div>

      <label
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          marginBottom: "14px",
          fontSize: "12px",
          fontWeight: 700,
          color: "#374151",
        }}
      >
        Observaciones del cierre

        <textarea
          rows="4"
          value={observaciones}
          onChange={(event) =>
            setObservaciones(
              event.target.value
            )
          }
          placeholder="Ej: cerrado en sistema externo según actuación municipal..."
          style={{
            width: "100%",
            padding: "10px",
            border:
              "1px solid #d1d5db",
            borderRadius: "8px",
            fontSize: "14px",
            resize: "vertical",
          }}
        />
      </label>

      {error && (
        <div
          style={{
            padding: "10px",
            marginBottom: "12px",
            borderRadius: "8px",
            background: "#fef2f2",
            color: "#991b1b",
            fontSize: "12px",
          }}
        >
          {error}
        </div>
      )}

      {mensaje && (
        <div
          style={{
            padding: "10px",
            marginBottom: "12px",
            borderRadius: "8px",
            background: "#ecfdf5",
            color: "#047857",
            fontSize: "12px",
          }}
        >
          {mensaje}
        </div>
      )}

      <button
        type="submit"
        disabled={guardando}
        style={{
          width: "100%",
          minHeight: "48px",
          border: "none",
          borderRadius: "8px",
          background: "#047857",
          color: "#ffffff",
          fontWeight: 700,
          cursor: "pointer",
          opacity:
            guardando
              ? 0.6
              : 1,
        }}
      >
        {guardando
          ? "Registrando cierre..."
          : "Confirmar que fue cerrado externamente"}
      </button>
    </form>
  );
};

const Dato = ({
  titulo,
  valor,
}) => (
  <div
    style={{
      padding: "10px",
      borderRadius: "8px",
      background: "#f9fafb",
    }}
  >
    <span
      style={{
        display: "block",
        color: "#9ca3af",
        fontSize: "9px",
        fontWeight: 700,
        textTransform:
          "uppercase",
      }}
    >
      {titulo}
    </span>

    <strong
      style={{
        display: "block",
        marginTop: "2px",
        fontSize: "13px",
      }}
    >
      {valor || "—"}
    </strong>
  </div>
);

export default CierreExternoForm;