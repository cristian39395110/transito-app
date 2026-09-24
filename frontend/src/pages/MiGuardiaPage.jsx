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

import "./MiGuardiaPage.css";


/* =========================================================
   NOMBRES DE ETAPAS
========================================================= */

const nombresEtapa = {
  PENDIENTE_ASIGNACION_GUARDIA:
    "Pendiente de guardia",

  PENDIENTE_PRIMERA_VISITA:
    "Pendiente de primera visita",

  PRIMERA_VISITA:
    "Primera visita asignada",

  ESPERANDO_PLAZO:
    "Esperando vencimiento",

  PENDIENTE_SEGUNDA_VISITA:
    "Requiere segunda visita",

  SEGUNDA_VISITA:
    "Segunda visita asignada",

  PENDIENTE_DECISION_JEFE:
    "Requiere decisión",

  PENDIENTE_ENVIO_JUZGADO:
    "Pendiente de envío al Juzgado",

  EN_JUZGADO:
    "Esperando respuesta del Juzgado",

  PENDIENTE_ASIGNACION_POST_JUZGADO:
    "Juzgado respondió · pendiente de asignación",

  POST_JUZGADO_ASIGNADO_GUARDIA:
    "Actuación posterior al Juzgado",

  POST_JUZGADO_EN_ACTUACION:
    "Actuación posterior al Juzgado en curso",

  FINALIZADO:
    "Finalizado",

  ANULADO:
    "Anulado",
};


/* =========================================================
   SITUACIÓN OPERATIVA
========================================================= */

