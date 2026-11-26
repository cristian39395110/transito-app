import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";

import api from "../api/api";

import {
  useAuth,
} from "../context/AuthContext";

import FotosReclamo from "../components/FotosReclamo";

import "./RemocionVehiculoPage.css";


const ITEMS_INVENTARIO = [
  {
    clave: "parabrisas",
    nombre: "Parabrisas",
  },
  {
    clave: "lunetaTrasera",
    nombre: "Luneta trasera",
  },
  {
    clave: "espejoIzquierdo",
    nombre: "Espejo izquierdo",
  },
  {
    clave: "espejoDerecho",
    nombre: "Espejo derecho",
  },
  {
    clave: "opticaIzquierda",
    nombre: "Óptica izquierda",
  },
  {
    clave: "opticaDerecha",
    nombre: "Óptica derecha",
  },
  {
    clave: "paragolpeDelantero",
    nombre: "Paragolpe delantero",
  },
  {
    clave: "paragolpeTrasero",
    nombre: "Paragolpe trasero",
  },
  {
    clave: "ruedaDelanteraIzquierda",
    nombre: "Rueda delantera izquierda",
  },
  {
    clave: "ruedaDelanteraDerecha",
    nombre: "Rueda delantera derecha",
  },
  {
    clave: "ruedaTraseraIzquierda",
    nombre: "Rueda trasera izquierda",
  },
  {
    clave: "ruedaTraseraDerecha",
    nombre: "Rueda trasera derecha",
  },
  {
    clave: "patenteDelantera",
    nombre: "Patente delantera",
  },
  {
    clave: "patenteTrasera",
    nombre: "Patente trasera",
  },
  {
    clave: "interior",
    nombre: "Interior",
  },
];


const ESTADOS = [
  {
    valor:
      "PRESENTE",

    texto:
      "Presente",
  },

  {
    valor:
      "FALTANTE",

    texto:
      "Faltante",
  },

  {
    valor:
      "DAÑADO",

    texto:
      "Dañado",
  },

  {
    valor:
      "NO_VERIFICABLE",

    texto:
      "No verificable",
  },
];


const crearInventario =
  () => {
    const inventario = {};

    ITEMS_INVENTARIO
      .forEach(
        (item) => {
          inventario[
            item.clave
          ] = "";
        }
      );

    return inventario;
  };


