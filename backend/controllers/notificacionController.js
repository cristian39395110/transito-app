const {
  Op,
} = require("sequelize");

const {
  Reclamo,
  Asignacion,
  Infraccion,
  Vehiculo,
} = require("../models");

const {
  actualizarVencidos,
} = require(
  "../services/emplazamientoService"
);

const {
  buscarRetirosPendientes,
  buscarSegundasVisitasParaGrua,
} = require(
  "../services/gruaService"
);

const ETAPAS_FUERA_RECLAMOS = [
  "EN_PREDIO",
  "EGRESADO",
  "FINALIZADO",
  "ANULADO",
];

const ETAPAS_ACCION_ADMIN = [
  "PENDIENTE_ASIGNACION_GUARDIA",
  "PENDIENTE_PRIMERA_VISITA",
  "PENDIENTE_SEGUNDA_VISITA",
  "PENDIENTE_DECISION_JEFE",
  "PENDIENTE_ENVIO_JUZGADO",
  "PENDIENTE_ASIGNACION_POST_JUZGADO",
  "POST_JUZGADO_ASIGNADO_GUARDIA",
  "PENDIENTE_REMOCION",
  "PENDIENTE_INGRESO_PREDIO",
];

const obtenerResumen =
  async (req, res) => {
    try {
      /*
      |--------------------------------------------------------------------------
      | ACTUALIZAR PLAZOS
      |--------------------------------------------------------------------------
      |
      | Antes de contar, actualizamos los
      | emplazamientos que ya vencieron.
      |
      */

      try {
        await actualizarVencidos();
      } catch (error) {
        console.error(
          "Error actualizando vencimientos:",
          error
        );
      }

      const usuarioId =
        Number(req.usuario.id);

      const rol =
        req.usuario.rol;

      /*
      |--------------------------------------------------------------------------
      | RECLAMOS ACTIVOS
      |--------------------------------------------------------------------------
      */

      const reclamos =
        await Reclamo.findAll({
          where: {
            [Op.and]: [
              {
                estado: {
                  [Op.notIn]: [
                    "RESUELTO",
                    "ANULADO",
                  ],
                },
              },

              {
                [Op.or]: [
                  {
                    estadoExterno:
                      null,
                  },

                  {
                    estadoExterno: {
                      [Op.notIn]: [
                        "LISTO_PARA_CERRAR",
                        "CERRADO",
                      ],
                    },
                  },
                ],
              },

              {
                [Op.or]: [
                  {
                    etapaActual:
                      null,
                  },

                  {
                    etapaActual: {
                      [Op.notIn]:
                        ETAPAS_FUERA_RECLAMOS,
                    },
                  },
                ],
              },
            ],
          },

          attributes: [
            "id",
            "etapaActual",
            "jefeGuardiaId",
          ],
        });

      /*
      |--------------------------------------------------------------------------
      | RETIROS GRÚA
      |--------------------------------------------------------------------------
      |
      | Vehículos con Acta de Infracción que el inspector
      | dejó listos para que los retire la grúa.
      |
      | Si lo único pendiente de un reclamo es que pase
      | la grúa, NO se cuenta como trabajo de la guardia.
      |
      */

      let retirosPendientesGrua = [];

      if (
        [
          "grua",
          "administrador",
          "superadmin",
          "director",
          "jefe_guardia",
        ].includes(rol)
      ) {
        try {
          retirosPendientesGrua =
            await buscarRetirosPendientes();
        } catch (error) {
          console.error(
            "Error contando retiros de grúa:",
            error
          );
        }
      }

      const reclamosEsperandoGrua =
        new Set(
          retirosPendientesGrua.map(
            (item) =>
              Number(item.reclamoId)
          )
        );

      const esperaSoloGrua = (
        reclamo
      ) =>
        reclamo.etapaActual ===
          "PENDIENTE_REMOCION" &&
        reclamosEsperandoGrua.has(
          Number(reclamo.id)
        );

      /*
      | Al gruyero también le contamos las segundas
      | visitas que puede tomar o que ya tiene tomadas.
      */

      let visitasGrua = 0;

      if (rol === "grua") {
        try {
          visitasGrua =
            (
              await buscarSegundasVisitasParaGrua({
                usuarioId,
              })
            ).filter(
              (item) =>
                item.puedeTomar ||
                item.esMia
            ).length;
        } catch (error) {
          console.error(
            "Error contando segundas visitas de grúa:",
            error
          );
        }
      }

      const retirosGrua =
        retirosPendientesGrua.length +
        visitasGrua;

      /*
      |--------------------------------------------------------------------------
      | CONTADOR RECLAMOS
      |--------------------------------------------------------------------------
      |
      | Mismo concepto de la bandeja:
      | solamente cosas que requieren acción.
      |
      */

      let cantidadReclamos = 0;

      if (
        rol === "administrador"
      ) {
        cantidadReclamos =
          reclamos.filter(
            (reclamo) =>
              ETAPAS_ACCION_ADMIN.includes(
                reclamo.etapaActual
              ) &&
              !esperaSoloGrua(reclamo)
          ).length;
      }

      if (
        rol === "director"
      ) {
        cantidadReclamos =
          reclamos.filter(
            (reclamo) =>
              [
                "PENDIENTE_ASIGNACION_GUARDIA",
                "PENDIENTE_ASIGNACION_POST_JUZGADO",
              ].includes(
                reclamo.etapaActual
              )
          ).length;
      }

      if (
        rol ===
        "secretaria_reclamos"
      ) {
        cantidadReclamos =
          reclamos.filter(
            (reclamo) =>
              reclamo.etapaActual ===
              "PENDIENTE_ENVIO_JUZGADO"
          ).length;
      }

      /*
      |--------------------------------------------------------------------------
      | JUZGADO
      |--------------------------------------------------------------------------
      |
      | Mostramos aviso solamente cuando
      | Secretaría tiene algo para enviar.
      |
      */

      const juzgado =
        await Infraccion.count({
          where: {
            estadoJuzgado:
              "PENDIENTE_ENVIO",

            anulada: {
              [Op.not]: true,
            },
          },
        });

      /*
      |--------------------------------------------------------------------------
      | PARA CERRAR
      |--------------------------------------------------------------------------
      */

      const paraCerrar =
        await Reclamo.count({
          where: {
            estadoExterno:
              "LISTO_PARA_CERRAR",
          },
        });

      /*
      |--------------------------------------------------------------------------
      | MI GUARDIA
      |--------------------------------------------------------------------------
      |
      | Trabajo de mi guardia +
      | controles vencidos disponibles
      | para cualquier jefe.
      |
      */

      let miGuardia = 0;

      if (
        rol === "jefe_guardia" ||
        rol === "administrador"
      ) {
        if (
          rol === "administrador"
        ) {
          miGuardia =
            reclamos.filter(
              (reclamo) =>
                [
                  "PENDIENTE_PRIMERA_VISITA",
                  "PENDIENTE_SEGUNDA_VISITA",
                  "PENDIENTE_DECISION_JEFE",
                  "POST_JUZGADO_ASIGNADO_GUARDIA",
                  "PENDIENTE_REMOCION",
                ].includes(
                  reclamo.etapaActual
                ) &&
                !esperaSoloGrua(reclamo)
            ).length;
        } else {
          miGuardia =
            reclamos.filter(
              (reclamo) => {
                if (
                  reclamo.etapaActual ===
                  "PENDIENTE_SEGUNDA_VISITA"
                ) {
                  return true;
                }

                if (
                  esperaSoloGrua(reclamo)
                ) {
                  return false;
                }

                return (
                  Number(
                    reclamo.jefeGuardiaId
                  ) === usuarioId &&
                  [
                    "PENDIENTE_PRIMERA_VISITA",
                    "PENDIENTE_DECISION_JEFE",
                    "POST_JUZGADO_ASIGNADO_GUARDIA",
                    "PENDIENTE_REMOCION",
                  ].includes(
                    reclamo.etapaActual
                  )
                );
              }
            ).length;
        }
      }

      /*
      |--------------------------------------------------------------------------
      | MIS TRABAJOS
      |--------------------------------------------------------------------------
      |
      | Solamente tareas activas.
      |
      */

      let misTrabajos = 0;

      if (
        rol === "inspector"
      ) {
        misTrabajos =
          await Asignacion.count({
            where: {
              tipo:
                "INSPECTOR",

              asignadoAId:
                usuarioId,

              estadoTarea: {
                [Op.in]: [
                  "PENDIENTE",
                  "EN_CURSO",
                ],
              },
            },
          });
      }

      /*
      |--------------------------------------------------------------------------
      | ADMINISTRADOR
      |--------------------------------------------------------------------------
      |
      | Como el administrador puede entrar
      | a Mis trabajos, contamos todas las
      | tareas activas de inspectores.
      |
      */

      if (
        rol === "administrador"
      ) {
        misTrabajos =
          await Asignacion.count({
            where: {
              tipo:
                "INSPECTOR",

              estadoTarea: {
                [Op.in]: [
                  "PENDIENTE",
                  "EN_CURSO",
                ],
              },
            },
          });
      }

      /*
      |--------------------------------------------------------------------------
      | PREDIO
      |--------------------------------------------------------------------------
      |
      | Vehículos que llegaron del circuito
      | de remoción y todavía falta ingresar.
      |
      */

      const predio =
        await Vehiculo.count({
          where: {
            estadoActual:
              "PENDIENTE_INGRESO_PREDIO",
          },
        });

      /*
      |--------------------------------------------------------------------------
      | RESPUESTA ÚNICA
      |--------------------------------------------------------------------------
      */

      return res.json({
        ok: true,

        contadores: {
          reclamos:
            cantidadReclamos,

          juzgado,

          paraCerrar,

          miGuardia,

          misTrabajos,

          predio,

          retirosGrua,
        },
      });
    } catch (error) {
      console.error(
        "Error obteniendo resumen de notificaciones:",
        error
      );

      return res
        .status(500)
        .json({
          ok: false,

          mensaje:
            "No se pudieron obtener los contadores",
        });
    }
  };

module.exports = {
  obtenerResumen,
};