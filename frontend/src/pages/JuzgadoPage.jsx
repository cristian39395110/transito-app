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

import FotosReclamo from "../components/FotosReclamo";

import "./JuzgadoPage.css";

const JuzgadoPage = () => {
  const navigate =
    useNavigate();

  /*
  |--------------------------------------------------------------------------
  | DATOS
  |--------------------------------------------------------------------------
  */

  const [
    datos,
    setDatos,
  ] = useState({
    paraEnviar: [],
    enviadas: [],

    ordenesPendientesSolicitud:
      [],

    ordenesEsperandoRespuesta:
      [],

    ordenesRespondidas:
      [],
  });

  const [
    seccion,
    setSeccion,
  ] = useState("MULTAS");

  const [
    filtroMultas,
    setFiltroMultas,
  ] = useState("PENDIENTES");

  const [
    filtroOrdenes,
    setFiltroOrdenes,
  ] = useState("PENDIENTES");

  const [
    buscando,
    setBuscando,
  ] = useState("");

  const [
    cargando,
    setCargando,
  ] = useState(true);

  const [
    guardando,
    setGuardando,
  ] = useState(false);

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
  | MODAL ENVÍO DE MULTA
  |--------------------------------------------------------------------------
  */

  const [
    multaSeleccionada,
    setMultaSeleccionada,
  ] = useState(null);

  const [
    expedienteMulta,
    setExpedienteMulta,
  ] = useState("");

  const [
    observacionMulta,
    setObservacionMulta,
  ] = useState("");

  /*
  |--------------------------------------------------------------------------
  | MODAL SOLICITAR ORDEN
  |--------------------------------------------------------------------------
  */

  const [
    ordenSolicitudSeleccionada,
    setOrdenSolicitudSeleccionada,
  ] = useState(null);

  const [
    observacionSolicitud,
    setObservacionSolicitud,
  ] = useState("");

  /*
  |--------------------------------------------------------------------------
  | MODAL RESPUESTA ORDEN
  |--------------------------------------------------------------------------
  */

  const [
    ordenRespuestaSeleccionada,
    setOrdenRespuestaSeleccionada,
  ] = useState(null);

  const [
    resultadoOrden,
    setResultadoOrden,
  ] = useState("");

  const [
    observacionRespuesta,
    setObservacionRespuesta,
  ] = useState("");

  const [
    cantidadFotosOrden,
    setCantidadFotosOrden,
  ] = useState(0);

  /*
  |--------------------------------------------------------------------------
  | CARGAR BANDEJA
  |--------------------------------------------------------------------------
  */

  const cargarDatos =
    useCallback(async () => {
      try {
        setCargando(true);
        setError("");

        const response =
          await api.get(
            "/juzgado"
          );

        setDatos({
          paraEnviar:
            response.data
              ?.paraEnviar ||
            [],

          enviadas:
            response.data
              ?.enviadas ||
            [],

          ordenesPendientesSolicitud:
            response.data
              ?.ordenesPendientesSolicitud ||
            [],

          ordenesEsperandoRespuesta:
            response.data
              ?.ordenesEsperandoRespuesta ||
            [],

          ordenesRespondidas:
            response.data
              ?.ordenesRespondidas ||
            [],
        });
      } catch (err) {
        console.error(
          "Error cargando Juzgado:",
          err
        );

        setError(
          err.response?.data
            ?.mensaje ||
            "No se pudo cargar la bandeja del Juzgado."
        );
      } finally {
        setCargando(false);
      }
    }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  /*
  |--------------------------------------------------------------------------
  | HELPERS
  |--------------------------------------------------------------------------
  */

  const formatearFecha = (
    fecha
  ) => {
    if (!fecha) {
      return "—";
    }

    return new Date(
      fecha
    ).toLocaleString(
      "es-AR"
    );
  };

  const obtenerTipo = (
    item
  ) =>
    item?.reclamo
      ?.tipoReclamo
      ?.nombre ||
    "Sin tipo";

  const obtenerNumeroReclamo = (
    item
  ) =>
    item?.reclamo
      ?.numeroReclamo ||
    item?.reclamoId ||
    "—";

  const obtenerDireccion = (
    item
  ) =>
    item?.reclamo
      ?.direccion ||
    "Sin dirección";

  const obtenerBarrio = (
    item
  ) =>
    item?.reclamo
      ?.barrio ||
    "";

  const textoOrden = (
    estado
  ) => {
    const textos = {
      PENDIENTE_SOLICITUD:
        "Hay que solicitar la orden",

      ESPERANDO_RESPUESTA:
        "Esperando respuesta",

      AUTORIZADA:
        "Retiro autorizado",

      NO_AUTORIZADA:
        "Retiro no autorizado",
    };

    return (
      textos[estado] ||
      estado ||
      "—"
    );
  };

  /*
  |--------------------------------------------------------------------------
  | LISTA ACTUAL
  |--------------------------------------------------------------------------
  */

  const listaActual =
    useMemo(() => {
      let lista = [];

      if (
        seccion === "MULTAS"
      ) {
        lista =
          filtroMultas ===
          "PENDIENTES"
            ? datos.paraEnviar
            : datos.enviadas;
      } else {
        if (
          filtroOrdenes ===
          "PENDIENTES"
        ) {
          lista =
            datos
              .ordenesPendientesSolicitud;
        }

        if (
          filtroOrdenes ===
          "ESPERANDO"
        ) {
          lista =
            datos
              .ordenesEsperandoRespuesta;
        }

        if (
          filtroOrdenes ===
          "RESUELTAS"
        ) {
          lista =
            datos
              .ordenesRespondidas;
        }
      }

      const texto =
        buscando
          .trim()
          .toLowerCase();

      if (!texto) {
        return lista;
      }

      return lista.filter(
        (item) => {
          const contenido = [
            item.numeroActa,

            item
              .numeroExpedienteJuzgado,

            item
              .detalleAccionPosterior,

            item
              .observacionOrdenRemocion,

            obtenerNumeroReclamo(
              item
            ),

            obtenerDireccion(
              item
            ),

            obtenerBarrio(
              item
            ),

            obtenerTipo(item),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return contenido.includes(
            texto
          );
        }
      );
    }, [
      datos,
      seccion,
      filtroMultas,
      filtroOrdenes,
      buscando,
    ]);

  /*
  |--------------------------------------------------------------------------
  | MULTA - ABRIR
  |--------------------------------------------------------------------------
  */

  const abrirMulta = (
    item
  ) => {
    setMultaSeleccionada(
      item
    );

    setExpedienteMulta(
      item
        .numeroExpedienteJuzgado ||
        ""
    );

    setObservacionMulta(
      ""
    );

    setError("");
    setMensaje("");
  };

  const cerrarMulta = () => {
    if (guardando) {
      return;
    }

    setMultaSeleccionada(
      null
    );

    setExpedienteMulta(
      ""
    );

    setObservacionMulta(
      ""
    );
  };

  /*
  |--------------------------------------------------------------------------
  | MULTA - ENVIAR
  |--------------------------------------------------------------------------
  */

  const enviarMulta =
    async () => {
      if (
        !multaSeleccionada
      ) {
        return;
      }

      try {
        setGuardando(true);
        setError("");
        setMensaje("");

        await api.patch(
          `/infracciones/${multaSeleccionada.id}/enviar-juzgado`,
          {
            numeroExpedienteJuzgado:
              expedienteMulta
                .trim() ||
              null,

            observacionJuzgado:
              observacionMulta
                .trim() ||
              null,
          }
        );

        cerrarMulta();

        setMensaje(
          "El Acta de Infracción fue registrada como enviada al Juzgado."
        );

        await cargarDatos();
      } catch (err) {
        console.error(
          "Error enviando multa:",
          err
        );

        setError(
          err.response?.data
            ?.mensaje ||
            "No se pudo registrar el envío."
        );
      } finally {
        setGuardando(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | ORDEN - ABRIR SOLICITUD
  |--------------------------------------------------------------------------
  */

  const abrirSolicitudOrden = (
    item
  ) => {
    setOrdenSolicitudSeleccionada(
      item
    );

    setObservacionSolicitud(
      item
        .observacionOrdenRemocion ||
        ""
    );

    setError("");
    setMensaje("");
  };

  const cerrarSolicitudOrden =
    () => {
      if (guardando) {
        return;
      }

      setOrdenSolicitudSeleccionada(
        null
      );

      setObservacionSolicitud(
        ""
      );
    };

  /*
  |--------------------------------------------------------------------------
  | ORDEN - SOLICITAR
  |--------------------------------------------------------------------------
  */

  const solicitarOrden =
    async () => {
      if (
        !ordenSolicitudSeleccionada
      ) {
        return;
      }

      try {
        setGuardando(true);
        setError("");
        setMensaje("");

        await api.patch(
          `/infracciones/${ordenSolicitudSeleccionada.id}/solicitar-orden-remocion`,
          {
            observacionOrdenRemocion:
              observacionSolicitud
                .trim() ||
              null,
          }
        );

        cerrarSolicitudOrden();

        setFiltroOrdenes(
          "ESPERANDO"
        );

        setMensaje(
          "La solicitud de orden de remoción quedó registrada."
        );

        await cargarDatos();
      } catch (err) {
        console.error(
          "Error solicitando orden:",
          err
        );

        setError(
          err.response?.data
            ?.mensaje ||
            "No se pudo registrar la solicitud de la orden."
        );
      } finally {
        setGuardando(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | ORDEN - ABRIR RESPUESTA
  |--------------------------------------------------------------------------
  */

  const abrirRespuestaOrden = (
    item
  ) => {
    setOrdenRespuestaSeleccionada(
      item
    );

    setResultadoOrden("");

    setObservacionRespuesta(
      item
        .observacionOrdenRemocion ||
        ""
    );

    setCantidadFotosOrden(0);

    setError("");
    setMensaje("");
  };

  const cerrarRespuestaOrden =
    () => {
      if (guardando) {
        return;
      }

      setOrdenRespuestaSeleccionada(
        null
      );

      setResultadoOrden("");

      setObservacionRespuesta(
        ""
      );

      setCantidadFotosOrden(0);
    };

  /*
  |--------------------------------------------------------------------------
  | ORDEN - REGISTRAR RESPUESTA
  |--------------------------------------------------------------------------
  */

  const guardarRespuestaOrden =
    async () => {
      if (
        !ordenRespuestaSeleccionada
      ) {
        return;
      }

      if (!resultadoOrden) {
        setError(
          "Indicá si el Juzgado autorizó o no el retiro."
        );

        return;
      }

      if (
        resultadoOrden ===
          "AUTORIZADA" &&
        cantidadFotosOrden < 1
      ) {
        setError(
          "Para registrar la autorización debe subir una foto de la orden judicial."
        );

        return;
      }

      try {
        setGuardando(true);
        setError("");
        setMensaje("");

        await api.patch(
          `/infracciones/${ordenRespuestaSeleccionada.id}/respuesta-orden-remocion`,
          {
            resultado:
              resultadoOrden,

            observacionOrdenRemocion:
              observacionRespuesta
                .trim() ||
              null,
          }
        );

        const autorizada =
          resultadoOrden ===
          "AUTORIZADA";

        cerrarRespuestaOrden();

        setFiltroOrdenes(
          "RESUELTAS"
        );

        setMensaje(
          autorizada
            ? "La orden judicial fue registrada. El expediente volvió al circuito operativo para realizar la remoción."
            : "Se registró que el Juzgado no autorizó la remoción."
        );

        await cargarDatos();
      } catch (err) {
        console.error(
          "Error registrando respuesta de orden:",
          err
        );

        setError(
          err.response?.data
            ?.mensaje ||
            "No se pudo registrar la respuesta del Juzgado."
        );
      } finally {
        setGuardando(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | CONTADORES
  |--------------------------------------------------------------------------
  */

  const totalMultasPendientes =
    datos.paraEnviar.length;

  const totalOrdenesActivas =
    datos
      .ordenesPendientesSolicitud
      .length +
    datos
      .ordenesEsperandoRespuesta
      .length;

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <div className="juzgado-page">
      <div className="juzgado-header">
        <div>
          <span className="juzgado-superior">
            SECRETARÍA
          </span>

          <h1>
            Juzgado
          </h1>

          <p>
            Envío de Actas de
            Infracción y seguimiento
            de órdenes judiciales para
            remoción de vehículos.
          </p>
        </div>

        <button
          type="button"
          className="juzgado-actualizar"
          onClick={
            cargarDatos
          }
        >
          ↻ Actualizar
        </button>
      </div>

      {error && (
        <div className="juzgado-error">
          {error}
        </div>
      )}

      {mensaje && (
        <div className="juzgado-exito">
          {mensaje}
        </div>
      )}

      {/* SECCIONES PRINCIPALES */}

      <div className="juzgado-secciones">
        <button
          type="button"
          className={
            seccion === "MULTAS"
              ? "activa"
              : ""
          }
          onClick={() => {
            setSeccion(
              "MULTAS"
            );

            setBuscando("");
            setError("");
          }}
        >
          <span>
            Actas / Multas
          </span>

          {totalMultasPendientes >
            0 && (
            <strong>
              {
                totalMultasPendientes
              }
            </strong>
          )}
        </button>

        <button
          type="button"
          className={
            seccion === "ORDENES"
              ? "activa"
              : ""
          }
          onClick={() => {
            setSeccion(
              "ORDENES"
            );

            setBuscando("");
            setError("");
          }}
        >
          <span>
            Órdenes de remoción
          </span>

          {totalOrdenesActivas >
            0 && (
            <strong>
              {
                totalOrdenesActivas
              }
            </strong>
          )}
        </button>
      </div>

      {/* SUBFILTROS MULTAS */}

      {seccion === "MULTAS" && (
        <div className="juzgado-pestañas">
          <button
            type="button"
            className={
              filtroMultas ===
              "PENDIENTES"
                ? "activa"
                : ""
            }
            onClick={() =>
              setFiltroMultas(
                "PENDIENTES"
              )
            }
          >
            Para enviar

            <strong>
              {
                datos
                  .paraEnviar
                  .length
              }
            </strong>
          </button>

          <button
            type="button"
            className={
              filtroMultas ===
              "ENVIADAS"
                ? "activa"
                : ""
            }
            onClick={() =>
              setFiltroMultas(
                "ENVIADAS"
              )
            }
          >
            Enviadas

            <strong>
              {
                datos
                  .enviadas
                  .length
              }
            </strong>
          </button>
        </div>
      )}

      {/* SUBFILTROS ÓRDENES */}

      {seccion === "ORDENES" && (
        <div className="juzgado-pestañas">
          <button
            type="button"
            className={
              filtroOrdenes ===
              "PENDIENTES"
                ? "activa"
                : ""
            }
            onClick={() =>
              setFiltroOrdenes(
                "PENDIENTES"
              )
            }
          >
            Para solicitar

            <strong>
              {
                datos
                  .ordenesPendientesSolicitud
                  .length
              }
            </strong>
          </button>

          <button
            type="button"
            className={
              filtroOrdenes ===
              "ESPERANDO"
                ? "activa"
                : ""
            }
            onClick={() =>
              setFiltroOrdenes(
                "ESPERANDO"
              )
            }
          >
            Esperando respuesta

            <strong>
              {
                datos
                  .ordenesEsperandoRespuesta
                  .length
              }
            </strong>
          </button>

          <button
            type="button"
            className={
              filtroOrdenes ===
              "RESUELTAS"
                ? "activa"
                : ""
            }
            onClick={() =>
              setFiltroOrdenes(
                "RESUELTAS"
              )
            }
          >
            Respondidas

            <strong>
              {
                datos
                  .ordenesRespondidas
                  .length
              }
            </strong>
          </button>
        </div>
      )}

      {/* EXPLICACIÓN */}

      {seccion === "MULTAS" &&
        filtroMultas ===
          "PENDIENTES" && (
          <div className="juzgado-aviso aviso-naranja">
            <strong>
              Actas para enviar
            </strong>

            <span>
              Secretaría debe
              registrar el envío del
              Acta de Infracción al
              Juzgado para el trámite
              de la multa.
            </span>
          </div>
        )}

      {seccion === "MULTAS" &&
        filtroMultas ===
          "ENVIADAS" && (
          <div className="juzgado-aviso aviso-azul">
            <strong>
              Actas enviadas
            </strong>

            <span>
              El envío al Juzgado ya
              fue registrado. Esto no
              significa que el
              municipio esté esperando
              autorización para actuar.
            </span>
          </div>
        )}

      {seccion === "ORDENES" &&
        filtroOrdenes ===
          "PENDIENTES" && (
          <div className="juzgado-aviso aviso-naranja">
            <strong>
              Hay que solicitar la
              orden
            </strong>

            <span>
              Estos vehículos no
              pudieron retirarse y
              requieren una orden del
              Juzgado para continuar
              con la remoción.
            </span>
          </div>
        )}

      {seccion === "ORDENES" &&
        filtroOrdenes ===
          "ESPERANDO" && (
          <div className="juzgado-aviso aviso-violeta">
            <strong>
              Esperando respuesta
            </strong>

            <span>
              La solicitud de orden ya
              fue registrada. Cuando
              llegue la respuesta,
              Secretaría debe
              registrarla aquí.
            </span>
          </div>
        )}

      {seccion === "ORDENES" &&
        filtroOrdenes ===
          "RESUELTAS" && (
          <div className="juzgado-aviso aviso-azul">
            <strong>
              Órdenes respondidas
            </strong>

            <span>
              Acá quedan las respuestas
              judiciales ya
              registradas.
            </span>
          </div>
        )}

      {/* BUSCADOR */}

      <div className="juzgado-busqueda">
        <span>
          ⌕
        </span>

        <input
          type="search"
          value={buscando}
          onChange={(event) =>
            setBuscando(
              event.target.value
            )
          }
          placeholder="Buscar reclamo, acta, dirección o expediente..."
        />
      </div>

      {/* LISTADO */}

      {cargando ? (
        <div className="juzgado-mensaje">
          Cargando...
        </div>
      ) : listaActual.length ===
        0 ? (
        <div className="juzgado-mensaje">
          No hay actuaciones en esta
          bandeja.
        </div>
      ) : (
        <div className="juzgado-listado">
          {listaActual.map(
            (item) => (
              <article
                key={item.id}
                className="juzgado-fila"
              >
                <div className="juzgado-fila-principal">
                  <div>
                    <span className="juzgado-etiqueta">
                      Reclamo
                    </span>

                    <strong className="juzgado-reclamo-numero">
                      #
                      {obtenerNumeroReclamo(
                        item
                      )}
                    </strong>
                  </div>

                  <div>
                    <span className="juzgado-etiqueta">
                      Acta de
                      Infracción
                    </span>

                    <strong>
                      {item.numeroActa ||
                        "—"}
                    </strong>
                  </div>

                  <div>
                    <span className="juzgado-etiqueta">
                      Tipo
                    </span>

                    <strong>
                      {obtenerTipo(
                        item
                      )}
                    </strong>
                  </div>

                  <div>
                    <span className="juzgado-etiqueta">
                      Dirección
                    </span>

                    <strong>
                      {obtenerDireccion(
                        item
                      )}
                    </strong>

                    {obtenerBarrio(
                      item
                    ) && (
                      <small>
                        {obtenerBarrio(
                          item
                        )}
                      </small>
                    )}
                  </div>
                </div>

                {/* INFORMACIÓN MULTA */}

                {seccion ===
                  "MULTAS" && (
                  <div className="juzgado-fila-estado">
                    {filtroMultas ===
                    "PENDIENTES" ? (
                      <>
                      <span className="estado-pendiente">
  ● PENDIENTE DE ENVIAR
  AL JUZGADO
</span>

                        <small>
                          Acta generada{" "}
                          {formatearFecha(
                            item.fechaHora ||
                              item.createdAt
                          )}
                        </small>
                      </>
                    ) : (
                      <>
                        <span className="estado-ok">
                          ✓ Enviada al
                          Juzgado
                        </span>

                        <small>
                          {formatearFecha(
                            item.fechaEnvioJuzgado
                          )}
                        </small>

                        {item
                          .numeroExpedienteJuzgado && (
                          <small>
                            Expediente:{" "}
                            {
                              item
                                .numeroExpedienteJuzgado
                            }
                          </small>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* INFORMACIÓN ORDEN */}

                {seccion ===
                  "ORDENES" && (
                  <div className="juzgado-fila-estado">
                    <span
                      className={
                        item.estadoOrdenRemocion ===
                        "AUTORIZADA"
                          ? "estado-ok"
                          : item.estadoOrdenRemocion ===
                            "NO_AUTORIZADA"
                          ? "estado-no"
                          : "estado-pendiente"
                      }
                    >
                      {textoOrden(
                        item.estadoOrdenRemocion
                      )}
                    </span>

                    {item
                      .detalleAccionPosterior && (
                      <div className="juzgado-motivo">
                        <strong>
                          Qué ocurrió
                        </strong>

                        <span>
                          {
                            item
                              .detalleAccionPosterior
                          }
                        </span>
                      </div>
                    )}

                    {item.estadoOrdenRemocion ===
                      "ESPERANDO_RESPUESTA" && (
                      <small>
                        Solicitud
                        registrada:{" "}
                        {formatearFecha(
                          item
                            .fechaSolicitudOrdenRemocion
                        )}
                      </small>
                    )}

                    {[
                      "AUTORIZADA",
                      "NO_AUTORIZADA",
                    ].includes(
                      item.estadoOrdenRemocion
                    ) && (
                      <small>
                        Respuesta
                        registrada:{" "}
                        {formatearFecha(
                          item
                            .fechaRespuestaOrdenRemocion
                        )}
                      </small>
                    )}
                  </div>
                )}

                {/* ACCIONES */}

                <div className="juzgado-fila-acciones">
                  {seccion ===
                    "MULTAS" &&
                    filtroMultas ===
                      "PENDIENTES" && (
                      <button
                        type="button"
                        className="accion-enviar"
                        onClick={() =>
                          abrirMulta(
                            item
                          )
                        }
                      >
                        Enviar al
                        Juzgado
                      </button>
                    )}

                  {seccion ===
                    "ORDENES" &&
                    filtroOrdenes ===
                      "PENDIENTES" && (
                      <button
                        type="button"
                        className="accion-enviar"
                        onClick={() =>
                          abrirSolicitudOrden(
                            item
                          )
                        }
                      >
                        Solicitar orden
                      </button>
                    )}

                  {seccion ===
                    "ORDENES" &&
                    filtroOrdenes ===
                      "ESPERANDO" && (
                      <button
                        type="button"
                        className="accion-respuesta"
                        onClick={() =>
                          abrirRespuestaOrden(
                            item
                          )
                        }
                      >
                        Registrar
                        respuesta
                      </button>
                    )}

                  <button
                    type="button"
                    className="accion-expediente"
                    onClick={() =>
                      navigate(
                        `/reclamos/${item.reclamoId}`
                      )
                    }
                  >
                    Ver expediente
                  </button>
                </div>
              </article>
            )
          )}
        </div>
      )}

      {/* MODAL ENVIAR MULTA */}

      {multaSeleccionada && (
        <div
          className="juzgado-modal"
          onClick={
            cerrarMulta
          }
        >
          <div
            className="juzgado-modal-contenido"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <h2>
              Enviar Acta de
              Infracción
            </h2>

            <div className="juzgado-modal-resumen">
              <span>
                Reclamo
              </span>

              <strong>
                #
                {obtenerNumeroReclamo(
                  multaSeleccionada
                )}
              </strong>

              <span>
                Acta
              </span>

              <strong>
                N°{" "}
                {
                  multaSeleccionada
                    .numeroActa
                }
              </strong>
            </div>

            <div className="juzgado-campo">
              <label>
                N° de expediente del
                Juzgado
              </label>

              <input
                value={
                  expedienteMulta
                }
                onChange={(event) =>
                  setExpedienteMulta(
                    event.target
                      .value
                  )
                }
                placeholder="Opcional"
              />
            </div>

            <div className="juzgado-campo">
              <label>
                Observación
              </label>

              <textarea
                rows={4}
                value={
                  observacionMulta
                }
                onChange={(event) =>
                  setObservacionMulta(
                    event.target
                      .value
                  )
                }
                placeholder="Ej.: Se entregó la documentación en mesa de entrada."
              />
            </div>

            <div className="juzgado-modal-importante">
              Esto registra el envío
              del Acta de Infracción
              para el trámite de la
              multa.
            </div>

            <div className="juzgado-modal-botones">
              <button
                type="button"
                className="boton-cancelar"
                disabled={
                  guardando
                }
                onClick={
                  cerrarMulta
                }
              >
                Cancelar
              </button>

              <button
                type="button"
                className="boton-confirmar"
                disabled={
                  guardando
                }
                onClick={
                  enviarMulta
                }
              >
                {guardando
                  ? "Guardando..."
                  : "Confirmar envío"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SOLICITAR ORDEN */}

      {ordenSolicitudSeleccionada && (
        <div
          className="juzgado-modal"
          onClick={
            cerrarSolicitudOrden
          }
        >
          <div
            className="juzgado-modal-contenido"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <h2>
              Solicitar orden para
              retirar el vehículo
            </h2>

            <div className="juzgado-modal-resumen">
              <span>
                Reclamo
              </span>

              <strong>
                #
                {obtenerNumeroReclamo(
                  ordenSolicitudSeleccionada
                )}
              </strong>

              <span>
                Acta de Infracción
              </span>

              <strong>
                N°{" "}
                {
                  ordenSolicitudSeleccionada
                    .numeroActa
                }
              </strong>
            </div>

            {ordenSolicitudSeleccionada
              .detalleAccionPosterior && (
              <div className="juzgado-modal-importante">
                <strong>
                  Lo informado por el
                  inspector:
                </strong>

                <br />

                {
                  ordenSolicitudSeleccionada
                    .detalleAccionPosterior
                }
              </div>
            )}

            <div className="juzgado-campo">
              <label>
                Observación de la
                solicitud
              </label>

              <textarea
                rows={4}
                value={
                  observacionSolicitud
                }
                onChange={(event) =>
                  setObservacionSolicitud(
                    event.target
                      .value
                  )
                }
                placeholder="Ej.: Se solicita orden judicial para proceder al retiro del vehículo."
              />
            </div>

            <div className="juzgado-modal-botones">
              <button
                type="button"
                className="boton-cancelar"
                disabled={
                  guardando
                }
                onClick={
                  cerrarSolicitudOrden
                }
              >
                Cancelar
              </button>

              <button
                type="button"
                className="boton-confirmar"
                disabled={
                  guardando
                }
                onClick={
                  solicitarOrden
                }
              >
                {guardando
                  ? "Guardando..."
                  : "Registrar solicitud"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RESPUESTA DE ORDEN */}

      {ordenRespuestaSeleccionada && (
        <div
          className="juzgado-modal"
          onClick={
            cerrarRespuestaOrden
          }
        >
          <div
            className="juzgado-modal-contenido juzgado-modal-respuesta"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <h2>
              Respuesta de la orden
              judicial
            </h2>

            <div className="juzgado-modal-resumen">
              <span>
                Reclamo
              </span>

              <strong>
                #
                {obtenerNumeroReclamo(
                  ordenRespuestaSeleccionada
                )}
              </strong>

              <span>
                Acta de Infracción
              </span>

              <strong>
                N°{" "}
                {
                  ordenRespuestaSeleccionada
                    .numeroActa
                }
              </strong>
            </div>

            <div className="juzgado-pregunta">
              <strong>
                ¿El Juzgado autorizó
                retirar el vehículo?
              </strong>

              <button
                type="button"
                className={
                  resultadoOrden ===
                  "AUTORIZADA"
                    ? "opcion-juzgado seleccionada"
                    : "opcion-juzgado"
                }
                onClick={() =>
                  setResultadoOrden(
                    "AUTORIZADA"
                  )
                }
              >
                <span>
                  ✓
                </span>

                <div>
                  <strong>
                    Sí, autorizó
                  </strong>

                  <small>
                    Se podrá continuar
                    con la remoción del
                    vehículo.
                  </small>
                </div>
              </button>

              <button
                type="button"
                className={
                  resultadoOrden ===
                  "NO_AUTORIZADA"
                    ? "opcion-juzgado seleccionada"
                    : "opcion-juzgado"
                }
                onClick={() =>
                  setResultadoOrden(
                    "NO_AUTORIZADA"
                  )
                }
              >
                <span>
                  ✕
                </span>

                <div>
                  <strong>
                    No autorizó
                  </strong>

                  <small>
                    Se registrará la
                    respuesta para
                    revisión.
                  </small>
                </div>
              </button>
            </div>

            {resultadoOrden ===
              "AUTORIZADA" && (
              <div className="juzgado-orden-foto">
                <h3>
                  Foto de la orden
                  judicial *
                </h3>

                <p>
                  Sacá una foto clara
                  de la orden recibida
                  del Juzgado.
                </p>

                <FotosReclamo
                  reclamoId={
                    ordenRespuestaSeleccionada
                      .reclamoId
                  }
                  tipoReferencia="ORDEN_JUDICIAL_REMOCION"
                  referenciaId={
                    ordenRespuestaSeleccionada
                      .id
                  }
                  permitirSubir={
                    true
                  }
                  descripcion="Orden judicial de remoción"
                  onCantidadFotosChange={
                    setCantidadFotosOrden
                  }
                />

                {cantidadFotosOrden >
                  0 && (
                  <div className="juzgado-foto-ok">
                    ✓ Orden judicial
                    adjuntada
                  </div>
                )}
              </div>
            )}

            <div className="juzgado-campo">
              <label>
                Observaciones
              </label>

              <textarea
                rows={4}
                value={
                  observacionRespuesta
                }
                onChange={(event) =>
                  setObservacionRespuesta(
                    event.target
                      .value
                  )
                }
                placeholder="Escribí lo informado por el Juzgado."
              />
            </div>

            {resultadoOrden ===
              "AUTORIZADA" && (
              <div className="juzgado-destino-director">
                <strong>
                  Próximo paso
                </strong>

                <span>
                  Al registrar la
                  autorización, el
                  expediente vuelve al
                  circuito operativo
                  para realizar la
                  remoción.
                </span>
              </div>
            )}

            <div className="juzgado-modal-botones">
              <button
                type="button"
                className="boton-cancelar"
                disabled={
                  guardando
                }
                onClick={
                  cerrarRespuestaOrden
                }
              >
                Cancelar
              </button>

              <button
                type="button"
                className="boton-confirmar"
                disabled={
                  guardando ||
                  !resultadoOrden ||
                  (
                    resultadoOrden ===
                      "AUTORIZADA" &&
                    cantidadFotosOrden <
                      1
                  )
                }
                onClick={
                  guardarRespuestaOrden
                }
              >
                {guardando
                  ? "Guardando..."
                  : "Registrar respuesta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JuzgadoPage;