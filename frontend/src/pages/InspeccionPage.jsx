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

import api from "../api/api";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";
import FotosReclamo from "../components/FotosReclamo";

import "./InspeccionPage.css";

const InspeccionPage = () => {
  const { id } = useParams();

  const navigate = useNavigate();

  const [
    reclamo,
    setReclamo,
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

  const [
    mensaje,
    setMensaje,
  ] = useState("");

    /*
  |--------------------------------------------------------------------------
  | VISITA YA REGISTRADA
  |--------------------------------------------------------------------------
  */

  const [
    visitaRegistrada,
    setVisitaRegistrada,
  ] = useState(null);

  const [
    cargandoVisita,
    setCargandoVisita,
  ] = useState(true);

  const [
    puedeEditarVisita,
    setPuedeEditarVisita,
  ] = useState(false);

  const [
    minutosEdicion,
    setMinutosEdicion,
  ] = useState(0);

  const [
    editandoVisita,
    setEditandoVisita,
  ] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | QUÉ PASÓ EN LA VISITA
  |--------------------------------------------------------------------------
  */

  const [
    opcionVisita,
    setOpcionVisita,
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
  | NO ENCONTRÓ EL PROBLEMA
  |--------------------------------------------------------------------------
  */

  const [
    motivoNoEncontrado,
    setMotivoNoEncontrado,
  ] = useState("");

  /*
  |--------------------------------------------------------------------------
  | NO PUDO VERIFICAR
  |--------------------------------------------------------------------------
  */

  const [
    motivoNoVerificacion,
    setMotivoNoVerificacion,
  ] = useState("");

  /*
  |--------------------------------------------------------------------------
  | GPS
  |--------------------------------------------------------------------------
  */

  const [
    latitud,
    setLatitud,
  ] = useState("");

  const [
    longitud,
    setLongitud,
  ] = useState("");

  const [
    precision,
    setPrecision,
  ] = useState("");

  const [
    tomandoGPS,
    setTomandoGPS,
  ] = useState(false);


    /*
  |--------------------------------------------------------------------------
  | FOTOS OBLIGATORIAS
  |--------------------------------------------------------------------------
  */

  const [
    cantidadFotosReclamo,
    setCantidadFotosReclamo,
  ] = useState(0);

  const [
    cantidadFotosEmplazamiento,
    setCantidadFotosEmplazamiento,
  ] = useState(0);
  /*
  |--------------------------------------------------------------------------
  | ACTA VÍA PÚBLICA
  |--------------------------------------------------------------------------
  */

  const [
    hizoActa,
    setHizoActa,
  ] = useState(null);

  const [
    numeroActa,
    setNumeroActa,
  ] = useState("");

  const [
    personaEncontrada,
    setPersonaEncontrada,
  ] = useState(false);

  const [
    atendidoPor,
    setAtendidoPor,
  ] = useState("");

  const [
    caracterAtendido,
    setCaracterAtendido,
  ] = useState("");

  const [
    plazoCantidad,
    setPlazoCantidad,
  ] = useState("24");

  const [
    plazoUnidad,
    setPlazoUnidad,
  ] = useState("HORAS");

  /*
  |--------------------------------------------------------------------------
  | VEHÍCULO
  |--------------------------------------------------------------------------
  */

  const [
    dominioVehiculo,
    setDominioVehiculo,
  ] = useState("");

  const [
    marcaVehiculo,
    setMarcaVehiculo,
  ] = useState("");

  const [
    modeloVehiculo,
    setModeloVehiculo,
  ] = useState("");

  const [
    colorVehiculo,
    setColorVehiculo,
  ] = useState("");

  const [
    tipoVehiculo,
    setTipoVehiculo,
  ] = useState("AUTOMOVIL");

  const [
    descripcionVehiculo,
    setDescripcionVehiculo,
  ] = useState("");

  /*
  |--------------------------------------------------------------------------
  | CARGAR RECLAMO
  |--------------------------------------------------------------------------
  */

  const cargarReclamo =
    useCallback(async () => {
      try {
        setCargando(true);
        setError("");

        const respuesta =
          await api.get(
            `/reclamos/${id}`
          );

        const datos =
          respuesta.data
            ?.reclamo ||
          respuesta.data;

        setReclamo(datos);
      } catch (err) {
        console.error(
          "Error cargando reclamo:",
          err
        );

        setError(
          err.response?.data
            ?.mensaje ||
            "No se pudo cargar el reclamo."
        );
      } finally {
        setCargando(false);
      }
    }, [id]);

  useEffect(() => {
    cargarReclamo();
  }, [cargarReclamo]);



    /*
  |--------------------------------------------------------------------------
  | CARGAR VISITA YA REALIZADA
  |--------------------------------------------------------------------------
  */

  const cargarVisitaRegistrada =
    useCallback(async () => {
      try {
        setCargandoVisita(true);

        const respuesta =
          await api.get(
            `/visitas/primera/${id}`
          );

        const datos =
          respuesta.data;

        if (!datos?.realizada) {
          setVisitaRegistrada(null);
          setPuedeEditarVisita(false);
          setMinutosEdicion(0);

          return;
        }

        setVisitaRegistrada(
          datos.visita
        );

        setPuedeEditarVisita(
          Boolean(
            datos.puedeEditar
          )
        );

        setMinutosEdicion(
          Number(
            datos.minutosRestantes ||
              0
          )
        );
      } catch (err) {
        console.error(
          "Error cargando visita registrada:",
          err
        );

        /*
        Si todavía no existe una visita,
        dejamos trabajar normalmente.
        */

        setVisitaRegistrada(null);
        setPuedeEditarVisita(false);
        setMinutosEdicion(0);
      } finally {
        setCargandoVisita(false);
      }
    }, [id]);


  useEffect(() => {
    cargarVisitaRegistrada();
  }, [
    cargarVisitaRegistrada,
  ]);

  const tipo =
    reclamo?.tipoReclamo ||
    reclamo?.TipoReclamo;

  const esVehiculo =
    useMemo(() => {
      const nombreTipo =
        String(
          tipo?.nombre || ""
        )
          .toLowerCase()
          .normalize("NFD")
          .replace(
            /[\u0300-\u036f]/g,
            ""
          );

      return (
        nombreTipo.includes("vehiculo") ||
        nombreTipo.includes("auto") ||
        nombreTipo.includes("automotor")
      );
    }, [tipo]);

  /*
  |--------------------------------------------------------------------------
  | GPS
  |--------------------------------------------------------------------------
  */

  const tomarUbicacion = () => {
    setError("");
    setMensaje("");

    if (!navigator.geolocation) {
      setError(
        "Este dispositivo no permite obtener la ubicación."
      );

      return;
    }

    setTomandoGPS(true);

    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        setLatitud(
          posicion.coords.latitude
        );

        setLongitud(
          posicion.coords.longitude
        );

        setPrecision(
          Math.round(
            posicion.coords.accuracy
          )
        );

        setTomandoGPS(false);

        setMensaje(
          "Ubicación tomada correctamente."
        );
      },

      (err) => {
        console.error(
          "Error GPS:",
          err
        );

        setTomandoGPS(false);

        if (
          err.code ===
          err.PERMISSION_DENIED
        ) {
          setError(
            "Tenés que permitir el acceso a la ubicación."
          );

          return;
        }

        if (
          err.code ===
          err.POSITION_UNAVAILABLE
        ) {
          setError(
            "No se pudo detectar tu ubicación."
          );

          return;
        }

        if (
          err.code ===
          err.TIMEOUT
        ) {
          setError(
            "El GPS tardó demasiado. Intentá nuevamente."
          );

          return;
        }

        setError(
          "No se pudo obtener la ubicación."
        );
      },

      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  /*
  |--------------------------------------------------------------------------
  | SELECCIONAR QUÉ PASÓ
  |--------------------------------------------------------------------------
  */

  const seleccionarOpcion = (
    opcion
  ) => {
    setOpcionVisita(opcion);

    setError("");
    setMensaje("");

    if (
      opcion !== "NO_ENCONTRO"
    ) {
      setMotivoNoEncontrado("");
    }

    if (
      opcion !==
      "NO_PUDO_VERIFICAR"
    ) {
      setMotivoNoVerificacion("");
    }

    if (
      opcion !== "SIGUE"
    ) {
      setHizoActa(null);
      setNumeroActa("");
      setPersonaEncontrada(false);
      setAtendidoPor("");
      setCaracterAtendido("");
      setPlazoCantidad("24");
      setPlazoUnidad("HORAS");
    }
  };

  /*
  |--------------------------------------------------------------------------
  | RESULTADO QUE ENTIENDE EL BACKEND
  |--------------------------------------------------------------------------
  */

  const resultadoBackend =
    useMemo(() => {
      switch (
        opcionVisita
      ) {
        case "SOLUCIONADO":
          return "RESUELTO_EN_LUGAR";

        case "SIGUE":
          return "CONSTATADO";

        case "NO_ENCONTRO":
          return "NO_CONSTATADO";

        case "NO_PUDO_VERIFICAR":
          return "NO_SE_PUDO_VERIFICAR";

        default:
          return "";
      }
    }, [
      opcionVisita,
    ]);

  /*
  |--------------------------------------------------------------------------
  | OBSERVACIONES
  |--------------------------------------------------------------------------
  */

  const construirObservaciones =
    () => {
      const partes = [];

      if (
        opcionVisita ===
          "NO_ENCONTRO" &&
        motivoNoEncontrado
      ) {
        partes.push(
          `Motivo: ${motivoNoEncontrado}`
        );
      }

      if (
        opcionVisita ===
          "NO_PUDO_VERIFICAR" &&
        motivoNoVerificacion
      ) {
        partes.push(
          `Motivo: ${motivoNoVerificacion}`
        );
      }

      if (
        observaciones.trim()
      ) {
        partes.push(
          observaciones.trim()
        );
      }

      if (!partes.length) {
        return null;
      }

      return partes.join(". ");
    };

  /*
  |--------------------------------------------------------------------------
  | VENCIMIENTO ESTIMADO
  |--------------------------------------------------------------------------
  */

  const vencimientoEstimado =
    useMemo(() => {
      const cantidad =
        Number(plazoCantidad);

      if (
        !cantidad ||
        cantidad <= 0
      ) {
        return "";
      }

      const fecha = new Date();

      if (
        plazoUnidad ===
        "DIAS"
      ) {
        fecha.setDate(
          fecha.getDate() +
            cantidad
        );
      } else {
        fecha.setHours(
          fecha.getHours() +
            cantidad
        );
      }

      return fecha.toLocaleString(
        "es-AR",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      );
    }, [
      plazoCantidad,
      plazoUnidad,
    ]);

  /*
  |--------------------------------------------------------------------------
  | VALIDAR
  |--------------------------------------------------------------------------
  */

  const validar = () => {
    if (!opcionVisita) {
      return (
        "Elegí qué pasó cuando llegaste."
      );
    }

    if (!situacion.trim()) {
      return (
        "Escribí brevemente qué encontraste."
      );
    }

    if (
      opcionVisita ===
        "NO_ENCONTRO" &&
      !motivoNoEncontrado
    ) {
      return (
        "Elegí por qué no encontraste el problema."
      );
    }

    if (
      opcionVisita ===
        "NO_PUDO_VERIFICAR" &&
      !motivoNoVerificacion
    ) {
      return (
        "Elegí por qué no pudiste verificar."
      );
    }

    if (
      !latitud ||
      !longitud
    ) {
      return (
        "Antes de finalizar tenés que tomar la ubicación."
      );
    }
    if (
      cantidadFotosReclamo < 1
    ) {
      return (
        "Tenés que sacar al menos una foto del reclamo."
      );
    }
    if (
      opcionVisita === "SIGUE" &&
      esVehiculo
    ) {
      const tieneDatosVehiculo =
        dominioVehiculo.trim() ||
        marcaVehiculo.trim() ||
        modeloVehiculo.trim() ||
        colorVehiculo.trim() ||
        descripcionVehiculo.trim();

      if (!tieneDatosVehiculo) {
        return (
          "Este reclamo es de vehículo. Cargá al menos un dato para identificarlo."
        );
      }
    }

    if (
      opcionVisita ===
        "SIGUE" &&
      hizoActa === null
    ) {
      return (
        "Indicá si hiciste Acta de Vía Pública."
      );
    }

    if (
      opcionVisita ===
        "SIGUE" &&
      hizoActa === true
    ) {
      if (
        !numeroActa.trim()
      ) {
        return (
          "Ingresá el número del Acta de Vía Pública."
        );
      }

            if (
        cantidadFotosEmplazamiento <
        1
      ) {
        return (
          "Si hiciste el emplazamiento, tenés que sacar una foto del emplazamiento."
        );
      }

      const plazo =
        Number(plazoCantidad);

      if (
        !plazo ||
        plazo <= 0
      ) {
        return (
          "Ingresá un plazo válido."
        );
      }
    }

    return "";
  };

  /*
  |--------------------------------------------------------------------------
  | GUARDAR VISITA
  |--------------------------------------------------------------------------
  */

const guardarVisita =
  async () => {
    setError("");
    setMensaje("");

    const errorValidacion =
      validar();

    if (errorValidacion) {
      setError(
        errorValidacion
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    try {
      setGuardando(true);

      /*
      |--------------------------------------------------------------------------
      | UNA SOLA LLAMADA
      |--------------------------------------------------------------------------
      |
      | El backend se encarga de crear:
      |
      | - visita / constatación
      | - Acta si corresponde
      | - emplazamiento si corresponde
      | - estado del reclamo
      |
      */

      const respuesta =
        await api.post(
          "/visitas",
          {
            reclamoId:
              Number(
                reclamo.id
              ),

            resultado:
              resultadoBackend,

            situacion:
              situacion.trim(),

            observaciones:
              construirObservaciones(),

            latitudActual:
              Number(
                latitud
              ),

            longitudActual:
              Number(
                longitud
              ),

            precisionGps:
              precision
                ? Number(
                    precision
                  )
                : null,

            vehiculo:
              opcionVisita ===
                  "SIGUE" &&
                esVehiculo
                ? {
                    dominio:
                      dominioVehiculo.trim() ||
                      null,

                    marca:
                      marcaVehiculo.trim() ||
                      null,

                    modelo:
                      modeloVehiculo.trim() ||
                      null,

                    color:
                      colorVehiculo.trim() ||
                      null,

                    tipoVehiculo:
                      tipoVehiculo ||
                      "AUTOMOVIL",

                    descripcion:
                      descripcionVehiculo.trim() ||
                      null,
                  }
                : null,

            hizoActa:
              opcionVisita ===
                "SIGUE" &&
              hizoActa ===
                true,

            numeroActa:
              opcionVisita ===
                  "SIGUE" &&
                hizoActa ===
                  true
                ? numeroActa.trim()
                : null,

            personaEncontrada:
              opcionVisita ===
                  "SIGUE" &&
                hizoActa ===
                  true
                ? personaEncontrada
                : false,

            atendidoPor:
              opcionVisita ===
                  "SIGUE" &&
                hizoActa ===
                  true &&
                personaEncontrada
                ? atendidoPor.trim() ||
                  null
                : null,

            caracterAtendido:
              opcionVisita ===
                  "SIGUE" &&
                hizoActa ===
                  true &&
                personaEncontrada
                ? caracterAtendido ||
                  null
                : null,

            plazoCantidad:
              opcionVisita ===
                  "SIGUE" &&
                hizoActa ===
                  true
                ? Number(
                    plazoCantidad
                  )
                : null,

            plazoUnidad:
              opcionVisita ===
                  "SIGUE" &&
                hizoActa ===
                  true
                ? plazoUnidad
                : null,
          }
        );

      setMensaje(
        respuesta.data
          ?.mensaje ||
          "Visita registrada correctamente."
      );

      /*
      Limpiamos la pantalla.
      */
      /*
      |--------------------------------------------------------------------------
      | RECARGAMOS COMO VISITA FINALIZADA
      |--------------------------------------------------------------------------
      |
      | NO limpiamos el formulario para volver
      | a empezar.
      |
      | La visita ya terminó.
      |
      */

      await Promise.all([
        cargarReclamo(),
        cargarVisitaRegistrada(),
      ]);

      setEditandoVisita(false);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (err) {
      console.error(
        "Error guardando visita:",
        err
      );

      setError(
        err.response?.data
          ?.mensaje ||
          "No se pudo registrar la visita."
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
  | PREPARAR EDICIÓN
  |--------------------------------------------------------------------------
  */

  const comenzarEdicion =
    () => {
      if (
        !visitaRegistrada ||
        !puedeEditarVisita
      ) {
        return;
      }

      const constatacion =
        visitaRegistrada.constatacion;

              switch (
        constatacion?.resultado
      ) {
        case "RESUELTO_EN_LUGAR":
          setOpcionVisita(
            "SOLUCIONADO"
          );
          break;

        case "CONSTATADO":
          setOpcionVisita(
            "SIGUE"
          );
          break;

        case "NO_CONSTATADO":
          setOpcionVisita(
            "NO_ENCONTRO"
          );
          break;

        case "NO_SE_PUDO_VERIFICAR":
          setOpcionVisita(
            "NO_PUDO_VERIFICAR"
          );
          break;

        default:
          setOpcionVisita("");
      } 

      const acta =
        visitaRegistrada.acta;

              setHizoActa(
        Boolean(acta)
      );

      if (acta) {
        setNumeroActa(
          acta.numeroActa ||
            ""
        );
      }

      const vehiculo =
        visitaRegistrada.vehiculo;

      setSituacion(
        constatacion?.situacion ||
          ""
      );

      setObservaciones(
        constatacion?.observaciones ||
          ""
      );

      setLatitud(
        constatacion?.latitudActual ||
          ""
      );

      setLongitud(
        constatacion?.longitudActual ||
          ""
      );

      setPrecision(
        constatacion?.precisionGps ||
          ""
      );

      if (acta) {
        setPersonaEncontrada(
          Boolean(
            acta.personaEncontrada
          )
        );

        setAtendidoPor(
          acta.atendidoPor ||
            ""
        );

        setCaracterAtendido(
          acta.caracterAtendido ||
            ""
        );
      }

      if (vehiculo) {
        setDominioVehiculo(
          vehiculo.dominio ||
            ""
        );

        setMarcaVehiculo(
          vehiculo.marca ||
            ""
        );

        setModeloVehiculo(
          vehiculo.modelo ||
            ""
        );

        setColorVehiculo(
          vehiculo.color ||
            ""
        );

        setTipoVehiculo(
          vehiculo.tipoVehiculo ||
            "AUTOMOVIL"
        );

        setDescripcionVehiculo(
          vehiculo.descripcion ||
            ""
        );
      }

      setEditandoVisita(true);
      setError("");
      setMensaje("");

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    };


  /*
  |--------------------------------------------------------------------------
  | GUARDAR CORRECCIÓN
  |--------------------------------------------------------------------------
  */

  const guardarEdicion =
    async () => {
      if (
        !situacion.trim()
      ) {
        setError(
          "Escribí qué encontraste."
        );

        return;
      }

      try {
        setGuardando(true);
        setError("");
        setMensaje("");

        await api.put(
          `/visitas/primera/${id}`,
          {
            situacion:
              situacion.trim(),

            observaciones:
              observaciones.trim() ||
              null,

            latitudActual:
              latitud
                ? Number(latitud)
                : null,

            longitudActual:
              longitud
                ? Number(longitud)
                : null,

            precisionGps:
              precision
                ? Number(precision)
                : null,

            personaEncontrada,

            atendidoPor:
              personaEncontrada
                ? atendidoPor.trim() ||
                  null
                : null,

            caracterAtendido:
              personaEncontrada
                ? caracterAtendido ||
                  null
                : null,

            vehiculo:
              visitaRegistrada
                ?.vehiculo
                ? {
                    dominio:
                      dominioVehiculo.trim() ||
                      null,

                    marca:
                      marcaVehiculo.trim() ||
                      null,

                    modelo:
                      modeloVehiculo.trim() ||
                      null,

                    color:
                      colorVehiculo.trim() ||
                      null,

                    tipoVehiculo,

                    descripcion:
                      descripcionVehiculo.trim() ||
                      null,
                  }
                : null,
          }
        );

        setMensaje(
          "La visita fue corregida correctamente."
        );

        setEditandoVisita(false);

        await cargarVisitaRegistrada();

        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      } catch (err) {
        console.error(
          "Error editando visita:",
          err
        );

        setError(
          err.response?.data
            ?.mensaje ||
            "No se pudo editar la visita."
        );
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
      <div className="inspeccion-cargando">
        Cargando trabajo...
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | ERROR CARGANDO
  |--------------------------------------------------------------------------
  */

  if (
    !reclamo &&
    error
  ) {
    return (
      <div className="inspeccion-cargando">
        <div className="inspeccion-alerta error">
          {error}
        </div>

        <button
          type="button"
          className="inspeccion-boton-secundario"
          onClick={() =>
            navigate(
              "/mis-trabajos"
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

  return (
    <div className="inspeccion-page">

      {/* VOLVER */}

      <button
        type="button"
        className="inspeccion-volver"
        onClick={() =>
          navigate(
            "/mis-trabajos"
          )
        }
      >
        ← Mis trabajos
      </button>

      {/* ENCABEZADO */}

      <div className="inspeccion-header">
        <div className="inspeccion-header-info">
          <span className="inspeccion-reclamo-label">
            RECLAMO
          </span>

          <h1>
            #
            {
              reclamo.numeroReclamo
            }
          </h1>
        </div>

        <span className="inspeccion-estado">
          {
            reclamo.estado
          }
        </span>
      </div>

      {/* DATOS */}

      <section className="inspeccion-card inspeccion-datos">

        <span className="inspeccion-tipo">
          {tipo?.nombre ||
            "Reclamo"}
        </span>

        <h2>
          📍{" "}
          {
            reclamo.direccion
          }
        </h2>

        {reclamo.barrio && (
          <div className="inspeccion-dato-linea">
            <span>
              Barrio
            </span>

            <strong>
              {
                reclamo.barrio
              }
            </strong>
          </div>
        )}

        {reclamo.referencia && (
          <div className="inspeccion-dato-linea">
            <span>
              Referencia
            </span>

            <strong>
              {
                reclamo.referencia
              }
            </strong>
          </div>
        )}
     {reclamo.latitudDenunciada &&
  reclamo.longitudDenunciada && (
    <div className="inspeccion-mapa-reclamo">
      <div className="inspeccion-mapa-titulo">
        <strong>
          📍 Ubicación del reclamo
        </strong>

        <span>
          Este es el lugar informado en el reclamo.
        </span>
      </div>

      <MapContainer
        center={[
          Number(
            reclamo.latitudDenunciada
          ),
          Number(
            reclamo.longitudDenunciada
          ),
        ]}
        zoom={17}
        scrollWheelZoom={false}
        className="inspeccion-mapa"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <CircleMarker
          center={[
            Number(
              reclamo.latitudDenunciada
            ),
            Number(
              reclamo.longitudDenunciada
            ),
          ]}
          radius={10}
        >
          <Popup>
            <strong>
              Reclamo #
              {reclamo.numeroReclamo}
            </strong>

            <br />

            {reclamo.direccion}
          </Popup>
        </CircleMarker>
      </MapContainer>
    </div>
)}
        {reclamo.observaciones && (
          <div className="inspeccion-aviso-reclamo">
            {
              reclamo.observaciones
            }
          </div>
        )}
      </section>

      {/* MENSAJES */}

      {error && (
        <div className="inspeccion-alerta error">
          {error}
        </div>
      )}

      {mensaje && (
        <div className="inspeccion-alerta ok">
          ✓ {mensaje}
        </div>
      )}


      {/* VISITA YA FINALIZADA */}

      {visitaRegistrada &&
        !editandoVisita && (
          <section className="inspeccion-card inspeccion-visita-finalizada">

            <div className="inspeccion-finalizada-icono">
              ✓
            </div>

            <div className="inspeccion-finalizada-contenido">

              <span className="inspeccion-finalizada-etiqueta">
                VISITA FINALIZADA
              </span>

              <h2>
                La visita ya fue registrada
              </h2>

              <p>
                Esta actuación ya está cerrada.
                No se puede realizar nuevamente.
              </p>


              <div className="inspeccion-finalizada-datos">

                <div>
                  <span>
                    Resultado
                  </span>

                  <strong>
                    {nombreResultadoVisita(
                      visitaRegistrada
                        ?.constatacion
                        ?.resultado
                    )}
                  </strong>
                </div>


                <div>
                  <span>
                    Qué encontró
                  </span>

                  <strong>
                    {visitaRegistrada
                      ?.constatacion
                      ?.situacion ||
                      "Sin descripción"}
                  </strong>
                </div>


                {visitaRegistrada
                  ?.constatacion
                  ?.observaciones && (
                  <div>
                    <span>
                      Observaciones
                    </span>

                    <strong>
                      {
                        visitaRegistrada
                          .constatacion
                          .observaciones
                      }
                    </strong>
                  </div>
                )}

              </div>


              <div className="inspeccion-finalizada-foto">

                <strong>
                  📷 Evidencia de la visita
                </strong>

                <FotosReclamo
                  reclamoId={
                    reclamo.id
                  }
                  tipoReferencia="CONSTATACION"
                  permitirSubir={false}
                />

              </div>


              {puedeEditarVisita ? (
                <div className="inspeccion-edicion-disponible">

                  <div>
                    <strong>
                      ✏️ Todavía podés corregir datos
                    </strong>

                    <span>
                      Quedan aproximadamente{" "}
                      {minutosEdicion} minutos.
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={
                      comenzarEdicion
                    }
                  >
                    Editar visita
                  </button>

                </div>
              ) : (
                <div className="inspeccion-edicion-cerrada">

                  <strong>
                    🔒 Visita cerrada
                  </strong>

                  <span>
                    El plazo de edición terminó.
                  </span>

                </div>
              )}

            </div>

          </section>
        )}

              {(!visitaRegistrada ||
        editandoVisita) && (
        <>
      {/* PASO 1 */}
            {!editandoVisita && (

      <section className="inspeccion-card">

        <div className="inspeccion-paso">
          <span>
            1
          </span>

          <div>
            <h2>
              ¿Qué pasó cuando llegaste?
            </h2>

            <p>
              Tocá una opción.
            </p>
          </div>
        </div>

        <div className="inspeccion-opciones">

          <button
            type="button"
            className={
              opcionVisita ===
              "SOLUCIONADO"
                ? "inspeccion-opcion seleccionado"
                : "inspeccion-opcion"
            }
            onClick={() =>
              seleccionarOpcion(
                "SOLUCIONADO"
              )
            }
          >
            <span className="inspeccion-opcion-icono">
              ✅
            </span>

            <div>
              <strong>
                Ya está solucionado
              </strong>

              <small>
                Lo denunciado ya no está.
              </small>
            </div>
          </button>

          <button
            type="button"
            className={
              opcionVisita ===
              "SIGUE"
                ? "inspeccion-opcion seleccionado"
                : "inspeccion-opcion"
            }
            onClick={() =>
              seleccionarOpcion(
                "SIGUE"
              )
            }
          >
            <span className="inspeccion-opcion-icono">
              ⚠️
            </span>

            <div>
              <strong>
                El problema sigue
              </strong>

              <small>
                Encontré lo denunciado.
              </small>
            </div>
          </button>

          <button
            type="button"
            className={
              opcionVisita ===
              "NO_ENCONTRO"
                ? "inspeccion-opcion seleccionado"
                : "inspeccion-opcion"
            }
            onClick={() =>
              seleccionarOpcion(
                "NO_ENCONTRO"
              )
            }
          >
            <span className="inspeccion-opcion-icono">
              🔍
            </span>

            <div>
              <strong>
                No encontré nada
              </strong>

              <small>
                Fui al lugar pero no estaba.
              </small>
            </div>
          </button>

      

        </div>
      </section>
      )}
      {opcionVisita && (
        <>

          {/* MOTIVO NO ENCONTRÓ */}

          {opcionVisita ===
            "NO_ENCONTRO" && (
            <section className="inspeccion-card">

              <div className="inspeccion-paso">
                <span>
                  2
                </span>

                <div>
                  <h2>
                    ¿Por qué no encontraste nada?
                  </h2>

                  <p>
                    Elegí lo que pasó.
                  </p>
                </div>
              </div>

              <select
                className="inspeccion-control"
                value={
                  motivoNoEncontrado
                }
                onChange={(
                  event
                ) =>
                  setMotivoNoEncontrado(
                    event.target.value
                  )
                }
              >
                <option value="">
                  Elegir motivo...
                </option>

                <option value="La dirección no coincide">
                  La dirección no coincide
                </option>

                <option value="No había nada en el lugar">
                  No había nada en el lugar
                </option>

                <option value="El reclamo parece incorrecto">
                  El reclamo parece incorrecto
                </option>

                <option value="No se pudo localizar lo denunciado">
                  No pude localizar lo denunciado
                </option>

                <option value="Otro">
                  Otro
                </option>
              </select>

            </section>
          )}

          {/* MOTIVO NO VERIFICÓ */}

          {opcionVisita ===
            "NO_PUDO_VERIFICAR" && (
            <section className="inspeccion-card">

              <div className="inspeccion-paso">
                <span>
                  2
                </span>

                <div>
                  <h2>
                    ¿Por qué no pudiste verificar?
                  </h2>

                  <p>
                    Elegí una opción.
                  </p>
                </div>
              </div>

              <select
                className="inspeccion-control"
                value={
                  motivoNoVerificacion
                }
                onChange={(
                  event
                ) =>
                  setMotivoNoVerificacion(
                    event.target.value
                  )
                }
              >
                <option value="">
                  Elegir motivo...
                </option>

                <option value="Dirección incompleta">
                  Dirección incompleta
                </option>

                <option value="No se pudo acceder al lugar">
                  No pude acceder al lugar
                </option>

                <option value="No fue posible realizar la inspección">
                  No fue posible realizar la inspección
                </option>

                <option value="Otro">
                  Otro
                </option>
              </select>

            </section>
          )}

          {/* QUÉ VIO */}

          <section className="inspeccion-card">

            <div className="inspeccion-paso">
              <span>
                {opcionVisita ===
                  "NO_ENCONTRO" ||
                opcionVisita ===
                  "NO_PUDO_VERIFICAR"
                  ? "3"
                  : "2"}
              </span>

              <div>
                <h2>
                  ¿Qué viste?
                </h2>

                <p>
                  Escribí algo corto y claro.
                </p>
              </div>
            </div>

            <label className="inspeccion-label">
              Descripción *

              <textarea
                className="inspeccion-control"
                rows="4"
                value={
                  situacion
                }
                onChange={(
                  event
                ) =>
                  setSituacion(
                    event.target.value
                  )
                }
                placeholder={
                  opcionVisita ===
                  "SOLUCIONADO"
                    ? "Ej: al llegar el vehículo ya había sido retirado."
                    : opcionVisita ===
                        "SIGUE"
                      ? "Ej: se encuentra vehículo abandonado sobre la calzada."
                      : opcionVisita ===
                          "NO_ENCONTRO"
                        ? "Ej: recorrí la cuadra indicada y no encontré lo denunciado."
                        : "Ej: la dirección indicada está incompleta y no pude ubicar el lugar."
                }
              />
            </label>

            <label className="inspeccion-label">
              Algo más para agregar

              <textarea
                className="inspeccion-control"
                rows="3"
                value={
                  observaciones
                }
                onChange={(
                  event
                ) =>
                  setObservaciones(
                    event.target.value
                  )
                }
                placeholder="Opcional"
              />
            </label>

          </section>

          {/* GPS */}

          <section className="inspeccion-card">

            <div className="inspeccion-paso">
              <span>
                📍
              </span>

              <div>
                <h2>
                  Tomá tu ubicación
                </h2>

                <p>
                  Esto demuestra que estuviste en el lugar.
                </p>
              </div>
            </div>

            {!latitud ? (
              <div className="inspeccion-gps pendiente">

                <strong>
                  Falta tomar la ubicación
                </strong>

                <span>
                  Tocá el botón desde el lugar del reclamo.
                </span>

              </div>
            ) : (
              <div className="inspeccion-gps listo">

                <strong>
                  ✓ Ubicación tomada
                </strong>

                <span>
                  {Number(
                    latitud
                  ).toFixed(6)}
                  ,{" "}
                  {Number(
                    longitud
                  ).toFixed(6)}
                </span>

                {precision && (
                  <small>
                    Precisión aproximada:{" "}
                    {precision} metros
                  </small>
                )}

              </div>
            )}

            <button
              type="button"
              className="inspeccion-boton-gps"
              onClick={
                tomarUbicacion
              }
              disabled={
                tomandoGPS
              }
            >
              {tomandoGPS
                ? "Buscando ubicación..."
                : latitud
                  ? "📍 Actualizar ubicación"
                  : "📍 Tomar ubicación"}
            </button>

          </section>

          {/* FOTO */}

          <section className="inspeccion-card">

            <div className="inspeccion-paso">
              <span>
                📷
              </span>

              <div>
                <h2>
                  Sacá una foto
                </h2>

                <p>
                  Que se vea claramente cómo estaba el lugar.
                </p>
              </div>
            </div>

      <FotosReclamo
  reclamoId={
    reclamo.id
  }
  tipoReferencia="CONSTATACION"
  onCantidadFotosChange={
    setCantidadFotosReclamo
  }
  maxFotos={1}
/>

          </section>

          {/* VEHÍCULO */}

          {opcionVisita ===
              "SIGUE" &&
            esVehiculo && (
            <section className="inspeccion-card">

              <div className="inspeccion-paso">
                <span>
                  🚗
                </span>

                <div>
                  <h2>
                    Identificá el vehículo
                  </h2>

                  <p>
                    Estos datos quedarán unidos al reclamo para las próximas visitas, infracción, inventario y remoción.
                  </p>
                </div>
              </div>

              <div className="inspeccion-persona">

                <label className="inspeccion-label">
                  Dominio / patente

                  <input
                    className="inspeccion-control"
                    type="text"
                    value={dominioVehiculo}
                    onChange={(event) =>
                      setDominioVehiculo(
                        event.target.value
                          .toUpperCase()
                      )
                    }
                    placeholder="Ej: ABC123 o sin dominio"
                  />
                </label>

                <label className="inspeccion-label">
                  Tipo

                  <select
                    className="inspeccion-control"
                    value={tipoVehiculo}
                    onChange={(event) =>
                      setTipoVehiculo(
                        event.target.value
                      )
                    }
                  >
                    <option value="AUTOMOVIL">
                      Automóvil
                    </option>

                    <option value="CAMIONETA">
                      Camioneta
                    </option>

                    <option value="MOTO">
                      Moto
                    </option>

                    <option value="CAMION">
                      Camión
                    </option>

                    <option value="OTRO">
                      Otro
                    </option>
                  </select>
                </label>

                <label className="inspeccion-label">
                  Marca

                  <input
                    className="inspeccion-control"
                    type="text"
                    value={marcaVehiculo}
                    onChange={(event) =>
                      setMarcaVehiculo(
                        event.target.value
                      )
                    }
                    placeholder="Ej: Peugeot"
                  />
                </label>

                <label className="inspeccion-label">
                  Modelo

                  <input
                    className="inspeccion-control"
                    type="text"
                    value={modeloVehiculo}
                    onChange={(event) =>
                      setModeloVehiculo(
                        event.target.value
                      )
                    }
                    placeholder="Ej: 504"
                  />
                </label>

                <label className="inspeccion-label">
                  Color

                  <input
                    className="inspeccion-control"
                    type="text"
                    value={colorVehiculo}
                    onChange={(event) =>
                      setColorVehiculo(
                        event.target.value
                      )
                    }
                    placeholder="Ej: Beige"
                  />
                </label>

              </div>

              <label className="inspeccion-label">
                Descripción del vehículo

                <textarea
                  className="inspeccion-control"
                  rows="3"
                  value={descripcionVehiculo}
                  onChange={(event) =>
                    setDescripcionVehiculo(
                      event.target.value
                    )
                  }
                  placeholder="Ej: vehículo sin rueda delantera, vidrios rotos, estacionado sobre la vereda..."
                />
              </label>

            </section>
          )}

          {/* ACTA */}

          {opcionVisita ===
            "SIGUE" && (
            <section className="inspeccion-card acta-card">

              <div className="inspeccion-paso">
                <span>
                  📝
                </span>

                <div>
                  <h2>
                    ¿Hiciste Acta de Vía Pública?
                  </h2>

                  <p>
                    Marcá sí solamente si hiciste el acta en papel.
                  </p>
                </div>
              </div>

              <div className="inspeccion-si-no">

                <button
                  type="button"
                  className={
                    hizoActa === true
                      ? "seleccionado"
                      : ""
                  }
                  onClick={() =>
                    setHizoActa(true)
                  }
                >
                  ✓ Sí
                </button>

                <button
                  type="button"
                  className={
                    hizoActa === false
                      ? "seleccionado"
                      : ""
                  }
                  onClick={() =>
                    setHizoActa(false)
                  }
                >
                  No
                </button>

              </div>

              {hizoActa === true && (
                <div className="inspeccion-acta-contenido">

                  <label className="inspeccion-label">
                    Número del acta *

                    <input
                      className="inspeccion-control inspeccion-numero-acta"
                      type="text"
                      value={
                        numeroActa
                      }
                      onChange={(
                        event
                      ) =>
                        setNumeroActa(
                          event.target.value
                        )
                      }
                      placeholder="Ej: C 0011859"
                    />
                  </label>

                  <div className="inspeccion-subpregunta">
                    ¿Había alguien en el lugar?
                  </div>

                  <div className="inspeccion-si-no">

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

                        setAtendidoPor("");
                        setCaracterAtendido("");
                      }}
                    >
                      No
                    </button>

                  </div>

                  {personaEncontrada && (
                    <div className="inspeccion-persona">

                      <label className="inspeccion-label">
                        Nombre, si lo sabés

                        <input
                          className="inspeccion-control"
                          type="text"
                          value={
                            atendidoPor
                          }
                          onChange={(
                            event
                          ) =>
                            setAtendidoPor(
                              event.target.value
                            )
                          }
                          placeholder="No es obligatorio"
                        />
                      </label>

                      <label className="inspeccion-label">
                        ¿Quién era?

                        <select
                          className="inspeccion-control"
                          value={
                            caracterAtendido
                          }
                          onChange={(
                            event
                          ) =>
                            setCaracterAtendido(
                              event.target.value
                            )
                          }
                        >
                          <option value="">
                            No sé
                          </option>

                          <option value="PROPIETARIO">
                            Propietario
                          </option>

                          <option value="ENCARGADO">
                            Encargado
                          </option>

                          <option value="VECINO">
                            Vecino
                          </option>

                          <option value="OTRO">
                            Otro
                          </option>
                        </select>
                      </label>

                    </div>
                  )}

                  <div className="inspeccion-subpregunta">
                    ¿Cuánto plazo le diste?
                  </div>

                  <div className="inspeccion-plazos">

                    {[12, 24, 48, 72].map(
                      (horas) => (
                        <button
                          key={
                            horas
                          }
                          type="button"
                          className={
                            plazoUnidad ===
                              "HORAS" &&
                            Number(
                              plazoCantidad
                            ) ===
                              horas
                              ? "seleccionado"
                              : ""
                          }
                          onClick={() => {
                            setPlazoCantidad(
                              String(
                                horas
                              )
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

                  <div className="inspeccion-otro-plazo">

                    <label className="inspeccion-label">
                      Otro plazo

                      <input
                        className="inspeccion-control"
                        type="number"
                        min="1"
                        step="1"
                        value={
                          plazoCantidad
                        }
                        onChange={(
                          event
                        ) =>
                          setPlazoCantidad(
                            event.target.value
                          )
                        }
                      />
                    </label>

                    <label className="inspeccion-label">
                      En

                      <select
                        className="inspeccion-control"
                        value={
                          plazoUnidad
                        }
                        onChange={(
                          event
                        ) =>
                          setPlazoUnidad(
                            event.target.value
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
                    </label>

                  </div>

                  {vencimientoEstimado && (
                    <div className="inspeccion-vencimiento">

                      <span>
                        Vencimiento aproximado
                      </span>

                      <strong>
                        {
                          vencimientoEstimado
                        }
                      </strong>

                    </div>
                  )}
<div className="inspeccion-foto-emplazamiento">
  <div className="inspeccion-paso">
    <span>
      📷
    </span>

    <div>
      <h2>
        Foto del emplazamiento
      </h2>

      <p>
        Sacá una foto donde se vea que el
        emplazamiento quedó realizado.
      </p>
    </div>
  </div>
<FotosReclamo
  reclamoId={
    reclamo.id
  }
  tipoReferencia="EMPLAZAMIENTO"
  onCantidadFotosChange={
    setCantidadFotosEmplazamiento
  }
  maxFotos={1}
/>
</div>



                </div>
              )}

            </section>
          )}

          {/* GUARDAR */}

          <section className="inspeccion-final">

            <div>
              <strong>
                ¿Terminaste?
              </strong>

              <span>
                Revisá los datos y guardá la visita.
              </span>
            </div>

            <button
              type="button"
              className="inspeccion-guardar"
              disabled={
                guardando
              }
            onClick={
  editandoVisita
    ? guardarEdicion
    : guardarVisita
}
            >
                          {guardando
                ? "Guardando..."
                : editandoVisita
                  ? "✓ Guardar corrección"
                  : opcionVisita ===
                        "SIGUE" &&
                      hizoActa === true
                    ? "✓ Guardar visita y Acta"
                    : "✓ Finalizar visita"}
            </button>

          </section>

        </>
      )}
              </>
      )}

    </div>
  );
};
const nombreResultadoVisita = (
  resultado
) => {
  const nombres = {
    RESUELTO_EN_LUGAR:
      "Ya estaba solucionado",

    CONSTATADO:
      "El problema seguía",

    NO_CONSTATADO:
      "No encontró lo denunciado",

    NO_SE_PUDO_VERIFICAR:
      "No pudo verificar",
  };

  return (
    nombres[resultado] ||
    resultado ||
    "Visita realizada"
  );
};
export default InspeccionPage;