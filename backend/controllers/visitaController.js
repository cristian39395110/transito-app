const {
  Op,
} = require("sequelize");

const {
  sequelize,
  Reclamo,
  Constatacion,
  Acta,
  Emplazamiento,
  Asignacion,
  Vehiculo,
  TipoReclamo,
   Foto,
} = require("../models");

const {
  registrarHistorial,
} = require(
  "../services/historialService"
);

const {
  convertirPlazoAHoras,
  calcularFechaVencimiento,
} = require(
  "../services/emplazamientoService"
);


/*
|--------------------------------------------------------------------------
| REGISTRAR PRIMERA VISITA
|--------------------------------------------------------------------------
|
| En reclamos de tipo VEHÍCULO:
|
| - se registran los datos del vehículo
| - se crea la fila en vehiculos
| - queda vinculada al reclamo
| - queda vinculada a la constatación
| - queda vinculada al Acta de Vía Pública
|
| Esto permite que después:
|
| Acta VP
| → controles
| → Acta de Infracción
| → inventario
| → remoción
| → predio
|
| trabajen siempre sobre el mismo vehículo.
|
*/

const registrarVisita =
  async (req, res) => {
    const transaction =
      await sequelize.transaction();

    try {
      const {
        reclamoId,

        resultado,
        situacion,
        observaciones,

        latitudActual,
        longitudActual,
        precisionGps,

        /*
        |--------------------------------------------------------------------------
        | NUEVO FORMATO
        |--------------------------------------------------------------------------
        |
        | Varios vehículos preparados previamente.
        |
        */
        vehiculos = [],

        /*
        |--------------------------------------------------------------------------
        | FORMATO ANTERIOR
        |--------------------------------------------------------------------------
        |
        | Se conserva para reclamos que NO sean
        | de vehículos.
        |
        */
        hizoActa = false,
        numeroActa = null,
        personaEncontrada = false,
        atendidoPor = null,
        caracterAtendido = null,
        plazoCantidad = null,
        plazoUnidad = "HORAS",

        vehiculo:
          vehiculoPayload = null,
      } = req.body;

      /*
      |--------------------------------------------------------------------------
      | VALIDACIONES BÁSICAS
      |--------------------------------------------------------------------------
      */

      if (!reclamoId) {
        await transaction.rollback();

        return res
          .status(400)
          .json({
            mensaje:
              "Falta indicar el reclamo.",
          });
      }

      const resultadosPermitidos = [
        "CONSTATADO",
        "NO_CONSTATADO",
        "RESUELTO_EN_LUGAR",
        "NO_SE_PUDO_VERIFICAR",
        "OTRO",
      ];

      if (
        !resultado ||
        !resultadosPermitidos.includes(
          resultado
        )
      ) {
        await transaction.rollback();

        return res
          .status(400)
          .json({
            mensaje:
              "El resultado de la visita no es válido.",
          });
      }

      if (
        !situacion ||
        !String(
          situacion
        ).trim()
      ) {
        await transaction.rollback();

        return res
          .status(400)
          .json({
            mensaje:
              "Tenés que indicar qué encontraste.",
          });
      }

      if (
        latitudActual ===
          undefined ||
        latitudActual ===
          null ||
        longitudActual ===
          undefined ||
        longitudActual ===
          null
      ) {
        await transaction.rollback();

        return res
          .status(400)
          .json({
            mensaje:
              "Tenés que registrar la ubicación.",
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

            lock:
              transaction
                .LOCK.UPDATE,
          }
        );

      if (!reclamo) {
        await transaction.rollback();

        return res
          .status(404)
          .json({
            mensaje:
              "El reclamo no existe.",
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

        return res
          .status(400)
          .json({
            mensaje:
              "Este reclamo ya está finalizado.",
          });
      }

      /*
      |--------------------------------------------------------------------------
      | TIPO DE RECLAMO
      |--------------------------------------------------------------------------
      */

      const tipoReclamo =
        reclamo.tipoReclamoId
          ? await TipoReclamo.findByPk(
              reclamo.tipoReclamoId,
              {
                transaction,
              }
            )
          : null;

      const nombreTipoNormalizado =
        String(
          tipoReclamo?.nombre ||
            ""
        )
          .toLowerCase()
          .normalize("NFD")
          .replace(
            /[\u0300-\u036f]/g,
            ""
          );

      const esReclamoVehiculo =
        nombreTipoNormalizado.includes(
          "vehiculo"
        ) ||
        nombreTipoNormalizado.includes(
          "auto"
        ) ||
        nombreTipoNormalizado.includes(
          "automotor"
        );

      /*
      |--------------------------------------------------------------------------
      | TAREA ACTIVA
      |--------------------------------------------------------------------------
      */

      let tareaActiva =
        null;

      if (
        req.usuario.rol ===
        "inspector"
      ) {
        tareaActiva =
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
              [
                "fechaAsignacion",
                "DESC",
              ],
            ],

            transaction,

            lock:
              transaction
                .LOCK.UPDATE,
          });

        if (!tareaActiva) {
          await transaction.rollback();

          return res
            .status(403)
            .json({
              mensaje:
                "No tenés una tarea activa para este reclamo.",
            });
        }

        if (
          tareaActiva.etapa ===
          "SEGUNDA_VISITA"
        ) {
          await transaction.rollback();

          return res
            .status(409)
            .json({
              mensaje:
                "Este trabajo corresponde a una segunda visita.",
            });
        }
      }

      /*
      |--------------------------------------------------------------------------
      | INSPECTOR ACTUAL
      |--------------------------------------------------------------------------
      */

      if (
        req.usuario.rol ===
          "inspector" &&
        reclamo.inspectorId &&
        Number(
          reclamo.inspectorId
        ) !==
          Number(
            req.usuario.id
          )
      ) {
        await transaction.rollback();

        return res
          .status(403)
          .json({
            mensaje:
              "Este reclamo está asignado actualmente a otro inspector.",
          });
      }

      /*
      |--------------------------------------------------------------------------
      | NORMALIZAR VEHÍCULOS
      |--------------------------------------------------------------------------
      */

      let vehiculosPayload =
        [];

      if (
        resultado ===
          "CONSTATADO" &&
        esReclamoVehiculo
      ) {
        if (
          Array.isArray(
            vehiculos
          ) &&
          vehiculos.length > 0
        ) {
          vehiculosPayload =
            vehiculos;
        } else if (
          vehiculoPayload &&
          typeof vehiculoPayload ===
            "object"
        ) {
          /*
          Compatibilidad con frontend anterior.
          */

          vehiculosPayload = [
            {
              ...vehiculoPayload,

              hizoActa,

              numeroActa,

              personaEncontrada,

              atendidoPor,

              caracterAtendido,

              plazoCantidad,

              plazoUnidad,
            },
          ];
        } else {
          await transaction.rollback();

          return res
            .status(400)
            .json({
              mensaje:
                "Tenés que registrar al menos un vehículo.",
            });
        }
      }

      /*
      |--------------------------------------------------------------------------
      | VALIDAR VEHÍCULOS
      |--------------------------------------------------------------------------
      */

      const numerosActaRecibidos =
        new Set();

      const idsVehiculosRecibidos =
        new Set();

        const fotosEmplazamientoPorVehiculo = new Map();
      if (
        resultado ===
          "CONSTATADO" &&
        esReclamoVehiculo
      ) {
        for (
          let indice = 0;
          indice <
          vehiculosPayload.length;
          indice += 1
        ) {
          const item =
            vehiculosPayload[
              indice
            ];

          const numero =
            indice + 1;

          /*
          ---------------------------------------------------------------
          OBJETO VÁLIDO
          ---------------------------------------------------------------
          */

          if (
            !item ||
            typeof item !==
              "object"
          ) {
            await transaction.rollback();

            return res
              .status(400)
              .json({
                mensaje:
                  `Los datos del vehículo ${numero} no son válidos.`,
              });
          }

          /*
          ---------------------------------------------------------------
          ID REAL DEL VEHÍCULO
          ---------------------------------------------------------------
          */

          const vehiculoId =
            Number(
              item.id
            );

          if (
            !Number.isInteger(
              vehiculoId
            ) ||
            vehiculoId <= 0
          ) {
            await transaction.rollback();

            return res
              .status(400)
              .json({
                mensaje:
                  `El vehículo ${numero} no fue preparado correctamente.`,
              });
          }

          if (
            idsVehiculosRecibidos.has(
              vehiculoId
            )
          ) {
            await transaction.rollback();

            return res
              .status(409)
              .json({
                mensaje:
                  `El vehículo ${numero} está repetido en la visita.`,
              });
          }

          idsVehiculosRecibidos.add(
            vehiculoId
          );

          /*
          ---------------------------------------------------------------
          VEHÍCULO PREPARADO
          ---------------------------------------------------------------
          */

          const vehiculoPreparado =
            await Vehiculo.findOne({
              where: {
                id:
                  vehiculoId,

                reclamoId:
                  reclamo.id,

                origenRegistro:
                  "CIRCUITO_NORMAL",
              },

              transaction,
            });

          if (
            !vehiculoPreparado
          ) {
            await transaction.rollback();

            return res
              .status(404)
              .json({
                mensaje:
                  `No se encontró el vehículo ${numero} preparado para este reclamo.`,
              });
          }

          /*
          ---------------------------------------------------------------
          DATOS MÍNIMOS
          ---------------------------------------------------------------
          */

          const tieneDatos =
            String(
              item.dominio ||
                ""
            ).trim() ||
            String(
              item.marca ||
                ""
            ).trim() ||
            String(
              item.modelo ||
                ""
            ).trim() ||
            String(
              item.color ||
                ""
            ).trim() ||
            String(
              item.descripcion ||
                ""
            ).trim();

          if (!tieneDatos) {
            await transaction.rollback();

            return res
              .status(400)
              .json({
                mensaje:
                  `Cargá al menos un dato para identificar el vehículo ${numero}.`,
              });
          }

          /*
          ---------------------------------------------------------------
          FOTO DEL VEHÍCULO
          ---------------------------------------------------------------
          |
          | Obligatoria para TODOS los vehículos.
          |
          */

          const fotoVehiculo =
            await Foto.findOne({
              where: {
                reclamoId:
                  reclamo.id,

                tipoReferencia:
                  "VEHICULO",

                referenciaId:
                  vehiculoId,

                activo:
                  true,
              },

              transaction,
            });

          if (!fotoVehiculo) {
            await transaction.rollback();

            return res
              .status(400)
              .json({
                mensaje:
                  `Falta la foto del vehículo ${numero}.`,
              });
          }

          /*
          ---------------------------------------------------------------
          ¿SE HIZO ACTA?
          ---------------------------------------------------------------
          |
          | Puede ser:
          |
          | true  -> sí se emplazó.
          | false -> no se emplazó.
          |
          | NO obligamos a que todos tengan acta.
          |
          */

          const itemHizoActa =
            item.hizoActa ===
            true;

          /*
          ---------------------------------------------------------------
          SI HUBO ACTA
          ---------------------------------------------------------------
          */

          if (itemHizoActa) {
            /*
            NÚMERO DE ACTA
            */

            const numeroActaItem =
              String(
                item.numeroActa ||
                  ""
              ).trim();

            if (!numeroActaItem) {
              await transaction.rollback();

              return res
                .status(400)
                .json({
                  mensaje:
                    `Ingresá el número del Acta de Vía Pública del vehículo ${numero}.`,
                });
            }

            /*
            No repetir dentro de esta visita.
            */

            if (
              numerosActaRecibidos.has(
                numeroActaItem
              )
            ) {
              await transaction.rollback();

              return res
                .status(409)
                .json({
                  mensaje:
                    `El Acta ${numeroActaItem} está repetida en esta visita.`,
                });
            }

            numerosActaRecibidos.add(
              numeroActaItem
            );

            /*
            No repetir contra la BD.
            */

            const actaExistente =
              await Acta.findOne({
                where: {
                  numeroActa:
                    numeroActaItem,
                },

                transaction,
              });

            if (actaExistente) {
              await transaction.rollback();

              return res
                .status(409)
                .json({
                  mensaje:
                    `El Acta ${numeroActaItem} ya está registrada.`,
                });
            }

            /*
            PLAZO
            */

            const cantidad =
              Number(
                item.plazoCantidad
              );

            if (
              !Number.isFinite(
                cantidad
              ) ||
              cantidad <= 0
            ) {
              await transaction.rollback();

              return res
                .status(400)
                .json({
                  mensaje:
                    `El plazo del vehículo ${numero} no es válido.`,
                });
            }

            const unidad =
              item.plazoUnidad ||
              "HORAS";

            if (
              ![
                "HORAS",
                "DIAS",
              ].includes(
                unidad
              )
            ) {
              await transaction.rollback();

              return res
                .status(400)
                .json({
                  mensaje:
                    `La unidad del plazo del vehículo ${numero} no es válida.`,
                });
            }

            /*
            FOTO DEL ACTA / EMPLAZAMIENTO

            Antes de crear el Emplazamiento real,
            esta foto está vinculada al vehiculo.id.
            */

            const fotoEmplazamiento =
              await Foto.findOne({
                where: {
                  reclamoId:
                    reclamo.id,

                  tipoReferencia:
                    "EMPLAZAMIENTO",

                  referenciaId:
                    vehiculoId,

                  activo:
                    true,
                },

                transaction,
              });

            if (
              !fotoEmplazamiento
            ) {
              await transaction.rollback();

              return res
                .status(400)
                .json({
                  mensaje:
                    `Falta la foto del Acta de emplazamiento del vehículo ${numero}.`,
                });
            }

            fotosEmplazamientoPorVehiculo.set(
  Number(vehiculoId),
  fotoEmplazamiento.id
);
          }
        }
      }

      /*
      |--------------------------------------------------------------------------
      | RESULTADOS DE LA VISITA
      |--------------------------------------------------------------------------
      */

      const resultadosVehiculos =
        [];

      let huboActa =
        false;

      /*
      |--------------------------------------------------------------------------
      | RECLAMO DE VEHÍCULOS
      |--------------------------------------------------------------------------
      */

      if (
        resultado ===
          "CONSTATADO" &&
        esReclamoVehiculo
      ) {
        for (
          let indice = 0;
          indice <
          vehiculosPayload.length;
          indice += 1
        ) {
          const item =
            vehiculosPayload[
              indice
            ];

          /*
          ---------------------------------------------------------------
          VEHÍCULO YA PREPARADO
          ---------------------------------------------------------------
          */

          const vehiculo =
            await Vehiculo.findOne({
              where: {
                id:
                  Number(
                    item.id
                  ),

                reclamoId:
                  reclamo.id,

                origenRegistro:
                  "CIRCUITO_NORMAL",
              },

              transaction,

              lock:
                transaction
                  .LOCK.UPDATE,
            });

          if (!vehiculo) {
            throw new Error(
              `No se encontró el vehículo preparado con ID ${item.id}.`
            );
          }

          /*
          ---------------------------------------------------------------
          COMPLETAR DATOS DEL VEHÍCULO
          ---------------------------------------------------------------
          */

          vehiculo.dominio =
            String(
              item.dominio ||
                ""
            )
              .trim()
              .toUpperCase() ||
            null;

          vehiculo.marca =
            String(
              item.marca ||
                ""
            ).trim() ||
            null;

          vehiculo.modelo =
            String(
              item.modelo ||
                ""
            ).trim() ||
            null;

          vehiculo.color =
            String(
              item.color ||
                ""
            ).trim() ||
            null;

          vehiculo.tipoVehiculo =
            String(
              item.tipoVehiculo ||
                "AUTOMOVIL"
            ).trim() ||
            "AUTOMOVIL";

          vehiculo.descripcion =
            String(
              item.descripcion ||
                ""
            ).trim() ||
            null;

          /*
          Si NO se hizo emplazamiento,
          sigue en vía pública.
          */

          vehiculo.estadoActual =
            "EN_VIA_PUBLICA";

          await vehiculo.save({
            transaction,
          });

          /*
          ---------------------------------------------------------------
          CONSTATACIÓN DEL VEHÍCULO
          ---------------------------------------------------------------
          */

          const constatacion =
            await Constatacion.create(
              {
                reclamoId:
                  reclamo.id,

                inspectorId:
                  req.usuario.id,

                vehiculoId:
                  vehiculo.id,

                resultado,

                situacion:
                  String(
                    situacion
                  ).trim(),

                observaciones:
                  observaciones
                    ? String(
                        observaciones
                      ).trim() ||
                      null
                    : null,

                latitudActual:
                  Number(
                    latitudActual
                  ),

                longitudActual:
                  Number(
                    longitudActual
                  ),

                precisionGps:
                  precisionGps
                    ? Number(
                        precisionGps
                      )
                    : null,
              },
              {
                transaction,
              }
            );

          let acta =
            null;

          let emplazamiento =
            null;

          const itemHizoActa =
            item.hizoActa ===
            true;

          /*
          ---------------------------------------------------------------
          ACTA + EMPLAZAMIENTO
          ---------------------------------------------------------------
          |
          | Solamente para ESTE vehículo
          | si el inspector indicó que lo emplazó.
          |
          */

          if (itemHizoActa) {
            huboActa = true;

            const fechaHora =
              new Date();

            const unidad =
              item.plazoUnidad ||
              "HORAS";

            const cantidad =
              Number(
                item.plazoCantidad
              );

            const plazoHoras =
              convertirPlazoAHoras(
                cantidad,
                unidad
              );

            const fechaVencimiento =
              calcularFechaVencimiento(
                fechaHora,
                cantidad,
                unidad
              );

            if (
              !plazoHoras ||
              !fechaVencimiento
            ) {
              throw new Error(
                "No se pudo calcular el vencimiento del emplazamiento."
              );
            }

            /*
            -------------------------------------------------------------
            ACTA DE VÍA PÚBLICA
            -------------------------------------------------------------
            */

            acta =
              await Acta.create(
                {
                  reclamoId:
                    reclamo.id,

                  constatacionId:
                    constatacion.id,

                  vehiculoId:
                    vehiculo.id,

                  inspectorId:
                    req.usuario.id,

                  numeroActa:
                    String(
                      item.numeroActa
                    ).trim(),

                  tipo:
                    "VIA_PUBLICA",

                  fechaHora,

                  lugar:
                    reclamo.direccion ||
                    null,

                  personaEncontrada:
                    Boolean(
                      item.personaEncontrada
                    ),

                  atendidoPor:
                    item.personaEncontrada &&
                    item.atendidoPor
                      ? String(
                          item.atendidoPor
                        ).trim() ||
                        null
                      : null,

                  caracterAtendido:
                    item.personaEncontrada &&
                    item.caracterAtendido
                      ? item.caracterAtendido
                      : null,

                  situacion:
                    String(
                      situacion
                    ).trim(),

                  plazoHoras,

                  observaciones:
                    observaciones
                      ? String(
                          observaciones
                        ).trim() ||
                        null
                      : null,
                },
                {
                  transaction,
                }
              );

            /*
            -------------------------------------------------------------
            EMPLAZAMIENTO
            -------------------------------------------------------------
            */

            emplazamiento =
              await Emplazamiento.create(
                {
                  reclamoId:
                    reclamo.id,

                  actaId:
                    acta.id,

                  vehiculoId:
                    vehiculo.id,

                  inspectorId:
                    req.usuario.id,

                  fechaHora,

                  plazoCantidad:
                    cantidad,

                  plazoUnidad:
                    unidad,

                  plazoHoras,

                  fechaVencimiento,

                  estado:
                    "VIGENTE",

                  observaciones:
                    observaciones
                      ? String(
                          observaciones
                        ).trim() ||
                        null
                      : null,
                },
                {
                  transaction,
                }
              );

            /*
            -------------------------------------------------------------
            FOTO DEL EMPLAZAMIENTO
            -------------------------------------------------------------
            |
            | Mientras se estaba cargando:
            |
            | referenciaId = vehiculo.id
            |
            | Ahora que existe el emplazamiento:
            |
            | referenciaId = emplazamiento.id
            |
            */

const fotoEmplazamientoId =
  fotosEmplazamientoPorVehiculo.get(
    Number(vehiculo.id)
  );

if (!fotoEmplazamientoId) {
  throw new Error(
    `No se encontró la foto del emplazamiento del vehículo ${vehiculo.id}.`
  );
}

await Foto.update(
  {
    referenciaId: emplazamiento.id,
  },
  {
    where: {
      id: fotoEmplazamientoId,
    },
    transaction,
  }
);

            /*
            -------------------------------------------------------------
            ESTADO DEL VEHÍCULO
            -------------------------------------------------------------
            */

            vehiculo.estadoActual =
              "EMPLAZADO";

            await vehiculo.save({
              transaction,
            });
          }

          /*
          ---------------------------------------------------------------
          RESULTADO DEL VEHÍCULO
          ---------------------------------------------------------------
          */

          resultadosVehiculos.push({
            vehiculo,
            constatacion,
            acta,
            emplazamiento,
          });
        }
      } else {
        /*
        |--------------------------------------------------------------------------
        | RECLAMOS QUE NO SON DE VEHÍCULOS
        |--------------------------------------------------------------------------
        |
        | Conservamos el comportamiento anterior.
        |
        */

        const constatacion =
          await Constatacion.create(
            {
              reclamoId:
                reclamo.id,

              inspectorId:
                req.usuario.id,

              vehiculoId:
                null,

              resultado,

              situacion:
                String(
                  situacion
                ).trim(),

              observaciones:
                observaciones
                  ? String(
                      observaciones
                    ).trim() ||
                    null
                  : null,

              latitudActual:
                Number(
                  latitudActual
                ),

              longitudActual:
                Number(
                  longitudActual
                ),

              precisionGps:
                precisionGps
                  ? Number(
                      precisionGps
                    )
                  : null,
            },
            {
              transaction,
            }
          );

        let acta =
          null;

        let emplazamiento =
          null;

        /*
        ---------------------------------------------------------------
        ACTA TRADICIONAL
        ---------------------------------------------------------------
        */

        if (
          resultado ===
            "CONSTATADO" &&
          hizoActa === true
        ) {
          if (
            !numeroActa ||
            !String(
              numeroActa
            ).trim()
          ) {
            await transaction.rollback();

            return res
              .status(400)
              .json({
                mensaje:
                  "Ingresá el número del Acta de Vía Pública.",
              });
          }

          const cantidad =
            Number(
              plazoCantidad
            );

          if (
            !Number.isFinite(
              cantidad
            ) ||
            cantidad <= 0
          ) {
            await transaction.rollback();

            return res
              .status(400)
              .json({
                mensaje:
                  "El plazo indicado no es válido.",
              });
          }

          if (
            ![
              "HORAS",
              "DIAS",
            ].includes(
              plazoUnidad
            )
          ) {
            await transaction.rollback();

            return res
              .status(400)
              .json({
                mensaje:
                  "La unidad del plazo no es válida.",
              });
          }

          /*
          ---------------------------------------------------------------
          ACTA REPETIDA
          ---------------------------------------------------------------
          */

          const actaExistente =
            await Acta.findOne({
              where: {
                numeroActa:
                  String(
                    numeroActa
                  ).trim(),
              },

              transaction,
            });

          if (actaExistente) {
            await transaction.rollback();

            return res
              .status(409)
              .json({
                mensaje:
                  "Ese número de Acta ya está registrado.",
              });
          }

          const fechaHora =
            new Date();

          const plazoHoras =
            convertirPlazoAHoras(
              cantidad,
              plazoUnidad
            );

          const fechaVencimiento =
            calcularFechaVencimiento(
              fechaHora,
              cantidad,
              plazoUnidad
            );

          if (
            !plazoHoras ||
            !fechaVencimiento
          ) {
            throw new Error(
              "No se pudo calcular el vencimiento del emplazamiento."
            );
          }

          /*
          ---------------------------------------------------------------
          ACTA
          ---------------------------------------------------------------
          */

          acta =
            await Acta.create(
              {
                reclamoId:
                  reclamo.id,

                constatacionId:
                  constatacion.id,

                vehiculoId:
                  null,

                inspectorId:
                  req.usuario.id,

                numeroActa:
                  String(
                    numeroActa
                  ).trim(),

                tipo:
                  "VIA_PUBLICA",

                fechaHora,

                lugar:
                  reclamo.direccion ||
                  null,

                personaEncontrada:
                  Boolean(
                    personaEncontrada
                  ),

                atendidoPor:
                  personaEncontrada &&
                  atendidoPor
                    ? String(
                        atendidoPor
                      ).trim() ||
                      null
                    : null,

                caracterAtendido:
                  personaEncontrada &&
                  caracterAtendido
                    ? caracterAtendido
                    : null,

                situacion:
                  String(
                    situacion
                  ).trim(),

                plazoHoras,

                observaciones:
                  observaciones
                    ? String(
                        observaciones
                      ).trim() ||
                      null
                    : null,
              },
              {
                transaction,
              }
            );

          /*
          ---------------------------------------------------------------
          EMPLAZAMIENTO
          ---------------------------------------------------------------
          */

          emplazamiento =
            await Emplazamiento.create(
              {
                reclamoId:
                  reclamo.id,

                actaId:
                  acta.id,

                vehiculoId:
                  null,

                inspectorId:
                  req.usuario.id,

                fechaHora,

                plazoCantidad:
                  cantidad,

                plazoUnidad,

                plazoHoras,

                fechaVencimiento,

                estado:
                  "VIGENTE",

                observaciones:
                  observaciones
                    ? String(
                        observaciones
                      ).trim() ||
                      null
                    : null,
              },
              {
                transaction,
              }
            );

          huboActa = true;
        }

        resultadosVehiculos.push({
          vehiculo: null,
          constatacion,
          acta,
          emplazamiento,
        });
      }

      /*
      |--------------------------------------------------------------------------
      | ESTADO DEL RECLAMO
      |--------------------------------------------------------------------------
      |
      | ESTA LÓGICA SE CONSERVA.
      |
      | Si al menos UNO de los vehículos
      | tiene emplazamiento:
      |
      | EN_SEGUIMIENTO / ESPERANDO_PLAZO
      |
      | Si hay vehículos pero NINGUNO fue emplazado:
      |
      | PENDIENTE_ACTUACION /
      | PENDIENTE_DECISION_JEFE
      |
      */

      const estadoAnterior =
        reclamo.estado;

      let estadoNuevo;
      let etapaNueva;

      if (
        resultado ===
          "RESUELTO_EN_LUGAR" ||
        resultado ===
          "NO_CONSTATADO"
      ) {
        estadoNuevo =
          "RESUELTO";

        etapaNueva =
          "FINALIZADO";

        reclamo.estadoExterno =
          "LISTO_PARA_CERRAR";

        reclamo.fechaResolucion =
          new Date();
      } else if (
        resultado ===
          "CONSTATADO" &&
        huboActa
      ) {
        estadoNuevo =
          "EN_SEGUIMIENTO";

        etapaNueva =
          "ESPERANDO_PLAZO";
      } else {
        estadoNuevo =
          "PENDIENTE_ACTUACION";

        etapaNueva =
          "PENDIENTE_DECISION_JEFE";
      }

      reclamo.estado =
        estadoNuevo;

      reclamo.etapaActual =
        etapaNueva;

      reclamo.inspectorId =
        null;

      await reclamo.save({
        transaction,
      });

      /*
      |--------------------------------------------------------------------------
      | FINALIZAR TAREA DEL INSPECTOR
      |--------------------------------------------------------------------------
      */

      if (tareaActiva) {
        tareaActiva.estadoTarea =
          "FINALIZADA";

        tareaActiva.fechaFinalizacion =
          new Date();

        await tareaActiva.save({
          transaction,
        });
      }

      /*
      |--------------------------------------------------------------------------
      | HISTORIAL
      |--------------------------------------------------------------------------
      */

      let descripcionHistorial =
        "El inspector registró y finalizó su visita.";

      if (
        resultado ===
        "RESUELTO_EN_LUGAR"
      ) {
        descripcionHistorial =
          "El inspector verificó que el problema ya estaba solucionado. La visita quedó finalizada.";
      }

      if (
        resultado ===
        "NO_CONSTATADO"
      ) {
        descripcionHistorial =
          "El inspector realizó la visita pero no encontró el problema denunciado. Su tarea quedó finalizada.";
      }

      if (
        resultado ===
        "NO_SE_PUDO_VERIFICAR"
      ) {
        descripcionHistorial =
          "El inspector no pudo verificar el reclamo. Su tarea quedó finalizada y requiere decisión del jefe.";
      }

      /*
      Vehículos:
      contamos cuántos encontró
      y cuántos efectivamente emplazó.
      */

      if (
        resultado ===
          "CONSTATADO" &&
        esReclamoVehiculo
      ) {
        const cantidadVehiculos =
          resultadosVehiculos.length;

        const cantidadActas =
          resultadosVehiculos.filter(
            (item) =>
              Boolean(
                item.acta
              )
          ).length;

        descripcionHistorial =
          `Primera visita finalizada. Se registraron ${cantidadVehiculos} vehículo(s) y se realizaron ${cantidadActas} Acta(s) de Vía Pública.`;
      }

      await registrarHistorial({
        reclamoId:
          reclamo.id,

        usuarioId:
          req.usuario.id,

        accion:
          huboActa
            ? "PRIMERA_VISITA_FINALIZADA_CON_ACTA"
            : "PRIMERA_VISITA_FINALIZADA",

        descripcion:
          descripcionHistorial,

        estadoAnterior,

        estadoNuevo,

        transaction,
      });

      /*
      |--------------------------------------------------------------------------
      | COMMIT
      |--------------------------------------------------------------------------
      */

      await transaction.commit();

      /*
      |--------------------------------------------------------------------------
      | RESPUESTA
      |--------------------------------------------------------------------------
      */

      const primerResultado =
        resultadosVehiculos[0] ||
        {};

      return res
        .status(201)
        .json({
          ok: true,

          mensaje:
            huboActa
              ? "Primera visita finalizada. El reclamo quedó esperando el vencimiento de los emplazamientos."
              : "Visita finalizada correctamente.",

          /*
          Todos los vehículos.
          */

          vehiculos:
            resultadosVehiculos,

          /*
          Compatibilidad con pantallas
          que todavía esperan uno solo.
          */

          constatacion:
            primerResultado
              .constatacion ||
            null,

          acta:
            primerResultado
              .acta ||
            null,

          emplazamiento:
            primerResultado
              .emplazamiento ||
            null,

          vehiculo:
            primerResultado
              .vehiculo ||
            null,

          tarea:
            tareaActiva
              ? {
                  id:
                    tareaActiva.id,

                  etapa:
                    tareaActiva.etapa,

                  estadoTarea:
                    tareaActiva.estadoTarea,

                  fechaFinalizacion:
                    tareaActiva.fechaFinalizacion,
                }
              : null,

          reclamo: {
            id:
              reclamo.id,

            estado:
              reclamo.estado,

            etapaActual:
              reclamo.etapaActual,

            inspectorId:
              reclamo.inspectorId,

            estadoExterno:
              reclamo.estadoExterno,
          },
        });
    } catch (error) {
      try {
        await transaction.rollback();
      } catch (
        rollbackError
      ) {
        console.error(
          "Error haciendo rollback:",
          rollbackError
        );
      }

      console.error(
        "Error registrando visita:",
        error
      );

      return res
        .status(500)
        .json({
          mensaje:
            "No se pudo registrar la visita.",

          error:
            process.env
              .NODE_ENV ===
            "development"
              ? error.message
              : undefined,
        });
    }
  };
  /*
|--------------------------------------------------------------------------
| OBTENER PRIMERA VISITA
|--------------------------------------------------------------------------
*/

