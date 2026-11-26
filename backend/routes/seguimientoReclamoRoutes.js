const express =
  require("express");

const {
  obtenerSeguimientoReclamo,
} = require(
  "../controllers/seguimientoReclamoController"
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

router.get(
  "/:id",
  permitirRoles(
    "administrador",
    "director",
    "jefe_guardia",
    "inspector",
    "secretaria_reclamos",
    "secretaria_predio",
    "grua"
  ),
  obtenerSeguimientoReclamo
);

module.exports =
  router;