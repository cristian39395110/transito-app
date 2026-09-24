const {
  Op,
} = require("sequelize");

const {
  TipoReclamo,
} = require("../models");

/*
|--------------------------------------------------------------------------
| LISTAR TIPOS DE RECLAMO
|--------------------------------------------------------------------------
*/

const listarTipos =
  async (req, res) => {
    try {
      const tipos =
        await TipoReclamo.findAll({
          order: [
            ["nombre", "ASC"],
          ],
        });

      return res.json({
        ok: true,
        tipos,
      });
    } catch (error) {
      console.error(
        "Error listando tipos de reclamo:",
        error
      );

      return res
        .status(500)
        .json({
          ok: false,

          mensaje:
            "Error al obtener los tipos de reclamo",
        });
    }
  };

/*
|--------------------------------------------------------------------------
| CREAR TIPO
|--------------------------------------------------------------------------
*/

const crearTipo =
  async (req, res) => {
    try {
      const {
        nombre,
        descripcion,
        activo = true,
      } = req.body;

      const nombreLimpio =
        String(
          nombre || ""
        ).trim();

      if (!nombreLimpio) {
        return res
          .status(400)
          .json({
            ok: false,

            mensaje:
              "El nombre del tipo de reclamo es obligatorio",
          });
      }

      const existente =
        await TipoReclamo.findOne({
          where: {
            nombre: {
              [Op.like]:
                nombreLimpio,
            },
          },
        });

      if (existente) {
        return res
          .status(400)
          .json({
            ok: false,

            mensaje:
              "Ya existe un tipo de reclamo con ese nombre",
          });
      }

      const tipo =
        await TipoReclamo.create({
          nombre:
            nombreLimpio,

          descripcion:
            descripcion
              ? String(
                  descripcion
                ).trim()
              : null,

          activo:
            activo !== false,
        });

      return res
        .status(201)
        .json({
          ok: true,

          mensaje:
            "Tipo de reclamo creado correctamente",

          tipo,
        });
    } catch (error) {
      console.error(
        "Error creando tipo de reclamo:",
        error
      );

      return res
        .status(500)
        .json({
          ok: false,

          mensaje:
            "Error al crear el tipo de reclamo",
        });
    }
  };

/*
|--------------------------------------------------------------------------
| ACTUALIZAR TIPO
|--------------------------------------------------------------------------
*/

const actualizarTipo =
  async (req, res) => {
    try {
      const {
        id,
      } = req.params;

      const {
        nombre,
        descripcion,
        activo,
      } = req.body;

      const tipo =
        await TipoReclamo.findByPk(
          id
        );

      if (!tipo) {
        return res
          .status(404)
          .json({
            ok: false,

            mensaje:
              "Tipo de reclamo no encontrado",
          });
      }

      if (
        nombre !== undefined
      ) {
        const nombreLimpio =
          String(nombre).trim();

        if (!nombreLimpio) {
          return res
            .status(400)
            .json({
              ok: false,

              mensaje:
                "El nombre no puede estar vacío",
            });
        }

        const duplicado =
          await TipoReclamo.findOne({
            where: {
              nombre: {
                [Op.like]:
                  nombreLimpio,
              },

              id: {
                [Op.ne]:
                  tipo.id,
              },
            },
          });

        if (duplicado) {
          return res
            .status(400)
            .json({
              ok: false,

              mensaje:
                "Ya existe otro tipo de reclamo con ese nombre",
            });
        }

        tipo.nombre =
          nombreLimpio;
      }

      if (
        descripcion !==
        undefined
      ) {
        tipo.descripcion =
          descripcion
            ? String(
                descripcion
              ).trim()
            : null;
      }

      if (
        activo !== undefined
      ) {
        tipo.activo =
          Boolean(activo);
      }

      await tipo.save();

      return res.json({
        ok: true,

        mensaje:
          "Tipo de reclamo actualizado correctamente",

        tipo,
      });
    } catch (error) {
      console.error(
        "Error actualizando tipo de reclamo:",
        error
      );

      return res
        .status(500)
        .json({
          ok: false,

          mensaje:
            "Error al actualizar el tipo de reclamo",
        });
    }
  };

module.exports = {
  listarTipos,
  crearTipo,
  actualizarTipo,
};