const obtenerPrimeraVisita =
  async (
    req,
    res
  ) => {
    try {
      const {
        reclamoId,
      } = req.params;

      /*
      |--------------------------------------------------------------------------
      | RECLAMO
      |--------------------------------------------------------------------------
      */

      const reclamo =
        await Reclamo.findByPk(
          reclamoId
        );

      if (!reclamo) {
        return res
          .status(404)
          .json({
            ok: false,

            mensaje:
              "El reclamo no existe.",
          });
      }

      /*
      |--------------------------------------------------------------------------
      | CONSTATACIONES DE LA PRIMERA VISITA
      |--------------------------------------------------------------------------
      |
      | Antes se buscaba una sola constatación.
      |
      | Ahora un reclamo de vehículos puede tener:
      |
      | vehículo 1 -> constatación 1
      | vehículo 2 -> constatación 2
      | vehículo 3 -> constatación 3
      |
      | Por eso recuperamos todas las constataciones
      | correspondientes a la primera visita.
      |
      */

      const constataciones =
        await Constatacion.findAll({
          where: {
            reclamoId:
              reclamo.id,
          },

          order: [
            [
              "createdAt",
              "ASC",
            ],
            [
              "id",
              "ASC",
            ],
          ],
        });

      /*
      |--------------------------------------------------------------------------
      | TODAVÍA NO HAY VISITA
      |--------------------------------------------------------------------------
      */

      if (
        !constataciones.length
      ) {
        return res.json({
          ok: true,

          realizada: false,

          puedeEditar: false,

          minutosRestantes: 0,

          fechaLimiteEdicion:
            null,

          visita: null,
        });
      }

      /*
      |--------------------------------------------------------------------------
      | PRIMERA CONSTATACIÓN
      |--------------------------------------------------------------------------
      |
      | Se mantiene como referencia para:
      |
      | - seguridad
      | - autor de la visita
      | - ventana de edición
      | - compatibilidad con frontend anterior
      |
      */

      const constatacion =
        constataciones[0];

      /*
      |--------------------------------------------------------------------------
      | SEGURIDAD DEL INSPECTOR
      |--------------------------------------------------------------------------
      */

      if (
        req.usuario.rol ===
          "inspector" &&
        Number(
          constatacion.inspectorId
        ) !==
          Number(
            req.usuario.id
          )
      ) {
        return res
          .status(403)
          .json({
            ok: false,

            mensaje:
              "Esta visita fue realizada por otro inspector.",
          });
      }

      /*
      |--------------------------------------------------------------------------
      | IDS DE LAS CONSTATACIONES
      |--------------------------------------------------------------------------
      */

      const constatacionIds =
        constataciones.map(
          (item) =>
            item.id
        );

      /*
      |--------------------------------------------------------------------------
      | ACTAS DE VÍA PÚBLICA
      |--------------------------------------------------------------------------
      */

      const actas =
        await Acta.findAll({
          where: {
            constatacionId: {
              [Op.in]:
                constatacionIds,
            },

            tipo:
              "VIA_PUBLICA",

            [Op.or]: [
              {
                anulada: false,
              },
              {
                anulada: null,
              },
            ],
          },

          order: [
            [
              "createdAt",
              "ASC",
            ],
            [
              "id",
              "ASC",
            ],
          ],
        });

      /*
      |--------------------------------------------------------------------------
      | IDS DE ACTAS
      |--------------------------------------------------------------------------
      */

      const actaIds =
        actas.map(
          (item) =>
            item.id
        );

      /*
      |--------------------------------------------------------------------------
      | EMPLAZAMIENTOS
      |--------------------------------------------------------------------------
      */

      const emplazamientos =
        actaIds.length > 0
          ? await Emplazamiento.findAll({
              where: {
                actaId: {
                  [Op.in]:
                    actaIds,
                },
              },

              order: [
                [
                  "createdAt",
                  "ASC",
                ],
                [
                  "id",
                  "ASC",
                ],
              ],
            })
          : [];

      /*
      |--------------------------------------------------------------------------
      | VEHÍCULOS
      |--------------------------------------------------------------------------
      */

      const vehiculos =
        await Vehiculo.findAll({
          where: {
            reclamoId:
              reclamo.id,
          },

          order: [
            [
              "id",
              "ASC",
            ],
          ],
        });

      /*
      |--------------------------------------------------------------------------
      | ARMAR RESULTADO POR VEHÍCULO
      |--------------------------------------------------------------------------
      |
      | Cada elemento queda:
      |
      | {
      |   vehiculo,
      |   constatacion,
      |   acta,
      |   emplazamiento
      | }
      |
      */

      const resultadosVehiculos =
        vehiculos.map(
          (vehiculo) => {
            const constatacionVehiculo =
              constataciones.find(
                (item) =>
                  Number(
                    item.vehiculoId
                  ) ===
                  Number(
                    vehiculo.id
                  )
              ) ||
              null;

            const actaVehiculo =
              actas.find(
                (item) =>
                  Number(
                    item.vehiculoId
                  ) ===
                  Number(
                    vehiculo.id
                  )
              ) ||
              null;

            const emplazamientoVehiculo =
              actaVehiculo
                ? emplazamientos.find(
                    (item) =>
                      Number(
                        item.actaId
                      ) ===
                      Number(
                        actaVehiculo.id
                      )
                  ) ||
                  null
                : null;

            return {
              vehiculo,

              constatacion:
                constatacionVehiculo,

              acta:
                actaVehiculo,

              emplazamiento:
                emplazamientoVehiculo,
            };
          }
        );

      /*
      |--------------------------------------------------------------------------
      | COMPATIBILIDAD CON RECLAMOS NO VEHICULARES
      |--------------------------------------------------------------------------
      |
      | En un reclamo que no tenga vehículos igualmente
      | necesitamos devolver su constatación/acta/
      | emplazamiento como antes.
      |
      */

      const primeraActa =
        actas[0] ||
        null;

      const primerEmplazamiento =
        primeraActa
          ? emplazamientos.find(
              (item) =>
                Number(
                  item.actaId
                ) ===
                Number(
                  primeraActa.id
                )
            ) ||
            null
          : null;

      /*
      |--------------------------------------------------------------------------
      | VENTANA DE EDICIÓN
      |--------------------------------------------------------------------------
      |
      | Conservamos exactamente el criterio existente:
      | 60 minutos desde la primera constatación.
      |
      */

      const fechaRegistro =
        new Date(
          constatacion.createdAt
        );

      const ahora =
        new Date();

      const limiteEdicion =
        new Date(
          fechaRegistro.getTime() +
            60 * 60 * 1000
        );

      const diferenciaMs =
        limiteEdicion.getTime() -
        ahora.getTime();

      const dentroDelPlazo =
        diferenciaMs > 0;

      const esAutor =
        Number(
          constatacion.inspectorId
        ) ===
        Number(
          req.usuario.id
        );

      const puedeEditar =
        req.usuario.rol ===
          "administrador" ||
        (
          req.usuario.rol ===
            "inspector" &&
          esAutor &&
          dentroDelPlazo
        );

      const minutosRestantes =
        dentroDelPlazo
          ? Math.max(
              1,
              Math.ceil(
                diferenciaMs /
                  60000
              )
            )
          : 0;

      /*
      |--------------------------------------------------------------------------
      | PRIMER RESULTADO
      |--------------------------------------------------------------------------
      |
      | Lo usamos únicamente para mantener compatibilidad
      | con el frontend anterior.
      |
      */

      const primerResultado =
        resultadosVehiculos[0] ||
        null;

      /*
      |--------------------------------------------------------------------------
      | RESPUESTA
      |--------------------------------------------------------------------------
      */

      return res.json({
        ok: true,

        realizada: true,

        puedeEditar,

        minutosRestantes,

        fechaLimiteEdicion:
          limiteEdicion,

        visita: {
          /*
          ---------------------------------------------------------------
          NUEVO FORMATO
          ---------------------------------------------------------------
          */

          vehiculos:
            resultadosVehiculos,

          constataciones,

          actas,

          emplazamientos,

          /*
          ---------------------------------------------------------------
          FORMATO ANTERIOR
          ---------------------------------------------------------------
          |
          | Se mantiene para no romper componentes
          | que todavía lean:
          |
          | visita.constatacion
          | visita.acta
          | visita.emplazamiento
          | visita.vehiculo
          |
          */

          constatacion:
            primerResultado
              ?.constatacion ||
            constatacion ||
            null,

          acta:
            primerResultado
              ?.acta ||
            primeraActa ||
            null,

          emplazamiento:
            primerResultado
              ?.emplazamiento ||
            primerEmplazamiento ||
            null,

          vehiculo:
            primerResultado
              ?.vehiculo ||
            vehiculos[0] ||
            null,
        },
      });
    } catch (error) {
      console.error(
        "Error obteniendo primera visita:",
        error
      );

      return res
        .status(500)
        .json({
          ok: false,

          mensaje:
            "No se pudo cargar la primera visita.",
        });
    }
  };

