const {
  Emplazamiento,
  Reclamo,
  Vehiculo,
} = require("../models");

const {
  registrarHistorial,
} = require("./historialService");

/*
|--------------------------------------------------------------------------
| CONVERTIR PLAZO
|--------------------------------------------------------------------------
*/

const convertirPlazoAHoras = (
  cantidad,
  unidad
) => {
  const valor =
    Number(cantidad);

  if (
    !Number.isFinite(valor) ||
    valor <= 0
  ) {
    return null;
  }

  if (unidad === "DIAS") {
    return valor * 24;
  }

  return valor;
};

/*
|--------------------------------------------------------------------------
| CALCULAR VENCIMIENTO
|--------------------------------------------------------------------------
*/

const calcularFechaVencimiento = (
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
| ESTADOS DE VEHÍCULO FUERA DEL CIRCUITO DE CONTROL
|--------------------------------------------------------------------------
|
| Si un vehículo ya pasó a alguno de estos estados,
| un emplazamiento viejo no debe volver a mandar
| el reclamo a SEGUNDA VISITA.
|
*/

const ESTADOS_VEHICULO_FUERA_DE_CONTROL =
  new Set([
    "PENDIENTE_REMOCION",
    "REMOVIDO",
    "PENDIENTE_INGRESO_PREDIO",
    "EN_PREDIO",
    "EGRESADO",
  ]);

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
| el reclamo para una SEGUNDA VISITA
| cuando realmente corresponde.
|
| COMPATIBILIDAD:
|
| - Reclamos viejos de un solo vehículo.
| - Reclamos nuevos con varios vehículos.
| - Prórrogas.
| - Vehículos enviados a remoción.
| - Vehículos en predio.
|
*/

const actualizarVencidos =
  async () => {
    const ahora =
      new Date();

    /*
    |--------------------------------------------------------------------------
    | BUSCAR EMPLAZAMIENTOS VIGENTES
    |--------------------------------------------------------------------------
    */

    const emplazamientos =
      await Emplazamiento.findAll({
        where: {
          estado: "VIGENTE",
        },
      });

    let actualizados = 0;

    /*
    |--------------------------------------------------------------------------
    | VENCIMIENTOS QUE REALMENTE GENERARON SEGUNDA VISITA
    |--------------------------------------------------------------------------
    |
    | Esto después lo utilizará el proceso automático
    | para avisar a los jefes de guardia.
    |
    | IMPORTANTE:
    |
    | No entran acá:
    |
    | - prórrogas viejas
    | - reclamos resueltos
    | - reclamos anulados
    | - vehículos que ya pasaron a remoción
    | - vehículos que ya están en predio
    |
    */

    const vencidosParaSegundaVisita =
      [];

    /*
    |--------------------------------------------------------------------------
    | RECORRER EMPLAZAMIENTOS
    |--------------------------------------------------------------------------
    */

    for (
      const emplazamiento
      of emplazamientos
    ) {
      const vencimiento =
        new Date(
          emplazamiento
            .fechaVencimiento
        );

      /*
      |--------------------------------------------------------------------------
      | FECHA INVÁLIDA
      |--------------------------------------------------------------------------
      */

      if (
        Number.isNaN(
          vencimiento.getTime()
        )
      ) {
        continue;
      }

      /*
      |--------------------------------------------------------------------------
      | TODAVÍA NO VENCIÓ
      |--------------------------------------------------------------------------
      */

      if (vencimiento > ahora) {
        continue;
      }

      /*
      |--------------------------------------------------------------------------
      | VERIFICAR SI TIENE UNA PRÓRROGA HIJA
      |--------------------------------------------------------------------------
      |
      | Si existe otro emplazamiento cuyo
      | emplazamientoAnteriorId apunta a éste,
      | significa que este plazo fue prorrogado.
      |
      | Lo marcamos VENCIDO pero NO generamos
      | una segunda visita.
      |
      */

      const emplazamientoHijo =
        await Emplazamiento.findOne({
          where: {
            emplazamientoAnteriorId:
              emplazamiento.id,
          },
        });

      if (emplazamientoHijo) {
        emplazamiento.estado =
          "VENCIDO";

        await emplazamiento.save();

        actualizados++;

        continue;
      }

      /*
      |--------------------------------------------------------------------------
      | BUSCAR RECLAMO
      |--------------------------------------------------------------------------
      */

      const reclamo =
        await Reclamo.findByPk(
          emplazamiento.reclamoId
        );

      /*
      |--------------------------------------------------------------------------
      | EL PLAZO REALMENTE VENCIÓ
      |--------------------------------------------------------------------------
      |
      | Lo marcamos primero como VENCIDO.
      |
      | Esto además evita que una ejecución posterior
      | vuelva a procesar el mismo emplazamiento.
      |
      */

      emplazamiento.estado =
        "VENCIDO";

      await emplazamiento.save();

      /*
      |--------------------------------------------------------------------------
      | RECLAMO INEXISTENTE / FINALIZADO
      |--------------------------------------------------------------------------
      */

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

      /*
      |--------------------------------------------------------------------------
      | IDENTIFICAR VEHÍCULO
      |--------------------------------------------------------------------------
      */

      let vehiculo = null;

      /*
      |--------------------------------------------------------------------------
      | SISTEMA NUEVO
      |--------------------------------------------------------------------------
      |
      | El emplazamiento tiene vehiculoId.
      |
      */

      if (emplazamiento.vehiculoId) {
        vehiculo =
          await Vehiculo.findOne({
            where: {
              id:
                emplazamiento
                  .vehiculoId,

              reclamoId:
                reclamo.id,
            },
          });
      } else {
        /*
        |--------------------------------------------------------------------------
        | COMPATIBILIDAD CON SISTEMA VIEJO
        |--------------------------------------------------------------------------
        |
        | Los emplazamientos históricos pueden
        | no tener vehiculoId.
        |
        | Si el reclamo tiene UN SOLO vehículo,
        | podemos relacionarlo de forma segura.
        |
        | Si tiene varios vehículos y falta vehiculoId,
        | NO inventamos cuál corresponde.
        |
        */

        const vehiculos =
          await Vehiculo.findAll({
            where: {
              reclamoId:
                reclamo.id,
            },
          });

        if (
          vehiculos.length === 1
        ) {
          vehiculo =
            vehiculos[0];
        }
      }

      /*
      |--------------------------------------------------------------------------
      | VEHÍCULO FUERA DEL CIRCUITO DE CONTROL
      |--------------------------------------------------------------------------
      |
      | Si el vehículo ya pasó a:
      |
      | - remoción
      | - traslado
      | - predio
      | - egreso
      |
      | un emplazamiento viejo NO debe volver
      | a activar una segunda visita.
      |
      */

      if (
        vehiculo &&
        ESTADOS_VEHICULO_FUERA_DE_CONTROL.has(
          vehiculo.estadoActual
        )
      ) {
        actualizados++;

        continue;
      }

      /*
      |--------------------------------------------------------------------------
      | REACTIVAR RECLAMO PARA SEGUNDA VISITA
      |--------------------------------------------------------------------------
      */

      const estadoAnterior =
        reclamo.estado;

      /*
      | El inspector anterior deja de ser
      | responsable.
      |
      | Un jefe deberá volver a asignar
      | la segunda visita.
      */

      reclamo.inspectorId =
        null;

      reclamo.estado =
        "PENDIENTE_ACTUACION";

      reclamo.etapaActual =
        "PENDIENTE_SEGUNDA_VISITA";

      reclamo.fechaResolucion =
        null;

      await reclamo.save();

      /*
      |--------------------------------------------------------------------------
      | HISTORIAL
      |--------------------------------------------------------------------------
      */

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
        | Si falla el historial,
        | NO deshacemos el vencimiento.
        */

        console.error(
          "No se pudo registrar historial del vencimiento:",
          error.message
        );
      }

      /*
      |--------------------------------------------------------------------------
      | GUARDAR VENCIMIENTO PARA NOTIFICACIÓN
      |--------------------------------------------------------------------------
      |
      | Llegar hasta acá significa que este
      | emplazamiento REALMENTE dejó el reclamo
      | disponible para una segunda visita.
      |
      | Sistema nuevo:
      | conservamos emplazamiento y vehículo exactos.
      |
      | Sistema viejo:
      | vehiculoId puede quedar null.
      |
      */

      vencidosParaSegundaVisita.push({
        emplazamientoId:
          emplazamiento.id,

        reclamoId:
          reclamo.id,

        vehiculoId:
          emplazamiento.vehiculoId ||
          vehiculo?.id ||
          null,

        numeroReclamo:
          reclamo.numeroReclamo,

        direccion:
          reclamo.direccion ||
          null,
      });

      actualizados++;
    }

    /*
    |--------------------------------------------------------------------------
    | RESULTADO
    |--------------------------------------------------------------------------
    |
    | actualizados:
    | cantidad total de emplazamientos que fueron
    | actualizados por haber vencido.
    |
    | vencidosParaSegundaVisita:
    | solamente aquellos que realmente dejaron
    | trabajo disponible para los jefes.
    |
    */

    return {
      actualizados,

      vencidosParaSegundaVisita,
    };
  };

module.exports = {
  convertirPlazoAHoras,
  calcularFechaVencimiento,
  actualizarVencidos,
};