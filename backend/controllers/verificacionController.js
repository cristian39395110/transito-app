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
        mensaje:
          "Reclamo inválido",
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


    /*
    |--------------------------------------------------------------------------
    | TAREA ACTUAL
    |--------------------------------------------------------------------------
    */

    const tarea =
      await Asignacion.findOne({
        where: {
          reclamoId,

          tipo:
            "INSPECTOR",

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


        /*
    |--------------------------------------------------------------------------
    | EVITAR REGISTRAR DOS VECES EL MISMO CONTROL
    |--------------------------------------------------------------------------
    */

    if (tarea) {
      const controlYaRegistrado =
        await Verificacion.findOne({
          where: {
            asignacionId:
              tarea.id,
          },
          transaction,
        });

      if (controlYaRegistrado) {
        await transaction.rollback();

        return res
          .status(409)
          .json({
            ok: false,
            codigo:
              "CONTROL_YA_REGISTRADO",
            mensaje:
              "Este control ya fue registrado. Si necesitás corregirlo, usá la opción Editar control.",
          });
      }
    }
    /*
    |--------------------------------------------------------------------------
    | ÚLTIMO EMPLAZAMIENTO
    |--------------------------------------------------------------------------
    */

    const emplazamiento =
      await Emplazamiento.findOne({
        where: {
          reclamoId,
        },

        order: [
          ["id", "DESC"],
        ],

        transaction,
      });


    /*
    |--------------------------------------------------------------------------
    | VEHÍCULO SI EXISTE
    |--------------------------------------------------------------------------
    */

    const vehiculo =
      await Vehiculo.findOne({
        where: {
          reclamoId,
        },

        order: [
          ["id", "DESC"],
        ],

        transaction,
      });


    /*
    |--------------------------------------------------------------------------
    | PRÓRROGA
    |--------------------------------------------------------------------------
    */

    let horasProrroga =
      null;


    if (
      resultado === "PRORROGA"
    ) {
      if (!emplazamiento) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,

          mensaje:
            "No se encontró el emplazamiento anterior",
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


    /*
    |--------------------------------------------------------------------------
    | INFRACCIÓN
    |--------------------------------------------------------------------------
    */

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


    /*
Para un reclamo común el inspector
NO tiene que decidir quién va a
solucionar posteriormente el problema.

En vehículos sí necesitamos saber si
continúa directamente al retiro o si
queda pendiente de búsqueda/remoción.
*/

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

      /*
      Las dos opciones siguientes
      son exclusivas de vehículos.
      */

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


    /*
    |--------------------------------------------------------------------------
    | REGISTRAR EL CONTROL
    |--------------------------------------------------------------------------
    */

    const verificacion =
      await Verificacion.create(
        {
          reclamoId,

                    asignacionId:
            tarea?.id ||
            null,

          emplazamientoId:
            emplazamiento?.id ||
            null,

          inspectorId:
            req.usuario.id,

          vehiculoId:
            vehiculo?.id ||
            null,

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


    let infraccion =
      null;

    let nuevoEmplazamiento =
      null;

    let continuarRemocion =
      false;


    /*
    |--------------------------------------------------------------------------
    | CUMPLIÓ
    |--------------------------------------------------------------------------
    */

    if (
      resultado === "CUMPLIDO"
    ) {
      reclamo.estado =
        "RESUELTO";

      reclamo.etapaActual =
        "FINALIZADO";

      reclamo.estadoExterno =
        "LISTO_PARA_CERRAR";

      reclamo.fechaResolucion =
        new Date();


      if (emplazamiento) {
        emplazamiento.estado =
          "CUMPLIDO";

        emplazamiento.fechaCumplimiento =
          new Date();

        await emplazamiento.save({
          transaction,
        });
      }


      reclamo.inspectorId =
        null;

      await finalizarTarea(
        tarea,
        transaction
      );
    }


    /*
    |--------------------------------------------------------------------------
    | DAR MÁS PLAZO
    |--------------------------------------------------------------------------
    */

    else if (
      resultado === "PRORROGA"
    ) {
      /*
      El plazo viejo NO se modifica.

      Solo lo dejamos como vencido
      y creamos otro registro.
      */

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


      const ahora =
        new Date();

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

            /*
            La prórroga continúa
            dependiendo del Acta
            de Vía Pública original.
            */
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


      reclamo.estado =
        "EN_SEGUIMIENTO";

      reclamo.etapaActual =
        "ESPERANDO_PLAZO";

      reclamo.inspectorId =
        null;


      /*
      La visita terminó.

      Cuando vuelva a vencer,
      se genera OTRA tarea.
      */

      await finalizarTarea(
        tarea,
        transaction
      );
    }


    /*
    |--------------------------------------------------------------------------
    | INFRACCIÓN
    |--------------------------------------------------------------------------
    */

    else if (
      resultado ===
      "NO_CUMPLIDO"
    ) {
      if (
        emplazamiento &&
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
              motivoInfraccion.trim(),

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
        /*
|--------------------------------------------------------------------------
| VINCULAR FOTOS DEL ACTA DE INFRACCIÓN
|--------------------------------------------------------------------------
|
| La foto se toma antes de crear la infracción,
| por eso inicialmente queda:
|
| tipoReferencia = INFRACCION
| referenciaId = NULL
|
| Ahora que ya existe infraccion.id,
| la vinculamos definitivamente.
|
*/

await Foto.update(
  {
    referenciaId:
      infraccion.id,
  },
  {
    where: {
      reclamoId:
        reclamo.id,

      tipoReferencia:
        "INFRACCION",

      referenciaId:
        null,

      activo:
        true,
    },

    transaction,
  }
);

      /*
      ---------------------------------------------
      RETIRO EN ESTA MISMA ACTUACIÓN
      ---------------------------------------------

      La tarea NO termina todavía.

      El inspector continúa cargando
      inventario + remoción.
      */

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
      }


      /*
      ---------------------------------------------
      QUEDA PARA BUSCAR DESPUÉS
      ---------------------------------------------
      */

else if (
  accionPosterior ===
  "BUSQUEDA_REMOCION"
) {
  /*
  |--------------------------------------------------------------------------
  | NO SE PUDO RETIRAR - NECESITA ORDEN DEL JUZGADO
  |--------------------------------------------------------------------------
  |
  | El vehículo estaba en el lugar y correspondía retirarlo,
  | pero las personas presentes impidieron la remoción.
  |
  | La actuación del inspector termina acá.
  | Secretaría debe enviar la infracción al Juzgado
  | y esperar la autorización para poder volver a retirarlo.
  |
  */

  vehiculo.estadoActual =
    "PENDIENTE_REMOCION";

  await vehiculo.save({
    transaction,
  });

  /*
   * La infracción ya fue creada arriba con:
   *
   * estadoJuzgado = PENDIENTE_ENVIO
   *
   * Por eso Claudia podrá verla como pendiente
   * de enviar al Juzgado.
   */

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

      /*
      ---------------------------------------------
      DEMÁS INFRACCIONES
      ---------------------------------------------
      */

      else {
  /*
  La tarea del inspector terminó.

  La infracción va a Secretaría/Juzgado,
  pero el problema físico continúa abierto.

  NO significa que el reclamo esté resuelto.
  */

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
    }


    /*
    |--------------------------------------------------------------------------
    | NO SE ENCONTRÓ / NO SE PUDO VERIFICAR / OTRO
    |--------------------------------------------------------------------------
    */

    else {
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
      mensaje =
        "El problema quedó solucionado.";
    }


    if (
      resultado === "PRORROGA"
    ) {
      mensaje =
        "Se otorgó un nuevo plazo. El control quedó finalizado.";
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
        !continuarRemocion,

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
    | BUSCAR LA TAREA MÁS RECIENTE DE CONTROL
    |--------------------------------------------------------------------------
    |
    | Puede estar activa o finalizada.
    | Esto permite volver a entrar después
    | de haber registrado el control.
    |
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
        where: whereTarea,

        order: [
          ["id", "DESC"],
        ],
      });

    /*
    |--------------------------------------------------------------------------
    | TODAVÍA NO EXISTE TAREA
    |--------------------------------------------------------------------------
    */

    if (!tarea) {
      return res.json({
        ok: true,
        realizada: false,
        tarea: null,
        verificacion: null,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | BUSCAR LA VERIFICACIÓN DE ESA TAREA
    |--------------------------------------------------------------------------
    */

    let verificacion =
      await Verificacion.findOne({
        where: {
          asignacionId:
            tarea.id,
        },

        order: [
          ["id", "DESC"],
        ],
      });

    /*
    |--------------------------------------------------------------------------
    | COMPATIBILIDAD CON CONTROLES VIEJOS
    |--------------------------------------------------------------------------
    |
    | Los controles creados antes de agregar
    | asignacionId tienen ese campo NULL.
    |
    | Solo usamos este fallback para poder
    | visualizarlos.
    |
    */

    if (!verificacion) {
      verificacion =
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
    }

    /*
    |--------------------------------------------------------------------------
    | TAREA EXISTE PERO TODAVÍA NO SE HIZO EL CONTROL
    |--------------------------------------------------------------------------
    */

    if (!verificacion) {
      return res.json({
        ok: true,
        realizada: false,
        tarea,
        verificacion: null,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | INFRACCIÓN RELACIONADA
    |--------------------------------------------------------------------------
    */

    const infraccion =
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
    |--------------------------------------------------------------------------
    | PRÓRROGA GENERADA POR ESTE CONTROL
    |--------------------------------------------------------------------------
    */

   

    /*
    |--------------------------------------------------------------------------
    | PLAZO DE EDICIÓN
    |--------------------------------------------------------------------------
    |
    | Siempre usamos createdAt.
    | updatedAt NO extiende el plazo.
    |
    */

    const fechaRegistro =
      new Date(
        verificacion.createdAt
      );

    const fechaLimiteEdicion =
      new Date(
        fechaRegistro.getTime() +
          60 * 60 * 1000
      );

    const ahora =
      new Date();

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

    return res.json({
      ok: true,

      realizada: true,

      puedeEditar,

      minutosRestantes,

      fechaRegistro:
        verificacion.createdAt,

      fechaLimiteEdicion,

      tarea,

      verificacion,

      infraccion,

     
    });
  } catch (error) {
    console.error(
      "Error obteniendo control:",
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

const editarSegundaVisita = async (
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

    if (!reclamoId) {
      await transaction.rollback();

      return res.status(400).json({
        ok: false,
        mensaje:
          "Reclamo inválido",
      });
    }

    const reclamo =
      await Reclamo.findByPk(
        reclamoId,
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
          "Reclamo no encontrado",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | ÚLTIMA TAREA DEL INSPECTOR
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
        where: whereTarea,

        order: [
          ["id", "DESC"],
        ],

        transaction,
      });

    if (!tarea) {
      await transaction.rollback();

      return res.status(404).json({
        ok: false,
        mensaje:
          "No se encontró el control",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | VERIFICACIÓN DE ESA TAREA
    |--------------------------------------------------------------------------
    */

    let verificacion =
      await Verificacion.findOne({
        where: {
          asignacionId:
            tarea.id,
        },

        order: [
          ["id", "DESC"],
        ],

        transaction,

        lock:
          transaction.LOCK.UPDATE,
      });

    /*
    | Compatibilidad con controles anteriores.
    */

    if (!verificacion) {
      verificacion =
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

          transaction,

          lock:
            transaction.LOCK.UPDATE,
        });
    }

    if (!verificacion) {
      await transaction.rollback();

      return res.status(404).json({
        ok: false,
        mensaje:
          "El control todavía no fue registrado",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | SEGURIDAD: SOLO EL INSPECTOR QUE LO HIZO
    |--------------------------------------------------------------------------
    */

    const esAutor =
      Number(
        verificacion.inspectorId
      ) ===
      Number(
        req.usuario.id
      );

    if (
      req.usuario.rol !==
        "administrador" &&
      !esAutor
    ) {
      await transaction.rollback();

      return res.status(403).json({
        ok: false,
        mensaje:
          "No podés editar un control realizado por otro inspector",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | CONTROLAR LA HORA
    |--------------------------------------------------------------------------
    |
    | IMPORTANTE:
    | se compara contra createdAt,
    | nunca contra updatedAt.
    |
    */

    if (
      req.usuario.rol !==
      "administrador"
    ) {
      const fechaRegistro =
        new Date(
          verificacion.createdAt
        );

      const fechaLimite =
        new Date(
          fechaRegistro.getTime() +
            60 * 60 * 1000
        );

      if (
        new Date() >
        fechaLimite
      ) {
        await transaction.rollback();

        return res.status(403).json({
          ok: false,

          codigo:
            "PLAZO_EDICION_VENCIDO",

          mensaje:
            "Pasó el plazo de 1 hora para editar este control.",
        });
      }
    }

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
    | DATOS DESCRIPTIVOS DEL CONTROL
    |--------------------------------------------------------------------------
    |
    | NO permitimos cambiar resultado.
    | NO permitimos cambiar prórroga.
    | NO permitimos cambiar número de acta.
    | NO permitimos cambiar acción posterior.
    |
    */

    if (
      situacion !==
      undefined
    ) {
      if (
        !String(
          situacion
        ).trim()
      ) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "Debe indicar qué encontró el inspector",
        });
      }

      verificacion.situacion =
        String(
          situacion
        ).trim();
    }

    if (
      observaciones !==
      undefined
    ) {
      verificacion.observaciones =
        String(
          observaciones || ""
        ).trim() ||
        null;
    }

    
    await verificacion.save({
      transaction,
    });

    /*
    |--------------------------------------------------------------------------
    | SI HUBO ACTA DE INFRACCIÓN
    |--------------------------------------------------------------------------
    */

    const infraccion =
      await Infraccion.findOne({
        where: {
          verificacionId:
            verificacion.id,
        },

        transaction,

        lock:
          transaction.LOCK.UPDATE,
      });

    if (infraccion) {
      if (
        motivoInfraccion !==
        undefined
      ) {
        infraccion.motivo =
          String(
            motivoInfraccion || ""
          ).trim() ||
          infraccion.motivo;
      }

      if (
        observacionesInfraccion !==
        undefined
      ) {
        infraccion.observaciones =
          String(
            observacionesInfraccion ||
              ""
          ).trim() ||
          null;
      }

      if (
        personaEncontrada !==
        undefined
      ) {
        infraccion.personaEncontrada =
          Boolean(
            personaEncontrada
          );
      }

      if (
        personaEncontrada ===
        false
      ) {
        infraccion.apellidoInfractor =
          null;

        infraccion.nombreInfractor =
          null;

        infraccion.dniInfractor =
          null;

        infraccion.domicilioInfractor =
          null;
      } else {
        if (
          apellidoInfractor !==
          undefined
        ) {
          infraccion.apellidoInfractor =
            String(
              apellidoInfractor ||
                ""
            ).trim() ||
            null;
        }

        if (
          nombreInfractor !==
          undefined
        ) {
          infraccion.nombreInfractor =
            String(
              nombreInfractor ||
                ""
            ).trim() ||
            null;
        }

        if (
          dniInfractor !==
          undefined
        ) {
          infraccion.dniInfractor =
            String(
              dniInfractor ||
                ""
            ).trim() ||
            null;
        }

        if (
          domicilioInfractor !==
          undefined
        ) {
          infraccion.domicilioInfractor =
            String(
              domicilioInfractor ||
                ""
            ).trim() ||
            null;
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
    | La tarea continúa FINALIZADA.
    | El reclamo conserva su estado.
    | No se vuelve a ejecutar ninguna
    | transición de workflow.
    |
    */

    await transaction.commit();

    return res.json({
      ok: true,

      mensaje:
        "Control corregido correctamente",

      verificacion,

      infraccion,
    });
  } catch (error) {
    if (
      !transaction.finished
    ) {
      await transaction.rollback();
    }

    console.error(
      "Error editando control:",
      error
    );

    return res.status(500).json({
      ok: false,
      mensaje:
        "Error editando el control",
      error:
        error.message,
    });
  }
};
module.exports = {
  registrarSegundaVisita,
  obtenerSegundaVisita,
  editarSegundaVisita,
};
