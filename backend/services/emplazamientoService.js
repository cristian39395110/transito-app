const {
  Emplazamiento,
  Reclamo,
} = require("../models");

const {
  registrarHistorial,
} = require(
  "./historialService"
);

/*
|--------------------------------------------------------------------------
| CONVERTIR PLAZO
|--------------------------------------------------------------------------
*/

const convertirPlazoAHoras =
  (
    cantidad,
    unidad
  ) => {
    const valor =
      Number(cantidad);

    if (
      !Number.isFinite(
        valor
      ) ||
      valor <= 0
    ) {
      return null;
    }

    if (
      unidad ===
      "DIAS"
    ) {
      return (
        valor * 24
      );
    }

    return valor;
  };

/*
|--------------------------------------------------------------------------
| CALCULAR VENCIMIENTO
|--------------------------------------------------------------------------
*/

const calcularFechaVencimiento =
  (
    fecha,
    cantidad,
    unidad = "HORAS"
  ) => {
    const inicio =
      new Date(fecha);

    if (
      Number.isNaN(
        inicio.getTime()
      )
    ) {
      return null;
    }

    const plazoHoras =
      convertirPlazoAHoras(
        cantidad,
        unidad
      );

    if (!plazoHoras) {
      return null;
    }

    return new Date(
      inicio.getTime() +
        plazoHoras *
          60 *
          60 *
          1000
    );
  };

/*
|--------------------------------------------------------------------------
| ACTUALIZAR VENCIDOS
|--------------------------------------------------------------------------
|
| El vencimiento NO genera:
|
| - multa
| - infracción automática
| - remoción
|
| Únicamente deja disponible
| el reclamo para una SEGUNDA VISITA.
|
*/

const actualizarVencidos =
  async () => {
    const ahora =
      new Date();

    const emplazamientos =
      await Emplazamiento.findAll({
        where: {
          estado:
            "VIGENTE",
        },
      });

    let actualizados =
      0;

    for (
      const emplazamiento
      of emplazamientos
    ) {
      const vencimiento =
        new Date(
          emplazamiento
            .fechaVencimiento
        );

      if (
        Number.isNaN(
          vencimiento.getTime()
        )
      ) {
        continue;
      }

      if (
        vencimiento >
        ahora
      ) {
        continue;
      }

      /*
      El plazo terminó.
      */

      emplazamiento.estado =
        "VENCIDO";

      await emplazamiento.save();

      const reclamo =
        await Reclamo.findByPk(
          emplazamiento
            .reclamoId
        );

      if (
        !reclamo ||
        [
          "RESUELTO",
          "ANULADO",
        ].includes(
          reclamo.estado
        )
      ) {
        actualizados++;
        continue;
      }

      const estadoAnterior =
        reclamo.estado;

      /*
      Ya no existe un inspector
      actualmente responsable.

      La primera tarea terminó
      cuando hizo el emplazamiento.
      */

      reclamo.inspectorId =
        null;

      /*
      Estado general.
      */

      reclamo.estado =
        "PENDIENTE_ACTUACION";

      /*
      Esta es la parte fundamental.

      Cualquier jefe de guardia
      va a poder verlo y asignar
      una segunda visita.
      */

      reclamo.etapaActual =
        "PENDIENTE_SEGUNDA_VISITA";

      await reclamo.save();

      try {
        await registrarHistorial({
          reclamoId:
            reclamo.id,

          usuarioId:
            null,

          accion:
            "EMPLAZAMIENTO_VENCIDO",

          descripcion:
            "Venció el plazo del Acta de Vía Pública. El reclamo quedó disponible para asignar una segunda visita.",

          estadoAnterior,

          estadoNuevo:
            "PENDIENTE_ACTUACION",
        });
      } catch (error) {
        /*
        No queremos que un problema
        del historial vuelva atrás
        el vencimiento real.

        Después podemos mejorar el
        historial de acciones automáticas
        si usuarioId no admite NULL.
        */

        console.error(
          "No se pudo registrar historial del vencimiento:",
          error.message
        );
      }

      actualizados++;
    }

    return actualizados;
  };

module.exports = {
  convertirPlazoAHoras,
  calcularFechaVencimiento,
  actualizarVencidos,
};