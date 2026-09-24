import {
  useMemo,
  useState,
} from "react";

import api from "../api/api";

import "./EmplazamientoForm.css";

const EmplazamientoForm = ({
  reclamo,
  constatacion = null,
  vehiculo = null,
  onGuardado,
}) => {
  const [
    form,
    setForm,
  ] = useState({
    numeroActa: "",

    personaEncontrada:
      false,

    atendidoPor: "",

    caracterAtendido: "",

    plazoCantidad:
      "24",

    plazoUnidad:
      "HORAS",

    observaciones: "",
  });

  const [
    guardando,
    setGuardando,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    mensaje,
    setMensaje,
  ] = useState("");

  const cambiar = (
    event
  ) => {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setForm(
      (anterior) => ({
        ...anterior,

        [name]:
          type ===
          "checkbox"
            ? checked
            : value,
      })
    );
  };

  /*
  |--------------------------------------------------------------------------
  | CALCULAR FECHA DE VENCIMIENTO SOLO PARA MOSTRAR
  |--------------------------------------------------------------------------
  */

  const fechaVencimiento =
    useMemo(() => {
      const cantidad =
        Number(
          form.plazoCantidad
        );

      if (
        !Number.isFinite(
          cantidad
        ) ||
        cantidad <= 0
      ) {
        return null;
      }

      const fecha =
        new Date();

      if (
        form.plazoUnidad ===
        "DIAS"
      ) {
        fecha.setDate(
          fecha.getDate() +
            cantidad
        );
      } else {
        fecha.setHours(
          fecha.getHours() +
            cantidad
        );
      }

      return fecha;
    }, [
      form.plazoCantidad,
      form.plazoUnidad,
    ]);

  const vencimientoTexto =
    useMemo(() => {
      if (
        !fechaVencimiento
      ) {
        return "";
      }

      return fechaVencimiento.toLocaleString(
        "es-AR",
        {
          day:
            "2-digit",

          month:
            "2-digit",

          year:
            "numeric",

          hour:
            "2-digit",

          minute:
            "2-digit",
        }
      );
    }, [
      fechaVencimiento,
    ]);

  /*
  |--------------------------------------------------------------------------
  | GUARDAR
  |--------------------------------------------------------------------------
  */

  const guardar =
    async (event) => {
      event.preventDefault();

      setError("");
      setMensaje("");

      if (
        !form.numeroActa
          .trim()
      ) {
        setError(
          "Ingresá el número del Acta de Vía Pública."
        );

        return;
      }

      const plazo =
        Number(
          form.plazoCantidad
        );

      if (
        !Number.isFinite(
          plazo
        ) ||
        plazo <= 0
      ) {
        setError(
          "Ingresá un plazo válido."
        );

        return;
      }

      try {
        setGuardando(true);

        const datos = {
          reclamoId:
            Number(
              reclamo.id
            ),

          constatacionId:
            constatacion?.id
              ? Number(
                  constatacion.id
                )
              : null,

          vehiculoId:
            vehiculo?.id
              ? Number(
                  vehiculo.id
                )
              : null,

          numeroActa:
            form.numeroActa
              .trim(),

          personaEncontrada:
            form.personaEncontrada,

          atendidoPor:
            form.personaEncontrada
              ? form.atendidoPor
                  .trim() ||
                null
              : null,

          caracterAtendido:
            form.personaEncontrada
              ? form.caracterAtendido
                  .trim() ||
                null
              : null,

          plazoCantidad:
            plazo,

          plazoUnidad:
            form.plazoUnidad,

          observaciones:
            form.observaciones
              .trim() ||
            null,
        };

        await api.post(
          "/emplazamientos",
          datos
        );

        setMensaje(
          "Acta de Vía Pública registrada correctamente."
        );

        setForm({
          numeroActa:
            "",

          personaEncontrada:
            false,

          atendidoPor:
            "",

          caracterAtendido:
            "",

          plazoCantidad:
            "24",

          plazoUnidad:
            "HORAS",

          observaciones:
            "",
        });

        if (onGuardado) {
          await onGuardado();
        }
      } catch (err) {
        console.error(
          "Error registrando Acta de Vía Pública:",
          err
        );

        setError(
          err.response?.data
            ?.mensaje ||
            "No se pudo registrar el Acta de Vía Pública."
        );
      } finally {
        setGuardando(false);
      }
    };

  return (
    <form
      className="emplazamiento-form"
      onSubmit={
        guardar
      }
    >
      <div className="emplazamiento-titulo">
        <div>
          <small>
            ACTA VÍA PÚBLICA
          </small>

          <h3>
            Emplazamiento
          </h3>
        </div>

        <span>
          Reclamo #
          {
            reclamo.numeroReclamo
          }
        </span>
      </div>

      <label className="emplazamiento-campo">
        Número de Acta *

        <input
          type="text"
          name="numeroActa"
          value={
            form.numeroActa
          }
          onChange={
            cambiar
          }
          placeholder="Ej: C 0011859"
          autoComplete="off"
        />
      </label>

      <div className="emplazamiento-persona">
        <label className="emplazamiento-check">
          <input
            type="checkbox"
            name="personaEncontrada"
            checked={
              form.personaEncontrada
            }
            onChange={
              cambiar
            }
          />

          <span>
            Se encontró una persona
            en el lugar
          </span>
        </label>
      </div>

      {form.personaEncontrada && (
        <div className="emplazamiento-grid">
          <label className="emplazamiento-campo">
            Persona que atendió

            <input
              type="text"
              name="atendidoPor"
              value={
                form.atendidoPor
              }
              onChange={
                cambiar
              }
              placeholder="Nombre, si se conoce"
            />
          </label>

          <label className="emplazamiento-campo">
            En carácter de

            <select
              name="caracterAtendido"
              value={
                form.caracterAtendido
              }
              onChange={
                cambiar
              }
            >
              <option value="">
                Sin especificar
              </option>

              <option value="PROPIETARIO">
                Propietario
              </option>

              <option value="ENCARGADO">
                Encargado
              </option>

              <option value="VECINO">
                Vecino
              </option>

              <option value="DENUNCIANTE">
                Denunciante
              </option>

              <option value="OTRO">
                Otro
              </option>
            </select>
          </label>
        </div>
      )}

      <div className="emplazamiento-plazo">
        <h4>
          Plazo otorgado
        </h4>

        <div className="emplazamiento-grid">
          <label className="emplazamiento-campo">
            Cantidad *

            <input
              type="number"
              min="1"
              step="1"
              name="plazoCantidad"
              value={
                form.plazoCantidad
              }
              onChange={
                cambiar
              }
            />
          </label>

          <label className="emplazamiento-campo">
            Unidad *

            <select
              name="plazoUnidad"
              value={
                form.plazoUnidad
              }
              onChange={
                cambiar
              }
            >
              <option value="HORAS">
                Horas
              </option>

              <option value="DIAS">
                Días
              </option>
            </select>
          </label>
        </div>

        {fechaVencimiento && (
          <div className="emplazamiento-vencimiento">
            <small>
              VENCIMIENTO ESTIMADO
            </small>

            <strong>
              {
                vencimientoTexto
              }
            </strong>

            <p>
              El vencimiento definitivo
              será calculado por el
              servidor al registrar el
              acta.
            </p>
          </div>
        )}
      </div>

      <label className="emplazamiento-campo">
        Observaciones

        <textarea
          name="observaciones"
          rows="5"
          value={
            form.observaciones
          }
          onChange={
            cambiar
          }
          placeholder="Ej: se emplaza a retirar el vehículo de la vía pública..."
        />
      </label>

      {error && (
        <div className="emplazamiento-error">
          {error}
        </div>
      )}

      {mensaje && (
        <div className="emplazamiento-ok">
          {mensaje}
        </div>
      )}

      <button
        type="submit"
        className="emplazamiento-guardar"
        disabled={
          guardando
        }
      >
        {guardando
          ? "Registrando..."
          : "Registrar Acta y Emplazamiento"}
      </button>
    </form>
  );
};

export default EmplazamientoForm;