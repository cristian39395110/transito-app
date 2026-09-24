const {
  Op,
} = require("sequelize");

const {
  sequelize,
  Reclamo,
  Usuario,
  Rol,
  Asignacion,
} = require("../models");

const {
  registrarHistorial,
} = require(
  "../services/historialService"
);

const {
  actualizarVencidos,
} = require(
  "../services/emplazamientoService"
);


/* =========================================================
   HELPERS
========================================================= */

const obtenerEtapaAsignacionJefe = (
  etapaActual
) => {
  if (
    etapaActual ===
    "PENDIENTE_SEGUNDA_VISITA"
  ) {
    return "SEGUNDA_VISITA";
  }

  if (
    etapaActual ===
      "PENDIENTE_ASIGNACION_POST_JUZGADO" ||
    etapaActual ===
      "POST_JUZGADO_ASIGNADO_GUARDIA"
  ) {
    return "POST_JUZGADO";
  }

  return "PRIMERA_VISITA";
};


const obtenerDescripcionEtapa = (
  etapa
) => {
  const textos = {
    PRIMERA_VISITA:
      "primera visita",

    SEGUNDA_VISITA:
      "segunda visita",

    POST_JUZGADO:
      "actuación posterior al Juzgado",
  };

  return (
    textos[etapa] ||
    "actuación"
  );
};


/* =========================================================
   DIRECTOR -> JEFE DE GUARDIA
========================================================= */

