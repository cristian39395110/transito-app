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



import ReclamoForm from "../components/ReclamoForm";

import {
  useAuth,
} from "../context/AuthContext";

import "./ReclamosPage.css";


/*
|--------------------------------------------------------------------------
| TIPO
|--------------------------------------------------------------------------
*/

const obtenerTipo =
  (
    reclamo
  ) =>
    reclamo
      ?.tipoReclamo
      ?.nombre ||
    reclamo
      ?.TipoReclamo
      ?.nombre ||
    "Sin tipo";


/*
|--------------------------------------------------------------------------
| RESPONSABLE
|--------------------------------------------------------------------------
*/

const obtenerResponsable =
  (
    reclamo
  ) => {
    if (
      reclamo.inspector
        ?.nombre
    ) {
      return (
        reclamo.inspector
          .nombre
      );
    }


    if (
      reclamo.jefeGuardia
        ?.nombre
    ) {
      return (
        reclamo.jefeGuardia
          .nombre
      );
    }


    if (
      reclamo.requiereAccion
    ) {
      return "Sin asignar";
    }


    return "—";
  };


/*
|--------------------------------------------------------------------------
| TEXTO SEGÚN ROL
|--------------------------------------------------------------------------
*/

const obtenerAyudaRol =
  (
    rol
  ) => {
    if (
      rol ===
      "director"
    ) {
      return (
        "Primero aparecen los reclamos que necesitan una decisión de Dirección."
      );
    }


    if (
      rol ===
      "jefe_guardia"
    ) {
      return (
        "Los plazos vencidos quedan disponibles para cualquier jefe de guardia."
      );
    }


    if (
      rol ===
      "secretaria_reclamos"
    ) {
      return (
        "Los reclamos solucionados que faltan dar de baja están en “Para cerrar”."
      );
    }


    return (
      "Acá aparecen solamente los reclamos que todavía necesitan atención."
    );
  };


