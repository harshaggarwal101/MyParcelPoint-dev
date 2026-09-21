import { useState, useRef } from "react";
import api from "../services/api";
import {
  FaCloudUploadAlt,
  FaFileCsv,
  FaFileExcel,
  FaDownload,
  FaTimes,
  FaSpinner,
  FaCheckCircle,
  FaExclamationTriangle
} from "react-icons/fa";
import "./BulkUploadModal.css";

const BulkUploadModal = ({ isOpen, onClose, onSuccess }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [errorList, setErrorList] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [successInfo, setSuccessInfo] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileSelect = (file) => {
    setErrorList([]);
    setErrorMessage("");
    setSuccessInfo(null);

    if (!file) return;

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".csv") && !fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
      setErrorMessage("Please select a valid CSV or Excel (.xlsx, .xls) file.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const downloadSampleCSV = () => {
    const csvHeader = "customerName,customerPhone,customerEmail,customerAddress,customerCity,customerState,customerPincode,productName,quantity,weight,amount,paymentMode,serviceType,notes\n";
    const sampleRow1 = 'Arjun Singh,9876543210,arjun@example.com,"Flat 101, Main Street",New Delhi,Delhi,110001,T-Shirt,2,0.5,499,COD,Surface,Handle with care\n';
    const sampleRow2 = 'Rahul Sharma,9123456789,rahul@example.com,"House 45, Sector 12",Noida,Uttar Pradesh,201301,Sneakers,1,1.2,1299,PREPAID,Air,Express Delivery\n';

    const blob = new Blob([csvHeader + sampleRow1 + sampleRow2], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "logitrack_bulk_orders_template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setErrorMessage("Please select a file first.");
      return;
    }

    setUploading(true);
    setErrorList([]);
    setErrorMessage("");
    setSuccessInfo(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const endpoint = selectedFile.name.toLowerCase().endsWith(".csv")
        ? "/orders/upload-csv"
        : "/orders/upload-excel";

      const response = await api.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (response.data.success) {
        setSuccessInfo({
          totalOrders: response.data.totalOrders || response.data.orders?.length || 0,
          message: response.data.message || "Bulk Upload Successful"
        });
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      console.error("Bulk upload error:", err);
      const resData = err.response?.data;
      if (resData?.errors && Array.isArray(resData.errors)) {
        setErrorList(resData.errors);
        setErrorMessage(resData.message || "Validation failed for some rows.");
      } else {
        setErrorMessage(resData?.message || err.message || "Failed to upload orders. Please check your file format.");
      }
    } finally {
      setUploading(false);
    }
  };

  const resetModal = () => {
    setSelectedFile(null);
    setErrorList([]);
    setErrorMessage("");
    setSuccessInfo(null);
  };

  return (
    <div className="bulk-upload-overlay" onClick={onClose}>
      <div className="bulk-upload-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bulk-upload-header">
          <div className="bulk-upload-title">
            <FaCloudUploadAlt className="bulk-upload-icon" />
            <div>
              <h3>Bulk Order Upload</h3>
              <p>Upload CSV or Excel file to import multiple orders at once</p>
            </div>
          </div>
          <button className="bulk-upload-close-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        {/* Modal Body */}
        <div className="bulk-upload-body">
          {/* Template Download Card */}
          <div className="bulk-upload-template-banner">
            <div>
              <strong>Need the correct file format?</strong>
              <p>Download our sample CSV template with pre-formatted headers</p>
            </div>
            <button type="button" className="template-download-btn" onClick={downloadSampleCSV}>
              <FaDownload /> Download Sample CSV
            </button>
          </div>

          {/* Drop Zone */}
          {!successInfo && (
            <div
              className={`bulk-upload-dropzone ${isDragOver ? "drag-over" : ""} ${selectedFile ? "has-file" : ""}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv, .xlsx, .xls"
                style={{ display: "none" }}
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />

              {selectedFile ? (
                <div className="file-preview-box">
                  {selectedFile.name.endsWith(".csv") ? (
                    <FaFileCsv size={40} color="#f97316" />
                  ) : (
                    <FaFileExcel size={40} color="#10b981" />
                  )}
                  <div className="file-info">
                    <span className="file-name">{selectedFile.name}</span>
                    <span className="file-size">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                  <button
                    type="button"
                    className="remove-file-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      resetModal();
                    }}
                  >
                    <FaTimes />
                  </button>
                </div>
              ) : (
                <div className="dropzone-placeholder">
                  <FaCloudUploadAlt size={48} className="dropzone-icon" />
                  <p className="dropzone-main-text">
                    <strong>Click to upload</strong> or drag and drop
                  </p>
                  <p className="dropzone-sub-text">
                    Supports .CSV, .XLSX, and .XLS files
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Success Box */}
          {successInfo && (
            <div className="bulk-upload-success-card">
              <FaCheckCircle size={44} color="#10b981" />
              <h4>{successInfo.message}</h4>
              <p>Successfully imported <strong>{successInfo.totalOrders}</strong> new orders to your dashboard!</p>
              <button
                type="button"
                className="upload-another-btn"
                onClick={resetModal}
              >
                Upload Another File
              </button>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="bulk-upload-error-banner">
              <FaExclamationTriangle color="#ef4444" size={20} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Row Validation Errors Table */}
          {errorList.length > 0 && (
            <div className="bulk-upload-error-list">
              <h5>Row Validation Errors ({errorList.length})</h5>
              <div className="error-scroll-container">
                {errorList.map((err, idx) => (
                  <div key={idx} className="error-item">
                    <span className="error-row-badge">Row {err.row}</span>
                    <span className="error-row-msg">{err.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bulk-upload-footer">
          <button type="button" className="btn-cancel" onClick={onClose} disabled={uploading}>
            Cancel
          </button>
          {!successInfo && (
            <button
              type="button"
              className="btn-upload-submit"
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
            >
              {uploading ? (
                <>
                  <FaSpinner className="spin-icon" /> Uploading Orders...
                </>
              ) : (
                "Import Orders"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkUploadModal;
