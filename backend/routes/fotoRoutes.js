const express = require("express");

const {
  subirFoto,
  listarFotosReclamo,
  anularFoto,
} = require(
  "../controllers/fotoController"
);

const {
  verificarToken,
  permitirRoles,
} = require(
  "../middleware/authMiddleware"
);

const {
  uploadFoto,
} = require(
  "../middleware/uploadFotoMiddleware"
);

const router =
  express.Router();

router.use(
  verificarToken
);

/*
|--------------------------------------------------------------------------
| SUBIR FOTO
|--------------------------------------------------------------------------
*/

router.post(
  "/reclamos/:reclamoId",
  permitirRoles(
    "administrador",
    "inspector",
    "secretaria_predio",
    "secretaria_reclamos",
  ),
  uploadFoto.single("foto"),
  subirFoto
);

/*
|--------------------------------------------------------------------------
| FOTOS DEL RECLAMO
|--------------------------------------------------------------------------
*/

router.get(
  "/reclamos/:reclamoId",
  permitirRoles(
    "administrador",
    "director",
    "jefe_guardia",
    "inspector",
    "secretaria_reclamos",
    "secretaria_predio"
  ),
  listarFotosReclamo
);

/*
|--------------------------------------------------------------------------
| ANULAR FOTO
|--------------------------------------------------------------------------
*/

router.patch(
  "/:id/anular",
  permitirRoles(
    "administrador",
    "inspector",
    "secretaria_predio"
  ),
  anularFoto
);

module.exports = router;