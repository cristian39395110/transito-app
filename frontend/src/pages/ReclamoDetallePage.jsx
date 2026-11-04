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

          fotos: [],

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

     const [
  mostrarInformeJefe,
  setMostrarInformeJefe,
] = useState(false);

const [
  informeJefeGuardia,
  setInformeJefeGuardia,
] = useState("");

const [
  enviandoInformeJefe,
  setEnviandoInformeJefe,
] = useState(false);

const [
  errorInformeJefe,
  setErrorInformeJefe,
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

fotos:
  datosSeguimiento
    .fotos ||
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


        const puedeInformarFueraCompetencia =
  (rol === "jefe_guardia" ||
    rol === "administrador") &&
  [
    "PENDIENTE_PRIMERA_VISITA",
    "PENDIENTE_DECISION_JEFE",
  ].includes(reclamo?.etapaActual) &&
  reclamo?.estadoExterno === "PENDIENTE" &&
  !["RESUELTO", "ANULADO"].includes(
    reclamo?.estado
  ) &&
  !reclamo?.informeJefeGuardia;

        const puedeEditarReclamo =
    (
      rol === "administrador" ||
      rol === "secretaria_reclamos"
    ) &&
    reclamo?.etapaActual ===
      "PENDIENTE_ASIGNACION_GUARDIA";


const vehiculosDelReclamo = useMemo(() => {
  const vehiculos = Array.isArray(seguimiento.vehiculos)
    ? seguimiento.vehiculos
    : [];

  const esExpedienteUnVehiculo =
    vehiculos.length === 1;

  const ordenarIdDesc = (items = []) =>
    [...items].sort(
      (a, b) =>
        Number(b.id || 0) -
        Number(a.id || 0)
    );

  return vehiculos.map((vehiculo, index) => {
    const mismoVehiculo = (valor) =>
      valor != null &&
      Number(valor) === Number(vehiculo.id);

    /*
     * SISTEMA NUEVO:
     * relacionamos directamente por vehiculoId.
     *
     * SISTEMA VIEJO:
     * si el expediente tiene UN SOLO vehículo y la
     * actuación histórica no tiene vehiculoId,
     * pertenece a ese único vehículo.
     */

    const perteneceDirectamente = (item) =>
      mismoVehiculo(item?.vehiculoId) ||
      (
        esExpedienteUnVehiculo &&
        item?.vehiculoId == null
      );

    const actas =
      seguimiento.actas.filter(
        perteneceDirectamente
      );

    const emplazamientos =
      seguimiento.emplazamientos.filter(
        (item) =>
          perteneceDirectamente(item) ||
          actas.some(
            (acta) =>
              Number(acta.id) ===
              Number(item.actaId)
          )
      );

    const verificaciones =
      seguimiento.verificaciones.filter(
        (item) =>
          perteneceDirectamente(item) ||
          emplazamientos.some(
            (emplazamiento) =>
              Number(emplazamiento.id) ===
              Number(item.emplazamientoId)
          )
      );

    const infracciones =
      seguimiento.infracciones.filter(
        (item) =>
          perteneceDirectamente(item) ||
          verificaciones.some(
            (verificacion) =>
              Number(verificacion.id) ===
              Number(item.verificacionId)
          )
      );

    const remociones =
      seguimiento.remociones.filter(
        (item) =>
          perteneceDirectamente(item) ||
          infracciones.some(
            (infraccion) =>
              item.infraccionId != null &&
              Number(infraccion.id) ===
              Number(item.infraccionId)
          )
      );

    const ingresosPredio =
      seguimiento.ingresosPredio.filter(
        (item) =>
          perteneceDirectamente(item) ||
          remociones.some(
            (remocion) =>
              item.remocionId != null &&
              Number(remocion.id) ===
              Number(item.remocionId)
          )
      );

    const egresosPredio =
      seguimiento.egresosPredio.filter(
        (item) =>
          perteneceDirectamente(item) ||
          ingresosPredio.some(
            (ingreso) =>
              item.ingresoPredioId != null &&
              Number(ingreso.id) ===
              Number(item.ingresoPredioId)
          )
      );

    const actaViaPublica =
      ordenarIdDesc(actas).find(
        (item) =>
          !item.tipo ||
          item.tipo === "VIA_PUBLICA"
      ) || null;

    const ultimoEmplazamiento =
      ordenarIdDesc(
        emplazamientos
      )[0] || null;

    const ultimaVerificacion =
      ordenarIdDesc(
        verificaciones
      )[0] || null;

    const ultimaInfraccion =
      ordenarIdDesc(
        infracciones
      )[0] || null;

    const ultimaRemocion =
      ordenarIdDesc(
        remociones
      )[0] || null;

    const ultimoIngreso =
      ordenarIdDesc(
        ingresosPredio
      )[0] || null;

    const ultimoEgreso =
      ordenarIdDesc(
        egresosPredio
      )[0] || null;

    const inventario =
      ultimaRemocion
        ? (
            ultimaRemocion.inventario ||
            ultimaRemocion.InventarioVehiculo ||
            seguimiento.inventarios.find(
              (item) =>
                Number(item.id) ===
                Number(
                  ultimaRemocion.inventarioId
                )
            ) ||
            null
          )
        : null;

    let estadoTexto =
      nombresEstadoVehiculo[
        vehiculo.estadoActual
      ] ||
      vehiculo.estadoActual ||
      "Sin estado";

    let estadoDetalle = "";


    const estadosPosteriores = [
  "PENDIENTE_REMOCION",
  "REMOVIDO",
  "PENDIENTE_INGRESO_PREDIO",
  "EN_PREDIO",
  "EGRESADO",
];

if (
  ultimaVerificacion?.resultado === "CUMPLIDO" &&
  !estadosPosteriores.includes(vehiculo.estadoActual)
) {
  estadoTexto = "✅ Cumplido";
  estadoDetalle =
    "El inspector confirmó el cumplimiento en la segunda visita.";
}

    /*
     * EMPLAZAMIENTO / PRÓRROGA
     */

    if (
      vehiculo.estadoActual ===
      "EMPLAZADO"
    ) {
      if (
        ultimoEmplazamiento?.estado ===
          "VIGENTE" &&
        ultimoEmplazamiento
          ?.fechaVencimiento
      ) {
        estadoTexto =
          ultimoEmplazamiento.esProrroga
            ? "Prórroga vigente"
            : "Esperando vencimiento";

        estadoDetalle =
          `Vence ${formatearFecha(
            ultimoEmplazamiento
              .fechaVencimiento
          )}`;
      } else if (
        ultimoEmplazamiento?.estado ===
        "VENCIDO"
      ) {
        estadoTexto =
          "Plazo vencido";

        estadoDetalle =
          "Pendiente de nuevo control";
      }
    }

    /*
     * PENDIENTE DE REMOCIÓN
     */

 if (
  vehiculo.estadoActual === "PENDIENTE_REMOCION"
) {
  estadoTexto = "Pendiente de retiro";

  estadoDetalle = ultimaInfraccion?.numeroActa
    ? `Acta de infracción N.º ${ultimaInfraccion.numeroActa}`
    : "Tiene una actuación pendiente de remoción";
}


/*
 * ESTADO DE LA ORDEN JUDICIAL
 * Individual para cada vehículo.
 */

const estadoOrden =
  ultimaInfraccion?.estadoOrdenRemocion;

const vehiculoYaRetirado = [
  "REMOVIDO",
  "PENDIENTE_INGRESO_PREDIO",
  "EN_PREDIO",
  "EGRESADO",
].includes(vehiculo.estadoActual);

if (
  ultimaInfraccion?.requiereOrdenRemocion &&
  !vehiculoYaRetirado
) {
  if (estadoOrden === "PENDIENTE_SOLICITUD") {
    estadoTexto = "⚖️ Pendiente de solicitud judicial";
    estadoDetalle =
      "Secretaría debe solicitar al Juzgado la orden de remoción.";
  }

  if (estadoOrden === "ESPERANDO_RESPUESTA") {
    estadoTexto = "⏳ Esperando respuesta del juez";
    estadoDetalle =
      "La orden de remoción fue solicitada. Se espera la respuesta del Juzgado.";
  }

  if (estadoOrden === "AUTORIZADA") {
    estadoTexto = "✅ Orden judicial autorizada";
    estadoDetalle =
      "El Juzgado autorizó la remoción del vehículo.";
  }

  if (estadoOrden === "NO_AUTORIZADA") {
    estadoTexto = "❌ Orden judicial no autorizada";
    estadoDetalle =
      "El Juzgado no autorizó la remoción del vehículo.";
  }
}

    /*
     * YA FUE RETIRADO
     */


    if (
      vehiculo.estadoActual ===
        "REMOVIDO" ||
      vehiculo.estadoActual ===
        "PENDIENTE_INGRESO_PREDIO"
    ) {
      estadoTexto =
        "Retirado de la vía pública";

      estadoDetalle =
        ultimaRemocion?.destino ||
        "Pendiente de ingreso al predio";
    }

    /*
     * EN PREDIO
     */

    if (
      vehiculo.estadoActual ===
      "EN_PREDIO"
    ) {
      estadoTexto =
        "En predio municipal";

      const partesPredio = [];

      const nombrePredio =
        ultimoIngreso?.predio?.nombre ||
        ultimoIngreso?.Predio?.nombre;

      if (nombrePredio) {
        partesPredio.push(
          nombrePredio
        );
      }

      if (ultimoIngreso?.sector) {
        partesPredio.push(
          `Sector ${ultimoIngreso.sector}`
        );
      }

      if (ultimoIngreso?.posicion) {
        partesPredio.push(
          `Posición ${ultimoIngreso.posicion}`
        );
      }

      const recibidoPor =
        ultimoIngreso?.registradoPor
          ?.nombre ||
        ultimoIngreso?.registradoPor
          ?.usuario;

      if (recibidoPor) {
        partesPredio.push(
          `Recibido por ${recibidoPor}`
        );
      }

      estadoDetalle =
        partesPredio.length
          ? partesPredio.join(" · ")
          : "Ingreso al predio registrado";
    }

    /*
     * EGRESADO
     */

    if (
      vehiculo.estadoActual ===
      "EGRESADO"
    ) {
      estadoTexto =
        "Egresado del predio";

      if (
        ultimoEgreso?.tipoEgreso ===
        "ENTREGADO"
      ) {
        estadoDetalle =
          ultimoEgreso.destinoPersona
            ? `Entregado a ${ultimoEgreso.destinoPersona}`
            : "Vehículo entregado";
      } else if (
        ultimoEgreso?.tipoEgreso ===
        "TRASLADADO"
      ) {
        estadoDetalle =
          ultimoEgreso
            ?.predioDestino?.nombre ||
          "Trasladado a otro destino";
      } else if (
        ultimoEgreso?.tipoEgreso ===
        "COMPACTADO"
      ) {
        estadoDetalle =
          "Vehículo compactado";
      } else {
        estadoDetalle =
          "Salida del predio registrada";
      }
    }

    /*
     * COMPATIBILIDAD HISTÓRICA
     *
     * Algunos expedientes viejos pueden tener
     * movimientos finales pero un estadoActual
     * antiguo o incompleto.
     */

    if (
      ultimoIngreso &&
      !ultimoEgreso &&
      ![
        "EN_PREDIO",
        "EGRESADO",
      ].includes(vehiculo.estadoActual)
    ) {
      estadoTexto =
        "En predio municipal";

      const partes = [
        ultimoIngreso?.predio?.nombre ||
          ultimoIngreso?.Predio?.nombre,

        ultimoIngreso?.sector
          ? `Sector ${ultimoIngreso.sector}`
          : null,

        ultimoIngreso?.posicion
          ? `Posición ${ultimoIngreso.posicion}`
          : null,
      ].filter(Boolean);

      estadoDetalle =
        partes.length
          ? partes.join(" · ")
          : "Ingreso al predio registrado";
    }

    if (
      ultimoEgreso &&
      vehiculo.estadoActual !==
        "EGRESADO"
    ) {
      estadoTexto =
        "Egresado del predio";

      estadoDetalle =
        nombresEgreso[
          ultimoEgreso.tipoEgreso
        ] ||
        ultimoEgreso.tipoEgreso ||
        "Salida del predio registrada";
    }

    if (
      ultimaRemocion &&
      !ultimoIngreso &&
      !ultimoEgreso &&
      ![
        "PENDIENTE_REMOCION",
        "REMOVIDO",
        "PENDIENTE_INGRESO_PREDIO",
      ].includes(vehiculo.estadoActual)
    ) {
      estadoTexto =
        "Retirado de la vía pública";

      estadoDetalle =
        ultimaRemocion.destino ||
        "Pendiente de ingreso al predio";
    }

    const dominio =
      vehiculo.dominio ||
      vehiculo.patente ||
      "Sin dominio";

    const descripcion = [
      vehiculo.marca,
      vehiculo.modelo,
      vehiculo.color,
    ]
      .filter(Boolean)
      .join(" · ");

    return {
      indice: index + 1,

      vehiculo,

      dominio,

      descripcion,

      estadoTexto,

      estadoDetalle,

      actas,

      emplazamientos,

      verificaciones,

      infracciones,

      remociones,

      ingresosPredio,

      egresosPredio,

      actaViaPublica,

      ultimoEmplazamiento,

      ultimaVerificacion,

      ultimaInfraccion,

      ultimaRemocion,

      ultimoIngreso,

      ultimoEgreso,

      inventario,
    };
  });
}, [
  seguimiento.vehiculos,
  seguimiento.actas,
  seguimiento.emplazamientos,
  seguimiento.verificaciones,
  seguimiento.infracciones,
  seguimiento.remociones,
  seguimiento.ingresosPredio,
  seguimiento.egresosPredio,
  seguimiento.inventarios,
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








const obtenerVehiculoActuacion = (datos = {}) => {
  if (!datos) {
    return null;
  }

  /*
   * =====================================================
   * RELACIÓN DIRECTA
   * =====================================================
   *
   * Sistema nuevo:
   * vehiculoId
   *
   * También contemplamos relaciones Sequelize:
   * vehiculo / Vehiculo
   */

  const vehiculoId =
    datos.vehiculoId ||
    datos.vehiculo?.id ||
    datos.Vehiculo?.id ||
    null;

  if (vehiculoId) {
    const encontrado =
      seguimiento.vehiculos.find(
        (vehiculo) =>
          Number(vehiculo.id) ===
          Number(vehiculoId)
      );

    if (encontrado) {
      return encontrado;
    }
  }

  /*
   * =====================================================
   * EMPLAZAMIENTO
   * =====================================================
   */

  if (datos.emplazamientoId) {
    const emplazamiento =
      seguimiento.emplazamientos.find(
        (item) =>
          Number(item.id) ===
          Number(datos.emplazamientoId)
      );

    if (emplazamiento) {
      const encontrado =
        obtenerVehiculoActuacion(
          emplazamiento
        );

      if (encontrado) {
        return encontrado;
      }
    }
  }

  /*
   * =====================================================
   * VERIFICACIÓN
   * =====================================================
   */

  if (datos.verificacionId) {
    const verificacion =
      seguimiento.verificaciones.find(
        (item) =>
          Number(item.id) ===
          Number(datos.verificacionId)
      );

    if (verificacion) {
      const encontrado =
        obtenerVehiculoActuacion(
          verificacion
        );

      if (encontrado) {
        return encontrado;
      }
    }
  }

  /*
   * =====================================================
   * ACTA
   * =====================================================
   */

  if (datos.actaId) {
    const acta =
      seguimiento.actas.find(
        (item) =>
          Number(item.id) ===
          Number(datos.actaId)
      );

    if (acta) {
      const encontrado =
        obtenerVehiculoActuacion(
          acta
        );

      if (encontrado) {
        return encontrado;
      }
    }
  }

  /*
   * =====================================================
   * OBJETOS ANIDADOS
   * =====================================================
   *
   * Los eventos de la cronología pueden venir como:
   *
   * { visita, acta, emplazamiento }
   *
   * o:
   *
   * { verificacion, infraccion, prorroga }
   */

  const relacionados = [
    datos.verificacion,
    datos.infraccion,
    datos.prorroga,
    datos.acta,
    datos.emplazamiento,
    datos.visita,
    datos.remocion,
    datos.ingreso,
    datos.egreso,
  ].filter(Boolean);

  for (const relacionado of relacionados) {
    const encontrado =
      obtenerVehiculoActuacion(
        relacionado
      );

    if (encontrado) {
      return encontrado;
    }
  }

  /*
   * =====================================================
   * SISTEMA VIEJO
   * =====================================================
   *
   * Los expedientes históricos podían no guardar
   * vehiculoId en todas las actuaciones.
   *
   * Si solamente existe UN vehículo, podemos asociar
   * de forma segura la actuación a ese vehículo.
   *
   * Si existen varios vehículos NO adivinamos.
   */

  if (
    seguimiento.vehiculos.length === 1
  ) {
    return seguimiento.vehiculos[0];
  }

  return null;
};

const obtenerNumeroVehiculo = (vehiculo) => {
  if (!vehiculo) {
    return null;
  }

  const indice =
    seguimiento.vehiculos.findIndex(
      (item) =>
        Number(item.id) ===
        Number(vehiculo.id)
    );

  return indice >= 0
    ? indice + 1
    : null;
};

const obtenerIdentificacionVehiculo = (
  datos = {}
) => {
  const vehiculo =
    obtenerVehiculoActuacion(datos);

  if (!vehiculo) {
    return null;
  }

  const numero =
    obtenerNumeroVehiculo(vehiculo);

  const dominio =
    vehiculo.dominio ||
    vehiculo.patente ||
    "Sin dominio";

  return {
    vehiculo,
    numero,
    dominio,
    texto:
      numero
        ? `Vehículo ${numero} · ${dominio}`
        : dominio,
  };
};

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
      /*
       * Todas las actas pertenecientes
       * a esta visita / constatación.
       *
       * IMPORTANTE:
       * usamos filter(), NO find(),
       * porque una misma visita puede
       * tener varios vehículos.
       */
      const actasDeLaVisita =
        seguimiento.actas.filter(
          (acta) =>
            Number(
              acta.constatacionId
            ) ===
            Number(
              visita.id
            )
        );

      /*
       * Si existen actas, generamos
       * UN EVENTO POR CADA ACTA.
       *
       * De esa manera cada vehículo
       * conserva su propia relación:
       *
       * vehículo -> acta -> emplazamiento
       */
      if (
        actasDeLaVisita.length > 0
      ) {
        actasDeLaVisita.forEach(
          (acta) => {
            const emplazamiento =
              seguimiento
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
              null;

            /*
             * Determinamos el vehículo
             * de ESTA actuación.
             *
             * Primero usamos el vehiculoId
             * del acta.
             *
             * Si por compatibilidad el acta
             * no lo tiene, intentamos con
             * el emplazamiento.
             */
            const vehiculoId =
              acta.vehiculoId ??
              emplazamiento?.vehiculoId ??
              visita.vehiculoId ??
              null;

            /*
             * Creamos una copia de la visita
             * con el vehículo correcto.
             *
             * Así el render de VISITA que
             * ya corregimos encuentra
             * exactamente ese vehículo.
             */
            const visitaDelVehiculo = {
              ...visita,

              vehiculoId,
            };

            lista.push({
              id:
                `visita-${visita.id}-acta-${acta.id}`,

              tipo:
                "VISITA",

              fecha:
                visita.fechaHora ||
                visita.createdAt,

              datos: {
                visita:
                  visitaDelVehiculo,

                acta,

                emplazamiento,
              },
            });
          }
        );

        return;
      }

      /*
       * Si NO hubo acta, igualmente
       * conservamos la visita.
       *
       * Esto sirve para:
       * - constataciones
       * - reclamos sin emplazamiento
       * - sistema anterior
       */
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

          acta: null,

          emplazamiento: null,
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

const confirmarInformeFueraCompetencia = async () => {
  const informe = informeJefeGuardia.trim();

  if (!informe) {
    setErrorInformeJefe(
      "Tenés que escribir por qué el reclamo no corresponde a Tránsito."
    );
    return;
  }

  if (enviandoInformeJefe) {
    return;
  }

  const confirmar = window.confirm(
    "¿Confirmás que este reclamo no corresponde a Tránsito?\n\n" +
    "El informe será enviado a Secretaría para su cierre externo. " +
    "Esto no significa que el problema haya sido solucionado."
  );

  if (!confirmar) {
    return;
  }

  try {
    setEnviandoInformeJefe(true);
    setErrorInformeJefe("");

    await api.post(
      `/reclamos/${reclamo.id}/derivar-fuera-competencia`,
      {
        informeJefeGuardia: informe,
      }
    );

    setMostrarInformeJefe(false);
    setInformeJefeGuardia("");

    await cargarReclamo();

    window.alert(
      "Informe registrado. El reclamo quedó pendiente de cierre por Secretaría."
    );
  } catch (err) {
    console.error(
      "Error informando fuera de competencia:",
      err
    );

    setErrorInformeJefe(
      err.response?.data?.mensaje ||
      "No se pudo registrar el informe."
    );
  } finally {
    setEnviandoInformeJefe(false);
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




        /*
 * =====================================================
 * HISTORIAL AGRUPADO POR VEHÍCULO
 * =====================================================
 *
 * Con varios vehículos:
 * - los eventos generales quedan arriba
 * - cada vehículo tiene su propia cronología
 *
 * Con un solo vehículo:
 * - mantenemos el historial tradicional
 * - conserva compatibilidad con expedientes viejos
 */
const historialPorVehiculo = (() => {
  if (
    seguimiento.vehiculos.length <= 1
  ) {
    return null;
  }

  const generales = [];

  const grupos =
    seguimiento.vehiculos.map(
      (vehiculo, index) => ({
        vehiculo,
        numero: index + 1,
        eventos: [],
      })
    );

  eventos.forEach((evento) => {
    /*
     * Eventos generales del expediente.
     * No pertenecen a un vehículo particular.
     */
    if (
      evento.tipo === "RECLAMO" ||
      evento.tipo === "ASIGNACION"
    ) {
      generales.push(evento);
      return;
    }

    let datosParaVehiculo;

    if (evento.tipo === "VISITA") {
      datosParaVehiculo = {
        ...evento.datos?.visita,

        vehiculoId:
          evento.datos?.visita
            ?.vehiculoId ||
          evento.datos?.acta
            ?.vehiculoId ||
          evento.datos?.emplazamiento
            ?.vehiculoId,
      };
    } else if (
      evento.tipo === "CONTROL"
    ) {
      datosParaVehiculo = {
        ...evento.datos?.verificacion,

        vehiculoId:
          evento.datos?.verificacion
            ?.vehiculoId ||
          evento.datos?.infraccion
            ?.vehiculoId ||
          evento.datos?.prorroga
            ?.vehiculoId,
      };
    } else {
      datosParaVehiculo =
        evento.datos;
    }

    const vehiculo =
      obtenerVehiculoActuacion(
        datosParaVehiculo
      );

    if (!vehiculo) {
      /*
       * Si no sabemos de qué vehículo es,
       * no inventamos la asociación.
       */
      generales.push(evento);
      return;
    }

    const grupo =
      grupos.find(
        (item) =>
          Number(
            item.vehiculo.id
          ) ===
          Number(
            vehiculo.id
          )
      );

    if (grupo) {
      grupo.eventos.push(
        evento
      );
    } else {
      generales.push(
        evento
      );
    }
  });

  const ordenarEventos =
    (lista = []) =>
      [...lista].sort(
        (a, b) =>
          new Date(
            a.fecha || 0
          ).getTime() -
          new Date(
            b.fecha || 0
          ).getTime()
      );

  return {
    generales:
      ordenarEventos(
        generales
      ),

    grupos:
      grupos.map(
        (grupo) => ({
          ...grupo,

          eventos:
            ordenarEventos(
              grupo.eventos
            ),
        })
      ),
  };
})();
        /* =====================================================
          RENDER EVENTOS
        ===================================================== */

        const renderEvento =
          (evento) => {
            const datos =
              evento.datos;

              const datosParaVehiculo =
  evento.tipo === "VISITA"
    ? {
        ...datos.visita,
        vehiculoId:
          datos.visita?.vehiculoId ||
          datos.acta?.vehiculoId ||
          datos.emplazamiento?.vehiculoId,
      }
    : evento.tipo === "CONTROL"
    ? {
        ...datos.verificacion,
        vehiculoId:
          datos.verificacion?.vehiculoId ||
          datos.infraccion?.vehiculoId ||
          datos.prorroga?.vehiculoId,
      }
    : datos;

const identificacionVehiculo =
  obtenerIdentificacionVehiculo(
    datosParaVehiculo
  );

const etiquetaVehiculo =
  identificacionVehiculo &&
  !["RECLAMO", "ASIGNACION"].includes(
    evento.tipo
  ) ? (
    <div className="cronologia-vehiculo">
      <span>
        🚗{" "}
        {identificacionVehiculo.numero
          ? `Vehículo ${identificacionVehiculo.numero}`
          : "Vehículo"}
      </span>

      <strong>
        {identificacionVehiculo.dominio}
      </strong>
    </div>
  ) : null;


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

  /*
   * =====================================================
   * VEHÍCULO DE ESTA VISITA
   * =====================================================
   */

  const vehiculo =
    seguimiento.vehiculos.find(
      (item) =>
        Number(item.id) ===
        Number(visita?.vehiculoId)
    ) ||
    (
      seguimiento.vehiculos.length === 1
        ? seguimiento.vehiculos[0]
        : null
    );

  /*
   * Número visual dentro DEL RECLAMO.
   *
   * NO usamos:
   * - vehiculo.id
   * - vehiculo.numeroInterno
   *
   * Queremos:
   * Vehículo 1
   * Vehículo 2
   * etc.
   */

  const numeroVehiculo =
    vehiculo
      ? obtenerNumeroVehiculo(
          vehiculo
        )
      : null;

  const dominioVehiculo =
    vehiculo?.dominio ||
    vehiculo?.patente ||
    "Sin dominio";

  /*
   * =====================================================
   * FOTOS DEL SISTEMA NUEVO
   * =====================================================
   *
   * VEHICULO:
   * referenciaId = vehiculo.id
   *
   * EMPLAZAMIENTO:
   * referenciaId = emplazamiento.id
   */

  const hayAlgunaFotoVehiculoNueva =
    seguimiento.fotos.some(
      (foto) =>
        foto.tipoReferencia ===
          "VEHICULO" &&
        foto.referenciaId != null
    );

  const hayFotoVehiculoActual =
    Boolean(
      vehiculo &&
      seguimiento.fotos.some(
        (foto) =>
          foto.tipoReferencia ===
            "VEHICULO" &&
          Number(
            foto.referenciaId
          ) ===
            Number(
              vehiculo.id
            )
      )
    );

  /*
   * =====================================================
   * COMPATIBILIDAD CON SISTEMA VIEJO
   * =====================================================
   *
   * En los expedientes viejos la foto del auto
   * estaba guardada como CONSTATACION.
   *
   * Solamente usamos ese comportamiento cuando:
   *
   * - no existen fotos VEHICULO nuevas
   * - el expediente tiene un único vehículo
   *
   * Con varios vehículos NO adivinamos asociaciones.
   */

  const esVehiculoHistorico =
    Boolean(vehiculo) &&
    !hayAlgunaFotoVehiculoNueva &&
    seguimiento.vehiculos.length === 1;

  const esSistemaNuevoVehiculos =
    Boolean(vehiculo) &&
    hayAlgunaFotoVehiculoNueva;

  return (
    <>
      <span className="evento-etiqueta">
        VISITA AL LUGAR
      </span>

      {vehiculo && (
        <div
          className="cronologia-vehiculo"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          <span>
            🚗{" "}
            {numeroVehiculo
              ? `Vehículo ${numeroVehiculo}`
              : "Vehículo"}
          </span>

          <strong>
            {dominioVehiculo}
          </strong>
        </div>
      )}

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

      {visita.situacion && (
        <div className="evento-texto">
          <span>
            Qué encontró
          </span>

          <p>
            {visita.situacion}
          </p>
        </div>
      )}

      {visita.observaciones && (
        <div className="evento-texto">
          <span>
            Observaciones
          </span>

          <p>
            {visita.observaciones}
          </p>
        </div>
      )}

      {acta && (
        <div className="evento-subseccion">
          <span>
            ACTA DE VÍA PÚBLICA
          </span>

          <strong>
            N.º{" "}
            {acta.numeroActa}
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
                    {emplazamiento.plazoCantidad ||
                      acta.plazoHoras ||
                      "—"}{" "}
                    {emplazamiento.plazoUnidad ===
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
            </>
          )}

          {/* ==========================================
              EVIDENCIA DE LA PRIMERA VISITA
          ========================================== */}

          <div className="evidencia-primera-visita">

            {/* ========================================
                SISTEMA VIEJO
            ======================================== */}

 {esVehiculoHistorico && (
  <div className="evidencias-historicas-grid">

    <div className="evidencia-historica-item">
      <strong className="evidencia-visita-titulo">
        📷 Constatación
      </strong>

      <span className="evidencia-visita-descripcion">
        Cómo estaba el lugar al llegar
      </span>

      <FotosReclamo
        reclamoId={reclamo.id}
        tipoReferencia="CONSTATACION"
        permitirSubir={false}
      />
    </div>

    {acta && emplazamiento && (
      <div className="evidencia-historica-item">
        <strong className="evidencia-visita-titulo">
          📝 Emplazamiento
        </strong>

        <span className="evidencia-visita-descripcion">
          Emplazamiento realizado
        </span>

        <FotosReclamo
          reclamoId={reclamo.id}
          tipoReferencia="EMPLAZAMIENTO"
          permitirSubir={false}
        />
      </div>
    )}

  </div>
)}

            {/* ========================================
                RECLAMO SIN VEHÍCULO
            ======================================== */}

            {!vehiculo && (
              <div className="evidencia-general">
                <strong className="evidencia-visita-titulo">
                  📷 Constatación
                </strong>

                <span className="evidencia-visita-descripcion">
                  Cómo estaba el lugar al llegar
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
            )}

            {/* ========================================
                VEHÍCULO
            ======================================== */}

            {vehiculo && (
              <div className="evidencia-vehiculo-bloque">

                {/* CABECERA */}

                <div className="evidencia-vehiculo-cabecera">

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      flexWrap: "wrap",
                      marginBottom: "12px",
                    }}
                  >
                    <strong
                      style={{
                        fontSize: "16px",
                      }}
                    >
                      🚗{" "}
                      {numeroVehiculo
                        ? `Vehículo ${numeroVehiculo}`
                        : "Vehículo"}
                    </strong>

                    <strong
                      style={{
                        fontSize: "16px",
                      }}
                    >
                      · {dominioVehiculo}
                    </strong>
                  </div>

                  <div className="evento-datos-linea">

                    <div>
                      <span>
                        Marca
                      </span>

                      <strong>
                        {vehiculo.marca ||
                          "—"}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Modelo
                      </span>

                      <strong>
                        {vehiculo.modelo ||
                          "—"}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Color
                      </span>

                      <strong>
                        {vehiculo.color ||
                          "—"}
                      </strong>
                    </div>

                  </div>
                </div>

                {/* ====================================
                    FOTOS DEL MISMO VEHÍCULO
                ==================================== */}

                {esSistemaNuevoVehiculos && (
                  <div className="evidencia-vehiculo-fotos">

                    {/* FOTO DEL AUTO */}

                    <div className="evidencia-vehiculo-foto">
                      <strong className="evidencia-visita-titulo">
                        📷 Foto del vehículo
                      </strong>

                      <span className="evidencia-visita-descripcion">
                        {numeroVehiculo
                          ? `Vehículo ${numeroVehiculo} · ${dominioVehiculo}`
                          : dominioVehiculo}
                      </span>

                      {hayFotoVehiculoActual ? (
                        <FotosReclamo
                          reclamoId={
                            reclamo.id
                          }
                          tipoReferencia="VEHICULO"
                          referenciaId={
                            vehiculo.id
                          }
                          permitirSubir={
                            false
                          }
                        />
                      ) : (
                        <span className="evidencia-visita-descripcion">
                          Sin fotografía registrada
                        </span>
                      )}
                    </div>

                    {/* FOTO DEL EMPLAZAMIENTO */}

                    {acta &&
                      emplazamiento && (
                        <div className="evidencia-vehiculo-foto">
                          <strong className="evidencia-visita-titulo">
                            📝 Emplazamiento
                          </strong>

                          <span className="evidencia-visita-descripcion">
                            {numeroVehiculo
                              ? `Vehículo ${numeroVehiculo} · ${dominioVehiculo}`
                              : dominioVehiculo}
                            {" · "}
                            Acta N.º{" "}
                            {acta.numeroActa ||
                              "—"}
                          </span>

                          <FotosReclamo
                            reclamoId={
                              reclamo.id
                            }
                            tipoReferencia="EMPLAZAMIENTO"
                            referenciaId={
                              emplazamiento.id
                            }
                            permitirSubir={
                              false
                            }
                          />
                        </div>
                      )}

                  </div>
                )}

              </div>
            )}

          </div>
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

{etiquetaVehiculo}

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

{etiquetaVehiculo}

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
                  {etiquetaVehiculo}

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
    Secretaría de Reclamos
  </span>

  <strong>
    {nombreUsuario(
      datos
        .enviadoJuzgadoPor
    )}{" "}
    envió la infracción al Juzgado
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
                    {etiquetaVehiculo}

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

        {etiquetaVehiculo}

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
{etiquetaVehiculo}
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
  datos.Vehiculo ||
  seguimiento.vehiculos.find(
    (item) =>
      Number(item.id) ===
      Number(datos.vehiculoId)
  ) ||
  (
    seguimiento.vehiculos.length === 1
      ? seguimiento.vehiculos[0]
      : null
  );

  const identificacion =
    obtenerIdentificacionVehiculo({
      ...datos,
      vehiculoId:
        datos.vehiculoId ||
        vehiculo?.id,
    });

  const inventario =
    datos.inventario ||
    datos.InventarioVehiculo ||
    seguimiento.inventarios.find(
      (item) =>
        Number(item.id) ===
        Number(datos.inventarioId)
    ) ||
    null;

  return (
    <>
      <span className="evento-etiqueta remocion">
        🚛 VEHÍCULO RETIRADO
      </span>

      {identificacion && (
        <div className="cronologia-vehiculo">
          <span>
            🚗{" "}
            {identificacion.numero
              ? `Vehículo ${identificacion.numero}`
              : "Vehículo"}
          </span>

          <strong>
            {identificacion.dominio}
          </strong>
        </div>
      )}

      <h3>
        {vehiculo
          ? `${vehiculo.marca || ""} ${vehiculo.modelo || ""}`.trim() ||
            "Vehículo"
          : "Vehículo"}
      </h3>

      <div className="evento-datos-linea">
        <div>
          <span>Dominio</span>
          <strong>
            {vehiculo?.dominio ||
              vehiculo?.patente ||
              "Sin dominio"}
          </strong>
        </div>

        <div>
          <span>Destino</span>
          <strong>
            {datos.destino || "—"}
          </strong>
        </div>

        <div>
          <span>Grúa</span>
          <strong>
            {datos.grua || "—"}
          </strong>
        </div>

        <div>
          <span>Chofer</span>
          <strong>
            {datos.chofer || "—"}
          </strong>
        </div>

        <div>
          <span>Inspector</span>
          <strong>
            {nombreUsuario(
              datos.inspector
            )}
          </strong>
        </div>

        <div>
          <span>Fecha del retiro</span>
          <strong>
            {formatearFecha(
              datos.fechaHora ||
              datos.createdAt
            )}
          </strong>
        </div>
      </div>

      {datos.observaciones && (
        <div className="evento-texto">
          <span>Observaciones</span>
          <p>
            {datos.observaciones}
          </p>
        </div>
      )}

    <div className="evento-fotos">
  <strong>
    📷 Vehículo cargado en la grúa
  </strong>

  <FotosReclamo
    reclamoId={reclamo.id}
    tipoReferencia="REMOCION"
    referenciaId={
      datos.vehiculoId ||
      vehiculo?.id
    }
    permitirSubir={false}
  />
</div>

      {inventario && (
        <div className="evento-subseccion">
          <span>
            INVENTARIO DEL VEHÍCULO
          </span>

          <strong>
            Inventario registrado
          </strong>

          <button
            type="button"
            className="boton-inventario"
            onClick={() =>
              abrirInventario(datos)
            }
          >
            🚗 Ver inventario completo
          </button>
        </div>
      )}
    </>
  );
}
       if (
  evento.tipo ===
  "INGRESO_PREDIO"
) {
 const vehiculo =
  datos.vehiculo ||
  datos.Vehiculo ||
  seguimiento.vehiculos.find(
    (item) =>
      Number(item.id) ===
      Number(datos.vehiculoId)
  ) ||
  (
    seguimiento.vehiculos.length === 1
      ? seguimiento.vehiculos[0]
      : null
  );

  const identificacion =
    obtenerIdentificacionVehiculo({
      ...datos,
      vehiculoId:
        datos.vehiculoId ||
        vehiculo?.id,
    });

  const remocionVehiculo =
    [...seguimiento.remociones]
      .filter(
        (item) =>
          Number(item.vehiculoId) ===
          Number(
            datos.vehiculoId ||
            vehiculo?.id
          )
      )
      .sort(
        (a, b) =>
          Number(b.id) -
          Number(a.id)
      )[0] || null;

  const inventario =
    remocionVehiculo?.inventario ||
    remocionVehiculo?.InventarioVehiculo ||
    seguimiento.inventarios.find(
      (item) =>
        Number(item.id) ===
        Number(
          remocionVehiculo?.inventarioId
        )
    ) ||
    null;

  return (
    <>
      <span className="evento-etiqueta predio">
        ✅ VEHÍCULO RECIBIDO EN EL PREDIO
      </span>

      {identificacion && (
        <div className="cronologia-vehiculo">
          <span>
            🚗{" "}
            {identificacion.numero
              ? `Vehículo ${identificacion.numero}`
              : "Vehículo"}
          </span>

          <strong>
            {identificacion.dominio}
          </strong>
        </div>
      )}

      <h3>
        {datos.predio?.nombre ||
          datos.Predio?.nombre ||
          "Predio municipal"}
      </h3>

      <div className="evento-datos-linea">
        <div>
          <span>Vehículo</span>

          <strong>
            {vehiculo?.numeroInterno
              ? `Interno N.º ${vehiculo.numeroInterno}`
              : vehiculo?.dominio ||
                vehiculo?.patente ||
                "—"}
          </strong>
        </div>

        {(vehiculo?.marca ||
          vehiculo?.modelo) && (
          <div>
            <span>Descripción</span>

            <strong>
              {[
                vehiculo.marca,
                vehiculo.modelo,
                vehiculo.color,
              ]
                .filter(Boolean)
                .join(" · ")}
            </strong>
          </div>
        )}

        <div>
          <span>Sector</span>
          <strong>
            {datos.sector || "—"}
          </strong>
        </div>

        <div>
          <span>Posición / Precinto</span>
          <strong>
            {datos.posicion || "—"}
          </strong>
        </div>

        <div>
          <span>Fecha de ingreso</span>
          <strong>
            {formatearFecha(
              datos.fechaHora ||
              datos.createdAt
            )}
          </strong>
        </div>

        <div>
          <span>Recibido por</span>
          <strong>
            {nombreUsuario(
              datos.registradoPor
            )}
          </strong>
        </div>
      </div>

      {remocionVehiculo && (
        <div className="evento-subseccion">
          <span>
            DATOS DEL RETIRO
          </span>

          <div className="evento-datos-linea">
            <div>
              <span>Destino informado</span>
              <strong>
                {remocionVehiculo.destino ||
                  "—"}
              </strong>
            </div>

            <div>
              <span>Grúa</span>
              <strong>
                {remocionVehiculo.grua ||
                  "—"}
              </strong>
            </div>

            <div>
              <span>Chofer</span>
              <strong>
                {remocionVehiculo.chofer ||
                  "—"}
              </strong>
            </div>
          </div>
        </div>
      )}

      {datos.observaciones && (
        <div className="evento-texto">
          <span>
            Observaciones del ingreso
          </span>

          <p>
            {datos.observaciones}
          </p>
        </div>
      )}

      <div className="evento-fotos">
        <strong>
          📷 Evidencia del ingreso al predio
        </strong>

        <FotosReclamo
          reclamoId={reclamo.id}
          tipoReferencia="INGRESO_PREDIO"
          referenciaId={datos.id}
          permitirSubir={false}
        />
      </div>

      {inventario &&
        remocionVehiculo && (
          <button
            type="button"
            className="boton-inventario"
            onClick={() =>
              abrirInventario(
                remocionVehiculo
              )
            }
          >
            🚗 Ver inventario completo del vehículo
          </button>
        )}
    </>
  );
}
if (
  evento.tipo ===
  "EGRESO_PREDIO"
) {
const vehiculo =
  datos.vehiculo ||
  datos.Vehiculo ||
  seguimiento.vehiculos.find(
    (item) =>
      Number(item.id) ===
      Number(datos.vehiculoId)
  ) ||
  (
    seguimiento.vehiculos.length === 1
      ? seguimiento.vehiculos[0]
      : null
  );
  const identificacion =
    obtenerIdentificacionVehiculo({
      ...datos,
      vehiculoId:
        datos.vehiculoId ||
        vehiculo?.id,
    });

  const ingresoAnterior =
    [...seguimiento.ingresosPredio]
      .filter(
        (item) =>
          Number(item.vehiculoId) ===
          Number(
            datos.vehiculoId ||
            vehiculo?.id
          )
      )
      .sort(
        (a, b) =>
          Number(b.id) -
          Number(a.id)
      )[0] || null;

  return (
    <>
      <span className="evento-etiqueta salida">
        🚪 SALIDA DEL PREDIO
      </span>

      {identificacion && (
        <div className="cronologia-vehiculo">
          <span>
            🚗{" "}
            {identificacion.numero
              ? `Vehículo ${identificacion.numero}`
              : "Vehículo"}
          </span>

          <strong>
            {identificacion.dominio}
          </strong>
        </div>
      )}

      <h3>
        {nombresEgreso[
          datos.tipoEgreso
        ] ||
          datos.tipoEgreso ||
          "Salida registrada"}
      </h3>

      <div className="evento-datos-linea">
        <div>
          <span>Vehículo</span>

          <strong>
            {vehiculo?.dominio ||
              vehiculo?.patente ||
              "—"}
          </strong>
        </div>

        <div>
          <span>Tipo de salida</span>

          <strong>
            {nombresEgreso[
              datos.tipoEgreso
            ] ||
              datos.tipoEgreso ||
              "—"}
          </strong>
        </div>

        <div>
          <span>Fecha de salida</span>

          <strong>
            {formatearFecha(
              datos.fechaHora ||
              datos.createdAt
            )}
          </strong>
        </div>

        {ingresoAnterior && (
          <div>
            <span>
              Salió de
            </span>

            <strong>
              {ingresoAnterior.predio?.nombre ||
                ingresoAnterior.Predio?.nombre ||
                "Predio municipal"}
            </strong>
          </div>
        )}

        {datos.tipoEgreso ===
          "TRASLADADO" &&
          datos.predioDestino?.nombre && (
            <div>
              <span>
                Destino del traslado
              </span>

              <strong>
                {datos.predioDestino.nombre}
              </strong>
            </div>
          )}

        {datos.destinoPersona && (
          <div>
            <span>
              Entregado / destino
            </span>

            <strong>
              {datos.destinoPersona}
            </strong>
          </div>
        )}

        {datos.dniPersona && (
          <div>
            <span>DNI</span>

            <strong>
              {datos.dniPersona}
            </strong>
          </div>
        )}

        {datos.numeroOficio && (
          <div>
            <span>N.º de oficio</span>

            <strong>
              {datos.numeroOficio}
            </strong>
          </div>
        )}

        {datos.numeroLibro && (
          <div>
            <span>N.º de libro</span>

            <strong>
              {datos.numeroLibro}
            </strong>
          </div>
        )}

        {datos.numeroPagina && (
          <div>
            <span>N.º de página</span>

            <strong>
              {datos.numeroPagina}
            </strong>
          </div>
        )}

        <div>
          <span>Registrado por</span>

          <strong>
            {nombreUsuario(
              datos.registradoPor
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
      <span>ESTADO RÁPIDO</span>

      <h2>
        ¿Dónde está parado este reclamo?
      </h2>

      {vehiculosDelReclamo.length > 1 && (
        <p>
          Este reclamo tiene{" "}
          <strong>
            {vehiculosDelReclamo.length} vehículos
          </strong>
          . Cada uno puede estar en una etapa diferente.
        </p>
      )}
    </div>
  </div>

  {vehiculosDelReclamo.length > 0 ? (
    <div className="vehiculos-reclamo-lista">
      {vehiculosDelReclamo.map((item) => {
       const {
  vehiculo,
  indice,
  dominio,
  descripcion,
  estadoTexto,
  estadoDetalle,
  actaViaPublica,
  ultimoEmplazamiento,
  ultimaVerificacion,
  ultimaInfraccion,
  ultimaRemocion,
  ultimoIngreso,
  ultimoEgreso,
  inventario,
} = item;

      

        return (
          <article
            key={vehiculo.id}
            className="vehiculo-reclamo-card"
          >
            <div className="vehiculo-reclamo-titulo">
              <div>
                <span className="vehiculo-reclamo-numero">
                  {vehiculosDelReclamo.length > 1
                    ? `VEHÍCULO ${indice}`
                    : "VEHÍCULO"}
                </span>

                <h3>
                  {dominio}
                </h3>

                {descripcion && (
                  <p>{descripcion}</p>
                )}
              </div>

              <div className="vehiculo-reclamo-estado">
                <strong>
                  {estadoTexto}
                </strong>

                {estadoDetalle && (
                  <span>
                    {estadoDetalle}
                  </span>
                )}
              </div>
            </div>

            <div className="vehiculo-reclamo-datos">
              <div className="vehiculo-reclamo-dato">
                <span>
                  📄 ACTA DE VÍA PÚBLICA
                </span>

                {actaViaPublica ? (
                  <>
                    <strong>
                      N.º{" "}
                      {actaViaPublica.numeroActa || "—"}
                    </strong>

                    {actaViaPublica.fechaHora && (
                      <small>
                        {formatearFecha(
                          actaViaPublica.fechaHora
                        )}
                      </small>
                    )}
                  </>
                ) : (
                  <strong>
                    No registrada
                  </strong>
                )}
              </div>

              {ultimoEmplazamiento && (
                <div className="vehiculo-reclamo-dato">
                  <span>
                    ⏱{" "}
                    {ultimoEmplazamiento.esProrroga
                      ? "PRÓRROGA"
                      : "EMPLAZAMIENTO"}
                  </span>

                  <strong>
                    {ultimoEmplazamiento.estado === "VIGENTE"
                      ? "Plazo vigente"
                      : ultimoEmplazamiento.estado === "VENCIDO"
                      ? "Plazo vencido"
                      : ultimoEmplazamiento.estado || "Registrado"}
                  </strong>

                  {ultimoEmplazamiento.fechaVencimiento && (
                    <small>
                      Vence:{" "}
                      {formatearFecha(
                        ultimoEmplazamiento.fechaVencimiento
                      )}
                    </small>
                  )}
                </div>
              )}

              {ultimaVerificacion && (
                <div className="vehiculo-reclamo-dato">
                  <span>
                    🔎 ÚLTIMO CONTROL
                  </span>

                  <strong>
                    {nombresResultadoControl[
                      ultimaVerificacion.resultado
                    ] ||
                      ultimaVerificacion.resultado ||
                      "Registrado"}
                  </strong>

                  {(ultimaVerificacion.fechaHora ||
                    ultimaVerificacion.createdAt) && (
                    <small>
                      {formatearFecha(
                        ultimaVerificacion.fechaHora ||
                          ultimaVerificacion.createdAt
                      )}
                    </small>
                  )}
                </div>
              )}
{ultimaInfraccion && (
  <div className="vehiculo-reclamo-dato">
    <span>
      ⚖️ JUZGADO
    </span>

    <strong>
      Acta N.º{" "}
      {ultimaInfraccion.numeroActa || "—"}
    </strong>

    {!ultimaInfraccion.fechaEnvioJuzgado && (
      <small>
        Acta de infracción registrada
      </small>
    )}

    {ultimaInfraccion.fechaEnvioJuzgado && (
      <>
        <small>
          📤 Infracción enviada al Juzgado
        </small>

        {ultimaInfraccion.enviadoJuzgadoPor && (
          <small>
            Secretaría:{" "}
            {nombreUsuario(
              ultimaInfraccion.enviadoJuzgadoPor
            )}
          </small>
        )}
      </>
    )}

    {ultimaInfraccion.fechaRespuestaJuzgado && (
      <small>
        ⚖ Respuesta:{" "}
        {nombresJuzgado[
          ultimaInfraccion.estadoJuzgado
        ] ||
          ultimaInfraccion.estadoJuzgado ||
          "Registrada"}
      </small>
    )}

    {ultimaInfraccion.requiereOrdenRemocion &&
  ultimaInfraccion.estadoOrdenRemocion ===
    "PENDIENTE_SOLICITUD" && (
    <small>
      ⚖️ Pendiente de solicitar orden judicial
    </small>
  )}

{ultimaInfraccion.requiereOrdenRemocion &&
  ultimaInfraccion.estadoOrdenRemocion ===
    "ESPERANDO_RESPUESTA" && (
    <small>
      ⏳ Secretaría solicitó la orden judicial.
      Esperando respuesta del juez para remover
      este vehículo.
    </small>
  )}

    {ultimaInfraccion.fechaSolicitudOrdenRemocion && (
      <small>
        🚛 Orden de remoción solicitada
      </small>
    )}

    {ultimaInfraccion.estadoOrdenRemocion ===
      "AUTORIZADA" && (
      <small>
        ✅ Remoción autorizada por el Juzgado
      </small>
    )}

    {ultimaInfraccion.estadoOrdenRemocion ===
      "NO_AUTORIZADA" && (
      <small>
        ❌ Remoción no autorizada por el Juzgado
      </small>
    )}

    {ultimaInfraccion.numeroExpedienteJuzgado && (
      <small>
        Expediente:{" "}
        {ultimaInfraccion.numeroExpedienteJuzgado}
      </small>
    )}
  </div>
)}


{ultimaInfraccion && (
  <div className="vehiculo-reclamo-evidencia">
    <strong>
      📷 Evidencia del Acta de Infracción
    </strong>

    <FotosReclamo
      reclamoId={reclamo.id}
      tipoReferencia="INFRACCION"
      referenciaId={ultimaInfraccion.id}
      permitirSubir={false}
    />
  </div>
)}

              {ultimaRemocion && (
                <div className="vehiculo-reclamo-dato">
                  <span>
                    🚛 REMOCIÓN
                  </span>

                  <strong>
                    Retirado de la vía pública
                  </strong>

                  {ultimaRemocion.destino && (
                    <small>
                      Destino:{" "}
                      {ultimaRemocion.destino}
                    </small>
                  )}
                </div>
              )}

              {ultimoIngreso && (
                <div className="vehiculo-reclamo-dato">
                  <span>
                    🏢 INGRESO AL PREDIO
                  </span>

                  <strong>
                    {ultimoIngreso.predio?.nombre ||
                      ultimoIngreso.Predio?.nombre ||
                      "Ingreso registrado"}
                  </strong>

                  {(ultimoIngreso.sector ||
                    ultimoIngreso.posicion) && (
                    <small>
                      {[
                        ultimoIngreso.sector
                          ? `Sector ${ultimoIngreso.sector}`
                          : null,
                        ultimoIngreso.posicion
                          ? `Posición ${ultimoIngreso.posicion}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </small>
                  )}
                </div>
              )}

              {ultimoEgreso && (
                <div className="vehiculo-reclamo-dato">
                  <span>
                    🚪 SALIDA DEL PREDIO
                  </span>

                  <strong>
                    {nombresEgreso[
                      ultimoEgreso.tipoEgreso
                    ] ||
                      ultimoEgreso.tipoEgreso ||
                      "Salida registrada"}
                  </strong>

                  {ultimoEgreso.destinoPersona && (
                    <small>
                      Entregado a:{" "}
                      {ultimoEgreso.destinoPersona}
                    </small>
                  )}

                  {ultimoEgreso.predioDestino?.nombre && (
                    <small>
                      Destino:{" "}
                      {ultimoEgreso.predioDestino.nombre}
                    </small>
                  )}
                </div>
              )}
            </div>

            {ultimaRemocion &&
              (ultimaRemocion.inventarioId ||
                inventario) && (
                <div className="vehiculo-reclamo-acciones">
                  <button
                    type="button"
                    className="boton-inventario"
                    onClick={() =>
                      abrirInventario(
                        ultimaRemocion
                      )
                    }
                  >
                    🚗 Ver inventario de este vehículo
                  </button>
                </div>
              )}


              {ultimoIngreso && (
  <div className="vehiculo-reclamo-final">
    <div className="vehiculo-reclamo-final-titulo">
      <span>🏢 PREDIO MUNICIPAL</span>

      <strong>
        {ultimoEgreso
          ? "Finalizó su permanencia en el predio"
          : "Actualmente en el predio"}
      </strong>
    </div>

    <div className="vehiculo-reclamo-datos">
      <div className="vehiculo-reclamo-dato">
        <span>Predio</span>

        <strong>
          {ultimoIngreso.predio?.nombre ||
            ultimoIngreso.Predio?.nombre ||
            "Predio municipal"}
        </strong>
      </div>

      {ultimoIngreso.sector && (
        <div className="vehiculo-reclamo-dato">
          <span>Sector</span>
          <strong>
            {ultimoIngreso.sector}
          </strong>
        </div>
      )}

      {ultimoIngreso.posicion && (
        <div className="vehiculo-reclamo-dato">
          <span>Posición</span>
          <strong>
            {ultimoIngreso.posicion}
          </strong>
        </div>
      )}

      <div className="vehiculo-reclamo-dato">
        <span>Fecha de ingreso</span>

        <strong>
          {formatearFecha(
            ultimoIngreso.fechaHora ||
              ultimoIngreso.createdAt
          )}
        </strong>
      </div>
      {(ultimoIngreso.registradoPor?.nombre ||
        ultimoIngreso.registradoPor?.usuario) && (
        <div className="vehiculo-reclamo-dato">
          <span>Recibido por</span>

          <strong>
            {ultimoIngreso.registradoPor?.nombre ||
              ultimoIngreso.registradoPor?.usuario}
          </strong>
        </div>
      )}
    </div>

    <div className="vehiculo-reclamo-evidencia">
      <strong>
        📷 Foto al recibir el vehículo en el predio
      </strong>

      <FotosReclamo
        reclamoId={reclamo.id}
        tipoReferencia="INGRESO_PREDIO"
        referenciaId={ultimoIngreso.id}
        permitirSubir={false}
      />
    </div>

    {inventario && ultimaRemocion && (
      <div className="vehiculo-reclamo-acciones">
        <button
          type="button"
          className="boton-inventario"
          onClick={() =>
            abrirInventario(ultimaRemocion)
          }
        >
          🚗 Ver inventario completo
        </button>
      </div>
    )}

    {ultimoEgreso && (
      <div className="vehiculo-reclamo-egreso">
        <div className="vehiculo-reclamo-final-titulo">
          <span>🚪 EGRESO DEL PREDIO</span>

          <strong>
            {nombresEgreso[
              ultimoEgreso.tipoEgreso
            ] ||
              ultimoEgreso.tipoEgreso ||
              "Salida registrada"}
          </strong>
        </div>

        <div className="vehiculo-reclamo-datos">
          <div className="vehiculo-reclamo-dato">
            <span>Fecha de salida</span>

            <strong>
              {formatearFecha(
                ultimoEgreso.fechaHora ||
                  ultimoEgreso.createdAt
              )}
            </strong>
          </div>

          {ultimoEgreso.destinoPersona && (
            <div className="vehiculo-reclamo-dato">
              <span>
                Entregado / destino
              </span>

              <strong>
                {ultimoEgreso.destinoPersona}
              </strong>
            </div>
          )}

          {ultimoEgreso.tipoEgreso ===
            "TRASLADADO" && (
            <div className="vehiculo-reclamo-dato">
              <span>
                Predio de destino
              </span>

              <strong>
                {ultimoEgreso.predioDestino
                  ?.nombre ||
                  ultimoEgreso.PredioDestino
                    ?.nombre ||
                  "Otro predio"}
              </strong>
            </div>
          )}

          {ultimoEgreso.dniPersona && (
            <div className="vehiculo-reclamo-dato">
              <span>DNI</span>

              <strong>
                {ultimoEgreso.dniPersona}
              </strong>
            </div>
          )}

          {ultimoEgreso.numeroOficio && (
            <div className="vehiculo-reclamo-dato">
              <span>N.º de oficio</span>

              <strong>
                {ultimoEgreso.numeroOficio}
              </strong>
            </div>
          )}
        </div>
      </div>
    )}
  </div>
)}
          </article>


        );
      })}
    </div>
  ) : (
    <div className="resumen-tramites">
      <div className="resumen-tramite">
        <span>
          ESTADO DEL RECLAMO
        </span>

        <strong>
          {nombresEtapaActual[
            reclamo.etapaActual
          ] ||
            nombresEstado[
              reclamo.estado
            ] ||
            reclamo.etapaActual ||
            reclamo.estado}
        </strong>

        <small>
          Este reclamo no tiene vehículos registrados.
        </small>
      </div>
    </div>
  )}

  <div className="resumen-acciones">
    <button
      type="button"
      className="boton-secundario"
      onClick={() =>
        document
          .getElementById(
            "historial-completo"
          )
          ?.scrollIntoView({
            behavior: "smooth",
          })
      }
    >
      Ver historial completo ↓
    </button>
  </div>
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



      {/* INFORME DEL JEFE DE GUARDIA */}

{puedeInformarFueraCompetencia && (
  <section className="expediente-seccion">
    <div className="seccion-cabecera">
      <div>
        <h2>
          Competencia del reclamo
        </h2>

        <p>
          Si el reclamo no corresponde a Tránsito,
          podés informar el motivo para que Secretaría
          realice el cierre administrativo.
        </p>
      </div>
    </div>

    {!mostrarInformeJefe ? (
      <button
        type="button"
      className="boton-secundario boton-fuera-competencia"
onClick={() => {
  setErrorInformeJefe("");
  setMostrarInformeJefe(true);
}}
      >
        Informar que no corresponde a Tránsito
      </button>
     ) : (
      <div className="resolucion-formulario informe-jefe-guardia">
        <h3>
          Informe del jefe de guardia
        </h3>

        <p>
          Explicá por qué el reclamo no es competencia
          de Tránsito. Este informe será visible para
          Secretaría y quedará registrado.
        </p>

        <textarea
          value={informeJefeGuardia}
          onChange={(e) => {
            setInformeJefeGuardia(e.target.value);
            setErrorInformeJefe("");
          }}
          placeholder="Ejemplo: No se realizó acta porque la situación denunciada no corresponde a las competencias de Tránsito."
          rows={5}
          maxLength={5000}
                   disabled={enviandoInformeJefe}
        />

        {errorInformeJefe && (
          <p role="alert" style={{ color: "#b91c1c" }}>
            {errorInformeJefe}
          </p>
        )}

                <div className="informe-jefe-acciones">
          <button
            type="button"
            className="informe-jefe-enviar"
            onClick={confirmarInformeFueraCompetencia}
            disabled={
              enviandoInformeJefe ||
              !informeJefeGuardia.trim()
            }
          >
            {enviandoInformeJefe
              ? "Enviando informe..."
              : "Enviar informe a Secretaría"}
          </button>

                   <button
            type="button"
            className="boton-secundario informe-jefe-cancelar"
            disabled={enviandoInformeJefe}
            onClick={() => {
              setMostrarInformeJefe(false);
              setErrorInformeJefe("");
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    )}
  </section>
)}

{reclamo.informeJefeGuardia && (
  <section className="expediente-seccion informe-competencia-registrado">
    <div className="informe-competencia-encabezado">
      <span className="informe-competencia-icono">
        ⚠
      </span>

      <div>
        <h2>Informe de fuera de competencia</h2>
        <p>
          El jefe de guardia informó que este reclamo
          no corresponde a Tránsito.
        </p>
      </div>
    </div>

    <div className="informe-competencia-contenido">
      <span>Motivo informado por el jefe de guardia</span>
      <p>{reclamo.informeJefeGuardia}</p>
    </div>

    <div
      className={
        reclamo.estadoExterno === "CERRADO"
          ? "informe-competencia-estado cerrado"
          : "informe-competencia-estado pendiente"
      }
    >
      <span className="informe-competencia-estado-icono">
        {reclamo.estadoExterno === "CERRADO" ? "✓" : "◷"}
      </span>

      <div>
        <strong>
          {reclamo.estadoExterno === "CERRADO"
            ? "Cerrado administrativamente"
            : "Pendiente de cierre administrativo"}
        </strong>

        <p>
          {reclamo.estadoExterno === "CERRADO"
            ? "Secretaría registró el cierre administrativo del reclamo."
            : "El informe fue enviado a Secretaría y está pendiente de cierre."}
        </p>
      </div>
    </div>
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

      {seguimiento.vehiculos.some(
  (vehiculo) =>
    vehiculo.origenRegistro === "CARGA_HISTORICA"
) ? (
  <div className="estado-espera-plazo">
    <strong>📁 Expediente histórico</strong>
    <p>
      Este expediente fue incorporado mediante carga manual.
      No corresponde asignar un jefe de guardia ni un inspector.
    </p>
  </div>
) : reclamo.etapaActual === "ESPERANDO_PLAZO" ? (
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
    onActualizado={cargarReclamo}
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

           {eventos.length === 0 ? (
  <div className="seguimiento-sin-datos">
    Todavía no hay actuaciones registradas.
  </div>
) : !historialPorVehiculo ? (

  /*
   * ==========================================
   * SISTEMA VIEJO / UN SOLO VEHÍCULO
   * ==========================================
   */

  <div className="linea-tiempo">
    {eventos.map(
      (evento) => (
        <article
          key={evento.id}
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

) : (

  /*
   * ==========================================
   * SISTEMA NUEVO / VARIOS VEHÍCULOS
   * ==========================================
   */

  <div className="historial-por-vehiculo">

    {/* EVENTOS GENERALES */}

    {historialPorVehiculo
      .generales.length > 0 && (
      <div className="historial-general">

        <div className="historial-grupo-titulo">
          <span>
            📋
          </span>

          <div>
            <strong>
              Datos generales del reclamo
            </strong>

            <small>
              Reclamo y asignaciones
            </small>
          </div>
        </div>

        <div className="linea-tiempo">
          {historialPorVehiculo
            .generales.map(
              (evento) => (
                <article
                  key={evento.id}
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

      </div>
    )}


    {/* UN BLOQUE POR VEHÍCULO */}

    {historialPorVehiculo
      .grupos.map(
        ({
          vehiculo,
          numero,
          eventos:
            eventosVehiculo,
        }) => {

          const dominio =
            vehiculo.dominio ||
            vehiculo.patente ||
            "Sin dominio";

          const descripcion = [
            vehiculo.marca,
            vehiculo.modelo,
            vehiculo.color,
          ]
            .filter(Boolean)
            .join(" · ");

          return (
            <section
              key={vehiculo.id}
              className="historial-vehiculo"
            >

              <div className="historial-vehiculo-cabecera">

                <div className="historial-vehiculo-icono">
                  🚗
                </div>

                <div className="historial-vehiculo-info">

                  <span>
                    VEHÍCULO {numero}
                  </span>

                  <strong>
                    {dominio}
                  </strong>

                  {descripcion && (
                    <small>
                      {descripcion}
                    </small>
                  )}

                </div>

              </div>


              {eventosVehiculo.length ===
              0 ? (
                <div className="seguimiento-sin-datos">
                  Este vehículo todavía no tiene actuaciones.
                </div>
              ) : (
                <div className="linea-tiempo">

                  {eventosVehiculo.map(
                    (evento) => (
                      <article
                        key={evento.id}
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
          );
        }
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