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
  async (
    req,
    res
  ) => {
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

        hizoActa = false,

        numeroActa = null,

        personaEncontrada =
          false,

        atendidoPor = null,

        caracterAtendido =
          null,

        plazoCantidad = null,

        plazoUnidad =
          "HORAS",

        vehiculo:
          vehiculoPayload =
            null,
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


      /*
      |--------------------------------------------------------------------------
      | TIPO DE RECLAMO
      |--------------------------------------------------------------------------
      |
      | Necesitamos saber si realmente
      | estamos trabajando con un vehículo.
      |
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
      | SI ES VEHÍCULO, VALIDAR DATOS
      |--------------------------------------------------------------------------
      |
      | Solamente lo exigimos cuando
      | realmente se constató el problema.
      |
      */

      if (
        resultado ===
          "CONSTATADO" &&
        esReclamoVehiculo
      ) {
        if (
          !vehiculoPayload ||
          typeof vehiculoPayload !==
            "object"
        ) {
          await transaction.rollback();

          return res
            .status(400)
            .json({
              mensaje:
                "Este reclamo es de vehículo. Tenés que registrar los datos del vehículo antes de finalizar la visita.",
            });
        }


        const tieneDatosVehiculo =
          String(
            vehiculoPayload
              .dominio || ""
          ).trim() ||
          String(
            vehiculoPayload
              .marca || ""
          ).trim() ||
          String(
            vehiculoPayload
              .modelo || ""
          ).trim() ||
          String(
            vehiculoPayload
              .color || ""
          ).trim() ||
          String(
            vehiculoPayload
              .descripcion || ""
          ).trim();


        if (!tieneDatosVehiculo) {
          await transaction.rollback();

          return res
            .status(400)
            .json({
              mensaje:
                "Cargá al menos un dato para identificar el vehículo.",
            });
        }
      }


      /*
      |--------------------------------------------------------------------------
      | RECLAMO FINALIZADO
      |--------------------------------------------------------------------------
      */

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
      | BUSCAR TAREA ACTIVA
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


        /*
        Esta ruta corresponde a
        la primera visita.

        La segunda visita se procesa
        mediante verificacionController.
        */

        if (
          tareaActiva.etapa ===
          "SEGUNDA_VISITA"
        ) {
          await transaction.rollback();

          return res
            .status(409)
            .json({
              mensaje:
                "Este trabajo corresponde a una segunda visita. Debe utilizarse la verificación posterior al emplazamiento.",
            });
        }
      }


      /*
      |--------------------------------------------------------------------------
      | COMPATIBILIDAD INSPECTOR ACTUAL
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
      | VALIDACIONES DEL ACTA DE VÍA PÚBLICA
      |--------------------------------------------------------------------------
      */

      const debeCrearActa =
        hizoActa === true;


      if (debeCrearActa) {
        if (
          resultado !==
          "CONSTATADO"
        ) {
          await transaction.rollback();

          return res
            .status(400)
            .json({
              mensaje:
                "Solo se puede registrar un Acta de Vía Pública cuando el problema fue constatado.",
            });
        }


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


        const emplazamientoVigente =
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
          emplazamientoVigente
        ) {
          await transaction.rollback();

          return res
            .status(409)
            .json({
              mensaje:
                "Este reclamo ya tiene un emplazamiento vigente.",
            });
        }
      }


      /*
      |--------------------------------------------------------------------------
      | CREAR / ACTUALIZAR VEHÍCULO
      |--------------------------------------------------------------------------
      |
      | Acá estaba lo que nos faltaba.
      |
      | El TipoReclamo "Vehículo" solamente
      | dice QUÉ clase de reclamo es.
      |
      | Ahora además creamos el vehículo
      | real dentro de la tabla vehiculos.
      |
      */

      let vehiculo =
        null;


      if (
        resultado ===
          "CONSTATADO" &&
        esReclamoVehiculo
      ) {
        /*
        Primero buscamos si este reclamo
        ya tiene un vehículo.

        Esto evita duplicarlo si por algún
        motivo se vuelve a guardar.
        */

        vehiculo =
          await Vehiculo.findOne({
            where: {
              reclamoId:
                reclamo.id,
            },

            order: [
              [
                "id",
                "DESC",
              ],
            ],

            transaction,

            lock:
              transaction
                .LOCK.UPDATE,
          });


        /*
        Si todavía no existe,
        generamos número interno.
        */

        if (!vehiculo) {
          const ultimoNumero =
            await Vehiculo.max(
              "numeroInterno",
              {
                transaction,
              }
            );


          const siguienteNumero =
            Number(
              ultimoNumero || 0
            ) + 1;


          vehiculo =
            await Vehiculo.create(
              {
                numeroInterno:
                  siguienteNumero,

                reclamoId:
                  reclamo.id,

                dominio:
                  vehiculoPayload
                    .dominio
                    ? String(
                        vehiculoPayload
                          .dominio
                      )
                        .trim()
                        .toUpperCase() ||
                      null
                    : null,

                marca:
                  vehiculoPayload
                    .marca
                    ? String(
                        vehiculoPayload
                          .marca
                      ).trim() ||
                      null
                    : null,

                modelo:
                  vehiculoPayload
                    .modelo
                    ? String(
                        vehiculoPayload
                          .modelo
                      ).trim() ||
                      null
                    : null,

                color:
                  vehiculoPayload
                    .color
                    ? String(
                        vehiculoPayload
                          .color
                      ).trim() ||
                      null
                    : null,

                tipoVehiculo:
                  vehiculoPayload
                    .tipoVehiculo
                    ? String(
                        vehiculoPayload
                          .tipoVehiculo
                      ).trim() ||
                      null
                    : "AUTOMOVIL",

                descripcion:
                  vehiculoPayload
                    .descripcion
                    ? String(
                        vehiculoPayload
                          .descripcion
                      ).trim() ||
                      null
                    : null,

                estadoActual:
                  "EN_VIA_PUBLICA",
              },
              {
                transaction,
              }
            );
        } else {
          /*
          Si ya existe, actualizamos
          solamente los datos recibidos.
          */

          vehiculo.dominio =
            vehiculoPayload
              .dominio
              ? String(
                  vehiculoPayload
                    .dominio
                )
                  .trim()
                  .toUpperCase() ||
                vehiculo.dominio
              : vehiculo.dominio;


          vehiculo.marca =
            vehiculoPayload
              .marca
              ? String(
                  vehiculoPayload
                    .marca
                ).trim() ||
                vehiculo.marca
              : vehiculo.marca;


          vehiculo.modelo =
            vehiculoPayload
              .modelo
              ? String(
                  vehiculoPayload
                    .modelo
                ).trim() ||
                vehiculo.modelo
              : vehiculo.modelo;


          vehiculo.color =
            vehiculoPayload
              .color
              ? String(
                  vehiculoPayload
                    .color
                ).trim() ||
                vehiculo.color
              : vehiculo.color;


          vehiculo.tipoVehiculo =
            vehiculoPayload
              .tipoVehiculo ||
            vehiculo.tipoVehiculo;


          vehiculo.descripcion =
            vehiculoPayload
              .descripcion
              ? String(
                  vehiculoPayload
                    .descripcion
                ).trim() ||
                vehiculo.descripcion
              : vehiculo.descripcion;


          await vehiculo.save({
            transaction,
          });
        }
      }


      /*
      |--------------------------------------------------------------------------
      | CONSTATACIÓN
      |--------------------------------------------------------------------------
      */

      const constatacion =
        await Constatacion.create(
          {
            reclamoId:
              reclamo.id,

            inspectorId:
              req.usuario.id,

            /*
            Si es reclamo de vehículo,
            dejamos la constatación unida
            al vehículo real.
            */

            vehiculoId:
              vehiculo?.id ||
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
      |--------------------------------------------------------------------------
      | ACTA + EMPLAZAMIENTO
      |--------------------------------------------------------------------------
      */

      if (debeCrearActa) {
        const fechaHora =
          new Date();


        const plazoHoras =
          convertirPlazoAHoras(
            Number(
              plazoCantidad
            ),
            plazoUnidad
          );


        const fechaVencimiento =
          calcularFechaVencimiento(
            fechaHora,
            Number(
              plazoCantidad
            ),
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
        |--------------------------------------------------------------------------
        | ACTA DE VÍA PÚBLICA
        |--------------------------------------------------------------------------
        */

        acta =
          await Acta.create(
            {
              reclamoId:
                reclamo.id,

              constatacionId:
                constatacion.id,

              /*
              También dejamos el Acta
              vinculada al vehículo.
              */

              vehiculoId:
                vehiculo?.id ||
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
        |--------------------------------------------------------------------------
        | EMPLAZAMIENTO
        |--------------------------------------------------------------------------
        */

        emplazamiento =
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

              fechaHora,

              plazoCantidad:
                Number(
                  plazoCantidad
                ),

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


        /*
        Si es vehículo y quedó emplazado,
        actualizamos su situación.
        */

        if (vehiculo) {
          vehiculo.estadoActual =
            "EMPLAZADO";

          await vehiculo.save({
            transaction,
          });
        }
      }


      /*
      |--------------------------------------------------------------------------
      | ESTADO DEL RECLAMO
      |--------------------------------------------------------------------------
      */

      const estadoAnterior =
        reclamo.estado;

      let estadoNuevo;
      let etapaNueva;


      if (
  resultado === "RESUELTO_EN_LUGAR" ||
  resultado === "NO_CONSTATADO"
) {
  /*
  |--------------------------------------------------------------------------
  | LISTO PARA CERRAR POR SECRETARÍA
  |--------------------------------------------------------------------------
  |
  | RESUELTO_EN_LUGAR:
  | El inspector comprobó que el problema ya estaba solucionado.
  |
  | NO_CONSTATADO:
  | El inspector fue al lugar pero no encontró lo denunciado.
  |
  | En ambos casos la actuación del inspector termina y el reclamo
  | pasa a la misma bandeja que Secretaría ya utiliza para cerrar.
  |
  | El resultado de la constatación NO se modifica, por lo tanto
  | Secretaría puede distinguir qué ocurrió.
  |
  */

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
  debeCrearActa
) {
        /*
        El inspector terminó su primera
        visita, pero el reclamo sigue.

        Ahora se espera el vencimiento
        del emplazamiento.
        */

        estadoNuevo =
          "EN_SEGUIMIENTO";

        etapaNueva =
          "ESPERANDO_PLAZO";
      } else {
        /*
        No se resolvió automáticamente.
        El jefe deberá decidir cómo sigue.
        */

        estadoNuevo =
          "PENDIENTE_ACTUACION";

        etapaNueva =
          "PENDIENTE_DECISION_JEFE";
      }


      reclamo.estado =
        estadoNuevo;

      reclamo.etapaActual =
        etapaNueva;


      /*
      |--------------------------------------------------------------------------
      | LIBERAR INSPECTOR ACTUAL
      |--------------------------------------------------------------------------
      |
      | La salida terminó.
      |
      | El reclamo puede seguir activo,
      | pero esta tarea del inspector
      | ya terminó.
      |
      */

      reclamo.inspectorId =
        null;


      await reclamo.save({
        transaction,
      });


      /*
      |--------------------------------------------------------------------------
      | FINALIZAR TAREA
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

      let descripcion =
        "El inspector registró y finalizó su visita.";


      if (
        resultado ===
        "RESUELTO_EN_LUGAR"
      ) {
        descripcion =
          "El inspector verificó que el problema ya estaba solucionado. La visita quedó finalizada.";
      }


      if (
        resultado ===
        "NO_CONSTATADO"
      ) {
        descripcion =
          "El inspector realizó la visita pero no encontró el problema denunciado. Su tarea quedó finalizada.";
      }


      if (
        resultado ===
        "NO_SE_PUDO_VERIFICAR"
      ) {
        descripcion =
          "El inspector no pudo verificar el reclamo. Su tarea quedó finalizada y requiere decisión del jefe.";
      }


      if (
        resultado ===
          "CONSTATADO" &&
        !debeCrearActa
      ) {
        descripcion =
          esReclamoVehiculo &&
          vehiculo
            ? `El inspector constató el reclamo y registró el vehículo interno N.º ${vehiculo.numeroInterno}. No realizó Acta de Vía Pública.`
            : "El inspector constató que el problema continúa, pero no realizó Acta de Vía Pública. Su tarea quedó finalizada.";
      }


      if (
        resultado ===
          "CONSTATADO" &&
        debeCrearActa
      ) {
        descripcion =
          esReclamoVehiculo &&
          vehiculo
            ? `Primera visita finalizada. Se registró el vehículo interno N.º ${vehiculo.numeroInterno}, se realizó el Acta de Vía Pública ${acta.numeroActa} y comenzó el plazo del emplazamiento.`
            : `Primera visita finalizada. Se realizó el Acta de Vía Pública ${acta.numeroActa} y comenzó el plazo del emplazamiento.`;
      }


      await registrarHistorial({
        reclamoId:
          reclamo.id,

        usuarioId:
          req.usuario.id,

        accion:
          debeCrearActa
            ? "PRIMERA_VISITA_FINALIZADA_CON_ACTA"
            : "PRIMERA_VISITA_FINALIZADA",

        descripcion,

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

      return res
        .status(201)
        .json({
          ok: true,

          mensaje:
            debeCrearActa
              ? "Primera visita finalizada. El reclamo quedó esperando el vencimiento del plazo."
              : "Visita finalizada correctamente.",

          constatacion,

          acta,

          emplazamiento,

          /*
          Esto nos permite comprobar
          desde frontend que realmente
          quedó creado.
          */

          vehiculo,

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
      | ÚLTIMA CONSTATACIÓN DE PRIMERA VISITA
      |--------------------------------------------------------------------------
      */

      const constatacion =
        await Constatacion.findOne({
          where: {
            reclamoId:
              reclamo.id,
          },

          order: [
            [
              "createdAt",
              "ASC",
            ],
          ],
        });


      if (!constatacion) {
        return res.json({
          ok: true,

          realizada: false,

          puedeEditar: false,

          minutosRestantes: 0,

          visita: null,
        });
      }


      /*
      |--------------------------------------------------------------------------
      | SEGURIDAD DEL INSPECTOR
      |--------------------------------------------------------------------------
      |
      | Un inspector solamente puede consultar
      | su propia primera visita desde esta ruta.
      |
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
      | ACTA DE VÍA PÚBLICA
      |--------------------------------------------------------------------------
      */

      const acta =
        await Acta.findOne({
          where: {
            constatacionId:
              constatacion.id,

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
              "DESC",
            ],
          ],
        });


      /*
      |--------------------------------------------------------------------------
      | EMPLAZAMIENTO
      |--------------------------------------------------------------------------
      */

      const emplazamiento =
        acta
          ? await Emplazamiento.findOne({
              where: {
                actaId:
                  acta.id,
              },

              order: [
                [
                  "createdAt",
                  "DESC",
                ],
              ],
            })
          : null;


      /*
      |--------------------------------------------------------------------------
      | VEHÍCULO
      |--------------------------------------------------------------------------
      */

      const vehiculo =
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
        });


      /*
      |--------------------------------------------------------------------------
      | VENTANA DE EDICIÓN
      |--------------------------------------------------------------------------
      |
      | Se cuentan 60 minutos desde
      | la creación de la constatación.
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


      return res.json({
        ok: true,

        realizada: true,

        puedeEditar,

        minutosRestantes,

        fechaLimiteEdicion:
          limiteEdicion,

        visita: {
          constatacion,

          acta,

          emplazamiento,

          vehiculo,
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

        personaEncontrada,
        atendidoPor,
        caracterAtendido,

        vehiculo:
          vehiculoPayload,
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
      | CONSTATACIÓN ORIGINAL
      |--------------------------------------------------------------------------
      */

      const constatacion =
        await Constatacion.findOne({
          where: {
            reclamoId:
              reclamo.id,
          },

          order: [
            [
              "createdAt",
              "ASC",
            ],
          ],

          transaction,

          lock:
            transaction
              .LOCK.UPDATE,
        });


      if (!constatacion) {
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
          constatacion.inspectorId
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
            constatacion.createdAt
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
      | QUÉ PERMITIMOS CORREGIR
      |--------------------------------------------------------------------------
      |
      | No modificamos:
      |
      | - resultado
      | - si hizo Acta o no
      | - número del Acta
      | - plazo del emplazamiento
      |
      | Porque esas decisiones ya modificaron
      | el flujo administrativo del reclamo.
      |
      | Sí permitimos corregir datos descriptivos.
      |
      */

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
            observaciones || ""
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


      /*
      |--------------------------------------------------------------------------
      | ACTA
      |--------------------------------------------------------------------------
      |
      | Si hubo Acta, permitimos corregir
      | quién atendió y observaciones.
      |
      | NO cambiamos número ni plazo.
      |
      */

      const acta =
        await Acta.findOne({
          where: {
            constatacionId:
              constatacion.id,

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

          transaction,

          lock:
            transaction
              .LOCK.UPDATE,
        });


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
                  atendidoPor || ""
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
              observaciones || ""
            ).trim() ||
            null;
        }


        await acta.save({
          transaction,
        });
      }


      /*
      |--------------------------------------------------------------------------
      | VEHÍCULO
      |--------------------------------------------------------------------------
      */

      let vehiculo =
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


      if (
        vehiculo &&
        vehiculoPayload &&
        typeof vehiculoPayload ===
          "object"
      ) {
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
          "PRIMERA_VISITA_EDITADA",

        descripcion:
          "Se corrigieron datos de la primera visita dentro del plazo permitido.",

        estadoAnterior:
          reclamo.estado,

        estadoNuevo:
          reclamo.estado,

        transaction,
      });


      await transaction.commit();


      return res.json({
        ok: true,

        mensaje:
          "La visita fue actualizada correctamente.",

        constatacion,

        acta,

        vehiculo,
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
        });
    }
  };

module.exports = {
  registrarVisita,
  obtenerPrimeraVisita,
  editarPrimeraVisita,
};