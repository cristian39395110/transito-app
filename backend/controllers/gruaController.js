const {
  Op,
} = require("sequelize");

const {
  sequelize,
  Reclamo,
  Asignacion,
  Usuario,
} = require("../models");

const {
  ACCION_RETIRO_GRUA,
  buscarRetirosPendientes,
  buscarConOrdenParaGrua,
  buscarSegundasVisitasParaGrua,
  avisarGruaEnSegundoPlano,
} = require(
  "../services/gruaService"
);

const {
  enviarCorreo,
} = require(
  "../services/emailService"
);

const {
  registrarHistorial,
} = require(
  "../services/historialService"
);

/*
|--------------------------------------------------------------------------
| VEHÍCULOS LISTOS PARA RETIRAR CON GRÚA
|--------------------------------------------------------------------------
|
| Solo lectura. Lista los vehículos que quedaron marcados
| como "Lo retira la grúa":
|
| - desde la segunda visita del inspector;
| - o después de que el juez autorizó la remoción.
|
| El retiro en sí se registra con la ruta de remoción
| existente: POST /api/remociones/completa
|
*/

const listarRetirosPendientes =
  async (req, res) => {
    try {
      const infracciones =
        await buscarRetirosPendientes();

      const retiros =
        infracciones.map(
          (infraccion) => {
            const datos =
              infraccion.toJSON();

            return {
              infraccionId:
                datos.id,

              numeroActa:
                datos.numeroActa,

              fechaActa:
                datos.fechaHora,

              motivo:
                datos.motivo,

              detalle:
                datos.detalleAccionPosterior,

              conOrdenJudicial:
                datos.estadoOrdenRemocion ===
                "AUTORIZADA",

              lugar:
                datos.lugar,

              inspector:
                datos.inspector || null,

              reclamo:
                datos.reclamo,

              vehiculo:
                datos.vehiculo,
            };
          }
        );

      return res.json({
        ok: true,
        total:
          retiros.length,
        retiros,
      });
    } catch (error) {
      console.error(
        "Error listando retiros de grúa:",
        error
      );

      return res.status(500).json({
        ok: false,
        mensaje:
          "Error obteniendo los vehículos para retirar",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| DESPUÉS DE LA ORDEN DEL JUEZ: ¿HAY VEHÍCULOS PARA MANDAR A LA GRÚA?
|--------------------------------------------------------------------------
*/

const ETAPAS_POST_JUZGADO = [
  "PENDIENTE_ASIGNACION_POST_JUZGADO",
  "POST_JUZGADO_ASIGNADO_GUARDIA",
  "POST_JUZGADO_EN_ACTUACION",
];

/*
| Quién puede mandar a la grúa, según la etapa:
|
| - administrador: en cualquier etapa posterior al Juzgado;
| - director: cuando el expediente volvió del Juzgado
|   y todavía no eligió guardia;
| - jefe de guardia: el jefe que tiene el expediente;
| - inspector: el que tiene asignada la actuación.
*/

const puedeMandarAGrua = (
  reclamo,
  usuario
) => {
  const rol =
    usuario?.rol;

  const usuarioId =
    Number(usuario?.id);

  const etapa =
    reclamo.etapaActual;

  if (
    !ETAPAS_POST_JUZGADO.includes(
      etapa
    )
  ) {
    return false;
  }

  if (
    [
      "administrador",
      "superadmin",
    ].includes(rol)
  ) {
    return true;
  }

  if (rol === "director") {
    return (
      etapa ===
      "PENDIENTE_ASIGNACION_POST_JUZGADO"
    );
  }

  if (rol === "jefe_guardia") {
    return (
      Number(
        reclamo.jefeGuardiaId
      ) === usuarioId &&
      [
        "POST_JUZGADO_ASIGNADO_GUARDIA",
        "POST_JUZGADO_EN_ACTUACION",
      ].includes(etapa)
    );
  }

  if (rol === "inspector") {
    return (
      Number(
        reclamo.inspectorId
      ) === usuarioId &&
      etapa ===
        "POST_JUZGADO_EN_ACTUACION"
    );
  }

  return false;
};

const listarConOrdenParaGrua =
  async (req, res) => {
    try {
      const reclamo =
        await Reclamo.findByPk(
          req.params.reclamoId
        );

      if (!reclamo) {
        return res.status(404).json({
          ok: false,
          mensaje:
            "Reclamo no encontrado",
        });
      }

      const puede =
        puedeMandarAGrua(
          reclamo,
          req.usuario
        );

      const infracciones =
        puede
          ? await buscarConOrdenParaGrua({
              reclamoId:
                reclamo.id,
            })
          : [];

      return res.json({
        ok: true,

        puedeMandarAGrua:
          puede &&
          infracciones.length > 0,

        vehiculos:
          infracciones.map(
            (item) => ({
              infraccionId:
                item.id,

              numeroActa:
                item.numeroActa,

              vehiculo:
                item.vehiculo,
            })
          ),
      });
    } catch (error) {
      console.error(
        "Error buscando vehículos con orden para grúa:",
        error
      );

      return res.status(500).json({
        ok: false,
        mensaje:
          "Error buscando vehículos con orden judicial",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| DESPUÉS DE LA ORDEN DEL JUEZ: MANDAR A LA GRÚA
|--------------------------------------------------------------------------
|
| El acta pasa a "Lo retira la grúa" (la orden judicial
| queda registrada igual). Si ya no queda ningún vehículo
| con orden para retirar por otra vía, el reclamo queda
| esperando a la grúa y se cierra la actuación del
| inspector (si había una).
|
*/

const mandarAGruaConOrden =
  async (req, res) => {
    const transaction =
      await sequelize.transaction();

    const rechazar = async (
      status,
      mensaje
    ) => {
      await transaction.rollback();

      return res.status(status).json({
        ok: false,
        mensaje,
      });
    };

    try {
      const reclamo =
        await Reclamo.findByPk(
          req.params.reclamoId,
          {
            transaction,
            lock:
              transaction.LOCK.UPDATE,
          }
        );

      if (!reclamo) {
        return rechazar(
          404,
          "Reclamo no encontrado"
        );
      }

      if (
        !puedeMandarAGrua(
          reclamo,
          req.usuario
        )
      ) {
        return rechazar(
          403,
          "En esta etapa no podés mandar el vehículo a la grúa"
        );
      }

      const infraccionId =
        Number(
          req.body?.infraccionId
        ) || null;

      const aEnviar =
        await buscarConOrdenParaGrua({
          reclamoId:
            reclamo.id,
          infraccionId,
          transaction,
        });

      if (!aEnviar.length) {
        return rechazar(
          409,
          "No hay vehículos con orden judicial autorizada para retirar en este reclamo"
        );
      }

      for (const infraccion of aEnviar) {
        infraccion.accionPosterior =
          ACCION_RETIRO_GRUA;

        await infraccion.save({
          transaction,
        });
      }

      /*
      | ¿Queda algún otro vehículo con orden
      | que siga por el camino normal?
      */

      const quedan =
        await buscarConOrdenParaGrua({
          reclamoId:
            reclamo.id,
          transaction,
        });

      const estadoAnterior =
        reclamo.estado;

      if (!quedan.length) {
        /*
        | Cerrar la actuación del inspector
        | posterior al Juzgado, si había una.
        */

        const tareas =
          await Asignacion.findAll({
            where: {
              reclamoId:
                reclamo.id,

              tipo:
                "INSPECTOR",

              estadoTarea: {
                [Op.in]: [
                  "PENDIENTE",
                  "EN_CURSO",
                ],
              },
            },

            transaction,
          });

        for (const tarea of tareas) {
          const esPropia =
            Number(
              tarea.asignadoAId
            ) ===
            Number(req.usuario.id);

          tarea.estadoTarea =
            esPropia
              ? "FINALIZADA"
              : "CANCELADA";

          tarea.fechaFinalizacion =
            new Date();

          tarea.observaciones =
            [
              tarea.observaciones,
              "Vehículo enviado a la grúa.",
            ]
              .filter(Boolean)
              .join(" ");

          await tarea.save({
            transaction,
          });
        }

        reclamo.estado =
          "PENDIENTE_ACTUACION";

        reclamo.etapaActual =
          "PENDIENTE_REMOCION";

        reclamo.inspectorId =
          null;

        reclamo.fechaResolucion =
          null;

        await reclamo.save({
          transaction,
        });
      }

      const dominios =
        aEnviar
          .map(
            (item) =>
              item.vehiculo
                ?.dominio ||
              `N.º ${item.vehiculo?.numeroInterno || item.vehiculoId}`
          )
          .join(", ");

      await registrarHistorial({
        reclamoId:
          reclamo.id,

        usuarioId:
          req.usuario.id,

        accion:
          "ENVIO_GRUA_CON_ORDEN",

        descripcion:
          `Con orden judicial autorizada, se mandó a la grúa: ${dominios}`,

        estadoAnterior,

        estadoNuevo:
          reclamo.estado,

        transaction,
      });

      await transaction.commit();

      for (const infraccion of aEnviar) {
        avisarGruaEnSegundoPlano({
          reclamo,
          vehiculo:
            infraccion.vehiculo,
          infraccion,
        });
      }

      return res.json({
        ok: true,

        mensaje:
          aEnviar.length === 1
            ? "Listo. El vehículo quedó para la grúa y se le avisó por email."
            : `Listo. ${aEnviar.length} vehículos quedaron para la grúa y se le avisó por email.`,

        enviados:
          aEnviar.length,

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
        "Error mandando a la grúa con orden:",
        error
      );

      return res.status(500).json({
        ok: false,
        mensaje:
          "Error mandando el vehículo a la grúa",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| SEGUNDAS VISITAS QUE PUEDE HACER LA GRÚA
|--------------------------------------------------------------------------
*/

const listarSegundasVisitas =
  async (req, res) => {
    try {
      const visitas =
        await buscarSegundasVisitasParaGrua({
          usuarioId:
            req.usuario.id,
        });

      return res.json({
        ok: true,
        total:
          visitas.length,
        visitas,
      });
    } catch (error) {
      console.error(
        "Error listando segundas visitas para grúa:",
        error
      );

      return res.status(500).json({
        ok: false,
        mensaje:
          "Error obteniendo las segundas visitas",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| LA GRÚA TOMA UNA SEGUNDA VISITA
|--------------------------------------------------------------------------
|
| Queda asignada a la grúa como si fuera un inspector:
| se crea su tarea de SEGUNDA_VISITA y el reclamo pasa
| a estar "en segunda visita" a su nombre.
|
| Si estaba asignada a un inspector que todavía no empezó,
| se le cancela la tarea y se le avisa por email.
|
*/

const tomarSegundaVisita =
  async (req, res) => {
    const transaction =
      await sequelize.transaction();

    const rechazar = async (
      status,
      mensaje
    ) => {
      await transaction.rollback();

      return res.status(status).json({
        ok: false,
        mensaje,
      });
    };

    try {
      const reclamo =
        await Reclamo.findByPk(
          req.params.reclamoId,
          {
            transaction,
            lock:
              transaction.LOCK.UPDATE,
          }
        );

      if (!reclamo) {
        return rechazar(
          404,
          "Reclamo no encontrado"
        );
      }

      const [visita] =
        await buscarSegundasVisitasParaGrua({
          usuarioId:
            req.usuario.id,
          reclamoId:
            reclamo.id,
          transaction,
        });

      if (!visita) {
        return rechazar(
          409,
          "Este reclamo ya no tiene una segunda visita pendiente"
        );
      }

      if (visita.esMia) {
        await transaction.commit();

        return res.json({
          ok: true,
          mensaje:
            "Ya tenés tomada esta visita",
          reclamoId:
            reclamo.id,
        });
      }

      if (!visita.puedeTomar) {
        return rechazar(
          409,
          visita.asignadoA?.nombre
            ? `${visita.asignadoA.nombre} ya está haciendo esta visita`
            : "Alguien ya está haciendo esta visita"
        );
      }

      /*
      | Cancelar la tarea del inspector que
      | todavía no había empezado.
      */

      let inspectorAnterior = null;

      if (visita.tareaId) {
        const tareaAnterior =
          await Asignacion.findByPk(
            visita.tareaId,
            {
              transaction,
              lock:
                transaction.LOCK.UPDATE,
            }
          );

        if (
          tareaAnterior &&
          [
            "PENDIENTE",
            "EN_CURSO",
          ].includes(
            tareaAnterior.estadoTarea
          )
        ) {
          tareaAnterior.estadoTarea =
            "CANCELADA";

          tareaAnterior.fechaFinalizacion =
            new Date();

          tareaAnterior.observaciones =
            [
              tareaAnterior.observaciones,
              "La tomó la grúa.",
            ]
              .filter(Boolean)
              .join(" ");

          await tareaAnterior.save({
            transaction,
          });

          inspectorAnterior =
            await Usuario.findByPk(
              tareaAnterior.asignadoAId,
              {
                attributes: [
                  "id",
                  "nombre",
                  "email",
                ],
                transaction,
              }
            );
        }
      }

      await Asignacion.create(
        {
          reclamoId:
            reclamo.id,

          tipo:
            "INSPECTOR",

          etapa:
            "SEGUNDA_VISITA",

          estadoTarea:
            "EN_CURSO",

          asignadoAId:
            req.usuario.id,

          asignadoPorId:
            req.usuario.id,

          observaciones:
            "La tomó la grúa.",

          fechaFinalizacion:
            null,
        },
        {
          transaction,
        }
      );

      const estadoAnterior =
        reclamo.estado;

      reclamo.estado =
        "ASIGNADO_INSPECTOR";

      reclamo.etapaActual =
        "SEGUNDA_VISITA";

      reclamo.inspectorId =
        req.usuario.id;

      await reclamo.save({
        transaction,
      });

      await registrarHistorial({
        reclamoId:
          reclamo.id,

        usuarioId:
          req.usuario.id,

        accion:
          "GRUA_TOMA_SEGUNDA_VISITA",

        descripcion:
          inspectorAnterior
            ? `La grúa tomó la segunda visita (estaba asignada a ${inspectorAnterior.nombre})`
            : "La grúa tomó la segunda visita",

        estadoAnterior,

        estadoNuevo:
          reclamo.estado,

        transaction,
      });

      await transaction.commit();

      /*
      | Aviso al inspector que tenía la visita.
      | En segundo plano: si falla, no se rompe nada.
      */

      if (inspectorAnterior?.email) {
        setImmediate(() => {
          enviarCorreo({
            para:
              inspectorAnterior.email,

            asunto:
              `La grúa tomó la segunda visita - Reclamo N° ${reclamo.numeroReclamo}`,

            texto:
              `Hola ${inspectorAnterior.nombre}.\n\n` +
              `La grúa tomó la segunda visita del reclamo N° ${reclamo.numeroReclamo} ` +
              `(${reclamo.direccion || "sin dirección"}).\n\n` +
              `Ya no tenés que ir: ese trabajo salió de tu lista.\n\n` +
              `Este es un mensaje automático. No es necesario responder.`,
          }).catch((errorMail) => {
            console.error(
              "No se pudo avisar al inspector:",
              errorMail.message
            );
          });
        });
      }

      return res.json({
        ok: true,

        mensaje:
          inspectorAnterior
            ? `Tomaste la visita. ${inspectorAnterior.nombre} ya no la tiene.`
            : "Tomaste la visita.",

        reclamoId:
          reclamo.id,
      });
    } catch (error) {
      if (
        !transaction.finished
      ) {
        await transaction.rollback();
      }

      console.error(
        "Error tomando segunda visita:",
        error
      );

      return res.status(500).json({
        ok: false,
        mensaje:
          "Error tomando la segunda visita",
      });
    }
  };

module.exports = {
  listarRetirosPendientes,
  listarConOrdenParaGrua,
  mandarAGruaConOrden,
  listarSegundasVisitas,
  tomarSegundaVisita,
};
