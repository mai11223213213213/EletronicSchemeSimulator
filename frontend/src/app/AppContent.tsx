
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";

import { AuthPage } from "../components/AuthPage";
import { PersonalPage } from "../components/PersonalPage";
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

export function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return <WorkspaceSkeleton />;
  }

  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route path="/auth" element={<AuthPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<PersonalPage />} />

        <Route
          path="/editor"
          element={<Navigate to="/dashboard" replace />}
        />

        <Route
          path="/editor/:id"
          element={
            <div className="h-[100dvh] w-screen overflow-hidden overscroll-none bg-[#101716]">
              <CircuitEditorPage />
            </div>
          }
        />
      </Route>

      <Route
        path="*"
        element={<Navigate to={user ? "/dashboard" : "/auth"} replace />}
      />
    </Routes>
  );
}
