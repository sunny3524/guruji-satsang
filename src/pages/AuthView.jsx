import { useState, useEffect } from "react";
import { auth, db, functions } from "../firebase/config";
import { httpsCallable } from "firebase/functions";
import { signInWithCustomToken } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { C, COUNTRY_DIAL_CODES, SANGAT_COUNTRIES, normalizePhoneWithCountry } from "../utils/constants";
import FWrap from "../components/ui/FWrap";
import FField from "../components/ui/FField";
import Label from "../components/ui/Label";
import Btn from "../components/ui/Btn";
import { validateAddressWithGoogle } from "../utils/geoUtils";
import { createUserProfile } from "../firebase/firestore";

export default function AuthView({ nav, notify, ipCountry, initialMode }) {
  // Modes: 
  // - "phone-entry"
  // - "login-pin"
  // - "login-wa-choice"
  // - "login-wa-polling"
  // - "signup-basic" (Step 1)
  // - "signup-sms-confirm" (Step 2 - Confirm overlay)
  // - "signup-sms-otp" (Step 2 - Code Entry)
  // - "signup-guests" (Step 3)
  // - "signup-address" (Step 4)
  // - "signup-pin" (Step 5)
  const [mode, setMode] = useState("phone-entry");

  // Phone entry states
  const [phone, setPhone] = useState("");
  const [phonePrefix, setPhonePrefix] = useState("+44");
  const [country, setCountry] = useState("United Kingdom");
  const [customCountry, setCustomCountry] = useState("");
  const [busy, setBusy] = useState(false);

  // Login PIN states
  const [pin, setPin] = useState("");
  const [pinErrorSuggestWhatsApp, setPinErrorSuggestWhatsApp] = useState(false);

  // WhatsApp states
  const [hasWhatsAppDevice, setHasWhatsAppDevice] = useState(null); // "yes" | "no" | null
  const [words, setWords] = useState("");
  const [ourNumber, setOurNumber] = useState("");
  const [polling, setPolling] = useState(false);
  const [pollTimer, setPollTimer] = useState(300);
  const [manualInstructionsOpen, setManualInstructionsOpen] = useState(false);

  // Registration wizard states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [guests, setGuests] = useState([]);
  const [newGuestName, setNewGuestName] = useState("");
  const [newGuestRel, setNewGuestRel] = useState("Spouse");
  const [isChild, setIsChild] = useState(false);

  // Address states
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [addressLine3, setAddressLine3] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postcode, setPostcode] = useState("");

  // PIN Creation states
  const [signupPin, setSignupPin] = useState("");
  const [signupConfirmPin, setSignupConfirmPin] = useState("");

  // SMS Verification state
  const [smsSent, setSmsSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [smsTimer, setSmsTimer] = useState(0);

  // Target country and normalized phone number helpers
  const targetCountry = country === "Other" ? customCountry.trim() : country;
  const formattedPhone = normalizePhoneWithCountry(phonePrefix + phone, targetCountry);

  // Parse phone helper
  const parsePhoneNumber = (fullPhone) => {
    if (!fullPhone) return { prefix: "+44", num: "" };
    const dialCodes = [
      "971", "353", "254", "973", "233", "352", "968", "974", "966",
      "44", "91", "61", "64", "65", "27", "49", "33", "31", "41", "60",
      "36", "62", "92", "34", "46", "66", "1"
    ];
    let numWithoutPlus = fullPhone.startsWith("+") ? fullPhone.slice(1) : fullPhone;
    for (const code of dialCodes) {
      if (numWithoutPlus.startsWith(code)) {
        return {
          prefix: `+${code}`,
          num: numWithoutPlus.slice(code.length)
        };
      }
    }
    return { prefix: "+44", num: numWithoutPlus };
  };

  // 1. Prefill / detect country code
  useEffect(() => {
    if (ipCountry) {
      const dial = COUNTRY_DIAL_CODES[ipCountry] || "44";
      setPhonePrefix(`+${dial}`);
      setCountry(SANGAT_COUNTRIES.includes(ipCountry) ? ipCountry : "Other");
      setCustomCountry(SANGAT_COUNTRIES.includes(ipCountry) ? "" : ipCountry);
    }
  }, [ipCountry]);

  // 2. Handle redirects / Session Pre-fills
  useEffect(() => {
    const prefilledPhone = sessionStorage.getItem("prefill_phone");
    const prefilledPrefix = sessionStorage.getItem("prefill_phone_prefix");
    if (prefilledPhone) {
      setPhone(prefilledPhone);
      setPhonePrefix(prefilledPrefix || "+44");
      if (initialMode === "login") {
        setMode("login-pin");
      } else {
        setMode("signup-basic");
      }
      sessionStorage.removeItem("prefill_phone");
      sessionStorage.removeItem("prefill_phone_prefix");
    }

    // If already authenticated in Auth but has no Firestore profile doc (force redirect)
    if (auth.currentUser && !busy) {
      const parsed = parsePhoneNumber(auth.currentUser.phoneNumber);
      setPhone(parsed.num);
      setPhonePrefix(parsed.prefix);
      setName(auth.currentUser.displayName || "");
      setMode("signup-basic");
    }
  }, [initialMode]);

  // 3. Clean up reCAPTCHA verifier on unmount
  useEffect(() => {
    return () => {
      if (window.recaptchaVerifierRegister) {
        try {
          window.recaptchaVerifierRegister.clear();
        } catch (e) {
          console.warn("reCAPTCHA clear failed on unmount", e);
        }
        window.recaptchaVerifierRegister = null;
      }
    };
  }, []);

  // 4. SMS Countdown timer
  useEffect(() => {
    if (smsTimer > 0) {
      const t = setTimeout(() => setSmsTimer(smsTimer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [smsTimer]);

  // 5. Magic Link handler on mount
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
    const magic = getQueryParam("magic");

    if (token) {
      setBusy(true);
      signInWithCustomToken(auth, token)
        .then(() => {
          sessionStorage.setItem("just_wa_logged_in", "true");
          notify("Jai Guruji! Successfully logged in via magic link 🙏");
          window.location.hash = "#/profile";
        })
        .catch((err) => {
          notify("Invalid or expired login link.", "err");
          console.error("Custom token sign in failed:", err);
        })
        .finally(() => {
          setBusy(false);
        });
    } else if (magic) {
      setBusy(true);
      const redeemMagic = httpsCallable(functions, "redeemMagicCode");
      redeemMagic({ magicCode: magic })
        .then((res) => {
          if (res.data.success && res.data.token) {
            return signInWithCustomToken(auth, res.data.token);
          } else {
            throw new Error("Invalid or expired login link.");
          }
        })
        .then(() => {
          sessionStorage.setItem("just_wa_logged_in", "true");
          notify("Jai Guruji! Successfully logged in via magic link 🙏");
          window.location.hash = "#/profile";
        })
        .catch((err) => {
          notify("Invalid or expired login link.", "err");
          console.error("Magic link redemption failed:", err);
        })
        .finally(() => {
          setBusy(false);
        });
    }
  }, [notify]);

  // 6. Firestore Real-time Polling for WhatsApp status
  useEffect(() => {
    let unsubscribe = null;
    if (mode === "login-wa-polling" && words && formattedPhone && polling) {
      unsubscribe = onSnapshot(doc(db, "login_attempts", formattedPhone), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.status === "approved" && data.token) {
            signInWithCustomToken(auth, data.token)
              .then(() => {
                sessionStorage.setItem("just_wa_logged_in", "true");
                notify("Jai Guruji! Successfully logged in 🙏");
                nav("profile");
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
  }, [mode, words, formattedPhone, polling, nav, notify]);

  // 7. WhatsApp Polling Timer
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

  // 8. Hash PIN client-side using SHA-256
  const hashPinClient = async (plainPin) => {
    const msgUint8 = new TextEncoder().encode(plainPin.trim());
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  };

  // 9. Flow Router: Universal Phone Entry Click
  const handleCheckPhone = async () => {
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      notify("Please enter your phone number", "err");
      return;
    }

    setBusy(true);
    try {
      const checkPhone = httpsCallable(functions, "checkPhoneAvailability");
      const phoneCheckRes = await checkPhone({ phone: formattedPhone });
      
      if (phoneCheckRes.data.available) {
        // Unregistered! Go to guided signup wizard
        if (initialMode === "login") {
          sessionStorage.setItem("prefill_phone", phone);
          sessionStorage.setItem("prefill_phone_prefix", phonePrefix);
          nav("register");
        } else {
          setMode("signup-basic");
        }
      } else {
        // Registered! Move to PIN login
        if (initialMode === "register") {
          sessionStorage.setItem("prefill_phone", phone);
          sessionStorage.setItem("prefill_phone_prefix", phonePrefix);
          nav("login");
        } else {
          setMode("login-pin");
        }
      }
    } catch (e) {
      notify(e.message.replace("Firebase:", "").trim(), "err");
    }
    setBusy(false);
  };

  // 10. Login PIN handler
  const handlePINLogin = async () => {
    const trimmedPin = pin.trim();
    if (!trimmedPin || trimmedPin.length !== 6 || isNaN(trimmedPin)) {
      notify("Please enter a valid 6-digit PIN", "err");
      return;
    }

    setBusy(true);
    try {
      const loginPin = httpsCallable(functions, "loginWithPhoneAndPIN");
      const res = await loginPin({ phone: formattedPhone, pin: trimmedPin });
      
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

  // 11. WhatsApp Code Trigger
  const triggerWhatsAppCodeRequest = async () => {
    setBusy(true);
    try {
      const requestWords = httpsCallable(functions, "requestWhatsAppLoginWords");
      const res = await requestWords({ phone: formattedPhone });
      
      if (res.data.success) {
        setWords(res.data.code);
        setOurNumber(res.data.ourNumber);
        setPolling(true);
        setPollTimer(300); // Reset countdown
        setMode("login-wa-polling");
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
    setMode("login-pin");
  };

  // 12. Signup Wizard Step Transitions
  const handleSignupBasicNext = () => {
    if (!name.trim()) {
      notify("Full Name is required", "err");
      return;
    }
    if (email.trim() && !email.trim().includes("@")) {
      notify("Please enter a valid email address or leave it blank", "err");
      return;
    }

    if (auth.currentUser && auth.currentUser.phoneNumber) {
      // User is already signed in via Firebase Auth! Skip SMS code verification
      setMode("signup-guests");
    } else {
      setMode("signup-sms-confirm");
    }
  };

  // SMS OTP sending
  const triggerSMSAuth = async () => {
    setBusy(true);
    try {
      const { RecaptchaVerifier, signInWithPhoneNumber } = await import("firebase/auth");
      
      if (window.recaptchaVerifierRegister) {
        try {
          window.recaptchaVerifierRegister.clear();
        } catch (e) {
          console.warn("reCAPTCHA clear failed", e);
        }
        window.recaptchaVerifierRegister = null;
      }

      window.recaptchaVerifierRegister = new RecaptchaVerifier(auth, "recaptcha-container-register", {
        size: "invisible",
        callback: () => {}
      });

      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, window.recaptchaVerifierRegister);
      setConfirmationResult(confirmation);
      setSmsSent(true);
      setSmsTimer(120);
      setMode("signup-sms-otp");
      notify("Verification SMS sent! Please enter the code.", "ok");
    } catch (e) {
      console.error("Firebase SMS Auth error detail:", e);
      notify(`${e.code || "Error"}: ${e.message.replace("Firebase:", "").trim()}`, "err");
      if (window.recaptchaVerifierRegister) {
        window.recaptchaVerifierRegister.clear();
        window.recaptchaVerifierRegister = null;
      }
    }
    setBusy(false);
  };

  // Confirm SMS OTP
  const handleConfirmRegisterSMS = async () => {
    const trimmedCode = otpCode.trim();
    if (!trimmedCode || trimmedCode.length !== 6 || isNaN(trimmedCode)) {
      notify("Please enter a valid 6-digit verification code", "err");
      return;
    }

    if (!confirmationResult) {
      notify("No pending verification request found.", "err");
      return;
    }

    setBusy(true);
    try {
      await confirmationResult.confirm(trimmedCode);
      notify("Phone number verified successfully! 🙏");
      setMode("signup-guests");
    } catch (e) {
      notify(e.message.replace("Firebase:", "").trim(), "err");
    }
    setBusy(false);
  };

  // Guest actions
  const handleAddLocalGuest = () => {
    const trimmed = newGuestName.trim();
    if (!trimmed) {
      notify("Please enter a guest name", "err");
      return;
    }
    const isActuallyChild = (newGuestRel === "Son" || newGuestRel === "Daughter") && isChild;
    const newGuest = {
      id: "g_" + Math.random().toString(36).slice(2, 9),
      name: trimmed,
      relationship: newGuestRel,
      isChild: isActuallyChild
    };
    setGuests(prev => [...prev, newGuest]);
    setNewGuestName("");
    setIsChild(false);
  };

  const handleRemoveLocalGuest = (id) => {
    setGuests(prev => prev.filter(g => g.id !== id));
  };

  // Final Signup Submission
  const handleFinalSubmit = async () => {
    if (!signupPin || signupPin.length !== 6 || isNaN(signupPin)) {
      notify("Please enter a valid 6-digit numerical PIN", "err");
      return;
    }

    if (signupPin !== signupConfirmPin) {
      notify("PINs do not match", "err");
      return;
    }

    setBusy(true);
    try {
      let latitude = null;
      let longitude = null;

      // Validate address with Google if address is provided
      if (addressLine1.trim() && city.trim() && postcode.trim()) {
        try {
          const valResult = await validateAddressWithGoogle({
            addressLine1: addressLine1.trim(),
            addressLine2: addressLine2.trim(),
            addressLine3: addressLine3.trim(),
            city: city.trim(),
            state: state.trim(),
            postcode: postcode.trim(),
            country: targetCountry
          });
          if (valResult.valid) {
            latitude = valResult.lat;
            longitude = valResult.lng;
          }
        } catch (geoErr) {
          console.warn("Google Address Geocoding bypassed or failed:", geoErr);
        }
      }

      const pinHash = await hashPinClient(signupPin);
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("User session not initialized. Please re-verify your phone.");
      }

      await createUserProfile(currentUser.uid, {
        email: email.trim(),
        name: name.trim(),
        phone: formattedPhone,
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim(),
        addressLine3: addressLine3.trim(),
        state: state.trim(),
        city: city.trim(),
        postcode: postcode.trim(),
        country: targetCountry,
        latitude,
        longitude,
        guests,
        pinHash,
        showOnCommunityMap: true
      });

      notify(`Jai Guruji! Welcome to the Sangat, ${name} 🙏`);
      nav("find");
    } catch (e) {
      notify(e.message.replace("Firebase:", "").trim(), "err");
    }
    setBusy(false);
  };

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  let postcodePlaceholder = "e.g. Zip or Postal Code";
  if (country === "United Kingdom") postcodePlaceholder = "e.g. EN4 0DU";
  else if (country === "India") postcodePlaceholder = "e.g. 110001";
  else if (country === "United States") postcodePlaceholder = "e.g. 90210";
  else if (country === "Canada") postcodePlaceholder = "e.g. K1A 0B1";

  // Determine which step number is highlighted in the signup wizard progress header
  const getSignupStepNumber = () => {
    if (mode === "signup-basic") return 1;
    if (mode === "signup-sms-confirm" || mode === "signup-sms-otp") return 2;
    if (mode === "signup-guests") return 3;
    if (mode === "signup-address") return 4;
    if (mode === "signup-pin") return 5;
    return 1;
  };

  const isSignupStep = mode.startsWith("signup-");

  return (
    <div style={{ maxWidth: 520, margin: "0 auto" }}>
      {/* Wizard Step Timeline (only rendered for the multi-step signup process) */}
      {isSignupStep && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, padding: "0 10px" }}>
          {[1, 2, 3, 4, 5].map((stepNum) => {
            const currentWizardStep = getSignupStepNumber();
            return (
              <div key={stepNum} style={{ display: "flex", alignItems: "center", flex: stepNum < 5 ? 1 : "none" }}>
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: currentWizardStep === stepNum ? C.gold : currentWizardStep > stepNum ? C.saffron : "rgba(255,255,255,0.08)",
                  color: currentWizardStep >= stepNum ? C.bg : C.muted,
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  border: currentWizardStep === stepNum ? `2px solid ${C.cream}` : "none",
                  transition: "all 0.3s ease"
                }}>
                  {stepNum}
                </div>
                {stepNum < 5 && (
                  <div style={{
                    height: 2,
                    flex: 1,
                    background: currentWizardStep > stepNum ? C.saffron : "rgba(255,255,255,0.08)",
                    margin: "0 8px",
                    transition: "all 0.3s ease"
                  }} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* STEP 1: Universal Phone Entry Screen */}
      {mode === "phone-entry" && (
        <FWrap title="Welcome to Guruji Sangat" sub="Enter your phone number to login or register">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <Label>Country *</Label>
              <select
                value={country}
                onChange={e => {
                  const val = e.target.value;
                  setCountry(val);
                  if (val !== "Other") {
                    setPhonePrefix(`+${COUNTRY_DIAL_CODES[val]}`);
                  }
                }}
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
                {SANGAT_COUNTRIES.map(cName => (
                  <option key={cName} value={cName} style={{ background: C.bg }}>
                    {cName}
                  </option>
                ))}
              </select>
            </div>

            {country === "Other" && (
              <FField label="Enter Country Name *" v={customCountry} on={e => setCustomCountry(e.target.value)} ph="e.g. Ireland" />
            )}

            <div>
              <Label>Mobile Number *</Label>
              <div style={{ display: "flex", gap: 10 }}>
                <select
                  value={phonePrefix}
                  onChange={e => setPhonePrefix(e.target.value)}
                  disabled={busy}
                  style={{
                    width: 110,
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

            <Btn onClick={handleCheckPhone} disabled={busy} full style={{ marginTop: 10 }}>
              {busy ? "Checking Number…" : "Continue →"}
            </Btn>
          </div>
        </FWrap>
      )}

      {/* STEP 2 (LOGIN FLOW): PIN Entry Screen */}
      {mode === "login-pin" && (
        <FWrap title="Enter Secure PIN" sub={`Verifying ${phonePrefix} ${phone}`}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <button
              onClick={() => setMode("phone-entry")}
              style={{
                alignSelf: "flex-start",
                background: "none",
                border: "none",
                color: C.muted,
                cursor: "pointer",
                fontSize: 13,
                textDecoration: "underline",
                marginBottom: 6,
                padding: 0
              }}
            >
              ← Back to phone entry
            </button>

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

            <Btn onClick={handlePINLogin} disabled={busy} full style={{ marginTop: 4 }}>
              {busy ? "Verifying PIN…" : "Verify & Login →"}
            </Btn>

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
                ❌ Incorrect PIN. Don't remember your PIN? Log in securely via WhatsApp! 🙏
              </div>
            )}

            <button
              onClick={() => setMode("login-wa-choice")}
              style={{
                background: "none",
                border: "none",
                color: C.gold,
                cursor: "pointer",
                textDecoration: "underline",
                fontWeight: "bold",
                fontSize: 13,
                marginTop: 10,
                padding: 8,
                textAlign: "center"
              }}
            >
              Forgot PIN? Log in via WhatsApp
            </button>
          </div>
        </FWrap>
      )}

      {/* STEP 2 (LOGIN FLOW): WhatsApp Device Choice */}
      {mode === "login-wa-choice" && (
        <FWrap title="WhatsApp Login" sub={`Verifying ${phonePrefix} ${phone}`}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <button
              onClick={() => setMode("login-pin")}
              style={{
                alignSelf: "flex-start",
                background: "none",
                border: "none",
                color: C.gold,
                cursor: "pointer",
                fontSize: 12,
                textDecoration: "underline",
                marginBottom: 6,
                padding: 0
              }}
            >
              ← Back to PIN login
            </button>

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
        </FWrap>
      )}

      {/* STEP 2 (LOGIN FLOW): WhatsApp Polling State */}
      {mode === "login-wa-polling" && (
        <FWrap title="Verify WhatsApp Code" sub={`Verifying ${phonePrefix} ${phone}`}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <button
              onClick={() => {
                setMode("login-wa-choice");
                resetWhatsAppFlow();
              }}
              style={{
                alignSelf: "flex-start",
                background: "none",
                border: "none",
                color: C.gold,
                cursor: "pointer",
                fontSize: 12,
                textDecoration: "underline",
                marginBottom: 6,
                padding: 0
              }}
            >
              ← Back to device choice
            </button>

            {!words && (
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

            {words && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {hasWhatsAppDevice === "yes" && !manualInstructionsOpen && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center", textAlign: "center" }}>
                    <p style={{ fontSize: 13, color: C.cream, lineHeight: 1.5 }}>
                      Click the button below to open WhatsApp with your prefilled login message. Hit **send**, and then return to this page (which will automatically unlock) or tap the magic link sent back in the WhatsApp reply.
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
                  Cancel WhatsApp login
                </button>
              </div>
            )}
          </div>
        </FWrap>
      )}

      {/* SIGNUP STEP 1: Basic Info Screen */}
      {mode === "signup-basic" && (
        <FWrap title="Let's Know You" sub="Step 1 of 5: Please provide your name and optional email">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <button
              onClick={() => setMode("phone-entry")}
              style={{
                alignSelf: "flex-start",
                background: "none",
                border: "none",
                color: C.muted,
                cursor: "pointer",
                fontSize: 13,
                textDecoration: "underline",
                marginBottom: 6,
                padding: 0
              }}
            >
              ← Back to phone entry
            </button>

            <FField label="Full Name *" v={name} on={e => setName(e.target.value)} ph="e.g. Rajiv Aggarwal" />
            <FField label="Email Address (Optional)" type="email" v={email} on={e => setEmail(e.target.value)} ph="e.g. name@example.com" />
            
            <Btn onClick={handleSignupBasicNext} full style={{ marginTop: 10 }}>
              Next: Phone Verification →
            </Btn>
          </div>
        </FWrap>
      )}

      {/* SIGNUP STEP 2 (Confirm overlay): Send SMS Code */}
      {mode === "signup-sms-confirm" && (
        <FWrap title="Confirm Mobile Number" sub="Verification step required to join the Sangat">
          <div style={{
            background: "rgba(212,151,42,0.04)",
            border: `1px dashed ${C.border}`,
            borderRadius: 12,
            padding: "24px 20px",
            fontSize: 14,
            lineHeight: 1.6,
            color: C.cream,
            marginBottom: 20
          }}>
            <h4 style={{ color: C.gold, fontSize: 16, margin: "0 0 10px 0", fontWeight: "bold" }}>Ready for SMS Verification</h4>
            <p style={{ margin: "0 0 12px 0" }}>
              We will send a one-time verification SMS code to:
            </p>
            <div style={{
              background: "rgba(0,0,0,0.18)",
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: "12px",
              fontSize: 18,
              fontWeight: "bold",
              color: C.gold,
              textAlign: "center",
              letterSpacing: "0.05em",
              marginBottom: 16
            }}>
              {formattedPhone}
            </div>
            <p style={{ margin: "0 0 12px 0", fontSize: 13, color: C.muted }}>
              Please confirm you can access this phone's SMS inbox right now to complete registration. 
              If you cannot, click <strong>"Go Back"</strong> to adjust the number.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Btn onClick={triggerSMSAuth} disabled={busy} full>
              {busy ? "Sending SMS…" : "Yes, Send Verification SMS →"}
            </Btn>
            <button
              type="button"
              onClick={() => setMode("signup-basic")}
              disabled={busy}
              style={{
                width: "100%",
                background: "none",
                border: `1px solid ${C.border}`,
                color: C.cream,
                padding: "11px 16px",
                borderRadius: 8,
                fontWeight: "bold",
                cursor: "pointer",
                fontSize: 14,
                fontFamily: "var(--font-headings)",
                outline: "none"
              }}
            >
              ← Go Back & Update Details
            </button>
          </div>
          <div id="recaptcha-container-register"></div>
        </FWrap>
      )}

      {/* SIGNUP STEP 2 (Active): SMS Code Entry */}
      {mode === "signup-sms-otp" && (
        <FWrap title="Verify Phone Code" sub="Enter the verification code sent to your phone">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ fontSize: 14, color: C.cream, textAlign: "center" }}>
              Verifying <strong>{phonePrefix} {phone}</strong>
            </p>

            <FField
              label="6-Digit Verification Code *"
              type="text"
              v={otpCode}
              on={e => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              ph="e.g. 123456"
              disabled={busy}
              style={{ textAlign: "center", fontSize: 20, letterSpacing: "0.2em", fontWeight: "bold" }}
            />

            <Btn onClick={handleConfirmRegisterSMS} disabled={busy} full>
              {busy ? "Confirming…" : "Confirm & Continue →"}
            </Btn>

            <div style={{ textAlign: "center", marginTop: 14, fontSize: 12, color: C.muted }}>
              Didn't receive it?{" "}
              {smsTimer > 0 ? (
                <span style={{ color: C.gold, fontWeight: "bold" }}>
                  Try again in {smsTimer}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={triggerSMSAuth}
                  disabled={busy}
                  style={{
                    background: "none",
                    border: "none",
                    color: C.gold,
                    cursor: "pointer",
                    textDecoration: "underline",
                    fontWeight: "bold",
                    padding: 0,
                    fontFamily: "var(--font-body)",
                    outline: "none"
                  }}
                >
                  Try again
                </button>
              )}
            </div>
          </div>
        </FWrap>
      )}

      {/* SIGNUP STEP 3: Guests (Optional / Skip) */}
      {mode === "signup-guests" && (
        <FWrap title="Family & Friends" sub="Step 3 of 5: Add guests you frequently attend Satsangs with">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ fontSize: 13, color: C.muted, margin: "0 0 10px 0" }}>
              Add your family or regular attendees here so you can easily include them when RSVPs open. You can skip this step and add them later from your Profile.
            </p>

            <div style={{
              background: "rgba(255,255,255,0.02)",
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: 16
            }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 12 }}>
                <div style={{ flex: "1 1 180px" }}>
                  <label style={{ display: "block", marginBottom: 4, fontSize: 11, color: C.gold }}>Name</label>
                  <input
                    style={{
                      background: C.card,
                      border: `1px solid ${C.border}`,
                      borderRadius: 6,
                      padding: "8px 12px",
                      color: C.cream,
                      fontSize: 13,
                      width: "100%",
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                    placeholder="e.g. Sonia Aggarwal"
                    value={newGuestName}
                    onChange={e => setNewGuestName(e.target.value)}
                  />
                </div>
                <div style={{ flex: "1 1 120px" }}>
                  <label style={{ display: "block", marginBottom: 4, fontSize: 11, color: C.gold }}>Relationship</label>
                  <select
                    style={{
                      background: C.card,
                      border: `1px solid ${C.border}`,
                      borderRadius: 6,
                      padding: "8px 12px",
                      color: C.cream,
                      fontSize: 13,
                      width: "100%",
                      outline: "none",
                      boxSizing: "border-box",
                      height: 33
                    }}
                    value={newGuestRel}
                    onChange={e => setNewGuestRel(e.target.value)}
                  >
                    {["Spouse", "Son", "Daughter", "Parent", "Sibling", "Friend", "Other"].map(r => (
                      <option key={r} value={r} style={{ background: C.bg }}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              {(newGuestRel === "Son" || newGuestRel === "Daughter") && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <input
                    type="checkbox"
                    id="guestIsChild"
                    checked={isChild}
                    onChange={e => setIsChild(e.target.checked)}
                    style={{ cursor: "pointer", width: 15, height: 15, accentColor: C.gold }}
                  />
                  <label htmlFor="guestIsChild" style={{ fontSize: 12, color: C.cream, cursor: "pointer", fontFamily: "sans-serif" }}>
                    10 years or younger (Child)
                  </label>
                </div>
              )}

              <Btn onClick={handleAddLocalGuest} style={{ padding: "8px 16px", fontSize: 12, height: 34 }}>
                + Add Guest
              </Btn>
            </div>

            {guests.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                <Label>Added Guests:</Label>
                {guests.map((g) => (
                  <div key={g.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px" }}>
                    <div>
                      <span style={{ fontWeight: "bold", fontSize: 13 }}>{g.name}</span>
                      <span style={{ color: C.gold, fontSize: 11, marginLeft: 8 }}>({g.relationship}{g.isChild ? ", Child" : ""})</span>
                    </div>
                    <button
                      onClick={() => handleRemoveLocalGuest(g.id)}
                      style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 12 }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 12, marginTop: 15 }}>
              <Btn onClick={() => setMode("signup-address")} full>
                Next Step →
              </Btn>
              <button
                onClick={() => setMode("signup-address")}
                style={{ flex: 1, background: "none", border: `1px solid ${C.border}`, color: C.cream, borderRadius: 8, cursor: "pointer", fontWeight: "bold", fontSize: 14 }}
              >
                Skip Step
              </button>
            </div>
          </div>
        </FWrap>
      )}

      {/* SIGNUP STEP 4: Address Details (Optional / Skip) */}
      {mode === "signup-address" && (
        <FWrap title="Where Do You Live?" sub="Step 4 of 5: Helping locate nearest Satsangs in your area">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ fontSize: 13, color: C.muted, margin: "0 0 10px 0" }}>
              Providing your address allows us to calculate proximity to local Satsangs or prefill location data if you host a Satsang. You can skip this step completely.
            </p>

            <FField label="Address Line 1" v={addressLine1} on={e => setAddressLine1(e.target.value)} ph="e.g. 123 Darbar Street" />
            <FField label="Address Line 2 (Optional)" v={addressLine2} on={e => setAddressLine2(e.target.value)} ph="e.g. Flat 4B" />
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <FField label="City" v={city} on={e => setCity(e.target.value)} ph="e.g. London" />
              <FField label="Zip / Postal Code" v={postcode} on={e => setPostcode(e.target.value)} ph={postcodePlaceholder} />
            </div>

            <FField label="State / Region" v={state} on={e => setState(e.target.value)} ph="e.g. Punjab" />

            <div style={{ display: "flex", gap: 12, marginTop: 15 }}>
              <Btn onClick={() => setMode("signup-pin")} full>
                Next Step →
              </Btn>
              <button
                onClick={() => {
                  setAddressLine1("");
                  setAddressLine2("");
                  setAddressLine3("");
                  setCity("");
                  setState("");
                  setPostcode("");
                  setMode("signup-pin");
                }}
                style={{ flex: 1, background: "none", border: `1px solid ${C.border}`, color: C.cream, borderRadius: 8, cursor: "pointer", fontWeight: "bold", fontSize: 14 }}
              >
                Skip Step
              </button>
            </div>
          </div>
        </FWrap>
      )}

      {/* SIGNUP STEP 5: PIN Setup */}
      {mode === "signup-pin" && (
        <FWrap title="Secure Your Account" sub="Step 5 of 5: Create a 6-digit security PIN">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ fontSize: 13, color: C.muted, margin: "0 0 10px 0" }}>
              Set up a secure 6-digit numerical PIN. This will allow you to access your Sangat account quickly from any phone or device.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <Label>Create PIN *</Label>
                <input
                  type="password"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  maxLength={6}
                  value={signupPin}
                  onChange={e => setSignupPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="e.g. 123456"
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
                    textAlign: "center"
                  }}
                />
              </div>

              <div>
                <Label>Confirm PIN *</Label>
                <input
                  type="password"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  maxLength={6}
                  value={signupConfirmPin}
                  onChange={e => setSignupConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="e.g. 123456"
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
                    textAlign: "center"
                  }}
                />
              </div>
            </div>

            <Btn onClick={handleFinalSubmit} disabled={busy} full style={{ marginTop: 15 }}>
              {busy ? "Finalizing Account…" : "Finalize & Register 🙏"}
            </Btn>
          </div>
        </FWrap>
      )}
    </div>
  );
}
