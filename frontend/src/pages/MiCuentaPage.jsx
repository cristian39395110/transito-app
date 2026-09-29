import {
  useEffect,
  useState,
} from "react";

import api from "../api/api";

import "./MiCuentaPage.css";


const MiCuentaPage = () => {
  const [
    cargando,
    setCargando,
  ] = useState(true);

  const [
    guardando,
    setGuardando,
  ] = useState(false);

  const [
    cuenta,
    setCuenta,
  ] = useState(null);

  const [
    usuario,
    setUsuario,
  ] = useState("");

  const [
    passwordActual,
    setPasswordActual,
  ] = useState("");

  const [
    passwordNueva,
    setPasswordNueva,
  ] = useState("");

  const [
    repetirPassword,
    setRepetirPassword,
  ] = useState("");

  const [
    verActual,
    setVerActual,
  ] = useState(false);

  const [
    verNueva,
    setVerNueva,
  ] = useState(false);

  const [
    verRepetir,
    setVerRepetir,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    exito,
    setExito,
  ] = useState("");


  /*
  |--------------------------------------------------------------------------
  | CARGAR CUENTA
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const cargarCuenta = async () => {
      try {
        setCargando(true);
        setError("");

        const respuesta =
          await api.get(
            "/usuarios/mi-cuenta"
          );

        const datos =
          respuesta.data?.usuario;

        setCuenta(datos);

        setUsuario(
          datos?.usuario || ""
        );
      } catch (err) {
        console.error(
          "Error cargando cuenta:",
          err
        );

        setError(
          err.response?.data?.mensaje ||
            "No se pudo cargar la cuenta"
        );
      } finally {
        setCargando(false);
      }
    };

    cargarCuenta();
  }, []);


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
    setExito("");

    if (!usuario.trim()) {
      setError(
        "El nombre de usuario no puede quedar vacío"
      );

      return;
    }

    if (
      passwordNueva &&
      passwordNueva !==
        repetirPassword
    ) {
      setError(
        "Las nuevas contraseñas no coinciden"
      );

      return;
    }

    if (
      passwordNueva &&
      !passwordActual
    ) {
      setError(
        "Ingresá tu contraseña actual"
      );

      return;
    }

    if (
      passwordNueva &&
      passwordNueva.length < 6
    ) {
      setError(
        "La nueva contraseña debe tener al menos 6 caracteres"
      );

      return;
    }

    try {
      setGuardando(true);

      const datos = {
        usuario:
          usuario.trim(),
      };

      if (passwordNueva) {
        datos.passwordActual =
          passwordActual;

        datos.passwordNueva =
          passwordNueva;
      }

      const respuesta =
        await api.put(
          "/usuarios/mi-cuenta",
          datos
        );

      setExito(
        respuesta.data?.mensaje ||
          "Cuenta actualizada correctamente"
      );

      setPasswordActual("");
      setPasswordNueva("");
      setRepetirPassword("");

      setVerActual(false);
      setVerNueva(false);
      setVerRepetir(false);

      setCuenta(
        (anterior) => ({
          ...anterior,

          usuario:
            respuesta.data?.usuario
              ?.usuario ||
            usuario.trim(),
        })
      );
    } catch (err) {
      console.error(
        "Error actualizando cuenta:",
        err
      );

      setError(
        err.response?.data?.mensaje ||
          "No se pudo actualizar la cuenta"
      );
    } finally {
      setGuardando(false);
    }
  };


  /*
  |--------------------------------------------------------------------------
  | CARGANDO
  |--------------------------------------------------------------------------
  */

  if (cargando) {
    return (
      <div className="mi-cuenta-page">
        <div className="mi-cuenta-card">
          Cargando cuenta...
        </div>
      </div>
    );
  }


  return (
    <div className="mi-cuenta-page">
      <div className="mi-cuenta-card">

        {/* CABECERA */}

        <div className="mi-cuenta-header">
          <div className="mi-cuenta-avatar">
            👤
          </div>

          <div>
            <h1>
              Mi cuenta
            </h1>

            <p>
              Cambiá tu usuario o contraseña.
            </p>
          </div>
        </div>


        {/* INFORMACIÓN */}

        {cuenta && (
          <div className="mi-cuenta-info">

            <div>
              <span>
                Nombre
              </span>

              <strong>
                {cuenta.nombre}
              </strong>
            </div>

            <div>
              <span>
                Rol
              </span>

              <strong>
                {cuenta.rol?.descripcion ||
                  cuenta.rol?.nombre ||
                  "—"}
              </strong>
            </div>

          </div>
        )}


        <form
          onSubmit={guardar}
          className="mi-cuenta-form"
        >

          {/* USUARIO */}

          <div className="mi-cuenta-seccion">

            <h2>
              Usuario
            </h2>

            <label>
              Nombre de usuario

              <input
                type="text"
                value={usuario}
                onChange={(event) =>
                  setUsuario(
                    event.target.value
                  )
                }
                autoComplete="username"
                disabled={guardando}
              />
            </label>

          </div>


          {/* CONTRASEÑA */}

          <div className="mi-cuenta-seccion">

            <h2>
              Cambiar contraseña
            </h2>

            <p className="mi-cuenta-ayuda">
              Dejá estos campos vacíos si
              no querés cambiarla.
            </p>


            {/* CONTRASEÑA ACTUAL */}

            <label>
              Contraseña actual

              <div className="mi-cuenta-password">
                <input
                  type={
                    verActual
                      ? "text"
                      : "password"
                  }
                  value={passwordActual}
                  onChange={(event) =>
                    setPasswordActual(
                      event.target.value
                    )
                  }
                  autoComplete="current-password"
                  disabled={guardando}
                />

                <button
                  type="button"
                  className="mi-cuenta-ojo"
                  onClick={() =>
                    setVerActual(
                      (anterior) =>
                        !anterior
                    )
                  }
                  aria-label={
                    verActual
                      ? "Ocultar contraseña"
                      : "Mostrar contraseña"
                  }
                  title={
                    verActual
                      ? "Ocultar contraseña"
                      : "Mostrar contraseña"
                  }
                >
                  {verActual
                    ? "🙈"
                    : "👁"}
                </button>
              </div>
            </label>


            {/* NUEVA CONTRASEÑA */}

            <label>
              Nueva contraseña

              <div className="mi-cuenta-password">
                <input
                  type={
                    verNueva
                      ? "text"
                      : "password"
                  }
                  value={passwordNueva}
                  onChange={(event) =>
                    setPasswordNueva(
                      event.target.value
                    )
                  }
                  autoComplete="new-password"
                  disabled={guardando}
                  placeholder="Mínimo 6 caracteres"
                />

                <button
                  type="button"
                  className="mi-cuenta-ojo"
                  onClick={() =>
                    setVerNueva(
                      (anterior) =>
                        !anterior
                    )
                  }
                  aria-label={
                    verNueva
                      ? "Ocultar contraseña"
                      : "Mostrar contraseña"
                  }
                  title={
                    verNueva
                      ? "Ocultar contraseña"
                      : "Mostrar contraseña"
                  }
                >
                  {verNueva
                    ? "🙈"
                    : "👁"}
                </button>
              </div>
            </label>


            {/* REPETIR CONTRASEÑA */}

            <label>
              Repetir nueva contraseña

              <div className="mi-cuenta-password">
                <input
                  type={
                    verRepetir
                      ? "text"
                      : "password"
                  }
                  value={repetirPassword}
                  onChange={(event) =>
                    setRepetirPassword(
                      event.target.value
                    )
                  }
                  autoComplete="new-password"
                  disabled={guardando}
                />

                <button
                  type="button"
                  className="mi-cuenta-ojo"
                  onClick={() =>
                    setVerRepetir(
                      (anterior) =>
                        !anterior
                    )
                  }
                  aria-label={
                    verRepetir
                      ? "Ocultar contraseña"
                      : "Mostrar contraseña"
                  }
                  title={
                    verRepetir
                      ? "Ocultar contraseña"
                      : "Mostrar contraseña"
                  }
                >
                  {verRepetir
                    ? "🙈"
                    : "👁"}
                </button>
              </div>
            </label>

          </div>


          {/* ERROR */}

          {error && (
            <div className="mi-cuenta-error">
              {error}
            </div>
          )}


          {/* ÉXITO */}

          {exito && (
            <div className="mi-cuenta-exito">
              ✓ {exito}
            </div>
          )}


          {/* GUARDAR */}

          <button
            type="submit"
            className="mi-cuenta-guardar"
            disabled={guardando}
          >
            {guardando
              ? "Guardando..."
              : "Guardar cambios"}
          </button>

        </form>
      </div>
    </div>
  );
};


export default MiCuentaPage;