const obtenerSituacion = (
  reclamo
) => {
  switch (
    reclamo.etapaActual
  ) {
    /* -----------------------------------------------------
       PRIMERA VISITA
    ----------------------------------------------------- */

    case "PENDIENTE_PRIMERA_VISITA":
      return {
        clase:
          "azul",

        titulo:
          "Falta asignar inspector",

        texto:
          "Este reclamo necesita su primera visita.",

        accion:
          "ASIGNAR_PRIMERA",
      };


    case "PRIMERA_VISITA":
      return {
        clase:
          "azul",

        titulo:
          "Primera visita asignada",

        texto:
          reclamo.inspector
            ?.nombre
            ? `La primera visita está asignada a ${reclamo.inspector.nombre}.`
            : "La primera visita ya tiene inspector.",

        accion:
          "VER",
      };


    /* -----------------------------------------------------
       ESPERA DEL EMPLAZAMIENTO
    ----------------------------------------------------- */

    case "ESPERANDO_PLAZO":
      return {
        clase:
          "amarillo",

        titulo:
          "Esperando vencimiento",

        texto:
          "La primera visita terminó y se realizó el emplazamiento. Hay que esperar que finalice el plazo.",

        accion:
          "VER",
      };


    /* -----------------------------------------------------
       SEGUNDA VISITA
    ----------------------------------------------------- */

    case "PENDIENTE_SEGUNDA_VISITA":
      return {
        clase:
          "rojo",

        titulo:
          "Necesita segunda visita",

        texto:
          "El plazo venció. Ya puede asignarse un inspector para verificar si se cumplió.",

        accion:
          "ASIGNAR_SEGUNDA",
      };


    case "SEGUNDA_VISITA":
      return {
        clase:
          "rojo",

        titulo:
          "Segunda visita asignada",

        texto:
          reclamo.inspector
            ?.nombre
            ? `La segunda visita está asignada a ${reclamo.inspector.nombre}.`
            : "La segunda visita ya fue asignada.",

        accion:
          "VER",
      };


    /* -----------------------------------------------------
       DECISIÓN
    ----------------------------------------------------- */

    case "PENDIENTE_DECISION_JEFE":
      return {
        clase:
          "naranja",

        titulo:
          "Requiere decisión",

        texto:
          "La actuación del inspector terminó y el expediente necesita una nueva decisión.",

        accion:
          "VER",
      };


    /* -----------------------------------------------------
       JUZGADO
    ----------------------------------------------------- */

    case "PENDIENTE_ENVIO_JUZGADO":
      return {
        clase:
          "violeta",

        titulo:
          "Pendiente de envío al Juzgado",

        texto:
          "El inspector terminó su actuación. Secretaría debe continuar el trámite con el Juzgado.",

        accion:
          "VER",
      };


    case "EN_JUZGADO":
      return {
        clase:
          "violeta",

        titulo:
          "Esperando respuesta del Juzgado",

        texto:
          "El expediente está en trámite externo. No requiere actuación de la guardia por el momento.",

        accion:
          "VER",
      };


    /*
    |--------------------------------------------------------------------------
    | POST JUZGADO
    |--------------------------------------------------------------------------
    |
    | PENDIENTE_ASIGNACION_POST_JUZGADO pertenece al Director.
    |
    | Cuando el Director selecciona este jefe, el reclamo pasa a:
    |
    | POST_JUZGADO_ASIGNADO_GUARDIA
    |
    | Ahí sí aparece como trabajo pendiente del jefe.
    |
    */

    case "PENDIENTE_ASIGNACION_POST_JUZGADO":
      return {
        clase:
          "celeste",

        titulo:
          "Respuesta del Juzgado registrada",

        texto:
          "El expediente volvió del Juzgado y está pendiente de que el Director determine quién continúa.",

        accion:
          "VER",
      };


    case "POST_JUZGADO_ASIGNADO_GUARDIA":
      return {
        clase:
          "celeste",

        titulo:
          "Actuación posterior al Juzgado",

        texto:
          "El Director asignó este expediente a tu guardia. Ahora tenés que asignar un inspector para continuar la actuación municipal.",

        accion:
          "ASIGNAR_POST_JUZGADO",
      };


    case "POST_JUZGADO_EN_ACTUACION":
      return {
        clase:
          "celeste",

        titulo:
          "Actuación posterior al Juzgado en curso",

        texto:
          reclamo.inspector
            ?.nombre
            ? `La actuación posterior al Juzgado está asignada a ${reclamo.inspector.nombre}.`
            : "La actuación posterior al Juzgado ya tiene inspector.",

        accion:
          "VER",
      };


    /* -----------------------------------------------------
       FINAL
    ----------------------------------------------------- */

    case "FINALIZADO":
      return {
        clase:
          "verde",

        titulo:
          "Finalizado",

        texto:
          "El reclamo ya no requiere actuaciones.",

        accion:
          "VER",
      };


    case "ANULADO":
      return {
        clase:
          "gris",

        titulo:
          "Anulado",

        texto:
          "El reclamo fue anulado.",

        accion:
          "VER",
      };


    default:
      return {
        clase:
          "gris",

        titulo:
          nombresEtapa[
            reclamo.etapaActual
          ] ||
          reclamo.etapaActual ||
          "Revisar reclamo",

        texto:
          "Abrí el expediente para consultar su situación.",

        accion:
          "VER",
      };
  }
};


/* =========================================================
   PAGE
========================================================= */