const RemocionVehiculoPage =
  () => {
    const { id } =
      useParams();

    const navigate =
      useNavigate();

    const {
      rol,
      usuario,
    } = useAuth();

    const esGrua =
      rol === "grua";

    const [
      pasandoAGrua,
      setPasandoAGrua,
    ] = useState(false);

    const [
      searchParams,
    ] =
      useSearchParams();


    const infraccionIdUrl =
      Number(
        searchParams.get(
          "infraccionId"
        )
      ) || null;


    /*
    |--------------------------------------------------------------------------
    | DATOS
    |--------------------------------------------------------------------------
    */

    const [
      contexto,
      setContexto,
    ] = useState(null);

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


    /*
    |--------------------------------------------------------------------------
    | INVENTARIO
    |--------------------------------------------------------------------------
    */

    const [
      inventario,
      setInventario,
    ] = useState(
      crearInventario
    );

    const [
      observacionesInventario,
      setObservacionesInventario,
    ] = useState("");


    /*
    |--------------------------------------------------------------------------
    | REMOCIÓN
    |--------------------------------------------------------------------------
    */

    const [
      grua,
      setGrua,
    ] = useState("");

    const [
      chofer,
      setChofer,
    ] = useState(() =>
      rol === "grua"
        ? usuario?.nombre || ""
        : ""
    );

   const [
  predios,
  setPredios,
] = useState([]);

const [
  predioDestinoId,
  setPredioDestinoId,
] = useState("");

    const [
      observacionesRemocion,
      setObservacionesRemocion,
    ] = useState("");

    /*
    |--------------------------------------------------------------------------
    | CARGAR
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
      const cargar =
        async () => {
          try {
            setCargando(true);
            setError("");


   const [
  respuestaContexto,
  respuestaPredios,
] = await Promise.all([
  api.get(
    `/remociones/contexto/${id}`,
    {
      params:
        infraccionIdUrl
          ? {
              infraccionId:
                infraccionIdUrl,
            }
          : {},
    }
  ),

  api.get(
    "/predios"
  ),
]);

setContexto(
  respuestaContexto.data
);

const listaPredios =
  respuestaPredios.data
    ?.predios ||
  [];

setPredios(
  listaPredios
);

/*
Si existe Granja La Amalia,
la dejamos seleccionada por
defecto.

El inspector puede cambiarla
por CDF u otro destino.
*/

const granja =
  listaPredios.find(
    (predio) => {
      const nombre =
        String(
          predio.nombre || ""
        )
          .toLowerCase()
          .normalize("NFD")
          .replace(
            /[\u0300-\u036f]/g,
            ""
          );

      return (
        nombre.includes(
          "granja"
        ) &&
        nombre.includes(
          "amalia"
        )
      );
    }
  );

if (granja) {
  setPredioDestinoId(
    String(granja.id)
  );
} else if (
  listaPredios.length
) {
  setPredioDestinoId(
    String(
      listaPredios[0].id
    )
  );
}
          } catch (err) {
            console.error(
              "Error cargando remoción:",
              err
            );


            setError(
              err.response?.data
                ?.mensaje ||
              "No se pudieron cargar los datos de la remoción."
            );
          } finally {
            setCargando(false);
          }
        };


      cargar();
    }, [id]);


 
   /*
    |--------------------------------------------------------------------------
    | INVENTARIO
    |--------------------------------------------------------------------------
    */

    const cambiarEstado = (
      clave,
      valor
    ) => {
      setInventario(
        (actual) => ({
          ...actual,
          [clave]:
            valor,
        })
      );
    };


    const todosPresentes =
      () => {
        const nuevo = {};

        ITEMS_INVENTARIO
          .forEach(
            (item) => {
              nuevo[
                item.clave
              ] =
                "PRESENTE";
            }
          );

        setInventario(
          nuevo
        );
      };


    /*
    |--------------------------------------------------------------------------
    | VALIDAR
    |--------------------------------------------------------------------------
    */

    const validar = () => {
      const infraccionId =
        infraccionIdUrl ||
        contexto?.infraccion
          ?.id;


      if (!infraccionId) {
        return (
          "No se encontró el Acta de Infracción."
        );
      }


      const faltantes =
        ITEMS_INVENTARIO
          .filter(
            (item) =>
              !inventario[
                item.clave
              ]
          );


      if (
        faltantes.length
      ) {
        return (
          `Faltan revisar ${faltantes.length} elementos del inventario.`
        );
      }


    


    if (
  !predioDestinoId
) {
  return (
    "Seleccioná el destino del vehículo."
  );
}


      return "";
    };


    /*
    |--------------------------------------------------------------------------
    | FINALIZAR REMOCIÓN
    |--------------------------------------------------------------------------
    */

   const finalizar =
  async () => {
    const mensaje =
      validar();

    if (mensaje) {
      setError(mensaje);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    const confirmar =
      window.confirm(
        "¿Confirmás que el vehículo fue inventariado y retirado de la vía pública?"
      );

    if (!confirmar) {
      return;
    }

    try {
      setGuardando(true);
      setError("");

      const infraccionId =
        infraccionIdUrl ||
        contexto.infraccion
          ?.id;

      const respuesta =
        await api.post(
          "/remociones/completa",
          {
            reclamoId:
              Number(id),

            vehiculoId:
              contexto
                .vehiculo
                .id,

            infraccionId,

            detalleInventario:
              inventario,

            observacionesInventario:
              observacionesInventario
                .trim() ||
              null,

            grua:
              grua.trim() ||
              null,

            chofer:
              chofer.trim() ||
              null,

            predioDestinoId:
              Number(
                predioDestinoId
              ),

            observacionesRemocion:
              observacionesRemocion
                .trim() ||
              null,
          }
        );

      alert(
        respuesta.data
          ?.mensaje ||
        "Remoción registrada."
      );

      /*
      |--------------------------------------------------------------------------
      | CONTINUAR CON OTRO VEHÍCULO
      |--------------------------------------------------------------------------
      |
      | Si después de esta remoción todavía queda otro
      | emplazamiento vencido para controlar dentro del
      | mismo reclamo, volvemos a la segunda visita.
      |
      */

      if (
        respuesta.data
          ?.continuarSegundaVisita ===
        true
      ) {
        navigate(
          `/segunda-visita/${id}`
        );

        return;
      }

      /*
      |--------------------------------------------------------------------------
      | TRABAJO TERMINADO
      |--------------------------------------------------------------------------
      */

      navigate(
        rol === "grua"
          ? "/retiros-grua"
          : "/mis-trabajos"
      );
    } catch (err) {
      console.error(
        "Error registrando remoción:",
        err
      );

      setError(
        err.response?.data
          ?.mensaje ||
        "No se pudo registrar la remoción."
      );
    } finally {
      setGuardando(false);
    }
  };

    /*
    |--------------------------------------------------------------------------
    | ESTADOS DE PANTALLA
    |--------------------------------------------------------------------------
    */

    if (cargando) {
      return (
        <div className="remocion-page">
          Cargando remoción...
        </div>
      );
    }


    if (
      !contexto ||
      !contexto.vehiculo
    ) {
      return (
        <div className="remocion-page">

          <div className="remocion-error">
            {error ||
              "No se encontró el vehículo."}
          </div>

        </div>
      );
    }


    const {
      reclamo,
      vehiculo,
      infraccion,
    } =
      contexto;


    /*
    |--------------------------------------------------------------------------
    | RENDER
    |--------------------------------------------------------------------------
    */

    /*
    |--------------------------------------------------------------------------
    | INSPECTOR: NO LO PUEDE LLEVAR -> QUE LO RETIRE LA GRÚA
    |--------------------------------------------------------------------------
    */

    const conOrdenJudicial =
      infraccion?.estadoOrdenRemocion ===
      "AUTORIZADA";

    /*
    | Dos casos:
    | - eligió "Lo retiro yo ahora" en la segunda visita;
    | - actuación posterior a la orden del juez.
    */

    const esPostOrden =
      conOrdenJudicial &&
      infraccion?.accionPosterior ===
        "BUSQUEDA_REMOCION";

    const puedePasarAGrua =
      !esGrua &&
      (
        infraccion?.accionPosterior ===
          "RETIRO_INMEDIATO" ||
        esPostOrden
      );

    const pasarAGrua =
      async () => {
        const confirmar =
          window.confirm(
            "¿Dejás el vehículo para que lo retire la grúa?" +
            " Se le avisará por email y tu trabajo con este vehículo termina acá."
          );

        if (!confirmar) {
          return;
        }

        try {
          setPasandoAGrua(true);
          setError("");

          const respuesta =
            esPostOrden
              ? await api.post(
                  `/grua/reclamos/${id}/enviar-con-orden`,
                  {
                    infraccionId:
                      infraccion.id,
                  }
                )
              : await api.patch(
                  `/verificaciones/infraccion/${infraccion.id}/accion-vehiculo`,
                  {
                    accionPosterior:
                      "RETIRO_GRUA",
                  }
                );

          alert(
            respuesta.data
              ?.mensaje ||
              "El vehículo quedó para la grúa."
          );

          navigate(
            respuesta.data
              ?.continuarSegundaVisita
              ? `/segunda-visita/${id}`
              : "/mis-trabajos"
          );
        } catch (err) {
          setError(
            err.response?.data
              ?.mensaje ||
              "No se pudo pasar el vehículo a la grúa."
          );

          window.scrollTo({
            top: 0,
            behavior: "smooth",
          });
        } finally {
          setPasandoAGrua(false);
        }
      };

    return (
      <div className="remocion-page">

        <header className="remocion-header">

          <button
            type="button"
            onClick={() =>
              navigate(-1)
            }
          >
            ← Volver
          </button>


          <div>
            <span>
              {esGrua
                ? "GRÚA"
                : "REMOCIÓN"}
            </span>

            <h1>
              {esGrua
                ? "Retiro con grúa"
                : "Retiro del vehículo"}
            </h1>

            <p>
              {esGrua
                ? "Sacá las fotos, completá el inventario y elegí a qué predio lo llevás."
                : "Completá el inventario antes de confirmar el traslado."}
            </p>
          </div>

        </header>


        {error && (
          <div className="remocion-error">
            {error}
          </div>
        )}


        {/* ACTA */}

        <section className="remocion-acta">

          <span>
            ACTA DE INFRACCIÓN
          </span>

          <strong>
            N.º{" "}
            {infraccion
              ?.numeroActa ||
              "—"}
          </strong>

          <p>
            {esGrua
              ? conOrdenJudicial
                ? "El juez autorizó la remoción de este vehículo. Ya podés retirarlo."
                : "El inspector ya labró el Acta de Infracción y dejó el vehículo listo para la grúa."
              : "El Acta de Infracción ya fue registrada. Ahora corresponde realizar el inventario y retiro."}
          </p>

          {esGrua &&
            infraccion
              ?.detalleAccionPosterior && (
              <p>
                <strong>
                  {conOrdenJudicial
                    ? "Observación del inspector:"
                    : "Indicaciones del inspector:"}
                </strong>{" "}
                {
                  infraccion.detalleAccionPosterior
                }
              </p>
            )}

          {conOrdenJudicial && (
            <div className="remocion-orden-judicial">
              <strong>
                ⚖️ Orden del juez autorizada
              </strong>

              <span>
                Si alguien se opone, mostrá la orden.
              </span>

              <FotosReclamo
                reclamoId={
                  Number(id)
                }
                tipoReferencia="ORDEN_JUDICIAL_REMOCION"
                referenciaId={
                  infraccion.id
                }
                permitirSubir={false}
              />
            </div>
          )}

        </section>


        {puedePasarAGrua && (
          <section className="remocion-pasar-grua">
            <strong>
              ¿No lo podés llevar vos?
            </strong>

            <p>
              Dejalo listo para la grúa: se le
              avisa por email y ella hace el
              inventario y el traslado.
            </p>

            <button
              type="button"
              disabled={pasandoAGrua}
              onClick={pasarAGrua}
            >
              {pasandoAGrua
                ? "Guardando..."
                : "🏗️ Que lo retire la grúa"}
            </button>
          </section>
        )}


        {/* RESUMEN */}

        <section className="remocion-resumen">

          <div>
            <span>
              Reclamo
            </span>

            <strong>
              #
              {reclamo
                ?.numeroReclamo ||
                reclamo?.id}
            </strong>
          </div>


          <div>
            <span>
              Vehículo interno
            </span>

            <strong>
              N.º{" "}
              {vehiculo
                .numeroInterno ||
                vehiculo.id}
            </strong>
          </div>


          <div>
            <span>
              Dominio
            </span>

            <strong>
              {vehiculo.dominio ||
                "Sin dominio"}
            </strong>
          </div>


          <div>
            <span>
              Vehículo
            </span>

            <strong>
              {[
                vehiculo.marca,
                vehiculo.modelo,
                vehiculo.color,
              ]
                .filter(Boolean)
                .join(" ") ||
                "Sin descripción"}
            </strong>
          </div>

        </section>


        {/* =====================================================
            PASO 1
        ===================================================== */}

        <section className="remocion-seccion">

          <div className="remocion-seccion-header">

            <div>
              <span>
                PASO 1
              </span>

              <h2>
                Inventario del automotor
              </h2>

              <p>
                Registrá el estado en que
                se encuentra antes de moverlo.
              </p>
            </div>


            <button
              type="button"
              className="boton-todos-presentes"
              onClick={
                todosPresentes
              }
            >
              Marcar todos presentes
            </button>

          </div>


          <div className="inventario-lista">

            {ITEMS_INVENTARIO.map(
              (item) => (
                <div
                  className="inventario-item"
                  key={
                    item.clave
                  }
                >

                  <strong>
                    {item.nombre}
                  </strong>


                  <div className="inventario-opciones">

                    {ESTADOS.map(
                      (estado) => (
                        <button
                          type="button"
                          key={
                            estado.valor
                          }
                          className={
                            inventario[
                              item.clave
                            ] ===
                            estado.valor
                              ? "seleccionado"
                              : ""
                          }
                          onClick={() =>
                            cambiarEstado(
                              item.clave,
                              estado.valor
                            )
                          }
                        >
                          {estado.texto}
                        </button>
                      )
                    )}

                  </div>

                </div>
              )
            )}

          </div>


          <label>
            Observaciones del inventario
          </label>

          <textarea
            rows={4}
            value={
              observacionesInventario
            }
            onChange={(e) =>
              setObservacionesInventario(
                e.target.value
              )
            }
            placeholder="Golpes, faltantes, elementos deteriorados, etc."
          />

        </section>


        {/* =====================================================
            PASO 2
        ===================================================== */}

        <section className="remocion-seccion">

          <div className="remocion-seccion-header">

            <div>
              <span>
                PASO 2
              </span>

              <h2>
                Fotos antes de moverlo
              </h2>

              <p>
                Registrá imágenes del estado
                del vehículo antes del traslado.
              </p>
            </div>

          </div>


         <FotosReclamo
  reclamoId={
    Number(id)
  }
  tipoReferencia="REMOCION"
  referenciaId={
    vehiculo.id
  }
/>

        </section>


        {/* =====================================================
            PASO 3
        ===================================================== */}

      

     

        <section className="remocion-seccion">

          <div className="remocion-seccion-header">

            <div>
              <span>
                PASO 3
              </span>

              <h2>
                Datos del traslado
              </h2>

            </div>

          </div>


          <div className="remocion-form-grid">

            <div>
              <label>
                Grúa / móvil
              </label>

              <input
                value={
                  grua
                }
                onChange={(e) =>
                  setGrua(
                    e.target.value
                  )
                }
                placeholder="Ej.: Grúa municipal 1"
              />
            </div>


            <div>
              <label>
                Chofer
              </label>

              <input
                value={
                  chofer
                }
                onChange={(e) =>
                  setChofer(
                    e.target.value
                  )
                }
                placeholder="Nombre del chofer"
              />
            </div>


            <div className="remocion-campo-completo">

  <label>
  ¿A dónde se traslada el vehículo? *
</label>

<select
  className="remocion-select"
  value={predioDestinoId}
  onChange={(e) =>
    setPredioDestinoId(
      e.target.value
    )
  }
>
    <option value="">
      Seleccionar destino
    </option>

    {predios.map(
      (predio) => (
        <option
          key={predio.id}
          value={predio.id}
        >
          {predio.nombre}
        </option>
      )
    )}
  </select>

  {!predios.length && (
    <small>
      No hay destinos activos cargados.
      Un administrador debe crear uno.
    </small>
  )}

</div>  

          </div>


          <label>
            Observaciones del retiro
          </label>

          <textarea
            rows={4}
            value={
              observacionesRemocion
            }
            onChange={(e) =>
              setObservacionesRemocion(
                e.target.value
              )
            }
            placeholder="Cualquier situación ocurrida durante el retiro."
          />

        </section>


        {/* FINAL */}

        <section className="remocion-final">

          <div>
            <strong>
              ¿Terminaste el retiro?
            </strong>

            <p>
              Al confirmar, el vehículo
              quedará pendiente de ingreso
              al predio municipal.
            </p>
          </div>


          <button
            type="button"
            disabled={
              guardando
            }
            onClick={
              finalizar
            }
          >
            {guardando
              ? "Guardando..."
              : esGrua
                ? "✅ Confirmar retiro"
                : "Finalizar remoción"}
          </button>

        </section>

      </div>
    );
  };


export default RemocionVehiculoPage;