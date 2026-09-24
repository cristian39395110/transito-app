const bcrypt = require("bcryptjs");

const {
  Rol,
  Usuario,
} = require("../models");

const crearRolesIniciales = async () => {
  const roles = [
    {
      nombre: "administrador",
      descripcion:
        "Control total del sistema",
    },
    {
      nombre: "director",
      descripcion:
        "Director o jefe general",
    },
    {
      nombre: "jefe_guardia",
      descripcion:
        "Jefe de guardia",
    },
    {
      nombre: "inspector",
      descripcion:
        "Inspector de vía pública",
    },
    {
      nombre: "secretaria_reclamos",
      descripcion:
        "Secretaría encargada de reclamos y actuaciones",
    },
    {
      nombre: "secretaria_predio",
      descripcion:
        "Secretaría encargada del predio y egreso de vehículos",
    },
  ];

  for (const datos of roles) {
    await Rol.findOrCreate({
      where: {
        nombre: datos.nombre,
      },
      defaults: datos,
    });
  }
};

const crearAdministradorInicial =
  async () => {
    const rolAdministrador =
      await Rol.findOne({
        where: {
          nombre: "administrador",
        },
      });

    if (!rolAdministrador) {
      throw new Error(
        "No existe el rol administrador"
      );
    }

    const existente =
      await Usuario.findOne({
        where: {
          usuario: "admin",
        },
      });

    if (existente) {
      return;
    }

    const passwordHash =
      await bcrypt.hash(
        "admin123",
        10
      );

    await Usuario.create({
      nombre: "Administrador",
      usuario: "admin",
      password: passwordHash,
      rolId: rolAdministrador.id,
      activo: true,
    });

    console.log(
      "Administrador inicial creado"
    );
  };

const inicializarSistema = async () => {
  await crearRolesIniciales();
  await crearAdministradorInicial();
};

module.exports = {
  inicializarSistema,
};