const MiGuardiaPage = () => {
  const navigate =
    useNavigate();


  const [
    reclamos,
    setReclamos,
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
    "ACCION"
  );


  /* =======================================================
     CARGAR
  ======================================================= */

  const cargar =
    useCallback(
      async () => {
        try {
          setCargando(true);

          setError("");


          const respuesta =
            await api.get(
              "/reclamos/mi-guardia"
            );


          const lista =
            respuesta.data
              ?.reclamos ||
            respuesta.data ||
            [];


          setReclamos(
            Array.isArray(
              lista
            )
              ? lista
              : []
          );
        } catch (err) {
          console.error(
            "Error cargando Mi Guardia:",
            err
          );


          setError(
            err.response
              ?.data
              ?.mensaje ||
              "No se pudieron cargar los reclamos"
          );


          setReclamos([]);
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


  /* =======================================================
     REQUIEREN ACCIÓN DEL JEFE
  ======================================================= */

  const requiereAccion =
    useMemo(
      () =>
        reclamos.filter(
          (reclamo) =>
            [
              "PENDIENTE_PRIMERA_VISITA",

              "PENDIENTE_SEGUNDA_VISITA",

              "PENDIENTE_DECISION_JEFE",

              "POST_JUZGADO_ASIGNADO_GUARDIA",
            ].includes(
              reclamo.etapaActual
            )
        ),
      [
        reclamos,
      ]
    );


  /* =======================================================
     EN ESPERA / YA ASIGNADOS
  ======================================================= */

  const esperando =
    useMemo(
      () =>
        reclamos.filter(
          (reclamo) =>
            [
              "PRIMERA_VISITA",

              "ESPERANDO_PLAZO",

              "SEGUNDA_VISITA",

              "PENDIENTE_ENVIO_JUZGADO",

              "EN_JUZGADO",

              "POST_JUZGADO_EN_ACTUACION",
            ].includes(
              reclamo.etapaActual
            )
        ),
      [
        reclamos,
      ]
    );


  /* =======================================================
     VISIBLES
  ======================================================= */

  const visibles =
    useMemo(() => {
      if (
        filtro ===
        "ACCION"
      ) {
        return requiereAccion;
      }


      if (
        filtro ===
        "ESPERANDO"
      ) {
        return esperando;
      }


      return reclamos;
    }, [
      filtro,
      requiereAccion,
      esperando,
      reclamos,
    ]);


  /* =======================================================
     TEXTO DEL BOTÓN
  ======================================================= */

  const obtenerTextoBoton = (
    situacion
  ) => {
    if (
      situacion.accion ===
      "ASIGNAR_SEGUNDA"
    ) {
      return "Asignar 2ª visita";
    }


    if (
      situacion.accion ===
      "ASIGNAR_POST_JUZGADO"
    ) {
      return "Asignar actuación";
    }


    if (
      situacion.accion ===
      "ASIGNAR_PRIMERA"
    ) {
      return "Asignar inspector";
    }


    return "Ver expediente";
  };


  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="mi-guardia-page">

      {/* ===================================================
          HEADER
      =================================================== */}

      <header className="mi-guardia-header">
        <div>
          <span>
            JEFE DE GUARDIA
          </span>

          <h1>
            Mi guardia
          </h1>

          <p>
            Reclamos que necesitan una
            decisión, una asignación o que
            están esperando el próximo
            paso.
          </p>
        </div>


        <button
          type="button"
          onClick={cargar}
          disabled={cargando}
        >
          {cargando
            ? "Actualizando..."
            : "Actualizar"}
        </button>
      </header>


      {/* ===================================================
          RESUMEN
      =================================================== */}

      <div className="mi-guardia-resumen">

        <div>
          <strong>
            {
              requiereAccion.length
            }
          </strong>

          <span>
            Requieren acción
          </span>
        </div>


        <div>
          <strong>
            {
              esperando.length
            }
          </strong>

          <span>
            En espera
          </span>
        </div>


        <div>
          <strong>
            {
              reclamos.length
            }
          </strong>

          <span>
            Total
          </span>
        </div>

      </div>


      {/* ===================================================
          FILTROS
      =================================================== */}

      <nav className="mi-guardia-filtros">

        <button
          type="button"
          className={
            filtro ===
            "ACCION"
              ? "activo"
              : ""
          }
          onClick={() =>
            setFiltro(
              "ACCION"
            )
          }
        >
          Requieren acción

          <span>
            {
              requiereAccion.length
            }
          </span>
        </button>


        <button
          type="button"
          className={
            filtro ===
            "ESPERANDO"
              ? "activo"
              : ""
          }
          onClick={() =>
            setFiltro(
              "ESPERANDO"
            )
          }
        >
          En espera

          <span>
            {
              esperando.length
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
              reclamos.length
            }
          </span>
        </button>

      </nav>


      {/* ===================================================
          CONTENIDO
      =================================================== */}

      {cargando ? (
        <div className="mi-guardia-mensaje">
          Cargando reclamos...
        </div>
      ) : error ? (
        <div className="mi-guardia-mensaje error">
          {error}
        </div>
      ) : visibles.length ===
        0 ? (
        <div className="mi-guardia-mensaje">
          No hay reclamos en esta sección.
        </div>
      ) : (
        <section className="mi-guardia-lista">

          {/* ===============================================
              CABECERA PC
          =============================================== */}

          <div className="mi-guardia-lista-header">

            <div>
              Reclamo
            </div>

            <div>
              Ubicación
            </div>

            <div>
              Situación actual
            </div>

            <div>
              Responsable
            </div>

            <div>
              Acción
            </div>

          </div>


          {/* ===============================================
              FILAS
          =============================================== */}

          {visibles.map(
            (reclamo) => {
              const tipo =
                reclamo.tipoReclamo ||
                reclamo.TipoReclamo;


              const situacion =
                obtenerSituacion(
                  reclamo
                );


              const esPostJuzgado =
                [
                  "PENDIENTE_ASIGNACION_POST_JUZGADO",

                  "POST_JUZGADO_ASIGNADO_GUARDIA",

                  "POST_JUZGADO_EN_ACTUACION",
                ].includes(
                  reclamo.etapaActual
                );


              return (
                <article
                  key={
                    reclamo.id
                  }
                  className={`guardia-fila guardia-${situacion.clase} ${
                    esPostJuzgado
                      ? "guardia-post-juzgado"
                      : ""
                  }`}
                  onClick={() =>
                    navigate(
                      `/reclamos/${reclamo.id}`
                    )
                  }
                >

                  {/* =======================================
                      RECLAMO
                  ======================================= */}

                  <div className="guardia-columna">

                    <span className="guardia-label-mobile">
                      Reclamo
                    </span>


                    <strong className="guardia-numero">
                      #
                      {
                        reclamo.numeroReclamo
                      }
                    </strong>


                    <span>
                      {tipo?.nombre ||
                        "Sin tipo"}
                    </span>


                    {esPostJuzgado && (
                      <small className="guardia-etiqueta-juzgado">
                        POST JUZGADO
                      </small>
                    )}

                  </div>


                  {/* =======================================
                      UBICACIÓN
                  ======================================= */}

                  <div className="guardia-columna">

                    <span className="guardia-label-mobile">
                      Ubicación
                    </span>


                    <strong>
                      {
                        reclamo.direccion
                      }
                    </strong>


                    {reclamo.barrio && (
                      <small>
                        {
                          reclamo.barrio
                        }
                      </small>
                    )}

                  </div>


                  {/* =======================================
                      SITUACIÓN
                  ======================================= */}

                  <div className="guardia-columna situacion-guardia">

                    <span className="guardia-label-mobile">
                      Situación
                    </span>


                    <div className="situacion-linea">

                      <i />


                      <div>

                        <strong>
                          {
                            situacion.titulo
                          }
                        </strong>


                        <p>
                          {
                            situacion.texto
                          }
                        </p>

                      </div>

                    </div>

                  </div>


                  {/* =======================================
                      RESPONSABLE
                  ======================================= */}

                  <div className="guardia-columna">

                    <span className="guardia-label-mobile">
                      Responsable
                    </span>


                    {reclamo.inspector
                      ?.nombre ? (
                      <>
                        <strong>
                          {
                            reclamo.inspector
                              .nombre
                          }
                        </strong>

                        <small>
                          Inspector actual
                        </small>
                      </>
                    ) : (
                      <>
                        <strong>
                          Sin inspector
                        </strong>

                        <small>
                          {reclamo.etapaActual ===
                          "POST_JUZGADO_ASIGNADO_GUARDIA"
                            ? "Debe asignarse para continuar"
                            : "Disponible para asignar"}
                        </small>
                      </>
                    )}

                  </div>


                  {/* =======================================
                      ACCIÓN
                  ======================================= */}

                  <div className="guardia-columna guardia-accion">

                    <span className="guardia-label-mobile">
                      Acción
                    </span>


                    <button
                      type="button"
                      onClick={(
                        event
                      ) => {
                        event.stopPropagation();

                        navigate(
                          `/reclamos/${reclamo.id}`
                        );
                      }}
                    >
                      {
                        obtenerTextoBoton(
                          situacion
                        )
                      }

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


export default MiGuardiaPage;