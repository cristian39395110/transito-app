const {
  Op,
} = require("sequelize");

const {
  Reclamo,
  Infraccion,
  Vehiculo,
  Remocion,
  Usuario,
  Rol,
  Emplazamiento,
  Verificacion,
  Asignacion,
} = require("../models");

const {
  enviarCorreo,
} = require("./emailService");

/*
|--------------------------------------------------------------------------
| SERVICIO DE GRÚA
|--------------------------------------------------------------------------
|
| Un vehículo está "listo para la grúa" cuando:
|
| - el inspector labró el Acta de Infracción en la segunda visita
|   y eligió accionPosterior = RETIRO_GRUA;
| - el acta no está anulada;
| - el vehículo sigue en PENDIENTE_REMOCION;
| - todavía no tiene una remoción registrada.
|
| No se guarda ningún estado nuevo: todo se calcula con datos
| que ya existen. Así no se toca el circuito actual.
|
*/

const ACCION_RETIRO_GRUA =
  "RETIRO_GRUA";

const URL_SISTEMA =
  "https://transito.informerapido.com.ar";

/*
|--------------------------------------------------------------------------
| VEHÍCULOS LISTOS PARA LA GRÚA
|--------------------------------------------------------------------------
*/

const buscarRetirosPendientes =
  async ({
    reclamoId = null,
    transaction,
  } = {}) => {
    const whereInfraccion = {
      accionPosterior:
        ACCION_RETIRO_GRUA,

      anulada: false,

      vehiculoId: {
        [Op.ne]: null,
      },
    };

    if (reclamoId) {
      whereInfraccion.reclamoId =
        Number(reclamoId);
    }

    const infracciones =
      await Infraccion.findAll({
        where:
          whereInfraccion,

        include: [
          {
            model: Vehiculo,
            as: "vehiculo",
            required: true,
            where: {
              estadoActual:
                "PENDIENTE_REMOCION",
            },
          },
          {
            model: Reclamo,
            as: "reclamo",
            required: true,
            attributes: [
              "id",
              "numeroReclamo",
              "direccion",
              "barrio",
              "referencia",
              "latitudDenunciada",
              "longitudDenunciada",
              "estado",
              "etapaActual",
            ],
          },
          {
            model: Usuario,
            as: "inspector",
            required: false,
            attributes: [
              "id",
              "nombre",
            ],
          },
        ],

        order: [
          ["fechaHora", "ASC"],
          ["id", "ASC"],
        ],

        transaction,
      });

    if (!infracciones.length) {
      return [];
    }

    /*
    | Excluir vehículos que ya tienen
    | una remoción registrada.
    */

    const remociones =
      await Remocion.findAll({
        where: {
          vehiculoId: {
            [Op.in]:
              infracciones.map(
                (item) =>
                  item.vehiculoId
              ),
          },
        },

        attributes: [
          "vehiculoId",
        ],

        transaction,
      });

    const vehiculosRemovidos =
      new Set(
        remociones.map(
          (item) =>
            Number(item.vehiculoId)
        )
      );

    /*
    | Si por algún motivo un mismo vehículo
    | tuviera dos actas RETIRO_GRUA, se muestra
    | una sola vez (la más reciente).
    */

    const porVehiculo =
      new Map();

    for (const infraccion of infracciones) {
      const vehiculoId =
        Number(
          infraccion.vehiculoId
        );

      if (
        vehiculosRemovidos.has(
          vehiculoId
        )
      ) {
        continue;
      }

      porVehiculo.set(
        vehiculoId,
        infraccion
      );
    }

    return Array.from(
      porVehiculo.values()
    );
  };

/*
|--------------------------------------------------------------------------
| VEHÍCULOS CON ORDEN DEL JUEZ AUTORIZADA, TODAVÍA EN LA CALLE
|--------------------------------------------------------------------------
|
| Son los que se pueden mandar a la grúa después
| de que el juez autorizó la remoción.
|
*/

