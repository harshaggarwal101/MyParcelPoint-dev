import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const MerchantRoute = ({ children }) => {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" />;
  }

  try {
    const decoded = jwtDecode(token);

    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      return <Navigate to="/login" />;
    }

    const role = decoded.role;

    return role === "MERCHANT" ? (
      <div className="merchant-scope" style={{ width: "100%", minHeight: "100vh" }}>
        {children}
      </div>
    ) : (
      <Navigate to="/login" />
    );
  } catch {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return <Navigate to="/login" />;
  }
};

export default MerchantRoute;