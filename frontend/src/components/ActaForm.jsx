import {
  useState,
} from "react";

import api from "../api/api";

import "./ActaForm.css";

const ActaForm = ({
  reclamo,
  constatacion,
  vehiculo = null,
  onGuardado,
}) => {
  const [form, setForm] =
    useState({
      numeroActa: "",
      lugar:
        reclamo.direccion || "",
      entregadoA: "",
      situacion: "",
      cantidad: "",
      plazoDias: "",
      observaciones: "",
    });

  const [guardando, setGuardando] =
    useState(false);

  const [error, setError] =
    useState("");

  const [mensaje, setMensaje] =
    useState("");

  const cambiar = (event) => {
    const {
      name,
      value,
    } = event.target;

    setForm((anterior) => ({
      ...anterior,
      [name]: value,
    }));
  };

  const guardar =
    async (event) => {
      event.preventDefault();

      setError("");
      setMensaje("");

      if (
        !form.numeroActa.trim()
      ) {
        setError(
          "Ingresá el número del acta."
        );
        return;
      }

      if (!form.lugar.trim()) {
        setError(
          "Ingresá el lugar."
        );
        return;
      }

      if (
        !form.situacion.trim()
      ) {
        setError(
          "Describí la situación."
        );
        return;
      }

      try {
        setGuardando(true);

        const datos = {
          reclamoId:
            Number(reclamo.id),

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
            form.numeroActa.trim(),

          tipo:
            "VIA_PUBLICA",

          lugar:
            form.lugar.trim(),

          entregadoA:
            form.entregadoA.trim() ||
            null,

          situacion:
            form.situacion.trim(),

          cantidad:
            form.cantidad
              ? Number(
                  form.cantidad
                )
              : null,

          plazoDias:
            form.plazoDias
              ? Number(
                  form.plazoDias
                )
              : null,

          observaciones:
            form.observaciones.trim() ||
            null,
        };

        await api.post(
          "/actuaciones/actas",
          datos
        );

        setMensaje(
          "Acta registrada correctamente."
        );

        if (onGuardado) {
          await onGuardado();
        }
      } catch (err) {
        console.error(
          "Error guardando acta:",
          err
        );

        setError(
          err.response?.data?.mensaje ||
            "No se pudo registrar el acta."
        );
      } finally {
        setGuardando(false);
      }
    };

  return (
    <form
      className="acta-form"
      onSubmit={guardar}
    >
      <div className="acta-form-titulo">
        <h3>
          Acta de Vía Pública
        </h3>

        <p>
          Reclamo externo #
          {reclamo.numeroReclamo}
        </p>
      </div>

      <div className="acta-form-grid">
        <label>
          Número de acta *

          <input
            name="numeroActa"
            value={
              form.numeroActa
            }
            onChange={cambiar}
            placeholder="Ej: C0011859"
          />
        </label>

        <label>
          Lugar *

          <input
            name="lugar"
            value={form.lugar}
            onChange={cambiar}
          />
        </label>

        <label>
          Entregado / notificado a

          <input
            name="entregadoA"
            value={
              form.entregadoA
            }
            onChange={cambiar}
            placeholder="Nombre, responsable, comercio..."
          />
        </label>

        <label>
          Cantidad

          <input
            name="cantidad"
            type="number"
            min="0"
            value={
              form.cantidad
            }
            onChange={cambiar}
          />
        </label>

        <label>
          Plazo en días

          <input
            name="plazoDias"
            type="number"
            min="0"
            value={
              form.plazoDias
            }
            onChange={cambiar}
            placeholder="Si corresponde"
          />
        </label>
      </div>

      <label>
        Situación constatada *

        <textarea
          name="situacion"
          rows="4"
          value={
            form.situacion
          }
          onChange={cambiar}
          placeholder="Detalle de la situación que origina el acta..."
        />
      </label>

      <label>
        Observaciones

        <textarea
          name="observaciones"
          rows="3"
          value={
            form.observaciones
          }
          onChange={cambiar}
        />
      </label>

      {error && (
        <div className="acta-error">
          {error}
        </div>
      )}

      {mensaje && (
        <div className="acta-ok">
          {mensaje}
        </div>
      )}

      <button
        type="submit"
        className="acta-guardar"
        disabled={
          guardando
        }
      >
        {guardando
          ? "Guardando..."
          : "Registrar acta"}
      </button>
    </form>
  );
};

export default ActaForm;