const buscarConOrdenParaGrua =
  async ({
    reclamoId,
    infraccionId = null,
    transaction,
  }) => {
    const where = {
      reclamoId:
        Number(reclamoId),

      anulada: false,

      accionPosterior:
        "BUSQUEDA_REMOCION",

      requiereOrdenRemocion:
        true,

      estadoOrdenRemocion:
        "AUTORIZADA",

      vehiculoId: {
        [Op.ne]: null,
      },
    };

    if (infraccionId) {
      where.id =
        Number(infraccionId);
    }

    const infracciones =
      await Infraccion.findAll({
        where,

        include: [
          {
            model: Vehiculo,
            as: "vehiculo",
            required: true,
            where: {
              estadoActual:
                "PENDIENTE_REMOCION",
            },
          },
        ],

        order: [
          ["id", "ASC"],
        ],

        transaction,
      });

    if (!infracciones.length) {
      return [];
    }

    const remociones =
      await Remocion.findAll({
        where: {
          vehiculoId: {
            [Op.in]:
              infracciones.map(
                (item) =>
                  item.vehiculoId
              ),
          },
        },

        attributes: [
          "vehiculoId",
        ],

        transaction,
      });

    const removidos =
      new Set(
        remociones.map(
          (item) =>
            Number(item.vehiculoId)
        )
      );

    return infracciones.filter(
      (item) =>
        !removidos.has(
          Number(item.vehiculoId)
        )
    );
  };

/*
|--------------------------------------------------------------------------
| SEGUNDAS VISITAS QUE PUEDE HACER LA GRÚA
|--------------------------------------------------------------------------
|
| Reclamos con un vehículo cuyo emplazamiento ya venció
| y está esperando la segunda visita:
|
| - libres (ningún inspector asignado);
| - asignados a un inspector que TODAVÍA no empezó
|   (no cargó ningún control): la grúa la puede tomar;
| - asignados a alguien que ya empezó: se muestran
|   como "en curso" y no se pueden tomar.
|
*/

const ETAPAS_SEGUNDA_VISITA = [
  "PENDIENTE_SEGUNDA_VISITA",
  "SEGUNDA_VISITA",
];

const ESTADOS_VEHICULO_FUERA_DE_CONTROL =
  new Set([
    "PENDIENTE_REMOCION",
    "REMOVIDO",
    "PENDIENTE_INGRESO_PREDIO",
    "EN_PREDIO",
    "EGRESADO",
  ]);

/*
| Vehículos de un reclamo con emplazamiento vencido
| que todavía hay que controlar.
*/

const vehiculosConEmplazamientoVencido = ({
  emplazamientos,
  vehiculos,
}) => {
  const ahora = new Date();

  const idsConHijo =
    new Set(
      emplazamientos
        .filter(
          (item) =>
            item.emplazamientoAnteriorId
        )
        .map(
          (item) =>
            Number(
              item.emplazamientoAnteriorId
            )
        )
    );

  const vehiculosPorId =
    new Map(
      vehiculos.map(
        (item) => [
          Number(item.id),
          item,
        ]
      )
    );

  const resultado =
    new Map();

  for (const item of emplazamientos) {
    if (
      idsConHijo.has(
        Number(item.id)
      ) ||
      [
        "CUMPLIDO",
        "CANCELADO",
      ].includes(item.estado)
    ) {
      continue;
    }

    let vehiculo =
      item.vehiculoId
        ? vehiculosPorId.get(
            Number(item.vehiculoId)
          )
        : null;

    /*
    | Compatibilidad: reclamos viejos con
    | un solo vehículo y emplazamiento
    | sin vehiculoId.
    */

    if (
      !vehiculo &&
      !item.vehiculoId &&
      vehiculos.length === 1
    ) {
      vehiculo = vehiculos[0];
    }

    if (
      !vehiculo ||
      ESTADOS_VEHICULO_FUERA_DE_CONTROL.has(
        vehiculo.estadoActual
      )
    ) {
      continue;
    }

    const vencido =
      item.estado === "VENCIDO" ||
      (
        item.estado === "VIGENTE" &&
        item.fechaVencimiento &&
        new Date(
          item.fechaVencimiento
        ) <= ahora
      );

    if (!vencido) {
      continue;
    }

    resultado.set(
      Number(vehiculo.id),
      {
        id: vehiculo.id,
        dominio: vehiculo.dominio,
        marca: vehiculo.marca,
        modelo: vehiculo.modelo,
        color: vehiculo.color,
        tipoVehiculo:
          vehiculo.tipoVehiculo,
        numeroInterno:
          vehiculo.numeroInterno,
        venceEl:
          item.fechaVencimiento,
      }
    );
  }

  return Array.from(
    resultado.values()
  );
};

