const { Op } = require("sequelize");

const {
  Infraccion,
  Reclamo,
  TipoReclamo,
  Acta,
  Emplazamiento,
  Verificacion,
} = require("../models");

const listarJuzgado = async (
  req,
  res
) => {
  try {
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

  ordenesPendientesSolicitud: [],
  ordenesEsperandoRespuesta: [],
  ordenesRespondidas: [],

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
    | ACTAS DE VÍA PÚBLICA
    |--------------------------------------------------------------------------
    |
    | Buscamos las actas anteriores de cada reclamo.
    | Solo nos interesa tipo VIA_PUBLICA.
    |
    */

const actasViaPublica =
  await Acta.findAll({
    where: {
      reclamoId: {
        [Op.in]: reclamoIds,
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
        ],
      });

    /*
    |--------------------------------------------------------------------------
    | SEGUNDAS VISITAS / VERIFICACIONES
    |--------------------------------------------------------------------------
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
        ],
      });

    /*
    |--------------------------------------------------------------------------
    | MAPAS AUXILIARES
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
        Number(reclamo.id),
        plano
      );
    }

    /*
    |--------------------------------------------------------------------------
    | LISTA FINAL
    |--------------------------------------------------------------------------
    */

    const lista =
      infracciones.map(
        (infraccion) => {
          const plano =
            infraccion.toJSON();

          return {
            ...plano,

            reclamo:
              reclamosPorId.get(
                Number(
                  infraccion.reclamoId
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
| Esto es independiente del envío de la multa.
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

 return res.json({
  ok: true,

  // Multas
  paraEnviar,
  enviadas,

  // Órdenes judiciales para remoción
  ordenesPendientesSolicitud,
  ordenesEsperandoRespuesta,
  ordenesRespondidas,

  total: lista.length,
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