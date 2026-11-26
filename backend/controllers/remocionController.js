const {
  Op,
} = require("sequelize");

const {
  sequelize,
  Reclamo,
  Vehiculo,
  Verificacion,
  Infraccion,
  InventarioVehiculo,
 Remocion,
Predio,
Emplazamiento,
Asignacion,
} = require("../models");

const {
  registrarHistorial,
} = require(
  "../services/historialService"
);

const {
  puedeRetirarGrua,
} = require(
  "../services/gruaService"
);


/*
|--------------------------------------------------------------------------
| PERMISO
|--------------------------------------------------------------------------
|
| Inspector: solamente el inspector asignado al reclamo.
|
| Grúa: no está asignada al reclamo. Su permiso se valida
| más abajo, cuando ya se conoce el vehículo y el acta:
| el acta debe ser RETIRO_GRUA y el vehículo debe seguir
| PENDIENTE_REMOCION (ver puedeRetirarGrua).
|
*/

const esUsuarioGrua = (
  usuario
) =>
  usuario?.rol === "grua";

const validarInspector = (
  reclamo,
  usuario
) => {
  if (
    usuario.rol ===
    "administrador"
  ) {
    return true;
  }

  return (
    usuario.rol ===
      "inspector" &&
    Number(
      reclamo.inspectorId
    ) === Number(
      usuario.id
    )
  );
};

