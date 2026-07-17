import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";

const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) => {
  const { isAuthenticated, isAdmin } = useAuthStore();

  console.log("ProtectedRoute State:", { isAuthenticated: isAuthenticated(), isAdmin: isAdmin(), user: useAuthStore.getState().user });

  if (!isAuthenticated()) return <Navigate to="/" replace />;
  if (adminOnly && !isAdmin()) {
    console.warn("Blocked Access to Admin Route. User Role:", useAuthStore.getState().user?.role);
    return <Navigate to="/" replace />;
  }


  return <>{children}</>;
};

export default ProtectedRoute;
