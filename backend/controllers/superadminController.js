const fs = require("fs");
const path = require("path");

const {
  sequelize,
  Foto,
  EgresoPredio,
  IngresoPredio,
  Remocion,
  InventarioVehiculo,
  Infraccion,
  Verificacion,
  Emplazamiento,
  Acta,
  Constatacion,
  Historial,
  Asignacion,
  Vehiculo,
  Reclamo,
} = require("../models");

/*
|--------------------------------------------------------------------------
| RUTA BASE DE UPLOADS
|--------------------------------------------------------------------------
*/

const uploadsPath =
  path.resolve(
    __dirname,
    "..",
    "uploads"
  );

/*
|--------------------------------------------------------------------------
| SEGURIDAD DE RUTAS
|--------------------------------------------------------------------------
|
| Verifica que cualquier carpeta que vayamos a borrar
| esté realmente dentro de backend/uploads.
|
*/

const estaDentroDeUploads = (
  rutaArchivo
) => {
  if (!rutaArchivo) {
    return false;
  }

  const rutaResuelta =
    path.resolve(
      rutaArchivo
    );

  return (
    rutaResuelta ===
      uploadsPath ||
    rutaResuelta.startsWith(
      uploadsPath +
        path.sep
    )
  );
};

/*
|--------------------------------------------------------------------------
| LIMPIAR TODO UPLOADS
|--------------------------------------------------------------------------
|
| Se utiliza únicamente cuando el superadmin
| reinicia TODOS los datos de prueba.
|
| La carpeta uploads queda creada.
|
*/

const limpiarUploads = (
  directorio
) => {
  let archivosEliminados =
    0;

  if (
    !fs.existsSync(
      directorio
    )
  ) {
    return archivosEliminados;
  }

  const elementos =
    fs.readdirSync(
      directorio,
      {
        withFileTypes:
          true,
      }
    );

  for (
    const elemento
    of elementos
  ) {
    const rutaCompleta =
      path.join(
        directorio,
        elemento.name
      );

    if (
      elemento.isDirectory()
    ) {
      archivosEliminados +=
        limpiarUploads(
          rutaCompleta
        );

      fs.rmdirSync(
        rutaCompleta
      );

      continue;
    }

    fs.unlinkSync(
      rutaCompleta
    );

    archivosEliminados++;
  }

  return archivosEliminados;
};

/*
|--------------------------------------------------------------------------
| REINICIAR TODOS LOS DATOS DE PRUEBA
|--------------------------------------------------------------------------
|
| ELIMINA:
|
| - fotos
| - egresos de predio
| - ingresos de predio
| - remociones
| - inventarios
| - infracciones
| - verificaciones
| - emplazamientos
| - actas
| - constataciones
| - historial
| - asignaciones
| - vehículos
| - reclamos
|
| CONSERVA:
|
| - usuarios
| - roles
| - tipos de reclamo
| - predios
|
*/

const reiniciarDatosPrueba =
  async (
    req,
    res
  ) => {
    const transaction =
      await sequelize.transaction();

    try {
      const {
        confirmacion,
      } = req.body;

      /*
      |--------------------------------------------------------------------------
      | CONFIRMACIÓN OBLIGATORIA
      |--------------------------------------------------------------------------
      */

      if (
        confirmacion !==
        "REINICIAR DATOS"
      ) {
        await transaction.rollback();

        return res
          .status(400)
          .json({
            ok: false,

            mensaje:
              'Debe escribir exactamente "REINICIAR DATOS"',
          });
      }

      /*
      |--------------------------------------------------------------------------
      | BORRAR DATOS OPERATIVOS
      |--------------------------------------------------------------------------
      |
      | El orden es importante.
      | Primero se eliminan las tablas dependientes.
      |
      */

      await Foto.destroy({
        where: {},
        transaction,
      });

      await EgresoPredio.destroy({
        where: {},
        transaction,
      });

      await IngresoPredio.destroy({
        where: {},
        transaction,
      });

      await Remocion.destroy({
        where: {},
        transaction,
      });

      await InventarioVehiculo.destroy({
        where: {},
        transaction,
      });

      await Infraccion.destroy({
        where: {},
        transaction,
      });

      await Verificacion.destroy({
        where: {},
        transaction,
      });

      await Emplazamiento.destroy({
        where: {},
        transaction,
      });

      await Acta.destroy({
        where: {},
        transaction,
      });

      await Constatacion.destroy({
        where: {},
        transaction,
      });

      await Historial.destroy({
        where: {},
        transaction,
      });

      await Asignacion.destroy({
        where: {},
        transaction,
      });

      await Vehiculo.destroy({
        where: {},
        transaction,
      });

      /*
      |--------------------------------------------------------------------------
      | FINALMENTE RECLAMOS
      |--------------------------------------------------------------------------
      */

      await Reclamo.destroy({
        where: {},
        transaction,
      });

      /*
      |--------------------------------------------------------------------------
      | CONFIRMAR BASE DE DATOS
      |--------------------------------------------------------------------------
      */

      await transaction.commit();

      /*
      |--------------------------------------------------------------------------
      | BORRAR ARCHIVOS FÍSICOS
      |--------------------------------------------------------------------------
      |
      | Esto se hace DESPUÉS del commit.
      |
      | Como estamos reiniciando TODOS los reclamos,
      | se limpia todo el contenido de uploads.
      |
      */

      let fotosEliminadas =
        0;

      let advertencia =
        null;

      try {
        fotosEliminadas =
          limpiarUploads(
            uploadsPath
          );
      } catch (errorFotos) {
        console.error(
          "Base reiniciada, pero hubo un error limpiando uploads:",
          errorFotos
        );

        advertencia =
          "La base fue reiniciada, pero algunos archivos físicos podrían haber quedado en uploads.";
      }

      /*
      |--------------------------------------------------------------------------
      | RESPUESTA
      |--------------------------------------------------------------------------
      */

      return res.json({
        ok: true,

        mensaje:
          "Datos de prueba eliminados correctamente",

        conservado: [
          "Usuarios",
          "Roles",
          "Tipos de reclamo",
          "Predios",
        ],

        fotosEliminadas,

        advertencia,
      });
    } catch (error) {
      /*
      |--------------------------------------------------------------------------
      | ROLLBACK
      |--------------------------------------------------------------------------
      */

      if (
        !transaction.finished
      ) {
        await transaction.rollback();
      }

      console.error(
        "Error reiniciando datos de prueba:",
        error
      );

      return res
        .status(500)
        .json({
          ok: false,

          mensaje:
            "No se pudieron eliminar los datos de prueba. No se completó el reinicio.",
        });
    }
  };

