import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import api from "../../services/api";
import SuperAdminLayout from "./SuperAdminLayout";
import {
  FaTruck,
  FaPlane,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSpinner,
  FaInfoCircle,
  FaBoxes,
  FaMapMarkerAlt,
  FaReceipt,
  FaSlidersH,
  FaEye,
  FaShieldAlt,
  FaArrowLeft,
  FaSave,
  FaUndo,
  FaBuilding,
  FaSearch,
  FaEdit,
  FaPlusCircle,
  FaCalculator,
  FaCoins,
  FaExchangeAlt,
} from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./RateCardManagement.css";

// ─────────────────────────────────────────────────────────────────
// CONSTANTS & INITIAL FORM STATE
// ─────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  forwardRates: { rate500gm: "0", rate1kg: "0", rate2kg: "0", rate5kg: "0", additionalKg: "0" },
  zoneRates:    { local: "0", regional: "0", national: "0" },
  buyingRate:   { buyRate: "0", internalCostPercent: "70" },
  codCharges:   { codCharge: "40", codPercentage: "0", codBuyCharge: "0", codBuyPercentage: "0" },
  rtoCharges:   { rtoCharge: "0", rtoBuyCharge: "0" },
  additionalCharges: { reversePickup: "0", fuelCharge: "0", insuranceCharge: "3.33", odaCharge: "0", handlingCharge: "0" },
  volumetricDivisor: "5000",
  gst:          18,
  effectiveFrom: new Date().toISOString().split('T')[0],
  effectiveTo:   new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0],
  serviceability: { codEnabled: true, prepaidEnabled: true, rtoEnabled: true, reversePickup: true },
};

const normalizeFromBackend = (data) => {
  if (!data) return { ...EMPTY_FORM };
  const str = (v) => (v !== undefined && v !== null && v !== "" ? String(v) : "");
  return {
    forwardRates: {
      rate500gm:    str(data.forwardRates?.rate500gm) || "0",
      rate1kg:      str(data.forwardRates?.rate1kg) || "0",
      rate2kg:      str(data.forwardRates?.rate2kg) || "0",
      rate5kg:      str(data.forwardRates?.rate5kg) || "0",
      additionalKg: str(data.forwardRates?.additionalKg) || "0",
    },
    zoneRates: {
      local:    str(data.zoneRates?.local) || "0",
      regional: str(data.zoneRates?.regional) || "0",
      national: str(data.zoneRates?.national) || "0",
    },
    buyingRate: {
      buyRate:             str(data.buyRate) || "0",
      internalCostPercent: data.internalCostPercent !== undefined && data.internalCostPercent !== null ? String(data.internalCostPercent) : "70",
    },
    codCharges: {
      codCharge:        str(data.codCharge) || "40",
      codPercentage:    str(data.codPercentage) || "0",
      codBuyCharge:     str(data.codBuyCharge) || "0",
      codBuyPercentage: str(data.codBuyPercentage) || "0",
    },
    rtoCharges: {
      rtoCharge:    str(data.rtoCharge) || "0",
      rtoBuyCharge: str(data.rtoBuyCharge) || "0",
    },
    additionalCharges: {
      reversePickup:   str(data.reversePickup) || "0",
      fuelCharge:      str(data.fuelCharge) || "0",
      insuranceCharge: str(data.insuranceCharge) || "3.33",
      odaCharge:       str(data.odaCharge) || "0",
      handlingCharge:  str(data.handlingCharge) || "0",
    },
    volumetricDivisor: str(data.volumetricDivisor) || "5000",
    gst:          data.gst !== undefined ? data.gst : 18,
    effectiveFrom: data.effectiveFrom ? new Date(data.effectiveFrom).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    effectiveTo:   data.effectiveTo ? new Date(data.effectiveTo).toISOString().split('T')[0] : new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0],
    serviceability: {
      codEnabled:     data.serviceability?.codEnabled     !== false,
      prepaidEnabled: data.serviceability?.prepaidEnabled !== false,
      rtoEnabled:     data.serviceability?.rtoEnabled     !== false,
      reversePickup:  data.serviceability?.reversePickup  !== false,
    },
  };
};

// ─────────────────────────────────────────────────────────────────
// FORM VALIDATION RULES
// ─────────────────────────────────────────────────────────────────

