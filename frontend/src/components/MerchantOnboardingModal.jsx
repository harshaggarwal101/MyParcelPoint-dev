import { useState, useEffect } from "react";
import api from "../services/api";
import { FaBuilding, FaFileInvoice, FaRegIdCard, FaMapMarkerAlt, FaUniversity, FaCheckCircle, FaArrowLeft, FaClock, FaSync, FaHourglassHalf } from "react-icons/fa";
import "./MerchantOnboardingModal.css";

const MerchantOnboardingModal = () => {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [isPendingApproval, setIsPendingApproval] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "",
    name: "",
    phone: "",
    gstNumber: "",
    panNumber: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    bankAccount: "",
    ifscCode: "",
    bankName: "",
  });

  const [docFiles, setDocFiles] = useState({
    panCard: null,
    aadhaarFront: null,
    aadhaarBack: null,
  });

  const handleFileChange = (e, field) => {
    const file = e.target.files[0];
    if (file) {
      setDocFiles((prev) => ({ ...prev, [field]: file }));
    }
  };

  useEffect(() => {
    checkProfileCompletion();
  }, []);

  const checkProfileCompletion = async (manualCheck = false) => {
    try {
      if (manualCheck) setCheckingStatus(true);

      const userStr = localStorage.getItem("user");
      const role = (localStorage.getItem("role") || "").toUpperCase();
      
      // Check if user is a merchant
      const isMerchantRole = role === "MERCHANT" || (userStr && JSON.parse(userStr)?.role?.toUpperCase() === "MERCHANT");
      if (!isMerchantRole) return;

      // Fetch fresh profile from API
      const res = await api.get("/merchant/profile");
      if (res.data.success) {
        const m = res.data.merchant || {};
        const u = res.data.user || {};

        const isApproved = u.isApproved === true || m.isApproved === true;
        const companyName = m.companyName || u.companyName || "";
        const name = u.name || "";
        const phone = u.phone || "";
        const gstNumber = m.gstNumber || u.gstNumber || "";
        const panNumber = m.panNumber || u.panNumber || "";
        const address = m.address || u.address || "";
        const city = u.city || m.city || "";
        const state = u.state || m.state || "";
        const pincode = u.pincode || m.pincode || "";
        const bankAccount = m.bankAccount || u.accountNumber || u.bankAccount || "";
        const ifscCode = m.ifscCode || u.ifscCode || "";
        const bankName = m.bankName || u.bankName || "";

        setFormData({
          companyName,
          name,
          phone,
          gstNumber,
          panNumber,
          address,
          city,
          state,
          pincode,
          bankAccount,
          ifscCode,
          bankName,
        });

        // Update local storage user data
        if (res.data.user) {
          localStorage.setItem("user", JSON.stringify(res.data.user));
          window.dispatchEvent(new Event("userUpdated"));
        }

        // If approved by admin -> hide modal and unlock dashboard!
        if (isApproved) {
          sessionStorage.setItem("merchant_profile_is_completed", "true");
          setShowModal(false);
          if (manualCheck) {
            alert("Congratulations! Your account has been approved by Admin. Dashboard is now fully unlocked.");
          }
          return;
        }

        // If not approved yet, check profile details completeness
        const isDetailsIncomplete = !address.trim() || !city.trim() || !pincode.trim() || !bankAccount.trim();

        if (isDetailsIncomplete) {
          // Profile incomplete -> show onboarding form
          setIsPendingApproval(false);
          setShowModal(true);
        } else {
          // Profile completed, but pending admin approval -> show pending screen
          setIsPendingApproval(true);
          setShowModal(true);
          if (manualCheck) {
            alert("Your account is still pending admin approval. Please wait for Admin to approve.");
          }
        }
      }
    } catch (err) {
      console.log("Check Profile Completion Error:", err);
    } finally {
      if (manualCheck) setCheckingStatus(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.address.trim() || !formData.city.trim() || !formData.pincode.trim()) {
      return alert("Please fill in your full address, city, and pincode.");
    }

    if (!formData.bankAccount.trim() || !formData.ifscCode.trim() || !formData.bankName.trim()) {
      return alert("Please fill in your bank account details for COD remittance.");
    }

    setLoading(true);

    try {
      const res = await api.put("/merchant/profile", formData);

      // Upload KYC document files if provided
      if (docFiles.panCard || docFiles.aadhaarFront || docFiles.aadhaarBack) {
        const kycFormData = new FormData();
        if (docFiles.panCard) kycFormData.append("panCard", docFiles.panCard);
        if (docFiles.aadhaarFront) kycFormData.append("aadhaarFront", docFiles.aadhaarFront);
        if (docFiles.aadhaarBack) kycFormData.append("aadhaarBack", docFiles.aadhaarBack);

        await api.post("/merchant/kyc-upload", kycFormData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      const updatedUserRes = await api.get("/merchant/profile");
      if (updatedUserRes.data?.user) {
        localStorage.setItem("user", JSON.stringify(updatedUserRes.data.user));
        window.dispatchEvent(new Event("userUpdated"));
      } else if (res.data.user) {
        localStorage.setItem("user", JSON.stringify(res.data.user));
        window.dispatchEvent(new Event("userUpdated"));
      }

      alert("Profile details and KYC Documents saved successfully! Your account has been submitted for Admin Approval.");
      setIsPendingApproval(true);
      setShowModal(true);
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to save profile details and KYC documents");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("merchant_profile_is_completed");
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.href = "/login";
  };

  if (!showModal) return null;

  const statesList = [
    "Maharashtra", "Delhi", "Karnataka", "Tamil Nadu", 
    "Gujarat", "Uttar Pradesh", "West Bengal", "Rajasthan", 
    "Punjab", "Haryana", "Telangana", "Kerala", "Madhya Pradesh",
    "Andhra Pradesh", "Bihar", "Chhattisgarh", "Goa", "Himachal Pradesh",
    "Jharkhand", "Odisha", "Uttarakhand"
  ];

  return (
    <div className="onboarding-backdrop">
      <div className="onboarding-modal-card">
        {isPendingApproval ? (
          /* ======================================================== */
          /* PENDING ADMIN APPROVAL SCREEN                             */
          /* ======================================================== */
          <>
            <div className="onboarding-header">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div className="header-badge" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b" }}>
                  <FaHourglassHalf style={{ marginRight: "4px" }} /> Under Admin Approval
                </div>

                <button 
                  type="button" 
                  className="modal-logout-btn" 
                  onClick={handleLogout}
                  title="Logout and back to login"
                >
                  <FaArrowLeft /> Back to Login
                </button>
              </div>

              <h2 className="modal-title" style={{ marginTop: "10px" }}>
                ⏳ Account Pending Admin Approval
              </h2>
              <p className="modal-subtitle">
                Your business profile & bank details have been submitted successfully. Your account is currently under review by our Admin team. Please wait for an Admin to verify and approve your account.
              </p>
            </div>

            <div className="pending-approval-details-card">
              <h3 className="pending-section-title">Submitted Details Summary</h3>
              <div className="pending-details-grid">
                <div><strong>Company:</strong> {formData.companyName || "N/A"}</div>
                <div><strong>Contact:</strong> {formData.name || "N/A"}</div>
                <div><strong>Phone:</strong> {formData.phone || "N/A"}</div>
                <div><strong>Address:</strong> {formData.address}, {formData.city}, {formData.state} - {formData.pincode}</div>
                <div><strong>Bank Account:</strong> {formData.bankAccount} ({formData.bankName})</div>
                <div><strong>IFSC Code:</strong> {formData.ifscCode}</div>
                {formData.gstNumber && <div><strong>GST:</strong> {formData.gstNumber}</div>}
                {formData.panNumber && <div><strong>PAN:</strong> {formData.panNumber}</div>}
              </div>

              <div className="pending-status-banner">
                <FaClock style={{ color: "#f59e0b", fontSize: "18px", flexShrink: 0 }} />
                <span><strong>Status:</strong> Awaiting Admin Approval. Once approved, all features will unlock automatically.</span>
              </div>
            </div>

            <div className="onboarding-actions" style={{ padding: "20px 28px", display: "flex", gap: "12px" }}>
              <button 
                type="button" 
                className="later-btn" 
                onClick={handleLogout}
                style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: "6px" }}
              >
                <FaArrowLeft /> Back to Login
              </button>

              <button 
                type="button" 
                className="save-onboarding-btn" 
                onClick={() => checkProfileCompletion(true)}
                disabled={checkingStatus}
                style={{ flex: 1, justifyContent: "center", height: "48px", fontSize: "15px", background: "linear-gradient(135deg, #0284c7, #0369a1)" }}
              >
                {checkingStatus ? (
                  "Checking Status..."
                ) : (
                  <>
                    <FaSync /> Refresh / Check Approval Status
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          /* ======================================================== */
          /* PROFILE SETUP FORM                                        */
          /* ======================================================== */
          <>
            <div className="onboarding-header">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div className="header-badge">
                  Mandatory Profile Setup
                </div>

                <button 
                  type="button" 
                  className="modal-logout-btn" 
                  onClick={handleLogout}
                  title="Logout and back to login"
                >
                  <FaArrowLeft /> Back to Login
                </button>
              </div>

              <h2 className="modal-title" style={{ marginTop: "8px" }}>Action Required: Complete Your Business Profile</h2>
              <p className="modal-subtitle">
                To complete your registration and submit your account for Admin Approval, please fill in your business and bank details below.
              </p>
            </div>

            {/* MODAL FORM */}
            <form onSubmit={handleSubmit} className="onboarding-form">
              <div className="form-sections-grid">
                
                {/* SECTION 1: BUSINESS & TAX */}
                <div className="form-section">
                  <h3 className="section-heading">
                    <FaFileInvoice className="section-icon" /> Business & Tax Details
                  </h3>

                  <div className="input-field-group">
                    <label>Company Name</label>
                    <div className="input-with-icon">
                      <FaBuilding className="field-icon" />
                      <input
                        type="text"
                        name="companyName"
                        placeholder="Company / Business Name"
                        value={formData.companyName}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div className="input-row-2">
                    <div className="input-field-group">
                      <label>GST Number (Optional)</label>
                      <div className="input-with-icon">
                        <FaFileInvoice className="field-icon" />
                        <input
                          type="text"
                          name="gstNumber"
                          placeholder="GSTIN (e.g. 27AAAAA0000A1Z5)"
                          value={formData.gstNumber}
                          onChange={handleChange}
                        />
                      </div>
                    </div>

                    <div className="input-field-group">
                      <label>PAN Number (Optional)</label>
                      <div className="input-with-icon">
                        <FaRegIdCard className="field-icon" />
                        <input
                          type="text"
                          name="panNumber"
                          placeholder="PAN (e.g. ABCDE1234F)"
                          value={formData.panNumber}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 2: ADDRESS & LOCATION */}
                <div className="form-section">
                  <h3 className="section-heading">
                    <FaMapMarkerAlt className="section-icon" /> Business & Registered Address *
                  </h3>

                  <div className="input-field-group">
                    <label>Full Address *</label>
                    <div className="input-with-icon">
                      <FaMapMarkerAlt className="field-icon" style={{ marginTop: "12px" }} />
                      <textarea
                        name="address"
                        placeholder="Enter full address with building, street & landmark"
                        value={formData.address}
                        onChange={handleChange}
                        rows="2"
                        required
                      />
                    </div>
                  </div>

                  <div className="input-row-3">
                    <div className="input-field-group">
                      <label>City *</label>
                      <input
                        type="text"
                        name="city"
                        placeholder="City"
                        value={formData.city}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="input-field-group">
                      <label>State *</label>
                      <select
                        name="state"
                        value={formData.state}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Select State</option>
                        {statesList.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    <div className="input-field-group">
                      <label>Pincode *</label>
                      <input
                        type="text"
                        name="pincode"
                        placeholder="6-digit Pincode"
                        value={formData.pincode}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 3: BANK DETAILS FOR REMITTANCE */}
                <div className="form-section">
                  <h3 className="section-heading">
                    <FaUniversity className="section-icon" /> Bank Account Details (For COD Remittance) *
                  </h3>

                  <div className="input-row-3">
                    <div className="input-field-group">
                      <label>Account Number *</label>
                      <input
                        type="text"
                        name="bankAccount"
                        placeholder="Bank Account Number"
                        value={formData.bankAccount}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="input-field-group">
                      <label>IFSC Code *</label>
                      <input
                        type="text"
                        name="ifscCode"
                        placeholder="IFSC (e.g. SBIN0001234)"
                        value={formData.ifscCode}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="input-field-group">
                      <label>Bank Name *</label>
                      <input
                        type="text"
                        name="bankName"
                        placeholder="Bank & Branch Name"
                        value={formData.bankName}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 4: MANDATORY IDENTITY KYC DOCUMENTS */}
                <div className="form-section" style={{ background: "#1e293b", padding: "20px", borderRadius: "14px", border: "1px solid #334155" }}>
                  <h3 className="section-heading" style={{ fontSize: "15px", fontWeight: "700", color: "#f8fafc", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <FaRegIdCard className="section-icon" color="#f97316" /> Identity & KYC Document Uploads *
                  </h3>

                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {/* 1. PAN Card Upload Card */}
                    <div style={{ padding: "14px 18px", background: "#0f172a", borderRadius: "12px", border: "1px dashed #334155" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span style={{ fontSize: "13px", fontWeight: "700", color: "#f1f5f9" }}>🪪 1. PAN Card Document *</span>
                        <span style={{ fontSize: "11px", color: "#94a3b8" }}>PNG, JPG, PDF (Max 5MB)</span>
                      </div>
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg,.pdf"
                        onChange={(e) => handleFileChange(e, "panCard")}
                        required
                        style={{ width: "100%", padding: "8px 12px", background: "#1e293b", borderRadius: "8px", border: "1px solid #475569", color: "#f8fafc", fontSize: "12.5px" }}
                      />
                      {docFiles.panCard && (
                        <div style={{ marginTop: "6px", fontSize: "12px", color: "#4ade80", fontWeight: "600" }}>✓ Selected: {docFiles.panCard.name}</div>
                      )}
                    </div>

                    {/* Aadhaar Cards Group (2 Columns) */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      {/* 2. Aadhaar Front */}
                      <div style={{ padding: "14px 18px", background: "#0f172a", borderRadius: "12px", border: "1px dashed #334155" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                          <span style={{ fontSize: "13px", fontWeight: "700", color: "#f1f5f9" }}>🆔 2. Aadhaar (Front) *</span>
                        </div>
                        <input
                          type="file"
                          accept=".png,.jpg,.jpeg,.pdf"
                          onChange={(e) => handleFileChange(e, "aadhaarFront")}
                          required
                          style={{ width: "100%", padding: "8px 12px", background: "#1e293b", borderRadius: "8px", border: "1px solid #475569", color: "#f8fafc", fontSize: "12.5px" }}
                        />
                        {docFiles.aadhaarFront && (
                          <div style={{ marginTop: "6px", fontSize: "12px", color: "#4ade80", fontWeight: "600" }}>✓ Selected: {docFiles.aadhaarFront.name}</div>
                        )}
                      </div>

                      {/* 3. Aadhaar Back */}
                      <div style={{ padding: "14px 18px", background: "#0f172a", borderRadius: "12px", border: "1px dashed #334155" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                          <span style={{ fontSize: "13px", fontWeight: "700", color: "#f1f5f9" }}>🆔 3. Aadhaar (Back) *</span>
                        </div>
                        <input
                          type="file"
                          accept=".png,.jpg,.jpeg,.pdf"
                          onChange={(e) => handleFileChange(e, "aadhaarBack")}
                          required
                          style={{ width: "100%", padding: "8px 12px", background: "#1e293b", borderRadius: "8px", border: "1px solid #475569", color: "#f8fafc", fontSize: "12.5px" }}
                        />
                        {docFiles.aadhaarBack && (
                          <div style={{ marginTop: "6px", fontSize: "12px", color: "#4ade80", fontWeight: "600" }}>✓ Selected: {docFiles.aadhaarBack.name}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* ACTION BUTTONS */}
              <div className="onboarding-actions" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <button 
                  type="button" 
                  className="later-btn" 
                  onClick={handleLogout}
                  style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <FaArrowLeft /> Back to Login
                </button>

                <button 
                  type="submit" 
                  className="save-onboarding-btn" 
                  disabled={loading} 
                  style={{ flex: 1, justifyContent: "center", height: "48px", fontSize: "15px" }}
                >
                  {loading ? (
                    "Saving Profile Details..."
                  ) : (
                    <>
                      <FaCheckCircle /> Save Details & Submit for Admin Approval
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default MerchantOnboardingModal;
