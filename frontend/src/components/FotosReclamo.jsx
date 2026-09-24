import {
  useCallback,
  useEffect,
  useState,
} from "react";

import api from "../api/api";

import FotoUploader from "./FotoUploader";
import GaleriaFotos from "./GaleriaFotos";

const FotosReclamo = ({
  reclamoId,
  tipoReferencia = null,
  referenciaId = null,
  permitirSubir = true,
  descripcion = "",
  onCantidadFotosChange = null,
  maxFotos = null,
}) => {
  const [
    fotos,
    setFotos,
  ] = useState([]);

  const [
    cargando,
    setCargando,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const cargarFotos =
    useCallback(
      async () => {
        if (!reclamoId) {
          setFotos([]);
          setCargando(false);
          return;
        }

        try {
          setCargando(true);
          setError("");

          const params = {};

          if (tipoReferencia) {
            params.tipoReferencia =
              tipoReferencia;
          }

          if (referenciaId) {
            params.referenciaId =
              referenciaId;
          }

          const respuesta =
            await api.get(
              `/fotos/reclamos/${reclamoId}`,
              {
                params,
              }
            );

      const nuevasFotos =
  respuesta.data.fotos ||
  [];

setFotos(
  nuevasFotos
);

if (
  onCantidadFotosChange
) {
  onCantidadFotosChange(
    nuevasFotos.length
  );
}
        } catch (err) {
          console.error(
            "Error cargando fotos:",
            err
          );

          setError(
            err.response?.data
              ?.mensaje ||
              "No se pudieron cargar las fotografías"
          );
        } finally {
          setCargando(false);
        }
      },
      [
        reclamoId,
        tipoReferencia,
        referenciaId,
      ]
    );

  useEffect(() => {
    cargarFotos();
  }, [cargarFotos]);

  const manejarFotoSubida =
    () => {
      cargarFotos();
    };

    const manejarEliminarFoto =
  async (foto) => {
    if (!foto?.id) {
      return;
    }

    try {
      setError("");

      await api.patch(
        `/fotos/${foto.id}/anular`,
        {
          motivo:
            "Foto reemplazada antes de finalizar la actuación",
        }
      );

      await cargarFotos();
    } catch (err) {
      console.error(
        "Error eliminando foto:",
        err
      );

      setError(
        err.response?.data
          ?.mensaje ||
          "No se pudo eliminar la fotografía"
      );
    }
  };

    const alcanzoMaximo =
  maxFotos !== null &&
  fotos.length >= maxFotos;

  return (
    <section>
{permitirSubir &&
  !alcanzoMaximo && (
    <div
      style={{
        marginBottom: "16px",
      }}
    >
    <FotoUploader
  reclamoId={
    reclamoId
  }
  tipoReferencia={
    tipoReferencia ||
    "RECLAMO"
  }
  referenciaId={
    referenciaId
  }
  descripcion={
    descripcion
  }
  onFotoSubida={
    manejarFotoSubida
  }

/>
    </div>
  )}

      {cargando ? (
        <div>
          Cargando fotografías...
        </div>
      ) : error ? (
        <div
          style={{
            color: "#991b1b",
          }}
        >
          {error}
        </div>
      ) : (
     <GaleriaFotos
  fotos={fotos}
  permitirEliminar={
    permitirSubir &&
    maxFotos === 1
  }
  onEliminarFoto={
    manejarEliminarFoto
  }
/>
      )}
    </section>
  );
};

export default FotosReclamo;