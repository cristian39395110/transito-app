referenciaTemporal: {
  type: DataTypes.STRING(100),
  allowNull: true,
},  agregar a foto en el vps de transito

indexe agregar  
  {
    fields: ["referenciaTemporal"],
  },



  USE transito_db;

ALTER TABLE fotos
ADD COLUMN referenciaTemporal VARCHAR(100) NULL
AFTER referenciaId;

CREATE INDEX idx_fotos_referencia_temporal
ON fotos (referenciaTemporal);


ALTER TABLE asignaciones
  ADD COLUMN vehiculoId INT NULL AFTER reclamoId,
  ADD COLUMN infraccionId INT NULL AFTER vehiculoId;

CREATE INDEX idx_asignaciones_vehiculoId
  ON asignaciones (vehiculoId);

CREATE INDEX idx_asignaciones_infraccionId
  ON asignaciones (infraccionId);




  ALTER TABLE usuarios
ADD COLUMN email VARCHAR(160) NULL AFTER password;

ALTER TABLE usuarios
ADD UNIQUE INDEX uq_usuarios_email (email);