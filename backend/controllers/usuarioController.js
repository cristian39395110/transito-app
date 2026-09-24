const bcrypt = require("bcryptjs");

const {
  Usuario,
  Rol,
} = require("../models");

/*
|--------------------------------------------------------------------------
| LISTAR USUARIOS
|--------------------------------------------------------------------------
*/

const listarUsuarios = async (
  req,
  res
) => {
  try {
    const usuarios =
      await Usuario.findAll({
        attributes: {
          exclude: ["password"],
        },

        include: [
          {
            model: Rol,
            as: "rol",
            attributes: [
              "id",
              "nombre",
              "descripcion",
            ],
          },
        ],

        order: [
          ["nombre", "ASC"],
        ],
      });

    return res.json({
      ok: true,
      usuarios,
    });
  } catch (error) {
    console.error(
      "Error listando usuarios:",
      error
    );

    return res.status(500).json({
      ok: false,
      mensaje:
        "Error al obtener los usuarios",
    });
  }
};

/*
|--------------------------------------------------------------------------
| CREAR USUARIO
|--------------------------------------------------------------------------
*/

const crearUsuario = async (
  req,
  res
) => {
  try {
    const {
      nombre,
      usuario,
      password,
      rolId,
    } = req.body;

    if (
      !nombre ||
      !usuario ||
      !password ||
      !rolId
    ) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "Nombre, usuario, contraseña y rol son obligatorios",
      });
    }

    const rol =
      await Rol.findByPk(rolId);

    if (!rol || !rol.activo) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "El rol seleccionado no es válido",
      });
    }

    const existente =
      await Usuario.findOne({
        where: {
          usuario,
        },
      });

    if (existente) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "Ese nombre de usuario ya existe",
      });
    }

    const passwordHash =
      await bcrypt.hash(
        password,
        10
      );

    const nuevoUsuario =
      await Usuario.create({
        nombre,
        usuario,
        password: passwordHash,
        rolId,
        activo: true,
      });

    return res.status(201).json({
      ok: true,
      mensaje:
        "Usuario creado correctamente",

      usuario: {
        id: nuevoUsuario.id,
        nombre:
          nuevoUsuario.nombre,
        usuario:
          nuevoUsuario.usuario,
        rolId:
          nuevoUsuario.rolId,
        activo:
          nuevoUsuario.activo,
      },
    });
  } catch (error) {
    console.error(
      "Error creando usuario:",
      error
    );

    return res.status(500).json({
      ok: false,
      mensaje:
        "Error al crear el usuario",
    });
  }
};

/*
|--------------------------------------------------------------------------
| ACTUALIZAR USUARIO
|--------------------------------------------------------------------------
*/

const actualizarUsuario = async (
  req,
  res
) => {
  try {
    const {
      id,
    } = req.params;

    const {
      nombre,
      usuario,
      password,
      rolId,
      activo,
    } = req.body;

    const usuarioEncontrado =
      await Usuario.findByPk(id);

    if (!usuarioEncontrado) {
      return res.status(404).json({
        ok: false,
        mensaje:
          "Usuario no encontrado",
      });
    }

    if (nombre !== undefined) {
      usuarioEncontrado.nombre =
        nombre;
    }

    if (usuario !== undefined) {
      const usuarioDuplicado =
        await Usuario.findOne({
          where: {
            usuario,
          },
        });

      if (
        usuarioDuplicado &&
        usuarioDuplicado.id !==
          usuarioEncontrado.id
      ) {
        return res.status(400).json({
          ok: false,
          mensaje:
            "Ese nombre de usuario ya existe",
        });
      }

      usuarioEncontrado.usuario =
        usuario;
    }

    if (rolId !== undefined) {
      const rol =
        await Rol.findByPk(rolId);

      if (!rol || !rol.activo) {
        return res.status(400).json({
          ok: false,
          mensaje:
            "El rol seleccionado no es válido",
        });
      }

      usuarioEncontrado.rolId =
        rolId;
    }

    if (activo !== undefined) {
      usuarioEncontrado.activo =
        Boolean(activo);
    }

    if (
      password &&
      password.trim() !== ""
    ) {
      usuarioEncontrado.password =
        await bcrypt.hash(
          password,
          10
        );
    }

    await usuarioEncontrado.save();

    return res.json({
      ok: true,
      mensaje:
        "Usuario actualizado correctamente",
    });
  } catch (error) {
    console.error(
      "Error actualizando usuario:",
      error
    );

    return res.status(500).json({
      ok: false,
      mensaje:
        "Error al actualizar el usuario",
    });
  }
};

/*
|--------------------------------------------------------------------------
| LISTAR ROLES
|--------------------------------------------------------------------------
*/

const listarRoles = async (
  req,
  res
) => {
  try {
    const roles =
      await Rol.findAll({
        where: {
          activo: true,
        },

        order: [
          ["id", "ASC"],
        ],
      });

    return res.json({
      ok: true,
      roles,
    });
  } catch (error) {
    console.error(
      "Error listando roles:",
      error
    );

    return res.status(500).json({
      ok: false,
      mensaje:
        "Error al obtener los roles",
    });
  }
};

module.exports = {
  listarUsuarios,
  crearUsuario,
  actualizarUsuario,
  listarRoles,
};