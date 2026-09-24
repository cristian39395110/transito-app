const {
  Op,
  QueryTypes,
} = require("sequelize");
const {
  sequelize,
  Reclamo,
  TipoReclamo,
  Vehiculo,
  Acta,
  Emplazamiento,
  Infraccion,
  Predio,
  IngresoPredio,
  EgresoPredio,
  Constatacion,
  Verificacion,
} = require("../models");

/*
|--------------------------------------------------------------------------
| CONFIGURACIÓN
|--------------------------------------------------------------------------
*/

const LIMITE_POR_PAGINA = 10;

const LIMITE_MAXIMO = 10;

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const textoSeguro = (
  valor
) =>
  String(
    valor ?? ""
  ).trim();

const numeroSeguro = (
  valor,
  defecto = 1
) => {
  const numero =
    Number(valor);

  if (
    !Number.isInteger(
      numero
    ) ||
    numero < 1
  ) {
    return defecto;
  }

  return numero;
};

const contieneTexto = (
  valor,
  buscar
) =>
  textoSeguro(valor)
    .toLowerCase()
    .includes(
      textoSeguro(
        buscar
      ).toLowerCase()
    );

const agregarCoincidencia = (
  mapa,
  reclamoId,
  coincidencia
) => {
  const id =
    Number(
      reclamoId
    );

  if (!id) {
    return;
  }

  if (!mapa.has(id)) {
    mapa.set(
      id,
      []
    );
  }

  const lista =
    mapa.get(id);

  const existe =
    lista.some(
      (item) =>
        item.tipo ===
          coincidencia.tipo &&
        String(
          item.valor
        ) ===
          String(
            coincidencia.valor
          )
    );

  if (!existe) {
    lista.push(
      coincidencia
    );
  }
};

/*
|--------------------------------------------------------------------------
| CONSULTA DE IDS
|--------------------------------------------------------------------------
|
| IMPORTANTE:
|
| Esta consulta NO trae toda la base.
|
| MySQL busca en las tablas y devuelve
| solamente los IDs de los reclamos
| correspondientes a la página pedida.
|
| Ejemplo:
|
| página 1 = 10
| página 2 = otros 10
| página 3 = otros 10
|
*/

const buscarIdsExpedientes =
  async ({
    buscar,
    limit,
    offset,
  }) => {
    const tieneBusqueda =
      Boolean(buscar);

    /*
    |--------------------------------------------------------------------------
    | SIN BÚSQUEDA
    |--------------------------------------------------------------------------
    |
    | Mostramos los últimos expedientes.
    |
    */

    if (!tieneBusqueda) {
      const total =
        await Reclamo.count();

      const filas =
        await Reclamo.findAll({
          attributes: [
            "id",
          ],

          order: [
            [
              "updatedAt",
              "DESC",
            ],
          ],

          limit,

          offset,
        });

      return {
        total,

        ids:
          filas.map(
            (fila) =>
              Number(
                fila.id
              )
          ),
      };
    }

    /*
    |--------------------------------------------------------------------------
    | BÚSQUEDA UNIVERSAL
    |--------------------------------------------------------------------------
    |
    | El mismo texto se busca en:
    |
    | RECLAMOS
    | - número
    | - dirección
    | - barrio
    | - referencia
    |
    | VEHÍCULOS
    | - dominio
    | - número interno
    | - marca
    | - modelo
    | - color
    |
    | ACTAS DE VÍA PÚBLICA
    | - número de acta
    | - persona atendida
    | - lugar
    |
    | INFRACCIONES
    | - número de acta
    | - expediente Juzgado
    | - DNI
    | - nombre
    | - apellido
    | - nombre completo
    | - domicilio
    |
    | EGRESOS DEL PREDIO
    | - nombre de quien retiró el vehículo
    | - DNI de quien retiró el vehículo
    |
    */

    const patron =
      `%${buscar}%`;

    const baseSql = `
      FROM reclamos r

      WHERE

        r.numeroReclamo LIKE :patron

        OR r.direccion LIKE :patron

        OR r.barrio LIKE :patron

        OR r.referencia LIKE :patron

        OR EXISTS (
          SELECT 1
          FROM vehiculos v
          WHERE
            v.reclamoId = r.id
            AND (
              v.dominio LIKE :patron

              OR CAST(
                v.numeroInterno AS CHAR
              ) LIKE :patron

              OR v.marca LIKE :patron

              OR v.modelo LIKE :patron

              OR v.color LIKE :patron
            )
        )

        OR EXISTS (
          SELECT 1
          FROM actas a
          WHERE
            a.reclamoId = r.id
            AND (
              a.numeroActa LIKE :patron

              OR a.atendidoPor LIKE :patron

              OR a.lugar LIKE :patron
            )
        )

        OR EXISTS (
          SELECT 1
          FROM infracciones i
          WHERE
            i.reclamoId = r.id
            AND (
              i.numeroActa LIKE :patron

              OR i.numeroExpedienteJuzgado LIKE :patron

              OR i.dniInfractor LIKE :patron

              OR i.nombreInfractor LIKE :patron

              OR i.apellidoInfractor LIKE :patron

              OR CONCAT_WS(
                ' ',
                i.nombreInfractor,
                i.apellidoInfractor
              ) LIKE :patron

              OR i.domicilioInfractor LIKE :patron
            )
        )

        OR EXISTS (
          SELECT 1
          FROM egresos_predio ep
          WHERE
            ep.reclamoId = r.id

            AND ep.tipoEgreso = 'ENTREGADO'

            AND (
              ep.destinoPersona LIKE :patron

              OR ep.dniPersona LIKE :patron
            )
        )
    `;

    /*
    |--------------------------------------------------------------------------
    | TOTAL DE RESULTADOS
    |--------------------------------------------------------------------------
    */

    const resultadoTotal =
      await sequelize.query(
        `
          SELECT
            COUNT(*) AS total

          ${baseSql}
        `,
        {
          replacements: {
            patron,
          },

          type:
            QueryTypes.SELECT,
        }
      );

    const total =
      Number(
        resultadoTotal?.[0]
          ?.total || 0
      );

    /*
    |--------------------------------------------------------------------------
    | IDS DE LA PÁGINA ACTUAL
    |--------------------------------------------------------------------------
    |
    | MySQL hace la búsqueda sobre toda la base,
    | pero solamente devuelve los IDs correspondientes
    | a la página solicitada.
    |
    */

    const filas =
      await sequelize.query(
        `
          SELECT
            r.id

          ${baseSql}

          ORDER BY
            r.updatedAt DESC,
            r.id DESC

          LIMIT :limit
          OFFSET :offset
        `,
        {
          replacements: {
            patron,
            limit,
            offset,
          },

          type:
            QueryTypes.SELECT,
        }
      );

    return {
      total,

      ids:
        filas.map(
          (fila) =>
            Number(
              fila.id
            )
        ),
    };
  };

