const { Op } = require("sequelize");

const {
  Infraccion,
  Reclamo,
  TipoReclamo,
  Acta,
  Emplazamiento,
  Verificacion,
  Vehiculo,
} = require("../models");

const listarJuzgado = async (
  req,
  res
) => {
  try {
    /*
    |--------------------------------------------------------------------------
    | INFRACCIONES
    |--------------------------------------------------------------------------
    */

    const infracciones =
      await Infraccion.findAll({
        where: {
          anulada: {
            [Op.not]: true,
          },
        },

        order: [
          ["createdAt", "DESC"],
        ],
      });

    if (!infracciones.length) {
      return res.json({
        ok: true,

        paraEnviar: [],
        enviadas: [],

        ordenesPendientesSolicitud:
          [],

        ordenesEsperandoRespuesta:
          [],

        ordenesRespondidas:
          [],

        total: 0,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | RECLAMOS
    |--------------------------------------------------------------------------
    */

    const reclamoIds = [
      ...new Set(
        infracciones
          .map(
            (item) =>
              item.reclamoId
          )
          .filter(Boolean)
      ),
    ];

    const reclamos =
      await Reclamo.findAll({
        where: {
          id: {
            [Op.in]:
              reclamoIds,
          },
        },
      });

    /*
    |--------------------------------------------------------------------------
    | TIPOS DE RECLAMO
    |--------------------------------------------------------------------------
    */

    const tipoIds = [
      ...new Set(
        reclamos
          .map(
            (item) =>
              item.tipoReclamoId
          )
          .filter(Boolean)
      ),
    ];

    const tipos =
      tipoIds.length
        ? await TipoReclamo.findAll({
            where: {
              id: {
                [Op.in]:
                  tipoIds,
              },
            },
          })
        : [];

    /*
    |--------------------------------------------------------------------------
    | VEHÍCULOS
    |--------------------------------------------------------------------------
    |
    | SISTEMA NUEVO
    |
    | Cada infracción puede tener su vehiculoId.
    | Esto permite distinguir correctamente varios vehículos
    | dentro del mismo reclamo.
    |
    | Los registros históricos pueden tener vehiculoId null.
    | En esos casos NO forzamos ninguna relación.
    |
    */

    const vehiculoIds = [
      ...new Set(
        infracciones
          .map(
            (item) =>
              item.vehiculoId
          )
          .filter(Boolean)
      ),
    ];

    const vehiculos =
      vehiculoIds.length
        ? await Vehiculo.findAll({
            where: {
              id: {
                [Op.in]:
                  vehiculoIds,
              },
            },

            attributes: [
              "id",
              "reclamoId",
              "numeroInterno",
              "dominio",
              "marca",
              "modelo",
              "color",
              "estadoActual",
            ],
          })
        : [];

    /*
    |--------------------------------------------------------------------------
    | ACTAS DE VÍA PÚBLICA
    |--------------------------------------------------------------------------
    |
    | COMPATIBILIDAD SISTEMA ANTERIOR
    |
    | Se mantiene la búsqueda por reclamo porque existen
    | expedientes históricos que pueden no tener vehiculoId
    | o relaciones nuevas completas.
    |
    */

    const actasViaPublica =
      await Acta.findAll({
        where: {
          reclamoId: {
            [Op.in]:
              reclamoIds,
          },

          tipo: "VIA_PUBLICA",

          [Op.or]: [
            {
              anulada: false,
            },
            {
              anulada: null,
            },
          ],
        },

        order: [
          ["fechaHora", "DESC"],
          ["id", "DESC"],
        ],
      });

    /*
    |--------------------------------------------------------------------------
    | EMPLAZAMIENTOS
    |--------------------------------------------------------------------------
    |
    | Se cargan todos juntos.
    |
    | Después vamos a tener:
    |
    | - contexto viejo por reclamo
    | - contexto nuevo exacto por ID
    |
    */

    const emplazamientos =
      await Emplazamiento.findAll({
        where: {
          reclamoId: {
            [Op.in]:
              reclamoIds,
          },
        },

        order: [
          ["createdAt", "DESC"],
          ["id", "DESC"],
        ],
      });

    /*
    |--------------------------------------------------------------------------
    | SEGUNDAS VISITAS / VERIFICACIONES
    |--------------------------------------------------------------------------
    |
    | La infracción nueva tiene verificacionId.
    |
    | Desde esa verificación podemos conocer exactamente
    | qué emplazamiento originó esa infracción.
    |
    */

    const verificaciones =
      await Verificacion.findAll({
        where: {
          reclamoId: {
            [Op.in]:
              reclamoIds,
          },
        },

        order: [
          ["fechaHora", "DESC"],
          ["createdAt", "DESC"],
          ["id", "DESC"],
        ],
      });

    /*
    |--------------------------------------------------------------------------
    | MAPA DE TIPOS
    |--------------------------------------------------------------------------
    */

    const tiposPorId =
      new Map(
        tipos.map(
          (tipo) => [
            Number(tipo.id),
            tipo.toJSON(),
          ]
        )
      );

    /*
    |--------------------------------------------------------------------------
    | MAPA DE VEHÍCULOS POR ID
    |--------------------------------------------------------------------------
    |
    | SISTEMA NUEVO
    |
    */

    const vehiculosPorId =
      new Map(
        vehiculos.map(
          (vehiculo) => [
            Number(
              vehiculo.id
            ),
            vehiculo.toJSON(),
          ]
        )
      );

    /*
    |--------------------------------------------------------------------------
    | MAPA DE EMPLAZAMIENTOS POR ID
    |--------------------------------------------------------------------------
    |
    | SISTEMA NUEVO
    |
    */

    const emplazamientosPorId =
      new Map(
        emplazamientos.map(
          (emplazamiento) => [
            Number(
              emplazamiento.id
            ),
            emplazamiento.toJSON(),
          ]
        )
      );

    /*
    |--------------------------------------------------------------------------
    | MAPA DE VERIFICACIONES POR ID
    |--------------------------------------------------------------------------
    |
    | SISTEMA NUEVO
    |
    */

    const verificacionesPorId =
      new Map(
        verificaciones.map(
          (verificacion) => [
            Number(
              verificacion.id
            ),
            verificacion.toJSON(),
          ]
        )
      );

    /*
    |--------------------------------------------------------------------------
    | MAPA ACTA VÍA PÚBLICA POR RECLAMO
    |--------------------------------------------------------------------------
    |
    | COMPATIBILIDAD SISTEMA ANTERIOR
    |
    | Como vienen ordenadas de más reciente a más antigua,
    | conservamos la primera.
    |
    */

    const actaViaPublicaPorReclamo =
      new Map();

    for (
      const acta of
      actasViaPublica
    ) {
      const reclamoId =
        Number(
          acta.reclamoId
        );

      if (
        !actaViaPublicaPorReclamo.has(
          reclamoId
        )
      ) {
        actaViaPublicaPorReclamo.set(
          reclamoId,
          acta.toJSON()
        );
      }
    }

    /*
    |--------------------------------------------------------------------------
    | MAPA EMPLAZAMIENTO POR RECLAMO
    |--------------------------------------------------------------------------
    |
    | COMPATIBILIDAD SISTEMA ANTERIOR
    |
    */

    const emplazamientoPorReclamo =
      new Map();

    for (
      const emplazamiento of
      emplazamientos
    ) {
      const reclamoId =
        Number(
          emplazamiento.reclamoId
        );

      if (
        !emplazamientoPorReclamo.has(
          reclamoId
        )
      ) {
        emplazamientoPorReclamo.set(
          reclamoId,
          emplazamiento.toJSON()
        );
      }
    }

    /*
    |--------------------------------------------------------------------------
    | MAPA VERIFICACIÓN POR RECLAMO
    |--------------------------------------------------------------------------
    |
    | COMPATIBILIDAD SISTEMA ANTERIOR
    |
    */

    const verificacionPorReclamo =
      new Map();

    for (
      const verificacion of
      verificaciones
    ) {
      const reclamoId =
        Number(
          verificacion.reclamoId
        );

      if (
        !verificacionPorReclamo.has(
          reclamoId
        )
      ) {
        verificacionPorReclamo.set(
          reclamoId,
          verificacion.toJSON()
        );
      }
    }

    /*
    |--------------------------------------------------------------------------
    | RECLAMOS
    |--------------------------------------------------------------------------
    |
    | Se mantiene exactamente el contexto anterior.
    |
    | Esto es importante para expedientes históricos.
    |
    */

    const reclamosPorId =
      new Map();

    for (
      const reclamo of
      reclamos
    ) {
      const plano =
        reclamo.toJSON();

      plano.tipoReclamo =
        tiposPorId.get(
          Number(
            reclamo.tipoReclamoId
          )
        ) || null;

      /*
      |----------------------------------------------------------------------
      | COMPATIBILIDAD SISTEMA ANTERIOR
      |----------------------------------------------------------------------
      */

      plano.actaViaPublica =
        actaViaPublicaPorReclamo.get(
          Number(
            reclamo.id
          )
        ) || null;

      plano.emplazamiento =
        emplazamientoPorReclamo.get(
          Number(
            reclamo.id
          )
        ) || null;

      plano.verificacion =
        verificacionPorReclamo.get(
          Number(
            reclamo.id
          )
        ) || null;

      reclamosPorId.set(
        Number(
          reclamo.id
        ),
        plano
      );
    }

    /*
    |--------------------------------------------------------------------------
    | LISTA FINAL
    |--------------------------------------------------------------------------
    |
    | Acá independizamos definitivamente las actuaciones.
    |
    | SISTEMA NUEVO:
    |
    | Infracción
    |    ↓ vehiculoId
    | Vehículo exacto
    |
    | Infracción
    |    ↓ verificacionId
    | Verificación exacta
    |    ↓ emplazamientoId
    | Emplazamiento exacto
    |
    |
    | SISTEMA VIEJO:
    |
    | Si esos IDs no existen, los campos exactos quedan null.
    | El objeto reclamo sigue conservando:
    |
    | reclamo.actaViaPublica
    | reclamo.emplazamiento
    | reclamo.verificacion
    |
    */

    const lista =
      infracciones.map(
        (infraccion) => {
          const plano =
            infraccion.toJSON();

          /*
          |------------------------------------------------------------------
          | VEHÍCULO EXACTO
          |------------------------------------------------------------------
          */

          const vehiculo =
            plano.vehiculoId
              ? vehiculosPorId.get(
                  Number(
                    plano.vehiculoId
                  )
                ) || null
              : null;

          /*
          |------------------------------------------------------------------
          | VERIFICACIÓN EXACTA
          |------------------------------------------------------------------
          */

          const verificacion =
            plano.verificacionId
              ? verificacionesPorId.get(
                  Number(
                    plano.verificacionId
                  )
                ) || null
              : null;

          /*
          |------------------------------------------------------------------
          | EMPLAZAMIENTO EXACTO
          |------------------------------------------------------------------
          |
          | La verificación es la que conoce el emplazamiento
          | sobre el cual se realizó el control.
          |
          */

          const emplazamientoId =
            verificacion
              ?.emplazamientoId ||
            null;

          const emplazamiento =
            emplazamientoId
              ? emplazamientosPorId.get(
                  Number(
                    emplazamientoId
                  )
                ) || null
              : null;

          return {
            ...plano,

            /*
            |--------------------------------------------------------------
            | RELACIONES EXACTAS - SISTEMA NUEVO
            |--------------------------------------------------------------
            */

            vehiculo,

            verificacion,

            emplazamiento,

            /*
            |--------------------------------------------------------------
            | RECLAMO - COMPATIBILIDAD
            |--------------------------------------------------------------
            */

            reclamo:
              reclamosPorId.get(
                Number(
                  plano.reclamoId
                )
              ) || null,
          };
        }
      );

    /*
    |--------------------------------------------------------------------------
    | MULTAS / ACTAS DE INFRACCIÓN
    |--------------------------------------------------------------------------
    */

    const paraEnviar =
      lista.filter(
        (item) =>
          item.estadoJuzgado ===
          "PENDIENTE_ENVIO"
      );

    const enviadas =
      lista.filter(
        (item) =>
          item.estadoJuzgado ===
          "ENVIADO"
      );

    /*
    |--------------------------------------------------------------------------
    | ÓRDENES JUDICIALES DE REMOCIÓN
    |--------------------------------------------------------------------------
    |
    | Esto continúa siendo independiente del envío normal
    | del Acta de Infracción / multa.
    |
    | Cada elemento sigue siendo UNA infracción concreta.
    |
    */

    const ordenesPendientesSolicitud =
      lista.filter(
        (item) =>
          item.requiereOrdenRemocion ===
            true &&
          item.estadoOrdenRemocion ===
            "PENDIENTE_SOLICITUD"
      );

    const ordenesEsperandoRespuesta =
      lista.filter(
        (item) =>
          item.requiereOrdenRemocion ===
            true &&
          item.estadoOrdenRemocion ===
            "ESPERANDO_RESPUESTA"
      );

    const ordenesRespondidas =
      lista.filter(
        (item) =>
          item.requiereOrdenRemocion ===
            true &&
          [
            "AUTORIZADA",
            "NO_AUTORIZADA",
          ].includes(
            item.estadoOrdenRemocion
          )
      );

    /*
    |--------------------------------------------------------------------------
    | RESPUESTA
    |--------------------------------------------------------------------------
    */

    return res.json({
      ok: true,

      // Multas
      paraEnviar,
      enviadas,

      // Órdenes judiciales
      ordenesPendientesSolicitud,
      ordenesEsperandoRespuesta,
      ordenesRespondidas,

      total:
        lista.length,
    });
  } catch (error) {
    console.error(
      "Error listando Juzgado:",
      error
    );

    return res.status(500).json({
      ok: false,

      mensaje:
        "No se pudo cargar la bandeja del Juzgado.",
    });
  }
};

module.exports = {
  listarJuzgado,
};