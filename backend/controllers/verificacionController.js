const {
  Op,
} = require("sequelize");

const {
  sequelize,
  Reclamo,
  Asignacion,
  Verificacion,
  Emplazamiento,
  Infraccion,
  Vehiculo,
  Foto,
} = require("../models");


const convertirPlazoAHoras = (
  cantidad,
  unidad
) => {
  const numero =
    Number(cantidad);

  if (
    !Number.isFinite(numero) ||
    numero <= 0
  ) {
    return null;
  }

  if (unidad === "DIAS") {
    return numero * 24;
  }

  return numero;
};


const finalizarTarea = async (
  tarea,
  transaction
) => {
  if (!tarea) {
    return;
  }

  tarea.estadoTarea =
    "FINALIZADA";

  tarea.fechaFinalizacion =
    new Date();

  await tarea.save({
    transaction,
  });
};



const obtenerPendientesDeLaTarea = async ({
  reclamoId,
  tareaId,
  transaction,
}) => {
  const emplazamientos =
    await Emplazamiento.findAll({
      where: {
        reclamoId,
      },
      transaction,
    });

  const verificaciones =
    await Verificacion.findAll({
      where: {
        asignacionId: tareaId,
      },
      transaction,
    });

  /*
  |--------------------------------------------------------------------------
  | VEHÍCULOS DEL RECLAMO
  |--------------------------------------------------------------------------
  |
  | Necesitamos conocer el estado actual de cada vehículo.
  |
  | Un vehículo que ya entró al circuito de remoción/predio
  | NO debe volver a aparecer en una segunda visita futura.
  |
  */

  const vehiculos =
    await Vehiculo.findAll({
      where: {
        reclamoId,
      },
      transaction,
    });

  const vehiculosPorId =
    new Map(
      vehiculos.map(
        (vehiculo) => [
          Number(vehiculo.id),
          vehiculo,
        ]
      )
    );

  /*
  |--------------------------------------------------------------------------
  | ESTADOS QUE YA SALIERON DEL CIRCUITO DE EMPLAZAMIENTO
  |--------------------------------------------------------------------------
  */

  const estadosVehiculoFueraDeControl =
    new Set([
      "PENDIENTE_REMOCION",
      "REMOVIDO",
      "PENDIENTE_INGRESO_PREDIO",
      "EN_PREDIO",
      "EGRESADO",
    ]);

  /*
  |--------------------------------------------------------------------------
  | PADRES QUE YA TIENEN PRÓRROGA
  |--------------------------------------------------------------------------
  |
  | Ejemplo:
  |
  | 18 -> 20
  |
  | El 18 queda histórico.
  | El 20 es el nuevo plazo.
  |
  */

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

  /*
  |--------------------------------------------------------------------------
  | CONTROLADOS EN ESTA VISITA
  |--------------------------------------------------------------------------
  |
  | Una misma tarea puede controlar varios vehículos.
  |
  | Pero el mismo emplazamiento no puede controlarse
  | dos veces dentro de la misma tarea.
  |
  */

  const idsControlados =
    new Set(
      verificaciones
        .filter(
          (item) =>
            item.emplazamientoId
        )
        .map(
          (item) =>
            Number(
              item.emplazamientoId
            )
        )
    );

  /*
  |--------------------------------------------------------------------------
  | EMPLAZAMIENTOS CONTROLABLES
  |--------------------------------------------------------------------------
  */

  const ahora =
    new Date();

  const pendientes =
    emplazamientos.filter(
      (item) => {
        const id =
          Number(item.id);

        /*
        |--------------------------------------------------------------------------
        | SOLO LA HOJA DE LA CADENA
        |--------------------------------------------------------------------------
        */

        const esHoja =
          !idsConHijo.has(id);

        if (!esHoja) {
          return false;
        }

        /*
        |--------------------------------------------------------------------------
        | YA CONTROLADO EN ESTA TAREA
        |--------------------------------------------------------------------------
        */

        if (
          idsControlados.has(id)
        ) {
          return false;
        }

        /*
        |--------------------------------------------------------------------------
        | EMPLAZAMIENTO CERRADO
        |--------------------------------------------------------------------------
        */

        if (
          [
            "CUMPLIDO",
            "CANCELADO",
          ].includes(
            item.estado
          )
        ) {
          return false;
        }

        /*
        |--------------------------------------------------------------------------
        | VEHÍCULO QUE YA SALIÓ DEL CIRCUITO DE CONTROL
        |--------------------------------------------------------------------------
        |
        | Esto evita que:
        |
        | vehículo -> infracción -> remoción -> predio
        |
        | vuelva a aparecer cuando se genere otra segunda visita
        | por otro vehículo del mismo reclamo.
        |
        */

        if (item.vehiculoId) {
          const vehiculo =
            vehiculosPorId.get(
              Number(
                item.vehiculoId
              )
            );

          if (
            vehiculo &&
            estadosVehiculoFueraDeControl.has(
              vehiculo.estadoActual
            )
          ) {
            return false;
          }
        }

        /*
        |--------------------------------------------------------------------------
        | VENCIDO
        |--------------------------------------------------------------------------
        */

        if (
          item.estado ===
          "VENCIDO"
        ) {
          return true;
        }

        /*
        |--------------------------------------------------------------------------
        | VIGENTE
        |--------------------------------------------------------------------------
        */

        if (
          item.estado !==
            "VIGENTE" ||
          !item.fechaVencimiento
        ) {
          return false;
        }

        const vencimiento =
          new Date(
            item.fechaVencimiento
          );

        if (
          Number.isNaN(
            vencimiento.getTime()
          )
        ) {
          return false;
        }

        /*
        | Puede seguir figurando VIGENTE en BD,
        | pero si la fecha ya pasó también debe
        | considerarse controlable.
        */

        return (
          vencimiento <= ahora
        );
      }
    );

  return pendientes;
};
const registrarSegundaVisita = async (
  req,
  res
) => {
  const transaction =
    await sequelize.transaction();

  try {
    const reclamoId =
      Number(
        req.params.reclamoId
      );

    const {
      emplazamientoId,
      resultado,
      situacion,
      observaciones,

      // PRÓRROGA
      plazoCantidad,
      plazoUnidad = "HORAS",
      motivoProrroga,

      // INFRACCIÓN
      numeroActa,
      fechaHoraActa,
      lugar,
      personaEncontrada = false,
      apellidoInfractor,
      nombreInfractor,
      dniInfractor,
      domicilioInfractor,
      motivoInfraccion,
      observacionesInfraccion,
      accionPosterior,
      detalleAccionPosterior,
    } = req.body;

    if (!reclamoId) {
      await transaction.rollback();

      return res.status(400).json({
        ok: false,
        mensaje: "Reclamo inválido",
      });
    }

    const resultadosPermitidos = [
      "CUMPLIDO",
      "PRORROGA",
      "NO_CUMPLIDO",
      "NO_SE_ENCUENTRA",
      "NO_SE_PUDO_VERIFICAR",
      "PARCIAL",
      "OTRO",
    ];

    if (
      !resultadosPermitidos.includes(
        resultado
      )
    ) {
      await transaction.rollback();

      return res.status(400).json({
        ok: false,
        mensaje:
          "Debe indicar qué ocurrió durante el control",
      });
    }

    if (!situacion?.trim()) {
      await transaction.rollback();

      return res.status(400).json({
        ok: false,
        mensaje:
          "Debe indicar qué encontró el inspector",
      });
    }

    const reclamo =
      await Reclamo.findByPk(
        reclamoId,
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

    const tarea =
      await Asignacion.findOne({
        where: {
          reclamoId,

          tipo: "INSPECTOR",

          etapa:
            "SEGUNDA_VISITA",

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
          ["id", "DESC"],
        ],

        transaction,
      });

    if (
      req.usuario.rol !==
        "administrador" &&
      !tarea
    ) {
      await transaction.rollback();

      return res.status(403).json({
        ok: false,
        mensaje:
          "No tenés un control activo para este reclamo",
      });
    }

    const emplazamientoIdNumerico =
      Number(emplazamientoId);

    if (
      !Number.isInteger(
        emplazamientoIdNumerico
      ) ||
      emplazamientoIdNumerico <= 0
    ) {
      await transaction.rollback();

      return res.status(400).json({
        ok: false,
        mensaje:
          "Debe seleccionar el emplazamiento que está controlando",
      });
    }

    const emplazamiento =
      await Emplazamiento.findOne({
        where: {
          id:
            emplazamientoIdNumerico,

          reclamoId,
        },

        transaction,
      });

    if (!emplazamiento) {
      await transaction.rollback();

      return res.status(404).json({
        ok: false,
        mensaje:
          "El emplazamiento seleccionado no pertenece a este reclamo",
      });
    }

    if (tarea) {
      const controlDelEmplazamiento =
        await Verificacion.findOne({
          where: {
            asignacionId:
              tarea.id,

            emplazamientoId:
              emplazamiento.id,
          },

          transaction,
        });

      if (
        controlDelEmplazamiento
      ) {
        await transaction.rollback();

        return res.status(409).json({
          ok: false,

          codigo:
            "EMPLAZAMIENTO_YA_CONTROLADO",

          mensaje:
            "Este vehículo ya fue controlado en esta visita. Elegí otro vehículo.",
        });
      }
    }

    if (
      [
        "CUMPLIDO",
        "CANCELADO",
      ].includes(
        emplazamiento.estado
      )
    ) {
      await transaction.rollback();

      return res.status(409).json({
        ok: false,
        mensaje:
          "El emplazamiento seleccionado ya está cerrado y no puede volver a controlarse",
      });
    }

    const emplazamientoHijo =
      await Emplazamiento.findOne({
        where: {
          reclamoId,

          emplazamientoAnteriorId:
            emplazamiento.id,
        },

        transaction,
      });

    if (emplazamientoHijo) {
      await transaction.rollback();

      return res.status(409).json({
        ok: false,
        mensaje:
          "Este emplazamiento ya fue prorrogado. Debe controlar el plazo más reciente.",
      });
    }

    let vehiculo = null;

    if (
      emplazamiento.vehiculoId
    ) {
      vehiculo =
        await Vehiculo.findOne({
          where: {
            id:
              emplazamiento
                .vehiculoId,

            reclamoId,
          },

          transaction,
        });

      if (!vehiculo) {
        await transaction.rollback();

        return res.status(409).json({
          ok: false,
          mensaje:
            "El vehículo asociado al emplazamiento ya no existe o no pertenece al reclamo",
        });
      }
    }

    let horasProrroga = null;

    if (
      resultado === "PRORROGA"
    ) {
      if (
        ![
          "HORAS",
          "DIAS",
        ].includes(
          plazoUnidad
        )
      ) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "La unidad debe ser HORAS o DIAS",
        });
      }

      horasProrroga =
        convertirPlazoAHoras(
          plazoCantidad,
          plazoUnidad
        );

      if (!horasProrroga) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "Debe ingresar un nuevo plazo válido",
        });
      }

      if (
        !motivoProrroga?.trim()
      ) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "Debe indicar por qué se otorga más plazo",
        });
      }
    }

    const accionesVehiculoPermitidas = [
      "RETIRO_INMEDIATO",
      "BUSQUEDA_REMOCION",
    ];

    if (
      resultado ===
      "NO_CUMPLIDO"
    ) {
      if (!numeroActa?.trim()) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "Debe ingresar el número del Acta de Infracción",
        });
      }

      if (
        !motivoInfraccion?.trim()
      ) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "Debe indicar el motivo de la infracción",
        });
      }

      if (vehiculo) {
        if (
          !accionesVehiculoPermitidas.includes(
            accionPosterior
          )
        ) {
          await transaction.rollback();

          return res.status(400).json({
            ok: false,
            mensaje:
              "Indicá qué ocurrirá con el vehículo después de la infracción",
          });
        }
      }

      if (
        [
          "RETIRO_INMEDIATO",
          "BUSQUEDA_REMOCION",
        ].includes(
          accionPosterior
        ) &&
        !vehiculo
      ) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "Este reclamo no tiene un vehículo registrado",
        });
      }
    }

    const verificacion =
      await Verificacion.create(
        {
          reclamoId,

          asignacionId:
            tarea?.id || null,

          emplazamientoId:
            emplazamiento.id,

          inspectorId:
            req.usuario.id,

          vehiculoId:
            vehiculo?.id || null,

          resultado,

          situacion:
            situacion.trim(),

          observaciones:
            observaciones?.trim() ||
            null,
        },

        {
          transaction,
        }
      );

    let infraccion = null;
    let nuevoEmplazamiento =
      null;
    let continuarRemocion =
      false;
    let quedanEmplazamientosPendientes =
      false;
    let quedanEmplazamientosVencidos =
      false;
