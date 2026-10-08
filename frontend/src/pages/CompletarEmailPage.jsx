import {
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import api from "../api/api";

import {
  useAuth,
} from "../context/AuthContext";

const CompletarEmailPage = () => {
  const navigate =
    useNavigate();

  const {
    usuario,
    setUsuario,
    logout,
  } = useAuth();

  const [email, setEmail] =
    useState("");

  const [guardando, setGuardando] =
    useState(false);

  const [error, setError] =
    useState("");

  const guardarEmail = async (
    event
  ) => {
    event.preventDefault();

    const emailLimpio =
      email
        .trim()
        .toLowerCase();

    if (!emailLimpio) {
      setError(
        "Ingresá tu correo electrónico."
      );

      return;
    }

    try {
      setGuardando(true);
      setError("");

      const respuesta =
        await api.patch(
          "/usuarios/mi-email",
          {
            email:
              emailLimpio,
          }
        );

      const emailGuardado =
        respuesta.data
          ?.usuario
          ?.email;

      if (!emailGuardado) {
        throw new Error(
          "El servidor no devolvió el email guardado."
        );
      }

      /*
      |--------------------------------------------------------------------------
      | ACTUALIZAR USUARIO DE LA SESIÓN
      |--------------------------------------------------------------------------
      */

      const usuarioActualizado = {
        ...usuario,
        email:
          emailGuardado,
      };

      setUsuario(
        usuarioActualizado
      );

      localStorage.setItem(
        "usuario",
        JSON.stringify(
          usuarioActualizado
        )
      );

      navigate(
        "/",
        {
          replace: true,
        }
      );
    } catch (error) {
      console.error(
        "Error guardando email:",
        error
      );

      setError(
        error.response
          ?.data
          ?.mensaje ||
          error.message ||
          "No se pudo guardar el email."
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f6f8",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "440px",
          background: "#ffffff",
          borderRadius: "16px",
          padding: "30px",
          boxShadow:
            "0 10px 30px rgba(0,0,0,0.08)",
        }}
      >
        <div
          style={{
            fontSize: "42px",
            textAlign: "center",
            marginBottom: "10px",
          }}
        >
          📧
        </div>

        <h2
          style={{
            margin: "0 0 10px",
            textAlign: "center",
          }}
        >
          Registrá tu correo
        </h2>

        <p
          style={{
            color: "#6b7280",
            fontSize: "14px",
            lineHeight: "1.5",
            textAlign: "center",
            marginBottom: "24px",
          }}
        >
          Hola{" "}
          <strong>
            {usuario?.nombre}
          </strong>
          . Necesitamos tu correo
          electrónico para enviarte
          avisos cuando tengas nuevas
          tareas o actuaciones
          pendientes.
        </p>

        <form
          onSubmit={
            guardarEmail
          }
        >
          <label
            style={{
              display: "block",
              fontWeight: "600",
              fontSize: "13px",
              marginBottom: "7px",
            }}
          >
            Correo electrónico
          </label>

          <input
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(
                event.target.value
              );

              setError("");
            }}
            placeholder="ejemplo@gmail.com"
            autoComplete="email"
            autoFocus
            disabled={guardando}
            style={{
              width: "100%",
              boxSizing:
                "border-box",
              padding:
                "12px 14px",
              border:
                "1px solid #d1d5db",
              borderRadius: "9px",
              fontSize: "15px",
              outline: "none",
            }}
          />

          {error && (
            <div
              style={{
                marginTop: "10px",
                padding: "10px",
                borderRadius: "8px",
                background:
                  "#fef2f2",
                color:
                  "#b91c1c",
                fontSize: "13px",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={guardando}
            style={{
              width: "100%",
              marginTop: "18px",
              padding: "12px",
              border: "none",
              borderRadius: "9px",
              background:
                "#111827",
              color: "#ffffff",
              fontWeight: "700",
              cursor:
                guardando
                  ? "default"
                  : "pointer",
              opacity:
                guardando
                  ? 0.7
                  : 1,
            }}
          >
            {guardando
              ? "Guardando..."
              : "Guardar y continuar"}
          </button>
        </form>

        <button
          type="button"
          onClick={logout}
          disabled={guardando}
          style={{
            width: "100%",
            marginTop: "10px",
            padding: "10px",
            border: "none",
            background:
              "transparent",
            color: "#6b7280",
            cursor: "pointer",
          }}
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
};

export default CompletarEmailPage;