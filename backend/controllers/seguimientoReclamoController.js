const {
  Reclamo,
  Constatacion,
  Acta,
  Emplazamiento,
  Verificacion,
  Infraccion,
  Asignacion,
  Usuario,

  Vehiculo,
  Remocion,
  InventarioVehiculo,
  IngresoPredio,
  EgresoPredio,
  Predio,
} = require("../models");


const obtenerSeguimientoReclamo =
  async (req, res) => {
    try {
      const reclamoId =
        Number(req.params.id);


      if (!reclamoId) {
        return res.status(400).json({
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
          mensaje:
            "Reclamo no encontrado",
        });
      }


      /*
      |--------------------------------------------------------------------------
      | ASIGNACIONES
      |--------------------------------------------------------------------------
      */

      const asignaciones =
        await Asignacion.findAll({
          where: {
            reclamoId,
          },

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


      /*
      |--------------------------------------------------------------------------
      | SEGURIDAD
      |--------------------------------------------------------------------------
      */

      const rol =
        req.usuario.rol;

      const usuarioId =
        Number(
          req.usuario.id
        );


      if (
        rol ===
        "inspector"
      ) {
        const estuvoAsignado =
          asignaciones.some(
            (item) =>
              item.tipo ===
                "INSPECTOR" &&
              Number(
                item.asignadoAId
              ) === usuarioId
          );


        const esInspectorActual =
          Number(
            reclamo.inspectorId
          ) === usuarioId;


        if (
          !estuvoAsignado &&
          !esInspectorActual
        ) {
          return res
            .status(403)
            .json({
              mensaje:
                "No tenés acceso a este reclamo",
            });
        }
      }


      if (
        rol ===
        "jefe_guardia"
      ) {
        const estuvoAsignado =
          asignaciones.some(
            (item) =>
              item.tipo ===
                "JEFE_GUARDIA" &&
              Number(
                item.asignadoAId
              ) === usuarioId
          );


      const esJefeActual =
  Number(
    reclamo.jefeGuardiaId
  ) === usuarioId;

const esControlDisponible =
  reclamo.etapaActual ===
  "PENDIENTE_SEGUNDA_VISITA";


if (
  !estuvoAsignado &&
  !esJefeActual &&
  !esControlDisponible
) {
  return res
    .status(403)
    .json({
      mensaje:
        "Este reclamo no pertenece a tu guardia",
    });
}
      }


      /*
      |--------------------------------------------------------------------------
      | PRIMERAS VISITAS
      |--------------------------------------------------------------------------
      */

      const constataciones =
        await Constatacion.findAll({
          where: {
            reclamoId,
          },

          order: [
            [
              "fechaHora",
              "ASC",
            ],
            [
              "id",
              "ASC",
            ],
          ],
        });


      /*
      |--------------------------------------------------------------------------
      | ACTAS DE VÍA PÚBLICA
      |--------------------------------------------------------------------------
      */

      const actas =
        await Acta.findAll({
          where: {
            reclamoId,
          },

          order: [
            [
              "fechaHora",
              "ASC",
            ],
            [
              "id",
              "ASC",
            ],
          ],
        });


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
            [
              "fechaHora",
              "ASC",
            ],
            [
              "id",
              "ASC",
            ],
          ],
        });


      /*
      |--------------------------------------------------------------------------
      | CONTROLES POSTERIORES
      |--------------------------------------------------------------------------
      */

      const verificaciones =
        await Verificacion.findAll({
          where: {
            reclamoId,
          },

          order: [
            [
              "fechaHora",
              "ASC",
            ],
            [
              "id",
              "ASC",
            ],
          ],
        });


      /*
      |--------------------------------------------------------------------------
      | INFRACCIONES + JUZGADO
      |--------------------------------------------------------------------------
      */

      const infracciones =
        await Infraccion.findAll({
          where: {
            reclamoId,
          },

          order: [
            [
              "fechaHora",
              "ASC",
            ],
            [
              "id",
              "ASC",
            ],
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
            [
              "id",
              "ASC",
            ],
          ],
        });


      /*
      |--------------------------------------------------------------------------
      | REMOCIONES
      |--------------------------------------------------------------------------
      */

      const remociones =
        await Remocion.findAll({
          where: {
            reclamoId,
          },

          order: [
            [
              "fechaHora",
              "ASC",
            ],
            [
              "id",
              "ASC",
            ],
          ],
        });



        /*
|--------------------------------------------------------------------------
| INVENTARIOS DE VEHÍCULOS
|--------------------------------------------------------------------------
|
| Inventario realizado al momento de retirar el vehículo.
| Acá queda guardado cómo estaba el auto:
| presente, faltante, dañado, etc.
|
*/

const inventarios =
  await InventarioVehiculo.findAll({
    where: {
      reclamoId,
    },

    order: [
      [
        "fechaHora",
        "ASC",
      ],
      [
        "id",
        "ASC",
      ],
    ],
  });
      /*
      |--------------------------------------------------------------------------
      | INGRESOS AL PREDIO
      |--------------------------------------------------------------------------
      */

      const ingresosPredio =
        await IngresoPredio.findAll({
          where: {
            reclamoId,
          },

          order: [
            [
              "fechaHora",
              "ASC",
            ],
            [
              "id",
              "ASC",
            ],
          ],
        });


      /*
      |--------------------------------------------------------------------------
      | EGRESOS DEL PREDIO
      |--------------------------------------------------------------------------
      */

      const egresosPredio =
        await EgresoPredio.findAll({
          where: {
            reclamoId,
          },

          order: [
            [
              "fechaHora",
              "ASC",
            ],
            [
              "id",
              "ASC",
            ],
          ],
        });


      /*
      |--------------------------------------------------------------------------
      | PREDIOS INVOLUCRADOS
      |--------------------------------------------------------------------------
      */

      const predioIds =
  [
    ...new Set([
      ...ingresosPredio
        .map(
          (item) =>
            Number(
              item.predioId
            )
        )
        .filter(Boolean),

      ...remociones
        .map(
          (item) =>
            Number(
              item.predioDestinoId
            )
        )
        .filter(Boolean),

      ...egresosPredio
        .map(
          (item) =>
            Number(
              item.predioDestinoId
            )
        )
        .filter(Boolean),
    ]),
  ];


      let predios = [];


      if (
        predioIds.length
      ) {
        predios =
          await Predio.findAll({
            where: {
              id:
                predioIds,
            },
          });
      }


      const mapaPredios =
        {};


      for (
        const predio of predios
      ) {
        mapaPredios[
          Number(
            predio.id
          )
        ] =
          predio.toJSON();
      }


      /*
      |--------------------------------------------------------------------------
      | USUARIOS QUE PARTICIPARON
      |--------------------------------------------------------------------------
      */

      const usuarioIds =
        new Set();


      for (
        const item of
        constataciones
      ) {
        if (
          item.inspectorId
        ) {
          usuarioIds.add(
            Number(
              item.inspectorId
            )
          );
        }
      }


      for (
        const item of
        verificaciones
      ) {
        if (
          item.inspectorId
        ) {
          usuarioIds.add(
            Number(
              item.inspectorId
            )
          );
        }
      }


      for (
        const item of
        infracciones
      ) {
        if (
          item.inspectorId
        ) {
          usuarioIds.add(
            Number(
              item.inspectorId
            )
          );
        }


        if (
          item.enviadoJuzgadoPorId
        ) {
          usuarioIds.add(
            Number(
              item.enviadoJuzgadoPorId
            )
          );
        }


        if (
          item
            .respuestaJuzgadoRegistradaPorId
        ) {
          usuarioIds.add(
            Number(
              item
                .respuestaJuzgadoRegistradaPorId
            )
          );
        }

        /*
|--------------------------------------------------------------------------
| ORDEN JUDICIAL DE REMOCIÓN
|--------------------------------------------------------------------------
*/

if (
  item
    .ordenRemocionSolicitadaPorId
) {
  usuarioIds.add(
    Number(
      item
        .ordenRemocionSolicitadaPorId
    )
  );
}

if (
  item
    .respuestaOrdenRemocionPorId
) {
  usuarioIds.add(
    Number(
      item
        .respuestaOrdenRemocionPorId
    )
  );
}
      }


      /*
      | Inspectores que hicieron remoción
      */

      for (
        const item of
        remociones
      ) {
        if (
          item.inspectorId
        ) {
          usuarioIds.add(
            Number(
              item.inspectorId
            )
          );
        }
      }

/*
| Inspectores que realizaron
| inventarios de vehículos
*/

for (
  const item of
  inventarios
) {
  if (
    item.inspectorId
  ) {
    usuarioIds.add(
      Number(
        item.inspectorId
      )
    );
  }
}
      /*
      | Secretaría / persona que
      | registró ingreso al predio
      */

      for (
        const item of
        ingresosPredio
      ) {
        if (
          item.registradoPorId
        ) {
          usuarioIds.add(
            Number(
              item.registradoPorId
            )
          );
        }
      }


      /*
      | Persona que registró egreso
      */

      for (
        const item of
        egresosPredio
      ) {
        if (
          item.registradoPorId
        ) {
          usuarioIds.add(
            Number(
              item.registradoPorId
            )
          );
        }
      }


      for (
        const item of
        asignaciones
      ) {
        if (
          item.asignadoAId
        ) {
          usuarioIds.add(
            Number(
              item.asignadoAId
            )
          );
        }


        if (
          item.asignadoPorId
        ) {
          usuarioIds.add(
            Number(
              item.asignadoPorId
            )
          );
        }
      }


      if (
        reclamo.jefeGuardiaId
      ) {
        usuarioIds.add(
          Number(
            reclamo.jefeGuardiaId
          )
        );
      }


      if (
        reclamo.inspectorId
      ) {
        usuarioIds.add(
          Number(
            reclamo.inspectorId
          )
        );
      }


      if (
        reclamo.creadoPorId
      ) {
        usuarioIds.add(
          Number(
            reclamo.creadoPorId
          )
        );
      }


      if (
        reclamo.cerradoExternoPorId
      ) {
        usuarioIds.add(
          Number(
            reclamo
              .cerradoExternoPorId
          )
        );
      }


      const ids =
        Array.from(
          usuarioIds
        ).filter(Boolean);


      let usuarios =
        [];


      if (
        ids.length
      ) {
        usuarios =
          await Usuario.findAll({
            where: {
              id:
                ids,
            },

            attributes: [
              "id",
              "nombre",
              "usuario",
            ],
          });
      }


      /*
      |--------------------------------------------------------------------------
      | MAPA USUARIOS
      |--------------------------------------------------------------------------
      */

      const mapaUsuarios =
        {};


      for (
        const usuario of
        usuarios
      ) {
        mapaUsuarios[
          Number(
            usuario.id
          )
        ] = {
          id:
            usuario.id,

          nombre:
            usuario.nombre,

          usuario:
            usuario.usuario,
        };
      }


      const usuarioDe =
        (id) => {
          if (!id) {
            return null;
          }


          return (
            mapaUsuarios[
              Number(id)
            ] ||
            null
          );
        };


      /*
      |--------------------------------------------------------------------------
      | VISITAS
      |--------------------------------------------------------------------------
      */

      const visitas =
        constataciones.map(
          (item) => ({
            ...item.toJSON(),

            inspector:
              usuarioDe(
                item.inspectorId
              ),
          })
        );


      /*
      |--------------------------------------------------------------------------
      | VERIFICACIONES
      |--------------------------------------------------------------------------
      */

      const segundasVisitas =
        verificaciones.map(
          (item) => ({
            ...item.toJSON(),

            inspector:
              usuarioDe(
                item.inspectorId
              ),
          })
        );


      /*
      |--------------------------------------------------------------------------
      | INFRACCIONES
      |--------------------------------------------------------------------------
      */

      const infraccionesFinal =
        infracciones.map(
          (item) => ({
            ...item.toJSON(),

            inspector:
              usuarioDe(
                item.inspectorId
              ),

            enviadoJuzgadoPor:
              usuarioDe(
                item
                  .enviadoJuzgadoPorId
              ),

            respuestaJuzgadoRegistradaPor:
              usuarioDe(
                item
                  .respuestaJuzgadoRegistradaPorId
              ),
              ordenRemocionSolicitadaPor:
  usuarioDe(
    item
      .ordenRemocionSolicitadaPorId
  ),

respuestaOrdenRemocionPor:
  usuarioDe(
    item
      .respuestaOrdenRemocionPorId
  ),
          })
        );


      /*
      |--------------------------------------------------------------------------
      | ASIGNACIONES
      |--------------------------------------------------------------------------
      */

      const asignacionesFinal =
        asignaciones.map(
          (item) => ({
            ...item.toJSON(),

            asignadoA:
              usuarioDe(
                item.asignadoAId
              ),

            asignadoPor:
              usuarioDe(
                item.asignadoPorId
              ),
          })
        );

/*
|--------------------------------------------------------------------------
| INVENTARIOS ENRIQUECIDOS
|--------------------------------------------------------------------------
*/

const inventariosFinal =
  inventarios.map(
    (item) => {
      const datos =
        item.toJSON();

      const vehiculo =
        vehiculos.find(
          (vehiculoItem) =>
            Number(
              vehiculoItem.id
            ) ===
            Number(
              item.vehiculoId
            )
        );

      return {
        ...datos,

        inspector:
          usuarioDe(
            item.inspectorId
          ),

        vehiculo:
          vehiculo
            ? vehiculo.toJSON()
            : null,
      };
    }
  );
      /*
      |--------------------------------------------------------------------------
      | REMOCIONES ENRIQUECIDAS
      |--------------------------------------------------------------------------
      */

    const remocionesFinal =
  remociones.map(
    (item) => {
      const datos =
        item.toJSON();

      const vehiculo =
        vehiculos.find(
          (vehiculoItem) =>
            Number(
              vehiculoItem.id
            ) ===
            Number(
              item.vehiculoId
            )
        );

      const inventario =
        inventariosFinal.find(
          (inventarioItem) =>
            Number(
              inventarioItem.id
            ) ===
            Number(
              item.inventarioId
            )
        );

      return {
        ...datos,

        inspector:
          usuarioDe(
            item.inspectorId
          ),

        vehiculo:
          vehiculo
            ? vehiculo.toJSON()
            : null,

        inventario:
          inventario ||
          null,
          predioDestino:
  mapaPredios[
    Number(
      item.predioDestinoId
    )
  ] ||
  null,
      };
    }
  );

      /*
      |--------------------------------------------------------------------------
      | INGRESOS PREDIO ENRIQUECIDOS
      |--------------------------------------------------------------------------
      */

      const ingresosPredioFinal =
        ingresosPredio.map(
          (item) => ({
            ...item.toJSON(),

            predio:
              mapaPredios[
                Number(
                  item.predioId
                )
              ] ||
              null,

            registradoPor:
              usuarioDe(
                item.registradoPorId
              ),

            vehiculo:
              vehiculos
                .find(
                  (vehiculo) =>
                    Number(
                      vehiculo.id
                    ) ===
                    Number(
                      item.vehiculoId
                    )
                )
                ?.toJSON() ||
              null,
          })
        );


      /*
      |--------------------------------------------------------------------------
      | EGRESOS PREDIO ENRIQUECIDOS
      |--------------------------------------------------------------------------
      */
const egresosPredioFinal =
  egresosPredio.map(
    (item) => ({
      ...item.toJSON(),

      predioDestino:
        mapaPredios[
          Number(
            item.predioDestinoId
          )
        ] ||
        null,

      registradoPor:
        usuarioDe(
          item.registradoPorId
        ),

      vehiculo:
        vehiculos
          .find(
            (vehiculo) =>
              Number(
                vehiculo.id
              ) ===
              Number(
                item.vehiculoId
              )
          )
          ?.toJSON() ||
        null,
    })
  );


      /*
      |--------------------------------------------------------------------------
      | RESPONSABLES ACTUALES
      |--------------------------------------------------------------------------
      */

      const responsables = {
        jefeGuardia:
          usuarioDe(
            reclamo.jefeGuardiaId
          ),

        inspector:
          usuarioDe(
            reclamo.inspectorId
          ),

        creadoPor:
          usuarioDe(
            reclamo.creadoPorId
          ),

        cerradoExternoPor:
          usuarioDe(
            reclamo
              .cerradoExternoPorId
          ),
      };


      /*
      |--------------------------------------------------------------------------
      | RESPUESTA
      |--------------------------------------------------------------------------
      */

      return res.json({
        ok: true,

        reclamoId,

        responsables,

        visitas,

        actas:
          actas.map(
            (item) =>
              item.toJSON()
          ),

        emplazamientos:
          emplazamientos.map(
            (item) =>
              item.toJSON()
          ),

        verificaciones:
          segundasVisitas,

        infracciones:
          infraccionesFinal,

        asignaciones:
          asignacionesFinal,

        /*
        |--------------------------------------------------------------------------
        | TODO EL CIRCUITO DEL VEHÍCULO
        |--------------------------------------------------------------------------
        */

       vehiculos:
  vehiculos.map(
    (item) =>
      item.toJSON()
  ),

inventarios:
  inventariosFinal,

remociones:
  remocionesFinal,

ingresosPredio:
  ingresosPredioFinal,

egresosPredio:
  egresosPredioFinal,
      });
    } catch (error) {
      console.error(
        "Error obteniendo seguimiento:",
        error
      );


      return res
        .status(500)
        .json({
          mensaje:
            "Error al obtener el seguimiento del reclamo",

          error:
            process.env
              .NODE_ENV ===
            "development"
              ? error.message
              : undefined,
        });
    }
  };


module.exports = {
  obtenerSeguimientoReclamo,
};