if (
  resultado === "CUMPLIDO"
) {
  /*
  |--------------------------------------------------------------------------
  | MARCAR EL EMPLAZAMIENTO CONTROLADO COMO CUMPLIDO
  |--------------------------------------------------------------------------
  */

  emplazamiento.estado =
    "CUMPLIDO";

  emplazamiento.fechaCumplimiento =
    new Date();

  await emplazamiento.save({
    transaction,
  });

  /*
  |--------------------------------------------------------------------------
  | CARGAR TODAS LAS CADENAS DEL RECLAMO
  |--------------------------------------------------------------------------
  */

  const [
    todosLosEmplazamientos,
    vehiculosDelReclamo,
  ] =
    await Promise.all([
      Emplazamiento.findAll({
        where: {
          reclamoId,
        },

        transaction,
      }),

      Vehiculo.findAll({
        where: {
          reclamoId,
        },

        transaction,
      }),
    ]);

  const vehiculosPorId =
    new Map(
      vehiculosDelReclamo.map(
        (item) => [
          Number(item.id),
          item,
        ]
      )
    );

  /*
  |--------------------------------------------------------------------------
  | EMPLAZAMIENTOS HOJA
  |--------------------------------------------------------------------------
  |
  | Si hubo una prórroga:
  |
  | emplazamiento original
  |       ↓
  | prórroga
  |
  | solamente la prórroga es la actuación vigente de esa cadena.
  |
  */

  const idsConHijo =
    new Set(
      todosLosEmplazamientos
        .filter(
          (item) =>
            item
              .emplazamientoAnteriorId
        )
        .map(
          (item) =>
            Number(
              item
                .emplazamientoAnteriorId
            )
        )
    );

  /*
  |--------------------------------------------------------------------------
  | VEHÍCULOS QUE YA SALIERON DEL CONTROL DE SEGUNDA VISITA
  |--------------------------------------------------------------------------
  |
  | Estos vehículos no deben volver a aparecer para ser controlados.
  |
  | PERO algunos todavía mantienen abierto el reclamo porque siguen
  | en remoción o predio.
  |
  */

  const estadosVehiculoFueraDeControl =
    new Set([
      "PENDIENTE_REMOCION",
      "REMOVIDO",
      "PENDIENTE_INGRESO_PREDIO",
      "EN_PREDIO",
      "EGRESADO",
    ]);

  /*
  |--------------------------------------------------------------------------
  | EMPLAZAMIENTOS TODAVÍA PENDIENTES DE CONTROL
  |--------------------------------------------------------------------------
  */

  const emplazamientosPendientes =
    todosLosEmplazamientos.filter(
      (item) => {
        /*
        |--------------------------------------------------------------
        | SOLO HOJAS
        |--------------------------------------------------------------
        */

        if (
          idsConHijo.has(
            Number(item.id)
          )
        ) {
          return false;
        }

        /*
        |--------------------------------------------------------------
        | YA TERMINADOS
        |--------------------------------------------------------------
        */

        if (
          [
            "CUMPLIDO",
            "CANCELADO",
          ].includes(
            item.estado
          )
        ) {
          return false;
        }

        /*
        |--------------------------------------------------------------
        | VEHÍCULO DEL EMPLAZAMIENTO
        |--------------------------------------------------------------
        */

        let vehiculoDelEmplazamiento =
          null;

        if (item.vehiculoId) {
          vehiculoDelEmplazamiento =
            vehiculosPorId.get(
              Number(
                item.vehiculoId
              )
            ) || null;
        } else if (
          vehiculosDelReclamo
            .length === 1
        ) {
          /*
          |------------------------------------------------------------
          | COMPATIBILIDAD SISTEMA ANTERIOR
          |------------------------------------------------------------
          |
          | Los reclamos viejos pueden tener un emplazamiento sin
          | vehiculoId.
          |
          | Si existe un único vehículo, ese emplazamiento pertenece
          | a ese vehículo.
          |
          */

          vehiculoDelEmplazamiento =
            vehiculosDelReclamo[0];
        }

        /*
        |--------------------------------------------------------------
        | YA PASÓ A REMOCIÓN / PREDIO
        |--------------------------------------------------------------
        |
        | No vuelve a segunda visita.
        |
        */

        if (
          vehiculoDelEmplazamiento &&
          estadosVehiculoFueraDeControl.has(
            vehiculoDelEmplazamiento
              .estadoActual
          )
        ) {
          return false;
        }

        return true;
      }
    );

  quedanEmplazamientosPendientes =
    emplazamientosPendientes
      .length > 0;

  /*
  |--------------------------------------------------------------------------
  | ¿ALGUNO YA ESTÁ VENCIDO?
  |--------------------------------------------------------------------------
  */

  const ahora =
    new Date();

  quedanEmplazamientosVencidos =
    emplazamientosPendientes.some(
      (item) => {
        if (
          item.estado ===
          "VENCIDO"
        ) {
          return true;
        }

        if (
          item.estado !==
            "VIGENTE" ||
          !item.fechaVencimiento
        ) {
          return false;
        }

        const fechaVencimiento =
          new Date(
            item.fechaVencimiento
          );

        if (
          Number.isNaN(
            fechaVencimiento
              .getTime()
          )
        ) {
          return false;
        }

        return (
          fechaVencimiento <=
          ahora
        );
      }
    );

  /*
  |--------------------------------------------------------------------------
  | ¿HAY OTRO VEHÍCULO EN REMOCIÓN / PREDIO?
  |--------------------------------------------------------------------------
  |
  | Este es el punto que faltaba.
  |
  | Esos vehículos no deben aparecer en segunda visita,
  | pero SÍ deben impedir que el reclamo sea marcado RESUELTO.
  |
  | EGRESADO no cuenta porque esa cadena ya terminó.
  |
  */

  const estadosGestionPosteriorPendiente =
    new Set([
      "PENDIENTE_REMOCION",
      "REMOVIDO",
      "PENDIENTE_INGRESO_PREDIO",
      "EN_PREDIO",
    ]);

  const hayGestionPosteriorPendiente =
    vehiculosDelReclamo.some(
      (item) =>
        Number(item.id) !==
          Number(
            vehiculo?.id
          ) &&
        estadosGestionPosteriorPendiente.has(
          item.estadoActual
        )
    );

  /*
  |--------------------------------------------------------------------------
  | ESTADO GENERAL DEL RECLAMO
  |--------------------------------------------------------------------------
  */

  if (
    quedanEmplazamientosPendientes
  ) {
    /*
    |------------------------------------------------------------------
    | QUEDA OTRO EMPLAZAMIENTO
    |------------------------------------------------------------------
    */

    reclamo.fechaResolucion =
      null;

  

    if (
      quedanEmplazamientosVencidos
    ) {
      reclamo.estado =
        "PENDIENTE_ACTUACION";

      reclamo.etapaActual =
        "PENDIENTE_SEGUNDA_VISITA";
    } else {
      reclamo.estado =
        "EN_SEGUIMIENTO";

      reclamo.etapaActual =
        "ESPERANDO_PLAZO";
    }
  } else if (
    hayGestionPosteriorPendiente
  ) {
    /*
    |------------------------------------------------------------------
    | NO QUEDA OTRO CONTROL,
    | PERO OTRO VEHÍCULO SIGUE EN REMOCIÓN / PREDIO
    |------------------------------------------------------------------
    |
    | No resolvemos el reclamo.
    |
    */

    reclamo.estado =
      "PENDIENTE_ACTUACION";

    reclamo.fechaResolucion =
      null;



    const hayVehiculoEnPredio =
      vehiculosDelReclamo.some(
        (item) =>
          [
            "PENDIENTE_INGRESO_PREDIO",
            "EN_PREDIO",
          ].includes(
            item.estadoActual
          )
      );

    const hayVehiculoEnRemocion =
      vehiculosDelReclamo.some(
        (item) =>
          [
            "PENDIENTE_REMOCION",
            "REMOVIDO",
          ].includes(
            item.estadoActual
          )
      );

    if (hayVehiculoEnPredio) {
      reclamo.etapaActual =
        "PENDIENTE_INGRESO_PREDIO";
    } else if (
      hayVehiculoEnRemocion
    ) {
      reclamo.etapaActual =
        "PENDIENTE_REMOCION";
    } else {
      reclamo.etapaActual =
        "PENDIENTE_ACTUACION";
    }
  } else {
    /*
    |------------------------------------------------------------------
    | NO QUEDA NADA PENDIENTE
    |------------------------------------------------------------------
    |
    | Funciona tanto para:
    |
    | - reclamo viejo de un solo vehículo;
    | - reclamo nuevo de varios vehículos;
    | - otros vehículos que ya egresaron;
    | - otros vehículos cuyos emplazamientos ya fueron cumplidos.
    |
    */

    reclamo.estado =
      "RESUELTO";

    reclamo.etapaActual =
      "FINALIZADO";

    reclamo.estadoExterno =
      "LISTO_PARA_CERRAR";

    reclamo.fechaResolucion =
      new Date();
  }

  /*
  |--------------------------------------------------------------------------
  | ¿QUEDA OTRO PARA CONTROLAR EN ESTA MISMA VISITA?
  |--------------------------------------------------------------------------
  */

  const pendientesMismaVisita =
    tarea
      ? await obtenerPendientesDeLaTarea({
          reclamoId,

          tareaId:
            tarea.id,

          transaction,
        })
      : [];

  if (
    tarea &&
    pendientesMismaVisita
      .length > 0
  ) {
    /*
    |------------------------------------------------------------------
    | CONTINÚA LA MISMA SEGUNDA VISITA
    |------------------------------------------------------------------
    */

    reclamo.estado =
      "PENDIENTE_ACTUACION";

    reclamo.etapaActual =
      "SEGUNDA_VISITA";

    reclamo.inspectorId =
      req.usuario.id;

    reclamo.fechaResolucion =
      null;

  

    tarea.estadoTarea =
      "EN_CURSO";

    tarea.fechaFinalizacion =
      null;

    await tarea.save({
      transaction,
    });

    quedanEmplazamientosPendientes =
      true;

    quedanEmplazamientosVencidos =
      true;
  } else {
    /*
    |------------------------------------------------------------------
    | TERMINÓ EL TRABAJO ACTUAL DEL INSPECTOR
    |------------------------------------------------------------------
    */

    reclamo.inspectorId =
      null;

    await finalizarTarea(
      tarea,
      transaction
    );
  }
    } else if (
      resultado === "PRORROGA"
    ) {
      if (
        emplazamiento.estado !==
          "CUMPLIDO" &&
        emplazamiento.estado !==
          "CANCELADO"
      ) {
        emplazamiento.estado =
          "VENCIDO";

        await emplazamiento.save({
          transaction,
        });
      }

      const ahora = new Date();

      const vencimiento =
        new Date(
          ahora.getTime() +
            horasProrroga *
              60 *
              60 *
              1000
        );

      nuevoEmplazamiento =
        await Emplazamiento.create(
          {
            reclamoId,

            actaId:
              emplazamiento.actaId,

            vehiculoId:
              vehiculo?.id ||
              emplazamiento
                .vehiculoId ||
              null,

            inspectorId:
              req.usuario.id,

            fechaHora:
              ahora,

            plazoCantidad:
              Number(
                plazoCantidad
              ),

            plazoUnidad,

            plazoHoras:
              horasProrroga,

            fechaVencimiento:
              vencimiento,

            estado:
              "VIGENTE",

            observaciones:
              motivoProrroga.trim(),

            esProrroga:
              true,

            emplazamientoAnteriorId:
              emplazamiento.id,
          },

          {
            transaction,
          }
        );

      if (vehiculo) {
        vehiculo.estadoActual =
          "EMPLAZADO";

        await vehiculo.save({
          transaction,
        });
      }

      const pendientesMismaVisita =
        tarea
          ? await obtenerPendientesDeLaTarea({
              reclamoId,
              tareaId:
                tarea.id,
              transaction,
            })
          : [];

      if (
        tarea &&
        pendientesMismaVisita
          .length > 0
      ) {
        reclamo.estado =
          "PENDIENTE_ACTUACION";

        reclamo.etapaActual =
          "SEGUNDA_VISITA";

        reclamo.inspectorId =
          req.usuario.id;

        reclamo.fechaResolucion =
          null;

        tarea.estadoTarea =
          "EN_CURSO";

        tarea.fechaFinalizacion =
          null;

        await tarea.save({
          transaction,
        });

        quedanEmplazamientosPendientes =
          true;

        quedanEmplazamientosVencidos =
          true;
      } else {
        reclamo.estado =
          "EN_SEGUIMIENTO";

        reclamo.etapaActual =
          "ESPERANDO_PLAZO";

        reclamo.inspectorId =
          null;

        await finalizarTarea(
          tarea,
          transaction
        );
      }
    } else if (
      resultado ===
      "NO_CUMPLIDO"
    ) {
      if (
        emplazamiento.estado !==
          "CUMPLIDO" &&
        emplazamiento.estado !==
          "CANCELADO"
      ) {
        emplazamiento.estado =
          "VENCIDO";

        await emplazamiento.save({
          transaction,
        });
      }

      infraccion =
        await Infraccion.create(
          {
            reclamoId,

            vehiculoId:
              vehiculo?.id ||
              null,

            inspectorId:
              req.usuario.id,

            verificacionId:
              verificacion.id,

            numeroActa:
              numeroActa
                .trim()
                .toUpperCase(),

            fechaHora:
              fechaHoraActa ||
              new Date(),

            lugar:
              lugar?.trim() ||
              reclamo.direccion ||
              null,

            personaEncontrada:
              Boolean(
                personaEncontrada
              ),

            apellidoInfractor:
              personaEncontrada
                ? apellidoInfractor
                    ?.trim() ||
                  null
                : null,

            nombreInfractor:
              personaEncontrada
                ? nombreInfractor
                    ?.trim() ||
                  null
                : null,

            dniInfractor:
              personaEncontrada
                ? dniInfractor
                    ?.trim() ||
                  null
                : null,

            domicilioInfractor:
              personaEncontrada
                ? domicilioInfractor
                    ?.trim() ||
                  null
                : null,

            motivo:
              motivoInfraccion
                .trim(),

            observaciones:
              observacionesInfraccion
                ?.trim() ||
              null,

            accionPosterior:
              vehiculo
                ? accionPosterior
                : null,

            detalleAccionPosterior:
              vehiculo
                ? (
                    detalleAccionPosterior
                      ?.trim() ||
                    null
                  )
                : null,

            estadoJuzgado:
              "PENDIENTE_ENVIO",

            requiereOrdenRemocion:
              Boolean(
                vehiculo &&
                accionPosterior ===
                  "BUSQUEDA_REMOCION"
              ),

            estadoOrdenRemocion:
              vehiculo &&
              accionPosterior ===
                "BUSQUEDA_REMOCION"
                ? "PENDIENTE_SOLICITUD"
                : "NO_REQUIERE",
          },

          {
            transaction,
          }
        );

      const referenciaTemporalInfraccion =
        `EMPLAZAMIENTO_${emplazamiento.id}`;

      const [fotosVinculadas] =
        await Foto.update(
          {
            referenciaId:
              infraccion.id,

            referenciaTemporal:
              null,
          },
          {
            where: {
              reclamoId:
                reclamo.id,

              tipoReferencia:
                "INFRACCION",

              referenciaId:
                null,

              referenciaTemporal:
                referenciaTemporalInfraccion,

              activo:
                true,
            },

            transaction,
          }
        );

      if (
        fotosVinculadas < 1
      ) {
        throw new Error(
          "No se encontró la foto del Acta de Infracción correspondiente al emplazamiento controlado"
        );
      }

      if (
        accionPosterior ===
        "RETIRO_INMEDIATO"
      ) {
        vehiculo.estadoActual =
          "PENDIENTE_REMOCION";

        await vehiculo.save({
          transaction,
        });

        reclamo.estado =
          "PENDIENTE_ACTUACION";

        reclamo.etapaActual =
          "REMOCION_EN_CURSO";

        reclamo.inspectorId =
          req.usuario.id;

        if (tarea) {
          tarea.estadoTarea =
            "EN_CURSO";

          await tarea.save({
            transaction,
          });
        }

        continuarRemocion =
          true;
      } else if (
        accionPosterior ===
        "BUSQUEDA_REMOCION"
      ) {
        vehiculo.estadoActual =
          "PENDIENTE_REMOCION";

        await vehiculo.save({
          transaction,
        });

        const pendientesMismaVisita =
          tarea
            ? await obtenerPendientesDeLaTarea({
                reclamoId,
                tareaId:
                  tarea.id,
                transaction,
              })
            : [];

        if (
          tarea &&
          pendientesMismaVisita
            .length > 0
        ) {
          reclamo.estado =
            "PENDIENTE_ACTUACION";

          reclamo.etapaActual =
            "SEGUNDA_VISITA";

          reclamo.inspectorId =
            req.usuario.id;

          reclamo.fechaResolucion =
            null;

          tarea.estadoTarea =
            "EN_CURSO";

          tarea.fechaFinalizacion =
            null;

          await tarea.save({
            transaction,
          });

          quedanEmplazamientosPendientes =
            true;

          quedanEmplazamientosVencidos =
            true;
        } else {
          reclamo.estado =
            "EN_SEGUIMIENTO";

          reclamo.etapaActual =
            "PENDIENTE_ENVIO_JUZGADO";

          reclamo.inspectorId =
            null;

          await finalizarTarea(
            tarea,
            transaction
          );
        }
      } else {
        reclamo.estado =
          "EN_SEGUIMIENTO";

        reclamo.etapaActual =
          "ESPERANDO_RESOLUCION";

        reclamo.inspectorId =
          null;

        await finalizarTarea(
          tarea,
          transaction
        );
      }
    } else {
      reclamo.estado =
        "PENDIENTE_ACTUACION";

      reclamo.etapaActual =
        "PENDIENTE_DECISION_JEFE";

      reclamo.inspectorId =
        null;

      await finalizarTarea(
        tarea,
        transaction
      );
    }

    await reclamo.save({
      transaction,
    });

    await transaction.commit();

    let mensaje =
      "Control finalizado";

    if (
      resultado === "CUMPLIDO"
    ) {
      if (
        quedanEmplazamientosPendientes
      ) {
        if (
          quedanEmplazamientosVencidos
        ) {
          mensaje =
            "Este vehículo cumplió. Queda otro emplazamiento vencido pendiente de una nueva segunda visita.";
        } else {
          mensaje =
            "Este vehículo cumplió. El reclamo continúa abierto porque todavía queda otro emplazamiento dentro de su plazo.";
        }
      } else {
        mensaje =
          "El problema quedó solucionado.";
      }
    }

    if (
      resultado === "PRORROGA"
    ) {
      if (
        tarea &&
        tarea.estadoTarea !==
          "FINALIZADA"
      ) {
        mensaje =
          "Se otorgó un nuevo plazo a este vehículo. Todavía queda otro vehículo para controlar.";
      } else {
        mensaje =
          "Se otorgó un nuevo plazo.";
      }
    }

    if (
      resultado ===
        "NO_CUMPLIDO" &&
      accionPosterior ===
        "RETIRO_INMEDIATO"
    ) {
      mensaje =
        "Acta de Infracción registrada. Ahora cargá el inventario y la remoción del vehículo.";
    }

    if (
      resultado ===
        "NO_CUMPLIDO" &&
      accionPosterior ===
        "BUSQUEDA_REMOCION"
    ) {
      mensaje =
        "Acta de Infracción registrada. Como no se pudo retirar el vehículo, quedó pendiente de envío al Juzgado para solicitar la orden de remoción.";
    }

    return res.status(201).json({
      ok: true,

      mensaje,

      verificacion,

      infraccion,

      nuevoEmplazamiento,

      vehiculo,

      continuarRemocion,

      tareaFinalizada:
        tarea
          ? tarea.estadoTarea ===
            "FINALIZADA"
          : true,

      puedeContinuarControlando:
        Boolean(
          tarea &&
          tarea.estadoTarea !==
            "FINALIZADA" &&
          !continuarRemocion
        ),

      etapaActual:
        reclamo.etapaActual,

      quedanEmplazamientosPendientes,

      quedanEmplazamientosVencidos,
    });
  } catch (error) {
    if (
      !transaction.finished
    ) {
      await transaction.rollback();
    }

    console.error(
      "Error registrando control posterior:",
      error
    );

    if (
      error?.name ===
      "SequelizeUniqueConstraintError"
    ) {
      return res.status(409).json({
        ok: false,
        mensaje:
          "Ese número de Acta de Infracción ya está registrado",
      });
    }

    return res.status(500).json({
      ok: false,

      mensaje:
        "Error registrando el control",

      error:
        error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| OBTENER CONTROL ACTUAL / ÚLTIMO CONTROL DEL INSPECTOR
|--------------------------------------------------------------------------
*/

const obtenerSegundaVisita = async (
  req,
  res
) => {
  try {
    const reclamoId =
      Number(
        req.params.reclamoId
      );

    if (!reclamoId) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "Reclamo inválido",
      });
    }

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
      return res.status(404).json({
        ok: false,
        mensaje:
          "Reclamo no encontrado",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | EMPLAZAMIENTOS
    |--------------------------------------------------------------------------
    */

    const emplazamientos =
      await Emplazamiento.findAll({
        where: {
          reclamoId,
        },

        order: [
          ["fechaHora", "ASC"],
          ["id", "ASC"],
        ],
      });

    /*
    |--------------------------------------------------------------------------
    | VEHÍCULOS
    |--------------------------------------------------------------------------
    */

    const vehiculos =
      await Vehiculo.findAll({
        where: {
          reclamoId,
        },

        order: [
          ["id", "ASC"],
        ],
      });

    const vehiculosPorId =
      new Map(
        vehiculos.map(
          (vehiculo) => [
            Number(vehiculo.id),
            vehiculo,
          ]
        )
      );

    /*
    |--------------------------------------------------------------------------
    | ESTADOS FUERA DEL CIRCUITO DE SEGUNDA VISITA
    |--------------------------------------------------------------------------
    */

    const estadosVehiculoFueraDeControl =
      new Set([
        "PENDIENTE_REMOCION",
        "REMOVIDO",
        "PENDIENTE_INGRESO_PREDIO",
        "EN_PREDIO",
        "EGRESADO",
      ]);

    /*
    |--------------------------------------------------------------------------
    | EMPLAZAMIENTOS + VEHÍCULO
    |--------------------------------------------------------------------------
    */

    const emplazamientosConVehiculo =
      emplazamientos.map(
        (emplazamiento) => {
          const plano =
            emplazamiento.toJSON();

          let vehiculo = null;

          if (
            emplazamiento.vehiculoId
          ) {
            vehiculo =
              vehiculosPorId.get(
                Number(
                  emplazamiento
                    .vehiculoId
                )
              ) || null;
          } else if (
            vehiculos.length === 1
          ) {
            /*
            | Compatibilidad con
            | reclamos viejos.
            */
            vehiculo =
              vehiculos[0];
          }

          return {
            ...plano,

            vehiculo:
              vehiculo
                ? (
                    vehiculo.toJSON
                      ? vehiculo.toJSON()
                      : vehiculo
                  )
                : null,
          };
        }
      );

    /*
    |--------------------------------------------------------------------------
    | TAREA DE SEGUNDA VISITA
    |--------------------------------------------------------------------------
    */

    const whereTarea = {
      reclamoId,

      tipo:
        "INSPECTOR",

      etapa:
        "SEGUNDA_VISITA",
    };

    if (
      req.usuario.rol ===
      "inspector"
    ) {
      whereTarea.asignadoAId =
        req.usuario.id;
    }

    const tarea =
      await Asignacion.findOne({
        where:
          whereTarea,

        order: [
          ["id", "DESC"],
        ],
      });

    /*
    |--------------------------------------------------------------------------
    | FUNCIÓN LOCAL PARA SABER QUÉ EMPLAZAMIENTOS SON CONTROLABLES
    |--------------------------------------------------------------------------
    */

    const obtenerPendientes = (
      idsControlados =
        new Set()
    ) => {
      /*
      | Un padre que tiene prórroga
      | queda solamente como histórico.
      */

      const idsConHijo =
        new Set(
          emplazamientos
            .filter(
              (item) =>
                item
                  .emplazamientoAnteriorId
            )
            .map(
              (item) =>
                Number(
                  item
                    .emplazamientoAnteriorId
                )
            )
        );

      const ahora =
        new Date();

      return emplazamientosConVehiculo.filter(
        (item) => {
          const itemId =
            Number(item.id);

          /*
          | Solamente la última parte
          | de cada cadena.
          */

          if (
            idsConHijo.has(
              itemId
            )
          ) {
            return false;
          }

          /*
          | Ya controlado dentro
          | de esta tarea.
          */

          if (
            idsControlados.has(
              itemId
            )
          ) {
            return false;
          }

          /*
          | Cerrado.
          */

          if (
            [
              "CUMPLIDO",
              "CANCELADO",
            ].includes(
              item.estado
            )
          ) {
            return false;
          }

          /*
          | Vehículo que ya pasó
          | al circuito de remoción/predio.
          */

          if (
            item.vehiculo &&
            estadosVehiculoFueraDeControl.has(
              item.vehiculo
                .estadoActual
            )
          ) {
            return false;
          }

          /*
          | Vencido explícitamente.
          */

          if (
            item.estado ===
            "VENCIDO"
          ) {
            return true;
          }

          /*
          | Si sigue VIGENTE,
          | verificamos la fecha real.
          */

          if (
            item.estado !==
              "VIGENTE" ||
            !item.fechaVencimiento
          ) {
            return false;
          }

          const vencimiento =
            new Date(
              item.fechaVencimiento
            );

          if (
            Number.isNaN(
              vencimiento.getTime()
            )
          ) {
            return false;
          }

          return (
            vencimiento <=
            ahora
          );
        }
      );
    };

    /*
    |--------------------------------------------------------------------------
    | SIN TAREA
    |--------------------------------------------------------------------------
    */

    if (!tarea) {
      const pendientes =
        obtenerPendientes();

      return res.json({
        ok: true,

        realizada:
          false,

        tarea:
          null,

        verificacion:
          null,

        verificaciones:
          [],

        controles:
          [],

        infraccion:
          null,

        nuevoEmplazamiento:
          null,

        emplazamientoControlado:
          null,

        vehiculoControlado:
          null,

        emplazamientos:
          emplazamientosConVehiculo,

        emplazamientosPendientes:
          pendientes,

        idsEmplazamientosControlados:
          [],

        cantidadControles:
          0,

        cantidadPendientes:
          pendientes.length,

        puedeContinuarControlando:
          false,

        tareaFinalizada:
          true,

        remocionEnCurso:
          false,

        controlRemocion:
          null,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | VERIFICACIONES DE ESTA TAREA
    |--------------------------------------------------------------------------
    */

    let verificaciones =
      await Verificacion.findAll({
        where: {
          asignacionId:
            tarea.id,
        },

        order: [
          ["id", "ASC"],
        ],
      });

    /*
    |--------------------------------------------------------------------------
    | COMPATIBILIDAD CON CONTROLES VIEJOS
    |--------------------------------------------------------------------------
    */

    if (
      verificaciones.length === 0
    ) {
      const verificacionVieja =
        await Verificacion.findOne({
          where: {
            reclamoId,

            inspectorId:
              tarea.asignadoAId,

            asignacionId:
              null,
          },

          order: [
            ["id", "DESC"],
          ],
        });

      if (verificacionVieja) {
        verificaciones = [
          verificacionVieja,
        ];
      }
    }

    /*
    |--------------------------------------------------------------------------
    | IDS YA CONTROLADOS
    |--------------------------------------------------------------------------
    */

    const idsEmplazamientosControlados =
      verificaciones
        .filter(
          (item) =>
            item.emplazamientoId
        )
        .map(
          (item) =>
            Number(
              item.emplazamientoId
            )
        );

    const setIdsControlados =
      new Set(
        idsEmplazamientosControlados
      );

    /*
    |--------------------------------------------------------------------------
    | PENDIENTES REALES
    |--------------------------------------------------------------------------
    */

    const emplazamientosPendientes =
      obtenerPendientes(
        setIdsControlados
      );

    /*
    |--------------------------------------------------------------------------
    | ARMAR HISTORIAL DE CONTROLES
    |--------------------------------------------------------------------------
    */

    const controles = [];

    for (
      const verificacion
      of verificaciones
    ) {
      let emplazamientoControlado =
        null;

      let vehiculoControlado =
        null;

      let infraccion =
        null;

      let nuevoEmplazamiento =
        null;

      /*
      | Emplazamiento exacto
      | que se controló.
      */

      if (
        verificacion.emplazamientoId
      ) {
        emplazamientoControlado =
          emplazamientosConVehiculo.find(
            (item) =>
              Number(item.id) ===
              Number(
                verificacion
                  .emplazamientoId
              )
          ) || null;
      }

      /*
      | Compatibilidad con
      | verificaciones viejas.
      */

      if (
        !emplazamientoControlado &&
        verificacion.vehiculoId
      ) {
        emplazamientoControlado =
          [...emplazamientosConVehiculo]
            .reverse()
            .find(
              (item) =>
                Number(
                  item.vehiculoId
                ) ===
                Number(
                  verificacion
                    .vehiculoId
                )
            ) || null;
      }

      /*
      | Vehículo.
      */

      if (
        verificacion.vehiculoId
      ) {
        const vehiculo =
          vehiculosPorId.get(
            Number(
              verificacion
                .vehiculoId
            )
          );

        vehiculoControlado =
          vehiculo
            ? (
                vehiculo.toJSON
                  ? vehiculo.toJSON()
                  : vehiculo
              )
            : null;
      } else if (
        emplazamientoControlado
          ?.vehiculo
      ) {
        vehiculoControlado =
          emplazamientoControlado
            .vehiculo;
      }

      /*
      | Infracción asociada
      | a ESTA verificación.
      */

      infraccion =
        await Infraccion.findOne({
          where: {
            verificacionId:
              verificacion.id,
          },

          order: [
            ["id", "DESC"],
          ],
        });

      /*
      | Si fue PRÓRROGA,
      | buscamos el nuevo plazo hijo.
      */

      if (
        verificacion.resultado ===
          "PRORROGA" &&
        verificacion.emplazamientoId
      ) {
        nuevoEmplazamiento =
          await Emplazamiento.findOne({
            where: {
              reclamoId,

              emplazamientoAnteriorId:
                verificacion
                  .emplazamientoId,
            },

            order: [
              ["id", "DESC"],
            ],
          });

        if (
          nuevoEmplazamiento
        ) {
          const plano =
            nuevoEmplazamiento
              .toJSON();

          const vehiculoNuevo =
            nuevoEmplazamiento
              .vehiculoId
              ? vehiculosPorId.get(
                  Number(
                    nuevoEmplazamiento
                      .vehiculoId
                  )
                )
              : null;

          nuevoEmplazamiento = {
            ...plano,

            vehiculo:
              vehiculoNuevo
                ? (
                    vehiculoNuevo.toJSON
                      ? vehiculoNuevo.toJSON()
                      : vehiculoNuevo
                  )
                : null,
          };
        }
      }

      /*
      |--------------------------------------------------------------------------
      | EDICIÓN
      |--------------------------------------------------------------------------
      |
      | Conservamos la ventana de edición
      | que ya utilizaba el sistema.
      |
      */

      const ahora =
        new Date();

      const fechaRegistro =
        new Date(
          verificacion.createdAt
        );

      const fechaLimiteEdicion =
        new Date(
          fechaRegistro.getTime() +
            30 * 60 * 1000
        );

      const diferenciaMs =
        fechaLimiteEdicion.getTime() -
        ahora.getTime();

      const dentroDelPlazo =
        diferenciaMs > 0;

      const esAutor =
        Number(
          verificacion.inspectorId
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

      controles.push({
        verificacion,

        emplazamientoControlado,

        vehiculoControlado,

        infraccion,

        nuevoEmplazamiento,

        puedeEditar,

        minutosRestantes,

        fechaRegistro:
          verificacion.createdAt,

        fechaLimiteEdicion,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | ÚLTIMO CONTROL
    |--------------------------------------------------------------------------
    */

    const ultimoControl =
      controles.length > 0
        ? controles[
            controles.length - 1
          ]
        : null;

    /*
    |--------------------------------------------------------------------------
    | ESTADO DE LA TAREA
    |--------------------------------------------------------------------------
    */

    const tareaFinalizada =
      tarea.estadoTarea ===
        "FINALIZADA";

    /*
    |--------------------------------------------------------------------------
    | REMOCIÓN INMEDIATA EN CURSO
    |--------------------------------------------------------------------------
    */

    const controlConRemocionInmediata =
      controles.find(
        (control) =>
          control.verificacion
            ?.resultado ===
            "NO_CUMPLIDO" &&
          control.infraccion
            ?.accionPosterior ===
            "RETIRO_INMEDIATO" &&
          control.vehiculoControlado
            ?.estadoActual ===
            "PENDIENTE_REMOCION"
      ) || null;

    /*
    |--------------------------------------------------------------------------
    | ¿PUEDE SEGUIR CON OTRO VEHÍCULO?
    |--------------------------------------------------------------------------
    */

    const puedeContinuarControlando =
      !tareaFinalizada &&
      !controlConRemocionInmediata &&
      emplazamientosPendientes
        .length > 0;

    /*
    |--------------------------------------------------------------------------
    | RESPUESTA
    |--------------------------------------------------------------------------
    */

    return res.json({
      ok: true,

      realizada:
        controles.length > 0,

      tarea,

      tareaFinalizada,

      puedeContinuarControlando,

      controles,

      verificaciones:
        verificaciones.map(
          (item) =>
            item.toJSON
              ? item.toJSON()
              : item
        ),

      idsEmplazamientosControlados,

      cantidadControles:
        controles.length,

      emplazamientos:
        emplazamientosConVehiculo,

      emplazamientosPendientes,

      cantidadPendientes:
        emplazamientosPendientes
          .length,

      remocionEnCurso:
        Boolean(
          controlConRemocionInmediata
        ),

      controlRemocion:
        controlConRemocionInmediata,

      /*
      |--------------------------------------------------------------------------
      | COMPATIBILIDAD CON FRONTEND EXISTENTE
      |--------------------------------------------------------------------------
      */

      verificacion:
        ultimoControl
          ?.verificacion ||
        null,

      infraccion:
        ultimoControl
          ?.infraccion ||
        null,

      nuevoEmplazamiento:
        ultimoControl
          ?.nuevoEmplazamiento ||
        null,

      emplazamientoControlado:
        ultimoControl
          ?.emplazamientoControlado ||
        null,

      vehiculoControlado:
        ultimoControl
          ?.vehiculoControlado ||
        null,
    });
  } catch (error) {
    console.error(
      "Error obteniendo segunda visita:",
      error
    );

    return res.status(500).json({
      ok: false,

      mensaje:
        "Error obteniendo el control",

      error:
        error.message,
    });
  }
};
/*
|--------------------------------------------------------------------------
| EDITAR CONTROL DURANTE 1 HORA
|--------------------------------------------------------------------------
*/

const editarSegundaVisita = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const reclamoId = Number(req.params.reclamoId);
    const verificacionId = Number(req.body.verificacionId);

    if (!reclamoId) {
      await transaction.rollback();
      return res.status(400).json({
        ok: false,
        mensaje: "Reclamo inválido",
      });
    }

    if (!Number.isInteger(verificacionId) || verificacionId <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        ok: false,
        codigo: "VERIFICACION_REQUERIDA",
        mensaje: "Debe indicar qué control desea editar",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | RECLAMO
    |--------------------------------------------------------------------------
    */

    const reclamo = await Reclamo.findByPk(reclamoId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!reclamo) {
      await transaction.rollback();
      return res.status(404).json({
        ok: false,
        mensaje: "Reclamo no encontrado",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | ÚLTIMA TAREA DE SEGUNDA VISITA
    |--------------------------------------------------------------------------
    */

    const whereTarea = {
      reclamoId,
      tipo: "INSPECTOR",
      etapa: "SEGUNDA_VISITA",
    };

    if (req.usuario.rol === "inspector") {
      whereTarea.asignadoAId = req.usuario.id;
    }

    const tarea = await Asignacion.findOne({
      where: whereTarea,
      order: [["id", "DESC"]],
      transaction,
    });

    if (!tarea) {
      await transaction.rollback();
      return res.status(404).json({
        ok: false,
        mensaje: "No se encontró la tarea de control",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | BUSCAR EXACTAMENTE LA VERIFICACIÓN QUE SE QUIERE EDITAR
    |--------------------------------------------------------------------------
    |
    | Ya NO usamos simplemente la última verificación.
    |
    | Ejemplo:
    |
    | tarea 47
    | ├── verificación 21 -> vehículo A
    | └── verificación 22 -> vehículo B
    |
    | Si mandamos verificacionId = 21 solamente se modifica la 21.
    |
    */

    let verificacion = await Verificacion.findOne({
      where: {
        id: verificacionId,
        reclamoId,
        asignacionId: tarea.id,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    /*
    |--------------------------------------------------------------------------
    | COMPATIBILIDAD CON CONTROLES VIEJOS
    |--------------------------------------------------------------------------
    |
    | Los controles anteriores podían tener asignacionId = NULL.
    |
    */

    if (!verificacion) {
      verificacion = await Verificacion.findOne({
        where: {
          id: verificacionId,
          reclamoId,
          inspectorId: tarea.asignadoAId,
          asignacionId: null,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
    }

    if (!verificacion) {
      await transaction.rollback();
      return res.status(404).json({
        ok: false,
        codigo: "CONTROL_NO_ENCONTRADO",
        mensaje: "No se encontró el control que desea editar",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | EMPLAZAMIENTO ORIGINAL
    |--------------------------------------------------------------------------
    |
    | La relación queda bloqueada.
    | Editar nunca puede cambiar de emplazamiento.
    |
    */

    let emplazamientoControlado = null;

    if (verificacion.emplazamientoId) {
      emplazamientoControlado = await Emplazamiento.findOne({
        where: {
          id: verificacion.emplazamientoId,
          reclamoId,
        },
        transaction,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | VEHÍCULO ORIGINAL
    |--------------------------------------------------------------------------
    */

    let vehiculoControlado = null;

    if (verificacion.vehiculoId) {
      vehiculoControlado = await Vehiculo.findOne({
        where: {
          id: verificacion.vehiculoId,
          reclamoId,
        },
        transaction,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | COMPATIBILIDAD
    |--------------------------------------------------------------------------
    |
    | Si un control viejo no tenía vehiculoId pero su
    | emplazamiento sí, recuperamos el vehículo desde ahí.
    |
    */

    if (
      !vehiculoControlado &&
      emplazamientoControlado?.vehiculoId
    ) {
      vehiculoControlado = await Vehiculo.findOne({
        where: {
          id: emplazamientoControlado.vehiculoId,
          reclamoId,
        },
        transaction,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | SEGURIDAD
    |--------------------------------------------------------------------------
    */

    const esAutor =
      Number(verificacion.inspectorId) ===
      Number(req.usuario.id);

    if (
      req.usuario.rol !== "administrador" &&
      !esAutor
    ) {
      await transaction.rollback();
      return res.status(403).json({
        ok: false,
        mensaje: "No podés editar un control realizado por otro inspector",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | PLAZO DE EDICIÓN
    |--------------------------------------------------------------------------
    |
    | Inspector: 1 hora desde createdAt.
    | Administrador: sin límite.
    |
    */

    if (req.usuario.rol !== "administrador") {
      const fechaRegistro = new Date(verificacion.createdAt);
      const fechaLimite = new Date(
        fechaRegistro.getTime() + 60 * 60 * 1000
      );

      if (new Date() > fechaLimite) {
        await transaction.rollback();
        return res.status(403).json({
          ok: false,
          codigo: "PLAZO_EDICION_VENCIDO",
          mensaje: "Pasó el plazo de 1 hora para editar este control.",
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | CAMPOS EDITABLES
    |--------------------------------------------------------------------------
    |
    | NO permitimos modificar:
    |
    | resultado
    | emplazamientoId
    | vehiculoId
    | plazo
    | número de acta
    | accionPosterior
    |
    */

    const {
      situacion,
      observaciones,
      personaEncontrada,
      apellidoInfractor,
      nombreInfractor,
      dniInfractor,
      domicilioInfractor,
      motivoInfraccion,
      observacionesInfraccion,
    } = req.body;

    /*
    |--------------------------------------------------------------------------
    | SITUACIÓN
    |--------------------------------------------------------------------------
    */

    if (situacion !== undefined) {
      const situacionLimpia = String(situacion).trim();

      if (!situacionLimpia) {
        await transaction.rollback();
        return res.status(400).json({
          ok: false,
          mensaje: "Debe indicar qué encontró el inspector",
        });
      }

      verificacion.situacion = situacionLimpia;
    }

    /*
    |--------------------------------------------------------------------------
    | OBSERVACIONES
    |--------------------------------------------------------------------------
    */

    if (observaciones !== undefined) {
      verificacion.observaciones =
        String(observaciones || "").trim() || null;
    }

    await verificacion.save({
      transaction,
    });

    /*
    |--------------------------------------------------------------------------
    | INFRACCIÓN RELACIONADA EXACTAMENTE CON ESTA VERIFICACIÓN
    |--------------------------------------------------------------------------
    */

    const infraccion = await Infraccion.findOne({
      where: {
        verificacionId: verificacion.id,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (infraccion) {
      /*
      |--------------------------------------------------------------------------
      | MOTIVO
      |--------------------------------------------------------------------------
      */

      if (motivoInfraccion !== undefined) {
        const motivoLimpio =
          String(motivoInfraccion || "").trim();

        if (!motivoLimpio) {
          await transaction.rollback();
          return res.status(400).json({
            ok: false,
            mensaje: "El motivo de la infracción no puede quedar vacío",
          });
        }

        infraccion.motivo = motivoLimpio;
      }

      /*
      |--------------------------------------------------------------------------
      | OBSERVACIONES DE INFRACCIÓN
      |--------------------------------------------------------------------------
      */

      if (observacionesInfraccion !== undefined) {
        infraccion.observaciones =
          String(observacionesInfraccion || "").trim() || null;
      }

      /*
      |--------------------------------------------------------------------------
      | PERSONA ENCONTRADA
      |--------------------------------------------------------------------------
      */

      if (personaEncontrada !== undefined) {
        infraccion.personaEncontrada =
          Boolean(personaEncontrada);
      }

      /*
      |--------------------------------------------------------------------------
      | SI NO HABÍA PERSONA
      |--------------------------------------------------------------------------
      */

      if (personaEncontrada === false) {
        infraccion.apellidoInfractor = null;
        infraccion.nombreInfractor = null;
        infraccion.dniInfractor = null;
        infraccion.domicilioInfractor = null;
      }

      /*
      |--------------------------------------------------------------------------
      | SI HABÍA PERSONA
      |--------------------------------------------------------------------------
      */

      else if (
        personaEncontrada === true ||
        infraccion.personaEncontrada === true
      ) {
        if (apellidoInfractor !== undefined) {
          infraccion.apellidoInfractor =
            String(apellidoInfractor || "").trim() || null;
        }

        if (nombreInfractor !== undefined) {
          infraccion.nombreInfractor =
            String(nombreInfractor || "").trim() || null;
        }

        if (dniInfractor !== undefined) {
          infraccion.dniInfractor =
            String(dniInfractor || "").trim() || null;
        }

        if (domicilioInfractor !== undefined) {
          infraccion.domicilioInfractor =
            String(domicilioInfractor || "").trim() || null;
        }
      }

      await infraccion.save({
        transaction,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | NO TOCAMOS EL FLUJO
    |--------------------------------------------------------------------------
    |
    | Editar NO modifica:
    |
    | - resultado
    | - emplazamiento
    | - vehículo
    | - prórroga
    | - número de acta
    | - acción posterior
    | - estado del reclamo
    | - estado de la tarea
    |
    */

    await transaction.commit();

    return res.json({
      ok: true,
      mensaje: "Control corregido correctamente",
      verificacion,
      infraccion,
      emplazamientoControlado,
      vehiculoControlado,
    });
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    console.error(
      "Error editando control:",
      error
    );

    return res.status(500).json({
      ok: false,
      mensaje: "Error editando el control",
      error: error.message,
    });
  }
};
module.exports = {
  registrarSegundaVisita,
  obtenerSegundaVisita,
  editarSegundaVisita,
};
