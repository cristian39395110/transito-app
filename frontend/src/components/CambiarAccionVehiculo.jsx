import {
  useState,
} from "react";

import api from "../api/api";

/*
|--------------------------------------------------------------------------
| CAMBIAR QUÉ PASA CON EL VEHÍCULO
|--------------------------------------------------------------------------
|
| Se muestra en un control ya guardado cuando el vehículo
| todavía está en la calle. Permite corregir:
|
| - Lo retira la grúa  -> Esperar orden del juez
| - Esperar orden del juez -> Lo retira la grúa
|   (si Secretaría todavía no lo mandó al Juzgado)
|
| El backend valida todo de nuevo.
|
*/

const estiloCaja = {
  marginTop: "14px",
  padding: "14px",
  border: "1px solid #fde68a",
  borderRadius: "10px",
  background: "#fffbeb",
};

const estiloBoton = {
  display: "block",
  width: "100%",
  minHeight: "48px",
  marginTop: "8px",
  padding: "12px",
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  background: "#ffffff",
  color: "#0f172a",
  fontSize: "14px",
  fontWeight: 700,
  textAlign: "left",
  cursor: "pointer",
};

const estiloBotonPrincipal = {
  ...estiloBoton,
  border: "1px solid #b45309",
  background: "#d97706",
  color: "#ffffff",
  textAlign: "center",
};

const CambiarAccionVehiculo = ({
  infraccion,
  vehiculo,
  onCambiado,
}) => {
  const [
    abierto,
    setAbierto,
  ] = useState(false);

  const [
    pidiendoMotivo,
    setPidiendoMotivo,
  ] = useState(false);

  const [
    motivo,
    setMotivo,
  ] = useState("");

  const [
    guardando,
    setGuardando,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  if (
    !infraccion ||
    !vehiculo ||
    vehiculo.estadoActual !==
      "PENDIENTE_REMOCION"
  ) {
    return null;
  }

  const accion =
    infraccion.accionPosterior;

  const puedeIrAGrua =
    accion ===
      "BUSQUEDA_REMOCION" &&
    infraccion.estadoJuzgado ===
      "PENDIENTE_ENVIO" &&
    infraccion.estadoOrdenRemocion ===
      "PENDIENTE_SOLICITUD";

  const puedeIrAJuez =
    accion === "RETIRO_GRUA" &&
    infraccion.estadoOrdenRemocion !==
      "AUTORIZADA";

  if (
    !puedeIrAGrua &&
    !puedeIrAJuez
  ) {
    return null;
  }

  const cambiar = async (
    nuevaAccion,
    detalle = ""
  ) => {
    try {
      setGuardando(true);
      setError("");

      const respuesta =
        await api.patch(
          `/verificaciones/infraccion/${infraccion.id}/accion-vehiculo`,
          {
            accionPosterior:
              nuevaAccion,

            detalleAccionPosterior:
              detalle,
          }
        );

      alert(
        respuesta.data
          ?.mensaje ||
          "Cambio guardado."
      );

      setAbierto(false);
      setPidiendoMotivo(false);
      setMotivo("");

      if (onCambiado) {
        onCambiado(
          respuesta.data
        );
      }
    } catch (err) {
      setError(
        err.response?.data
          ?.mensaje ||
          "No se pudo guardar el cambio."
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div style={estiloCaja}>
      <strong>
        {puedeIrAJuez
          ? "🏗️ Esperando que pase la grúa"
          : "⚖️ Esperando la orden del juez"}
      </strong>

      <p
        style={{
          margin: "6px 0 0",
          color: "#475569",
          fontSize: "13px",
        }}
      >
        ¿Te equivocaste de opción? Lo podés
        cambiar mientras el vehículo siga
        en la calle.
      </p>

      {!abierto && (
        <button
          type="button"
          style={estiloBoton}
          onClick={() => {
            setAbierto(true);
            setError("");
          }}
        >
          🔄 Cambiar qué pasa con el vehículo
        </button>
      )}

      {abierto &&
        puedeIrAGrua && (
          <>
            <button
              type="button"
              style={estiloBotonPrincipal}
              disabled={guardando}
              onClick={() => {
                if (
                  window.confirm(
                    "¿Pasar el vehículo a la grúa? Se le avisará por email."
                  )
                ) {
                  cambiar(
                    "RETIRO_GRUA"
                  );
                }
              }}
            >
              {guardando
                ? "Guardando..."
                : "🏗️ Mejor que lo retire la grúa"}
            </button>
          </>
        )}

      {abierto &&
        puedeIrAJuez &&
        !pidiendoMotivo && (
          <button
            type="button"
            style={estiloBoton}
            disabled={guardando}
            onClick={() =>
              setPidiendoMotivo(true)
            }
          >
            ⚖️ No se puede retirar: esperar orden del juez
          </button>
        )}

      {abierto &&
        pidiendoMotivo && (
          <>
            <label
              style={{
                display: "block",
                marginTop: "10px",
                fontSize: "13px",
                fontWeight: 700,
              }}
            >
              ¿Por qué no se puede retirar? *
            </label>

            <textarea
              value={motivo}
              onChange={(e) =>
                setMotivo(
                  e.target.value
                )
              }
              rows={3}
              placeholder="Ej.: El propietario se opuso al retiro."
              style={{
                width: "100%",
                marginTop: "6px",
                padding: "10px",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                fontSize: "16px",
                boxSizing: "border-box",
              }}
            />

            <button
              type="button"
              style={estiloBotonPrincipal}
              disabled={
                guardando ||
                !motivo.trim()
              }
              onClick={() =>
                cambiar(
                  "BUSQUEDA_REMOCION",
                  motivo.trim()
                )
              }
            >
              {guardando
                ? "Guardando..."
                : "Confirmar: esperar orden del juez"}
            </button>
          </>
        )}

      {abierto && (
        <button
          type="button"
          style={{
            ...estiloBoton,
            border: "none",
            background: "transparent",
            color: "#64748b",
            textAlign: "center",
          }}
          disabled={guardando}
          onClick={() => {
            setAbierto(false);
            setPidiendoMotivo(false);
            setMotivo("");
            setError("");
          }}
        >
          Cancelar
        </button>
      )}

      {error && (
        <p
          style={{
            margin: "8px 0 0",
            color: "#991b1b",
            fontSize: "13px",
            fontWeight: 700,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
};

export default CambiarAccionVehiculo;
