const {
  Op,
} = require("sequelize");

const {
  sequelize,
  Reclamo,
  Vehiculo,
  Verificacion,
  Infraccion,
  InventarioVehiculo,
 Remocion,
Predio,
Asignacion,
} = require("../models");

const {
  registrarHistorial,
} = require(
  "../services/historialService"
);


/*
|--------------------------------------------------------------------------
| PERMISO
|--------------------------------------------------------------------------
*/

const validarInspector = (
  reclamo,
  usuario
) => {
  if (
    usuario.rol ===
    "administrador"
  ) {
    return true;
  }

  return (
    usuario.rol ===
      "inspector" &&
    Number(
      reclamo.inspectorId
    ) === Number(
      usuario.id
    )
  );
};


/*
|--------------------------------------------------------------------------
| CONTEXTO PARA PÁGINA DE REMOCIÓN
|--------------------------------------------------------------------------
*/

const obtenerContextoRemocion =
  async (req, res) => {
    try {
      const reclamoId =
        Number(
          req.params.reclamoId
        );


      if (!reclamoId) {
        return res.status(400).json({
          ok: false,
          mensaje:
            "Reclamo inválido",
        });
      }


      const reclamo =
        await Reclamo.findByPk(
          reclamoId
        );


      if (!reclamo) {
        return res.status(404).json({
          ok: false,
          mensaje:
            "Reclamo no encontrado",
        });
      }


      if (
        !validarInspector(
          reclamo,
          req.usuario
        )
      ) {
        return res.status(403).json({
          ok: false,
          mensaje:
            "Este trabajo no está asignado a este inspector",
        });
      }


      const vehiculo =
        await Vehiculo.findOne({
          where: {
            reclamoId,
          },

          order: [
            ["id", "DESC"],
          ],
        });


      if (!vehiculo) {
        return res.status(404).json({
          ok: false,
          mensaje:
            "Este reclamo no tiene un vehículo registrado",
        });
      }


      const infraccion =
        await Infraccion.findOne({
          where: {
            reclamoId,
            vehiculoId:
              vehiculo.id,
            anulada:
              false,
          },

          order: [
            ["id", "DESC"],
          ],
        });


      if (!infraccion) {
        return res.status(400).json({
          ok: false,

          mensaje:
            "No se puede remover el vehículo porque no tiene Acta de Infracción registrada",
        });
      }


      const inventario =
        await InventarioVehiculo.findOne({
          where: {
            reclamoId,
            vehiculoId:
              vehiculo.id,
          },

          order: [
            ["id", "DESC"],
          ],
        });


      const remocion =
        await Remocion.findOne({
          where: {
            reclamoId,
            vehiculoId:
              vehiculo.id,
          },

          order: [
            ["id", "DESC"],
          ],
        });


      return res.json({
        ok: true,

        reclamo,
        vehiculo,
        infraccion,
        inventario,
        remocion,
      });
    } catch (error) {
      console.error(
        "Error obteniendo contexto de remoción:",
        error
      );

      return res.status(500).json({
        ok: false,
        mensaje:
          "Error obteniendo los datos para la remoción",
      });
    }
  };


/*
|--------------------------------------------------------------------------
| INFRACCIÓN - RUTA VIEJA
|--------------------------------------------------------------------------
*/

