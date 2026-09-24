import {
  useEffect,
  useState,
} from "react";

import api from "../api/api";

import "./IngresoPredioForm.css";

const IngresoPredioForm = ({
  reclamo,
  vehiculo,
  remocion = null,
  predio = null,
  onGuardado,
}) => {
  const esCargaHistorica =
  vehiculo?.origenRegistro ===
  "CARGA_HISTORICA";
  const [predios, setPredios] =
    useState([]);

  const [form, setForm] =
    useState({
      predioId: "",
      sector: "",
      posicion: "",
      coincide: "",
      diferencias: "",
      observaciones: "",
    });

  const [cargando, setCargando] =
    useState(false);

  const [error, setError] =
    useState("");

  const [mensaje, setMensaje] =
    useState("");

  useEffect(() => {
    const cargarPredios =
      async () => {
        try {
          const respuesta =
            await api.get(
              "/predios"
            );

          const lista =
            respuesta.data
              ?.predios ||
            respuesta.data ||
            [];

          setPredios(lista);

     const predioPendiente =
  vehiculo?.predioPendienteId
    ? lista.find(
        (actual) =>
          Number(actual.id) ===
          Number(
            vehiculo.predioPendienteId
          )
      )
    : null;

const granja =
  lista.find((actual) => {
    const nombre =
      String(
        actual.nombre || ""
      ).toLowerCase();

    return (
      nombre.includes("granja") ||
      nombre.includes("amalia")
    );
  });

if (predioPendiente) {
  setForm((anterior) => ({
    ...anterior,
    predioId: String(
      predioPendiente.id
    ),
  }));
} else if (predio?.id) {
  setForm((anterior) => ({
    ...anterior,
    predioId: String(predio.id),
  }));
} else if (granja) {
  setForm((anterior) => ({
    ...anterior,
    predioId: String(granja.id),
  }));
} else if (lista.length === 1) {
  setForm((anterior) => ({
    ...anterior,
    predioId: String(lista[0].id),
  }));
}
        } catch (err) {
          console.error(
            "Error cargando predios:",
            err
          );

          setError(
            "No se pudo cargar el predio."
          );
        }
      };

    cargarPredios();
  }, []);

  const cambiar = (
    campo,
    valor
  ) => {
    setForm(
      (anterior) => ({
        ...anterior,
        [campo]: valor,
      })
    );

    setError("");
    setMensaje("");
  };

  const guardar = async (
    event
  ) => {
    event.preventDefault();

    setError("");
    setMensaje("");

    if (!form.predioId) {
      setError(
        "Seleccioná el predio."
      );
      return;
    }

    if (
      !form.posicion.trim()
    ) {
      setError(
        "Ingresá el Nº / precinto donde quedó el vehículo."
      );
      return;
    }

 if (
  !esCargaHistorica &&
  !form.coincide
) {
  setError(
    "Indicá si el vehículo coincide con lo registrado por el inspector."
  );
  return;
}
if (
  !esCargaHistorica &&
  form.coincide === "NO" &&
  !form.diferencias.trim()
) {
      setError(
        "Detallá qué diferencia encontraste al recibir el vehículo."
      );
      return;
    }

   const lineas = [];

if (esCargaHistorica) {
  lineas.push(
    "Recepción de vehículo proveniente de carga histórica."
  );
}

if (
  !esCargaHistorica &&
  form.coincide === "SI"
) {
  lineas.push(
    "Recepción: coincide con el estado e inventario registrado por el inspector."
  );
}

if (
  !esCargaHistorica &&
  form.coincide === "NO"
) {
  lineas.push(
    "Recepción: se encontraron diferencias respecto del estado e inventario registrado por el inspector."
  );

  lineas.push(
    `Diferencias encontradas: ${form.diferencias.trim()}`
  );
}
    if (
      form.observaciones.trim()
    ) {
      lineas.push(
        `Observaciones de recepción: ${form.observaciones.trim()}`
      );
    }

    try {
      setCargando(true);

      await api.post(
        "/predios/ingresos",
        {
          reclamoId:
            reclamo.id,

          vehiculoId:
            vehiculo.id,

        remocionId:
  remocion?.id || null,
          predioId:
            Number(
              form.predioId
            ),

          sector:
            form.sector.trim() ||
            null,

          posicion:
            form.posicion.trim(),

          observaciones:
            lineas.join("\n"),
        }
      );

      setMensaje(
        "Ingreso registrado correctamente."
      );

      if (onGuardado) {
        await onGuardado();
      }
    } catch (err) {
      console.error(
        "Error registrando ingreso:",
        err
      );

      setError(
        err.response?.data?.mensaje ||
          "No se pudo registrar el ingreso."
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <form
      className="ingreso-predio-form"
      onSubmit={guardar}
    >
    
      <div className="ingreso-bloque">
        <div className="ingreso-bloque-titulo">
          <span>
            1
          </span>

          <div>
            <strong>
              Ubicación dentro del predio
            </strong>

            <small>
              Indicá dónde queda guardado.
            </small>
          </div>
        </div>

        <div className="ingreso-grid">
        <label>
  <span>
    Predio
  </span>

  <input
    type="text"
    value={
      predios.find(
        (actual) =>
          Number(actual.id) ===
          Number(form.predioId)
      )?.nombre ||
      predio?.nombre ||
      "Granja La Amalia"
    }
    readOnly
  />
</label>

          <label>
            <span>
              Sector
              <small>
                {" "}
                (opcional)
              </small>  
            </span>

            <input
              type="text"
              value={
                form.sector
              }
              onChange={(
                event
              ) =>
                cambiar(
                  "sector",
                  event.target
                    .value
                )
              }
              placeholder="Ej: Sector B"
            />
          </label>

          <label className="campo-posicion">
            <span>
              Nº / Precinto
            </span>

            <input
              type="text"
              value={
                form.posicion
              }
              onChange={(
                event
              ) =>
                cambiar(
                  "posicion",
                  event.target
                    .value
                )
              }
              placeholder="Ej: 125 o B-17"
            />
          </label>
        </div>
      </div>
{!esCargaHistorica && (
      <div className="ingreso-bloque">
        <div className="ingreso-bloque-titulo">
          <span>
            2
          </span>

          <div>
            <strong>
              Comparar con el inspector
            </strong>

            <small>
              Revisá las fotos y el
              inventario que aparecen
              arriba.
            </small>
          </div>
        </div>

        <p className="ingreso-pregunta">
          ¿El vehículo llegó en las
          mismas condiciones que registró
          el inspector?
        </p>

        <div className="ingreso-opciones">
          <button
            type="button"
            className={
              form.coincide ===
              "SI"
                ? "seleccionada si"
                : ""
            }
            onClick={() =>
              cambiar(
                "coincide",
                "SI"
              )
            }
          >
            <span>
              ✓
            </span>

            <div>
              <strong>
                Sí, coincide
              </strong>

              <small>
                No encontré diferencias.
              </small>
            </div>
          </button>

          <button
            type="button"
            className={
              form.coincide ===
              "NO"
                ? "seleccionada no"
                : ""
            }
            onClick={() =>
              cambiar(
                "coincide",
                "NO"
              )
            }
          >
            <span>
              !
            </span>

            <div>
              <strong>
                No, hay diferencias
              </strong>

              <small>
                Algo no coincide con lo
                registrado.
              </small>
            </div>
          </button>
        </div>

        {form.coincide ===
          "NO" && (
          <label className="ingreso-diferencias">
            <span>
              ¿Qué diferencia encontraste? *
            </span>

            <textarea
              value={
                form.diferencias
              }
              onChange={(
                event
              ) =>
                cambiar(
                  "diferencias",
                  event.target
                    .value
                )
              }
              rows="4"
              placeholder="Ej: El inspector registró el espejo derecho como presente y el vehículo llegó sin ese espejo."
            />
          </label>
            )}
      </div>
)}

      <div className="ingreso-bloque">
        <div className="ingreso-bloque-titulo">
          <span>
            3
          </span>

          <div>
            <strong>
              Observaciones
            </strong>

            <small>
              Solo si necesitás dejar
              alguna aclaración.
            </small>
          </div>
        </div>

        <textarea
          value={
            form.observaciones
          }
          onChange={(
            event
          ) =>
            cambiar(
              "observaciones",
              event.target
                .value
            )
          }
          rows="3"
          placeholder="Observaciones opcionales..."
        />
      </div>

      {error && (
        <div className="ingreso-error">
          {error}
        </div>
      )}

      {mensaje && (
        <div className="ingreso-ok">
          {mensaje}
        </div>
      )}

      <button
        type="submit"
        className="ingreso-guardar"
        disabled={cargando}
      >
        {cargando
          ? "Registrando..."
          : "Confirmar ingreso al predio"}
      </button>
    </form>
  );
};

export default IngresoPredioForm;