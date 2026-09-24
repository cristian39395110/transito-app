import {
  useEffect,
  useState,
} from "react";

import api from "../api/api";

import "./UsuarioForm.css";

const UsuarioForm = ({
  usuario = null,
  onGuardado,
  onCancelar,
}) => {
  const editando =
    Boolean(usuario?.id);

  const [roles, setRoles] =
    useState([]);

  const [cargandoRoles, setCargandoRoles] =
    useState(true);

  const [form, setForm] =
    useState({
      nombre: "",
      usuario: "",
      password: "",
      rolId: "",
      activo: true,
    });

  const [guardando, setGuardando] =
    useState(false);

  const [error, setError] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | CARGAR ROLES REALES DESDE LA BASE
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const cargarRoles = async () => {
      try {
        setCargandoRoles(true);

        const respuesta =
          await api.get(
            "/usuarios/roles"
          );

        const lista =
          respuesta.data.roles ||
          respuesta.data ||
          [];

        setRoles(
          Array.isArray(lista)
            ? lista
            : []
        );
      } catch (err) {
        console.error(
          "Error cargando roles:",
          err
        );

        setError(
          "No se pudieron cargar los roles."
        );
      } finally {
        setCargandoRoles(false);
      }
    };

    cargarRoles();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | CARGAR USUARIO AL EDITAR
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!usuario) {
      setForm({
        nombre: "",
        usuario: "",
        password: "",
        rolId: "",
        activo: true,
      });

      return;
    }

    setForm({
      nombre:
        usuario.nombre || "",

      usuario:
        usuario.usuario || "",

      password: "",

      rolId:
        usuario.rolId ||
        usuario.rol?.id ||
        usuario.Rol?.id ||
        "",

      activo:
        usuario.activo !== false,
    });
  }, [usuario]);

  /*
  |--------------------------------------------------------------------------
  | CAMBIAR CAMPOS
  |--------------------------------------------------------------------------
  */

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

  /*
  |--------------------------------------------------------------------------
  | GUARDAR
  |--------------------------------------------------------------------------
  */

  const guardar = async (
    event
  ) => {
    event.preventDefault();

    setError("");

    if (!form.nombre.trim()) {
      setError(
        "Ingresá el nombre."
      );

      return;
    }

    if (!form.usuario.trim()) {
      setError(
        "Ingresá el usuario."
      );

      return;
    }

    if (!form.rolId) {
      setError(
        "Seleccioná un rol."
      );

      return;
    }

    if (
      !editando &&
      !form.password.trim()
    ) {
      setError(
        "Ingresá una contraseña."
      );

      return;
    }

    if (
      form.password &&
      form.password.length < 6
    ) {
      setError(
        "La contraseña debe tener al menos 6 caracteres."
      );

      return;
    }

    /*
    |--------------------------------------------------------------------------
    | IMPORTANTE
    |
    | El backend espera rolId, NO "rol".
    |--------------------------------------------------------------------------
    */

    const datos = {
      nombre:
        form.nombre.trim(),

      usuario:
        form.usuario.trim(),

      rolId:
        Number(form.rolId),

      activo:
        form.activo,
    };

    if (
      form.password.trim()
    ) {
      datos.password =
        form.password;
    }

    try {
      setGuardando(true);

      if (editando) {
        await api.put(
          `/usuarios/${usuario.id}`,
          datos
        );
      } else {
        await api.post(
          "/usuarios",
          datos
        );
      }

      if (onGuardado) {
        await onGuardado();
      }
    } catch (err) {
      console.error(
        "Error guardando usuario:",
        err
      );

      setError(
        err.response?.data?.mensaje ||
          "No se pudo guardar el usuario."
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form
      className="usuario-form"
      onSubmit={guardar}
    >
      <div className="usuario-form-header">
        <div>
          <small>
            {editando
              ? "EDITAR USUARIO"
              : "NUEVO USUARIO"}
          </small>

          <h2>
            {editando
              ? usuario.nombre
              : "Crear acceso"}
          </h2>
        </div>

        <button
          type="button"
          onClick={onCancelar}
        >
          ✕
        </button>
      </div>

      <div className="usuario-form-grid">
        <label>
          Nombre *

          <input
            name="nombre"
            value={form.nombre}
            onChange={cambiar}
            autoComplete="off"
            placeholder="Nombre y apellido"
          />
        </label>

        <label>
          Usuario *

          <input
            name="usuario"
            value={form.usuario}
            onChange={cambiar}
            autoComplete="off"
            placeholder="Ej: jperez"
          />
        </label>
      </div>

      <label>
        Rol *

        <select
          name="rolId"
          value={form.rolId}
          onChange={cambiar}
          disabled={cargandoRoles}
        >
          <option value="">
            {cargandoRoles
              ? "Cargando roles..."
              : "Seleccionar rol..."}
          </option>

          {roles.map(
            (rol) => (
              <option
                key={rol.id}
                value={rol.id}
              >
                {nombreRol(
                  rol.nombre
                )}
              </option>
            )
          )}
        </select>
      </label>

      <label>
        {editando
          ? "Nueva contraseña"
          : "Contraseña *"}

        <input
          name="password"
          type="password"
          value={form.password}
          onChange={cambiar}
          autoComplete="new-password"
          placeholder={
            editando
              ? "Dejar vacío para no cambiarla"
              : "Mínimo 6 caracteres"
          }
        />

        {editando && (
          <small className="usuario-password-ayuda">
            Si no querés cambiar la
            contraseña, dejá este campo
            vacío.
          </small>
        )}
      </label>

      <label className="usuario-activo">
        <input
          name="activo"
          type="checkbox"
          checked={form.activo}
          onChange={cambiar}
        />

        <div>
          <strong>
            Usuario activo
          </strong>

          <span>
            Puede iniciar sesión y usar
            el sistema.
          </span>
        </div>
      </label>

      {error && (
        <div className="usuario-form-error">
          {error}
        </div>
      )}

      <div className="usuario-form-botones">
        <button
          type="button"
          className="usuario-cancelar"
          onClick={onCancelar}
          disabled={guardando}
        >
          Cancelar
        </button>

        <button
          type="submit"
          className="usuario-guardar"
          disabled={
            guardando ||
            cargandoRoles
          }
        >
          {guardando
            ? "Guardando..."
            : editando
              ? "Guardar cambios"
              : "Crear usuario"}
        </button>
      </div>
    </form>
  );
};

const nombreRol = (
  nombre
) => {
  const nombres = {
    administrador:
      "Administrador",

    director:
      "Director",

    jefe_guardia:
      "Jefe de guardia",

    inspector:
      "Inspector",

    secretaria_reclamos:
      "Secretaría de reclamos",

    secretaria_predio:
      "Secretaría de predio",
  };

  return (
    nombres[nombre] ||
    nombre
  );
};

export default UsuarioForm;