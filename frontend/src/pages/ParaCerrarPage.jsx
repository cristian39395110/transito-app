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

import "./ParaCerrarPage.css";


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


const formatearFecha =
  (
    valor
  ) => {
    if (!valor) {
      return "—";
    }


    const fecha =
      new Date(
        valor
      );


    if (
      Number.isNaN(
        fecha.getTime()
      )
    ) {
      return "—";
    }


    return fecha.toLocaleString(
      "es-AR",
      {
        day:
          "2-digit",

        month:
          "2-digit",

        year:
          "numeric",

        hour:
          "2-digit",

        minute:
          "2-digit",
      }
    );
  };


const ParaCerrarPage =
  () => {
    const navigate =
      useNavigate();


    const [
      reclamos,
      setReclamos,
    ] = useState([]);


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
      cerrandoId,
      setCerrandoId,
    ] = useState(null);


    const [
      mensaje,
      setMensaje,
    ] = useState("");


    /*
    |--------------------------------------------------------------------------
    | CARGAR
    |--------------------------------------------------------------------------
    */

    const cargar =
      useCallback(
        async () => {
          try {
            setCargando(
              true
            );

            setError("");


            const respuesta =
              await api.get(
                "/reclamos/para-cerrar"
              );


            const lista =
              respuesta.data
                ?.reclamos ||
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
              err
            );


            setError(
              err.response
                ?.data
                ?.mensaje ||
                "No se pudieron cargar los reclamos para cerrar"
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
        cargar();
      },
      [
        cargar,
      ]
    );


    /*
    |--------------------------------------------------------------------------
    | FILTRAR
    |--------------------------------------------------------------------------
    */

    const visibles =
      useMemo(
        () => {
          const texto =
            buscar
              .trim()
              .toLowerCase();


          if (!texto) {
            return reclamos;
          }


          return reclamos.filter(
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
          buscar,
        ]
      );


    /*
    |--------------------------------------------------------------------------
    | CERRAR
    |--------------------------------------------------------------------------
    */

    const cerrarExterno =
      async (
        reclamo
      ) => {
        const confirmar =
          window.confirm(
            `¿Ya diste de baja el reclamo #${reclamo.numeroReclamo || reclamo.id} en el sistema externo?\n\nPresioná Aceptar solamente si ya lo cerraste afuera.`
          );


        if (
          !confirmar
        ) {
          return;
        }


        try {
          setCerrandoId(
            reclamo.id
          );

          setError("");

          setMensaje("");


          await api.patch(
            `/reclamos/${reclamo.id}/cierre-externo`
          );


          setReclamos(
            (
              anteriores
            ) =>
              anteriores.filter(
                (
                  item
                ) =>
                  item.id !==
                  reclamo.id
              )
          );


          setMensaje(
            `Reclamo #${reclamo.numeroReclamo || reclamo.id} cerrado correctamente.`
          );


          window.setTimeout(
            () => {
              setMensaje("");
            },
            3500
          );
        } catch (err) {
          console.error(
            err
          );


          setError(
            err.response
              ?.data
              ?.mensaje ||
              "No se pudo cerrar el reclamo"
          );
        } finally {
          setCerrandoId(
            null
          );
        }
      };


    return (
      <div className="para-cerrar-page">

        {/* =====================================================
            CABECERA
        ===================================================== */}

        <header className="para-cerrar-header">

          <div>
            <span className="para-cerrar-superior">
              SECRETARÍA
            </span>

            <h1>
              Para cerrar
            </h1>

            <p>
              Estos reclamos ya se
              solucionaron en la calle.
              Falta darlos de baja
              en el sistema externo.
            </p>
          </div>

        </header>


        {/* =====================================================
            AVISO
        ===================================================== */}

        <div className="para-cerrar-aviso">

          <strong>
            ¿Qué tengo que hacer?
          </strong>

          <span>
            Primero cerrá el reclamo
            en el sistema externo.
            Después presioná
            “Ya lo cerré”.
          </span>

        </div>


        {/* =====================================================
            BUSCADOR
        ===================================================== */}

        <div className="para-cerrar-busqueda">

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
            CONTADOR
        ===================================================== */}

        <div className="para-cerrar-resumen">

          <strong>
            {
              visibles.length
            }
          </strong>

          <span>
            {visibles.length ===
            1
              ? "reclamo pendiente de cierre"
              : "reclamos pendientes de cierre"}
          </span>

        </div>


        {/* =====================================================
            MENSAJES
        ===================================================== */}

        {mensaje && (
          <div className="para-cerrar-exito">
            ✓ {mensaje}
          </div>
        )}


        {cargando ? (
          <div className="para-cerrar-mensaje">
            Cargando...
          </div>
        ) : error ? (
          <div className="para-cerrar-error">

            <strong>
              Ocurrió un problema
            </strong>

            <span>
              {error}
            </span>

            <button
              type="button"
              onClick={
                cargar
              }
            >
              Reintentar
            </button>

          </div>
        ) : visibles.length ===
          0 ? (
          <div className="para-cerrar-vacio">

            <strong>
              ✓ No hay reclamos
              pendientes de cierre
            </strong>

            <p>
              Cuando un inspector
              informe que un reclamo
              fue solucionado,
              aparecerá acá.
            </p>

          </div>
        ) : (
          <div className="para-cerrar-tabla">

            {/* =================================================
                CABECERA PC
            ================================================= */}

            <div className="para-cerrar-tabla-header">

              <span>
                Reclamo
              </span>

              <span>
                Lugar
              </span>

          <span>
  Resultado
</span>

              <span>
                Acción
              </span>

            </div>


            {/* =================================================
                FILAS
            ================================================= */}

            {visibles.map(
              (
                reclamo
              ) => (
                <div
                  key={
                    reclamo.id
                  }
                  className="para-cerrar-fila"
                  onClick={() =>
                    navigate(
                      `/reclamos/${reclamo.id}`
                    )
                  }
                >

                  <div className="para-cerrar-columna">

                    <span className="para-cerrar-mobile-label">
                      Reclamo
                    </span>

                    <strong>
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


                  <div className="para-cerrar-columna">

                    <span className="para-cerrar-mobile-label">
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


                  <div className="para-cerrar-columna">

                  <span className="para-cerrar-mobile-label">
  Resultado
</span>

{reclamo.resultadoCierre ===
"NO_CONSTATADO" ? (
  <strong className="para-cerrar-solucionado">
    ⚠ No se constató el reclamo
  </strong>
) : (
  <strong className="para-cerrar-solucionado">
    ✓ Resuelto
  </strong>
)}

                    <small>
                      {
                        formatearFecha(
                          reclamo.fechaResolucion ||
                          reclamo.updatedAt
                        )
                      }
                    </small>

                  </div>


                  <div
                    className="para-cerrar-accion"
                    onClick={(
                      event
                    ) =>
                      event.stopPropagation()
                    }
                  >

                    <button
                      type="button"
                      disabled={
                        cerrandoId ===
                        reclamo.id
                      }
                      onClick={() =>
                        cerrarExterno(
                          reclamo
                        )
                      }
                    >
                      {cerrandoId ===
                      reclamo.id
                        ? "Guardando..."
                        : "✓ Ya lo cerré"}
                    </button>

                  </div>

                </div>
              )
            )}

          </div>
        )}

      </div>
    );
  };


export default ParaCerrarPage;