const buscarSegundasVisitasParaGrua =
  async ({
    usuarioId,
    reclamoId = null,
    transaction,
  }) => {
    const where = {
      etapaActual: {
        [Op.in]:
          ETAPAS_SEGUNDA_VISITA,
      },

      estado: {
        [Op.notIn]: [
          "RESUELTO",
          "ANULADO",
        ],
      },
    };

    if (reclamoId) {
      where.id =
        Number(reclamoId);
    }

    const reclamos =
      await Reclamo.findAll({
        where,

        attributes: [
          "id",
          "numeroReclamo",
          "direccion",
          "barrio",
          "referencia",
          "latitudDenunciada",
          "longitudDenunciada",
          "estado",
          "etapaActual",
          "inspectorId",
          "updatedAt",
        ],

        order: [
          ["updatedAt", "ASC"],
        ],

        transaction,
      });

    if (!reclamos.length) {
      return [];
    }

    const ids =
      reclamos.map(
        (item) => item.id
      );

    const [
      emplazamientos,
      vehiculos,
      tareas,
    ] = await Promise.all([
      Emplazamiento.findAll({
        where: {
          reclamoId: {
            [Op.in]: ids,
          },
        },
        transaction,
      }),

      Vehiculo.findAll({
        where: {
          reclamoId: {
            [Op.in]: ids,
          },
        },
        transaction,
      }),

      Asignacion.findAll({
        where: {
          reclamoId: {
            [Op.in]: ids,
          },

          tipo: "INSPECTOR",

          estadoTarea: {
            [Op.in]: [
              "PENDIENTE",
              "EN_CURSO",
            ],
          },
        },

        include: [
          {
            model: Usuario,
            as: "asignadoA",
            attributes: [
              "id",
              "nombre",
            ],
            include: [
              {
                model: Rol,
                as: "rol",
                attributes: [
                  "nombre",
                ],
              },
            ],
          },
        ],

        order: [
          ["id", "DESC"],
        ],

        transaction,
      }),
    ]);

    const tareasIds =
      tareas.map(
        (item) => item.id
      );

    const verificaciones =
      tareasIds.length
        ? await Verificacion.findAll({
            where: {
              asignacionId: {
                [Op.in]:
                  tareasIds,
              },
            },

            attributes: [
              "asignacionId",
            ],

            transaction,
          })
        : [];

    const tareasEmpezadas =
      new Set(
        verificaciones.map(
          (item) =>
            Number(
              item.asignacionId
            )
        )
      );

    const resultado = [];

    for (const reclamo of reclamos) {
      const vehiculosPendientes =
        vehiculosConEmplazamientoVencido({
          emplazamientos:
            emplazamientos.filter(
              (item) =>
                Number(item.reclamoId) ===
                Number(reclamo.id)
            ),

          vehiculos:
            vehiculos.filter(
              (item) =>
                Number(item.reclamoId) ===
                Number(reclamo.id)
            ),
        });

      if (!vehiculosPendientes.length) {
        continue;
      }

      const tarea =
        tareas.find(
          (item) =>
            Number(item.reclamoId) ===
            Number(reclamo.id)
        ) || null;

      /*
      | Una tarea activa de otra etapa
      | (ej. posterior al Juzgado) bloquea.
      */

      if (
        tarea &&
        tarea.etapa !==
          "SEGUNDA_VISITA"
      ) {
        continue;
      }

      const esMia =
        Boolean(
          tarea &&
          Number(
            tarea.asignadoAId
          ) ===
            Number(usuarioId)
        );

      /*
      | Si ya la tomó otro gruyero, no se la saca
      | (aunque todavía no haya cargado nada).
      */

      const empezada =
        Boolean(
          tarea &&
          (
            tareasEmpezadas.has(
              Number(tarea.id)
            ) ||
            tarea.asignadoA?.rol
              ?.nombre === "grua"
          )
        );

      resultado.push({
        reclamo:
          reclamo.toJSON(),

        vehiculos:
          vehiculosPendientes,

        asignadoA:
          tarea?.asignadoA
            ? {
                id: tarea.asignadoA.id,
                nombre:
                  tarea.asignadoA.nombre,
              }
            : null,

        tareaId:
          tarea?.id || null,

        esMia,

        enCurso:
          !esMia &&
          empezada,

        puedeTomar:
          !esMia &&
          !empezada,
      });
    }

    return resultado;
  };

