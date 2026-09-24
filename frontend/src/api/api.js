import axios from "axios";

const api = axios.create({
  baseURL:
    import.meta.env
      .VITE_API_URL ||
    "http://localhost:3001/api",

  timeout: 30000,
});

api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem(
        "token"
      );

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },

  (error) =>
    Promise.reject(error)
);

api.interceptors.response.use(
  (respuesta) =>
    respuesta,

  (error) => {
    const status =
      error.response?.status;

    if (status === 401) {
      localStorage.removeItem(
        "token"
      );

      localStorage.removeItem(
        "usuario"
      );

      const estaEnLogin =
        window.location.pathname ===
        "/login";

      if (!estaEnLogin) {
        window.location.href =
          "/login";
      }
    }

    return Promise.reject(
      error
    );
  }
);

export default api;