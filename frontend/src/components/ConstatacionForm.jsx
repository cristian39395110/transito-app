import {
  useState,
} from "react";

import api from "../api/api";

import "./ConstatacionForm.css";

const ConstatacionForm = ({
  reclamo,
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

  const [tomandoGPS, setTomandoGPS] =
    useState(false);

  const [guardando, setGuardando] =
    useState(false);

  const [error, setError] =
    useState("");

  const [mensaje, setMensaje] =
    useState("");

  const tomarUbicacion = () => {
    setError("");
    setMensaje("");

    if (!navigator.geolocation) {
      setError(
        "Este dispositivo no permite obtener la ubicación."
      );

      return;
    }

    setTomandoGPS(true);

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

        setTomandoGPS(false);

        setMensaje(
          "Ubicación obtenida correctamente."
        );
      },
      (err) => {
        console.error(
          "Error GPS:",
          err
        );

        setTomandoGPS(false);

        if (
          err.code ===
          err.PERMISSION_DENIED
        ) {
          setError(
            "Tenés que permitir el acceso a la ubicación."
          );
        } else {
          setError(
            "No se pudo obtener la ubicación. Intentá nuevamente."
          );
        }
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
    setMensaje("");

    if (!resultado) {
      setError(
        "Seleccioná el resultado de la constatación."
      );

      return;
    }

    if (!situacion.trim()) {
      setError(
        "Describí qué encontraste en el lugar."
      );

      return;
    }

    if (!latitud || !longitud) {
      setError(
        "Antes de guardar tenés que tomar la ubicación."
      );

      return;
    }

    try {
      setGuardando(true);

      const datos = {
        reclamoId:
          Number(reclamo.id),

        resultado,

        situacion:
          situacion.trim(),

        observaciones:
          observaciones.trim() ||
          null,

        latitudActual:
          Number(latitud),

        longitudActual:
          Number(longitud),

        precisionGps:
          precision
            ? Number(precision)
            : null,
      };

      /*
       * Las constataciones pertenecen
       * a actuaciones.
       */
      await api.post(
        "/actuaciones/constataciones",
        datos
      );

      setMensaje(
        "Constatación guardada correctamente."
      );

      setResultado("");
      setSituacion("");
      setObservaciones("");

      if (onGuardado) {
        await onGuardado();
      }
    } catch (err) {
      console.error(
        "Error guardando constatación:",
        err
      );

      setError(
        err.response?.data?.mensaje ||
          "No se pudo guardar la constatación."
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form
      className="constatacion-form"
      onSubmit={guardar}
    >
      <label>
        ¿Qué resultado tuvo la visita? *

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

          <option value="CONSTATADO">
            Problema constatado
          </option>

          <option value="NO_CONSTATADO">
            No se encontró el problema
          </option>

          <option value="RESUELTO_EN_LUGAR">
            Resuelto en el lugar
          </option>

          <option value="NO_SE_PUDO_VERIFICAR">
            No se pudo verificar
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
          placeholder="Ej: se constata acumulación de residuos sobre la vereda..."
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
          placeholder="Información adicional..."
        />
      </label>

      <div className="constatacion-gps">
        <div>
          <strong>
            Ubicación del inspector
          </strong>

          {!latitud ? (
            <span>
              Todavía no fue tomada.
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

              {precision && (
                <small>
                  Precisión aproximada:{" "}
                  {precision} m
                </small>
              )}
            </>
          )}
        </div>

        <button
          type="button"
          onClick={
            tomarUbicacion
          }
          disabled={
            tomandoGPS
          }
        >
          {tomandoGPS
            ? "Obteniendo GPS..."
            : latitud
              ? "Actualizar ubicación"
              : "Tomar ubicación"}
        </button>
      </div>

      {error && (
        <div className="constatacion-error">
          {error}
        </div>
      )}

      {mensaje && (
        <div className="constatacion-ok">
          {mensaje}
        </div>
      )}

      <button
        type="submit"
        className="constatacion-guardar"
        disabled={
          guardando
        }
      >
        {guardando
          ? "Guardando..."
          : "Guardar constatación"}
      </button>
    </form>
  );
};

export default ConstatacionForm;