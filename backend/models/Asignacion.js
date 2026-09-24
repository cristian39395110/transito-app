const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Asignacion = sequelize.define(
  "Asignacion",
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

    tipo: {
      type: DataTypes.ENUM(
        "JEFE_GUARDIA",
        "INSPECTOR"
      ),
      allowNull: false,
    },

    etapa: {
      type: DataTypes.ENUM(
        "PRIMERA_VISITA",
        "SEGUNDA_VISITA",
        "POST_JUZGADO",
        "OTRA_ACTUACION"
      ),
      allowNull: true,
    },

    estadoTarea: {
      type: DataTypes.ENUM(
        "PENDIENTE",
        "EN_CURSO",
        "FINALIZADA",
        "CANCELADA"
      ),
      allowNull: true,
    },

    asignadoAId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    asignadoPorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    fechaAsignacion: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

    fechaFinalizacion: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "asignaciones",
    timestamps: true,
    indexes: [
      {
        fields: ["reclamoId"],
      },
      {
        fields: ["asignadoAId"],
      },
      {
        fields: ["estadoTarea"],
      },
      {
        fields: ["etapa"],
      },
    ],
  }
);

module.exports = Asignacion;