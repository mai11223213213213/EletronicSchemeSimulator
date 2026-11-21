import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";

import { AuthPage } from "../components/AuthPage";
import { PersonalPage } from "../components/PersonalPage";
import { CircuitWorkspace } from "../components/CircuitWorkspace";
import { WorkspaceSkeleton } from "../components/WorkspaceSkeleton";
import { useAuth } from "../auth/AuthContext";
import { CircuitEditorPage } from "../components/CircuitEditorPage";

function ProtectedRoute() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

function GuestRoute() {
  const { user } = useAuth();

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

function EditorPage() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-[#101716]">
      <CircuitWorkspace />
    </div>
  );
}

export function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return <WorkspaceSkeleton />;
  }

  return (
    <Routes>
      {/* Routes for guests */}
      <Route element={<GuestRoute />}>
        <Route path="/auth" element={<AuthPage />} />
      </Route>

      {/* Routes for authenticated users */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<PersonalPage />} />
        <Route path="/editor" element={<EditorPage />} />
        <Route
          path="/editor/:id"
          element={
            <div className="h-screen w-screen overflow-hidden bg-[#101716]">
              <CircuitEditorPage />
            </div>
          }
        />
      </Route>

      {/* Unknown routes */}
      <Route
        path="*"
        element={<Navigate to={user ? "/dashboard" : "/auth"} replace />}
      />
    </Routes>
  );
}
