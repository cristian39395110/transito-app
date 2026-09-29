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

      numeroLibro: "",

      numeroPagina: "",

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

  const [
    guardando,
    setGuardando,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    mensaje,
    setMensaje,
  ] = useState("");


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
      La documentación NO se limpia
      al cambiar el tipo de egreso.

      Oficio, libro y página pueden
      utilizarse en cualquier egreso.
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
    |
    | Solamente el predio de destino
    | es obligatorio.
    |
    | Oficio, libro y página
    | son opcionales.
    |
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

    let textoConfirmacion =
      "¿Confirmás el egreso del vehículo?";

    if (
      form.tipoEgreso ===
      "TRASLADADO"
    ) {
      const predioDestino =
        prediosDisponibles.find(
          (predio) =>
            Number(predio.id) ===
            Number(
              form.predioDestinoId
            )
        );

      textoConfirmacion =
        `¿Confirmás el traslado del vehículo a ${
          predioDestino?.nombre ||
          "otro predio"
        }?`;
    }

    if (
      form.tipoEgreso ===
      "ENTREGADO"
    ) {
      textoConfirmacion =
        `¿Confirmás la entrega del vehículo a ${
          form.destinoPersona.trim()
        }?`;
    }

    const confirmar =
      window.confirm(
        textoConfirmacion
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
            Number(
              reclamo.id
            ),

          vehiculoId:
            Number(
              vehiculo.id
            ),

          ingresoPredioId:
            Number(
              ingresoPredio.id
            ),

          tipoEgreso:
            form.tipoEgreso,


          /*
          |--------------------------------------------------------------------------
          | DOCUMENTACIÓN OPCIONAL
          |--------------------------------------------------------------------------
          */

          numeroOficio:
            form.numeroOficio
              .trim() ||
            null,

          numeroLibro:
            form.numeroLibro
              .trim() ||
            null,

          numeroPagina:
            form.numeroPagina
              .trim() ||
            null,


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
        form.tipoEgreso ===
          "TRASLADADO"
          ? "Traslado registrado correctamente."
          : "Egreso registrado correctamente."
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
      | DOCUMENTACIÓN
      |--------------------------------------------------------------------------
      */}

      <div className="egreso-documentacion">
        <div className="egreso-documentacion-titulo">
          <strong>
            Documentación
          </strong>

          <span>
            Opcional
          </span>
        </div>

        <p className="egreso-documentacion-ayuda">
          Completá los datos que figuren
          en la documentación disponible.
          Podés dejar todos los campos
          vacíos.
        </p>

        <label>
          N.º de oficio

          <input
            type="text"
            name="numeroOficio"
            value={
              form.numeroOficio
            }
            onChange={cambiar}
            placeholder="Ej.: 1548/2026"
            autoComplete="off"
          />
        </label>

        <div className="egreso-grid">
          <label>
            N.º de libro

            <input
              type="text"
              name="numeroLibro"
              value={
                form.numeroLibro
              }
              onChange={cambiar}
              placeholder="Ej.: 12"
              autoComplete="off"
            />
          </label>

          <label>
            N.º de página

            <input
              type="text"
              name="numeroPagina"
              value={
                form.numeroPagina
              }
              onChange={cambiar}
              placeholder="Ej.: 145"
              autoComplete="off"
            />
          </label>
        </div>
      </div>


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