/*
|--------------------------------------------------------------------------
| IDS DE RECLAMOS QUE ESPERAN A LA GRÚA
|--------------------------------------------------------------------------
|
| Se usa para no marcar esos reclamos como
| "para hacer" del jefe de guardia: el único
| que tiene que actuar es la grúa.
|
*/

const obtenerReclamosEsperandoGrua =
  async () => {
    const pendientes =
      await buscarRetirosPendientes();

    return new Set(
      pendientes.map(
        (item) =>
          Number(item.reclamoId)
      )
    );
  };

/*
|--------------------------------------------------------------------------
| ¿EL RECLAMO TIENE UN RETIRO DE GRÚA PENDIENTE?
|--------------------------------------------------------------------------
|
| Se usa para limitar a qué reclamos puede
| subir / ver fotos un usuario grúa.
|
*/

const reclamoTieneRetiroGruaPendiente =
  async (reclamoId) => {
    if (!reclamoId) {
      return false;
    }

    const pendientes =
      await buscarRetirosPendientes({
        reclamoId,
      });

    return pendientes.length > 0;
  };

/*
|--------------------------------------------------------------------------
| ¿ESTE VEHÍCULO / ACTA PUEDE RETIRARLO LA GRÚA?
|--------------------------------------------------------------------------
*/

const puedeRetirarGrua = ({
  infraccion,
  vehiculo,
}) => {
  return Boolean(
    infraccion &&
    vehiculo &&
    infraccion.anulada === false &&
    infraccion.accionPosterior ===
      ACCION_RETIRO_GRUA &&
    Number(infraccion.vehiculoId) ===
      Number(vehiculo.id) &&
    vehiculo.estadoActual ===
      "PENDIENTE_REMOCION"
  );
};

/*
|--------------------------------------------------------------------------
| MAIL A LOS USUARIOS GRÚA
|--------------------------------------------------------------------------
|
| Se llama DESPUÉS de confirmar la transacción.
| Si el correo falla, NO se rompe la segunda visita.
|
*/

const escaparHtml = (valor) =>
  String(
    valor ?? ""
  )
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const describirVehiculo = (
  vehiculo
) => {
  if (!vehiculo) {
    return "Vehículo";
  }

  const partes = [
    vehiculo.tipoVehiculo,
    vehiculo.marca,
    vehiculo.modelo,
    vehiculo.color,
  ].filter(Boolean);

  let texto =
    partes.join(" ") ||
    "Vehículo";

  if (vehiculo.dominio) {
    texto +=
      ` - Dominio ${vehiculo.dominio}`;
  }

  if (vehiculo.numeroInterno) {
    texto +=
      ` - N.º interno ${vehiculo.numeroInterno}`;
  }

  return texto;
};

