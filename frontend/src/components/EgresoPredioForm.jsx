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
      numeroOficio: "",
      observaciones: "",
    });

 const [predios, setPredios] =
  useState([]);

const [
  cargandoPredios,
  setCargandoPredios,
] = useState(false);

const [
  errorPredios,
  setErrorPredios,
] = useState("");

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
        setErrorPredios("");

        const respuesta =
       await api.get(
  "/predios/destinos"
);

        const lista =
          respuesta.data
            ?.predios ||
          [];

        console.log(
          "Predios recibidos:",
          lista
        );

        setPredios(
          lista.filter(
            (predio) =>
              predio.activo !==
              false
          )
        );
      } catch (err) {
        console.error(
          "Error cargando destinos:",
          err
        );

        setPredios([]);

        setErrorPredios(
          err.response?.data
            ?.mensaje ||
          "No se pudieron cargar los predios."
        );
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

      /*
      El oficio NO se limpia.

      El oficio autoriza la salida,
      independientemente del destino.
      */
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
    (predio) => {
      const esPredioActual =
        Number(predio.id) ===
        Number(
          ingresoPredio?.predioId
        );

      return (
        !esPredioActual &&
        predio.activo !== false
      );
    }
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

    /*
    |--------------------------------------------------------------------------
    | TIPO DE EGRESO
    |--------------------------------------------------------------------------
    */

    if (!form.tipoEgreso) {
      setError(
        "Seleccioná el tipo de egreso."
      );

      return;
    }

    /*
    |--------------------------------------------------------------------------
    | NÚMERO DE OFICIO
    |--------------------------------------------------------------------------
    |
    | Todo vehículo que sale del predio
    | debe tener un oficio que autorice
    | su salida.
    |
    */

    if (
      !form.numeroOficio.trim()
    ) {
      setError(
        "Ingresá el número de oficio que autoriza la salida del vehículo."
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

    /*
    |--------------------------------------------------------------------------
    | CONFIRMACIÓN
    |--------------------------------------------------------------------------
    */

    const confirmar =
      window.confirm(
        form.tipoEgreso ===
          "TRASLADADO"
          ? `¿Confirmás el traslado del vehículo por oficio N.º ${form.numeroOficio.trim()}?`
          : `¿Confirmás el egreso del vehículo por oficio N.º ${form.numeroOficio.trim()}?`
      );

    if (!confirmar) {
      return;
    }

    /*
    |--------------------------------------------------------------------------
    | GUARDAR
    |--------------------------------------------------------------------------
    */

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

          /*
          |--------------------------------------------------------------------------
          | OFICIO
          |--------------------------------------------------------------------------
          */

          numeroOficio:
            form.numeroOficio
              .trim(),

          /*
          |--------------------------------------------------------------------------
          | DESTINO
          |--------------------------------------------------------------------------
          */

          predioDestinoId:
            form.tipoEgreso ===
              "TRASLADADO"
              ? Number(
                  form.predioDestinoId
                )
              : null,

          /*
          |--------------------------------------------------------------------------
          | PERSONA QUE RETIRA
          |--------------------------------------------------------------------------
          */

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

          /*
          |--------------------------------------------------------------------------
          | OBSERVACIONES
          |--------------------------------------------------------------------------
          */

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

      {/*
      |--------------------------------------------------------------------------
      | NÚMERO DE OFICIO
      |--------------------------------------------------------------------------
      */}

      <label>
        N.º de oficio *

        <input
          type="text"
          name="numeroOficio"
          value={
            form.numeroOficio
          }
          onChange={cambiar}
          placeholder="Ej.: 1548/2026"
          autoComplete="off"
          required
        />

        <small>
          Oficio que autoriza la salida
          del vehículo del predio.
        </small>
      </label>

      {/*
      |--------------------------------------------------------------------------
      | TIPO DE EGRESO
      |--------------------------------------------------------------------------
      */}

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

          <option value="COMPACTADO">
            Enviado a compactación
          </option>

          <option value="OTRO">
            Otro destino
          </option>
        </select>
      </label>

      {/*
      |--------------------------------------------------------------------------
      | ENTREGADO
      |--------------------------------------------------------------------------
      */}

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

      {/*
      |--------------------------------------------------------------------------
      | TRASLADADO
      |--------------------------------------------------------------------------
      */}

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
          cargandoPredios ||
          prediosDisponibles.length ===
            0
        }
      >
        <option value="">
          {cargandoPredios
            ? "Cargando predios..."
            : prediosDisponibles.length >
                0
              ? "Seleccionar predio de destino"
              : "No hay otros predios disponibles"}
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

      {errorPredios && (
        <small className="egreso-error-predios">
          {errorPredios}
        </small>
      )}

      {!cargandoPredios &&
        !errorPredios &&
        prediosDisponibles.length ===
          0 && (
          <small>
            No existe otro predio
            activo disponible para
            realizar el traslado.
          </small>
        )}
    </label>
  )}
      {/*
      |--------------------------------------------------------------------------
      | COMPACTADO
      |--------------------------------------------------------------------------
      */}

      {form.tipoEgreso ===
        "COMPACTADO" && (
        <div className="egreso-aviso">
          El vehículo quedará
          registrado como compactado.

          Detallá la actuación en
          observaciones.
        </div>
      )}

      {/*
      |--------------------------------------------------------------------------
      | OTRO
      |--------------------------------------------------------------------------
      */}

      {form.tipoEgreso ===
        "OTRO" && (
        <div className="egreso-aviso">
          Detallá en observaciones qué
          ocurrió con el vehículo.
        </div>
      )}

      {/*
      |--------------------------------------------------------------------------
      | OBSERVACIONES
      |--------------------------------------------------------------------------
      */}

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

      {/*
      |--------------------------------------------------------------------------
      | MENSAJES
      |--------------------------------------------------------------------------
      */}

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

      {/*
      |--------------------------------------------------------------------------
      | GUARDAR
      |--------------------------------------------------------------------------
      */}

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