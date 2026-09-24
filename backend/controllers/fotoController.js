const {
  Reclamo,
  Foto,
  Usuario,
} = require("../models");

const {
  obtenerRutaPublicaFoto,
} = require(
  "../utils/uploadPaths"
);

const {
  registrarHistorial,
} = require(
  "../services/historialService"
);

/*
|--------------------------------------------------------------------------
| TIPOS DE REFERENCIA
|--------------------------------------------------------------------------
*/

const tiposReferenciaValidos = [
  "RECLAMO",
  "CONSTATACION",
  "ACTA",
  "EMPLAZAMIENTO",
  "VERIFICACION",
  "INFRACCION",
  "ORDEN_JUDICIAL_REMOCION",
  "VEHICULO",
  "REMOCION",
  "INGRESO_PREDIO",
  "EGRESO_PREDIO",
  "OTRO",
];

/*
|--------------------------------------------------------------------------
| SUBIR FOTO
|--------------------------------------------------------------------------
*/

const subirFoto =
  async (req, res) => {
    try {
      const reclamoId =
        Number(
          req.params.reclamoId
        );

      if (
        !Number.isInteger(
          reclamoId
        )
      ) {
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
      Inspector solamente puede
      subir fotos de los reclamos
      que tiene asignados.
      */

      if (
        req.usuario.rol ===
          "inspector" &&
        reclamo.inspectorId !==
          req.usuario.id
      ) {
        return res.status(403).json({
          ok: false,
          mensaje:
            "Este reclamo no está asignado a este inspector",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          ok: false,
          mensaje:
            "Debe seleccionar una fotografía",
        });
      }

      const {
        tipoReferencia =
          "RECLAMO",

        referenciaId,
        descripcion,
      } = req.body;

      if (
        !tiposReferenciaValidos.includes(
          tipoReferencia
        )
      ) {
        return res.status(400).json({
          ok: false,
          mensaje:
            "Tipo de referencia inválido",
        });
      }

      const referenciaNormalizada =
        referenciaId
          ? Number(
              referenciaId
            )
          : null;

      if (
        referenciaId &&
        !Number.isInteger(
          referenciaNormalizada
        )
      ) {
        return res.status(400).json({
          ok: false,
          mensaje:
            "Referencia inválida",
        });
      }

      const ruta =
        obtenerRutaPublicaFoto(
          reclamo.id,
          req.file.filename
        );

      const foto =
        await Foto.create({
          reclamoId:
            reclamo.id,

          subidoPorId:
            req.usuario.id,

          tipoReferencia,

          referenciaId:
            referenciaNormalizada,

          nombreArchivo:
            req.file.filename,

          ruta,

          mimeType:
            req.file.mimetype,

          tamanoBytes:
            req.file.size,

          descripcion:
            descripcion?.trim() ||
            null,

          activo: true,
        });

      await registrarHistorial({
        reclamoId:
          reclamo.id,

        usuarioId:
          req.usuario.id,

        accion:
          "FOTO_AGREGADA",

        descripcion:
          `Fotografía agregada a ${tipoReferencia}`,

        estadoAnterior:
          reclamo.estado,

        estadoNuevo:
          reclamo.estado,
      });

      return res.status(201).json({
        ok: true,

        mensaje:
          "Fotografía guardada correctamente",

        foto,
      });
    } catch (error) {
      console.error(
        "Error subiendo fotografía:",
        error
      );

      return res.status(500).json({
        ok: false,
        mensaje:
          "Error al guardar la fotografía",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| LISTAR FOTOS DEL RECLAMO
|--------------------------------------------------------------------------
*/

const listarFotosReclamo =
  async (req, res) => {
    try {
      const reclamoId =
        Number(
          req.params.reclamoId
        );

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

      if (
        req.usuario.rol ===
          "inspector" &&
        reclamo.inspectorId !==
          req.usuario.id
      ) {
        return res.status(403).json({
          ok: false,
          mensaje:
            "No tiene acceso a las fotografías de este reclamo",
        });
      }

      const where = {
        reclamoId:
          reclamo.id,

        activo: true,
      };

      if (
        req.query.tipoReferencia
      ) {
        where.tipoReferencia =
          req.query.tipoReferencia;
      }

      if (
        req.query.referenciaId
      ) {
        where.referenciaId =
          Number(
            req.query.referenciaId
          );
      }

      const fotos =
        await Foto.findAll({
          where,

          include: [
            {
              model: Usuario,
              as: "subidoPor",
              attributes: [
                "id",
                "nombre",
              ],
            },
          ],

          order: [
            ["createdAt", "ASC"],
          ],
        });

      return res.json({
        ok: true,
        fotos,
      });
    } catch (error) {
      console.error(
        "Error obteniendo fotos:",
        error
      );

      return res.status(500).json({
        ok: false,
        mensaje:
          "Error al obtener las fotografías",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| ANULAR FOTO
|--------------------------------------------------------------------------
*/

const anularFoto =
  async (req, res) => {
    try {
      const foto =
        await Foto.findByPk(
          req.params.id
        );

      if (!foto) {
        return res.status(404).json({
          ok: false,
          mensaje:
            "Fotografía no encontrada",
        });
      }

      if (!foto.activo) {
        return res.status(400).json({
          ok: false,
          mensaje:
            "La fotografía ya está anulada",
        });
      }

      const {
        motivo,
      } = req.body;

      if (!motivo?.trim()) {
        return res.status(400).json({
          ok: false,
          mensaje:
            "Debe indicar el motivo de la anulación",
        });
      }

      foto.activo = false;

      foto.fechaAnulacion =
        new Date();

      foto.motivoAnulacion =
        motivo.trim();

      foto.anuladoPorId =
        req.usuario.id;

      await foto.save();

      const reclamo =
        await Reclamo.findByPk(
          foto.reclamoId
        );

      if (reclamo) {
        await registrarHistorial({
          reclamoId:
            reclamo.id,

          usuarioId:
            req.usuario.id,

          accion:
            "FOTO_ANULADA",

          descripcion:
            `Fotografía anulada: ${motivo.trim()}`,

          estadoAnterior:
            reclamo.estado,

          estadoNuevo:
            reclamo.estado,
        });
      }

      return res.json({
        ok: true,
        mensaje:
          "Fotografía anulada correctamente",
      });
    } catch (error) {
      console.error(
        "Error anulando fotografía:",
        error
      );

      return res.status(500).json({
        ok: false,
        mensaje:
          "Error al anular la fotografía",
      });
    }
  };

module.exports = {
  subirFoto,
  listarFotosReclamo,
  anularFoto,
};