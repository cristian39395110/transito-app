import {
  useNavigate,
} from "react-router-dom";

const nombresEstado = {
  NUEVO:
    "Nuevo",

  ASIGNADO_GUARDIA:
    "Asignado a guardia",

  ASIGNADO_INSPECTOR:
    "Asignado a inspector",

  EN_INSPECCION:
    "En inspección",

  EN_SEGUIMIENTO:
    "En seguimiento",

  PENDIENTE_ACTUACION:
    "Pendiente actuación",

  RESUELTO:
    "Resuelto",

  ANULADO:
    "Anulado",
};

const ReclamoGuardiaCard = ({
  reclamo,
}) => {
  const navigate =
    useNavigate();

  const tipo =
    reclamo.tipoReclamo
      ?.nombre ||
    reclamo.TipoReclamo
      ?.nombre ||
    "Sin tipo";

  const inspector =
    reclamo.inspector
      ?.nombre ||
    reclamo.Inspector
      ?.nombre ||
    null;

  const abrir = () => {
    navigate(
      `/reclamos/${reclamo.id}`
    );
  };

  return (
    <article
      style={{
        padding: "14px",
        border:
          "1px solid #e5e7eb",
        borderRadius: "10px",
        background: "#ffffff",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems:
            "flex-start",
          gap: "10px",
        }}
      >
        <div>
          <span
            style={{
              display: "block",
              color: "#6b7280",
              fontSize: "9px",
              fontWeight: "700",
            }}
          >
            RECLAMO EXTERNO
          </span>

          <strong
            style={{
              fontSize: "16px",
            }}
          >
            #
            {reclamo.numeroReclamo}
          </strong>
        </div>

        <span
          style={{
            padding: "4px 7px",
            borderRadius: "20px",
            background: "#f3f4f6",
            color: "#374151",
            fontSize: "8px",
            fontWeight: "700",
          }}
        >
          {nombresEstado[
            reclamo.estado
          ] ||
            reclamo.estado}
        </span>
      </div>

      <div
        style={{
          marginTop: "12px",
        }}
      >
        <strong
          style={{
            display: "block",
            fontSize: "11px",
          }}
        >
          {tipo}
        </strong>

        <span
          style={{
            display: "block",
            marginTop: "4px",
            color: "#4b5563",
            fontSize: "10px",
          }}
        >
          {reclamo.direccion}
        </span>

        {reclamo.barrio && (
          <span
            style={{
              display: "block",
              marginTop: "2px",
              color: "#6b7280",
              fontSize: "9px",
            }}
          >
            {reclamo.barrio}
          </span>
        )}
      </div>

      <div
        style={{
          marginTop: "13px",
          padding: "9px",
          borderRadius: "7px",
          background: inspector
            ? "#f9fafb"
            : "#fff7ed",
        }}
      >
        <span
          style={{
            display: "block",
            color: "#6b7280",
            fontSize: "8px",
            fontWeight: "700",
          }}
        >
          INSPECTOR
        </span>

        <strong
          style={{
            display: "block",
            marginTop: "2px",
            color: inspector
              ? "#111827"
              : "#c2410c",
            fontSize: "10px",
          }}
        >
          {inspector ||
            "Sin asignar"}
        </strong>
      </div>

      <button
        type="button"
        onClick={abrir}
        style={{
          width: "100%",
          marginTop: "12px",
          minHeight: "38px",
          border: "none",
          borderRadius: "7px",
          background: "#1f2937",
          color: "#ffffff",
          cursor: "pointer",
          fontSize: "10px",
          fontWeight: "700",
        }}
      >
        {inspector
          ? "Ver seguimiento"
          : "Abrir y asignar inspector"}
      </button>
    </article>
  );
};

export default ReclamoGuardiaCard;  