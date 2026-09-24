import {
  useState,
} from "react";

import api from "../api/api";

import "./VerificacionForm.css";

const VerificacionForm = ({
  reclamo,
  vehiculo = null,
  emplazamiento,
  onGuardado,
}) => {
  const [resultado, setResultado] =
    useState("");

  const [situacion, setSituacion] =
    useState("");

  const [observaciones, setObservaciones] =
    useState("");

  const [latitud, setLatitud] =
    useState("");

  const [longitud, setLongitud] =
    useState("");

  const [precision, setPrecision] =
    useState("");

  const [tomandoGps, setTomandoGps] =
    useState(false);

  const [guardando, setGuardando] =
    useState(false);

  const [error, setError] =
    useState("");

  const tomarGps = () => {
    setError("");

    if (!navigator.geolocation) {
      setError(
        "El dispositivo no permite obtener ubicación."
      );

      return;
    }

    setTomandoGps(true);

    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        setLatitud(
          posicion.coords.latitude
        );

        setLongitud(
          posicion.coords.longitude
        );

        setPrecision(
          Math.round(
            posicion.coords.accuracy
          )
        );

        setTomandoGps(false);
      },
      () => {
        setTomandoGps(false);

        setError(
          "No se pudo obtener la ubicación."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  const guardar = async (
    event
  ) => {
    event.preventDefault();

    setError("");

    if (!resultado) {
      setError(
        "Seleccioná el resultado."
      );

      return;
    }

    if (!situacion.trim()) {
      setError(
        "Describí la situación encontrada."
      );

      return;
    }

    if (!latitud || !longitud) {
      setError(
        "Tomá la ubicación antes de guardar."
      );

      return;
    }

    try {
      setGuardando(true);

      await api.post(
        "/verificaciones",
        {
          reclamoId:
            Number(reclamo.id),

          emplazamientoId:
            Number(
              emplazamiento.id
            ),

          vehiculoId:
            vehiculo?.id
              ? Number(
                  vehiculo.id
                )
              : null,

          resultado,

          situacion:
            situacion.trim(),

          latitudActual:
            Number(latitud),

          longitudActual:
            Number(longitud),

          precisionGps:
            precision
              ? Number(
                  precision
                )
              : null,

          observaciones:
            observaciones.trim() ||
            null,
        }
      );

      if (onGuardado) {
        await onGuardado();
      }
    } catch (err) {
      console.error(
        "Error registrando verificación:",
        err
      );

      setError(
        err.response?.data?.mensaje ||
          "No se pudo registrar la verificación."
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form
      className="verificacion-form"
      onSubmit={guardar}
    >
      <label>
        Resultado *

        <select
          value={resultado}
          onChange={(event) =>
            setResultado(
              event.target.value
            )
          }
        >
          <option value="">
            Seleccionar...
          </option>

          <option value="CUMPLIDO">
            Cumplido
          </option>

          <option value="NO_CUMPLIDO">
            No cumplido
          </option>

          <option value="NO_SE_ENCUENTRA">
            Ya no se encuentra
          </option>

          <option value="PARCIAL">
            Cumplimiento parcial
          </option>

          <option value="OTRO">
            Otro
          </option>
        </select>
      </label>

      <label>
        Situación encontrada *

        <textarea
          rows="4"
          value={situacion}
          onChange={(event) =>
            setSituacion(
              event.target.value
            )
          }
          placeholder="Ej: el vehículo continúa en el mismo lugar..."
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

      <div className="verificacion-gps">
        <div>
          <strong>
            Segunda visita
          </strong>

          {!latitud ? (
            <span>
              Ubicación pendiente
            </span>
          ) : (
            <>
              <span>
                {Number(
                  latitud
                ).toFixed(6)}
                ,{" "}
                {Number(
                  longitud
                ).toFixed(6)}
              </span>

              <small>
                Precisión:{" "}
                {precision} m
              </small>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={tomarGps}
          disabled={
            tomandoGps
          }
        >
          {tomandoGps
            ? "Buscando GPS..."
            : "Tomar ubicación"}
        </button>
      </div>

      {error && (
        <div className="verificacion-error">
          {error}
        </div>
      )}

      <button
        type="submit"
        className="verificacion-guardar"
        disabled={
          guardando
        }
      >
        {guardando
          ? "Guardando..."
          : "Guardar verificación"}
      </button>
    </form>
  );
};

export default VerificacionForm;