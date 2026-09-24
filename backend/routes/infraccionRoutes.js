const express = require("express");

const {
  enviarAlJuzgado,
  registrarRespuestaJuzgado,
  solicitarOrdenRemocion,
  registrarRespuestaOrdenRemocion,
} = require("../controllers/infraccionController");

const {
  verificarToken,
  permitirRoles,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(verificarToken);

// Secretaría registra que el Acta de Infracción
// fue enviada al Juzgado.
router.patch(
  "/:id/enviar-juzgado",
  permitirRoles(
    "administrador",
    "secretaria_reclamos"
  ),
  enviarAlJuzgado
);

// Secretaría recibe la respuesta / OK del Juzgado.
router.patch(
  "/:id/respuesta-juzgado",
  permitirRoles(
    "administrador",
    "secretaria_reclamos"
  ),
  registrarRespuestaJuzgado
);

// Secretaría registra que pidió al Juzgado
// la orden para retirar el vehículo.
router.patch(
  "/:id/solicitar-orden-remocion",
  permitirRoles(
    "administrador",
    "secretaria_reclamos"
  ),
  solicitarOrdenRemocion
);

// Secretaría registra la respuesta del Juzgado
// sobre la orden para retirar el vehículo.
router.patch(
  "/:id/respuesta-orden-remocion",
  permitirRoles(
    "administrador",
    "secretaria_reclamos"
  ),
  registrarRespuestaOrdenRemocion
);

module.exports = router;