const actualizarEstadoReclamoDespuesDeRemocion = async ({
  reclamo,
  vehiculoRemovido,
  realizadaPorGrua = false,
  transaction,
}) => {
  /*
  |--------------------------------------------------------------------------
  | REMOCIÓN HECHA POR LA GRÚA MIENTRAS UN INSPECTOR TRABAJA EL RECLAMO
  |--------------------------------------------------------------------------
  |
  | Ejemplo: el inspector sigue controlando otro vehículo del mismo
  | reclamo en su segunda visita.
  |
  | No tocamos el estado del reclamo para no sacarle el trabajo al
  | inspector. Cuando el inspector termine, su propio flujo ya ve que
  | este vehículo pasó a PENDIENTE_INGRESO_PREDIO.
  |
  */

  if (
    realizadaPorGrua &&
    reclamo.inspectorId
  ) {
    return {
      modo: "GRUA_CON_INSPECTOR_ACTIVO",
      hayOtroParaControlarAhora: false,
      hayOtroEsperandoPlazo: false,
    };
  }

  const vehiculos = await Vehiculo.findAll({
    where: {
      reclamoId: reclamo.id,
    },
    transaction,
  });

  /*
  |--------------------------------------------------------------------------
  | COMPATIBILIDAD CON SISTEMA VIEJO
  |--------------------------------------------------------------------------
  |
  | Si el reclamo tiene un solo vehículo, conservamos exactamente
  | el comportamiento histórico.
  |
  */

  if (vehiculos.length <= 1) {
    reclamo.estado = "PENDIENTE_ACTUACION";
    reclamo.etapaActual = "PENDIENTE_INGRESO_PREDIO";
    reclamo.inspectorId = null;
    reclamo.fechaResolucion = null;

    await reclamo.save({
      transaction,
    });

    return {
      modo: "COMPATIBILIDAD",
      hayOtroParaControlarAhora: false,
      hayOtroEsperandoPlazo: false,
    };
  }

  /*
  |--------------------------------------------------------------------------
  | SISTEMA NUEVO - VARIOS VEHÍCULOS
  |--------------------------------------------------------------------------
  */

  const emplazamientos = await Emplazamiento.findAll({
    where: {
      reclamoId: reclamo.id,
    },
    transaction,
  });

  const idsConHijo = new Set(
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

  const vehiculosPorId = new Map(
    vehiculos.map(
      (vehiculo) => [
        Number(vehiculo.id),
        vehiculo,
      ]
    )
  );

  const estadosFueraDeControl = new Set([
    "PENDIENTE_REMOCION",
    "REMOVIDO",
    "PENDIENTE_INGRESO_PREDIO",
    "EN_PREDIO",
    "EGRESADO",
  ]);

  const ahora = new Date();

  /*
  |--------------------------------------------------------------------------
  | EMPLAZAMIENTOS ABIERTOS DE OTROS VEHÍCULOS
  |--------------------------------------------------------------------------
  |
  | Solamente miramos la hoja actual de cada cadena.
  |
  | original -> prórroga
  |
  | El original ya no cuenta.
  |
  */

  const pendientes = emplazamientos.filter(
    (emplazamiento) => {
      if (
        idsConHijo.has(
          Number(emplazamiento.id)
        )
      ) {
        return false;
      }

      if (
        ["CUMPLIDO", "CANCELADO"].includes(
          emplazamiento.estado
        )
      ) {
        return false;
      }

      /*
      | Si pertenece al vehículo que acabamos de remover,
      | ya no forma parte del circuito de control.
      */

      if (
        vehiculoRemovido &&
        Number(emplazamiento.vehiculoId) ===
          Number(vehiculoRemovido.id)
      ) {
        return false;
      }

      /*
      | Tampoco cuentan vehículos que ya están en
      | remoción, predio o egresados.
      */

      if (emplazamiento.vehiculoId) {
        const vehiculo =
          vehiculosPorId.get(
            Number(
              emplazamiento.vehiculoId
            )
          );

        if (
          vehiculo &&
          estadosFueraDeControl.has(
            vehiculo.estadoActual
          )
        ) {
          return false;
        }
      }

      return true;
    }
  );

  const pendientesVencidos =
    pendientes.filter(
      (emplazamiento) => {
        if (
          emplazamiento.estado ===
          "VENCIDO"
        ) {
          return true;
        }

        if (
          emplazamiento.estado !==
            "VIGENTE" ||
          !emplazamiento.fechaVencimiento
        ) {
          return false;
        }

        const vencimiento =
          new Date(
            emplazamiento.fechaVencimiento
          );

        if (
          Number.isNaN(
            vencimiento.getTime()
          )
        ) {
          return false;
        }

        return vencimiento <= ahora;
      }
    );

  const pendientesEnPlazo =
    pendientes.filter(
      (emplazamiento) => {
        if (
          emplazamiento.estado !==
            "VIGENTE" ||
          !emplazamiento.fechaVencimiento
        ) {
          return false;
        }

        const vencimiento =
          new Date(
            emplazamiento.fechaVencimiento
          );

        if (
          Number.isNaN(
            vencimiento.getTime()
          )
        ) {
          return false;
        }

        return vencimiento > ahora;
      }
    );

  /*
  |--------------------------------------------------------------------------
  | PRIORIDAD 1 - HAY OTRO VEHÍCULO PARA CONTROLAR AHORA
  |--------------------------------------------------------------------------
  */

  /*
  |--------------------------------------------------------------------------
  | PRIORIDAD 1 (GRÚA) - HAY OTRO VEHÍCULO VENCIDO
  |--------------------------------------------------------------------------
  |
  | La grúa no hace segundas visitas. El otro vehículo
  | vuelve a quedar para que el jefe asigne inspector.
  |
  */

  if (
    realizadaPorGrua &&
    pendientesVencidos.length > 0
  ) {
    reclamo.estado =
      "PENDIENTE_ACTUACION";

    reclamo.etapaActual =
      "PENDIENTE_SEGUNDA_VISITA";

    reclamo.inspectorId = null;
    reclamo.fechaResolucion = null;

    await reclamo.save({
      transaction,
    });

    return {
      modo: "MULTIVEHICULO",
      hayOtroParaControlarAhora: false,
      hayOtroEsperandoPlazo:
        pendientesEnPlazo.length > 0,
    };
  }

  if (pendientesVencidos.length > 0) {
    reclamo.estado =
      "PENDIENTE_ACTUACION";

    reclamo.etapaActual =
      "SEGUNDA_VISITA";

    /*
    | No borramos inspectorId acá.
    |
    | Puede ser la misma tarea y el inspector todavía
    | tiene otro vehículo para controlar.
    */

    reclamo.fechaResolucion = null;

    await reclamo.save({
      transaction,
    });

    return {
      modo: "MULTIVEHICULO",
      hayOtroParaControlarAhora: true,
      hayOtroEsperandoPlazo:
        pendientesEnPlazo.length > 0,
    };
  }

  /*
  |--------------------------------------------------------------------------
  | PRIORIDAD 2 - HAY OTRO VEHÍCULO ESPERANDO PLAZO
  |--------------------------------------------------------------------------
  */

  if (pendientesEnPlazo.length > 0) {
    reclamo.estado =
      "EN_SEGUIMIENTO";

    reclamo.etapaActual =
      "ESPERANDO_PLAZO";

    reclamo.inspectorId = null;
    reclamo.fechaResolucion = null;

    await reclamo.save({
      transaction,
    });

    return {
      modo: "MULTIVEHICULO",
      hayOtroParaControlarAhora: false,
      hayOtroEsperandoPlazo: true,
    };
  }

  /*
  |--------------------------------------------------------------------------
  | NO QUEDA OTRO EMPLAZAMIENTO
  |--------------------------------------------------------------------------
  |
  | El vehículo removido todavía tiene que ingresar al predio.
  |
  */

  reclamo.estado =
    "PENDIENTE_ACTUACION";

  reclamo.etapaActual =
    "PENDIENTE_INGRESO_PREDIO";

  reclamo.inspectorId = null;
  reclamo.fechaResolucion = null;

  await reclamo.save({
    transaction,
  });

  return {
    modo: "MULTIVEHICULO",
    hayOtroParaControlarAhora: false,
    hayOtroEsperandoPlazo: false,
  };
};
/*
|--------------------------------------------------------------------------
| CONTEXTO PARA PÁGINA DE REMOCIÓN
|--------------------------------------------------------------------------
*/

const obtenerContextoRemocion =
  async (req, res) => {
    try {
      const reclamoId =
        Number(
          req.params.reclamoId
        );

        const infraccionId =
  Number(
    req.query.infraccionId
  ) || null;

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


      const porGrua =
        esUsuarioGrua(
          req.usuario
        );

      if (
        !porGrua &&
        !validarInspector(
          reclamo,
          req.usuario
        )
      ) {
        return res.status(403).json({
          ok: false,
          mensaje:
            "Este trabajo no está asignado a este inspector",
        });
      }

      /*
      | La grúa siempre entra desde su bandeja
      | con el acta exacta del vehículo.
      */

      if (
        porGrua &&
        !infraccionId
      ) {
        return res.status(400).json({
          ok: false,
          mensaje:
            "Falta indicar el Acta de Infracción del vehículo a retirar",
        });
      }


     let infraccion = null;
let vehiculo = null;

/*
|--------------------------------------------------------------------------
| SISTEMA NUEVO
|--------------------------------------------------------------------------
|
| La segunda visita manda exactamente la infracción
| que originó esta remoción.
|
| Esto es obligatorio para reclamos con varios vehículos.
|
*/

if (infraccionId) {
  infraccion =
    await Infraccion.findOne({
      where: {
        id: infraccionId,
        reclamoId,
        anulada: false,
      },
    });

  if (!infraccion) {
    return res.status(404).json({
      ok: false,
      mensaje:
        "La Acta de Infracción indicada no pertenece a este reclamo",
    });
  }

  if (!infraccion.vehiculoId) {
    return res.status(400).json({
      ok: false,
      mensaje:
        "La Acta de Infracción no tiene un vehículo asociado",
    });
  }

  vehiculo =
    await Vehiculo.findOne({
      where: {
        id: infraccion.vehiculoId,
        reclamoId,
      },
    });

  if (!vehiculo) {
    return res.status(404).json({
      ok: false,
      mensaje:
        "El vehículo asociado a la infracción no fue encontrado",
    });
  }
}

/*
|--------------------------------------------------------------------------
| SISTEMA VIEJO
|--------------------------------------------------------------------------
|
| Las pantallas anteriores podían entrar a remoción
| sin mandar infraccionId.
|
| Conservamos ese comportamiento solamente como
| compatibilidad histórica.
|
*/

else {
  vehiculo =
    await Vehiculo.findOne({
      where: {
        reclamoId,
      },
      order: [
        ["id", "DESC"],
      ],
    });

  if (!vehiculo) {
    return res.status(404).json({
      ok: false,
      mensaje:
        "Este reclamo no tiene un vehículo registrado",
    });
  }

  infraccion =
    await Infraccion.findOne({
      where: {
        reclamoId,
        vehiculoId:
          vehiculo.id,
        anulada: false,
      },
      order: [
        ["id", "DESC"],
      ],
    });

  if (!infraccion) {
    return res.status(400).json({
      ok: false,
      mensaje:
        "No se puede remover el vehículo porque no tiene Acta de Infracción registrada",
    });
  }
}

      /*
      |--------------------------------------------------------------------------
      | PERMISO DE LA GRÚA
      |--------------------------------------------------------------------------
      */

      if (
        porGrua &&
        !puedeRetirarGrua({
          infraccion,
          vehiculo,
        })
      ) {
        return res.status(403).json({
          ok: false,
          mensaje:
            "Este vehículo no está marcado como listo para retirar con grúa",
        });
      }


      const inventario =
        await InventarioVehiculo.findOne({
          where: {
            reclamoId,
            vehiculoId:
              vehiculo.id,
          },

          order: [
            ["id", "DESC"],
          ],
        });


      const remocion =
        await Remocion.findOne({
          where: {
            reclamoId,
            vehiculoId:
              vehiculo.id,
          },

          order: [
            ["id", "DESC"],
          ],
        });


      return res.json({
        ok: true,

        reclamo,
        vehiculo,
        infraccion,
        inventario,
        remocion,
      });
    } catch (error) {
      console.error(
        "Error obteniendo contexto de remoción:",
        error
      );

      return res.status(500).json({
        ok: false,
        mensaje:
          "Error obteniendo los datos para la remoción",
      });
    }
  };


/*
|--------------------------------------------------------------------------
| INFRACCIÓN - RUTA VIEJA
|--------------------------------------------------------------------------
*/

const registrarInfraccion =
  async (req, res) => {
    const transaction =
      await sequelize.transaction();

    try {
      const {
        reclamoId,
        vehiculoId,
        verificacionId,
        numeroActa,
        fechaHora,
        lugar,
        motivo,
        observaciones,
      } = req.body;


      if (
        !reclamoId ||
        !vehiculoId ||
        !numeroActa?.trim()
      ) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,

          mensaje:
            "Reclamo, vehículo y número de acta son obligatorios",
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


      if (
        !validarInspector(
          reclamo,
          req.usuario
        )
      ) {
        await transaction.rollback();

        return res.status(403).json({
          ok: false,
          mensaje:
            "Este reclamo no está asignado a este inspector",
        });
      }


      const vehiculo =
        await Vehiculo.findOne({
          where: {
            id:
              vehiculoId,

            reclamoId:
              reclamo.id,
          },

          transaction,
        });


      if (!vehiculo) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "El vehículo no pertenece a este reclamo",
        });
      }


      let verificacion =
        null;


      if (verificacionId) {
        verificacion =
          await Verificacion.findOne({
            where: {
              id:
                verificacionId,

              reclamoId:
                reclamo.id,

              vehiculoId:
                vehiculo.id,
            },

            transaction,
          });


        if (!verificacion) {
          await transaction.rollback();

          return res.status(400).json({
            ok: false,
            mensaje:
              "La verificación indicada no corresponde al vehículo",
          });
        }
      }


      const numeroNormalizado =
        numeroActa
          .trim()
          .toUpperCase();


      const existente =
        await Infraccion.findOne({
          where: {
            numeroActa:
              numeroNormalizado,
          },

          transaction,
        });


      if (existente) {
        await transaction.rollback();

        return res.status(409).json({
          ok: false,
          mensaje:
            "Ese número de Acta de Infracción ya está registrado",
        });
      }


      const infraccion =
        await Infraccion.create(
          {
            reclamoId:
              reclamo.id,

            vehiculoId:
              vehiculo.id,

            inspectorId:
              req.usuario.id,

            verificacionId:
              verificacion?.id ||
              null,

            numeroActa:
              numeroNormalizado,

            fechaHora:
              fechaHora ||
              new Date(),

            lugar:
              lugar?.trim() ||
              reclamo.direccion,

            motivo:
              motivo?.trim() ||
              "Incumplimiento del emplazamiento",

            observaciones:
              observaciones
                ?.trim() ||
              null,

            estadoJuzgado:
              "PENDIENTE_ENVIO",
          },
          {
            transaction,
          }
        );


      await registrarHistorial({
        reclamoId:
          reclamo.id,

        usuarioId:
          req.usuario.id,

        accion:
          "ACTA_INFRACCION",

        descripcion:
          `Acta de infracción ${infraccion.numeroActa} registrada`,

        estadoAnterior:
          reclamo.estado,

        estadoNuevo:
          reclamo.estado,

        transaction,
      });


      await transaction.commit();


      return res.status(201).json({
        ok: true,
        mensaje:
          "Acta de Infracción registrada correctamente",
        infraccion,
      });
    } catch (error) {
      if (
        !transaction.finished
      ) {
        await transaction.rollback();
      }


      console.error(
        "Error registrando infracción:",
        error
      );


      return res.status(500).json({
        ok: false,
        mensaje:
          "Error al registrar la infracción",
      });
    }
  };


