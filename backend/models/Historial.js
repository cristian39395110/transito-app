const { DataTypes } = require("sequelize");

const sequelize = require(
  "../config/database"
);

const Historial = sequelize.define(
  "Historial",
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

    usuarioId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    accion: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    estadoAnterior: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },

    estadoNuevo: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },

    fecha: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue:
        DataTypes.NOW,
    },
  },
  {
    tableName: "historial",
    timestamps: true,

    indexes: [
      {
        fields: ["reclamoId"],
      },
      {
        fields: ["fecha"],
      },
    ],
  }
);

module.exports = Historial;