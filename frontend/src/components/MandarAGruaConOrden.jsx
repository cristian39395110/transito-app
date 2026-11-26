import {
  useEffect,
  useState,
} from "react";

import api from "../api/api";

import "./MandarAGruaConOrden.css";

/*
|--------------------------------------------------------------------------
| DESPUÉS DE LA ORDEN DEL JUEZ: MANDAR A LA GRÚA
|--------------------------------------------------------------------------
|
| Aparece cuando el juez autorizó la remoción y el vehículo
| sigue en la calle. En vez de mandar un inspector, el Director
| (o el jefe de la guardia) puede mandar directamente la grúa.
|
| El backend decide si corresponde mostrarlo
| (etapa del reclamo + quién es el usuario).
|
*/

const ETAPAS_POST_JUZGADO = [
  "PENDIENTE_ASIGNACION_POST_JUZGADO",
  "POST_JUZGADO_ASIGNADO_GUARDIA",
  "POST_JUZGADO_EN_ACTUACION",
];

const MandarAGruaConOrden = ({
  reclamo,
  onEnviado,
}) => {
  const [
    datos,
    setDatos,
  ] = useState(null);

  const [
    guardando,
    setGuardando,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const aplica =
    ETAPAS_POST_JUZGADO.includes(
      reclamo?.etapaActual
    );

  useEffect(() => {
    if (!aplica) {
      return undefined;
    }

    let activo = true;

    api
      .get(
        `/grua/reclamos/${reclamo.id}/con-orden`
      )
      .then((respuesta) => {
        if (activo) {
          setDatos(
            respuesta.data
          );
        }
      })
      .catch(() => {
        if (activo) {
          setDatos(null);
        }
      });

    return () => {
      activo = false;
    };
  }, [
    aplica,
    reclamo?.id,
    reclamo?.etapaActual,
  ]);

  if (
    !aplica ||
    !datos?.puedeMandarAGrua
  ) {
    return null;
  }

  const vehiculos =
    datos.vehiculos || [];

  const mandar = async () => {
    const confirmar =
      window.confirm(
        vehiculos.length === 1
          ? "¿Mandar la grúa a retirar este vehículo? Se le avisará por email."
          : `¿Mandar la grúa a retirar ${vehiculos.length} vehículos? Se le avisará por email.`
      );

    if (!confirmar) {
      return;
    }

    try {
      setGuardando(true);
      setError("");

      const respuesta =
        await api.post(
          `/grua/reclamos/${reclamo.id}/enviar-con-orden`,
          {}
        );

      alert(
        respuesta.data
          ?.mensaje ||
          "Listo. Quedó para la grúa."
      );

      if (onEnviado) {
        await onEnviado();
      }
    } catch (err) {
      setError(
        err.response?.data
          ?.mensaje ||
          "No se pudo mandar a la grúa."
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="mandar-grua">
      <span className="mandar-grua-etiqueta">
        ⚖️ ORDEN DEL JUEZ AUTORIZADA
      </span>

      <strong>
        ¿Lo retira la grúa?
      </strong>

      <p>
        En vez de mandar un inspector,
        podés mandar directamente la grúa.
        Le llega un email y lo ve en su
        bandeja.
      </p>

      <ul>
        {vehiculos.map(
          (item) => (
            <li
              key={
                item.infraccionId
              }
            >
              🚗{" "}
              {item.vehiculo
                ?.dominio ||
                `Vehículo N.º ${item.vehiculo?.numeroInterno || item.vehiculo?.id}`}
              {" · "}
              Acta {item.numeroActa}
            </li>
          )
        )}
      </ul>

      <button
        type="button"
        disabled={guardando}
        onClick={mandar}
      >
        {guardando
          ? "Enviando..."
          : "🏗️ Mandar a la grúa"}
      </button>

      {error && (
        <p className="mandar-grua-error">
          {error}
        </p>
      )}
    </div>
  );
};

export default MandarAGruaConOrden;
