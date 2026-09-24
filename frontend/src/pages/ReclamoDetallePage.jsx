    import {
      useCallback,
      useEffect,
      useMemo,
      useState,
    } from "react";

    import {
      useNavigate,
      useParams,
    } from "react-router-dom";

    import {
      useAuth,
    } from "../context/AuthContext";
    import {
      CircleMarker,
      MapContainer,
      Popup,
      TileLayer,
      useMap,
    } from "react-leaflet";

    import L from "leaflet";

    import api from "../api/api";

  import AsignacionReclamo from "../components/AsignacionReclamo";
  import HistorialReclamo from "../components/HistorialReclamo";
  import FotosReclamo from "../components/FotosReclamo";
  import ReclamoForm from "../components/ReclamoForm";

    import "leaflet/dist/leaflet.css";
    import "./ReclamoDetallePage.css";


    /* =========================================================
      TEXTOS
    ========================================================= */

    const nombresEstado = {
      NUEVO: "Nuevo",
      ASIGNADO_GUARDIA: "Asignado a guardia",
      ASIGNADO_INSPECTOR: "Asignado a inspector",
      EN_INSPECCION: "En inspección",
      EN_SEGUIMIENTO: "En seguimiento",
      PENDIENTE_ACTUACION: "Pendiente de actuación",
      RESUELTO: "Resuelto",
      ANULADO: "Anulado",
    };

    const nombresEtapaActual = {
      PENDIENTE_ASIGNACION_GUARDIA:
        "Sin asignar",

      PENDIENTE_PRIMERA_VISITA:
        "Esperando primera visita",

      PRIMERA_VISITA:
        "Primera visita asignada",

      ESPERANDO_PLAZO:
        "Esperando vencimiento",

      ESPERANDO_RESOLUCION:
      "Esperando resolución del problema",

      PENDIENTE_SEGUNDA_VISITA:
        "Pendiente de nuevo control",

      SEGUNDA_VISITA:
        "Control asignado",

      PENDIENTE_DECISION_JEFE:
        "Pendiente de decisión",

      PENDIENTE_ENVIO_JUZGADO:
        "Pendiente de enviar al Juzgado",

      EN_JUZGADO:
        "Esperando respuesta del Juzgado",

      PENDIENTE_INGRESO_PREDIO:
        "En traslado al predio",

      EN_PREDIO:
        "Recibido en predio",

      FINALIZADO:
        "Finalizado",

      ANULADO:
        "Anulado",
    };

    const nombresEstadoVehiculo = {
      EN_VIA_PUBLICA:
        "En la vía pública",

      EMPLAZADO:
        "Emplazado en la vía pública",

      PENDIENTE_REMOCION:
        "Pendiente de retiro",

      REMOVIDO:
        "Retirado",

      PENDIENTE_INGRESO_PREDIO:
        "Retirado · falta registrar ingreso",

      EN_PREDIO:
        "Guardado en el predio",

      EGRESADO:
        "Ya salió del predio",
    };


    const nombresResultadoPrimera = {
      CONSTATADO:
        "El problema continúa",

      NO_CONSTATADO:
        "No encontró lo denunciado",

      RESUELTO_EN_LUGAR:
        "Ya estaba solucionado",

      NO_SE_PUDO_VERIFICAR:
        "No se pudo verificar",

      OTRO:
        "Otra situación",
    };


    const nombresResultadoControl = {
      CUMPLIDO:
        "Cumplió",

      PRORROGA:
        "Se otorgó una prórroga",

      NO_CUMPLIDO:
        "No cumplió",

      NO_SE_ENCUENTRA:
        "Ya no se encuentra",

      NO_SE_PUDO_VERIFICAR:
        "No se pudo verificar",

      PARCIAL:
        "Cumplimiento parcial",

      OTRO:
        "Otra situación",
    };


    const nombresJuzgado = {
      PENDIENTE_ENVIO:
        "Pendiente de envío",

      ENVIADO:
        "Esperando respuesta",

      AUTORIZADO:
        "Autorizado",

      NO_AUTORIZADO:
        "No autorizado",

      OTRO:
        "Respuesta registrada",
    };


    const nombresEgreso = {
      ENTREGADO:
        "Entregado al responsable",

      TRASLADADO:
        "Trasladado a otro lugar",

      COMPACTADO:
        "Compactado",

      OTRO:
        "Otra salida",
    };


    /* =========================================================
      HELPERS
    ========================================================= */

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
        return String(fecha);
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


    const nombreUsuario = (
      usuario
    ) => {
      if (!usuario) {
        return "—";
      }

      return (
        usuario.nombre ||
        usuario.usuario ||
        "—"
      );
    };


    const ordenarPorFecha =
      (items = []) =>
        [...items].sort(
          (a, b) =>
            new Date(
              a.fechaHora ||
              a.createdAt ||
              0
            ).getTime() -
            new Date(
              b.fechaHora ||
              b.createdAt ||
              0
            ).getTime()
        );


    const obtenerUltimo =
      (items = []) => {
        const ordenados =
          ordenarPorFecha(items);

        return (
          ordenados[
            ordenados.length - 1
          ] ||
          null
        );
      };


    const esDestinoGranja = (
      destino
    ) => {
      const texto =
        String(destino || "")
          .toLowerCase();

      return (
        texto.includes("amalia") ||
        texto.includes("granja")
      );
    };





    const formatearClaveInventario = (
      clave
    ) =>
      String(clave || "")
        .replace(/_/g, " ")
        .replace(
          /([a-z])([A-Z])/g,
          "$1 $2"
        )
        .replace(
          /\b\w/g,
          (letra) =>
            letra.toUpperCase()
        );

      const limpiarObservacionesInventario = (texto) => {
    if (!texto) return "";

    return String(texto)
      // Elimina: GPS remoción: -33.123, -66.123
      .replace(
        /GPS\s+remoci[oó]n\s*:\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\.?/gi,
        ""
      )

      // Elimina: Precisión aproximada: 157 m.
      .replace(
        /Precisi[oó]n\s+aproximada\s*:\s*\d+(?:[.,]\d+)?\s*m\.?/gi,
        ""
      )

      // Limpieza final
      .replace(/\s{2,}/g, " ")
      .trim();
  };
    const aItemsInventario = (
      detalle
    ) => {
      if (
        detalle === null ||
        detalle === undefined ||
        detalle === ""
      ) {
        return [];
      }




      /*
      ==========================================================
      SI VIENE COMO TEXTO JSON, LO CONVERTIMOS A OBJETO
      ==========================================================
      */

      let detalleProcesado =
        detalle;

      if (
        typeof detalleProcesado ===
        "string"
      ) {
        let texto =
          detalleProcesado.trim();

        /*
        Puede venir incluso
        doblemente convertido a JSON.
        Probamos hasta 2 veces.
        */

        for (
          let intento = 0;
          intento < 2;
          intento += 1
        ) {
          if (
            typeof texto !==
            "string"
          ) {
            break;
          }

          const pareceJson =
            (
              texto.startsWith(
                "{"
              ) &&
              texto.endsWith(
                "}"
              )
            ) ||
            (
              texto.startsWith(
                "["
              ) &&
              texto.endsWith(
                "]"
              )
            );

          if (!pareceJson) {
            break;
          }

          try {
            texto =
              JSON.parse(
                texto
              );
          } catch {
            break;
          }
        }

        detalleProcesado =
          texto;
      }

      /*
      ==========================================================
      ARRAY
      ==========================================================
      */

      if (
        Array.isArray(
          detalleProcesado
        )
      ) {
        return detalleProcesado.map(
          (
            valor,
            index
          ) => ({
            clave:
              `Ítem ${index + 1}`,

            valor,
          })
        );
      }

      /*
      ==========================================================
      SI SIGUE SIENDO TEXTO
      ==========================================================
      */

      if (
        typeof detalleProcesado !==
          "object" ||
        detalleProcesado === null
      ) {
        return [
          {
            clave:
              "Detalle",

            valor:
              detalleProcesado,
          },
        ];
      }

      /*
      ==========================================================
      OBJETO NORMAL
      ==========================================================
      */

      const resultado = [];

      const recorrer = (
        objeto,
        prefijo = ""
      ) => {
        Object.entries(
          objeto
        ).forEach(
          ([clave, valor]) => {
            const nombre =
              prefijo
                ? `${prefijo} · ${formatearClaveInventario(
                    clave
                  )}`
                : formatearClaveInventario(
                    clave
                  );

            if (
              valor &&
              typeof valor ===
                "object" &&
              !Array.isArray(
                valor
              )
            ) {
              recorrer(
                valor,
                nombre
              );

              return;
            }

            resultado.push({
              clave:
                nombre,

              valor,
            });
          }
        );
      };

      recorrer(
        detalleProcesado
      );

      return resultado;
    };

    const textoValorInventario = (
      valor
    ) => {
      if (
        valor === true ||
        valor === "true"
      ) {
        return "✓ Marcado";
      }

      if (
        valor === false ||
        valor === "false"
      ) {
        return "Sin marcar";
      }

      if (
        valor === null ||
        valor === undefined ||
        valor === ""
      ) {
        return "—";
      }

      if (
        Array.isArray(valor)
      ) {
        return valor.join(
          ", "
        );
      }

      const texto =
        String(valor)
          .trim()
          .toUpperCase();

      switch (texto) {
        case "PRESENTE":
          return "✓ PRESENTE";

        case "FALTANTE":
          return "✕ FALTANTE";

        case "DAÑADO":
        case "DANADO":
          return "⚠ DAÑADO";

        case "BUENO":
          return "✓ BUENO";

        case "REGULAR":
          return "⚠ REGULAR";

        case "MALO":
          return "✕ MALO";

        default:
          return String(
            valor
          );
      }
    };


    /* =========================================================
      MAPA
    ========================================================= */

    const AjustarMapa = ({
      puntos,
    }) => {
      const map =
        useMap();

      useEffect(() => {
        if (!puntos.length) {
          return;
        }

        if (
          puntos.length === 1
        ) {
          map.setView(
            puntos[0],
            17
          );

          return;
        }

        const bounds =
          L.latLngBounds(
            puntos
          );

        map.fitBounds(
          bounds,
          {
            padding: [
              35,
              35,
            ],

            maxZoom:
              18,
          }
        );
      }, [
        map,
        puntos,
      ]);

      return null;
    };


    /* =========================================================
      PAGE
    ========================================================= */

    const ReclamoDetallePage =
      () => {
        const { id } =
          useParams();

        const navigate =
          useNavigate();

          const {
      rol,
    } = useAuth();


        const [
          reclamo,
          setReclamo,
        ] = useState(null);


        const [
          seguimiento,
          setSeguimiento,
        ] = useState({
          responsables: {},

          visitas: [],

          actas: [],

          emplazamientos: [],

          verificaciones: [],

          infracciones: [],

          asignaciones: [],

          vehiculos: [],

          remociones: [],

          ingresosPredio: [],

          egresosPredio: [],

          inventarios: [],
        });


        const [
          cargando,
          setCargando,
        ] = useState(true);


        const [
          error,
          setError,
        ] = useState("");

        const [
    mostrarEditarReclamo,
    setMostrarEditarReclamo,
  ] = useState(false);


        const [
          inventarioAbierto,
          setInventarioAbierto,
        ] = useState(null);



        const [
      mostrarResolucion,
      setMostrarResolucion,
    ] = useState(false);

    const [
      resueltoPor,
      setResueltoPor,
    ] = useState("");

    const [
      detalleResolucion,
      setDetalleResolucion,
    ] = useState("");

    const [
      costoEstado,
      setCostoEstado,
    ] = useState(
      "NO_INFORMADO"
    );

    const [
      costoMunicipal,
      setCostoMunicipal,
    ] = useState("");

    const [
      guardandoResolucion,
      setGuardandoResolucion,
    ] = useState(false);

    const [
      errorResolucion,
      setErrorResolucion,
    ] = useState("");


        /* =====================================================
          CARGAR
        ===================================================== */

        const cargarReclamo =
          useCallback(
            async () => {
              try {
                setCargando(true);

                setError("");

                const [
                  respuestaReclamo,
                  respuestaSeguimiento,
                ] =
                  await Promise.all([
                    api.get(
                      `/reclamos/${id}`
                    ),

                    api.get(
                      `/seguimiento-reclamo/${id}`
                    ),
                  ]);

                const datosReclamo =
                  respuestaReclamo
                    .data
                    ?.reclamo ||
                  respuestaReclamo
                    .data;

                const datosSeguimiento =
                  respuestaSeguimiento
                    .data ||
                  {};

                setReclamo(
                  datosReclamo
                );

                setSeguimiento({
                  responsables:
                    datosSeguimiento
                      .responsables ||
                    {},

                  visitas:
                    datosSeguimiento
                      .visitas ||
                    [],

                  actas:
                    datosSeguimiento
                      .actas ||
                    [],

                  emplazamientos:
                    datosSeguimiento
                      .emplazamientos ||
                    [],

                  verificaciones:
                    datosSeguimiento
                      .verificaciones ||
                    [],

                  infracciones:
                    datosSeguimiento
                      .infracciones ||
                    [],

                  asignaciones:
                    datosSeguimiento
                      .asignaciones ||
                    [],

                  vehiculos:
                    datosSeguimiento
                      .vehiculos ||
                    [],

                  remociones:
                    datosSeguimiento
                      .remociones ||
                    [],

                  ingresosPredio:
                    datosSeguimiento
                      .ingresosPredio ||
                    [],

                  egresosPredio:
                    datosSeguimiento
                      .egresosPredio ||
                    [],

                  inventarios:
                    datosSeguimiento
                      .inventarios ||
                    [],
                });
              } catch (err) {
                console.error(
                  "Error cargando reclamo:",
                  err
                );

                setError(
                  err.response
                    ?.data
                    ?.mensaje ||
                  "No se pudo cargar el reclamo"
                );
              } finally {
                setCargando(
                  false
                );
              }
            },
            [
              id,
            ]
          );


        useEffect(() => {
          cargarReclamo();
        }, [
          cargarReclamo,
        ]);


        /* =====================================================
          DATOS GENERALES
        ===================================================== */

        const tipo =
          reclamo
            ? (
                reclamo.TipoReclamo ||
                reclamo.tipoReclamo
              )
            : null;


        const jefeActual =
          seguimiento
            .responsables
            ?.jefeGuardia ||
          reclamo
            ?.jefeGuardia ||
          reclamo
            ?.JefeGuardia ||
          null;




        const inspectorActual =
          seguimiento
            .responsables
            ?.inspector ||
          reclamo
            ?.inspector ||
          reclamo
            ?.Inspector ||
          null;


          const puedeResolverProblema =
      (
        rol === "director" ||
        rol === "administrador"
      ) &&
    reclamo?.etapaActual ===
      "ESPERANDO_RESOLUCION" &&
      reclamo?.estado !==
        "RESUELTO";

        const puedeEditarReclamo =
    (
      rol === "administrador" ||
      rol === "secretaria_reclamos"
    ) &&
    reclamo?.etapaActual ===
      "PENDIENTE_ASIGNACION_GUARDIA";

        /* =====================================================
          RESUMEN RÁPIDO
        ===================================================== */

        const resumen =
          useMemo(() => {
            const vehiculo =
              seguimiento
                .vehiculos?.[0] ||
              null;

            const remocionesVehiculo =
              vehiculo
                ? seguimiento
                    .remociones
                    .filter(
                      (item) =>
                        Number(
                          item.vehiculoId
                        ) ===
                        Number(
                          vehiculo.id
                        )
                    )
                : seguimiento
                    .remociones;

            const ingresosVehiculo =
              vehiculo
                ? seguimiento
                    .ingresosPredio
                    .filter(
                      (item) =>
                        Number(
                          item.vehiculoId
                        ) ===
                        Number(
                          vehiculo.id
                        )
                    )
                : seguimiento
                    .ingresosPredio;

            const egresosVehiculo =
              vehiculo
                ? seguimiento
                    .egresosPredio
                    .filter(
                      (item) =>
                        Number(
                          item.vehiculoId
                        ) ===
                        Number(
                          vehiculo.id
                        )
                    )
                : seguimiento
                    .egresosPredio;

            const ultimaRemocion =
              obtenerUltimo(
                remocionesVehiculo
              );

            const ultimoIngreso =
              obtenerUltimo(
                ingresosVehiculo
              );

            const ultimoEgreso =
              obtenerUltimo(
                egresosVehiculo
              );

            const actaViaPublica =
              [...seguimiento.actas]
                .reverse()
                .find(
                  (item) =>
                    !item.tipo ||
                    item.tipo ===
                      "VIA_PUBLICA"
                ) ||
              null;

            const infraccion =
              obtenerUltimo(
                seguimiento
                  .infracciones
              );

            let ubicacionTitulo =
              reclamo
                ?.direccion ||
              "Sin ubicación";

            let ubicacionDetalle =
              "Lugar denunciado";

            let ubicacionClase =
              "calle";

            if (vehiculo) {
          if (
      vehiculo.estadoActual ===
      "EN_PREDIO" &&
      ultimoIngreso
    ) {
      ubicacionTitulo =
        `Recibido en ${
          ultimoIngreso
            .predio
            ?.nombre ||
          "predio municipal"
        }`;

      const partes = [];

      if (
        ultimoIngreso
          .sector
      ) {
        partes.push(
          `Sector ${ultimoIngreso.sector}`
        );
      }

      if (
        ultimoIngreso
          .posicion
      ) {
        partes.push(
          `Posición ${ultimoIngreso.posicion}`
        );
      }

      if (
        ultimoIngreso
          .registradoPor
          ?.nombre
      ) {
        partes.push(
          `Recibido por ${
            ultimoIngreso
              .registradoPor
              .nombre
          }`
        );
      }

      ubicacionDetalle =
        partes.length
          ? partes.join(
              " · "
            )
          : "El predio confirmó la recepción del vehículo";

      ubicacionClase =
        "predio";
    } else if (
      vehiculo.estadoActual ===
      "EGRESADO"
    ) {
      if (
        ultimoEgreso
          ?.tipoEgreso ===
          "TRASLADADO" &&
        ultimoEgreso
          ?.predioDestino
          ?.nombre
      ) {
        ubicacionTitulo =
          `Trasladado a ${
            ultimoEgreso
              .predioDestino
              .nombre
          }`;

        const origen =
          ultimoIngreso
            ?.predio
            ?.nombre;

        ubicacionDetalle =
          origen
            ? `Salió de ${origen} · ${formatearFecha(
                ultimoEgreso.fechaHora
              )}`
            : `Traslado registrado · ${formatearFecha(
                ultimoEgreso.fechaHora
              )}`;
      } else if (
        ultimoEgreso
          ?.tipoEgreso ===
          "ENTREGADO" &&
        ultimoEgreso
          ?.destinoPersona
      ) {
        ubicacionTitulo =
          `Entregado a ${
            ultimoEgreso
              .destinoPersona
          }`;

        ubicacionDetalle =
          `Entrega registrada · ${formatearFecha(
            ultimoEgreso.fechaHora
          )}`;
      } else if (
        ultimoEgreso
          ?.tipoEgreso ===
          "COMPACTADO"
      ) {
        ubicacionTitulo =
          "Vehículo compactado";

        ubicacionDetalle =
          formatearFecha(
            ultimoEgreso.fechaHora
          );
      } else {
        ubicacionTitulo =
          "El vehículo ya salió del predio";

        ubicacionDetalle =
          ultimoEgreso
            ? formatearFecha(
                ultimoEgreso.fechaHora
              )
            : "Salida registrada";
      }

      ubicacionClase =
        "salio";
              } else if (
                ultimaRemocion
                  ?.destino
              ) {
                ubicacionTitulo =
                  ultimaRemocion
                    .destino;

                if (
                  vehiculo.estadoActual ===
                  "PENDIENTE_INGRESO_PREDIO" &&
                  esDestinoGranja(
                    ultimaRemocion
                      .destino
                  )
                ) {
                  ubicacionDetalle =
                    "Falta registrar el ingreso al predio";
                } else if (
                  esDestinoGranja(
                    ultimaRemocion
                      .destino
                  )
                ) {
                  ubicacionDetalle =
                    "Último destino registrado";
                } else {
                  ubicacionDetalle =
                    "Última ubicación conocida · sin seguimiento posterior desde este sistema";
                }

                ubicacionClase =
                  "removido";
              } else if (
                vehiculo.estadoActual ===
                  "EMPLAZADO" ||
                vehiculo.estadoActual ===
                  "EN_VIA_PUBLICA"
              ) {
                ubicacionTitulo =
                  reclamo
                    ?.direccion ||
                  "Vía pública";

                ubicacionDetalle =
                  nombresEstadoVehiculo[
                    vehiculo
                      .estadoActual
                  ];

                ubicacionClase =
                  "calle";
              }
            }

            let juzgadoTitulo =
              "Todavía no hay Acta de Infracción";

            let juzgadoDetalle =
              "No hay documentación para enviar al Juzgado.";

            let juzgadoClase =
              "neutral";

        if (infraccion) {

    /*
    |--------------------------------------------------------------------------
    | ORDEN JUDICIAL PARA RETIRAR VEHÍCULO
    |--------------------------------------------------------------------------
    */

    if (
      infraccion
        .requiereOrdenRemocion
    ) {

      switch (
        infraccion
          .estadoOrdenRemocion
      ) {

        case "PENDIENTE_SOLICITUD":
          juzgadoTitulo =
            "Falta solicitar la orden de remoción";

          juzgadoDetalle =
            "El vehículo no pudo ser retirado. Secretaría debe solicitar al Juzgado la orden necesaria para realizar la remoción.";

          juzgadoClase =
            "pendiente";

          break;


        case "ESPERANDO_RESPUESTA":
          juzgadoTitulo =
            "Esperando orden judicial para retirar el vehículo";

          juzgadoDetalle =
            "El vehículo todavía no fue retirado. La orden de remoción ya fue solicitada al Juzgado y se está esperando su respuesta.";

          juzgadoClase =
            "esperando";

          break;


        case "AUTORIZADA":
          juzgadoTitulo =
            "Remoción autorizada por el Juzgado";

          juzgadoDetalle =
            "La orden judicial fue autorizada. El vehículo ya puede ser retirado.";

          juzgadoClase =
            "esperando";

          break;


        case "NO_AUTORIZADA":
          juzgadoTitulo =
            "El Juzgado no autorizó la remoción";

          juzgadoDetalle =
            "La orden para retirar el vehículo no fue autorizada.";

          juzgadoClase =
            "alerta";

          break;


        default:
          juzgadoTitulo =
            "Orden judicial de remoción pendiente";

          juzgadoDetalle =
            "El vehículo continúa pendiente de retiro.";

          juzgadoClase =
            "pendiente";

          break;
      }

    } else {

      /*
      |--------------------------------------------------------------------------
      | TRÁMITE NORMAL DEL ACTA DE INFRACCIÓN / MULTA
      |--------------------------------------------------------------------------
      */

      switch (
        infraccion
          .estadoJuzgado
      ) {

        case "PENDIENTE_ENVIO":
          juzgadoTitulo =
            "Todavía no fue enviado al Juzgado";

          juzgadoDetalle =
            "La Secretaría debe registrar el envío del Acta de Infracción.";

          juzgadoClase =
            "pendiente";

          break;


        case "ENVIADO":
          juzgadoTitulo =
            "Acta de Infracción enviada al Juzgado";

          juzgadoDetalle =
            "El Acta fue enviada para el trámite de la multa.";

          juzgadoClase =
            "esperando";

          break;


        case "NO_AUTORIZADO":
          juzgadoTitulo =
            "El Juzgado no autorizó";

          juzgadoDetalle =
            "La respuesta quedó registrada.";

          juzgadoClase =
            "alerta";

          break;


        default:
          juzgadoTitulo =
            nombresJuzgado[
              infraccion
                .estadoJuzgado
            ] ||
            "Trámite judicial registrado";

          juzgadoDetalle =
            "El trámite del Acta de Infracción quedó registrado.";

          juzgadoClase =
            "neutral";

          break;
      }
    }
  }

            const inventario =
              ultimaRemocion
                ? (
                    ultimaRemocion
                      .inventario ||
                    ultimaRemocion
                      .InventarioVehiculo ||
                    seguimiento
                      .inventarios
                      .find(
                        (item) =>
                          Number(
                            item.id
                          ) ===
                          Number(
                            ultimaRemocion
                              .inventarioId
                          )
                      ) ||
                    null
                  )
                : null;

          return {
      vehiculo,

      ultimaRemocion,

      ultimoIngreso,

      ultimoEgreso,

      actaViaPublica,

      infraccion,

      ubicacionTitulo,

      ubicacionDetalle,

      ubicacionClase,

      juzgadoTitulo,

      juzgadoDetalle,

      juzgadoClase,

      juzgadoRespuesta:
        infraccion
          ?.observacionJuzgado ||
        "",

      juzgadoExpediente:
        infraccion
          ?.numeroExpedienteJuzgado ||
        "",

      juzgadoFechaRespuesta:
        infraccion
          ?.fechaRespuestaJuzgado ||
        null,

      inventario,
    };
          }, [
            reclamo,
            seguimiento,
          ]);


        /* =====================================================
          MAPA
        ===================================================== */

        const puntosMapa =
          useMemo(() => {
            const puntos = [];

            if (
              reclamo
                ?.latitudDenunciada &&
              reclamo
                ?.longitudDenunciada
            ) {
              puntos.push({
                titulo:
                  "Lugar denunciado",

                fecha:
                  reclamo.createdAt,

                lat:
                  Number(
                    reclamo
                      .latitudDenunciada
                  ),

                lng:
                  Number(
                    reclamo
                      .longitudDenunciada
                  ),
              });
            }

            seguimiento
              .visitas
              .forEach(
                (
                  item,
                  index
                ) => {
                  if (
                    item.latitudActual &&
                    item.longitudActual
                  ) {
                    puntos.push({
                      titulo:
                        `Visita ${index + 1}`,

                      fecha:
                        item.fechaHora,

                      lat:
                        Number(
                          item.latitudActual
                        ),

                      lng:
                        Number(
                          item.longitudActual
                        ),
                    });
                  }
                }
              );

            seguimiento
              .verificaciones
              .forEach(
                (
                  item,
                  index
                ) => {
                  if (
                    item.latitudActual &&
                    item.longitudActual
                  ) {
                    puntos.push({
                      titulo:
                        `Control ${index + 1}`,

                      fecha:
                        item.fechaHora,

                      lat:
                        Number(
                          item.latitudActual
                        ),

                      lng:
                        Number(
                          item.longitudActual
                        ),
                    });
                  }
                }
              );

            return puntos.filter(
              (item) =>
                !Number.isNaN(
                  item.lat
                ) &&
                !Number.isNaN(
                  item.lng
                )
            );
          }, [
            reclamo,
            seguimiento
              .visitas,
            seguimiento
              .verificaciones,
          ]);


        const posicionesMapa =
          puntosMapa.map(
            (item) => [
              item.lat,
              item.lng,
            ]
          );





    {/* =================================================
        CRONOLOGÍA
    ================================================= */}

        const eventos =
          useMemo(() => {
            const lista = [];

            if (reclamo) {
              lista.push({
                id:
                  `reclamo-${reclamo.id}`,

                tipo:
                  "RECLAMO",

                fecha:
                  reclamo.createdAt,

                datos:
                  reclamo,
              });
            }

            seguimiento
              .asignaciones
              .forEach(
                (item) => {
                  lista.push({
                    id:
                      `asignacion-${item.id}`,

                    tipo:
                      "ASIGNACION",

                    fecha:
                      item.fechaAsignacion ||
                      item.createdAt,

                    datos:
                      item,
                  });
                }
              );

            seguimiento
              .visitas
              .forEach(
                (visita) => {
                  const acta =
                    seguimiento
                      .actas
                      .find(
                        (item) =>
                          Number(
                            item.constatacionId
                          ) ===
                          Number(
                            visita.id
                          )
                      ) ||
                    null;

                  const emplazamiento =
                    acta
                      ? seguimiento
                          .emplazamientos
                          .find(
                            (item) =>
                              Number(
                                item.actaId
                              ) ===
                              Number(
                                acta.id
                              )
                          ) ||
                        null
                      : null;

                  lista.push({
                    id:
                      `visita-${visita.id}`,

                    tipo:
                      "VISITA",

                    fecha:
                      visita.fechaHora ||
                      visita.createdAt,

                    datos: {
                      visita,
                      acta,
                      emplazamiento,
                    },
                  });
                }
              );

            seguimiento
              .verificaciones
              .forEach(
                (verificacion) => {
               const infraccion =
  seguimiento
    .infracciones
    .find(
      (item) =>
        Number(
          item.verificacionId
        ) ===
        Number(
          verificacion.id
        )
    ) ||
  null;


/*
 * Si este control otorgó una prórroga,
 * buscamos el nuevo emplazamiento creado
 * a partir del emplazamiento que se estaba
 * controlando.
 */
const prorroga =
  verificacion.resultado === "PRORROGA"
    ? (
        seguimiento
          .emplazamientos
          .find(
            (item) =>
              item.esProrroga &&
              Number(
                item.emplazamientoAnteriorId
              ) ===
              Number(
                verificacion.emplazamientoId
              )
          ) ||
        null
      )
    : null;


lista.push({
  id:
    `control-${verificacion.id}`,

  tipo:
    "CONTROL",

  fecha:
    verificacion
      .fechaHora ||
    verificacion
      .createdAt,

  datos: {
    verificacion,
    infraccion,
    prorroga,
  },
});
                }
              );

            seguimiento
              .infracciones
              .forEach(
                (infraccion) => {
                  const ligada =
                    seguimiento
                      .verificaciones
                      .some(
                        (item) =>
                          Number(
                            item.id
                          ) ===
                          Number(
                            infraccion
                              .verificacionId
                          )
                      );

                  if (!ligada) {
                    lista.push({
                      id:
                        `infraccion-${infraccion.id}`,

                      tipo:
                        "INFRACCION",

                      fecha:
                        infraccion
                          .fechaHora ||
                        infraccion
                          .createdAt,

                      datos:
                        infraccion,
                    });
                  }

                  if (
                    infraccion
                      .fechaEnvioJuzgado
                  ) {
                    lista.push({
                      id:
                        `juzgado-envio-${infraccion.id}`,

                      tipo:
                        "JUZGADO_ENVIO",

                      fecha:
                        infraccion
                          .fechaEnvioJuzgado,

                      datos:
                        infraccion,
                    });
                  }

                  if (
                    infraccion
                      .fechaRespuestaJuzgado
                  ) {
                    lista.push({
                      id:
                        `juzgado-respuesta-${infraccion.id}`,

                      tipo:
                        "JUZGADO_RESPUESTA",

                      fecha:
                        infraccion
                          .fechaRespuestaJuzgado,

                      datos:
                        infraccion,
                    });
                  }

                  /*
  |--------------------------------------------------------------------------
  | SOLICITUD DE ORDEN JUDICIAL DE REMOCIÓN
  |--------------------------------------------------------------------------
  */

  if (
    infraccion
      .fechaSolicitudOrdenRemocion
  ) {
    lista.push({
      id:
        `orden-remocion-solicitud-${infraccion.id}`,

      tipo:
        "ORDEN_REMOCION_SOLICITUD",

      fecha:
        infraccion
          .fechaSolicitudOrdenRemocion,

      datos:
        infraccion,
    });
  }


  /*
  |--------------------------------------------------------------------------
  | RESPUESTA A LA ORDEN JUDICIAL DE REMOCIÓN
  |--------------------------------------------------------------------------
  */

  if (
    infraccion
      .fechaRespuestaOrdenRemocion
  ) {
    lista.push({
      id:
        `orden-remocion-respuesta-${infraccion.id}`,

      tipo:
        "ORDEN_REMOCION_RESPUESTA",

      fecha:
        infraccion
          .fechaRespuestaOrdenRemocion,

      datos:
        infraccion,
    });
  }
                }
              );

            seguimiento
              .remociones
              .forEach(
                (item) => {
                  lista.push({
                    id:
                      `remocion-${item.id}`,

                    tipo:
                      "REMOCION",

                    fecha:
                      item.fechaHora ||
                      item.createdAt,

                    datos:
                      item,
                  });
                }
              );

            seguimiento
              .ingresosPredio
              .forEach(
                (item) => {
                  lista.push({
                    id:
                      `ingreso-${item.id}`,

                    tipo:
                      "INGRESO_PREDIO",

                    fecha:
                      item.fechaHora ||
                      item.createdAt,

                    datos:
                      item,
                  });
                }
              );

            seguimiento
              .egresosPredio
              .forEach(
                (item) => {
                  lista.push({
                    id:
                      `egreso-${item.id}`,

                    tipo:
                      "EGRESO_PREDIO",

                    fecha:
                      item.fechaHora ||
                      item.createdAt,

                    datos:
                      item,
                  });
                }
              );

return lista.sort((a, b) => {
  /*
   * Orden especial:
   * REMOCIÓN siempre antes del ingreso al predio.
   */

  if (
    a.tipo === "REMOCION" &&
    b.tipo === "INGRESO_PREDIO"
  ) {
    return -1;
  }

  if (
    a.tipo === "INGRESO_PREDIO" &&
    b.tipo === "REMOCION"
  ) {
    return 1;
  }

  /*
   * Los movimientos de predio van al final.
   */

  const esPredioA =
    a.tipo === "INGRESO_PREDIO" ||
    a.tipo === "EGRESO_PREDIO";

  const esPredioB =
    b.tipo === "INGRESO_PREDIO" ||
    b.tipo === "EGRESO_PREDIO";

  if (esPredioA && !esPredioB) {
    return 1;
  }

  if (!esPredioA && esPredioB) {
    return -1;
  }

  /*
   * Dentro del predio:
   * ingreso primero, egreso después.
   */

  if (
    a.tipo === "INGRESO_PREDIO" &&
    b.tipo === "EGRESO_PREDIO"
  ) {
    return -1;
  }

  if (
    a.tipo === "EGRESO_PREDIO" &&
    b.tipo === "INGRESO_PREDIO"
  ) {
    return 1;
  }

  /*
   * El resto por fecha.
   */

  return (
    new Date(
      a.fecha || 0
    ).getTime() -
    new Date(
      b.fecha || 0
    ).getTime()
  );
});
          }, [
            reclamo,
            seguimiento,
          ]);


        /* =====================================================
          INVENTARIO
        ===================================================== */

        const abrirInventario =
          (remocion) => {
            const inventario =
              remocion
                ?.inventario ||
              remocion
                ?.InventarioVehiculo ||
              seguimiento
                .inventarios
                .find(
                  (item) =>
                    Number(
                      item.id
                    ) ===
                    Number(
                      remocion
                        ?.inventarioId
                    )
                ) ||
              null;

            setInventarioAbierto({
              remocion,
              inventario,
            });
          };

          const confirmarResolucion =
      async () => {
        if (!resueltoPor) {
          setErrorResolucion(
            "Indicá quién solucionó el problema."
          );

          return;
        }

        if (
          resueltoPor ===
            "MUNICIPALIDAD" &&
          !detalleResolucion.trim()
        ) {
          setErrorResolucion(
            "Escribí qué trabajo hizo la Municipalidad."
          );

          return;
        }

        if (
          resueltoPor ===
            "MUNICIPALIDAD" &&
          costoEstado ===
            "INFORMADO"
        ) {
          const monto =
            Number(
              costoMunicipal
            );

          if (
            Number.isNaN(monto) ||
            monto < 0
          ) {
            setErrorResolucion(
              "Ingresá un costo válido."
            );

            return;
          }
        }

        try {
          setGuardandoResolucion(
            true
          );

          setErrorResolucion("");

          await api.patch(
            `/reclamos/${reclamo.id}/resolver-problema`,
            {
              resueltoPor,

              detalleResolucion:
                detalleResolucion
                  .trim() ||
                null,

              costoMunicipalEstado:
                resueltoPor ===
                "MUNICIPALIDAD"
                  ? costoEstado
                  : null,

              costoMunicipal:
                resueltoPor ===
                  "MUNICIPALIDAD" &&
                costoEstado ===
                  "INFORMADO"
                  ? Number(
                      costoMunicipal
                    )
                  : null,
            }
          );

          setMostrarResolucion(
            false
          );

          setResueltoPor("");
          setDetalleResolucion("");
          setCostoEstado(
            "NO_INFORMADO"
          );
          setCostoMunicipal("");

          await cargarReclamo();
        } catch (err) {
          console.error(
            "Error resolviendo reclamo:",
            err
          );

          setErrorResolucion(
            err.response?.data
              ?.mensaje ||
              "No se pudo registrar la solución."
          );
        } finally {
          setGuardandoResolucion(
            false
          );
        }
      };


        /* =====================================================
          ESTADOS DE PANTALLA
        ===================================================== */

        if (cargando) {
          return (
            <div className="reclamo-detalle-mensaje">
              Cargando expediente...
            </div>
          );
        }


        if (error) {
          return (
            <div className="reclamo-detalle-mensaje error">
              <strong>
                {error}
              </strong>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/reclamos"
                  )
                }
              >
                Volver
              </button>
            </div>
          );
        }


        if (!reclamo) {
          return null;
        }


        /* =====================================================
          RENDER EVENTOS
        ===================================================== */

        const renderEvento =
          (evento) => {
            const datos =
              evento.datos;


            if (
              evento.tipo ===
              "RECLAMO"
            ) {
              return (
                <>
                  <span className="evento-etiqueta">
                    RECLAMO RECIBIDO
                  </span>

                  <h3>
                    Reclamo N.º{" "}
                    {
                      reclamo
                        .numeroReclamo
                    }
                  </h3>

                  <div className="evento-datos-linea">
                    <div>
                      <span>
                        Tipo
                      </span>

                      <strong>
                        {tipo?.nombre ||
                          "—"}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Dirección
                      </span>

                      <strong>
                        {reclamo
                          .direccion ||
                          "—"}
                      </strong>
                    </div>

                    {reclamo
                      .barrio && (
                      <div>
                        <span>
                          Barrio
                        </span>

                        <strong>
                          {
                            reclamo
                              .barrio
                          }
                        </strong>
                      </div>
                    )}
                  </div>

                  {reclamo
                    .observaciones && (
                    <div className="evento-texto">
                      <span>
                        Observación original
                      </span>

                      <p>
                        {
                          reclamo
                            .observaciones
                        }
                      </p>
                    </div>
                  )}
                </>
              );
            }


          if (
    evento.tipo ===
      "ASIGNACION"
  ) {
    const cancelada =
      datos.estadoTarea ===
      "CANCELADA";

    const esInspector =
      datos.tipo ===
      "INSPECTOR";

    const observacion =
      datos.observaciones ||
      "";

    const fueDevuelto =
      cancelada &&
      observacion
        .toLowerCase()
        .includes(
          "trabajo devuelto"
        );

    const fueReemplazado =
      cancelada &&
      !fueDevuelto;

    let etiqueta =
      "ASIGNACIÓN";

  let titulo =
    esInspector
      ? `${nombreUsuario(
          datos.asignadoPor
        )} asignó un inspector`
      : `${nombreUsuario(
          datos.asignadoPor
        )} asignó un jefe de guardia`;

  let textoPersona =
    esInspector
      ? "Inspector asignado"
      : "Jefe de guardia asignado";

  let textoResponsable =
    esInspector
      ? "Jefe de guardia"
      : "Asignado por";

    let textoObservacion =
      "Observación";

    let observacionVisible =
      observacion;


    /*
    * El jefe devolvió el trabajo.
    */

    if (fueDevuelto) {
      etiqueta =
        "↩ TRABAJO DEVUELTO";

      titulo =
        "El trabajo quedó disponible para otra guardia";

      textoPersona =
        esInspector
          ? "Inspector que tenía asignado"
          : "Jefe que estaba a cargo";

      textoResponsable =
        "Devuelto por";

      textoObservacion =
        "Motivo";

      observacionVisible =
        observacion
          .replace(
            /^Trabajo devuelto por el jefe:\s*/i,
            ""
          )
          .replace(
            /^Trabajo devuelto por el jefe de guardia\.?\s*/i,
            ""
          )
          .trim();
    }


    /*
    * Se reemplazó una asignación.
    */

    if (fueReemplazado) {
      etiqueta =
        "↔ CAMBIO DE RESPONSABLE";

      titulo =
        esInspector
          ? "Se cambió el inspector"
          : "Se cambió el jefe de guardia";

      textoPersona =
        esInspector
          ? "Inspector anterior"
          : "Jefe anterior";

      textoResponsable =
        "Cambio realizado por";

      textoObservacion =
        "Motivo";

      observacionVisible =
        observacion
          .replace(
            /^Cambio de inspector:\s*/i,
            ""
          )
          .replace(
            /^Inspector reemplazado antes de realizar el trabajo\.?\s*/i,
            ""
          )
          .trim();
    }


    return (
      <>
        <span
          className={`evento-etiqueta ${
            cancelada
              ? "cancelada"
              : ""
          }`}
        >
          {etiqueta}
        </span>

        <h3>
          {titulo}
        </h3>

      <div className="evento-datos-linea">
    <div>
      <span>
        {esInspector
          ? "Inspector"
          : "Jefe de guardia"}
      </span>

      <strong>
        {nombreUsuario(
          datos.asignadoA
        )}
      </strong>
    </div>
  </div>

        {observacionVisible && (
          <div className="evento-texto">
            <span>
              {textoObservacion}
            </span>

            <p>
              {observacionVisible}
            </p>
          </div>
        )}
      </>
    );
  }


            if (
              evento.tipo ===
              "VISITA"
            ) {
              const {
                visita,
                acta,
                emplazamiento,
              } = datos;

              return (
                <>
                  <span className="evento-etiqueta">
                    VISITA AL LUGAR
                  </span>

                  <h3>
                    {nombreUsuario(
                      visita.inspector
                    )}
                  </h3>

                  <strong className="evento-resultado">
                    {nombresResultadoPrimera[
                      visita.resultado
                    ] ||
                      visita.resultado ||
                      "Sin resultado"}
                  </strong>

                  {visita
                    .situacion && (
                    <div className="evento-texto">
                      <span>
                        Qué encontró
                      </span>

                      <p>
                        {
                          visita
                            .situacion
                        }
                      </p>
                    </div>
                  )}

                  {visita
                    .observaciones && (
                    <div className="evento-texto">
                      <span>
                        Observaciones
                      </span>

                      <p>
                        {
                          visita
                            .observaciones
                        }
                      </p>
                    </div>
                  )}

                  
                
                <div className="evento-fotos">
      <strong>
        📷 Evidencia de la visita
      </strong>

      <FotosReclamo
        reclamoId={
          reclamo.id
        }
        tipoReferencia="CONSTATACION"
        permitirSubir={
          false
        }
      />
    </div>

                  {acta && (
                    
                    <div className="evento-subseccion">
                      <span>
                        ACTA DE VÍA PÚBLICA
                      </span>

                      <strong>
                        N.º{" "}
                        {
                          acta
                            .numeroActa
                        }
                      </strong>
                      {acta.personaEncontrada ? (
      <div
        style={{
          marginTop: "12px",
        }}
      >
        <div>
          <span>
            Persona encontrada:{" "}
          </span>

          <strong>
            Sí
          </strong>
        </div>

        {acta.atendidoPor && (
          <div>
            <span>
              Atendido por:{" "}
            </span>

            <strong>
              {acta.atendidoPor}
            </strong>
          </div>
        )}

        {acta.caracterAtendido && (
          <div>
            <span>
              Carácter:{" "}
            </span>

            <strong>
              {acta.caracterAtendido}
            </strong>
          </div>
        )}
      </div>
    ) : (
      <div
        style={{
          marginTop: "12px",
        }}
      >
        <span>
          Persona encontrada:{" "}
        </span>

        <strong>
          No
        </strong>
      </div>
    )}

                  {emplazamiento && (
      <>
        <div className="evento-datos-linea">
          <div>
            <span>
              Plazo
            </span>

            <strong>
              {emplazamiento
                .plazoCantidad ||
                acta
                  .plazoHoras ||
                "—"}{" "}
              {emplazamiento
                .plazoUnidad ===
              "DIAS"
                ? "días"
                : "horas"}
            </strong>
          </div>

          <div>
            <span>
              Vence
            </span>

            <strong>
              {formatearFecha(
                emplazamiento
                  .fechaVencimiento
              )}
            </strong>
          </div>
        </div>

    <div className="evidencia-visita">
      <div className="evidencia-visita-item">
        <strong className="evidencia-visita-titulo">
          📷 Constatación
        </strong>

        <span className="evidencia-visita-descripcion">
          Cómo estaba al llegar
        </span>

        <FotosReclamo
          reclamoId={
            reclamo.id
          }
          tipoReferencia="CONSTATACION"
          permitirSubir={
            false
          }
        />
      </div>

      <div className="evidencia-visita-item">
        <strong className="evidencia-visita-titulo">
          📝 Emplazamiento
        </strong>

        <span className="evidencia-visita-descripcion">
          Emplazamiento realizado
        </span>

        <FotosReclamo
          reclamoId={
            reclamo.id
          }
          tipoReferencia="EMPLAZAMIENTO"
          permitirSubir={
            false
          }
        />
      </div>
    </div>
      </>
    )}
                    </div>
                  )}
                </>
              );
            }


            if (
              evento.tipo ===
              "CONTROL"
            ) {
            const {
  verificacion,
  infraccion,
  prorroga,
} = datos;

              return (
                <>
                  <span className="evento-etiqueta">
                    CONTROL DEL EMPLAZAMIENTO
                  </span>

                  <h3>
                    {nombreUsuario(
                      verificacion
                        .inspector
                    )}
                  </h3>

                  <strong className="evento-resultado">
                    {nombresResultadoControl[
                      verificacion
                        .resultado
                    ] ||
                      verificacion
                        .resultado ||
                      "Sin resultado"}
                  </strong>

                  {verificacion
                    .situacion && (
                    <div className="evento-texto">
                      <span>
                        Qué encontró
                      </span>

                      <p>
                        {
                          verificacion
                            .situacion
                        }
                      </p>
                    </div>

                    
                  )}
                  {verificacion.resultado === "PRORROGA" &&
  prorroga && (
    <div className="evento-subseccion">
      <span>
        NUEVO PLAZO
      </span>

      <div className="evento-datos-linea">
        <div>
          <span>
            Plazo otorgado
          </span>

          <strong>
            {prorroga.plazoCantidad}{" "}
            {prorroga.plazoUnidad === "DIAS"
              ? "días"
              : "horas"}
          </strong>
        </div>

        <div>
          <span>
            Vence
          </span>

          <strong>
            {formatearFecha(
              prorroga.fechaVencimiento
            )}
          </strong>
        </div>
      </div>

      {prorroga.observaciones && (
        <div className="evento-texto">
          <span>
            Motivo de la prórroga
          </span>

          <p>
            {prorroga.observaciones}
          </p>
        </div>
      )}
    </div>
)}

                  {infraccion && (
                    <div className="evento-subseccion evento-infraccion">
                      <span>
                        ACTA DE INFRACCIÓN
                      </span>

                      <strong>
                        N.º{" "}
                        {
                          infraccion
                            .numeroActa
                        }
                      </strong>

                      {infraccion.personaEncontrada ? (
      <div className="evento-datos-linea">
        <div>
          <span>
            Persona encontrada
          </span>

          <strong>
            Sí
          </strong>
        </div>

        {(infraccion.nombreInfractor ||
          infraccion.apellidoInfractor) && (
          <div>
            <span>
              Infractor
            </span>

            <strong>
              {[
                infraccion.nombreInfractor,
                infraccion.apellidoInfractor,
              ]
                .filter(Boolean)
                .join(" ")}
            </strong>
          </div>
        )}

        {infraccion.dniInfractor && (
          <div>
            <span>
              DNI
            </span>

            <strong>
              {infraccion.dniInfractor}
            </strong>
          </div>
        )}

        {infraccion.domicilioInfractor && (
          <div>
            <span>
              Domicilio
            </span>

            <strong>
              {infraccion.domicilioInfractor}
            </strong>
          </div>
        )}
      </div>
    ) : (
      <div className="evento-datos-linea">
        <div>
          <span>
            Persona encontrada
          </span>

          <strong>
            No
          </strong>
        </div>
      </div>
    )}

                      {infraccion
                        .motivo && (
                        <p>
                          {
                            infraccion
                              .motivo
                          }
                        </p>
                      )}
                      {infraccion
    .detalleAccionPosterior && (
    <div className="evento-texto">
      <span>
        Por qué no se pudo retirar el vehículo
      </span>

      <p>
        {
          infraccion
            .detalleAccionPosterior
        }
      </p>
    </div>
  )}

                      <div className="evento-fotos">
      <strong>
        📷 Foto del Acta de Infracción
      </strong>

    <FotosReclamo
      reclamoId={
        reclamo.id
      }
      tipoReferencia="INFRACCION"
      referenciaId={
        infraccion.id
      }
      permitirSubir={
        false
      }
    />
    </div>
                    </div>
                  )}
                </>
              );
            }


            if (
              evento.tipo ===
              "INFRACCION"
            ) {
              return (
                <>
                  <span className="evento-etiqueta">
                    ACTA DE INFRACCIÓN
                  </span>

                  <h3>
                    N.º{" "}
                    {
                      datos
                        .numeroActa
                    }
                  </h3>

                  {datos
                    .motivo && (
                    <div className="evento-texto">
                      <span>
                        Motivo
                      </span>

                      <p>
                        {
                          datos
                            .motivo
                        }
                      </p>
                    </div>
                  )}
                  

                  {datos
    .accionPosterior ===
      "BUSQUEDA_REMOCION" &&
    datos
      .detalle && (
      <div className="evento-texto">
        <span>
          Por qué no se pudo retirar el vehículo
        </span>

        <p>
          {
            datos
              .detalle
          }
        </p>
      </div>
  )}

                  <div className="evento-datos-linea">
                    <div>
                      <span>
                        Inspector
                      </span>

                      <strong>
                        {nombreUsuario(
                          datos.inspector
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Estado Juzgado
                      </span>

                      <strong>
                        {nombresJuzgado[
                          datos
                            .estadoJuzgado
                        ] ||
                          datos
                            .estadoJuzgado ||
                          "—"}
                      </strong>
                    </div>
                  </div>
                  <div className="evento-fotos">
      <strong>
        📷 Foto del Acta de Infracción
      </strong>

    <FotosReclamo
    reclamoId={
      reclamo.id
    }
    tipoReferencia="INFRACCION"
    referenciaId={
      datos.id
    }
    permitirSubir={
      false
    }
  />
    </div>
                </>
              );
            }


            if (
              evento.tipo ===
              "JUZGADO_ENVIO"
            ) {
              return (
                <>
                  <span className="evento-etiqueta juzgado">
                    ⚖ DOCUMENTACIÓN ENVIADA AL JUZGADO
                  </span>

                  <h3>
                    Acta de Infracción N.º{" "}
                    {
                      datos
                        .numeroActa
                    }
                  </h3>

                  <div className="evento-datos-linea">
                    <div>
                      <span>
                        Registrado por
                      </span>

                      <strong>
                        {nombreUsuario(
                          datos
                            .enviadoJuzgadoPor
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Expediente
                      </span>

                      <strong>
                        {datos
                          .numeroExpedienteJuzgado ||
                          "—"}
                      </strong>
                    </div>
                  </div>
                </>
              );
            }


            if (
              evento.tipo ===
              "JUZGADO_RESPUESTA"
            ) {
              return (
                <>
                  <span className="evento-etiqueta juzgado">
                    ⚖ RESPUESTA DEL JUZGADO
                  </span>

                  <h3>
                    {nombresJuzgado[
                      datos
                        .estadoJuzgado
                    ] ||
                      "Respuesta registrada"}
                  </h3>

                  <div className="evento-datos-linea">
                    <div>
                      <span>
                        Registrado por
                      </span>

                      <strong>
                        {nombreUsuario(
                          datos
                            .respuestaJuzgadoRegistradaPor
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Expediente
                      </span>

                      <strong>
                        {datos
                          .numeroExpedienteJuzgado ||
                          "—"}
                      </strong>
                    </div>
                  </div>

                  {datos
                    .observacionJuzgado && (
                    <div className="evento-texto">
                      <span>
                        Observación
                      </span>

                      <p>
                        {
                          datos
                            .observacionJuzgado
                        }
                      </p>
                    </div>
                  )}
                </>
              );
            }

  if (
    evento.tipo ===
      "ORDEN_REMOCION_SOLICITUD"
  ) {
    return (
      <>
        <span className="evento-etiqueta juzgado">
          ⚖ ORDEN JUDICIAL DE REMOCIÓN SOLICITADA
        </span>

        <h3>
          Se solicitó autorización para
          retirar el vehículo
        </h3>

        <div className="evento-datos-linea">

          <div>
            <span>
              Acta de Infracción
            </span>

            <strong>
              N.º{" "}
              {datos.numeroActa ||
                "—"}
            </strong>
          </div>

          <div>
            <span>
              Solicitado por
            </span>

            <strong>
              {nombreUsuario(
                datos
                  .ordenRemocionSolicitadaPor
              )}
            </strong>
          </div>

        </div>

        {datos.detalle && (
          <div className="evento-texto">
            <span>
              Por qué no se pudo retirar
            </span>

            <p>
              {datos.detalle}
            </p>
          </div>
        )}

        {datos
          .observacionOrdenRemocion && (
          <div className="evento-texto">
            <span>
              Observación de la solicitud
            </span>

            <p>
              {
                datos
                  .observacionOrdenRemocion
              }
            </p>
          </div>
        )}

        <div className="evento-texto">
          <span>
            Estado
          </span>

          <p>
            Se pidió al Juzgado la orden
            necesaria para poder retirar
            el vehículo.
          </p>
        </div>
      </>
    );
  }


  if (
    evento.tipo ===
      "ORDEN_REMOCION_RESPUESTA"
  ) {
    const autorizada =
      datos.estadoOrdenRemocion ===
      "AUTORIZADA";

    return (
      <>
        <span className="evento-etiqueta juzgado">
          {autorizada
            ? "⚖ ORDEN JUDICIAL DE REMOCIÓN AUTORIZADA"
            : "⚖ ORDEN JUDICIAL DE REMOCIÓN NO AUTORIZADA"}
        </span>

        <h3>
          {autorizada
            ? "El Juzgado autorizó retirar el vehículo"
            : "El Juzgado no autorizó retirar el vehículo"}
        </h3>

        <div className="evento-datos-linea">

          <div>
            <span>
              Acta de Infracción
            </span>

            <strong>
              N.º{" "}
              {datos.numeroActa ||
                "—"}
            </strong>
          </div>

          <div>
            <span>
              Respuesta registrada por
            </span>

            <strong>
              {nombreUsuario(
                datos
                  .respuestaOrdenRemocionPor
              )}
            </strong>
          </div>

        </div>

        {datos
          .observacionOrdenRemocion && (
          <div className="evento-texto">
            <span>
              Observación
            </span>

            <p>
              {
                datos
                  .observacionOrdenRemocion
              }
            </p>
          </div>
        )}

        {autorizada && (
          <div className="evento-fotos">

            <strong>
              📷 Orden judicial de remoción
            </strong>

            <FotosReclamo
              reclamoId={
                reclamo.id
              }
              tipoReferencia="ORDEN_JUDICIAL_REMOCION"
              referenciaId={
                datos.id
              }
              permitirSubir={
                false
              }
            />

          </div>
        )}

      </>
    );
  }

  
            if (
              evento.tipo ===
              "REMOCION"
            ) {
              const vehiculo =
                datos.vehiculo ||
                seguimiento
                  .vehiculos
                  .find(
                    (item) =>
                      Number(
                        item.id
                      ) ===
                      Number(
                        datos.vehiculoId
                      )
                  );

                  

              return (
                <>
                  <span className="evento-etiqueta remocion">
                    🚛 VEHÍCULO RETIRADO
                  </span>

                  <h3>
                    {vehiculo
                      ? `${vehiculo.marca || ""} ${vehiculo.modelo || ""}`.trim() ||
                        "Vehículo"
                      : "Vehículo"}
                  </h3>

                  <div className="evento-datos-linea">
                    <div>
                      <span>
                        Dominio
                      </span>

                      <strong>
                        {vehiculo
                          ?.dominio ||
                          "Sin dominio"}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Destino
                      </span>

                      <strong>
                        {datos
                          .destino ||
                          "—"}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Grúa
                      </span>

                      <strong>
                        {datos
                          .grua ||
                          "—"}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Chofer
                      </span>

                      <strong>
                        {datos
                          .chofer ||
                          "—"}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Inspector
                      </span>

                      <strong>
                        {nombreUsuario(
                          datos.inspector
                        )}
                      </strong>
                    </div>
                  </div>

                  {datos
  .observaciones && (
  <div className="evento-texto">
    <span>
      Observaciones
    </span>

    <p>
      {
        datos
          .observaciones
      }
    </p>
  </div>
)}

<div className="evento-fotos">
  <strong>
    📷 Vehículo cargado en la grúa
  </strong>

  <FotosReclamo
    reclamoId={
      reclamo.id
    }
    tipoReferencia="REMOCION"
    permitirSubir={
      false
    }
  />
</div>

{(datos
  .inventarioId ||
  datos
    .inventario ||
  datos
    .InventarioVehiculo) && (
                    <button
                      type="button"
                      className="boton-inventario"
                      onClick={() =>
                        abrirInventario(
                          datos
                        )
                      }
                    >
                      🚗 Ver cómo estaba el vehículo
                    </button>
                  )}

                 
                </>
              );
            }


         if (
  evento.tipo ===
  "INGRESO_PREDIO"
) {
  const vehiculo =
    datos.vehiculo;

  return (
    <>
      <span className="evento-etiqueta predio">
        ✅ VEHÍCULO RECIBIDO EN EL PREDIO
      </span>

      <h3>
        {datos
          .predio
          ?.nombre ||
          "Predio municipal"}
      </h3>

      <div className="evento-datos-linea">
        <div>
          <span>
            Vehículo
          </span>

          <strong>
            {vehiculo
              ?.numeroInterno
              ? `Interno N.º ${vehiculo.numeroInterno}`
              : vehiculo
                  ?.dominio ||
                "—"}
          </strong>
        </div>

        <div>
          <span>
            Sector
          </span>

          <strong>
            {datos
              .sector ||
              "—"}
          </strong>
        </div>

        <div>
          <span>
            Posición
          </span>

          <strong>
            {datos
              .posicion ||
              "—"}
          </strong>
        </div>

        <div>
          <span>
            Registrado por
          </span>

          <strong>
            {nombreUsuario(
              datos
                .registradoPor
            )}
          </strong>
        </div>
      </div>

      {datos
        .observaciones && (
        <div className="evento-texto">
          <span>
            Observaciones
          </span>

          <p>
            {
              datos
                .observaciones
            }
          </p>
        </div>
      )}

      <div className="evento-fotos">
        <strong>
          📷 Evidencia del predio
        </strong>

        <FotosReclamo
          reclamoId={reclamo.id}
          tipoReferencia="INGRESO_PREDIO"
          referenciaId={datos.id}
          permitirSubir={false}
        />
      </div>
    </>
  );
}

            if (
              evento.tipo ===
              "EGRESO_PREDIO"
            ) {
              return (
                <>
                  <span className="evento-etiqueta salida">
                    ✅ SALIDA / ENTREGA DEL VEHÍCULO
                  </span>

                  <h3>
                    {nombresEgreso[
                      datos
                        .tipoEgreso
                    ] ||
                      "Salida registrada"}
                  </h3>

                <div className="evento-datos-linea">
  {datos.tipoEgreso ===
    "TRASLADADO" &&
    datos.predioDestino
      ?.nombre && (
      <div>
        <span>
          Destino del traslado
        </span>

        <strong>
          {
            datos
              .predioDestino
              .nombre
          }
        </strong>
      </div>
  )}

  {datos
    .destinoPersona && (
    <div>
      <span>
        Entregado / destino
      </span>

      <strong>
        {
          datos
            .destinoPersona
        }
      </strong>
    </div>
  )}

  {datos
    .dniPersona && (
    <div>
      <span>
        DNI
      </span>

      <strong>
        {
          datos
            .dniPersona
        }
      </strong>
    </div>
  )}

  <div>
    <span>
      Registrado por
    </span>

    <strong>
      {nombreUsuario(
        datos
          .registradoPor
      )}
    </strong>
  </div>
</div>

{datos.observaciones && (
  <div className="evento-texto">
    <span>
      Observaciones del egreso
    </span>

    <p>
      {datos.observaciones}
    </p>
  </div>
)}
                </>
              );
            }


            return null;
          };


        /* =====================================================
          RENDER
        ===================================================== */

        return (
          <div className="reclamo-expediente-page">

            {/* CABECERA */}

            <header className="expediente-header">
              <button
                type="button"
                className="expediente-volver"
                onClick={() =>
                  navigate(
                    "/reclamos"
                  )
                }
              >
                ← Volver a reclamos
              </button>

              <div className="expediente-header-principal">
                <div>
                  <span className="expediente-superior">
                    EXPEDIENTE
                  </span>

                  <h1>
                    Reclamo N.º{" "}
                    {
                      reclamo
                        .numeroReclamo
                    }
                  </h1>

                  <p>
                    {tipo
                      ?.nombre ||
                      "Sin tipo"}

                    {reclamo
                      .direccion
                      ? ` · ${reclamo.direccion}`
                      : ""}
                  </p>
                </div>

              <span className="estado-principal">
      {nombresEtapaActual[
        reclamo.etapaActual
      ] ||
        nombresEstado[
          reclamo.estado
        ] ||
        reclamo.etapaActual ||
        reclamo.estado}
    </span>
              </div>
            </header>


            {/* =================================================
                RESUMEN DE 5 SEGUNDOS
            ================================================= */}

            <section className="resumen-rapido">

              <div className="resumen-rapido-cabecera">
                <div>
                  <span>
                    ESTADO RÁPIDO
                  </span>

                  <h2>
                    ¿Dónde está parado este reclamo?
                  </h2>
                </div>

                {resumen
                  .vehiculo && (
                  <div className="resumen-vehiculo-titulo">
                    🚗{" "}
                    <strong>
                      {`${resumen.vehiculo.marca || ""} ${resumen.vehiculo.modelo || ""}`.trim() ||
                        "Vehículo"}

                      {resumen
                        .vehiculo
                        .dominio
                        ? ` · ${resumen.vehiculo.dominio}`
                        : ""}
                    </strong>
                  </div>
                )}
              </div>


              {resumen
                .vehiculo && (
                <div className="resumen-ubicacion-principal">
                  <div className="resumen-icono">
                    📍
                  </div>

                  <div>
                    <span>
                      DÓNDE ESTÁ EL VEHÍCULO
                    </span>

                    <strong>
                      {
                        resumen
                          .ubicacionTitulo
                      }
                    </strong>

                    <p>
                      {
                        resumen
                          .ubicacionDetalle
                      }
                    </p>
                  </div>
                </div>
              )}


              <div className="resumen-tramites">

                <div className="resumen-tramite">
                  <span>
                    📄 ACTA VÍA PÚBLICA
                  </span>

                  {resumen
                    .actaViaPublica ? (
                    <>
                      <strong>
                        ✓ Hecha · N.º{" "}
                        {
                          resumen
                            .actaViaPublica
                            .numeroActa
                        }
                      </strong>

                      <small>
                        {formatearFecha(
                          resumen
                            .actaViaPublica
                            .fechaHora
                        )}
                      </small>
                    </>
                  ) : (
                    <strong>
                      Todavía no realizada
                    </strong>
                  )}
                </div>


                <div className="resumen-tramite">
                  <span>
                    📝 ACTA DE INFRACCIÓN
                  </span>

                  {resumen
                    .infraccion ? (
                    <>
                      <strong>
                        ✓ Hecha · N.º{" "}
                        {
                          resumen
                            .infraccion
                            .numeroActa
                        }
                      </strong>

                      <small>
                        {formatearFecha(
                          resumen
                            .infraccion
                            .fechaHora
                        )}
                      </small>
                    </>
                  ) : (
                    <strong>
                      Todavía no realizada
                    </strong>
                  )}
                </div>


              <div
      className={`resumen-tramite resumen-juzgado juzgado-${resumen.juzgadoClase}`}
    >
      <span>
        ⚖ JUZGADO
      </span>

      <strong>
        {
          resumen
            .juzgadoTitulo
        }
      </strong>

      <small>
        {
          resumen
            .juzgadoDetalle
        }
      </small>

      {resumen
        .juzgadoRespuesta && (
        <div className="resumen-juzgado-respuesta">
          <span>
            RESPUESTA DEL JUZGADO
          </span>

          <p>
            {
              resumen
                .juzgadoRespuesta
            }
          </p>
        </div>
      )}

      {(resumen
        .juzgadoExpediente ||
        resumen
          .juzgadoFechaRespuesta) && (
        <div className="resumen-juzgado-datos">

          {resumen
            .juzgadoExpediente && (
            <div>
              <span>
                Expediente
              </span>

              <strong>
                {
                  resumen
                    .juzgadoExpediente
                }
              </strong>
            </div>
          )}

          {resumen
            .juzgadoFechaRespuesta && (
            <div>
              <span>
                Respuesta registrada
              </span>

              <strong>
                {formatearFecha(
                  resumen
                    .juzgadoFechaRespuesta
                )}
              </strong>
            </div>
          )}

        </div>
      )}
    </div>

              </div>


              {resumen
                .ultimaRemocion &&
                (
                  resumen
                    .ultimaRemocion
                    .inventarioId ||
                  resumen
                    .inventario
                ) && (
                <div className="resumen-acciones">
                  <button
                    type="button"
                    className="boton-inventario"
                    onClick={() =>
                      abrirInventario(
                        resumen
                          .ultimaRemocion
                      )
                    }
                  >
                  🚗 Ver inventario del vehículo
                  </button>

                  <button
                    type="button"
                    className="boton-secundario"
                    onClick={() =>
                      document
                        .getElementById(
                          "historial-completo"
                        )
                        ?.scrollIntoView({
                          behavior:
                            "smooth",
                        })
                    }
                  >
                    Ver historial completo ↓
                  </button>
                </div>
              )}

            </section>

              {puedeResolverProblema && (
              <section className="resolucion-director">

                <div className="resolucion-director-aviso">
                  <span className="resolucion-icono">
                    ⚠️
                  </span>

                  <div>
                    <h2>
                      El problema todavía sigue
                    </h2>

                    <p>
                      El inspector ya terminó su
                      actuación. Dirección debe
                      registrar cómo terminó el
                      problema en la vía pública.
                    </p>
                  </div>
                </div>

                {!mostrarResolucion ? (
                  <button
                    type="button"
                    className="resolucion-abrir"
                    onClick={() =>
                      setMostrarResolucion(
                        true
                      )
                    }
                  >
                    Registrar cómo se solucionó
                  </button>
                ) : (
                  <div className="resolucion-formulario">

                    <h3>
                      ¿Quién solucionó el problema?
                    </h3>

                    <button
                      type="button"
                      className={
                        resueltoPor ===
                        "RESPONSABLE"
                          ? "resolucion-opcion activa"
                          : "resolucion-opcion"
                      }
                      onClick={() => {
                        setResueltoPor(
                          "RESPONSABLE"
                        );

                        setCostoEstado(
                          "NO_INFORMADO"
                        );

                        setCostoMunicipal("");
                      }}
                    >
                      <span>
                        👤
                      </span>

                      <div>
                        <strong>
                          Lo solucionó el responsable
                        </strong>

                        <small>
                          La persona responsable
                          retiró o corrigió el problema.
                        </small>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={
                        resueltoPor ===
                        "MUNICIPALIDAD"
                          ? "resolucion-opcion activa"
                          : "resolucion-opcion"
                      }
                      onClick={() =>
                        setResueltoPor(
                          "MUNICIPALIDAD"
                        )
                      }
                    >
                      <span>
                        🏛️
                      </span>

                      <div>
                        <strong>
                          Lo solucionó Municipalidad
                        </strong>

                        <small>
                          Personal municipal realizó
                          el trabajo.
                        </small>
                      </div>
                    </button>

                    {resueltoPor && (
                      <div className="resolucion-campos">

                        <label>
                          {resueltoPor ===
                          "MUNICIPALIDAD"
                            ? "¿Qué hizo la Municipalidad?"
                            : "Detalle de la solución (opcional)"}
                        </label>

                        <textarea
                          rows={3}
                          value={
                            detalleResolucion
                          }
                          onChange={(event) =>
                            setDetalleResolucion(
                              event.target.value
                            )
                          }
                          placeholder={
                            resueltoPor ===
                            "MUNICIPALIDAD"
                              ? "Ej.: Se retiraron los escombros del lugar."
                              : "Ej.: El responsable retiró el material."
                          }
                        />

                      </div>
                    )}

                    {resueltoPor ===
                      "MUNICIPALIDAD" && (
                      <div className="resolucion-costo">

                        <strong>
                          ¿Querés informar un costo?
                        </strong>

                        <label className="resolucion-radio">
                          <input
                            type="radio"
                            name="costoMunicipal"
                            checked={
                              costoEstado ===
                              "NO_INFORMADO"
                            }
                            onChange={() =>
                              setCostoEstado(
                                "NO_INFORMADO"
                              )
                            }
                          />

                          No, dejar sin monto
                        </label>

                        <label className="resolucion-radio">
                          <input
                            type="radio"
                            name="costoMunicipal"
                            checked={
                              costoEstado ===
                              "SIN_COSTO"
                            }
                            onChange={() =>
                              setCostoEstado(
                                "SIN_COSTO"
                              )
                            }
                          />

                          El trabajo no tuvo costo
                        </label>

                        <label className="resolucion-radio">
                          <input
                            type="radio"
                            name="costoMunicipal"
                            checked={
                              costoEstado ===
                              "INFORMADO"
                            }
                            onChange={() =>
                              setCostoEstado(
                                "INFORMADO"
                              )
                            }
                          />

                          Sí, cargar monto
                        </label>

                        {costoEstado ===
                          "INFORMADO" && (
                          <div className="resolucion-monto">
                            <span>
                              $
                            </span>

                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={
                                costoMunicipal
                              }
                              onChange={(event) =>
                                setCostoMunicipal(
                                  event.target.value
                                )
                              }
                              placeholder="Monto"
                            />
                          </div>
                        )}

                      </div>
                    )}

                    {errorResolucion && (
                      <div className="resolucion-error">
                        {errorResolucion}
                      </div>
                    )}

                    <div className="resolucion-botones">

                      <button
                        type="button"
                        className="resolucion-cancelar"
                        disabled={
                          guardandoResolucion
                        }
                        onClick={() =>
                          setMostrarResolucion(
                            false
                          )
                        }
                      >
                        Cancelar
                      </button>

                      <button
                        type="button"
                        className="resolucion-confirmar"
                        disabled={
                          guardandoResolucion ||
                          !resueltoPor
                        }
                        onClick={
                          confirmarResolucion
                        }
                      >
                        {guardandoResolucion
                          ? "Guardando..."
                          : "✓ Confirmar solución"}
                      </button>

                    </div>

                  </div>
                )}

              </section>
            )}



            {/* RESPONSABLES */}

            <section className="expediente-seccion">
              <div className="seccion-cabecera">
                <div>
                  <h2>
                    Responsables actuales
                  </h2>

                  <p>
                    Quién tiene actualmente el expediente.
                  </p>
                </div>
              </div>

              <div className="responsables-rapidos">
                <div>
                  <span>
                    Jefe de guardia
                  </span>

                  <strong>
                    {nombreUsuario(
                      jefeActual
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Inspector
                  </span>

                  <strong>
                    {nombreUsuario(
                      inspectorActual
                    )}
                  </strong>
                </div>
              </div>

            {reclamo.etapaActual ===
    "ESPERANDO_PLAZO" ? (
      <div className="estado-espera-plazo">
        <strong>
          ⏳ Esperando vencimiento del emplazamiento
        </strong>

        <p>
          Todavía no corresponde realizar un nuevo control.
          Cuando venza el plazo, el reclamo quedará disponible
          para que una guardia tome el trabajo y asigne un inspector.
        </p>
      </div>
    ) : (
      <AsignacionReclamo
        reclamo={reclamo}
        onActualizado={
          cargarReclamo
        }
      />
    )}
            </section>


            {/* DATOS DEL RECLAMO */}

      {/* DATOS DEL RECLAMO */}

  <section className="expediente-seccion">
    <div className="seccion-cabecera">
      <div>
        <h2>
          Datos del reclamo
        </h2>
      </div>

      {puedeEditarReclamo && (
        <button
          type="button"
          className="boton-editar-reclamo"
          onClick={() =>
            setMostrarEditarReclamo(true)
          }
        >
          ✏️ Editar reclamo
        </button>
      )}
    </div>

              <div className="datos-reclamo-linea">
                <div>
                  <span>
                    Tipo
                  </span>

                  <strong>
                    {tipo
                      ?.nombre ||
                      "—"}
                  </strong>
                </div>

                <div>
                  <span>
                    Dirección
                  </span>

                  <strong>
                    {reclamo
                      .direccion ||
                      "—"}
                  </strong>
                </div>

                <div>
                  <span>
                    Barrio
                  </span>

                  <strong>
                    {reclamo
                      .barrio ||
                      "—"}
                  </strong>
                </div>

                <div>
                  <span>
                    Fecha
                  </span>

                  <strong>
                    {formatearFecha(
                      reclamo
                        .createdAt
                    )}
                  </strong>
                </div>
              </div>

              {reclamo
                .observaciones && (
                <div className="texto-reclamo">
                  <span>
                    Observaciones
                  </span>

                  <p>
                    {
                      reclamo
                        .observaciones
                    }
                  </p>
                </div>
              )}
            </section>
  {mostrarEditarReclamo && (
    <div
      className="reclamo-modal"
      onClick={() =>
        setMostrarEditarReclamo(false)
      }
    >
      <div
        className="reclamo-modal-contenido"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <button
          type="button"
          className="reclamo-modal-cerrar"
          onClick={() =>
            setMostrarEditarReclamo(false)
          }
        >
          ×
        </button>

        <ReclamoForm
          reclamo={reclamo}
          onActualizado={async () => {
            setMostrarEditarReclamo(false);
            await cargarReclamo();
          }}
          onCancelar={() =>
            setMostrarEditarReclamo(false)
          }
        />
      </div>
    </div>
  )}

            {/* MAPA */}

            {puntosMapa.length >
              0 && (
              <section className="expediente-seccion">
                <div className="seccion-cabecera">
                  <div>
                    <h2>
                      Ubicaciones registradas
                    </h2>

                    <p>
                      Lugar denunciado y posiciones GPS registradas durante las visitas.
                    </p>
                  </div>
                </div>

                <div className="expediente-mapa">
                  <MapContainer
                    center={
                      posicionesMapa[0]
                    }
                    zoom={16}
                    scrollWheelZoom={
                      false
                    }
                  >
                    <TileLayer
                      attribution="&copy; OpenStreetMap"
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    <AjustarMapa
                      puntos={
                        posicionesMapa
                      }
                    />

                    {puntosMapa.map(
                      (
                        punto,
                        index
                      ) => (
                        <CircleMarker
                          key={
                            `${punto.titulo}-${index}`
                          }
                          center={[
                            punto.lat,
                            punto.lng,
                          ]}
                          radius={9}
                        >
                          <Popup>
                            <strong>
                              {
                                punto
                                  .titulo
                              }
                            </strong>

                            <br />

                            {formatearFecha(
                              punto.fecha
                            )}
                          </Popup>
                        </CircleMarker>
                      )
                    )}
                  </MapContainer>
                </div>
              </section>
            )}


            {/* HISTORIAL */}

            <section
              className="expediente-seccion"
              id="historial-completo"
            >
              <div className="seccion-cabecera">
                <div>
                  <h2>
                    Historial completo
                  </h2>

                  <p>
                    Todo lo que se hizo, en orden, y quién lo hizo.
                  </p>
                </div>
              </div>

              {eventos.length ===
              0 ? (
                <div className="seguimiento-sin-datos">
                  Todavía no hay actuaciones registradas.
                </div>
              ) : (
                <div className="linea-tiempo">
                  {eventos.map(
                    (evento) => (
                      <article
                        key={
                          evento.id
                        }
                        className={`evento-contenido evento-${evento.tipo.toLowerCase()}`}
                      >
                        <div className="evento-eje">
                          <span className="evento-punto" />
                        </div>

                        <div className="evento-cuerpo">
                          <div className="evento-fecha">
                            {formatearFecha(
                              evento.fecha
                            )}
                          </div>

                          {renderEvento(
                            evento
                          )}
                        </div>
                      </article>
                    )
                  )}
                </div>
              )}
            </section>


          


            {/* HISTORIAL INTERNO */}

            <section className="expediente-seccion historial-sistema">
              <div className="seccion-cabecera">
                <div>
                  <h2>
                    Historial administrativo
                  </h2>

                  <p>
                    Movimientos internos registrados por el sistema.
                  </p>
                </div>
              </div>

              <HistorialReclamo
                reclamoId={
                  reclamo.id
                }
              />
            </section>


            <footer className="expediente-footer">
              <span>
                Estado en sistema externo
              </span>

              <strong>
                {
                  reclamo
                    .estadoExterno ||
                  "—"
                }
              </strong>
            </footer>


            {/* =================================================
                MODAL INVENTARIO
            ================================================= */}

            {inventarioAbierto && (
              <div
                className="inventario-overlay"
                onClick={() =>
                  setInventarioAbierto(
                    null
                  )
                }
              >
                <div
                  className="inventario-modal"
                  onClick={(
                    event
                  ) =>
                    event.stopPropagation()
                  }
                >
                  <div className="inventario-modal-header">
                    <div>
                      <span>
                        INVENTARIO DEL VEHÍCULO
                      </span>

                      <h2>
                        Cómo estaba al momento del retiro
                      </h2>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setInventarioAbierto(
                          null
                        )
                      }
                    >
                      ×
                    </button>
                  </div>

                  <div className="inventario-info">
                    <div>
                      <span>
                        Fecha de retiro
                      </span>

                      <strong>
                        {formatearFecha(
                          inventarioAbierto
                            .remocion
                            ?.fechaHora
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Destino
                      </span>

                      <strong>
                        {inventarioAbierto
                          .remocion
                          ?.destino ||
                          "—"}
                      </strong>
                    </div>
                  </div>

                  {inventarioAbierto
                    .inventario ? (
                    <>
                      <div className="inventario-lista">
                  {aItemsInventario(
    inventarioAbierto
      .inventario
      .detalle
  )
    .filter((item) => {
      const clave =
        String(item.clave || "")
          .toLowerCase();

      return (
        !clave.includes("latitud") &&
        !clave.includes("longitud") &&
        !clave.includes("ubicacion") &&
        !clave.includes("ubicación") &&
        !clave.includes("gps")
      );
    })
    .map(
                          (
                            item,
                            index
                          ) => {
                            const marcado =
                              item.valor ===
                                true ||
                              item.valor ===
                                "true";

                            const desmarcado =
                              item.valor ===
                                false ||
                              item.valor ===
                                "false";

                            return (
                              <div
                                className="inventario-item"
                                key={`${item.clave}-${index}`}
                              >
                                {(marcado ||
                                  desmarcado) && (
                                  <span
                                    className={`inventario-check ${
                                      marcado
                                        ? "marcado"
                                        : ""
                                    }`}
                                  >
                                    {marcado
                                      ? "✓"
                                      : ""}
                                  </span>
                                )}

                                <div>
                                  <strong>
                                    {
                                      item
                                        .clave
                                    }
                                  </strong>

                                  {!(
                                    marcado ||
                                    desmarcado
                                  ) && (
                                    <span>
                                      {textoValorInventario(
                                        item.valor
                                      )}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>

                    {limpiarObservacionesInventario(
    inventarioAbierto.inventario.observaciones
  ) && (
    <div className="inventario-observaciones">
      <span>
        Observaciones
      </span>

      <p>
        {limpiarObservacionesInventario(
          inventarioAbierto.inventario.observaciones
        )}
      </p>
    </div>
  )}
                    </>
                  ) : (
                    <div className="inventario-sin-detalle">
                      <strong>
                        El inventario está registrado.
                      </strong>

                      <p>
                        Falta que el seguimiento devuelva el detalle marcado para poder mostrar los faltantes acá.
                      </p>
                    </div>
                  )}

                  <button
                    type="button"
                    className="inventario-cerrar"
                    onClick={() =>
                      setInventarioAbierto(
                        null
                      )
                    }
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}

          </div>
        );
      };


    export default ReclamoDetallePage;