const registrarInfraccion =
  async (req, res) => {
    const transaction =
      await sequelize.transaction();

    try {
      const {
        reclamoId,
        vehiculoId,
        verificacionId,
        numeroActa,
        fechaHora,
        lugar,
        motivo,
        observaciones,
      } = req.body;


      if (
        !reclamoId ||
        !vehiculoId ||
        !numeroActa?.trim()
      ) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,

          mensaje:
            "Reclamo, vehículo y número de acta son obligatorios",
        });
      }


      const reclamo =
        await Reclamo.findByPk(
          reclamoId,
          {
            transaction,
          }
        );


      if (!reclamo) {
        await transaction.rollback();

        return res.status(404).json({
          ok: false,
          mensaje:
            "Reclamo no encontrado",
        });
      }


      if (
        !validarInspector(
          reclamo,
          req.usuario
        )
      ) {
        await transaction.rollback();

        return res.status(403).json({
          ok: false,
          mensaje:
            "Este reclamo no está asignado a este inspector",
        });
      }


      const vehiculo =
        await Vehiculo.findOne({
          where: {
            id:
              vehiculoId,

            reclamoId:
              reclamo.id,
          },

          transaction,
        });


      if (!vehiculo) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "El vehículo no pertenece a este reclamo",
        });
      }


      let verificacion =
        null;


      if (verificacionId) {
        verificacion =
          await Verificacion.findOne({
            where: {
              id:
                verificacionId,

              reclamoId:
                reclamo.id,

              vehiculoId:
                vehiculo.id,
            },

            transaction,
          });


        if (!verificacion) {
          await transaction.rollback();

          return res.status(400).json({
            ok: false,
            mensaje:
              "La verificación indicada no corresponde al vehículo",
          });
        }
      }


      const numeroNormalizado =
        numeroActa
          .trim()
          .toUpperCase();


      const existente =
        await Infraccion.findOne({
          where: {
            numeroActa:
              numeroNormalizado,
          },

          transaction,
        });


      if (existente) {
        await transaction.rollback();

        return res.status(409).json({
          ok: false,
          mensaje:
            "Ese número de Acta de Infracción ya está registrado",
        });
      }


      const infraccion =
        await Infraccion.create(
          {
            reclamoId:
              reclamo.id,

            vehiculoId:
              vehiculo.id,

            inspectorId:
              req.usuario.id,

            verificacionId:
              verificacion?.id ||
              null,

            numeroActa:
              numeroNormalizado,

            fechaHora:
              fechaHora ||
              new Date(),

            lugar:
              lugar?.trim() ||
              reclamo.direccion,

            motivo:
              motivo?.trim() ||
              "Incumplimiento del emplazamiento",

            observaciones:
              observaciones
                ?.trim() ||
              null,

            estadoJuzgado:
              "PENDIENTE_ENVIO",
          },
          {
            transaction,
          }
        );


      await registrarHistorial({
        reclamoId:
          reclamo.id,

        usuarioId:
          req.usuario.id,

        accion:
          "ACTA_INFRACCION",

        descripcion:
          `Acta de infracción ${infraccion.numeroActa} registrada`,

        estadoAnterior:
          reclamo.estado,

        estadoNuevo:
          reclamo.estado,

        transaction,
      });


      await transaction.commit();


      return res.status(201).json({
        ok: true,
        mensaje:
          "Acta de Infracción registrada correctamente",
        infraccion,
      });
    } catch (error) {
      if (
        !transaction.finished
      ) {
        await transaction.rollback();
      }


      console.error(
        "Error registrando infracción:",
        error
      );


      return res.status(500).json({
        ok: false,
        mensaje:
          "Error al registrar la infracción",
      });
    }
  };


/*
|--------------------------------------------------------------------------
| INVENTARIO - RUTA VIEJA
|--------------------------------------------------------------------------
*/

const registrarInventario =
  async (req, res) => {
    const transaction =
      await sequelize.transaction();

    try {
      const {
        reclamoId,
        vehiculoId,
        detalle,
        observaciones,
      } = req.body;


      if (
        !reclamoId ||
        !vehiculoId
      ) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "Reclamo y vehículo son obligatorios",
        });
      }


      if (
        !detalle ||
        typeof detalle !==
          "object" ||
        Array.isArray(
          detalle
        )
      ) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "El detalle del inventario es obligatorio",
        });
      }


      const reclamo =
        await Reclamo.findByPk(
          reclamoId,
          {
            transaction,
          }
        );


      if (!reclamo) {
        await transaction.rollback();

        return res.status(404).json({
          ok: false,
          mensaje:
            "Reclamo no encontrado",
        });
      }


      if (
        !validarInspector(
          reclamo,
          req.usuario
        )
      ) {
        await transaction.rollback();

        return res.status(403).json({
          ok: false,
          mensaje:
            "Este reclamo no está asignado a este inspector",
        });
      }


      const vehiculo =
        await Vehiculo.findOne({
          where: {
            id:
              vehiculoId,

            reclamoId:
              reclamo.id,
          },

          transaction,
        });


      if (!vehiculo) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "El vehículo no pertenece a este reclamo",
        });
      }


      const inventario =
        await InventarioVehiculo.create(
          {
            reclamoId:
              reclamo.id,

            vehiculoId:
              vehiculo.id,

            inspectorId:
              req.usuario.id,

            detalle,

            observaciones:
              observaciones
                ?.trim() ||
              null,

            fechaHora:
              new Date(),
          },
          {
            transaction,
          }
        );


      await registrarHistorial({
        reclamoId:
          reclamo.id,

        usuarioId:
          req.usuario.id,

        accion:
          "INVENTARIO_VEHICULO",

        descripcion:
          `Inventario registrado para vehículo interno N.º ${vehiculo.numeroInterno || vehiculo.id}`,

        estadoAnterior:
          reclamo.estado,

        estadoNuevo:
          reclamo.estado,

        transaction,
      });


      await transaction.commit();


      return res.status(201).json({
        ok: true,
        mensaje:
          "Inventario registrado correctamente",
        inventario,
      });
    } catch (error) {
      if (
        !transaction.finished
      ) {
        await transaction.rollback();
      }


      console.error(
        "Error registrando inventario:",
        error
      );


      return res.status(500).json({
        ok: false,
        mensaje:
          "Error al registrar el inventario",
      });
    }
  };


