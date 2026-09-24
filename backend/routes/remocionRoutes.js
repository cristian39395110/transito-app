const express =
  require("express");

const {
  obtenerContextoRemocion,

  registrarInfraccion,
  registrarInventario,
  registrarRemocion,

  registrarRemocionCompleta,
} = require(
  "../controllers/remocionController"
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
| CONTEXTO DE REMOCIÓN
|--------------------------------------------------------------------------
*/

router.get(
  "/contexto/:reclamoId",

  permitirRoles(
    "administrador",
    "inspector"
  ),

  obtenerContextoRemocion
);


/*
|--------------------------------------------------------------------------
| RUTAS EXISTENTES
|--------------------------------------------------------------------------
*/

router.post(
  "/infraccion",

  permitirRoles(
    "administrador",
    "inspector"
  ),

  registrarInfraccion
);


router.post(
  "/inventario",

  permitirRoles(
    "administrador",
    "inspector"
  ),

  registrarInventario
);


router.post(
  "/",

  permitirRoles(
    "administrador",
    "inspector"
  ),

  registrarRemocion
);


/*
|--------------------------------------------------------------------------
| INVENTARIO + REMOCIÓN
|--------------------------------------------------------------------------
*/

router.post(
  "/completa",

  permitirRoles(
    "administrador",
    "inspector"
  ),

  registrarRemocionCompleta
);


module.exports =
  router;