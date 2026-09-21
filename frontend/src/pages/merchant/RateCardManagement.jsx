import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import SuperAdminLayout from "./SuperAdminLayout";
import api from "../../services/api"; //

const RateCardManagement = () => {
  const { merchantId } = useParams();

  // all 5 couriers
  const [rates, setRates] = useState({
    delhivery: {
      rate500gm: "",
      rate1kg: "",
      rate2kg: "",
      additionalKg: "",
      codCharge: "",
    },
    xpressbees: {
      rate500gm: "",
      rate1kg: "",
      rate2kg: "",
      additionalKg: "",
      codCharge: "",
    },
    dtdc: {
      rate500gm: "",
      rate1kg: "",
      rate2kg: "",
      additionalKg: "",
      codCharge: "",
    },
    ecom: {
      rate500gm: "",
      rate1kg: "",
      rate2kg: "",
      additionalKg: "",
      codCharge: "",
    },
    shadowfax: {
      rate500gm: "",
      rate1kg: "",
      rate2kg: "",
      additionalKg: "",
      codCharge: "",
    },
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch existing rate cards on load
  useEffect(() => {
    if (merchantId) {
      fetchRateCards();
    }
  }, [merchantId]);

  //  Fetch existing rate cards
  const fetchRateCards = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/ratecard/merchant/${merchantId}`);
      
      if (res.data.success && res.data.rateCards) {
        const existingRates = { ...rates };
        
        res.data.rateCards.forEach((card) => {
          const courier = card.courierPartner;
          if (existingRates[courier]) {
            existingRates[courier] = {
              rate500gm: card.forwardRates?.rate500gm || "",
              rate1kg: card.forwardRates?.rate1kg || "",
              rate2kg: card.forwardRates?.rate2kg || "",
              additionalKg: card.forwardRates?.additionalKg || "",
              codCharge: card.codCharge || "",
            };
          }
        });
        
        setRates(existingRates);
      }
    } catch (error) {
      console.log("Error fetching rate cards:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (courier, field, value) => {
    setRates({
      ...rates,
      [courier]: {
        ...rates[courier],
        [field]: value,
      },
    });
  };

  //  UPDATED: Save rates with API call
  const saveRates = async () => {
    try {
      setSaving(true);
      
      // Loop through each courier and save
      for (const courier of Object.keys(rates)) {
        const payload = {
          merchantId,
          courierPartner: courier,
          forwardRates: {
            rate500gm: Number(rates[courier].rate500gm || 0),
            rate1kg: Number(rates[courier].rate1kg || 0),
            rate2kg: Number(rates[courier].rate2kg || 0),
            additionalKg: Number(rates[courier].additionalKg || 0),
          },
          codCharge: Number(rates[courier].codCharge || 0),
          fuelCharge: 5,
          isActive: true,
        };

        await api.post("/ratecard/save", payload);
      }

      alert("Rate Cards Saved Successfully!");
      
      // Refresh to show updated data
      await fetchRateCards();
      
    } catch (error) {
      console.log("Save error:", error);
      alert("❌ Save Failed: " + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  // Check if any rate has been filled
  const hasRates = Object.values(rates).some(
    (courier) => 
      courier.rate500gm || 
      courier.rate1kg || 
      courier.rate2kg || 
      courier.additionalKg || 
      courier.codCharge
  );

  const styles = {
    container: {
      maxWidth: "1200px",
      margin: "0 auto",
      padding: "24px",
      fontFamily: "'Inter', -apple-system, sans-serif"
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "8px"
    },
    title: {
      fontSize: "28px",
      fontWeight: "700",
      margin: "0",
      color: "#0f172a"
    },
    subtitle: {
      color: "#64748b",
      margin: "4px 0 20px 0"
    },
    merchantId: {
      background: "#f1f5f9",
      padding: "4px 12px",
      borderRadius: "6px",
      fontSize: "13px",
      color: "#475569"
    },
    card: {
      background: "#fff",
      border: "1px solid #e2e8f0",
      borderRadius: "12px",
      padding: "20px",
      marginTop: "16px",
      transition: "all 0.2s ease"
    },
    cardHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "16px"
    },
    courierName: {
      textTransform: "capitalize",
      fontSize: "18px",
      fontWeight: "600",
      color: "#0f172a",
      margin: "0"
    },
    statusBadge: {
      fontSize: "12px",
      padding: "2px 12px",
      borderRadius: "20px",
      background: "#dcfce7",
      color: "#15803d"
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(5, 1fr)",
      gap: "12px"
    },
    input: {
      padding: "10px 14px",
      borderRadius: "8px",
      border: "1.5px solid #e2e8f0",
      fontSize: "14px",
      outline: "none",
      transition: "all 0.2s ease",
      width: "100%",
      boxSizing: "border-box"
    },
    buttonContainer: {
      display: "flex",
      gap: "12px",
      marginTop: "24px"
    },
    saveButton: {
      padding: "12px 32px",
      background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
      color: "#fff",
      border: "none",
      borderRadius: "10px",
      cursor: "pointer",
      fontWeight: "600",
      fontSize: "15px",
      transition: "all 0.2s ease"
    },
    saveButtonDisabled: {
      padding: "12px 32px",
      background: "#94a3b8",
      color: "#fff",
      border: "none",
      borderRadius: "10px",
      cursor: "not-allowed",
      fontWeight: "600",
      fontSize: "15px",
      opacity: 0.7
    },
    resetButton: {
      padding: "12px 24px",
      background: "transparent",
      color: "#64748b",
      border: "1.5px solid #e2e8f0",
      borderRadius: "10px",
      cursor: "pointer",
      fontWeight: "500",
      fontSize: "14px",
      transition: "all 0.2s ease"
    },
    loadingText: {
      textAlign: "center",
      color: "#94a3b8",
      padding: "40px 0"
    }
  };

  if (loading) {
    return (
      <SuperAdminLayout>
        <div style={styles.container}>
          <div style={styles.loadingText}>⏳ Loading rate cards...</div>
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Rate Card Management</h1>
          <span style={styles.merchantId}>Merchant ID: {merchantId}</span>
        </div>

        <p style={styles.subtitle}>
          Configure courier rates for this merchant
        </p>

        {Object.keys(rates).map((courier) => {
          const hasValues = rates[courier].rate500gm || 
                           rates[courier].rate1kg || 
                           rates[courier].rate2kg || 
                           rates[courier].additionalKg || 
                           rates[courier].codCharge;
          
          return (
            <div key={courier} style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.courierName}>
                  {courier.charAt(0).toUpperCase() + courier.slice(1)}
                </h3>
                {hasValues && (
                  <span style={styles.statusBadge}>Configured</span>
                )}
              </div>

              <div style={styles.grid}>
                <input
                  style={styles.input}
                  placeholder="500gm (₹)"
                  value={rates[courier].rate500gm}
                  onChange={(e) =>
                    handleChange(courier, "rate500gm", e.target.value)
                  }
                  type="number"
                  min="0"
                  step="0.5"
                />

                <input
                  style={styles.input}
                  placeholder="1kg (₹)"
                  value={rates[courier].rate1kg}
                  onChange={(e) =>
                    handleChange(courier, "rate1kg", e.target.value)
                  }
                  type="number"
                  min="0"
                  step="0.5"
                />

                <input
                  style={styles.input}
                  placeholder="2kg (₹)"
                  value={rates[courier].rate2kg}
                  onChange={(e) =>
                    handleChange(courier, "rate2kg", e.target.value)
                  }
                  type="number"
                  min="0"
                  step="0.5"
                />

                <input
                  style={styles.input}
                  placeholder="Additional (₹/kg)"
                  value={rates[courier].additionalKg}
                  onChange={(e) =>
                    handleChange(courier, "additionalKg", e.target.value)
                  }
                  type="number"
                  min="0"
                  step="0.5"
                />

                <input
                  style={styles.input}
                  placeholder="COD Charge (₹)"
                  value={rates[courier].codCharge}
                  onChange={(e) =>
                    handleChange(courier, "codCharge", e.target.value)
                  }
                  type="number"
                  min="0"
                  step="0.5"
                />
              </div>
            </div>
          );
        })}

        <div style={styles.buttonContainer}>
          <button
            onClick={saveRates}
            disabled={saving || !hasRates}
            style={saving || !hasRates ? styles.saveButtonDisabled : styles.saveButton}
          >
            {saving ? "⏳ Saving..." : "💾 Save All Rate Cards"}
          </button>
          
          <button
            onClick={() => {
              if (window.confirm("Reset all rates? This cannot be undone.")) {
                setRates({
                  delhivery: {
                    rate500gm: "",
                    rate1kg: "",
                    rate2kg: "",
                    additionalKg: "",
                    codCharge: "",
                  },
                  xpressbees: {
                    rate500gm: "",
                    rate1kg: "",
                    rate2kg: "",
                    additionalKg: "",
                    codCharge: "",
                  },
                  dtdc: {
                    rate500gm: "",
                    rate1kg: "",
                    rate2kg: "",
                    additionalKg: "",
                    codCharge: "",
                  },
                  ecom: {
                    rate500gm: "",
                    rate1kg: "",
                    rate2kg: "",
                    additionalKg: "",
                    codCharge: "",
                  },
                  shadowfax: {
                    rate500gm: "",
                    rate1kg: "",
                    rate2kg: "",
                    additionalKg: "",
                    codCharge: "",
                  },
                });
              }
            }}
            style={styles.resetButton}
          >
            🔄 Reset All
          </button>
          
          <button
            onClick={fetchRateCards}
            style={{
              ...styles.resetButton,
              marginLeft: "auto"
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>
    </SuperAdminLayout>
  );
};

export default RateCardManagement;