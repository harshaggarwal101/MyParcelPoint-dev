import { useState } from "react";
import Sidebar from "../../components/Sidebar";
import api from "../../services/api";
import { FaLock, FaKey, FaShieldAlt, FaCheckCircle, FaCog } from "react-icons/fa";
import "./Settings.css";

const Settings = () => {
  const [loading, setLoading] = useState(false);

  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setPasswords({
      ...passwords,
      [e.target.name]: e.target.value,
    });
  };

  const changePassword = async () => {
    if (
      !passwords.currentPassword ||
      !passwords.newPassword ||
      !passwords.confirmPassword
    ) {
      return alert("Please fill all fields.");
    }

    if (
      passwords.newPassword !==
      passwords.confirmPassword
    ) {
      return alert("Passwords do not match.");
    }

    try {
      setLoading(true);

      const res = await api.put(
        "/merchant/change-password",
        passwords
      );

      alert(
        res.data.message ||
          "Password Changed Successfully"
      );

      setPasswords({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      alert(
        error?.response?.data?.message ||
          "Failed to change password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-page-container">
      <div className="sidebar-wrapper">
        <Sidebar />
      </div>

      <main className="settings-main-content">
        <div className="settings-wrapper">
          {/* HEADER */}
          <div className="settings-header">
            <h1 className="settings-title">
              <FaCog className="header-icon-orange" /> Settings & Security
            </h1>
            <p className="settings-subtitle">
              Manage your account authentication and password security preferences
            </p>
          </div>

          {/* CHANGE PASSWORD CARD */}
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="header-icon-wrapper">
                <FaLock className="card-header-icon" />
              </div>
              <div>
                <h2 className="card-title">Change Password</h2>
                <p className="card-subtitle">Ensure your account uses a strong, secure password</p>
              </div>
            </div>

            <div className="settings-card-body">
              <div className="form-group">
                <label className="form-label">
                  <FaKey size={12} color="#f97316" /> Current Password
                </label>
                <input
                  type="password"
                  name="currentPassword"
                  placeholder="Enter current password"
                  value={passwords.currentPassword}
                  onChange={handleChange}
                  className="settings-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <FaShieldAlt size={12} color="#60a5fa" /> New Password
                </label>
                <input
                  type="password"
                  name="newPassword"
                  placeholder="Enter new password"
                  value={passwords.newPassword}
                  onChange={handleChange}
                  className="settings-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <FaCheckCircle size={12} color="#4ade80" /> Confirm New Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Re-enter new password"
                  value={passwords.confirmPassword}
                  onChange={handleChange}
                  className="settings-input"
                />
              </div>

              <button
                className="save-btn"
                onClick={changePassword}
                disabled={loading}
              >
                {loading ? "Updating Password..." : "Update Password"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;