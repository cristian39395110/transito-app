const {
  sequelize,
  Reclamo,
  Vehiculo,
  Constatacion,
  Acta,
  Usuario,
} = require("../models");

const {
  registrarHistorial,
} = require(
  "../services/historialService"
);

/*
|--------------------------------------------------------------------------
| VALIDAR ACCESO DEL INSPECTOR
|--------------------------------------------------------------------------
*/

const puedeTrabajarReclamo = (
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
    usuario.rol === "inspector" &&
    reclamo.inspectorId ===
      usuario.id
  );
};

/*
|--------------------------------------------------------------------------
| REGISTRAR CONSTATACIÓN
|--------------------------------------------------------------------------
*/

const registrarConstatacion =
  async (req, res) => {
    const transaction =
      await sequelize.transaction();

    try {
      const reclamo =
        await Reclamo.findByPk(
          req.params.id,
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
        !puedeTrabajarReclamo(
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

      if (
        reclamo.estado ===
        "RESUELTO"
      ) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "El reclamo ya se encuentra resuelto",
        });
      }

      const {
        resultado,
        descripcionSituacion,
        latitudConstatada,
        longitudConstatada,
        observaciones,
        vehiculo,
      } = req.body;

      const resultadosValidos = [
        "CONSTATADO",
        "NO_CONSTATADO",
        "RESUELTO",
        "OTRO",
      ];

      if (
        !resultadosValidos.includes(
          resultado
        )
      ) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "Resultado de constatación inválido",
        });
      }

      /*
      El vehículo es OPCIONAL.

      Solamente se crea cuando
      realmente corresponde.
      */

      let nuevoVehiculo = null;

      if (vehiculo) {
        nuevoVehiculo =
          await Vehiculo.create(
            {
              reclamoId:
                reclamo.id,

              dominio:
                vehiculo.dominio
                  ?.trim()
                  .toUpperCase() ||
                null,

              marca:
                vehiculo.marca
                  ?.trim() ||
                null,

              modelo:
                vehiculo.modelo
                  ?.trim() ||
                null,

              color:
                vehiculo.color
                  ?.trim() ||
                null,

              tipoVehiculo:
                vehiculo.tipoVehiculo
                  ?.trim() ||
                null,

              descripcion:
                vehiculo.descripcion
                  ?.trim() ||
                null,

              estadoActual:
                "EN_VIA_PUBLICA",
            },
            {
              transaction,
            }
          );

        /*
        El ID de la base se utiliza
        también como número interno.

        1, 2, 3, 4...
        nunca se reutiliza.
        */

        nuevoVehiculo.numeroInterno =
          nuevoVehiculo.id;

        await nuevoVehiculo.save({
          transaction,
        });
      }

      const constatacion =
        await Constatacion.create(
          {
            reclamoId:
              reclamo.id,

            inspectorId:
              req.usuario.id,

            vehiculoId:
              nuevoVehiculo?.id ||
              null,

            resultado,

            descripcionSituacion:
              descripcionSituacion
                ?.trim() ||
              null,

            latitudConstatada:
              latitudConstatada ??
              null,

            longitudConstatada:
              longitudConstatada ??
              null,

            observaciones:
              observaciones?.trim() ||
              null,

            fechaHora:
              new Date(),
          },
          {
            transaction,
          }
        );

      const estadoAnterior =
        reclamo.estado;

      if (
        resultado === "RESUELTO"
      ) {
        reclamo.estado =
          "RESUELTO";

        reclamo.estadoExterno =
          "LISTO_PARA_CERRAR";

        reclamo.fechaResolucion =
          new Date();
      } else {
        reclamo.estado =
          "EN_INSPECCION";
      }

      await reclamo.save({
        transaction,
      });

      let descripcionHistorial =
        descripcionSituacion?.trim() ||
        "Inspector realizó una constatación";

      if (nuevoVehiculo) {
        descripcionHistorial +=
          ` - Vehículo interno N.º ${nuevoVehiculo.numeroInterno}`;
      }

      await registrarHistorial({
        reclamoId:
          reclamo.id,

        usuarioId:
          req.usuario.id,

        accion:
          "CONSTATACION",

        descripcion:
          descripcionHistorial,

        estadoAnterior,

        estadoNuevo:
          reclamo.estado,

        transaction,
      });

      await transaction.commit();

      return res.status(201).json({
        ok: true,

        mensaje:
          "Constatación registrada correctamente",

        constatacion,

        vehiculo:
          nuevoVehiculo,

        reclamo: {
          id: reclamo.id,
          estado:
            reclamo.estado,
          estadoExterno:
            reclamo.estadoExterno,
        },
      });
    } catch (error) {
      await transaction.rollback();

      console.error(
        "Error registrando constatación:",
        error
      );

      return res.status(500).json({
        ok: false,
        mensaje:
          "Error al registrar la constatación",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| REGISTRAR ACTA DE VÍA PÚBLICA
|--------------------------------------------------------------------------
*/

const registrarActaViaPublica =
  async (req, res) => {
    const transaction =
      await sequelize.transaction();

    try {
      const reclamo =
        await Reclamo.findByPk(
          req.params.id,
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
        !puedeTrabajarReclamo(
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

      const {
        numeroActa,
        vehiculoId,
        constatacionId,
        fechaHora,
        lugar,
        atendidoPor,
        caracterAtendido,
        situacion,
        cantidad,
        plazoHoras,
        observaciones,
      } = req.body;

      if (!numeroActa?.trim()) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "El número de acta es obligatorio",
        });
      }

      const numeroNormalizado =
        numeroActa
          .trim()
          .toUpperCase();

      const existente =
        await Acta.findOne({
          where: {
            numeroActa:
              numeroNormalizado,
          },
          transaction,
        });

      if (existente) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "Ese número de acta ya está registrado",
        });
      }

      let vehiculo = null;

      if (vehiculoId) {
        vehiculo =
          await Vehiculo.findOne({
            where: {
              id: vehiculoId,
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
      }

      let constatacion = null;

      if (constatacionId) {
        constatacion =
          await Constatacion.findOne({
            where: {
              id: constatacionId,
              reclamoId:
                reclamo.id,
            },
            transaction,
          });

        if (!constatacion) {
          await transaction.rollback();

          return res.status(400).json({
            ok: false,
            mensaje:
              "La constatación no pertenece a este reclamo",
          });
        }
      }

      const acta =
        await Acta.create(
          {
            reclamoId:
              reclamo.id,

            vehiculoId:
              vehiculo?.id ||
              null,

            constatacionId:
              constatacion?.id ||
              null,

            inspectorId:
              req.usuario.id,

            numeroActa:
              numeroNormalizado,

            tipo:
              "VIA_PUBLICA",

            fechaHora:
              fechaHora ||
              new Date(),

            lugar:
              lugar?.trim() ||
              reclamo.direccion,

            atendidoPor:
              atendidoPor?.trim() ||
              null,

            caracterAtendido:
              caracterAtendido
                ?.trim() ||
              null,

            situacion:
              situacion?.trim() ||
              null,

            cantidad:
              cantidad?.trim() ||
              null,

            plazoHoras:
              plazoHoras
                ? Number(plazoHoras)
                : null,

            observaciones:
              observaciones?.trim() ||
              null,
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
          "ACTA_VIA_PUBLICA",

        descripcion:
          `Acta ${acta.numeroActa} asociada al reclamo ${reclamo.numeroReclamo}`,

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
          "Acta de Vía Pública registrada correctamente",
        acta,
      });
    } catch (error) {
      await transaction.rollback();

      console.error(
        "Error registrando acta:",
        error
      );

      return res.status(500).json({
        ok: false,
        mensaje:
          "Error al registrar el acta",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| OBTENER ACTUACIONES
|--------------------------------------------------------------------------
*/

const obtenerActuaciones =
  async (req, res) => {
    try {
      const reclamo =
        await Reclamo.findByPk(
          req.params.id
        );

      if (!reclamo) {
        return res.status(404).json({
          ok: false,
          mensaje:
            "Reclamo no encontrado",
        });
      }

      const vehiculos =
        await Vehiculo.findAll({
          where: {
            reclamoId:
              reclamo.id,
          },

          order: [
            ["id", "ASC"],
          ],
        });

      const constataciones =
        await Constatacion.findAll({
          where: {
            reclamoId:
              reclamo.id,
          },

          include: [
            {
              model: Usuario,
              as: "inspector",
              attributes: [
                "id",
                "nombre",
              ],
            },
          ],

          order: [
            ["fechaHora", "ASC"],
          ],
        });

      const actas =
        await Acta.findAll({
          where: {
            reclamoId:
              reclamo.id,
          },

          include: [
            {
              model: Usuario,
              as: "inspector",
              attributes: [
                "id",
                "nombre",
              ],
            },
          ],

          order: [
            ["fechaHora", "ASC"],
          ],
        });

      return res.json({
        ok: true,
        reclamo,
        constataciones,
        actas,
        vehiculos,
      });
    } catch (error) {
      console.error(
        "Error obteniendo actuaciones:",
        error
      );

      return res.status(500).json({
        ok: false,
        mensaje:
          "Error al obtener las actuaciones",
      });
    }
  };

module.exports = {
  registrarConstatacion,
  registrarActaViaPublica,
  obtenerActuaciones,
};