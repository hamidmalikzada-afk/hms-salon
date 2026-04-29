import { Navigate, useLocation } from "react-router-dom";

export default function ProtectedRoute({ auth, children }) {
  const location = useLocation();

  if (!auth?.token || !auth?.user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
