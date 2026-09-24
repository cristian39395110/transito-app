import {
  useState,
} from "react";

import api from "../api/api";

import "./InfraccionForm.css";

const InfraccionForm = ({
  reclamo,
  vehiculo,
  verificacion = null,
  onGuardado,
}) => {
  const [numeroActa, setNumeroActa] =
    useState("");

  const [motivo, setMotivo] =
    useState("");

  const [observaciones, setObservaciones] =
    useState("");

  const [guardando, setGuardando] =
    useState(false);

  const [error, setError] =
    useState("");

  const [mensaje, setMensaje] =
    useState("");

  const guardar = async (
    event
  ) => {
    event.preventDefault();

    setError("");
    setMensaje("");

    if (!numeroActa.trim()) {
      setError(
        "Ingresá el número del acta de infracción."
      );

      return;
    }

    if (!motivo.trim()) {
      setError(
        "Ingresá el motivo de la infracción."
      );

      return;
    }

    try {
      setGuardando(true);

      await api.post(
        "/actuaciones/infracciones",
        {
          reclamoId:
            Number(reclamo.id),

          vehiculoId:
            Number(vehiculo.id),

          verificacionId:
            verificacion?.id
              ? Number(
                  verificacion.id
                )
              : null,

          numeroActa:
            numeroActa
              .trim()
              .toUpperCase(),

          lugar:
            reclamo.direccion,

          motivo:
            motivo.trim(),

          observaciones:
            observaciones.trim() ||
            null,
        }
      );

      setMensaje(
        "Infracción registrada correctamente."
      );

      if (onGuardado) {
        await onGuardado();
      }
    } catch (err) {
      console.error(
        "Error registrando infracción:",
        err
      );

      setError(
        err.response?.data?.mensaje ||
          "No se pudo registrar la infracción."
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form
      className="infraccion-form"
      onSubmit={guardar}
    >
      <div className="infraccion-identificadores">
        <div>
          <span>
            Reclamo
          </span>

          <strong>
            #
            {
              reclamo.numeroReclamo
            }
          </strong>
        </div>

        <div>
          <span>
            Vehículo interno
          </span>

          <strong>
            Nº{" "}
            {vehiculo.numeroInterno ||
              vehiculo.id}
          </strong>
        </div>
      </div>

      <label>
        Número del acta de infracción *

        <input
          value={numeroActa}
          onChange={(event) =>
            setNumeroActa(
              event.target.value
            )
          }
          placeholder="Ej: A00020123"
        />
      </label>

      <label>
        Motivo *

        <textarea
          rows="4"
          value={motivo}
          onChange={(event) =>
            setMotivo(
              event.target.value
            )
          }
          placeholder="Motivo de la infracción..."
        />
      </label>

      <label>
        Observaciones

        <textarea
          rows="3"
          value={observaciones}
          onChange={(event) =>
            setObservaciones(
              event.target.value
            )
          }
        />
      </label>

      {error && (
        <div className="infraccion-error">
          {error}
        </div>
      )}

      {mensaje && (
        <div className="infraccion-ok">
          {mensaje}
        </div>
      )}

      <button
        type="submit"
        className="infraccion-guardar"
        disabled={
          guardando
        }
      >
        {guardando
          ? "Guardando..."
          : "Registrar infracción"}
      </button>
    </form>
  );
};

export default InfraccionForm;