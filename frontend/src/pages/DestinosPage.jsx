import {
  useCallback,
  useEffect,
  useState,
} from "react";

import api from "../api/api";

import "./DestinosPage.css";

const DestinosPage = () => {
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

  const [
    mostrarFormulario,
    setMostrarFormulario,
  ] = useState(false);

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
    error,
    setError,
  ] = useState("");

  const [
    mensaje,
    setMensaje,
  ] = useState("");

  const cargarPredios =
    useCallback(async () => {
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
    }, []);

  useEffect(() => {
    cargarPredios();
  }, [cargarPredios]);

  const limpiarFormulario =
    () => {
      setNombre("");
      setDireccion("");
      setDescripcion("");
    };

  const abrirFormulario =
    () => {
      limpiarFormulario();
      setError("");
      setMensaje("");
      setMostrarFormulario(
        true
      );
    };

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

        await api.post(
          "/predios",
          {
            nombre:
              nombreLimpio,

            direccion:
              direccion.trim() ||
              null,

            descripcion:
              descripcion.trim() ||
              null,
          }
        );

        setMensaje(
          "Destino creado correctamente."
        );

        limpiarFormulario();

        setMostrarFormulario(
          false
        );

        await cargarPredios();
      } catch (err) {
        console.error(
          "Error creando destino:",
          err
        );

        setError(
          err.response?.data
            ?.mensaje ||
            "No se pudo crear el destino."
        );
      } finally {
        setGuardando(false);
      }
    };

  return (
    <div className="destinos-page">
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

        <button
          type="button"
          className="destinos-boton-nuevo"
          onClick={
            abrirFormulario
          }
        >
          + Nuevo destino
        </button>
      </div>

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

      {mostrarFormulario && (
        <form
          className="destinos-formulario"
          onSubmit={
            guardarDestino
          }
        >
          <div className="destinos-formulario-titulo">
            <div>
              <h2>
                Nuevo destino
              </h2>

              <p>
                Este destino
                aparecerá al
                registrar un
                traslado.
              </p>
            </div>
          </div>

          {error && (
            <div className="destinos-mensaje error">
              {error}
            </div>
          )}

          <div className="destinos-campos">
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
          </div>

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
                : "Guardar destino"}
            </button>
          </div>
        </form>
      )}

      <section className="destinos-listado">
        <div className="destinos-listado-cabecera">
          <h2>
            Destinos registrados
          </h2>

          <span>
            {predios.length}{" "}
            {predios.length === 1
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
            <div className="destinos-tabla destinos-tabla-titulos">
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
            </div>

            {predios.map(
              (predio) => (
                <div
                  key={
                    predio.id
                  }
                  className="destinos-tabla destinos-fila"
                >
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

                  <div>
                    <span className="destinos-mobile-label">
                      Dirección
                    </span>

                    <span>
                      {predio.direccion ||
                        "—"}
                    </span>
                  </div>

                  <div>
                    <span className="destinos-mobile-label">
                      Descripción
                    </span>

                    <span>
                      {predio.descripcion ||
                        "—"}
                    </span>
                  </div>

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