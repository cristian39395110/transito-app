import {
  useEffect,
  useState,
} from "react";

import api from "../api/api";

import "./EgresoPredioForm.css";

const EgresoPredioForm = ({
  reclamo,
  vehiculo,
  ingresoPredio,
  onGuardado,
}) => {
  const [form, setForm] =
    useState({
      tipoEgreso: "ENTREGADO",
      predioDestinoId: "",
      destinoPersona: "",
      dniPersona: "",
      observaciones: "",
    });

  const [predios, setPredios] =
    useState([]);

  const [
    cargandoPredios,
    setCargandoPredios,
  ] = useState(false);

  const [guardando, setGuardando] =
    useState(false);

  const [error, setError] =
    useState("");

  const [mensaje, setMensaje] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | CARGAR DESTINOS
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const cargarPredios =
      async () => {
        try {
          setCargandoPredios(true);

          const respuesta =
            await api.get(
              "/predios"
            );

          setPredios(
            respuesta.data
              ?.predios ||
              []
          );
        } catch (err) {
          console.error(
            "Error cargando destinos:",
            err
          );

          setPredios([]);
        } finally {
          setCargandoPredios(
            false
          );
        }
      };

    cargarPredios();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | CAMBIAR CAMPOS
  |--------------------------------------------------------------------------
  */

  const cambiar = (event) => {
    const {
      name,
      value,
    } = event.target;

    setForm((anterior) => ({
      ...anterior,
      [name]: value,
    }));
  };

  /*
  |--------------------------------------------------------------------------
  | CAMBIAR TIPO DE EGRESO
  |--------------------------------------------------------------------------
  */

  const cambiarTipoEgreso = (
    event
  ) => {
    const value =
      event.target.value;

    setError("");
    setMensaje("");

    setForm((anterior) => ({
      ...anterior,

      tipoEgreso:
        value,

      predioDestinoId:
        "",

      destinoPersona:
        "",

      dniPersona:
        "",
    }));
  };

  /*
  |--------------------------------------------------------------------------
  | DESTINOS DISPONIBLES
  |--------------------------------------------------------------------------
  |
  | No mostramos como destino el mismo
  | predio del cual está saliendo.
  |
  */

  const prediosDisponibles =
    predios.filter(
      (predio) =>
        Number(predio.id) !==
        Number(
          ingresoPredio?.predioId
        )
    );

  /*
  |--------------------------------------------------------------------------
  | GUARDAR
  |--------------------------------------------------------------------------
  */

  const guardar = async (
    event
  ) => {
    event.preventDefault();

    setError("");
    setMensaje("");

    if (!form.tipoEgreso) {
      setError(
        "Seleccioná el tipo de egreso."
      );

      return;
    }

    /*
    |--------------------------------------------------------------------------
    | ENTREGADO
    |--------------------------------------------------------------------------
    */

    if (
      form.tipoEgreso ===
        "ENTREGADO" &&
      !form.destinoPersona.trim()
    ) {
      setError(
        "Ingresá a quién se entrega el vehículo."
      );

      return;
    }

    /*
    |--------------------------------------------------------------------------
    | TRASLADADO
    |--------------------------------------------------------------------------
    */

    if (
      form.tipoEgreso ===
        "TRASLADADO" &&
      !form.predioDestinoId
    ) {
      setError(
        "Seleccioná el destino del traslado."
      );

      return;
    }

    const confirmar =
      window.confirm(
        form.tipoEgreso ===
          "TRASLADADO"
          ? "¿Confirmás el traslado del vehículo a otro destino?"
          : "¿Confirmás el egreso del vehículo del predio?"
      );

    if (!confirmar) {
      return;
    }

    try {
      setGuardando(true);

      await api.post(
        "/predios/egresos",
        {
          reclamoId:
            Number(reclamo.id),

          vehiculoId:
            Number(vehiculo.id),

          ingresoPredioId:
            Number(
              ingresoPredio.id
            ),

          tipoEgreso:
            form.tipoEgreso,

          predioDestinoId:
            form.tipoEgreso ===
              "TRASLADADO"
              ? Number(
                  form.predioDestinoId
                )
              : null,

          destinoPersona:
            form.tipoEgreso ===
              "ENTREGADO"
              ? form.destinoPersona
                  .trim() ||
                null
              : null,

          dniPersona:
            form.tipoEgreso ===
              "ENTREGADO"
              ? form.dniPersona
                  .trim() ||
                null
              : null,

          observaciones:
            form.observaciones
              .trim() ||
            null,
        }
      );

      setMensaje(
        "Egreso registrado correctamente."
      );

      if (onGuardado) {
        await onGuardado();
      }
    } catch (err) {
      console.error(
        "Error registrando egreso:",
        err
      );

      setError(
        err.response?.data
          ?.mensaje ||
          "No se pudo registrar el egreso."
      );
    } finally {
      setGuardando(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <form
      className="egreso-predio-form"
      onSubmit={guardar}
    >
      <div className="egreso-header">
        <span>
          EGRESO DEL PREDIO
        </span>

        <h3>
          Vehículo Nº{" "}
          {vehiculo.numeroInterno ||
            vehiculo.id}
        </h3>

        <p>
          Indicá qué ocurrió con el
          vehículo al salir del predio.
        </p>
      </div>

      <label>
        ¿Qué pasó con el vehículo? *

        <select
          name="tipoEgreso"
          value={
            form.tipoEgreso
          }
          onChange={
            cambiarTipoEgreso
          }
        >
          <option value="ENTREGADO">
            Entregado al responsable
          </option>

          <option value="TRASLADADO">
            Trasladado a otro destino
          </option>

        
        </select>
      </label>

      {form.tipoEgreso ===
        "ENTREGADO" && (
        <div className="egreso-grid">
          <label>
            Entregado a *

            <input
              name="destinoPersona"
              value={
                form.destinoPersona
              }
              onChange={cambiar}
              placeholder="Nombre completo"
            />
          </label>

          <label>
            DNI

            <input
              name="dniPersona"
              value={
                form.dniPersona
              }
              onChange={cambiar}
              inputMode="numeric"
              placeholder="Documento"
            />
          </label>
        </div>
      )}

      {form.tipoEgreso ===
        "TRASLADADO" && (
        <label>
          Destino del traslado *

          <select
            name="predioDestinoId"
            value={
              form.predioDestinoId
            }
            onChange={cambiar}
            disabled={
              cargandoPredios
            }
          >
            <option value="">
              {cargandoPredios
                ? "Cargando destinos..."
                : "Seleccionar destino"}
            </option>

            {prediosDisponibles.map(
              (predio) => (
                <option
                  key={predio.id}
                  value={predio.id}
                >
                  {predio.nombre}
                </option>
              )
            )}
          </select>
        </label>
      )}

      {form.tipoEgreso ===
        "COMPACTADO" && (
        <div className="egreso-aviso">
          El vehículo quedará
          registrado como compactado.
          Detallá la actuación en
          observaciones.
        </div>
      )}

      {form.tipoEgreso ===
        "OTRO" && (
        <div className="egreso-aviso">
          Detallá en observaciones qué
          ocurrió con el vehículo.
        </div>
      )}

      <label>
        Observaciones

        <textarea
          name="observaciones"
          rows="4"
          value={
            form.observaciones
          }
          onChange={cambiar}
          placeholder={
            form.tipoEgreso ===
            "TRASLADADO"
              ? "Datos del traslado, autorización, observaciones..."
              : form.tipoEgreso ===
                  "ENTREGADO"
                ? "Documentación presentada, autorización, observaciones..."
                : "Detalle de la actuación..."
          }
        />
      </label>

      {error && (
        <div className="egreso-error">
          {error}
        </div>
      )}

      {mensaje && (
        <div className="egreso-ok">
          {mensaje}
        </div>
      )}

      <button
        type="submit"
        className="egreso-guardar"
        disabled={guardando}
      >
        {guardando
          ? "Registrando..."
          : form.tipoEgreso ===
              "TRASLADADO"
            ? "Registrar traslado"
            : "Registrar egreso"}
      </button>
    </form>
  );
};

export default EgresoPredioForm;