const validateForm = (formData) => {
  const num = (v) => (v !== "" && v !== null && v !== undefined ? Number(v) : null);

  // 1. Required Fields
  if (formData.gst === "" || formData.gst === null || formData.gst === undefined)
    return "GST percentage is required.";
  if (!formData.effectiveTo)   return "Effective To date is required.";

  // 2. Percentage range validation (0 - 100%)
  const gst = num(formData.gst);
  if (gst !== null && (gst < 0 || gst > 100)) return "GST percentage must be between 0% and 100%.";

  const intCost = num(formData.buyingRate?.internalCostPercent);
  if (intCost !== null && (intCost < 0 || intCost > 100)) return "Internal Cost % must be between 0% and 100%.";

  const codPct = num(formData.codCharges?.codPercentage);
  if (codPct !== null && (codPct < 0 || codPct > 100)) return "Selling COD % must be between 0% and 100%.";

  const codBuyPct = num(formData.codCharges?.codBuyPercentage);
  if (codBuyPct !== null && (codBuyPct < 0 || codBuyPct > 100)) return "Buying COD % must be between 0% and 100%.";

  const insCharge = num(formData.additionalCharges?.insuranceCharge);
  if (insCharge !== null && (insCharge < 0 || insCharge > 100)) return "Insurance % must be between 0% and 100%.";

  // 3. Non-negative checks
  const r500 = num(formData.forwardRates.rate500gm) || 0;
  const r1k  = num(formData.forwardRates.rate1kg)    || 0;
  const r2k  = num(formData.forwardRates.rate2kg)    || 0;
  const r5k  = num(formData.forwardRates.rate5kg)    || 0;
  const rAdd = num(formData.forwardRates.additionalKg) || 0;

  if (r500 < 0 || r1k < 0 || r2k < 0 || r5k < 0 || rAdd < 0) return "Forward rates cannot be negative numbers.";

  const zLoc = num(formData.zoneRates.local) || 0;
  const zReg = num(formData.zoneRates.regional) || 0;
  const zNat = num(formData.zoneRates.national) || 0;
  if (zLoc < 0 || zReg < 0 || zNat < 0) return "Zone rates cannot be negative numbers.";

  const buyRate = num(formData.buyingRate?.buyRate);
  if (buyRate !== null && buyRate < 0) return "Buying Rate cannot be negative.";

  const codCharge = num(formData.codCharges.codCharge) || 0;
  const codBuyCharge = num(formData.codCharges.codBuyCharge);
  if (codCharge < 0) return "Selling COD Charge cannot be negative.";
  if (codBuyCharge !== null && codBuyCharge < 0) return "Buying COD Charge cannot be negative.";

  const rtoCharge = num(formData.rtoCharges.rtoCharge) || 0;
  const rtoBuyCharge = num(formData.rtoCharges.rtoBuyCharge);
  if (rtoCharge < 0) return "Selling RTO Charge cannot be negative.";
  if (rtoBuyCharge !== null && rtoBuyCharge < 0) return "Buying RTO Charge cannot be negative.";

  const oda = num(formData.additionalCharges?.odaCharge) || 0;
  const hnd = num(formData.additionalCharges?.handlingCharge) || 0;
  const fuel = num(formData.additionalCharges?.fuelCharge) || 0;
  const rev = num(formData.additionalCharges?.reversePickup) || 0;
  if (oda < 0 || hnd < 0 || fuel < 0 || rev < 0) return "Additional charges cannot be negative numbers.";

  // 4. Buying Rate vs Selling Rate check (Loss Prevention)
  const estSell = r500 + zNat;
  if (buyRate !== null && buyRate > estSell && estSell > 0) {
    return `Buying Rate (₹${buyRate}) cannot be greater than 500g National Selling Rate (₹${estSell}) — this will cause a loss!`;
  }

  // 5. Volumetric Divisor check (min 1000, cannot be 0)
  const volDiv = num(formData.volumetricDivisor) || 5000;
  if (volDiv < 1000) return "Volumetric Divisor must be at least 1000 to avoid divide-by-zero errors.";

  // 6. Effective Date check
  if (formData.effectiveFrom && formData.effectiveTo) {
    if (new Date(formData.effectiveTo) < new Date(formData.effectiveFrom)) {
      return "Effective To date must be on or after Effective From date.";
    }
  }

  // 7. Buying COD vs Selling COD check
  if (codBuyCharge !== null && codBuyCharge > codCharge && codCharge > 0) {
    return `Buying COD Charge (₹${codBuyCharge}) cannot be greater than Selling COD Charge (₹${codCharge}).`;
  }

  // 8. Buying RTO vs Selling RTO check
  if (rtoBuyCharge !== null && rtoBuyCharge > rtoCharge && rtoCharge > 0) {
    return `Buying RTO Charge (₹${rtoBuyCharge}) cannot be greater than Selling RTO Charge (₹${rtoCharge}).`;
  }

  return null;
};

// ─────────────────────────────────────────────────────────────────
// INLINE SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────

const StatusBadge = ({ active }) => (
  <span className={`rcm-status-chip ${active ? "active" : "inactive"}`}>
    {active ? <FaCheckCircle size={10} /> : <FaExclamationTriangle size={10} />}
    {active ? "Configured" : "Not Configured"}
  </span>
);

const FormInput = ({
  label,
  value,
  onChange,
  type = "number",
  placeholder = "0",
  disabled = false,
  required = false,
  prefix = "₹",
  helperText = "",
  tooltip = "",
  warning = "",
  error = "",
}) => (
  <div className="rcm-form-field">
    <label className="rcm-field-label">
      {label}
      {required && <span className="rcm-field-required">*</span>}
      {tooltip && (
        <span className="rcm-info-icon" title={tooltip}>
          <FaInfoCircle size={12} />
        </span>
      )}
    </label>
    <div className="rcm-field-input-box">
      {prefix && <span className="rcm-field-prefix">{prefix}</span>}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`rcm-input-element ${prefix ? "has-prefix" : ""} ${error ? "has-error" : warning ? "has-warning" : ""}`}
      />
    </div>
    {helperText && <p className="rcm-field-helper">{helperText}</p>}
    {warning && <p className="rcm-field-warning">⚠️ {warning}</p>}
    {error && <p className="rcm-field-error">❌ {error}</p>}
  </div>
);

const CheckboxToggle = ({ label, checked, onChange }) => (
  <label className={`rcm-toggle-label ${checked ? "checked" : ""}`}>
    <div onClick={onChange} className={`rcm-toggle-switch ${checked ? "checked" : ""}`}>
      <div className="rcm-toggle-handle" />
    </div>
    <span className="rcm-toggle-text">{label}</span>
  </label>
);

// ─────────────────────────────────────────────────────────────────
// LIVE PROFIT MARGIN PREVIEW COMPONENT
// ─────────────────────────────────────────────────────────────────

