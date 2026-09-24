import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import api from "../api/api";

import "./MisTrabajosPage.css";

/*
|--------------------------------------------------------------------------
| NOMBRES
|--------------------------------------------------------------------------
*/

const nombresEtapa = {
  PRIMERA_VISITA:
    "Primera visita",

  SEGUNDA_VISITA:
    "Segunda visita",

  POST_JUZGADO:
    "Actuación posterior al Juzgado",

  OTRA_ACTUACION:
    "Otra actuación",
};

const nombresEstadoTarea = {
  PENDIENTE:
    "Pendiente",

  EN_CURSO:
    "En curso",

  FINALIZADA:
    "Finalizada",

  CANCELADA:
    "Cancelada",
};

const nombresEtapaReclamo = {
  PENDIENTE_ASIGNACION_GUARDIA:
    "Pendiente de guardia",

  PENDIENTE_PRIMERA_VISITA:
    "Pendiente primera visita",

  PRIMERA_VISITA:
    "Primera visita asignada",

  ESPERANDO_PLAZO:
    "Esperando vencimiento",

  PENDIENTE_SEGUNDA_VISITA:
    "Pendiente segunda visita",

  SEGUNDA_VISITA:
    "Segunda visita asignada",

  PENDIENTE_DECISION_JEFE:
    "Pendiente decisión del jefe",

  PENDIENTE_ENVIO_JUZGADO:
    "Pendiente de envío al Juzgado",

  EN_JUZGADO:
    "En Juzgado",



  FINALIZADO:
    "Finalizado",

  ANULADO:
    "Anulado",

    PENDIENTE_ASIGNACION_POST_JUZGADO:
  "Respuesta del Juzgado registrada",

POST_JUZGADO_ASIGNADO_GUARDIA:
  "Asignado para actuación posterior al Juzgado",

POST_JUZGADO_EN_ACTUACION:
  "Actuación posterior al Juzgado en curso",
};

