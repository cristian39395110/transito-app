const fs = require("fs");
const path = require("path");

/*
|--------------------------------------------------------------------------
| CARPETA PRINCIPAL
|--------------------------------------------------------------------------
*/

const uploadsRoot = path.join(
  __dirname,
  "..",
  "uploads"
);

const reclamosRoot = path.join(
  uploadsRoot,
  "reclamos"
);

/*
|--------------------------------------------------------------------------
| ASEGURAR CARPETAS
|--------------------------------------------------------------------------
*/

const asegurarCarpeta = (
  carpeta
) => {
  if (
    !fs.existsSync(carpeta)
  ) {
    fs.mkdirSync(
      carpeta,
      {
        recursive: true,
      }
    );
  }

  return carpeta;
};

/*
|--------------------------------------------------------------------------
| CARPETA DE UN RECLAMO
|--------------------------------------------------------------------------
*/

const obtenerCarpetaReclamo = (
  reclamoId
) => {
  asegurarCarpeta(
    reclamosRoot
  );

  const carpeta =
    path.join(
      reclamosRoot,
      String(reclamoId)
    );

  asegurarCarpeta(carpeta);

  return carpeta;
};

/*
|--------------------------------------------------------------------------
| RUTA PÚBLICA
|--------------------------------------------------------------------------
*/

const obtenerRutaPublicaFoto = (
  reclamoId,
  nombreArchivo
) => {
  return `/uploads/reclamos/${reclamoId}/${nombreArchivo}`;
};

module.exports = {
  uploadsRoot,
  reclamosRoot,
  asegurarCarpeta,
  obtenerCarpetaReclamo,
  obtenerRutaPublicaFoto,
};