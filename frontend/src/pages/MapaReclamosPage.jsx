import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../api/api";

import MapaReclamos from "../components/MapaReclamos";
import FiltroMapaReclamos from "../components/FiltroMapaReclamos";

import "./MapaReclamosPage.css";

const MapaReclamosPage = () => {
  const [reclamos, setReclamos] =
    useState([]);

  const [cargando, setCargando] =
    useState(true);

  const [error, setError] =
    useState("");

  const [filtros, setFiltros] =
    useState({
      estado: "",
      tipoReclamoId: "",
      busqueda: "",
    });

  const cargar = useCallback(async () => {
    try {
      setCargando(true);
      setError("");

      const respuesta =
        await api.get("/reclamos");

      const lista =
        respuesta.data.reclamos ||
        respuesta.data ||
        [];

      setReclamos(
        Array.isArray(lista)
          ? lista
          : []
      );
    } catch (err) {
      console.error(
        "Error cargando reclamos para mapa:",
        err
      );

      setError(
        err.response?.data?.mensaje ||
          "No se pudieron cargar los reclamos."
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const tipos = useMemo(() => {
    const mapa = new Map();

    reclamos.forEach(
      (reclamo) => {
        const tipo =
          reclamo.TipoReclamo ||
          reclamo.tipoReclamo;

        if (tipo?.id) {
          mapa.set(
            tipo.id,
            tipo
          );
        }
      }
    );

    return Array.from(
      mapa.values()
    );
  }, [reclamos]);

  const filtrados =
    useMemo(() => {
      const texto =
        filtros.busqueda
          .trim()
          .toLowerCase();

      return reclamos
        .filter((reclamo) => {
          const latitud =
            Number(
              reclamo.latitudDenunciada
            );

          const longitud =
            Number(
              reclamo.longitudDenunciada
            );

          return (
            Number.isFinite(latitud) &&
            Number.isFinite(longitud)
          );
        })
        .filter((reclamo) => {
          if (
            filtros.estado &&
            reclamo.estado !==
              filtros.estado
          ) {
            return false;
          }

          if (
            filtros.tipoReclamoId &&
            Number(
              reclamo.tipoReclamoId
            ) !==
              Number(
                filtros.tipoReclamoId
              )
          ) {
            return false;
          }

          if (!texto) {
            return true;
          }

          const tipo =
            reclamo.TipoReclamo ||
            reclamo.tipoReclamo;

          const valores = [
            reclamo.numeroReclamo,
            reclamo.direccion,
            reclamo.barrio,
            reclamo.referencia,
            tipo?.nombre,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return valores.includes(
            texto
          );
        });
    }, [
      reclamos,
      filtros,
    ]);

  return (
    <div className="mapa-reclamos-page">
      <div className="mapa-reclamos-header">
        <div>
          <h1>
            Mapa de reclamos
          </h1>

          <p>
            Ubicación denunciada de los
            reclamos registrados.
          </p>
        </div>

        <button
          type="button"
          onClick={cargar}
        >
          Actualizar
        </button>
      </div>

      <FiltroMapaReclamos
        filtros={filtros}
        setFiltros={setFiltros}
        tipos={tipos}
        total={filtrados.length}
      />

      {cargando ? (
        <div className="mapa-reclamos-mensaje">
          Cargando mapa...
        </div>
      ) : error ? (
        <div className="mapa-reclamos-error">
          {error}
        </div>
      ) : (
        <MapaReclamos
          reclamos={filtrados}
        />
      )}
    </div>
  );
};

export default MapaReclamosPage;