const formatearFecha = (
  fecha
) => {
  if (!fecha) {
    return "—";
  }

  const valor =
    new Date(fecha);

  if (
    Number.isNaN(
      valor.getTime()
    )
  ) {
    return "—";
  }

  return valor.toLocaleString(
    "es-AR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
};

/*
|--------------------------------------------------------------------------
| PAGE
|--------------------------------------------------------------------------
*/

const MisTrabajosPage = () => {
  const navigate =
    useNavigate();

  const [
    trabajos,
    setTrabajos,
  ] = useState([]);

  const [
    cargando,
    setCargando,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    filtro,
    setFiltro,
  ] = useState(
    "PENDIENTES"
  );

  /*
  |--------------------------------------------------------------------------
  | CARGAR
  |--------------------------------------------------------------------------
  */

  const cargar =
    useCallback(
      async () => {
        try {
          setCargando(true);
          setError("");

          const respuesta =
            await api.get(
              "/reclamos/mis-trabajos"
            );

          const lista =
            respuesta.data
              ?.trabajos ||
            [];

          setTrabajos(
            Array.isArray(
              lista
            )
              ? lista
              : []
          );
        } catch (err) {
          console.error(
            "Error cargando trabajos:",
            err
          );

          setError(
            err.response
              ?.data
              ?.mensaje ||
              "No se pudieron cargar los trabajos"
          );

          setTrabajos([]);
        } finally {
          setCargando(false);
        }
      },
      []
    );

  useEffect(() => {
    cargar();
  }, [
    cargar,
  ]);

  /*
  |--------------------------------------------------------------------------
  | SEPARAR TAREAS
  |--------------------------------------------------------------------------
  */

  const pendientes =
    useMemo(
      () =>
        trabajos.filter(
          (trabajo) =>
            [
              "PENDIENTE",
              "EN_CURSO",
            ].includes(
              trabajo.estadoTarea
            )
        ),
      [trabajos]
    );

  const finalizados =
    useMemo(
      () =>
        trabajos.filter(
          (trabajo) =>
            [
              "FINALIZADA",
              "CANCELADA",
            ].includes(
              trabajo.estadoTarea
            )
        ),
      [trabajos]
    );

  const visibles =
    useMemo(() => {
      if (
        filtro ===
        "PENDIENTES"
      ) {
        return pendientes;
      }

      if (
        filtro ===
        "FINALIZADOS"
      ) {
        return finalizados;
      }

      return trabajos;
    }, [
      filtro,
      pendientes,
      finalizados,
      trabajos,
    ]);

  /*
  |--------------------------------------------------------------------------
  | ABRIR
  |--------------------------------------------------------------------------
  */

const abrirTrabajo = (trabajo) => {
  const reclamoId =
    trabajo.reclamo?.id ||
    trabajo.reclamoId;

    if (
  trabajo.reclamo
    ?.etapaActual ===
    "REMOCION_EN_CURSO"
) {
  const infraccionId =
    trabajo.infraccion?.id;

  if (!infraccionId) {
    alert(
      "No se encontró el Acta de Infracción asociada a esta remoción."
    );

    console.log(
      "REMOCION EN CURSO SIN INFRACCION:",
      trabajo
    );

    return;
  }

  navigate(
    `/remocion/${reclamoId}?infraccionId=${infraccionId}`
  );

  return;
}


  if (
    trabajo.etapa ===
    "SEGUNDA_VISITA"
  ) {
    navigate(
      `/segunda-visita/${reclamoId}`
    );

    return;
  }


  if (
    trabajo.etapa ===
    "PRIMERA_VISITA"
  ) {
    navigate(
      `/inspeccion/${reclamoId}`
    );

    return;
  }


  if (
    trabajo.etapa ===
    "POST_JUZGADO"
  ) {
    const infraccionId =
      trabajo.infraccion?.id;


    if (!infraccionId) {
      alert(
        "No se encontró la infracción autorizada para esta remoción."
      );

      console.log(
        "POST_JUZGADO SIN INFRACCION:",
        trabajo
      );

      return;
    }


    if (
      trabajo.infraccion
        ?.estadoOrdenRemocion !==
      "AUTORIZADA"
    ) {
      alert(
        "La orden judicial todavía no figura como autorizada."
      );

      console.log(
        "POST_JUZGADO SIN AUTORIZACION:",
        trabajo
      );

      return;
    }


    navigate(
      `/remocion/${reclamoId}?infraccionId=${infraccionId}`
    );

    return;
  }


  navigate(
    `/reclamos/${reclamoId}`
  );
};

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <div className="mis-trabajos-page">

      <header className="mis-trabajos-header">
        <div>
          <span className="mis-trabajos-eyebrow">
            INSPECTOR
          </span>

          <h1>
            Mis trabajos
          </h1>

          <p>
            Cada visita es un trabajo
            independiente. Cuando
            terminás una visita pasa a
            finalizados aunque el reclamo
            general continúe.
          </p>
        </div>

        <button
          type="button"
          className="boton-actualizar"
          onClick={cargar}
          disabled={cargando}
        >
          {cargando
            ? "Actualizando..."
            : "Actualizar"}
        </button>
      </header>

      {/* RESUMEN */}

      <section className="trabajos-resumen">
        <div>
          <strong>
            {
              pendientes.length
            }
          </strong>

          <span>
            Pendientes
          </span>
        </div>

        <div>
          <strong>
            {
              finalizados.length
            }
          </strong>

          <span>
            Finalizados
          </span>
        </div>

        <div>
          <strong>
            {
              trabajos.length
            }
          </strong>

          <span>
            Total histórico
          </span>
        </div>
      </section>

      {/* FILTROS */}

      <nav className="mis-trabajos-filtros">
        <button
          type="button"
          className={
            filtro ===
            "PENDIENTES"
              ? "activo"
              : ""
          }
          onClick={() =>
            setFiltro(
              "PENDIENTES"
            )
          }
        >
          Pendientes

          <span>
            {
              pendientes.length
            }
          </span>
        </button>

        <button
          type="button"
          className={
            filtro ===
            "FINALIZADOS"
              ? "activo"
              : ""
          }
          onClick={() =>
            setFiltro(
              "FINALIZADOS"
            )
          }
        >
          Finalizados

          <span>
            {
              finalizados.length
            }
          </span>
        </button>

        <button
          type="button"
          className={
            filtro ===
            "TODOS"
              ? "activo"
              : ""
          }
          onClick={() =>
            setFiltro(
              "TODOS"
            )
          }
        >
          Todos

          <span>
            {
              trabajos.length
            }
          </span>
        </button>
      </nav>

      {/* CONTENIDO */}

      {cargando ? (
        <div className="trabajos-mensaje">
          Cargando trabajos...
        </div>
      ) : error ? (
        <div className="trabajos-mensaje error">
          {error}
        </div>
      ) : visibles.length ===
        0 ? (
        <div className="trabajos-mensaje">
          {filtro ===
          "PENDIENTES"
            ? "No tenés trabajos pendientes."
            : filtro ===
                "FINALIZADOS"
              ? "Todavía no tenés trabajos finalizados."
              : "Todavía no tenés trabajos registrados."}
        </div>
      ) : (
        <section className="trabajos-listado">

          <div className="trabajos-cabecera-pc">
            <div>
              Trabajo
            </div>

            <div>
              Reclamo
            </div>

            <div>
              Estado
            </div>

            <div>
              Fecha
            </div>

            <div>
              Acción
            </div>
          </div>

          {visibles.map(
            (trabajo) => {
              const reclamo =
                trabajo.reclamo;

              if (!reclamo) {
                return null;
              }

              const tipo =
                reclamo.tipoReclamo ||
                reclamo.TipoReclamo;

              const finalizado =
                [
                  "FINALIZADA",
                  "CANCELADA",
                ].includes(
                  trabajo.estadoTarea
                );

              return (
                <article
                  key={
                    trabajo.id
                  }
                  className={`trabajo-fila ${
                    finalizado
                      ? "trabajo-finalizado"
                      : "trabajo-pendiente"
                  }`}
                  onClick={() =>
                    abrirTrabajo(
                      trabajo
                    )
                  }
                >

                  {/* TRABAJO */}

                  <div className="trabajo-columna etapa-columna">
                    <span className="label-mobile">
                      Trabajo
                    </span>

                    <span
                      className={`etapa-indicador etapa-${trabajo.etapa}`}
                    >
                      <i />

                      {nombresEtapa[
                        trabajo.etapa
                      ] ||
                        trabajo.etapa ||
                        "Trabajo"}
                    </span>

                    {trabajo.observaciones && (
                      <small>
                        {
                          trabajo.observaciones
                        }
                      </small>
                    )}
                  </div>

                  {/* RECLAMO */}

                  <div className="trabajo-columna reclamo-columna">
                    <span className="label-mobile">
                      Reclamo
                    </span>

                    <strong className="numero-reclamo">
                      #
                      {
                        reclamo.numeroReclamo
                      }
                    </strong>

                    <span className="tipo-reclamo">
                      {tipo?.nombre ||
                        "Sin tipo"}
                    </span>

                    <span className="direccion-reclamo">
                      {
                        reclamo.direccion
                      }

                      {reclamo.barrio
                        ? ` · ${reclamo.barrio}`
                        : ""}
                    </span>
                  </div>

                  {/* ESTADO TAREA */}

                  <div className="trabajo-columna estado-columna">
                    <span className="label-mobile">
                      Estado de mi trabajo
                    </span>

                    <strong
                      className={`estado-tarea estado-tarea-${trabajo.estadoTarea}`}
                    >
                      {nombresEstadoTarea[
                        trabajo.estadoTarea
                      ] ||
                        trabajo.estadoTarea ||
                        "—"}
                    </strong>

                    <small>
                      Reclamo:{" "}
                      {nombresEtapaReclamo[
                        reclamo.etapaActual
                      ] ||
                        reclamo.etapaActual ||
                        "—"}
                    </small>
                  </div>

                  {/* FECHA */}

                  <div className="trabajo-columna fecha-columna">
                    <span className="label-mobile">
                      Fecha
                    </span>

                    {finalizado ? (
                      <>
                        <small>
                          Finalizado
                        </small>

                        <strong>
                          {formatearFecha(
                            trabajo.fechaFinalizacion
                          )}
                        </strong>
                      </>
                    ) : (
                      <>
                        <small>
                          Asignado
                        </small>

                        <strong>
                          {formatearFecha(
                            trabajo.fechaAsignacion
                          )}
                        </strong>
                      </>
                    )}
                  </div>

                  {/* ACCIÓN */}

                  <div className="trabajo-columna accion-columna">
                    <span className="label-mobile">
                      Acción
                    </span>

                    <button
                      type="button"
                      onClick={(
                        event
                      ) => {
                        event.stopPropagation();

                        abrirTrabajo(
                          trabajo
                        );
                      }}
                    >
              {finalizado
  ? "Ver expediente"

  : trabajo.reclamo
      ?.etapaActual ===
      "REMOCION_EN_CURSO"
    ? "🚛 Continuar remoción"

  : trabajo.etapa ===
      "PRIMERA_VISITA"
    ? "Realizar visita"

  : trabajo.etapa ===
      "SEGUNDA_VISITA"
    ? "Realizar 2ª visita"

  : trabajo.etapa ===
      "POST_JUZGADO"
    ? trabajo.infraccion
        ?.estadoOrdenRemocion ===
        "AUTORIZADA"
      ? "🚛 Iniciar remoción"
      : "Ver actuación"

  : "Ver trabajo"}

                      <span>
                        →
                      </span>
                    </button>
                  </div>

                </article>
              );
            }
          )}

        </section>
      )}
    </div>
  );
};

export default MisTrabajosPage;