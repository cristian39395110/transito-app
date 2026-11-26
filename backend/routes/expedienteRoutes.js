const express =
  require("express");

const {
  listarExpedientes,
  crearExpedienteManual,
  obtenerExpedienteManual,
  actualizarExpedienteManual
} = require("../controllers/expedienteController");

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


// Consultar expediente histórico para corregir sus datos
router.get(
  "/carga-manual/:id",
  permitirRoles(
    "administrador",
    "secretaria_reclamos"
  ),
  obtenerExpedienteManual
);

// Guardar correcciones sin alterar movimientos del vehículo
router.put(
  "/carga-manual/:id",
  permitirRoles(
    "administrador",
    "secretaria_reclamos"
  ),
  actualizarExpedienteManual
);
module.exports =
  router;