const {
  DataTypes,
} = require("sequelize");

const sequelize = require(
  "../config/database"
);

const Acta = sequelize.define(
  "Acta",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

  inspectorId: {
  type: DataTypes.INTEGER,
  allowNull: true,
},

    /*
    Opcional.

    Solo se completa cuando la
    actuación está relacionada
    con un vehículo.
    */
    vehiculoId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    /*
    Si podemos relacionarla con
    una constatación concreta,
    queda guardada acá.

    No es obligatorio porque
    mantenemos compatibilidad
    con actuaciones anteriores.
    */
    constatacionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

  
    /*
    Número REAL del formulario
    físico.

    Ejemplo:
    C 0011859
    A 00020123
    */
    numeroActa: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },

    tipo: {
      type: DataTypes.ENUM(
        "VIA_PUBLICA",
        "INFRACCION"
      ),

      allowNull: false,
    },

    fechaHora: {
      type: DataTypes.DATE,
      allowNull: true,

      defaultValue:
        DataTypes.NOW,
    },

    lugar: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    /*
    Indica si efectivamente
    alguien atendió al inspector.
    */
    personaEncontrada: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    /*
    No es obligatorio identificar
    a la persona.
    */
    atendidoPor: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },

    /*
    Ej:
    propietario
    encargado
    vecino
    denunciante
    otro
    */
    caracterAtendido: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    /*
    Qué se encontró realmente
    en la vía pública.
    */
    situacion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    cantidad: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },

    /*
    Se mantiene por compatibilidad
    con lo que ya teníamos.

    El valor siempre queda expresado
    en horas.
    */
    plazoHoras: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    anulada: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    motivoAnulacion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "actas",

    timestamps: true,

    indexes: [
      {
        fields: [
          "numeroActa",
        ],
      },

      {
        fields: [
          "reclamoId",
        ],
      },

      {
        fields: [
          "vehiculoId",
        ],
      },

      {
        fields: [
          "tipo",
        ],
      },
    ],
  }
);

module.exports = Acta;