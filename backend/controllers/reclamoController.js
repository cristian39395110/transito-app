const {
  Op,
} = require("sequelize");

const {
  enviarCorreo,
} = require("../services/emailService");

const {
  Reclamo,
  TipoReclamo,
  Usuario,
  Asignacion,
  Rol,
  Infraccion,
  Constatacion,
  Vehiculo,
} = require("../models");

const {
  actualizarVencidos,
} = require(
  "../services/emplazamientoService"
);

const {
  registrarHistorial,
} = require(
  "../services/historialService"
);

const {
  obtenerReclamosEsperandoGrua,
} = require(
  "../services/gruaService"
);


/*
|--------------------------------------------------------------------------
| INCLUDE COMÚN
|--------------------------------------------------------------------------
*/

const includeReclamo = [
  {
    model:
      TipoReclamo,

    as:
      "tipoReclamo",

    attributes: [
      "id",
      "nombre",
    ],
  },

  {
    model:
      Usuario,

    as:
      "jefeGuardia",

    attributes: [
      "id",
      "nombre",
    ],
  },

  {
    model:
      Usuario,

    as:
      "inspector",

    attributes: [
      "id",
      "nombre",
    ],
  },
    {
    model: Vehiculo,
    as: "vehiculos",
    required: false,
    include: [
      {
        model: Infraccion,
        as: "infracciones",
        required: false,
        separate: true,
        order: [["createdAt", "DESC"]],
      },
    ],
  },

  {
    model: Infraccion,
    as: "infracciones",
    required: false,
    separate: true,
    order: [["createdAt", "DESC"]],
  },
];


/*
|--------------------------------------------------------------------------
| ETAPAS QUE YA NO PERTENECEN A RECLAMOS
|--------------------------------------------------------------------------
|
| Reclamos ahora es una bandeja
| de trabajo operativo.
|
| Lo terminado se consulta
| desde Expedientes.
|
*/

const ETAPAS_FUERA_DE_RECLAMOS = [
  "EN_PREDIO",
  "EGRESADO",
  "FINALIZADO",
  "ANULADO",
];


/*
|--------------------------------------------------------------------------
| ETAPAS QUE REQUIEREN UNA ACCIÓN
|--------------------------------------------------------------------------
|
| Esto se usa principalmente
| para el administrador.
|
*/

const ETAPAS_CON_ACCION = [
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


/*
|--------------------------------------------------------------------------
| TEXTO HUMANO
|--------------------------------------------------------------------------
|
| La persona que usa el sistema
| no necesita conocer los nombres
| internos de las etapas.
|
*/

const obtenerTextoAccion =
  (
    reclamo
  ) => {
    switch (
      reclamo.etapaActual
    ) {
      case "PENDIENTE_ASIGNACION_GUARDIA":
        return "Falta asignar una guardia";

      case "PENDIENTE_PRIMERA_VISITA":
        return "Falta mandar un inspector";

      case "PRIMERA_VISITA":
        return "El inspector está trabajando";

      case "ESPERANDO_PLAZO":
        return "Esperar que venza el plazo";

      case "PENDIENTE_SEGUNDA_VISITA":
        return "El plazo venció. Hay que volver a controlar";

      case "SEGUNDA_VISITA":
        return "Un inspector está haciendo el control";

      case "PENDIENTE_DECISION_JEFE":
        return "El jefe debe decidir qué hacer";

     case "PENDIENTE_ENVIO_JUZGADO":
  return "Falta enviar el acta al Juzgado";

case "ESPERANDO_RESOLUCION":
  return "El problema todavía sigue. No hay una tarea pendiente ahora";

case "EN_JUZGADO":
  return "Esperando respuesta del Juzgado";

      case "PENDIENTE_ASIGNACION_POST_JUZGADO":
        return "El Juzgado respondió. Falta asignar una guardia";

      case "POST_JUZGADO_ASIGNADO_GUARDIA":
        return "La guardia debe organizar la actuación";

      case "POST_JUZGADO_EN_ACTUACION":
        return "Hay una actuación en curso";

      case "PENDIENTE_REMOCION":
        return "Hay que retirar el vehículo";

      case "REMOCION_EN_CURSO":
        return "El vehículo está siendo retirado";

      case "PENDIENTE_INGRESO_PREDIO":
        return "Falta confirmar la llegada al predio";

      default:
        return "Revisar el reclamo";
    }
  };


/*
|--------------------------------------------------------------------------
| ¿ESTE USUARIO TIENE QUE HACER ALGO?
|--------------------------------------------------------------------------
|
| Director:
|   solamente decisiones de Dirección.
|
| Jefe:
|   - trabajos de SU guardia
|   - controles vencidos disponibles
|     para cualquier jefe.
|
| Secretaría:
|   lo administrativo de reclamos.
|
| Inspector:
|   no trabaja desde esta pantalla.
|
*/

const requiereAccionUsuario =
  (
    reclamo,
    usuario
  ) => {
    const rol =
      usuario?.rol;

    const usuarioId =
      Number(
        usuario?.id
      );

    const jefeId =
      Number(
        reclamo.jefeGuardiaId
      );

    const etapa =
      reclamo.etapaActual;


    if (
      rol ===
      "administrador"
    ) {
      return ETAPAS_CON_ACCION.includes(
        etapa
      );
    }


    if (
      rol ===
      "director"
    ) {
      return [
        "PENDIENTE_ASIGNACION_GUARDIA",
        "PENDIENTE_ASIGNACION_POST_JUZGADO",
      ].includes(
        etapa
      );
    }


    if (
      rol ===
      "jefe_guardia"
    ) {
      /*
      |--------------------------------------------------------------------------
      | CONTROL VENCIDO
      |--------------------------------------------------------------------------
      |
      | No importa quién hizo
      | el emplazamiento anterior.
      |
      | CUALQUIER jefe puede tomarlo.
      |
      */

      if (
        etapa ===
        "PENDIENTE_SEGUNDA_VISITA"
      ) {
        return true;
      }


      /*
      |--------------------------------------------------------------------------
      | RESTO DE TAREAS
      |--------------------------------------------------------------------------
      |
      | Solamente si actualmente
      | pertenece a su guardia.
      |
      */

      if (
        jefeId !== usuarioId
      ) {
        return false;
      }


      return [
        "PENDIENTE_PRIMERA_VISITA",
        "PENDIENTE_DECISION_JEFE",
        "POST_JUZGADO_ASIGNADO_GUARDIA",
        "PENDIENTE_REMOCION",
      ].includes(
        etapa
      );
    }


    if (
      rol ===
      "secretaria_reclamos"
    ) {
      return (
        etapa ===
        "PENDIENTE_ENVIO_JUZGADO"
      );
    }


    return false;
  };


/*
|--------------------------------------------------------------------------
| PREPARAR PARA FRONTEND
|--------------------------------------------------------------------------
*/

const prepararReclamoOperativo =
  (
    modelo,
    usuario
  ) => {
    const reclamo =
      modelo.toJSON
        ? modelo.toJSON()
        : modelo;

    return {
      ...reclamo,

      requiereAccion:
        requiereAccionUsuario(
          reclamo,
          usuario
        ),

      accionSimple:
        obtenerTextoAccion(
          reclamo
        ),
    };
  };


/*
|--------------------------------------------------------------------------
| WHERE DE RECLAMOS ACTIVOS
|--------------------------------------------------------------------------
|
| No mostramos:
|
| - solucionados
| - listos para cerrar afuera
| - cerrados afuera
| - recibidos en predio
| - egresados
| - finalizados
| - anulados
|
*/

const whereReclamosActivos =
  {
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
                ETAPAS_FUERA_DE_RECLAMOS,
            },
          },
        ],
      },
    ],
  };


