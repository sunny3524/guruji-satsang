import { useState, useEffect } from "react";
import { validateAddressWithGoogle } from "../utils/geoUtils";
import { createSatsang } from "../firebase/firestore";
import { C, SANGAT_COUNTRIES, STANDARD_SEVAS } from "../utils/constants";
import FWrap from "../components/ui/FWrap";
import FField from "../components/ui/FField";
import Label from "../components/ui/Label";
import Btn from "../components/ui/Btn";
import Empty from "../components/ui/Empty";

export default function PostView({ user, profile, nav, notify, onRefresh }) {
  const [f, setF] = useState({
    title: "",
    addressLine1: "",
    addressLine2: "",
    addressLine3: "",
    state: "",
    city: "",
    postcode: "",
    country: profile?.country || "United Kingdom",
    customCountry: "",
    date: "",
    time: "",
    maxAttendees: 100,
    description: ""
  });
  const [chosenSv, setChosenSv] = useState([]);
  const [showSevaPanel, setShowSevaPanel] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("guruji.showSevaPanel") === "true";
  });
  const [busy, setBusy] = useState(false);
  const [useProfileAddress, setUseProfileAddress] = useState(false);
  
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));

  const handleAddressFieldChange = k => e => {
    setUseProfileAddress(false);
    setF(p => ({ ...p, [k]: e.target.value }));
  };

  const handleUseProfileAddressChange = (e) => {
    const checked = e.target.checked;
    setUseProfileAddress(checked);
    if (checked && profile) {
      setF(p => ({
        ...p,
        addressLine1: profile.addressLine1 || "",
        addressLine2: profile.addressLine2 || "",
        addressLine3: profile.addressLine3 || "",
        state: profile.state || "",
        city: profile.city || "",
        postcode: profile.postcode || "",
        country: profile.country || "United Kingdom",
        customCountry: profile.country === "Other" ? (profile.customCountry || "") : ""
      }));
    } else {
      setF(p => ({
        ...p,
        addressLine1: "",
        addressLine2: "",
        addressLine3: "",
        state: "",
        city: "",
        postcode: "",
        country: "United Kingdom",
        customCountry: ""
      }));
    }
  };

  const ukTimeStr = new Date().toLocaleString("sv-SE", { timeZone: "Europe/London" });
  const currentDate = ukTimeStr.replace(",", "").trim().split(/\s+/)[0];

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("guruji.showSevaPanel", showSevaPanel ? "true" : "false");
  }, [showSevaPanel]);

  if (!user) {
    return (
      <Empty>
        <p>Please login to host a Satsang.</p>
        <Btn onClick={() => nav("login")}>Login →</Btn>
      </Empty>
    );
  }

  const toggleSv = id => setChosenSv(p => p.find(x => x.id === id) ? p.filter(x => x.id !== id) : [...p, { id, needed: 2, confirmed: 0 }]);
  const setNd = (id, v) => setChosenSv(p => p.map(x => x.id === id ? { ...x, needed: +v, confirmed: Math.min(x.confirmed || 0, +v) } : x));

  const submit = async () => {
    const targetCountry = f.country === "Other" ? f.customCountry.trim() : f.country;
    if (!f.title || !f.addressLine1.trim() || !f.city.trim() || !f.postcode.trim() || !targetCountry || !f.date || !f.time) {
      notify("Please fill all required fields", "err");
      return;
    }
    const checkTimeStr = new Date().toLocaleString("sv-SE", { timeZone: "Europe/London" });
    const cleanStr = checkTimeStr.replace(",", "");
    const parts = cleanStr.trim().split(/\s+/);
    const checkDate = parts[0];
    const checkTime = parts[1] ? parts[1].substring(0, 5) : "";
    if (f.date < checkDate || (f.date === checkDate && f.time < checkTime)) {
      notify("Cannot host a Satsang in the past. Please select a future date and time.", "err");
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

      const sevas = chosenSv.reduce((acc, sv) => ({
        ...acc,
        [sv.id]: { id: sv.id, needed: sv.needed, opted: 0, confirmed: sv.confirmed || 0, enrolled: [] }
      }), {});
      
      await createSatsang({
        title: f.title,
        description: f.description,
        addressLine1: f.addressLine1.trim(),
        addressLine2: f.addressLine2.trim(),
        addressLine3: f.addressLine3.trim(),
        state: f.state.trim(),
        city: f.city.trim(),
        postcode: f.postcode.trim(),
        country: targetCountry,
        date: f.date,
        time: f.time,
        maxAttendees: +f.maxAttendees,
        sevas,
        latitude,
        longitude,
        organizerName: profile?.name || user.displayName,
        organizerEmail: user.email,
        organizerPhone: profile?.phone || "",
      }, user.uid);
      onRefresh();
      notify("Satsang posted! Shukrana Guruji 🙏");
      nav("find");
    } catch (e) { notify(e.message, "err"); }
    setBusy(false);
  };

  const selectedCountry = f.country;
  let postcodePlaceholder = "e.g. Zip or Postal Code";
  if (selectedCountry === "United Kingdom") postcodePlaceholder = "e.g. EN4 0DU";
  else if (selectedCountry === "India") postcodePlaceholder = "e.g. 110001";
  else if (selectedCountry === "United States") postcodePlaceholder = "e.g. 90210";
  else if (selectedCountry === "Canada") postcodePlaceholder = "e.g. K1A 0B1";

  return (
    <FWrap title="Host a Satsang" sub="Open your home to Guruji's Sangat">
      <FField label="Satsang Title *" v={f.title} on={set("title")} ph="e.g. Shivratri Satsang" />
      <FField label="Description" v={f.description} on={set("description")} ph="Brief description…" />
      
      {/* Auto-populate Profile Address Option */}
      {profile && (profile.addressLine1 || profile.city) && (
        <div style={{
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "rgba(212, 151, 42, 0.08)",
          border: `1px solid rgba(212, 151, 42, 0.25)`,
          borderRadius: 8,
          padding: "12px 16px"
        }}>
          <input
            type="checkbox"
            id="useProfileAddress"
            checked={useProfileAddress}
            onChange={handleUseProfileAddressChange}
            style={{ width: 18, height: 18, cursor: "pointer", accentColor: C.gold }}
          />
          <label htmlFor="useProfileAddress" style={{ color: C.gold, fontSize: 14, fontWeight: 700, cursor: "pointer", userSelect: "none" }}>
            Use my profile address as the Satsang venue
          </label>
        </div>
      )}

      {/* Country Select */}
      <div style={{ marginBottom: 18 }}>
        <Label>Country *</Label>
        <select
          value={f.country}
          onChange={(e) => {
            setUseProfileAddress(false);
            setF(p => ({ ...p, country: e.target.value }));
          }}
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
          {SANGAT_COUNTRIES.map(c => (
            <option key={c} value={c} style={{ background: C.bg }}>{c}</option>
          ))}
        </select>
      </div>

      {f.country === "Other" && (
        <FField label="Custom Country Name *" v={f.customCountry} on={handleAddressFieldChange("customCountry")} ph="e.g. Ireland" />
      )}

      <FField label="Venue Address Line 1 *" v={f.addressLine1} on={handleAddressFieldChange("addressLine1")} ph="Street address, P.O. box, building" />
      <FField label="Venue Address Line 2 (Optional)" v={f.addressLine2} on={handleAddressFieldChange("addressLine2")} ph="Apartment, suite, unit, etc." />
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <FField label="Venue Address Line 3 (Optional)" v={f.addressLine3} on={handleAddressFieldChange("addressLine3")} ph="Sublocality, landmark" />
        <FField label="State / County / Region" v={f.state} on={handleAddressFieldChange("state")} ph="e.g. Punjab" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <FField label="City *" v={f.city} on={handleAddressFieldChange("city")} />
        <FField label="Zip / Postal Code *" v={f.postcode} on={handleAddressFieldChange("postcode")} ph={postcodePlaceholder} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <FField label="Date *" type="date" v={f.date} on={set("date")} min={currentDate} />
        <FField label="Time *" type="time" v={f.time} on={set("time")} />
      </div>
      <FField label="Max Attendees *" type="number" v={f.maxAttendees} on={set("maxAttendees")} />

      <div style={{ marginTop: 26 }}>
        <button
          onClick={() => setShowSevaPanel(p => !p)}
          style={{
            background: "none",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 10,
            width: "100%",
            padding: "16px 20px",
            textAlign: "left",
            color: C.cream,
            cursor: "pointer",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Choose the sevas needed for the satsang</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>Open this section only if you want to assign seva roles.</div>
          </div>
          <span style={{ fontSize: 18, transform: showSevaPanel ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .2s" }}>▼</span>
        </button>

        <div className={`panel-collapse ${showSevaPanel ? "open" : ""}`}>
          <div className="panel-collapse-inner" style={{ paddingTop: 18 }}>
            <p style={{ fontSize: 13, color: C.muted, marginBottom: 14 }}>You may choose Sevas if you want, or leave this blank and host the Satsang without assigned roles.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10 }}>
              {STANDARD_SEVAS.map(sv => {
                const ch = chosenSv.find(x => x.id === sv.id);
                return (
                  <div key={sv.id} style={{ background: ch ? `rgba(212,151,42,0.07)` : "rgba(255,255,255,0.02)", border: `1px solid ${ch ? C.gold : C.border}`, borderRadius: 10, overflow: "hidden" }}>
                    <button onClick={() => toggleSv(sv.id)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4, padding: "13px 14px 10px", width: "100%", textAlign: "left", color: C.cream }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{sv.name}</span>
                      <span style={{ fontSize: 11, color: C.muted }}>{sv.desc}</span>
                    </button>
                    {ch && (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10, padding: "4px 14px 12px", fontSize: 12, color: C.muted }}>
                        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <span>Needed</span>
                          <input type="number" min={1} max={50} value={ch.needed} onChange={e => setNd(sv.id, e.target.value)} style={{ width: 70, background: "rgba(255,255,255,0.07)", border: `1px solid ${C.border}`, borderRadius: 4, color: C.cream, fontSize: 13, padding: "3px 6px", outline: "none" }} />
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 32 }}>
        <Btn onClick={submit} disabled={busy} full>{busy ? "Posting…" : "Post Satsang →"}</Btn>
      </div>
    </FWrap>
  );
}
