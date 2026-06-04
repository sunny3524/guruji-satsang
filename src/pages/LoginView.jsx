import { useState, useEffect } from "react";
import { signInWithGoogle } from "../firebase/auth";
import { auth, db, functions } from "../firebase/config";
import { httpsCallable } from "firebase/functions";
import { signInWithCustomToken, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { collection, query, where, getDocs, limit, doc, getDoc, setDoc, deleteDoc, updateDoc, serverTimestamp, collectionGroup } from "firebase/firestore";
import { C, COUNTRY_DIAL_CODES, SANGAT_COUNTRIES, normalizePhoneWithCountry } from "../utils/constants";
import FWrap from "../components/ui/FWrap";
import FField from "../components/ui/FField";
import Label from "../components/ui/Label";
import Btn from "../components/ui/Btn";

export default function LoginView({ nav, notify, ipCountry }) {
  const [tab, setTab] = useState("pin"); // pin | whatsapp
  const [phonePrefix, setPhonePrefix] = useState("+44");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [otp, setOtp] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [timer, setTimer] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ipCountry) {
      const dial = COUNTRY_DIAL_CODES[ipCountry] || "44";
      setPhonePrefix(`+${dial}`);
    }
  }, [ipCountry]);

  // Google Sign-In
  const handleGoogleSignIn = async () => {
    setBusy(true);
    try {
      const { user: authedUser, isNewProfile } = await signInWithGoogle();
      if (!isNewProfile) {
        nav("find");
      } else {
        nav("register");
      }
    } catch (e) {
      notify(e.message.replace("Firebase:", "").trim(), "err");
    }
    setBusy(false);
  };


  // Phone + PIN Login
  const handlePINLogin = async () => {
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      notify("Please enter your phone number", "err");
      return;
    }
    const trimmedPin = pin.trim();
    if (!trimmedPin || trimmedPin.length !== 6 || isNaN(trimmedPin)) {
      notify("Please enter a valid 6-digit PIN", "err");
      return;
    }

    setBusy(true);
    try {
      const normalizedPhone = normalizePhoneWithCountry(phonePrefix + phone, "");
      
      const loginPin = httpsCallable(functions, "loginWithPhoneAndPIN");
      const res = await loginPin({ phone: normalizedPhone, pin: trimmedPin });
      
      if (res.data.success && res.data.token) {
        await signInWithCustomToken(auth, res.data.token);
        notify("Jai Guruji! Successfully logged in 🙏");
        nav("find");
      } else {
        notify("Invalid phone number or PIN.", "err");
      }
    } catch (e) {
      notify(e.message.replace("Firebase:", "").trim(), "err");
    }
    setBusy(false);
  };

  // Request WhatsApp OTP
  const handleRequestWhatsApp = async () => {
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      notify("Please enter your phone number", "err");
      return;
    }
    
    setBusy(true);
    try {
      const normalizedPhone = normalizePhoneWithCountry(phonePrefix + phone, "");
      // Check if phone number is registered before requesting WhatsApp OTP
      const checkPhone = httpsCallable(functions, "checkPhoneAvailability");
      const phoneCheckRes = await checkPhone({ phone: normalizedPhone });
      if (phoneCheckRes.data.available) {
        notify("This phone number is not registered. Redirecting to registration... 🙏", "err");
        sessionStorage.setItem("prefill_phone", phone);
        sessionStorage.setItem("prefill_phone_prefix", phonePrefix);
        setBusy(false);
        setTimeout(() => nav("register"), 1800);
        return;
      }

      const requestOTP = httpsCallable(functions, "requestWhatsAppOTP");
      const res = await requestOTP({ phone: normalizedPhone });
      
      notify(res.data.message, "ok");
      setOtpRequested(true);
      setTimer(60);
    } catch (e) {
      notify(e.message.replace("Firebase:", "").trim(), "err");
    }
    setBusy(false);
  };

  // Verify WhatsApp OTP
  const handleVerifyWhatsApp = async () => {
    const trimmedCode = otp.trim();
    if (!trimmedCode || trimmedCode.length !== 6 || isNaN(trimmedCode)) {
      notify("Please enter a valid 6-digit verification code", "err");
      return;
    }

    setBusy(true);
    try {
      const normalizedPhone = normalizePhoneWithCountry(phonePrefix + phone, "");
      const verifyOTP = httpsCallable(functions, "verifyWhatsAppOTP");
      const res = await verifyOTP({ phone: normalizedPhone, code: trimmedCode });
      
      if (res.data.success && res.data.token) {
        await signInWithCustomToken(auth, res.data.token);
        notify("Jai Guruji! Successfully logged in 🙏");
        nav("find");
      } else {
        notify("Failed to verify WhatsApp code.", "err");
      }
    } catch (e) {
      notify(e.message.replace("Firebase:", "").trim(), "err");
    }
    setBusy(false);
  };

  // Countdown timer
  useEffect(() => {
    if (timer > 0) {
      const t = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [timer]);

  const tabStyle = (active) => ({
    flex: 1,
    padding: "10px 12px",
    background: active ? C.gold : "none",
    border: `1px solid ${C.border}`,
    color: active ? C.bg : C.muted,
    cursor: "pointer",
    fontWeight: "bold",
    borderRadius: 8,
    transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
    fontSize: 13,
    fontFamily: "var(--font-headings)",
    outline: "none"
  });

  return (
    <FWrap title="Welcome Back" sub="Login to your Sangat account">
      {/* Google Sign-In */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={busy}
        style={{
          width: "100%",
          background: C.cream,
          border: `1px solid ${C.border}`,
          color: C.bg,
          padding: "12px 16px",
          borderRadius: 8,
          fontWeight: "bold",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          fontSize: 15,
          transition: "transform 0.1s ease, box-shadow 0.2s ease",
          fontFamily: "var(--font-headings)",
          marginBottom: 20
        }}
        onMouseOver={e => {
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.boxShadow = `0 4px 14px rgba(212,151,42,0.15)`;
        }}
        onMouseOut={e => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
        </svg>
        Sign In with Google
      </button>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", margin: "10px 0 20px 0" }}>
        <div style={{ height: 1, background: C.border, flex: 1 }} />
        <span style={{ padding: "0 10px", color: C.muted, fontSize: 12 }}>or use other options</span>
        <div style={{ height: 1, background: C.border, flex: 1 }} />
      </div>

      {/* Sliding Tabs */}
      <div style={{ display: "flex", gap: 8, background: "rgba(0,0,0,0.18)", padding: 4, borderRadius: 10, border: `1px solid ${C.border}`, marginBottom: 24 }}>
        <button type="button" onClick={() => { setTab("pin"); setOtpRequested(false); setOtp(""); }} style={tabStyle(tab === "pin")}>Phone & PIN</button>
        <button type="button" onClick={() => { setTab("whatsapp"); setOtpRequested(false); setOtp(""); }} style={tabStyle(tab === "whatsapp")}>WhatsApp OTP</button>
      </div>

      {/* Tab Contents */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {/* Phone Number Input (Common to both tabs) */}
        <div style={{ marginBottom: 8 }}>
          <Label>Phone Number *</Label>
          <div style={{ display: "flex", gap: 10 }}>
            <select
              value={phonePrefix}
              onChange={e => setPhonePrefix(e.target.value)}
              disabled={otpRequested || busy}
              style={{
                width: 150,
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: "11px 14px",
                color: C.cream,
                fontSize: 15,
                fontFamily: "var(--font-body)",
                outline: "none",
                boxSizing: "border-box",
                height: 45
              }}
            >
              {SANGAT_COUNTRIES.filter(c => c !== "Other").map(cName => {
                const code = COUNTRY_DIAL_CODES[cName];
                return (
                  <option key={cName} value={`+${code}`} style={{ background: C.bg }}>
                    +{code} ({cName})
                  </option>
                );
              })}
            </select>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/[^\d]/g, ""))}
              disabled={otpRequested || busy}
              placeholder="e.g. 7700900077"
              style={{
                flex: 1,
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: "11px 14px",
                color: C.cream,
                fontSize: 15,
                fontFamily: "var(--font-body)",
                outline: "none",
                boxSizing: "border-box",
                height: 45
              }}
            />
          </div>
        </div>

        {/* Tab 1: PIN Login Fields */}
        {tab === "pin" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 6 }}>
            <div>
              <Label>Secure Account PIN *</Label>
              <input
                type="password"
                pattern="[0-9]*"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Enter 6-digit PIN"
                style={{
                  width: "100%",
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding: "11px 14px",
                  color: C.cream,
                  fontSize: 15,
                  fontFamily: "var(--font-body)",
                  outline: "none",
                  boxSizing: "border-box",
                  height: 45,
                  letterSpacing: "0.2em",
                  textAlign: "center",
                  fontWeight: "bold"
                }}
              />
            </div>
            
            <Btn onClick={handlePINLogin} disabled={busy} full style={{ marginTop: 6 }}>
              {busy ? "Verifying PIN…" : "Verify & Login →"}
            </Btn>

            <p style={{ margin: "10px 0 0 0", fontSize: 12, color: C.muted, textAlign: "center", lineHeight: 1.5 }}>
              Forgot your PIN? Log in using the **WhatsApp OTP** tab above, then set a new PIN on your Profile page.
            </p>
          </div>
        )}

        {/* Tab 2: WhatsApp OTP Fields */}
        {tab === "whatsapp" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {!otpRequested ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <p style={{ margin: "4px 0 8px 0", fontSize: 12, color: C.gold, lineHeight: 1.5 }}>
                  ⚠️ To use this method, your phone number must be active on WhatsApp to receive the verification code. If you do not have WhatsApp, please use the Phone + PIN option or sign in with Google.
                </p>
                <Btn onClick={handleRequestWhatsApp} disabled={busy} full>
                  {busy ? "Generating code…" : "Request WhatsApp OTP"}
                </Btn>
              </div>
            ) : (
              <div style={{
                background: "rgba(212,151,42,0.03)",
                border: `1px dashed ${C.border}`,
                borderRadius: 10,
                padding: "16px 20px",
                marginTop: 6,
                animation: "fadeInSlide 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
              }}>
                <p style={{ margin: "0 0 16px 0", fontSize: 12, color: C.muted, textAlign: "center", lineHeight: 1.5 }}>
                  If your number is registered, you will receive a WhatsApp verification code shortly. Please enter it below.
                </p>

                <FField
                  label="6-Digit Verification Code *"
                  type="text"
                  v={otp}
                  on={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  ph="e.g. 123456"
                  disabled={busy}
                  style={{ textAlign: "center", fontSize: 20, letterSpacing: "0.2em", fontWeight: "bold" }}
                />

                <Btn onClick={handleVerifyWhatsApp} disabled={busy} full style={{ marginTop: 12 }}>
                  {busy ? "Authenticating…" : "Verify & Login →"}
                </Btn>

                <div style={{ textAlign: "center", marginTop: 14, fontSize: 12, color: C.muted }}>
                  Didn't receive it?{" "}
                  {timer > 0 ? (
                    <span style={{ color: C.gold, fontWeight: "bold" }}>Resend code in {timer}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setOtpRequested(false); setOtp(""); }}
                      style={{ background: "none", border: "none", color: C.gold, cursor: "pointer", textDecoration: "underline", fontWeight: "bold" }}
                    >
                      Try again
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      <p style={{ textAlign: "center", color: C.muted, fontSize: 14, marginTop: 12 }}>
        New to the Sangat?{" "}
        <button
          onClick={() => nav("register")}
          style={{ background: "none", border: "none", color: C.gold, cursor: "pointer", textDecoration: "underline" }}
        >
          Join here
        </button>
      </p>
    </FWrap>
  );
}