/*
|--------------------------------------------------------------------------
| EDITAR PRIMERA VISITA
|--------------------------------------------------------------------------
*/

const editarPrimeraVisita =
  async (
    req,
    res
  ) => {
    const transaction =
      await sequelize.transaction();

    try {
      const {
        reclamoId,
      } = req.params;

      const {
        situacion,
        observaciones,

        latitudActual,
        longitudActual,
        precisionGps,

        /*
        Formato anterior.
        */
        personaEncontrada,
        atendidoPor,
        caracterAtendido,

        vehiculo:
          vehiculoPayload,

        /*
        Nuevo formato:
        varios vehículos.
        */
        vehiculos =
          [],
      } = req.body;

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

            lock:
              transaction
                .LOCK.UPDATE,
          }
        );

      if (!reclamo) {
        await transaction.rollback();

        return res
          .status(404)
          .json({
            ok: false,

            mensaje:
              "El reclamo no existe.",
          });
      }

      /*
      |--------------------------------------------------------------------------
      | CONSTATACIONES DE LA PRIMERA VISITA
      |--------------------------------------------------------------------------
      */

      const constataciones =
        await Constatacion.findAll({
          where: {
            reclamoId:
              reclamo.id,
          },

          order: [
            [
              "createdAt",
              "ASC",
            ],
            [
              "id",
              "ASC",
            ],
          ],

          transaction,

          lock:
            transaction
              .LOCK.UPDATE,
        });

      if (
        !constataciones.length
      ) {
        await transaction.rollback();

        return res
          .status(404)
          .json({
            ok: false,

            mensaje:
              "Todavía no existe una primera visita para este reclamo.",
          });
      }

      /*
      |--------------------------------------------------------------------------
      | PRIMERA CONSTATACIÓN
      |--------------------------------------------------------------------------
      |
      | Todas las constataciones creadas por la visita
      | pertenecen al mismo inspector.
      |
      | Usamos la primera para seguridad y plazo.
      |
      */

      const primeraConstatacion =
        constataciones[0];

      /*
      |--------------------------------------------------------------------------
      | SEGURIDAD
      |--------------------------------------------------------------------------
      */

      const esAdministrador =
        req.usuario.rol ===
        "administrador";

      const esInspectorAutor =
        req.usuario.rol ===
          "inspector" &&
        Number(
          primeraConstatacion.inspectorId
        ) ===
          Number(
            req.usuario.id
          );

      if (
        !esAdministrador &&
        !esInspectorAutor
      ) {
        await transaction.rollback();

        return res
          .status(403)
          .json({
            ok: false,

            mensaje:
              "No podés editar una visita realizada por otro inspector.",
          });
      }

      /*
      |--------------------------------------------------------------------------
      | LÍMITE DE 60 MINUTOS
      |--------------------------------------------------------------------------
      */

      if (!esAdministrador) {
        const fechaRegistro =
          new Date(
            primeraConstatacion.createdAt
          );

        const limiteEdicion =
          new Date(
            fechaRegistro.getTime() +
              60 * 60 * 1000
          );

        if (
          new Date() >
          limiteEdicion
        ) {
          await transaction.rollback();

          return res
            .status(403)
            .json({
              ok: false,

              codigo:
                "PLAZO_EDICION_VENCIDO",

              mensaje:
                "La visita ya no puede editarse porque pasó el plazo de 1 hora.",
            });
        }
      }

      /*
      |--------------------------------------------------------------------------
      | IMPORTANTE
      |--------------------------------------------------------------------------
      |
      | Esta edición NO modifica:
      |
      | - resultado
      | - estado del reclamo
      | - etapa del reclamo
      | - si hubo acta
      | - número de acta
      | - plazo
      | - fecha de vencimiento
      | - emplazamiento
      |
      | Solamente permite corregir
      | información descriptiva.
      |
      */

      /*
      |--------------------------------------------------------------------------
      | ACTUALIZAR CONSTATACIONES
      |--------------------------------------------------------------------------
      |
      | Situación, observaciones y GPS corresponden
      | a la visita.
      |
      | En el flujo de varios vehículos tenemos una
      | constatación por vehículo, por lo que mantenemos
      | esos datos sincronizados.
      |
      */

      for (
        const constatacion
        of constataciones
      ) {
        if (
          situacion !==
            undefined &&
          String(
            situacion
          ).trim()
        ) {
          constatacion.situacion =
            String(
              situacion
            ).trim();
        }

        if (
          observaciones !==
            undefined
        ) {
          constatacion.observaciones =
            String(
              observaciones ||
                ""
            ).trim() ||
            null;
        }

        if (
          latitudActual !==
            undefined &&
          latitudActual !==
            null
        ) {
          constatacion.latitudActual =
            Number(
              latitudActual
            );
        }

        if (
          longitudActual !==
            undefined &&
          longitudActual !==
            null
        ) {
          constatacion.longitudActual =
            Number(
              longitudActual
            );
        }

        if (
          precisionGps !==
            undefined
        ) {
          constatacion.precisionGps =
            precisionGps ===
              null ||
            precisionGps ===
              ""
              ? null
              : Number(
                  precisionGps
                );
        }

        await constatacion.save({
          transaction,
        });
      }

      /*
      |--------------------------------------------------------------------------
      | ACTAS DE LA PRIMERA VISITA
      |--------------------------------------------------------------------------
      */

      const constatacionIds =
        constataciones.map(
          (item) =>
            item.id
        );

      const actas =
        await Acta.findAll({
          where: {
            constatacionId: {
              [Op.in]:
                constatacionIds,
            },

            tipo:
              "VIA_PUBLICA",

            [Op.or]: [
              {
                anulada: false,
              },
              {
                anulada: null,
              },
            ],
          },

          order: [
            [
              "id",
              "ASC",
            ],
          ],

          transaction,

          lock:
            transaction
              .LOCK.UPDATE,
        });

      /*
      |--------------------------------------------------------------------------
      | NUEVO FORMATO: VARIOS VEHÍCULOS
      |--------------------------------------------------------------------------
      */

      const vehiculosPayload =
        Array.isArray(
          vehiculos
        )
          ? vehiculos
          : [];

      const resultadosVehiculos =
        [];

      if (
        vehiculosPayload.length >
        0
      ) {
        /*
        No permitimos IDs repetidos
        en la misma petición.
        */

        const idsRecibidos =
          new Set();

        for (
          let indice = 0;
          indice <
          vehiculosPayload.length;
          indice += 1
        ) {
          const item =
            vehiculosPayload[
              indice
            ];

          const numero =
            indice + 1;

          if (
            !item ||
            typeof item !==
              "object"
          ) {
            await transaction.rollback();

            return res
              .status(400)
              .json({
                ok: false,

                mensaje:
                  `Los datos del vehículo ${numero} no son válidos.`,
              });
          }

          const vehiculoId =
            Number(
              item.id
            );

          if (
            !Number.isInteger(
              vehiculoId
            ) ||
            vehiculoId <= 0
          ) {
            await transaction.rollback();

            return res
              .status(400)
              .json({
                ok: false,

                mensaje:
                  `El vehículo ${numero} no tiene un ID válido.`,
              });
          }

          if (
            idsRecibidos.has(
              vehiculoId
            )
          ) {
            await transaction.rollback();

            return res
              .status(409)
              .json({
                ok: false,

                mensaje:
                  `El vehículo ${numero} está repetido en la edición.`,
              });
          }

          idsRecibidos.add(
            vehiculoId
          );

          /*
          Vehículo real del reclamo.
          */

          const vehiculo =
            await Vehiculo.findOne({
              where: {
                id:
                  vehiculoId,

                reclamoId:
                  reclamo.id,
              },

              transaction,

              lock:
                transaction
                  .LOCK.UPDATE,
            });

          if (!vehiculo) {
            await transaction.rollback();

            return res
              .status(404)
              .json({
                ok: false,

                mensaje:
                  `No se encontró el vehículo ${numero} en este reclamo.`,
              });
          }

          /*
          ---------------------------------------------------------------
          DATOS DESCRIPTIVOS DEL VEHÍCULO
          ---------------------------------------------------------------
          */

          if (
            item.dominio !==
            undefined
          ) {
            vehiculo.dominio =
              String(
                item.dominio ||
                  ""
              )
                .trim()
                .toUpperCase() ||
              null;
          }

          if (
            item.marca !==
            undefined
          ) {
            vehiculo.marca =
              String(
                item.marca ||
                  ""
              ).trim() ||
              null;
          }

          if (
            item.modelo !==
            undefined
          ) {
            vehiculo.modelo =
              String(
                item.modelo ||
                  ""
              ).trim() ||
              null;
          }

          if (
            item.color !==
            undefined
          ) {
            vehiculo.color =
              String(
                item.color ||
                  ""
              ).trim() ||
              null;
          }

          if (
            item.tipoVehiculo !==
            undefined
          ) {
            vehiculo.tipoVehiculo =
              item.tipoVehiculo ||
              vehiculo.tipoVehiculo;
          }

          if (
            item.descripcion !==
            undefined
          ) {
            vehiculo.descripcion =
              String(
                item.descripcion ||
                  ""
              ).trim() ||
              null;
          }

          await vehiculo.save({
            transaction,
          });

          /*
          ---------------------------------------------------------------
          CONSTATACIÓN DEL VEHÍCULO
          ---------------------------------------------------------------
          */

          const constatacionVehiculo =
            constataciones.find(
              (constatacion) =>
                Number(
                  constatacion.vehiculoId
                ) ===
                Number(
                  vehiculo.id
                )
            ) ||
            null;

          /*
          ---------------------------------------------------------------
          ACTA DEL VEHÍCULO
          ---------------------------------------------------------------
          |
          | Solamente permitimos modificar:
          |
          | - personaEncontrada
          | - atendidoPor
          | - caracterAtendido
          | - situación
          | - observaciones
          |
          | NO número de acta.
          | NO plazo.
          |
          */

          const acta =
            actas.find(
              (itemActa) =>
                Number(
                  itemActa.vehiculoId
                ) ===
                Number(
                  vehiculo.id
                )
            ) ||
            null;

          if (acta) {
            if (
              item.personaEncontrada !==
              undefined
            ) {
              acta.personaEncontrada =
                Boolean(
                  item.personaEncontrada
                );
            }

            if (
              item.atendidoPor !==
              undefined
            ) {
              acta.atendidoPor =
                acta.personaEncontrada
                  ? String(
                      item.atendidoPor ||
                        ""
                    ).trim() ||
                    null
                  : null;
            }

            if (
              item.caracterAtendido !==
              undefined
            ) {
              acta.caracterAtendido =
                acta.personaEncontrada
                  ? item.caracterAtendido ||
                    null
                  : null;
            }

            if (
              situacion !==
                undefined &&
              String(
                situacion
              ).trim()
            ) {
              acta.situacion =
                String(
                  situacion
                ).trim();
            }

            if (
              observaciones !==
                undefined
            ) {
              acta.observaciones =
                String(
                  observaciones ||
                    ""
                ).trim() ||
                null;
            }

            await acta.save({
              transaction,
            });
          }

          resultadosVehiculos.push({
            vehiculo,

            constatacion:
              constatacionVehiculo,

            acta,
          });
        }
      } else {
        /*
        |--------------------------------------------------------------------------
        | FORMATO ANTERIOR
        |--------------------------------------------------------------------------
        |
        | Se conserva para no romper la pantalla anterior
        | o reclamos que todavía utilicen vehiculo.
        |
        */

        const constatacion =
          primeraConstatacion;

        const acta =
          actas.find(
            (item) =>
              Number(
                item.constatacionId
              ) ===
              Number(
                constatacion.id
              )
          ) ||
          null;

        /*
        ACTA
        */

        if (acta) {
          if (
            personaEncontrada !==
            undefined
          ) {
            acta.personaEncontrada =
              Boolean(
                personaEncontrada
              );
          }

          if (
            atendidoPor !==
            undefined
          ) {
            acta.atendidoPor =
              acta.personaEncontrada
                ? String(
                    atendidoPor ||
                      ""
                  ).trim() ||
                  null
                : null;
          }

          if (
            caracterAtendido !==
            undefined
          ) {
            acta.caracterAtendido =
              acta.personaEncontrada
                ? caracterAtendido ||
                  null
                : null;
          }

          if (
            situacion !==
              undefined &&
            String(
              situacion
            ).trim()
          ) {
            acta.situacion =
              String(
                situacion
              ).trim();
          }

          if (
            observaciones !==
              undefined
          ) {
            acta.observaciones =
              String(
                observaciones ||
                  ""
              ).trim() ||
              null;
          }

          await acta.save({
            transaction,
          });
        }

        /*
        VEHÍCULO ANTERIOR
        */

        let vehiculo =
          null;

        if (
          vehiculoPayload &&
          typeof vehiculoPayload ===
            "object"
        ) {
          /*
          Si viene ID lo usamos.
          Si es una visita vieja sin ID en el payload,
          mantenemos el comportamiento anterior y
          buscamos el primero.
          */

          const vehiculoId =
            Number(
              vehiculoPayload.id
            );

          if (
            Number.isInteger(
              vehiculoId
            ) &&
            vehiculoId > 0
          ) {
            vehiculo =
              await Vehiculo.findOne({
                where: {
                  id:
                    vehiculoId,

                  reclamoId:
                    reclamo.id,
                },

                transaction,

                lock:
                  transaction
                    .LOCK.UPDATE,
              });
          } else {
            vehiculo =
              await Vehiculo.findOne({
                where: {
                  reclamoId:
                    reclamo.id,
                },

                order: [
                  [
                    "id",
                    "ASC",
                  ],
                ],

                transaction,

                lock:
                  transaction
                    .LOCK.UPDATE,
              });
          }

          if (vehiculo) {
            if (
              vehiculoPayload.dominio !==
              undefined
            ) {
              vehiculo.dominio =
                String(
                  vehiculoPayload.dominio ||
                    ""
                )
                  .trim()
                  .toUpperCase() ||
                null;
            }

            if (
              vehiculoPayload.marca !==
              undefined
            ) {
              vehiculo.marca =
                String(
                  vehiculoPayload.marca ||
                    ""
                ).trim() ||
                null;
            }

            if (
              vehiculoPayload.modelo !==
              undefined
            ) {
              vehiculo.modelo =
                String(
                  vehiculoPayload.modelo ||
                    ""
                ).trim() ||
                null;
            }

            if (
              vehiculoPayload.color !==
              undefined
            ) {
              vehiculo.color =
                String(
                  vehiculoPayload.color ||
                    ""
                ).trim() ||
                null;
            }

            if (
              vehiculoPayload.tipoVehiculo !==
              undefined
            ) {
              vehiculo.tipoVehiculo =
                vehiculoPayload
                  .tipoVehiculo ||
                vehiculo.tipoVehiculo;
            }

            if (
              vehiculoPayload.descripcion !==
              undefined
            ) {
              vehiculo.descripcion =
                String(
                  vehiculoPayload.descripcion ||
                    ""
                ).trim() ||
                null;
            }

            await vehiculo.save({
              transaction,
            });
          }
        }

        resultadosVehiculos.push({
          vehiculo,
          constatacion,
          acta,
        });
      }

      /*
      |--------------------------------------------------------------------------
      | HISTORIAL
      |--------------------------------------------------------------------------
      |
      | Fijate que estadoAnterior y estadoNuevo
      | siguen siendo exactamente el mismo.
      |
      | EDITAR NO CAMBIA EL ESTADO.
      |
      */

      await registrarHistorial({
        reclamoId:
          reclamo.id,

        usuarioId:
          req.usuario.id,

        accion:
          "PRIMERA_VISITA_EDITADA",

        descripcion:
          "Se corrigieron datos de la primera visita dentro del plazo permitido.",

        estadoAnterior:
          reclamo.estado,

        estadoNuevo:
          reclamo.estado,

        transaction,
      });

      /*
      |--------------------------------------------------------------------------
      | COMMIT
      |--------------------------------------------------------------------------
      */

      await transaction.commit();

      /*
      |--------------------------------------------------------------------------
      | RESPUESTA
      |--------------------------------------------------------------------------
      */

      const primerResultado =
        resultadosVehiculos[0] ||
        {};

      return res.json({
        ok: true,

        mensaje:
          "La visita fue actualizada correctamente.",

        /*
        Nuevo formato.
        */

        vehiculos:
          resultadosVehiculos,

        constataciones,

        actas,

        /*
        Compatibilidad con frontend anterior.
        */

        constatacion:
          primerResultado
            .constatacion ||
          primeraConstatacion ||
          null,

        acta:
          primerResultado
            .acta ||
          actas[0] ||
          null,

        vehiculo:
          primerResultado
            .vehiculo ||
          null,
      });
    } catch (error) {
      try {
        await transaction.rollback();
      } catch (
        rollbackError
      ) {
        console.error(
          "Error haciendo rollback:",
          rollbackError
        );
      }

      console.error(
        "Error editando primera visita:",
        error
      );

      return res
        .status(500)
        .json({
          ok: false,

          mensaje:
            "No se pudo editar la visita.",

          error:
            process.env
              .NODE_ENV ===
            "development"
              ? error.message
              : undefined,
        });
    }
  };

  /*
|--------------------------------------------------------------------------
| PREPARAR VEHÍCULOS DE LA PRIMERA VISITA
|--------------------------------------------------------------------------
|
| Crea los vehículos antes de finalizar la visita.
|
| Esto permite obtener vehiculoId reales para:
|
| - foto de cada vehículo
| - Acta de Vía Pública
| - emplazamiento
| - foto del emplazamiento
|
| No finaliza la visita.
| No cambia el estado del reclamo.
| No finaliza la tarea del inspector.
|
*/

