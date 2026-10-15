import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import api from "../../services/api";
import {
  FaUser,
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaBuilding,
  FaMobile,
  FaCheckCircle,
  FaTruck,
  FaShieldAlt,
  FaHeadset,
  FaClock,
} from "react-icons/fa";
import "./Auth.css";
import logoImage from "../../assets/logos/myParcelPoint.jpg"

import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  RecaptchaVerifier,
  linkWithPhoneNumber,
  reload,
  signOut,
} from "firebase/auth";

import { auth } from "../../firebase";

// This app currently accepts Indian 10-digit mobile numbers.
const normalizePhoneNumber = (value) => {
  const input = String(value || "").trim();
  const digits = input.replace(/\D/g, "");

  if (input.startsWith("+")) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }

  return "";
};

// Extracted standalone password validator so it can be shared
const getPasswordError = (password, confirmPassword = null) => {
  if (!password) return "Password is required";
  if (password.length < 8) return "Password must be at least 8 characters long";
  if (!/[A-Z]/.test(password))
    return "Password must contain at least one uppercase letter";
  if (!/[a-z]/.test(password))
    return "Password must contain at least one lowercase letter";
  if (!/[0-9]/.test(password))
    return "Password must contain at least one number";
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password))
    return "Password must contain at least one special character";
  if (confirmPassword !== null && password !== confirmPassword)
    return "Passwords do not match";
  return null;
};

