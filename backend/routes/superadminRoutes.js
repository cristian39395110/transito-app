const express =
  require("express");

const {
  reiniciarDatosPrueba,
  eliminarReclamoCompleto,
} = require(
  "../controllers/superadminController"
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
| REINICIAR TODOS LOS DATOS
|--------------------------------------------------------------------------
*/

router.delete(
  "/datos-prueba",
  permitirRoles(
    "superadmin"
  ),
  reiniciarDatosPrueba
);

/*
|--------------------------------------------------------------------------
| ELIMINAR UN SOLO RECLAMO COMPLETO
|--------------------------------------------------------------------------
*/

router.delete(
  "/reclamos/:id",
  permitirRoles(
    "superadmin"
  ),
  eliminarReclamoCompleto
);

module.exports =
  router;