/*
|--------------------------------------------------------------------------
| INVENTARIO - RUTA VIEJA
|--------------------------------------------------------------------------
*/

const registrarInventario =
  async (req, res) => {
    const transaction =
      await sequelize.transaction();

    try {
      const {
        reclamoId,
        vehiculoId,
        detalle,
        observaciones,
      } = req.body;


      if (
        !reclamoId ||
        !vehiculoId
      ) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "Reclamo y vehículo son obligatorios",
        });
      }


      if (
        !detalle ||
        typeof detalle !==
          "object" ||
        Array.isArray(
          detalle
        )
      ) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "El detalle del inventario es obligatorio",
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


      if (
        !validarInspector(
          reclamo,
          req.usuario
        )
      ) {
        await transaction.rollback();

        return res.status(403).json({
          ok: false,
          mensaje:
            "Este reclamo no está asignado a este inspector",
        });
      }


      const vehiculo =
        await Vehiculo.findOne({
          where: {
            id:
              vehiculoId,

            reclamoId:
              reclamo.id,
          },

          transaction,
        });


      if (!vehiculo) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "El vehículo no pertenece a este reclamo",
        });
      }


      const inventario =
        await InventarioVehiculo.create(
          {
            reclamoId:
              reclamo.id,

            vehiculoId:
              vehiculo.id,

            inspectorId:
              req.usuario.id,

            detalle,

            observaciones:
              observaciones
                ?.trim() ||
              null,

            fechaHora:
              new Date(),
          },
          {
            transaction,
          }
        );


      await registrarHistorial({
        reclamoId:
          reclamo.id,

        usuarioId:
          req.usuario.id,

        accion:
          "INVENTARIO_VEHICULO",

        descripcion:
          `Inventario registrado para vehículo interno N.º ${vehiculo.numeroInterno || vehiculo.id}`,

        estadoAnterior:
          reclamo.estado,

        estadoNuevo:
          reclamo.estado,

        transaction,
      });


      await transaction.commit();


      return res.status(201).json({
        ok: true,
        mensaje:
          "Inventario registrado correctamente",
        inventario,
      });
    } catch (error) {
      if (
        !transaction.finished
      ) {
        await transaction.rollback();
      }


      console.error(
        "Error registrando inventario:",
        error
      );


      return res.status(500).json({
        ok: false,
        mensaje:
          "Error al registrar el inventario",
      });
    }
  };