const asignarJefeGuardia =
  async (
    req,
    res
  ) => {
    const transaction =
      await sequelize.transaction();

    try {
      const {
        id,
      } = req.params;

      const {
        jefeGuardiaId,
        observaciones,
      } = req.body;


      /* =====================================================
         VALIDAR
      ===================================================== */

      if (
        !jefeGuardiaId
      ) {
        await transaction.rollback();

        return res
          .status(400)
          .json({
            ok: false,

            mensaje:
              "Debe seleccionar un jefe de guardia",
          });
      }


      /* =====================================================
         RECLAMO
      ===================================================== */

      const reclamo =
        await Reclamo.findByPk(
          id,
          {
            transaction,

            lock:
              transaction
                .LOCK.UPDATE,
          }
        );


      if (
        !reclamo
      ) {
        await transaction.rollback();

        return res
          .status(404)
          .json({
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

        return res
          .status(400)
          .json({
            ok: false,

            mensaje:
              "No se puede asignar un reclamo finalizado",
          });
      }


      /* =====================================================
         VALIDAR JEFE
      ===================================================== */

      const jefe =
        await Usuario.findByPk(
          jefeGuardiaId,
          {
            include: [
              {
                model: Rol,
                as: "rol",
              },
            ],

            transaction,
          }
        );


      if (
        !jefe ||
        !jefe.activo ||
        jefe.rol?.nombre !==
          "jefe_guardia"
      ) {
        await transaction.rollback();

        return res
          .status(400)
          .json({
            ok: false,

            mensaje:
              "El usuario seleccionado no es un jefe de guardia válido",
          });
      }


      /* =====================================================
         NO CAMBIAR JEFE SI HAY INSPECTOR TRABAJANDO
      ===================================================== */

      const tareaInspectorActiva =
        await Asignacion.findOne({
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


      if (
        tareaInspectorActiva
      ) {
        await transaction.rollback();

        return res
          .status(409)
          .json({
            ok: false,

            mensaje:
              "El reclamo ya tiene una tarea activa asignada a un inspector.",
          });
      }


      /* =====================================================
         DETERMINAR ETAPA REAL
      ===================================================== */

      const etapaAnterior =
        reclamo.etapaActual;

      const estadoAnterior =
        reclamo.estado;


      const esSegundaVisita =
        etapaAnterior ===
        "PENDIENTE_SEGUNDA_VISITA";


      const esPostJuzgado =
        etapaAnterior ===
          "PENDIENTE_ASIGNACION_POST_JUZGADO" ||
        etapaAnterior ===
          "POST_JUZGADO_ASIGNADO_GUARDIA";


      const etapaAsignacion =
        obtenerEtapaAsignacionJefe(
          etapaAnterior
        );


      /* =====================================================
         ACTUALIZAR RESPONSABLE
      ===================================================== */

      reclamo.jefeGuardiaId =
        jefe.id;

      reclamo.inspectorId =
        null;

      reclamo.estado =
        "ASIGNADO_GUARDIA";


      /*
      |--------------------------------------------------------------------------
      | MUY IMPORTANTE
      |--------------------------------------------------------------------------
      |
      | No volver al comienzo si ya pasó por
      | segunda visita o por Juzgado.
      |
      */

      if (
        esPostJuzgado
      ) {
        reclamo.etapaActual =
          "POST_JUZGADO_ASIGNADO_GUARDIA";
      } else if (
        esSegundaVisita
      ) {
        reclamo.etapaActual =
          "PENDIENTE_SEGUNDA_VISITA";
      } else {
        reclamo.etapaActual =
          "PENDIENTE_PRIMERA_VISITA";
      }


      await reclamo.save({
        transaction,
      });


      /* =====================================================
         REGISTRAR ASIGNACIÓN
      ===================================================== */

      const asignacion =
        await Asignacion.create(
          {
            reclamoId:
              reclamo.id,

            tipo:
              "JEFE_GUARDIA",

            etapa:
              etapaAsignacion,

            /*
            La tarea concreta es la del inspector.
            La asignación del jefe queda como
            antecedente administrativo.
            */

            estadoTarea:
              null,

            asignadoAId:
              jefe.id,

            asignadoPorId:
              req.usuario.id,

            observaciones:
              observaciones
                ?.trim() ||
              null,

            fechaFinalizacion:
              null,
          },
          {
            transaction,
          }
        );


      /* =====================================================
         HISTORIAL
      ===================================================== */

      let accionHistorial =
        "ASIGNACION_JEFE_GUARDIA";

      let descripcionHistorial =
        `Reclamo asignado al jefe de guardia ${jefe.nombre}.`;


      if (
        esSegundaVisita
      ) {
        accionHistorial =
          "ASIGNACION_JEFE_SEGUNDA_VISITA";

        descripcionHistorial =
          `El jefe de guardia ${jefe.nombre} quedó a cargo de organizar la segunda visita.`;
      }


      if (
        esPostJuzgado
      ) {
        accionHistorial =
          "ASIGNACION_JEFE_POST_JUZGADO";

        descripcionHistorial =
          `Luego de la respuesta del Juzgado, el Director asignó el expediente al jefe de guardia ${jefe.nombre} para continuar la actuación municipal.`;
      }


      await registrarHistorial({
        reclamoId:
          reclamo.id,

        usuarioId:
          req.usuario.id,

        accion:
          accionHistorial,

        descripcion:
          descripcionHistorial,

        estadoAnterior,

        estadoNuevo:
          reclamo.estado,

        transaction,
      });


      await transaction.commit();


      /* =====================================================
         RESPUESTA
      ===================================================== */

      let mensaje =
        "Reclamo asignado al jefe de guardia correctamente";


      if (
        esSegundaVisita
      ) {
        mensaje =
          "Jefe de guardia asignado para organizar la segunda visita.";
      }


      if (
        esPostJuzgado
      ) {
        mensaje =
          "Jefe de guardia asignado para continuar la actuación posterior al Juzgado.";
      }


      return res.json({
        ok: true,

        mensaje,

        etapa:
          etapaAsignacion,

        reclamo,

        asignacion,
      });
    } catch (error) {
      try {
        await transaction.rollback();
      } catch {
        // Nada
      }

      console.error(
        "Error asignando jefe de guardia:",
        error
      );

      return res
        .status(500)
        .json({
          ok: false,

          mensaje:
            "Error al asignar el jefe de guardia",
        });
    }
  };


/* =========================================================
   JEFE -> INSPECTOR
========================================================= */

const asignarInspector =
  async (
    req,
    res
  ) => {
    /*
    Actualizamos vencimientos antes de decidir
    qué tipo de trabajo corresponde.
    */

    try {
      await actualizarVencidos();
    } catch (error) {
      console.error(
        "No se pudieron actualizar vencimientos:",
        error
      );
    }


    const transaction =
      await sequelize.transaction();


    try {
      const {
        id,
      } = req.params;

      const {
        inspectorId,
        observaciones,
      } = req.body;


      /* =====================================================
         VALIDAR
      ===================================================== */

      if (
        !inspectorId
      ) {
        await transaction.rollback();

        return res
          .status(400)
          .json({
            ok: false,

            mensaje:
              "Debe seleccionar un inspector",
          });
      }


      /* =====================================================
         RECLAMO
      ===================================================== */

      const reclamo =
        await Reclamo.findByPk(
          id,
          {
            transaction,

            lock:
              transaction
                .LOCK.UPDATE,
          }
        );


      if (
        !reclamo
      ) {
        await transaction.rollback();

        return res
          .status(404)
          .json({
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

        return res
          .status(400)
          .json({
            ok: false,

            mensaje:
              "El reclamo ya está finalizado.",
          });
      }


      /* =====================================================
         IDENTIFICAR ETAPA
      ===================================================== */

      const etapaAnterior =
        reclamo.etapaActual;


      const esSegundaVisita =
        etapaAnterior ===
        "PENDIENTE_SEGUNDA_VISITA";


      const esPostJuzgado =
        etapaAnterior ===
        "POST_JUZGADO_ASIGNADO_GUARDIA";


      /*
      Si no es ninguna de esas,
      interpretamos que estamos en
      la primera etapa.
      */

     const esPrimeraVisita =
  etapaAnterior ===
  "PENDIENTE_PRIMERA_VISITA";

  /*
|--------------------------------------------------------------------------
| SOLO SE PUEDE ASIGNAR INSPECTOR CUANDO REALMENTE HAY TRABAJO PENDIENTE
|--------------------------------------------------------------------------
|
| ESPERANDO_PLAZO:
| todavía NO corresponde mandar inspector.
|
| Cuando vence el emplazamiento,
| actualizarVencidos() debe cambiarlo a
| PENDIENTE_SEGUNDA_VISITA.
|
*/

const etapaPermiteAsignarInspector =
  esPrimeraVisita ||
  esSegundaVisita ||
  esPostJuzgado;

if (!etapaPermiteAsignarInspector) {
  await transaction.rollback();

  return res.status(409).json({
    ok: false,

    codigo:
      "ETAPA_NO_ASIGNABLE",

    mensaje:
      etapaAnterior ===
      "ESPERANDO_PLAZO"
        ? "El emplazamiento todavía está dentro del plazo. No corresponde asignar un inspector hasta que venza."
        : "En esta etapa del reclamo no corresponde asignar un inspector.",
  });
}


      /* =====================================================
         PERMISOS DEL JEFE
      ===================================================== */

      /*
      SEGUNDA VISITA:

      Según el flujo definido, cualquier jefe
      puede tomar un caso vencido y asignar
      una segunda visita.


      PRIMERA VISITA:

      Solo el jefe actual.


      POST JUZGADO:

      NO cualquier jefe.

      El Director ya eligió específicamente
      qué jefe se hará cargo de continuar.
      */

      if (
        req.usuario.rol ===
        "jefe_guardia"
      ) {
        if (
          !esSegundaVisita &&
          Number(
            reclamo
              .jefeGuardiaId
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
                esPostJuzgado
                  ? "Este expediente posterior al Juzgado fue asignado a otro jefe de guardia."
                  : "Este reclamo no pertenece actualmente a su guardia.",
            });
        }
      }


      /* =====================================================
         EVITAR DOS INSPECTORES ACTIVOS
      ===================================================== */

      const tareaActiva =
        await Asignacion.findOne({
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


      if (
        tareaActiva
      ) {
        await transaction.rollback();

        return res
          .status(409)
          .json({
            ok: false,

            mensaje:
              "Este reclamo ya tiene un trabajo activo asignado a un inspector.",
          });
      }


      /* =====================================================
         VALIDAR INSPECTOR
      ===================================================== */

      const inspector =
        await Usuario.findByPk(
          inspectorId,
          {
            include: [
              {
                model: Rol,
                as: "rol",
              },
            ],

            transaction,
          }
        );


      if (
        !inspector ||
        !inspector.activo ||
        inspector.rol
          ?.nombre !==
          "inspector"
      ) {
        await transaction.rollback();

        return res
          .status(400)
          .json({
            ok: false,

            mensaje:
              "El usuario seleccionado no es un inspector válido",
          });
      }


      /* =====================================================
         DEFINIR TIPO DE TRABAJO
      ===================================================== */

      let etapaTarea =
        "PRIMERA_VISITA";

      let nuevaEtapaReclamo =
        "PRIMERA_VISITA";


      if (
        esSegundaVisita
      ) {
        etapaTarea =
          "SEGUNDA_VISITA";

        nuevaEtapaReclamo =
          "SEGUNDA_VISITA";
      }


      if (
        esPostJuzgado
      ) {
        etapaTarea =
          "POST_JUZGADO";

        nuevaEtapaReclamo =
          "POST_JUZGADO_EN_ACTUACION";
      }


      /* =====================================================
         ACTUALIZAR RECLAMO
      ===================================================== */

      const estadoAnterior =
        reclamo.estado;


      reclamo.inspectorId =
        inspector.id;


      /*
      En SEGUNDA VISITA puede intervenir
      un jefe distinto al anterior.

      Ese jefe pasa a ser el responsable
      actual del caso.
      */

      if (
        esSegundaVisita &&
        req.usuario.rol ===
          "jefe_guardia"
      ) {
        reclamo.jefeGuardiaId =
          req.usuario.id;
      }


      /*
      En POST JUZGADO NO cambiamos el jefe:
      tiene que seguir siendo el que eligió
      el Director.
      */


      reclamo.estado =
        "ASIGNADO_INSPECTOR";

      reclamo.etapaActual =
        nuevaEtapaReclamo;


      await reclamo.save({
        transaction,
      });


      /* =====================================================
         CREAR TAREA
      ===================================================== */

      const asignacion =
        await Asignacion.create(
          {
            reclamoId:
              reclamo.id,

            tipo:
              "INSPECTOR",

            etapa:
              etapaTarea,

            estadoTarea:
              "PENDIENTE",

            asignadoAId:
              inspector.id,

            asignadoPorId:
              req.usuario.id,

            observaciones:
              observaciones
                ?.trim() ||
              null,

            fechaFinalizacion:
              null,
          },
          {
            transaction,
          }
        );


      /* =====================================================
         HISTORIAL
      ===================================================== */

      let accion =
        "ASIGNACION_PRIMERA_VISITA";

      let descripcion =
        `Primera visita asignada al inspector ${inspector.nombre}.`;


      if (
        esSegundaVisita
      ) {
        accion =
          "ASIGNACION_SEGUNDA_VISITA";

        descripcion =
          `Segunda visita asignada al inspector ${inspector.nombre}.`;
      }


      if (
        esPostJuzgado
      ) {
        accion =
          "ASIGNACION_POST_JUZGADO";

        descripcion =
          `Actuación posterior al Juzgado asignada al inspector ${inspector.nombre}.`;
      }


      await registrarHistorial({
        reclamoId:
          reclamo.id,

        usuarioId:
          req.usuario.id,

        accion,

        descripcion,

        estadoAnterior,

        estadoNuevo:
          reclamo.estado,

        transaction,
      });


      await transaction.commit();


      /* =====================================================
         RESPUESTA
      ===================================================== */

      let mensaje =
        "Primera visita asignada correctamente.";


      if (
        esSegundaVisita
      ) {
        mensaje =
          "Segunda visita asignada correctamente.";
      }


      if (
        esPostJuzgado
      ) {
        mensaje =
          "Actuación posterior al Juzgado asignada correctamente.";
      }


      return res.json({
        ok: true,

        mensaje,

        tipoTrabajo:
          etapaTarea,

        reclamo,

        asignacion,
      });
    } catch (error) {
      try {
        await transaction.rollback();
      } catch {
        // Nada
      }

      console.error(
        "Error asignando inspector:",
        error
      );

      return res
        .status(500)
        .json({
          ok: false,

          mensaje:
            "Error al asignar el inspector",
        });
    }
  };



  /* =========================================================
   CAMBIAR INSPECTOR
========================================================= */

const cambiarInspector =
  async (req, res) => {
    const transaction =
      await sequelize.transaction();

    try {
      const { id } = req.params;

      const {
        inspectorId,
        motivo,
      } = req.body;

      if (!inspectorId) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "Seleccioná el nuevo inspector.",
        });
      }

      const reclamo =
        await Reclamo.findByPk(
          id,
          {
            transaction,
            lock:
              transaction.LOCK.UPDATE,
          }
        );

      if (!reclamo) {
        await transaction.rollback();

        return res.status(404).json({
          ok: false,
          mensaje:
            "Reclamo no encontrado.",
        });
      }

      /*
       * El jefe solamente puede modificar
       * trabajos de su propia guardia.
       */

      if (
        req.usuario.rol ===
          "jefe_guardia" &&
        Number(
          reclamo.jefeGuardiaId
        ) !==
          Number(req.usuario.id)
      ) {
        await transaction.rollback();

        return res.status(403).json({
          ok: false,
          mensaje:
            "Este trabajo pertenece a otra guardia.",
        });
      }

      /*
       * Buscamos la tarea que todavía
       * no fue realizada.
       */

      const tareaActual =
        await Asignacion.findOne({
          where: {
            reclamoId: reclamo.id,

            tipo: "INSPECTOR",

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

          lock:
            transaction.LOCK.UPDATE,
        });

      if (!tareaActual) {
        await transaction.rollback();

        return res.status(409).json({
          ok: false,
          mensaje:
            "Este trabajo ya fue realizado o no tiene un inspector asignado.",
        });
      }

      /*
       * Si ya comenzó realmente la actuación,
       * no permitimos cambiar de inspector.
       *
       * EN_CURSO se bloquea para evitar que
       * dos personas trabajen el mismo caso.
       */

      if (
        tareaActual.estadoTarea ===
        "EN_CURSO"
      ) {
        await transaction.rollback();

        return res.status(409).json({
          ok: false,
          mensaje:
            "El inspector ya comenzó este trabajo. Ya no se puede cambiar.",
        });
      }

      const inspector =
        await Usuario.findByPk(
          inspectorId,
          {
            include: [
              {
                model: Rol,
                as: "rol",
              },
            ],

            transaction,
          }
        );

      if (
        !inspector ||
        !inspector.activo ||
        inspector.rol?.nombre !==
          "inspector"
      ) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "Seleccioná un inspector válido.",
        });
      }

      if (
        Number(
          tareaActual.asignadoAId
        ) === Number(inspector.id)
      ) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "Ese inspector ya está asignado.",
        });
      }

      const inspectorAnterior =
        await Usuario.findByPk(
          tareaActual.asignadoAId,
          {
            transaction,
          }
        );

      /*
       * Cancelamos la asignación anterior.
       * NO LA BORRAMOS.
       */

      tareaActual.estadoTarea =
        "CANCELADA";

      tareaActual.fechaFinalizacion =
        new Date();

      tareaActual.observaciones =
        [
          tareaActual.observaciones,
          motivo?.trim()
            ? `Cambio de inspector: ${motivo.trim()}`
            : "Inspector reemplazado antes de realizar el trabajo.",
        ]
          .filter(Boolean)
          .join("\n");

      await tareaActual.save({
        transaction,
      });

      /*
       * Creamos una nueva tarea conservando
       * exactamente la misma etapa.
       */

      const nuevaAsignacion =
        await Asignacion.create(
          {
            reclamoId:
              reclamo.id,

            tipo:
              "INSPECTOR",

            etapa:
              tareaActual.etapa,

            estadoTarea:
              "PENDIENTE",

            asignadoAId:
              inspector.id,

            asignadoPorId:
              req.usuario.id,

            observaciones:
              motivo?.trim() ||
              null,

            fechaFinalizacion:
              null,
          },
          {
            transaction,
          }
        );

      reclamo.inspectorId =
        inspector.id;

      reclamo.estado =
        "ASIGNADO_INSPECTOR";

      await reclamo.save({
        transaction,
      });

      await registrarHistorial({
        reclamoId:
          reclamo.id,

        usuarioId:
          req.usuario.id,

        accion:
          "CAMBIO_INSPECTOR",

        descripcion:
          `Se cambió el inspector ${
            inspectorAnterior?.nombre ||
            "anterior"
          } por ${inspector.nombre}.${
            motivo?.trim()
              ? ` Motivo: ${motivo.trim()}.`
              : ""
          }`,

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
          `${inspector.nombre} quedó asignado al trabajo.`,

        reclamo,

        asignacion:
          nuevaAsignacion,
      });
    } catch (error) {
      try {
        await transaction.rollback();
      } catch {
        // Nada
      }

      console.error(
        "Error cambiando inspector:",
        error
      );

      return res.status(500).json({
        ok: false,
        mensaje:
          "No se pudo cambiar el inspector.",
      });
    }
  };


