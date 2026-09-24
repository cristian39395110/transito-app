import {
  useNavigate,
} from "react-router-dom";

import "./ExpedienteResultado.css";

const ETAPAS = {
  PENDIENTE_ASIGNACION_GUARDIA:
    "Sin asignar",

  PENDIENTE_PRIMERA_VISITA:
    "Esperando visita",

  PRIMERA_VISITA:
    "Primera visita",

  ESPERANDO_PLAZO:
    "Esperando plazo",

  PENDIENTE_SEGUNDA_VISITA:
    "Pendiente de control",

  SEGUNDA_VISITA:
    "Control asignado",

  PENDIENTE_DECISION_JEFE:
    "Pendiente de decisión",

  PENDIENTE_ENVIO_JUZGADO:
    "Pendiente Juzgado",

  EN_JUZGADO:
    "En Juzgado",

  PENDIENTE_ASIGNACION_POST_JUZGADO:
    "Respuesta del Juzgado",

  POST_JUZGADO_ASIGNADO_GUARDIA:
    "Asignado post Juzgado",

  POST_JUZGADO_EN_ACTUACION:
    "Actuación post Juzgado",

  PENDIENTE_REMOCION:
    "Pendiente de retiro",

  REMOCION_EN_CURSO:
    "Retiro en curso",

  PENDIENTE_INGRESO_PREDIO:
    "En traslado al predio",

  EN_PREDIO:
    "En predio",

  EGRESADO:
    "Entregado",

  FINALIZADO:
    "Finalizado",

  ANULADO:
    "Anulado",
};

const ESTADOS = {
  NUEVO:
    "Nuevo",

  ASIGNADO_GUARDIA:
    "Asignado a guardia",

  ASIGNADO_INSPECTOR:
    "Asignado a inspector",

  EN_INSPECCION:
    "En inspección",

  EN_SEGUIMIENTO:
    "En seguimiento",

  PENDIENTE_ACTUACION:
    "Pendiente de actuación",

  RESUELTO:
    "Resuelto",

  ANULADO:
    "Anulado",
};

const obtenerEstado = (
  reclamo
) =>
  ETAPAS[
    reclamo?.etapaActual
  ] ||
  ESTADOS[
    reclamo?.estado
  ] ||
  reclamo?.etapaActual ||
  reclamo?.estado ||
  "Sin estado";

const obtenerCoincidencia = (
  expediente
) => {
  const coincidencias =
    expediente
      ?.coincidencias ||
    [];

  if (
    coincidencias.length >
    0
  ) {
    const primera =
      coincidencias[0];

    return `${primera.etiqueta}: ${primera.valor}`;
  }

  const reclamo =
    expediente?.reclamo;

  return reclamo
    ?.numeroReclamo
    ? `Reclamo ${reclamo.numeroReclamo}`
    : "—";
};

const ExpedienteResultado = ({
  expediente,
}) => {
  const navigate =
    useNavigate();

  const reclamo =
    expediente?.reclamo ||
    {};

  const tipo =
    reclamo
      ?.tipoReclamo
      ?.nombre ||
    reclamo
      ?.TipoReclamo
      ?.nombre ||
    "Sin tipo";

  const abrirExpediente =
    () => {
      if (!reclamo.id) {
        return;
      }

      navigate(
        `/reclamos/${reclamo.id}`
      );
    };

  const manejarTeclado =
    (
      event
    ) => {
      if (
        event.key ===
          "Enter" ||
        event.key ===
          " "
      ) {
        event.preventDefault();

        abrirExpediente();
      }
    };

  return (
    <div
      className="expediente-fila"
      role="button"
      tabIndex={0}
      onClick={
        abrirExpediente
      }
      onKeyDown={
        manejarTeclado
      }
    >
      <div className="expediente-columna expediente-columna-reclamo">
        <span className="expediente-mobile-label">
          Reclamo
        </span>

        <strong>
          #
          {reclamo
            .numeroReclamo ||
            reclamo.id}
        </strong>
      </div>

      <div className="expediente-columna expediente-columna-tipo">
        <span className="expediente-mobile-label">
          Tipo
        </span>

        <span>
          {tipo}
        </span>
      </div>

      <div className="expediente-columna expediente-columna-direccion">
        <span className="expediente-mobile-label">
          Dirección
        </span>

        <span>
          {reclamo.direccion ||
            "Sin dirección"}

          {reclamo.barrio
            ? ` · ${reclamo.barrio}`
            : ""}
        </span>
      </div>

      <div className="expediente-columna expediente-columna-coincidencia">
        <span className="expediente-mobile-label">
          Coincidió por
        </span>

        <span>
          {obtenerCoincidencia(
            expediente
          )}
        </span>
      </div>

      <div className="expediente-columna expediente-columna-estado">
        <span className="expediente-mobile-label">
          Estado
        </span>

        <span className="expediente-estado-texto">
          {obtenerEstado(
            reclamo
          )}
        </span>
      </div>

      <div className="expediente-flecha">
        ›
      </div>
    </div>
  );
};

export default ExpedienteResultado;