import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../api/api";

import "./DestinosPage.css";


const DestinosPage = () => {
  /*
  |--------------------------------------------------------------------------
  | DATOS
  |--------------------------------------------------------------------------
  */

  const [
    predios,
    setPredios,
  ] = useState([]);

  const [
    cargando,
    setCargando,
  ] = useState(true);

  const [
    guardando,
    setGuardando,
  ] = useState(false);


  /*
  |--------------------------------------------------------------------------
  | FORMULARIO
  |--------------------------------------------------------------------------
  */

  const [
    mostrarFormulario,
    setMostrarFormulario,
  ] = useState(false);

  const [
    predioEditando,
    setPredioEditando,
  ] = useState(null);

  const [
    nombre,
    setNombre,
  ] = useState("");

  const [
    direccion,
    setDireccion,
  ] = useState("");

  const [
    descripcion,
    setDescripcion,
  ] = useState("");

  const [
    activo,
    setActivo,
  ] = useState(true);


  /*
  |--------------------------------------------------------------------------
  | MENSAJES
  |--------------------------------------------------------------------------
  */

  const [
    error,
    setError,
  ] = useState("");

  const [
    mensaje,
    setMensaje,
  ] = useState("");


  /*
  |--------------------------------------------------------------------------
  | ROL
  |--------------------------------------------------------------------------
  |
  | Esto solamente controla lo que se muestra.
  | La seguridad real está en el backend.
  |
  */

  const rolUsuario =
    useMemo(() => {
      try {
        const usuarioGuardado =
          localStorage.getItem(
            "usuario"
          );

        if (
          usuarioGuardado
        ) {
          const usuario =
            JSON.parse(
              usuarioGuardado
            );

          return (
            usuario?.rol ||
            usuario?.role ||
            ""
          );
        }

        return (
          localStorage.getItem(
            "rol"
          ) ||
          ""
        );
      } catch {
        return "";
      }
    }, []);


  const esAdministrador =
    rolUsuario ===
      "administrador" ||
    rolUsuario ===
      "superadmin";


  /*
  |--------------------------------------------------------------------------
  | CARGAR PREDIOS
  |--------------------------------------------------------------------------
  */

  const cargarPredios =
    useCallback(
      async () => {
        try {
          setCargando(true);
          setError("");

          const respuesta =
            await api.get(
              "/predios"
            );

          setPredios(
            respuesta.data
              ?.predios ||
              []
          );
        } catch (err) {
          console.error(
            "Error cargando destinos:",
            err
          );

          setError(
            err.response?.data
              ?.mensaje ||
              "No se pudieron cargar los destinos."
          );
        } finally {
          setCargando(false);
        }
      },
      []
    );


  useEffect(() => {
    cargarPredios();
  }, [cargarPredios]);


  /*
  |--------------------------------------------------------------------------
  | LIMPIAR FORMULARIO
  |--------------------------------------------------------------------------
  */

  const limpiarFormulario =
    () => {
      setNombre("");
      setDireccion("");
      setDescripcion("");
      setActivo(true);
      setPredioEditando(null);
    };


  /*
  |--------------------------------------------------------------------------
  | NUEVO
  |--------------------------------------------------------------------------
  */

  const abrirFormularioNuevo =
    () => {
      limpiarFormulario();

      setError("");
      setMensaje("");

      setMostrarFormulario(
        true
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    };


  /*
  |--------------------------------------------------------------------------
  | EDITAR
  |--------------------------------------------------------------------------
  */

  const abrirFormularioEditar =
    (predio) => {
      setPredioEditando(
        predio
      );

      setNombre(
        predio.nombre || ""
      );

      setDireccion(
        predio.direccion ||
          ""
      );

      setDescripcion(
        predio.descripcion ||
          ""
      );

      setActivo(
        predio.activo !==
          false
      );

      setError("");
      setMensaje("");

      setMostrarFormulario(
        true
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    };


  /*
  |--------------------------------------------------------------------------
  | CERRAR
  |--------------------------------------------------------------------------
  */

  const cerrarFormulario =
    () => {
      if (guardando) {
        return;
      }

      limpiarFormulario();

      setError("");

      setMostrarFormulario(
        false
      );
    };


  /*
  |--------------------------------------------------------------------------
  | GUARDAR
  |--------------------------------------------------------------------------
  */

  const guardarDestino =
    async (event) => {
      event.preventDefault();

      const nombreLimpio =
        nombre.trim();

      if (!nombreLimpio) {
        setError(
          "Ingresá el nombre del destino."
        );

        return;
      }

      try {
        setGuardando(true);

        setError("");
        setMensaje("");

        const datos = {
          nombre:
            nombreLimpio,

          direccion:
            direccion.trim() ||
            null,

          descripcion:
            descripcion.trim() ||
            null,

          activo,
        };


        /*
        |--------------------------------------------------------------------------
        | EDITAR
        |--------------------------------------------------------------------------
        */

        if (
          predioEditando?.id
        ) {
          await api.put(
            `/predios/${predioEditando.id}`,
            datos
          );

          setMensaje(
            "Destino actualizado correctamente."
          );
        }

        /*
        |--------------------------------------------------------------------------
        | CREAR
        |--------------------------------------------------------------------------
        */

        else {
          await api.post(
            "/predios",
            datos
          );

          setMensaje(
            "Destino creado correctamente."
          );
        }


        limpiarFormulario();

        setMostrarFormulario(
          false
        );

        await cargarPredios();
      } catch (err) {
        console.error(
          predioEditando
            ? "Error actualizando destino:"
            : "Error creando destino:",
          err
        );

        setError(
          err.response?.data
            ?.mensaje ||
            (
              predioEditando
                ? "No se pudo actualizar el destino."
                : "No se pudo crear el destino."
            )
        );
      } finally {
        setGuardando(false);
      }
    };


  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <div className="destinos-page">

      {/* =====================================================
          CABECERA
          ===================================================== */}

      <div className="destinos-header">
        <div>
          <h1>
            Destinos / Predios
          </h1>

          <p>
            Lugares disponibles
            para el traslado y
            seguimiento de
            vehículos.
          </p>
        </div>

        {esAdministrador && (
          <button
            type="button"
            className="destinos-boton-nuevo"
            onClick={
              abrirFormularioNuevo
            }
          >
            + Nuevo destino
          </button>
        )}
      </div>


      {/* =====================================================
          MENSAJE
          ===================================================== */}

      {mensaje && (
        <div className="destinos-mensaje exito">
          {mensaje}
        </div>
      )}


      {error &&
        !mostrarFormulario && (
          <div className="destinos-mensaje error">
            {error}
          </div>
        )}


      {/* =====================================================
          FORMULARIO
          ===================================================== */}

      {mostrarFormulario &&
        esAdministrador && (
          <form
            className="destinos-formulario"
            onSubmit={
              guardarDestino
            }
          >

            <div className="destinos-formulario-titulo">
              <div>
                <h2>
                  {predioEditando
                    ? "Editar destino"
                    : "Nuevo destino"}
                </h2>

                <p>
                  {predioEditando
                    ? "Modificá los datos del destino seleccionado."
                    : "Este destino aparecerá al registrar un traslado."}
                </p>
              </div>

              {predioEditando && (
                <span className="destinos-etiqueta-edicion">
                  Editando
                </span>
              )}
            </div>


            {error && (
              <div className="destinos-mensaje error">
                {error}
              </div>
            )}


            <div className="destinos-campos">

              {/* NOMBRE */}

              <label>
                <span>
                  Nombre *
                </span>

                <input
                  type="text"
                  value={nombre}
                  onChange={(
                    event
                  ) =>
                    setNombre(
                      event.target
                        .value
                    )
                  }
                  placeholder="Ej. Granja La Amalia"
                  disabled={
                    guardando
                  }
                  autoFocus
                />
              </label>


              {/* DIRECCIÓN */}

              <label>
                <span>
                  Dirección
                </span>

                <input
                  type="text"
                  value={
                    direccion
                  }
                  onChange={(
                    event
                  ) =>
                    setDireccion(
                      event.target
                        .value
                    )
                  }
                  placeholder="Dirección del lugar"
                  disabled={
                    guardando
                  }
                />
              </label>


              {/* DESCRIPCIÓN */}

              <label className="destinos-campo-completo">
                <span>
                  Descripción
                </span>

                <textarea
                  value={
                    descripcion
                  }
                  onChange={(
                    event
                  ) =>
                    setDescripcion(
                      event.target
                        .value
                    )
                  }
                  placeholder="Información adicional del destino"
                  rows={3}
                  disabled={
                    guardando
                  }
                />
              </label>


              {/* ESTADO - SOLO AL EDITAR */}

              {predioEditando && (
                <div className="destinos-campo-completo">
                  <div className="destinos-estado-edicion">

                    <div>
                      <strong>
                        Estado del destino
                      </strong>

                      <span>
                        Si lo desactivás,
                        seguirá existiendo
                        en el historial,
                        pero quedará marcado
                        como inactivo.
                      </span>
                    </div>

                    <label className="destinos-switch">
                      <input
                        type="checkbox"
                        checked={
                          activo
                        }
                        onChange={(
                          event
                        ) =>
                          setActivo(
                            event.target
                              .checked
                          )
                        }
                        disabled={
                          guardando
                        }
                      />

                      <span className="destinos-switch-control" />

                      <strong>
                        {activo
                          ? "Activo"
                          : "Inactivo"}
                      </strong>
                    </label>

                  </div>
                </div>
              )}

            </div>


            {/* ACCIONES */}

            <div className="destinos-formulario-acciones">

              <button
                type="button"
                className="destinos-boton-secundario"
                onClick={
                  cerrarFormulario
                }
                disabled={
                  guardando
                }
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="destinos-boton-guardar"
                disabled={
                  guardando
                }
              >
                {guardando
                  ? "Guardando..."
                  : predioEditando
                    ? "Guardar cambios"
                    : "Guardar destino"}
              </button>

            </div>

          </form>
        )}


      {/* =====================================================
          LISTADO
          ===================================================== */}

      <section className="destinos-listado">

        <div className="destinos-listado-cabecera">
          <h2>
            Destinos registrados
          </h2>

          <span>
            {predios.length}{" "}
            {predios.length ===
            1
              ? "destino"
              : "destinos"}
          </span>
        </div>


        {cargando ? (
          <div className="destinos-vacio">
            Cargando destinos...
          </div>
        ) : predios.length ===
          0 ? (
          <div className="destinos-vacio">
            <strong>
              No hay destinos
              registrados.
            </strong>

            <span>
              Creá el primero
              para comenzar.
            </span>
          </div>
        ) : (
          <>

            {/* CABECERA PC */}

            <div
              className={
                `destinos-tabla destinos-tabla-titulos ${
                  esAdministrador
                    ? "con-acciones"
                    : ""
                }`
              }
            >
              <span>
                Destino
              </span>

              <span>
                Dirección
              </span>

              <span>
                Descripción
              </span>

              <span>
                Estado
              </span>

              {esAdministrador && (
                <span>
                  Acciones
                </span>
              )}
            </div>


            {/* FILAS */}

            {predios.map(
              (predio) => (
                <div
                  key={
                    predio.id
                  }
                  className={
                    `destinos-tabla destinos-fila ${
                      esAdministrador
                        ? "con-acciones"
                        : ""
                    }`
                  }
                >

                  {/* DESTINO */}

                  <div>
                    <span className="destinos-mobile-label">
                      Destino
                    </span>

                    <strong>
                      {
                        predio.nombre
                      }
                    </strong>
                  </div>


                  {/* DIRECCIÓN */}

                  <div>
                    <span className="destinos-mobile-label">
                      Dirección
                    </span>

                    <span>
                      {predio.direccion ||
                        "—"}
                    </span>
                  </div>


                  {/* DESCRIPCIÓN */}

                  <div>
                    <span className="destinos-mobile-label">
                      Descripción
                    </span>

                    <span>
                      {predio.descripcion ||
                        "—"}
                    </span>
                  </div>


                  {/* ESTADO */}

                  <div>
                    <span className="destinos-mobile-label">
                      Estado
                    </span>

                    <span
                      className={
                        predio.activo ===
                        false
                          ? "destinos-estado inactivo"
                          : "destinos-estado activo"
                      }
                    >
                      {predio.activo ===
                      false
                        ? "Inactivo"
                        : "Activo"}
                    </span>
                  </div>


                  {/* EDITAR */}

                  {esAdministrador && (
                    <div className="destinos-acciones">

                      <span className="destinos-mobile-label">
                        Acciones
                      </span>

                      <button
                        type="button"
                        className="destinos-boton-editar"
                        onClick={() =>
                          abrirFormularioEditar(
                            predio
                          )
                        }
                      >
                        <span aria-hidden="true">
                          ✏️
                        </span>

                        Editar destino
                      </button>

                    </div>
                  )}

                </div>
              )
            )}

          </>
        )}

      </section>

    </div>
  );
};


export default DestinosPage;