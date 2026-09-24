import {
  useState,
} from "react";

import api from "../api/api";

import "./ActaForm.css";

const InventarioVehiculoForm = ({
  reclamo,
  vehiculo,
  onGuardado,
}) => {
  const [detalle, setDetalle] =
    useState({
      ruedas: "",
      espejos: "",
      vidrios: "",
      luces: "",
      bateria: "",
      stereo: "",
      auxilio: "",
      dañosVisibles: "",
    });

  const [observaciones, setObservaciones] =
    useState("");

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

    setDetalle((anterior) => ({
      ...anterior,
      [name]: value,
    }));
  };

  const guardar = async (
    event
  ) => {
    event.preventDefault();

    setError("");
    setMensaje("");

    try {
      setGuardando(true);

      await api.post(
        "/actuaciones/inventarios",
        {
          reclamoId:
            Number(reclamo.id),

          vehiculoId:
            Number(vehiculo.id),

          detalle,

          observaciones:
            observaciones.trim() ||
            null,
        }
      );

      setMensaje(
        "Inventario registrado correctamente."
      );

      if (onGuardado) {
        await onGuardado();
      }
    } catch (err) {
      console.error(
        "Error guardando inventario:",
        err
      );

      setError(
        err.response?.data?.mensaje ||
          "No se pudo registrar el inventario."
      );
    } finally {
      setGuardando(false);
    }
  };

  const opciones = [
    ["ruedas", "Ruedas"],
    ["espejos", "Espejos"],
    ["vidrios", "Vidrios"],
    ["luces", "Luces"],
    ["bateria", "Batería"],
    ["stereo", "Stereo"],
    ["auxilio", "Rueda de auxilio"],
  ];

  return (
    <form
      className="acta-form"
      onSubmit={guardar}
    >
      <div className="acta-form-titulo">
        <h3>
          Estado del vehículo
        </h3>

        <p>
          Vehículo interno Nº{" "}
          {vehiculo.numeroInterno ||
            vehiculo.id}
        </p>
      </div>

      <div className="acta-form-grid">
        {opciones.map(
          ([campo, texto]) => (
            <label key={campo}>
              {texto}

              <select
                name={campo}
                value={
                  detalle[campo]
                }
                onChange={cambiar}
              >
                <option value="">
                  Sin verificar
                </option>

                <option value="OK">
                  Presente / normal
                </option>

                <option value="DAÑADO">
                  Dañado
                </option>

                <option value="FALTANTE">
                  Faltante
                </option>

                <option value="NO_APLICA">
                  No aplica
                </option>
              </select>
            </label>
          )
        )}
      </div>

      <label>
        Daños visibles

        <textarea
          name="dañosVisibles"
          rows="4"
          value={
            detalle.dañosVisibles
          }
          onChange={cambiar}
          placeholder="Ej: paragolpes roto, puerta abollada, vidrio lateral faltante..."
        />
      </label>

      <label>
        Observaciones generales

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
          : "Guardar inventario"}
      </button>
    </form>
  );
};

export default InventarioVehiculoForm;