import {
  useRef,
  useState,
} from "react";

import api from "../api/api";

import {
  comprimirImagen,
  formatearKB,
} from "../utils/comprimirImagen";

import "./FotoUploader.css";

const FotoUploader = ({
  reclamoId,
  tipoReferencia = "RECLAMO",
  referenciaId = null,
  descripcion = "",
  onFotoSubida,
}) => {
  const inputRef =
    useRef(null);

  const [
    procesando,
    setProcesando,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    info,
    setInfo,
  ] = useState(null);

  const seleccionarFoto =
    () => {
      inputRef.current?.click();
    };

  const subirFoto =
    async (archivo) => {
      const formData =
        new FormData();

      formData.append(
        "foto",
        archivo
      );

      formData.append(
        "tipoReferencia",
        tipoReferencia
      );

      if (referenciaId) {
        formData.append(
          "referenciaId",
          String(
            referenciaId
          )
        );
      }

      if (descripcion) {
        formData.append(
          "descripcion",
          descripcion
        );
      }

      const respuesta =
        await api.post(
          `/fotos/reclamos/${reclamoId}`,
          formData
        );

      if (onFotoSubida) {
        onFotoSubida(
          respuesta.data.foto
        );
      }
    };

  const manejarArchivo =
    async (event) => {
      const archivo =
        event.target.files?.[0];

      event.target.value = "";

      if (!archivo) {
        return;
      }

      setProcesando(true);
      setError("");
      setInfo(null);

      try {
        const originalKB =
          formatearKB(
            archivo.size
          );

        const comprimida =
          await comprimirImagen(
            archivo,
            {
              objetivoKB: 100,
              maxDimension: 1280,
            }
          );

        const comprimidaKB =
          formatearKB(
            comprimida.size
          );

        setInfo({
          originalKB,
          comprimidaKB,
        });

        /*
         * La foto se guarda
         * automáticamente.
         *
         * No hay segundo paso
         * "Usar esta foto".
         */
        await subirFoto(
          comprimida
        );
      } catch (err) {
        console.error(
          "Error procesando foto:",
          err
        );

        setError(
          err.response?.data
            ?.mensaje ||
            err.message ||
            "No se pudo procesar la fotografía"
        );
      } finally {
        setProcesando(false);
      }
    };

  return (
    <div className="foto-uploader">
      <input
        ref={inputRef}
        className="foto-uploader-input"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={
          manejarArchivo
        }
      />

      <button
        type="button"
        className="foto-uploader-boton"
        onClick={
          seleccionarFoto
        }
        disabled={
          procesando
        }
      >
        {procesando
          ? "Procesando foto..."
          : "📷 Tomar / seleccionar foto"}
      </button>

      {procesando && (
        <div className="foto-uploader-progreso">
          Comprimiendo y guardando foto...
        </div>
      )}

      {info &&
        !procesando && (
          <div className="foto-uploader-info">
            <span>
              Original:{" "}
              {info.originalKB} KB
            </span>

            <span>
              Guardada:{" "}
              {info.comprimidaKB} KB
            </span>
          </div>
        )}

      {error && (
        <div className="foto-uploader-error">
          {error}
        </div>
      )}
    </div>
  );
};

export default FotoUploader;