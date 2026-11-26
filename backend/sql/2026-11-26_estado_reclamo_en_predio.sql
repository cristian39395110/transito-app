-- ---------------------------------------------------------------------------
-- RECLAMOS CON ESTADO VACÍO DESPUÉS DEL INGRESO AL PREDIO
-- ---------------------------------------------------------------------------
--
-- Al confirmar un ingreso al predio (o recibir un traslado entre predios)
-- el backend intentaba guardar reclamos.estado = 'EN_PREDIO', un valor que
-- NO existe en esa columna. MySQL (sin modo estricto) lo guardaba vacío ('').
--
-- El código ya está corregido: ahora guarda 'EN_SEGUIMIENTO', igual que la
-- carga manual cuando el vehículo está en el predio. La etapa (etapaActual
-- = 'EN_PREDIO') sigue siendo la que indica que el vehículo está en el predio.
--
-- Este script corrige los reclamos que ya quedaron vacíos.
-- Se puede ejecutar más de una vez: solo toca los que siguen vacíos.
--
-- ---------------------------------------------------------------------------

-- Ver cuáles hay (antes):
-- SELECT id, numeroReclamo, estado, etapaActual FROM reclamos WHERE estado = '';

UPDATE `reclamos`
SET `estado` = 'EN_SEGUIMIENTO'
WHERE `estado` = ''
  AND `etapaActual` = 'EN_PREDIO';

-- Si quedara alguno vacío con otra etapa, revisarlo a mano:
-- SELECT id, numeroReclamo, estado, etapaActual FROM reclamos WHERE estado = '';
