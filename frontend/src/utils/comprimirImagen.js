const cargarImagen = (
  archivo
) => {
  return new Promise(
    (resolve, reject) => {
      const imagen =
        new Image();

      const url =
        URL.createObjectURL(
          archivo
        );

      imagen.onload = () => {
        URL.revokeObjectURL(
          url
        );

        resolve(imagen);
      };

      imagen.onerror = () => {
        URL.revokeObjectURL(
          url
        );

        reject(
          new Error(
            "No se pudo cargar la imagen"
          )
        );
      };

      imagen.src = url;
    }
  );
};

const canvasABlob = (
  canvas,
  calidad
) => {
  return new Promise(
    (resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(
              new Error(
                "No se pudo comprimir la imagen"
              )
            );

            return;
          }

          resolve(blob);
        },
        "image/webp",
        calidad
      );
    }
  );
};

const calcularDimensiones = (
  ancho,
  alto,
  maxDimension
) => {
  if (
    ancho <= maxDimension &&
    alto <= maxDimension
  ) {
    return {
      ancho,
      alto,
    };
  }

  const escala =
    Math.min(
      maxDimension / ancho,
      maxDimension / alto
    );

  return {
    ancho: Math.round(
      ancho * escala
    ),

    alto: Math.round(
      alto * escala
    ),
  };
};

/*
|--------------------------------------------------------------------------
| COMPRIMIR
|--------------------------------------------------------------------------
|
| Objetivo:
| aproximadamente 100 KB.
|
| No destruimos innecesariamente
| la calidad si ya conseguimos
| quedar debajo del objetivo.
|
*/

export const comprimirImagen =
  async (
    archivo,
    {
      objetivoKB = 100,
      maxDimension = 1280,
      calidadInicial = 0.82,
      calidadMinima = 0.35,
    } = {}
  ) => {
    if (!archivo) {
      throw new Error(
        "No se recibió una imagen"
      );
    }

    if (
      !archivo.type.startsWith(
        "image/"
      )
    ) {
      throw new Error(
        "El archivo seleccionado no es una imagen"
      );
    }

    const imagen =
      await cargarImagen(
        archivo
      );

    const dimensiones =
      calcularDimensiones(
        imagen.naturalWidth,
        imagen.naturalHeight,
        maxDimension
      );

    const canvas =
      document.createElement(
        "canvas"
      );

    canvas.width =
      dimensiones.ancho;

    canvas.height =
      dimensiones.alto;

    const contexto =
      canvas.getContext("2d");

    if (!contexto) {
      throw new Error(
        "No se pudo procesar la imagen"
      );
    }

    /*
    Fondo blanco.

    Evita resultados raros
    si alguna imagen tiene
    transparencia.
    */

    contexto.fillStyle =
      "#ffffff";

    contexto.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    contexto.drawImage(
      imagen,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const objetivoBytes =
      objetivoKB * 1024;

    let calidad =
      calidadInicial;

    let blob =
      await canvasABlob(
        canvas,
        calidad
      );

    /*
    Bajamos calidad gradualmente.
    */

    while (
      blob.size >
        objetivoBytes &&
      calidad >
        calidadMinima
    ) {
      calidad -= 0.07;

      if (
        calidad <
        calidadMinima
      ) {
        calidad =
          calidadMinima;
      }

      blob =
        await canvasABlob(
          canvas,
          calidad
        );
    }

    /*
    Si todavía quedó demasiado
    pesada, reducimos también
    dimensiones.
    */

    let anchoActual =
      canvas.width;

    let altoActual =
      canvas.height;

    while (
      blob.size >
        objetivoBytes *
          1.15 &&
      anchoActual > 600 &&
      altoActual > 400
    ) {
      anchoActual =
        Math.round(
          anchoActual * 0.85
        );

      altoActual =
        Math.round(
          altoActual * 0.85
        );

      const canvasReducido =
        document.createElement(
          "canvas"
        );

      canvasReducido.width =
        anchoActual;

      canvasReducido.height =
        altoActual;

      const ctx =
        canvasReducido.getContext(
          "2d"
        );

      ctx.fillStyle =
        "#ffffff";

      ctx.fillRect(
        0,
        0,
        anchoActual,
        altoActual
      );

      ctx.drawImage(
        canvas,
        0,
        0,
        anchoActual,
        altoActual
      );

      canvas.width =
        anchoActual;

      canvas.height =
        altoActual;

      contexto.drawImage(
        canvasReducido,
        0,
        0
      );

      blob =
        await canvasABlob(
          canvas,
          calidadMinima
        );
    }

    const nombreBase =
      archivo.name
        .replace(
          /\.[^/.]+$/,
          ""
        )
        .replace(
          /[^a-zA-Z0-9-_]/g,
          "-"
        );

    return new File(
      [blob],
      `${nombreBase}.webp`,
      {
        type: "image/webp",
        lastModified:
          Date.now(),
      }
    );
  };

export const formatearKB = (
  bytes
) => {
  return (
    bytes / 1024
  ).toFixed(1);
};