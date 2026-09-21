import { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import api from "../../services/api";
import { FaWallet, FaPlus } from "react-icons/fa";
import "./Wallet.css";

const Wallet = () => {
  const [wallet, setWallet] = useState({
    balance: 0,
    transactions: [],
  });

  const [amount, setAmount] = useState("");
  const [isRecharging, setIsRecharging] = useState(false);

  const [summary, setSummary] = useState({
    totalCredit: 0,
    totalDebit: 0,
    totalTransactions: 0,
  });

  useEffect(() => {
    fetchWallet();
    fetchSummary();
  }, []);

  const fetchWallet = async () => {
    try {
      const res = await api.get("/wallet");
      setWallet(res.data.wallet);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await api.get("/wallet/summary");

      setSummary({
        totalCredit: res.data.totalCredit || 0,
        totalDebit: res.data.totalDebit || 0,
        totalTransactions: res.data.totalTransactions || 0,
      });
    } catch (error) {
      console.log(error);
    }
  };

  // Razorpay script dynamically load karo
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (document.getElementById("razorpay-script")) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.id = "razorpay-script";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const rechargeWallet = async () => {
    if (!amount || Number(amount) <= 0) {
      alert("Valid amount enter karein");
      return;
    }

    if (isRecharging) return;
    setIsRecharging(true);

    // 1. Razorpay script load karo
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      alert("Razorpay load nahi hua. Internet check karein.");
      setIsRecharging(false);
      return;
    }

    try {
      // 2. Backend se Razorpay order create karo
      const { data } = await api.post("/wallet/create-order", {
        amount: Number(amount),
      });

      if (!data.success) {
        alert(data.message || "Order create karne mein problem hui.");
        setIsRecharging(false);
        return;
      }

      // User details for prefill & notes
      let userObj = {};
      try {
        userObj = JSON.parse(localStorage.getItem("user") || "{}");
      } catch { /* keep default empty user */ }

      // 3. Razorpay Checkout popup open karo
      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "My Parcel Point",
        description: "Wallet Recharge",
        order_id: data.orderId,
        handler: async (response) => {
          // 4. Payment success hone par backend se verify karo
          try {
            const verifyRes = await api.post("/wallet/verify-payment", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              amount: data.amount,
            });

            if (verifyRes.data.success) {
              alert("✅ Wallet Successfully Recharged!");
              setAmount("");
              fetchWallet();
              fetchSummary();
            } else {
              alert(verifyRes.data.message || "Payment verify nahi hua.");
            }
          } catch (err) {
            alert(
              err?.response?.data?.message || "Verification failed"
            );
          } finally {
            setIsRecharging(false);
          }
        },
        prefill: {
          name: userObj.name || "",
          email: userObj.email || "",
          contact: userObj.phone || "",
        },
        notes: {
          merchantId: userObj.id || userObj._id || "",
        },
        theme: {
          color: "#ea580c",
        },
        modal: {
          ondismiss: () => {
            console.log("Razorpay popup closed");
            setIsRecharging(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      alert(
        error?.response?.data?.message || "Recharge Failed"
      );
      setIsRecharging(false);
    }
  };

  return (
    <div className="wallet-container">
      <div className="wallet-sidebar-wrapper">
        <Sidebar />
      </div>

      <main className="wallet-main">
        <h1 className="wallet-title">My Wallet</h1>
        <p className="wallet-subtitle">
          Manage your wallet and transactions
        </p>

        {/* Balance */}
        <div className="wallet-balance-card">
          <div>
            <p className="wallet-balance-label">
              Available Balance
            </p>

            <h2 className="wallet-balance-amount">
              ₹{Number(wallet.balance || 0).toFixed(2)}
            </h2>
          </div>

          <FaWallet className="wallet-balance-icon" />
        </div>

        {/* Summary Cards */}
        <div className="wallet-summary-grid">
          <div className="wallet-summary-card">
            <h4 className="wallet-summary-label">
              Total Credit
            </h4>

            <h2 className="wallet-summary-value-green">
              ₹{Number(summary.totalCredit || 0).toFixed(2)}
            </h2>
          </div>

          <div className="wallet-summary-card">
            <h4 className="wallet-summary-label">
              Total Debit
            </h4>

            <h2 className="wallet-summary-value-red">
              ₹{Number(summary.totalDebit || 0).toFixed(2)}
            </h2>
          </div>

          <div className="wallet-summary-card">
            <h4 className="wallet-summary-label">
              Transactions
            </h4>

            <h2 className="wallet-summary-value-dark">
              {summary.totalTransactions}
            </h2>
          </div>
        </div>

        {/* Recharge */}
        <div className="wallet-card">
          <div className="wallet-card-header">
            <h3 className="wallet-card-title">Recharge Wallet</h3>
          </div>
          <div className="wallet-input-wrapper">
            <input
              type="number"
              placeholder="Enter Amount (₹)"
              value={amount}
              onChange={(e) =>
                setAmount(e.target.value)
              }
              className="wallet-input"
            />

            <button
              onClick={rechargeWallet}
              disabled={isRecharging}
              className={`wallet-btn ${isRecharging ? 'wallet-btn-disabled' : ''}`}
            >
              {isRecharging ? (
                <>⏳ Processing...</>
              ) : (
                <>
                  <FaPlus />
                  Recharge Now
                </>
              )}
            </button>
          </div>
        </div>

        {/* Transactions */}
        <div className="wallet-card">
          <div className="wallet-card-header">
            <h3 className="wallet-card-title">Recent Transactions</h3>
          </div>

          <div className="wallet-table-wrapper">
            <table className="wallet-table">
              <thead>
                <tr className="wallet-table-head">
                  <th className="wallet-th">Date</th>
                  <th className="wallet-th">Type</th>
                  <th className="wallet-th">Amount</th>
                  <th className="wallet-th">Description</th>
                </tr>
              </thead>

              <tbody>
                {wallet.transactions?.length > 0 ? (
                  [...wallet.transactions]
                    .sort(
                      (a, b) =>
                        new Date(b.createdAt) -
                        new Date(a.createdAt)
                    )
                    .map((t, index) => (
                      <tr key={index}>
                        <td className="wallet-td">
                          {new Date(
                            t.createdAt
                          ).toLocaleDateString('en-GB')}
                        </td>

                        <td className="wallet-td">
                          <span className={`wallet-type-badge ${t.type === 'CREDIT' ? 'wallet-type-credit' : 'wallet-type-debit'}`}>
                            {t.type}
                          </span>
                        </td>

                        <td className="wallet-td">
                          <span className="wallet-amount">
                            ₹{Number(t.amount || 0).toFixed(2)}
                          </span>
                        </td>

                        <td className="wallet-td">
                          <span className="wallet-description">
                            {t.description}
                          </span>
                        </td>
                      </tr>
                    ))
                ) : (
                  <tr>
                    <td
                      colSpan="4"
                      className="wallet-empty"
                    >
                      No Transactions Found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Wallet;