/*
|--------------------------------------------------------------------------
| REMOCIÓN SIMPLE - COMPATIBILIDAD
|--------------------------------------------------------------------------
*/

const registrarRemocion =
  async (req, res) => {
    const transaction =
      await sequelize.transaction();

    try {
      const {
        reclamoId,
        vehiculoId,
        infraccionId,
        inventarioId,

        fechaHora,
        grua,
        chofer,
        predioDestinoId,
        destino,
        observaciones,
      } = req.body;


      /*
      AHORA LOS DOS SON
      OBLIGATORIOS.
      */

    if (
  !reclamoId ||
  !vehiculoId ||
  !infraccionId ||
  !inventarioId ||
  !predioDestinoId
) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,

          mensaje:
            "Para retirar un vehículo debe existir Acta de Infracción e inventario",
        });
      }


      const reclamo =
        await Reclamo.findByPk(
          reclamoId,
          {
            transaction,
          }
        );


      if (!reclamo) {
        await transaction.rollback();

        return res.status(404).json({
          ok: false,
          mensaje:
            "Reclamo no encontrado",
        });
      }


      if (
        !validarInspector(
          reclamo,
          req.usuario
        )
      ) {
        await transaction.rollback();

        return res.status(403).json({
          ok: false,
          mensaje:
            "Este reclamo no está asignado a este inspector",
        });
      }


      const vehiculo =
        await Vehiculo.findOne({
          where: {
            id:
              vehiculoId,

            reclamoId:
              reclamo.id,
          },

          transaction,
        });


      if (!vehiculo) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "El vehículo no pertenece al reclamo",
        });
      }


      const infraccion =
        await Infraccion.findOne({
          where: {
            id:
              infraccionId,

            reclamoId:
              reclamo.id,

            vehiculoId:
              vehiculo.id,

            anulada:
              false,
          },

          transaction,
        });


      if (!infraccion) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,

          mensaje:
            "No existe una Acta de Infracción válida para este vehículo",
        });
      }


      const inventario =
        await InventarioVehiculo.findOne({
          where: {
            id:
              inventarioId,

            reclamoId:
              reclamo.id,

            vehiculoId:
              vehiculo.id,
          },

          transaction,
        });


      if (!inventario) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,

          mensaje:
            "Debe existir un inventario válido antes de retirar el vehículo",
        });
      }

const predioDestino =
  await Predio.findOne({
    where: {
      id: Number(
        predioDestinoId
      ),
      activo: true,
    },

    transaction,
  });

