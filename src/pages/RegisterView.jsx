import { useState, useEffect } from "react";
import { validateAddressWithGoogle } from "../utils/geoUtils";
import { signInWithGoogle } from "../firebase/auth";
import { createUserProfile } from "../firebase/firestore";
import { auth, functions } from "../firebase/config";
import { httpsCallable } from "firebase/functions";
import { C, SANGAT_COUNTRIES, COUNTRY_PHONE_EXAMPLES, COUNTRY_DIAL_CODES, normalizePhoneWithCountry } from "../utils/constants";
import FWrap from "../components/ui/FWrap";
import FField from "../components/ui/FField";
import Label from "../components/ui/Label";
import Btn from "../components/ui/Btn";

export default function RegisterView({ nav, notify, user, ipCountry }) {
  const [googleUser, setGoogleUser] = useState(null);
  const [f, setF] = useState({
    name: "",
    email: "",
    phone: "",
    phonePrefix: "+44",
    addressLine1: "",
    addressLine2: "",
    addressLine3: "",
    state: "",
    city: "",
    postcode: "",
    country: "United Kingdom",
    customCountry: "",
  });
  const [busy, setBusy] = useState(false);
  const [guests, setGuests] = useState([]);
  const [newGuestName, setNewGuestName] = useState("");
  const [newGuestRel, setNewGuestRel] = useState("Spouse");
  const [isChild, setIsChild] = useState(false);

  // Phone Auth verification state for manual registration
  const [smsSent, setSmsSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);

  // Pre-verification confirmation modal state
  const [confirmSms, setConfirmSms] = useState(false);
  const [geoCoords, setGeoCoords] = useState(null);
  const [smsTimer, setSmsTimer] = useState(0);

  // Clean up reCAPTCHA verifier on unmount
  useEffect(() => {
    return () => {
      if (window.recaptchaVerifierRegister) {
        try {
          window.recaptchaVerifierRegister.clear();
        } catch (e) {
          console.warn("reCAPTCHA clear failed on register unmount", e);
        }
        window.recaptchaVerifierRegister = null;
      }
    };
  }, []);

  // SMS Countdown timer
  useEffect(() => {
    if (smsTimer > 0) {
      const t = setTimeout(() => setSmsTimer(smsTimer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [smsTimer]);

  useEffect(() => {
    if (user && !googleUser) {
      setGoogleUser(user);
      
      let phoneVal = "";
      let prefixVal = "+44";
      if (user.phoneNumber) {
        const cleaned = user.phoneNumber.replace(/[^\d+]/g, "");
        const matchedPrefix = SANGAT_COUNTRIES.map(c => COUNTRY_DIAL_CODES[c])
          .filter(code => code)
          .sort((a, b) => b.toString().length - a.toString().length)
          .find(code => cleaned.startsWith(`+${code}`));
        
        if (matchedPrefix) {
          prefixVal = `+${matchedPrefix}`;
          phoneVal = cleaned.slice(matchedPrefix.toString().length + 1);
        } else {
          phoneVal = cleaned;
        }
      }

      setF(prev => ({
        ...prev,
        name: user.displayName || prev.name,
        email: user.email || prev.email,
        phone: phoneVal || prev.phone,
        phonePrefix: phoneVal ? prefixVal : prev.phonePrefix
      }));
    }
  }, [user, googleUser]);

  useEffect(() => {
    if (ipCountry) {
      const dial = COUNTRY_DIAL_CODES[ipCountry] || "44";
      setF(prev => ({
        ...prev,
        phonePrefix: `+${dial}`,
        country: SANGAT_COUNTRIES.includes(ipCountry) ? ipCountry : "Other",
        customCountry: SANGAT_COUNTRIES.includes(ipCountry) ? "" : ipCountry
      }));
    }
  }, [ipCountry]);

  // Prefill phone details from Login redirect if present
  useEffect(() => {
    const prefilledPhone = sessionStorage.getItem("prefill_phone");
    const prefilledPrefix = sessionStorage.getItem("prefill_phone_prefix");
    if (prefilledPhone) {
      setF(prev => ({
        ...prev,
        phone: prefilledPhone,
        phonePrefix: prefilledPrefix || prev.phonePrefix
      }));
      sessionStorage.removeItem("prefill_phone");
      sessionStorage.removeItem("prefill_phone_prefix");
    }
  }, []);

  // Hash PIN client-side using SHA-256 for Google pre-verified users
  const hashPinClient = async (plainPin) => {
    const msgUint8 = new TextEncoder().encode(plainPin.trim());
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  };

  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));

  const handleGoogleSignUp = async () => {
    setBusy(true);
    try {
      const { user: authedUser, isNewProfile } = await signInWithGoogle();
      if (!isNewProfile) {
        nav("find");
      } else {
        setGoogleUser(authedUser);
        setF(prev => ({
          ...prev,
          name: authedUser.displayName || "",
          email: authedUser.email || ""
        }));
      }
    } catch (err) {
      notify(err.message.replace("Firebase:", "").trim(), "err");
    }
    setBusy(false);
  };

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

  const submit = async () => {
    const targetCountry = f.country === "Other" ? f.customCountry.trim() : f.country;
    
    if (!f.name.trim() || !f.email.trim() || !f.phone.trim() || !f.addressLine1.trim() || !f.city.trim() || !f.postcode.trim() || !targetCountry) {
      notify("Please fill all required fields", "err");
      return;
    }

    if (!pin || pin.length !== 6 || isNaN(pin)) {
      notify("Please enter a valid 6-digit numerical PIN", "err");
      return;
    }

    if (pin !== confirmPin) {
      notify("PINs do not match", "err");
      return;
    }
    
    setBusy(true);
    try {
      const valResult = await validateAddressWithGoogle({
        addressLine1: f.addressLine1.trim(),
        addressLine2: f.addressLine2.trim(),
        addressLine3: f.addressLine3.trim(),
        city: f.city.trim(),
        state: f.state.trim(),
        postcode: f.postcode.trim(),
        country: targetCountry
      });
      
      if (!valResult.valid) {
        notify(valResult.error, "err");
        setBusy(false);
        return;
      }
      
      const latitude = valResult.lat || null;
      const longitude = valResult.lng || null;
      setGeoCoords({ lat: latitude, lng: longitude });

      // Determine if this Google user has a pre-verified phone number
      const hasPreverifiedPhone = !!(googleUser && googleUser.phoneNumber);
      const formattedPhone = hasPreverifiedPhone ? googleUser.phoneNumber : normalizePhoneWithCountry(f.phonePrefix + f.phone, targetCountry);
      
      // Verify phone uniqueness securely
      const checkPhoneAvailability = httpsCallable(functions, "checkPhoneAvailability");
      const phoneCheckRes = await checkPhoneAvailability({ phone: formattedPhone });
      
      if (!phoneCheckRes.data.available) {
        notify("This phone number is already registered with another Sangat profile! Please log in or check the number.", "err");
        setBusy(false);
        return;
      }
      
      if (hasPreverifiedPhone) {
        // Complete Google Profile Creation directly (skipping SMS OTP verification)
        const pinHash = await hashPinClient(pin);
        await createUserProfile(googleUser.uid, {
          email: f.email.trim(),
          name: f.name.trim(),
          phone: formattedPhone,
          addressLine1: f.addressLine1.trim(),
          addressLine2: f.addressLine2.trim(),
          addressLine3: f.addressLine3.trim(),
          state: f.state.trim(),
          city: f.city.trim(),
          postcode: f.postcode.trim(),
          country: targetCountry,
          latitude,
          longitude,
          guests,
          pinHash,
          showOnCommunityMap: true
        });
        notify(`Jai Guruji! Welcome to the Sangat, ${f.name} 🙏`);
        nav("find");
      } else {
        // Show confirmation before sending SMS OTP
        setConfirmSms(true);
      }
    } catch (e) { 
      notify(e.message.replace("Firebase:", "").trim(), "err"); 
    }
    setBusy(false);
  };

  const triggerSMSAuth = async () => {
    setBusy(true);
    try {
      const targetCountry = f.country === "Other" ? f.customCountry.trim() : f.country;
      const formattedPhone = normalizePhoneWithCountry(f.phonePrefix + f.phone, targetCountry);
      const { RecaptchaVerifier, signInWithPhoneNumber } = await import("firebase/auth");
      
      if (window.recaptchaVerifierRegister) {
        try {
          window.recaptchaVerifierRegister.clear();
        } catch (e) {
          console.warn("reCAPTCHA clear failed in triggerSMSAuth", e);
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
      setConfirmSms(false);
      setSmsTimer(120);
      notify("Verification SMS sent! Please enter the code to register.", "ok");
    } catch (e) {
      console.error("Firebase SMS Auth error detail:", e);
      const errCode = e.code || "unknown-error";
      const errText = e.message ? e.message.replace("Firebase:", "").trim() : "Unknown authentication error";
      notify(`${errCode}: ${errText}`, "err");
      if (window.recaptchaVerifierRegister) {
        window.recaptchaVerifierRegister.clear();
        window.recaptchaVerifierRegister = null;
      }
    }
    setBusy(false);
  };

  const handleConfirmRegisterSMS = async () => {
    const trimmedCode = otp.trim();
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
      const targetCountry = f.country === "Other" ? f.customCountry.trim() : f.country;
      let latitude = geoCoords?.lat || null;
      let longitude = geoCoords?.lng || null;
      
      if (!geoCoords) {
        const valResult = await validateAddressWithGoogle({
          addressLine1: f.addressLine1.trim(),
          addressLine2: f.addressLine2.trim(),
          addressLine3: f.addressLine3.trim(),
          city: f.city.trim(),
          state: f.state.trim(),
          postcode: f.postcode.trim(),
          country: targetCountry
        });
        latitude = valResult.lat || null;
        longitude = valResult.lng || null;
      }
      
      const formattedPhone = normalizePhoneWithCountry(f.phonePrefix + f.phone, targetCountry);

      let targetUid = "";
      if (googleUser) {
        // Google Profile Completion: Link Phone Number to Google account
        const { PhoneAuthProvider, linkWithCredential } = await import("firebase/auth");
        const credential = PhoneAuthProvider.credential(confirmationResult.verificationId, trimmedCode);
        await linkWithCredential(auth.currentUser, credential);
        targetUid = googleUser.uid;
      } else {
        // Manual registration: Confirm OTP code to sign in via Phone Auth
        const result = await confirmationResult.confirm(trimmedCode);
        targetUid = result.user.uid;
      }

      // Hash PIN client-side
      const pinHash = await hashPinClient(pin);

      // Create profile document in Firestore
      await createUserProfile(targetUid, {
        email: f.email.trim(),
        name: f.name.trim(),
        phone: formattedPhone,
        addressLine1: f.addressLine1.trim(),
        addressLine2: f.addressLine2.trim(),
        addressLine3: f.addressLine3.trim(),
        state: f.state.trim(),
        city: f.city.trim(),
        postcode: f.postcode.trim(),
        country: targetCountry,
        latitude,
        longitude,
        guests,
        pinHash,
        showOnCommunityMap: true
      });

      notify(`Jai Guruji! Welcome to the Sangat, ${f.name} 🙏`);
      nav("find");
    } catch (e) {
      notify(e.message.replace("Firebase:", "").trim(), "err");
    }
    setBusy(false);
  };

  const selectedCountry = f.country;
  const dialCode = COUNTRY_DIAL_CODES[selectedCountry];
  const phoneHelpText = selectedCountry === "Other"
    ? "⚠️ Please enter country code starting with '+' e.g. +353871234567"
    : `⚠️ Please enter country code (e.g. +${COUNTRY_PHONE_EXAMPLES[selectedCountry]}), otherwise it will be prefixed with +${dialCode} by default.`;

  let postcodePlaceholder = "e.g. Zip or Postal Code";
  if (selectedCountry === "United Kingdom") postcodePlaceholder = "e.g. EN4 0DU";
  else if (selectedCountry === "India") postcodePlaceholder = "e.g. 110001";
  else if (selectedCountry === "United States") postcodePlaceholder = "e.g. 90210";
  else if (selectedCountry === "Canada") postcodePlaceholder = "e.g. K1A 0B1";

  // Render SMS Verification UI if OTP requested
  if (confirmSms) {
    const targetCountry = f.country === "Other" ? f.customCountry.trim() : f.country;
    const formattedPhone = normalizePhoneWithCountry(f.phonePrefix + f.phone, targetCountry);
    return (
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
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
              If you cannot, or if there is a typo, click <strong>"Go Back & Update"</strong> to change the number without losing your form details.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Btn onClick={triggerSMSAuth} disabled={busy} full>
              {busy ? "Sending SMS…" : "Yes, Send Verification SMS →"}
            </Btn>
            <button
              type="button"
              onClick={() => setConfirmSms(false)}
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
              ← Go Back & Update Number
            </button>
          </div>
        </FWrap>
        <div id="recaptcha-container-register"></div>
      </div>
    );
  }

  if (smsSent) {
    return (
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <FWrap title="Confirm Registration" sub="Enter the verification code sent to your phone">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ fontSize: 14, color: C.cream, textAlign: "center" }}>
              Verifying <strong>{f.phonePrefix} {f.phone}</strong>
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

            <Btn onClick={handleConfirmRegisterSMS} disabled={busy} full>
              {busy ? "Confirming…" : "Confirm & Register →"}
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
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 520, margin: "0 auto" }}>
      <FWrap title={googleUser ? "Complete Your Profile" : "Join the Sangat"} sub={googleUser ? "Provide the remaining details to finalize registration" : "Create your account to find and host Satsangs"}>
        {/* Google Sign-up */}
        {!googleUser && (
          <div style={{ marginBottom: 24, display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              type="button"
              onClick={handleGoogleSignUp}
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
                transition: "transform 0.1s ease",
                fontFamily: "var(--font-headings)"
              }}
              onMouseOver={e => e.currentTarget.style.transform = "translateY(-1px)"}
              onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
              Sign Up with Google
            </button>
            
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", margin: "10px 0" }}>
              <div style={{ height: 1, background: C.border, flex: 1 }} />
              <span style={{ padding: "0 10px", color: C.muted, fontSize: 12 }}>or fill in details below</span>
              <div style={{ height: 1, background: C.border, flex: 1 }} />
            </div>
          </div>
        )}

        {googleUser && (
          <div style={{
            background: "rgba(212,151,42,0.06)",
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: "12px 16px",
            color: C.cream,
            fontSize: 14,
            marginBottom: 20,
            textAlign: "center"
          }}>
            ✅ Google Account Authenticated: <strong>{googleUser.email}</strong>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <FField label="Full Name *" v={f.name} on={set("name")} />
          
          <div style={{ marginBottom: 18 }}>
            <Label>Country *</Label>
            <select
              value={f.country}
              onChange={set("country")}
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
                <option key={cName} value={cName} style={{ background: C.bg }}>{cName}</option>
              ))}
            </select>
          </div>
        </div>

        {selectedCountry === "Other" && (
          <FField label="Enter Country Name *" v={f.customCountry} on={set("customCountry")} ph="e.g. Ireland" />
        )}

        <div style={{ marginBottom: 18 }}>
          <Label>Mobile Number *</Label>
          <div style={{ display: "flex", gap: 10 }}>
            <select
              value={f.phonePrefix}
              onChange={e => setF(prev => ({ ...prev, phonePrefix: e.target.value }))}
              disabled={!!(googleUser && googleUser.phoneNumber)}
              style={{
                width: 140,
                background: (googleUser && googleUser.phoneNumber) ? "rgba(255,255,255,0.02)" : C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: "11px 14px",
                color: (googleUser && googleUser.phoneNumber) ? C.muted : C.cream,
                fontSize: 15,
                fontFamily: "var(--font-body)",
                outline: "none",
                boxSizing: "border-box",
                height: 45,
                cursor: (googleUser && googleUser.phoneNumber) ? "not-allowed" : "default"
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
              value={f.phone}
              onChange={e => setF(prev => ({ ...prev, phone: e.target.value.replace(/[^\d]/g, "") }))}
              placeholder="e.g. 7700900077"
              disabled={!!(googleUser && googleUser.phoneNumber)}
              style={{
                flex: 1,
                background: (googleUser && googleUser.phoneNumber) ? "rgba(255,255,255,0.02)" : C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: "11px 14px",
                color: (googleUser && googleUser.phoneNumber) ? C.muted : C.cream,
                fontSize: 15,
                fontFamily: "var(--font-body)",
                outline: "none",
                boxSizing: "border-box",
                height: 45,
                cursor: (googleUser && googleUser.phoneNumber) ? "not-allowed" : "text"
              }}
            />
          </div>
          <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>
            ⚠️ Future logins will use this mobile number via Phone + PIN or WhatsApp OTP.
          </div>
        </div>

        {/* Secure PIN setup for all modes */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 18 }}>
          <div>
            <Label>Secure Account PIN *</Label>
            <input
              type="password"
              pattern="[0-9]*"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-digit PIN"
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
                letterSpacing: "0.2em"
              }}
            />
          </div>
          <div>
            <Label>Confirm Secure PIN *</Label>
            <input
              type="password"
              pattern="[0-9]*"
              inputMode="numeric"
              maxLength={6}
              value={confirmPin}
              onChange={e => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Confirm PIN"
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
                letterSpacing: "0.2em"
              }}
            />
          </div>
        </div>

        <FField label="Address Line 1 *" v={f.addressLine1} on={set("addressLine1")} ph="Street address, P.O. box, company name" />
        <FField label="Address Line 2 (Optional)" v={f.addressLine2} on={set("addressLine2")} ph="Apartment, suite, unit, building, floor, etc." />
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <FField label="Address Line 3 (Optional)" v={f.addressLine3} on={set("addressLine3")} ph="Sublocality, landmark" />
          <FField label="State / County / Region" v={f.state} on={set("state")} ph="e.g. Punjab" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <FField label="City *" v={f.city} on={set("city")} />
          <FField label="Zip / Postal Code *" v={f.postcode} on={set("postcode")} ph={postcodePlaceholder} />
        </div>

        <FField label="Email Address *" type="email" v={f.email} on={set("email")} disabled={!!googleUser} />

        {/* Subtle Guest/Child Registration Form */}
        <div style={{
          background: "rgba(212,151,42,0.03)",
          border: `1px dashed rgba(212,151,42,0.25)`,
          borderRadius: 10,
          padding: "16px 20px",
          margin: "8px 0 20px 0",
          fontSize: 13,
          lineHeight: 1.6,
          color: C.muted
        }}>
          <span style={{ color: C.gold, fontWeight: 700, display: "block", marginBottom: 6 }}>Add Family and Friends</span>
          <p style={{ margin: "0 0 12px 0", fontSize: 12, lineHeight: 1.5 }}>
            Add your family, children, or regular guests here to include them in your profile. You can easily include them when registering for a Satsang.
          </p>
          
          {/* Inline Guest Inputs */}
          <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: "1 1 180px" }}>
              <label style={{ display: "block", marginBottom: 4, fontSize: 10, color: C.gold, letterSpacing: "0.05em", fontFamily: "sans-serif" }}>Name</label>
              <input
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  padding: "7px 10px",
                  color: C.cream,
                  fontSize: 13,
                  width: "100%",
                  outline: "none",
                  boxSizing: "border-box"
                }}
                placeholder="e.g. Rajiv Aggarwal"
                value={newGuestName}
                onChange={e => setNewGuestName(e.target.value)}
              />
            </div>
            <div style={{ flex: "1 1 120px" }}>
              <label style={{ display: "block", marginBottom: 4, fontSize: 10, color: C.gold, letterSpacing: "0.05em", fontFamily: "sans-serif" }}>Relationship</label>
              <select
                style={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  padding: "7px 10px",
                  color: C.cream,
                  fontSize: 13,
                  width: "100%",
                  outline: "none",
                  boxSizing: "border-box",
                  height: 31
                }}
                value={newGuestRel}
                onChange={e => setNewGuestRel(e.target.value)}
              >
                {["Spouse", "Son", "Daughter", "Parent", "Sibling", "Friend", "Other"].map(r => (
                  <option key={r} value={r} style={{ background: C.bg }}>{r}</option>
                ))}
              </select>
            </div>
            {/* Child Checkbox */}
            {(newGuestRel === "Son" || newGuestRel === "Daughter") && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flex: "1 1 100%" }}>
                <input
                  type="checkbox"
                  id="registerIsChild"
                  checked={isChild}
                  onChange={e => setIsChild(e.target.checked)}
                  style={{ cursor: "pointer", width: 16, height: 16, accentColor: C.gold }}
                />
                <label htmlFor="registerIsChild" style={{ fontSize: 13, color: C.cream, cursor: "pointer", fontFamily: "sans-serif" }}>
                  10 years or younger (Child)
                </label>
              </div>
            )}

            <button
              type="button"
              onClick={handleAddLocalGuest}
              style={{
                background: "none",
                color: C.gold,
                border: `1px solid ${C.gold}`,
                borderRadius: 6,
                padding: "6px 14px",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
                height: 31,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                boxSizing: "border-box"
              }}
            >
              + Add
            </button>
          </div>

          {/* Local Guest List */}
          {guests.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
              {guests.map((g) => (
                <div key={g.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.02)", border: `1px solid rgba(212,151,42,0.15)`, borderRadius: 6, padding: "8px 12px" }}>
                  <div>
                    <span style={{ fontWeight: 600, color: C.cream, fontSize: 13 }}>{g.name}</span>
                    <span style={{ fontSize: 11, color: C.gold, textTransform: "uppercase", letterSpacing: "0.05em", marginLeft: 8, display: "inline-flex", alignItems: "center", gap: 6 }}>
                      {g.relationship}
                      {g.isChild && (
                        <span style={{
                          color: C.bg,
                          background: C.gold,
                          fontSize: 8,
                          fontWeight: "bold",
                          padding: "1px 5px",
                          borderRadius: 6,
                          textTransform: "uppercase",
                          fontFamily: "sans-serif",
                          lineHeight: 1
                        }}>
                          Child
                        </span>
                      )}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveLocalGuest(g.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: C.saffron,
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: "bold",
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: C.muted, fontStyle: "italic", marginTop: 8, textAlign: "center" }}>
              No family members or guests added yet.
            </div>
          )}
        </div>

        <Btn onClick={submit} disabled={busy} full>
          {busy
            ? (googleUser ? "Completing profile…" : "Processing…")
            : (googleUser 
                ? (googleUser.phoneNumber ? "Complete Profile →" : "Verify & Complete Profile →")
                : "Verify & Register →")}
        </Btn>

        {!googleUser && (
          <p style={{ textAlign: "center", color: C.muted, fontSize: 14, marginTop: 20 }}>
            Already registered?{" "}
            <button
              onClick={() => nav("login")}
              style={{ background: "none", border: "none", color: C.gold, cursor: "pointer", textDecoration: "underline" }}
            >
              Login here
            </button>
          </p>
        )}
      </FWrap>
      <div id="recaptcha-container-register"></div>
    </div>
  );
}
