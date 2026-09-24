import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import {
  useAuth,
} from "./context/AuthContext";

import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";

import ReclamosPage from "./pages/ReclamosPage";
import ReclamoDetallePage from "./pages/ReclamoDetallePage";

import SegundaVisitaPage from "./pages/SegundaVisitaPage";
import RemocionVehiculoPage from "./pages/RemocionVehiculoPage";

import MiGuardiaPage from "./pages/MiGuardiaPage";

import MisTrabajosPage from "./pages/MisTrabajosPage";
import InspeccionPage from "./pages/InspeccionPage";

import MapaReclamosPage from "./pages/MapaReclamosPage";

import ParaCerrarPage from "./pages/ParaCerrarPage";
import PredioPage from "./pages/PredioPage";

import UsuariosPage from "./pages/UsuariosPage";
import TiposReclamoPage from "./pages/TiposReclamoPage";
import DestinosPage from "./pages/DestinosPage";

import NoAutorizadoPage from "./pages/NoAutorizadoPage";

import JuzgadoPage from "./pages/JuzgadoPage";

import ExpedientesPage from "./pages/ExpedientesPage";


const InicioPorRol = () => {
  const {
    rol,
  } = useAuth();

  if (
    rol ===
    "secretaria_predio"
  ) {
    return (
      <Navigate
        to="/predio"
        replace
      />
    );
  }

  return (
    <DashboardPage />
  );
};


const App = () => {
  return (
    <Routes>

      <Route
        path="/login"
        element={
          <LoginPage />
        }
      />


      <Route
        path="/no-autorizado"
        element={
          <ProtectedRoute>
            <NoAutorizadoPage />
          </ProtectedRoute>
        }
      />


      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >

       <Route
  index
  element={
    <InicioPorRol />
  }
/>


        {/* ==============================================
            RECLAMOS
        ============================================== */}

        <Route
          path="reclamos"
          element={
            <ProtectedRoute
              roles={[
                "administrador",
                "director",
                "jefe_guardia",
                "secretaria_reclamos",
              ]}
            >
              <ReclamosPage />
            </ProtectedRoute>
          }
        />


        <Route
          path="reclamos/:id"
          element={
            <ProtectedRoute
              roles={[
                "administrador",
                "director",
                "jefe_guardia",
                "inspector",
                "secretaria_reclamos",
                "secretaria_predio",
              ]}
            >
              <ReclamoDetallePage />
            </ProtectedRoute>
          }
        />


        {/* ==============================================
            JEFE DE GUARDIA
        ============================================== */}

        <Route
          path="mi-guardia"
          element={
            <ProtectedRoute
              roles={[
                "administrador",
                "jefe_guardia",
              ]}
            >
              <MiGuardiaPage />
            </ProtectedRoute>
          }
        />


        {/* ==============================================
            JUZGADO
        ============================================== */}

        <Route
          path="juzgado"
          element={
            <ProtectedRoute
              roles={[
                "administrador",
                "secretaria_reclamos",
              ]}
            >
              <JuzgadoPage />
            </ProtectedRoute>
          }
        />


        {/* ==============================================
            INSPECTOR
        ============================================== */}

        <Route
          path="mis-trabajos"
          element={
            <ProtectedRoute
              roles={[
                "administrador",
                "inspector",
              ]}
            >
              <MisTrabajosPage />
            </ProtectedRoute>
          }
        />

        <Route
  path="/expedientes"
  element={
    <ProtectedRoute
      roles={[
        "administrador",
        "director",
        "jefe_guardia",
        "inspector",
        "secretaria_reclamos",
        "secretaria_predio",
      ]}
    >
      <ExpedientesPage />
    </ProtectedRoute>
  }
/>


        <Route
          path="inspeccion/:id"
          element={
            <ProtectedRoute
              roles={[
                "administrador",
                "inspector",
              ]}
            >
              <InspeccionPage />
            </ProtectedRoute>
          }
        />


        <Route
          path="segunda-visita/:id"
          element={
            <ProtectedRoute
              roles={[
                "administrador",
                "inspector",
              ]}
            >
              <SegundaVisitaPage />
            </ProtectedRoute>
          }
        />


        {/* ==============================================
            REMOCIÓN DE VEHÍCULO
        ============================================== */}

        <Route
          path="remocion/:id"
          element={
            <ProtectedRoute
              roles={[
                "administrador",
                "inspector",
              ]}
            >
              <RemocionVehiculoPage />
            </ProtectedRoute>
          }
        />


        {/* ==============================================
            MAPA
        ============================================== */}

        <Route
          path="mapa"
          element={
            <ProtectedRoute
              roles={[
                "administrador",
                "director",
                "jefe_guardia",
                "inspector",
              ]}
            >
              <MapaReclamosPage />
            </ProtectedRoute>
          }
        />


        {/* ==============================================
            CIERRE
        ============================================== */}

        <Route
          path="para-cerrar"
          element={
            <ProtectedRoute
              roles={[
                "administrador",
                "secretaria_reclamos",
              ]}
            >
              <ParaCerrarPage />
            </ProtectedRoute>
          }
        />


        {/* ==============================================
            PREDIO
        ============================================== */}

        <Route
          path="predio"
          element={
            <ProtectedRoute
              roles={[
                "administrador",
                "director",
                "jefe_guardia",
                "secretaria_reclamos",
                "secretaria_predio",
              ]}
            >
              <PredioPage />
            </ProtectedRoute>
          }
        />


        {/* ==============================================
            ADMIN
        ============================================== */}

        <Route
  path="destinos"
  element={
    <ProtectedRoute
      roles={[
        "administrador",
      ]}
    >
      <DestinosPage />
    </ProtectedRoute>
  }
/>

        <Route
          path="usuarios"
          element={
            <ProtectedRoute
              roles={[
                "administrador",
              ]}
            >
              <UsuariosPage />
            </ProtectedRoute>
          }
        />


        <Route
          path="tipos-reclamo"
          element={
            <ProtectedRoute
              roles={[
                "administrador",
              ]}
            >
              <TiposReclamoPage />
            </ProtectedRoute>
          }
        />


        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />

      </Route>

    </Routes>
  );
};


export default App;