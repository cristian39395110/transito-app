import {
  useState,
} from "react";

import api from "../api/api";

import ActaForm from "./ActaForm";
import EmplazamientoForm from "./EmplazamientoForm";
import VehiculoForm from "./VehiculoForm";

import "./AccionesConstatacion.css";

const AccionesConstatacion = ({
  reclamo,
  constatacion = null,
  onActualizado,
}) => {
  const [accion, setAccion] =
    useState(null);

  const [procesando, setProcesando] =
    useState(false);

  const [error, setError] =
    useState("");

  const [mensaje, setMensaje] =
    useState("");

  const resolverReclamo =
    async () => {
      const confirmar =
        window.confirm(
          "¿Confirmás que el reclamo quedó resuelto?"
        );

      if (!confirmar) {
        return;
      }

      try {
        setProcesando(true);
        setError("");
        setMensaje("");

        await api.patch(
          `/actuaciones/reclamos/${reclamo.id}/resolver`,
          {
            motivo:
              "Resuelto durante la actuación del inspector",
          }
        );

        setMensaje(
          "El reclamo quedó resuelto y listo para cierre externo."
        );

        if (onActualizado) {
          await onActualizado();
        }
      } catch (err) {
        console.error(
          "Error resolviendo reclamo:",
          err
        );

        setError(
          err.response?.data?.mensaje ||
            "No se pudo resolver el reclamo."
        );
      } finally {
        setProcesando(false);
      }
    };

  if (
    reclamo.estado ===
      "RESUELTO" ||
    reclamo.estado ===
      "ANULADO"
  ) {
    return (
      <div className="acciones-finalizado">
        Este reclamo ya no requiere
        nuevas actuaciones.
      </div>
    );
  }

  return (
    <div className="acciones-constatacion">
      <div className="acciones-header">
        <h3>
          ¿Qué corresponde hacer?
        </h3>

        <p>
          Elegí la actuación según lo
          encontrado en el lugar.
        </p>
      </div>

      {!accion && (
        <div className="acciones-grid">
          <button
            type="button"
            className="accion-opcion accion-resolver"
            onClick={
              resolverReclamo
            }
            disabled={
              procesando
            }
          >
            <span>✓</span>

            <div>
              <strong>
                Resolver
              </strong>

              <small>
                El problema ya fue
                solucionado.
              </small>
            </div>
          </button>

          <button
            type="button"
            className="accion-opcion"
            onClick={() =>
              setAccion("ACTA")
            }
          >
            <span>📄</span>

            <div>
              <strong>
                Hacer acta
              </strong>

              <small>
                Registrar un Acta de
                Vía Pública.
              </small>
            </div>
          </button>

          <button
            type="button"
            className="accion-opcion"
            onClick={() =>
              setAccion(
                "EMPLAZAMIENTO"
              )
            }
          >
            <span>⏱</span>

            <div>
              <strong>
                Emplazar
              </strong>

              <small>
                Dar un plazo para
                solucionar el problema.
              </small>
            </div>
          </button>

          <button
            type="button"
            className="accion-opcion accion-vehiculo"
            onClick={() =>
              setAccion(
                "VEHICULO"
              )
            }
          >
            <span>🚗</span>

            <div>
              <strong>
                Registrar vehículo
              </strong>

              <small>
                Solo cuando la actuación
                corresponde a un
                vehículo.
              </small>
            </div>
          </button>
        </div>
      )}

      {accion && (
        <div className="accion-formulario">
          <button
            type="button"
            className="accion-volver"
            onClick={() => {
              setAccion(null);
              setError("");
              setMensaje("");
            }}
          >
            ← Elegir otra actuación
          </button>

          {accion === "ACTA" && (
            <ActaForm
              reclamo={reclamo}
              constatacion={
                constatacion
              }
              onGuardado={
                onActualizado
              }
            />
          )}

          {accion ===
            "EMPLAZAMIENTO" && (
            <EmplazamientoForm
              reclamo={reclamo}
              constatacion={
                constatacion
              }
              onGuardado={
                onActualizado
              }
            />
          )}

          {accion ===
            "VEHICULO" && (
            <VehiculoForm
              reclamo={reclamo}
              constatacion={
                constatacion
              }
              onGuardado={
                onActualizado
              }
            />
          )}
        </div>
      )}

      {error && (
        <div className="acciones-error">
          {error}
        </div>
      )}

      {mensaje && (
        <div className="acciones-ok">
          {mensaje}
        </div>
      )}
    </div>
  );
};

export default AccionesConstatacion;