import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import api from "../api/api";

const AuthContext =
  createContext(null);

export const AuthProvider = ({
  children,
}) => {
  const navigate =
    useNavigate();

  const [usuario, setUsuario] =
    useState(null);

  const [cargandoAuth, setCargandoAuth] =
    useState(true);

  useEffect(() => {
    const token =
      localStorage.getItem(
        "token"
      );

    const usuarioGuardado =
      localStorage.getItem(
        "usuario"
      );

    if (
      token &&
      usuarioGuardado
    ) {
      try {
        setUsuario(
          JSON.parse(
            usuarioGuardado
          )
        );
      } catch (error) {
        console.error(
          "Usuario guardado inválido:",
          error
        );

        localStorage.removeItem(
          "token"
        );

        localStorage.removeItem(
          "usuario"
        );
      }
    }

    setCargandoAuth(false);
  }, []);

  const login = async ({
    usuario: nombreUsuario,
    password,
  }) => {
    const respuesta =
      await api.post(
        "/auth/login",
        {
          usuario:
            nombreUsuario,
          password,
        }
      );

    const datos =
      respuesta.data || {};

    const token =
      datos.token ||
      datos.accessToken ||
      datos.data?.token;

    const usuarioRespuesta =
      datos.usuario ||
      datos.data?.usuario;

    if (!token) {
      throw new Error(
        "El servidor no devolvió el token de acceso."
      );
    }

    if (!usuarioRespuesta) {
      throw new Error(
        "El servidor no devolvió los datos del usuario."
      );
    }

    localStorage.setItem(
      "token",
      token
    );

    localStorage.setItem(
      "usuario",
      JSON.stringify(
        usuarioRespuesta
      )
    );

    setUsuario(
      usuarioRespuesta
    );

    return usuarioRespuesta;
  };

  const logout = () => {
    localStorage.removeItem(
      "token"
    );

    localStorage.removeItem(
      "usuario"
    );

    setUsuario(null);

    navigate(
      "/login",
      {
        replace: true,
      }
    );
  };

  const rol =
    usuario?.rol?.nombre ||
    usuario?.Rol?.nombre ||
    usuario?.rol ||
    null;

  const valor =
    useMemo(
      () => ({
        usuario,
        setUsuario,

        rol,

        autenticado:
          Boolean(usuario),

        cargandoAuth,

        login,
        logout,
      }),
      [
        usuario,
        rol,
        cargandoAuth,
      ]
    );

  return (
    <AuthContext.Provider
      value={valor}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const contexto =
    useContext(AuthContext);

  if (!contexto) {
    throw new Error(
      "useAuth debe utilizarse dentro de AuthProvider."
    );
  }

  return contexto;
};