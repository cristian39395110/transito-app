const {
  Reclamo,
} = require("../models");

const {
  registrarHistorial,
} = require(
  "./historialService"
);

const resolverReclamo =
  async ({
    reclamo,
    usuarioId,
    descripcion,
    transaction = null,
  }) => {
    if (!reclamo) {
      throw new Error(
        "Reclamo requerido para resolver"
      );
    }

    const estadoAnterior =
      reclamo.estado;

reclamo.estado =
  "RESUELTO";

reclamo.etapaActual =
  "FINALIZADO";

reclamo.estadoExterno =
  "LISTO_PARA_CERRAR";

    reclamo.fechaResolucion =
      new Date();

    await reclamo.save({
      transaction,
    });

    await registrarHistorial({
      reclamoId:
        reclamo.id,

      usuarioId,

      accion:
        "RECLAMO_RESUELTO",

      descripcion:
        descripcion ||
        "Reclamo resuelto",

      estadoAnterior,

      estadoNuevo:
        "RESUELTO",

      transaction,
    });

    return reclamo;
  };

const obtenerReclamo =
  async (
    reclamoId,
    transaction = null
  ) => {
    return Reclamo.findByPk(
      reclamoId,
      {
        transaction,
      }
    );
  };

module.exports = {
  resolverReclamo,
  obtenerReclamo,
};