/*
|--------------------------------------------------------------------------
| REMOCIÓN SIMPLE - COMPATIBILIDAD
|--------------------------------------------------------------------------
*/

const registrarRemocion =
  async (req, res) => {
    const transaction =
      await sequelize.transaction();

    try {
      const {
        reclamoId,
        vehiculoId,
        infraccionId,
        inventarioId,

        fechaHora,
        grua,
        chofer,
        predioDestinoId,
        destino,
        observaciones,
      } = req.body;


      /*
      AHORA LOS DOS SON
      OBLIGATORIOS.
      */

    if (
  !reclamoId ||
  !vehiculoId ||
  !infraccionId ||
  !inventarioId ||
  !predioDestinoId
) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,

          mensaje:
            "Para retirar un vehículo debe existir Acta de Infracción e inventario",
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


      if (
        !validarInspector(
          reclamo,
          req.usuario
        )
      ) {
        await transaction.rollback();

        return res.status(403).json({
          ok: false,
          mensaje:
            "Este reclamo no está asignado a este inspector",
        });
      }


      const vehiculo =
        await Vehiculo.findOne({
          where: {
            id:
              vehiculoId,

            reclamoId:
              reclamo.id,
          },

          transaction,
        });


      if (!vehiculo) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "El vehículo no pertenece al reclamo",
        });
      }


      const infraccion =
        await Infraccion.findOne({
          where: {
            id:
              infraccionId,

            reclamoId:
              reclamo.id,

            vehiculoId:
              vehiculo.id,

            anulada:
              false,
          },

          transaction,
        });


      if (!infraccion) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,

          mensaje:
            "No existe una Acta de Infracción válida para este vehículo",
        });
      }


      const inventario =
        await InventarioVehiculo.findOne({
          where: {
            id:
              inventarioId,

            reclamoId:
              reclamo.id,

            vehiculoId:
              vehiculo.id,
          },

          transaction,
        });


      if (!inventario) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,

          mensaje:
            "Debe existir un inventario válido antes de retirar el vehículo",
        });
      }

