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

/*
|--------------------------------------------------------------------------
| ESTADOS DEL VEHÍCULO
|--------------------------------------------------------------------------
|
| Estos textos son los que verá el usuario.
| Evitamos mostrar nombres internos como EN_PREDIO,
| PENDIENTE_REMOCION, etc.
|
*/

const ESTADOS_VEHICULO = {
  EN_VIA_PUBLICA:
    "En la vía pública",

  EMPLAZADO:
    "Emplazado",

  PENDIENTE_REMOCION:
    "Pendiente de retiro",

  REMOVIDO:
    "Vehículo retirado",

  PENDIENTE_INGRESO_PREDIO:
    "En traslado al predio",

  EN_PREDIO:
    "En el predio municipal",

  EGRESADO:
    "Egresado del predio",
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

const obtenerEstadoVehiculo = (
  vehiculo
) => {
  const estado =
    vehiculo?.estadoActual;

    if (
  estado === "PENDIENTE_REMOCION" &&
  vehiculo?.esperandoOrdenJudicial
) {
  return "⏳ Esperando orden judicial";
}

      const estadosPosteriores = [
    "PENDIENTE_REMOCION",
    "REMOVIDO",
    "PENDIENTE_INGRESO_PREDIO",
    "EN_PREDIO",
    "EGRESADO",
  ];

  if (
    vehiculo?.cumplioSegundaVisita === true &&
    !estadosPosteriores.includes(estado)
  ) {
    return "✅ Cumplido";
  }

  if (!estado) {
    return "Sin estado informado";
  }

  return (
    ESTADOS_VEHICULO[
      estado
    ] ||
    estado
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(
        /^\w/,
        (letra) =>
          letra.toUpperCase()
      )
  );
};

const obtenerIdentificacionVehiculo = (
  vehiculo
) => {
  const dominio =
    String(
      vehiculo?.dominio ||
        ""
    ).trim();

  if (dominio) {
    return dominio.toUpperCase();
  }

  const numeroInterno =
    vehiculo?.numeroInterno ||
    vehiculo?.id;

  if (numeroInterno) {
    return `Vehículo N.º ${numeroInterno}`;
  }

  return "Vehículo";
};

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
  permitirEliminar = false,
  onEliminar = null,
}) => {
  const navigate =
    useNavigate();

  const reclamo =
    expediente?.reclamo ||
    {};

  /*
  |--------------------------------------------------------------------------
  | VEHÍCULOS
  |--------------------------------------------------------------------------
  |
  | Sistema nuevo:
  | expediente.vehiculos
  |
  | Compatibilidad:
  | si por algún motivo solamente viene expediente.vehiculo,
  | también lo mostramos.
  |
  */

  const vehiculos =
    Array.isArray(
      expediente?.vehiculos
    ) &&
    expediente.vehiculos
      .length > 0
      ? expediente.vehiculos
      : expediente?.vehiculo
        ? [
            expediente.vehiculo,
          ]
        : [];

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

  /*
  |--------------------------------------------------------------------------
  | ELIMINAR
  |--------------------------------------------------------------------------
  */

  const manejarEliminar =
    (
      event
    ) => {
      event.preventDefault();
      event.stopPropagation();

      if (
        !permitirEliminar ||
        !onEliminar
      ) {
        return;
      }

      onEliminar();
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

        <div className="expediente-estado-contenido">
          <span className="expediente-estado-texto">
            {obtenerEstado(
              reclamo
            )}
          </span>

          {vehiculos.length >
            0 && (
            <div className="expediente-vehiculos">
              {vehiculos.length >
                1 && (
                <div className="expediente-vehiculos-cantidad">
                  {vehiculos.length} vehículos
                </div>
              )}

              {vehiculos.map(
                (
                  vehiculo
                ) => (
                  <div
                    key={
                      vehiculo.id
                    }
                    className="expediente-vehiculo"
                  >
                    <strong className="expediente-vehiculo-identificacion">
                      {obtenerIdentificacionVehiculo(
                        vehiculo
                      )}
                    </strong>

                    <span className="expediente-vehiculo-estado">
                      {obtenerEstadoVehiculo(
                        vehiculo
                      )}
                    </span>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>

      <div className="expediente-acciones-resultado">
        {permitirEliminar && (
          <button
            type="button"
            className="expediente-boton-eliminar"
            onClick={
              manejarEliminar
            }
            title="Eliminar expediente completo"
          >
            🗑
          </button>
        )}

        <div className="expediente-flecha">
          ›
        </div>
      </div>
    </div>
  );
};

export default ExpedienteResultado;