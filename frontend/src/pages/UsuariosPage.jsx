import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../api/api";

import UsuarioCard from "../components/UsuarioCard";
import UsuarioForm from "../components/UsuarioForm";

import "./UsuariosPage.css";


const UsuariosPage = () => {
  const [usuarios, setUsuarios] =
    useState([]);

  const [busqueda, setBusqueda] =
    useState("");

  const [filtroRol, setFiltroRol] =
    useState("");

  const [filtroEstado, setFiltroEstado] =
    useState("ACTIVOS");

  const [mostrarForm, setMostrarForm] =
    useState(false);

  const [usuarioEditar, setUsuarioEditar] =
    useState(null);

  const [cargando, setCargando] =
    useState(true);

  const [eliminandoId, setEliminandoId] =
    useState(null);

  const [error, setError] =
    useState("");


  /*
  |--------------------------------------------------------------------------
  | CARGAR USUARIOS
  |--------------------------------------------------------------------------
  */

  const cargar = useCallback(async () => {
    try {
      setCargando(true);
      setError("");

      const respuesta =
        await api.get("/usuarios");

      const lista =
        respuesta.data.usuarios ||
        respuesta.data ||
        [];

      setUsuarios(
        Array.isArray(lista)
          ? lista
          : []
      );
    } catch (err) {
      console.error(
        "Error cargando usuarios:",
        err
      );

      setError(
        err.response?.data?.mensaje ||
          "No se pudieron cargar los usuarios."
      );
    } finally {
      setCargando(false);
    }
  }, []);


  useEffect(() => {
    cargar();
  }, [cargar]);


  /*
  |--------------------------------------------------------------------------
  | FILTROS
  |--------------------------------------------------------------------------
  */

  const filtrados =
    useMemo(() => {
      const texto =
        busqueda
          .trim()
          .toLowerCase();

      return usuarios.filter(
        (usuario) => {
          const rol =
            usuario.rol?.nombre ||
            usuario.Rol?.nombre ||
            usuario.rol ||
            "";

          if (
            filtroRol &&
            rol !== filtroRol
          ) {
            return false;
          }

          if (
            filtroEstado ===
              "ACTIVOS" &&
            usuario.activo === false
          ) {
            return false;
          }

          if (
            filtroEstado ===
              "INACTIVOS" &&
            usuario.activo !== false
          ) {
            return false;
          }

          if (!texto) {
            return true;
          }

          const valores = [
            usuario.nombre,
            usuario.usuario,
            rol,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return valores.includes(
            texto
          );
        }
      );
    }, [
      usuarios,
      busqueda,
      filtroRol,
      filtroEstado,
    ]);


  /*
  |--------------------------------------------------------------------------
  | NUEVO / EDITAR
  |--------------------------------------------------------------------------
  */

  const abrirNuevo = () => {
    setUsuarioEditar(null);
    setMostrarForm(true);
  };


  const abrirEditar = (
    usuario
  ) => {
    setUsuarioEditar(usuario);
    setMostrarForm(true);
  };


  const cerrarForm = () => {
    setMostrarForm(false);
    setUsuarioEditar(null);
  };


  const guardado = async () => {
    await cargar();
    cerrarForm();
  };


  /*
  |--------------------------------------------------------------------------
  | ELIMINAR USUARIO
  |--------------------------------------------------------------------------
  */

  const eliminarUsuario = async (
    usuario
  ) => {
    const confirmar =
      window.confirm(
        `¿Eliminar definitivamente al usuario "${usuario.nombre}"?\n\n` +
          `Usuario: ${usuario.usuario}\n\n` +
          "Esta acción no se puede deshacer."
      );

    if (!confirmar) {
      return;
    }

    try {
      setEliminandoId(
        usuario.id
      );

      setError("");

      await api.delete(
        `/usuarios/${usuario.id}`
      );

      /*
       * Lo quitamos inmediatamente
       * de la pantalla.
       */
      setUsuarios(
        (anteriores) =>
          anteriores.filter(
            (item) =>
              item.id !==
              usuario.id
          )
      );
    } catch (err) {
      console.error(
        "Error eliminando usuario:",
        err
      );

      setError(
        err.response?.data?.mensaje ||
          "No se pudo eliminar el usuario."
      );
    } finally {
      setEliminandoId(null);
    }
  };


  /*
  |--------------------------------------------------------------------------
  | VISTA
  |--------------------------------------------------------------------------
  */

  return (
    <div className="usuarios-page">

      {/* CABECERA */}

      <div className="usuarios-header">
        <div>
          <h1>
            Usuarios
          </h1>

          <p>
            Administración de accesos
            y roles del sistema.
          </p>
        </div>

        <button
          type="button"
          className="usuarios-nuevo"
          onClick={abrirNuevo}
        >
          + Nuevo usuario
        </button>
      </div>


      {/* RESUMEN */}

      <div className="usuarios-resumen">

        <div>
          <span>
            Total
          </span>

          <strong>
            {usuarios.length}
          </strong>
        </div>

        <div>
          <span>
            Activos
          </span>

          <strong>
            {
              usuarios.filter(
                (usuario) =>
                  usuario.activo !==
                  false
              ).length
            }
          </strong>
        </div>

        <div>
          <span>
            Inactivos
          </span>

          <strong>
            {
              usuarios.filter(
                (usuario) =>
                  usuario.activo ===
                  false
              ).length
            }
          </strong>
        </div>

      </div>


      {/* FILTROS */}

      <div className="usuarios-filtros">

        <input
          value={busqueda}
          onChange={(event) =>
            setBusqueda(
              event.target.value
            )
          }
          placeholder="Buscar nombre o usuario..."
        />

        <select
          value={filtroRol}
          onChange={(event) =>
            setFiltroRol(
              event.target.value
            )
          }
        >
          <option value="">
            Todos los roles
          </option>

          <option value="administrador">
            Administrador
          </option>

          <option value="director">
            Director
          </option>

          <option value="jefe_guardia">
            Jefe de guardia
          </option>

          <option value="inspector">
            Inspector
          </option>

          <option value="secretaria_reclamos">
            Secretaría reclamos
          </option>

          <option value="secretaria_predio">
            Secretaría predio
          </option>
        </select>

        <select
          value={filtroEstado}
          onChange={(event) =>
            setFiltroEstado(
              event.target.value
            )
          }
        >
          <option value="ACTIVOS">
            Activos
          </option>

          <option value="INACTIVOS">
            Inactivos
          </option>

          <option value="TODOS">
            Todos
          </option>
        </select>

      </div>


      {/* ERROR */}

      {error && (
        <div className="usuarios-error">
          {error}
        </div>
      )}


      {/* LISTADO */}

      {cargando ? (
        <div className="usuarios-vacio">
          Cargando usuarios...
        </div>
      ) : filtrados.length === 0 ? (
        <div className="usuarios-vacio">
          No hay usuarios que
          coincidan con los filtros.
        </div>
      ) : (
        <div className="usuarios-lista">

          {filtrados.map(
            (usuario) => (
              <UsuarioCard
                key={usuario.id}

                usuario={usuario}

                onEditar={() =>
                  abrirEditar(
                    usuario
                  )
                }

                onEliminar={() =>
                  eliminarUsuario(
                    usuario
                  )
                }

                eliminando={
                  eliminandoId ===
                  usuario.id
                }
              />
            )
          )}

        </div>
      )}


      {/* MODAL */}

      {mostrarForm && (
        <div
          className="usuarios-modal-fondo"
          onMouseDown={
            cerrarForm
          }
        >
          <div
            className="usuarios-modal"
            onMouseDown={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            <UsuarioForm
              usuario={
                usuarioEditar
              }

              onGuardado={
                guardado
              }

              onCancelar={
                cerrarForm
              }
            />
          </div>
        </div>
      )}

    </div>
  );
};


export default UsuariosPage;