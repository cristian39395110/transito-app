import {
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../api/api";

import {
  useAuth,
} from "../context/AuthContext";

import "./AsignacionReclamo.css";


const AsignacionReclamo = ({
  reclamo,
  onActualizado,
}) => {
  const {
    rol,
    usuario,
  } = useAuth();


  /* =========================================================
     ESTADO
  ========================================================= */

  const [
    usuarios,
    setUsuarios,
  ] = useState([]);

  const [
    seleccionado,
    setSeleccionado,
  ] = useState("");

  const [
    cargandoUsuarios,
    setCargandoUsuarios,
  ] = useState(false);

  const [
    guardando,
    setGuardando,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    accionAbierta,
    setAccionAbierta,
  ] = useState(null);

  const [
    motivo,
    setMotivo,
  ] = useState("");


  /* =========================================================
     DATOS DEL USUARIO
  ========================================================= */

  const esAdmin =
    rol === "administrador";

  const esDirector =
    rol === "director";

  const esJefe =
    rol === "jefe_guardia";

  const esJefeActual =
    Number(
      reclamo.jefeGuardiaId
    ) ===
    Number(
      usuario?.id
    );


  /* =========================================================
     ETAPA ACTUAL
  ========================================================= */

const esPrimeraVisitaPendiente =
  reclamo.etapaActual ===
    "PENDIENTE_PRIMERA_VISITA";

const esPrimeraVisitaAsignada =
  reclamo.etapaActual ===
    "PRIMERA_VISITA";

  const esControlDisponible =
    reclamo.etapaActual ===
    "PENDIENTE_SEGUNDA_VISITA";

  const esControlAsignado =
    reclamo.etapaActual ===
    "SEGUNDA_VISITA";

  const esPostJuzgadoAsignable =
    reclamo.etapaActual ===
    "POST_JUZGADO_ASIGNADO_GUARDIA";

  const esPostJuzgadoEnActuacion =
    reclamo.etapaActual ===
    "POST_JUZGADO_EN_ACTUACION";

  const estaEsperandoPlazo =
    reclamo.etapaActual ===
    "ESPERANDO_PLAZO";


  /* =========================================================
     ¿HAY UN TRABAJO ACTUAL DE INSPECTOR?
  ========================================================= */

const etapaConTrabajoInspector =
  esPrimeraVisitaPendiente ||
  esPrimeraVisitaAsignada ||
  esControlDisponible ||
  esControlAsignado ||
  esPostJuzgadoAsignable ||
  esPostJuzgadoEnActuacion;


  /* =========================================================
     NOMBRES
  ========================================================= */

  const nombreJefe =
    reclamo.jefeGuardia
      ?.nombre ||
    reclamo.JefeGuardia
      ?.nombre ||
    (
      reclamo.jefeGuardiaId
        ? `Jefe ID ${reclamo.jefeGuardiaId}`
        : "Todavía no tiene jefe"
    );

  const nombreInspector =
    reclamo.inspector
      ?.nombre ||
    reclamo.Inspector
      ?.nombre ||
    (
      reclamo.inspectorId
        ? `Inspector ID ${reclamo.inspectorId}`
        : "Todavía no tiene inspector"
    );


  /* =========================================================
     ACCIONES DISPONIBLES
  ========================================================= */

  const puedeAsignarJefe =
    (
      esAdmin ||
      esDirector
    ) &&
    !reclamo.jefeGuardiaId;

const puedeCambiarJefe =
  (
    esAdmin ||
    esDirector
  ) &&
  Boolean(
    reclamo.jefeGuardiaId
  ) &&
  etapaConTrabajoInspector;

  /*
   * Para primera visita y post-juzgado,
   * solamente el jefe que tiene el reclamo.
   *
   * Para un control vencido,
   * cualquier jefe puede tomarlo.
   */

  const puedeAsignarInspector =
    !reclamo.inspectorId &&
    (
      esAdmin ||
      (
        esJefe &&
        (
          esJefeActual ||
          esControlDisponible
        )
      )
    ) &&
    (
      esPrimeraVisitaPendiente ||
      esControlDisponible ||
      esPostJuzgadoAsignable
    );

  const puedeCambiarInspector =
    Boolean(
      reclamo.inspectorId
    ) &&
    etapaConTrabajoInspector &&
    (
      esAdmin ||
      (
        esJefe &&
        esJefeActual
      )
    );

  const puedeDevolverGuardia =
    Boolean(
      reclamo.jefeGuardiaId
    ) &&
    (
      esAdmin ||
      (
        esJefe &&
        esJefeActual
      )
    ) &&
   (
  esPrimeraVisitaPendiente ||
  esPrimeraVisitaAsignada ||
  esControlDisponible ||
  esControlAsignado ||
  esPostJuzgadoAsignable ||
  esPostJuzgadoEnActuacion
);


  /* =========================================================
     TIPO DE PERSONA A CARGAR
  ========================================================= */

  const tipoUsuarioNecesario =
    useMemo(() => {
      if (
        accionAbierta ===
          "ASIGNAR_JEFE" ||
        accionAbierta ===
          "CAMBIAR_JEFE"
      ) {
        return "jefe_guardia";
      }

      if (
        accionAbierta ===
          "ASIGNAR_INSPECTOR" ||
        accionAbierta ===
          "CAMBIAR_INSPECTOR"
      ) {
        return "inspector";
      }

      return null;
    }, [
      accionAbierta,
    ]);


  /* =========================================================
     CARGAR PERSONAS
  ========================================================= */

  useEffect(() => {
    const cargarUsuarios =
      async () => {
        if (
          !tipoUsuarioNecesario
        ) {
          setUsuarios([]);
          return;
        }

        try {
          setCargandoUsuarios(
            true
          );

          setError("");

          const respuesta =
            await api.get(
              "/usuarios"
            );

          const lista =
            respuesta.data
              ?.usuarios ||
            respuesta.data ||
            [];

          const filtrados =
            Array.isArray(lista)
              ? lista.filter(
                  (item) => {
                    const nombreRol =
                      item.rol
                        ?.nombre ||
                      item.Rol
                        ?.nombre ||
                      (
                        typeof item.rol ===
                        "string"
                          ? item.rol
                          : ""
                      );

                    const esRolCorrecto =
                      nombreRol ===
                      tipoUsuarioNecesario;

                    const estaActivo =
                      item.activo !==
                      false;

                    /*
                     * Si estamos cambiando,
                     * no mostramos nuevamente
                     * la persona actual.
                     */

                    const noEsActual =
                      tipoUsuarioNecesario ===
                      "jefe_guardia"
                        ? Number(
                            item.id
                          ) !==
                          Number(
                            reclamo.jefeGuardiaId
                          )
                        : Number(
                            item.id
                          ) !==
                          Number(
                            reclamo.inspectorId
                          );

                    return (
                      esRolCorrecto &&
                      estaActivo &&
                      noEsActual
                    );
                  }
                )
              : [];

          setUsuarios(
            filtrados
          );
        } catch (err) {
          console.error(
            "Error cargando usuarios:",
            err
          );

          setError(
            err.response?.data
              ?.mensaje ||
            "No se pudieron cargar las personas disponibles."
          );

          setUsuarios([]);
        } finally {
          setCargandoUsuarios(
            false
          );
        }
      };

    cargarUsuarios();
  }, [
    tipoUsuarioNecesario,
    reclamo.jefeGuardiaId,
    reclamo.inspectorId,
  ]);


  /* =========================================================
     ABRIR / CERRAR ACCIÓN
  ========================================================= */

  const abrirAccion = (
    accion
  ) => {
    setAccionAbierta(
      accion
    );

    setSeleccionado("");

    setMotivo("");

    setError("");
  };


  const cancelarAccion =
    () => {
      setAccionAbierta(
        null
      );

      setSeleccionado("");

      setMotivo("");

      setError("");
    };


  /* =========================================================
     ACTUALIZAR PANTALLA
  ========================================================= */

  const refrescar =
    async () => {
      cancelarAccion();

      if (onActualizado) {
        await onActualizado();
      }
    };


  /* =========================================================
     ASIGNAR JEFE
  ========================================================= */

  const asignarJefe =
    async () => {
      if (!seleccionado) {
        setError(
          "Elegí un jefe de guardia."
        );

        return;
      }

      try {
        setGuardando(true);
        setError("");

        await api.patch(
          `/asignaciones/reclamos/${reclamo.id}/jefe`,
          {
            jefeGuardiaId:
              Number(
                seleccionado
              ),
          }
        );

        await refrescar();
      } catch (err) {
        console.error(
          "Error asignando jefe:",
          err
        );

        setError(
          err.response?.data
            ?.mensaje ||
          "No se pudo asignar el jefe de guardia."
        );
      } finally {
        setGuardando(false);
      }
    };


  /* =========================================================
     CAMBIAR JEFE
  ========================================================= */

  const cambiarJefe =
    async () => {
      if (!seleccionado) {
        setError(
          "Elegí el nuevo jefe de guardia."
        );

        return;
      }

      try {
        setGuardando(true);
        setError("");

        await api.patch(
          `/asignaciones/reclamos/${reclamo.id}/cambiar-jefe`,
          {
            jefeGuardiaId:
              Number(
                seleccionado
              ),

            motivo:
              motivo.trim() ||
              null,
          }
        );

        await refrescar();
      } catch (err) {
        console.error(
          "Error cambiando jefe:",
          err
        );

        setError(
          err.response?.data
            ?.mensaje ||
          "No se pudo cambiar el jefe de guardia."
        );
      } finally {
        setGuardando(false);
      }
    };


  /* =========================================================
     ASIGNAR INSPECTOR
  ========================================================= */

  const asignarInspector =
    async () => {
      if (!seleccionado) {
        setError(
          "Elegí el inspector que va a realizar el trabajo."
        );

        return;
      }

      try {
        setGuardando(true);
        setError("");

        await api.patch(
          `/asignaciones/reclamos/${reclamo.id}/inspector`,
          {
            inspectorId:
              Number(
                seleccionado
              ),
          }
        );

        await refrescar();
      } catch (err) {
        console.error(
          "Error asignando inspector:",
          err
        );

        setError(
          err.response?.data
            ?.mensaje ||
          "No se pudo asignar el inspector."
        );
      } finally {
        setGuardando(false);
      }
    };


  /* =========================================================
     CAMBIAR INSPECTOR
  ========================================================= */

  const cambiarInspector =
    async () => {
      if (!seleccionado) {
        setError(
          "Elegí el nuevo inspector."
        );

        return;
      }

      try {
        setGuardando(true);
        setError("");

        await api.patch(
          `/asignaciones/reclamos/${reclamo.id}/cambiar-inspector`,
          {
            inspectorId:
              Number(
                seleccionado
              ),

            motivo:
              motivo.trim() ||
              null,
          }
        );

        await refrescar();
      } catch (err) {
        console.error(
          "Error cambiando inspector:",
          err
        );

        setError(
          err.response?.data
            ?.mensaje ||
          "No se pudo cambiar el inspector."
        );
      } finally {
        setGuardando(false);
      }
    };


  /* =========================================================
     DEVOLVER A OTRA GUARDIA
  ========================================================= */

  const devolverGuardia =
    async () => {
      try {
        setGuardando(true);
        setError("");

        await api.patch(
          `/asignaciones/reclamos/${reclamo.id}/devolver-guardia`,
          {
            motivo:
              motivo.trim() ||
              null,
          }
        );

        await refrescar();
      } catch (err) {
        console.error(
          "Error devolviendo trabajo:",
          err
        );

        setError(
          err.response?.data
            ?.mensaje ||
          "No se pudo dejar el trabajo disponible."
        );
      } finally {
        setGuardando(false);
      }
    };


  /* =========================================================
     SELECTOR REUTILIZABLE
  ========================================================= */

  const renderSelector =
    (
      titulo,
      textoBoton,
      onConfirmar
    ) => (
      <div className="asignacion-form">
        <label>
          {titulo}

          <select
            value={
              seleccionado
            }
            onChange={(
              event
            ) =>
              setSeleccionado(
                event.target.value
              )
            }
            disabled={
              guardando ||
              cargandoUsuarios
            }
          >
            <option value="">
              {cargandoUsuarios
                ? "Cargando..."
                : "Elegir persona..."}
            </option>

            {usuarios.map(
              (item) => (
                <option
                  key={
                    item.id
                  }
                  value={
                    item.id
                  }
                >
                  {item.nombre ||
                    item.usuario}
                </option>
              )
            )}
          </select>
        </label>

        {!cargandoUsuarios &&
          usuarios.length === 0 && (
            <p className="asignacion-sin-accion">
              No hay personas activas
              disponibles.
            </p>
          )}

        {(accionAbierta ===
          "CAMBIAR_JEFE" ||
          accionAbierta ===
          "CAMBIAR_INSPECTOR") && (
          <label>
            Motivo del cambio
            <textarea
              value={
                motivo
              }
              onChange={(
                event
              ) =>
                setMotivo(
                  event.target.value
                )
              }
              placeholder="Ej.: no vino, está en otro operativo..."
              rows={3}
            />
          </label>
        )}

        <button
          type="button"
          onClick={
            onConfirmar
          }
          disabled={
            guardando ||
            cargandoUsuarios ||
            !seleccionado
          }
        >
          {guardando
            ? "Guardando..."
            : textoBoton}
        </button>

        <button
          type="button"
          className="asignacion-boton-secundario"
          onClick={
            cancelarAccion
          }
          disabled={
            guardando
          }
        >
          Volver
        </button>
      </div>
    );


  /* =========================================================
     RENDER
  ========================================================= */
console.log("DEBUG ASIGNACION", {
  rol,
  usuarioId: usuario?.id,

  etapaActual:
    reclamo.etapaActual,

  jefeGuardiaId:
    reclamo.jefeGuardiaId,

  inspectorId:
    reclamo.inspectorId,

  esJefe,
  esJefeActual,

  esPrimeraVisitaPendiente,
  esPrimeraVisitaAsignada,

  etapaConTrabajoInspector,

  puedeCambiarInspector,
  puedeDevolverGuardia,
});
  return (
    <section className="asignacion-card">
      <h3>
        Responsables del trabajo
      </h3>

      <div className="asignacion-actual">
        <span>
          Jefe de guardia
        </span>

        <strong>
          {nombreJefe}
        </strong>
      </div>

      <div className="asignacion-actual">
        <span>
          Inspector que va a ir
        </span>

        <strong>
          {nombreInspector}
        </strong>
      </div>


      {/* =====================================================
          ACCIÓN ABIERTA
      ===================================================== */}

      {accionAbierta ===
        "ASIGNAR_JEFE" &&
        renderSelector(
          "Elegí el jefe de guardia",
          "Asignar jefe",
          asignarJefe
        )}


      {accionAbierta ===
        "CAMBIAR_JEFE" &&
        renderSelector(
          "Elegí el nuevo jefe de guardia",
          "Confirmar cambio",
          cambiarJefe
        )}


      {accionAbierta ===
        "ASIGNAR_INSPECTOR" &&
        renderSelector(
          "Elegí quién va a realizar el trabajo",
          "Asignar inspector",
          asignarInspector
        )}


      {accionAbierta ===
        "CAMBIAR_INSPECTOR" &&
        renderSelector(
          "Elegí el nuevo inspector",
          "Confirmar cambio",
          cambiarInspector
        )}


      {accionAbierta ===
        "DEVOLVER_GUARDIA" && (
          <div className="asignacion-form">
            <div className="asignacion-aviso">
              <strong>
                ¿Dejar disponible para otra guardia?
              </strong>

              <p>
                Este trabajo dejará de estar
                a cargo de tu guardia y podrá
                tomarlo otro jefe.
              </p>
            </div>

            <label>
              ¿Por qué lo dejás disponible?
              <textarea
                value={
                  motivo
                }
                onChange={(
                  event
                ) =>
                  setMotivo(
                    event.target.value
                  )
                }
                placeholder="Ej.: guardia sin personal disponible..."
                rows={3}
              />
            </label>

            <button
              type="button"
              onClick={
                devolverGuardia
              }
              disabled={
                guardando
              }
            >
              {guardando
                ? "Guardando..."
                : "Sí, dejar disponible"}
            </button>

            <button
              type="button"
              className="asignacion-boton-secundario"
              onClick={
                cancelarAccion
              }
              disabled={
                guardando
              }
            >
              No, volver
            </button>
          </div>
        )}


      {/* =====================================================
          ACCIONES NORMALES
      ===================================================== */}

      {!accionAbierta && (
        <div className="asignacion-acciones">

          {puedeAsignarJefe && (
            <button
              type="button"
              onClick={() =>
                abrirAccion(
                  "ASIGNAR_JEFE"
                )
              }
            >
              Elegir jefe de guardia
            </button>
          )}


          {puedeCambiarJefe && (
            <button
              type="button"
              onClick={() =>
                abrirAccion(
                  "CAMBIAR_JEFE"
                )
              }
            >
              Cambiar jefe de guardia
            </button>
          )}


          {puedeAsignarInspector && (
            <button
              type="button"
              onClick={() =>
                abrirAccion(
                  "ASIGNAR_INSPECTOR"
                )
              }
            >
              Elegir inspector
            </button>
          )}


          {puedeCambiarInspector && (
            <button
              type="button"
              onClick={() =>
                abrirAccion(
                  "CAMBIAR_INSPECTOR"
                )
              }
            >
              Cambiar inspector
            </button>
          )}


          {puedeDevolverGuardia && (
            <button
              type="button"
              className="asignacion-boton-secundario"
              onClick={() =>
                abrirAccion(
                  "DEVOLVER_GUARDIA"
                )
              }
            >
              Dejar para otra guardia
            </button>
          )}


          {estaEsperandoPlazo && (
            <p className="asignacion-sin-accion">
              ⏳ Todavía está dentro del plazo.
              Cuando venza, aparecerá el botón
              para realizar un nuevo control.
            </p>
          )}


          {!puedeAsignarJefe &&
            !puedeCambiarJefe &&
            !puedeAsignarInspector &&
            !puedeCambiarInspector &&
            !puedeDevolverGuardia &&
            !estaEsperandoPlazo && (
              <p className="asignacion-sin-accion">
                No hay ninguna acción pendiente
                para vos en este momento.
              </p>
            )}
        </div>
      )}


      {error && (
        <div className="asignacion-error">
          {error}
        </div>
      )}
    </section>
  );
};

export default AsignacionReclamo;