import { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import "./SuperAdminSidebar.css";
import logoImage from "../../assets/logos/myParcelPoint.jpg"
import {
  FaHome,
  FaUsers,
  FaUserShield,
  FaMoneyBillWave,
  FaChartBar,
  FaServer,
  FaCog,
  FaClipboardList,
  FaSignOutAlt,
  FaTruck,
  FaBars,
  FaTimes,
} from "react-icons/fa";

const SuperAdminSidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <aside className="superadmin-sidebar-wrapper">
      {/* Mobile Hamburger Button */}
      <button
        className="superadmin-hamburger-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle SuperAdmin Menu"
      >
        {isOpen ? <FaTimes /> : <FaBars />}
      </button>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="superadmin-sidebar-overlay"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div className={`sidebar ${isOpen ? "open" : ""}`}>
        {/* BRAND HEADER CONTAINER */}
        <div className="sidebar-header">
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
          <span className="logo-subtitle">Super Admin Panel</span>
        </div>

        {/* ADMIN IDENTITY PROFILE WRAPPER */}
        <div className="sidebar-profile">
          <div className="avatar">SA</div>
          <div className="profile-info">
            <h4>Super Admin</h4>
            <span>Platform Owner</span>
          </div>
        </div>

        {/* CORE NAVIGATION MENU */}
        <ul className="sidebar-menu">
          <li>
            <NavLink
              to="/superadmin/dashboard"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <FaHome style={{ fontSize: "20px" }} />
              <span>Dashboard</span>
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/superadmin/admins"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <FaUserShield style={{ fontSize: "20px" }} />
              <span>Admins</span>
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/superadmin/merchants"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <FaUsers style={{ fontSize: "20px" }} />
              <span>Merchants</span>
            </NavLink>
          </li>

          {/* Couriers Menu Item */}
          <li>
            <NavLink
              to="/superadmin/couriers"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <FaTruck style={{ fontSize: "20px" }} />
              <span>Couriers</span>
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/superadmin/commission"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <FaMoneyBillWave style={{ fontSize: "20px" }} />
              <span>Commission</span>
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/superadmin/revenue"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <FaChartBar style={{ fontSize: "20px" }} />
              <span>Revenue</span>
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/superadmin/api-monitoring"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <FaServer style={{ fontSize: "20px" }} />
              <span>API Monitoring</span>
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/superadmin/audit-logs"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <FaClipboardList style={{ fontSize: "20px" }} />
              <span>Audit Logs</span>
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/superadmin/settings"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <FaCog style={{ fontSize: "20px" }} />
              <span>Settings</span>
            </NavLink>
          </li>
        </ul>

        {/* ACCOUNT SESSION TERMINATION */}
        <div className="logout-section" onClick={logout}>
          <FaSignOutAlt style={{ fontSize: "18px" }} />
        </div>
      </div>
    </aside>
  );
};

export default SuperAdminSidebar;