/*
|--------------------------------------------------------------------------
| BUSCAR COINCIDENCIAS
|--------------------------------------------------------------------------
|
| Solamente se ejecuta sobre los 10
| reclamos que ya fueron seleccionados.
|
| NO sobre toda la base.
|
*/

const obtenerCoincidencias =
  async (
    ids,
    buscar
  ) => {
    const mapa =
      new Map();

    if (
      !buscar ||
      !ids.length
    ) {
      return mapa;
    }

    const [
      reclamos,
      vehiculos,
      actas,
      infracciones,
      egresos,
    ] =
      await Promise.all([
        Reclamo.findAll({
          where: {
            id: {
              [Op.in]:
                ids,
            },
          },

          attributes: [
            "id",
            "numeroReclamo",
            "direccion",
            "barrio",
            "referencia",
          ],
        }),

        Vehiculo.findAll({
          where: {
            reclamoId: {
              [Op.in]:
                ids,
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
          ],
        }),

        Acta.findAll({
          where: {
            reclamoId: {
              [Op.in]:
                ids,
            },
          },

          attributes: [
            "id",
            "reclamoId",
            "numeroActa",
            "tipo",
            "atendidoPor",
            "lugar",
          ],
        }),

        Infraccion.findAll({
          where: {
            reclamoId: {
              [Op.in]:
                ids,
            },
          },

          attributes: [
            "id",
            "reclamoId",
            "numeroActa",
            "numeroExpedienteJuzgado",
            "dniInfractor",
            "nombreInfractor",
            "apellidoInfractor",
            "domicilioInfractor",
          ],
        }),

        EgresoPredio.findAll({
          where: {
            reclamoId: {
              [Op.in]:
                ids,
            },

            tipoEgreso:
              "ENTREGADO",
          },

          attributes: [
            "id",
            "reclamoId",
            "destinoPersona",
            "dniPersona",
          ],
        }),
      ]);

    /*
    |--------------------------------------------------------------------------
    | RECLAMOS
    |--------------------------------------------------------------------------
    */

    reclamos.forEach(
      (item) => {
        const reclamo =
          item.toJSON();

        if (
          contieneTexto(
            reclamo.numeroReclamo,
            buscar
          )
        ) {
          agregarCoincidencia(
            mapa,
            reclamo.id,
            {
              tipo:
                "RECLAMO",

              etiqueta:
                "N.º reclamo",

              valor:
                reclamo.numeroReclamo,
            }
          );
        }

        if (
          contieneTexto(
            reclamo.direccion,
            buscar
          )
        ) {
          agregarCoincidencia(
            mapa,
            reclamo.id,
            {
              tipo:
                "DIRECCION",

              etiqueta:
                "Dirección",

              valor:
                reclamo.direccion,
            }
          );
        }

        if (
          contieneTexto(
            reclamo.barrio,
            buscar
          )
        ) {
          agregarCoincidencia(
            mapa,
            reclamo.id,
            {
              tipo:
                "BARRIO",

              etiqueta:
                "Barrio",

              valor:
                reclamo.barrio,
            }
          );
        }

        if (
          contieneTexto(
            reclamo.referencia,
            buscar
          )
        ) {
          agregarCoincidencia(
            mapa,
            reclamo.id,
            {
              tipo:
                "REFERENCIA",

              etiqueta:
                "Referencia",

              valor:
                reclamo.referencia,
            }
          );
        }
      }
    );

    /*
    |--------------------------------------------------------------------------
    | VEHÍCULOS
    |--------------------------------------------------------------------------
    */

    vehiculos.forEach(
      (item) => {
        const vehiculo =
          item.toJSON();

        if (
          contieneTexto(
            vehiculo.dominio,
            buscar
          )
        ) {
          agregarCoincidencia(
            mapa,
            vehiculo.reclamoId,
            {
              tipo:
                "DOMINIO",

              etiqueta:
                "Dominio",

              valor:
                vehiculo.dominio,
            }
          );
        }

        if (
          contieneTexto(
            vehiculo.numeroInterno,
            buscar
          )
        ) {
          agregarCoincidencia(
            mapa,
            vehiculo.reclamoId,
            {
              tipo:
                "NUMERO_INTERNO",

              etiqueta:
                "N.º interno",

              valor:
                vehiculo.numeroInterno,
            }
          );
        }

        const descripcion =
          [
            vehiculo.marca,
            vehiculo.modelo,
            vehiculo.color,
          ]
            .filter(Boolean)
            .join(" ");

        if (
          contieneTexto(
            descripcion,
            buscar
          )
        ) {
          agregarCoincidencia(
            mapa,
            vehiculo.reclamoId,
            {
              tipo:
                "VEHICULO",

              etiqueta:
                "Vehículo",

              valor:
                descripcion,
            }
          );
        }
      }
    );

    /*
    |--------------------------------------------------------------------------
    | ACTAS DE VÍA PÚBLICA
    |--------------------------------------------------------------------------
    */

    actas.forEach(
      (item) => {
        const acta =
          item.toJSON();

        if (
          contieneTexto(
            acta.numeroActa,
            buscar
          )
        ) {
          agregarCoincidencia(
            mapa,
            acta.reclamoId,
            {
              tipo:
                "ACTA_VIA_PUBLICA",

              etiqueta:
                "Acta de Vía Pública",

              valor:
                acta.numeroActa,
            }
          );
        }

        if (
          contieneTexto(
            acta.atendidoPor,
            buscar
          )
        ) {
          agregarCoincidencia(
            mapa,
            acta.reclamoId,
            {
              tipo:
                "PERSONA_ACTA",

              etiqueta:
                "Persona",

              valor:
                acta.atendidoPor,
            }
          );
        }

        if (
          contieneTexto(
            acta.lugar,
            buscar
          )
        ) {
          agregarCoincidencia(
            mapa,
            acta.reclamoId,
            {
              tipo:
                "LUGAR_ACTA",

              etiqueta:
                "Lugar del acta",

              valor:
                acta.lugar,
            }
          );
        }
      }
    );

    /*
    |--------------------------------------------------------------------------
    | INFRACCIONES
    |--------------------------------------------------------------------------
    */

    infracciones.forEach(
      (item) => {
        const infraccion =
          item.toJSON();

        if (
          contieneTexto(
            infraccion.numeroActa,
            buscar
          )
        ) {
          agregarCoincidencia(
            mapa,
            infraccion.reclamoId,
            {
              tipo:
                "ACTA_INFRACCION",

              etiqueta:
                "Acta de Infracción",

              valor:
                infraccion.numeroActa,
            }
          );
        }

        if (
          contieneTexto(
            infraccion
              .numeroExpedienteJuzgado,
            buscar
          )
        ) {
          agregarCoincidencia(
            mapa,
            infraccion.reclamoId,
            {
              tipo:
                "EXPEDIENTE_JUZGADO",

              etiqueta:
                "Expediente Juzgado",

              valor:
                infraccion
                  .numeroExpedienteJuzgado,
            }
          );
        }

        if (
          contieneTexto(
            infraccion.dniInfractor,
            buscar
          )
        ) {
          agregarCoincidencia(
            mapa,
            infraccion.reclamoId,
            {
              tipo:
                "DNI",

              etiqueta:
                "DNI",

              valor:
                infraccion.dniInfractor,
            }
          );
        }

        const nombreCompleto =
          [
            infraccion
              .nombreInfractor,
            infraccion
              .apellidoInfractor,
          ]
            .filter(Boolean)
            .join(" ");

        if (
          contieneTexto(
            nombreCompleto,
            buscar
          )
        ) {
          agregarCoincidencia(
            mapa,
            infraccion.reclamoId,
            {
              tipo:
                "PERSONA",

              etiqueta:
                "Persona",

              valor:
                nombreCompleto,
            }
          );
        }

        if (
          contieneTexto(
            infraccion
              .domicilioInfractor,
            buscar
          )
        ) {
          agregarCoincidencia(
            mapa,
            infraccion.reclamoId,
            {
              tipo:
                "DOMICILIO",

              etiqueta:
                "Domicilio",

              valor:
                infraccion
                  .domicilioInfractor,
            }
          );
        }
      }
    );

    /*
    |--------------------------------------------------------------------------
    | EGRESOS DEL PREDIO
    |--------------------------------------------------------------------------
    |
    | Permite encontrar un expediente por:
    |
    | - nombre de la persona que retiró el vehículo
    | - DNI de la persona que retiró el vehículo
    |
    */

    egresos.forEach(
      (item) => {
        const egreso =
          item.toJSON();

        if (
          contieneTexto(
            egreso.destinoPersona,
            buscar
          )
        ) {
          agregarCoincidencia(
            mapa,
            egreso.reclamoId,
            {
              tipo:
                "PERSONA_RETIRO",

              etiqueta:
                "Retiró vehículo",

              valor:
                egreso.destinoPersona,
            }
          );
        }

        if (
          contieneTexto(
            egreso.dniPersona,
            buscar
          )
        ) {
          agregarCoincidencia(
            mapa,
            egreso.reclamoId,
            {
              tipo:
                "DNI_RETIRO",

              etiqueta:
                "DNI de quien retiró",

              valor:
                egreso.dniPersona,
            }
          );
        }
      }
    );

    return mapa;
  };

/*
|--------------------------------------------------------------------------
| LISTAR / BUSCAR EXPEDIENTES
|--------------------------------------------------------------------------
|
| GET /api/expedientes
|
| Ejemplos:
|
| /api/expedientes
|
| /api/expedientes?buscar=34428733
|
| /api/expedientes?buscar=Gonzalez&page=2
|
*/

const listarExpedientes =
  async (
    req,
    res
  ) => {
    try {
      const buscar =
        textoSeguro(
          req.query.buscar
        );

      const pagina =
        numeroSeguro(
          req.query.page,
          1
        );

      const limitePedido =
        numeroSeguro(
          req.query.limit,
          LIMITE_POR_PAGINA
        );

      const limit =
        Math.min(
          limitePedido,
          LIMITE_MAXIMO
        );

      const offset =
        (
          pagina - 1
        ) * limit;

      /*
      |--------------------------------------------------------------------------
      | PRIMERO MYSQL ELIGE LOS 10
      |--------------------------------------------------------------------------
      */

      const {
        total,
        ids,
      } =
        await buscarIdsExpedientes({
          buscar,
          limit,
          offset,
        });

      const totalPaginas =
        Math.max(
          1,
          Math.ceil(
            total / limit
          )
        );

      if (!ids.length) {
        return res.json({
          ok: true,

          expedientes: [],

          paginacion: {
            pagina,
            limite:
              limit,
            total,
            totalPaginas,
            tieneAnterior:
              pagina > 1,
            tieneSiguiente:
              false,
          },
        });
      }

      /*
      |--------------------------------------------------------------------------
      | CARGAMOS SOLAMENTE LOS 10 RECLAMOS
      |--------------------------------------------------------------------------
      */

      const reclamos =
        await Reclamo.findAll({
          where: {
            id: {
              [Op.in]:
                ids,
            },
          },

          include: [
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
          ],
        });

      /*
      |--------------------------------------------------------------------------
      | DATOS RELACIONADOS DE ESOS 10
      |--------------------------------------------------------------------------
      */

      const [
        vehiculos,
        actas,
        infracciones,
        mapaCoincidencias,
      ] =
        await Promise.all([
          Vehiculo.findAll({
            where: {
              reclamoId: {
                [Op.in]:
                  ids,
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

            order: [
              [
                "createdAt",
                "DESC",
              ],
            ],
          }),

          Acta.findAll({
            where: {
              reclamoId: {
                [Op.in]:
                  ids,
              },
            },

            attributes: [
              "id",
              "reclamoId",
              "numeroActa",
              "tipo",
              "atendidoPor",
              "fechaHora",
            ],

            order: [
              [
                "createdAt",
                "DESC",
              ],
            ],
          }),

          Infraccion.findAll({
            where: {
              reclamoId: {
                [Op.in]:
                  ids,
              },
            },

            attributes: [
              "id",
              "reclamoId",
              "numeroActa",
              "numeroExpedienteJuzgado",
              "dniInfractor",
              "nombreInfractor",
              "apellidoInfractor",
              "estadoJuzgado",
              "fechaHora",
            ],

            order: [
              [
                "createdAt",
                "DESC",
              ],
            ],
          }),

          obtenerCoincidencias(
            ids,
            buscar
          ),
        ]);

      /*
      |--------------------------------------------------------------------------
      | RESPETAR ORDEN DE MYSQL
      |--------------------------------------------------------------------------
      */

      const mapaReclamos =
        new Map(
          reclamos.map(
            (item) => [
              Number(
                item.id
              ),
              item.toJSON(),
            ]
          )
        );

      const expedientes =
        ids
          .map(
            (id) => {
              const reclamo =
                mapaReclamos.get(
                  Number(id)
                );

              if (!reclamo) {
                return null;
              }

              const vehiculosReclamo =
                vehiculos
                  .filter(
                    (item) =>
                      Number(
                        item.reclamoId
                      ) ===
                      Number(id)
                  )
                  .map(
                    (item) =>
                      item.toJSON()
                  );

              const actasReclamo =
                actas
                  .filter(
                    (item) =>
                      Number(
                        item.reclamoId
                      ) ===
                      Number(id)
                  )
                  .map(
                    (item) =>
                      item.toJSON()
                  );

              const infraccionesReclamo =
                infracciones
                  .filter(
                    (item) =>
                      Number(
                        item.reclamoId
                      ) ===
                      Number(id)
                  )
                  .map(
                    (item) =>
                      item.toJSON()
                  );

              return {
                reclamo,

                vehiculo:
                  vehiculosReclamo[
                    0
                  ] || null,

                vehiculos:
                  vehiculosReclamo,

                actaViaPublica:
                  actasReclamo.find(
                    (acta) =>
                      acta.tipo ===
                        "VIA_PUBLICA" ||
                      !acta.tipo
                  ) || null,

                actas:
                  actasReclamo,

                infraccion:
                  infraccionesReclamo[
                    0
                  ] || null,

                infracciones:
                  infraccionesReclamo,

                coincidencias:
                  mapaCoincidencias.get(
                    Number(id)
                  ) || [],
              };
            }
          )
          .filter(Boolean);

      return res.json({
        ok: true,

        buscar,

        expedientes,

        paginacion: {
          pagina,

          limite:
            limit,

          total,

          totalPaginas,

          tieneAnterior:
            pagina > 1,

          tieneSiguiente:
            pagina <
            totalPaginas,
        },
      });
    } catch (error) {
      console.error(
        "Error listando expedientes:",
        error
      );

      return res
        .status(500)
        .json({
          ok: false,

          mensaje:
            "Error al buscar expedientes",
        });
    }
  };

  /*
|--------------------------------------------------------------------------
| CREAR EXPEDIENTE MANUAL / CARGA HISTÓRICA
|--------------------------------------------------------------------------
|
| Se utiliza para vehículos y actuaciones que ya existían
| antes de comenzar a utilizar el sistema.
|
| NO crea un reclamo falso.
|
*/

const crearExpedienteManual = async (req, res) => {
  const transaction =
    await sequelize.transaction();

  try {
    const {
      /*
      |--------------------------------------------------------------------------
      | RECLAMO
      |--------------------------------------------------------------------------
      */

      numeroReclamo,
      tipoReclamoId,
      direccion,
      barrio,
      referencia,
      observaciones,

      /*
      |--------------------------------------------------------------------------
      | VEHÍCULO
      |--------------------------------------------------------------------------
      */

      vehiculo = {},

      /*
      |--------------------------------------------------------------------------
      | DOCUMENTACIÓN
      |--------------------------------------------------------------------------
      */

      acta = null,
emplazamiento = null,
infraccion = null,
ordenJudicialRemocion = null,
      /*
      |--------------------------------------------------------------------------
      | SITUACIÓN ACTUAL
      |--------------------------------------------------------------------------
      */

      situacionActual,

      /*
      |--------------------------------------------------------------------------
      | PREDIO
      |--------------------------------------------------------------------------
      */

      predioId,
      fechaIngreso,
      sector,
      posicion,
      observacionesIngreso,

      /*
      |--------------------------------------------------------------------------
      | EGRESO
      |--------------------------------------------------------------------------
      */

      fechaEgreso,
      predioDestinoId,
      destinoPersona,
      dniPersona,
      observacionesEgreso,
    } = req.body;


    /*
    |--------------------------------------------------------------------------
    | VALIDAR SITUACIÓN
    |--------------------------------------------------------------------------
    */

    const situacionesValidas = [
      "EN_PREDIO",
      "ENTREGADO",
      "TRASLADADO",
      "COMPACTADO",
      "OTRO",
    ];

    if (
      !situacionesValidas.includes(
        situacionActual
      )
    ) {
      await transaction.rollback();

      return res.status(400).json({
        ok: false,
        mensaje:
          "Debe indicar la situación actual del vehículo",
      });
    }


    const requierePredio =
      situacionActual === "EN_PREDIO" ||
      situacionActual === "TRASLADADO";

    const esTraslado =
      situacionActual === "TRASLADADO";

const esPendienteIngresoPredio =
  situacionActual === "EN_PREDIO";

const estaActualmenteEnPredio =
  situacionActual === "TRASLADADO";


    /*
    |--------------------------------------------------------------------------
    | TIPO DE RECLAMO
    |--------------------------------------------------------------------------
    */

    if (!tipoReclamoId) {
      await transaction.rollback();

      return res.status(400).json({
        ok: false,
        mensaje:
          "Debe seleccionar el tipo de reclamo",
      });
    }

    const tipoReclamo =
      await TipoReclamo.findOne({
        where: {
          id: Number(tipoReclamoId),
          activo: true,
        },
        transaction,
      });

    if (!tipoReclamo) {
      await transaction.rollback();

      return res.status(400).json({
        ok: false,
        mensaje:
          "El tipo de reclamo seleccionado no existe o está inactivo",
      });
    }


    /*
    |--------------------------------------------------------------------------
    | DIRECCIÓN
    |--------------------------------------------------------------------------
    */

    const direccionFinal =
      direccion?.trim();

    if (!direccionFinal) {
      await transaction.rollback();

      return res.status(400).json({
        ok: false,
        mensaje:
          "Debe indicar la dirección o escribir que no consta en la documentación",
      });
    }


    /*
    |--------------------------------------------------------------------------
    | NÚMERO DE RECLAMO
    |--------------------------------------------------------------------------
    */

    let numeroFinal =
      numeroReclamo
        ? String(numeroReclamo).trim()
        : null;

    let numeroGenerado = false;

    if (numeroFinal) {
      const existente =
        await Reclamo.findOne({
          where: {
            numeroReclamo:
              numeroFinal,
          },
          transaction,
        });

      if (existente) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            `El reclamo ${numeroFinal} ya existe en el sistema`,
        });
      }
    }


    /*
    |--------------------------------------------------------------------------
    | GENERAR NÚMERO SI NO TIENE
    |--------------------------------------------------------------------------
    */

    if (!numeroFinal) {
      const reclamos =
        await Reclamo.findAll({
          attributes: [
            "numeroReclamo",
          ],
          transaction,
        });

      let mayorNumero = 0;

      for (const item of reclamos) {
        const valor =
          String(
            item.numeroReclamo || ""
          ).trim();

        if (/^\d+$/.test(valor)) {
          const numero =
            Number(valor);

          if (numero > mayorNumero) {
            mayorNumero = numero;
          }
        }
      }

      let candidato =
        mayorNumero + 1;

      let encontrado = true;

      while (encontrado) {
        encontrado =
          await Reclamo.findOne({
            where: {
              numeroReclamo:
                String(candidato),
            },
            transaction,
          });

        if (encontrado) {
          candidato += 1;
        }
      }

      numeroFinal =
        String(candidato);

      numeroGenerado = true;
    }


    /*
    |--------------------------------------------------------------------------
    | VEHÍCULO
    |--------------------------------------------------------------------------
    */

    const dominio =
      vehiculo.dominio
        ?.trim()
        .toUpperCase() ||
      null;

    const marca =
      vehiculo.marca
        ?.trim() ||
      null;

    const modelo =
      vehiculo.modelo
        ?.trim() ||
      null;

    const color =
      vehiculo.color
        ?.trim() ||
      null;

    const tipoVehiculo =
      vehiculo.tipoVehiculo
        ?.trim() ||
      null;

    const descripcion =
      vehiculo.descripcion
        ?.trim() ||
      null;

    if (
      !dominio &&
      !marca &&
      !modelo &&
      !color &&
      !tipoVehiculo &&
      !descripcion
    ) {
      await transaction.rollback();

      return res.status(400).json({
        ok: false,
        mensaje:
          "Debe ingresar al menos algún dato identificatorio del vehículo",
      });
    }


    /*
    |--------------------------------------------------------------------------
    | PREDIO
    |--------------------------------------------------------------------------
    */

    let predio = null;

    if (requierePredio) {
      if (!predioId) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            esTraslado
              ? "Debe indicar el predio de origen del traslado"
              : "Debe indicar el predio donde se encuentra el vehículo",
        });
      }

      predio =
        await Predio.findOne({
          where: {
            id: Number(predioId),
            activo: true,
          },
          transaction,
        });

      if (!predio) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "El predio seleccionado no existe o está inactivo",
        });
      }
    }


    /*
    |--------------------------------------------------------------------------
    | PREDIO DESTINO
    |--------------------------------------------------------------------------
    */

    let predioDestino = null;

    if (esTraslado) {
      if (!predioDestinoId) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "Debe indicar el predio de destino",
        });
      }

      predioDestino =
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
            "El predio de destino no existe o está inactivo",
        });
      }

      if (
        Number(predio.id) ===
        Number(predioDestino.id)
      ) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "El predio de destino debe ser diferente al predio de origen",
        });
      }
    }


    /*
    |--------------------------------------------------------------------------
    | ESTADO DEL RECLAMO
    |--------------------------------------------------------------------------
    */
