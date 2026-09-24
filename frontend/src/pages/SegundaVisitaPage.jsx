  import {
    useEffect,
    useMemo,
    useState,
  } from "react";

  import {
    useNavigate,
    useParams,
  } from "react-router-dom";

  import api from "../api/api";

  import FotosReclamo from "../components/FotosReclamo";

  import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

import L from "leaflet";

  import "./SegundaVisitaPage.css";


  const formatearFecha = (fecha) => {
    if (!fecha) {
      return "—";
    }

    return new Date(
      fecha
    ).toLocaleString(
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

const nombreResultado = (
  resultado
) => {
  const nombres = {
    CUMPLIDO:
      "Ya está solucionado",

    PRORROGA:
      "Se otorgó más plazo",

    NO_CUMPLIDO:
      "No cumplió — Acta de Infracción",

    NO_SE_ENCUENTRA:
      "No se encontró la situación",

    NO_SE_PUDO_VERIFICAR:
      "No se pudo verificar",

    PARCIAL:
      "Cumplimiento parcial",

    OTRO:
      "Otro resultado",
  };

  return (
    nombres[resultado] ||
    resultado ||
    "Control realizado"
  );
};
  const SegundaVisitaPage = () => {
    const { id } =
      useParams();

    const navigate =
      useNavigate();


    /*
    |--------------------------------------------------------------------------
    | DATOS
    |--------------------------------------------------------------------------
    */

    const [
      reclamo,
      setReclamo,
    ] = useState(null);

    const [
      seguimiento,
      setSeguimiento,
    ] = useState({
      visitas: [],
      verificaciones: [],
      actas: [],
      emplazamientos: [],
      infracciones: [],
    });


    const [
      cargando,
      setCargando,
    ] = useState(true);

        const [
      controlRegistrado,
      setControlRegistrado,
    ] = useState(null);

    const [
      puedeEditarControl,
      setPuedeEditarControl,
    ] = useState(false);

    const [
      minutosEdicion,
      setMinutosEdicion,
    ] = useState(0);

    const [
      editandoControl,
      setEditandoControl,
    ] = useState(false);


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
    | CONTROL
    |--------------------------------------------------------------------------
    */

    const [
      resultado,
      setResultado,
    ] = useState("");

    const [
      situacion,
      setSituacion,
    ] = useState("");

    const [
      observaciones,
      setObservaciones,
    ] = useState("");

    /*
    |--------------------------------------------------------------------------
    | PRÓRROGA
    |--------------------------------------------------------------------------
    */

    const [
      plazoCantidad,
      setPlazoCantidad,
    ] = useState(24);

    const [
      plazoUnidad,
      setPlazoUnidad,
    ] = useState("HORAS");

    const [
      motivoProrroga,
      setMotivoProrroga,
    ] = useState("");


    /*
    |--------------------------------------------------------------------------
    | INFRACCIÓN
    |--------------------------------------------------------------------------
    */

        const [
      cantidadFotosInfraccion,
      setCantidadFotosInfraccion,
    ] = useState(0);

    const [
      numeroActa,
      setNumeroActa,
    ] = useState("");

    const [
      motivoInfraccion,
      setMotivoInfraccion,
    ] = useState("");

    const [
      personaEncontrada,
      setPersonaEncontrada,
    ] = useState(false);

    const [
      apellido,
      setApellido,
    ] = useState("");

    const [
      nombre,
      setNombre,
    ] = useState("");

    const [
      dni,
      setDni,
    ] = useState("");

    const [
      domicilio,
      setDomicilio,
    ] = useState("");

    const [
      accionPosterior,
      setAccionPosterior,
    ] = useState("");

    const [
      detalleAccionPosterior,
      setDetalleAccionPosterior,
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
              respuestaReclamo,
              respuestaSeguimiento,
              respuestaControl,
            ] =
              await Promise.all([
                api.get(
                  `/reclamos/${id}`
                ),

                api.get(
                  `/seguimiento-reclamo/${id}`
                ),

                api.get(
                  `/verificaciones/segunda-visita/${id}`
                ),
              ]);
            const datosReclamo =
              respuestaReclamo.data
                ?.reclamo ||
              respuestaReclamo.data;


            const datosSeguimiento =
              respuestaSeguimiento
                .data || {};


            setReclamo(
              datosReclamo
            );


            setSeguimiento({
              visitas:
                datosSeguimiento
                  .visitas ||
                datosSeguimiento
                  .constataciones ||
                [],

              verificaciones:
                datosSeguimiento
                  .verificaciones ||
                [],

              actas:
                datosSeguimiento
                  .actas ||
                [],

              emplazamientos:
                datosSeguimiento
                  .emplazamientos ||
                [],

              infracciones:
                datosSeguimiento
                  .infracciones ||
                [],
            });
                        const datosControl =
              respuestaControl.data ||
              {};

            if (
              datosControl.realizada
            ) {
              setControlRegistrado(
                datosControl
              );

              setPuedeEditarControl(
                Boolean(
                  datosControl
                    .puedeEditar
                )
              );

              setMinutosEdicion(
                Number(
                  datosControl
                    .minutosRestantes ||
                    0
                )
              );
            } else {
              setControlRegistrado(
                null
              );

              setPuedeEditarControl(
                false
              );

              setMinutosEdicion(0);
            }
          } catch (err) {
            console.error(
              "Error cargando control:",
              err
            );

            setError(
              err.response?.data
                ?.mensaje ||
              "No se pudo cargar el control."
            );
          } finally {
            setCargando(false);
          }
        };


      cargar();
    }, [id]);


    /*
    |--------------------------------------------------------------------------
    | HELPERS DE ANTECEDENTES
    |--------------------------------------------------------------------------
    */

    const tipo =
      reclamo?.tipoReclamo ||
      reclamo?.TipoReclamo;


    const esVehiculo =
      useMemo(() => {
        const texto =
          (
            tipo?.nombre ||
            ""
          )
            .toLowerCase()
            .normalize("NFD")
            .replace(
              /[\u0300-\u036f]/g,
              ""
            );


        return (
          texto.includes(
            "vehiculo"
          ) ||
          texto.includes(
            "auto"
          ) ||
          texto.includes(
            "automotor"
          )
        );
      }, [tipo]);


    const visitasOrdenadas =
      useMemo(() => {
        return [
          ...seguimiento.visitas,
        ].sort(
          (a, b) =>
            Number(a.id) -
            Number(b.id)
        );
      }, [
        seguimiento.visitas,
      ]);


    const verificacionesOrdenadas =
      useMemo(() => {
        return [
          ...seguimiento
            .verificaciones,
        ].sort(
          (a, b) =>
            Number(a.id) -
            Number(b.id)
        );
      }, [
        seguimiento.verificaciones,
      ]);


    const emplazamientosOrdenados =
      useMemo(() => {
        return [
          ...seguimiento
            .emplazamientos,
        ].sort(
          (a, b) =>
            Number(a.id) -
            Number(b.id)
        );
      }, [
        seguimiento.emplazamientos,
      ]);


    const primeraVisita =
      visitasOrdenadas[0] ||
      null;


    const ultimaVerificacion =
      verificacionesOrdenadas
        .length
        ? verificacionesOrdenadas[
            verificacionesOrdenadas
              .length - 1
          ]
        : null;


    const ultimoEmplazamiento =
      emplazamientosOrdenados
        .length
        ? emplazamientosOrdenados[
            emplazamientosOrdenados
              .length - 1
          ]
        : null;


    const actaViaPublica =
      useMemo(() => {
        const actas =
          seguimiento.actas
            .filter(
              (acta) =>
                acta.tipo ===
                "VIA_PUBLICA"
            )
            .sort(
              (a, b) =>
                Number(b.id) -
                Number(a.id)
            );


        return (
          actas[0] ||
          null
        );
      }, [
        seguimiento.actas,
      ]);


      const latitudReclamo =
  Number(
    reclamo?.latitudDenunciada
  );

