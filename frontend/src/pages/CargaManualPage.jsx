import {
  useNavigate,
} from "react-router-dom";

import ExpedienteManualForm
  from "../components/ExpedienteManualForm";


const CargaManualPage = () => {
  const navigate =
    useNavigate();


  const terminarCarga = () => {
    navigate("/expedientes");
  };


  return (
    <div>
      <ExpedienteManualForm
        onCreado={terminarCarga}
        onCancelar={terminarCarga}
      />
    </div>
  );
};


export default CargaManualPage;