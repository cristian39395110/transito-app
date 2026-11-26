const express =
  require("express");

const {
  listarRetirosPendientes,
  listarConOrdenParaGrua,
  mandarAGruaConOrden,
  listarSegundasVisitas,
  tomarSegundaVisita,
} = require(
  "../controllers/gruaController"
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
| VEHÍCULOS LISTOS PARA RETIRAR
|--------------------------------------------------------------------------
*/

router.get(
  "/retiros",

  permitirRoles(
    "administrador",
    "director",
    "jefe_guardia",
    "grua"
  ),

  listarRetirosPendientes
);

/*
|--------------------------------------------------------------------------
| SEGUNDAS VISITAS QUE PUEDE HACER LA GRÚA
|--------------------------------------------------------------------------
*/

router.get(
  "/segundas-visitas",

  permitirRoles(
    "administrador",
    "grua"
  ),

  listarSegundasVisitas
);

router.post(
  "/segundas-visitas/:reclamoId/tomar",

  permitirRoles(
    "grua"
  ),

  tomarSegundaVisita
);

/*
|--------------------------------------------------------------------------
| DESPUÉS DE LA ORDEN DEL JUEZ
|--------------------------------------------------------------------------
|
| El controlador valida además la etapa del reclamo
| y que el usuario sea el responsable actual.
|
*/

router.get(
  "/reclamos/:reclamoId/con-orden",

  permitirRoles(
    "administrador",
    "director",
    "jefe_guardia",
    "inspector"
  ),

  listarConOrdenParaGrua
);

router.post(
  "/reclamos/:reclamoId/enviar-con-orden",

  permitirRoles(
    "administrador",
    "director",
    "jefe_guardia",
    "inspector"
  ),

  mandarAGruaConOrden
);

module.exports =
  router;
