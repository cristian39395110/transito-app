import {
  ESTADOS_RECLAMO_MAPA,
} from "../utils/estadoReclamoMapa";

const FiltroMapaReclamos = ({
  filtros,
  setFiltros,
  tipos,
  total,
}) => {
  const cambiar = (
    campo,
    valor
  ) => {
    setFiltros(
      (anterior) => ({
        ...anterior,
        [campo]: valor,
      })
    );
  };

  const limpiar = () => {
    setFiltros({
      estado: "",
      tipoReclamoId: "",
      busqueda: "",
    });
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "repeat(auto-fit, minmax(180px, 1fr))",
        gap: "10px",
        marginBottom: "12px",
        padding: "12px",
        border:
          "1px solid #e5e7eb",
        borderRadius: "10px",
        background: "#ffffff",
      }}
    >
      <input
        value={
          filtros.busqueda
        }
        onChange={(event) =>
          cambiar(
            "busqueda",
            event.target.value
          )
        }
        placeholder="Buscar reclamo, calle, barrio..."
        style={campoEstilo}
      />

      <select
        value={
          filtros.estado
        }
        onChange={(event) =>
          cambiar(
            "estado",
            event.target.value
          )
        }
        style={campoEstilo}
      >
        <option value="">
          Todos los estados
        </option>

        {ESTADOS_RECLAMO_MAPA.map(
          (estado) => (
            <option
              key={estado.valor}
              value={estado.valor}
            >
              {estado.texto}
            </option>
          )
        )}
      </select>

      <select
        value={
          filtros.tipoReclamoId
        }
        onChange={(event) =>
          cambiar(
            "tipoReclamoId",
            event.target.value
          )
        }
        style={campoEstilo}
      >
        <option value="">
          Todos los tipos
        </option>

        {tipos.map(
          (tipo) => (
            <option
              key={tipo.id}
              value={tipo.id}
            >
              {tipo.nombre}
            </option>
          )
        )}
      </select>

      <button
        type="button"
        onClick={limpiar}
        style={{
          minHeight: "42px",
          border:
            "1px solid #d1d5db",
          borderRadius: "8px",
          background: "#ffffff",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Limpiar filtros
      </button>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent:
            "center",
          minHeight: "42px",
          borderRadius: "8px",
          background: "#f9fafb",
          color: "#374151",
          fontSize: "12px",
          fontWeight: 700,
        }}
      >
        {total} reclamos en mapa
      </div>
    </div>
  );
};

const campoEstilo = {
  width: "100%",
  minHeight: "42px",
  border:
    "1px solid #d1d5db",
  borderRadius: "8px",
  padding: "9px 10px",
  background: "#ffffff",
  fontSize: "13px",
  outline: "none",
};

export default FiltroMapaReclamos;