const longitudReclamo =
  Number(
    reclamo?.longitudDenunciada
  );

const tieneUbicacionReclamo =
  Number.isFinite(
    latitudReclamo
  ) &&
  Number.isFinite(
    longitudReclamo
  ) &&
  latitudReclamo !== 0 &&
  longitudReclamo !== 0;

    const descripcionOriginal =
      reclamo?.observaciones ||
      reclamo?.descripcion ||
      reclamo
        ?.ubicacionDescripcion ||
      primeraVisita?.situacion ||
      "Sin descripción adicional";


    const situacionAnterior =
      ultimaVerificacion
        ?.situacion ||
      primeraVisita
        ?.situacion ||
      actaViaPublica
        ?.situacion ||
      "No hay una descripción anterior registrada.";



          /*
    |--------------------------------------------------------------------------
    | EDITAR CONTROL REGISTRADO
    |--------------------------------------------------------------------------
    */

    const comenzarEdicion =
      () => {
        if (
          !controlRegistrado
            ?.verificacion ||
          !puedeEditarControl
        ) {
          return;
        }

        const verificacion =
          controlRegistrado
            .verificacion;

        const infraccion =
          controlRegistrado
            .infraccion;

        setResultado(
          verificacion.resultado ||
            ""
        );

        setSituacion(
          verificacion.situacion ||
            ""
        );

        setObservaciones(
          verificacion
            .observaciones ||
            ""
        );

       
        if (infraccion) {
          setNumeroActa(
            infraccion.numeroActa ||
              ""
          );

          setMotivoInfraccion(
            infraccion.motivo ||
              ""
          );

          setPersonaEncontrada(
            Boolean(
              infraccion
                .personaEncontrada
            )
          );

          setApellido(
            infraccion
              .apellidoInfractor ||
              ""
          );

          setNombre(
            infraccion
              .nombreInfractor ||
              ""
          );

          setDni(
            infraccion
              .dniInfractor ||
              ""
          );

          setDomicilio(
            infraccion
              .domicilioInfractor ||
              ""
          );

          setAccionPosterior(
            infraccion
              .accionPosterior ||
              ""
          );

          setDetalleAccionPosterior(
            infraccion
              .detalleAccionPosterior ||
              ""
          );
        }

        setEditandoControl(true);
        setError("");

        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      };


    const guardarEdicion =
      async () => {
        if (
          !situacion.trim()
        ) {
          setError(
            "Describí qué encontraste."
          );

          return;
        }

    

        try {
          setGuardando(true);
          setError("");

          const payload = {
            situacion:
              situacion.trim(),

            observaciones:
              observaciones
                .trim() ||
              null,

        
          };

          if (
            controlRegistrado
              ?.infraccion
          ) {
            payload.motivoInfraccion =
              motivoInfraccion
                .trim();

            payload.observacionesInfraccion =
              controlRegistrado
                .infraccion
                .observaciones ||
              null;

            payload.personaEncontrada =
              personaEncontrada;

            payload.apellidoInfractor =
              personaEncontrada
                ? apellido.trim() ||
                  null
                : null;

            payload.nombreInfractor =
              personaEncontrada
                ? nombre.trim() ||
                  null
                : null;

            payload.dniInfractor =
              personaEncontrada
                ? dni.trim() ||
                  null
                : null;

            payload.domicilioInfractor =
              personaEncontrada
                ? domicilio.trim() ||
                  null
                : null;
          }

          await api.put(
            `/verificaciones/segunda-visita/${id}`,
            payload
          );

          const respuesta =
            await api.get(
              `/verificaciones/segunda-visita/${id}`
            );

          setControlRegistrado(
            respuesta.data
          );

          setPuedeEditarControl(
            Boolean(
              respuesta.data
                ?.puedeEditar
            )
          );

          setMinutosEdicion(
            Number(
              respuesta.data
                ?.minutosRestantes ||
                0
            )
          );

          setEditandoControl(false);

          alert(
            "Control corregido correctamente."
          );

          window.scrollTo({
            top: 0,
            behavior: "smooth",
          });
        } catch (err) {
          console.error(
            "Error editando control:",
            err
          );

          setError(
            err.response?.data
              ?.mensaje ||
              "No se pudo corregir el control."
          );

          window.scrollTo({
            top: 0,
            behavior: "smooth",
          });
        } finally {
          setGuardando(false);
        }
      };
    


    /*
    |--------------------------------------------------------------------------
    | RESULTADO
    |--------------------------------------------------------------------------
    */

    const elegir = (
      valor
    ) => {
      setResultado(valor);
      setError("");


      if (
        valor !==
        "PRORROGA"
      ) {
        setMotivoProrroga(
          ""
        );
      }


      if (
        valor !==
        "NO_CUMPLIDO"
      ) {
        setNumeroActa("");
        setMotivoInfraccion("");
        setAccionPosterior("");
        setDetalleAccionPosterior(
          ""
        );
      }
    };


    /*
    |--------------------------------------------------------------------------
    | VALIDACIÓN
    |--------------------------------------------------------------------------
    */

    const validar = () => {
      if (!resultado) {
        return (
          "Indicá qué pasó en este control."
        );
      }


      if (
        !situacion.trim()
      ) {
        return (
          "Describí qué encontraste."
        );
      }


     

      if (
        resultado ===
        "PRORROGA"
      ) {
        if (
          !Number(
            plazoCantidad
          ) ||
          Number(
            plazoCantidad
          ) <= 0
        ) {
          return (
            "Ingresá el nuevo plazo."
          );
        }


        if (
          !motivoProrroga
            .trim()
        ) {
          return (
            "Indicá por qué se otorga más plazo."
          );
        }
      }


      if (
        resultado ===
        "NO_CUMPLIDO"
      ) {
        if (
          !numeroActa.trim()
        ) {
          return (
            "Ingresá el número del Acta de Infracción."
          );
        }


        if (
          !motivoInfraccion
            .trim()
        ) {
          return (
            "Indicá el motivo de la infracción."
          );
        }

        if (
  cantidadFotosInfraccion < 1
) {
  return (
    "Sacá una foto del Acta de Infracción."
  );
}
             


 if (
  esVehiculo &&
  ![
    "RETIRO_INMEDIATO",
    "BUSQUEDA_REMOCION",
  ].includes(
    accionPosterior
  )
) {
  return (
    "Indicá si el vehículo pudo retirarse."
  );
}

if (
  esVehiculo &&
  accionPosterior ===
    "BUSQUEDA_REMOCION" &&
  !detalleAccionPosterior.trim()
) {
  return (
    "Contá brevemente qué ocurrió y por qué no se pudo retirar el vehículo."
  );
}
      }


      return "";
    };


    /*
    |--------------------------------------------------------------------------
    | FINALIZAR
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


        try {
          setGuardando(true);
          setError("");


          const payload = {
            resultado,

            situacion:
              situacion.trim(),

            observaciones:
              observaciones
                .trim() ||
              null,

        
          };


          if (
            resultado ===
            "PRORROGA"
          ) {
            payload.plazoCantidad =
              Number(
                plazoCantidad
              );

            payload.plazoUnidad =
              plazoUnidad;

            payload.motivoProrroga =
              motivoProrroga
                .trim();
          }


          if (
            resultado ===
            "NO_CUMPLIDO"
          ) {
            payload.numeroActa =
              numeroActa
                .trim();

            payload.motivoInfraccion =
              motivoInfraccion
                .trim();

            payload.personaEncontrada =
              personaEncontrada;

            payload.apellidoInfractor =
              personaEncontrada
                ? apellido.trim() ||
                  null
                : null;

            payload.nombreInfractor =
              personaEncontrada
                ? nombre.trim() ||
                  null
                : null;

            payload.dniInfractor =
              personaEncontrada
                ? dni.trim() ||
                  null
                : null;

            payload.domicilioInfractor =
              personaEncontrada
                ? domicilio.trim() ||
                  null
                : null;

         payload.accionPosterior =
  esVehiculo
    ? accionPosterior
    : null;

payload.detalleAccionPosterior =
  esVehiculo
    ? (
        detalleAccionPosterior
          .trim() ||
        null
      )
    : null;
          }


          const respuesta =
            await api.post(
              `/verificaciones/segunda-visita/${id}`,
              payload
            );


          /*
          |--------------------------------------------------------------------------
          | RETIRO INMEDIATO
          |--------------------------------------------------------------------------
          |
          | NO volvemos a Mis Trabajos.
          | El mismo inspector sigue con:
          |
          | inventario
          | +
          | remoción
          |
          */


          if (
            accionPosterior ===
              "RETIRO_INMEDIATO" ||
            respuesta.data
              ?.continuarRemocion
          ) {
            const infraccionId =
              respuesta.data
                ?.infraccion
                ?.id;


            if (!infraccionId) {
              setError(
                "La infracción se registró, pero el sistema no devolvió su ID para continuar con la remoción."
              );

              return;
            }


            navigate(
              `/remocion/${id}?infraccionId=${infraccionId}`
            );

            return;
          }


          alert(
            respuesta.data
              ?.mensaje ||
            "Control registrado correctamente."
          );


          navigate(
            "/mis-trabajos"
          );
        } catch (err) {
          console.error(
            "Error guardando control:",
            err
          );


          setError(
            err.response?.data
              ?.mensaje ||
            "No se pudo guardar el control."
          );


          window.scrollTo({
            top: 0,
            behavior: "smooth",
          });
        } finally {
          setGuardando(false);
        }
      };


    /*
    |--------------------------------------------------------------------------
    | CARGANDO
    |--------------------------------------------------------------------------
    */

    if (cargando) {
      return (
        <div className="segunda-visita-page">
          Cargando control...
        </div>
      );
    }


    if (!reclamo) {
      return (
        <div className="segunda-visita-page">

          <div className="segunda-error">
            {error ||
              "Reclamo no encontrado"}
          </div>

        </div>
      );
    }


    /*
    |--------------------------------------------------------------------------
    | RENDER
    |--------------------------------------------------------------------------
    */

    return (
      <div className="segunda-visita-page">

        <header className="segunda-header">

          <button
            type="button"
            className="segunda-volver"
            onClick={() =>
              navigate(
                "/mis-trabajos"
              )
            }
          >
            ← Volver
          </button>


          <div>
            <span className="segunda-etiqueta">
              CONTROL DEL INSPECTOR
            </span>
<h1>
  {controlRegistrado
    ? editandoControl
      ? "Corregir control"
      : "Control realizado"
    : "Nuevo control"}
</h1>

           <p>
  {controlRegistrado
    ? editandoControl
      ? "Podés corregir los datos registrados. El resultado del control no puede modificarse."
      : "Este control ya fue realizado. Abajo podés consultar lo que registró el inspector."
    : "Primero revisá por qué se originó el reclamo y qué actuaciones se hicieron."}
</p>
          </div>

        </header>


        {error && (
          <div className="segunda-error">
            {error}
          </div>
        )}


        {/* ==========================================================
            POR QUÉ ESTÁS ACÁ
        ========================================================== */}

        <section className="control-contexto">

          <div className="control-contexto-titulo">
            <span>
              ANTES DE EMPEZAR
            </span>

            <h2>
              ¿Por qué estás acá?
            </h2>

            <p>
              Estos son los antecedentes
              que tenés que conocer antes
              de realizar el control.
            </p>
          </div>


          <div className="control-dato-principal">

            <span>
              MOTIVO DEL RECLAMO
            </span>

            <strong>
              {tipo?.nombre ||
                "Sin tipo"}
            </strong>

            <p>
              {descripcionOriginal}
            </p>

          </div>


          <div className="control-datos-grid">

            <div>
              <span>
                Reclamo
              </span>

              <strong>
                #
                {reclamo.numeroReclamo ||
                  reclamo.id}
              </strong>
            </div>


            <div>
              <span>
                Dirección
              </span>

              <strong>
                {reclamo.direccion ||
                  "Sin dirección"}
              </strong>

              {reclamo.barrio && (
                <small>
                  {reclamo.barrio}
                </small>
              )}
            </div>


            <div>
              <span>
                Acta de Vía Pública
              </span>

              <strong>
                {actaViaPublica
                  ?.numeroActa ||
                  "—"}
              </strong>
            </div>


            <div>
              <span>
                Último vencimiento
              </span>

              <strong>
                {ultimoEmplazamiento
                  ? formatearFecha(
                      ultimoEmplazamiento
                        .fechaVencimiento
                    )
                  : "—"}
              </strong>
            </div>

          </div>


          <div className="control-situacion-anterior">

            <span>
              QUÉ SE ENCONTRÓ ANTERIORMENTE
            </span>

            <p>
              {situacionAnterior}
            </p>

          </div>


<div className="control-ubicacion-reclamo">

  <div className="control-ubicacion-cabecera">
    <span>
      📍 LUGAR DEL RECLAMO
    </span>

    <strong>
      {reclamo.direccion ||
        "Sin dirección registrada"}
    </strong>

    {reclamo.barrio && (
      <small>
        Barrio: {reclamo.barrio}
      </small>
    )}

    {reclamo.referencia && (
      <small>
        Referencia:{" "}
        {reclamo.referencia}
      </small>
    )}
  </div>

  {tieneUbicacionReclamo ? (
    <div className="control-mapa-reclamo">
      <MapContainer
        center={[
          latitudReclamo,
          longitudReclamo,
        ]}
        zoom={17}
        scrollWheelZoom={false}
        style={{
          width: "100%",
          height: "100%",
        }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker
          position={[
            latitudReclamo,
            longitudReclamo,
          ]}
        >
          <Popup>
            <strong>
              {reclamo.direccion ||
                "Lugar del reclamo"}
            </strong>

            {reclamo.referencia && (
              <>
                <br />
                {reclamo.referencia}
              </>
            )}
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  ) : (
    <div className="control-mapa-sin-ubicacion">
      No hay una ubicación GPS
      registrada para este reclamo.
    </div>
  )}

</div>

          {/* HISTORIAL DE PLAZOS */}

          {emplazamientosOrdenados
            .length > 0 && (
            <div className="control-historial">

              <h3>
                Historial de plazos
              </h3>


              {emplazamientosOrdenados.map(
                (
                  emplazamiento,
                  index
                ) => (
                  <div
                    className="control-historial-fila"
                    key={
                      emplazamiento.id
                    }
                  >

                    <div className="control-historial-numero">
                      {index + 1}
                    </div>


                    <div>
                      <strong>
                        {emplazamiento
                          .esProrroga
                          ? "Prórroga"
                          : "Emplazamiento"}
                      </strong>

                      <p>
                        {emplazamiento
                          .plazoCantidad
                          ? `${emplazamiento.plazoCantidad} ${
                              emplazamiento.plazoUnidad ===
                              "DIAS"
                                ? "días"
                                : "horas"
                            }`
                          : emplazamiento
                              .plazoHoras
                            ? `${emplazamiento.plazoHoras} horas`
                            : "Plazo registrado"}
                      </p>

                      <small>
                        Vencimiento:{" "}
                        {formatearFecha(
                          emplazamiento
                            .fechaVencimiento
                        )}
                      </small>

                      {emplazamiento
                        .observaciones && (
                        <p className="control-historial-observacion">
                          {
                            emplazamiento
                              .observaciones
                          }
                        </p>
                      )}
                    </div>

                  </div>
                )
              )}

            </div>
          )}

        </section>


      {controlRegistrado &&
  !editandoControl && (
    <section className="control-finalizado">

      <div className="control-finalizado-cabecera">
        <span className="control-finalizado-etiqueta">
          ✓ CONTROL FINALIZADO
        </span>

        <h2>
          Control registrado
        </h2>

        <p>
          Este control ya fue realizado.
          No se puede registrar nuevamente.
        </p>
      </div>


      <div className="control-finalizado-resumen">

        <div>
          <span>
            RESULTADO
          </span>

          <strong>
            {nombreResultado(
              controlRegistrado
                .verificacion
                ?.resultado
            )}
          </strong>
        </div>

        <div>
          <span>
            REGISTRADO
          </span>

          <strong>
            {formatearFecha(
              controlRegistrado
                .verificacion
                ?.createdAt
            )}
          </strong>
        </div>

      </div>


      {controlRegistrado
        .verificacion
        ?.situacion && (
        <div className="control-finalizado-bloque">
          <span className="control-finalizado-label">
            QUÉ ENCONTRÓ
          </span>

          <p>
            {
              controlRegistrado
                .verificacion
                .situacion
            }
          </p>
        </div>
      )}


      {controlRegistrado
        .verificacion
        ?.observaciones && (
        <div className="control-finalizado-bloque">
          <span className="control-finalizado-label">
            OBSERVACIONES
          </span>

          <p>
            {
              controlRegistrado
                .verificacion
                .observaciones
            }
          </p>
        </div>
      )}





      {controlRegistrado
        .infraccion && (
        <div className="control-finalizado-infraccion">

          <span className="control-finalizado-label control-finalizado-label-rojo">
            ACTA DE INFRACCIÓN
          </span>

          <h3>
            N.º{" "}
            {
              controlRegistrado
                .infraccion
                .numeroActa
            }
          </h3>

          {controlRegistrado
            .infraccion
            .motivo && (
            <p>
              {
                controlRegistrado
                  .infraccion
                  .motivo
              }
            </p>
          )}

          <div className="control-finalizado-foto-acta">
            <span className="control-finalizado-label">
              📷 FOTO DEL ACTA DE INFRACCIÓN
            </span>

          <FotosReclamo
  reclamoId={reclamo.id}
  tipoReferencia="INFRACCION"
  referenciaId={
    controlRegistrado
      .infraccion
      .id
  }
  permitirSubir={false}
/>
          </div>

        </div>
      )}


      {puedeEditarControl ? (
        <div className="control-finalizado-edicion">

          <div>
            <strong>
              ✏️ Todavía podés corregir este control
            </strong>

            <p>
              Tenés aproximadamente{" "}
              <strong>
                {minutosEdicion} min
              </strong>{" "}
              para corregir los datos cargados.
            </p>
          </div>

          <button
            type="button"
            className="control-finalizado-editar"
            onClick={
              comenzarEdicion
            }
          >
            ✏️ Corregir datos
          </button>

        </div>
      ) : (
        <div className="control-finalizado-cerrado">

          <strong>
            🔒 Edición cerrada
          </strong>

          <p>
            Ya pasó el plazo de 1 hora
            para corregir este control.
          </p>

        </div>
      )}

    </section>
  )}

        {/* ==========================================================
            PREGUNTA PRINCIPAL
        ========================================================== */}
        {(!controlRegistrado ||
          editandoControl) && (
          <>

                  {!editandoControl && (
        <section className="segunda-pregunta">

          <span className="segunda-etiqueta">
            CONTROL ACTUAL
          </span>

          <h2>
            ¿Qué pasó cuando llegaste?
          </h2>

          <p>
            Marcá exactamente lo que
            encontraste en esta visita.
          </p>


          <div className="control-opciones">

            <button
              type="button"
              className={
                resultado ===
                "CUMPLIDO"
                  ? "control-opcion seleccionado"
                  : "control-opcion"
              }
              onClick={() =>
                elegir(
                  "CUMPLIDO"
                )
              }
            >
              <strong>
                ✅ Ya está solucionado
              </strong>

              <span>
                Cumplió con lo solicitado.
              </span>
            </button>


            <button
              type="button"
              className={
                resultado ===
                "PRORROGA"
                  ? "control-opcion seleccionado"
                  : "control-opcion"
              }
              onClick={() =>
                elegir(
                  "PRORROGA"
                )
              }
            >
              <strong>
                ⏱ Dar más plazo
              </strong>

              <span>
                Se puede otorgar otra
                prórroga y volver a
                controlar más adelante.
              </span>
            </button>


            <button
              type="button"
           className={
  resultado === "NO_CUMPLIDO"
    ? "control-opcion control-opcion-infraccion seleccionado"
    : "control-opcion control-opcion-infraccion"
}
              onClick={() =>
                elegir(
                  "NO_CUMPLIDO"
                )
              }
            >
              <strong>
                📝 Hacer Acta de Infracción
              </strong>

              <span>
                No cumplió con lo solicitado.
              </span>
            </button>


            <button
              type="button"
              className={
                resultado ===
                "NO_SE_ENCUENTRA"
                  ? "control-opcion seleccionado"
                  : "control-opcion"
              }
              onClick={() =>
                elegir(
                  "NO_SE_ENCUENTRA"
                )
              }
            >
              <strong>
                🔍 No encontré la situación
              </strong>

              <span>
                No se encontró lo denunciado.
              </span>
            </button>


         

          </div>

        </section>

        )}
                {editandoControl && (
          <section className="segunda-pregunta">

            <span className="segunda-etiqueta">
              CORRECCIÓN DEL CONTROL
            </span>

            <h2>
              {nombreResultado(
                resultado
              )}
            </h2>

            <p>
              El resultado original no
              puede modificarse. Solo
              podés corregir los datos
              registrados.
            </p>

          </section>
        )}
        {resultado && (
          <>

            <section className="segunda-seccion">

              <h2>
                ¿Qué encontraste?
              </h2>

              <textarea
                value={situacion}
                onChange={(e) =>
                  setSituacion(
                    e.target.value
                  )
                }
                rows={4}
                placeholder="Describí exactamente cómo estaba la situación cuando llegaste."
              />

            </section>


          


         

          </>
        )}


        {/* ==========================================================
            PRÓRROGA
        ========================================================== */}

        {resultado ===
          "PRORROGA" &&
          !editandoControl && (
          <section className="segunda-prorroga">

            <span className="bloque-etiqueta">
              NUEVO PLAZO
            </span>

            <h2>
              ¿Cuánto tiempo más?
            </h2>

            <p>
              Podés otorgar otra prórroga.
              El plazo anterior queda
              guardado en el expediente.
            </p>


            <div className="plazos-rapidos">

              {[
                12,
                24,
                48,
                72,
              ].map(
                (horas) => (
                  <button
                    key={horas}
                    type="button"
                    onClick={() => {
                      setPlazoCantidad(
                        horas
                      );

                      setPlazoUnidad(
                        "HORAS"
                      );
                    }}
                  >
                    {horas} hs
                  </button>
                )
              )}

            </div>


            <div className="plazo-personalizado">

              <div>
                <label>
                  Cantidad
                </label>

                <input
                  type="number"
                  min="1"
                  value={
                    plazoCantidad
                  }
                  onChange={(e) =>
                    setPlazoCantidad(
                      e.target.value
                    )
                  }
                />
              </div>


              <div>
                <label>
                  Unidad
                </label>

                <select
                  value={
                    plazoUnidad
                  }
                  onChange={(e) =>
                    setPlazoUnidad(
                      e.target.value
                    )
                  }
                >
                  <option value="HORAS">
                    Horas
                  </option>

                  <option value="DIAS">
                    Días
                  </option>
                </select>
              </div>

            </div>


            <label>
              ¿Por qué se le da más plazo? *
            </label>

            <textarea
              value={
                motivoProrroga
              }
              onChange={(e) =>
                setMotivoProrroga(
                  e.target.value
                )
              }
              rows={4}
              placeholder="Ej.: el propietario manifestó que necesita 48 horas más para retirar el vehículo."
            />

          </section>
        )}


        {/* ==========================================================
            INFRACCIÓN
        ========================================================== */}

        {resultado ===
          "NO_CUMPLIDO" && (
          <section className="segunda-infraccion">

            <span className="bloque-etiqueta">
              ACTA DE INFRACCIÓN
            </span>

            <h2>
              Cargar el acta realizada
            </h2>


            <label>
              Número del Acta *
            </label>

            <input
              value={
                numeroActa
              }
              onChange={(e) =>
                setNumeroActa(
                  e.target.value
                )
              }
              disabled={editandoControl}
              placeholder="Ej.: A 00020123"
            />


            <label>
              Motivo de la infracción *
            </label>

            <textarea
              value={
                motivoInfraccion
              }
              onChange={(e) =>
                setMotivoInfraccion(
                  e.target.value
                )
              }
              rows={4}
              placeholder="Ej.: No dio cumplimiento al emplazamiento realizado."
            />

           <div
  style={{
    marginTop: "20px",
    marginBottom: "20px",
  }}
>
  <h3>
    Foto del Acta de Infracción
  </h3>

  <p>
    Sacá una foto clara del acta
    realizada.
  </p>

<FotosReclamo
  reclamoId={reclamo.id}
  tipoReferencia="INFRACCION"
  descripcion="Foto del Acta de Infracción"
  permitirSubir={!editandoControl}
  onCantidadFotosChange={
    setCantidadFotosInfraccion
  }
  maxFotos={1}
/>
</div>
            <div className="persona-pregunta">

              <strong>
                ¿Había una persona para identificar?
              </strong>

              <div className="persona-botones">

                <button
                  type="button"
                  className={
                    personaEncontrada
                      ? "seleccionado"
                      : ""
                  }
                  onClick={() =>
                    setPersonaEncontrada(
                      true
                    )
                  }
                >
                  Sí
                </button>


                <button
                  type="button"
                  className={
                    !personaEncontrada
                      ? "seleccionado"
                      : ""
                  }
                  onClick={() => {
                    setPersonaEncontrada(
                      false
                    );

                    setApellido("");
                    setNombre("");
                    setDni("");
                    setDomicilio("");
                  }}
                >
                  No
                </button>

              </div>

            </div>


            {personaEncontrada && (
              <div className="datos-persona">

                <div>
                  <label>
                    Apellido
                  </label>

                  <input
                    value={
                      apellido
                    }
                    onChange={(e) =>
                      setApellido(
                        e.target.value
                      )
                    }
                  />
                </div>


                <div>
                  <label>
                    Nombre
                  </label>

                  <input
                    value={
                      nombre
                    }
                    onChange={(e) =>
                      setNombre(
                        e.target.value
                      )
                    }
                  />
                </div>


                <div>
                  <label>
                    DNI
                  </label>

                  <input
                    value={
                      dni
                    }
                    onChange={(e) =>
                      setDni(
                        e.target.value
                      )
                    }
                  />
                </div>


                <div>
                  <label>
                    Domicilio
                  </label>

                  <input
                    value={
                      domicilio
                    }
                    onChange={(e) =>
                      setDomicilio(
                        e.target.value
                      )
                    }
                  />
                </div>

              </div>
            )}

{esVehiculo &&
  !editandoControl && (
    <div className="accion-posterior">

      <h3>
        ¿Se pudo retirar el vehículo?
      </h3>

      <p>
        Indicá qué ocurrió después de
        realizar el Acta de Infracción.
      </p>

      <button
        type="button"
        className={
          accionPosterior ===
          "RETIRO_INMEDIATO"
            ? "seleccionado retiro"
            : "retiro"
        }
        onClick={() => {
          setAccionPosterior(
            "RETIRO_INMEDIATO"
          );

          setDetalleAccionPosterior(
            ""
          );
        }}
      >
        <strong>
          🚛 Sí — se realizará la
          remoción ahora
        </strong>

        <span>
          Se continúa directamente con
          el inventario y la remoción
          del vehículo.
        </span>
      </button>


      <button
        type="button"
        className={
          accionPosterior ===
          "BUSQUEDA_REMOCION"
            ? "seleccionado"
            : ""
        }
        onClick={() =>
          setAccionPosterior(
            "BUSQUEDA_REMOCION"
          )
        }
      >
        <strong>
          ⚠️ No — se necesita orden
          del Juzgado
        </strong>

        <span>
          No fue posible retirar el
          vehículo. Secretaría enviará
          igualmente el Acta de
          Infracción por la multa y
          solicitará la orden judicial
          para poder retirarlo.
        </span>
      </button>


      {accionPosterior ===
        "BUSQUEDA_REMOCION" && (
        <>
          <label>
            Contá brevemente qué
            ocurrió *
          </label>

          <textarea
            value={
              detalleAccionPosterior
            }
            onChange={(e) =>
              setDetalleAccionPosterior(
                e.target.value
              )
            }
            rows={4}
            placeholder="Ej.: El propietario y familiares se opusieron al retiro del vehículo."
          />

          <div className="segunda-aviso">
            <strong>
              Tu trabajo termina acá
            </strong>

            <p>
              El Acta de Infracción
              pasará a Secretaría para
              enviarla al Juzgado por
              la multa. Además, se
              solicitará la orden
              judicial necesaria para
              retirar el vehículo.
            </p>
          </div>
        </>
      )}

    </div>
)}

{!esVehiculo && (
  <div className="segunda-aviso">

    <strong>
      Después de registrar el acta
    </strong>

    <p>
      Tu trabajo termina acá.
      Secretaría continuará el trámite
      de la infracción con el Juzgado.
      El reclamo seguirá abierto hasta
      que se confirme que el problema
      fue solucionado.
    </p>

  </div>
)}
          </section>
        )}


        {resultado && (
          <section className="segunda-seccion">

            <label>
              Observaciones generales
            </label>

            <textarea
              value={
                observaciones
              }
              onChange={(e) =>
                setObservaciones(
                  e.target.value
                )
              }
              rows={3}
            />

          </section>
        )}


        {resultado && (
          <div className="segunda-final">

            <button
              type="button"
              className="boton-finalizar"
              disabled={
                guardando
              }
           onClick={
  editandoControl
    ? guardarEdicion
    : finalizar
}
            >
       {guardando
  ? "Guardando..."
  : editandoControl
    ? "Guardar corrección"
    : accionPosterior ===
        "RETIRO_INMEDIATO"
      ? "Registrar infracción y continuar al retiro →"
      : resultado ===
          "PRORROGA"
        ? "Finalizar y otorgar nuevo plazo"
        : resultado ===
            "NO_CUMPLIDO"
          ? "Registrar Acta de Infracción"
          : "Finalizar control"}
            </button>

          </div>
        )}
          </>
        )}
      </div>
    );
  };


  export default SegundaVisitaPage;