/*
|--------------------------------------------------------------------------
| ESTADO DEL RECLAMO
|--------------------------------------------------------------------------
*/

let estadoReclamo;
let etapaActual;
let estadoExterno;

if (esPendienteIngresoPredio) {
  // La Secretaría informa que el vehículo está en la Granja,
  // pero el personal de Predio todavía debe confirmar
  // físicamente el ingreso.
  estadoReclamo =
    "EN_SEGUIMIENTO";

  etapaActual =
    "PENDIENTE_INGRESO_PREDIO";

  estadoExterno =
    "PENDIENTE";
} else if (estaActualmenteEnPredio) {
  // TRASLADADO mantiene el comportamiento histórico actual.
  estadoReclamo =
    "EN_SEGUIMIENTO";

  etapaActual =
    "EN_PREDIO";

  estadoExterno =
    "PENDIENTE";
} else {
  estadoReclamo =
    "RESUELTO";

  etapaActual =
    "FINALIZADO";

  estadoExterno =
    "CERRADO";
}
    /*
    |--------------------------------------------------------------------------
    | CREAR RECLAMO
    |--------------------------------------------------------------------------
    */

    const nuevoReclamo =
      await Reclamo.create(
        {
          numeroReclamo:
            numeroFinal,

          direccion:
            direccionFinal,

          barrio:
            barrio?.trim() ||
            null,

          referencia:
            referencia?.trim() ||
            null,

          latitudDenunciada:
            null,

          longitudDenunciada:
            null,

          tipoReclamoId:
            Number(
              tipoReclamoId
            ),

          observaciones:
            observaciones?.trim() ||
            "Expediente anterior cargado manualmente",

          estado:
            estadoReclamo,

          etapaActual,

          estadoExterno,

          jefeGuardiaId:
            null,

          inspectorId:
            null,

          creadoPorId:
            req.usuario.id,

          resueltoPor:
            null,

          detalleResolucion:
            estaActualmenteEnPredio
              ? null
              : situacionActual ===
                  "ENTREGADO"
                ? "Expediente anterior. El vehículo figura como entregado."
                : situacionActual ===
                    "COMPACTADO"
                  ? "Expediente anterior. El vehículo figura como compactado."
                  : "Expediente anterior. El vehículo registra un egreso.",

          costoMunicipalEstado:
            null,

          costoMunicipal:
            null,

          novedadJuzgadoPendiente:
            false,

          novedadJuzgadoInformadaAt:
            null,

          novedadJuzgadoInformadaPorId:
            null,

          fechaResolucion:
            null,

          fechaCierreExterno:
            null,

          cerradoExternoPorId:
            null,
        },
        {
          transaction,
        }
      );


    /*
    |--------------------------------------------------------------------------
    | CREAR VEHÍCULO
    |--------------------------------------------------------------------------
    */

   const nuevoVehiculo =
  await Vehiculo.create(
    {
      reclamoId:
        nuevoReclamo.id,

      origenRegistro:
        "CARGA_HISTORICA",

      predioPendienteId:
        esPendienteIngresoPredio
          ? Number(predio.id)
          : null,

      dominio:
        vehiculo.dominio?.trim() ||
        null,

      marca:
        vehiculo.marca?.trim() ||
        null,

      modelo:
        vehiculo.modelo?.trim() ||
        null,

      color:
        vehiculo.color?.trim() ||
        null,

      tipoVehiculo:
        vehiculo.tipoVehiculo?.trim() ||
        null,

      descripcion:
        vehiculo.descripcion?.trim() ||
        null,

      estadoActual:
        esPendienteIngresoPredio
          ? "PENDIENTE_INGRESO_PREDIO"
          : estaActualmenteEnPredio
            ? "EN_PREDIO"
            : "EGRESADO",
    },
    {
      transaction,
    }
  );

    nuevoVehiculo.numeroInterno =
      nuevoVehiculo.id;

    await nuevoVehiculo.save({
      transaction,
    });


    /*
    |--------------------------------------------------------------------------
    | CONSTATACIÓN HISTÓRICA
    |--------------------------------------------------------------------------
    |
    | Se crea para mantener la misma estructura
    | que utiliza el circuito normal:
    |
    | Constatación -> Acta -> Emplazamiento
    |
    | NO inventamos inspector ni GPS.
    |--------------------------------------------------------------------------
    */

    let nuevaConstatacion = null;

    if (acta?.existe) {
      nuevaConstatacion =
        await Constatacion.create(
          {
            reclamoId:
              nuevoReclamo.id,

            inspectorId:
              null,

            vehiculoId:
              nuevoVehiculo.id,

            resultado:
              "CONSTATADO",

            situacion:
              acta.situacion
                ?.trim() ||
              "No consta en la documentación histórica.",

            fechaHora:
              acta.fechaHora ||
              new Date(),

            latitudActual:
              null,

            longitudActual:
              null,

            precisionGps:
              null,

            observaciones:
              "Constatación reconstruida desde expediente anterior cargado manualmente.",
          },
          {
            transaction,
          }
        );
    }


    /*
    |--------------------------------------------------------------------------
    | ACTA DE VÍA PÚBLICA
    |--------------------------------------------------------------------------
    */

    let nuevaActa = null;

    if (acta?.existe) {
      const numeroActa =
        acta.numeroActa
          ?.trim()
          .toUpperCase();

      if (!numeroActa) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "Si carga el Acta de Vía Pública debe indicar su número",
        });
      }

      const existente =
        await Acta.findOne({
          where: {
            numeroActa,
          },
          transaction,
        });

      if (existente) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            `El Acta ${numeroActa} ya está cargada`,
        });
      }

      nuevaActa =
        await Acta.create(
          {
            reclamoId:
              nuevoReclamo.id,

            vehiculoId:
              nuevoVehiculo.id,

            constatacionId:
              nuevaConstatacion?.id ||
              null,

            inspectorId:
              null,

            numeroActa,

            tipo:
              "VIA_PUBLICA",

            fechaHora:
              acta.fechaHora ||
              null,

            lugar:
              acta.lugar
                ?.trim() ||
              null,

            atendidoPor:
              acta.atendidoPor
                ?.trim() ||
              null,

            caracterAtendido:
              acta.caracterAtendido
                ?.trim() ||
              null,

            situacion:
              acta.situacion
                ?.trim() ||
              null,

            cantidad:
              acta.cantidad
                ?.trim() ||
              null,

            plazoHoras:
              acta.plazoHoras
                ? Number(
                    acta.plazoHoras
                  )
                : null,

            observaciones:
              acta.observaciones
                ?.trim() ||
              null,
          },
          {
            transaction,
          }
        );
    }


    /*
    |--------------------------------------------------------------------------
    | EMPLAZAMIENTO
    |--------------------------------------------------------------------------
    */

    let nuevoEmplazamiento =
      null;

    if (acta?.existe) {
      const plazoCantidad =
        emplazamiento?.plazoCantidad
          ? Number(
              emplazamiento
                .plazoCantidad
            )
          : null;

      const plazoUnidad =
        emplazamiento?.plazoUnidad ||
        null;

      if (
        plazoUnidad &&
        ![
          "HORAS",
          "DIAS",
        ].includes(plazoUnidad)
      ) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "La unidad del plazo del emplazamiento es inválida",
        });
      }

      let plazoHoras = null;

      if (
        plazoCantidad !== null &&
        plazoUnidad === "HORAS"
      ) {
        plazoHoras =
          plazoCantidad;
      }

      if (
        plazoCantidad !== null &&
        plazoUnidad === "DIAS"
      ) {
        plazoHoras =
          plazoCantidad * 24;
      }

      nuevoEmplazamiento =
        await Emplazamiento.create(
          {
            reclamoId:
              nuevoReclamo.id,

            actaId:
              nuevaActa?.id ||
              null,

            vehiculoId:
              nuevoVehiculo.id,

            inspectorId:
              null,

            fechaHora:
              acta.fechaHora ||
              null,

            plazoCantidad,

            plazoUnidad,

            plazoHoras,

            fechaVencimiento:
              emplazamiento
                ?.fechaVencimiento ||
              null,

            estado:
              "VENCIDO",

            fechaCumplimiento:
              null,

            observaciones:
              emplazamiento
                ?.observaciones
                ?.trim() ||
              null,
          },
          {
            transaction,
          }
        );
    }


    /*
    |--------------------------------------------------------------------------
    | VERIFICACIÓN HISTÓRICA
    |--------------------------------------------------------------------------
    |
    | Mantiene la estructura:
    |
    | Emplazamiento -> Verificación -> Infracción
    |
    | Tampoco inventamos inspector ni GPS.
    |--------------------------------------------------------------------------
    */

    let nuevaVerificacion = null;

    if (infraccion?.existe) {
      nuevaVerificacion =
        await Verificacion.create(
          {
            reclamoId:
              nuevoReclamo.id,

            asignacionId:
              null,

            emplazamientoId:
              nuevoEmplazamiento?.id ||
              null,

            inspectorId:
              null,

            vehiculoId:
              nuevoVehiculo.id,

            resultado:
              "NO_CUMPLIDO",

            situacion:
              infraccion.motivo
                ?.trim() ||
              "No consta en la documentación histórica.",

            fechaHora:
              infraccion.fechaHora ||
              new Date(),

            latitudActual:
              null,

            longitudActual:
              null,

            precisionGps:
              null,

            observaciones:
              infraccion
                .observaciones
                ?.trim() ||
              null,
          },
          {
            transaction,
          }
        );
    }


    /*
    |--------------------------------------------------------------------------
    | INFRACCIÓN
    |--------------------------------------------------------------------------
    */

    let nuevaInfraccion = null;

    if (infraccion?.existe) {
      const numeroActa =
        infraccion.numeroActa
          ?.trim()
          .toUpperCase();

      if (!numeroActa) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            "Si carga la infracción debe indicar el número de acta",
        });
      }

      const existente =
        await Infraccion.findOne({
          where: {
            numeroActa,
          },
          transaction,
        });

      if (existente) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          mensaje:
            `El Acta de Infracción ${numeroActa} ya está cargada`,
        });
      }

      nuevaInfraccion =
        await Infraccion.create(
          {
            reclamoId:
              nuevoReclamo.id,

            vehiculoId:
              nuevoVehiculo.id,

            inspectorId:
              null,

            verificacionId:
              nuevaVerificacion?.id ||
              null,

            numeroActa,

            fechaHora:
              infraccion.fechaHora ||
              null,

            lugar:
              infraccion.lugar
                ?.trim() ||
              null,

            personaEncontrada:
              Boolean(
                infraccion
                  .personaEncontrada
              ),

            apellidoInfractor:
              infraccion
                .apellidoInfractor
                ?.trim() ||
              null,

            nombreInfractor:
              infraccion
                .nombreInfractor
                ?.trim() ||
              null,

            dniInfractor:
              infraccion
                .dniInfractor
                ?.trim() ||
              null,

            domicilioInfractor:
              infraccion
                .domicilioInfractor
                ?.trim() ||
              null,

            motivo:
              infraccion.motivo
                ?.trim() ||
              "No consta en la documentación disponible",

            observaciones:
              infraccion
                .observaciones
                ?.trim() ||
              null,

            accionPosterior:
              infraccion
                .accionPosterior ||
              null,

            /*
            Estos expedientes históricos ya
            pasaron administrativamente por Juzgado.

            ENVIADO existe en el ENUM.
            No usamos EN_JUZGADO porque NO existe.
            */

            estadoJuzgado:
              infraccion
                .estadoJuzgado ||
              "ENVIADO",

          numeroExpedienteJuzgado:
  infraccion
    .numeroExpedienteJuzgado
    ?.trim() ||
  ordenJudicialRemocion
    ?.numeroReferencia
    ?.trim() ||
  null,

requiereOrdenRemocion:
  Boolean(
    ordenJudicialRemocion?.existe
  ),

estadoOrdenRemocion:
  ordenJudicialRemocion?.existe
    ? "AUTORIZADA"
    : "NO_REQUIERE",

fechaRespuestaOrdenRemocion:
  ordenJudicialRemocion?.existe
    ? ordenJudicialRemocion.fechaHora || null
    : null,

anulada:
  false,
          },
          {
            transaction,
          }
        );
    }


    /*
    |--------------------------------------------------------------------------
    | MOVIMIENTOS DE PREDIO
    |--------------------------------------------------------------------------
    */

    let ingreso = null;
    let egreso = null;
    let ingresoDestino = null;




    /*
    |--------------------------------------------------------------------------
    | TRASLADADO
    |--------------------------------------------------------------------------
    */

    if (esTraslado) {
      ingreso =
        await IngresoPredio.create(
          {
            reclamoId:
              nuevoReclamo.id,

            vehiculoId:
              nuevoVehiculo.id,

            remocionId:
              null,

            predioId:
              predio.id,

            registradoPorId:
              req.usuario.id,

            fechaHora:
              fechaIngreso ||
              null,

            sector:
              sector?.trim() ||
              null,

            posicion:
              posicion?.trim() ||
              null,

            observaciones:
              observacionesIngreso
                ?.trim() ||
              null,
          },
          {
            transaction,
          }
        );

      egreso =
        await EgresoPredio.create(
          {
            reclamoId:
              nuevoReclamo.id,

            vehiculoId:
              nuevoVehiculo.id,

            ingresoPredioId:
              ingreso.id,

            registradoPorId:
              req.usuario.id,

            fechaHora:
              fechaEgreso ||
              null,

            tipoEgreso:
              "TRASLADADO",

            predioDestinoId:
              predioDestino.id,

            destinoPersona:
              null,

            dniPersona:
              null,

            observaciones:
              observacionesEgreso
                ?.trim() ||
              null,
          },
          {
            transaction,
          }
        );

      ingresoDestino =
        await IngresoPredio.create(
          {
            reclamoId:
              nuevoReclamo.id,

            vehiculoId:
              nuevoVehiculo.id,

            remocionId:
              null,

            predioId:
              predioDestino.id,

            registradoPorId:
              req.usuario.id,

            fechaHora:
              fechaEgreso ||
              null,

            sector:
              null,

            posicion:
              null,

            observaciones:
              "Ingreso generado por traslado de expediente anterior",
          },
          {
            transaction,
          }
        );
    }


    /*
    |--------------------------------------------------------------------------
    | ENTREGADO / COMPACTADO / OTRO
    |--------------------------------------------------------------------------
    */

    if (
      [
        "ENTREGADO",
        "COMPACTADO",
        "OTRO",
      ].includes(
        situacionActual
      )
    ) {
      const detalles = [];

      if (
        situacionActual ===
        "ENTREGADO"
      ) {
        detalles.push(
          "Vehículo entregado."
        );

        if (
          destinoPersona?.trim()
        ) {
          detalles.push(
            `Retirado por: ${destinoPersona.trim()}.`
          );
        }

        if (
          dniPersona?.trim()
        ) {
          detalles.push(
            `DNI: ${dniPersona.trim()}.`
          );
        }
      }

      if (
        situacionActual ===
        "COMPACTADO"
      ) {
        detalles.push(
          "Vehículo compactado."
        );
      }

      if (
        situacionActual ===
        "OTRO"
      ) {
        detalles.push(
          "El vehículo registra otro tipo de egreso."
        );
      }

      if (fechaEgreso) {
        detalles.push(
          `Fecha registrada: ${fechaEgreso}.`
        );
      }

      if (
        observacionesEgreso
          ?.trim()
      ) {
        detalles.push(
          observacionesEgreso.trim()
        );
      }

      nuevoReclamo.detalleResolucion =
        detalles.join(" ");

      await nuevoReclamo.save({
        transaction,
      });
    }


    /*
    |--------------------------------------------------------------------------
    | ESTADO FINAL VEHÍCULO
    |--------------------------------------------------------------------------
    */

 nuevoVehiculo.estadoActual =
  esPendienteIngresoPredio
    ? "PENDIENTE_INGRESO_PREDIO"
    : estaActualmenteEnPredio
      ? "EN_PREDIO"
      : "EGRESADO";