if (!predioDestino) {
  await transaction.rollback();

  return res.status(400).json({
    ok: false,
    mensaje:
      "El destino seleccionado no existe o está inactivo",
  });
}
      const remocion =
        await Remocion.create(
          {
            reclamoId:
              reclamo.id,

            vehiculoId:
              vehiculo.id,

            infraccionId:
              infraccion.id,

            inventarioId:
              inventario.id,

            inspectorId:
              req.usuario.id,

            fechaHora:
              fechaHora ||
              new Date(),

            grua:
              grua?.trim() ||
              null,

            chofer:
              chofer?.trim() ||
              null,

       predioDestinoId:
  predioDestino.id,

destino:
  predioDestino.nombre,

            observaciones:
              observaciones
                ?.trim() ||
              null,
          },
          {
            transaction,
          }
        );


      vehiculo.estadoActual =
        "PENDIENTE_INGRESO_PREDIO";

      await vehiculo.save({
        transaction,
      });


      reclamo.estado =
        "PENDIENTE_ACTUACION";

      reclamo.etapaActual =
        "PENDIENTE_INGRESO_PREDIO";

      reclamo.inspectorId =
        null;

      await reclamo.save({
        transaction,
      });


      const tarea =
        await Asignacion.findOne({
          where: {
            reclamoId:
              reclamo.id,

            tipo:
              "INSPECTOR",

            asignadoAId:
              req.usuario.id,

            estadoTarea: {
              [Op.in]: [
                "PENDIENTE",
                "EN_CURSO",
              ],
            },
          },

          order: [
            ["id", "DESC"],
          ],

          transaction,
        });


      if (tarea) {
        tarea.estadoTarea =
          "FINALIZADA";

        tarea.fechaFinalizacion =
          new Date();

        await tarea.save({
          transaction,
        });
      }


      await registrarHistorial({
        reclamoId:
          reclamo.id,

        usuarioId:
          req.usuario.id,

        accion:
          "REMOCION_VEHICULO",

        descripcion:
          `Vehículo interno N.º ${vehiculo.numeroInterno || vehiculo.id} retirado de la vía pública`,

        estadoAnterior:
          "PENDIENTE_ACTUACION",

        estadoNuevo:
          "PENDIENTE_ACTUACION",

        transaction,
      });


      await transaction.commit();


      return res.status(201).json({
        ok: true,

        mensaje:
          "Remoción registrada. El vehículo quedó pendiente de ingreso al predio.",

        remocion,
      });
    } catch (error) {
      if (
        !transaction.finished
      ) {
        await transaction.rollback();
      }


      console.error(
        "Error registrando remoción:",
        error
      );


      return res.status(500).json({
        ok: false,
        mensaje:
          "Error al registrar la remoción",
      });
    }
  };


/*
|--------------------------------------------------------------------------
| INVENTARIO + REMOCIÓN EN UNA SOLA OPERACIÓN
|--------------------------------------------------------------------------
|
| Esta es la ruta que usará la pantalla nueva.
|
| Si algo falla:
| NO queda medio inventario
| NO queda media remoción.
|
|--------------------------------------------------------------------------
*/

const registrarRemocionCompleta =
  async (req, res) => {
    const transaction =
      await sequelize.transaction();

    try {
      const {
        reclamoId,
        vehiculoId,
        infraccionId,

        detalleInventario,
        observacionesInventario,

      grua,
chofer,
predioDestinoId,
destino,
observacionesRemocion,
      } = req.body;


if (
  !reclamoId ||
  !vehiculoId ||
  !infraccionId ||
  !predioDestinoId
) {
  await transaction.rollback();

  return res.status(400).json({
    ok: false,
    mensaje:
      "Faltan datos del reclamo, vehículo, Acta de Infracción o destino del vehículo",
  });
}


      if (
        !detalleInventario ||
        typeof detalleInventario !==
          "object" ||
        Array.isArray(
          detalleInventario
        ) ||
        Object.keys(
          detalleInventario
        ).length === 0
      ) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,

          mensaje:
            "Debe completar el inventario del vehículo antes de retirarlo",
        });
      }


      const reclamo =
        await Reclamo.findByPk(
          reclamoId,
          {
            transaction,
          }
        );


      if (!reclamo) {
        await transaction.rollback();

        return res.status(404).json({
          ok: false,
          mensaje:
            "Reclamo no encontrado",
        });
      }


      if (
        !validarInspector(
          reclamo,
          req.usuario
        )
      ) {
        await transaction.rollback();

        return res.status(403).json({
          ok: false,
          mensaje:
            "Este trabajo no está asignado a este inspector",
        });
      }


      const vehiculo =
        await Vehiculo.findOne({
          where: {
            id:
              vehiculoId,

            reclamoId:
              reclamo.id,
          },

          transaction,
        });


      if (!vehiculo) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "El vehículo no pertenece al reclamo",
        });
      }


      /*
      INFRACCIÓN OBLIGATORIA.
      */

      const infraccion =
        await Infraccion.findOne({
          where: {
            id:
              infraccionId,

            reclamoId:
              reclamo.id,

            vehiculoId:
              vehiculo.id,

            anulada:
              false,
          },

          transaction,
        });


      if (!infraccion) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,

          mensaje:
            "No se puede retirar el vehículo sin una Acta de Infracción válida",
        });
      }


      const remocionAnterior =
        await Remocion.findOne({
          where: {
            reclamoId:
              reclamo.id,

            vehiculoId:
              vehiculo.id,
          },

          transaction,
        });

        const predioDestino =
  await Predio.findOne({
    where: {
      id: Number(
        predioDestinoId
      ),
      activo: true,
    },

    transaction,
  });

