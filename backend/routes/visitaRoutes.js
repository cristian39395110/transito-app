const express =
  require("express");

const {
  registrarVisita,
  obtenerPrimeraVisita,
  editarPrimeraVisita,
} = require(
  "../controllers/visitaController"
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
| REGISTRAR PRIMERA VISITA
|--------------------------------------------------------------------------
*/

router.post(
  "/",
  permitirRoles(
    "administrador",
    "inspector"
  ),
  registrarVisita
);


/*
|--------------------------------------------------------------------------
| OBTENER PRIMERA VISITA
|--------------------------------------------------------------------------
|
| Sirve para:
|
| - saber si la visita ya fue realizada
| - mostrar lo registrado
| - saber si todavía puede editarse
|
*/

router.get(
  "/primera/:reclamoId",
  permitirRoles(
    "administrador",
    "director",
    "jefe_guardia",
    "inspector",
    "secretaria_reclamos"
  ),
  obtenerPrimeraVisita
);


/*
|--------------------------------------------------------------------------
| EDITAR PRIMERA VISITA
|--------------------------------------------------------------------------
|
| El inspector solamente puede editar
| durante 60 minutos desde que registró
| la visita.
|
*/

router.put(
  "/primera/:reclamoId",
  permitirRoles(
    "administrador",
    "inspector"
  ),
  editarPrimeraVisita
);


module.exports =
  router;