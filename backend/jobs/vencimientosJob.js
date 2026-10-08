const cron =
  require("node-cron");

const {
  Usuario,
  Rol,
} = require("../models");

const {
  actualizarVencidos,
} = require(
  "../services/emplazamientoService"
);

const {
  enviarCorreo,
} = require(
  "../services/emailService"
);

/*
|--------------------------------------------------------------------------
| AVISAR A JEFES DE GUARDIA
|--------------------------------------------------------------------------
*/

const avisarJefes =
  async (
    vencidosParaSegundaVisita
  ) => {
    if (
      !Array.isArray(
        vencidosParaSegundaVisita
      ) ||
      vencidosParaSegundaVisita
        .length === 0
    ) {
      return;
    }

    /*
    |--------------------------------------------------------------------------
    | BUSCAR JEFES ACTIVOS
    |--------------------------------------------------------------------------
    */

    const jefes =
      await Usuario.findAll({
        where: {
          activo: true,
        },

        attributes: [
          "id",
          "nombre",
          "email",
        ],

        include: [
          {
            model: Rol,
            as: "rol",

            where: {
              nombre:
                "jefe_guardia",
            },

            attributes: [],
          },
        ],
      });

    const jefesConEmail =
      jefes.filter(
        (jefe) =>
          Boolean(
            String(
              jefe.email || ""
            ).trim()
          )
      );

    if (
      jefesConEmail.length === 0
    ) {
      console.log(
        "No hay jefes de guardia activos con email."
      );

      return;
    }

    /*
    |--------------------------------------------------------------------------
    | UN EMAIL POR RECLAMO VENCIDO A CADA JEFE
    |--------------------------------------------------------------------------
    */

    for (
      const vencimiento
      of vencidosParaSegundaVisita
    ) {
      for (
        const jefe
        of jefesConEmail
      ) {
        try {
          await enviarCorreo({
            para:
              jefe.email,

            asunto:
              `Plazo vencido - Reclamo N° ${vencimiento.numeroReclamo}`,

            texto:
              `Hola ${jefe.nombre}.\n\n` +
              `Venció el plazo de un Acta de Vía Pública y el reclamo quedó disponible para una segunda visita.\n\n` +
              `Reclamo N°: ${vencimiento.numeroReclamo}\n` +
              `Dirección: ${vencimiento.direccion || "Sin dirección"}\n\n` +
              `Ingresá al Sistema de Tránsito para revisar el reclamo y, si corresponde, asignar la segunda visita.\n\n` +
              `Este es un mensaje automático. No es necesario responder.`,

            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px;">

                <h2>
                  Sistema de Tránsito
                </h2>

                <p>
                  Hola
                  <strong>
                    ${jefe.nombre}
                  </strong>.
                </p>

                <p>
                  Venció el plazo de un
                  <strong>
                    Acta de Vía Pública
                  </strong>
                  y el reclamo quedó disponible
                  para una segunda visita.
                </p>

                <div
                  style="
                    padding: 15px;
                    border: 1px solid #dddddd;
                    border-radius: 8px;
                    margin: 20px 0;
                  "
                >

                  <p style="margin: 0 0 8px 0;">
                    <strong>
                      Reclamo N°:
                    </strong>

                    ${vencimiento.numeroReclamo}
                  </p>

                  <p style="margin: 0;">
                    <strong>
                      Dirección:
                    </strong>

                    ${
                      vencimiento.direccion ||
                      "Sin dirección"
                    }
                  </p>

                </div>

                <p>
                  Ingresá al
                  <strong>
                    Sistema de Tránsito
                  </strong>
                  para revisar el reclamo y,
                  si corresponde, asignar
                  la segunda visita.
                </p>

                <hr />

                <small>
                  Este es un mensaje automático.
                  No es necesario responder.
                </small>

              </div>
            `,
          });

          console.log(
            `Aviso de vencimiento enviado a ${jefe.nombre} (${jefe.email}) - Reclamo ${vencimiento.numeroReclamo}`
          );
        } catch (errorEmail) {
          /*
          | Si falla UN email,
          | seguimos con los demás.
          */

          console.error(
            `No se pudo enviar el aviso de vencimiento a ${jefe.email}:`,
            errorEmail.message
          );
        }
      }
    }
  };

/*
|--------------------------------------------------------------------------
| EJECUTAR CONTROL DE VENCIMIENTOS
|--------------------------------------------------------------------------
*/

const ejecutarControlVencimientos =
  async () => {
    try {
      console.log(
        "Controlando vencimientos de emplazamientos..."
      );

      const resultado =
        await actualizarVencidos();

      const vencidos =
        resultado
          ?.vencidosParaSegundaVisita ||
        [];

      if (
        vencidos.length === 0
      ) {
        console.log(
          "No hay nuevos vencimientos para segunda visita."
        );

        return;
      }

      console.log(
        `${vencidos.length} vencimiento(s) generaron segunda visita.`
      );

      await avisarJefes(
        vencidos
      );
    } catch (error) {
      /*
      | El job nunca debe tumbar
      | el servidor.
      */

      console.error(
        "Error controlando vencimientos:",
        error
      );
    }
  };

/*
|--------------------------------------------------------------------------
| INICIAR CRON
|--------------------------------------------------------------------------
|
| /*20 * * * *
|
| Significa:
| cada 20 minutos.
|
*/

const iniciarVencimientosJob =
  () => {
    cron.schedule(
      "*/20 * * * *",
      async () => {
        await ejecutarControlVencimientos();
      }
    );

    console.log(
      "Control automático de vencimientos iniciado: cada 20 minutos."
    );
  };

module.exports = {
  iniciarVencimientosJob,
  ejecutarControlVencimientos,
};