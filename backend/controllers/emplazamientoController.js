const {
  sequelize,
  Reclamo,
  Acta,
  Vehiculo,
  Emplazamiento,
  Usuario,
} = require("../models");

const {
  registrarHistorial,
} = require(
  "../services/historialService"
);

const {
  convertirPlazoAHoras,
  calcularFechaVencimiento,
  actualizarVencidos,
} = require(
  "../services/emplazamientoService"
);

/*
|--------------------------------------------------------------------------
| CREAR ACTA VÍA PÚBLICA + EMPLAZAMIENTO
|--------------------------------------------------------------------------
*/

const crearEmplazamiento =
  async (req, res) => {
    const transaction =
      await sequelize.transaction();

    try {
      const {
        reclamoId,

        constatacionId =
          null,

        vehiculoId =
          null,

        numeroActa,

        fechaHora,

        personaEncontrada =
          false,

        atendidoPor =
          null,

        caracterAtendido =
          null,

        situacion =
          null,

        cantidad =
          null,

        plazoCantidad,

        plazoUnidad =
          "HORAS",

        observaciones,
      } = req.body;

      /*
      |--------------------------------------------------------------------------
      | VALIDACIONES BÁSICAS
      |--------------------------------------------------------------------------
      */

      if (!reclamoId) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "El reclamo es obligatorio",
        });
      }

      const numeroLimpio =
        numeroActa
          ?.trim();

      if (!numeroLimpio) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "Ingresá el número del Acta de Vía Pública",
        });
      }

      const cantidadPlazo =
        Number(
          plazoCantidad
        );

      if (
        !Number.isFinite(
          cantidadPlazo
        ) ||
        cantidadPlazo <= 0
      ) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "El plazo debe ser mayor a cero",
        });
      }

      const unidad =
        String(
          plazoUnidad
        ).toUpperCase();

      if (
        ![
          "HORAS",
          "DIAS",
        ].includes(
          unidad
        )
      ) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "La unidad del plazo debe ser HORAS o DIAS",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | RECLAMO
      |--------------------------------------------------------------------------
      */

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
        [
          "RESUELTO",
          "ANULADO",
        ].includes(
          reclamo.estado
        )
      ) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "No se puede emplazar un reclamo finalizado",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | SEGURIDAD DEL INSPECTOR
      |--------------------------------------------------------------------------
      */

      if (
        req.usuario.rol ===
          "inspector" &&
        Number(
          reclamo.inspectorId
        ) !==
          Number(
            req.usuario.id
          )
      ) {
        await transaction.rollback();

        return res.status(403).json({
          ok: false,
          mensaje:
            "Este reclamo no está asignado a este inspector",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | EVITAR DOS EMPLAZAMIENTOS ACTIVOS
      |--------------------------------------------------------------------------
      */

      const emplazamientoActivo =
        await Emplazamiento.findOne({
          where: {
            reclamoId:
              reclamo.id,

            estado:
              "VIGENTE",
          },

          transaction,
        });

      if (
        emplazamientoActivo
      ) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "Este reclamo ya tiene un emplazamiento vigente",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | EVITAR NÚMERO DE ACTA REPETIDO
      |--------------------------------------------------------------------------
      */

      const actaExistente =
        await Acta.findOne({
          where: {
            numeroActa:
              numeroLimpio,
          },

          transaction,
        });

      if (actaExistente) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "Ese número de acta ya está registrado",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | VEHÍCULO OPCIONAL
      |--------------------------------------------------------------------------
      */

      let vehiculo = null;

      if (vehiculoId) {
        vehiculo =
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
      }

      /*
      |--------------------------------------------------------------------------
      | FECHAS
      |--------------------------------------------------------------------------
      */

      const fechaInicio =
        fechaHora
          ? new Date(
              fechaHora
            )
          : new Date();

      if (
        Number.isNaN(
          fechaInicio.getTime()
        )
      ) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "Fecha inválida",
        });
      }

      const plazoHoras =
        convertirPlazoAHoras(
          cantidadPlazo,
          unidad
        );

      const fechaVencimiento =
        calcularFechaVencimiento(
          fechaInicio,
          cantidadPlazo,
          unidad
        );

      if (
        !plazoHoras ||
        !fechaVencimiento
      ) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "No se pudo calcular el vencimiento",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | CREAR ACTA VÍA PÚBLICA
      |--------------------------------------------------------------------------
      */

      const acta =
        await Acta.create(
          {
            reclamoId:
              reclamo.id,

            vehiculoId:
              vehiculo?.id ||
              null,

            constatacionId:
              constatacionId
                ? Number(
                    constatacionId
                  )
                : null,

            inspectorId:
              req.usuario.id,

            numeroActa:
              numeroLimpio,

            tipo:
              "VIA_PUBLICA",

            fechaHora:
              fechaInicio,

            lugar:
              reclamo.direccion ||
              null,

            personaEncontrada:
              Boolean(
                personaEncontrada
              ),

            atendidoPor:
              personaEncontrada
                ? atendidoPor
                    ?.trim() ||
                  null
                : null,

            caracterAtendido:
              personaEncontrada
                ? caracterAtendido
                    ?.trim() ||
                  null
                : null,

            situacion:
              situacion
                ?.trim() ||
              null,

            cantidad:
              cantidad
                ?.toString()
                .trim() ||
              null,

            plazoHoras,

            observaciones:
              observaciones
                ?.trim() ||
              null,

            anulada:
              false,
          },
          {
            transaction,
          }
        );

      /*
      |--------------------------------------------------------------------------
      | CREAR EMPLAZAMIENTO
      |--------------------------------------------------------------------------
      */

      const emplazamiento =
        await Emplazamiento.create(
          {
            reclamoId:
              reclamo.id,

            actaId:
              acta.id,

            vehiculoId:
              vehiculo?.id ||
              null,

            inspectorId:
              req.usuario.id,

            fechaHora:
              fechaInicio,

            plazoCantidad:
              cantidadPlazo,

            plazoUnidad:
              unidad,

            plazoHoras,

            fechaVencimiento,

            estado:
              "VIGENTE",

            observaciones:
              observaciones
                ?.trim() ||
              null,
          },
          {
            transaction,
          }
        );

      /*
      |--------------------------------------------------------------------------
      | ESTADO DEL RECLAMO
      |--------------------------------------------------------------------------
      */

      const estadoAnterior =
        reclamo.estado;

      reclamo.estado =
        "EN_SEGUIMIENTO";

      await reclamo.save({
        transaction,
      });

      /*
      |--------------------------------------------------------------------------
      | VEHÍCULO
      |--------------------------------------------------------------------------
      |
      | Acá sí podemos indicar que
      | el vehículo está emplazado.
      |
      | Eso pertenece al vehículo,
      | no al estado genérico del
      | reclamo.
      |
      */

      if (vehiculo) {
        vehiculo.estadoActual =
          "EMPLAZADO";

        await vehiculo.save({
          transaction,
        });
      }

      /*
      |--------------------------------------------------------------------------
      | HISTORIAL
      |--------------------------------------------------------------------------
      */

      const textoPlazo =
        unidad === "DIAS"
          ? `${cantidadPlazo} día${
              cantidadPlazo !== 1
                ? "s"
                : ""
            }`
          : `${cantidadPlazo} hora${
              cantidadPlazo !== 1
                ? "s"
                : ""
            }`;

      await registrarHistorial({
        reclamoId:
          reclamo.id,

        usuarioId:
          req.usuario.id,

        accion:
          "ACTA_VIA_PUBLICA",

        descripcion:
          `Acta de Vía Pública ${numeroLimpio}. Plazo otorgado: ${textoPlazo}.`,

        estadoAnterior,

        estadoNuevo:
          "EN_SEGUIMIENTO",

        transaction,
      });

      await transaction.commit();

      return res.status(201).json({
        ok: true,

        mensaje:
          "Acta de Vía Pública y emplazamiento registrados correctamente",

        acta,

        emplazamiento,

        reclamo: {
          id:
            reclamo.id,

          estado:
            reclamo.estado,
        },
      });
    } catch (error) {
      await transaction.rollback();

      console.error(
        "Error creando Acta de Vía Pública / emplazamiento:",
        error
      );

      return res.status(500).json({
        ok: false,

        mensaje:
          "Error al registrar el Acta de Vía Pública y el emplazamiento",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| LISTAR EMPLAZAMIENTOS
|--------------------------------------------------------------------------
*/

const listarEmplazamientos =
  async (req, res) => {
    try {
      await actualizarVencidos();

      const where = {};

      if (
        req.usuario.rol ===
        "inspector"
      ) {
        where.inspectorId =
          req.usuario.id;
      }

      if (
        req.query.estado
      ) {
        where.estado =
          req.query.estado;
      }

      const emplazamientos =
        await Emplazamiento.findAll({
          where,

          include: [
            {
              model: Reclamo,
              as: "reclamo",
            },

            {
              model: Acta,
              as: "acta",
            },

            {
              model: Vehiculo,
              as: "vehiculo",
              required: false,
            },

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
            [
              "fechaVencimiento",
              "ASC",
            ],
          ],
        });

      return res.json({
        ok: true,
        emplazamientos,
      });
    } catch (error) {
      console.error(
        "Error obteniendo emplazamientos:",
        error
      );

      return res.status(500).json({
        ok: false,

        mensaje:
          "Error al obtener emplazamientos",
      });
    }
  };

module.exports = {
  crearEmplazamiento,
  listarEmplazamientos,
};