const notificarGrueros =
  async ({
    reclamo,
    vehiculo,
    infraccion,
  }) => {
    try {
      const rolGrua =
        await Rol.findOne({
          where: {
            nombre: "grua",
            activo: true,
          },
        });

      if (!rolGrua) {
        return 0;
      }

      const grueros =
        await Usuario.findAll({
          where: {
            rolId: rolGrua.id,
            activo: true,
            email: {
              [Op.ne]: null,
            },
          },

          attributes: [
            "id",
            "nombre",
            "email",
          ],
        });

      const textoVehiculo =
        describirVehiculo(
          vehiculo
        );

      const direccion =
        reclamo?.direccion ||
        "Sin dirección";

      const barrio =
        reclamo?.barrio || "";

      const asunto =
        `Vehículo listo para retirar - Reclamo N° ${reclamo?.numeroReclamo || ""}`;

      let enviados = 0;

      for (const gruero of grueros) {
        const email =
          String(
            gruero.email || ""
          ).trim();

        if (!email) {
          continue;
        }

        try {
          await enviarCorreo({
            para: email,

            asunto,

            texto:
              `Hola ${gruero.nombre}.\n\n` +
              `Hay un vehículo con Acta de Infracción listo para retirar con la grúa.\n\n` +
              `Reclamo N°: ${reclamo?.numeroReclamo || ""}\n` +
              `Dirección: ${direccion}${barrio ? ` (${barrio})` : ""}\n` +
              `Vehículo: ${textoVehiculo}\n` +
              `Acta de Infracción N°: ${infraccion?.numeroActa || ""}\n\n` +
              `Ingresá al Sistema de Tránsito, sección "Retiros grúa", para registrar el inventario y el traslado.\n\n` +
              `${URL_SISTEMA}/retiros-grua\n\n` +
              `Este es un mensaje automático. No es necesario responder.`,

            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px;">
                <h2>Sistema de Tránsito</h2>

                <p>
                  Hola <strong>${escaparHtml(gruero.nombre)}</strong>.
                </p>

                <p>
                  Hay un <strong>vehículo con Acta de Infracción</strong>
                  listo para retirar con la grúa.
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
                    ${escaparHtml(reclamo?.numeroReclamo)}
                  </p>

                  <p style="margin: 0 0 8px 0;">
                    <strong>Dirección:</strong>
                    ${escaparHtml(direccion)}${barrio ? ` (${escaparHtml(barrio)})` : ""}
                  </p>

                  <p style="margin: 0 0 8px 0;">
                    <strong>Vehículo:</strong>
                    ${escaparHtml(textoVehiculo)}
                  </p>

                  <p style="margin: 0;">
                    <strong>Acta de Infracción N°:</strong>
                    ${escaparHtml(infraccion?.numeroActa)}
                  </p>
                </div>

                <p>
                  Ingresá al <strong>Sistema de Tránsito</strong>,
                  sección <strong>Retiros grúa</strong>, para registrar
                  el inventario y el traslado.
                </p>

                <p>
                  <a href="${URL_SISTEMA}/retiros-grua">
                    ${URL_SISTEMA}/retiros-grua
                  </a>
                </p>

                <hr />

                <small>
                  Este es un mensaje automático.
                  No es necesario responder.
                </small>
              </div>
            `,
          });

          enviados++;
        } catch (error) {
          console.error(
            `Error enviando aviso de grúa al usuario ${gruero.id}:`,
            error.message
          );
        }
      }

      return enviados;
    } catch (error) {
      console.error(
        "Error notificando a los usuarios grúa:",
        error
      );

      return 0;
    }
  };

/*
|--------------------------------------------------------------------------
| AVISO EN SEGUNDO PLANO
|--------------------------------------------------------------------------
|
| No espera a que salgan los mails: el que guardó
| (inspector) recibe la respuesta enseguida.
|
*/

const avisarGruaEnSegundoPlano = (
  datos
) => {
  setImmediate(() => {
    notificarGrueros(datos).catch(
      (error) => {
        console.error(
          "Error avisando a la grúa:",
          error
        );
      }
    );
  });
};

module.exports = {
  ACCION_RETIRO_GRUA,
  buscarRetirosPendientes,
  buscarConOrdenParaGrua,
  buscarSegundasVisitasParaGrua,
  obtenerReclamosEsperandoGrua,
  avisarGruaEnSegundoPlano,
  reclamoTieneRetiroGruaPendiente,
  puedeRetirarGrua,
  notificarGrueros,
};
