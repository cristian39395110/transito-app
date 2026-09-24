const {
  Op,
} = require("sequelize");

const {
  sequelize,
  Predio,
  Reclamo,
  Vehiculo,
  Remocion,
  IngresoPredio,
  EgresoPredio,
} = require("../models");

const {
  registrarHistorial,
} = require(
  "../services/historialService"
);

const {
  resolverReclamo,
} = require(
  "../services/resolucionService"
);

/*
|--------------------------------------------------------------------------
| LISTAR PREDIOS
|--------------------------------------------------------------------------
*/

const listarPredios =
  async (req, res) => {
    try {
      const predios =
        await Predio.findAll({
          where: {
            activo: true,
          },

          order: [
            ["nombre", "ASC"],
          ],
        });

      return res.json({
        ok: true,
        predios,
      });
    } catch (error) {
      console.error(
        "Error listando predios:",
        error
      );

      return res.status(500).json({
        ok: false,
        mensaje:
          "Error al obtener los predios",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| CREAR PREDIO
|--------------------------------------------------------------------------
*/

const crearPredio =
  async (req, res) => {
    try {
      const {
        nombre,
        direccion,
        descripcion,
      } = req.body;

      if (!nombre?.trim()) {
        return res.status(400).json({
          ok: false,
          mensaje:
            "El nombre del predio es obligatorio",
        });
      }

      const [
        predio,
        creado,
      ] =
        await Predio.findOrCreate({
          where: {
            nombre:
              nombre.trim(),
          },

          defaults: {
            nombre:
              nombre.trim(),

            direccion:
              direccion?.trim() ||
              null,

            descripcion:
              descripcion?.trim() ||
              null,

            activo: true,
          },
        });

      if (!creado) {
        return res.status(400).json({
          ok: false,
          mensaje:
            "Ya existe un predio con ese nombre",
        });
      }

      return res.status(201).json({
        ok: true,
        mensaje:
          "Predio creado correctamente",
        predio,
      });
    } catch (error) {
      console.error(
        "Error creando predio:",
        error
      );

      return res.status(500).json({
        ok: false,
        mensaje:
          "Error al crear el predio",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| VEHÍCULOS PENDIENTES DE INGRESO A GRANJA LA AMALIA
|--------------------------------------------------------------------------
*/

const listarPendientesIngreso =
  async (req, res) => {
    try {
      const predioId =
        Number(req.query.predioId);

      if (!predioId) {
        return res.status(400).json({
          ok: false,
          mensaje:
            "Debe indicar el predio que desea consultar",
        });
      }

      const predio =
        await Predio.findOne({
          where: {
            id: predioId,
            activo: true,
          },
        });

      if (!predio) {
        return res.status(404).json({
          ok: false,
          mensaje:
            "Predio no encontrado o inactivo",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | PENDIENTES DEL CIRCUITO NORMAL
      |--------------------------------------------------------------------------
      */

      const remociones =
        await Remocion.findAll({
          where: {
            predioDestinoId:
              predio.id,
          },

          include: [
            {
              model: Vehiculo,
              as: "vehiculo",

              where: {
                estadoActual:
                  "PENDIENTE_INGRESO_PREDIO",
              },
            },

            {
              model: Reclamo,
              as: "reclamo",
            },

            {
              model: Predio,
              as: "predioDestino",
            },
          ],

          order: [
            ["fechaHora", "ASC"],
          ],
        });

      const pendientesNormales =
        remociones.map(
          (remocion) => ({
            vehiculo:
              remocion.vehiculo,

            reclamo:
              remocion.reclamo,

            remocion,

            origen:
              "CIRCUITO_NORMAL",

            predio,
          })
        );

      /*
      |--------------------------------------------------------------------------
      | PENDIENTES DE CARGA HISTÓRICA / MANUAL
      |--------------------------------------------------------------------------
      */

      const vehiculosManuales =
        await Vehiculo.findAll({
          where: {
            estadoActual:
              "PENDIENTE_INGRESO_PREDIO",

            origenRegistro:
              "CARGA_HISTORICA",

            predioPendienteId:
              predio.id,
          },

          include: [
            {
              model: Reclamo,
              as: "reclamo",
              required: false,
            },
          ],

          order: [
            ["createdAt", "ASC"],
          ],
        });

      const pendientesManuales =
        vehiculosManuales.map(
          (vehiculo) => ({
            vehiculo,

            reclamo:
              vehiculo.reclamo ||
              null,

            remocion: null,

            origen:
              "CARGA_HISTORICA",

            predio,
          })
        );

      /*
      |--------------------------------------------------------------------------
      | UNIMOS AMBOS CIRCUITOS
      |--------------------------------------------------------------------------
      */

      const pendientes = [
        ...pendientesNormales,
        ...pendientesManuales,
      ];

      return res.json({
        ok: true,

        predio,

        pendientes,

        total:
          pendientes.length,
      });
    } catch (error) {
      console.error(
        "Error listando vehículos pendientes de ingreso:",
        error
      );

      return res.status(500).json({
        ok: false,
        mensaje:
          "Error al obtener los vehículos pendientes de ingreso",
      });
    }
  };
/*
|--------------------------------------------------------------------------
| REGISTRAR INGRESO AL PREDIO
|--------------------------------------------------------------------------
*/

const registrarIngreso =
  async (req, res) => {
    const transaction =
      await sequelize.transaction();

    try {
      const {
        reclamoId,
        vehiculoId,
        remocionId,
        predioId,
        fechaHora,
        sector,
        posicion,
        observaciones,
      } = req.body;

      /*
      |--------------------------------------------------------------------------
      | VALIDACIONES GENERALES
      |--------------------------------------------------------------------------
      */

      if (!predioId) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "El predio es obligatorio",
        });
      }

      const predio =
        await Predio.findOne({
          where: {
            id: Number(predioId),
            activo: true,
          },
          transaction,
        });

      if (!predio) {
        await transaction.rollback();

        return res.status(404).json({
          ok: false,
          mensaje:
            "Predio no encontrado o inactivo",
        });
      }

      let remocion = null;
      let vehiculo = null;
      let reclamo = null;

      /*
      |--------------------------------------------------------------------------
      | CIRCUITO AUTOMÁTICO
      |--------------------------------------------------------------------------
      */

      if (remocionId) {
        remocion =
          await Remocion.findByPk(
            remocionId,
            {
              transaction,
            }
          );

        if (!remocion) {
          await transaction.rollback();

          return res.status(404).json({
            ok: false,
            mensaje:
              "Remoción no encontrada",
          });
        }

        reclamo =
          await Reclamo.findByPk(
            remocion.reclamoId,
            {
              transaction,
            }
          );

        vehiculo =
          await Vehiculo.findByPk(
            remocion.vehiculoId,
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

        if (!vehiculo) {
          await transaction.rollback();

          return res.status(404).json({
            ok: false,
            mensaje:
              "Vehículo no encontrado",
          });
        }

        if (
          Number(
            remocion.predioDestinoId
          ) !== Number(predio.id)
        ) {
          await transaction.rollback();

          return res.status(400).json({
            ok: false,
            mensaje:
              `Este vehículo fue removido con destino a ${
                remocion.destino ||
                "otro predio"
              } y no puede ingresarse en ${
                predio.nombre
              }`,
          });
        }

        const ingresoExistente =
          await IngresoPredio.findOne({
            where: {
              remocionId:
                remocion.id,
            },
            transaction,
          });

        if (ingresoExistente) {
          await transaction.rollback();

          return res.status(400).json({
            ok: false,
            mensaje:
              "Esta remoción ya tiene un ingreso al predio registrado",
          });
        }
      }

      /*
      |--------------------------------------------------------------------------
      | CARGA HISTÓRICA / MANUAL
      |--------------------------------------------------------------------------
      */

      else {
        if (!vehiculoId) {
          await transaction.rollback();

          return res.status(400).json({
            ok: false,
            mensaje:
              "Debe indicar el vehículo a ingresar",
          });
        }

        vehiculo =
          await Vehiculo.findByPk(
            vehiculoId,
            {
              transaction,
            }
          );

        if (!vehiculo) {
          await transaction.rollback();

          return res.status(404).json({
            ok: false,
            mensaje:
              "Vehículo no encontrado",
          });
        }

        if (
          vehiculo.origenRegistro !==
          "CARGA_HISTORICA"
        ) {
          await transaction.rollback();

          return res.status(400).json({
            ok: false,
            mensaje:
              "El vehículo no posee una remoción registrada",
          });
        }

        if (
          vehiculo.estadoActual !==
          "PENDIENTE_INGRESO_PREDIO"
        ) {
          await transaction.rollback();

          return res.status(400).json({
            ok: false,
            mensaje:
              "El vehículo no está pendiente de ingreso al predio",
          });
        }

        if (
          Number(
            vehiculo.predioPendienteId
          ) !== Number(predio.id)
        ) {
          await transaction.rollback();

          return res.status(400).json({
            ok: false,
            mensaje:
              "El vehículo histórico está asignado a otro predio",
          });
        }

        reclamo =
          await Reclamo.findByPk(
            vehiculo.reclamoId,
            {
              transaction,
            }
          );

        if (!reclamo) {
          await transaction.rollback();

          return res.status(404).json({
            ok: false,
            mensaje:
              "Reclamo asociado no encontrado",
          });
        }

        /*
         * Evitamos registrar dos veces
         * el mismo vehículo histórico.
         */
        const ingresoExistente =
          await IngresoPredio.findOne({
            where: {
              vehiculoId:
                vehiculo.id,
              predioId:
                predio.id,
            },
            transaction,
          });

        if (ingresoExistente) {
          await transaction.rollback();

          return res.status(400).json({
            ok: false,
            mensaje:
              "Este vehículo ya tiene un ingreso registrado en el predio",
          });
        }

        /*
         * Seguridad adicional:
         * si el frontend mandó reclamoId,
         * debe coincidir.
         */
        if (
          reclamoId &&
          Number(reclamoId) !==
            Number(reclamo.id)
        ) {
          await transaction.rollback();

          return res.status(400).json({
            ok: false,
            mensaje:
              "El reclamo no corresponde al vehículo indicado",
          });
        }
      }

      /*
      |--------------------------------------------------------------------------
      | FECHA DE INGRESO
      |--------------------------------------------------------------------------
      */

      const fechaIngreso =
        fechaHora
          ? new Date(fechaHora)
          : new Date();

      if (
        Number.isNaN(
          fechaIngreso.getTime()
        )
      ) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "La fecha de ingreso no es válida",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | CREAR INGRESO
      |--------------------------------------------------------------------------
      */

      const ingreso =
        await IngresoPredio.create(
          {
            reclamoId:
              reclamo.id,

            vehiculoId:
              vehiculo.id,

            remocionId:
              remocion
                ? remocion.id
                : null,

            predioId:
              predio.id,

            registradoPorId:
              req.usuario.id,

            fechaHora:
              fechaIngreso,

            sector:
              sector?.trim() ||
              null,

            posicion:
              posicion?.trim() ||
              null,

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
      | ACTUALIZAR RECLAMO
      |--------------------------------------------------------------------------
      */

      const estadoAnterior =
        reclamo.estado;

      reclamo.estado =
        "EN_PREDIO";

      reclamo.etapaActual =
        "EN_PREDIO";

      await reclamo.save({
        transaction,
      });

      /*
      |--------------------------------------------------------------------------
      | ACTUALIZAR VEHÍCULO
      |--------------------------------------------------------------------------
      */

      vehiculo.estadoActual =
        "EN_PREDIO";

      /*
       * Solo la carga histórica utiliza
       * predioPendienteId.
       *
       * Una vez recibido físicamente,
       * deja de estar pendiente.
       */
      if (
        vehiculo.origenRegistro ===
        "CARGA_HISTORICA"
      ) {
        vehiculo.predioPendienteId =
          null;
      }

      await vehiculo.save({
        transaction,
      });

      /*
      |--------------------------------------------------------------------------
      | HISTORIAL
      |--------------------------------------------------------------------------
      */

      const ubicacionTexto =
        [
          sector?.trim()
            ? `Sector ${sector.trim()}`
            : null,

          posicion?.trim()
            ? `posición ${posicion.trim()}`
            : null,
        ]
          .filter(Boolean)
          .join(", ");

      await registrarHistorial({
        reclamoId:
          reclamo.id,

        usuarioId:
          req.usuario.id,

        accion:
          "INGRESO_PREDIO",

        descripcion:
          ubicacionTexto
            ? `Vehículo interno N.º ${
                vehiculo.numeroInterno ||
                vehiculo.id
              } ingresó a ${
                predio.nombre
              }. ${ubicacionTexto}.`
            : `Vehículo interno N.º ${
                vehiculo.numeroInterno ||
                vehiculo.id
              } ingresó a ${
                predio.nombre
              }.`,

        estadoAnterior,

        estadoNuevo:
          "EN_PREDIO",

        transaction,
      });

      await transaction.commit();

      return res.status(201).json({
        ok: true,

        mensaje:
          "Ingreso al predio registrado correctamente",

        ingreso,
      });
    } catch (error) {
      await transaction.rollback();

      console.error(
        "Error registrando ingreso al predio:",
        error
      );

      return res.status(500).json({
        ok: false,
        mensaje:
          "Error al registrar el ingreso al predio",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| REGISTRAR EGRESO DEL PREDIO
|--------------------------------------------------------------------------
*/

const registrarEgreso =
  async (req, res) => {
    const transaction =
      await sequelize.transaction();

    try {
      const {
        ingresoPredioId,
        tipoEgreso,
        fechaHora,
        predioDestinoId,
        destinoPersona,
        dniPersona,
        observaciones,
      } = req.body;

      if (
        !ingresoPredioId ||
        !tipoEgreso
      ) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "Ingreso y tipo de egreso son obligatorios",
        });
      }

      const tiposValidos = [
        "ENTREGADO",
        "TRASLADADO",
        "COMPACTADO",
        "OTRO",
      ];

      if (
        !tiposValidos.includes(
          tipoEgreso
        )
      ) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "Tipo de egreso inválido",
        });
      }

      const ingreso =
        await IngresoPredio.findByPk(
          ingresoPredioId,
          {
            transaction,
          }
        );

      if (!ingreso) {
        await transaction.rollback();

        return res.status(404).json({
          ok: false,
          mensaje:
            "Ingreso al predio no encontrado",
        });
      }

      const egresoExistente =
        await EgresoPredio.findOne({
          where: {
            ingresoPredioId:
              ingreso.id,
          },

          transaction,
        });

      if (egresoExistente) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "Este vehículo ya tiene un egreso registrado",
        });
      }

      const reclamo =
        await Reclamo.findByPk(
          ingreso.reclamoId,
          {
            transaction,
          }
        );

      const vehiculo =
        await Vehiculo.findByPk(
          ingreso.vehiculoId,
          {
            transaction,
          }
        );

      if (
        !reclamo ||
        !vehiculo
      ) {
        await transaction.rollback();

        return res.status(404).json({
          ok: false,
          mensaje:
            "No se pudo encontrar el reclamo o vehículo asociado",
        });
      }

       let predioDestino =
  null;

if (
  tipoEgreso ===
  "TRASLADADO"
) {
  if (!predioDestinoId) {
    await transaction.rollback();

    return res.status(400).json({
      ok: false,
      mensaje:
        "Debe seleccionar el destino del traslado",
    });
  }

  predioDestino =
    await Predio.findOne({
      where: {
        id:
          Number(
            predioDestinoId
          ),
        activo: true,
      },

      transaction,
    });

  if (!predioDestino) {
    await transaction.rollback();

    return res.status(404).json({
      ok: false,
      mensaje:
        "El destino seleccionado no existe o está inactivo",
    });
  }

  if (
    Number(
      predioDestino.id
    ) ===
    Number(
      ingreso.predioId
    )
  ) {
    await transaction.rollback();

    return res.status(400).json({
      ok: false,
      mensaje:
        "El destino del traslado no puede ser el mismo predio del que está saliendo",
    });
  }
}
      const fechaEgreso =
        fechaHora
          ? new Date(fechaHora)
          : new Date();

      if (
        Number.isNaN(
          fechaEgreso.getTime()
        )
      ) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "La fecha de egreso no es válida",
        });
      }

      const egreso =
        await EgresoPredio.create(
          {
            reclamoId:
              reclamo.id,

            vehiculoId:
              vehiculo.id,

            ingresoPredioId:
              ingreso.id,

            registradoPorId:
              req.usuario.id,

            fechaHora:
              fechaEgreso,

            tipoEgreso,
            
            predioDestinoId:
  tipoEgreso ===
    "TRASLADADO"
    ? predioDestino.id
    : null,
          destinoPersona:
  tipoEgreso ===
    "ENTREGADO"
    ? destinoPersona
        ?.trim() ||
      null
    : null,

           dniPersona:
  tipoEgreso ===
    "ENTREGADO"
    ? dniPersona
        ?.trim() ||
      null
    : null,

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
        "EGRESADO";

      await vehiculo.save({
        transaction,
      });

      await registrarHistorial({
        reclamoId:
          reclamo.id,

        usuarioId:
          req.usuario.id,

        accion:
          "EGRESO_PREDIO",

     descripcion:
  tipoEgreso ===
    "TRASLADADO"
    ? `Vehículo interno N.º ${
        vehiculo.numeroInterno ||
        vehiculo.id
      } trasladado a ${
        predioDestino.nombre
      }`
    : tipoEgreso ===
        "ENTREGADO"
      ? `Vehículo interno N.º ${
          vehiculo.numeroInterno ||
          vehiculo.id
        } entregado a ${
          destinoPersona?.trim() ||
          "responsable"
        }`
      : `Vehículo interno N.º ${
          vehiculo.numeroInterno ||
          vehiculo.id
        }: ${tipoEgreso}`,

        estadoAnterior:
          reclamo.estado,

        estadoNuevo:
          reclamo.estado,

        transaction,
      });

      /*
      Puede haber más de un vehículo
      asociado al mismo reclamo.

      Por eso no resolvemos automáticamente
      el reclamo hasta comprobar que todos
      los vehículos asociados finalizaron.
      */

      const vehiculosPendientes =
        await Vehiculo.count({
          where: {
            reclamoId:
              reclamo.id,

            estadoActual: {
              [Op.ne]:
                "EGRESADO",
            },
          },

          transaction,
        });

      if (
        vehiculosPendientes === 0
      ) {
        await resolverReclamo({
          reclamo,

          usuarioId:
            req.usuario.id,

          descripcion:
            "Finalizó la gestión de los vehículos asociados al reclamo",

          transaction,
        });
      }

      await transaction.commit();

      return res.status(201).json({
        ok: true,

        mensaje:
          "Egreso del predio registrado correctamente",

        egreso,

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
        "Error registrando egreso:",
        error
      );

      return res.status(500).json({
        ok: false,
        mensaje:
          "Error al registrar el egreso del predio",
      });
    }
  };

  /*
|--------------------------------------------------------------------------
| HISTORIAL DE VEHÍCULOS DEL PREDIO
|--------------------------------------------------------------------------
*/

const listarHistorialPredio =
  async (req, res) => {
    try {
      const predioId =
        Number(req.query.predioId);

      const pagina =
        Math.max(
          Number(req.query.page) || 1,
          1
        );

      const limite = 10;

      const offset =
        (pagina - 1) * limite;


        const buscar =
  String(
    req.query.buscar || ""
  ).trim();

const whereVehiculo = {};

if (buscar) {
  whereVehiculo[Op.or] = [
    {
      numeroInterno: {
        [Op.like]:
          `%${buscar}%`,
      },
    },
    {
      dominio: {
        [Op.like]:
          `%${buscar}%`,
      },
    },
    {
      marca: {
        [Op.like]:
          `%${buscar}%`,
      },
    },
    {
      modelo: {
        [Op.like]:
          `%${buscar}%`,
      },
    },
    {
      color: {
        [Op.like]:
          `%${buscar}%`,
      },
    },
  ];
}
      if (!predioId) {
        return res
          .status(400)
          .json({
            ok: false,
            mensaje:
              "Debe indicar el predio que desea consultar",
          });
      }

      const predio =
        await Predio.findOne({
          where: {
            id: predioId,
            activo: true,
          },
        });

      if (!predio) {
        return res
          .status(404)
          .json({
            ok: false,
            mensaje:
              "Predio no encontrado o inactivo",
          });
      }

      const {
        count,
        rows: ingresos,
      } =
        await IngresoPredio.findAndCountAll({
          where: {
            predioId:
              predio.id,
          },

          include: [
            {
              model: Predio,
              as: "predio",
            },

         {
  model: Vehiculo,
  as: "vehiculo",
  where:
    buscar
      ? whereVehiculo
      : undefined,
  required:
    Boolean(buscar),
},

            {
              model: Reclamo,
              as: "reclamo",
            },
          ],

          order: [
            [
              "fechaHora",
              "DESC",
            ],
          ],

          limit: limite,
          offset,

          distinct: true,
        });

      const ingresoIds =
        ingresos.map(
          (item) =>
            Number(item.id)
        );

      const egresos =
        ingresoIds.length
          ? await EgresoPredio.findAll({
              where: {
                ingresoPredioId: {
                  [Op.in]:
                    ingresoIds,
                },
              },

              include: [
                {
                  model: Predio,
                  as: "predioDestino",
                  required: false,
                },
              ],
            })
          : [];

      const mapaEgresos =
        new Map(
          egresos.map(
            (item) => [
              Number(
                item.ingresoPredioId
              ),
              item,
            ]
          )
        );

      const historial =
        ingresos.map(
          (ingreso) => {
            const egreso =
              mapaEgresos.get(
                Number(
                  ingreso.id
                )
              ) || null;

            return {
              ingreso,
              egreso,

              vehiculo:
                ingreso.vehiculo,

              reclamo:
                ingreso.reclamo,

              predio:
                ingreso.predio,

              estaActualmente:
                !egreso &&
                ingreso.vehiculo
                  ?.estadoActual ===
                  "EN_PREDIO",
            };
          }
        );

      const total =
        Number(count) || 0;

      const totalPaginas =
        Math.max(
          Math.ceil(
            total / limite
          ),
          1
        );

      return res.json({
        ok: true,

        predio,

        historial,

        total,

        pagina,

        limite,

        totalPaginas,
      });
    } catch (error) {
      console.error(
        "Error listando historial del predio:",
        error
      );

      return res
        .status(500)
        .json({
          ok: false,
          mensaje:
            "Error al obtener el historial del predio",
        });
    }
  };

/*
|--------------------------------------------------------------------------
| VEHÍCULOS ACTUALMENTE EN PREDIO
|--------------------------------------------------------------------------
*/

const listarVehiculosEnPredio =
  async (req, res) => {
    try {
      const predioId =
        Number(req.query.predioId);

      const pagina =
        Math.max(
          Number(req.query.page) || 1,
          1
        );

      const limite = 10;

      const offset =
        (pagina - 1) * limite;
const buscar =
  String(
    req.query.buscar || ""
  ).trim();

const whereVehiculo = {
  estadoActual:
    "EN_PREDIO",
};

if (buscar) {
  whereVehiculo[Op.or] = [
    {
      numeroInterno: {
        [Op.like]:
          `%${buscar}%`,
      },
    },
    {
      dominio: {
        [Op.like]:
          `%${buscar}%`,
      },
    },
    {
      marca: {
        [Op.like]:
          `%${buscar}%`,
      },
    },
    {
      modelo: {
        [Op.like]:
          `%${buscar}%`,
      },
    },
    {
      color: {
        [Op.like]:
          `%${buscar}%`,
      },
    },
  ];
}
      if (!predioId) {
        return res.status(400).json({
          ok: false,
          mensaje:
            "Debe indicar el predio que desea consultar",
        });
      }

      const predio =
        await Predio.findOne({
          where: {
            id: predioId,
            activo: true,
          },
        });

      if (!predio) {
        return res.status(404).json({
          ok: false,
          mensaje:
            "Predio no encontrado o inactivo",
        });
      }

      const {
        count,
        rows,
      } =
        await IngresoPredio.findAndCountAll({
          where: {
            predioId:
              predio.id,
          },

          include: [
            {
              model: Predio,
              as: "predio",
            },

            {
  model: Vehiculo,
  as: "vehiculo",
  where: whereVehiculo,
  required: true,
},

            {
              model: Reclamo,
              as: "reclamo",
            },
          ],

          order: [
            ["fechaHora", "ASC"],
          ],

          limit: limite,
          offset,

          distinct: true,
        });

      const total =
        Number(count) || 0;

      const totalPaginas =
        Math.max(
          Math.ceil(
            total / limite
          ),
          1
        );

      return res.json({
        ok: true,

        predio,

        ingresos: rows,

        total,

        pagina,

        limite,

        totalPaginas,
      });
    } catch (error) {
      console.error(
        "Error listando vehículos del predio:",
        error
      );

      return res.status(500).json({
        ok: false,
        mensaje:
          "Error al obtener los vehículos del predio",
      });
    }
  };

module.exports = {
  listarPredios,
  crearPredio,
  registrarIngreso,
  registrarEgreso,
  listarVehiculosEnPredio,
  listarPendientesIngreso,
  listarHistorialPredio
};