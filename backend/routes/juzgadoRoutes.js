const express =
  require("express");

const {
  listarJuzgado,
} = require(
  "../controllers/juzgadoController"
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
| BANDEJA DE SECRETARÍA
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  permitirRoles(
    "administrador",
    "secretaria_reclamos"
  ),
  listarJuzgado
);

module.exports =
  router;