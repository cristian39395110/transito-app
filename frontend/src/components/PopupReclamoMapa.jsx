import {
  useNavigate,
} from "react-router-dom";

import {
  obtenerNombreEstado,
} from "../utils/estadoReclamoMapa";

const PopupReclamoMapa = ({
  reclamo,
}) => {
  const navigate =
    useNavigate();

  const tipo =
    reclamo.TipoReclamo ||
    reclamo.tipoReclamo;

  return (
    <div
      style={{
        minWidth: "210px",
      }}
    >
      <small
        style={{
          color: "#9ca3af",
          fontWeight: 700,
          fontSize: "9px",
        }}
      >
        RECLAMO EXTERNO
      </small>

      <h3
        style={{
          margin: "2px 0 8px",
          fontSize: "17px",
        }}
      >
        #
        {
          reclamo.numeroReclamo
        }
      </h3>

      <div
        style={{
          marginBottom: "6px",
          fontSize: "12px",
        }}
      >
        <strong>
          {tipo?.nombre ||
            "Sin tipo"}
        </strong>
      </div>

      <div
        style={{
          marginBottom: "5px",
          color: "#374151",
          fontSize: "12px",
        }}
      >
        {reclamo.direccion}
      </div>

      {reclamo.barrio && (
        <div
          style={{
            marginBottom:
              "7px",
            color: "#6b7280",
            fontSize: "11px",
          }}
        >
          Barrio:{" "}
          {reclamo.barrio}
        </div>
      )}

      <div
        style={{
          marginBottom: "10px",
          padding: "6px 8px",
          borderRadius: "6px",
          background: "#f3f4f6",
          fontSize: "10px",
          fontWeight: 700,
        }}
      >
        {obtenerNombreEstado(
          reclamo.estado
        )}
      </div>

      <button
        type="button"
        onClick={() =>
          navigate(
            `/reclamos/${reclamo.id}`
          )
        }
        style={{
          width: "100%",
          minHeight: "36px",
          border: "none",
          borderRadius: "6px",
          background: "#1f2937",
          color: "#ffffff",
          fontSize: "11px",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Ver reclamo
      </button>
    </div>
  );
};

export default PopupReclamoMapa;