import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import api from "../../services/api";
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaTruck, FaShieldAlt, FaHeadset } from "react-icons/fa";
import "./Auth.css";
import logoImage from "../../assets/logos/myParcelPoint.jpg"

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    const { email, password } = formData;

    try {
      setLoading(true);

      const response = await api.post("/auth/login", {
        email,
        password,
      });

      const { token, user } = response.data;

      sessionStorage.removeItem("merchant_profile_is_completed");
      localStorage.setItem("token", token);
      localStorage.setItem("role", user.role);
      localStorage.setItem("user", JSON.stringify(user));

      if (user.role === "SUPER_ADMIN") {
        navigate("/superadmin/dashboard");
      } else if (user.role === "ADMIN") {
        navigate("/admin/dashboard");
      } else if (user.role === "MERCHANT") {
        navigate("/merchant/dashboard");
      } else if (user.role === "STAFF") {
        navigate("/staff/dashboard");
      } else if (user.role === "COURIER") {
        navigate("/courier/dashboard");
      } else if (user.role === "WAREHOUSE") {
        navigate("/warehouse/dashboard");
      } else {
        navigate("/");
      }
    } catch (error) {
      alert(error?.response?.data?.message || "Login Failed");
    } finally {
      setLoading(false);
    }
  };

  // Styles
  const styles = {
    container: {
      display: "flex",
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
    },
    leftSection: {
      flex: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px",
      background:
        "linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 27, 75, 0.95))",
      position: "relative",
    },
    brandContent: {
      maxWidth: "500px",
      zIndex: 1,
    },
    brandLogo: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      marginBottom: "20px",
    },
    logoIcon: {
      height: "40px",
      width: "auto",
      objectFit: "contain",
      borderRadius: "6px",
    },
    brandTitle: {
      fontSize: "42px",
      fontWeight: "800",
      color: "white",
      margin: 0,
    },
    brandSpan: {
      color: "#f97316",
    },
    brandTagline: {
      fontSize: "18px",
      color: "#94a3b8",
      marginBottom: "40px",
    },
    features: {
      display: "flex",
      flexDirection: "column",
      gap: "24px",
      marginBottom: "50px",
    },
    feature: {
      display: "flex",
      alignItems: "center",
      gap: "16px",
    },
    featureIcon: {
      fontSize: "28px",
      color: "#f97316",
      background: "rgba(249, 115, 22, 0.1)",
      padding: "12px",
      borderRadius: "12px",
    },
    featureTitle: {
      fontSize: "16px",
      fontWeight: "600",
      color: "white",
      margin: "0 0 4px 0",
    },
    featureDesc: {
      fontSize: "13px",
      color: "#94a3b8",
      margin: 0,
    },
    stats: {
      display: "flex",
      gap: "40px",
      paddingTop: "30px",
      borderTop: "1px solid rgba(255, 255, 255, 0.1)",
    },
    statValue: {
      fontSize: "28px",
      fontWeight: "800",
      color: "#f97316",
      margin: "0 0 4px 0",
    },
    statLabel: {
      fontSize: "12px",
      color: "#94a3b8",
      margin: 0,
    },
    rightSection: {
      flex: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "white",
      padding: "40px",
    },
    formWrapper: {
      maxWidth: "450px",
      width: "100%",
    },
    formHeader: {
      textAlign: "center",
      marginBottom: "40px",
    },
    formTitle: {
      fontSize: "32px",
      fontWeight: "700",
      color: "#0f172a",
      margin: "0 0 8px 0",
    },
    formSubtitle: {
      fontSize: "14px",
      color: "#64748b",
      margin: 0,
    },
    form: {
      display: "flex",
      flexDirection: "column",
      gap: "20px",
    },
    inputGroup: {
      position: "relative",
      display: "flex",
      alignItems: "center",
    },
    inputIcon: {
      position: "absolute",
      left: "16px",
      color: "#94a3b8",
      fontSize: "16px",
    },
    input: {
      width: "100%",
      padding: "14px 16px 14px 48px",
      border: "1px solid #e2e8f0",
      borderRadius: "12px",
      fontSize: "15px",
      transition: "all 0.3s ease",
      background: "#f8fafc",
      outline: "none",
    },
    passwordToggle: {
      position: "absolute",
      right: "16px",
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "#94a3b8",
      fontSize: "16px",
    },
    formOptions: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      margin: "5px 0",
    },
    checkbox: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      cursor: "pointer",
      fontSize: "13px",
      color: "#64748b",
    },
    forgotLink: {
      fontSize: "13px",
      color: "#f97316",
      textDecoration: "none",
      fontWeight: "500",
    },
    submitBtn: {
      padding: "14px",
      background: "linear-gradient(135deg, #f97316, #ea580c)",
      border: "none",
      borderRadius: "12px",
      color: "white",
      fontSize: "16px",
      fontWeight: "600",
      cursor: "pointer",
      transition: "all 0.3s ease",
      marginTop: "10px",
    },
    formFooter: {
      textAlign: "center",
      marginTop: "25px",
    },
    footerText: {
      fontSize: "14px",
      color: "#64748b",
    },
    footerLink: {
      color: "#f97316",
      textDecoration: "none",
      fontWeight: "600",
    },
    spinner: {
      display: "inline-block",
      width: "20px",
      height: "20px",
      border: "2px solid white",
      borderTopColor: "transparent",
      borderRadius: "50%",
      animation: "spin 0.6s linear infinite",
    },
  };

  return (
    <div className="auth-container" style={styles.container}>
      {/* Left Side - Brand Section */}
      <div className="auth-left-section" style={styles.leftSection}>
        <div style={styles.brandContent}>
          <div style={styles.brandLogo}>
            <img src={logoImage} alt="Brand logo"  style={styles.logoIcon}/>
            <h1 style={styles.brandTitle}>MyParcel<span style={styles.brandSpan}>Point</span></h1>
          </div>
          <p style={styles.brandTagline}>India's Most Trusted Logistics Platform</p>

          <div style={styles.features}>
            <div style={styles.feature}>
              <FaTruck style={styles.featureIcon} />
              <div>
                <h4 style={styles.featureTitle}>Real-time Tracking</h4>
                <p style={styles.featureDesc}>Track your shipments instantly</p>
              </div>
            </div>
            <div style={styles.feature}>
              <FaShieldAlt style={styles.featureIcon} />
              <div>
                <h4 style={styles.featureTitle}>Secure Delivery</h4>
                <p style={styles.featureDesc}>100% insured shipments</p>
              </div>
            </div>
            <div style={styles.feature}>
              <FaHeadset style={styles.featureIcon} />
              <div>
                <h4 style={styles.featureTitle}>24/7 Support</h4>
                <p style={styles.featureDesc}>Dedicated customer care</p>
              </div>
            </div>
          </div>

          <div style={styles.stats}>
            <div>
              <h3 style={styles.statValue}>1M+</h3>
              <p style={styles.statLabel}>Happy Customers</p>
            </div>
            <div>
              <h3 style={styles.statValue}>50K+</h3>
              <p style={styles.statLabel}>Daily Shipments</p>
            </div>
            <div>
              <h3 style={styles.statValue}>99.9%</h3>
              <p style={styles.statLabel}>On-time Delivery</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="auth-right-section" style={styles.rightSection}>
        <div className="auth-form-wrapper" style={styles.formWrapper}>
          <div style={styles.formHeader}>
            <h2 style={styles.formTitle}>Welcome Back!</h2>
            <p style={styles.formSubtitle}>Login to access your dashboard</p>
          </div>

          <form onSubmit={handleLogin} style={styles.form}>
            <div style={styles.inputGroup}>
              <FaEnvelope style={styles.inputIcon} />
              <input
                type="text"
                name="email"
                placeholder="Email Address or Mobile Number"
                value={formData.email}
                onChange={handleChange}
                className="auth-input"
                style={styles.input}
                required
                autoComplete="username"
              />
            </div>

            <div style={styles.inputGroup}>
              <FaLock style={styles.inputIcon} />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                className="auth-input"
                style={styles.input}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                style={styles.passwordToggle}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            <div style={styles.formOptions}>
              <label style={styles.checkbox}>
                <input type="checkbox" style={{ accentColor: "#f97316" }} />
                <span>Remember me</span>
              </label>
              <Link to="/forgot-password" style={styles.forgotLink}>
                Forgot Password?
              </Link>
            </div>

            <button type="submit" style={styles.submitBtn} disabled={loading}>
              {loading ? <span style={styles.spinner}></span> : "Login"}
            </button>
          </form>

          <div style={styles.formFooter}>
            <p style={styles.footerText}>
              Don't have an account? <Link to="/register" style={styles.footerLink}>Register</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;