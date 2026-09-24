const express =
  require("express");

const {
  listarTipos,
  crearTipo,
  actualizarTipo,
} = require(
  "../controllers/tipoReclamoController"
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
| TODAS REQUIEREN LOGIN
|--------------------------------------------------------------------------
*/

router.use(
  verificarToken
);

/*
|--------------------------------------------------------------------------
| LISTAR
|--------------------------------------------------------------------------
|
| Todos estos roles necesitan poder leer
| el catálogo porque distintos formularios
| pueden mostrar el tipo del reclamo.
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
  listarTipos
);

/*
|--------------------------------------------------------------------------
| CREAR
|--------------------------------------------------------------------------
|
| Solamente administrador.
|
*/

router.post(
  "/",
  permitirRoles(
    "administrador"
  ),
  crearTipo
);

/*
|--------------------------------------------------------------------------
| EDITAR / ACTIVAR / DESACTIVAR
|--------------------------------------------------------------------------
|
| Solamente administrador.
|
*/

router.put(
  "/:id",
  permitirRoles(
    "administrador"
  ),
  actualizarTipo
);

module.exports = router;