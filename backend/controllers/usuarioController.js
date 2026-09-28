const bcrypt = require("bcryptjs");

const {
  Op,
} = require("sequelize");

const {
  Usuario,
  Rol,
} = require("../models");

/*
|--------------------------------------------------------------------------
| UTILIDADES SUPERADMIN
|--------------------------------------------------------------------------
*/

const obtenerNombreRolUsuario = (
  req
) => {
  return String(
    req.usuario?.rol || ""
  )
    .trim()
    .toLowerCase();
};

const esSuperadminRequest = (
  req
) => {
  return (
    obtenerNombreRolUsuario(req) ===
    "superadmin"
  );
};

const esRolSuperadmin = (
  rol
) => {
  return (
    String(
      rol?.nombre || ""
    )
      .trim()
      .toLowerCase() ===
    "superadmin"
  );
};

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
    const esSuperadmin =
      esSuperadminRequest(req);

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

            ...(
              !esSuperadmin
                ? {
                    where: {
                      nombre: {
                        [Op.ne]:
                          "superadmin",
                      },
                    },
                  }
                : {}
            ),
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
      await Rol.findByPk(
        rolId
      );

    if (
      !rol ||
      !rol.activo
    ) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "El rol seleccionado no es válido",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | PROTECCIÓN SUPERADMIN
    |--------------------------------------------------------------------------
    |
    | Nadie puede crear otro superadmin desde esta API.
    | Ni siquiera otro superadmin.
    |
    | El superadmin principal se crea manualmente/controladamente.
    |
    */

    if (
      esRolSuperadmin(rol)
    ) {
      return res.status(403).json({
        ok: false,
        mensaje:
          "El rol superadmin no puede asignarse desde la administración de usuarios",
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
        password:
          passwordHash,
        rolId,
        activo: true,
      });

    return res.status(201).json({
      ok: true,
      mensaje:
        "Usuario creado correctamente",

      usuario: {
        id:
          nuevoUsuario.id,

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

    /*
    |--------------------------------------------------------------------------
    | BUSCAMOS USUARIO + ROL ACTUAL
    |--------------------------------------------------------------------------
    */

    const usuarioEncontrado =
      await Usuario.findByPk(
        id,
        {
          include: [
            {
              model: Rol,
              as: "rol",

              attributes: [
                "id",
                "nombre",
              ],
            },
          ],
        }
      );

    if (
      !usuarioEncontrado
    ) {
      return res.status(404).json({
        ok: false,
        mensaje:
          "Usuario no encontrado",
      });
    }

    const usuarioObjetivoEsSuperadmin =
      esRolSuperadmin(
        usuarioEncontrado.rol
      );

    const solicitanteEsSuperadmin =
      esSuperadminRequest(req);

    /*
    |--------------------------------------------------------------------------
    | PROTEGER CUENTA SUPERADMIN
    |--------------------------------------------------------------------------
    |
    | Un administrador normal no puede modificar:
    |
    | - nombre
    | - usuario
    | - contraseña
    | - rol
    | - estado activo
    |
    | del superadmin.
    |
    */

    if (
      usuarioObjetivoEsSuperadmin &&
      !solicitanteEsSuperadmin
    ) {
      return res.status(403).json({
        ok: false,
        mensaje:
          "No tiene permisos para modificar este usuario",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | CAMBIO DE ROL
    |--------------------------------------------------------------------------
    */

    if (
      rolId !== undefined
    ) {
      const rol =
        await Rol.findByPk(
          rolId
        );

      if (
        !rol ||
        !rol.activo
      ) {
        return res.status(400).json({
          ok: false,
          mensaje:
            "El rol seleccionado no es válido",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | NADIE PUEDE CONVERTIR UNA CUENTA EN SUPERADMIN
      |--------------------------------------------------------------------------
      */

      if (
        esRolSuperadmin(rol) &&
        !usuarioObjetivoEsSuperadmin
      ) {
        return res.status(403).json({
          ok: false,
          mensaje:
            "El rol superadmin no puede asignarse desde la administración de usuarios",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | EL SUPERADMIN NO PUEDE QUITARSE SU PROPIO ROL DESDE ESTA API
      |--------------------------------------------------------------------------
      */

      if (
        usuarioObjetivoEsSuperadmin &&
        !esRolSuperadmin(rol)
      ) {
        return res.status(403).json({
          ok: false,
          mensaje:
            "No se puede quitar el rol superadmin desde la administración de usuarios",
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | ACTUALIZACIÓN NORMAL
    |--------------------------------------------------------------------------
    */

    if (
      nombre !== undefined
    ) {
      usuarioEncontrado.nombre =
        nombre;
    }

    if (
      usuario !== undefined
    ) {
      const usuarioDuplicado =
        await Usuario.findOne({
          where: {
            usuario,
            id: {
              [Op.ne]:
                usuarioEncontrado.id,
            },
          },
        });

      if (
        usuarioDuplicado
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

    if (
      rolId !== undefined
    ) {
      usuarioEncontrado.rolId =
        rolId;
    }

    if (
      activo !== undefined
    ) {
      /*
      |--------------------------------------------------------------------------
      | NO DESACTIVAR SUPERADMIN
      |--------------------------------------------------------------------------
      */

      if (
        usuarioObjetivoEsSuperadmin &&
        !Boolean(activo)
      ) {
        return res.status(403).json({
          ok: false,
          mensaje:
            "El usuario superadmin no puede ser desactivado",
        });
      }

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
    const esSuperadmin =
      esSuperadminRequest(req);

    const roles =
      await Rol.findAll({
        where: {
          activo: true,

          ...(
            !esSuperadmin
              ? {
                  nombre: {
                    [Op.ne]:
                      "superadmin",
                  },
                }
              : {}
          ),
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