await nuevoVehiculo.save({
  transaction,
});


    /*
    |--------------------------------------------------------------------------
    | COMMIT
    |--------------------------------------------------------------------------
    */

    await transaction.commit();


    /*
    |--------------------------------------------------------------------------
    | RESPUESTA
    |--------------------------------------------------------------------------
    */

    return res
      .status(201)
      .json({
        ok: true,

        mensaje:
          numeroGenerado
            ? `Expediente cargado correctamente. Se generó el reclamo N.º ${numeroFinal}`
            : `Expediente cargado correctamente con reclamo N.º ${numeroFinal}`,

        origen:
          "CARGA_MANUAL",

        numeroGenerado,

        numeroReclamo:
          numeroFinal,

        reclamo:
          nuevoReclamo,

        vehiculo:
          nuevoVehiculo,

        constatacion:
          nuevaConstatacion,

        acta:
          nuevaActa,

        emplazamiento:
          nuevoEmplazamiento,

        verificacion:
          nuevaVerificacion,

        infraccion:
          nuevaInfraccion,

        ingreso,

        egreso,

        ingresoDestino,

        /*
        |--------------------------------------------------------------------------
        | REFERENCIAS PARA SUBIR FOTOS
        |--------------------------------------------------------------------------
        */

        referenciasFotos: {
          reclamoId:
            nuevoReclamo.id,

          /*
          Foto actual del vehículo.
          Para un vehículo que está en predio
          conviene usar INGRESO_PREDIO.
          */

          vehiculoPredio:
            ingresoDestino ||
            ingreso
              ? {
                  tipoReferencia:
                    "INGRESO_PREDIO",

                  referenciaId:
                    (
                      ingresoDestino ||
                      ingreso
                    ).id,
                }
              : null,

          /*
          Acta de Vía Pública / Emplazamiento
          es UN solo documento físico.

          ReclamoDetallePage ya consulta
          EMPLAZAMIENTO.
          */

          emplazamiento:
            nuevoEmplazamiento
              ? {
                  tipoReferencia:
                    "EMPLAZAMIENTO",

                  referenciaId:
                    nuevoEmplazamiento.id,
                }
              : null,

          /*
          Acta de Infracción.
          */

          infraccion:
            nuevaInfraccion
              ? {
                  tipoReferencia:
                    "INFRACCION",

                  referenciaId:
                    nuevaInfraccion.id,
                }
              : null,

              ordenJudicialRemocion:
  ordenJudicialRemocion?.existe
    ? {
        tipoReferencia:
          "ORDEN_JUDICIAL_REMOCION",

        referenciaId:
          nuevaInfraccion?.id ||
          null,
      }
    : null,
        },
      });
  } catch (error) {
    if (
      !transaction.finished
    ) {
      await transaction.rollback();
    }

    console.error(
      "Error creando expediente manual:",
      error
    );

    return res
      .status(500)
      .json({
        ok: false,

        mensaje:
          "Error al cargar el expediente anterior",

        error:
          error.message,
      });
  }
};
module.exports = {
  listarExpedientes,
  crearExpedienteManual,
};