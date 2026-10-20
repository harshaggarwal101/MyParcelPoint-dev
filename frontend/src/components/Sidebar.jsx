import { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  FaHome,
  FaBox,
  FaClipboardList,
  FaTruck,
  FaWarehouse,
  FaWallet,
  FaFileInvoice,
  FaChartBar,
  FaUser,
  FaCog,
  FaSignOutAlt,
  FaTicketAlt,
  FaExclamationTriangle,
  FaUndoAlt,
  FaBars,
  FaTimes,
  FaPlug,
  FaTags,
} from "react-icons/fa";
import "./Sidebar.css";
import MerchantOnboardingModal from "./MerchantOnboardingModal";
import logoImage from "../assets/logos/myParcelPoint.jpg";

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const role = localStorage.getItem("role");

  // NEW: Store user in React state to enable live updates
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user") || "{}"),
  );

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // NEW: Listen for the "userUpdated" event from Profile.jsx to instantly update the avatar
  useEffect(() => {
    const handleUserUpdate = () => {
      setUser(JSON.parse(localStorage.getItem("user") || "{}"));
    };

    window.addEventListener("userUpdated", handleUserUpdate);

    return () => {
      window.removeEventListener("userUpdated", handleUserUpdate);
    };
  }, []);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const closeSidebar = () => {
    setIsOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/login");
    closeSidebar();
  };

  const userName = user?.name || "Merchant";
  const userInitial = userName.charAt(0).toUpperCase();

  // NEW: Dynamic Base URL for profile pictures
  const backendUrl =
    import.meta.env.VITE_API_URL?.replace("/api", "") ||
    "http://localhost:5001";

  return (
    <div className="merchant-scope">
      {/* ===== HAMBURGER BUTTON ===== */}
      <button
        className="hamburger-btn"
        onClick={toggleSidebar}
        aria-label="Toggle Menu"
      >
        {isOpen ? <FaTimes /> : <FaBars />}
      </button>

      {/* ===== OVERLAY ===== */}
      {isOpen && <div className="sidebar-overlay" onClick={closeSidebar} />}

      {/* ===== SIDEBAR ===== */}
      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          {/* Added flex styles to the h2 to align the image and text nicely */}
          <h2
            className="logo"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              margin: 0,
            }}
          >
            <img
              src={logoImage}
              alt="MyParcelPoint Logo"
              style={{
                height: "32px",
                width: "auto",
                borderRadius: "6px",
                objectFit: "contain",
              }}
            />
            MyParcelPoint
          </h2>
          <span className="logo-subtitle">
            {role === "ADMIN" ? "ADMIN PANEL" : "MERCHANT PANEL"}
          </span>
        </div>

        <div className="sidebar-profile">
          {/* NEW: Render the image if it exists, otherwise fallback to the initial */}
          {user?.profilePicture ? (
            <img
              src={
                user.profilePicture.startsWith("http")
                  ? user.profilePicture
                  : `${backendUrl}${user.profilePicture}`
              }
              alt="Profile"
              className="avatar"
              style={{ objectFit: "cover" }}
            />
          ) : (
            <div className="avatar">{userInitial}</div>
          )}
          <div className="profile-info">
            <h4>{userName}</h4>
            <span>{role === "ADMIN" ? "Administrator" : "Merchant"}</span>
          </div>
        </div>

        <ul className="sidebar-menu">
          {role === "ADMIN" ? (
            // ===== ADMIN MENU =====
            <>
              <li>
                <NavLink
                  to="/admin/dashboard"
                  className={({ isActive }) => (isActive ? "active" : "")}
                  onClick={closeSidebar}
                >
                  <FaHome /> <span>Dashboard</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin/users"
                  className={({ isActive }) => (isActive ? "active" : "")}
                  onClick={closeSidebar}
                >
                  <FaUser /> <span>Users</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin/merchants"
                  className={({ isActive }) => (isActive ? "active" : "")}
                  onClick={closeSidebar}
                >
                  <FaBox /> <span>Merchants</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin/orders"
                  className={({ isActive }) => (isActive ? "active" : "")}
                  onClick={closeSidebar}
                >
                  <FaClipboardList /> <span>Orders</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin/shipments"
                  className={({ isActive }) => (isActive ? "active" : "")}
                  onClick={closeSidebar}
                >
                  <FaTruck /> <span>Shipments</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin/couriers"
                  className={({ isActive }) => (isActive ? "active" : "")}
                  onClick={closeSidebar}
                >
                  <FaTruck /> <span>Couriers</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin/pricing"
                  className={({ isActive }) => (isActive ? "active" : "")}
                  onClick={closeSidebar}
                >
                  <FaWallet /> <span>Pricing</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin/revenue"
                  className={({ isActive }) => (isActive ? "active" : "")}
                  onClick={closeSidebar}
                >
                  <FaChartBar /> <span>Revenue</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin/reports"
                  className={({ isActive }) => (isActive ? "active" : "")}
                  onClick={closeSidebar}
                >
                  <FaFileInvoice /> <span>Reports</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin/tickets"
                  className={({ isActive }) => (isActive ? "active" : "")}
                  onClick={closeSidebar}
                >
                  <FaTicketAlt /> <span>Support Tickets</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin/settings"
                  className={({ isActive }) => (isActive ? "active" : "")}
                  onClick={closeSidebar}
                >
                  <FaCog /> <span>Settings</span>
                </NavLink>
              </li>
            </>
          ) : (
            // ===== MERCHANT MENU =====
            <>
              <li>
                <NavLink
                  to="/merchant/dashboard"
                  className={({ isActive }) => (isActive ? "active" : "")}
                  onClick={closeSidebar}
                >
                  <FaHome /> <span>Dashboard</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/merchant/orders"
                  className={({ isActive }) => (isActive ? "active" : "")}
                  onClick={closeSidebar}
                >
                  <FaClipboardList /> <span>Orders</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/merchant/create-shipment"
                  className={({ isActive }) => (isActive ? "active" : "")}
                  onClick={closeSidebar}
                >
                  <FaBox /> <span>Ship order</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/merchant/shipments"
                  className={({ isActive }) => (isActive ? "active" : "")}
                  onClick={closeSidebar}
                >
                  <FaTruck /> <span>Shipments</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/merchant/tracking"
                  className={({ isActive }) => (isActive ? "active" : "")}
                  onClick={closeSidebar}
                >
                  <FaTruck /> <span>Tracking</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/merchant/ndr"
                  className={({ isActive }) => (isActive ? "active" : "")}
                  onClick={closeSidebar}
                >
                  <FaExclamationTriangle /> <span>NDR</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/merchant/rto"
                  className={({ isActive }) => (isActive ? "active" : "")}
                  onClick={closeSidebar}
                >
                  <FaUndoAlt /> <span>RTO</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/merchant/integrations"
                  className={({ isActive }) => (isActive ? "active" : "")}
                  onClick={closeSidebar}
                >
                  <FaPlug /> <span>Integrations</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/merchant/wallet"
                  className={({ isActive }) => (isActive ? "active" : "")}
                  onClick={closeSidebar}
                >
                  <FaWallet /> <span>Wallet</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/merchant/invoices"
                  className={({ isActive }) => (isActive ? "active" : "")}
                  onClick={closeSidebar}
                >
                  <FaFileInvoice /> <span>Invoices</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/merchant/billing"
                  className={({ isActive }) => (isActive ? "active" : "")}
                  onClick={closeSidebar}
                >
                  <FaFileInvoice /> <span>Billing</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/merchant/serviceability"
                  className={({ isActive }) => (isActive ? "active" : "")}
                  onClick={closeSidebar}
                >
                  <FaTruck /> <span>Serviceability</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/merchant/rate-calculator"
                  className={({ isActive }) => (isActive ? "active" : "")}
                  onClick={closeSidebar}
                >
                  <FaWallet /> <span>Rate Calculator</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/merchant/rate-card"
                  className={({ isActive }) => (isActive ? "active" : "")}
                  onClick={closeSidebar}
                >
                  <FaTags /> <span>My Rate Card</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/merchant/reports"
                  className={({ isActive }) => (isActive ? "active" : "")}
                  onClick={closeSidebar}
                >
                  <FaChartBar /> <span>Reports</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/merchant/tickets"
                  className={({ isActive }) => (isActive ? "active" : "")}
                  onClick={closeSidebar}
                >
                  <FaTicketAlt /> <span>Support Tickets</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/merchant/warehouses"
                  className={({ isActive }) => (isActive ? "active" : "")}
                  onClick={closeSidebar}
                >
                  <FaWarehouse />
                  <span>Warehouses</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/merchant/profile"
                  className={({ isActive }) => (isActive ? "active" : "")}
                  onClick={closeSidebar}
                >
                  <FaUser /> <span>Profile</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/merchant/settings"
                  className={({ isActive }) => (isActive ? "active" : "")}
                  onClick={closeSidebar}
                >
                  <FaCog /> <span>Settings</span>
                </NavLink>
              </li>
            </>
          )}
        </ul>

        <div className="logout-section" onClick={handleLogout}>
          <a href="#">
            <FaSignOutAlt />
            <span>Logout</span>
          </a>
        </div>
      </aside>

      {/* Profile Onboarding Popup Modal */}
      <MerchantOnboardingModal />
    </div>
  );
};

export default Sidebar;