const Register = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [firebaseAccountReady, setFirebaseAccountReady] = useState(false);
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneMessage, setPhoneMessage] = useState("");
  const [recaptchaSolved, setRecaptchaSolved] = useState(false);
  const [captchaVersion, setCaptchaVersion] = useState(0);

  const recaptchaVerifierRef = useRef(null);
  const confirmationResultRef = useRef(null);
  const recaptchaContainerRef = useRef(null);

  const [formData, setFormData] = useState({
    companyName: "",
    ownerName: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});

  // Create a fresh reCAPTCHA verifier when the page loads
  // and whenever a new OTP attempt needs a fresh challenge.
  useEffect(() => {
    const container = recaptchaContainerRef.current;

    if (!container) return;

    let verifier;

    // Firebase requires an empty container before initialization.
    container.replaceChildren();

    try {
      verifier = new RecaptchaVerifier(auth, container, {
        size: "normal",

        callback: () => {
          setRecaptchaSolved(true);
        },

        "expired-callback": () => {
          setRecaptchaSolved(false);
        },
      });

      recaptchaVerifierRef.current = verifier;

      verifier.render().catch((error) => {
        console.error("reCAPTCHA setup error:", error);

        setPhoneMessage(
          `Could not initialize the security check: ${
            error.code || error.message
          }`,
        );
      });
    } catch (error) {
      console.error("reCAPTCHA setup error:", error);

      setPhoneMessage(
        `Could not initialize the security check: ${
          error.code || error.message
        }`,
      );
    }

    return () => {
      if (verifier) {
        verifier.clear();
      }

      // Clear leftover iframe or widget nodes before another setup.
      container.replaceChildren();

      if (recaptchaVerifierRef.current === verifier) {
        recaptchaVerifierRef.current = null;
      }
    };
  }, [captchaVersion]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((previous) => ({
        ...previous,
        [name]: "",
      }));
    }

    if (name === "mobile" && !phoneOtpSent && !phoneVerified) {
      setPhoneMessage("");
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.companyName.trim()) {
      newErrors.companyName = "Company name is required";
    }

    if (!formData.ownerName.trim()) {
      newErrors.ownerName = "Owner name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }

    if (!formData.mobile) {
      newErrors.mobile = "Mobile number is required";
    } else if (!/^\d{10}$/.test(formData.mobile)) {
      newErrors.mobile = "Mobile must be 10 digits";
    } else if (!phoneVerified) {
      newErrors.mobile = "Please verify your mobile number using OTP";
    }

    // Use extracted password validator logic
    const pwdError = getPasswordError(formData.password);
    if (pwdError) {
      newErrors.password = pwdError;
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // SEND PHONE OTP
  const sendPhoneOtp = async () => {
    // 1. Reset all previous banner or validation errors immediately
    setPhoneMessage("");
    setErrors({});

    const email = formData.email.trim().toLowerCase();
    const mobile = formData.mobile.trim();
    const phoneE164 = normalizePhoneNumber(mobile);

    // 2. Validate Password FIRST
    const pwdError = getPasswordError(formData.password);
    if (pwdError) {
      setErrors({ password: pwdError });
      return;
    }

    // 3. Validate Email
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setErrors({ email: "Enter a valid email before requesting OTP" });
      return;
    }

    // 4. Validate Phone Number format
    if (!/^\d{10}$/.test(mobile) || !phoneE164) {
      setErrors({ mobile: "Enter a valid 10-digit mobile number" });
      return;
    }

    const testingPhoneAuth =
      import.meta.env.DEV && auth.settings.appVerificationDisabledForTesting;

    if (
      !recaptchaVerifierRef.current ||
      (!testingPhoneAuth && !recaptchaSolved)
    ) {
      setPhoneMessage(
        testingPhoneAuth
          ? "The test verifier is not ready. Refresh the page and try again."
          : "Complete the reCAPTCHA before requesting an OTP.",
      );
      return;
    }

    if (!recaptchaSolved) {
      setPhoneMessage("Complete the reCAPTCHA before requesting an OTP.");
      return;
    }

    setPhoneLoading(true);

    try {
      let firebaseUser = auth.currentUser;

      // Phone authentication must be linked to the same account
      // that will be used for email verification and registration.
      if (firebaseUser && firebaseUser.email?.toLowerCase() !== email) {
        await signOut(auth);

        // Clear the previous account's verification state.
        confirmationResultRef.current = null;

        setFirebaseAccountReady(false);
        setPhoneOtpSent(false);
        setPhoneVerified(false);
        setPhoneOtp("");
        setRecaptchaSolved(false);

        setPhoneMessage(
          "Previous account signed out. Click Send OTP again to continue.",
        );

        // Reinitialize reCAPTCHA for the next attempt.
        setCaptchaVersion((previous) => previous + 1);

        return;
      }

      // Create the Firebase email/password account the first time
      // the user requests phone verification.
      if (!firebaseUser) {
        const credential = await createUserWithEmailAndPassword(
          auth,
          email,
          formData.password,
        );

        firebaseUser = credential.user;
      }

      setFirebaseAccountReady(true);

      // If this account already has this exact verified number,
      // don't send another OTP.
      if (firebaseUser.phoneNumber) {
        await reload(firebaseUser);

        if (normalizePhoneNumber(firebaseUser.phoneNumber) === phoneE164) {
          setPhoneVerified(true);
          setPhoneOtpSent(false);
          setPhoneMessage("Mobile number is already verified.");
          return;
        }

        throw new Error(
          "This Firebase account already has a different phone number linked. Use the matching number or a new test account.",
        );
      }

      // Attach the phone to the existing Firebase user.
      const confirmationResult = await linkWithPhoneNumber(
        firebaseUser,
        phoneE164,
        recaptchaVerifierRef.current,
      );

      confirmationResultRef.current = confirmationResult;

      setPhoneOtpSent(true);
      setPhoneOtp("");
      setPhoneMessage(
        `Verification code requested for ${phoneE164}. Enter the six-digit code below.`,
      );
    } catch (error) {
      console.error("Phone OTP request failed:", error.code || error.message);

      let message =
        error.message || "Could not request an OTP. Please try again.";

      if (error.code === "auth/email-already-in-use") {
        message =
          "This email already has a Firebase account. Sign in to that account or use a new test email.";
      } else if (error.code === "auth/invalid-phone-number") {
        message = "The mobile number format is invalid.";
      } else if (error.code === "auth/credential-already-in-use") {
        message =
          "This phone number is linked to another Firebase account. Use another number.";
      } else if (error.code === "auth/provider-already-linked") {
        message =
          "A phone number is already linked to this Firebase account. Use that number or a new test account.";
      } else if (
        error.code === "auth/too-many-requests" ||
        error.code === "auth/quota-exceeded"
      ) {
        message =
          "Firebase has limited verification attempts. Please try again later.";
      } else if (
        error.code === "auth/billing-not-enabled" ||
        error.code === "auth/operation-not-allowed"
      ) {
        message =
          "Phone verification is unavailable for this request. Check Firebase Phone authentication and use a configured test number.";
      } else if (
        error.code === "auth/captcha-check-failed" ||
        error.code === "auth/missing-app-credential" ||
        error.code === "auth/invalid-app-credential"
      ) {
        message =
          "The security check failed. Complete reCAPTCHA again and retry.";
      }

      setPhoneMessage(message);
      setPhoneOtpSent(false);
      setPhoneOtp("");
      confirmationResultRef.current = null;

      // reCAPTCHA tokens are short-lived and must be refreshed
      // after a failed attempt.
      setRecaptchaSolved(false);
      setCaptchaVersion((previous) => previous + 1);
    } finally {
      setPhoneLoading(false);
    }
  };

  // VERIFY OTP ON THE SIGNUP PAGE
  const verifyPhoneOtp = async () => {
    if (!confirmationResultRef.current) {
      setPhoneMessage("Please request an OTP first.");
      return;
    }

    if (!/^\d{6}$/.test(phoneOtp.trim())) {
      setPhoneMessage("Enter the six-digit verification code.");
      return;
    }

    setOtpLoading(true);
    setPhoneMessage("");

    try {
      // Firebase validates the code and links the verified phone.
      const result = await confirmationResultRef.current.confirm(
        phoneOtp.trim(),
      );

      const firebaseUser = result.user;

      await reload(firebaseUser);

      const expectedPhone = normalizePhoneNumber(formData.mobile);
      const actualPhone = normalizePhoneNumber(firebaseUser.phoneNumber);

      if (!actualPhone || actualPhone !== expectedPhone) {
        throw new Error(
          "The verified number does not match the mobile number entered in the form.",
        );
      }

      // Refresh the Firebase token so the backend receives the
      // latest signed phone_number claim.
      await firebaseUser.getIdToken(true);

      confirmationResultRef.current = null;
      setPhoneVerified(true);
      setPhoneOtpSent(false);
      setPhoneOtp("");
      setPhoneMessage(
        "Mobile number verified successfully. You can now register.",
      );
    } catch (error) {
      console.error("OTP verification failed:", error.code || error.message);

      let message = "OTP verification failed. Check the code and try again.";

      if (
        error.code === "auth/invalid-verification-code" ||
        error.code === "auth/code-expired"
      ) {
        message = "The code is incorrect or expired. Please try again.";
      } else if (error.message) {
        message = error.message;
      }

      setPhoneMessage(message);
    } finally {
      setOtpLoading(false);
    }
  };

  const resetPhoneOtp = () => {
    confirmationResultRef.current = null;
    setPhoneOtpSent(false);
    setPhoneOtp("");
    setRecaptchaSolved(false);
    setPhoneMessage("Complete the security check again, then click Send OTP.");
    setCaptchaVersion((previous) => previous + 1);
  };

  // REGISTER AFTER PHONE VERIFICATION

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);

    const email = formData.email.trim().toLowerCase();

    try {
      const firebaseUser = auth.currentUser;

      if (!firebaseUser) {
        throw new Error(
          "Your Firebase session is missing. Please verify your phone again.",
        );
      }

      await reload(firebaseUser);

      if (firebaseUser.email?.toLowerCase() !== email) {
        throw new Error(
          "The Firebase account email does not match the email in the form.",
        );
      }

      const expectedPhone = normalizePhoneNumber(formData.mobile);
      const actualPhone = normalizePhoneNumber(firebaseUser.phoneNumber);

      if (!phoneVerified || !actualPhone || actualPhone !== expectedPhone) {
        throw new Error(
          "Please verify the registered mobile number using OTP before continuing.",
        );
      }

      const firebaseIdToken = await firebaseUser.getIdToken(true);

      const payload = {
        companyName: formData.companyName.trim(),
        name: formData.ownerName.trim(),
        phone: formData.mobile.trim(),
        email,
        password: formData.password,
        role: "MERCHANT",
        firebaseIdToken,
      };

      await api.post("/auth/register", payload);

      // Phone OTP has already been verified here.
      // Email verification remains a separate link.
      try {
        await sendEmailVerification(firebaseUser, {
          url: `${window.location.origin}/verify-email?uid=${encodeURIComponent(firebaseUser.uid)}`,
          handleCodeInApp: false,
        });
      } catch (emailError) {
        console.error(
          "Verification email could not be sent:",
          emailError.code || emailError.message,
        );

        navigate("/verify-email", {
          state: {
            email,
            firebaseUid: firebaseUser.uid,
            sendFailed: true,
          },
        });

        return;
      }

      navigate("/verify-email", {
        state: {
          email,
          firebaseUid: firebaseUser.uid,
        },
      });
    } catch (error) {
      console.error("Registration error:", error.code || error.message);

      let message =
        error?.response?.data?.message ||
        error.message ||
        "Registration failed. Please try again.";

      if (error.code === "auth/email-already-in-use") {
        message =
          "This email already has a Firebase account. Use the existing account or contact support if registration was interrupted.";
      } else if (error.code === "auth/weak-password") {
        message = "Please choose a stronger password.";
      } else if (error.code === "auth/invalid-email") {
        message = "Please enter a valid email address.";
      }

      alert(message);
    } finally {
      setLoading(false);
    }
  };

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
    },
    brandContent: { maxWidth: "500px" },
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
    brandSpan: { color: "#f97316" },
    brandTagline: { fontSize: "18px", color: "#94a3b8", marginBottom: "40px" },
    features: {
      display: "flex",
      flexDirection: "column",
      gap: "24px",
      marginBottom: "50px",
    },
    feature: { display: "flex", alignItems: "center", gap: "16px" },
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
    featureDesc: { fontSize: "13px", color: "#94a3b8", margin: 0 },
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
    statLabel: { fontSize: "12px", color: "#94a3b8", margin: 0 },
    rightSection: {
      flex: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "white",
      padding: "40px",
      overflowY: "auto",
    },
    formWrapper: { maxWidth: "550px", width: "100%" },
    formHeader: { textAlign: "center", marginBottom: "30px" },
    formTitle: {
      fontSize: "28px",
      fontWeight: "700",
      color: "#0f172a",
      margin: "0 0 8px 0",
    },
    formSubtitle: { fontSize: "14px", color: "#64748b", margin: 0 },
    form: { display: "flex", flexDirection: "column", gap: "16px" },
    inputGroup: { position: "relative", display: "flex", alignItems: "center" },
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
      fontSize: "14px",
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
    },
    otpGroup: { display: "flex", gap: "12px", alignItems: "center" },
    otpInput: { flex: 1 },
    otpBtn: {
      padding: "14px 20px",
      background: "#f1f5f9",
      color: "#1e293b",
      border: "1px solid #cbd5e1",
      borderRadius: "12px",
      cursor: "pointer",
      fontSize: "13px",
      fontWeight: "600",
      whiteSpace: "nowrap",
    },
    verifyBtn: {
      padding: "14px 20px",
      background: "#f97316",
      color: "white",
      border: "none",
      borderRadius: "12px",
      cursor: "pointer",
      fontSize: "13px",
      fontWeight: "500",
      whiteSpace: "nowrap",
    },
    verifiedBadge: { position: "absolute", right: "16px", color: "#10b981" },
    errorText: {
      fontSize: "11px",
      color: "#ef4444",
      marginTop: "4px",
      marginLeft: "12px",
    },
    buttonGroup: { display: "flex", gap: "12px", marginTop: "20px" },
    submitBtn: {
      flex: 1,
      padding: "14px",
      background: "linear-gradient(135deg, #f97316, #ea580c)",
      border: "none",
      borderRadius: "12px",
      color: "white",
      fontSize: "16px",
      fontWeight: "600",
      cursor: "pointer",
    },
    formFooter: { textAlign: "center", marginTop: "25px" },
    footerText: { fontSize: "14px", color: "#64748b" },
    footerLink: { color: "#f97316", textDecoration: "none", fontWeight: "600" },
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
      <div className="auth-left-section" style={styles.leftSection}>
        <div style={styles.brandContent}>
          <div style={styles.brandLogo}>
            <img src={logoImage} alt="Brand logo"  style={styles.logoIcon}/>
            <h1 style={styles.brandTitle}>
              MyParcel<span style={styles.brandSpan}>Point</span>
            </h1>
          </div>

          <p style={styles.brandTagline}>
            India's Most Trusted Logistics Platform
          </p>

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

      <div className="auth-right-section" style={styles.rightSection}>
        <div className="register-form-wrapper" style={styles.formWrapper}>
          <div style={styles.formHeader}>
            <h2 style={styles.formTitle}>Create Account</h2>
            <p style={styles.formSubtitle}>Register your company</p>
          </div>

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.inputGroup}>
              <FaBuilding style={styles.inputIcon} />
              <input
                type="text"
                name="companyName"
                placeholder="Company Name"
                value={formData.companyName}
                onChange={handleChange}
                className="auth-input"
                style={styles.input}
              />
            </div>
            {errors.companyName && (
              <span style={styles.errorText}>{errors.companyName}</span>
            )}

            <div style={styles.inputGroup}>
              <FaUser style={styles.inputIcon} />
              <input
                type="text"
                name="ownerName"
                placeholder="Owner Name"
                value={formData.ownerName}
                onChange={handleChange}
                className="auth-input"
                style={styles.input}
              />
            </div>
            {errors.ownerName && (
              <span style={styles.errorText}>{errors.ownerName}</span>
            )}

            <div style={styles.inputGroup}>
              <FaEnvelope style={styles.inputIcon} />
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={handleChange}
                className="auth-input"
                style={styles.input}
                disabled={firebaseAccountReady}
              />
            </div>
            {errors.email && (
              <span style={styles.errorText}>{errors.email}</span>
            )}

            <div className="otp-group-responsive" style={styles.otpGroup}>
              <div style={{ ...styles.inputGroup, ...styles.otpInput }}>
                <FaMobile style={styles.inputIcon} />
                <input
                  type="tel"
                  name="mobile"
                  placeholder="Mobile Number"
                  value={formData.mobile}
                  onChange={handleChange}
                  className="auth-input"
                  style={styles.input}
                  disabled={phoneOtpSent || phoneVerified}
                />
                {phoneVerified && (
                  <FaCheckCircle style={styles.verifiedBadge} />
                )}
              </div>

              <button
                type="button"
                style={styles.otpBtn}
                onClick={sendPhoneOtp}
                disabled={phoneLoading || phoneVerified || phoneOtpSent}
              >
                {phoneVerified
                  ? "Verified"
                  : phoneLoading
                    ? "Sending..."
                    : phoneOtpSent
                      ? "OTP Sent"
                      : "Send OTP"}
              </button>
            </div>

            {/* Condition updated to hide general mobile error if a phone specific API message is showing */}
            {errors.mobile && !phoneMessage && (
              <span style={styles.errorText}>{errors.mobile}</span>
            )}

            {/* Styled to replace the mobile error space appropriately so they don't stack */}
            {phoneMessage && (
              <span
                role="status"
                aria-live="polite"
                style={{
                  ...styles.errorText,
                  display: "block",
                  color: phoneVerified ? "#059669" : "#ef4444",
                  marginLeft: "12px",
                  marginTop: "6px",
                }}
              >
                {phoneMessage}
              </span>
            )}

            {/* Firebase's reCAPTCHA security challenge */}
            <div
              id="register-recaptcha-container"
              ref={recaptchaContainerRef}
              style={{ display: "flex", justifyContent: "center" }}
            />

            {phoneOtpSent && !phoneVerified && (
              <div className="otp-group-responsive" style={styles.otpGroup}>
                <div style={{ ...styles.inputGroup, ...styles.otpInput }}>
                  <FaClock style={styles.inputIcon} />
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    name="phoneOtp"
                    placeholder="Enter 6-digit OTP"
                    value={phoneOtp}
                    onChange={(e) =>
                      setPhoneOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    className="auth-input"
                    style={styles.input}
                    maxLength={6}
                  />
                </div>

                <button
                  type="button"
                  style={styles.verifyBtn}
                  onClick={verifyPhoneOtp}
                  disabled={otpLoading || phoneOtp.length !== 6}
                >
                  {otpLoading ? "Verifying..." : "Verify"}
                </button>
              </div>
            )}

            {phoneOtpSent && !phoneVerified && (
              <button
                type="button"
                style={{
                  ...styles.otpBtn,
                  width: "100%",
                }}
                onClick={resetPhoneOtp}
                disabled={otpLoading || phoneLoading}
              >
                Request a new OTP
              </button>
            )}

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
                disabled={firebaseAccountReady}
              />
              <button
                type="button"
                style={styles.passwordToggle}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {errors.password && (
              <span style={styles.errorText}>{errors.password}</span>
            )}

            <div style={styles.inputGroup}>
              <FaLock style={styles.inputIcon} />
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="auth-input"
                style={styles.input}
              />
              <button
                type="button"
                style={styles.passwordToggle}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {errors.confirmPassword && (
              <span style={styles.errorText}>{errors.confirmPassword}</span>
            )}

            <div style={styles.buttonGroup}>
              <button type="submit" style={styles.submitBtn} disabled={loading}>
                {loading ? <span style={styles.spinner}></span> : "Register"}
              </button>
            </div>
          </form>

          <div style={styles.formFooter}>
            <p style={styles.footerText}>
              Already have an account?{" "}
              <Link to="/login" style={styles.footerLink}>
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
