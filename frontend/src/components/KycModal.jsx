import { useState } from "react";
import {
  FaIdCard,
  FaUpload,
  FaCheckCircle,
  FaExclamationTriangle,
  FaFilePdf,
  FaFileImage,
  FaSpinner,
  FaTimes,
  FaLock
} from "react-icons/fa";
import api from "../services/api";
import { toast } from "react-toastify";
import "./KycModal.css";

const KycModal = ({ isOpen, onClose, onSuccess }) => {
  const [files, setFiles] = useState({
    panCard: null,
    aadhaarFront: null,
    aadhaarBack: null,
  });

  const [previews, setPreviews] = useState({
    panCard: "",
    aadhaarFront: "",
    aadhaarBack: "",
  });

  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setFiles((prev) => ({ ...prev, [field]: file }));
    setPreviews((prev) => ({ ...prev, [field]: file.name }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!files.panCard || !files.aadhaarFront || !files.aadhaarBack) {
      toast.error("Please attach all 3 required documents (PAN Card, Aadhaar Front & Aadhaar Back)");
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("panCard", files.panCard);
      formData.append("aadhaarFront", files.aadhaarFront);
      formData.append("aadhaarBack", files.aadhaarBack);

      const res = await api.post("/merchant/kyc-upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) {
        toast.success("KYC documents uploaded successfully! Account submitted for admin review.");
        
        // Update user in localStorage
        const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
        storedUser.kycStatus = "PENDING";
        storedUser.kycDocuments = res.data.kycDocuments || {};
        localStorage.setItem("user", JSON.stringify(storedUser));

        if (onSuccess) onSuccess(res.data);
        if (onClose) onClose();
      }
    } catch (err) {
      console.error("KYC Upload Error:", err);
      toast.error(err.response?.data?.message || "Failed to upload KYC documents");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="kyc-modal-overlay">
      <div className="kyc-modal-container">
        {/* Header */}
        <div className="kyc-modal-header">
          <div className="kyc-modal-header-left">
            <div className="kyc-modal-icon-badge">
              <FaIdCard />
            </div>
            <div>
              <h2>Complete Account Verification (KYC)</h2>
              <p>Upload mandatory identity documents to activate full shipping services</p>
            </div>
          </div>
          {onClose && (
            <button className="kyc-modal-close-btn" onClick={onClose}>
              <FaTimes />
            </button>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="kyc-modal-body">
            <div className="kyc-notice-banner">
              <FaExclamationTriangle />
              <div>
                <strong>Verification Required:</strong> Please upload clear scanned copies or photos of your PAN Card and Aadhaar Card (Front & Back). Documents will be verified securely by Administrator.
              </div>
            </div>

            <div className="kyc-upload-grid">
              {/* 1. PAN Card */}
              <div className={`kyc-upload-item ${files.panCard ? "has-file" : ""}`}>
                <div className="kyc-upload-label">
                  <span className="kyc-upload-title">
                    <FaIdCard color="#2563eb" /> 1. PAN Card Document
                  </span>
                  <span className="kyc-upload-req">Required</span>
                </div>
                <div className="kyc-upload-box">
                  <div className="kyc-upload-info">
                    {files.panCard ? (
                      <FaCheckCircle color="#16a34a" className="kyc-file-icon" />
                    ) : (
                      <FaFilePdf className="kyc-file-icon" />
                    )}
                    <div className="kyc-file-meta">
                      <p>{previews.panCard || "Upload PAN Card Copy (PNG, JPG, PDF)"}</p>
                      <span>Max size: 5MB</span>
                    </div>
                  </div>
                  <label className="kyc-browse-btn">
                    <FaUpload /> {files.panCard ? "Change File" : "Choose File"}
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg,.pdf"
                      className="kyc-file-input"
                      onChange={(e) => handleFileChange(e, "panCard")}
                    />
                  </label>
                </div>
              </div>

              {/* 2. Aadhaar Card Front */}
              <div className={`kyc-upload-item ${files.aadhaarFront ? "has-file" : ""}`}>
                <div className="kyc-upload-label">
                  <span className="kyc-upload-title">
                    <FaFileImage color="#ea580c" /> 2. Aadhaar Card (Front Side)
                  </span>
                  <span className="kyc-upload-req">Required</span>
                </div>
                <div className="kyc-upload-box">
                  <div className="kyc-upload-info">
                    {files.aadhaarFront ? (
                      <FaCheckCircle color="#16a34a" className="kyc-file-icon" />
                    ) : (
                      <FaFileImage className="kyc-file-icon" />
                    )}
                    <div className="kyc-file-meta">
                      <p>{previews.aadhaarFront || "Upload Aadhaar Card Front Side"}</p>
                      <span>Max size: 5MB</span>
                    </div>
                  </div>
                  <label className="kyc-browse-btn">
                    <FaUpload /> {files.aadhaarFront ? "Change File" : "Choose File"}
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg,.pdf"
                      className="kyc-file-input"
                      onChange={(e) => handleFileChange(e, "aadhaarFront")}
                    />
                  </label>
                </div>
              </div>

              {/* 3. Aadhaar Card Back */}
              <div className={`kyc-upload-item ${files.aadhaarBack ? "has-file" : ""}`}>
                <div className="kyc-upload-label">
                  <span className="kyc-upload-title">
                    <FaFileImage color="#ea580c" /> 3. Aadhaar Card (Back Side)
                  </span>
                  <span className="kyc-upload-req">Required</span>
                </div>
                <div className="kyc-upload-box">
                  <div className="kyc-upload-info">
                    {files.aadhaarBack ? (
                      <FaCheckCircle color="#16a34a" className="kyc-file-icon" />
                    ) : (
                      <FaFileImage className="kyc-file-icon" />
                    )}
                    <div className="kyc-file-meta">
                      <p>{previews.aadhaarBack || "Upload Aadhaar Card Back Side"}</p>
                      <span>Max size: 5MB</span>
                    </div>
                  </div>
                  <label className="kyc-browse-btn">
                    <FaUpload /> {files.aadhaarBack ? "Change File" : "Choose File"}
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg,.pdf"
                      className="kyc-file-input"
                      onChange={(e) => handleFileChange(e, "aadhaarBack")}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="kyc-modal-footer">
            <button
              type="submit"
              className="kyc-submit-btn"
              disabled={loading || !files.panCard || !files.aadhaarFront || !files.aadhaarBack}
            >
              {loading ? (
                <>
                  <FaSpinner className="spin" /> Uploading Documents...
                </>
              ) : (
                <>
                  <FaLock /> Submit KYC For Verification
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default KycModal;
