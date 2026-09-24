const express =
  require("express");

const {
  listarExpedientes,
  crearExpedienteManual,
} = require(
  "../controllers/expedienteController"
);

const {
  verificarToken,
  permitirRoles,
} = require(
  "../middleware/authMiddleware"
);

const router =
  express.Router();

/*
|--------------------------------------------------------------------------
| TODAS LAS RUTAS REQUIEREN LOGIN
|--------------------------------------------------------------------------
*/

router.use(
  verificarToken
);

/*
|--------------------------------------------------------------------------
| EXPEDIENTES
|--------------------------------------------------------------------------
|
| Es archivo/consulta.
|
| No modifica ninguna actuación.
|
*/

router.get(
  "/",
  permitirRoles(
    "administrador",
    "director",
    "jefe_guardia",
    "inspector",
    "secretaria_reclamos",
    "secretaria_predio"
  ),
  listarExpedientes
);
/*
|--------------------------------------------------------------------------
| CARGA MANUAL DE EXPEDIENTE
|--------------------------------------------------------------------------
|
| Para vehículos/documentación anteriores
| a la implementación del sistema.
|
| No crea un reclamo falso.
|
*/

router.post(
  "/carga-manual",
  permitirRoles(
    "administrador",
    "secretaria_reclamos"
  ),
  crearExpedienteManual
);
module.exports =
  router;