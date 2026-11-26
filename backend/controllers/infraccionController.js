//insfraccincontroller
const {
  Infraccion,
  Reclamo,
  Foto,
} = require("../models");

const { enviarCorreo } = require("../services/emailService");

const {
  ACCION_RETIRO_GRUA,
  reclamoTieneRetiroGruaPendiente,
  buscarConOrdenParaGrua,
  avisarGruaEnSegundoPlano,
} = require("../services/gruaService");

const enviarAlJuzgado = async (
  req,
  res
) => {
  try {
    const id = Number(req.params.id);

   const {
  numeroExpedienteJuzgado,
  observacionJuzgado,
  observacion,
} = req.body;

const textoObservacion =
  observacionJuzgado ??
  observacion ??
  "";

    const infraccion =
      await Infraccion.findByPk(id);

    if (!infraccion) {
      return res.status(404).json({
        ok: false,
        mensaje:
          "Acta de Infracción no encontrada",
      });
    }

    if (infraccion.anulada) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "El Acta de Infracción está anulada",
      });
    }

    infraccion.estadoJuzgado =
      "ENVIADO";

    infraccion.fechaEnvioJuzgado =
      new Date();

    infraccion.enviadoJuzgadoPorId =
      req.usuario.id;

    if (numeroExpedienteJuzgado) {
      infraccion.numeroExpedienteJuzgado =
        numeroExpedienteJuzgado.trim();
    }

   if (
  typeof textoObservacion ===
  "string"
) {
  infraccion.observacionJuzgado =
    textoObservacion.trim() ||
    null;
}

    await infraccion.save();

    const reclamo =
      await Reclamo.findByPk(
        infraccion.reclamoId
      );

  if (reclamo) {
  reclamo.inspectorId = null;

  /*
   * Enviar el Acta de Infracción al Juzgado
   * es el trámite normal de la multa.
   *
   * Solo dejamos el reclamo esperando al
   * Juzgado cuando además hace falta una
   * orden judicial para retirar el vehículo.
   */

  if (
    infraccion.requiereOrdenRemocion
  ) {
    reclamo.estado =
      "EN_SEGUIMIENTO";

    reclamo.etapaActual =
      "EN_JUZGADO";
  }

  await reclamo.save();
}

    return res.json({
      ok: true,
      mensaje:
        "Acta enviada al Juzgado",
      infraccion,
    });
  } catch (error) {
    console.error(
      "Error enviando al Juzgado:",
      error
    );

    return res.status(500).json({
      ok: false,
      mensaje:
        "Error registrando el envío al Juzgado",
    });
  }
};

