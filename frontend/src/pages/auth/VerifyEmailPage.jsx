import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  onAuthStateChanged,
  reload,
  sendEmailVerification,
} from "firebase/auth";

import { auth } from "../../firebase";
import api from "../../services/api";

const VerifyEmail = () => {
  const location = useLocation();
  const email = location.state?.email || "";
  const firebaseUidFromLink =
    new URLSearchParams(location.search).get("uid") ||
    location.state?.firebaseUid ||
    "";
  const sendFailed = location.state?.sendFailed || false;

  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [status, setStatus] = useState("checking");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
    });

    return unsubscribe;
  }, []);

  const checkVerification = useCallback(
    async (userToCheck = user) => {
      if (!userToCheck) {
        setStatus("no-session");
        return;
      }

      setBusy(true);
      setMessage("");

      try {
        // Refresh the Firebase user's latest verification status.
        await reload(userToCheck);

        if (!userToCheck.emailVerified) {
          setStatus("pending");
          setMessage(
            "Your email is not verified yet. Open the verification link from your inbox, then check again.",
          );
          return;
        }

        // Force-refresh the token to get the latest email_verified claim.
        const firebaseIdToken = await userToCheck.getIdToken(true);

        // Update MongoDB using a token verified by the backend.
        await api.post("/auth/confirm-email", {
          firebaseIdToken,
        });

        setStatus("verified");
        setMessage(
          "Your email is verified. You can now log in to MyParcelPoint.",
        );
      } catch (error) {
        console.error(
          "Email verification check failed:",
          error?.response?.data?.message || error.message,
        );

        setStatus("error");
        setMessage(
          error?.response?.data?.message ||
            "We could not confirm your email right now. Please try again.",
        );
      } finally {
        setBusy(false);
      }
    },
    [user],
  );

  

  useEffect(() => {
    if (!authReady) return;

    let cancelled = false;

    const syncFromEmailLink = async () => {
      setBusy(true);
      setMessage("");

      try {
        const response = await api.post("/auth/sync-email-verification", {
          firebaseUid: firebaseUidFromLink,
        });

        if (cancelled) return;

        if (response.data.phoneVerified === true) {
          setStatus("verified");
          setMessage("Your email and phone are verified. You can now log in.");
        } else {
          setStatus("error");
          setMessage(
            "Your email is verified, but phone verification is not recorded for this account.",
          );
        }
      } catch (error) {
        if (cancelled) return;

        console.error(
          "Email-link synchronization failed:",
          error.response?.data?.message || error.message,
        );

        setStatus("error");
        setMessage(
          error.response?.data?.message ||
            "Unable to confirm your email. Please try again.",
        );
      } finally {
        if (!cancelled) setBusy(false);
      }
    };

    if (firebaseUidFromLink && (!user || user.uid !== firebaseUidFromLink)) {
      syncFromEmailLink();
    } else if (user) {
      // Use the function that actually exists in this component.
      checkVerification(user);
    } else {
      setStatus("no-session");
    }

    return () => {
      cancelled = true;
    };
  }, [authReady, user, checkVerification, firebaseUidFromLink]);
  


  const resendVerification = async () => {
    if (!user) {
      setMessage(
        "Please return to the browser where you registered, or sign in to your Firebase account before requesting another link.",
      );
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      await sendEmailVerification(user, {
        url: `${window.location.origin}/verify-email?uid=${encodeURIComponent(user.uid)}`,
        handleCodeInApp: false,
      });

      setMessage(
        "A new verification email has been sent. Please check your inbox and spam folder.",
      );
    } catch (error) {
      console.error("Resend verification failed:", error.code || error.message);

      setMessage(
        "Could not resend the verification email. Please try again later.",
      );
    } finally {
      setBusy(false);
    }
  };

  const title =
    status === "verified"
      ? "Email verified"
      : status === "no-session"
        ? "Check your email"
        : "Verify your email";

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "#f8fafc",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 480,
          padding: 32,
          borderRadius: 16,
          background: "#ffffff",
          boxShadow: "0 10px 35px rgba(15, 23, 42, 0.08)",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 38, marginBottom: 12 }}>
          {status === "verified" ? "✅" : "📩"}
        </div>

        <h1 style={{ color: "#0f172a", marginBottom: 12 }}>{title}</h1>

        <p style={{ color: "#64748b", lineHeight: 1.7 }}>
          {email
            ? `Registration email: ${email}`
            : "Open the verification email sent to your registered address."}
        </p>

        <p style={{ color: "#475569", lineHeight: 1.7 }}>
          {sendFailed
            ? "Your account was registered, but the verification email could not be sent. You can try sending it again below."
            : message ||
              "Click the verification link in your email to activate your account."}
        </p>

        {status !== "verified" && user && (
          <>
            <button
              type="button"
              onClick={() => checkVerification(user)}
              disabled={busy}
              style={buttonStyle}
            >
              {busy ? "Checking..." : "I've verified my email"}
            </button>

            <button
              type="button"
              onClick={resendVerification}
              disabled={busy}
              style={{
                ...buttonStyle,
                background: "#f1f5f9",
                color: "#0f172a",
                marginTop: 10,
              }}
            >
              Resend verification email
            </button>
          </>
        )}

        {!user && status === "no-session" && (
          <p style={{ color: "#64748b", lineHeight: 1.7 }}>
            If you opened the email link on another device, return to the
            browser where you registered and check your verification again.
          </p>
        )}

        {status === "verified" && (
          <Link
            to="/login"
            style={{
              ...buttonStyle,
              display: "block",
              textDecoration: "none",
              boxSizing: "border-box",
              marginTop: 20,
            }}
          >
            Continue to Login
          </Link>
        )}

        <p style={{ marginTop: 22 }}>
          <Link to="/login" style={{ color: "#f97316" }}>
            Back to Login
          </Link>
        </p>
      </section>
    </main>
  );
};

const buttonStyle = {
  width: "100%",
  padding: "13px 16px",
  border: "none",
  borderRadius: 10,
  background: "#f97316",
  color: "#ffffff",
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
};

export default VerifyEmail;
