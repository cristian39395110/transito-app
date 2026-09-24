import "./ReclamoCierreCard.css";

const ReclamoCierreCard = ({
  reclamo,
  onAbrir,
}) => {
  const tipo =
    reclamo.TipoReclamo ||
    reclamo.tipoReclamo;

  return (
    <article
      className="reclamo-cierre-card"
      onClick={onAbrir}
    >
      <div className="rcc-header">
        <div>
          <small>
            RECLAMO EXTERNO
          </small>

          <strong>
            #
            {
              reclamo.numeroReclamo
            }
          </strong>
        </div>

        <span>
          Para cerrar
        </span>
      </div>

      <div className="rcc-tipo">
        {tipo?.nombre ||
          "Sin tipo"}
      </div>

      <div className="rcc-direccion">
        📍{" "}
        <strong>
          {reclamo.direccion}
        </strong>
      </div>

      {reclamo.barrio && (
        <p>
          Barrio:{" "}
          {reclamo.barrio}
        </p>
      )}

      <div className="rcc-estados">
        <div>
          <span>
            Interno
          </span>

          <strong>
            Resuelto
          </strong>
        </div>

        <div>
          <span>
            Externo
          </span>

          <strong>
            Pendiente cierre
          </strong>
        </div>
      </div>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();

          onAbrir();
        }}
      >
        Registrar cierre →
      </button>
    </article>
  );
};

export default ReclamoCierreCard;