const LiveMarginPreview = ({ formData, courierName, activeTab }) => {
  const num = (v) => (v !== "" && v !== null && v !== undefined ? Number(v) : 0);

  const r500 = num(formData.forwardRates?.rate500gm);
  const zNat = num(formData.zoneRates?.national);
  const sellForward = r500 + zNat;

  const userBuyRate = num(formData.buyingRate?.buyRate);
  const intCostPct = num(formData.buyingRate?.internalCostPercent) || 70;
  const calculatedBuyRate = userBuyRate > 0 ? userBuyRate : Math.round(sellForward * (intCostPct / 100));
  const isBuyAuto = userBuyRate <= 0;
  const freightMargin = Math.round((sellForward - calculatedBuyRate) * 100) / 100;

  // COD Margin
  const sellCod = num(formData.codCharges?.codCharge);
  const userCodBuy = num(formData.codCharges?.codBuyCharge);
  const calculatedCodBuy = userCodBuy > 0 ? userCodBuy : Math.round(sellCod * 0.50);
  const isCodBuyAuto = userCodBuy <= 0;
  const codMargin = Math.round((sellCod - calculatedCodBuy) * 100) / 100;

  // RTO Margin
  const sellRto = num(formData.rtoCharges?.rtoCharge);
  const userRtoBuy = num(formData.rtoCharges?.rtoBuyCharge);
  const calculatedRtoBuy = userRtoBuy > 0 ? userRtoBuy : Math.round(sellRto * 0.60);
  const isRtoBuyAuto = userRtoBuy <= 0;
  const rtoMargin = Math.round((sellRto - calculatedRtoBuy) * 100) / 100;

  // Total Estimated Profit
  const totalMargin = Math.round((freightMargin + codMargin + rtoMargin) * 100) / 100;
  const isLoss = totalMargin < 0;

  return (
    <div className="rcm-preview-card sticky-preview">
      <div className="rcm-preview-header">
        <h3 className="rcm-preview-title">
          <FaCalculator size={16} color="#ea580c" /> Live Profit Margin Preview
        </h3>
        <span className="rcm-preview-courier-tag">{courierName} ({activeTab})</span>
      </div>

      {/* Main Net Profit Badge */}
      <div className={`rcm-margin-hero-box ${isLoss ? "loss" : "profit"}`}>
        <p className="rcm-margin-hero-label">Estimated Superadmin Profit / Order</p>
        <p className="rcm-margin-hero-value">
          {totalMargin >= 0 ? `+₹${totalMargin}` : `-₹${Math.abs(totalMargin)}`}
        </p>
        <span className="rcm-margin-hero-sub">
          {isLoss ? "Warning: Selling rates are below buying costs!" : "Healthy profit margin locked"}
        </span>
      </div>

      {/* Margin Breakdown Rows */}
      <div className="rcm-preview-breakdown">
        {/* 1. Freight Margin */}
        <div className="rcm-margin-row">
          <div className="rcm-margin-row-info">
            <span className="rcm-margin-row-title">Freight Margin (500g Nat.)</span>
            <span className="rcm-margin-row-details">
              Sell ₹{sellForward} - Buy ₹{calculatedBuyRate} {isBuyAuto ? "(Auto 70%)" : "(Manual)"}
            </span>
          </div>
          <span className={`rcm-margin-badge ${freightMargin >= 0 ? "positive" : "negative"}`}>
            {freightMargin >= 0 ? `+₹${freightMargin}` : `-₹${Math.abs(freightMargin)}`}
          </span>
        </div>

        {/* 2. COD Margin */}
        <div className="rcm-margin-row">
          <div className="rcm-margin-row-info">
            <span className="rcm-margin-row-title">COD Margin</span>
            <span className="rcm-margin-row-details">
              Sell ₹{sellCod} - Buy ₹{calculatedCodBuy} {isCodBuyAuto ? "(Auto 50%)" : "(Manual)"}
            </span>
          </div>
          <span className={`rcm-margin-badge ${codMargin >= 0 ? "positive" : "negative"}`}>
            {codMargin >= 0 ? `+₹${codMargin}` : `-₹${Math.abs(codMargin)}`}
          </span>
        </div>

        {/* 3. RTO Margin */}
        <div className="rcm-margin-row">
          <div className="rcm-margin-row-info">
            <span className="rcm-margin-row-title">RTO Margin</span>
            <span className="rcm-margin-row-details">
              Sell ₹{sellRto} - Buy ₹{calculatedRtoBuy} {isRtoBuyAuto ? "(Auto 60%)" : "(Manual)"}
            </span>
          </div>
          <span className={`rcm-margin-badge ${rtoMargin >= 0 ? "positive" : "negative"}`}>
            {rtoMargin >= 0 ? `+₹${rtoMargin}` : `-₹${Math.abs(rtoMargin)}`}
          </span>
        </div>
      </div>

      <div className="rcm-preview-footer">
        <span>GST Billed: {formData.gst || 18}%</span>
        <span>Volumetric Divisor: {formData.volumetricDivisor || 5000}</span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// RATE FORM COMPONENT
// ─────────────────────────────────────────────────────────────────

const RateForm = ({ formData, onChange, onSave, onReset, onBack, saving, activeTab, onTabChange, courierName }) => {
  const {
    forwardRates,
    zoneRates,
    buyingRate,
    codCharges,
    rtoCharges,
    additionalCharges,
    volumetricDivisor,
    gst,
    effectiveFrom,
    effectiveTo,
    serviceability,
  } = formData;

  const field = (section, key, val) => onChange(section, key, val);

  // Slab order warning checks
  const num = (v) => (v !== "" && v !== null && v !== undefined ? Number(v) : 0);
  const r500 = num(forwardRates.rate500gm);
  const r1k  = num(forwardRates.rate1kg);
  const r2k  = num(forwardRates.rate2kg);
  const r5k  = num(forwardRates.rate5kg);

  const warn1kg = r1k > 0 && r1k < r500 ? "1kg rate is lower than 500gm rate" : "";
  const warn2kg = r2k > 0 && r2k < r1k  ? "2kg rate is lower than 1kg rate" : "";
  const warn5kg = r5k > 0 && r5k < r2k  ? "5kg rate is lower than 2kg rate" : "";

  // Buying vs Selling warnings
  const userBuyRate = num(buyingRate?.buyRate);
  const estSell = r500 + num(zoneRates.national);
  const errorBuyRate = userBuyRate > 0 && userBuyRate > estSell && estSell > 0 
    ? `Buying Rate (₹${userBuyRate}) > Selling Rate (₹${estSell})` : "";

  const codCharge = num(codCharges.codCharge);
  const codBuyCharge = num(codCharges.codBuyCharge);
  const warnCodBuy = codBuyCharge > 0 && codBuyCharge > codCharge && codCharge > 0 
    ? `Buying COD Charge (₹${codBuyCharge}) is higher than Selling COD Charge (₹${codCharge})` : "";

  const rtoCharge = num(rtoCharges.rtoCharge);
  const rtoBuyCharge = num(rtoCharges.rtoBuyCharge);
  const warnRtoBuy = rtoBuyCharge > 0 && rtoBuyCharge > rtoCharge && rtoCharge > 0
    ? `Buying RTO Charge (₹${rtoBuyCharge}) is higher than Selling RTO Charge (₹${rtoCharge})` : "";

  const validationError = useMemo(() => validateForm(formData), [formData]);

  return (
    <>
      {/* Top Controls Bar */}
      <div className="rcm-form-top-bar">
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "14px" }}>
          <button onClick={onBack} className="rcm-back-btn">
            <FaArrowLeft size={12} /> Back to Couriers
          </button>
          <span style={{ fontSize: "18px", color: "#0f172a", fontWeight: "800" }}>{courierName}</span>
          <StatusBadge active={false} />
        </div>

        <div className="rcm-tab-switcher">
          {["Surface", "Air"].map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={`rcm-tab-btn ${activeTab === tab ? "active" : "inactive"}`}
            >
              {tab === "Surface" ? <FaTruck size={14} /> : <FaPlane size={14} />}
              {tab} Rates
            </button>
          ))}
        </div>
      </div>

      {/* Validation Warning Alert */}
      {validationError && (
        <div className="rcm-validation-alert">
          <FaExclamationTriangle size={16} />
          <span>{validationError}</span>
        </div>
      )}

      {/* Two Column Grid */}
      <div className="rcm-form-grid-layout">
        {/* LEFT FORM FIELDS */}
        <div>
          {/* Basic Information & Volumetric */}
          <div className="rcm-card">
            <h3 className="rcm-card-title">
              <span className="rcm-card-title-icon"><FaInfoCircle size={16} /></span> Basic Information & Volumetric
            </h3>
            <div className="rcm-inputs-grid-3">
              <FormInput label="Service Type" value={activeTab} onChange={() => {}} disabled type="text" prefix="" />
              <FormInput label="GST (%)" value={gst} onChange={(v) => onChange(null, "gst", v)} required prefix="%" tooltip="Standard GST percentage (0 - 100%)" />
              <FormInput 
                label="Volumetric Divisor" 
                value={volumetricDivisor} 
                onChange={(v) => onChange(null, "volumetricDivisor", v)} 
                type="number" 
                prefix="" 
                placeholder="5000"
                helperText="Standard default is 5000 (Min 1000)"
                tooltip="Divisor for (L x B x H) / Divisor to compute volumetric weight"
              />
              <FormInput label="Effective From" value={effectiveFrom} onChange={(v) => onChange(null, "effectiveFrom", v)} type="date" prefix="" required />
              <FormInput label="Effective To"   value={effectiveTo}   onChange={(v) => onChange(null, "effectiveTo",   v)} type="date" prefix="" required />
            </div>
          </div>

          {/* Forward Freight Rates */}
          <div className="rcm-card">
            <h3 className="rcm-card-title">
              <span className="rcm-card-title-icon"><FaBoxes size={16} /></span> Forward Freight Weight Slabs
            </h3>
            <div className="rcm-inputs-grid-3">
              <FormInput label="500gm Rate" value={forwardRates.rate500gm} onChange={(v) => field("forwardRates","rate500gm",v)} required />
              <FormInput label="1kg Rate"   value={forwardRates.rate1kg}   onChange={(v) => field("forwardRates","rate1kg",v)} warning={warn1kg} />
              <FormInput label="2kg Rate"   value={forwardRates.rate2kg}   onChange={(v) => field("forwardRates","rate2kg",v)} warning={warn2kg} />
              <FormInput label="5kg Rate"   value={forwardRates.rate5kg}   onChange={(v) => field("forwardRates","rate5kg",v)} warning={warn5kg} />
              <FormInput label="Additional KG" value={forwardRates.additionalKg} onChange={(v) => field("forwardRates","additionalKg",v)} helperText="Rate per extra 1kg beyond 5kg" />
            </div>
          </div>

          {/* Zone Rates */}
          <div className="rcm-card">
            <h3 className="rcm-card-title">
              <span className="rcm-card-title-icon"><FaMapMarkerAlt size={16} /></span> Zone Rates
            </h3>
            <div className="rcm-inputs-grid-3">
              <FormInput label="Local Zone"    value={zoneRates.local}    onChange={(v) => field("zoneRates","local",v)} helperText="Same city delivery" />
              <FormInput label="Regional Zone" value={zoneRates.regional} onChange={(v) => field("zoneRates","regional",v)} helperText="Same state/region" />
              <FormInput label="National Zone" value={zoneRates.national} onChange={(v) => field("zoneRates","national",v)} helperText="Inter-state national" />
            </div>
          </div>

          {/* COD Charges */}
          <div className="rcm-card">
            <h3 className="rcm-card-title">
              <span className="rcm-card-title-icon"><FaExchangeAlt size={16} /></span> COD Charges
            </h3>
            <div className="rcm-inputs-grid-2">
              <FormInput 
                label="COD Flat Fee (₹)" 
                value={codCharges.codCharge} 
                onChange={(v) => field("codCharges","codCharge",v)} 
                required 
                helperText="Fixed COD fee billed for COD orders"
              />
              <FormInput 
                label="COD Percentage (%)" 
                value={codCharges.codPercentage} 
                onChange={(v) => field("codCharges","codPercentage",v)} 
                prefix="%" 
                placeholder="0"
                helperText="Optional percentage fee on order amount"
              />
            </div>
          </div>

          {/* RTO Charges */}
          <div className="rcm-card">
            <h3 className="rcm-card-title">
              <span className="rcm-card-title-icon"><FaUndo size={16} /></span> RTO Return Charge
            </h3>
            <div className="rcm-inputs-grid-1">
              <FormInput 
                label="RTO Return Charge (₹)" 
                value={rtoCharges.rtoCharge} 
                onChange={(v) => field("rtoCharges","rtoCharge",v)} 
                placeholder="60"
                helperText="Fee debited from wallet on return shipment (Default ₹60)"
              />
            </div>
          </div>

          {/* Additional Charges & VAS */}
          <div className="rcm-card">
            <h3 className="rcm-card-title">
              <span className="rcm-card-title-icon"><FaReceipt size={16} /></span> Additional Charges & VAS
            </h3>
            <div className="rcm-inputs-grid-3">
              <FormInput label="Fuel Charge"     value={additionalCharges.fuelCharge}     onChange={(v) => field("additionalCharges","fuelCharge",v)} />
              <FormInput label="ODA Charge"      value={additionalCharges.odaCharge}      onChange={(v) => field("additionalCharges","odaCharge",v)} />
              <FormInput label="Handling Charge" value={additionalCharges.handlingCharge} onChange={(v) => field("additionalCharges","handlingCharge",v)} />
              <FormInput 
                label="Insurance (%)" 
                value="3.33 (Fixed Global)" 
                onChange={() => {}} 
                disabled={true}
                type="text"
                prefix="%" 
                placeholder="3.33"
                helperText="Global Fixed Policy: ₹50 per ₹1,500 Order Value (Amount ÷ 30)"
              />
              <FormInput label="Reverse Pickup"  value={additionalCharges.reversePickup}  onChange={(v) => field("additionalCharges","reversePickup",v)} />
            </div>
          </div>

          {/* Serviceability Options */}
          <div className="rcm-card">
            <h3 className="rcm-card-title">
              <span className="rcm-card-title-icon"><FaSlidersH size={16} /></span> Serviceability Options
            </h3>
            <div className="rcm-inputs-grid-2">
              <CheckboxToggle label="COD Enabled"     checked={serviceability.codEnabled}     onChange={() => onChange("serviceability","codEnabled",    !serviceability.codEnabled)} />
              <CheckboxToggle label="Prepaid Enabled" checked={serviceability.prepaidEnabled} onChange={() => onChange("serviceability","prepaidEnabled", !serviceability.prepaidEnabled)} />
              <CheckboxToggle label="RTO Enabled"     checked={serviceability.rtoEnabled}     onChange={() => onChange("serviceability","rtoEnabled",    !serviceability.rtoEnabled)} />
              <CheckboxToggle label="Reverse Pickup"  checked={serviceability.reversePickup}  onChange={() => onChange("serviceability","reversePickup", !serviceability.reversePickup)} />
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR - STICKY LIVE PROFIT MARGIN PREVIEW */}
        <div>
          <LiveMarginPreview formData={formData} courierName={courierName} activeTab={activeTab} />
        </div>
      </div>

      {/* Floating Sticky Footer */}
      <div className="rcm-sticky-footer">
        <div style={{ fontSize: "14px", fontWeight: "800", color: "#ffffff" }}>
          Configuring <span style={{ color: "#ea580c" }}>{activeTab} Rates</span> for {courierName}
        </div>
        <div className="rcm-footer-btn-group">
          <button onClick={onReset} className="rcm-reset-btn">
            <FaUndo size={12} /> Reset
          </button>
          <button onClick={onSave} disabled={saving || !!validationError} className="rcm-save-btn">
            {saving ? (
              <FaSpinner size={16} className="rcm-spinner" />
            ) : (
              <FaSave size={14} />
            )}
            {saving ? "Saving…" : `Save ${activeTab} Rate Card`}
          </button>
        </div>
      </div>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────
