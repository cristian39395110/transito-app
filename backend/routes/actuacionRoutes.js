
const express = require("express");

const {
  registrarConstatacion,
  registrarActaViaPublica,
  obtenerActuaciones,
} = require(
  "../controllers/actuacionController"
);

const {
  verificarToken,
  permitirRoles,
} = require(
  "../middleware/authMiddleware"
);

const router =
  express.Router();

router.use(
  verificarToken
);

/*
|--------------------------------------------------------------------------
| PRIMERA / NUEVA CONSTATACIÓN
|--------------------------------------------------------------------------
*/

router.post(
  "/reclamos/:id/constatacion",
  permitirRoles(
    "administrador",
    "inspector"
  ),
  registrarConstatacion
);

/*
|--------------------------------------------------------------------------
| ACTA DE VÍA PÚBLICA
|--------------------------------------------------------------------------
*/

router.post(
  "/reclamos/:id/acta-via-publica",
  permitirRoles(
    "administrador",
    "inspector"
  ),
  registrarActaViaPublica
);

/*
|--------------------------------------------------------------------------
| CONSULTAR ACTUACIONES
|--------------------------------------------------------------------------
*/

router.get(
  "/reclamos/:id",
  permitirRoles(
    "administrador",
    "director",
    "jefe_guardia",
    "inspector",
    "secretaria_reclamos"
  ),
  obtenerActuaciones
);

module.exports = router;