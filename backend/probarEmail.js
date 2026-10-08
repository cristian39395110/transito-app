require("dotenv").config();

const {
  enviarCorreo,
} = require("./services/emailService");

const probar = async () => {
  try {
    await enviarCorreo({
      para: process.env.EMAIL_USER,
      asunto: "Prueba Sistema de Tránsito",
      texto:
        "El envío de correos del Sistema de Tránsito está funcionando correctamente.",
    });

    console.log(
      "✅ CORREO ENVIADO CORRECTAMENTE"
    );

    process.exit(0);
  } catch (error) {
    console.error(
      "❌ ERROR AL ENVIAR CORREO:"
    );

    console.error(error);

    process.exit(1);
  }
};

probar();