const registrarRespuestaJuzgado =
  async (req, res) => {
    console.log(
  "🔥 ENTRE AL CONTROLADOR RESPUESTA JUZGADO 🔥"
);
    try {
      const id = Number(req.params.id);
const {
  resultado,
  numeroExpedienteJuzgado,
  observacionJuzgado,
  observacion,
} = req.body;

const textoObservacion =
  observacionJuzgado ??
  observacion ??
  "";

 





      if (
        ![
          "AUTORIZADO",
          "NO_AUTORIZADO",
          "OTRO",
        ].includes(resultado)
      ) {
        return res.status(400).json({
          ok: false,
          mensaje:
            "Resultado del Juzgado inválido",
        });
      }

      const infraccion =
        await Infraccion.findByPk(id);

      if (!infraccion) {
        return res.status(404).json({
          ok: false,
          mensaje:
            "Acta de Infracción no encontrada",
        });
      }

      infraccion.estadoJuzgado =
        resultado;

      infraccion.fechaRespuestaJuzgado =
        new Date();

      infraccion.respuestaJuzgadoRegistradaPorId =
        req.usuario.id;

      if (numeroExpedienteJuzgado) {
        infraccion.numeroExpedienteJuzgado =
          numeroExpedienteJuzgado.trim();
      }



    if (
  typeof textoObservacion ===
  "string"
) {
  infraccion.observacionJuzgado =
    textoObservacion.trim() ||
    null;
}

      await infraccion.save();

      const reclamo =
        await Reclamo.findByPk(
          infraccion.reclamoId
        );

      /*
      | Si un vehículo de este reclamo todavía está
      | esperando a la grúa, guardamos la respuesta
      | del Juzgado en el acta pero NO movemos el
      | reclamo: primero tiene que pasar la grúa.
      */

      const esperandoGrua =
        reclamo
          ? await reclamoTieneRetiroGruaPendiente(
              reclamo.id
            )
          : false;

      if (esperandoGrua) {
        return res.json({
          ok: true,

          mensaje:
            "Respuesta del Juzgado registrada. El reclamo sigue esperando que la grúa retire el vehículo.",

          infraccion,
        });
      }

      if (reclamo) {
        reclamo.inspectorId = null;
        reclamo.jefeGuardiaId = null;

        if (
          resultado === "AUTORIZADO"
        ) {
          // Secretaría recibió el OK.
          // Ahora vuelve al Director.
          reclamo.estado = "NUEVO";

          reclamo.etapaActual =
            "PENDIENTE_ASIGNACION_POST_JUZGADO";
        } else {
          reclamo.estado =
            "PENDIENTE_ACTUACION";

          reclamo.etapaActual =
            "PENDIENTE_DECISION_JEFE";
        }

        await reclamo.save();
      }

      return res.json({
        ok: true,

        mensaje:
          resultado === "AUTORIZADO"
            ? "OK del Juzgado registrado. El reclamo volvió al Director."
            : "Respuesta del Juzgado registrada.",

        infraccion,
      });
    } catch (error) {
      console.error(
        "Error registrando respuesta del Juzgado:",
        error
      );

      return res.status(500).json({
        ok: false,
        mensaje:
          "Error registrando la respuesta del Juzgado",
      });
    }
  };

  const solicitarOrdenRemocion = async (
  req,
  res
) => {
  try {
    const id = Number(req.params.id);

    const {
      observacionOrdenRemocion,
    } = req.body;

    const infraccion =
      await Infraccion.findByPk(id);

    if (!infraccion) {
      return res.status(404).json({
        ok: false,
        mensaje:
          "Acta de Infracción no encontrada",
      });
    }

    if (infraccion.anulada) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "El Acta de Infracción está anulada",
      });
    }

    if (
      !infraccion.requiereOrdenRemocion
    ) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "Este caso no requiere una orden judicial de remoción",
      });
    }

    if (
      infraccion.estadoJuzgado !==
      "ENVIADO"
    ) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "Primero debe registrarse el envío del Acta de Infracción al Juzgado",
      });
    }

    if (
      infraccion.estadoOrdenRemocion !==
      "PENDIENTE_SOLICITUD"
    ) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "La solicitud de orden ya fue registrada",
      });
    }

    infraccion.estadoOrdenRemocion =
      "ESPERANDO_RESPUESTA";

    infraccion.fechaSolicitudOrdenRemocion =
      new Date();

    infraccion.ordenRemocionSolicitadaPorId =
      req.usuario.id;

    infraccion.observacionOrdenRemocion =
      typeof observacionOrdenRemocion ===
        "string" &&
      observacionOrdenRemocion.trim()
        ? observacionOrdenRemocion.trim()
        : null;

    await infraccion.save();

    const reclamo =
      await Reclamo.findByPk(
        infraccion.reclamoId
      );

    if (reclamo) {
      reclamo.estado =
        "EN_SEGUIMIENTO";

      reclamo.etapaActual =
        "EN_JUZGADO";

      reclamo.inspectorId = null;

      await reclamo.save();
    }

    return res.json({
      ok: true,
      mensaje:
        "Solicitud de orden de remoción registrada. Queda esperando la respuesta del Juzgado.",
      infraccion,
    });
  } catch (error) {
    console.error(
      "Error solicitando orden de remoción:",
      error
    );

    return res.status(500).json({
      ok: false,
      mensaje:
        "Error registrando la solicitud de orden de remoción",
    });
  }
};


