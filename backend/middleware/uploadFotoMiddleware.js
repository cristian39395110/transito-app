const multer = require("multer");
const path = require("path");

const {
  obtenerCarpetaReclamo,
} = require(
  "../utils/uploadPaths"
);

/*
|--------------------------------------------------------------------------
| ALMACENAMIENTO
|--------------------------------------------------------------------------
*/

const storage =
  multer.diskStorage({
    destination: (
      req,
      file,
      cb
    ) => {
      try {
        const reclamoId =
          req.params.reclamoId;

        if (!reclamoId) {
          return cb(
            new Error(
              "Falta reclamoId"
            )
          );
        }

        const carpeta =
          obtenerCarpetaReclamo(
            reclamoId
          );

        cb(null, carpeta);
      } catch (error) {
        cb(error);
      }
    },

    filename: (
      req,
      file,
      cb
    ) => {
      const timestamp =
        Date.now();

      const aleatorio =
        Math.round(
          Math.random() *
            1000000000
        );

      let extension;

      switch (
        file.mimetype
      ) {
        case "image/webp":
          extension = ".webp";
          break;

        case "image/jpeg":
          extension = ".jpg";
          break;

        case "image/png":
          extension = ".png";
          break;

        default:
          extension =
            path.extname(
              file.originalname
            ) || "";
      }

      const nombre =
        `foto-${timestamp}-${aleatorio}${extension}`;

      cb(null, nombre);
    },
  });

/*
|--------------------------------------------------------------------------
| VALIDAR TIPO DE ARCHIVO
|--------------------------------------------------------------------------
*/

const fileFilter = (
  req,
  file,
  cb
) => {
  const permitidos = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  if (
    !permitidos.includes(
      file.mimetype
    )
  ) {
    return cb(
      new Error(
        "Solo se permiten imágenes JPG, PNG o WebP"
      )
    );
  }

  cb(null, true);
};

/*
|--------------------------------------------------------------------------
| MULTER
|--------------------------------------------------------------------------
*/

const uploadFoto =
  multer({
    storage,

    fileFilter,

    limits: {
      fileSize:
        5 * 1024 * 1024,
    },
  });

module.exports = {
  uploadFoto,
};