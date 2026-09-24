import {
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../api/api";

import FotoUploader from "./FotoUploader";

import "./ExpedienteManualForm.css";


const ExpedienteManualForm = ({
  onCreado,
  onCancelar,
}) => {
  /*
  |--------------------------------------------------------------------------
  | CATÁLOGOS
  |--------------------------------------------------------------------------
  */

  const [
    tiposReclamo,
    setTiposReclamo,
  ] = useState([]);

  const [
    predios,
    setPredios,
  ] = useState([]);


  /*
  |--------------------------------------------------------------------------
  | ESTADOS GENERALES
  |--------------------------------------------------------------------------
  */

  const [
    cargandoCatalogos,
    setCargandoCatalogos,
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
    resultado,
    setResultado,
  ] = useState(null);


  /*
  |--------------------------------------------------------------------------
  | ACORDEONES
  |--------------------------------------------------------------------------
  */

  const [
    secciones,
    setSecciones,
  ] = useState({
    reclamo: true,
    vehiculo: true,
    documentos: true,
    predio: true,
    salida: false,
    fotos: true,
  });


  /*
  |--------------------------------------------------------------------------
  | NÚMERO DE RECLAMO
  |--------------------------------------------------------------------------
  */

  const [
    tieneNumeroReclamo,
    setTieneNumeroReclamo,
  ] = useState(true);


  /*
  |--------------------------------------------------------------------------
  | RECLAMO
  |--------------------------------------------------------------------------
  */

  const [
    numeroReclamo,
    setNumeroReclamo,
  ] = useState("");

  const [
    tipoReclamoId,
    setTipoReclamoId,
  ] = useState("");

  const [
    direccion,
    setDireccion,
  ] = useState("");

  const [
    barrio,
    setBarrio,
  ] = useState("");

  const [
    referencia,
    setReferencia,
  ] = useState("");

  const [
    observaciones,
    setObservaciones,
  ] = useState("");


  /*
  |--------------------------------------------------------------------------
  | VEHÍCULO
  |--------------------------------------------------------------------------
  */

  const [
    dominio,
    setDominio,
  ] = useState("");

  const [
    marca,
    setMarca,
  ] = useState("");

  const [
    modelo,
    setModelo,
  ] = useState("");

  const [
    color,
    setColor,
  ] = useState("");

  const [
    tipoVehiculo,
    setTipoVehiculo,
  ] = useState("");

  const [
    descripcionVehiculo,
    setDescripcionVehiculo,
  ] = useState("");


  /*
  |--------------------------------------------------------------------------
  | ACTA DE VÍA PÚBLICA
  |--------------------------------------------------------------------------
  */

  const [
    tieneActa,
    setTieneActa,
  ] = useState(false);

  const [
  acta,
  setActa,
] = useState({
  numeroActa: "",
  fechaHora: "",
  lugar: "",
  atendidoPor: "",
  caracterAtendido: "",
  situacion: "",
  cantidad: "",
  observaciones: "",
});


  /*
  |--------------------------------------------------------------------------
  | EMPLAZAMIENTO
  |--------------------------------------------------------------------------
  */

 

  const [
    emplazamiento,
    setEmplazamiento,
  ] = useState({
    fechaHora: "",
    plazoCantidad: "",
    plazoUnidad: "DIAS",
    fechaVencimiento: "",
    observaciones: "",
  });


  /*
  |--------------------------------------------------------------------------
  | INFRACCIÓN
  |--------------------------------------------------------------------------
  */

  const [
    tieneInfraccion,
    setTieneInfraccion,
  ] = useState(false);

  const [
    infraccion,
    setInfraccion,
  ] = useState({
    numeroActa: "",
    fechaHora: "",
    lugar: "",

    personaEncontrada: false,

    nombreInfractor: "",
    dniInfractor: "",
    domicilioInfractor: "",

    motivo: "",
    numeroExpedienteJuzgado: "",
    observaciones: "",
  });



  /*
|--------------------------------------------------------------------------
| ORDEN JUDICIAL DE REMOCIÓN
|--------------------------------------------------------------------------
*/

const [
  tieneOrdenJudicial,
  setTieneOrdenJudicial,
] = useState(false);

const [
  ordenJudicial,
  setOrdenJudicial,
] = useState({
  fechaHora: "",
  numeroReferencia: "",
  observaciones: "",
});
  /*
  |--------------------------------------------------------------------------
  | SITUACIÓN ACTUAL
  |--------------------------------------------------------------------------
  */

  const [
    situacionActual,
    setSituacionActual,
  ] = useState(
    "EN_PREDIO"
  );


  /*
  |--------------------------------------------------------------------------
  | PREDIO
  |--------------------------------------------------------------------------
  */

  const [
    predioId,
    setPredioId,
  ] = useState("");

  const [
    fechaIngreso,
    setFechaIngreso,
  ] = useState("");

  const [
    sector,
    setSector,
  ] = useState("");

  const [
    posicion,
    setPosicion,
  ] = useState("");

  const [
    observacionesIngreso,
    setObservacionesIngreso,
  ] = useState("");


  /*
  |--------------------------------------------------------------------------
  | EGRESO / TRASLADO
  |--------------------------------------------------------------------------
  */

  const [
    fechaEgreso,
    setFechaEgreso,
  ] = useState("");

  const [
    predioDestinoId,
    setPredioDestinoId,
  ] = useState("");

  const [
    destinoPersona,
    setDestinoPersona,
  ] = useState("");

  const [
    dniPersona,
    setDniPersona,
  ] = useState("");

  const [
    observacionesEgreso,
    setObservacionesEgreso,
  ] = useState("");


  /*
  |--------------------------------------------------------------------------
  | CARGAR CATÁLOGOS
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const cargar =
      async () => {
        setCargandoCatalogos(
          true
        );

        setError("");

        try {
          const [
            respuestaTipos,
            respuestaPredios,
          ] =
            await Promise.all([
              api.get(
                "/tipos-reclamo"
              ),

              api.get(
                "/predios"
              ),
            ]);


          const datosTipos =
            respuestaTipos.data ||
            {};

          const listaTipos =
            datosTipos.tipos ||
            datosTipos
              .tiposReclamo ||
            datosTipos
              .tipoReclamos ||
            datosTipos.data ||
            (
              Array.isArray(
                datosTipos
              )
                ? datosTipos
                : []
            );


          setTiposReclamo(
            Array.isArray(
              listaTipos
            )
              ? listaTipos
              : []
          );


          const datosPredios =
            respuestaPredios.data ||
            {};

          const listaPredios =
            datosPredios.predios ||
            datosPredios.data ||
            (
              Array.isArray(
                datosPredios
              )
                ? datosPredios
                : []
            );


          setPredios(
            Array.isArray(
              listaPredios
            )
              ? listaPredios
              : []
          );
        } catch (err) {
          console.error(
            "Error cargando catálogos:",
            err
          );

          setError(
            err.response?.data
              ?.mensaje ||
            "No se pudieron cargar los datos necesarios."
          );
        } finally {
          setCargandoCatalogos(
            false
          );
        }
      };

    cargar();
  }, []);


  /*
  |--------------------------------------------------------------------------
  | HELPERS
  |--------------------------------------------------------------------------
  */

  const cambiarActa = (
    campo,
    valor
  ) => {
    setActa(
      (anterior) => ({
        ...anterior,
        [campo]: valor,
      })
    );
  };


  const cambiarEmplazamiento =
    (
      campo,
      valor
    ) => {
      setEmplazamiento(
        (anterior) => ({
          ...anterior,
          [campo]: valor,
        })
      );
    };


  const cambiarInfraccion = (
    campo,
    valor
  ) => {
    setInfraccion(
      (anterior) => ({
        ...anterior,
        [campo]: valor,
      })
    );
  };


  const alternarSeccion = (
    nombre
  ) => {
    setSecciones(
      (anterior) => ({
        ...anterior,
        [nombre]:
          !anterior[nombre],
      })
    );
  };


  const nombreTipo = (
    tipo
  ) =>
    tipo?.nombre ||
    tipo?.descripcion ||
    tipo?.tipo ||
    `Tipo ${tipo?.id}`;


  const nombrePredio = (
    predio
  ) =>
    predio?.nombre ||
    predio?.descripcion ||
    `Predio ${predio?.id}`;


  /*
  |--------------------------------------------------------------------------
  | ¿HAY EGRESO?
  |--------------------------------------------------------------------------
  */

  const mostrarEgreso =
    situacionActual !==
    "EN_PREDIO";


  const esTraslado =
    situacionActual ===
    "TRASLADADO";


  /*
  |--------------------------------------------------------------------------
  | RESUMEN DE DOCUMENTOS
  |--------------------------------------------------------------------------
  */

const cantidadDocumentos =
  useMemo(() => {
    let total = 0;

    // Acta de Vía Pública y emplazamiento
    // son el mismo documento físico.
    if (tieneActa) {
      total += 1;
    }

  if (tieneInfraccion) {
  total += 1;
}

if (tieneOrdenJudicial) {
  total += 1;
}

return total;
}, [
  tieneActa,
  tieneInfraccion,
  tieneOrdenJudicial,
]);


  /*
  |--------------------------------------------------------------------------
  | VALIDACIÓN FRONTEND
  |--------------------------------------------------------------------------
  */

const validar = () => {
  if (
    tieneNumeroReclamo &&
    !numeroReclamo.trim()
  ) {
    return "Ingresá el número de reclamo o elegí generar uno automáticamente.";
  }

  if (!tipoReclamoId) {
    return "Seleccioná el tipo de reclamo.";
  }

  if (!direccion.trim()) {
    return "Ingresá la dirección o indicá que no consta en la documentación.";
  }

  if (
    !dominio.trim() &&
    !marca.trim() &&
    !modelo.trim() &&
    !color.trim() &&
    !tipoVehiculo.trim() &&
    !descripcionVehiculo.trim()
  ) {
    return "Ingresá al menos algún dato que permita identificar el vehículo.";
  }


  /*
  |--------------------------------------------------------------------------
  | PREDIO SOLAMENTE CUANDO CORRESPONDE
  |--------------------------------------------------------------------------
  */

  if (
    (
      situacionActual ===
        "EN_PREDIO" ||
      situacionActual ===
        "TRASLADADO"
    ) &&
    !predioId
  ) {
    return situacionActual ===
      "TRASLADADO"
      ? "Seleccioná el predio de origen."
      : "Seleccioná el predio donde se encuentra el vehículo.";
  }


  /*
  |--------------------------------------------------------------------------
  | DOCUMENTACIÓN
  |--------------------------------------------------------------------------
  */

  if (
    tieneActa &&
    !acta.numeroActa.trim()
  ) {
    return "Ingresá el número del Acta de Vía Pública.";
  }

  if (
    tieneInfraccion &&
    !infraccion
      .numeroActa
      .trim()
  ) {
    return "Ingresá el número del Acta de Infracción.";
  }

  


  /*
  |--------------------------------------------------------------------------
  | TRASLADO
  |--------------------------------------------------------------------------
  */

  if (
    situacionActual ===
      "TRASLADADO" &&
    !predioDestinoId
  ) {
    return "Seleccioná el predio de destino.";
  }

  if (
    situacionActual ===
      "TRASLADADO" &&
    Number(predioDestinoId) ===
      Number(predioId)
  ) {
    return "El predio de destino debe ser diferente al predio de origen.";
  }

  return "";
};


  /*
  |--------------------------------------------------------------------------
  | GUARDAR
  |--------------------------------------------------------------------------
  */

  const guardar =
    async (event) => {
      event.preventDefault();

      if (resultado) {
        return;
      }

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

      setGuardando(true);
      setError("");

      try {
        const payload = {
          /*
          |--------------------------------------------------------------------
          | RECLAMO
          |--------------------------------------------------------------------
          */

          numeroReclamo:
            tieneNumeroReclamo
              ? numeroReclamo.trim()
              : null,

          tipoReclamoId:
            Number(
              tipoReclamoId
            ),

          direccion:
            direccion.trim(),

          barrio:
            barrio.trim() ||
            null,

          referencia:
            referencia.trim() ||
            null,

          observaciones:
            observaciones.trim() ||
            null,


          /*
          |--------------------------------------------------------------------
          | VEHÍCULO
          |--------------------------------------------------------------------
          */

          vehiculo: {
            dominio:
              dominio.trim() ||
              null,

            marca:
              marca.trim() ||
              null,

            modelo:
              modelo.trim() ||
              null,

            color:
              color.trim() ||
              null,

            tipoVehiculo:
              tipoVehiculo.trim() ||
              null,

            descripcion:
              descripcionVehiculo
                .trim() ||
              null,
          },


          /*
          |--------------------------------------------------------------------
          | ACTA
          |--------------------------------------------------------------------
          */

          acta: {
            existe:
              tieneActa,

            numeroActa:
              tieneActa
                ? acta
                    .numeroActa
                    .trim()
                : null,

            fechaHora:
              tieneActa
                ? acta.fechaHora ||
                  null
                : null,

            lugar:
              tieneActa
                ? acta.lugar
                    .trim() ||
                  null
                : null,

            atendidoPor:
              tieneActa
                ? acta
                    .atendidoPor
                    .trim() ||
                  null
                : null,

            caracterAtendido:
              tieneActa
                ? acta
                    .caracterAtendido
                    .trim() ||
                  null
                : null,

            situacion:
              tieneActa
                ? acta.situacion
                    .trim() ||
                  null
                : null,

            cantidad:
              tieneActa
                ? acta.cantidad
                    .trim() ||
                  null
                : null,

         plazoHoras:
  tieneActa &&
  emplazamiento.plazoCantidad
    ? emplazamiento.plazoUnidad === "DIAS"
      ? Number(
          emplazamiento.plazoCantidad
        ) * 24
      : Number(
          emplazamiento.plazoCantidad
        )
    : null,

            observaciones:
              tieneActa
                ? acta
                    .observaciones
                    .trim() ||
                  null
                : null,
          },


          /*
          |--------------------------------------------------------------------
          | EMPLAZAMIENTO
          |--------------------------------------------------------------------
          */

      emplazamiento: {
  existe: tieneActa,

  fechaHora:
    tieneActa
      ? acta.fechaHora || null
      : null,

  plazoCantidad:
    tieneActa
      ? emplazamiento.plazoCantidad || null
      : null,

  plazoUnidad:
    tieneActa &&
    emplazamiento.plazoCantidad
      ? emplazamiento.plazoUnidad
      : null,

  fechaVencimiento:
    tieneActa
      ? emplazamiento.fechaVencimiento || null
      : null,

  observaciones:
    tieneActa
      ? emplazamiento.observaciones.trim() || null
      : null,
},

          /*
          |--------------------------------------------------------------------
          | INFRACCIÓN
          |--------------------------------------------------------------------
          */

          infraccion: {
            existe:
              tieneInfraccion,

            numeroActa:
              tieneInfraccion
                ? infraccion
                    .numeroActa
                    .trim()
                : null,

            fechaHora:
              tieneInfraccion
                ? infraccion
                    .fechaHora ||
                  null
                : null,

            lugar:
              tieneInfraccion
                ? infraccion
                    .lugar
                    .trim() ||
                  null
                : null,

            personaEncontrada:
              tieneInfraccion
                ? infraccion
                    .personaEncontrada
                : false,

            nombreInfractor:
              tieneInfraccion
                ? infraccion
                    .nombreInfractor
                    .trim() ||
                  null
                : null,

            dniInfractor:
              tieneInfraccion
                ? infraccion
                    .dniInfractor
                    .trim() ||
                  null
                : null,

            domicilioInfractor:
              tieneInfraccion
                ? infraccion
                    .domicilioInfractor
                    .trim() ||
                  null
                : null,

            motivo:
              tieneInfraccion
                ? infraccion
                    .motivo
                    .trim() ||
                  null
                : null,

            /*
            Estos expedientes ya pasaron
            por Juzgado.
            */

      estadoJuzgado:
  tieneInfraccion
    ? "ENVIADO"
    : null,

            numeroExpedienteJuzgado:
              tieneInfraccion
                ? infraccion
                    .numeroExpedienteJuzgado
                    .trim() ||
                  null
                : null,

            observaciones:
              tieneInfraccion
                ? infraccion
                    .observaciones
                    .trim() ||
                  null
                : null,
          },

          /*
|--------------------------------------------------------------------------
| ORDEN JUDICIAL DE REMOCIÓN
|--------------------------------------------------------------------------
*/

ordenJudicialRemocion: {
  existe: tieneOrdenJudicial,

  fechaHora:
    tieneOrdenJudicial
      ? ordenJudicial.fechaHora || null
      : null,

  numeroReferencia:
    tieneOrdenJudicial
      ? ordenJudicial.numeroReferencia.trim() || null
      : null,

  observaciones:
    tieneOrdenJudicial
      ? ordenJudicial.observaciones.trim() || null
      : null,
},


          /*
          |--------------------------------------------------------------------
          | PREDIO
          |--------------------------------------------------------------------
          */

         situacionActual,

/*
|--------------------------------------------------------------------------
| PREDIO
|--------------------------------------------------------------------------
|
| Solamente mandamos predio cuando realmente corresponde.
*/

predioId:
  (
    situacionActual ===
      "EN_PREDIO" ||
    situacionActual ===
      "TRASLADADO"
  ) &&
  predioId
    ? Number(predioId)
    : null,

fechaIngreso:
  situacionActual === "TRASLADADO"
    ? fechaIngreso || null
    : null,

sector:
  situacionActual === "TRASLADADO"
    ? sector.trim() || null
    : null,

posicion:
  situacionActual === "TRASLADADO"
    ? posicion.trim() || null
    : null,

observacionesIngreso:
  situacionActual === "TRASLADADO"
    ? observacionesIngreso.trim() || null
    : null,

/*
|--------------------------------------------------------------------------
| SALIDA
|--------------------------------------------------------------------------
*/

fechaEgreso:
  situacionActual !==
    "EN_PREDIO"
    ? fechaEgreso ||
      null
    : null,

predioDestinoId:
  situacionActual ===
    "TRASLADADO" &&
  predioDestinoId
    ? Number(
        predioDestinoId
      )
    : null,

destinoPersona:
  situacionActual ===
    "ENTREGADO"
    ? destinoPersona
        .trim() ||
      null
    : null,

dniPersona:
  situacionActual ===
    "ENTREGADO"
    ? dniPersona
        .trim() ||
      null
    : null,

observacionesEgreso:
  situacionActual !==
    "EN_PREDIO"
    ? observacionesEgreso
        .trim() ||
      null
    : null,

    };

        const respuesta =
          await api.post(
            "/expedientes/carga-manual",
            payload
          );


        setResultado(
          respuesta.data
        );

        setSecciones(
          (anterior) => ({
            ...anterior,
            reclamo: false,
            vehiculo: false,
            documentos: false,
            predio: false,
            salida: false,
            fotos: true,
          })
        );


        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      } catch (err) {
        console.error(
          "Error guardando expediente anterior:",
          err
        );

        setError(
          err.response?.data
            ?.mensaje ||
          "No se pudo guardar el expediente."
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
  | FINALIZAR
  |--------------------------------------------------------------------------
  */

  const finalizar = () => {
    if (onCreado) {
      onCreado(
        resultado
      );
    }
  };


  /*
  |--------------------------------------------------------------------------
  | CARGANDO
  |--------------------------------------------------------------------------
  */

  if (cargandoCatalogos) {
    return (
      <div className="exp-manual">
        <div className="exp-manual-cargando">
          <div className="exp-manual-spinner" />

          <strong>
            Preparando carga de expediente…
          </strong>

          <span>
            Cargando tipos de reclamo y predios.
          </span>
        </div>
      </div>
    );
  }


  /*
  |--------------------------------------------------------------------------
  | RESULTADO / IDS
  |--------------------------------------------------------------------------
  */

  const reclamoCreado =
    resultado?.reclamo;

  const vehiculoCreado =
    resultado?.vehiculo;

  const actaCreada =
    resultado?.acta;

  const emplazamientoCreado =
    resultado?.emplazamiento;

  const infraccionCreada =
    resultado?.infraccion;

  const ingresoCreado =
    resultado
      ?.ingresoDestino ||
    resultado?.ingreso;


  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <div className="exp-manual">
      <div className="exp-manual-encabezado">
        <div className="exp-manual-encabezado-icono">
          📁
        </div>

        <div>
          <span className="exp-manual-eyebrow">
            CARGA MANUAL
          </span>

          <h2>
            Cargar expediente anterior
          </h2>

          <p>
            Para vehículos que ya se encontraban
            en predios municipales antes de usar
            este sistema.
          </p>
        </div>
      </div>


      <div className="exp-manual-aviso">
        <span className="exp-manual-aviso-icono">
          ⚖️
        </span>

        <div>
          <strong>
            Expediente proveniente del circuito anterior
          </strong>

          <p>
            El vehículo ya pasó por Juzgado.
            Cargá únicamente la información y
            documentación que realmente esté disponible.
            No hace falta inventar datos faltantes.
          </p>
        </div>
      </div>


      {error && (
        <div
          className="exp-manual-mensaje exp-manual-mensaje-error"
          role="alert"
        >
          <span>
            !
          </span>

          <div>
            <strong>
              No pudimos guardar
            </strong>

            <p>
              {error}
            </p>
          </div>
        </div>
      )}


      {resultado && (
        <div className="exp-manual-exito">
          <div className="exp-manual-exito-check">
            ✓
          </div>

          <div className="exp-manual-exito-contenido">
            <span>
              EXPEDIENTE CREADO
            </span>

            <h3>
              Reclamo N.º{" "}
              {resultado.numeroReclamo ||
                reclamoCreado?.numeroReclamo}
            </h3>

            <p>
              {resultado.numeroGenerado
                ? "El expediente no tenía número de reclamo y el sistema generó uno automáticamente."
                : "Se conservó el número de reclamo que figuraba en la documentación."}
            </p>

            <div className="exp-manual-exito-datos">
              <div>
                <span>
                  Interno
                </span>

                <strong>
                  #
                  {vehiculoCreado
                    ?.numeroInterno ||
                    "—"}
                </strong>
              </div>

              <div>
                <span>
                  Dominio
                </span>

                <strong>
                  {vehiculoCreado
                    ?.dominio ||
                    "Sin dominio"}
                </strong>
              </div>

              <div>
                <span>
                  Situación
                </span>

                <strong>
                  {situacionActual ===
                  "EN_PREDIO"
                    ? "En predio"
                    : situacionActual ===
                        "TRASLADADO"
                      ? "Trasladado"
                      : situacionActual ===
                          "ENTREGADO"
                        ? "Entregado"
                        : situacionActual ===
                            "COMPACTADO"
                          ? "Compactado"
                          : "Otro egreso"}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}


      <form
        onSubmit={guardar}
        className="exp-manual-form"
      >
        {/*
        |--------------------------------------------------------------------------
        | 1 - RECLAMO
        |--------------------------------------------------------------------------
        */}

        <section
          className={`exp-manual-seccion ${
            resultado
              ? "exp-manual-seccion-bloqueada"
              : ""
          }`}
        >
          <button
            type="button"
            className="exp-manual-seccion-cabecera"
            onClick={() =>
              alternarSeccion(
                "reclamo"
              )
            }
          >
            <div className="exp-manual-paso">
              1
            </div>

            <div className="exp-manual-seccion-titulo">
              <strong>
                Identificación del expediente
              </strong>

              <span>
                Reclamo, tipo y ubicación
              </span>
            </div>

            <span className="exp-manual-chevron">
              {secciones.reclamo
                ? "−"
                : "+"}
            </span>
          </button>


          {secciones.reclamo && (
            <div className="exp-manual-seccion-contenido">
              <div className="exp-manual-subtitulo">
                Número de reclamo
              </div>

              <div className="exp-manual-opciones">
                <label
                  className={`exp-manual-opcion ${
                    tieneNumeroReclamo
                      ? "activa"
                      : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="modoNumero"
                    checked={
                      tieneNumeroReclamo
                    }
                    disabled={
                      Boolean(
                        resultado
                      )
                    }
                    onChange={() =>
                      setTieneNumeroReclamo(
                        true
                      )
                    }
                  />

                  <div>
                    <strong>
                      Tengo el número
                    </strong>

                    <span>
                      Figura en la documentación vieja
                    </span>
                  </div>
                </label>


                <label
                  className={`exp-manual-opcion ${
                    !tieneNumeroReclamo
                      ? "activa"
                      : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="modoNumero"
                    checked={
                      !tieneNumeroReclamo
                    }
                    disabled={
                      Boolean(
                        resultado
                      )
                    }
                    onChange={() => {
                      setTieneNumeroReclamo(
                        false
                      );

                      setNumeroReclamo(
                        ""
                      );
                    }}
                  />

                  <div>
                    <strong>
                      No tiene / no se encuentra
                    </strong>

                    <span>
                      El sistema generará un número libre
                    </span>
                  </div>
                </label>
              </div>


              {tieneNumeroReclamo ? (
                <div className="exp-manual-campo exp-manual-campo-destacado">
                  <label>
                    N.º de reclamo
                    <b>
                      *
                    </b>
                  </label>

                  <input
                    type="text"
                    inputMode="numeric"
                    value={
                      numeroReclamo
                    }
                    disabled={
                      Boolean(
                        resultado
                      )
                    }
                    onChange={(
                      event
                    ) =>
                      setNumeroReclamo(
                        event.target
                          .value
                      )
                    }
                    placeholder="Ej. 15482"
                  />
                </div>
              ) : (
                <div className="exp-manual-generado">
                  <span>
                    ✨
                  </span>

                  <div>
                    <strong>
                      Número automático
                    </strong>

                    <p>
                      Al guardar, el servidor buscará un
                      número que no exista en la base de datos.
                    </p>
                  </div>
                </div>
              )}


              <div className="exp-manual-grid exp-manual-grid-2">
                <div className="exp-manual-campo">
                  <label>
                    Tipo de reclamo
                    <b>
                      *
                    </b>
                  </label>

                  <select
                    value={
                      tipoReclamoId
                    }
                    disabled={
                      Boolean(
                        resultado
                      )
                    }
                    onChange={(
                      event
                    ) =>
                      setTipoReclamoId(
                        event.target
                          .value
                      )
                    }
                  >
                    <option value="">
                      Seleccionar…
                    </option>

                    {tiposReclamo.map(
                      (tipo) => (
                        <option
                          key={
                            tipo.id
                          }
                          value={
                            tipo.id
                          }
                        >
                          {nombreTipo(
                            tipo
                          )}
                        </option>
                      )
                    )}
                  </select>
                </div>


                <div className="exp-manual-campo">
                  <label>
                    Barrio
                  </label>

                  <input
                    type="text"
                    value={barrio}
                    disabled={
                      Boolean(
                        resultado
                      )
                    }
                    onChange={(
                      event
                    ) =>
                      setBarrio(
                        event.target
                          .value
                      )
                    }
                    placeholder="Si consta"
                  />
                </div>
              </div>


              <div className="exp-manual-campo">
                <label>
                  Dirección / ubicación
                  <b>
                    *
                  </b>
                </label>

                <input
                  type="text"
                  value={direccion}
                  disabled={
                    Boolean(
                      resultado
                    )
                  }
                  onChange={(
                    event
                  ) =>
                    setDireccion(
                      event.target
                        .value
                    )
                  }
                  placeholder="Ej. Av. Lafinur 1250"
                />

                <small>
                  Si el papel no tiene dirección exacta,
                  podés escribir “No consta en documentación”.
                </small>
              </div>


              <div className="exp-manual-campo">
                <label>
                  Referencia
                </label>

                <input
                  type="text"
                  value={
                    referencia
                  }
                  disabled={
                    Boolean(
                      resultado
                    )
                  }
                  onChange={(
                    event
                  ) =>
                    setReferencia(
                      event.target
                        .value
                    )
                  }
                  placeholder="Esquina, lugar, referencia antigua…"
                />
              </div>


              <div className="exp-manual-campo">
                <label>
                  Observaciones generales
                </label>

                <textarea
                  rows="3"
                  value={
                    observaciones
                  }
                  disabled={
                    Boolean(
                      resultado
                    )
                  }
                  onChange={(
                    event
                  ) =>
                    setObservaciones(
                      event.target
                        .value
                    )
                  }
                  placeholder="Información útil del expediente anterior…"
                />
              </div>
            </div>
          )}
        </section>


        {/*
        |--------------------------------------------------------------------------
        | 2 - VEHÍCULO
        |--------------------------------------------------------------------------
        */}

        <section className="exp-manual-seccion">
          <button
            type="button"
            className="exp-manual-seccion-cabecera"
            onClick={() =>
              alternarSeccion(
                "vehiculo"
              )
            }
          >
            <div className="exp-manual-paso">
              2
            </div>

            <div className="exp-manual-seccion-titulo">
              <strong>
                Vehículo
              </strong>

              <span>
                Datos para poder identificarlo
              </span>
            </div>

            <span className="exp-manual-chevron">
              {secciones.vehiculo
                ? "−"
                : "+"}
            </span>
          </button>


          {secciones.vehiculo && (
            <div className="exp-manual-seccion-contenido">
              <div className="exp-manual-grid exp-manual-grid-3">
                <div className="exp-manual-campo">
                  <label>
                    Dominio / patente
                  </label>

                  <input
                    className="exp-manual-patente"
                    type="text"
                    value={dominio}
                    disabled={
                      Boolean(
                        resultado
                      )
                    }
                    onChange={(
                      event
                    ) =>
                      setDominio(
                        event.target
                          .value
                          .toUpperCase()
                      )
                    }
                    placeholder="AB123CD"
                  />
                </div>


                <div className="exp-manual-campo">
                  <label>
                    Tipo
                  </label>

                  <input
                    type="text"
                    value={
                      tipoVehiculo
                    }
                    disabled={
                      Boolean(
                        resultado
                      )
                    }
                    onChange={(
                      event
                    ) =>
                      setTipoVehiculo(
                        event.target
                          .value
                      )
                    }
                    placeholder="Auto, moto, camioneta…"
                  />
                </div>


                <div className="exp-manual-campo">
                  <label>
                    Color
                  </label>

                  <input
                    type="text"
                    value={color}
                    disabled={
                      Boolean(
                        resultado
                      )
                    }
                    onChange={(
                      event
                    ) =>
                      setColor(
                        event.target
                          .value
                      )
                    }
                    placeholder="Ej. Blanco"
                  />
                </div>


                <div className="exp-manual-campo">
                  <label>
                    Marca
                  </label>

                  <input
                    type="text"
                    value={marca}
                    disabled={
                      Boolean(
                        resultado
                      )
                    }
                    onChange={(
                      event
                    ) =>
                      setMarca(
                        event.target
                          .value
                      )
                    }
                    placeholder="Ej. Ford"
                  />
                </div>


                <div className="exp-manual-campo">
                  <label>
                    Modelo
                  </label>

                  <input
                    type="text"
                    value={modelo}
                    disabled={
                      Boolean(
                        resultado
                      )
                    }
                    onChange={(
                      event
                    ) =>
                      setModelo(
                        event.target
                          .value
                      )
                    }
                    placeholder="Ej. Fiesta"
                  />
                </div>
              </div>


              <div className="exp-manual-campo">
                <label>
                  Descripción / señas particulares
                </label>

                <textarea
                  rows="3"
                  value={
                    descripcionVehiculo
                  }
                  disabled={
                    Boolean(
                      resultado
                    )
                  }
                  onChange={(
                    event
                  ) =>
                    setDescripcionVehiculo(
                      event.target
                        .value
                    )
                  }
                  placeholder="Estado, faltantes, golpes, características para identificarlo…"
                />

                <small>
                  No hace falta conocer todos los datos.
                  Con al menos uno que permita identificarlo alcanza.
                </small>
              </div>
            </div>
          )}
        </section>


        {/*
        |--------------------------------------------------------------------------
        | 3 - DOCUMENTACIÓN
        |--------------------------------------------------------------------------
        */}

        <section className="exp-manual-seccion">
          <button
            type="button"
            className="exp-manual-seccion-cabecera"
            onClick={() =>
              alternarSeccion(
                "documentos"
              )
            }
          >
            <div className="exp-manual-paso">
              3
            </div>

            <div className="exp-manual-seccion-titulo">
              <strong>
                Documentación encontrada
              </strong>

              <span>
                {cantidadDocumentos ===
                0
                  ? "No se marcó documentación"
                  : `${cantidadDocumentos} documento${
                      cantidadDocumentos >
                      1
                        ? "s"
                        : ""
                    } marcado${
                      cantidadDocumentos >
                      1
                        ? "s"
                        : ""
                    }`}
              </span>
            </div>

            <span className="exp-manual-chevron">
              {secciones.documentos
                ? "−"
                : "+"}
            </span>
          </button>


          {secciones.documentos && (
            <div className="exp-manual-seccion-contenido">
              <div className="exp-manual-documentos-aviso">
                <strong>
                  Cargá solamente lo que tengas
                </strong>

                <span>
                  Si falta un papel, dejalo desmarcado.
                  El vehículo puede cargarse igualmente.
                </span>
              </div>


              {/*
              |--------------------------------------------------------------------------
              | ACTA
              |--------------------------------------------------------------------------
              */}

              <div
                className={`exp-manual-documento ${
                  tieneActa
                    ? "seleccionado"
                    : ""
                }`}
              >
                <label className="exp-manual-documento-switch">
                  <input
                    type="checkbox"
                    checked={
                      tieneActa
                    }
                    disabled={
                      Boolean(
                        resultado
                      )
                    }
                    onChange={(
                      event
                    ) =>
                      setTieneActa(
                        event.target
                          .checked
                      )
                    }
                  />

                  <span className="exp-manual-check">
                    {tieneActa
                      ? "✓"
                      : ""}
                  </span>

                  <div>
               <strong>
  Acta de Vía Pública / Emplazamiento
</strong>

<small>
  Tengo el acta o datos legibles del emplazamiento
</small>
                  </div>
                </label>


                {tieneActa && (
                  <div className="exp-manual-documento-cuerpo">
                    <div className="exp-manual-grid exp-manual-grid-2">
                      <div className="exp-manual-campo">
                        <label>
                          N.º de Acta
                          <b>
                            *
                          </b>
                        </label>

                        <input
                          type="text"
                          value={
                            acta.numeroActa
                          }
                          disabled={
                            Boolean(
                              resultado
                            )
                          }
                          onChange={(
                            event
                          ) =>
                            cambiarActa(
                              "numeroActa",
                              event.target
                                .value
                            )
                          }
                          placeholder="Número del papel"
                        />
                      </div>


                      <div className="exp-manual-campo">
                        <label>
                          Fecha y hora
                        </label>

                        <input
                          type="datetime-local"
                          value={
                            acta.fechaHora
                          }
                          disabled={
                            Boolean(
                              resultado
                            )
                          }
                          onChange={(
                            event
                          ) =>
                            cambiarActa(
                              "fechaHora",
                              event.target
                                .value
                            )
                          }
                        />
                      </div>


                      <div className="exp-manual-campo">
                        <label>
                          Lugar
                        </label>

                        <input
                          type="text"
                          value={
                            acta.lugar
                          }
                          disabled={
                            Boolean(
                              resultado
                            )
                          }
                          onChange={(
                            event
                          ) =>
                            cambiarActa(
                              "lugar",
                              event.target
                                .value
                            )
                          }
                        />
                      </div>


                      <div className="exp-manual-campo">
                        <label>
                          Atendido por
                        </label>

                        <input
                          type="text"
                          value={
                            acta.atendidoPor
                          }
                          disabled={
                            Boolean(
                              resultado
                            )
                          }
                          onChange={(
                            event
                          ) =>
                            cambiarActa(
                              "atendidoPor",
                              event.target
                                .value
                            )
                          }
                          placeholder="Nombre si figura"
                        />
                      </div>


                      <div className="exp-manual-campo">
                        <label>
                          Carácter
                        </label>

                        <input
                          type="text"
                          value={
                            acta
                              .caracterAtendido
                          }
                          disabled={
                            Boolean(
                              resultado
                            )
                          }
                          onChange={(
                            event
                          ) =>
                            cambiarActa(
                              "caracterAtendido",
                              event.target
                                .value
                            )
                          }
                          placeholder="Propietario, responsable…"
                        />
                      </div>


                      <div className="exp-manual-campo">
                        <label>
                          Cantidad
                        </label>

                        <input
                          type="text"
                          value={
                            acta.cantidad
                          }
                          disabled={
                            Boolean(
                              resultado
                            )
                          }
                          onChange={(
                            event
                          ) =>
                            cambiarActa(
                              "cantidad",
                              event.target
                                .value
                            )
                          }
                        />
                      </div>
                    </div>


                    <div className="exp-manual-campo">
                      <label>
                        Situación
                      </label>

                      <textarea
                        rows="2"
                        value={
                          acta.situacion
                        }
                        disabled={
                          Boolean(
                            resultado
                          )
                        }
                        onChange={(
                          event
                        ) =>
                          cambiarActa(
                            "situacion",
                            event.target
                              .value
                          )
                        }
                      />
                    </div>


                    <div className="exp-manual-campo">
                      <label>
                        Observaciones
                      </label>

                      <textarea
                        rows="2"
                        value={
                          acta.observaciones
                        }
                        disabled={
                          Boolean(
                            resultado
                          )
                        }
                        onChange={(
                          event
                        ) =>
                          cambiarActa(
                            "observaciones",
                            event.target
                              .value
                          )
                        }
                      />
                    </div>
                    <div className="exp-manual-subtitulo">
  Datos del emplazamiento
</div>

<div className="exp-manual-grid exp-manual-grid-2">
  <div className="exp-manual-campo">
    <label>
      Plazo otorgado
    </label>

    <input
      type="number"
      min="0"
      inputMode="numeric"
      value={
        emplazamiento.plazoCantidad
      }
      disabled={
        Boolean(resultado)
      }
      onChange={(event) =>
        cambiarEmplazamiento(
          "plazoCantidad",
          event.target.value
        )
      }
      placeholder="Ej. 5"
    />
  </div>

  <div className="exp-manual-campo">
    <label>
      Unidad
    </label>

    <select
      value={
        emplazamiento.plazoUnidad
      }
      disabled={
        Boolean(resultado)
      }
      onChange={(event) =>
        cambiarEmplazamiento(
          "plazoUnidad",
          event.target.value
        )
      }
    >
      <option value="DIAS">
        Días
      </option>

      <option value="HORAS">
        Horas
      </option>
    </select>
  </div>

  <div className="exp-manual-campo">
    <label>
      Fecha de vencimiento
    </label>

    <input
      type="datetime-local"
      value={
        emplazamiento.fechaVencimiento
      }
      disabled={
        Boolean(resultado)
      }
      onChange={(event) =>
        cambiarEmplazamiento(
          "fechaVencimiento",
          event.target.value
        )
      }
    />

    <small>
      Opcional. Si consta en el acta.
    </small>
  </div>
</div>

<div className="exp-manual-campo">
  <label>
    Observaciones del emplazamiento
  </label>

  <textarea
    rows="2"
    value={
      emplazamiento.observaciones
    }
    disabled={
      Boolean(resultado)
    }
    onChange={(event) =>
      cambiarEmplazamiento(
        "observaciones",
        event.target.value
      )
    }
    placeholder="Información adicional que figure en el acta…"
  />
</div>
                  </div>
                )}
              </div>


              {/*
              |--------------------------------------------------------------------------
              | EMPLAZAMIENTO
              |--------------------------------------------------------------------------
              */}

           


              {/*
              |--------------------------------------------------------------------------
              | INFRACCIÓN
              |--------------------------------------------------------------------------
              */}

              <div
                className={`exp-manual-documento ${
                  tieneInfraccion
                    ? "seleccionado"
                    : ""
                }`}
              >
                <label className="exp-manual-documento-switch">
                  <input
                    type="checkbox"
                    checked={
                      tieneInfraccion
                    }
                    disabled={
                      Boolean(
                        resultado
                      )
                    }
                    onChange={(
                      event
                    ) =>
                      setTieneInfraccion(
                        event.target
                          .checked
                      )
                    }
                  />

                  <span className="exp-manual-check">
                    {tieneInfraccion
                      ? "✓"
                      : ""}
                  </span>

                  <div>
                    <strong>
                      Acta de Infracción
                    </strong>

                    <small>
                      Si encontraste el acta o sus datos
                    </small>
                  </div>
                </label>


                {tieneInfraccion && (
                  <div className="exp-manual-documento-cuerpo">
                    <div className="exp-manual-grid exp-manual-grid-2">
                      <div className="exp-manual-campo">
                        <label>
                          N.º de Acta
                          <b>
                            *
                          </b>
                        </label>

                        <input
                          type="text"
                          value={
                            infraccion
                              .numeroActa
                          }
                          disabled={
                            Boolean(
                              resultado
                            )
                          }
                          onChange={(
                            event
                          ) =>
                            cambiarInfraccion(
                              "numeroActa",
                              event.target
                                .value
                            )
                          }
                        />
                      </div>


                      <div className="exp-manual-campo">
                        <label>
                          Fecha y hora
                        </label>

                        <input
                          type="datetime-local"
                          value={
                            infraccion
                              .fechaHora
                          }
                          disabled={
                            Boolean(
                              resultado
                            )
                          }
                          onChange={(
                            event
                          ) =>
                            cambiarInfraccion(
                              "fechaHora",
                              event.target
                                .value
                            )
                          }
                        />
                      </div>


                      <div className="exp-manual-campo">
                        <label>
                          Lugar
                        </label>

                        <input
                          type="text"
                          value={
                            infraccion
                              .lugar
                          }
                          disabled={
                            Boolean(
                              resultado
                            )
                          }
                          onChange={(
                            event
                          ) =>
                            cambiarInfraccion(
                              "lugar",
                              event.target
                                .value
                            )
                          }
                        />
                      </div>


                      <div className="exp-manual-campo">
                        <label>
                          N.º expediente Juzgado
                        </label>

                        <input
                          type="text"
                          value={
                            infraccion
                              .numeroExpedienteJuzgado
                          }
                          disabled={
                            Boolean(
                              resultado
                            )
                          }
                          onChange={(
                            event
                          ) =>
                            cambiarInfraccion(
                              "numeroExpedienteJuzgado",
                              event.target
                                .value
                            )
                          }
                          placeholder="Si consta"
                        />
                      </div>
                    </div>


                    <label className="exp-manual-checkbox-simple">
                      <input
                        type="checkbox"
                        checked={
                          infraccion
                            .personaEncontrada
                        }
                        disabled={
                          Boolean(
                            resultado
                          )
                        }
                        onChange={(
                          event
                        ) =>
                          cambiarInfraccion(
                            "personaEncontrada",
                            event.target
                              .checked
                          )
                        }
                      />

                      <span>
                        En el acta figura una persona / infractor
                      </span>
                    </label>


                    {infraccion.personaEncontrada && (
                      <div className="exp-manual-grid exp-manual-grid-3">
                        <div className="exp-manual-campo">
                          <label>
                            Nombre
                          </label>

                          <input
                            type="text"
                            value={
                              infraccion
                                .nombreInfractor
                            }
                            disabled={
                              Boolean(
                                resultado
                              )
                            }
                            onChange={(
                              event
                            ) =>
                              cambiarInfraccion(
                                "nombreInfractor",
                                event.target
                                  .value
                              )
                            }
                          />
                        </div>


                        <div className="exp-manual-campo">
                          <label>
                            DNI
                          </label>

                          <input
                            type="text"
                            inputMode="numeric"
                            value={
                              infraccion
                                .dniInfractor
                            }
                            disabled={
                              Boolean(
                                resultado
                              )
                            }
                            onChange={(
                              event
                            ) =>
                              cambiarInfraccion(
                                "dniInfractor",
                                event.target
                                  .value
                              )
                            }
                          />
                        </div>


                        <div className="exp-manual-campo">
                          <label>
                            Domicilio
                          </label>

                          <input
                            type="text"
                            value={
                              infraccion
                                .domicilioInfractor
                            }
                            disabled={
                              Boolean(
                                resultado
                              )
                            }
                            onChange={(
                              event
                            ) =>
                              cambiarInfraccion(
                                "domicilioInfractor",
                                event.target
                                  .value
                              )
                            }
                          />
                        </div>
                      </div>
                    )}


                    <div className="exp-manual-campo">
                      <label>
                        Motivo
                      </label>

                      <textarea
                        rows="2"
                        value={
                          infraccion
                            .motivo
                        }
                        disabled={
                          Boolean(
                            resultado
                          )
                        }
                        onChange={(
                          event
                        ) =>
                          cambiarInfraccion(
                            "motivo",
                            event.target
                              .value
                          )
                        }
                        placeholder="Copiar lo que figura en el acta"
                      />
                    </div>


                    <div className="exp-manual-campo">
                      <label>
                        Observaciones
                      </label>

                      <textarea
                        rows="2"
                        value={
                          infraccion
                            .observaciones
                        }
                        disabled={
                          Boolean(
                            resultado
                          )
                        }
                        onChange={(
                          event
                        ) =>
                          cambiarInfraccion(
                            "observaciones",
                            event.target
                              .value
                          )
                        }
                      />
                    </div>
                  </div>
                )}

                {/* ORDEN JUDICIAL DE REMOCIÓN */}

<div
  className={`exp-manual-documento ${
    tieneOrdenJudicial
      ? "seleccionado"
      : ""
  }`}
>
  <label className="exp-manual-documento-switch">
    <input
      type="checkbox"
      checked={tieneOrdenJudicial}
      disabled={Boolean(resultado)}
      onChange={(event) =>
        setTieneOrdenJudicial(
          event.target.checked
        )
      }
    />

    <span className="exp-manual-check">
      {tieneOrdenJudicial ? "✓" : ""}
    </span>

    <div>
      <strong>
        Orden judicial de remoción
      </strong>

      <small>
        Si encontraste la orden o autorización del Juzgado para retirar el vehículo
      </small>
    </div>
  </label>

  {tieneOrdenJudicial && (
    <div className="exp-manual-documento-cuerpo">
      <div className="exp-manual-grid exp-manual-grid-2">
        <div className="exp-manual-campo">
          <label>
            Fecha y hora de la orden
          </label>

          <input
            type="datetime-local"
            value={ordenJudicial.fechaHora}
            disabled={Boolean(resultado)}
            onChange={(event) =>
              setOrdenJudicial((anterior) => ({
                ...anterior,
                fechaHora: event.target.value,
              }))
            }
          />
        </div>

        <div className="exp-manual-campo">
          <label>
            N.º / referencia de la orden
          </label>

          <input
            type="text"
            value={ordenJudicial.numeroReferencia}
            disabled={Boolean(resultado)}
            onChange={(event) =>
              setOrdenJudicial((anterior) => ({
                ...anterior,
                numeroReferencia: event.target.value,
              }))
            }
            placeholder="Si consta"
          />
        </div>
      </div>

      <div className="exp-manual-campo">
        <label>
          Observaciones
        </label>

        <textarea
          rows="2"
          value={ordenJudicial.observaciones}
          disabled={Boolean(resultado)}
          onChange={(event) =>
            setOrdenJudicial((anterior) => ({
              ...anterior,
              observaciones: event.target.value,
            }))
          }
          placeholder="Información que figure en la orden judicial…"
        />
      </div>
    </div>
  )}
</div>
              </div>
            </div>
          )}
        </section>


{/*
|--------------------------------------------------------------------------
| 4 - UBICACIÓN / SITUACIÓN ACTUAL
|--------------------------------------------------------------------------
*/}

<section className="exp-manual-seccion">
  <button
    type="button"
    className="exp-manual-seccion-cabecera"
    onClick={() =>
      alternarSeccion(
        "predio"
      )
    }
  >
    <div className="exp-manual-paso">
      4
    </div>

    <div className="exp-manual-seccion-titulo">
      <strong>
        Ubicación y situación del vehículo
      </strong>

      <span>
        Indicá qué ocurrió con el vehículo
      </span>
    </div>

    <span className="exp-manual-chevron">
      {secciones.predio
        ? "−"
        : "+"}
    </span>
  </button>


  {secciones.predio && (
    <div className="exp-manual-seccion-contenido">
      <div className="exp-manual-subtitulo">
        ¿Dónde está hoy?
      </div>


      {/*
      |--------------------------------------------------------------------------
      | OPCIONES
      |--------------------------------------------------------------------------
      */}

      <div className="exp-manual-situaciones">
        {[
          {
            value:
              "EN_PREDIO",

            icon:
              "🏛️",

            titulo:
              "En predio",

            texto:
              "El vehículo continúa en un predio municipal.",
          },

          {
            value:
              "ENTREGADO",

            icon:
              "🤝",

            titulo:
              "Entregado",

            texto:
              "El vehículo fue retirado por el dueño o una persona autorizada.",
          },

          {
            value:
              "TRASLADADO",

            icon:
              "🚚",

            titulo:
              "Trasladado",

            texto:
              "El vehículo pasó de un predio municipal a otro.",
          },

          {
            value:
              "COMPACTADO",

            icon:
              "♻️",

            titulo:
              "Compactado",

            texto:
              "El vehículo ya fue compactado.",
          },

          {
            value:
              "OTRO",

            icon:
              "📦",

            titulo:
              "Otro",

            texto:
              "El vehículo tuvo otro tipo de egreso.",
          },
        ].map(
          (opcion) => (
            <label
              key={
                opcion.value
              }
              className={`exp-manual-situacion ${
                situacionActual ===
                opcion.value
                  ? "activa"
                  : ""
              }`}
            >
              <input
                type="radio"
                name="situacionActual"
                value={
                  opcion.value
                }
                checked={
                  situacionActual ===
                  opcion.value
                }
                disabled={
                  Boolean(
                    resultado
                  )
                }
                onChange={(
                  event
                ) => {
                  const valor =
                    event.target
                      .value;

                  setSituacionActual(
                    valor
                  );


                  /*
                  Limpiamos datos que
                  ya no corresponden.
                  */

                  if (
                    valor !==
                      "EN_PREDIO" &&
                    valor !==
                      "TRASLADADO"
                  ) {
                    setPredioId(
                      ""
                    );

                    setFechaIngreso(
                      ""
                    );

                    setSector(
                      ""
                    );

                    setPosicion(
                      ""
                    );

                    setObservacionesIngreso(
                      ""
                    );
                  }


                  if (
                    valor !==
                    "TRASLADADO"
                  ) {
                    setPredioDestinoId(
                      ""
                    );
                  }


                  if (
                    valor !==
                    "ENTREGADO"
                  ) {
                    setDestinoPersona(
                      ""
                    );

                    setDniPersona(
                      ""
                    );
                  }
                }}
              />

              <span className="exp-manual-situacion-icono">
                {opcion.icon}
              </span>

              <div>
                <strong>
                  {opcion.titulo}
                </strong>

                <small>
                  {opcion.texto}
                </small>
              </div>
            </label>
          )
        )}
      </div>


      {/*
      |--------------------------------------------------------------------------
      | EN PREDIO
      |--------------------------------------------------------------------------
      */}

    {situacionActual ===
  "EN_PREDIO" && (
  <>
    <div className="exp-manual-documentos-aviso exp-manual-margen-arriba">
      <strong>
        🏛️ El vehículo se encuentra en la Granja
      </strong>

      <span>
        Seleccioná el predio correspondiente.
        El personal de Predio confirmará el ingreso
        y cargará sector, posición/precinto y foto.
      </span>
    </div>

    <div className="exp-manual-grid exp-manual-grid-2">
      <div className="exp-manual-campo">
        <label>
          Predio
          <b>*</b>
        </label>

        <select
          value={predioId}
          disabled={Boolean(resultado)}
          onChange={(event) =>
            setPredioId(
              event.target.value
            )
          }
        >
          <option value="">
            Seleccionar predio…
          </option>

          {predios.map(
            (predio) => (
              <option
                key={predio.id}
                value={predio.id}
              >
                {nombrePredio(
                  predio
                )}
              </option>
            )
          )}
        </select>

        <small>
          Después de crear el expediente aparecerá
          como pendiente de recepción en Predio.
        </small>
      </div>
    </div>
  </>
)}


      {/*
      |--------------------------------------------------------------------------
      | ENTREGADO
      |--------------------------------------------------------------------------
      */}

      {situacionActual ===
        "ENTREGADO" && (
        <>
          <div className="exp-manual-documentos-aviso exp-manual-margen-arriba">
            <strong>
              🤝 Vehículo entregado
            </strong>

            <span>
              No es necesario indicar un predio.
              Si conocés quién lo retiró, cargá los datos.
            </span>
          </div>


          <div className="exp-manual-grid exp-manual-grid-2">
            <div className="exp-manual-campo">
              <label>
                Fecha de entrega
              </label>

              <input
                type="datetime-local"
                value={
                  fechaEgreso
                }
                disabled={
                  Boolean(
                    resultado
                  )
                }
                onChange={(
                  event
                ) =>
                  setFechaEgreso(
                    event.target
                      .value
                  )
                }
              />

              <small>
                Opcional.
              </small>
            </div>


            <div className="exp-manual-campo">
              <label>
                Entregado a
              </label>

              <input
                type="text"
                value={
                  destinoPersona
                }
                disabled={
                  Boolean(
                    resultado
                  )
                }
                onChange={(
                  event
                ) =>
                  setDestinoPersona(
                    event.target
                      .value
                  )
                }
                placeholder="Nombre y apellido si consta"
              />
            </div>


            <div className="exp-manual-campo">
              <label>
                DNI
              </label>

              <input
                type="text"
                inputMode="numeric"
                value={
                  dniPersona
                }
                disabled={
                  Boolean(
                    resultado
                  )
                }
                onChange={(
                  event
                ) =>
                  setDniPersona(
                    event.target
                      .value
                  )
                }
                placeholder="Si consta"
              />
            </div>
          </div>


          <div className="exp-manual-campo">
            <label>
              Observaciones de la entrega
            </label>

            <textarea
              rows="3"
              value={
                observacionesEgreso
              }
              disabled={
                Boolean(
                  resultado
                )
              }
              onChange={(
                event
              ) =>
                setObservacionesEgreso(
                  event.target
                    .value
                )
              }
              placeholder="Ej. Retirado por propietario según documentación existente…"
            />
          </div>
        </>
      )}


      {/*
      |--------------------------------------------------------------------------
      | TRASLADADO
      |--------------------------------------------------------------------------
      */}

      {situacionActual ===
        "TRASLADADO" && (
        <>
          <div className="exp-manual-documentos-aviso exp-manual-margen-arriba">
            <strong>
              🚚 Traslado entre predios
            </strong>

            <span>
              Indicá de qué predio salió y a cuál fue trasladado.
            </span>
          </div>


          <div className="exp-manual-grid exp-manual-grid-2">
            <div className="exp-manual-campo">
              <label>
                Predio de origen
                <b>
                  *
                </b>
              </label>

              <select
                value={
                  predioId
                }
                disabled={
                  Boolean(
                    resultado
                  )
                }
                onChange={(
                  event
                ) =>
                  setPredioId(
                    event.target
                      .value
                  )
                }
              >
                <option value="">
                  Seleccionar…
                </option>

                {predios.map(
                  (predio) => (
                    <option
                      key={
                        predio.id
                      }
                      value={
                        predio.id
                      }
                    >
                      {nombrePredio(
                        predio
                      )}
                    </option>
                  )
                )}
              </select>
            </div>


            <div className="exp-manual-campo">
              <label>
                Predio de destino
                <b>
                  *
                </b>
              </label>

              <select
                value={
                  predioDestinoId
                }
                disabled={
                  Boolean(
                    resultado
                  )
                }
                onChange={(
                  event
                ) =>
                  setPredioDestinoId(
                    event.target
                      .value
                  )
                }
              >
                <option value="">
                  Seleccionar…
                </option>

                {predios
                  .filter(
                    (
                      item
                    ) =>
                      Number(
                        item.id
                      ) !==
                      Number(
                        predioId
                      )
                  )
                  .map(
                    (
                      predio
                    ) => (
                      <option
                        key={
                          predio.id
                        }
                        value={
                          predio.id
                        }
                      >
                        {nombrePredio(
                          predio
                        )}
                      </option>
                    )
                  )}
              </select>
            </div>


            <div className="exp-manual-campo">
              <label>
                Fecha de ingreso al predio anterior
              </label>

              <input
                type="datetime-local"
                value={
                  fechaIngreso
                }
                disabled={
                  Boolean(
                    resultado
                  )
                }
                onChange={(
                  event
                ) =>
                  setFechaIngreso(
                    event.target
                      .value
                  )
                }
              />
            </div>


            <div className="exp-manual-campo">
              <label>
                Fecha del traslado
              </label>

              <input
                type="datetime-local"
                value={
                  fechaEgreso
                }
                disabled={
                  Boolean(
                    resultado
                  )
                }
                onChange={(
                  event
                ) =>
                  setFechaEgreso(
                    event.target
                      .value
                  )
                }
              />
            </div>


            <div className="exp-manual-campo">
              <label>
                Sector anterior
              </label>

              <input
                type="text"
                value={sector}
                disabled={
                  Boolean(
                    resultado
                  )
                }
                onChange={(
                  event
                ) =>
                  setSector(
                    event.target
                      .value
                  )
                }
              />
            </div>


            <div className="exp-manual-campo">
              <label>
                Posición / precinto anterior
              </label>

              <input
                type="text"
                value={
                  posicion
                }
                disabled={
                  Boolean(
                    resultado
                  )
                }
                onChange={(
                  event
                ) =>
                  setPosicion(
                    event.target
                      .value
                  )
                }
              />
            </div>
          </div>


          <div className="exp-manual-campo">
            <label>
              Observaciones del traslado
            </label>

            <textarea
              rows="3"
              value={
                observacionesEgreso
              }
              disabled={
                Boolean(
                  resultado
                )
              }
              onChange={(
                event
              ) =>
                setObservacionesEgreso(
                  event.target
                    .value
                )
              }
            />
          </div>
        </>
      )}


      {/*
      |--------------------------------------------------------------------------
      | COMPACTADO
      |--------------------------------------------------------------------------
      */}

      {situacionActual ===
        "COMPACTADO" && (
        <>
          <div className="exp-manual-documentos-aviso exp-manual-margen-arriba">
            <strong>
              ♻️ Vehículo compactado
            </strong>

            <span>
              No hace falta indicar un predio si esa información
              no consta en la documentación.
            </span>
          </div>


          <div className="exp-manual-campo">
            <label>
              Fecha de compactación
            </label>

            <input
              type="datetime-local"
              value={
                fechaEgreso
              }
              disabled={
                Boolean(
                  resultado
                )
              }
              onChange={(
                event
              ) =>
                setFechaEgreso(
                  event.target
                    .value
                )
              }
            />

            <small>
              Opcional.
            </small>
          </div>


          <div className="exp-manual-campo">
            <label>
              Observaciones
            </label>

            <textarea
              rows="3"
              value={
                observacionesEgreso
              }
              disabled={
                Boolean(
                  resultado
                )
              }
              onChange={(
                event
              ) =>
                setObservacionesEgreso(
                  event.target
                    .value
                )
              }
              placeholder="Información que figure en la documentación…"
            />
          </div>
        </>
      )}


      {/*
      |--------------------------------------------------------------------------
      | OTRO
      |--------------------------------------------------------------------------
      */}

      {situacionActual ===
        "OTRO" && (
        <>
          <div className="exp-manual-documentos-aviso exp-manual-margen-arriba">
            <strong>
              📦 Otro tipo de egreso
            </strong>

            <span>
              Describí qué ocurrió con el vehículo.
            </span>
          </div>


          <div className="exp-manual-campo">
            <label>
              Fecha
            </label>

            <input
              type="datetime-local"
              value={
                fechaEgreso
              }
              disabled={
                Boolean(
                  resultado
                )
              }
              onChange={(
                event
              ) =>
                setFechaEgreso(
                  event.target
                    .value
                )
              }
            />
          </div>


          <div className="exp-manual-campo">
            <label>
              ¿Qué ocurrió?
            </label>

            <textarea
              rows="4"
              value={
                observacionesEgreso
              }
              disabled={
                Boolean(
                  resultado
                )
              }
              onChange={(
                event
              ) =>
                setObservacionesEgreso(
                  event.target
                    .value
                )
              }
              placeholder="Describí el destino o situación final del vehículo…"
            />
          </div>
        </>
      )}
    </div>
  )}
</section>
      
        {/*
        |--------------------------------------------------------------------------
        | BOTONES ANTES DE CREAR
        |--------------------------------------------------------------------------
        */}

        {!resultado && (
          <div className="exp-manual-acciones">
            <button
              type="button"
              className="exp-manual-btn exp-manual-btn-secundario"
              onClick={
                onCancelar
              }
              disabled={
                guardando
              }
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="exp-manual-btn exp-manual-btn-principal"
              disabled={
                guardando
              }
            >
              {guardando ? (
                <>
                  <span className="exp-manual-btn-spinner" />

                  Guardando…
                </>
              ) : (
                <>
                  <span>
                    ✓
                  </span>

                  Crear expediente
                </>
              )}
            </button>
          </div>
        )}
      </form>

      {/*
      |--------------------------------------------------------------------------
      | FOTOS
      |--------------------------------------------------------------------------
      |
      | En la carga manual usamos solamente:
      |
      | 1. Foto del vehículo en el predio
      | 2. Foto del Acta de Vía Pública / Emplazamiento
      | 3. Foto del Acta de Infracción
      |
      | Acta de Vía Pública y Emplazamiento son el mismo
      | documento físico, por eso se carga UNA sola foto.
      |--------------------------------------------------------------------------
      */}

      {resultado &&
        reclamoCreado && (
          <section className="exp-manual-fotos">

            <div className="exp-manual-fotos-cabecera">
              <div>
                <span className="exp-manual-eyebrow">
                  EVIDENCIA DIGITAL
                </span>

                <h3>
                  Fotos y documentación
                </h3>

                <p>
                  Las fotos son opcionales. Subí solamente
                  lo que tengas disponible.
                </p>
              </div>

              <div className="exp-manual-fotos-contador">
                📷
              </div>
            </div>


            {/*
            |--------------------------------------------------------------------------
            | 1 - VEHÍCULO EN EL PREDIO
            |--------------------------------------------------------------------------
            */}
{situacionActual !== "EN_PREDIO" &&
  ingresoCreado && (
            <div className="exp-manual-foto-card">
              <div className="exp-manual-foto-info">

                <div className="exp-manual-foto-icono">
                  🚗
                </div>

                <div>
                  <strong>
                    Foto del vehículo en el predio
                  </strong>

                  <span>
                    Estado actual del vehículo al momento
                    de digitalizar el expediente.
                  </span>
                </div>

              </div>

              <FotoUploader
                reclamoId={
                  reclamoCreado.id
                }
                tipoReferencia="INGRESO_PREDIO"
                referenciaId={
                  ingresoCreado?.id
                }
                maxFotos={5}
              />
            </div>
  
  )}

            {/*
            |--------------------------------------------------------------------------
            | 2 - ACTA DE VÍA PÚBLICA / EMPLAZAMIENTO
            |--------------------------------------------------------------------------
            |
            | Es un solo documento físico.
            |
            | Lo guardamos como EMPLAZAMIENTO porque
            | ReclamoDetallePage ya lo busca de esa manera.
            |--------------------------------------------------------------------------
            */}

            {emplazamientoCreado && (
              <div className="exp-manual-foto-card">

                <div className="exp-manual-foto-info">

                  <div className="exp-manual-foto-icono">
                    📝
                  </div>

                  <div>
                    <strong>
                      Foto del Acta de Vía Pública / Emplazamiento
                    </strong>

                    <span>
                      {actaCreada?.numeroActa
                        ? `Acta N.º ${actaCreada.numeroActa}`
                        : "Documento de emplazamiento"}
                    </span>
                  </div>

                </div>

                <FotoUploader
                  reclamoId={
                    reclamoCreado.id
                  }
                  tipoReferencia="EMPLAZAMIENTO"
                  referenciaId={
                    emplazamientoCreado.id
                  }
                  maxFotos={3}
                />

              </div>
            )}


            {/*
            |--------------------------------------------------------------------------
            | 3 - ACTA DE INFRACCIÓN
            |--------------------------------------------------------------------------
            */}

            {infraccionCreada && (
              <div className="exp-manual-foto-card">

                <div className="exp-manual-foto-info">

                  <div className="exp-manual-foto-icono">
                    ⚖️
                  </div>

                  <div>
                    <strong>
                      Foto del Acta de Infracción
                    </strong>

                    <span>
                      Acta N.º{" "}
                      {infraccionCreada.numeroActa}
                    </span>
                  </div>

                </div>

                <FotoUploader
                  reclamoId={
                    reclamoCreado.id
                  }
                  tipoReferencia="INFRACCION"
                  referenciaId={
                    infraccionCreada.id
                  }
                  maxFotos={3}
                />

              </div>
            )}

                        {tieneOrdenJudicial && (
              <div className="exp-manual-foto-card">

                <div className="exp-manual-foto-info">

                  <div className="exp-manual-foto-icono">
                    ⚖️
                  </div>

                  <div>
                    <strong>
                      Foto de la Orden Judicial de Remoción
                    </strong>

                    <span>
                      {ordenJudicial.numeroReferencia
                        ? `Orden / referencia N.º ${ordenJudicial.numeroReferencia}`
                        : "Orden o autorización del Juzgado"}
                    </span>
                  </div>

                </div>

                <FotoUploader
                  reclamoId={
                    reclamoCreado.id
                  }
                  tipoReferencia="ORDEN_JUDICIAL_REMOCION"
                  referenciaId={
                    infraccionCreada?.id || null
                  }
                  maxFotos={3}
                />

              </div>
            )}


            <div className="exp-manual-fotos-nota">
              <span>
                💡
              </span>

              <p>
                No es obligatorio tener todos los papeles.
                Lo que no exista queda simplemente sin
                documentación adjunta.
              </p>
            </div>


            <div className="exp-manual-finalizar">

              <button
                type="button"
                className="exp-manual-btn exp-manual-btn-principal"
                onClick={
                  finalizar
                }
              >
                ✓ Terminar carga
              </button>

            </div>

          </section>
        )}
    </div>
  );
};

export default ExpedienteManualForm;