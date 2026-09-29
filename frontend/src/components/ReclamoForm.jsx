import {
  useEffect,
  useState,
} from "react";

import api from "../api/api";

import SelectorUbicacionMapa from "./SelectorUbicacionMapa";

import "./ReclamoForm.css";

const ReclamoForm = ({
  reclamo = null,
  onCreado,
  onActualizado,
  onCancelar,
  permitirAsignarJefe = false,
}) => {
  const [
    form,
    setForm,
  ] = useState({
    numeroReclamo: "",
    tipoReclamoId: "",
    direccion: "",
    barrio: "",
    referencia: "",
    observaciones: "",
    latitudDenunciada: "",
    longitudDenunciada: "",
  });


  const editando =
  Boolean(reclamo?.id);

useEffect(() => {
  if (!reclamo) {
    return;
  }

  setForm({
    numeroReclamo:
      reclamo.numeroReclamo || "",

    tipoReclamoId:
      reclamo.tipoReclamoId
        ? String(reclamo.tipoReclamoId)
        : "",

    direccion:
      reclamo.direccion || "",

    barrio:
      reclamo.barrio || "",

    referencia:
      reclamo.referencia || "",

    observaciones:
      reclamo.observaciones || "",

    latitudDenunciada:
      reclamo.latitudDenunciada ?? "",

    longitudDenunciada:
      reclamo.longitudDenunciada ?? "",
  });
}, [reclamo]);
  const [
    tipos,
    setTipos,
  ] = useState([]);

  const [
    cargandoTipos,
    setCargandoTipos,
  ] = useState(true);

  const [
    mostrarMapa,
    setMostrarMapa,
  ] = useState(false);

  const [
    guardando,
    setGuardando,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
  jefesGuardia,
  setJefesGuardia,
] = useState([]);

const [
  jefeGuardiaId,
  setJefeGuardiaId,
] = useState("");

const [
  cargandoJefes,
  setCargandoJefes,
] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | TIPOS DE RECLAMO
  |--------------------------------------------------------------------------
  */

  
  useEffect(() => {
    const cargarTipos =
      async () => {
        try {
          setCargandoTipos(true);

          const respuesta =
            await api.get(
              "/tipos-reclamo"
            );

          const datos =
            respuesta.data || {};

          const lista =
            datos.tipos ||
            datos.tiposReclamo ||
            datos.tipoReclamos ||
            datos.data ||
            (Array.isArray(datos)
              ? datos
              : []);

          setTipos(
            Array.isArray(lista)
              ? lista
              : []
          );
        } catch (err) {
          console.error(
            "Error cargando tipos:",
            err
          );

          setTipos([]);

          setError(
            err.response?.data
              ?.mensaje ||
              "No se pudieron cargar los tipos de reclamo"
          );
        } finally {
          setCargandoTipos(
            false
          );
        }
      };

    cargarTipos();
  }, []);

  const cambiar = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setForm(
      (anterior) => ({
        ...anterior,
        [name]: value,
      })
    );
  };

  /*
  |--------------------------------------------------------------------------
  | MAPA
  |--------------------------------------------------------------------------
  */

  const cambiarUbicacion = ({
    latitud,
    longitud,
  }) => {
    setForm(
      (anterior) => ({
        ...anterior,

        latitudDenunciada:
          latitud,

        longitudDenunciada:
          longitud,
      })
    );
  };

  const quitarUbicacion =
    () => {
      setForm(
        (anterior) => ({
          ...anterior,

          latitudDenunciada:
            "",

          longitudDenunciada:
            "",
        })
      );
    };

  const tieneUbicacion =
    form.latitudDenunciada !==
      "" &&
    form.longitudDenunciada !==
      "";


      useEffect(() => {
  const cargarJefes = async () => {
    if (
      !permitirAsignarJefe ||
      editando
    ) {
      setJefesGuardia([]);
      return;
    }

    try {
      setCargandoJefes(true);

      const respuesta =
        await api.get("/usuarios");

      const lista =
        respuesta.data?.usuarios ||
        respuesta.data ||
        [];

      const jefes =
        Array.isArray(lista)
          ? lista.filter((item) => {
              const nombreRol =
                item.rol?.nombre ||
                item.Rol?.nombre ||
                (
                  typeof item.rol === "string"
                    ? item.rol
                    : ""
                );

              return (
                nombreRol === "jefe_guardia" &&
                item.activo !== false
              );
            })
          : [];

      setJefesGuardia(jefes);
    } catch (err) {
      console.error(
        "Error cargando jefes de guardia:",
        err
      );

      setJefesGuardia([]);
    } finally {
      setCargandoJefes(false);
    }
  };

  cargarJefes();
}, [
  permitirAsignarJefe,
  editando,
]);

  /*
  |--------------------------------------------------------------------------
  | GUARDAR
  |--------------------------------------------------------------------------
  */

  const guardar =
    async (event) => {
      event.preventDefault();

      setError("");

      if (
        !form.numeroReclamo.trim()
      ) {
        setError(
          "Ingresá el número del reclamo externo"
        );

        return;
      }

      if (
        !form.tipoReclamoId
      ) {
        setError(
          "Seleccioná el tipo de reclamo"
        );

        return;
      }

      if (
        !form.direccion.trim()
      ) {
        setError(
          "Ingresá la dirección"
        );

        return;
      }

      const datos = {
        numeroReclamo:
          form.numeroReclamo.trim(),

        tipoReclamoId:
          Number(
            form.tipoReclamoId
          ),

        direccion:
          form.direccion.trim(),

        barrio:
          form.barrio.trim() ||
          null,

        referencia:
          form.referencia.trim() ||
          null,

        observaciones:
          form.observaciones.trim() ||
          null,

        latitudDenunciada:
          tieneUbicacion
            ? Number(
                form.latitudDenunciada
              )
            : null,

        longitudDenunciada:
          tieneUbicacion
            ? Number(
                form.longitudDenunciada
              )
            : null,
      };

      try {
  setGuardando(true);

  let respuesta;

  if (editando) {
    respuesta =
      await api.put(
        `/reclamos/${reclamo.id}`,
        datos
      );

    if (onActualizado) {
      await onActualizado(
        respuesta.data?.reclamo ||
          respuesta.data
      );
    }
 } else {
  respuesta =
    await api.post(
      "/reclamos",
      datos
    );

  const reclamoCreado =
    respuesta.data?.reclamo ||
    respuesta.data;

  if (
    permitirAsignarJefe &&
    jefeGuardiaId &&
    reclamoCreado?.id
  ) {
    await api.patch(
      `/asignaciones/reclamos/${reclamoCreado.id}/jefe`,
      {
        jefeGuardiaId:
          Number(jefeGuardiaId),
      }
    );
  }

  if (onCreado) {
    await onCreado(
      reclamoCreado
    );
  }
}
} catch (err) {
  console.error(
    editando
      ? "Error actualizando reclamo:"
      : "Error creando reclamo:",
    err
  );

  setError(
    err.response?.data?.mensaje ||
      (editando
        ? "No se pudo actualizar el reclamo"
        : "No se pudo crear el reclamo")
  );
} finally {
  setGuardando(false);
}
    };

  const tiposActivos =
    tipos.filter(
      (tipo) =>
        tipo.activo !== false
    );

  return (
    <form
      className="reclamo-form"
      onSubmit={guardar}
    >
    <div className="reclamo-form-header">
  <h2>
    {editando
      ? "Editar reclamo"
      : "Nuevo reclamo"}
  </h2>

  <p>
    {editando
      ? "Corregí los datos cargados del reclamo."
      : "Cargá los datos recibidos desde el sistema externo."}
  </p>
</div>

      <div className="reclamo-form-destacado">
        <label>
          Número de reclamo externo *

          <input
            name="numeroReclamo"
            value={
              form.numeroReclamo
            }
            onChange={cambiar}
            placeholder="Ej: 3303819"
            autoFocus
          />
        </label>
      </div>

      <div className="reclamo-form-grid">
        <label>
          Tipo de reclamo *

          <select
            name="tipoReclamoId"
            value={
              form.tipoReclamoId
            }
            onChange={cambiar}
            disabled={
              cargandoTipos
            }
          >
            <option value="">
              {cargandoTipos
                ? "Cargando tipos..."
                : "Seleccionar tipo..."}
            </option>

            {tiposActivos.map(
              (tipo) => (
                <option
                  key={tipo.id}
                  value={tipo.id}
                >
                  {tipo.nombre}
                </option>
              )
            )}
          </select>

          {!cargandoTipos &&
            tiposActivos.length ===
              0 && (
              <small className="reclamo-form-aviso">
                No hay tipos activos.
                Un administrador debe
                cargarlos desde
                "Tipos reclamo".
              </small>
            )}
        </label>

        <label>
          Dirección *

          <input
            name="direccion"
            value={
              form.direccion
            }
            onChange={cambiar}
            placeholder="Ej: Av. Lafinur 850"
          />
        </label>

        <label>
          Barrio

          <input
            name="barrio"
            value={
              form.barrio
            }
            onChange={cambiar}
            placeholder="Opcional"
          />
        </label>

        <label>
          Referencia

          <input
            name="referencia"
            value={
              form.referencia
            }
            onChange={cambiar}
            placeholder="Ej: frente a la plaza"
          />
        </label>
      </div>

      {/* MAPA */}

      <div className="reclamo-ubicacion">
        <div className="reclamo-ubicacion-header">
          <div>
            <strong>
              Ubicación en el mapa
            </strong>

            <span>
              Opcional
            </span>
          </div>

          <button
            type="button"
            className="reclamo-mapa-boton"
            onClick={() =>
              setMostrarMapa(
                (anterior) =>
                  !anterior
              )
            }
          >
            {mostrarMapa
              ? "Ocultar mapa"
              : tieneUbicacion
                ? "Cambiar ubicación"
                : "📍 Marcar en el mapa"}
          </button>
        </div>

        <p>
          Marcá el punto exacto si
          conocés la ubicación. Si no,
          podés guardar solamente la
          dirección.
        </p>

        {mostrarMapa && (
          <SelectorUbicacionMapa
            latitud={
              tieneUbicacion
                ? Number(
                    form.latitudDenunciada
                  )
                : null
            }
            longitud={
              tieneUbicacion
                ? Number(
                    form.longitudDenunciada
                  )
                : null
            }
            onCambiar={
              cambiarUbicacion
            }
          />
        )}

        {tieneUbicacion && (
          <div className="reclamo-ubicacion-seleccionada">
            <div>
              <strong>
                ✓ Ubicación marcada
              </strong>

              <span>
                El punto quedará
                asociado al reclamo.
              </span>
            </div>

            <button
              type="button"
              onClick={
                quitarUbicacion
              }
            >
              Quitar
            </button>
          </div>
        )}
      </div>

      <label>
        Observaciones importantes

        <textarea
          name="observaciones"
          value={
            form.observaciones
          }
          onChange={cambiar}
          rows="4"
          placeholder="Información necesaria para trabajar el reclamo..."
        />
      </label>


      {permitirAsignarJefe && !editando && (
 <div className="reclamo-asignacion-jefe">
    <label>
      Asignar directamente a un jefe de guardia

      <select
        value={jefeGuardiaId}
        onChange={(event) =>
          setJefeGuardiaId(
            event.target.value
          )
        }
        disabled={
          guardando ||
          cargandoJefes
        }
      >
        <option value="">
          {cargandoJefes
            ? "Cargando jefes..."
            : "Dejar para que lo asigne Director"}
        </option>

        {jefesGuardia.map((jefe) => (
          <option
            key={jefe.id}
            value={jefe.id}
          >
            {jefe.nombre || jefe.usuario}
          </option>
        ))}
      </select>

      <small>
        Opcional. Si elegís un jefe,
        el reclamo se le asignará
        directamente al crearlo.
      </small>
    </label>
  </div>
)}

      {error && (
        <div className="reclamo-form-error">
          {error}
        </div>
      )}

      <div className="reclamo-form-acciones">
        <button
          type="button"
          className="reclamo-form-cancelar"
          onClick={onCancelar}
          disabled={guardando}
        >
          Cancelar
        </button>

        <button
          type="submit"
          className="reclamo-form-guardar"
          disabled={
            guardando ||
            cargandoTipos ||
            tiposActivos.length ===
              0
          }
        >
        {guardando
  ? "Guardando..."
  : editando
    ? "Guardar cambios"
    : "Crear reclamo"}
        </button>
      </div>
    </form>
  );
};

export default ReclamoForm;