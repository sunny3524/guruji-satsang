import { useState, useEffect } from "react";
import { signInWithGoogle } from "../firebase/auth";
import { auth, db, functions } from "../firebase/config";
import { httpsCallable } from "firebase/functions";
import { signInWithCustomToken } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { C, COUNTRY_DIAL_CODES, SANGAT_COUNTRIES, normalizePhoneWithCountry } from "../utils/constants";
import FWrap from "../components/ui/FWrap";
import FField from "../components/ui/FField";
import Label from "../components/ui/Label";
import Btn from "../components/ui/Btn";

export default function LoginView({ nav, notify, ipCountry }) {
  const [step, setStep] = useState(1); // 1 = Phone Entry, 2 = Verification Option
  const [tab, setTab] = useState("pin"); // pin | whatsapp
  const [phonePrefix, setPhonePrefix] = useState("+44");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  // WhatsApp Flow states
  const [hasWhatsAppDevice, setHasWhatsAppDevice] = useState(null); // "yes" | "no" | null
  const [words, setWords] = useState("");
  const [ourNumber, setOurNumber] = useState("");
  const [polling, setPolling] = useState(false);
  const [pollTimer, setPollTimer] = useState(300); // 5 minutes (300 seconds)
  const [manualInstructionsOpen, setManualInstructionsOpen] = useState(false);
  const [pinErrorSuggestWhatsApp, setPinErrorSuggestWhatsApp] = useState(false);

  const normalizedPhone = normalizePhoneWithCountry(phonePrefix + phone, "");

  // Auto-detect country dial code
  useEffect(() => {
    if (ipCountry) {
      const dial = COUNTRY_DIAL_CODES[ipCountry] || "44";
      setPhonePrefix(`+${dial}`);
    }
  }, [ipCountry]);

  // Magic Link handler on mount
  useEffect(() => {
    const getQueryParam = (name) => {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.has(name)) return searchParams.get(name);
      
      const hash = window.location.hash;
      const qMarkIndex = hash.indexOf("?");
      if (qMarkIndex !== -1) {
        const hashParams = new URLSearchParams(hash.substring(qMarkIndex));
        if (hashParams.has(name)) return hashParams.get(name);
      }
      return null;
    };

    const token = getQueryParam("token");
    if (token) {
      setBusy(true);
      signInWithCustomToken(auth, token)
        .then(() => {
          notify("Jai Guruji! Successfully logged in via magic link 🙏");
          // Clean hash URL to clean state
          window.location.hash = "#/find";
        })
        .catch((err) => {
          notify("Invalid or expired login link.", "err");
          console.error("Custom token sign in failed:", err);
        })
        .finally(() => {
          setBusy(false);
        });
    }
  }, [nav, notify]);

  // Firestore Real-time Polling for WhatsApp approved status
  useEffect(() => {
    let unsubscribe = null;
    if (step === 2 && tab === "whatsapp" && words && normalizedPhone && polling) {
      unsubscribe = onSnapshot(doc(db, "login_attempts", normalizedPhone), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.status === "approved" && data.token) {
            signInWithCustomToken(auth, data.token)
              .then(() => {
                notify("Jai Guruji! Successfully logged in 🙏");
                nav("find");
              })
              .catch((err) => {
                notify("Failed to sign in with token.", "err");
                console.error(err);
              });
          } else if (data.status === "failed") {
            notify(data.error || "Login failed. Please request a new code.", "err");
            setPolling(false);
          }
        }
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [step, tab, words, normalizedPhone, polling, nav, notify]);

  // 5-minute countdown timer
  useEffect(() => {
    let t = null;
    if (polling && pollTimer > 0) {
      t = setTimeout(() => setPollTimer(pollTimer - 1), 1000);
    } else if (polling && pollTimer === 0) {
      setPolling(false);
      notify("Login request timed out. Please try again. 🙏", "err");
    }
    return () => clearTimeout(t);
  }, [polling, pollTimer, notify]);

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

  // Step 1: Click "Next" to verify if phone number is registered
  const handleNextStep = async () => {
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      notify("Please enter your phone number", "err");
      return;
    }

    setBusy(true);
    try {
      // Query checkPhoneAvailability Cloud Function
      const checkPhone = httpsCallable(functions, "checkPhoneAvailability");
      const phoneCheckRes = await checkPhone({ phone: normalizedPhone });
      
      if (phoneCheckRes.data.available) {
        notify("This phone number is not registered. Redirecting to registration... 🙏", "err");
        sessionStorage.setItem("prefill_phone", phone);
        sessionStorage.setItem("prefill_phone_prefix", phonePrefix);
        setBusy(false);
        setTimeout(() => nav("register"), 1800);
      } else {
        // Registered! Move to Step 2
        setStep(2);
      }
    } catch (e) {
      notify(e.message.replace("Firebase:", "").trim(), "err");
    }
    setBusy(false);
  };

  // Step 2: PIN Verification
  const handlePINLogin = async () => {
    const trimmedPin = pin.trim();
    if (!trimmedPin || trimmedPin.length !== 6 || isNaN(trimmedPin)) {
      notify("Please enter a valid 6-digit PIN", "err");
      return;
    }

    setBusy(true);
    try {
      const loginPin = httpsCallable(functions, "loginWithPhoneAndPIN");
      const res = await loginPin({ phone: normalizedPhone, pin: trimmedPin });
      
      if (res.data.success && res.data.token) {
        await signInWithCustomToken(auth, res.data.token);
        notify("Jai Guruji! Successfully logged in 🙏");
        nav("find");
      } else {
        notify("Incorrect PIN. Please try again.", "err");
        setPinErrorSuggestWhatsApp(true);
      }
    } catch (e) {
      notify(e.message.replace("Firebase:", "").trim(), "err");
      setPinErrorSuggestWhatsApp(true);
    }
    setBusy(false);
  };

  // Step 2: Request WhatsApp Login 3-Words Code
  const triggerWhatsAppCodeRequest = async () => {
    setBusy(true);
    try {
      const requestWords = httpsCallable(functions, "requestWhatsAppLoginWords");
      const res = await requestWords({ phone: normalizedPhone });
      
      if (res.data.success) {
        setWords(res.data.code);
        setOurNumber(res.data.ourNumber);
        setPolling(true);
        setPollTimer(300); // Reset countdown
      } else {
        notify("Failed to initiate WhatsApp login request.", "err");
      }
    } catch (e) {
      notify(e.message.replace("Firebase:", "").trim(), "err");
    }
    setBusy(false);
  };

  const handleWhatsAppSelection = async (hasDevice) => {
    setHasWhatsAppDevice(hasDevice);
    await triggerWhatsAppCodeRequest();
  };

  const resetWhatsAppFlow = () => {
    setHasWhatsAppDevice(null);
    setWords("");
    setPolling(false);
    setManualInstructionsOpen(false);
  };

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

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
    <FWrap title="Welcome Back" sub={step === 1 ? "Login to your Sangat account" : `Verifying ${phonePrefix} ${phone}`}>
      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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
            <span style={{ padding: "0 10px", color: C.muted, fontSize: 12 }}>or use phone number</span>
            <div style={{ height: 1, background: C.border, flex: 1 }} />
          </div>

          {/* Phone Number Input */}
          <div style={{ marginBottom: 12 }}>
            <Label>Phone Number *</Label>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <select
                value={phonePrefix}
                onChange={e => setPhonePrefix(e.target.value)}
                disabled={busy}
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
                disabled={busy}
                placeholder="e.g. 7700900077"
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
                  height: 45
                }}
              />
            </div>
          </div>

          <Btn onClick={handleNextStep} disabled={busy} full style={{ marginTop: 10 }}>
            {busy ? "Checking Account…" : "Next →"}
          </Btn>

          <p style={{ textAlign: "center", color: C.muted, fontSize: 14, marginTop: 12 }}>
            New to the Sangat?{" "}
            <button
              onClick={() => nav("register")}
              style={{ background: "none", border: "none", color: C.gold, cursor: "pointer", textDecoration: "underline", padding: 0 }}
            >
              Join here
            </button>
          </p>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {/* Back Button */}
          <button
            onClick={() => {
              setStep(1);
              resetWhatsAppFlow();
              setPinErrorSuggestWhatsApp(false);
            }}
            style={{
              alignSelf: "flex-start",
              background: "none",
              border: "none",
              color: C.muted,
              cursor: "pointer",
              fontSize: 13,
              textDecoration: "underline",
              marginBottom: 14,
              padding: 0
            }}
          >
            ← Back to phone entry
          </button>

          {/* Sliding Tabs */}
          <div style={{ display: "flex", gap: 8, background: "rgba(0,0,0,0.18)", padding: 4, borderRadius: 10, border: `1px solid ${C.border}`, marginBottom: 20 }}>
            <button type="button" onClick={() => { setTab("pin"); resetWhatsAppFlow(); }} style={tabStyle(tab === "pin")}>Phone & PIN</button>
            <button type="button" onClick={() => { setTab("whatsapp"); }} style={tabStyle(tab === "whatsapp")}>WhatsApp Login</button>
          </div>

          {/* Tab 1: PIN Login */}
          {tab === "pin" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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

              {pinErrorSuggestWhatsApp && (
                <div style={{
                  padding: "10px 12px",
                  background: "rgba(114,47,55,0.1)",
                  border: `1px solid ${C.red}`,
                  borderRadius: 8,
                  fontSize: 12,
                  color: C.cream,
                  lineHeight: 1.4
                }}>
                  ❌ Incorrect PIN. Don't remember your PIN? Switch to the{" "}
                  <button
                    onClick={() => {
                      setTab("whatsapp");
                      setPinErrorSuggestWhatsApp(false);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: C.gold,
                      cursor: "pointer",
                      textDecoration: "underline",
                      fontWeight: "bold",
                      padding: 0
                    }}
                  >
                    WhatsApp Login
                  </button>{" "}
                  tab above to log in securely without a PIN! 🙏
                </div>
              )}

              <Btn onClick={handlePINLogin} disabled={busy} full style={{ marginTop: 4 }}>
                {busy ? "Verifying PIN…" : "Verify & Login →"}
              </Btn>

              <p style={{ margin: "10px 0 0 0", fontSize: 12, color: C.muted, textAlign: "center", lineHeight: 1.5 }}>
                Forgot your PIN? Switch to the **WhatsApp Login** tab above to verify your account.
              </p>
            </div>
          )}

          {/* Tab 2: WhatsApp Login */}
          {tab === "whatsapp" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {hasWhatsAppDevice === null && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <p style={{ fontSize: 14, color: C.cream, textAlign: "center", lineHeight: 1.5 }}>
                    Do you have WhatsApp installed on this device and logged in with the above number?
                  </p>
                  
                  <div style={{ display: "flex", gap: 12 }}>
                    <button
                      onClick={() => handleWhatsAppSelection("yes")}
                      disabled={busy}
                      style={{
                        flex: 1,
                        background: C.gold,
                        border: "none",
                        borderRadius: 8,
                        padding: "12px",
                        color: C.bg,
                        fontWeight: "bold",
                        cursor: "pointer"
                      }}
                    >
                      Yes, on this device
                    </button>
                    <button
                      onClick={() => handleWhatsAppSelection("no")}
                      disabled={busy}
                      style={{
                        flex: 1,
                        background: "none",
                        border: `1px solid ${C.border}`,
                        borderRadius: 8,
                        padding: "12px",
                        color: C.cream,
                        fontWeight: "bold",
                        cursor: "pointer"
                      }}
                    >
                      No, on another device
                    </button>
                  </div>
                </div>
              )}

              {hasWhatsAppDevice !== null && !words && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "20px 0" }}>
                  <div className="spinner" style={{
                    border: `4px solid ${C.border}`,
                    borderTop: `4px solid ${C.gold}`,
                    borderRadius: "50%",
                    width: 30,
                    height: 30,
                    animation: "spin 1s linear infinite"
                  }} />
                  <span style={{ fontSize: 14, color: C.muted }}>Generating login code...</span>
                </div>
              )}

              {hasWhatsAppDevice !== null && words && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Yes, on this device view */}
                  {hasWhatsAppDevice === "yes" && !manualInstructionsOpen && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center", textAlign: "center" }}>
                      <p style={{ fontSize: 13, color: C.cream, lineHeight: 1.5 }}>
                        Click the button below to open WhatsApp with your prefilled login message. Just hit **send** and then return to this page!
                      </p>
                      
                      <a
                        href={`https://api.whatsapp.com/send?phone=${ourNumber.replace(/[^\d]/g, "")}&text=Login:%20${encodeURIComponent(words)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          width: "100%",
                          background: "#25D366",
                          border: "none",
                          borderRadius: 8,
                          padding: "12px 16px",
                          color: "#1a0800",
                          fontWeight: "bold",
                          textDecoration: "none",
                          fontSize: 15,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 10,
                          cursor: "pointer",
                          boxShadow: "0 4px 10px rgba(37,211,102,0.2)"
                        }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.73-1.45L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.858.002-2.635-1.023-5.11-2.884-6.974C16.59 1.91 14.118.887 11.488.887c-5.44 0-9.866 4.418-9.87 9.857-.001 1.737.476 3.427 1.38 4.931l-.988 3.616 3.738-.979z" />
                        </svg>
                        Open WhatsApp & Send Login Code
                      </a>
                      
                      <p style={{ fontSize: 11, color: C.muted }}>
                        Code to send: <code style={{ color: C.gold, fontSize: 12 }}>Login: {words}</code>
                      </p>
                    </div>
                  )}

                  {/* No, on another device view OR Manual Fallback opened */}
                  {(hasWhatsAppDevice === "no" || manualInstructionsOpen) && (
                    <div style={{
                      background: "rgba(0,0,0,0.2)",
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      padding: "14px 16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10
                    }}>
                      <h4 style={{ margin: 0, color: C.gold, fontSize: 13, textTransform: "uppercase", letterSpacing: 1 }}>Manual Instructions</h4>
                      <p style={{ margin: 0, fontSize: 13, color: C.cream, lineHeight: 1.4 }}>
                        From any device with your active WhatsApp account, send a message to our receiver:
                      </p>
                      <div style={{
                        background: C.card,
                        padding: "8px 12px",
                        borderRadius: 6,
                        border: `1px solid rgba(212,151,42,0.2)`,
                        fontSize: 15,
                        textAlign: "center",
                        fontWeight: "bold",
                        color: C.cream
                      }}>
                        {ourNumber}
                      </div>
                      
                      <p style={{ margin: 0, fontSize: 13, color: C.cream, lineHeight: 1.4 }}>
                        Send this exact text:
                      </p>
                      <div style={{
                        background: C.card,
                        padding: "10px 12px",
                        borderRadius: 6,
                        border: `1px solid rgba(212,151,42,0.2)`,
                        fontSize: 16,
                        textAlign: "center",
                        fontWeight: "bold",
                        color: C.gold,
                        letterSpacing: "0.05em"
                      }}>
                        Login: {words}
                      </div>
                    </div>
                  )}

                  {/* Shared Polling waiting screen */}
                  <div style={{
                    background: "rgba(212,151,42,0.03)",
                    border: `1px dashed ${C.border}`,
                    borderRadius: 10,
                    padding: "16px 20px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 12
                  }}>
                    {polling ? (
                      <>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div className="spinner-pulse" style={{
                            width: 12,
                            height: 12,
                            borderRadius: "50%",
                            background: C.gold,
                            animation: "pulse 1.5s infinite"
                          }} />
                          <span style={{ fontSize: 13, color: C.cream, fontWeight: "bold" }}>
                            Waiting for WhatsApp confirmation...
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: 12, color: C.muted }}>
                          This page will automatically unlock once you send the code.
                        </p>
                        <span style={{ fontSize: 14, color: C.gold, fontWeight: "bold" }}>
                          Expires in {formatTime(pollTimer)}
                        </span>
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: 13, color: C.red, fontWeight: "bold" }}>
                          Polling stopped or expired
                        </span>
                        <button
                          onClick={triggerWhatsAppCodeRequest}
                          style={{
                            background: "none",
                            border: "none",
                            color: C.gold,
                            cursor: "pointer",
                            textDecoration: "underline",
                            fontWeight: "bold",
                            fontSize: 13,
                            padding: 0
                          }}
                        >
                          Request a new code & try again
                        </button>
                      </>
                    )}
                  </div>

                  {/* Shared Fallback Toggle (Only for Yes flow) */}
                  {hasWhatsAppDevice === "yes" && (
                    <button
                      onClick={() => setManualInstructionsOpen(!manualInstructionsOpen)}
                      style={{
                        background: "none",
                        border: "none",
                        color: C.muted,
                        cursor: "pointer",
                        fontSize: 12,
                        textDecoration: "underline",
                        textAlign: "center",
                        marginTop: 4
                      }}
                    >
                      {manualInstructionsOpen
                        ? "Hide manual instructions"
                        : "Not redirecting? Or using a different device? Show manual instructions"}
                    </button>
                  )}

                  {/* Cancel / Reset Button */}
                  <button
                    onClick={resetWhatsAppFlow}
                    style={{
                      background: "none",
                      border: "none",
                      color: C.muted,
                      cursor: "pointer",
                      fontSize: 12,
                      textDecoration: "underline",
                      textAlign: "center",
                      marginTop: 8
                    }}
                  >
                    Use different WhatsApp device or change preference
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </FWrap>
  );
}
