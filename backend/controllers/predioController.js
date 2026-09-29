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
  Acta,
  Infraccion,
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

const obtenerPredioPermitido = (
  req,
  predioSolicitado
) => {
  if (
    req.usuario?.rol ===
    "secretaria_predio"
  ) {
    const predioAsignado =
      Number(
        req.usuario.predioId
      );

    if (!predioAsignado) {
      return null;
    }

    return predioAsignado;
  }

  return Number(
    predioSolicitado
  ) || null;
};

const listarPredios =
  async (req, res) => {
    try {
      const where = {
        activo: true,
      };

      /*
      |--------------------------------------------------------------------------
      | SECRETARÍA DE PREDIO
      |--------------------------------------------------------------------------
      |
      | Solamente puede ver el predio
      | que tiene asignado.
      |
      */

      if (
        req.usuario?.rol ===
        "secretaria_predio"
      ) {
        const predioId =
          Number(
            req.usuario.predioId
          );

        if (!predioId) {
          return res.status(403).json({
            ok: false,
            mensaje:
              "La secretaria no tiene un predio asignado",
          });
        }

        where.id = predioId;
      }

      const predios =
        await Predio.findAll({
          where,

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
      /*
      |--------------------------------------------------------------------------
      | DETERMINAR PREDIO / TODOS LOS PREDIOS
      |--------------------------------------------------------------------------
      */

      const solicitaTodos =
        String(
          req.query.predioId || ""
        ).toUpperCase() === "TODOS";

      const puedeVerTodos = [
        "director",
        "administrador",
        "superadmin",
      ].includes(req.usuario?.rol);

      const verTodos =
        solicitaTodos &&
        puedeVerTodos;

      const predioId =
        verTodos
          ? null
          : obtenerPredioPermitido(
              req,
              req.query.predioId
            );

      /*
      |--------------------------------------------------------------------------
      | VALIDAR PREDIO
      |--------------------------------------------------------------------------
      */

      if (!verTodos && !predioId) {
        return res.status(400).json({
          ok: false,
          mensaje:
            "Debe indicar el predio que desea consultar",
        });
      }

      let predio = null;

      if (!verTodos) {
        predio =
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
      }

      /*
      |--------------------------------------------------------------------------
      | PENDIENTES DEL CIRCUITO NORMAL
      |--------------------------------------------------------------------------
      */

      const remociones =
        await Remocion.findAll({
          where: verTodos
            ? {}
            : {
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

      /*
      |--------------------------------------------------------------------------
      | ARMAR PENDIENTES NORMALES
      |--------------------------------------------------------------------------
      */

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

            predio:
              remocion.predioDestino ||
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

            ...(verTodos
              ? {
                  predioPendienteId: {
                    [Op.ne]: null,
                  },
                }
              : {
                  predioPendienteId:
                    predio.id,
                }),
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

      /*
      |--------------------------------------------------------------------------
      | OBTENER PREDIOS DE LOS VEHÍCULOS MANUALES
      |--------------------------------------------------------------------------
      |
      | Esto solamente hace falta cuando estamos viendo TODOS.
      |
      */

      const prediosPorId =
        new Map();

      if (verTodos) {
        const idsPredios = [
          ...new Set(
            vehiculosManuales
              .map(
                (vehiculo) =>
                  Number(
                    vehiculo
                      .predioPendienteId
                  )
              )
              .filter(Boolean)
          ),
        ];

        if (idsPredios.length) {
          const prediosManuales =
            await Predio.findAll({
              where: {
                id: {
                  [Op.in]:
                    idsPredios,
                },

                activo: true,
              },
            });

          for (
            const predioManual of
            prediosManuales
          ) {
            prediosPorId.set(
              Number(
                predioManual.id
              ),
              predioManual
            );
          }
        }
      }

      /*
      |--------------------------------------------------------------------------
      | ARMAR PENDIENTES MANUALES
      |--------------------------------------------------------------------------
      */

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

            predio:
              verTodos
                ? prediosPorId.get(
                    Number(
                      vehiculo
                        .predioPendienteId
                    )
                  ) || null
                : predio,
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

      /*
      |--------------------------------------------------------------------------
      | RESPUESTA
      |--------------------------------------------------------------------------
      */

      return res.json({
        ok: true,

        predio,

        todosLosPredios:
          verTodos,

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



      const predioPermitido =
  obtenerPredioPermitido(
    req,
    predioId
  );

if (!predioPermitido) {
  await transaction.rollback();

  return res.status(403).json({
    ok: false,
    mensaje:
      "No tiene un predio asignado",
  });
}

if (
  req.usuario?.rol ===
    "secretaria_predio" &&
  Number(predioId) !==
    Number(predioPermitido)
) {
  await transaction.rollback();

  return res.status(403).json({
    ok: false,
    mensaje:
      "No tiene permiso para gestionar este predio",
  });
}
      const predio =
        await Predio.findOne({
          where: {
         id: Number(predioPermitido),
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
        numeroOficio,
        observaciones,
      } = req.body;

      /*
      |--------------------------------------------------------------------------
      | DATOS OBLIGATORIOS
      |--------------------------------------------------------------------------
      */

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

      /*
      |--------------------------------------------------------------------------
      | NÚMERO DE OFICIO OBLIGATORIO PARA TODO EGRESO
      |--------------------------------------------------------------------------
      |
      | Ningún vehículo puede salir del predio
      | sin el oficio que autoriza su salida.
      |
      */

      const numeroOficioLimpio =
        String(
          numeroOficio || ""
        ).trim();

      if (!numeroOficioLimpio) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "Debe indicar el número de oficio que autoriza la salida del vehículo",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | VALIDAR TIPO DE EGRESO
      |--------------------------------------------------------------------------
      */

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

      /*
      |--------------------------------------------------------------------------
      | BUSCAR INGRESO
      |--------------------------------------------------------------------------
      */

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

      /*
|--------------------------------------------------------------------------
| SEGURIDAD SECRETARÍA DE PREDIO
|--------------------------------------------------------------------------
|
| Una secretaria de predio solamente puede registrar
| egresos del predio que tiene asignado.
|
*/

if (
  req.usuario?.rol ===
  "secretaria_predio"
) {
  const predioAsignado =
    Number(req.usuario.predioId);

  if (!predioAsignado) {
    await transaction.rollback();

    return res.status(403).json({
      ok: false,
      mensaje:
        "La secretaria no tiene un predio asignado",
    });
  }

  if (
    Number(ingreso.predioId) !==
    predioAsignado
  ) {
    await transaction.rollback();

    return res.status(403).json({
      ok: false,
      mensaje:
        "No tiene permiso para registrar egresos de este predio",
    });
  }
}

      /*
      |--------------------------------------------------------------------------
      | EVITAR DOBLE EGRESO
      |--------------------------------------------------------------------------
      */

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

      /*
      |--------------------------------------------------------------------------
      | RECLAMO Y VEHÍCULO
      |--------------------------------------------------------------------------
      */

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

      /*
      |--------------------------------------------------------------------------
      | VALIDAR TRASLADO
      |--------------------------------------------------------------------------
      */

      let predioDestino = null;

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

      /*
      |--------------------------------------------------------------------------
      | FECHA
      |--------------------------------------------------------------------------
      */

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

      /*
      |--------------------------------------------------------------------------
      | CREAR EGRESO
      |--------------------------------------------------------------------------
      */

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

            /*
            |--------------------------------------------------------------------------
            | OFICIO QUE AUTORIZA LA SALIDA
            |--------------------------------------------------------------------------
            */

            numeroOficio:
              numeroOficioLimpio,

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
      | VEHÍCULO EGRESADO
      |--------------------------------------------------------------------------
      */

      vehiculo.estadoActual =
        "EGRESADO";

      await vehiculo.save({
        transaction,
      });

      /*
      |--------------------------------------------------------------------------
      | HISTORIAL
      |--------------------------------------------------------------------------
      */

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
              } por oficio N.º ${numeroOficioLimpio}`
            : tipoEgreso ===
                "ENTREGADO"
              ? `Vehículo interno N.º ${
                  vehiculo.numeroInterno ||
                  vehiculo.id
                } entregado a ${
                  destinoPersona?.trim() ||
                  "responsable"
                } por oficio N.º ${numeroOficioLimpio}`
              : `Vehículo interno N.º ${
                  vehiculo.numeroInterno ||
                  vehiculo.id
                }: ${tipoEgreso} por oficio N.º ${numeroOficioLimpio}`,

        estadoAnterior:
          reclamo.estado,

        estadoNuevo:
          reclamo.estado,

        transaction,
      });

      /*
      |--------------------------------------------------------------------------
      | VERIFICAR SI QUEDAN VEHÍCULOS PENDIENTES
      |--------------------------------------------------------------------------
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

      /*
      |--------------------------------------------------------------------------
      | CONFIRMAR
      |--------------------------------------------------------------------------
      */

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
const solicitaTodos =
  String(
    req.query.predioId || ""
  ).toUpperCase() === "TODOS";

const puedeVerTodos = [
  "director",
  "administrador",
  "superadmin",
].includes(req.usuario?.rol);

const verTodos =
  solicitaTodos &&
  puedeVerTodos;

const predioId =
  verTodos
    ? null
    : obtenerPredioPermitido(
        req,
        req.query.predioId
      );

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

   if (!verTodos && !predioId) {
  return res
    .status(400)
    .json({
      ok: false,
      mensaje:
        "Debe indicar el predio que desea consultar",
    });
}

      let predio = null;

if (!verTodos) {
  predio =
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
}

      /*
      |--------------------------------------------------------------------------
      | BÚSQUEDA GENERAL DEL HISTORIAL
      |--------------------------------------------------------------------------
      |
      | Busca por:
      |
      | - número interno
      | - patente
      | - marca
      | - modelo
      | - color
      | - número de reclamo
      | - Acta de Vía Pública
      | - Acta de Infracción
      | - sector
      | - posición
      | - nombre de quien retiró
      | - DNI de quien retiró
      |
      */

     const whereIngreso = {};

if (!verTodos) {
  whereIngreso.predioId =
    predio.id;
}

      if (buscar) {
        const patron =
          `%${buscar}%`;

        whereIngreso[Op.and] = [
          sequelize.literal(`
            (
              EXISTS (
                SELECT 1
                FROM vehiculos v
                WHERE
                  v.id = IngresoPredio.vehiculoId
                  AND (
                    v.numeroInterno LIKE ${sequelize.escape(patron)}
                    OR v.dominio LIKE ${sequelize.escape(patron)}
                    OR v.marca LIKE ${sequelize.escape(patron)}
                    OR v.modelo LIKE ${sequelize.escape(patron)}
                    OR v.color LIKE ${sequelize.escape(patron)}
                  )
              )

              OR EXISTS (
                SELECT 1
                FROM reclamos r
                WHERE
                  r.id = IngresoPredio.reclamoId
                  AND r.numeroReclamo LIKE ${sequelize.escape(patron)}
              )

              OR EXISTS (
                SELECT 1
                FROM actas a
                WHERE
                  a.reclamoId = IngresoPredio.reclamoId
                  AND a.numeroActa LIKE ${sequelize.escape(patron)}
              )

              OR EXISTS (
                SELECT 1
                FROM infracciones i
                WHERE
                  i.reclamoId = IngresoPredio.reclamoId
                  AND i.numeroActa LIKE ${sequelize.escape(patron)}
                  AND (
                    i.anulada = 0
                    OR i.anulada IS NULL
                  )
              )

              OR EXISTS (
                SELECT 1
                FROM egresos_predio ep
                WHERE
                  ep.ingresoPredioId = IngresoPredio.id
                  AND (
                    ep.destinoPersona LIKE ${sequelize.escape(patron)}
                    OR ep.dniPersona LIKE ${sequelize.escape(patron)}
                  )
              )

              OR IngresoPredio.sector LIKE ${sequelize.escape(patron)}
              OR IngresoPredio.posicion LIKE ${sequelize.escape(patron)}
            )
          `),
        ];
      }

      /*
      |--------------------------------------------------------------------------
      | OBTENER INGRESOS
      |--------------------------------------------------------------------------
      */

      const {
        count,
        rows: ingresos,
      } =
        await IngresoPredio.findAndCountAll({
          where: whereIngreso,

          include: [
            {
              model: Predio,
              as: "predio",
            },

            {
              model: Vehiculo,
              as: "vehiculo",
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

      /*
      |--------------------------------------------------------------------------
      | OBTENER EGRESOS
      |--------------------------------------------------------------------------
      */

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

      /*
      |--------------------------------------------------------------------------
      | ARMAR HISTORIAL + COINCIDENCIAS
      |--------------------------------------------------------------------------
      */

      const historial =
        await Promise.all(
          ingresos.map(
            async (ingreso) => {
              const ingresoPlano =
                ingreso.toJSON();

              const egresoModelo =
                mapaEgresos.get(
                  Number(
                    ingreso.id
                  )
                ) || null;

              const egreso =
                egresoModelo
                  ? egresoModelo.toJSON()
                  : null;

              const coincidencias =
                [];

              /*
              |--------------------------------------------------------------------------
              | SI HAY BÚSQUEDA, MOSTRAMOS POR QUÉ COINCIDIÓ
              |--------------------------------------------------------------------------
              */

              if (buscar) {
                const termino =
                  buscar.toLowerCase();

                const agregarCoincidencia =
                  (
                    tipo,
                    etiqueta,
                    valor
                  ) => {
                    if (
                      valor !== null &&
                      valor !== undefined &&
                      String(valor)
                        .toLowerCase()
                        .includes(
                          termino
                        )
                    ) {
                      coincidencias.push({
                        tipo,
                        etiqueta,
                        valor:
                          String(
                            valor
                          ),
                      });
                    }
                  };

                /*
                |--------------------------------------------------------------------------
                | VEHÍCULO
                |--------------------------------------------------------------------------
                */

                agregarCoincidencia(
                  "NUMERO_INTERNO",
                  "N.º interno",
                  ingresoPlano
                    .vehiculo
                    ?.numeroInterno
                );

                agregarCoincidencia(
                  "PATENTE",
                  "Patente",
                  ingresoPlano
                    .vehiculo
                    ?.dominio
                );

                agregarCoincidencia(
                  "MARCA",
                  "Marca",
                  ingresoPlano
                    .vehiculo
                    ?.marca
                );

                agregarCoincidencia(
                  "MODELO",
                  "Modelo",
                  ingresoPlano
                    .vehiculo
                    ?.modelo
                );

                agregarCoincidencia(
                  "COLOR",
                  "Color",
                  ingresoPlano
                    .vehiculo
                    ?.color
                );

                /*
                |--------------------------------------------------------------------------
                | RECLAMO
                |--------------------------------------------------------------------------
                */

                agregarCoincidencia(
                  "RECLAMO",
                  "N.º de reclamo",
                  ingresoPlano
                    .reclamo
                    ?.numeroReclamo
                );

                /*
                |--------------------------------------------------------------------------
                | UBICACIÓN EN PREDIO
                |--------------------------------------------------------------------------
                */

                agregarCoincidencia(
                  "SECTOR",
                  "Sector",
                  ingresoPlano.sector
                );

                agregarCoincidencia(
                  "POSICION",
                  "Posición / precinto",
                  ingresoPlano.posicion
                );

                /*
                |--------------------------------------------------------------------------
                | PERSONA QUE RETIRÓ
                |--------------------------------------------------------------------------
                */

                agregarCoincidencia(
                  "PERSONA_RETIRO",
                  "Retiró",
                  egreso
                    ?.destinoPersona
                );

                agregarCoincidencia(
                  "DNI_RETIRO",
                  "DNI de quien retiró",
                  egreso
                    ?.dniPersona
                );

                /*
                |--------------------------------------------------------------------------
                | ACTA DE VÍA PÚBLICA
                |--------------------------------------------------------------------------
                */

                const actas =
                  await Acta.findAll({
                    where: {
                      reclamoId:
                        ingresoPlano
                          .reclamoId,
                    },

                    attributes: [
                      "numeroActa",
                      "tipo",
                    ],
                  });

                for (
                  const acta of actas
                ) {
                  agregarCoincidencia(
                    "ACTA_VIA_PUBLICA",

                    acta.tipo ===
                      "VIA_PUBLICA"
                      ? "Acta de Vía Pública"
                      : "Acta",

                    acta.numeroActa
                  );
                }

                /*
                |--------------------------------------------------------------------------
                | ACTA DE INFRACCIÓN
                |--------------------------------------------------------------------------
                */

                const infracciones =
                  await Infraccion.findAll({
                    where: {
                      reclamoId:
                        ingresoPlano
                          .reclamoId,

                      [Op.or]: [
                        {
                          anulada:
                            false,
                        },

                        {
                          anulada:
                            null,
                        },
                      ],
                    },

                    attributes: [
                      "numeroActa",
                    ],
                  });

                for (
                  const infraccion of
                  infracciones
                ) {
                  agregarCoincidencia(
                    "ACTA_INFRACCION",
                    "Acta de Infracción",
                    infraccion
                      .numeroActa
                  );
                }
              }

              /*
              |--------------------------------------------------------------------------
              | RESULTADO DEL HISTORIAL
              |--------------------------------------------------------------------------
              */

              return {
                ingreso:
                  ingresoPlano,

                egreso,

                vehiculo:
                  ingresoPlano
                    .vehiculo,

                reclamo:
                  ingresoPlano
                    .reclamo,

                predio:
                  ingresoPlano
                    .predio,

                estaActualmente:
                  !egreso &&
                  ingresoPlano
                    .vehiculo
                    ?.estadoActual ===
                    "EN_PREDIO",

                coincidenciasBusqueda:
                  coincidencias,
              };
            }
          )
        );

      /*
      |--------------------------------------------------------------------------
      | PAGINACIÓN
      |--------------------------------------------------------------------------
      */

      const total =
        Number(count) || 0;

      const totalPaginas =
        Math.max(
          Math.ceil(
            total / limite
          ),
          1
        );

      /*
      |--------------------------------------------------------------------------
      | RESPUESTA
      |--------------------------------------------------------------------------
      */

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
const solicitaTodos =
  String(
    req.query.predioId || ""
  ).toUpperCase() === "TODOS";

const puedeVerTodos = [
  "director",
  "administrador",
  "superadmin",
].includes(req.usuario?.rol);

const verTodos =
  solicitaTodos &&
  puedeVerTodos;

const predioId =
  verTodos
    ? null
    : obtenerPredioPermitido(
        req,
        req.query.predioId
      );

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

  if (!verTodos && !predioId) {
  return res.status(400).json({
    ok: false,
    mensaje:
      "Debe indicar el predio que desea consultar",
  });
}

      let predio = null;

if (!verTodos) {
  predio =
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
}

      /*
      |--------------------------------------------------------------------------
      | BÚSQUEDA GENERAL
      |--------------------------------------------------------------------------
      |
      | Busca por:
      |
      | - número interno
      | - patente
      | - marca
      | - modelo
      | - color
      | - número de reclamo
      | - número de Acta de Vía Pública
      | - número de Acta de Infracción
      | - sector
      | - posición
      |
      */

    const whereIngreso = {};

if (!verTodos) {
  whereIngreso.predioId =
    predio.id;
}

      if (buscar) {
        const patron =
          `%${buscar}%`;

        whereIngreso[Op.and] = [
          sequelize.literal(`
            (
              EXISTS (
                SELECT 1
                FROM vehiculos v
                WHERE
                  v.id = IngresoPredio.vehiculoId
                  AND (
                    v.numeroInterno LIKE ${sequelize.escape(patron)}
                    OR v.dominio LIKE ${sequelize.escape(patron)}
                    OR v.marca LIKE ${sequelize.escape(patron)}
                    OR v.modelo LIKE ${sequelize.escape(patron)}
                    OR v.color LIKE ${sequelize.escape(patron)}
                  )
              )

              OR EXISTS (
                SELECT 1
                FROM reclamos r
                WHERE
                  r.id = IngresoPredio.reclamoId
                  AND r.numeroReclamo LIKE ${sequelize.escape(patron)}
              )

              OR EXISTS (
                SELECT 1
                FROM actas a
                WHERE
                  a.reclamoId = IngresoPredio.reclamoId
                  AND a.numeroActa LIKE ${sequelize.escape(patron)}
              )

              OR EXISTS (
                SELECT 1
                FROM infracciones i
                WHERE
                  i.reclamoId = IngresoPredio.reclamoId
                  AND i.numeroActa LIKE ${sequelize.escape(patron)}
                  AND (
                    i.anulada = 0
                    OR i.anulada IS NULL
                  )
              )

              OR IngresoPredio.sector LIKE ${sequelize.escape(patron)}
              OR IngresoPredio.posicion LIKE ${sequelize.escape(patron)}
            )
          `),
        ];
      }

      /*
      |--------------------------------------------------------------------------
      | OBTENER VEHÍCULOS
      |--------------------------------------------------------------------------
      */

      const {
        count,
        rows,
      } =
        await IngresoPredio.findAndCountAll({
          where: whereIngreso,

          include: [
            {
              model: Predio,
              as: "predio",
            },

            {
              model: Vehiculo,
              as: "vehiculo",

              where: {
                estadoActual:
                  "EN_PREDIO",
              },

              required: true,
            },

            {
              model: Reclamo,
              as: "reclamo",
            },
          ],

          order: [
            [
              "fechaHora",
              "ASC",
            ],
          ],

          limit: limite,

          offset,

          distinct: true,
        });

      /*
      |--------------------------------------------------------------------------
      | INDICAR QUÉ COINCIDIÓ EN LA BÚSQUEDA
      |--------------------------------------------------------------------------
      */

      const ingresosConCoincidencias =
        await Promise.all(
          rows.map(
            async (ingreso) => {
              const item =
                ingreso.toJSON();

              if (!buscar) {
                return {
                  ...item,

                  coincidenciasBusqueda:
                    [],
                };
              }

              const termino =
                buscar.toLowerCase();

              const coincidencias =
                [];

              /*
              |--------------------------------------------------------------------------
              | FUNCIÓN AUXILIAR
              |--------------------------------------------------------------------------
              */

              const agregarCoincidencia =
                (
                  tipo,
                  etiqueta,
                  valor
                ) => {
                  if (
                    valor !== null &&
                    valor !== undefined &&
                    String(valor)
                      .toLowerCase()
                      .includes(
                        termino
                      )
                  ) {
                    coincidencias.push({
                      tipo,

                      etiqueta,

                      valor:
                        String(
                          valor
                        ),
                    });
                  }
                };

              /*
              |--------------------------------------------------------------------------
              | VEHÍCULO
              |--------------------------------------------------------------------------
              */

              agregarCoincidencia(
                "NUMERO_INTERNO",
                "N.º interno",
                item.vehiculo
                  ?.numeroInterno
              );

              agregarCoincidencia(
                "PATENTE",
                "Patente",
                item.vehiculo
                  ?.dominio
              );

              agregarCoincidencia(
                "MARCA",
                "Marca",
                item.vehiculo
                  ?.marca
              );

              agregarCoincidencia(
                "MODELO",
                "Modelo",
                item.vehiculo
                  ?.modelo
              );

              agregarCoincidencia(
                "COLOR",
                "Color",
                item.vehiculo
                  ?.color
              );

              /*
              |--------------------------------------------------------------------------
              | RECLAMO
              |--------------------------------------------------------------------------
              */

              agregarCoincidencia(
                "RECLAMO",
                "N.º de reclamo",
                item.reclamo
                  ?.numeroReclamo
              );

              /*
              |--------------------------------------------------------------------------
              | UBICACIÓN DENTRO DEL PREDIO
              |--------------------------------------------------------------------------
              */

              agregarCoincidencia(
                "SECTOR",
                "Sector",
                item.sector
              );

              agregarCoincidencia(
                "POSICION",
                "Posición / precinto",
                item.posicion
              );

              /*
              |--------------------------------------------------------------------------
              | ACTA DE VÍA PÚBLICA
              |--------------------------------------------------------------------------
              */

              const actas =
                await Acta.findAll({
                  where: {
                    reclamoId:
                      item.reclamoId,
                  },

                  attributes: [
                    "numeroActa",
                    "tipo",
                  ],
                });

              for (
                const acta of actas
              ) {
                agregarCoincidencia(
                  "ACTA_VIA_PUBLICA",

                  acta.tipo ===
                    "VIA_PUBLICA"
                    ? "Acta de Vía Pública"
                    : "Acta",

                  acta.numeroActa
                );
              }

              /*
              |--------------------------------------------------------------------------
              | ACTA DE INFRACCIÓN
              |--------------------------------------------------------------------------
              */

              const infracciones =
                await Infraccion.findAll({
                  where: {
                    reclamoId:
                      item.reclamoId,

                    [Op.or]: [
                      {
                        anulada:
                          false,
                      },

                      {
                        anulada:
                          null,
                      },
                    ],
                  },

                  attributes: [
                    "numeroActa",
                  ],
                });

              for (
                const infraccion of
                infracciones
              ) {
                agregarCoincidencia(
                  "ACTA_INFRACCION",
                  "Acta de Infracción",
                  infraccion.numeroActa
                );
              }

              /*
              |--------------------------------------------------------------------------
              | RESULTADO
              |--------------------------------------------------------------------------
              */

              return {
                ...item,

                coincidenciasBusqueda:
                  coincidencias,
              };
            }
          )
        );

      /*
      |--------------------------------------------------------------------------
      | PAGINACIÓN
      |--------------------------------------------------------------------------
      */

      const total =
        Number(count) || 0;

      const totalPaginas =
        Math.max(
          Math.ceil(
            total / limite
          ),
          1
        );

      /*
      |--------------------------------------------------------------------------
      | RESPUESTA
      |--------------------------------------------------------------------------
      */

      return res.json({
        ok: true,

        predio,

        ingresos:
          ingresosConCoincidencias,

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


  const actualizarPredio = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const {
      nombre,
      direccion,
      descripcion,
      activo,
    } = req.body;


    /*
    |--------------------------------------------------------------------------
    | VALIDAR ID
    |--------------------------------------------------------------------------
    */

    const predioId =
      Number(id);

    if (
      !Number.isInteger(
        predioId
      ) ||
      predioId <= 0
    ) {
      return res
        .status(400)
        .json({
          ok: false,
          mensaje:
            "El predio indicado no es válido.",
        });
    }


    /*
    |--------------------------------------------------------------------------
    | BUSCAR PREDIO
    |--------------------------------------------------------------------------
    */

    const predio =
      await Predio.findByPk(
        predioId
      );

    if (!predio) {
      return res
        .status(404)
        .json({
          ok: false,
          mensaje:
            "El predio no existe.",
        });
    }


    /*
    |--------------------------------------------------------------------------
    | VALIDAR NOMBRE
    |--------------------------------------------------------------------------
    */

    const nombreLimpio =
      nombre?.trim();

    if (!nombreLimpio) {
      return res
        .status(400)
        .json({
          ok: false,
          mensaje:
            "Debe indicar el nombre del predio.",
        });
    }


    /*
    |--------------------------------------------------------------------------
    | EVITAR NOMBRES DUPLICADOS
    |--------------------------------------------------------------------------
    */

    const predioExistente =
      await Predio.findOne({
        where: {
          nombre:
            nombreLimpio,
        },
      });

    if (
      predioExistente &&
      Number(
        predioExistente.id
      ) !== predioId
    ) {
      return res
        .status(400)
        .json({
          ok: false,
          mensaje:
            "Ya existe otro predio con ese nombre.",
        });
    }


    /*
    |--------------------------------------------------------------------------
    | ACTUALIZAR
    |--------------------------------------------------------------------------
    */

    predio.nombre =
      nombreLimpio;

    predio.direccion =
      direccion?.trim() ||
      null;

    predio.descripcion =
      descripcion?.trim() ||
      null;


    /*
    |--------------------------------------------------------------------------
    | ESTADO
    |--------------------------------------------------------------------------
    |
    | Solo se modifica si el frontend lo envía.
    |
    */

    if (
      typeof activo ===
      "boolean"
    ) {
      predio.activo =
        activo;
    }


    await predio.save();


    /*
    |--------------------------------------------------------------------------
    | RESPUESTA
    |--------------------------------------------------------------------------
    */

    return res.json({
      ok: true,

      mensaje:
        "Predio actualizado correctamente.",

      predio,
    });
  } catch (error) {
    console.error(
      "Error actualizando predio:",
      error
    );

    return res
      .status(500)
      .json({
        ok: false,

        mensaje:
          "No se pudo actualizar el predio.",

        error:
          error.message,
      });
  }
};

const listarPrediosDestino =
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
        "Error listando predios de destino:",
        error
      );

      return res.status(500).json({
        ok: false,
        mensaje:
          "Error al obtener los predios de destino",
      });
    }
  };
  


  /*
|--------------------------------------------------------------------------
| LISTAR TRASLADOS PENDIENTES DE RECEPCIÓN
|--------------------------------------------------------------------------
*/

const listarTrasladosPendientes =
  async (req, res) => {
    try {
      /*
      |--------------------------------------------------------------------------
      | DETERMINAR PREDIO
      |--------------------------------------------------------------------------
      */

      const predioId =
        obtenerPredioPermitido(
          req,
          req.query.predioId
        );

      if (!predioId) {
        return res.status(400).json({
          ok: false,
          mensaje:
            "Debe indicar el predio que desea consultar",
        });
      }


      /*
      |--------------------------------------------------------------------------
      | VALIDAR PREDIO
      |--------------------------------------------------------------------------
      */

      const predio =
        await Predio.findOne({
          where: {
            id: Number(predioId),
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
      | BUSCAR TRASLADOS HACIA ESTE PREDIO
      |--------------------------------------------------------------------------
      */

      const traslados =
        await EgresoPredio.findAll({
          where: {
            tipoEgreso:
              "TRASLADADO",

            predioDestinoId:
              predio.id,
          },

          order: [
            ["fechaHora", "ASC"],
          ],
        });


      /*
      |--------------------------------------------------------------------------
      | VER CUÁLES TODAVÍA NO FUERON RECIBIDOS
      |--------------------------------------------------------------------------
      */

      const pendientes = [];

      for (
        const traslado of traslados
      ) {
        /*
         * Buscamos un ingreso del mismo
         * vehículo al predio destino
         * posterior al traslado.
         */

        const ingresoDestino =
          await IngresoPredio.findOne({
            where: {
              vehiculoId:
                traslado.vehiculoId,

              predioId:
                predio.id,

              fechaHora: {
                [Op.gte]:
                  traslado.fechaHora,
              },
            },

            order: [
              ["fechaHora", "ASC"],
            ],
          });


        if (ingresoDestino) {
          continue;
        }


        /*
        |--------------------------------------------------------------------------
        | DATOS DEL VEHÍCULO
        |--------------------------------------------------------------------------
        */

        const vehiculo =
          await Vehiculo.findByPk(
            traslado.vehiculoId
          );


        /*
        |--------------------------------------------------------------------------
        | DATOS DEL RECLAMO
        |--------------------------------------------------------------------------
        */

        const reclamo =
          traslado.reclamoId
            ? await Reclamo.findByPk(
                traslado.reclamoId
              )
            : null;


        /*
        |--------------------------------------------------------------------------
        | PREDIO DE ORIGEN
        |--------------------------------------------------------------------------
        */

        const ingresoOrigen =
          await IngresoPredio.findByPk(
            traslado.ingresoPredioId
          );

        let predioOrigen = null;

        if (ingresoOrigen) {
          predioOrigen =
            await Predio.findByPk(
              ingresoOrigen.predioId
            );
        }


        pendientes.push({
          traslado,

          vehiculo,

          reclamo,

          predioOrigen,

          predioDestino:
            predio,

          origen:
            "TRASLADO_PREDIO",
        });
      }


      return res.json({
        ok: true,

        predio,

        pendientes,

        total:
          pendientes.length,
      });
    } catch (error) {
      console.error(
        "Error listando traslados pendientes:",
        error
      );

      return res.status(500).json({
        ok: false,
        mensaje:
          "Error al obtener los traslados pendientes",
      });
    }
  };
  /*
|--------------------------------------------------------------------------
| RECIBIR TRASLADO ENTRE PREDIOS
|--------------------------------------------------------------------------
*/

const recibirTraslado =
  async (req, res) => {
    const transaction =
      await sequelize.transaction();

    try {
      const {
        egresoId,
      } = req.params;

      const {
        sector,
        posicion,
        observaciones,
        fechaHora,
      } = req.body;


      /*
      |--------------------------------------------------------------------------
      | BUSCAR TRASLADO
      |--------------------------------------------------------------------------
      */

      const traslado =
        await EgresoPredio.findByPk(
          egresoId,
          {
            transaction,
          }
        );

      if (!traslado) {
        await transaction.rollback();

        return res.status(404).json({
          ok: false,
          mensaje:
            "Traslado no encontrado",
        });
      }


      if (
        traslado.tipoEgreso !==
        "TRASLADADO"
      ) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "El egreso indicado no corresponde a un traslado",
        });
      }


      if (
        !traslado.predioDestinoId
      ) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "El traslado no tiene un predio de destino",
        });
      }


      /*
      |--------------------------------------------------------------------------
      | SEGURIDAD DEL PREDIO
      |--------------------------------------------------------------------------
      */

      const predioPermitido =
        obtenerPredioPermitido(
          req,
          traslado.predioDestinoId
        );

      if (!predioPermitido) {
        await transaction.rollback();

        return res.status(403).json({
          ok: false,
          mensaje:
            "No tiene un predio asignado",
        });
      }


      if (
        req.usuario?.rol ===
          "secretaria_predio" &&
        Number(predioPermitido) !==
          Number(
            traslado.predioDestinoId
          )
      ) {
        await transaction.rollback();

        return res.status(403).json({
          ok: false,
          mensaje:
            "Este traslado pertenece a otro predio",
        });
      }


      /*
      |--------------------------------------------------------------------------
      | EVITAR RECIBIR DOS VECES
      |--------------------------------------------------------------------------
      */

      const ingresoExistente =
        await IngresoPredio.findOne({
          where: {
            vehiculoId:
              traslado.vehiculoId,

            predioId:
              traslado.predioDestinoId,

            fechaHora: {
              [Op.gte]:
                traslado.fechaHora,
            },
          },

          transaction,
        });

      if (ingresoExistente) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "Este traslado ya fue recibido en el predio de destino",
        });
      }


      /*
      |--------------------------------------------------------------------------
      | VEHÍCULO
      |--------------------------------------------------------------------------
      */

      const vehiculo =
        await Vehiculo.findByPk(
          traslado.vehiculoId,
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


      /*
      |--------------------------------------------------------------------------
      | RECLAMO
      |--------------------------------------------------------------------------
      */

      const reclamo =
        traslado.reclamoId
          ? await Reclamo.findByPk(
              traslado.reclamoId,
              {
                transaction,
              }
            )
          : null;


      /*
      |--------------------------------------------------------------------------
      | FECHA DE RECEPCIÓN
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
      | CREAR NUEVO INGRESO
      |--------------------------------------------------------------------------
      */

      const ingreso =
        await IngresoPredio.create(
          {
            reclamoId:
              traslado.reclamoId ||
              null,

            vehiculoId:
              traslado.vehiculoId,

            /*
             * No es una nueva remoción.
             * Es un traslado entre predios.
             */
            remocionId:
              null,

            predioId:
              traslado.predioDestinoId,

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
              observaciones?.trim() ||
              null,
          },
          {
            transaction,
          }
        );


      /*
      |--------------------------------------------------------------------------
      | VEHÍCULO AHORA ESTÁ EN EL NUEVO PREDIO
      |--------------------------------------------------------------------------
      */

      vehiculo.estadoActual =
        "EN_PREDIO";

      await vehiculo.save({
        transaction,
      });


      /*
      |--------------------------------------------------------------------------
      | RECLAMO
      |--------------------------------------------------------------------------
      */

   if (reclamo) {
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
        | HISTORIAL
        |--------------------------------------------------------------------------
        */

        const predioDestino =
          await Predio.findByPk(
            traslado.predioDestinoId,
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
            "INGRESO_PREDIO",

          descripcion:
            `Vehículo interno N.º ${
              vehiculo.numeroInterno ||
              vehiculo.id
            } recibido por traslado en ${
              predioDestino?.nombre ||
              "predio destino"
            }. Oficio N.º ${
              traslado.numeroOficio ||
              "sin número"
            }.`,

          estadoAnterior:
  estadoAnterior,

estadoNuevo:
  "EN_PREDIO",

          transaction,
        });
      }


      await transaction.commit();


      return res.status(201).json({
        ok: true,

        mensaje:
          "Traslado recibido correctamente",

        ingreso,
      });
    } catch (error) {
      await transaction.rollback();

      console.error(
        "Error recibiendo traslado:",
        error
      );

      return res.status(500).json({
        ok: false,
        mensaje:
          "Error al recibir el traslado",
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
  listarHistorialPredio,
  actualizarPredio ,
  listarPrediosDestino,
  listarTrasladosPendientes,
recibirTraslado,
};