const express = require("express");

const {
  listarUsuarios,
  crearUsuario,
  actualizarUsuario,
  listarRoles,
} = require(
  "../controllers/usuarioController"
);

const {
  verificarToken,
  permitirRoles,
} = require(
  "../middleware/authMiddleware"
);

const router = express.Router();

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
| ROLES
|--------------------------------------------------------------------------
*/

router.get(
  "/roles",
  permitirRoles("administrador"),
  listarRoles
);

/*
|--------------------------------------------------------------------------
| USUARIOS
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  permitirRoles(
    "administrador",
    "director",
    "jefe_guardia"
  ),
  listarUsuarios
);

router.post(
  "/",
  permitirRoles("administrador"),
  crearUsuario
);

router.put(
  "/:id",
  permitirRoles("administrador"),
  actualizarUsuario
);

module.exports = router;