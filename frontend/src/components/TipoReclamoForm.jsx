import {
  useEffect,
  useState,
} from "react";

import api from "../api/api";

const TipoReclamoForm = ({
  tipo = null,
  onGuardado,
  onCancelar,
}) => {
  const editando =
    Boolean(tipo?.id);

  const [form, setForm] =
    useState({
      nombre: "",
      descripcion: "",
      activo: true,
    });

  const [guardando, setGuardando] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (!tipo) {
      setForm({
        nombre: "",
        descripcion: "",
        activo: true,
      });

      return;
    }

    setForm({
      nombre:
        tipo.nombre || "",

      descripcion:
        tipo.descripcion || "",

      activo:
        tipo.activo !== false,
    });
  }, [tipo]);

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
          type === "checkbox"
            ? checked
            : value,
      })
    );
  };

  const guardar =
    async (event) => {
      event.preventDefault();

      setError("");

      if (!form.nombre.trim()) {
        setError(
          "Ingresá el nombre del tipo de reclamo."
        );

        return;
      }

      const datos = {
        nombre:
          form.nombre.trim(),

        descripcion:
          form.descripcion.trim() ||
          null,

        activo:
          form.activo,
      };

      try {
        setGuardando(true);

        if (editando) {
          await api.put(
            `/tipos-reclamo/${tipo.id}`,
            datos
          );
        } else {
          await api.post(
            "/tipos-reclamo",
            datos
          );
        }

        if (onGuardado) {
          await onGuardado();
        }
      } catch (err) {
        console.error(
          "Error guardando tipo de reclamo:",
          err
        );

        setError(
          err.response?.data
            ?.mensaje ||
            "No se pudo guardar el tipo de reclamo."
        );
      } finally {
        setGuardando(false);
      }
    };

  return (
    <form
      className="reclamo-form"
      onSubmit={guardar}
    >
      <div className="reclamo-form-header">
        <h2>
          {editando
            ? "Editar tipo de reclamo"
            : "Nuevo tipo de reclamo"}
        </h2>

        <p>
          Este tipo aparecerá en el
          formulario de nuevos
          reclamos.
        </p>
      </div>

      <label>
        Nombre *

        <input
          name="nombre"
          value={form.nombre}
          onChange={cambiar}
          placeholder="Ej: Vehículo abandonado"
          autoFocus
        />
      </label>

      <label>
        Descripción

        <textarea
          name="descripcion"
          value={
            form.descripcion
          }
          onChange={cambiar}
          rows="3"
          placeholder="Descripción opcional..."
        />
      </label>

      <label
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <input
          name="activo"
          type="checkbox"
          checked={form.activo}
          onChange={cambiar}
          style={{
            width: "auto",
          }}
        />

        Tipo activo
      </label>

      {error && (
        <div className="reclamo-form-error">
          {error}
        </div>
      )}

      <div className="reclamo-form-acciones">
        <button
          type="button"
          className="reclamo-form-cancelar"
          onClick={onCancelar}
          disabled={guardando}
        >
          Cancelar
        </button>

        <button
          type="submit"
          className="reclamo-form-guardar"
          disabled={guardando}
        >
          {guardando
            ? "Guardando..."
            : editando
              ? "Guardar cambios"
              : "Crear tipo"}
        </button>
      </div>
    </form>
  );
};

export default TipoReclamoForm;