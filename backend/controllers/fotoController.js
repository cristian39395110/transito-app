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

const {
  reclamoTieneRetiroGruaPendiente,
} = require(
  "../services/gruaService"
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

      /*
      Grúa solamente puede subir fotos
      de la remoción de un vehículo que
      está listo para retirar con grúa.
      */

      /*
      Si la grúa tomó la segunda visita de este
      reclamo, trabaja como un inspector:
      puede subir cualquier foto de la visita.
      */

      const gruaTieneLaVisita =
        req.usuario.rol ===
          "grua" &&
        Number(
          reclamo.inspectorId
        ) ===
          Number(req.usuario.id);

      if (
        req.usuario.rol ===
          "grua" &&
        !gruaTieneLaVisita
      ) {
        const tieneRetiro =
          await reclamoTieneRetiroGruaPendiente(
            reclamo.id
          );

        if (
          !tieneRetiro ||
          req.body?.tipoReferencia !==
            "REMOCION"
        ) {
          return res.status(403).json({
            ok: false,
            mensaje:
              "Solo podés subir fotos de un vehículo listo para retirar con grúa",
          });
        }
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
  referenciaTemporal,
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
      const referenciaTemporalNormalizada =
  referenciaTemporal
    ? String(
        referenciaTemporal
      ).trim()
    : null;

if (
  referenciaTemporalNormalizada &&
  referenciaTemporalNormalizada.length >
    100
) {
  return res.status(400).json({
    ok: false,
    mensaje:
      "La referencia temporal es demasiado larga",
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

            referenciaTemporal:
  referenciaTemporalNormalizada,


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

      if (
        req.usuario.rol ===
          "grua" &&
        Number(
          reclamo.inspectorId
        ) !==
          Number(req.usuario.id) &&
        !(await reclamoTieneRetiroGruaPendiente(
          reclamo.id
        ))
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

      if (
  req.query.referenciaTemporal
) {
  where.referenciaTemporal =
    String(
      req.query.referenciaTemporal
    ).trim();
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

      /*
      Grúa solamente puede anular
      las fotos que subió ella misma.
      */

      if (
        req.usuario.rol ===
          "grua" &&
        Number(foto.subidoPorId) !==
          Number(req.usuario.id)
      ) {
        return res.status(403).json({
          ok: false,
          mensaje:
            "Solo podés anular fotos que subiste vos",
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