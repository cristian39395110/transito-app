const { DataTypes } = require("sequelize");

const sequelize = require(
  "../config/database"
);

const Vehiculo = sequelize.define(
  "Vehiculo",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    /*
    Número interno que después
    se puede pintar físicamente
    sobre el vehículo.
    */
    numeroInterno: {
      type: DataTypes.INTEGER,
      allowNull: true,
      unique: true,
    },

 reclamoId: {
  type: DataTypes.INTEGER,
  allowNull: true,
},

predioPendienteId: {
  type: DataTypes.INTEGER,
  allowNull: true,
},
origenRegistro: {
  type: DataTypes.ENUM(
    "CIRCUITO_NORMAL",
    "CARGA_HISTORICA"
  ),
  allowNull: false,
  defaultValue: "CIRCUITO_NORMAL",
},
    dominio: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },

    marca: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },

    modelo: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    color: {
      type: DataTypes.STRING(60),
      allowNull: true,
    },

    tipoVehiculo: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },

    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    estadoActual: {
      type: DataTypes.ENUM(
        "EN_VIA_PUBLICA",
        "EMPLAZADO",
        "PENDIENTE_REMOCION",
        "REMOVIDO",
        "PENDIENTE_INGRESO_PREDIO",
        "EN_PREDIO",
        "EGRESADO"
      ),
      allowNull: false,
      defaultValue:
        "EN_VIA_PUBLICA",
    },
  },
  {
    tableName: "vehiculos",
    timestamps: true,

    indexes: [
      {
        fields: ["numeroInterno"],
      },
      {
        fields: ["reclamoId"],
      },
      {
  fields: ["predioPendienteId"],
},
      {
        fields: ["dominio"],
      },
    ],
  }
);

module.exports = Vehiculo;