import { useAuth } from "@/hooks/useAuth";
import { Navigate, useLocation } from "react-router";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return (
      <Navigate
        to={`/login${
          location.pathname
            ? `?redirectTo=${encodeURIComponent(location.pathname)}`
            : ""
        }`}
        replace
      />
    );
  }

  return children;
};

export default ProtectedRoute;
