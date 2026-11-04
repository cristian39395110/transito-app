
import {
  useNavigate,
  useParams,
} from "react-router-dom";

import ExpedienteManualForm
  from "../components/ExpedienteManualForm";

const CargaManualPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  // Si hay ID, estamos corrigiendo un expediente.
  // Si no hay ID, estamos creando uno nuevo.
  const expedienteId = id || null;

  const terminarCarga = () => {
    navigate("/expedientes");
  };

  return (
    <div>
      <ExpedienteManualForm
        expedienteId={expedienteId}
        onCreado={terminarCarga}
        onCancelar={terminarCarga}
      />
    </div>
  );
};

export default CargaManualPage;