const predioDestino =
  await Predio.findOne({
    where: {
      id: Number(
        predioDestinoId
      ),
      activo: true,
    },

    transaction,
  });

if (!predioDestino) {
  await transaction.rollback();

  return res.status(400).json({
    ok: false,
    mensaje:
      "El destino seleccionado no existe o está inactivo",
  });
}
      const remocion =
        await Remocion.create(
          {
            reclamoId:
              reclamo.id,

            vehiculoId:
              vehiculo.id,

            infraccionId:
              infraccion.id,

            inventarioId:
              inventario.id,

            inspectorId:
              req.usuario.id,

            fechaHora:
              fechaHora ||
              new Date(),

            grua:
              grua?.trim() ||
              null,

            chofer:
              chofer?.trim() ||
              null,

       predioDestinoId:
  predioDestino.id,

destino:
  predioDestino.nombre,

            observaciones:
              observaciones
                ?.trim() ||
              null,
          },
          {
            transaction,
          }
        );


      vehiculo.estadoActual =
        "PENDIENTE_INGRESO_PREDIO";

      await vehiculo.save({
        transaction,
      });


  const estadoPostRemocion =
  await actualizarEstadoReclamoDespuesDeRemocion({
    reclamo,
    vehiculoRemovido: vehiculo,
    transaction,
  });


      const tarea =
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
            ["id", "DESC"],
          ],

          transaction,
        });


   if (tarea) {
  if (
    estadoPostRemocion
      .hayOtroParaControlarAhora
  ) {
    tarea.estadoTarea =
      "EN_CURSO";

    tarea.fechaFinalizacion =
      null;
  } else {
    tarea.estadoTarea =
      "FINALIZADA";

    tarea.fechaFinalizacion =
      new Date();
  }

  await tarea.save({
    transaction,
  });
}


      await registrarHistorial({
        reclamoId:
          reclamo.id,

        usuarioId:
          req.usuario.id,

        accion:
          "REMOCION_VEHICULO",

        descripcion:
          `Vehículo interno N.º ${vehiculo.numeroInterno || vehiculo.id} retirado de la vía pública`,

        estadoAnterior:
          "PENDIENTE_ACTUACION",

        estadoNuevo:
          "PENDIENTE_ACTUACION",

        transaction,
      });


      await transaction.commit();


      return res.status(201).json({
        ok: true,

        mensaje:
          "Remoción registrada. El vehículo quedó pendiente de ingreso al predio.",

        remocion,
      });
    } catch (error) {
      if (
        !transaction.finished
      ) {
        await transaction.rollback();
      }


      console.error(
        "Error registrando remoción:",
        error
      );


      return res.status(500).json({
        ok: false,
        mensaje:
          "Error al registrar la remoción",
      });
    }
  };


