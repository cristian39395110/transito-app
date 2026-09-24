import {
  useState,
} from "react";

import api from "../api/api";

import "./VehiculoForm.css";

const VehiculoForm = ({
  reclamo,
  constatacion,
  onGuardado,
}) => {
  const [form, setForm] =
    useState({
      dominio: "",
      marca: "",
      modelo: "",
      color: "",
      tipoVehiculo: "",
      descripcion: "",
    });

  const [guardando, setGuardando] =
    useState(false);

  const [error, setError] =
    useState("");

  const [vehiculoCreado, setVehiculoCreado] =
    useState(null);

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

      if (
        !form.dominio.trim() &&
        !form.descripcion.trim()
      ) {
        setError(
          "Ingresá el dominio o una descripción que permita identificar el vehículo."
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

          dominio:
            form.dominio
              .trim()
              .toUpperCase() ||
            null,

          marca:
            form.marca.trim() ||
            null,

          modelo:
            form.modelo.trim() ||
            null,

          color:
            form.color.trim() ||
            null,

          tipoVehiculo:
            form.tipoVehiculo ||
            null,

          descripcion:
            form.descripcion.trim() ||
            null,
        };

        const respuesta =
          await api.post(
            "/actuaciones/vehiculos",
            datos
          );

        const creado =
          respuesta.data.vehiculo ||
          respuesta.data;

        setVehiculoCreado(
          creado
        );

        if (onGuardado) {
          await onGuardado();
        }
      } catch (err) {
        console.error(
          "Error creando vehículo:",
          err
        );

        setError(
          err.response?.data?.mensaje ||
            "No se pudo registrar el vehículo."
        );
      } finally {
        setGuardando(false);
      }
    };

  if (vehiculoCreado) {
    return (
      <div className="vehiculo-creado">
        <span>
          Vehículo registrado
        </span>

        <strong>
          Nº interno{" "}
          {vehiculoCreado.numeroInterno ||
            vehiculoCreado.id}
        </strong>

        {vehiculoCreado.dominio && (
          <p>
            Dominio:{" "}
            {
              vehiculoCreado.dominio
            }
          </p>
        )}

        <small>
          Este número interno identifica
          al vehículo dentro del sistema
          municipal y no reemplaza el
          número de reclamo externo.
        </small>
      </div>
    );
  }

  return (
    <form
      className="vehiculo-form"
      onSubmit={guardar}
    >
      <div className="vehiculo-form-header">
        <h3>
          Registrar vehículo
        </h3>

        <p>
          El número interno se genera
          automáticamente.
        </p>
      </div>

      <div className="vehiculo-form-grid">
        <label>
          Dominio / patente

          <input
            name="dominio"
            value={
              form.dominio
            }
            onChange={cambiar}
            placeholder="Ej: AB123CD"
            autoCapitalize="characters"
          />
        </label>

        <label>
          Tipo

          <select
            name="tipoVehiculo"
            value={
              form.tipoVehiculo
            }
            onChange={cambiar}
          >
            <option value="">
              Seleccionar...
            </option>

            <option value="AUTO">
              Automóvil
            </option>

            <option value="CAMIONETA">
              Camioneta
            </option>

            <option value="MOTO">
              Moto
            </option>

            <option value="CAMION">
              Camión
            </option>

            <option value="ACOPLADO">
              Acoplado
            </option>

            <option value="OTRO">
              Otro
            </option>
          </select>
        </label>

        <label>
          Marca

          <input
            name="marca"
            value={form.marca}
            onChange={cambiar}
            placeholder="Ej: Ford"
          />
        </label>

        <label>
          Modelo

          <input
            name="modelo"
            value={form.modelo}
            onChange={cambiar}
            placeholder="Ej: Fiesta"
          />
        </label>

        <label>
          Color

          <input
            name="color"
            value={form.color}
            onChange={cambiar}
          />
        </label>
      </div>

      <label>
        Descripción / identificación

        <textarea
          name="descripcion"
          rows="3"
          value={
            form.descripcion
          }
          onChange={cambiar}
          placeholder="Ej: vehículo sin dominio visible, daños, ubicación exacta..."
        />
      </label>

      {error && (
        <div className="vehiculo-error">
          {error}
        </div>
      )}

      <button
        type="submit"
        className="vehiculo-guardar"
        disabled={
          guardando
        }
      >
        {guardando
          ? "Registrando..."
          : "Registrar vehículo"}
      </button>
    </form>
  );
};

export default VehiculoForm;