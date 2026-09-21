import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const PublicRoute = ({ children }) => {
  const token = localStorage.getItem("token");

  if (token) {
    try {
      const decoded = jwtDecode(token);

      if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        return children;
      }

      const role = decoded.role;

      if (role === "MERCHANT") return <Navigate to="/merchant/dashboard" />;
      if (role === "ADMIN") return <Navigate to="/admin/dashboard" />;
      if (role === "SUPER_ADMIN") return <Navigate to="/superadmin/dashboard" />;
    } catch {
      // Invalid token — clear it and show public page
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  }

  return children;
};

export default PublicRoute;
