const express =
  require("express");

const {
  obtenerResumen,
} = require(
  "../controllers/notificacionController"
);

const {
  verificarToken,
} = require(
  "../middleware/authMiddleware"
);

const router =
  express.Router();

router.use(
  verificarToken
);

router.get(
  "/resumen",
  obtenerResumen
);

module.exports =
  router;