/* =========================================================
   DEVOLVER RECLAMO A LA COLA DE JEFES
========================================================= */

const devolverGuardia =
  async (req, res) => {
    const transaction =
      await sequelize.transaction();

    try {
      const { id } = req.params;

      const {
        motivo,
      } = req.body;

      const reclamo =
        await Reclamo.findByPk(
          id,
          {
            transaction,
            lock:
              transaction.LOCK.UPDATE,
          }
        );

      if (!reclamo) {
        await transaction.rollback();

        return res.status(404).json({
          ok: false,
          mensaje:
            "Reclamo no encontrado.",
        });
      }

      if (
        req.usuario.rol ===
          "jefe_guardia" &&
        Number(
          reclamo.jefeGuardiaId
        ) !==
          Number(req.usuario.id)
      ) {
        await transaction.rollback();

        return res.status(403).json({
          ok: false,
          mensaje:
            "Este reclamo pertenece a otra guardia.",
        });
      }

      const tareaInspector =
        await Asignacion.findOne({
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

          order: [
            ["id", "DESC"],
          ],

          transaction,

          lock:
            transaction.LOCK.UPDATE,
        });

      /*
       * Si el inspector ya empezó,
       * el jefe no puede largar el caso.
       */

      if (
        tareaInspector
          ?.estadoTarea ===
        "EN_CURSO"
      ) {
        await transaction.rollback();

        return res.status(409).json({
          ok: false,
          mensaje:
            "El inspector ya comenzó el trabajo. No se puede devolver ahora.",
        });
      }

      /*
       * Si estaba solamente asignado,
       * cancelamos esa tarea.
       */

      if (tareaInspector) {
        tareaInspector.estadoTarea =
          "CANCELADA";

        tareaInspector.fechaFinalizacion =
          new Date();

        tareaInspector.observaciones =
          [
            tareaInspector.observaciones,

            motivo?.trim()
              ? `Trabajo devuelto por el jefe: ${motivo.trim()}`
              : "Trabajo devuelto por el jefe de guardia.",
          ]
            .filter(Boolean)
            .join("\n");

        await tareaInspector.save({
          transaction,
        });
      }

      const jefeAnteriorId =
        reclamo.jefeGuardiaId;

      const etapaActual =
        reclamo.etapaActual;

      /*
       * Volvemos a la etapa inmediatamente
       * anterior a la asignación.
       */

      if (
        etapaActual ===
          "SEGUNDA_VISITA" ||
        etapaActual ===
          "PENDIENTE_SEGUNDA_VISITA"
      ) {
        reclamo.etapaActual =
          "PENDIENTE_SEGUNDA_VISITA";
      } else if (
        etapaActual ===
          "POST_JUZGADO_EN_ACTUACION" ||
        etapaActual ===
          "POST_JUZGADO_ASIGNADO_GUARDIA"
      ) {
        reclamo.etapaActual =
          "PENDIENTE_ASIGNACION_POST_JUZGADO";
      } else {
        reclamo.etapaActual =
          "PENDIENTE_ASIGNACION_GUARDIA";
      }

      reclamo.jefeGuardiaId =
        null;

      reclamo.inspectorId =
        null;

      reclamo.estado =
        "NUEVO";

      await reclamo.save({
        transaction,
      });

      /*
       * Cerramos la asignación administrativa
       * del jefe que acaba de devolverlo.
       */

      const asignacionJefe =
        await Asignacion.findOne({
          where: {
            reclamoId:
              reclamo.id,

            tipo:
              "JEFE_GUARDIA",

            asignadoAId:
              jefeAnteriorId,
          },

          order: [
            ["id", "DESC"],
          ],

          transaction,
        });

      if (asignacionJefe) {
        asignacionJefe.estadoTarea =
          "CANCELADA";

        asignacionJefe.fechaFinalizacion =
          new Date();

        asignacionJefe.observaciones =
          [
            asignacionJefe.observaciones,

            motivo?.trim()
              ? `Reclamo devuelto: ${motivo.trim()}`
              : "Reclamo devuelto a la bandeja general.",
          ]
            .filter(Boolean)
            .join("\n");

        await asignacionJefe.save({
          transaction,
        });
      }

      await registrarHistorial({
        reclamoId:
          reclamo.id,

        usuarioId:
          req.usuario.id,

        accion:
          "DEVOLUCION_GUARDIA",

        descripcion:
          motivo?.trim()
            ? `El jefe de guardia devolvió el trabajo. Motivo: ${motivo.trim()}.`
            : "El jefe de guardia devolvió el trabajo para que pueda tomarlo otra guardia.",

        estadoAnterior:
          "ASIGNADO_GUARDIA",

        estadoNuevo:
          reclamo.estado,

        transaction,
      });

      await transaction.commit();

      return res.json({
        ok: true,

        mensaje:
          "El trabajo quedó disponible para otra guardia.",

        reclamo,
      });
    } catch (error) {
      try {
        await transaction.rollback();
      } catch {
        // Nada
      }

      console.error(
        "Error devolviendo guardia:",
        error
      );

      return res.status(500).json({
        ok: false,
        mensaje:
          "No se pudo devolver el trabajo.",
      });
    }
  };


