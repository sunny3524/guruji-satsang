import { useState, useEffect } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase/config";
import {
  getAllSatsangs, getAllUsers, cancelSatsang, updateUserRole
} from "../firebase/firestore";
import { C, fmtTime } from "../utils/constants";
import Btn from "../components/ui/Btn";
import Label from "../components/ui/Label";
import FField from "../components/ui/FField";

export default function AdminView({ user, profile, nav, notify }) {
  const [tab, setTab] = useState("satsangs");
  const [allSatsangs, setAllSatsangs] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [broadcast, setBroadcast] = useState({ subject: "", body: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getAllSatsangs().then(setAllSatsangs);
    getAllUsers().then(setAllUsers);
  }, []);

  const doCancel = async (id) => {
    if (!window.confirm("Cancel this Satsang? All attendees will need to be notified manually.")) return;
    await cancelSatsang(id);
    setAllSatsangs(p => p.map(s => s.id === id ? { ...s, status: "cancelled" } : s));
    notify("Satsang cancelled.");
  };

  const doRoleChange = async (uid, role) => {
    await updateUserRole(uid, role);
    setAllUsers(p => p.map(u => u.id === uid ? { ...u, role } : u));
    notify("Role updated.");
  };

  const doBroadcast = async () => {
    if (!broadcast.subject || !broadcast.body) { notify("Subject and body required", "err"); return; }
    setBusy(true);
    try {
      const sendBroadcast = httpsCallable(functions, "sendBroadcast");
      const res = await sendBroadcast(broadcast);
      notify(`Broadcast sent to ${res.data.sent} members 🙏`);
      setBroadcast({ subject: "", body: "" });
    } catch (e) { notify(e.message, "err"); }
    setBusy(false);
  };

  const TABS = [["satsangs", "All Satsangs"], ["users", "Users"], ["broadcast", "Broadcast"]];

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "48px 32px" }}>
      <h2 style={{ fontSize: 32, fontWeight: 700, color: C.cream, margin: "0 0 6px" }}>Admin Panel</h2>
      <p style={{ color: C.muted, marginBottom: 32 }}>Manage all Satsangs, users and communications</p>
      
      <div style={{ display: "flex", gap: 4, marginBottom: 32, borderBottom: `1px solid ${C.border}`, paddingBottom: 0 }}>
        {TABS.map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "12px 20px",
              fontSize: 14,
              color: tab === k ? C.gold : C.muted,
              borderBottom: tab === k ? `2px solid ${C.gold}` : "2px solid transparent",
              fontFamily: "var(--font-headings)"
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {tab === "satsangs" && (
        <div>
          <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: C.muted, fontSize: 14 }}>{allSatsangs.length} total satsangs</span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {["Title", "Date", "Time", "City", "Attendees", "Status", "Actions"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 12px", color: C.muted, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "sans-serif" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allSatsangs.map(s => (
                <tr key={s.id} style={{ borderBottom: `1px solid rgba(92,42,10,0.3)` }}>
                  <td style={{ padding: "12px" }}>
                    <button
                      onClick={() => nav("detail", s.id)}
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        color: C.cream,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontSize: 14,
                        textAlign: "left",
                        fontFamily: "var(--font-headings)",
                        transition: "color 0.2s ease"
                      }}
                      onMouseOver={e => e.currentTarget.style.color = C.gold}
                      onMouseOut={e => e.currentTarget.style.color = C.cream}
                    >
                      {s.title}
                    </button>
                  </td>
                  <td style={{ padding: "12px", color: C.muted }}>{s.date}</td>
                  <td style={{ padding: "12px", color: C.muted }}>{fmtTime(s.time)}</td>
                  <td style={{ padding: "12px", color: C.muted }}>{s.city}</td>
                  <td style={{ padding: "12px", color: C.gold }}>{s.attendeeCount || 0}/{s.maxAttendees}</td>
                  <td style={{ padding: "12px" }}>
                    <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, fontFamily: "sans-serif", background: s.status === "cancelled" ? "rgba(122,26,10,0.3)" : s.status === "completed" ? "rgba(76,130,80,0.2)" : "rgba(212,151,42,0.15)", color: s.status === "cancelled" ? C.saffron : s.status === "completed" ? "#7db87f" : C.gold }}>
                      {s.status}
                    </span>
                  </td>
                  <td style={{ padding: "12px" }}>
                    {s.status === "upcoming" && <button onClick={() => doCancel(s.id)} style={{ background: "none", border: `1px solid ${C.border}`, color: C.muted, cursor: "pointer", fontSize: 12, padding: "4px 10px", borderRadius: 4 }}>Cancel</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "users" && (
        <div>
          <div style={{ marginBottom: 16 }}><span style={{ color: C.muted, fontSize: 14 }}>{allUsers.length} registered members</span></div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {["Name", "Email", "Phone", "City", "Role", "Change Role"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 12px", color: C.muted, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "sans-serif" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allUsers.map(u => (
                <tr key={u.id} style={{ borderBottom: `1px solid rgba(92,42,10,0.3)` }}>
                  <td style={{ padding: "12px", color: C.cream, fontWeight: 600 }}>{u.name}</td>
                  <td style={{ padding: "12px", color: C.muted, fontSize: 13 }}>{u.email}</td>
                  <td style={{ padding: "12px", color: C.muted, fontSize: 13 }}>{u.phone}</td>
                  <td style={{ padding: "12px", color: C.muted, fontSize: 13 }}>{u.city}</td>
                  <td style={{ padding: "12px" }}>
                    <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: `rgba(212,151,42,0.15)`, color: C.gold, fontFamily: "sans-serif" }}>{u.role || "member"}</span>
                  </td>
                  <td style={{ padding: "12px" }}>
                    <select onChange={e => doRoleChange(u.id, e.target.value)} value={u.role || "member"}
                      style={{ background: C.card, border: `1px solid ${C.border}`, color: C.cream, padding: "4px 8px", borderRadius: 4, fontSize: 12, cursor: "pointer" }}>
                      <option value="member">member</option>
                      <option value="organiser">organiser</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "broadcast" && (
        <div style={{ maxWidth: 600 }}>
          <p style={{ color: C.muted, marginBottom: 24, fontSize: 15, lineHeight: 1.7 }}>
            Send an email to all registered Sangat members. Use this for important announcements only.
          </p>
          <FField label="Subject *" v={broadcast.subject} on={e => setBroadcast(p => ({ ...p, subject: e.target.value }))} ph="e.g. Important Satsang Update — Jai Guruji" />
          <div style={{ marginBottom: 18 }}>
            <Label>Message Body *</Label>
            <textarea value={broadcast.body} onChange={e => setBroadcast(p => ({ ...p, body: e.target.value }))} placeholder="Write your message here…"
              style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 8, padding: "11px 14px", color: C.cream, fontSize: 15, fontFamily: "var(--font-body)", outline: "none", boxSizing: "border-box", minHeight: 160, resize: "vertical" }} />
          </div>
          <Btn onClick={doBroadcast} disabled={busy} full>{busy ? "Sending…" : "Send Broadcast →"}</Btn>
        </div>
      )}
    </div>
  );
}
