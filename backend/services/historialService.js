const {
  Historial,
} = require("../models");

const registrarHistorial =
  async ({
    reclamoId,
    usuarioId = null,
    accion,
    descripcion = null,
    estadoAnterior = null,
    estadoNuevo = null,
    transaction = null,
  }) => {
    return Historial.create(
      {
        reclamoId,
        usuarioId,
        accion,
        descripcion,
        estadoAnterior,
        estadoNuevo,
        fecha: new Date(),
      },
      {
        transaction,
      }
    );
  };

module.exports = {
  registrarHistorial,
};