const { DataTypes } = require("sequelize");

const sequelize = require(
  "../config/database"
);

const Predio = sequelize.define(
  "Predio",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    nombre: {
      type: DataTypes.STRING(120),
      allowNull: false,
      unique: true,
    },

    direccion: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: "predios",
    timestamps: true,
  }
);

module.exports = Predio;