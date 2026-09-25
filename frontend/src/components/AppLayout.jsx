import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  NavLink,
  Outlet,
  useLocation,
} from "react-router-dom";

import {
  useAuth,
} from "../context/AuthContext";

import api from "../api/api";

import "./AppLayout.css";

const AppLayout = () => {
  const {
    usuario,
    rol,
    logout,
  } = useAuth();

  const location =
    useLocation();

  const [
    mostrarMas,
    setMostrarMas,
  ] = useState(false);

  const [
    contadores,
    setContadores,
  ] = useState({
    reclamos: 0,
    juzgado: 0,
    paraCerrar: 0,
    miGuardia: 0,
    misTrabajos: 0,
    predio: 0,
  });

  /*
  |--------------------------------------------------------------------------
  | CARGAR CONTADORES
  |--------------------------------------------------------------------------
  */

  const cargarContadores =
    useCallback(
      async () => {
        try {
          const respuesta =
            await api.get(
              "/notificaciones/resumen"
            );

          const datos =
            respuesta.data
              ?.contadores ||
            {};

          setContadores({
            reclamos:
              Number(
                datos.reclamos
              ) || 0,

            juzgado:
              Number(
                datos.juzgado
              ) || 0,

            paraCerrar:
              Number(
                datos.paraCerrar
              ) || 0,

            miGuardia:
              Number(
                datos.miGuardia
              ) || 0,

            misTrabajos:
              Number(
                datos.misTrabajos
              ) || 0,

            predio:
              Number(
                datos.predio
              ) || 0,
          });
        } catch (error) {
          console.error(
            "Error cargando contadores:",
            error
          );
        }
      },
      []
    );

  /*
  |--------------------------------------------------------------------------
  | ACTUALIZAR CONTADORES
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    cargarContadores();

    const intervalo =
      setInterval(
        cargarContadores,
        30000
      );

    return () => {
      clearInterval(
        intervalo
      );
    };
  }, [
    cargarContadores,
    location.pathname,
  ]);

  /*
  |--------------------------------------------------------------------------
  | CERRAR MENÚ MÁS AL CAMBIAR DE PANTALLA
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    setMostrarMas(false);
  }, [
    location.pathname,
  ]);

  /*
  |--------------------------------------------------------------------------
  | PERMISOS
  |--------------------------------------------------------------------------
  */

  const puede = (
    rolesPermitidos
  ) => {
    if (!rolesPermitidos) {
      return true;
    }

    return rolesPermitidos.includes(
      rol
    );
  };

  /*
  |--------------------------------------------------------------------------
  | MENÚ
  |--------------------------------------------------------------------------
  */

  const menu = [
 {
  to: "/",
  texto: "Inicio",
  icono: "⌂",
  end: true,

  roles: [
    "administrador",
    "director",
    "jefe_guardia",
    "inspector",
    "secretaria_reclamos",
  ],
},

    {
      to: "/reclamos",
      texto: "Reclamos",
      icono: "☷",
      contador:
        "reclamos",

      roles: [
        "administrador",
        "director",
        "secretaria_reclamos",
      ],
    },

    {
      to: "/juzgado",
      texto: "Juzgado",
      icono: "⚖",
      contador:
        "juzgado",

      roles: [
        "administrador",
        "secretaria_reclamos",
      ],
    },

    {
      to: "/para-cerrar",
      texto: "Para cerrar",
      icono: "✓",
      contador:
        "paraCerrar",

      roles: [
        "administrador",
        "secretaria_reclamos",
      ],
    },

    {
      to: "/expedientes",
      texto: "Expedientes",
      icono: "🗂",

      roles: [
        "administrador",
        "director",
        "jefe_guardia",
        "secretaria_reclamos",
        "secretaria_predio",
      ],
    },

    {
      to: "/mi-guardia",
      texto: "Mi guardia",
      icono: "▤",
      contador:
        "miGuardia",

      roles: [
        
        "jefe_guardia",
      ],
    },

    {
      to: "/mis-trabajos",
      texto: "Mis trabajos",
      icono: "✓",
      contador:
        "misTrabajos",

      roles: [
       
        "inspector",
      ],
    },

   
    {
      to: "/predio",
      texto: "Predio",
      icono: "▣",
      contador:
        "predio",

      roles: [
        "administrador",
        "director",
        "jefe_guardia",
        "secretaria_reclamos",
        "secretaria_predio",
      ],
    },

    {
      to: "/usuarios",
      texto: "Usuarios",
      icono: "♟",

      roles: [
        "administrador",
      ],
    },

    {
      to: "/destinos",
      texto:
        "Destinos / Predios",
      icono: "▣",

      roles: [
        "administrador",
      ],
    },

    {
      to: "/tipos-reclamo",
      texto:
        "Tipos reclamo",
      icono: "⚙",

      roles: [
        "administrador",
      ],
    },
  ];

  const visibles =
    menu.filter(
      (item) =>
        puede(item.roles)
    );

  /*
  |--------------------------------------------------------------------------
  | MENÚ CELULAR
  |--------------------------------------------------------------------------
  |
  | Primeros 4 accesos visibles.
  | El resto queda dentro de "Más".
  |
  */

  const menuMobilePrincipal =
    visibles.slice(0, 4);

  const menuMobileMas =
    visibles.slice(4);

  /*
  |--------------------------------------------------------------------------
  | CONTADOR
  |--------------------------------------------------------------------------
  */

  const obtenerCantidad = (
    item
  ) => {
    if (!item.contador) {
      return 0;
    }

    return (
      Number(
        contadores[
          item.contador
        ]
      ) || 0
    );
  };

  /*
  |--------------------------------------------------------------------------
  | CONTADOR TOTAL DEL BOTÓN MÁS
  |--------------------------------------------------------------------------
  |
  | Si alguna opción escondida tiene
  | pendientes, también avisamos arriba
  | del botón "Más".
  |
  */

  const cantidadEnMas =
    menuMobileMas.reduce(
      (
        total,
        item
      ) =>
        total +
        obtenerCantidad(
          item
        ),
      0
    );

  return (
    <div className="app-layout">
      {/* SIDEBAR PC */}

      <aside className="app-sidebar">
        <div className="app-marca">
          <div className="app-logo">
            T
          </div>

          <div>
            <strong>
              Tránsito
            </strong>

            <span>
              Vía Pública
            </span>
          </div>
        </div>

        <nav className="app-menu">
          {visibles.map(
            (item) => {
              const cantidad =
                obtenerCantidad(
                  item
                );

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({
                    isActive,
                  }) =>
                    isActive
                      ? "app-menu-link activo"
                      : "app-menu-link"
                  }
                >
                  <span className="app-menu-icono">
                    {item.icono}
                  </span>

                  <span className="app-menu-texto">
                    {item.texto}
                  </span>

                  {cantidad > 0 && (
                    <span className="app-menu-contador">
                      {cantidad > 99
                        ? "99+"
                        : cantidad}
                    </span>
                  )}
                </NavLink>
              );
            }
          )}
        </nav>

        <div className="app-usuario">
          <div className="app-avatar">
            {(
              usuario?.nombre ||
              usuario?.usuario ||
              "U"
            )
              .charAt(0)
              .toUpperCase()}
          </div>

          <div className="app-usuario-info">
            <strong>
              {usuario?.nombre ||
                usuario?.usuario}
            </strong>

            <span>
              {nombreRol(rol)}
            </span>
          </div>

          <button
            type="button"
            onClick={logout}
            title="Cerrar sesión"
          >
            ↪
          </button>
        </div>
      </aside>

      {/* CONTENIDO */}

      <main className="app-contenido">
        <div className="app-topbar-mobile">
          <div>
            <strong>
              Tránsito
            </strong>

            <span>
              {nombreRol(rol)}
            </span>
          </div>

          <button
            type="button"
            onClick={logout}
          >
            Salir
          </button>
        </div>

        <div className="app-pagina">
          <Outlet />
        </div>
      </main>

      {/* FONDO DEL MENÚ MÁS */}

      {mostrarMas && (
        <button
          type="button"
          className="app-menu-mas-fondo"
          onClick={() =>
            setMostrarMas(
              false
            )
          }
          aria-label="Cerrar menú"
        />
      )}

      {/* PANEL MÁS */}

      {mostrarMas && (
        <div className="app-menu-mas-panel">
          <div className="app-menu-mas-cabecera">
            <div>
              <strong>
                Más opciones
              </strong>

              <span>
                {nombreRol(rol)}
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                setMostrarMas(
                  false
                )
              }
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>

          <div className="app-menu-mas-lista">
            {menuMobileMas.map(
              (item) => {
                const cantidad =
                  obtenerCantidad(
                    item
                  );

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({
                      isActive,
                    }) =>
                      isActive
                        ? "app-menu-mas-link activo"
                        : "app-menu-mas-link"
                    }
                  >
                    <span className="app-menu-mas-icono">
                      {item.icono}
                    </span>

                    <span className="app-menu-mas-texto">
                      {item.texto}
                    </span>

                    {cantidad > 0 && (
                      <span className="app-menu-contador">
                        {cantidad > 99
                          ? "99+"
                          : cantidad}
                      </span>
                    )}
                  </NavLink>
                );
              }
            )}
          </div>
        </div>
      )}

      {/* BARRA INFERIOR CELULAR */}

      <nav className="app-menu-mobile">
        {menuMobilePrincipal.map(
          (item) => {
            const cantidad =
              obtenerCantidad(
                item
              );

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({
                  isActive,
                }) =>
                  isActive
                    ? "activo"
                    : ""
                }
              >
                <span className="app-menu-mobile-icono">
                  {item.icono}

                  {cantidad > 0 && (
                    <span className="app-menu-mobile-contador">
                      {cantidad > 99
                        ? "99+"
                        : cantidad}
                    </span>
                  )}
                </span>

                <small>
                  {item.texto}
                </small>
              </NavLink>
            );
          }
        )}

        {menuMobileMas.length >
          0 && (
          <button
            type="button"
            className={
              mostrarMas
                ? "app-menu-mobile-mas activo"
                : "app-menu-mobile-mas"
            }
            onClick={() =>
              setMostrarMas(
                (anterior) =>
                  !anterior
              )
            }
          >
            <span className="app-menu-mobile-icono">
              •••

              {cantidadEnMas >
                0 && (
                <span className="app-menu-mobile-contador">
                  {cantidadEnMas >
                  99
                    ? "99+"
                    : cantidadEnMas}
                </span>
              )}
            </span>

            <small>
              Más
            </small>
          </button>
        )}
      </nav>
    </div>
  );
};

const nombreRol = (
  rol
) => {
  const nombres = {
    administrador:
      "Administrador",

    director:
      "Director",

    jefe_guardia:
      "Jefe de guardia",

    inspector:
      "Inspector",

    secretaria_reclamos:
      "Secretaría reclamos",

    secretaria_predio:
      "Secretaría predio",
  };

  return (
    nombres[rol] ||
    rol ||
    ""
  );
};

export default AppLayout;