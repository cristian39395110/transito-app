import {
  useState,
} from "react";

import {
  Navigate,
  useNavigate,
} from "react-router-dom";

import {
  useAuth,
} from "../context/AuthContext";

import "./LoginPage.css";

const LoginPage = () => {
  const navigate =
    useNavigate();

  const {
    login,
    autenticado,
  } = useAuth();

  const [
    usuario,
    setUsuario,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    mostrarPassword,
    setMostrarPassword,
  ] = useState(false);

  const [
    cargando,
    setCargando,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  if (autenticado) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  const manejarSubmit =
    async (event) => {
      event.preventDefault();

      setError("");

      if (
        !usuario.trim() ||
        !password
      ) {
        setError(
          "Ingresá usuario y contraseña"
        );

        return;
      }

      try {
        setCargando(true);

        await login({
          usuario:
            usuario.trim(),
          password,
        });

        navigate("/", {
          replace: true,
        });
      } catch (err) {
        console.error(
          "Error iniciando sesión:",
          err
        );

        setError(
          err.response?.data
            ?.mensaje ||
            "No se pudo iniciar sesión"
        );
      } finally {
        setCargando(false);
      }
    };

  return (
    <main className="login-page">
      <div className="login-contenedor">

        {/* PANEL INSTITUCIONAL */}

        <section className="login-presentacion">
          <div className="login-presentacion-superior">
            <div className="login-marca">
              <div className="login-marca-logo">
                SL
              </div>

              <div className="login-marca-texto">
                <strong>
                  Municipalidad
                </strong>

                <span>
                  San Luis
                </span>
              </div>
            </div>

            <div className="login-presentacion-contenido">
              <span className="login-etiqueta">
                SISTEMA INTERNO
              </span>

              <h1>
                Tránsito
                <br />
                y Vía Pública
              </h1>

              <p>
                Gestión y seguimiento
                de actuaciones en la
                vía pública.
              </p>
            </div>
          </div>

          <div className="login-modulos">
            <div>
              <span>
                01
              </span>

              <p>
                Reclamos
              </p>
            </div>

            <div>
              <span>
                02
              </span>

              <p>
                Inspecciones
              </p>
            </div>

            <div>
              <span>
                03
              </span>

              <p>
                Actuaciones
              </p>
            </div>

            <div>
              <span>
                04
              </span>

              <p>
                Predio
              </p>
            </div>
          </div>
        </section>


        {/* LOGIN */}

        <section className="login-acceso">
          <div className="login-card">

            <div className="login-logo-mobile">
              SL
            </div>

            <div className="login-titulo">
              <span>
                ACCESO AL SISTEMA
              </span>

              <h2>
                Iniciar sesión
              </h2>

              <p>
                Ingresá con tu usuario
                asignado para continuar.
              </p>
            </div>

            <form
              className="login-form"
              onSubmit={
                manejarSubmit
              }
            >
              <label>
                <span>
                  Usuario
                </span>

                <div className="login-input-contenedor">
                  <span className="login-input-icono">
                    ♟
                  </span>

                  <input
                    type="text"
                    value={usuario}
                    onChange={(
                      event
                    ) =>
                      setUsuario(
                        event.target
                          .value
                      )
                    }
                    autoComplete="username"
                    placeholder="Ingresá tu usuario"
                    disabled={
                      cargando
                    }
                    autoFocus
                  />
                </div>
              </label>

              <label>
                <span>
                  Contraseña
                </span>

                <div className="login-input-contenedor">
                  <span className="login-input-icono">
                    ●
                  </span>

                  <input
                    type={
                      mostrarPassword
                        ? "text"
                        : "password"
                    }
                    value={password}
                    onChange={(
                      event
                    ) =>
                      setPassword(
                        event.target
                          .value
                      )
                    }
                    autoComplete="current-password"
                    placeholder="Ingresá tu contraseña"
                    disabled={
                      cargando
                    }
                  />

                  <button
                    type="button"
                    className="login-ver-password"
                    onClick={() =>
                      setMostrarPassword(
                        (actual) =>
                          !actual
                      )
                    }
                    disabled={
                      cargando
                    }
                  >
                    {mostrarPassword
                      ? "Ocultar"
                      : "Ver"}
                  </button>
                </div>
              </label>

              {error && (
                <div
                  className="login-error"
                  role="alert"
                >
                  <strong>
                    No pudimos ingresar
                  </strong>

                  <span>
                    {error}
                  </span>
                </div>
              )}

              <button
                className="login-boton"
                type="submit"
                disabled={
                  cargando
                }
              >
                {cargando ? (
                  <>
                    <span className="login-spinner" />

                    Ingresando...
                  </>
                ) : (
                  <>
                    Ingresar

                    <span>
                      →
                    </span>
                  </>
                )}
              </button>
            </form>

            <div className="login-footer">
              <span>
                Uso interno
              </span>

              <strong>
                Municipalidad de
                San Luis
              </strong>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default LoginPage;