/*
|--------------------------------------------------------------------------
| ELIMINAR UN RECLAMO COMPLETO
|--------------------------------------------------------------------------
|
| Elimina UN SOLO reclamo.
|
| Ejemplo:
|
| reclamoId = 2
|
| Base:
|   elimina solamente todo lo relacionado al reclamo 2.
|
| Disco:
|   elimina solamente:
|
|   uploads/reclamos/2/
|
| Los demás reclamos y sus fotografías quedan intactos.
|
*/

const eliminarReclamoCompleto =
  async (
    req,
    res
  ) => {
    const transaction =
      await sequelize.transaction();

    try {
      const reclamoId =
        Number(
          req.params.id
        );

      /*
      |--------------------------------------------------------------------------
      | VALIDAR ID
      |--------------------------------------------------------------------------
      */

      if (
        !Number.isInteger(
          reclamoId
        ) ||
        reclamoId <= 0
      ) {
        await transaction.rollback();

        return res
          .status(400)
          .json({
            ok: false,

            mensaje:
              "ID de reclamo inválido",
          });
      }

      /*
      |--------------------------------------------------------------------------
      | BUSCAR RECLAMO
      |--------------------------------------------------------------------------
      */

      const reclamo =
        await Reclamo.findByPk(
          reclamoId,
          {
            transaction,
          }
        );

      if (!reclamo) {
        await transaction.rollback();

        return res
          .status(404)
          .json({
            ok: false,

            mensaje:
              "El reclamo no existe",
          });
      }

      /*
      |--------------------------------------------------------------------------
      | CONTAR FOTOS
      |--------------------------------------------------------------------------
      |
      | Lo usamos solamente para informar
      | cuántos registros de fotografías se eliminaron.
      |
      */

      const cantidadFotos =
        await Foto.count({
          where: {
            reclamoId,
          },

          transaction,
        });

      /*
      |--------------------------------------------------------------------------
      | BUSCAR VEHÍCULOS DEL RECLAMO
      |--------------------------------------------------------------------------
      */

      const vehiculos =
        await Vehiculo.findAll({
          where: {
            reclamoId,
          },

          attributes: [
            "id",
          ],

          transaction,
        });

      const vehiculoIds =
        vehiculos.map(
          (vehiculo) =>
            vehiculo.id
        );

      /*
      |--------------------------------------------------------------------------
      | BORRAR FOTOS DE LA BASE
      |--------------------------------------------------------------------------
      */

      await Foto.destroy({
        where: {
          reclamoId,
        },

        transaction,
      });

      /*
      |--------------------------------------------------------------------------
      | EGRESOS DE PREDIO
      |--------------------------------------------------------------------------
      */

      await EgresoPredio.destroy({
        where: {
          reclamoId,
        },

        transaction,
      });

      /*
      |--------------------------------------------------------------------------
      | INGRESOS DE PREDIO
      |--------------------------------------------------------------------------
      */

      await IngresoPredio.destroy({
        where: {
          reclamoId,
        },

        transaction,
      });

      /*
      |--------------------------------------------------------------------------
      | REMOCIONES
      |--------------------------------------------------------------------------
      */

      await Remocion.destroy({
        where: {
          reclamoId,
        },

        transaction,
      });

      /*
      |--------------------------------------------------------------------------
      | INVENTARIO DEL VEHÍCULO
      |--------------------------------------------------------------------------
      */

      if (
        vehiculoIds.length >
        0
      ) {
        await InventarioVehiculo.destroy({
          where: {
            vehiculoId:
              vehiculoIds,
          },

          transaction,
        });
      }

      /*
      |--------------------------------------------------------------------------
      | INFRACCIONES
      |--------------------------------------------------------------------------
      */

      await Infraccion.destroy({
        where: {
          reclamoId,
        },

        transaction,
      });

      /*
      |--------------------------------------------------------------------------
      | VERIFICACIONES
      |--------------------------------------------------------------------------
      */

      await Verificacion.destroy({
        where: {
          reclamoId,
        },

        transaction,
      });

      /*
      |--------------------------------------------------------------------------
      | EMPLAZAMIENTOS
      |--------------------------------------------------------------------------
      */

      await Emplazamiento.destroy({
        where: {
          reclamoId,
        },

        transaction,
      });

      /*
      |--------------------------------------------------------------------------
      | ACTAS
      |--------------------------------------------------------------------------
      */

      await Acta.destroy({
        where: {
          reclamoId,
        },

        transaction,
      });

      /*
      |--------------------------------------------------------------------------
      | CONSTATACIONES
      |--------------------------------------------------------------------------
      */

      await Constatacion.destroy({
        where: {
          reclamoId,
        },

        transaction,
      });

      /*
      |--------------------------------------------------------------------------
      | HISTORIAL
      |--------------------------------------------------------------------------
      */

      await Historial.destroy({
        where: {
          reclamoId,
        },

        transaction,
      });

      /*
      |--------------------------------------------------------------------------
      | ASIGNACIONES
      |--------------------------------------------------------------------------
      */

      await Asignacion.destroy({
        where: {
          reclamoId,
        },

        transaction,
      });

      /*
      |--------------------------------------------------------------------------
      | VEHÍCULOS
      |--------------------------------------------------------------------------
      */

      await Vehiculo.destroy({
        where: {
          reclamoId,
        },

        transaction,
      });

      /*
      |--------------------------------------------------------------------------
      | FINALMENTE EL RECLAMO
      |--------------------------------------------------------------------------
      */

      await Reclamo.destroy({
        where: {
          id:
            reclamoId,
        },

        transaction,
      });

      /*
      |--------------------------------------------------------------------------
      | CONFIRMAR TRANSACCIÓN
      |--------------------------------------------------------------------------
      */

      await transaction.commit();

      /*
      |--------------------------------------------------------------------------
      | BORRAR CARPETA FÍSICA DEL RECLAMO
      |--------------------------------------------------------------------------
      |
      | Estructura real:
      |
      | uploads/
      |   reclamos/
      |     1/
      |     2/
      |     3/
      |
      | Si reclamoId = 2:
      |
      | SOLO eliminamos:
      |
      | uploads/reclamos/2/
      |
      */

      let carpetaFotosEliminada =
        false;

      let advertencia =
        null;

      try {
        const carpetaReclamo =
          path.resolve(
            uploadsPath,
            "reclamos",
            String(
              reclamoId
            )
          );

        /*
        |--------------------------------------------------------------------------
        | SEGURIDAD
        |--------------------------------------------------------------------------
        */

        if (
          !estaDentroDeUploads(
            carpetaReclamo
          )
        ) {
          throw new Error(
            "La carpeta del reclamo está fuera de uploads"
          );
        }

        /*
        |--------------------------------------------------------------------------
        | ELIMINAR CARPETA COMPLETA
        |--------------------------------------------------------------------------
        */

        if (
          fs.existsSync(
            carpetaReclamo
          )
        ) {
          fs.rmSync(
            carpetaReclamo,
            {
              recursive: true,
              force: true,
            }
          );

          carpetaFotosEliminada =
            true;
        }
      } catch (errorFotos) {
        console.error(
          "Reclamo eliminado, pero hubo un error eliminando su carpeta de fotografías:",
          errorFotos
        );

        advertencia =
          "El reclamo fue eliminado correctamente, pero su carpeta de fotografías no pudo eliminarse.";
      }

      /*
      |--------------------------------------------------------------------------
      | RESPUESTA
      |--------------------------------------------------------------------------
      */

      return res.json({
        ok: true,

        mensaje:
          "Reclamo eliminado completamente",

        reclamo: {
          id:
            reclamoId,

          numeroReclamo:
            reclamo
              .numeroReclamo,
        },

        fotos: {
          registrosEliminados:
            cantidadFotos,

          carpetaEliminada:
            carpetaFotosEliminada,
        },

        advertencia,
      });
    } catch (error) {
      /*
      |--------------------------------------------------------------------------
      | ROLLBACK
      |--------------------------------------------------------------------------
      */

      if (
        !transaction.finished
      ) {
        await transaction.rollback();
      }

      console.error(
        "Error eliminando reclamo completo:",
        error
      );

      return res
        .status(500)
        .json({
          ok: false,

          mensaje:
            "No se pudo eliminar completamente el reclamo",
        });
    }
  };

module.exports = {
  reiniciarDatosPrueba,
  eliminarReclamoCompleto,
};