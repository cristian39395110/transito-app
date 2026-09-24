const express = require("express");

const {
  crearEmplazamiento,
  listarEmplazamientos,
} = require(
  "../controllers/emplazamientoController"
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

router.post(
  "/",
  permitirRoles(
    "administrador",
    "inspector"
  ),
  crearEmplazamiento
);

router.get(
  "/",
  permitirRoles(
    "administrador",
    "director",
    "jefe_guardia",
    "inspector",
    "secretaria_reclamos"
  ),
  listarEmplazamientos
);

module.exports = router;