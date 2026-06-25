import { useState, useEffect } from "react";
import { createUserProfile, updateUserGuests } from "../firebase/firestore";
import { validateAddressWithGoogle } from "../utils/geoUtils";
import { C, SANGAT_COUNTRIES, COUNTRY_PHONE_EXAMPLES, COUNTRY_DIAL_CODES, normalizePhoneWithCountry } from "../utils/constants";
import { functions } from "../firebase/config";
import { httpsCallable } from "firebase/functions";
import Btn from "../components/ui/Btn";
import Empty from "../components/ui/Empty";

export default function ProfileView({ user, profile, nav, notify }) {
  const [waResetNotice, setWaResetNotice] = useState(() => {
    const flag = sessionStorage.getItem("just_wa_logged_in");
    return flag === "true";
  });

  useEffect(() => {
    if (waResetNotice) {
      sessionStorage.removeItem("just_wa_logged_in");
      setTimeout(() => {
        const pinCard = document.getElementById("secure-pin-card");
        if (pinCard) {
          pinCard.scrollIntoView({ behavior: "smooth" });
        }
      }, 800);
    }
  }, [waResetNotice]);

  const [newGuestName, setNewGuestName] = useState("");
  const [newGuestRel, setNewGuestRel] = useState("Spouse");
  const [isChild, setIsChild] = useState(false);
  const [guestBusy, setGuestBusy] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    addressLine3: "",
    state: "",
    city: "",
    postcode: "",
    country: "United Kingdom",
    customCountry: "",
    showOnCommunityMap: true
  });
  const [saveBusy, setSaveBusy] = useState(false);

  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinBusy, setPinBusy] = useState(false);

  const handleUpdatePIN = async () => {
    if (!newPin || newPin.length !== 6 || isNaN(newPin)) {
      notify("Please enter a valid 6-digit numerical PIN", "err");
      return;
    }
    if (newPin !== confirmPin) {
      notify("PINs do not match", "err");
      return;
    }

    setPinBusy(true);
    try {
      const updatePINFn = httpsCallable(functions, "updateUserPIN");
      await updatePINFn({ pin: newPin });
      notify("Secure Account PIN updated successfully! 🙏", "ok");
      setNewPin("");
      setConfirmPin("");
    } catch (e) {
      notify(e.message.replace("Firebase:", "").trim(), "err");
    }
    setPinBusy(false);
  };

  const startEditing = () => {
    const isOther = profile?.country && !SANGAT_COUNTRIES.filter(c => c !== "Other").includes(profile.country);
    setEditForm({
      name: profile?.name || "",
      phone: profile?.phone || "",
      addressLine1: profile?.addressLine1 || profile?.address || "",
      addressLine2: profile?.addressLine2 || "",
      addressLine3: profile?.addressLine3 || "",
      state: profile?.state || "",
      city: profile?.city || "",
      postcode: profile?.postcode || "",
      country: isOther ? "Other" : (profile?.country || "United Kingdom"),
      customCountry: isOther ? profile.country : "",
      showOnCommunityMap: profile?.showOnCommunityMap !== false
    });
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    const targetCountry = editForm.country === "Other" ? editForm.customCountry.trim() : editForm.country;
    if (!editForm.name.trim() || !editForm.phone.trim() || !targetCountry) {
      notify("Please fill all required fields (Name, Phone, Country)", "err");
      return;
    }
    setSaveBusy(true);
    try {
      let latitude = profile?.latitude || null;
      let longitude = profile?.longitude || null;

      if (editForm.addressLine1.trim() && editForm.city.trim() && editForm.postcode.trim()) {
        try {
          const valResult = await validateAddressWithGoogle({
            addressLine1: editForm.addressLine1.trim(),
            addressLine2: editForm.addressLine2.trim(),
            addressLine3: editForm.addressLine3.trim(),
            city: editForm.city.trim(),
            state: editForm.state.trim(),
            postcode: editForm.postcode.trim(),
            country: targetCountry
          });
          
          if (valResult.valid) {
            latitude = valResult.lat || null;
            longitude = valResult.lng || null;
          } else {
            notify("Address could not be validated, but details were saved. 🙏", "ok");
          }
        } catch (geoErr) {
          console.warn("Google Address validation failed on profile edit, bypassing:", geoErr);
        }
      } else {
        latitude = null;
        longitude = null;
      }
      
      const formattedPhone = normalizePhoneWithCountry(editForm.phone, targetCountry);
      
      await createUserProfile(user.uid, {
        name: editForm.name.trim(),
        phone: formattedPhone,
        addressLine1: editForm.addressLine1.trim(),
        addressLine2: editForm.addressLine2.trim(),
        addressLine3: editForm.addressLine3.trim(),
        state: editForm.state.trim(),
        city: editForm.city.trim(),
        postcode: editForm.postcode.trim(),
        country: targetCountry,
        latitude,
        longitude,
        showOnCommunityMap: editForm.showOnCommunityMap !== false
      });
      setIsEditing(false);
      notify("Profile updated successfully! 🙏");
    } catch (err) {
      console.error(err);
      notify(err.message || "Failed to update profile", "err");
    }
    setSaveBusy(false);
  };

  const handleAddGuest = async () => {
    const trimmedName = newGuestName.trim();
    if (!trimmedName) {
      notify("Please enter a guest name", "err");
      return;
    }
    setGuestBusy(true);
    try {
      const isActuallyChild = (newGuestRel === "Son" || newGuestRel === "Daughter") && isChild;
      const newGuest = {
        id: "g_" + Math.random().toString(36).slice(2, 9),
        name: trimmedName,
        relationship: newGuestRel,
        isChild: isActuallyChild
      };
      const currentGuests = profile?.guests || [];
      await updateUserGuests(user.uid, [...currentGuests, newGuest]);
      setNewGuestName("");
      setIsChild(false);
      notify("Guest added successfully! 🙏");
    } catch (err) {
      console.error(err);
      notify("Failed to add guest", "err");
    }
    setGuestBusy(false);
  };

  const handleRemoveGuest = async (guestId) => {
    if (!window.confirm("Are you sure you want to remove this guest?")) return;
    try {
      const currentGuests = profile?.guests || [];
      const updated = currentGuests.filter(g => g.id !== guestId);
      await updateUserGuests(user.uid, updated);
      notify("Guest removed successfully! 🙏");
    } catch (err) {
      console.error(err);
      notify("Failed to remove guest", "err");
    }
  };

  if (!user) {
    return (
      <Empty>
        <Btn onClick={() => nav("login")}>Login to view profile →</Btn>
      </Empty>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 32px" }}>
      <h2 style={{ fontSize: 32, fontWeight: 700, color: C.cream, margin: "0 0 6px" }}>My Profile</h2>
      <p style={{ color: C.muted, marginBottom: 32 }}>Manage your basic personal details and register regular guests or children.</p>

      {waResetNotice && (
        <div style={{
          background: "rgba(212,151,42,0.1)",
          border: `1px solid ${C.gold}`,
          borderRadius: 12,
          padding: "16px 20px",
          color: C.cream,
          fontSize: 14,
          lineHeight: 1.5,
          marginBottom: 24,
          display: "flex",
          flexDirection: "column",
          gap: 6
        }}>
          <span style={{ color: C.gold, fontWeight: "bold", fontSize: 16 }}>🔑 WhatsApp Login Confirmed!</span>
          <span>
            Jai Guruji! You have logged in securely via WhatsApp. If you forgot your PIN or need to set one, please do so in the **Secure Account PIN** card below to enable quick direct login in the future. 🙏
          </span>
          <button 
            onClick={() => setWaResetNotice(false)} 
            style={{ 
              alignSelf: "flex-start", 
              background: "none", 
              border: "none", 
              color: C.gold, 
              textDecoration: "underline", 
              cursor: "pointer", 
              padding: 0,
              marginTop: 6,
              fontWeight: "bold"
            }}
          >
            Dismiss Notice
          </button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24, marginBottom: 24 }}>
        {/* Personal Details */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "24px 28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.gold }}>Personal Details</div>
            {!isEditing && (
              <button
                onClick={startEditing}
                style={{
                  background: "none",
                  border: `1px solid ${C.gold}`,
                  color: C.gold,
                  borderRadius: 8,
                  padding: "6px 14px",
                  fontSize: 12,
                  fontWeight: "bold",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                ✏️ Edit Profile
              </button>
            )}
          </div>

          {isEditing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Name */}
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: C.gold }}>Full Name *</label>
                <input
                  style={{
                    background: "none",
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: "8px 12px",
                    color: C.cream,
                    fontSize: 14,
                    width: "100%",
                    outline: "none"
                  }}
                  value={editForm.name}
                  onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              {/* Email (Disabled) */}
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: C.muted }}>Email (Cannot be changed)</label>
                <input
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: "8px 12px",
                    color: C.muted,
                    fontSize: 14,
                    width: "100%",
                    outline: "none",
                    cursor: "not-allowed"
                  }}
                  value={user.email}
                  disabled
                />
              </div>

              {/* Country */}
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: C.gold }}>Country *</label>
                <select
                  style={{
                    background: C.card,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: "8px 12px",
                    color: C.cream,
                    fontSize: 14,
                    width: "100%",
                    outline: "none",
                    boxSizing: "border-box",
                    height: 38
                  }}
                  value={editForm.country}
                  onChange={e => setEditForm(prev => ({ ...prev, country: e.target.value }))}
                >
                  {SANGAT_COUNTRIES.map(c => (
                    <option key={c} value={c} style={{ background: C.bg }}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Custom Country */}
              {editForm.country === "Other" && (
                <div>
                  <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: C.gold }}>Custom Country Name *</label>
                  <input
                    style={{
                      background: "none",
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      padding: "8px 12px",
                      color: C.cream,
                      fontSize: 14,
                      width: "100%",
                      outline: "none"
                    }}
                    value={editForm.customCountry}
                    onChange={e => setEditForm(prev => ({ ...prev, customCountry: e.target.value }))}
                    placeholder="e.g. Ireland"
                  />
                </div>
              )}

              {/* Phone */}
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: C.gold }}>Phone Number *</label>
                <input
                  style={{
                    background: "none",
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: "8px 12px",
                    color: C.cream,
                    fontSize: 14,
                    width: "100%",
                    outline: "none"
                  }}
                  value={editForm.phone}
                  onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder={`e.g. +${COUNTRY_PHONE_EXAMPLES[editForm.country] || "353871234567"}`}
                />
                <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>
                  {editForm.country === "Other"
                    ? "⚠️ Please enter country code starting with '+' e.g. +353871234567"
                    : `⚠️ Please enter country code (e.g. +${COUNTRY_PHONE_EXAMPLES[editForm.country]}), otherwise it will be prefixed with +${COUNTRY_DIAL_CODES[editForm.country]} by default.`
                  }
                </div>
              </div>

              {/* Address Line 1 */}
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: C.gold }}>Address Line 1 *</label>
                <input
                  style={{
                    background: "none",
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: "8px 12px",
                    color: C.cream,
                    fontSize: 14,
                    width: "100%",
                    outline: "none"
                  }}
                  value={editForm.addressLine1}
                  onChange={e => setEditForm(prev => ({ ...prev, addressLine1: e.target.value }))}
                  placeholder="Street address, P.O. box, etc."
                />
              </div>

              {/* Address Line 2 */}
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: C.gold }}>Address Line 2 (Optional)</label>
                <input
                  style={{
                    background: "none",
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: "8px 12px",
                    color: C.cream,
                    fontSize: 14,
                    width: "100%",
                    outline: "none"
                  }}
                  value={editForm.addressLine2}
                  onChange={e => setEditForm(prev => ({ ...prev, addressLine2: e.target.value }))}
                  placeholder="Apartment, suite, unit, etc."
                />
              </div>

              {/* Address Line 3 & State Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: C.gold }}>Address Line 3 (Optional)</label>
                  <input
                    style={{
                      background: "none",
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      padding: "8px 12px",
                      color: C.cream,
                      fontSize: 14,
                      width: "100%",
                      outline: "none"
                    }}
                    value={editForm.addressLine3}
                    onChange={e => setEditForm(prev => ({ ...prev, addressLine3: e.target.value }))}
                    placeholder="Sublocality, landmark"
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: C.gold }}>State / County / Region</label>
                  <input
                    style={{
                      background: "none",
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      padding: "8px 12px",
                      color: C.cream,
                      fontSize: 14,
                      width: "100%",
                      outline: "none"
                    }}
                    value={editForm.state}
                    onChange={e => setEditForm(prev => ({ ...prev, state: e.target.value }))}
                    placeholder="e.g. Punjab"
                  />
                </div>
              </div>

              {/* City and Postcode */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: C.gold }}>City *</label>
                  <input
                    style={{
                      background: "none",
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      padding: "8px 12px",
                      color: C.cream,
                      fontSize: 14,
                      width: "100%",
                      outline: "none"
                    }}
                    value={editForm.city}
                    onChange={e => setEditForm(prev => ({ ...prev, city: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: C.gold }}>Zip / Postal Code *</label>
                  <input
                    style={{
                      background: "none",
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      padding: "8px 12px",
                      color: C.cream,
                      fontSize: 14,
                      width: "100%",
                      outline: "none"
                    }}
                    value={editForm.postcode}
                    onChange={e => setEditForm(prev => ({ ...prev, postcode: e.target.value }))}
                    placeholder={
                      editForm.country === "United Kingdom" ? "e.g. EN4 0DU" :
                      editForm.country === "India" ? "e.g. 110001" :
                      editForm.country === "United States" ? "e.g. 90210" :
                      editForm.country === "Canada" ? "e.g. K1A 0B1" : "e.g. Zip code"
                    }
                  />
                </div>
              </div>

              {/* Privacy Setting */}
              <div style={{ marginTop: 12, background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 16px" }}>
                <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", userSelect: "none" }}>
                  <input
                    type="checkbox"
                    checked={editForm.showOnCommunityMap !== false}
                    onChange={e => setEditForm(prev => ({ ...prev, showOnCommunityMap: e.target.checked }))}
                    style={{
                      marginTop: 3,
                      accentColor: C.gold,
                      cursor: "pointer",
                      width: 14,
                      height: 14
                    }}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.cream, marginBottom: 2 }}>
                      🌍 Show approximate location on Sangat Map
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.4 }}>
                      Share your general neighborhood with other Sangat members. No personal information or exact address coordinates will ever be displayed.
                    </div>
                  </div>
                </label>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                <button
                  onClick={handleSaveProfile}
                  disabled={saveBusy}
                  style={{
                    background: C.gold,
                    color: C.bg,
                    border: "none",
                    borderRadius: 8,
                    padding: "10px 20px",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                    flex: 1
                  }}
                >
                  {saveBusy ? "Saving…" : "Save Details"}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  disabled={saveBusy}
                  style={{
                    background: "none",
                    border: `1px solid ${C.saffron}`,
                    color: C.saffron,
                    borderRadius: 8,
                    padding: "10px 20px",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                    flex: 1
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {[
                ["Name", profile?.name],
                ["Email", user.email],
                ["Phone", profile?.phone],
                ["Country", profile?.country],
                ["Address Line 1", profile?.addressLine1 || profile?.address],
                ["Address Line 2", profile?.addressLine2],
                ["Address Line 3", profile?.addressLine3],
                ["State / County / Region", profile?.state],
                ["City", profile?.city],
                ["Zip / Postal Code", profile?.postcode],
                ["Show on Sangat Map", profile?.showOnCommunityMap !== false ? "Yes (Approximate)" : "No"]
              ].map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 14,
                    paddingBottom: 10,
                    marginBottom: 10,
                    borderBottom: `1px solid ${C.border}`,
                    gap: 12,
                    flexWrap: "wrap"
                  }}
                >
                  <span style={{ color: C.muted }}>{k}</span>
                  <strong style={{ color: C.cream }}>
                    {v || <span style={{ color: C.muted, fontWeight: "normal", fontStyle: "italic" }}>Not provided</span>}
                  </strong>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Managed Guests & Children */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "24px 28px" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.gold, marginBottom: 10 }}>Family & Regular Guests</div>
          <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
            Satsang is a gathering of love and devotion. Add your regular family members, children, or friends here so they are registered in your profile. You will then be able to easily select them and assign Sevas to them when registering for any upcoming Satsang.
          </p>

          {/* Add Guest Form */}
          <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: "1 1 200px" }}>
              <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: C.gold }}>Name</label>
              <input
                style={{
                  background: "none",
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding: "8px 12px",
                  color: C.cream,
                  fontSize: 14,
                  width: "100%",
                  outline: "none"
                }}
                placeholder="e.g. Rajiv Aggarwal"
                value={newGuestName}
                onChange={e => setNewGuestName(e.target.value)}
              />
            </div>
            <div style={{ flex: "1 1 150px" }}>
              <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: C.gold }}>Relationship</label>
              <select
                style={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding: "8px 12px",
                  color: C.cream,
                  fontSize: 14,
                  width: "100%",
                  outline: "none"
                }}
                value={newGuestRel}
                onChange={e => setNewGuestRel(e.target.value)}
              >
                {["Spouse", "Son", "Daughter", "Parent", "Sibling", "Friend", "Other"].map(r => (
                  <option key={r} value={r} style={{ background: C.bg }}>{r}</option>
                ))}
              </select>
            </div>
            {/* Child Checkbox for Profile page */}
            {(newGuestRel === "Son" || newGuestRel === "Daughter") && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flex: "1 1 100%" }}>
                <input
                  type="checkbox"
                  id="profileIsChild"
                  checked={isChild}
                  onChange={e => setIsChild(e.target.checked)}
                  style={{ cursor: "pointer", width: 16, height: 16, accentColor: C.gold }}
                />
                <label htmlFor="profileIsChild" style={{ fontSize: 13, color: C.cream, cursor: "pointer", fontFamily: "sans-serif" }}>
                  10 years or younger (Child)
                </label>
              </div>
            )}

            <button
              onClick={handleAddGuest}
              disabled={guestBusy}
              style={{
                background: C.gold,
                color: C.bg,
                border: "none",
                borderRadius: 8,
                padding: "10px 20px",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                height: 38,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              {guestBusy ? "Adding…" : "+ Add Member"}
            </button>
          </div>

          {/* Guests List */}
          {(!profile?.guests || profile.guests.length === 0) ? (
            <div style={{ border: `1px dashed ${C.border}`, borderRadius: 10, padding: "24px", textAlign: "center", color: C.muted, fontSize: 14, fontStyle: "italic" }}>
              No family members or guests added yet.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
              {profile.guests.map(g => (
                <div key={g.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.01)", border: `1px solid rgba(92,42,10,0.3)`, borderRadius: 10, padding: "12px 16px" }}>
                  <div>
                    <div style={{ fontWeight: 600, color: C.cream, fontSize: 14 }}>{g.name}</div>
                    <div style={{ fontSize: 11, color: C.gold, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                      {g.relationship}
                      {g.isChild && (
                        <span style={{
                          color: C.bg,
                          background: C.gold,
                          fontSize: 9,
                          fontWeight: "bold",
                          padding: "1px 6px",
                          borderRadius: 8,
                          textTransform: "uppercase",
                          fontFamily: "sans-serif"
                        }}>
                          Child
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveGuest(g.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: C.saffron,
                      cursor: "pointer",
                      fontSize: 12,
                      padding: "4px 8px",
                      fontWeight: "bold",
                      borderRadius: 4
                    }}
                    onMouseOver={e => e.currentTarget.style.textDecoration = "underline"}
                    onMouseOut={e => e.currentTarget.style.textDecoration = "none"}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Secure Account PIN Card */}
        <div id="secure-pin-card" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "24px 28px" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.gold, marginBottom: 12 }}>Secure Account PIN</div>
          <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.5, margin: "0 0 16px 0" }}>
            Set up or update a 6-digit numerical PIN. You can use this PIN alongside your phone number to log in if you don't have WhatsApp or if the WhatsApp OTP delivery is offline.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-end" }}>
            <div style={{ flex: "1 1 200px" }}>
              <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: C.gold }}>New 6-Digit PIN *</label>
              <input
                type="password"
                pattern="[0-9]*"
                inputMode="numeric"
                maxLength={6}
                placeholder="e.g. 123456"
                value={newPin}
                onChange={e => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                style={{
                  background: "none",
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding: "8px 12px",
                  color: C.cream,
                  fontSize: 15,
                  letterSpacing: "0.2em",
                  width: "100%",
                  outline: "none",
                  boxSizing: "border-box",
                  height: 38
                }}
              />
            </div>
            <div style={{ flex: "1 1 200px" }}>
              <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: C.gold }}>Confirm New PIN *</label>
              <input
                type="password"
                pattern="[0-9]*"
                inputMode="numeric"
                maxLength={6}
                placeholder="e.g. 123456"
                value={confirmPin}
                onChange={e => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                style={{
                  background: "none",
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding: "8px 12px",
                  color: C.cream,
                  fontSize: 15,
                  letterSpacing: "0.2em",
                  width: "100%",
                  outline: "none",
                  boxSizing: "border-box",
                  height: 38
                }}
              />
            </div>
            <button
              onClick={handleUpdatePIN}
              disabled={pinBusy}
              style={{
                background: C.gold,
                border: "none",
                color: C.bg,
                borderRadius: 8,
                padding: "0 20px",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "all 0.2s",
                height: 38,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14
              }}
            >
              {pinBusy ? "Updating PIN…" : "Update PIN"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
