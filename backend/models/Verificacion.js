const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Verificacion = sequelize.define(
  "Verificacion",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    reclamoId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
        asignacionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    emplazamientoId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    inspectorId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    vehiculoId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    resultado: {
      type: DataTypes.ENUM(
        "CUMPLIDO",
        "PRORROGA",
        "NO_CUMPLIDO",
        "NO_SE_ENCUENTRA",
        "NO_SE_PUDO_VERIFICAR",
        "PARCIAL",
        "OTRO"
      ),
      allowNull: false,
    },

    situacion: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    fechaHora: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

   latitudActual: {
  type: DataTypes.DECIMAL(10, 7),
  allowNull: true,
},

longitudActual: {
  type: DataTypes.DECIMAL(10, 7),
  allowNull: true,
},

    precisionGps: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "verificaciones",
    timestamps: true,

    indexes: [
      {
        fields: ["reclamoId"],
      },
      {
        fields: ["inspectorId"],
      },
      {
        fields: ["emplazamientoId"],
      },
            {
        fields: ["asignacionId"],
      },
    ],
  }
);

module.exports = Verificacion;