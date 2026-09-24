const express =
  require("express");

const {
  registrarSegundaVisita,
  obtenerSegundaVisita,
  editarSegundaVisita,
} = require(
  "../controllers/verificacionController"
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
| REGISTRAR NUEVO CONTROL
|--------------------------------------------------------------------------
*/

router.post(
  "/segunda-visita/:reclamoId",
  permitirRoles(
    "administrador",
    "inspector"
  ),
  registrarSegundaVisita
);


/*
|--------------------------------------------------------------------------
| VER CONTROL REGISTRADO
|--------------------------------------------------------------------------
*/

router.get(
  "/segunda-visita/:reclamoId",
  permitirRoles(
    "administrador",
    "inspector"
  ),
  obtenerSegundaVisita
);


/*
|--------------------------------------------------------------------------
| CORREGIR CONTROL REGISTRADO
|--------------------------------------------------------------------------
*/

router.put(
  "/segunda-visita/:reclamoId",
  permitirRoles(
    "administrador",
    "inspector"
  ),
  editarSegundaVisita
);


module.exports =
  router;