const ReclamosPage =
  () => {
    const navigate =
      useNavigate();

    const {
      rol,
    } = useAuth();


    const [
      reclamos,
      setReclamos,
    ] = useState([]);


    const [
      resumen,
      setResumen,
    ] = useState({
      paraHacer: 0,
      esperando: 0,
      totalActivos: 0,
    });


    const [
      seccion,
      setSeccion,
    ] = useState(
      "PARA_HACER"
    );

    const cantidadEsperandoOrden =
  useMemo(
    () =>
      reclamos.filter(
        (reclamo) =>
          reclamo
            .esperaOrdenRemocion
      ).length,
    [reclamos]
  );


    const [
      buscar,
      setBuscar,
    ] = useState("");


    const [
      cargando,
      setCargando,
    ] = useState(true);


    const [
      error,
      setError,
    ] = useState("");


    const [
      mostrarNuevo,
      setMostrarNuevo,
    ] = useState(false);


    const puedeCrear =
      rol ===
        "administrador" ||
      rol ===
        "secretaria_reclamos";


    /*
    |--------------------------------------------------------------------------
    | CARGAR
    |--------------------------------------------------------------------------
    */

    const cargarDatos =
      useCallback(
        async () => {
          try {
            setCargando(
              true
            );

            setError("");


            const respuesta =
              await api.get(
                "/reclamos"
              );


            const datos =
              respuesta.data ||
              {};


            const lista =
              datos.reclamos ||
              [];


            setReclamos(
              Array.isArray(
                lista
              )
                ? lista
                : []
            );


            setResumen({
              paraHacer:
                Number(
                  datos.resumen
                    ?.paraHacer ||
                  0
                ),

              esperando:
                Number(
                  datos.resumen
                    ?.esperando ||
                  0
                ),

              totalActivos:
                Number(
                  datos.resumen
                    ?.totalActivos ||
                  lista.length ||
                  0
                ),
            });
          } catch (err) {
            console.error(
              err
            );


            setError(
              err.response
                ?.data
                ?.mensaje ||
                "No se pudieron cargar los reclamos"
            );
          } finally {
            setCargando(
              false
            );
          }
        },
        []
      );


    useEffect(
      () => {
        cargarDatos();
      },
      [
        cargarDatos,
      ]
    );


    /*
    |--------------------------------------------------------------------------
    | FILTRADO SIMPLE
    |--------------------------------------------------------------------------
    */

    const reclamosVisibles =
      useMemo(
        () => {
          let lista =
            [...reclamos];


          if (
            seccion ===
            "PARA_HACER"
          ) {
            lista =
              lista.filter(
                (
                  reclamo
                ) =>
                  Boolean(
                    reclamo.requiereAccion
                  )
              );
          }


          if (
            seccion ===
            "ESPERANDO"
          ) {
            lista =
              lista.filter(
                (
                  reclamo
                ) =>
                  !reclamo.requiereAccion
              );
          }
if (
  seccion ===
  "ORDEN_REMOCION"
) {
  lista =
    lista.filter(
      (reclamo) =>
        reclamo
          .esperaOrdenRemocion
    );
}

          const texto =
            buscar
              .trim()
              .toLowerCase();


          if (!texto) {
            return lista;
          }


          return lista.filter(
            (
              reclamo
            ) => {
              const contenido = [
                reclamo.numeroReclamo,
                reclamo.direccion,
                reclamo.barrio,
                reclamo.referencia,
                obtenerTipo(
                  reclamo
                ),
                reclamo.accionSimple,
                reclamo.jefeGuardia
                  ?.nombre,
                reclamo.inspector
                  ?.nombre,
              ]
                .filter(
                  Boolean
                )
                .join(" ")
                .toLowerCase();


              return contenido.includes(
                texto
              );
            }
          );
        },
        [
          reclamos,
          seccion,
          buscar,
        ]
      );


    /*
    |--------------------------------------------------------------------------
    | NUEVO RECLAMO
    |--------------------------------------------------------------------------
    */

    const manejarCreado =
      async () => {
        setMostrarNuevo(
          false
        );

        setSeccion(
          "PARA_HACER"
        );

        await cargarDatos();
      };


    /*
    |--------------------------------------------------------------------------
    | ABRIR
    |--------------------------------------------------------------------------
    */

    const abrirReclamo =
      (
        reclamo
      ) => {
        navigate(
          `/reclamos/${reclamo.id}`
        );
      };


    const manejarTeclado =
      (
        event,
        reclamo
      ) => {
        if (
          event.key ===
            "Enter" ||
          event.key ===
            " "
        ) {
          event.preventDefault();

          abrirReclamo(
            reclamo
          );
        }
      };


    return (
      <div className="reclamos-page">

        {/* =====================================================
            CABECERA
        ===================================================== */}

        <header className="reclamos-header">

          <div>
            <h1>
              Reclamos
            </h1>

            <p>
              {
                obtenerAyudaRol(
                  rol
                )
              }
            </p>
          </div>


          {puedeCrear && (
            <button
              type="button"
              className="reclamos-nuevo"
              onClick={() =>
                setMostrarNuevo(
                  true
                )
              }
            >
              + Nuevo reclamo
            </button>
          )}

        </header>


        {/* =====================================================
            BOTONES GRANDES
        ===================================================== */}

        <div className="reclamos-secciones">

          <button
            type="button"
            className={
              seccion ===
              "PARA_HACER"
                ? "activo urgente"
                : ""
            }
            onClick={() =>
              setSeccion(
                "PARA_HACER"
              )
            }
          >
            <strong>
              🔴 Para hacer
            </strong>

            <span>
              {
                resumen.paraHacer
              }
            </span>
          </button>


          <button
            type="button"
            className={
              seccion ===
              "ESPERANDO"
                ? "activo"
                : ""
            }
            onClick={() =>
              setSeccion(
                "ESPERANDO"
              )
            }
          >
            <strong>
              ⏳ Esperando
            </strong>

            <span>
              {
                resumen.esperando
              }
            </span>
          </button>

<button
  type="button"
  className={
    seccion ===
    "ORDEN_REMOCION"
      ? "activo"
      : ""
  }
  onClick={() =>
    setSeccion(
      "ORDEN_REMOCION"
    )
  }
>
  <strong>
    🚗 Esperando orden para retirar
  </strong>

  <span>
    {cantidadEsperandoOrden}
  </span>
</button>
          <button
            type="button"
            className={
              seccion ===
              "TODOS"
                ? "activo"
                : ""
            }
            onClick={() =>
              setSeccion(
                "TODOS"
              )
            }
          >
            <strong>
              Todos activos
            </strong>

            <span>
              {
                resumen.totalActivos
              }
            </span>
          </button>

        </div>


        {/* =====================================================
            EXPLICACIÓN SENCILLA
        ===================================================== */}

        <div className="reclamos-explicacion">

          {seccion ===
            "PARA_HACER" && (
            <>
              <strong>
                Hay algo para hacer
              </strong>

              <span>
                Estos son los reclamos
                que necesitan una acción
                suya ahora.
              </span>
            </>
          )}


          {seccion ===
            "ESPERANDO" && (
            <>
              <strong>
                Por ahora hay que esperar
              </strong>

              <span>
                El reclamo sigue abierto,
                pero ahora no necesita
                una acción suya.
              </span>
            </>
          )}


          {seccion ===
            "TODOS" && (
            <>
              <strong>
                Todos los reclamos activos
              </strong>

              <span>
                No aparecen reclamos
                solucionados, cerrados
                ni archivados.
              </span>
            </>
          )}

        </div>


        {/* =====================================================
            BUSCADOR
        ===================================================== */}

        <div className="reclamos-busqueda">

          <span>
            ⌕
          </span>

          <input
            type="search"
            value={
              buscar
            }
            onChange={(
              event
            ) =>
              setBuscar(
                event.target
                  .value
              )
            }
            placeholder="Buscar número, calle o barrio"
          />

          {buscar && (
            <button
              type="button"
              onClick={() =>
                setBuscar("")
              }
              aria-label="Limpiar búsqueda"
            >
              ×
            </button>
          )}

        </div>


        {/* =====================================================
            CONTENIDO
        ===================================================== */}

        {cargando ? (
          <div className="reclamos-mensaje">
            Cargando reclamos...
          </div>
        ) : error ? (
          <div className="reclamos-error">

            <strong>
              No se pudieron cargar
              los reclamos
            </strong>

            <span>
              {error}
            </span>

            <button
              type="button"
              onClick={
                cargarDatos
              }
            >
              Reintentar
            </button>

          </div>
        ) : reclamosVisibles
            .length ===
          0 ? (
          <div className="reclamos-vacio">

            <strong>
              No hay nada pendiente
              en esta sección
            </strong>

            <p>
              Si aparece un nuevo
              trabajo, se mostrará acá.
            </p>

          </div>
        ) : (
          <div className="reclamos-tabla-contenedor">

            <div className="reclamos-tabla-header">

              <span>
                Reclamo
              </span>

              <span>
                Lugar
              </span>

              <span>
                Hay que hacer
              </span>

              <span>
                Responsable
              </span>

              <span />

            </div>


            <div className="reclamos-lista">

              {reclamosVisibles.map(
                (
                  reclamo
                ) => (
                  <div
                    key={
                      reclamo.id
                    }
                    className={`reclamo-fila ${
                      reclamo.requiereAccion
                        ? "requiere-accion"
                        : ""
                    }`}
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      abrirReclamo(
                        reclamo
                      )
                    }
                    onKeyDown={(
                      event
                    ) =>
                      manejarTeclado(
                        event,
                        reclamo
                      )
                    }
                  >

                    <div className="reclamo-columna">

                      <span className="reclamo-mobile-label">
                        Reclamo
                      </span>

                      <strong className="reclamo-numero">
                        #
                        {
                          reclamo.numeroReclamo ||
                          reclamo.id
                        }
                      </strong>

                      <small>
                        {
                          obtenerTipo(
                            reclamo
                          )
                        }
                      </small>

                    </div>


                    <div className="reclamo-columna">

                      <span className="reclamo-mobile-label">
                        Lugar
                      </span>

                      <strong>
                        {
                          reclamo.direccion ||
                          "Sin dirección"
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


                    <div className="reclamo-columna reclamo-que-hacer">

                      <span className="reclamo-mobile-label">
                        Hay que hacer
                      </span>

                      <strong>
                        {
                          reclamo.accionSimple ||
                          "Revisar reclamo"
                        }
                      </strong>

                    </div>


                    <div className="reclamo-columna">

                      <span className="reclamo-mobile-label">
                        Responsable
                      </span>

                      <strong>
                        {
                          obtenerResponsable(
                            reclamo
                          )
                        }
                      </strong>

                    </div>


                    <div className="reclamo-flecha">
                      ›
                    </div>

                  </div>
                )
              )}

            </div>

          </div>
        )}


        {/* =====================================================
            MODAL NUEVO
        ===================================================== */}

        {mostrarNuevo && (
          <div
            className="reclamo-modal"
            onClick={() =>
              setMostrarNuevo(
                false
              )
            }
          >

            <div
              className="reclamo-modal-contenido"
              onClick={(
                event
              ) =>
                event.stopPropagation()
              }
            >

              <button
                type="button"
                className="reclamo-modal-cerrar"
                onClick={() =>
                  setMostrarNuevo(
                    false
                  )
                }
              >
                ×
              </button>


              <ReclamoForm
                onCreado={
                  manejarCreado
                }
                onCancelar={() =>
                  setMostrarNuevo(
                    false
                  )
                }
              />

            </div>

          </div>
        )}

      </div>
    );
  };


export default ReclamosPage;