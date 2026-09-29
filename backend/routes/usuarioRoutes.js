const express = require("express");

const {
  listarUsuarios,
  crearUsuario,
  actualizarUsuario,
  listarRoles,
    obtenerMiCuenta,
     eliminarUsuario,
  actualizarMiCuenta,
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
  permitirRoles(
    "administrador",
    "superadmin"
  ),
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
    "superadmin",
    "administrador",
    "director",
    "jefe_guardia",
    "secretaria_reclamos"
  ),
  listarUsuarios
);
router.post(
  "/",
  permitirRoles(
    "superadmin",
    "administrador"
  ),
  crearUsuario
);

/*
|--------------------------------------------------------------------------
| MI CUENTA
|--------------------------------------------------------------------------
| Cualquier usuario autenticado puede consultar
| y modificar solamente su propia cuenta.
*/

router.get(
  "/mi-cuenta",
  obtenerMiCuenta
);

router.put(
  "/mi-cuenta",
  actualizarMiCuenta
);

router.put(
  "/:id",
  permitirRoles(
    "superadmin",
    "administrador"
  ),
  actualizarUsuario
);

router.delete(
  "/:id",
  permitirRoles(
    "superadmin",
    "administrador"
  ),
  eliminarUsuario
);

module.exports = router;