const registrarRespuestaOrdenRemocion =
  async (req, res) => {
    try {
      const id =
        Number(req.params.id);

      const {
        resultado,
        observacionOrdenRemocion,
      } = req.body;

      if (
        ![
          "AUTORIZADA",
          "NO_AUTORIZADA",
        ].includes(resultado)
      ) {
        return res.status(400).json({
          ok: false,
          mensaje:
            "La respuesta de la orden judicial es inválida",
        });
      }

      const infraccion =
        await Infraccion.findByPk(id);

      if (!infraccion) {
        return res.status(404).json({
          ok: false,
          mensaje:
            "Acta de Infracción no encontrada",
        });
      }

      if (infraccion.anulada) {
        return res.status(400).json({
          ok: false,
          mensaje:
            "El Acta de Infracción está anulada",
        });
      }

      if (
        !infraccion.requiereOrdenRemocion
      ) {
        return res.status(400).json({
          ok: false,
          mensaje:
            "Este caso no requiere una orden judicial de remoción",
        });
      }

      if (
        infraccion.estadoOrdenRemocion !==
        "ESPERANDO_RESPUESTA"
      ) {
        return res.status(400).json({
          ok: false,
          mensaje:
            "Este caso no está esperando una respuesta de orden judicial",
        });
      }

      /*
|--------------------------------------------------------------------------
| SI AUTORIZÓ, LA FOTO DE LA ORDEN ES OBLIGATORIA
|--------------------------------------------------------------------------
|
| No alcanza con que el frontend diga que hay una foto.
| El backend comprueba directamente que exista en la base.
|
*/

if (resultado === "AUTORIZADA") {
  const fotoOrden =
    await Foto.findOne({
      where: {
        reclamoId:
          infraccion.reclamoId,

        tipoReferencia:
          "ORDEN_JUDICIAL_REMOCION",

        referenciaId:
          infraccion.id,

        activo: true,
      },
    });

  if (!fotoOrden) {
    return res.status(400).json({
      ok: false,
      codigo:
        "FOTO_ORDEN_OBLIGATORIA",
      mensaje:
        "Para autorizar la remoción debe adjuntar una foto de la orden judicial.",
    });
  }
}
      infraccion.estadoOrdenRemocion =
        resultado;

      infraccion.fechaRespuestaOrdenRemocion =
        new Date();

      infraccion.respuestaOrdenRemocionPorId =
        req.usuario.id;

      if (
        typeof observacionOrdenRemocion ===
        "string"
      ) {
        infraccion.observacionOrdenRemocion =
          observacionOrdenRemocion.trim() ||
          infraccion.observacionOrdenRemocion;
      }

      await infraccion.save();

      const reclamo =
        await Reclamo.findByPk(
          infraccion.reclamoId
        );

      /*
      |--------------------------------------------------------------------------
      | ORDEN AUTORIZADA: VA DIRECTO A LA GRÚA
      |--------------------------------------------------------------------------
      |
      | Si el vehículo sigue en la calle, queda listo para la
      | grúa (aparece en su bandeja y le llega un mail).
      | Ya no pasa por Director -> guardia -> inspector.
      |
      | La orden judicial queda registrada igual en el acta.
      |
      */

      let directoAGrua = false;

      if (
        resultado === "AUTORIZADA" &&
        reclamo
      ) {
        const paraGrua =
          await buscarConOrdenParaGrua({
            reclamoId:
              reclamo.id,
            infraccionId:
              infraccion.id,
          });

        if (paraGrua.length) {
          infraccion.accionPosterior =
            ACCION_RETIRO_GRUA;

          await infraccion.save();

          directoAGrua = true;

          avisarGruaEnSegundoPlano({
            reclamo,
            vehiculo:
              paraGrua[0].vehiculo,
            infraccion,
          });
        }
      }

      if (reclamo) {
        reclamo.inspectorId = null;
        reclamo.jefeGuardiaId = null;

        if (directoAGrua) {
          reclamo.estado =
            "PENDIENTE_ACTUACION";

          reclamo.etapaActual =
            "PENDIENTE_REMOCION";

          reclamo.fechaResolucion =
            null;
        } else if (
          resultado === "AUTORIZADA"
        ) {
          reclamo.estado =
            "NUEVO";

          reclamo.etapaActual =
            "PENDIENTE_ASIGNACION_POST_JUZGADO";
        } else {
          reclamo.estado =
            "PENDIENTE_ACTUACION";

          reclamo.etapaActual =
            "PENDIENTE_DECISION_JEFE";
        }


        /*
|--------------------------------------------------------------------------
| AVISAR AL DIRECTOR CUANDO EL JUEZ AUTORIZA LA REMOCIÓN
|--------------------------------------------------------------------------
*/

   await reclamo.save();

if (resultado === "AUTORIZADA" && reclamo) {
  try {
    const { Usuario, Rol } = require("../models");

    const directores = await Usuario.findAll({
      where: {
        activo: true,
      },
      include: [
        {
          model: Rol,
          as: "rol",
          where: {
            nombre: "director",
          },
        },
      ],
    });

    for (const director of directores) {
      if (!director.email) continue;

      try {
        await enviarCorreo({
          para: director.email,

          asunto:
            `Orden judicial autorizada - Reclamo N° ${reclamo.numeroReclamo}`,

          texto:
            `Hola ${director.nombre}.\n\n` +
            `El Juzgado autorizó la remoción de un vehículo.\n\n` +
            `Reclamo N°: ${reclamo.numeroReclamo}\n` +
            `Dirección: ${reclamo.direccion || "Sin dirección"}\n\n` +
            (directoAGrua
              ? `El vehículo quedó listo para que lo retire la grúa. No hace falta asignar guardia.\n\n`
              : `El expediente requiere que asignes un jefe de guardia para continuar con la remoción.\n\n`) +
            `Ingresá al Sistema de Tránsito:\n` +
            `https://transito.informerapido.com.ar`,
        });

        console.log(
          `Aviso judicial enviado al director ${director.email}`
        );
      } catch (errorEmail) {
        console.error(
          `No se pudo enviar el aviso al director ${director.email}:`,
          errorEmail.message
        );
      }
    }
  } catch (errorNotificacion) {
    console.error(
      "Error preparando aviso judicial al Director:",
      errorNotificacion.message
    );
  }
}

      }

      return res.json({
        ok: true,

        mensaje:
          directoAGrua
            ? "Orden judicial registrada. El vehículo quedó listo para la grúa y se le avisó por email."
            : resultado === "AUTORIZADA"
              ? "Orden judicial registrada. El vehículo quedó habilitado para continuar con la remoción."
              : "El Juzgado no autorizó la remoción del vehículo.",

        infraccion,
      });
    } catch (error) {
      console.error(
        "Error registrando respuesta de orden de remoción:",
        error
      );

      return res.status(500).json({
        ok: false,
        mensaje:
          "Error registrando la respuesta de la orden judicial",
      });
    }
  };

module.exports = {
  enviarAlJuzgado,
  registrarRespuestaJuzgado,
  solicitarOrdenRemocion,
  registrarRespuestaOrdenRemocion,
};