const {
  DataTypes,
} = require("sequelize");

const sequelize =
  require("../config/database");

const TipoReclamo =
  sequelize.define(
    "TipoReclamo",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      nombre: {
        type: DataTypes.STRING(150),
        allowNull: false,
        unique: true,
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
      tableName:
        "tipos_reclamo",

      timestamps: true,
    }
  );

module.exports = TipoReclamo;