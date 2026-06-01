import { useState } from "react";
import { validateAddressWithGoogle } from "../utils/geoUtils";
import { registerUser } from "../firebase/auth";
import { C, SANGAT_COUNTRIES, COUNTRY_PHONE_EXAMPLES, COUNTRY_DIAL_CODES, normalizePhoneWithCountry } from "../utils/constants";
import FWrap from "../components/ui/FWrap";
import FField from "../components/ui/FField";
import Label from "../components/ui/Label";
import Btn from "../components/ui/Btn";

export default function RegisterView({ nav, notify }) {
  const [f, setF] = useState({
    name: "",
    email: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    addressLine3: "",
    state: "",
    city: "",
    postcode: "",
    country: "United Kingdom",
    customCountry: "",
    password: "",
    confirm: ""
  });
  const [busy, setBusy] = useState(false);
  const [guests, setGuests] = useState([]);
  const [newGuestName, setNewGuestName] = useState("");
  const [newGuestRel, setNewGuestRel] = useState("Spouse");
  const [isChild, setIsChild] = useState(false);

  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));

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
    if (!f.name.trim() || !f.email.trim() || !f.phone.trim() || !f.addressLine1.trim() || !f.city.trim() || !f.postcode.trim() || !targetCountry || !f.password) {
      notify("Please fill all required fields", "err");
      return;
    }
    if (f.password !== f.confirm) { notify("Passwords do not match", "err"); return; }
    if (f.password.length < 6) { notify("Password must be at least 6 characters", "err"); return; }
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
      
      const formattedPhone = normalizePhoneWithCountry(f.phone, targetCountry);
      
      await registerUser({
        email: f.email.trim(),
        password: f.password,
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
        guests
      });
      notify(`Jai Guruji! Welcome to the Sangat, ${f.name} 🙏`);
      nav("find");
    } catch (e) { notify(e.message.replace("Firebase:", "").trim(), "err"); }
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

  return (
    <FWrap title="Join the Sangat" sub="Create your account to find and host Satsangs">
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
              fontFamily: "Georgia,serif",
              outline: "none",
              boxSizing: "border-box",
              height: 45
            }}
          >
            {SANGAT_COUNTRIES.map(c => (
              <option key={c} value={c} style={{ background: C.bg }}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {f.country === "Other" && (
        <FField label="Custom Country Name *" v={f.customCountry} on={set("customCountry")} ph="e.g. Ireland" />
      )}

      <div style={{ marginBottom: 18 }}>
        <FField label="Phone Number *" type="tel" v={f.phone} on={set("phone")} ph={`e.g. +${COUNTRY_PHONE_EXAMPLES[selectedCountry] || "353871234567"}`} />
        <div style={{ color: C.muted, fontSize: 11, marginTop: -12, marginBottom: 14 }}>{phoneHelpText}</div>
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

      <FField label="Email Address *" type="email" v={f.email} on={set("email")} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <FField label="Password *" type="password" v={f.password} on={set("password")} />
        <FField label="Confirm Password *" type="password" v={f.confirm} on={set("confirm")} />
      </div>

      {/* Subtle & Compelling Guest/Child Registration Form */}
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
          
          {/* Child Checkbox for Join Sangat page */}
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
                12 or younger (Child)
              </label>
            </div>
          )}
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

      <Btn onClick={submit} disabled={busy} full>{busy ? "Creating account…" : "Create Account →"}</Btn>
      <p style={{ textAlign: "center", color: C.muted, fontSize: 14, marginTop: 20 }}>
        Already registered?{" "}
        <button
          onClick={() => nav("login")}
          style={{ background: "none", border: "none", color: C.gold, cursor: "pointer", textDecoration: "underline" }}
        >
          Login here
        </button>
      </p>
    </FWrap>
  );
}
