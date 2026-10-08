const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: Number(process.env.EMAIL_PORT || 465),
  secure: String(process.env.EMAIL_SECURE || "true") === "true",

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});


const enviarCorreo = async ({
  para,
  asunto,
  texto,
  html,
}) => {
  if (!para) {
    throw new Error(
      "No se indicó un destinatario para el correo."
    );
  }

  const resultado =
    await transporter.sendMail({
      from: `"Sistema de Tránsito" <${process.env.EMAIL_USER}>`,
      to: para,
      subject: asunto,
      text: texto,
      html,
    });

  return resultado;
};


const enviarConfirmacionCorreo = async ({
  para,
  nombre,
}) => {
  const nombreUsuario =
    nombre || "Usuario";

  return enviarCorreo({
    para,

    asunto:
      "Correo configurado correctamente",

    texto:
      `Hola ${nombreUsuario}.\n\n` +
      `Tu correo electrónico fue configurado correctamente en el Sistema de Tránsito.\n\n` +
      `A partir de ahora podrás recibir notificaciones relacionadas con tus tareas y actuaciones.\n\n` +
      `Si recibiste este mensaje, significa que tu dirección de correo funciona correctamente.`,

    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2>Sistema de Tránsito</h2>

        <p>
          Hola <strong>${nombreUsuario}</strong>.
        </p>

        <p>
          Tu correo electrónico fue configurado
          correctamente en el Sistema de Tránsito.
        </p>

        <p>
          A partir de ahora podrás recibir
          notificaciones relacionadas con tus
          tareas y actuaciones.
        </p>

        <p>
          <strong>
            Si recibiste este mensaje, tu dirección
            de correo funciona correctamente.
          </strong>
        </p>

        <hr />

        <small>
          Este es un mensaje automático.
          No es necesario responder.
        </small>
      </div>
    `,
  });
};


module.exports = {
  enviarCorreo,
  enviarConfirmacionCorreo,
};