/*
|--------------------------------------------------------------------------
| INVENTARIO + REMOCIÓN EN UNA SOLA OPERACIÓN
|--------------------------------------------------------------------------
|
| Esta es la ruta que usará la pantalla nueva.
|
| Si algo falla:
| NO queda medio inventario
| NO queda media remoción.
|
|--------------------------------------------------------------------------
*/

const registrarRemocionCompleta =
  async (req, res) => {
    const transaction =
      await sequelize.transaction();

    try {
      const {
        reclamoId,
        vehiculoId,
        infraccionId,
        detalleInventario,
        observacionesInventario,
        grua,
        chofer,
        predioDestinoId,
        destino,
        observacionesRemocion,
      } = req.body;

      /*
      |--------------------------------------------------------------------------
      | VALIDACIONES BÁSICAS
      |--------------------------------------------------------------------------
      */

      if (
        !reclamoId ||
        !vehiculoId ||
        !infraccionId ||
        !predioDestinoId
      ) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "Faltan datos del reclamo, vehículo, Acta de Infracción o destino del vehículo",
        });
      }

      if (
        !detalleInventario ||
        typeof detalleInventario !==
          "object" ||
        Array.isArray(
          detalleInventario
        ) ||
        Object.keys(
          detalleInventario
        ).length === 0
      ) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "Debe completar el inventario del vehículo antes de retirarlo",
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

      const porGrua =
        esUsuarioGrua(
          req.usuario
        );

      if (
        !porGrua &&
        !validarInspector(
          reclamo,
          req.usuario
        )
      ) {
        await transaction.rollback();

        return res.status(403).json({
          ok: false,
          mensaje:
            "Este trabajo no está asignado a este inspector",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | VEHÍCULO EXACTO
      |--------------------------------------------------------------------------
      |
      | Se bloquea la fila para que dos usuarios
      | (por ejemplo dos grúas) no registren
      | la misma remoción al mismo tiempo.
      |
      */

      const vehiculo =
        await Vehiculo.findOne({
          where: {
            id: vehiculoId,
            reclamoId:
              reclamo.id,
          },
          transaction,
          lock:
            transaction.LOCK.UPDATE,
        });

      if (!vehiculo) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "El vehículo no pertenece al reclamo",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | INFRACCIÓN EXACTA DEL VEHÍCULO
      |--------------------------------------------------------------------------
      */

      const infraccion =
        await Infraccion.findOne({
          where: {
            id: infraccionId,
            reclamoId:
              reclamo.id,
            vehiculoId:
              vehiculo.id,
            anulada: false,
          },
          transaction,
        });

      if (!infraccion) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "No se puede retirar el vehículo sin una Acta de Infracción válida",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | PERMISO DE LA GRÚA
      |--------------------------------------------------------------------------
      */

      if (
        porGrua &&
        !puedeRetirarGrua({
          infraccion,
          vehiculo,
        })
      ) {
        await transaction.rollback();

        return res.status(403).json({
          ok: false,
          mensaje:
            "Este vehículo no está marcado como listo para retirar con grúa",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | EVITAR DOBLE REMOCIÓN
      |--------------------------------------------------------------------------
      */

      const remocionAnterior =
        await Remocion.findOne({
          where: {
            reclamoId:
              reclamo.id,
            vehiculoId:
              vehiculo.id,
          },
          transaction,
        });

      if (remocionAnterior) {
        await transaction.rollback();

        return res.status(409).json({
          ok: false,
          mensaje:
            "Este vehículo ya tiene una remoción registrada",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | DESTINO
      |--------------------------------------------------------------------------
      */

      const predioDestino =
        await Predio.findOne({
          where: {
            id: Number(
              predioDestinoId
            ),
            activo: true,
          },
          transaction,
        });

      if (!predioDestino) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "El destino seleccionado no existe o está inactivo",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | INVENTARIO
      |--------------------------------------------------------------------------
      */

      const inventario =
        await InventarioVehiculo.create(
          {
            reclamoId:
              reclamo.id,

            vehiculoId:
              vehiculo.id,

            inspectorId:
              req.usuario.id,

            fechaHora:
              new Date(),

            detalle:
              detalleInventario,

            observaciones:
              observacionesInventario
                ?.trim() ||
              null,
          },
          {
            transaction,
          }
        );

      /*
      |--------------------------------------------------------------------------
      | REMOCIÓN
      |--------------------------------------------------------------------------
      */

      const remocion =
        await Remocion.create(
          {
            reclamoId:
              reclamo.id,

            vehiculoId:
              vehiculo.id,

            infraccionId:
              infraccion.id,

            inventarioId:
              inventario.id,

            inspectorId:
              req.usuario.id,

            fechaHora:
              new Date(),

            grua:
              grua?.trim() ||
              null,

            chofer:
              chofer?.trim() ||
              null,

            predioDestinoId:
              predioDestino.id,

            destino:
              predioDestino.nombre,

            observaciones:
              observacionesRemocion
                ?.trim() ||
              null,
          },
          {
            transaction,
          }
        );

      /*
      |--------------------------------------------------------------------------
      | VEHÍCULO
      |--------------------------------------------------------------------------
      */

      vehiculo.estadoActual =
        "PENDIENTE_INGRESO_PREDIO";

      await vehiculo.save({
        transaction,
      });

      /*
      |--------------------------------------------------------------------------
      | ESTADO GENERAL DEL RECLAMO
      |--------------------------------------------------------------------------
      |
      | Esta función ya distingue:
      |
      | - otro vehículo vencido para controlar ahora
      | - otro vehículo todavía dentro del plazo
      | - ningún otro emplazamiento pendiente
      |
      */

      /*
      | Si la grúa es la que tiene tomada la segunda
      | visita de este reclamo (por ejemplo, queda otro
      | vehículo para controlar), trabaja como un
      | inspector: sigue su propia visita.
      */

      const gruaEsResponsable =
        porGrua &&
        Number(
          reclamo.inspectorId
        ) ===
          Number(req.usuario.id);

      const estadoPostRemocion =
        await actualizarEstadoReclamoDespuesDeRemocion({
          reclamo,
          vehiculoRemovido:
            vehiculo,
          realizadaPorGrua:
            porGrua &&
            !gruaEsResponsable,
          transaction,
        });

      /*
      |--------------------------------------------------------------------------
      | TAREA DEL INSPECTOR
      |--------------------------------------------------------------------------
      */

      const tarea =
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
            ["id", "DESC"],
          ],

          transaction,
        });

      if (tarea) {
        if (
          estadoPostRemocion
            .hayOtroParaControlarAhora
        ) {
          /*
          | Queda otro vehículo vencido
          | dentro de esta misma visita.
          */

          tarea.estadoTarea =
            "EN_CURSO";

          tarea.fechaFinalizacion =
            null;
        } else {
          /*
          | No queda otro vehículo para
          | controlar en esta visita.
          */

          tarea.estadoTarea =
            "FINALIZADA";

          tarea.fechaFinalizacion =
            new Date();
        }

        await tarea.save({
          transaction,
        });
      }

      /*
      |--------------------------------------------------------------------------
      | HISTORIAL - INVENTARIO
      |--------------------------------------------------------------------------
      */

      await registrarHistorial({
        reclamoId:
          reclamo.id,

        usuarioId:
          req.usuario.id,

        accion:
          "INVENTARIO_VEHICULO",

        descripcion:
          `Inventario realizado antes de retirar el vehículo N.º ${vehiculo.numeroInterno || vehiculo.id}`,

        estadoAnterior:
          reclamo.estado,

        estadoNuevo:
          reclamo.estado,

        transaction,
      });

      /*
      |--------------------------------------------------------------------------
      | HISTORIAL - REMOCIÓN
      |--------------------------------------------------------------------------
      */

      await registrarHistorial({
        reclamoId:
          reclamo.id,

        usuarioId:
          req.usuario.id,

        accion:
          "REMOCION_VEHICULO",

        descripcion:
          porGrua
            ? `Vehículo N.º ${vehiculo.numeroInterno || vehiculo.id} retirado por grúa y trasladado a ${predioDestino.nombre}`
            : `Vehículo N.º ${vehiculo.numeroInterno || vehiculo.id} retirado y trasladado a ${predioDestino.nombre}`,

        estadoAnterior:
          reclamo.estado,

        estadoNuevo:
          reclamo.estado,

        transaction,
      });

      /*
      |--------------------------------------------------------------------------
      | CONFIRMAR
      |--------------------------------------------------------------------------
      */

      await transaction.commit();

      /*
      |--------------------------------------------------------------------------
      | RESPUESTA AL FRONTEND
      |--------------------------------------------------------------------------
      */

      return res.status(201).json({
        ok: true,

        mensaje:
          estadoPostRemocion
            .hayOtroParaControlarAhora
            ? "Remoción registrada. Todavía queda otro vehículo para controlar en este reclamo."
            : "Inventario y remoción registrados. El vehículo quedó pendiente de ingreso al predio.",

        inventario,
        remocion,
        vehiculo,

        etapaActual:
          reclamo.etapaActual,

        /*
        | Estos datos permiten que
        | RemocionVehiculoPage decida
        | correctamente dónde continuar.
        */

        hayOtroParaControlarAhora:
          estadoPostRemocion
            .hayOtroParaControlarAhora,

        hayOtroEsperandoPlazo:
          estadoPostRemocion
            .hayOtroEsperandoPlazo,

        continuarSegundaVisita:
          estadoPostRemocion
            .hayOtroParaControlarAhora ===
          true,

        tareaFinalizada:
          !estadoPostRemocion
            .hayOtroParaControlarAhora,
      });
    } catch (error) {
      console.error(
        "ERROR ORIGINAL registrarRemocionCompleta:",
        error
      );

      if (
        !transaction.finished
      ) {
        try {
          await transaction.rollback();
        } catch (
          rollbackError
        ) {
          console.error(
            "ERROR SECUNDARIO haciendo rollback:",
            rollbackError.message
          );
        }
      }

      return res.status(500).json({
        ok: false,

        mensaje:
          "Error registrando inventario y remoción",

        error:
          error.message,
      });
    }
  };

module.exports = {
  obtenerContextoRemocion,

  registrarInfraccion,
  registrarInventario,
  registrarRemocion,

  registrarRemocionCompleta,
};