/*
|--------------------------------------------------------------------------
| CREAR
|--------------------------------------------------------------------------
*/

const crearReclamo =
  async (
    req,
    res
  ) => {
    try {
      const {
        numeroReclamo,
        direccion,
        barrio,
        referencia,
        latitudDenunciada,
        longitudDenunciada,
        tipoReclamoId,
        observaciones,

        // Se usa únicamente para saber si
        // Claudia eligió un jefe al cargarlo.
        jefeGuardiaId,
      } = req.body;


      if (
        !numeroReclamo ||
        !direccion ||
        !tipoReclamoId
      ) {
        return res
          .status(400)
          .json({
            ok: false,

            mensaje:
              "Número de reclamo, dirección y tipo de reclamo son obligatorios",
          });
      }


      const numero =
        String(
          numeroReclamo
        ).trim();


      const existente =
        await Reclamo.findOne({
          where: {
            numeroReclamo:
              numero,
          },
        });


      if (existente) {
        return res
          .status(400)
          .json({
            ok: false,

            mensaje:
              "Ese número de reclamo ya se encuentra cargado",
          });
      }


      const tipo =
        await TipoReclamo.findByPk(
          tipoReclamoId
        );


      if (
        !tipo ||
        !tipo.activo
      ) {
        return res
          .status(400)
          .json({
            ok: false,

            mensaje:
              "El tipo de reclamo no es válido",
          });
      }


      const reclamo =
        await Reclamo.create({
          numeroReclamo:
            numero,

          direccion:
            direccion.trim(),

          barrio:
            barrio?.trim() ||
            null,

          referencia:
            referencia
              ?.trim() ||
            null,

          latitudDenunciada:
            latitudDenunciada ??
            null,

          longitudDenunciada:
            longitudDenunciada ??
            null,

          tipoReclamoId,

          observaciones:
            observaciones
              ?.trim() ||
            null,

          estado:
            "NUEVO",

          estadoExterno:
            "PENDIENTE",

          etapaActual:
            "PENDIENTE_ASIGNACION_GUARDIA",

          creadoPorId:
            req.usuario.id,
        });


      /*
      |--------------------------------------------------------------------------
      | NOTIFICAR AL DIRECTOR
      |--------------------------------------------------------------------------
      |
      | Solamente avisamos al Director cuando NO se eligió
      | un Jefe de Guardia al momento de cargar el reclamo.
      |
      | Si se eligió un jefe, ReclamoForm hará después
      | la asignación y asignarJefeGuardia notificará
      | directamente a ese jefe.
      |
      | Si falla Gmail, el reclamo YA fue creado.
      | El error de correo nunca rompe la carga.
      |
      */

      if (!jefeGuardiaId) {
        try {
          const directores =
            await Usuario.findAll({
              where: {
                activo: true,
              },

              include: [
                {
                  model: Rol,
                  as: "rol",

                  where: {
                    nombre:
                      "director",
                  },

                  attributes: [
                    "id",
                    "nombre",
                  ],
                },
              ],
            });


          for (
            const director
            of directores
          ) {
            if (!director.email) {
              continue;
            }


            await enviarCorreo({
              para:
                director.email,

              asunto:
                `Nuevo reclamo pendiente de asignación N° ${reclamo.numeroReclamo}`,

              texto:
                `Hola ${director.nombre}.\n\n` +
                `Se cargó un nuevo reclamo que está pendiente de asignación a un Jefe de Guardia.\n\n` +
                `Reclamo N°: ${reclamo.numeroReclamo}\n` +
                `Dirección: ${reclamo.direccion || "Sin dirección"}\n` +
                `Tipo: ${tipo.nombre || "Sin especificar"}\n\n` +
               `Ingresá a https://transito.informerapido.com.ar para ver tu tarea pendiente y asignar el reclamo.\n\n` +
                `Este es un mensaje automático. No es necesario responder.`,

              html: `
                <div
                  style="
                    font-family: Arial, sans-serif;
                    max-width: 600px;
                  "
                >
                  <h2>
                    Sistema de Tránsito
                  </h2>

                  <p>
                    Hola
                    <strong>
                      ${director.nombre}
                    </strong>.
                  </p>

                  <p>
                    Se cargó un nuevo reclamo
                    que está
                    <strong>
                      pendiente de asignación
                    </strong>
                    a un Jefe de Guardia.
                  </p>

                  <div
                    style="
                      padding: 15px;
                      border: 1px solid #dddddd;
                      border-radius: 8px;
                      margin: 20px 0;
                    "
                  >
                    <p
                      style="
                        margin: 0 0 8px 0;
                      "
                    >
                      <strong>
                        Reclamo N°:
                      </strong>

                      ${reclamo.numeroReclamo}
                    </p>

                    <p
                      style="
                        margin: 0 0 8px 0;
                      "
                    >
                      <strong>
                        Dirección:
                      </strong>

                      ${reclamo.direccion || "Sin dirección"}
                    </p>

                    <p
                      style="
                        margin: 0;
                      "
                    >
                      <strong>
                        Tipo:
                      </strong>

                      ${tipo.nombre || "Sin especificar"}
                    </p>
                  </div>

                 <p>
  Ingresá al Sistema de Tránsito para ver
  tu tarea pendiente y asignar el reclamo.
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
      border-radius: 8px;
      text-decoration: none;
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
              `Email enviado al Director ${director.nombre} (${director.email})`
            );
          }
        } catch (
          errorEmail
        ) {
          console.error(
            "El reclamo fue creado correctamente, pero no se pudo enviar el email al Director:",
            errorEmail.message
          );
        }
      }


      return res
        .status(201)
        .json({
          ok: true,

          mensaje:
            "Reclamo cargado correctamente",

          reclamo,
        });
    } catch (error) {
      console.error(
        "Error creando reclamo:",
        error
      );


      return res
        .status(500)
        .json({
          ok: false,

          mensaje:
            "Error al cargar el reclamo",
        });
    }
  };
/*
|--------------------------------------------------------------------------
| ACTUALIZAR RECLAMO
|--------------------------------------------------------------------------
*/

const actualizarReclamo =
  async (req, res) => {
    try {
      const reclamo =
        await Reclamo.findByPk(
          req.params.id
        );

      if (!reclamo) {
        return res.status(404).json({
          ok: false,
          mensaje:
            "Reclamo no encontrado",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | PERMISOS
      |--------------------------------------------------------------------------
      */

      if (
        ![
          "administrador",
          "secretaria_reclamos",
        ].includes(req.usuario.rol)
      ) {
        return res.status(403).json({
          ok: false,
          mensaje:
            "No tenés permiso para editar reclamos",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | SOLO ANTES DE EMPEZAR EL TRABAJO
      |--------------------------------------------------------------------------
      */

      if (
        reclamo.etapaActual !==
        "PENDIENTE_ASIGNACION_GUARDIA"
      ) {
        return res.status(400).json({
          ok: false,
          mensaje:
            "El reclamo ya comenzó su circuito de trabajo y no puede editarse",
        });
      }

      const {
        numeroReclamo,
        direccion,
        barrio,
        referencia,
        latitudDenunciada,
        longitudDenunciada,
        tipoReclamoId,
        observaciones,
      } = req.body;

      if (
        !numeroReclamo ||
        !direccion ||
        !tipoReclamoId
      ) {
        return res.status(400).json({
          ok: false,
          mensaje:
            "Número de reclamo, dirección y tipo de reclamo son obligatorios",
        });
      }

      const numero =
        String(
          numeroReclamo
        ).trim();

      /*
      |--------------------------------------------------------------------------
      | NÚMERO DUPLICADO
      |--------------------------------------------------------------------------
      */

      const existente =
        await Reclamo.findOne({
          where: {
            numeroReclamo: numero,

            id: {
              [Op.ne]:
                reclamo.id,
            },
          },
        });

      if (existente) {
        return res.status(400).json({
          ok: false,
          mensaje:
            "Ese número de reclamo ya se encuentra cargado",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | TIPO DE RECLAMO
      |--------------------------------------------------------------------------
      */

      const tipo =
        await TipoReclamo.findByPk(
          tipoReclamoId
        );

      if (
        !tipo ||
        !tipo.activo
      ) {
        return res.status(400).json({
          ok: false,
          mensaje:
            "El tipo de reclamo no es válido",
        });
      }

      const estadoAnterior =
        reclamo.estado;

      /*
      |--------------------------------------------------------------------------
      | ACTUALIZAR
      |--------------------------------------------------------------------------
      */

      reclamo.numeroReclamo =
        numero;

      reclamo.direccion =
        String(direccion).trim();

      reclamo.barrio =
        barrio?.trim() ||
        null;

      reclamo.referencia =
        referencia?.trim() ||
        null;

      reclamo.tipoReclamoId =
        Number(tipoReclamoId);

      reclamo.observaciones =
        observaciones?.trim() ||
        null;

      reclamo.latitudDenunciada =
        latitudDenunciada ??
        null;

      reclamo.longitudDenunciada =
        longitudDenunciada ??
        null;

      await reclamo.save();

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
          "EDICION_RECLAMO",

        descripcion:
          "Se actualizaron los datos del reclamo",

        estadoAnterior,

        estadoNuevo:
          reclamo.estado,
      });

      const actualizado =
        await Reclamo.findByPk(
          reclamo.id,
          {
            include:
              includeReclamo,
          }
        );

      return res.json({
        ok: true,

        mensaje:
          "Reclamo actualizado correctamente",

        reclamo:
          actualizado,
      });
    } catch (error) {
      console.error(
        "Error actualizando reclamo:",
        error
      );

      return res.status(500).json({
        ok: false,
        mensaje:
          "No se pudo actualizar el reclamo",
      });
    }
  };
/*
|--------------------------------------------------------------------------
| LISTAR RECLAMOS OPERATIVOS
|--------------------------------------------------------------------------
|
| Esta ruta YA NO devuelve
| todo el historial.
|
| Para historial está Expedientes.
|
*/

const listarReclamos =
  async (
    req,
    res
  ) => {
    try {
      try {
        await actualizarVencidos();
      } catch (error) {
        console.error(
          "Error actualizando vencimientos:",
          error
        );
      }


      const modelos =
        await Reclamo.findAll({
          where:
            whereReclamosActivos,

          include:
            includeReclamo,

          order: [
            [
              "updatedAt",
              "DESC",
            ],
          ],
        });


   const idsReclamos =
  modelos.map(
    (item) =>
      Number(item.id)
  );


const infraccionesOrden =
  idsReclamos.length
    ? await Infraccion.findAll({
        where: {
          reclamoId: {
            [Op.in]:
              idsReclamos,
          },

          anulada:
            false,

          requiereOrdenRemocion:
            true,

          estadoOrdenRemocion: {
            [Op.in]: [
              "PENDIENTE_SOLICITUD",
              "ESPERANDO_RESPUESTA",
            ],
          },
        },

        order: [
          [
            "id",
            "DESC",
          ],
        ],
      })
    : [];


const ordenPorReclamo =
  new Map();

/*
| Reclamos cuyo único pendiente es que pase la grúa.
| Nadie de la guardia tiene que hacer nada:
| no se marcan como "para hacer".
*/

let reclamosEsperandoGrua =
  new Set();

try {
  reclamosEsperandoGrua =
    await obtenerReclamosEsperandoGrua();
} catch (errorGrua) {
  console.error(
    "Error obteniendo reclamos esperando grúa:",
    errorGrua
  );
}


for (
  const infraccion of
  infraccionesOrden
) {
  const reclamoId =
    Number(
      infraccion.reclamoId
    );

  if (
    !ordenPorReclamo.has(
      reclamoId
    )
  ) {
    ordenPorReclamo.set(
      reclamoId,
      infraccion
    );
  }
}


const reclamos =
  modelos.map(
    (modelo) => {
      const preparado =
        prepararReclamoOperativo(
          modelo,
          req.usuario
        );

      if (
        preparado.etapaActual ===
          "PENDIENTE_REMOCION" &&
        reclamosEsperandoGrua.has(
          Number(modelo.id)
        )
      ) {
        preparado.requiereAccion =
          false;

        preparado.accionSimple =
          "Esperando que la grúa retire el vehículo";
      }

      const infraccionOrden =
        ordenPorReclamo.get(
          Number(modelo.id)
        );


      if (
        !infraccionOrden
      ) {
        return {
          ...preparado,

          esperaOrdenRemocion:
            false,

          estadoOrdenRemocion:
            null,
        };
      }


      const estadoOrden =
        infraccionOrden
          .estadoOrdenRemocion;


      return {
        ...preparado,

        esperaOrdenRemocion:
          true,

        estadoOrdenRemocion:
          estadoOrden,

        accionSimple:
          estadoOrden ===
          "PENDIENTE_SOLICITUD"
            ? "Falta solicitar orden para retirar el vehículo"
            : "Esperando orden judicial para retirar el vehículo",
      };
    }
  );


      const paraHacer =
        reclamos.filter(
          (
            reclamo
          ) =>
            reclamo.requiereAccion
        ).length;


      const esperando =
        reclamos.length -
        paraHacer;


      return res.json({
        ok: true,

        reclamos,

        resumen: {
          paraHacer,
          esperando,
          totalActivos:
            reclamos.length,
        },
      });
    } catch (error) {
      console.error(
        "Error listando reclamos:",
        error
      );


      return res
        .status(500)
        .json({
          ok: false,

          mensaje:
            "Error al obtener reclamos",
        });
    }
  };


/*
|--------------------------------------------------------------------------
| PARA CERRAR EN SISTEMA EXTERNO
|--------------------------------------------------------------------------
|
| Esta es la bandeja de Secretaría.
|
| Ya se solucionó en la calle,
| pero todavía falta darlo de baja
| en el sistema externo.
|
*/

const listarParaCerrar =
  async (
    req,
    res
  ) => {
    try {
      /*
      |--------------------------------------------------------------------------
      | RECLAMOS LISTOS PARA CERRAR
      |--------------------------------------------------------------------------
      */

      const modelos =
        await Reclamo.findAll({
          where: {
            estadoExterno:
              "LISTO_PARA_CERRAR",
          },

          include:
            includeReclamo,

          order: [
            [
              "updatedAt",
              "DESC",
            ],
          ],
        });


      /*
      |--------------------------------------------------------------------------
      | BUSCAR RESULTADO DE LA PRIMERA VISITA
      |--------------------------------------------------------------------------
      |
      | No modificamos includeReclamo porque se utiliza en muchas otras rutas.
      |
      | Solamente necesitamos distinguir:
      |
      | RESUELTO_EN_LUGAR
      |   -> realmente estaba solucionado.
      |
      | NO_CONSTATADO
      |   -> inspector fue pero no encontró lo denunciado.
      |
      */

      const idsReclamos =
        modelos.map(
          (reclamo) =>
            Number(
              reclamo.id
            )
        );


      const constataciones =
        idsReclamos.length
          ? await Constatacion.findAll({
              where: {
                reclamoId: {
                  [Op.in]:
                    idsReclamos,
                },
              },

              attributes: [
                "id",
                "reclamoId",
                "resultado",
                "situacion",
                "observaciones",
                "createdAt",
              ],

              order: [
                [
                  "createdAt",
                  "DESC",
                ],
              ],
            })
          : [];


      /*
      |--------------------------------------------------------------------------
      | ÚLTIMA CONSTATACIÓN DE CADA RECLAMO
      |--------------------------------------------------------------------------
      */

      const constatacionPorReclamo =
        new Map();


      for (
        const constatacion of
        constataciones
      ) {
        const reclamoId =
          Number(
            constatacion.reclamoId
          );


        if (
          !constatacionPorReclamo.has(
            reclamoId
          )
        ) {
          constatacionPorReclamo.set(
            reclamoId,
            constatacion
          );
        }
      }


      /*
      |--------------------------------------------------------------------------
      | PREPARAR RESPUESTA
      |--------------------------------------------------------------------------
      */

      const reclamos =
        modelos.map(
          (modelo) => {
            const reclamo =
              modelo.toJSON();

            const constatacion =
              constatacionPorReclamo.get(
                Number(
                  reclamo.id
                )
              );


            return {
              ...reclamo,

              resultadoCierre:
                constatacion
                  ?.resultado ||
                null,

              situacionCierre:
                constatacion
                  ?.situacion ||
                null,

              observacionesCierre:
                constatacion
                  ?.observaciones ||
                null,
            };
          }
        );


      return res.json({
        ok: true,

        reclamos,
      });
    } catch (error) {
      console.error(
        "Error listando reclamos para cerrar:",
        error
      );


      return res
        .status(500)
        .json({
          ok: false,

          mensaje:
            "No se pudieron obtener los reclamos pendientes de cierre",
        });
    }
  };


/*
|--------------------------------------------------------------------------
| MI GUARDIA
|--------------------------------------------------------------------------
|
| El jefe ve:
|
| 1. Reclamos ACTIVOS
|    que pertenecen a su guardia.
|
| 2. TODOS los reclamos cuyo plazo
|    venció y están disponibles
|    para un nuevo control.
|
*/

const listarMiGuardia =
  async (
    req,
    res
  ) => {
    try {
      try {
        await actualizarVencidos();
      } catch (error) {
        console.error(
          "Error actualizando vencimientos:",
          error
        );
      }


      const reclamos =
        await Reclamo.findAll({
          where: {
            [Op.and]: [
              whereReclamosActivos,

              {
                [Op.or]: [
                  {
                    jefeGuardiaId:
                      req.usuario.id,
                  },

                  {
                    etapaActual:
                      "PENDIENTE_SEGUNDA_VISITA",
                  },
                ],
              },
            ],
          },

          include:
            includeReclamo,

          order: [
            [
              "updatedAt",
              "DESC",
            ],
          ],
        });


      return res.json({
        ok: true,
        reclamos,
      });
    } catch (error) {
      console.error(
        "Error cargando Mi Guardia:",
        error
      );


      return res
        .status(500)
        .json({
          ok: false,

          mensaje:
            "Error al obtener los reclamos de la guardia",
        });
    }
  };


/*
|--------------------------------------------------------------------------
| MIS TRABAJOS DEL INSPECTOR
|--------------------------------------------------------------------------
|
| No tocamos esta lógica.
|
| El inspector trabaja con TAREAS,
| no con la bandeja Reclamos.
|
*/

const listarMisTrabajos =
  async (
    req,
    res
  ) => {
    try {
      try {
        await actualizarVencidos();
      } catch (error) {
        console.error(
          "Error actualizando vencimientos:",
          error
        );
      }

      /*
      |--------------------------------------------------------------------------
      | ASIGNACIONES DEL INSPECTOR
      |--------------------------------------------------------------------------
      */

      const asignaciones =
        await Asignacion.findAll({
          where: {
            tipo:
              "INSPECTOR",

            asignadoAId:
              req.usuario.id,
          },

          include: [
            {
              model:
                Reclamo,

              as:
                "reclamo",

              required:
                true,

              include:
                includeReclamo,
            },
          ],

          order: [
            [
              "fechaAsignacion",
              "DESC",
            ],
          ],
        });

      /*
      |--------------------------------------------------------------------------
      | RECLAMOS INVOLUCRADOS
      |--------------------------------------------------------------------------
      |
      | Se conserva para compatibilidad con las asignaciones históricas.
      |
      */

      const idsReclamosTrabajos = [
        ...new Set(
          asignaciones
            .map(
              (asignacion) =>
                Number(
                  asignacion.reclamoId
                )
            )
            .filter(Boolean)
        ),
      ];

      /*
      |--------------------------------------------------------------------------
      | INFRACCIONES EXACTAS DE LAS ASIGNACIONES NUEVAS
      |--------------------------------------------------------------------------
      |
      | Sistema nuevo:
      |
      | Asignacion.infraccionId
      |        ↓
      | Infraccion exacta
      |
      */

      const idsInfraccionesExactas = [
        ...new Set(
          asignaciones
            .map(
              (asignacion) =>
                Number(
                  asignacion.infraccionId
                )
            )
            .filter(Boolean)
        ),
      ];

      const infraccionesExactas =
        idsInfraccionesExactas.length
          ? await Infraccion.findAll({
              where: {
                id: {
                  [Op.in]:
                    idsInfraccionesExactas,
                },

                anulada:
                  false,
              },
            })
          : [];

      const infraccionPorId =
        new Map();

      for (
        const infraccion of
        infraccionesExactas
      ) {
        infraccionPorId.set(
          Number(
            infraccion.id
          ),
          infraccion
        );
      }

      /*
      |--------------------------------------------------------------------------
      | COMPATIBILIDAD - POST JUZGADO DEL SISTEMA VIEJO
      |--------------------------------------------------------------------------
      |
      | Las asignaciones históricas no tienen infraccionId.
      |
      | Por eso seguimos buscando las infracciones autorizadas.
      |
      | IMPORTANTE:
      | no vamos a elegir "la última" si existen varias para el mismo
      | reclamo. Solamente hacemos fallback cuando hay UNA sola opción.
      |
      */

      const infraccionesPostJuzgado =
        idsReclamosTrabajos.length
          ? await Infraccion.findAll({
              where: {
                reclamoId: {
                  [Op.in]:
                    idsReclamosTrabajos,
                },

                anulada:
                  false,

                requiereOrdenRemocion:
                  true,

                estadoOrdenRemocion:
                  "AUTORIZADA",
              },

              order: [
                [
                  "id",
                  "DESC",
                ],
              ],
            })
          : [];

      /*
      |--------------------------------------------------------------------------
      | COMPATIBILIDAD - RETIRO INMEDIATO
      |--------------------------------------------------------------------------
      */

      const infraccionesRetiroInmediato =
        idsReclamosTrabajos.length
          ? await Infraccion.findAll({
              where: {
                reclamoId: {
                  [Op.in]:
                    idsReclamosTrabajos,
                },

                anulada:
                  false,

                accionPosterior:
                  "RETIRO_INMEDIATO",
              },

              order: [
                [
                  "id",
                  "DESC",
                ],
              ],
            })
          : [];

      /*
      |--------------------------------------------------------------------------
      | AGRUPAR INFRACCIONES POR RECLAMO
      |--------------------------------------------------------------------------
      |
      | No colapsamos a una sola.
      |
      */

      const autorizadasPorReclamo =
        new Map();

      for (
        const infraccion of
        infraccionesPostJuzgado
      ) {
        const reclamoId =
          Number(
            infraccion.reclamoId
          );

        if (
          !autorizadasPorReclamo.has(
            reclamoId
          )
        ) {
          autorizadasPorReclamo.set(
            reclamoId,
            []
          );
        }

        autorizadasPorReclamo
          .get(reclamoId)
          .push(infraccion);
      }

      const retirosPorReclamo =
        new Map();

      for (
        const infraccion of
        infraccionesRetiroInmediato
      ) {
        const reclamoId =
          Number(
            infraccion.reclamoId
          );

        if (
          !retirosPorReclamo.has(
            reclamoId
          )
        ) {
          retirosPorReclamo.set(
            reclamoId,
            []
          );
        }

        retirosPorReclamo
          .get(reclamoId)
          .push(infraccion);
      }

      /*
      |--------------------------------------------------------------------------
      | ARMAR TRABAJOS
      |--------------------------------------------------------------------------
      */

      const trabajos =
        asignaciones.map(
          (
            asignacion
          ) => {
            const tarea =
              asignacion.toJSON();

            const reclamoId =
              Number(
                tarea.reclamoId
              );

            const infraccionId =
              Number(
                tarea.infraccionId
              );

            const vehiculoId =
              Number(
                tarea.vehiculoId
              );

            const esRemocionInmediata =
              tarea.etapa ===
                "SEGUNDA_VISITA" &&
              tarea.reclamo
                ?.etapaActual ===
                "REMOCION_EN_CURSO";

            let infraccionRelacionada =
              null;

            /*
            |--------------------------------------------------------------------------
            | SISTEMA NUEVO
            |--------------------------------------------------------------------------
            |
            | Si la asignación conoce la infracción exacta,
            | no se adivina nada.
            |
            */

            if (
              infraccionId
            ) {
              infraccionRelacionada =
                infraccionPorId.get(
                  infraccionId
                ) ||
                null;
            }

            /*
            |--------------------------------------------------------------------------
            | COMPATIBILIDAD POR VEHÍCULO
            |--------------------------------------------------------------------------
            |
            | Si por algún motivo existe vehiculoId pero todavía no
            | infraccionId, intentamos identificarla por vehículo.
            |
            */

            if (
              !infraccionRelacionada &&
              vehiculoId &&
              tarea.etapa ===
                "POST_JUZGADO"
            ) {
              const candidatas =
                (
                  autorizadasPorReclamo.get(
                    reclamoId
                  ) ||
                  []
                ).filter(
                  (infraccion) =>
                    Number(
                      infraccion.vehiculoId
                    ) ===
                    vehiculoId
                );

              if (
                candidatas.length ===
                1
              ) {
                infraccionRelacionada =
                  candidatas[0];
              }
            }

            /*
            |--------------------------------------------------------------------------
            | SISTEMA VIEJO
            |--------------------------------------------------------------------------
            |
            | Las asignaciones históricas pueden no tener vehiculoId
            | ni infraccionId.
            |
            | Solamente usamos fallback si existe UNA infracción posible.
            |
            | Si existen varias, no elegimos una al azar.
            |
            */

            if (
              !infraccionRelacionada &&
              tarea.etapa ===
                "POST_JUZGADO"
            ) {
              const candidatas =
                autorizadasPorReclamo.get(
                  reclamoId
                ) ||
                [];

              if (
                candidatas.length ===
                1
              ) {
                infraccionRelacionada =
                  candidatas[0];
              }
            }

            /*
            |--------------------------------------------------------------------------
            | RETIRO INMEDIATO
            |--------------------------------------------------------------------------
            |
            | Conservamos el funcionamiento anterior.
            |
            | Si existe vehiculoId intentamos usarlo.
            | Para históricos sin relación exacta solamente hacemos
            | fallback cuando existe una única infracción posible.
            |
            */

            if (
              !infraccionRelacionada &&
              esRemocionInmediata
            ) {
              const candidatas =
                retirosPorReclamo.get(
                  reclamoId
                ) ||
                [];

              if (
                vehiculoId
              ) {
                const porVehiculo =
                  candidatas.filter(
                    (infraccion) =>
                      Number(
                        infraccion.vehiculoId
                      ) ===
                      vehiculoId
                  );

                if (
                  porVehiculo.length ===
                    1
                ) {
                  infraccionRelacionada =
                    porVehiculo[0];
                }
              }

              if (
                !infraccionRelacionada &&
                candidatas.length ===
                  1
              ) {
                infraccionRelacionada =
                  candidatas[0];
              }
            }

            return {
              id:
                tarea.id,

              asignacionId:
                tarea.id,

              etapa:
                tarea.etapa,

              estadoTarea:
                tarea.estadoTarea,

              fechaAsignacion:
                tarea.fechaAsignacion,

              fechaFinalizacion:
                tarea.fechaFinalizacion,

              observacionesAsignacion:
                tarea.observaciones,

              /*
              |--------------------------------------------------------------
              | REFERENCIAS EXACTAS
              |--------------------------------------------------------------
              */

              vehiculoId:
                tarea.vehiculoId ||
                infraccionRelacionada
                  ?.vehiculoId ||
                null,

              infraccionId:
                tarea.infraccionId ||
                infraccionRelacionada
                  ?.id ||
                null,

              reclamo:
                tarea.reclamo,

              infraccion:
                infraccionRelacionada
                  ? {
                      id:
                        infraccionRelacionada.id,

                      vehiculoId:
                        infraccionRelacionada.vehiculoId ||
                        null,

                      numeroActa:
                        infraccionRelacionada.numeroActa,

                      accionPosterior:
                        infraccionRelacionada.accionPosterior,

                      estadoJuzgado:
                        infraccionRelacionada.estadoJuzgado,

                      requiereOrdenRemocion:
                        infraccionRelacionada.requiereOrdenRemocion,

                      estadoOrdenRemocion:
                        infraccionRelacionada.estadoOrdenRemocion,

                      fechaRespuestaOrdenRemocion:
                        infraccionRelacionada.fechaRespuestaOrdenRemocion,
                    }
                  : null,
            };
          }
        );

      /*
      |--------------------------------------------------------------------------
      | COMPATIBILIDAD TEMPORAL
      |--------------------------------------------------------------------------
      */

      const reclamos =
        trabajos.map(
          (
            trabajo
          ) => ({
            ...trabajo.reclamo,

            tareaInspector: {
              id:
                trabajo.id,

              etapa:
                trabajo.etapa,

              estadoTarea:
                trabajo.estadoTarea,

              fechaAsignacion:
                trabajo.fechaAsignacion,

              fechaFinalizacion:
                trabajo.fechaFinalizacion,

              observaciones:
                trabajo.observacionesAsignacion,

              vehiculoId:
                trabajo.vehiculoId,

              infraccionId:
                trabajo.infraccionId,
            },
          })
        );

      return res.json({
        ok: true,

        trabajos,

        reclamos,
      });
    } catch (error) {
      console.error(
        "Error cargando Mis Trabajos:",
        error
      );

      return res
        .status(500)
        .json({
          ok: false,

          mensaje:
            "Error al obtener los trabajos del inspector",
        });
    }
  };

/*
|--------------------------------------------------------------------------
| OBTENER UNO
|--------------------------------------------------------------------------
*/

const obtenerReclamo =
  async (
    req,
    res
  ) => {
    try {
      try {
        await actualizarVencidos();
      } catch (error) {
        console.error(
          "Error actualizando vencimientos:",
          error
        );
      }


      const reclamo =
        await Reclamo.findByPk(
          req.params.id,
          {
            include:
              includeReclamo,
          }
        );


      if (!reclamo) {
        return res
          .status(404)
          .json({
            ok: false,

            mensaje:
              "Reclamo no encontrado",
          });
      }


      /*
      |--------------------------------------------------------------------------
      | SEGURIDAD DEL INSPECTOR
      |--------------------------------------------------------------------------
      |
      | Puede abrirlo solamente si
      | alguna vez tuvo una tarea allí.
      |
      */

      if (
        [
          "inspector",
          "grua",
        ].includes(
          req.usuario.rol
        )
      ) {
        const tuvoAsignacion =
          await Asignacion.findOne({
            where: {
              reclamoId:
                reclamo.id,

              tipo:
                "INSPECTOR",

              asignadoAId:
                req.usuario.id,
            },
          });


        if (
          !tuvoAsignacion
        ) {
          return res
            .status(403)
            .json({
              ok: false,

              mensaje:
                "Este reclamo no pertenece a tus trabajos.",
            });
        }
      }


      return res.json({
        ok: true,
        reclamo,
      });
    } catch (error) {
      console.error(
        "Error obteniendo reclamo:",
        error
      );


      return res
        .status(500)
        .json({
          ok: false,

          mensaje:
            "Error al obtener el reclamo",
        });
    }
  };


/*
|--------------------------------------------------------------------------
| CIERRE EN SISTEMA EXTERNO
|--------------------------------------------------------------------------
|
| Secretaría primero lo cierra
| en el sistema externo.
|
| Después presiona el botón
| dentro de nuestro sistema.
|
*/


/*
|--------------------------------------------------------------------------
| RESOLVER PROBLEMA FÍSICO
|--------------------------------------------------------------------------
|
| Esta acción la realiza Dirección.
|
| La infracción/Juzgado sigue siendo
| un trámite independiente.
|
*/

const resolverProblemaFisico =
  async (req, res) => {
    try {
      const reclamo =
        await Reclamo.findByPk(
          req.params.id
        );

      if (!reclamo) {
        return res.status(404).json({
          ok: false,
          mensaje:
            "Reclamo no encontrado",
        });
      }

      if (
        ![
          "director",
          "administrador",
        ].includes(
          req.usuario.rol
        )
      ) {
        return res.status(403).json({
          ok: false,
          mensaje:
            "Solamente Dirección puede registrar cómo se resolvió el problema",
        });
      }

      if (
        reclamo.estado ===
        "RESUELTO"
      ) {
        return res.status(400).json({
          ok: false,
          mensaje:
            "Este reclamo ya está resuelto",
        });
      }

      /*
      Aceptamos los dos nombres por ahora
      para no romper reclamos existentes.

      Después dejamos uno solo cuando
      hagamos la migración de MySQL.
      */

    const etapasPermitidas = [
  "ESPERANDO_RESOLUCION",
];

      if (
        !etapasPermitidas.includes(
          reclamo.etapaActual
        )
      ) {
        return res.status(400).json({
          ok: false,
          mensaje:
            "Este reclamo todavía no está en la etapa de resolución física",
        });
      }

      const {
        resueltoPor,
        detalleResolucion,
        costoMunicipalEstado,
        costoMunicipal,
      } = req.body;

      if (
        ![
          "RESPONSABLE",
          "MUNICIPALIDAD",
        ].includes(
          resueltoPor
        )
      ) {
        return res.status(400).json({
          ok: false,
          mensaje:
            "Indicá quién solucionó el problema",
        });
      }

      /*
      MUNICIPALIDAD
      */

      if (
        resueltoPor ===
        "MUNICIPALIDAD"
      ) {
        if (
          !detalleResolucion
            ?.trim()
        ) {
          return res.status(400).json({
            ok: false,
            mensaje:
              "Indicá qué trabajo realizó la Municipalidad",
          });
        }

        const estadosCosto = [
          "NO_INFORMADO",
          "SIN_COSTO",
          "INFORMADO",
        ];

        if (
          costoMunicipalEstado &&
          !estadosCosto.includes(
            costoMunicipalEstado
          )
        ) {
          return res.status(400).json({
            ok: false,
            mensaje:
              "Estado del costo inválido",
          });
        }

        if (
          costoMunicipalEstado ===
          "INFORMADO"
        ) {
          const monto =
            Number(
              costoMunicipal
            );

          if (
            Number.isNaN(monto) ||
            monto < 0
          ) {
            return res.status(400).json({
              ok: false,
              mensaje:
                "Ingresá un costo válido",
            });
          }

          reclamo.costoMunicipal =
            monto;
        } else {
          reclamo.costoMunicipal =
            null;
        }

        reclamo.costoMunicipalEstado =
          costoMunicipalEstado ||
          "NO_INFORMADO";
      }

      /*
      RESPONSABLE PARTICULAR
      */

      if (
        resueltoPor ===
        "RESPONSABLE"
      ) {
        reclamo.costoMunicipalEstado =
          null;

        reclamo.costoMunicipal =
          null;
      }

      /*
      ¿La infracción ya había sido
      comunicada al Juzgado?

      Si ya salió de Secretaría y después
      Municipalidad hizo un trabajo,
      queda una NOVEDAD para informar.
      */

      let novedadJuzgado =
        false;

      if (
        resueltoPor ===
        "MUNICIPALIDAD"
      ) {
        const infraccion =
          await Infraccion.findOne({
            where: {
              reclamoId:
                reclamo.id,

              anulada:
                false,
            },

            order: [
              [
                "id",
                "DESC",
              ],
            ],
          });

        if (
          infraccion &&
          [
            "ENVIADO",
            "AUTORIZADO",
            "NO_AUTORIZADO",
            "OTRO",
          ].includes(
            infraccion.estadoJuzgado
          )
        ) {
          novedadJuzgado =
            true;
        }
      }

      const estadoAnterior =
        reclamo.estado;

      reclamo.resueltoPor =
        resueltoPor;

      reclamo.detalleResolucion =
        detalleResolucion
          ?.trim() ||
        null;

      reclamo.fechaResolucion =
        new Date();

      reclamo.estado =
        "RESUELTO";

      reclamo.etapaActual =
        "FINALIZADO";

      reclamo.estadoExterno =
        "LISTO_PARA_CERRAR";

      reclamo.inspectorId =
        null;

      reclamo.novedadJuzgadoPendiente =
        novedadJuzgado;

      reclamo.novedadJuzgadoInformadaAt =
        null;

      reclamo.novedadJuzgadoInformadaPorId =
        null;

      await reclamo.save();

      await registrarHistorial({
        reclamoId:
          reclamo.id,

        usuarioId:
          req.usuario.id,

        accion:
          "RESOLUCION_PROBLEMA",

        descripcion:
          resueltoPor ===
          "MUNICIPALIDAD"
            ? `Dirección confirmó que la Municipalidad solucionó el problema${
                detalleResolucion
                  ? `: ${detalleResolucion.trim()}`
                  : ""
              }`
            : `Dirección confirmó que el responsable solucionó el problema${
                detalleResolucion
                  ? `: ${detalleResolucion.trim()}`
                  : ""
              }`,

        estadoAnterior,

        estadoNuevo:
          "RESUELTO",
      });

      return res.json({
        ok: true,

        mensaje:
          "Problema marcado como solucionado",

        reclamo,

        novedadJuzgadoPendiente:
          novedadJuzgado,
      });
    } catch (error) {
      console.error(
        "Error resolviendo problema físico:",
        error
      );

      return res.status(500).json({
        ok: false,
        mensaje:
          "No se pudo registrar la solución del problema",
      });
    }
  };

const cerrarReclamoExterno =
  async (
    req,
    res
  ) => {
    try {
      const reclamo =
        await Reclamo.findByPk(
          req.params.id
        );


      if (!reclamo) {
        return res
          .status(404)
          .json({
            ok: false,

            mensaje:
              "Reclamo no encontrado",
          });
      }


      if (
        reclamo.estadoExterno !==
        "LISTO_PARA_CERRAR"
      ) {
        return res
          .status(400)
          .json({
            ok: false,

            mensaje:
              "Este reclamo no está pendiente de cierre externo",
          });
      }


   if (reclamo.informeJefeGuardia?.trim()) {
  return res.status(400).json({
    ok: false,
    mensaje:
      "Este reclamo está fuera de competencia de Tránsito. Debe utilizarse el cierre específico de Secretaría.",
  });
}

reclamo.estadoExterno =
  "CERRADO";

reclamo.fechaCierreExterno =
  new Date();

      reclamo.cerradoExternoPorId =
        req.usuario.id;


      await reclamo.save();


      return res.json({
        ok: true,

        mensaje:
          "Reclamo cerrado correctamente",

        reclamo,
      });
    } catch (error) {
      console.error(
        "Error cerrando reclamo externo:",
        error
      );


      return res
        .status(500)
        .json({
          ok: false,

          mensaje:
            "Error al cerrar el reclamo",
        });
    }
  };


/*
|--------------------------------------------------------------------------
| INFORME POR FUERA DE COMPETENCIA DE TRÁNSITO
|--------------------------------------------------------------------------
*/

const derivarFueraCompetencia = async (req, res) => {
  try {
    const informe =
      typeof req.body.informeJefeGuardia === "string"
        ? req.body.informeJefeGuardia.trim()
        : "";

    if (!informe) {
      return res.status(400).json({
        ok: false,
        mensaje: "El informe del jefe de guardia es obligatorio",
      });
    }

    const reclamo = await Reclamo.findByPk(req.params.id);

    if (!reclamo) {
      return res.status(404).json({
        ok: false,
        mensaje: "Reclamo no encontrado",
      });
    }

    if (
      req.usuario.rol !== "administrador" &&
      Number(reclamo.jefeGuardiaId) !== Number(req.usuario.id)
    ) {
      return res.status(403).json({
        ok: false,
        mensaje: "Este reclamo no pertenece a tu guardia",
      });
    }

    if (
      ["RESUELTO", "ANULADO"].includes(reclamo.estado) ||
      reclamo.estadoExterno !== "PENDIENTE" ||
      ["FINALIZADO", "ANULADO"].includes(reclamo.etapaActual)
    ) {
      return res.status(400).json({
        ok: false,
        mensaje: "Este reclamo ya no admite derivaciones",
      });
    }

    const etapasPermitidas = [
      "PENDIENTE_PRIMERA_VISITA",
      "PENDIENTE_DECISION_JEFE",
    ];

    if (!etapasPermitidas.includes(reclamo.etapaActual)) {
      return res.status(400).json({
        ok: false,
        mensaje: "El reclamo tiene una actuación en curso o pendiente",
      });
    }

    const infraccionVigente = await Infraccion.findOne({
      where: {
        reclamoId: reclamo.id,
        anulada: false,
      },
    });

    if (infraccionVigente) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "El reclamo tiene una infracción vigente. No puede cerrarse por esta vía.",
      });
    }

    const tareaAbierta = await Asignacion.findOne({
      where: {
        reclamoId: reclamo.id,
        tipo: "INSPECTOR",
     [Op.or]: [
  {
    estadoTarea: {
      [Op.in]: ["PENDIENTE", "EN_CURSO"],
    },
  },
  {
    estadoTarea: null,
  },
],
      },
    });

    if (tareaAbierta) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "Hay una tarea de inspector pendiente. Debe finalizarse primero.",
      });
    }

    const estadoAnterior = reclamo.estado;

    reclamo.informeJefeGuardia = informe;
    reclamo.estadoExterno = "LISTO_PARA_CERRAR";

    await reclamo.save();

    await registrarHistorial({
      reclamoId: reclamo.id,
      usuarioId: req.usuario.id,
      accion: "INFORME_FUERA_COMPETENCIA",
      descripcion:
        `El jefe de guardia informó que el reclamo ` +
        `no corresponde a Tránsito. Motivo: ${informe}`,
      estadoAnterior,
      estadoNuevo: reclamo.estado,
    });

    return res.json({
      ok: true,
      mensaje: "Informe enviado a Secretaría correctamente",
      reclamo,
    });
  } catch (error) {
    console.error("Error derivando fuera de competencia:", error);

    return res.status(500).json({
      ok: false,
      mensaje: "No se pudo enviar el informe a Secretaría",
    });
  }
};


/*
|--------------------------------------------------------------------------
| SECRETARÍA - CIERRE POR FUERA DE COMPETENCIA
|--------------------------------------------------------------------------
*/

const cerrarFueraCompetencia = async (req, res) => {
  try {
    const reclamo = await Reclamo.findByPk(req.params.id);

    if (!reclamo) {
      return res.status(404).json({
        ok: false,
        mensaje: "Reclamo no encontrado",
      });
    }

    if (
      !reclamo.informeJefeGuardia?.trim() ||
      reclamo.estadoExterno !== "LISTO_PARA_CERRAR"
    ) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "Este reclamo no tiene un informe pendiente de cierre",
      });
    }

    const estadoAnterior = reclamo.estado;

    reclamo.estadoExterno = "CERRADO";
    reclamo.fechaCierreExterno = new Date();
    reclamo.cerradoExternoPorId = req.usuario.id;

    await reclamo.save();

    await registrarHistorial({
      reclamoId: reclamo.id,
      usuarioId: req.usuario.id,
      accion: "CIERRE_FUERA_COMPETENCIA",
      descripcion:
        "Secretaría confirmó el cierre externo del reclamo " +
        "por no corresponder a Tránsito. " +
        "No implica que el problema físico haya sido solucionado.",
      estadoAnterior,
      estadoNuevo: reclamo.estado,
    });

    return res.json({
      ok: true,
      mensaje: "Cierre externo confirmado correctamente",
      reclamo,
    });
  } catch (error) {
    console.error("Error cerrando fuera de competencia:", error);

    return res.status(500).json({
      ok: false,
      mensaje: "No se pudo confirmar el cierre externo",
    });
  }
};


module.exports = {
  crearReclamo,
  actualizarReclamo,
  listarReclamos,
  listarParaCerrar,
  listarMiGuardia,
  listarMisTrabajos,
  obtenerReclamo,
  resolverProblemaFisico,
  cerrarReclamoExterno,
  derivarFueraCompetencia,
  cerrarFueraCompetencia,
};