const prepararVehiculos =
  async (req, res) => {
    const transaction =
      await sequelize.transaction();

    try {
      const reclamoId =
        Number(
          req.params.reclamoId
        );

      const cantidad =
        Number(
          req.body.cantidad
        );

      /*
      |--------------------------------------------------------------------------
      | VALIDACIONES
      |--------------------------------------------------------------------------
      */

      if (
        !Number.isInteger(
          reclamoId
        ) ||
        reclamoId <= 0
      ) {
        await transaction.rollback();

        return res
          .status(400)
          .json({
            ok: false,

            mensaje:
              "El reclamo no es válido.",
          });
      }

      if (
        !Number.isInteger(
          cantidad
        ) ||
        cantidad < 1 ||
        cantidad > 20
      ) {
        await transaction.rollback();

        return res
          .status(400)
          .json({
            ok: false,

            mensaje:
              "La cantidad de vehículos debe estar entre 1 y 20.",
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

            lock:
              transaction
                .LOCK.UPDATE,
          }
        );

      if (!reclamo) {
        await transaction.rollback();

        return res
          .status(404)
          .json({
            ok: false,

            mensaje:
              "El reclamo no existe.",
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

        return res
          .status(400)
          .json({
            ok: false,

            mensaje:
              "Este reclamo ya está finalizado.",
          });
      }

      /*
      |--------------------------------------------------------------------------
      | SEGURIDAD DEL INSPECTOR
      |--------------------------------------------------------------------------
      */

      if (
        req.usuario.rol ===
        "inspector"
      ) {
        const tareaActiva =
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
              [
                "fechaAsignacion",
                "DESC",
              ],
            ],

            transaction,
          });

        if (!tareaActiva) {
          await transaction.rollback();

          return res
            .status(403)
            .json({
              ok: false,

              mensaje:
                "No tenés una tarea activa para este reclamo.",
            });
        }

        if (
          tareaActiva.etapa ===
          "SEGUNDA_VISITA"
        ) {
          await transaction.rollback();

          return res
            .status(409)
            .json({
              ok: false,

              mensaje:
                "Esta tarea corresponde a una segunda visita.",
            });
        }

        if (
          reclamo.inspectorId &&
          Number(
            reclamo.inspectorId
          ) !==
            Number(
              req.usuario.id
            )
        ) {
          await transaction.rollback();

          return res
            .status(403)
            .json({
              ok: false,

              mensaje:
                "Este reclamo está asignado actualmente a otro inspector.",
            });
        }
      }

      /*
      |--------------------------------------------------------------------------
      | VEHÍCULOS YA PREPARADOS
      |--------------------------------------------------------------------------
      */

      let existentes =
        await Vehiculo.findAll({
          where: {
            reclamoId:
              reclamo.id,

            origenRegistro:
              "CIRCUITO_NORMAL",
          },

          order: [
            [
              "id",
              "ASC",
            ],
          ],

          transaction,

          lock:
            transaction
              .LOCK.UPDATE,
        });

      const cantidadAnterior =
        existentes.length;

      /*
      |--------------------------------------------------------------------------
      | REDUCIR CANTIDAD
      |--------------------------------------------------------------------------
      |
      | Ejemplo:
      |
      | preparó 4
      | después se dio cuenta que era 1
      |
      | Conservamos los primeros y revisamos
      | los que sobran.
      |
      | Solamente eliminamos un vehículo preparado
      | que todavía no tenga información real asociada.
      |
      */

      if (
        existentes.length >
        cantidad
      ) {
        const sobrantes =
          existentes.slice(
            cantidad
          );

        /*
        Primero verificamos TODOS.
        No borramos ninguno hasta saber
        que todos los sobrantes se pueden eliminar.
        */

        for (
          const vehiculo
          of sobrantes
        ) {
          /*
          ---------------------------------------------------------------
          FOTO DEL VEHÍCULO
          ---------------------------------------------------------------
          */

          const fotoVehiculo =
            await Foto.findOne({
              where: {
                reclamoId:
                  reclamo.id,

                tipoReferencia:
                  "VEHICULO",

                referenciaId:
                  vehiculo.id,

                activo:
                  true,
              },

              transaction,
            });

          /*
          ---------------------------------------------------------------
          FOTO DE EMPLAZAMIENTO TEMPORAL
          ---------------------------------------------------------------
          |
          | Antes de finalizar, la foto del acta usa
          | temporalmente vehiculo.id como referenciaId.
          |
          */

          const fotoEmplazamiento =
            await Foto.findOne({
              where: {
                reclamoId:
                  reclamo.id,

                tipoReferencia:
                  "EMPLAZAMIENTO",

                referenciaId:
                  vehiculo.id,

                activo:
                  true,
              },

              transaction,
            });

          /*
          ---------------------------------------------------------------
          CONSTATACIÓN
          ---------------------------------------------------------------
          */

          const constatacion =
            await Constatacion.findOne({
              where: {
                reclamoId:
                  reclamo.id,

                vehiculoId:
                  vehiculo.id,
              },

              transaction,
            });

          /*
          ---------------------------------------------------------------
          ACTA
          ---------------------------------------------------------------
          */

          const acta =
            await Acta.findOne({
              where: {
                reclamoId:
                  reclamo.id,

                vehiculoId:
                  vehiculo.id,
              },

              transaction,
            });

          /*
          ---------------------------------------------------------------
          EMPLAZAMIENTO
          ---------------------------------------------------------------
          */

          const emplazamiento =
            await Emplazamiento.findOne({
              where: {
                reclamoId:
                  reclamo.id,

                vehiculoId:
                  vehiculo.id,
              },

              transaction,
            });

          /*
          ---------------------------------------------------------------
          DATOS CARGADOS EN EL VEHÍCULO
          ---------------------------------------------------------------
          */

          const tieneDatos =
            Boolean(
              String(
                vehiculo.dominio ||
                  ""
              ).trim() ||
              String(
                vehiculo.marca ||
                  ""
              ).trim() ||
              String(
                vehiculo.modelo ||
                  ""
              ).trim() ||
              String(
                vehiculo.color ||
                  ""
              ).trim() ||
              String(
                vehiculo.descripcion ||
                  ""
              ).trim()
            );

          /*
          ---------------------------------------------------------------
          NO BORRAR SI YA SE TRABAJÓ
          ---------------------------------------------------------------
          */

          if (
            fotoVehiculo ||
            fotoEmplazamiento ||
            constatacion ||
            acta ||
            emplazamiento ||
            tieneDatos
          ) {
            await transaction.rollback();

            return res
              .status(409)
              .json({
                ok: false,

                codigo:
                  "VEHICULO_YA_CARGADO",

                mensaje:
                  `No se puede reducir a ${cantidad} vehículo(s) porque el vehículo interno N° ${vehiculo.numeroInterno} ya tiene información o fotografías cargadas.`,

                vehiculoId:
                  vehiculo.id,

                numeroInterno:
                  vehiculo.numeroInterno,

                cantidadActual:
                  existentes.length,
              });
          }
        }

        /*
        |--------------------------------------------------------------------------
        | TODOS LOS SOBRANTES ESTÁN VACÍOS
        |--------------------------------------------------------------------------
        |
        | Ahora sí podemos eliminarlos.
        |
        */

        const idsEliminar =
          sobrantes.map(
            (vehiculo) =>
              vehiculo.id
          );

        if (
          idsEliminar.length >
          0
        ) {
          await Vehiculo.destroy({
            where: {
              id: {
                [Op.in]:
                  idsEliminar,
              },

              reclamoId:
                reclamo.id,
            },

            transaction,
          });
        }

        /*
        Volvemos a cargar los que quedaron.
        */

        existentes =
          await Vehiculo.findAll({
            where: {
              reclamoId:
                reclamo.id,

              origenRegistro:
                "CIRCUITO_NORMAL",
            },

            order: [
              [
                "id",
                "ASC",
              ],
            ],

            transaction,

            lock:
              transaction
                .LOCK.UPDATE,
          });
      }

      /*
      |--------------------------------------------------------------------------
      | VEHÍCULOS QUE QUEDAN
      |--------------------------------------------------------------------------
      */

      const vehiculos = [
        ...existentes,
      ];

      const faltan =
        cantidad -
        vehiculos.length;

      /*
      |--------------------------------------------------------------------------
      | CREAR LOS QUE FALTAN
      |--------------------------------------------------------------------------
      */

      if (faltan > 0) {
        let ultimoNumero =
          await Vehiculo.max(
            "numeroInterno",
            {
              transaction,
            }
          );

        ultimoNumero =
          Number(
            ultimoNumero ||
              0
          );

        for (
          let indice = 0;
          indice < faltan;
          indice += 1
        ) {
          ultimoNumero += 1;

          const vehiculo =
            await Vehiculo.create(
              {
                numeroInterno:
                  ultimoNumero,

                reclamoId:
                  reclamo.id,

                origenRegistro:
                  "CIRCUITO_NORMAL",

                dominio:
                  null,

                marca:
                  null,

                modelo:
                  null,

                color:
                  null,

                tipoVehiculo:
                  "AUTOMOVIL",

                descripcion:
                  null,

                estadoActual:
                  "EN_VIA_PUBLICA",
              },
              {
                transaction,
              }
            );

          vehiculos.push(
            vehiculo
          );
        }
      }

      /*
      |--------------------------------------------------------------------------
      | HISTORIAL
      |--------------------------------------------------------------------------
      */

      if (
        cantidadAnterior !==
        vehiculos.length
      ) {
        const accion =
          cantidadAnterior <
          vehiculos.length
            ? "VEHICULOS_PREPARADOS"
            : "PREPARACION_VEHICULOS_REDUCIDA";

        const descripcion =
          cantidadAnterior <
          vehiculos.length
            ? `Se prepararon ${vehiculos.length} vehículo(s) para realizar la primera visita.`
            : `Se corrigió la preparación de vehículos de ${cantidadAnterior} a ${vehiculos.length}.`;

        await registrarHistorial({
          reclamoId:
            reclamo.id,

          usuarioId:
            req.usuario.id,

          accion,

          descripcion,

          estadoAnterior:
            reclamo.estado,

          estadoNuevo:
            reclamo.estado,

          transaction,
        });
      }

      /*
      |--------------------------------------------------------------------------
      | COMMIT
      |--------------------------------------------------------------------------
      */

      await transaction.commit();

      /*
      |--------------------------------------------------------------------------
      | RESPUESTA
      |--------------------------------------------------------------------------
      */

      return res
        .status(
          cantidadAnterior ===
            vehiculos.length
            ? 200
            : 201
        )
        .json({
          ok: true,

          mensaje:
            cantidadAnterior >
            vehiculos.length
              ? `La cantidad fue corregida a ${vehiculos.length} vehículo(s).`
              : faltan > 0
              ? `${vehiculos.length} vehículo(s) preparados correctamente.`
              : "Los vehículos ya estaban preparados.",

          cantidad:
            vehiculos.length,

          vehiculos:
            vehiculos.map(
              (vehiculo) => ({
                id:
                  vehiculo.id,

                numeroInterno:
                  vehiculo.numeroInterno,

                reclamoId:
                  vehiculo.reclamoId,

                dominio:
                  vehiculo.dominio,

                marca:
                  vehiculo.marca,

                modelo:
                  vehiculo.modelo,

                color:
                  vehiculo.color,

                tipoVehiculo:
                  vehiculo.tipoVehiculo,

                descripcion:
                  vehiculo.descripcion,

                estadoActual:
                  vehiculo.estadoActual,
              })
            ),
        });
    } catch (error) {
      try {
        await transaction.rollback();
      } catch (
        rollbackError
      ) {
        console.error(
          "Error haciendo rollback:",
          rollbackError
        );
      }

      console.error(
        "Error preparando vehículos:",
        error
      );

      return res
        .status(500)
        .json({
          ok: false,

          mensaje:
            "No se pudieron preparar los vehículos.",

          error:
            process.env
              .NODE_ENV ===
            "development"
              ? error.message
              : undefined,
        });
    }
  };

module.exports = {
  registrarVisita,
  obtenerPrimeraVisita,
  editarPrimeraVisita,
   prepararVehiculos,
};