/* =========================================================
   DIRECTOR -> CAMBIAR JEFE
========================================================= */

const cambiarJefeGuardia =
  async (req, res) => {
    const transaction =
      await sequelize.transaction();

    try {
      const { id } = req.params;

      const {
        jefeGuardiaId,
        motivo,
      } = req.body;

      if (!jefeGuardiaId) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "Seleccioná el nuevo jefe de guardia.",
        });
      }

      const reclamo =
        await Reclamo.findByPk(
          id,
          {
            transaction,
            lock:
              transaction.LOCK.UPDATE,
          }
        );

      if (!reclamo) {
        await transaction.rollback();

        return res.status(404).json({
          ok: false,
          mensaje:
            "Reclamo no encontrado.",
        });
      }

      /*
       * Si un inspector ya está trabajando,
       * el Director no debe cambiarle el jefe
       * por debajo.
       */

      const tareaInspector =
        await Asignacion.findOne({
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

      if (tareaInspector) {
        await transaction.rollback();

        return res.status(409).json({
          ok: false,
          mensaje:
            "Primero hay que quitar o cambiar el inspector asignado.",
        });
      }

      const nuevoJefe =
        await Usuario.findByPk(
          jefeGuardiaId,
          {
            include: [
              {
                model: Rol,
                as: "rol",
              },
            ],

            transaction,
          }
        );

      if (
        !nuevoJefe ||
        !nuevoJefe.activo ||
        nuevoJefe.rol?.nombre !==
          "jefe_guardia"
      ) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "Seleccioná un jefe de guardia válido.",
        });
      }

      if (
        Number(
          reclamo.jefeGuardiaId
        ) === Number(nuevoJefe.id)
      ) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "Ese jefe ya está a cargo del reclamo.",
        });
      }

      const jefeAnterior =
        reclamo.jefeGuardiaId
          ? await Usuario.findByPk(
              reclamo.jefeGuardiaId,
              {
                transaction,
              }
            )
          : null;

      const asignacionAnterior =
        reclamo.jefeGuardiaId
          ? await Asignacion.findOne({
              where: {
                reclamoId:
                  reclamo.id,

                tipo:
                  "JEFE_GUARDIA",

                asignadoAId:
                  reclamo.jefeGuardiaId,
              },

              order: [
                ["id", "DESC"],
              ],

              transaction,
            })
          : null;

      if (asignacionAnterior) {
        asignacionAnterior.estadoTarea =
          "CANCELADA";

        asignacionAnterior.fechaFinalizacion =
          new Date();

        await asignacionAnterior.save({
          transaction,
        });
      }

      const etapaAsignacion =
        obtenerEtapaAsignacionJefe(
          reclamo.etapaActual
        );

      const nuevaAsignacion =
        await Asignacion.create(
          {
            reclamoId:
              reclamo.id,

            tipo:
              "JEFE_GUARDIA",

            etapa:
              etapaAsignacion,

            estadoTarea:
              null,

            asignadoAId:
              nuevoJefe.id,

            asignadoPorId:
              req.usuario.id,

            observaciones:
              motivo?.trim() ||
              null,

            fechaFinalizacion:
              null,
          },
          {
            transaction,
          }
        );

      reclamo.jefeGuardiaId =
        nuevoJefe.id;

      reclamo.inspectorId =
        null;

      await reclamo.save({
        transaction,
      });

      await registrarHistorial({
        reclamoId:
          reclamo.id,

        usuarioId:
          req.usuario.id,

        accion:
          "CAMBIO_JEFE_GUARDIA",

        descripcion:
          `Se cambió el jefe de guardia ${
            jefeAnterior?.nombre ||
            "anterior"
          } por ${nuevoJefe.nombre}.${
            motivo?.trim()
              ? ` Motivo: ${motivo.trim()}.`
              : ""
          }`,

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
          `${nuevoJefe.nombre} quedó a cargo del reclamo.`,

        reclamo,

        asignacion:
          nuevaAsignacion,
      });
    } catch (error) {
      try {
        await transaction.rollback();
      } catch {
        // Nada
      }

      console.error(
        "Error cambiando jefe:",
        error
      );

      return res.status(500).json({
        ok: false,
        mensaje:
          "No se pudo cambiar el jefe de guardia.",
      });
    }
  };

/* =========================================================
   HISTORIAL DE ASIGNACIONES
========================================================= */

const listarAsignaciones =
  async (
    req,
    res
  ) => {
    try {
      const asignaciones =
        await Asignacion.findAll({
          where: {
            reclamoId:
              req.params.id,
          },

          include: [
            {
              model:
                Usuario,

              as:
                "asignadoA",

              attributes: [
                "id",
                "nombre",
              ],
            },

            {
              model:
                Usuario,

              as:
                "asignadoPor",

              attributes: [
                "id",
                "nombre",
              ],
            },
          ],

          order: [
            [
              "fechaAsignacion",
              "ASC",
            ],
            [
              "id",
              "ASC",
            ],
          ],
        });


      return res.json({
        ok: true,

        asignaciones,
      });
    } catch (error) {
      console.error(
        "Error obteniendo asignaciones:",
        error
      );

      return res
        .status(500)
        .json({
          ok: false,

          mensaje:
            "Error al obtener las asignaciones",
        });
    }
  };


module.exports = {
  asignarJefeGuardia,
  asignarInspector,
  cambiarInspector,
  devolverGuardia,
  cambiarJefeGuardia,
  listarAsignaciones,
};