// COURIER CARD COMPONENT
// ─────────────────────────────────────────────────────────────────

const CourierCard = ({ courier, surfaceCard, airCard, onSelect }) => {
  const isConfigured = (card) =>
    !!card &&
    card.isActive !== false &&
    card.enabled !== false &&
    ((card.forwardRates?.rate500gm || 0) > 0 || (card.forwardRates?.rate1kg || 0) > 0);
  const isSurface = isConfigured(surfaceCard);
  const isAir     = isConfigured(airCard);

  const cardStatusClass = isSurface && isAir ? "fully-configured" : isSurface || isAir ? "partially-configured" : "not-configured";

  const ServiceBlock = ({ type, card, configured }) => (
    <div className={`rcm-service-box ${configured ? "configured" : "unconfigured"}`}>
      <div className="rcm-service-box-header">
        <span className="rcm-service-title">
          <span className="rcm-service-title-icon">
            {type === "Surface" ? <FaTruck size={14} /> : <FaPlane size={14} />}
          </span>
          {type} Shipping
        </span>
        <StatusBadge active={configured} />
      </div>

      {configured ? (
        <div className="rcm-service-metrics-grid">
          {[
            { l: "Min (500g)", v: `₹${card.forwardRates?.rate500gm ?? 0}` },
            { l: "COD Charge", v: `₹${card.codCharge ?? 0}` },
            { l: "GST",        v: `${card.gst !== undefined ? card.gst : 18}%` },
            { l: "Valid From", v: card.effectiveFrom ? new Date(card.effectiveFrom).toLocaleDateString("en-IN") : "N/A" },
          ].map(({ l, v }) => (
            <div key={l} className="rcm-metric-item">
              <p className="rcm-metric-label">{l}</p>
              <p className="rcm-metric-value">{v}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rcm-unconfigured-hint">
          <FaExclamationTriangle size={13} color="#f59e0b" />
          <span>No active {type.toLowerCase()} rates set</span>
        </div>
      )}

      <button
        onClick={() => onSelect(courier, type)}
        className={configured ? "rcm-btn-edit" : "rcm-btn-configure"}
      >
        {configured ? (
          <>
            <FaEdit size={12} /> Edit {type} Rates
          </>
        ) : (
          <>
            <FaPlusCircle size={12} /> Configure {type} Rates
          </>
        )}
      </button>
    </div>
  );

  return (
    <div className={`rcm-courier-card ${cardStatusClass}`}>
      {/* Courier Header */}
      <div className="rcm-courier-header">
        <div className="rcm-courier-identity">
          <div className="rcm-courier-avatar-box">
            <FaTruck size={22} />
          </div>
          <div>
            <h3 className="rcm-courier-name">{courier.name}</h3>
            <span className={`rcm-courier-badge-overall ${isSurface && isAir ? "full" : isSurface || isAir ? "partial" : "none"}`}>
              {isSurface && isAir ? "Fully Configured" : isSurface || isAir ? "Partially Configured" : "Not Configured"}
            </span>
          </div>
        </div>
      </div>

      {/* Surface & Air Sub-Blocks */}
      <div className="rcm-services-wrapper">
        <ServiceBlock type="Surface" card={surfaceCard} configured={isSurface} />
        <ServiceBlock type="Air" card={airCard} configured={isAir} />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────

const RateCardManagement = () => {
  const { merchantId } = useParams();

  // ── State ──
  const [merchantInfo, setMerchantInfo] = useState({
    companyName: "", merchantName: "", email: "", status: "",
    phone: "", gstNumber: "", walletBalance: 0, totalOrders: 0, totalShipments: 0,
  });
  const [loading, setLoading] = useState({ merchant: true, rates: false, saving: false });
  const [couriers, setCouriers]         = useState([]);
  const [assignedRates, setAssignedRates] = useState([]);
  const [selectedCourier, setSelectedCourier] = useState(null);
  const [activeFormTab, setActiveFormTab] = useState("Surface");
  const [formData, setFormData]   = useState({ ...EMPTY_FORM });
  const [initialData, setInitialData] = useState({ ...EMPTY_FORM });

  // ── Search & Filter State ──
  const [searchTerm, setSearchTerm]   = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialData);

  // ── Unsaved changes: browser unload ──
  useEffect(() => {
    const handler = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Leave?";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const confirmIfDirty = useCallback((proceed) => {
    if (isDirty) {
      if (window.confirm("You have unsaved changes. Discard them?")) proceed();
    } else {
      proceed();
    }
  }, [isDirty]);

  // ── API: Fetch merchant ──
  const fetchMerchant = useCallback(async () => {
    try {
      setLoading((p) => ({ ...p, merchant: true }));
      const res = await api.get(`/admin/merchant/${merchantId}`);
      const m = res.data.merchant || {};
      setMerchantInfo({
        companyName:    m.companyName || "",
        merchantName:   m.userId?.name || m.name || "",
        email:          m.email || "",
        status:         m.isApproved ? "Approved" : "Pending",
        phone:          m.phone || m.mobile || "",
        gstNumber:      m.gstNumber || m.gst || "",
        walletBalance:  res.data.walletBalance || 0,
        totalOrders:    res.data.totalOrders || 0,
        totalShipments: res.data.totalShipments || 0,
        isApproved:     m.isApproved,
        kycStatus:      m.kycStatus,
        isBlocked:      m.isBlocked,
        kycDocuments:   m.kycDocuments || {},
      });
    } catch {
      /* silently ignore */
    } finally {
      setLoading((p) => ({ ...p, merchant: false }));
    }
  }, [merchantId]);

  const fetchCouriers = useCallback(async () => {
    try {
      const res = await api.get("/couriers/active/list");
      setCouriers(res.data.couriers || []);
    } catch {
      toast.error("Failed to load couriers.");
    }
  }, []);

  const fetchAssignedRates = useCallback(async () => {
    try {
      const res = await api.get(`/ratecards/merchant/${merchantId}`);
      setAssignedRates(res.data.rateCards || []);
    } catch {
      setAssignedRates([]);
    }
  }, [merchantId]);

  const loadCourierRates = useCallback(async (courier, serviceType) => {
    if (!courier) return;
    try {
      setLoading((p) => ({ ...p, rates: true }));
      const res = await api.get(`/ratecards/merchant/${merchantId}/${courier._id}?serviceType=${serviceType}&exactOnly=true`);
      const data = res.data?.rateCard || res.data;
      if (data && data.forwardRates && res.data?.isCustom !== false) {
        const normalized = normalizeFromBackend(data);
        setFormData(normalized);
        setInitialData(normalized);
      } else {
        setFormData({ ...EMPTY_FORM });
        setInitialData({ ...EMPTY_FORM });
      }
    } catch {
      setFormData({ ...EMPTY_FORM });
      setInitialData({ ...EMPTY_FORM });
    } finally {
      setLoading((p) => ({ ...p, rates: false }));
    }
  }, [merchantId]);

  // ── Bootstrap ──
  useEffect(() => {
    fetchMerchant();
    fetchCouriers();
    fetchAssignedRates();
  }, [merchantId]);

  useEffect(() => {
    if (selectedCourier) {
      loadCourierRates(selectedCourier, activeFormTab);
    }
  }, [selectedCourier?._id, activeFormTab]);

  // ── Handlers ──
  const handleSelectCourier = (courier, type) => {
    confirmIfDirty(() => {
      setSelectedCourier(courier);
      setActiveFormTab(type);
    });
  };

  const handleTabChange = (newTab) => {
    if (newTab === activeFormTab) return;
    confirmIfDirty(() => setActiveFormTab(newTab));
  };

  const handleBack = () => {
    confirmIfDirty(() => {
      setSelectedCourier(null);
      setFormData({ ...EMPTY_FORM });
      setInitialData({ ...EMPTY_FORM });
    });
  };

  const handleChange = (section, key, value) => {
    setFormData((prev) => {
      if (section) return { ...prev, [section]: { ...prev[section], [key]: value } };
      return { ...prev, [key]: value };
    });
  };

  const handleReset = () => setFormData({ ...initialData });

  // ── Save ──
  const handleSave = async () => {
    const errMsg = validateForm(formData);
    if (errMsg) { toast.error(errMsg); return; }

    try {
      setLoading((p) => ({ ...p, saving: true }));

      const payload = {
        merchantId,
        courierId:           selectedCourier._id,
        courierPartner:      selectedCourier.code || selectedCourier.name,
        serviceType:         activeFormTab,
        forwardRates: {
          rate500gm:    Number(formData.forwardRates.rate500gm)    || 0,
          rate1kg:      Number(formData.forwardRates.rate1kg)      || 0,
          rate2kg:      Number(formData.forwardRates.rate2kg)      || 0,
          rate5kg:      Number(formData.forwardRates.rate5kg)      || 0,
          additionalKg: Number(formData.forwardRates.additionalKg) || 0,
        },
        zoneRates: {
          local:    Number(formData.zoneRates.local)    || 0,
          regional: Number(formData.zoneRates.regional) || 0,
          national: Number(formData.zoneRates.national) || 0,
        },
        buyRate:             formData.buyingRate?.buyRate ? Number(formData.buyingRate.buyRate) : 0,
        internalCostPercent: formData.buyingRate?.internalCostPercent ? Number(formData.buyingRate.internalCostPercent) : 70,
        codCharge:           Number(formData.codCharges.codCharge) || 0,
        codPercentage:       formData.codCharges?.codPercentage ? Number(formData.codCharges.codPercentage) : 0,
        codBuyCharge:        formData.codCharges?.codBuyCharge ? Number(formData.codCharges.codBuyCharge) : 0,
        codBuyPercentage:    formData.codCharges?.codBuyPercentage ? Number(formData.codCharges.codBuyPercentage) : 0,
        rtoCharge:           Number(formData.rtoCharges.rtoCharge) || 0,
        rtoBuyCharge:        formData.rtoCharges?.rtoBuyCharge ? Number(formData.rtoCharges.rtoBuyCharge) : 0,
        reversePickup:       Number(formData.additionalCharges?.reversePickup) || 0,
        fuelCharge:          Number(formData.additionalCharges?.fuelCharge) || 0,
        insuranceCharge:     formData.additionalCharges?.insuranceCharge ? Number(formData.additionalCharges.insuranceCharge) : 0,
        volumetricDivisor:   formData.volumetricDivisor ? Number(formData.volumetricDivisor) : 5000,
        gst:                 Number(formData.gst) || 18,
        odaCharge:           Number(formData.additionalCharges?.odaCharge) || 0,
        handlingCharge:      Number(formData.additionalCharges?.handlingCharge) || 0,
        effectiveFrom:       formData.effectiveFrom || undefined,
        effectiveTo:         formData.effectiveTo   || undefined,
        serviceability:      formData.serviceability,
        enabled:  true,
        isActive: true,
      };

      const res = await api.post("/ratecards/save", payload);

      if (res.data?.success) {
        toast.success(`${activeFormTab} Rate Card saved successfully!`);
        setInitialData({ ...formData });
        await fetchAssignedRates();
        await loadCourierRates(selectedCourier, activeFormTab);
      } else {
        toast.error(res.data?.message || `Failed to save ${activeFormTab} rate card.`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save rate card.");
    } finally {
      setLoading((p) => ({ ...p, saving: false }));
    }
  };

  // ── Derived ──
  const getRateCard = (courierId, serviceType) =>
    assignedRates.find(
      (r) =>
        String(r.courierId?._id || r.courierId) === String(courierId) &&
        (r.serviceType || "Surface") === serviceType
    );

  const configuredCount = assignedRates.filter((r) => r.isActive !== false).length;

  // Search & Filter Logic
  const filteredCouriers = couriers.filter((courier) => {
    const matchesSearch = courier.name.toLowerCase().includes(searchTerm.toLowerCase());
    const surface = getRateCard(courier._id, "Surface");
    const air     = getRateCard(courier._id, "Air");
    const isSurface = surface && surface.isActive !== false;
    const isAir     = air && air.isActive !== false;

    if (statusFilter === "full") return matchesSearch && isSurface && isAir;
    if (statusFilter === "partial") return matchesSearch && (isSurface || isAir) && !(isSurface && isAir);
    if (statusFilter === "none") return matchesSearch && !isSurface && !isAir;
    return matchesSearch;
  });

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────
  if (loading.merchant) {
    return (
      <SuperAdminLayout>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
          <FaSpinner size={36} color="#ea580c" className="rcm-spinner" />
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="rcm-container">
        {/* Page Header */}
        <div className="rcm-header">
          <div className="rcm-header-left">
            <h1 className="rcm-title">
              <div className="rcm-title-icon-wrapper">
                <FaReceipt size={20} />
              </div>
              Merchant Rate Management
            </h1>
            <p className="rcm-subtitle">
              Configure custom rates, courier buying margins, COD & RTO fees, and live profit margins
            </p>
          </div>
          {isDirty && (
            <div className="rcm-unsaved-badge">
              <FaExclamationTriangle size={14} /> Unsaved Changes
            </div>
          )}
        </div>

        {/* Hero Merchant Card */}
        <div className="rcm-merchant-card">
          <div className="rcm-merchant-card-header">
            <div className="rcm-merchant-title-group">
              <div className="rcm-merchant-avatar">
                {merchantInfo.companyName ? merchantInfo.companyName.charAt(0).toUpperCase() : <FaBuilding />}
              </div>
              <div>
                <h2 className="rcm-merchant-name-title">{merchantInfo.companyName || "Merchant Details"}</h2>
                <p className="rcm-merchant-company-sub">{merchantInfo.merchantName ? `Owner: ${merchantInfo.merchantName}` : "Merchant Account"}</p>
              </div>
            </div>
            <span style={{
              display: "inline-block", padding: "4px 14px", borderRadius: "20px",
              fontSize: "12px", fontWeight: "800",
              background: merchantInfo.status === "Approved" ? "#dcfce7" : "#fef3c7",
              color: merchantInfo.status === "Approved" ? "#166534" : "#92400e",
              border: `1px solid ${merchantInfo.status === "Approved" ? "#bbf7d0" : "#fde68a"}`,
            }}>{merchantInfo.status || "—"}</span>
          </div>

          <div className="rcm-merchant-grid">
            <div className="rcm-merchant-item">
              <p className="rcm-merchant-item-label">Email</p>
              <p className="rcm-merchant-item-value">{merchantInfo.email || "—"}</p>
            </div>
            <div className="rcm-merchant-item">
              <p className="rcm-merchant-item-label">Phone</p>
              <p className="rcm-merchant-item-value">{merchantInfo.phone || "—"}</p>
            </div>
            <div className="rcm-merchant-item">
              <p className="rcm-merchant-item-label">GST No</p>
              <p className="rcm-merchant-item-value">{merchantInfo.gstNumber || "—"}</p>
            </div>
            <div className="rcm-merchant-item">
              <p className="rcm-merchant-item-label">KYC Status</p>
              <p className="rcm-merchant-item-value">{merchantInfo.kycStatus || "Verified"}</p>
            </div>
            <div className="rcm-merchant-item">
              <p className="rcm-merchant-item-label">Account State</p>
              <p className="rcm-merchant-item-value" style={{ color: merchantInfo.isBlocked ? "#dc2626" : "#16a34a" }}>
                {merchantInfo.isBlocked ? "Blocked" : "Active"}
              </p>
            </div>
            <div className="rcm-merchant-item" style={{ background: "#f0fdf4", borderColor: "#bbf7d0" }}>
              <p className="rcm-merchant-item-label" style={{ color: "#166534" }}>Wallet Balance</p>
              <p className="rcm-merchant-item-value highlight-wallet">
                ₹{(() => {
                  const num = Number(merchantInfo.walletBalance);
                  if (!merchantInfo.walletBalance || isNaN(num) || !isFinite(num) || num > 1e11 || num < -1e11) return "0.00";
                  return num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                })()}
              </p>
            </div>
            <div className="rcm-merchant-item" style={{ gridColumn: "1 / -1", background: "#f8fafc" }}>
              <p className="rcm-merchant-item-label">KYC Documents</p>
              <div style={{ display: "flex", gap: "10px", marginTop: "6px", flexWrap: "wrap" }}>
                {merchantInfo.kycDocuments?.gstCertificate ? (
                  <a href={`${import.meta.env.VITE_API_URL || ""}${merchantInfo.kycDocuments.gstCertificate}`} target="_blank" rel="noopener noreferrer" style={{ padding: "6px 12px", background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: "6px", fontSize: "12px", fontWeight: "600", textDecoration: "none" }}>📄 View GST Certificate</a>
                ) : <span style={{ fontSize: "12px", color: "#94a3b8" }}>No GST Document</span>}
                {merchantInfo.kycDocuments?.panCard ? (
                  <a href={`${import.meta.env.VITE_API_URL || ""}${merchantInfo.kycDocuments.panCard}`} target="_blank" rel="noopener noreferrer" style={{ padding: "6px 12px", background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", borderRadius: "6px", fontSize: "12px", fontWeight: "600", textDecoration: "none" }}>🪪 View PAN Card Document</a>
                ) : <span style={{ fontSize: "12px", color: "#94a3b8" }}>No PAN Document</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="rcm-stats-grid">
          {[
            { label: "Total Couriers",   value: couriers.length,                  icon: FaTruck,        iconBg: "#fff7ed", iconColor: "#ea580c" },
            { label: "Configured Cards", value: configuredCount,                  icon: FaCheckCircle,  iconBg: "#f0fdf4", iconColor: "#16a34a" },
            { label: "Total Orders",     value: merchantInfo.totalOrders || 0,    icon: FaBoxes,        iconBg: "#eff6ff", iconColor: "#2563eb" },
            { label: "Total Shipments",  value: merchantInfo.totalShipments || 0, icon: FaPlane,        iconBg: "#faf5ff", iconColor: "#9333ea" },
          ].map(({ label, value, icon: Icon, iconBg, iconColor }) => (
            <div key={label} className="rcm-stat-card">
              <div className="rcm-stat-icon-wrapper" style={{ background: iconBg, color: iconColor }}>
                <Icon size={22} />
              </div>
              <div className="rcm-stat-info">
                <p className="rcm-stat-label">{label}</p>
                <p className="rcm-stat-value">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Main Section */}
        {!selectedCourier ? (
          <>
            {/* Filter & Search Toolbar */}
            <div className="rcm-filter-toolbar">
              <div className="rcm-search-box">
                <FaSearch className="rcm-search-icon" />
                <input
                  type="text"
                  placeholder="Search courier partner..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="rcm-search-input"
                />
              </div>

              <div className="rcm-filter-pills">
                {[
                  { id: "all", label: "All Couriers" },
                  { id: "full", label: "Fully Configured" },
                  { id: "partial", label: "Partially Configured" },
                  { id: "none", label: "Not Configured" },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setStatusFilter(id)}
                    className={`rcm-filter-btn ${statusFilter === id ? "active" : ""}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Courier Grid */}
            {filteredCouriers.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", background: "#ffffff", borderRadius: "20px", border: "1px solid #e2e8f0" }}>
                <FaTruck size={44} color="#cbd5e1" style={{ marginBottom: "14px" }} />
                <p style={{ fontSize: "18px", fontWeight: "800", color: "#0f172a", margin: "0 0 6px" }}>No Couriers Found</p>
                <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>Try resetting search filters or checking courier status.</p>
              </div>
            ) : (
              <div className="rcm-couriers-grid">
                {filteredCouriers.map((courier) => (
                  <CourierCard
                    key={courier._id}
                    courier={courier}
                    surfaceCard={getRateCard(courier._id, "Surface")}
                    airCard={getRateCard(courier._id, "Air")}
                    onSelect={handleSelectCourier}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {loading.rates ? (
              <div style={{ textAlign: "center", padding: "60px" }}>
                <FaSpinner size={36} color="#ea580c" className="rcm-spinner" />
                <p style={{ color: "#64748b", marginTop: "14px", fontSize: "14px", fontWeight: "700" }}>
                  Loading {activeFormTab} rates for {selectedCourier.name}…
                </p>
              </div>
            ) : (
              <RateForm
                formData={formData}
                onChange={handleChange}
                onSave={handleSave}
                onReset={handleReset}
                onBack={handleBack}
                saving={loading.saving}
                activeTab={activeFormTab}
                onTabChange={handleTabChange}
                courierName={selectedCourier.name}
              />
            )}
          </>
        )}
      </div>

      <ToastContainer position="top-right" autoClose={3500} hideProgressBar={false} newestOnTop />
    </SuperAdminLayout>
  );
};

export default RateCardManagement;