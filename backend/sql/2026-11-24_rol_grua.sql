-- ---------------------------------------------------------------------------
-- ROL GRÚA
-- ---------------------------------------------------------------------------
--
-- Ejecutar UNA vez en cada base (local y producción) ANTES de subir el código.
--
-- 1) Agrega la opción RETIRO_GRUA a infracciones.accionPosterior.
--    Solo agrega un valor al final de la lista: no modifica datos existentes.
--
-- 2) Crea el rol "grua". El backend también lo crea solo al iniciar
--    (inicializacionService), así que esto es opcional.
--
-- ---------------------------------------------------------------------------

ALTER TABLE `infracciones`
  MODIFY `accionPosterior` ENUM(
    'ESPERAR_RESPONSABLE',
    'MUNICIPALIDAD',
    'OTRA_ACTUACION',
    'RETIRO_INMEDIATO',
    'BUSQUEDA_REMOCION',
    'RETIRO_GRUA'
  ) DEFAULT NULL;

INSERT INTO `roles` (`nombre`, `descripcion`, `activo`, `createdAt`, `updatedAt`)
SELECT
  'grua',
  'Grúa: retira vehículos con Acta de Infracción listos para llevar al predio',
  1,
  NOW(),
  NOW()
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `roles` WHERE `nombre` = 'grua'
);

-- ---------------------------------------------------------------------------
-- VOLVER ATRÁS (solo si no hay ninguna infracción con RETIRO_GRUA)
-- ---------------------------------------------------------------------------
--
-- SELECT COUNT(*) FROM infracciones WHERE accionPosterior = 'RETIRO_GRUA';
--
-- ALTER TABLE `infracciones`
--   MODIFY `accionPosterior` ENUM(
--     'ESPERAR_RESPONSABLE',
--     'MUNICIPALIDAD',
--     'OTRA_ACTUACION',
--     'RETIRO_INMEDIATO',
--     'BUSQUEDA_REMOCION'
--   ) DEFAULT NULL;
