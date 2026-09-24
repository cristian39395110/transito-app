import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import api from "../api/api";

import ExpedienteResultado from "../components/ExpedienteResultado";
import ExpedienteManualForm
  from "../components/ExpedienteManualForm";

import "./ExpedientesPage.css";

const ExpedientesPage =
  () => {
    const [
      texto,
      setTexto,
    ] = useState("");

    const [
      busqueda,
      setBusqueda,
    ] = useState("");

    const [
      expedientes,
      setExpedientes,
    ] = useState([]);

    const [
      paginacion,
      setPaginacion,
    ] = useState({
      pagina: 1,
      limite: 10,
      total: 0,
      totalPaginas: 1,
      tieneAnterior: false,
      tieneSiguiente: false,
    });

    const [
      cargando,
      setCargando,
    ] = useState(true);

    const [
      error,
      setError,
    ] = useState("");

    const primeraCarga =
      useRef(true);


      const [
  mostrarCargaManual,
  setMostrarCargaManual,
] = useState(false);
    /*
    |--------------------------------------------------------------------------
    | CARGAR EXPEDIENTES
    |--------------------------------------------------------------------------
    */

    const cargarExpedientes =
      useCallback(
        async (
          pagina = 1,
          buscar = ""
        ) => {
          try {
            setCargando(true);

            setError("");

            const respuesta =
              await api.get(
                "/expedientes",
                {
                  params: {
                    buscar:
                      buscar ||
                      undefined,

                    page:
                      pagina,

                    limit: 10,
                  },
                }
              );

            const datos =
              respuesta.data ||
              {};

            setExpedientes(
              Array.isArray(
                datos.expedientes
              )
                ? datos.expedientes
                : []
            );

            setPaginacion(
              datos.paginacion ||
                {
                  pagina,
                  limite: 10,
                  total: 0,
                  totalPaginas: 1,
                  tieneAnterior:
                    false,
                  tieneSiguiente:
                    false,
                }
            );
          } catch (err) {
            console.error(
              "Error cargando expedientes:",
              err
            );

            setExpedientes([]);

            setError(
              err.response
                ?.data
                ?.mensaje ||
                "No se pudieron cargar los expedientes."
            );
          } finally {
            setCargando(false);
          }
        },
        []
      );

    /*
    |--------------------------------------------------------------------------
    | PRIMERA CARGA
    |--------------------------------------------------------------------------
    |
    | Al entrar muestra los últimos 10.
    |
    */

    useEffect(() => {
      cargarExpedientes(
        1,
        ""
      );
    }, [
      cargarExpedientes,
    ]);

    /*
    |--------------------------------------------------------------------------
    | FILTRO AUTOMÁTICO
    |--------------------------------------------------------------------------
    |
    | No hay botón Buscar.
    |
    | Esperamos 400 ms después
    | de la última tecla.
    |
    */

    useEffect(() => {
      if (
        primeraCarga.current
      ) {
        primeraCarga.current =
          false;

        return;
      }

      const temporizador =
        setTimeout(
          () => {
            const valor =
              texto.trim();

            setBusqueda(
              valor
            );

            cargarExpedientes(
              1,
              valor
            );
          },
          400
        );

      return () =>
        clearTimeout(
          temporizador
        );
    }, [
      texto,
      cargarExpedientes,
    ]);

    /*
    |--------------------------------------------------------------------------
    | LIMPIAR
    |--------------------------------------------------------------------------
    */

    const limpiarBusqueda =
      () => {
        setTexto("");
      };

    /*
    |--------------------------------------------------------------------------
    | PAGINACIÓN
    |--------------------------------------------------------------------------
    */

    const irPagina =
      async (
        nuevaPagina
      ) => {
        if (
          nuevaPagina < 1 ||
          nuevaPagina >
            paginacion.totalPaginas ||
          cargando
        ) {
          return;
        }

        await cargarExpedientes(
          nuevaPagina,
          busqueda
        );

        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      };

    return (
      <div className="expedientes-page">

        <header className="expedientes-header">

          <div>
            <span className="expedientes-superior">
              ARCHIVO GENERAL
            </span>

            <h1>
              Expedientes
            </h1>

            <p>
              Consultá rápidamente
              cualquier actuación
              registrada.
            </p>
          </div>

  </header>

  {mostrarCargaManual && (
  <div className="expediente-manual-overlay">

    <div className="expediente-manual-modal">

      <ExpedienteManualForm
        onCancelar={() =>
          setMostrarCargaManual(false)
        }

     onCreado={async () => {
  setMostrarCargaManual(false);

  setTexto("");
  setBusqueda("");

  await cargarExpedientes(
    1,
    ""
  );
}}
      />

    </div>

  </div>
)}


<section className="expedientes-acciones">

  <div>
    <strong>
      Carga de expedientes
    </strong>

    <span>
      Registrá vehículos y actuaciones anteriores al sistema.
    </span>
  </div>

  <button
    type="button"
    className="expedientes-boton-carga"
    onClick={() =>
      setMostrarCargaManual(true)
    }
  >
    + Cargar expediente anterior
  </button>

</section>


<section className="expedientes-buscador">

          <label
            htmlFor="buscar-expediente"
          >
            Buscar expediente
          </label>

          <div className="expedientes-buscador-linea">

            <div className="expedientes-input-contenedor">

              <span>
                ⌕
              </span>

              <input
                id="buscar-expediente"
                type="search"
                value={texto}
                onChange={(
                  event
                ) =>
                  setTexto(
                    event.target
                      .value
                  )
                }
                placeholder="Reclamo, acta, expediente, DNI, nombre, dominio..."
                autoComplete="off"
              />

              {texto && (
                <button
                  type="button"
                  className="expedientes-limpiar-input"
                  onClick={
                    limpiarBusqueda
                  }
                  aria-label="Limpiar búsqueda"
                >
                  ×
                </button>
              )}

            </div>

            {cargando && (
              <span className="expedientes-buscando">
                Buscando...
              </span>
            )}

          </div>

        </section>


        {error && (
          <div className="expedientes-error">

            <strong>
              No se pudo cargar
            </strong>

            <span>
              {error}
            </span>

            <button
              type="button"
              onClick={() =>
                cargarExpedientes(
                  paginacion.pagina,
                  busqueda
                )
              }
            >
              Reintentar
            </button>

          </div>
        )}


        {!error && (
          <div className="expedientes-resumen">

            <div>
              {busqueda ? (
                <>
                  Resultados para{" "}
                  <strong>
                    “{busqueda}”
                  </strong>
                </>
              ) : (
                <>
                  Expedientes recientes
                </>
              )}
            </div>

            <span>
              {paginacion.total}{" "}
              {paginacion.total ===
              1
                ? "expediente"
                : "expedientes"}
            </span>

          </div>
        )}


        {!cargando &&
          !error &&
          expedientes.length ===
            0 && (
            <div className="expedientes-vacio">

              <strong>
                No encontramos
                expedientes
              </strong>

              <p>
                Probá con otro
                número, nombre,
                DNI, acta o dominio.
              </p>

            </div>
          )}


        {!error &&
          expedientes.length >
            0 && (
            <>
              <div className="expedientes-tabla-header">
                <span>
                  Reclamo
                </span>

                <span>
                  Tipo
                </span>

                <span>
                  Dirección
                </span>

                <span>
                  Coincidió por
                </span>

                <span>
                  Estado
                </span>

                <span></span>
              </div>


              <div className="expedientes-listado">

                {expedientes.map(
                  (
                    expediente
                  ) => (
                    <ExpedienteResultado
                      key={
                        expediente
                          .reclamo
                          ?.id
                      }
                      expediente={
                        expediente
                      }
                    />
                  )
                )}

              </div>
            </>
          )}


        {!cargando &&
          !error &&
          paginacion.total >
            0 && (
            <nav className="expedientes-paginacion">

              <button
                type="button"
                disabled={
                  !paginacion
                    .tieneAnterior
                }
                onClick={() =>
                  irPagina(
                    paginacion.pagina -
                      1
                  )
                }
              >
                ← Anterior
              </button>


              <div className="expedientes-pagina-actual">

                <strong>
                  Página{" "}
                  {
                    paginacion.pagina
                  }
                </strong>

                <span>
                  de{" "}
                  {
                    paginacion
                      .totalPaginas
                  }
                </span>

              </div>


              <button
                type="button"
                disabled={
                  !paginacion
                    .tieneSiguiente
                }
                onClick={() =>
                  irPagina(
                    paginacion.pagina +
                      1
                  )
                }
              >
                Siguiente →
              </button>

            </nav>
          )}

      </div>
    );
  };

export default ExpedientesPage;