if (!predioDestino) {
  await transaction.rollback();

  return res.status(400).json({
    ok: false,
    mensaje:
      "El destino seleccionado no existe o está inactivo",
  });
}


      if (remocionAnterior) {
        await transaction.rollback();

        return res.status(409).json({
          ok: false,
          mensaje:
            "Este vehículo ya tiene una remoción registrada",
        });
      }


      /*
      INVENTARIO
      */

      const inventario =
        await InventarioVehiculo.create(
          {
            reclamoId:
              reclamo.id,

            vehiculoId:
              vehiculo.id,

            inspectorId:
              req.usuario.id,

            fechaHora:
              new Date(),

            detalle:
              detalleInventario,

            observaciones:
              observacionesInventario
                ?.trim() ||
              null,
          },
          {
            transaction,
          }
        );


      /*
      REMOCIÓN
      */

      const remocion =
        await Remocion.create(
          {
            reclamoId:
              reclamo.id,

            vehiculoId:
              vehiculo.id,

            infraccionId:
              infraccion.id,

            inventarioId:
              inventario.id,

            inspectorId:
              req.usuario.id,

            fechaHora:
              new Date(),

            grua:
              grua?.trim() ||
              null,

            chofer:
              chofer?.trim() ||
              null,

           predioDestinoId:
  predioDestino.id,

destino:
  predioDestino.nombre,

            observaciones:
              observacionesRemocion
                ?.trim() ||
              null,
          },
          {
            transaction,
          }
        );


      vehiculo.estadoActual =
        "PENDIENTE_INGRESO_PREDIO";

      await vehiculo.save({
        transaction,
      });


      /*
      El auto salió de la calle,
      pero todavía Predio tiene
      que registrar el ingreso.
      */

      reclamo.estado =
        "PENDIENTE_ACTUACION";

      reclamo.etapaActual =
        "PENDIENTE_INGRESO_PREDIO";

      reclamo.inspectorId =
        null;

      await reclamo.save({
        transaction,
      });


      /*
      Terminamos la tarea que tenía
      el inspector.
      */

      const tarea =
        await Asignacion.findOne({
          where: {
            reclamoId:
              reclamo.id,

            tipo:
              "INSPECTOR",

            asignadoAId:
              req.usuario.id,

            estadoTarea: {
              [Op.in]: [
                "PENDIENTE",
                "EN_CURSO",
              ],
            },
          },

          order: [
            ["id", "DESC"],
          ],

          transaction,
        });


      if (tarea) {
        tarea.estadoTarea =
          "FINALIZADA";

        tarea.fechaFinalizacion =
          new Date();

        await tarea.save({
          transaction,
        });
      }


      await registrarHistorial({
        reclamoId:
          reclamo.id,

        usuarioId:
          req.usuario.id,

        accion:
          "INVENTARIO_VEHICULO",

        descripcion:
          `Inventario realizado antes de retirar el vehículo N.º ${vehiculo.numeroInterno || vehiculo.id}`,

        estadoAnterior:
          reclamo.estado,

        estadoNuevo:
          reclamo.estado,

        transaction,
      });


      await registrarHistorial({
        reclamoId:
          reclamo.id,

        usuarioId:
          req.usuario.id,

        accion:
          "REMOCION_VEHICULO",

        descripcion:
          `Vehículo N.º ${vehiculo.numeroInterno || vehiculo.id} retirado y trasladado a ${predioDestino.nombre}`,

        estadoAnterior:
          reclamo.estado,

        estadoNuevo:
          reclamo.estado,

        transaction,
      });


      await transaction.commit();


      return res.status(201).json({
        ok: true,

        mensaje:
          "Inventario y remoción registrados. El vehículo quedó pendiente de ingreso al predio.",

        inventario,
        remocion,
        vehiculo,

        etapaActual:
          reclamo.etapaActual,
      });
    } catch (error) {
      if (
        !transaction.finished
      ) {
        await transaction.rollback();
      }


      console.error(
        "Error registrando remoción completa:",
        error
      );


      return res.status(500).json({
        ok: false,

        mensaje:
          "Error registrando inventario y remoción",

        error:
          error.message,
      });
    }
  };


module.exports = {
  obtenerContextoRemocion,

  registrarInfraccion,
  registrarInventario,
  registrarRemocion,

  registrarRemocionCompleta,
};