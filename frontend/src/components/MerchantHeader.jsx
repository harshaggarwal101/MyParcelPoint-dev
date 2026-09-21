import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaUser, FaSignOutAlt } from "react-icons/fa";
import "./MerchantHeader.css";

const MerchantHeader = ({ title, subtitle, walletBalance = 0 }) => {
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef(null);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userName = user?.name || "Merchant";
  const companyName = user?.companyName || user?.name || "MYPARCELPOINT";
  const sellerId = user?.merchantId || user?._id?.slice(-4) || "0.1";

  // Initials for avatar
  const initials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "AS";

  const brandInitials = companyName
    ? companyName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "MY";

  const formatCurrency = (amount) => {
    return Number(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    sessionStorage.clear();
    navigate("/login");
  };

  return (
    <div className="merchant-top-header">
      {/* Title / Greeting */}
      <div className="merchant-header-left">
        <h1 className="merchant-header-title">{title || `Welcome Back, ${userName} 👋`}</h1>
        <p className="merchant-header-subtitle">
          {subtitle || "Here is your real-time shipping & order performance summary"}
        </p>
      </div>

      {/* Action Controls */}
      <div className="merchant-header-right" ref={dropdownRef}>
        {/* LIVE WALLET */}
        <div className="live-wallet-box">
          <span className="live-wallet-label">LIVE WALLET</span>
          <span className="live-wallet-amount">₹ {formatCurrency(walletBalance)}</span>
        </div>

        {/* RECHARGE PILL BUTTON */}
        <button className="recharge-pill-btn" onClick={() => navigate("/merchant/wallet")}>
          RECHARGE
        </button>

        {/* AVATAR CIRCLE */}
        <div
          className="profile-avatar-circle"
          onClick={() => setIsProfileOpen(!isProfileOpen)}
          title="Account Profile & Settings"
        >
          {initials}
        </div>

        {/* PROFILE POPUP CARD DROPDOWN */}
        {isProfileOpen && (
          <div className="profile-dropdown-card">
            {/* Top Brand Info */}
            <div className="profile-card-top">
              <div className="profile-logo-box">{brandInitials}</div>
              <div className="profile-brand-details">
                <h3>{companyName}</h3>
                <p>{userName}</p>
                <span className="seller-id-badge">SELLER ID: {sellerId}</span>
              </div>
            </div>

            {/* Details List */}
            <div className="profile-details-list">
              <div className="profile-detail-row">
                <span className="label">Email:</span>
                <span className="value">{user?.email || "support@myparcelpoint.com"}</span>
              </div>
              <div className="profile-detail-row">
                <span className="label">Phone:</span>
                <span className="value">{user?.phone || "9871581526"}</span>
              </div>
              <div className="profile-detail-row">
                <span className="label">GSTIN:</span>
                <span className="value">{user?.gstNumber || "07ABECA9888N1ZP"}</span>
              </div>
            </div>

            {/* Actions */}
            <button
              className="profile-action-btn btn-direct-profile"
              onClick={() => {
                setIsProfileOpen(false);
                navigate("/merchant/profile");
              }}
            >
              <FaUser /> DIRECT TO MY PROFILE
            </button>

            <button className="profile-action-btn btn-logout-session" onClick={handleLogout}>
              <FaSignOutAlt /> LOGOUT SESSION
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MerchantHeader;
