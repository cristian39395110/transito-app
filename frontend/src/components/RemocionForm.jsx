import {
  useEffect,
  useState,
} from "react";

import api from "../api/api";

import "./RemocionForm.css";

const RemocionForm = ({
  reclamo,
  vehiculo,
  infraccion = null,
  inventario = null,
  onGuardado,
}) => {
const [form, setForm] =
  useState({
    grua: "",
    chofer: "",
    predioDestinoId: "",
    observaciones: "",
  });

const [predios, setPredios] =
  useState([]);

  const [guardando, setGuardando] =
    useState(false);

  const [error, setError] =
    useState("");

  const [mensaje, setMensaje] =
    useState("");

    useEffect(() => {
  const cargarPredios = async () => {
    try {
      const respuesta =
        await api.get("/predios");

      const datos =
        respuesta.data?.predios ||
        respuesta.data ||
        [];

      setPredios(
        Array.isArray(datos)
          ? datos.filter(
              (predio) =>
                predio.activo !== false
            )
          : []
      );
    } catch (err) {
      console.error(
        "Error cargando destinos:",
        err
      );

      setError(
        "No se pudieron cargar los destinos."
      );
    }
  };

  cargarPredios();
}, []);

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

  const guardar = async (
    event
  ) => {
    event.preventDefault();

    setError("");
    setMensaje("");

   if (!form.predioDestinoId) {
  setError(
    "Seleccioná el destino del vehículo."
  );

  return;
}

    const confirmar =
      window.confirm(
        `¿Confirmás la remoción del vehículo interno Nº ${
          vehiculo.numeroInterno ||
          vehiculo.id
        }?`
      );

    if (!confirmar) {
      return;
    }

    try {
      setGuardando(true);

      await api.post(
        "/remociones",
        {
          reclamoId:
            Number(reclamo.id),

          vehiculoId:
            Number(vehiculo.id),

          infraccionId:
            infraccion?.id
              ? Number(
                  infraccion.id
                )
              : null,

          inventarioId:
            inventario?.id
              ? Number(
                  inventario.id
                )
              : null,

          grua:
            form.grua.trim() ||
            null,

          chofer:
            form.chofer.trim() ||
            null,

         predioDestinoId:
  Number(
    form.predioDestinoId
  ),

          observaciones:
            form.observaciones.trim() ||
            null,
        }
      );

      setMensaje(
        "Remoción registrada correctamente."
      );

      if (onGuardado) {
        await onGuardado();
      }
    } catch (err) {
      console.error(
        "Error registrando remoción:",
        err
      );

      setError(
        err.response?.data?.mensaje ||
          "No se pudo registrar la remoción."
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form
      className="remocion-form"
      onSubmit={guardar}
    >
      <div className="remocion-header">
        <div>
          <span>
            REMOCIÓN
          </span>

          <h3>
            Vehículo Nº{" "}
            {vehiculo.numeroInterno ||
              vehiculo.id}
          </h3>
        </div>

        {vehiculo.dominio && (
          <strong>
            {vehiculo.dominio}
          </strong>
        )}
      </div>

      <div className="remocion-aviso">
        Antes de registrar la remoción,
        verificá que el inventario y las
        fotografías del vehículo estén
        completos.
      </div>

      <div className="remocion-grid">
        <label>
          Grúa

          <input
            name="grua"
            value={form.grua}
            onChange={cambiar}
            placeholder="Ej: Grúa municipal 2"
          />
        </label>

        <label>
          Chofer

          <input
            name="chofer"
            value={form.chofer}
            onChange={cambiar}
            placeholder="Nombre del chofer"
          />
        </label>

     <label className="remocion-destino">
  Destino *

  <select
    name="predioDestinoId"
    value={form.predioDestinoId}
    onChange={cambiar}
    required
  >
    <option value="">
      Seleccionar destino
    </option>

    {predios.map((predio) => (
      <option
        key={predio.id}
        value={predio.id}
      >
        {predio.nombre}
      </option>
    ))}
  </select>
</label>
      </div>

      <label>
        Observaciones

        <textarea
          name="observaciones"
          rows="4"
          value={
            form.observaciones
          }
          onChange={cambiar}
          placeholder="Detalles de la remoción..."
        />
      </label>

      {error && (
        <div className="remocion-error">
          {error}
        </div>
      )}

      {mensaje && (
        <div className="remocion-ok">
          {mensaje}
        </div>
      )}

      <button
        type="submit"
        className="remocion-guardar"
        disabled={guardando}
      >
        {guardando
          ? "Registrando..."
          : "Confirmar remoción"}
      </button>
    </form>
  );
};

export default RemocionForm;