//AsignacionController

const {
  Op,
} = require("sequelize");

const {
  enviarCorreo,
} = require(
  "../services/emailService"
);
const {
  sequelize,
  Reclamo,
  Usuario,
  Rol,
  Asignacion,
  Infraccion,
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

      /*
|--------------------------------------------------------------------------
| NOTIFICAR POR EMAIL AL JEFE
|--------------------------------------------------------------------------
|
| IMPORTANTE:
| El reclamo ya quedó asignado y la transacción ya terminó.
|
| Si el correo falla, NO se rompe la asignación.
|
*/

if (jefe.email) {
  try {
    let asunto =
      `Nuevo reclamo asignado N° ${reclamo.numeroReclamo}`;

    let tarea =
      "Tenés un nuevo reclamo asignado para organizar la primera visita.";

    if (esSegundaVisita) {
      asunto =
        `Segunda visita asignada - Reclamo N° ${reclamo.numeroReclamo}`;

      tarea =
        "Tenés un reclamo asignado para organizar una segunda visita.";
    }

    if (esPostJuzgado) {
      asunto =
        `Actuación posterior al Juzgado - Reclamo N° ${reclamo.numeroReclamo}`;

      tarea =
        "Tenés un expediente asignado para continuar una actuación posterior al Juzgado.";
    }

    await enviarCorreo({
      para: jefe.email,

      asunto,

      texto:
        `Hola ${jefe.nombre}.\n\n` +
        `${tarea}\n\n` +
        `Reclamo N°: ${reclamo.numeroReclamo}\n` +
        `Dirección: ${reclamo.direccion || "Sin dirección"}\n\n` +
        `Ingresá al Sistema de Tránsito para revisar el reclamo y continuar con la tarea.\n\n` +
        `https://transito.informerapido.com.ar\n\n` +
        `Este es un mensaje automático. No es necesario responder.`,

      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          
          <h2>Sistema de Tránsito</h2>

          <p>
            Hola <strong>${jefe.nombre}</strong>.
          </p>

          <p>
            ${tarea}
          </p>

          <div
            style="
              padding: 15px;
              border: 1px solid #dddddd;
              border-radius: 8px;
              margin: 20px 0;
            "
          >
            <p style="margin: 0 0 8px 0;">
              <strong>Reclamo N°:</strong>
              ${reclamo.numeroReclamo}
            </p>

            <p style="margin: 0;">
              <strong>Dirección:</strong>
              ${reclamo.direccion || "Sin dirección"}
            </p>
          </div>

          <p>
            Ingresá al <strong>Sistema de Tránsito</strong>
            para revisar el reclamo y continuar con la tarea.
          </p>

          <div style="text-align: center; margin: 25px 0;">
  <a
    href="https://transito.informerapido.com.ar"
    style="display: inline-block; background-color: #2563eb;
           color: #ffffff; padding: 14px 24px;
           text-decoration: none; border-radius: 8px;
           font-size: 15px; font-weight: bold;"
  >
    Ingresar al Sistema de Tránsito
  </a>
</div>

          <hr />

          <small>
            Este es un mensaje automático.
            No es necesario responder.
          </small>

        </div>
      `,
    });

    console.log(
      `Email enviado al jefe ${jefe.nombre} (${jefe.email})`
    );
  } catch (errorEmail) {
    console.error(
      "El reclamo fue asignado correctamente, pero no se pudo enviar el email al jefe:",
      errorEmail.message
    );
  }
}


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


      /*
|--------------------------------------------------------------------------
| REFERENCIA EXACTA POST JUZGADO
|--------------------------------------------------------------------------
|
| Para el sistema nuevo guardamos en la tarea qué infracción y qué
| vehículo corresponden exactamente.
|
| Para el sistema viejo estos valores pueden seguir siendo null.
|
*/

let infraccionPostJuzgado = null;

if (esPostJuzgado) {
  infraccionPostJuzgado =
    await Infraccion.findOne({
      where: {
        reclamoId: reclamo.id,
        anulada: false,
        requiereOrdenRemocion: true,
        estadoOrdenRemocion: "AUTORIZADA",
      },

      order: [
        ["fechaRespuestaOrdenRemocion", "DESC"],
        ["id", "DESC"],
      ],

      transaction,
    });
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
                    vehiculoId:
        esPostJuzgado
          ? infraccionPostJuzgado?.vehiculoId || null
          : null,

      infraccionId:
        esPostJuzgado
          ? infraccionPostJuzgado?.id || null
          : null,

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
  /*
|--------------------------------------------------------------------------
| NOTIFICAR POR EMAIL AL INSPECTOR
|--------------------------------------------------------------------------
|
| La asignación ya fue confirmada en la base.
| Si falla el correo, NO se rompe la asignación.
|
*/

if (inspector.email) {
  try {
    let asunto =
      `Primera visita asignada - Reclamo N° ${reclamo.numeroReclamo}`;

    let tarea =
      "Tenés una primera visita asignada.";

    if (
      asignacion.etapa ===
      "SEGUNDA_VISITA"
    ) {
      asunto =
        `Segunda visita asignada - Reclamo N° ${reclamo.numeroReclamo}`;

      tarea =
        "Tenés una segunda visita asignada.";
    }

    if (
      asignacion.etapa ===
      "POST_JUZGADO"
    ) {
      asunto =
        `Actuación posterior al Juzgado - Reclamo N° ${reclamo.numeroReclamo}`;

      tarea =
        "Tenés una actuación posterior al Juzgado asignada.";
    }

    await enviarCorreo({
      para: inspector.email,

      asunto,

      texto:
        `Hola ${inspector.nombre}.\n\n` +
        `${tarea}\n\n` +
        `Reclamo N°: ${reclamo.numeroReclamo}\n` +
        `Dirección: ${reclamo.direccion || "Sin dirección"}\n\n` +
        `Ingresá al Sistema de Tránsito para revisar el trabajo asignado.\n\n` +
        `https://transito.informerapido.com.ar\n\n` +
        `Este es un mensaje automático. No es necesario responder.`,

      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2>Sistema de Tránsito</h2>

          <p>
            Hola <strong>${inspector.nombre}</strong>.
          </p>

          <p>${tarea}</p>

          <div
            style="
              padding: 15px;
              border: 1px solid #dddddd;
              border-radius: 8px;
              margin: 20px 0;
            "
          >
            <p style="margin: 0 0 8px 0;">
              <strong>Reclamo N°:</strong>
              ${reclamo.numeroReclamo}
            </p>

            <p style="margin: 0;">
              <strong>Dirección:</strong>
              ${reclamo.direccion || "Sin dirección"}
            </p>
          </div>

          <p>
            Ingresá al <strong>Sistema de Tránsito</strong>
            para revisar el trabajo asignado.
          </p>


          <div style="text-align: center; margin: 25px 0;">
  <a
    href="https://transito.informerapido.com.ar"
    target="_blank"
    style="
      display: inline-block;
      background-color: #2563eb;
      color: #ffffff;
      padding: 14px 24px;
      text-decoration: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: bold;
    "
  >
    Ingresar al Sistema de Tránsito
  </a>
</div>

          <hr />

          <small>
            Este es un mensaje automático.
            No es necesario responder.
          </small>
        </div>
      `,
    });

    console.log(
      `Email enviado al inspector ${inspector.nombre} (${inspector.email})`
    );
  } catch (errorEmail) {
    console.error(
      "El trabajo fue asignado correctamente, pero no se pudo enviar el email al inspector:",
      errorEmail.message
    );
  }
}    


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

      /*
      |--------------------------------------------------------------------------
      | VALIDAR INSPECTOR
      |--------------------------------------------------------------------------
      */

      if (!inspectorId) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "Seleccioná el nuevo inspector.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | BUSCAR RECLAMO
      |--------------------------------------------------------------------------
      */

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
      |--------------------------------------------------------------------------
      | VALIDAR GUARDIA
      |--------------------------------------------------------------------------
      |
      | El jefe solamente puede modificar
      | trabajos de su propia guardia.
      |
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
      |--------------------------------------------------------------------------
      | BUSCAR TAREA ACTUAL DEL INSPECTOR
      |--------------------------------------------------------------------------
      |
      | Buscamos la tarea que todavía
      | no fue realizada.
      |
      */

      const tareaActual =
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
            [
              "id",
              "DESC",
            ],
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
      |--------------------------------------------------------------------------
      | NO CAMBIAR SI EL INSPECTOR YA EMPEZÓ
      |--------------------------------------------------------------------------
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

      /*
      |--------------------------------------------------------------------------
      | VALIDAR NUEVO INSPECTOR
      |--------------------------------------------------------------------------
      */

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

      /*
      |--------------------------------------------------------------------------
      | EVITAR ELEGIR EL MISMO INSPECTOR
      |--------------------------------------------------------------------------
      */

      if (
        Number(
          tareaActual.asignadoAId
        ) ===
          Number(inspector.id)
      ) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,

          mensaje:
            "Ese inspector ya está asignado.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | INSPECTOR ANTERIOR
      |--------------------------------------------------------------------------
      */

      const inspectorAnterior =
        await Usuario.findByPk(
          tareaActual.asignadoAId,
          {
            transaction,
          }
        );

      /*
      |--------------------------------------------------------------------------
      | CANCELAR ASIGNACIÓN ANTERIOR
      |--------------------------------------------------------------------------
      |
      | No la borramos.
      | Queda como antecedente.
      |
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
      |--------------------------------------------------------------------------
      | CREAR NUEVA ASIGNACIÓN
      |--------------------------------------------------------------------------
      |
      | IMPORTANTE:
      |
      | Conservamos exactamente:
      |
      | - vehiculoId
      | - infraccionId
      | - etapa
      |
      | Sistema nuevo:
      | mantiene la referencia exacta.
      |
      | Sistema viejo:
      | vehiculoId / infraccionId pueden ser null.
      |
      */

      const nuevaAsignacion =
        await Asignacion.create(
          {
            reclamoId:
              reclamo.id,

            vehiculoId:
              tareaActual.vehiculoId ||
              null,

            infraccionId:
              tareaActual.infraccionId ||
              null,

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

      /*
      |--------------------------------------------------------------------------
      | ACTUALIZAR RESPONSABLE DEL RECLAMO
      |--------------------------------------------------------------------------
      */

      reclamo.inspectorId =
        inspector.id;

      reclamo.estado =
        "ASIGNADO_INSPECTOR";

      await reclamo.save({
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

      /*
      |--------------------------------------------------------------------------
      | CONFIRMAR CAMBIO
      |--------------------------------------------------------------------------
      */

      await transaction.commit();

      /*
      |--------------------------------------------------------------------------
      | NOTIFICAR AL NUEVO INSPECTOR
      |--------------------------------------------------------------------------
      |
      | El cambio YA quedó guardado.
      |
      | Si Gmail falla:
      | NO se revierte el cambio de inspector.
      |
      */

      if (inspector.email) {
        try {
          let asunto =
            `Trabajo reasignado - Reclamo N° ${reclamo.numeroReclamo}`;

          let tarea =
            "Te asignaron un trabajo.";

          /*
          |--------------------------------------------------------------
          | PRIMERA VISITA
          |--------------------------------------------------------------
          */

          if (
            nuevaAsignacion.etapa ===
            "PRIMERA_VISITA"
          ) {
            asunto =
              `Primera visita reasignada - Reclamo N° ${reclamo.numeroReclamo}`;

            tarea =
              "Te asignaron una primera visita.";
          }

          /*
          |--------------------------------------------------------------
          | SEGUNDA VISITA
          |--------------------------------------------------------------
          */

          if (
            nuevaAsignacion.etapa ===
            "SEGUNDA_VISITA"
          ) {
            asunto =
              `Segunda visita reasignada - Reclamo N° ${reclamo.numeroReclamo}`;

            tarea =
              "Te asignaron una segunda visita.";
          }

          /*
          |--------------------------------------------------------------
          | POST JUZGADO
          |--------------------------------------------------------------
          */

          if (
            nuevaAsignacion.etapa ===
            "POST_JUZGADO"
          ) {
            asunto =
              `Actuación posterior al Juzgado reasignada - Reclamo N° ${reclamo.numeroReclamo}`;

            tarea =
              "Te asignaron una actuación posterior al Juzgado.";
          }

          await enviarCorreo({
            para:
              inspector.email,

            asunto,

            texto:
              `Hola ${inspector.nombre}.\n\n` +
              `${tarea}\n\n` +
              `Reclamo N°: ${reclamo.numeroReclamo}\n` +
              `Dirección: ${reclamo.direccion || "Sin dirección"}\n\n` +
            `Ingresá al Sistema de Tránsito para revisar el trabajo asignado.\n\n` +
`https://transito.informerapido.com.ar\n\n` +
`Este es un mensaje automático. No es necesario responder.`,

            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px;">

                <h2>
                  Sistema de Tránsito
                </h2>

                <p>
                  Hola
                  <strong>
                    ${inspector.nombre}
                  </strong>.
                </p>

                <p>
                  ${tarea}
                </p>

                <div
                  style="
                    padding: 15px;
                    border: 1px solid #dddddd;
                    border-radius: 8px;
                    margin: 20px 0;
                  "
                >

                  <p style="margin: 0 0 8px 0;">
                    <strong>
                      Reclamo N°:
                    </strong>

                    ${reclamo.numeroReclamo}
                  </p>

                  <p style="margin: 0;">
                    <strong>
                      Dirección:
                    </strong>

                    ${
                      reclamo.direccion ||
                      "Sin dirección"
                    }
                  </p>

                </div>

                <p>
                  Ingresá al
                  <strong>
                    Sistema de Tránsito
                  </strong>
                  para revisar el trabajo asignado.
                </p>

                <div style="text-align: center; margin: 25px 0;">
  <a
    href="https://transito.informerapido.com.ar"
    style="display: inline-block; background-color: #2563eb;
           color: #ffffff; padding: 14px 24px;
           text-decoration: none; border-radius: 8px;
           font-size: 15px; font-weight: bold;"
  >
    Ingresar al Sistema de Tránsito
  </a>
</div>

                <hr />

                <small>
                  Este es un mensaje automático.
                  No es necesario responder.
                </small>

              </div>
            `,
          });

          console.log(
            `Email enviado al nuevo inspector ${inspector.nombre} (${inspector.email})`
          );
        } catch (errorEmail) {
          console.error(
            "El inspector fue cambiado correctamente, pero no se pudo enviar el email:",
            errorEmail.message
          );
        }
      }

      /*
      |--------------------------------------------------------------------------
      | RESPUESTA
      |--------------------------------------------------------------------------
      */

      return res.json({
        ok: true,

        mensaje:
          `${inspector.nombre} quedó asignado al trabajo.`,

        reclamo,

        asignacion:
          nuevaAsignacion,
      });
    } catch (error) {
      /*
      |--------------------------------------------------------------------------
      | ERROR
      |--------------------------------------------------------------------------
      */

      try {
        await transaction.rollback();
      } catch {
        // La transacción puede haber terminado.
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

      /*
|--------------------------------------------------------------------------
| NOTIFICAR DEVOLUCIÓN DEL RECLAMO
|--------------------------------------------------------------------------
|
| La devolución YA fue confirmada.
|
| Si falla el email:
| NO se rompe la devolución.
|
| SEGUNDA VISITA:
|   -> Jefes de guardia
|
| PRIMERA VISITA / POST JUZGADO:
|   -> Director
|
*/

try {
  const esSegundaVisita =
    reclamo.etapaActual ===
    "PENDIENTE_SEGUNDA_VISITA";

  const esPostJuzgado =
    reclamo.etapaActual ===
    "PENDIENTE_ASIGNACION_POST_JUZGADO";

  /*
  |--------------------------------------------------------------------------
  | DETERMINAR ROL DESTINO
  |--------------------------------------------------------------------------
  */

  const rolDestino =
    esSegundaVisita
      ? "jefe_guardia"
      : "director";

  /*
  |--------------------------------------------------------------------------
  | BUSCAR DESTINATARIOS
  |--------------------------------------------------------------------------
  */

  const destinatarios =
    await Usuario.findAll({
      where: {
        activo: true,
      },

      attributes: [
        "id",
        "nombre",
        "email",
      ],

      include: [
        {
          model: Rol,
          as: "rol",

          where: {
            nombre:
              rolDestino,
          },

          attributes: [],
        },
      ],
    });

  /*
  |--------------------------------------------------------------------------
  | TEXTO SEGÚN ETAPA
  |--------------------------------------------------------------------------
  */

  let asunto =
    `Reclamo devuelto para reasignación - N° ${reclamo.numeroReclamo}`;

  let tarea =
    "Un reclamo fue devuelto y necesita una nueva asignación de jefe de guardia.";

  if (esSegundaVisita) {
    asunto =
      `Segunda visita disponible - Reclamo N° ${reclamo.numeroReclamo}`;

    tarea =
      "Un reclamo fue devuelto y volvió a quedar disponible para organizar la segunda visita.";
  }

  if (esPostJuzgado) {
    asunto =
      `Actuación posterior al Juzgado devuelta - Reclamo N° ${reclamo.numeroReclamo}`;

    tarea =
      "Una actuación posterior al Juzgado fue devuelta y necesita una nueva asignación.";
  }

  /*
  |--------------------------------------------------------------------------
  | ENVIAR EMAIL
  |--------------------------------------------------------------------------
  */

  for (
    const destinatario
    of destinatarios
  ) {
    if (!destinatario.email) {
      continue;
    }

    try {
      await enviarCorreo({
        para:
          destinatario.email,

        asunto,

        texto:
          `Hola ${destinatario.nombre}.\n\n` +
          `${tarea}\n\n` +
          `Reclamo N°: ${reclamo.numeroReclamo}\n` +
          `Dirección: ${reclamo.direccion || "Sin dirección"}\n` +
          (
            motivo?.trim()
              ? `Motivo de devolución: ${motivo.trim()}\n`
              : ""
          ) +
          `\nIngresá al Sistema de Tránsito para revisar el reclamo.\n\n` +
          `https://transito.informerapido.com.ar\n\n` +
          `Este es un mensaje automático. No es necesario responder.`,

        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px;">

            <h2>
              Sistema de Tránsito
            </h2>

            <p>
              Hola
              <strong>
                ${destinatario.nombre}
              </strong>.
            </p>

            <p>
              ${tarea}
            </p>

            <div
              style="
                padding: 15px;
                border: 1px solid #dddddd;
                border-radius: 8px;
                margin: 20px 0;
              "
            >

              <p style="margin: 0 0 8px 0;">
                <strong>
                  Reclamo N°:
                </strong>

                ${reclamo.numeroReclamo}
              </p>

              <p style="margin: 0;">
                <strong>
                  Dirección:
                </strong>

                ${
                  reclamo.direccion ||
                  "Sin dirección"
                }
              </p>

            </div>

            <p>
              Ingresá al
              <strong>
                Sistema de Tránsito
              </strong>
              para revisar el reclamo.
            </p>

            <div style="text-align: center; margin: 25px 0;">
  <a
    href="https://transito.informerapido.com.ar"
    style="display: inline-block; background-color: #2563eb;
           color: #ffffff; padding: 14px 24px;
           text-decoration: none; border-radius: 8px;
           font-size: 15px; font-weight: bold;"
  >
    Ingresar al Sistema de Tránsito
  </a>
</div>

            

            <hr />

            <small>
              Este es un mensaje automático.
              No es necesario responder.
            </small>

          </div>
        `,
      });

      console.log(
        `Email de devolución enviado a ${destinatario.nombre} (${destinatario.email})`
      );
    } catch (
      errorEmailDestinatario
    ) {
      console.error(
        `No se pudo enviar el email de devolución a ${destinatario.email}:`,
        errorEmailDestinatario.message
      );
    }
  }
} catch (errorNotificacion) {
  console.error(
    "El trabajo fue devuelto correctamente, pero no se pudieron preparar las notificaciones:",
    errorNotificacion.message
  );
}

  

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
      /*
|--------------------------------------------------------------------------
| NOTIFICAR AL NUEVO JEFE DE GUARDIA
|--------------------------------------------------------------------------
|
| El cambio ya fue confirmado.
| Si falla el email, NO se rompe el cambio de jefe.
|
*/

if (nuevoJefe.email) {
  try {
    let asunto =
      `Reclamo reasignado - N° ${reclamo.numeroReclamo}`;

    let tarea =
      "Quedaste a cargo de este reclamo.";

    if (
      nuevaAsignacion.etapa ===
      "PRIMERA_VISITA"
    ) {
      asunto =
        `Reclamo asignado - N° ${reclamo.numeroReclamo}`;

      tarea =
        "Quedaste a cargo de organizar la primera visita.";
    }

    if (
      nuevaAsignacion.etapa ===
      "SEGUNDA_VISITA"
    ) {
      asunto =
        `Segunda visita asignada - Reclamo N° ${reclamo.numeroReclamo}`;

      tarea =
        "Quedaste a cargo de organizar la segunda visita.";
    }

    if (
      nuevaAsignacion.etapa ===
      "POST_JUZGADO"
    ) {
      asunto =
        `Actuación posterior al Juzgado - Reclamo N° ${reclamo.numeroReclamo}`;

      tarea =
        "Quedaste a cargo de continuar la actuación posterior al Juzgado.";
    }

    await enviarCorreo({
      para: nuevoJefe.email,

      asunto,

      texto:
        `Hola ${nuevoJefe.nombre}.\n\n` +
        `${tarea}\n\n` +
        `Reclamo N°: ${reclamo.numeroReclamo}\n` +
        `Dirección: ${reclamo.direccion || "Sin dirección"}\n\n` +
      `Ingresá al Sistema de Tránsito para revisar el reclamo.\n\n` +
`https://transito.informerapido.com.ar\n\n` +
`Este es un mensaje automático. No es necesario responder.`,

      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2>Sistema de Tránsito</h2>

          <p>
            Hola <strong>${nuevoJefe.nombre}</strong>.
          </p>

          <p>${tarea}</p>

          <div
            style="
              padding: 15px;
              border: 1px solid #dddddd;
              border-radius: 8px;
              margin: 20px 0;
            "
          >
            <p style="margin: 0 0 8px 0;">
              <strong>Reclamo N°:</strong>
              ${reclamo.numeroReclamo}
            </p>

            <p style="margin: 0;">
              <strong>Dirección:</strong>
              ${reclamo.direccion || "Sin dirección"}
            </p>
          </div>

       <p>
  Ingresá al <strong>Sistema de Tránsito</strong>
  para revisar el reclamo y continuar con la tarea.
</p>

<div style="text-align: center; margin: 25px 0;">
  <a
    href="https://transito.informerapido.com.ar"
    style="display: inline-block; background-color: #2563eb;
           color: #ffffff; padding: 14px 24px;
           text-decoration: none; border-radius: 8px;
           font-size: 15px; font-weight: bold;"
  >
    Ingresar al Sistema de Tránsito
  </a>
</div>

          <hr />

          <small>
            Este es un mensaje automático.
            No es necesario responder.
          </small>
        </div>
      `,
    });

    console.log(
      `Email enviado al nuevo jefe ${nuevoJefe.nombre} (${nuevoJefe.email})`
    );
  } catch (errorEmail) {
    console.error(
      "El jefe fue cambiado correctamente, pero no se pudo enviar el email:",
      errorEmail.message
    );
  }
}

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