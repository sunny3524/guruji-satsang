import { useState, useEffect } from "react";
import { getSatsangsByOrganizer, getUserAttendanceSatsangs } from "../firebase/firestore";
import { C, fmtDate, STANDARD_SEVAS } from "../utils/constants";
import Btn from "../components/ui/Btn";
import Empty from "../components/ui/Empty";
import SCard from "../components/satsang/SCard";

export default function DashboardView({ user, profile, nav, notify }) {
  const [hosted, setHosted] = useState([]);
  const [attending, setAttending] = useState([]);

  useEffect(() => {
    if (!user?.uid) return;

    // Load Satsangs hosted by the user
    getSatsangsByOrganizer(user.uid)
      .then(hostedList => {
        setHosted(hostedList || []);
      })
      .catch(err => {
        console.error("hosted load failed", err);
        setHosted([]);
      });

    getUserAttendanceSatsangs(user.uid)
      .then(attended => {
        const sorted = attended
          .filter(Boolean)
          .sort((a, b) => a.date.localeCompare(b.date) || (a.time || "").localeCompare(b.time || ""));
        setAttending(sorted);
      })
      .catch(err => {
        console.error("attendance load failed", err);
        setAttending([]);
      });
  }, [user]);

  if (!user) {
    return (
      <Empty>
        <Btn onClick={() => nav("login")}>Login to view dashboard →</Btn>
      </Empty>
    );
  }

  const upcomingHosted = hosted.filter(s => s.status === "upcoming");
  const upcomingAttending = attending.filter(s => s.status === "upcoming");
  const completedHosted = hosted.filter(s => s.status === "completed").map(s => ({ ...s, role: "Host" }));
  const completedAttending = attending.filter(s => s.status === "completed" && (s.attendanceStatus !== "waitlisted" || s.isPrivate === true)).map(s => ({ ...s, role: "Sangat" }));

  const completedMap = new Map();
  completedHosted.forEach(s => completedMap.set(s.id, s));
  completedAttending.forEach(s => {
    if (completedMap.has(s.id)) {
      completedMap.set(s.id, { ...completedMap.get(s.id), role: "Host & Sangat" });
    } else {
      completedMap.set(s.id, s);
    }
  });

  const completed = Array.from(completedMap.values())
    .sort((a, b) => b.date.localeCompare(a.date) || (b.time || "").localeCompare(a.time || ""));

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 32px" }}>
      <h2 style={{ fontSize: 32, fontWeight: 700, color: C.cream, margin: "0 0 6px" }}>Satsang Dashboard</h2>
      <p style={{ color: C.muted, marginBottom: 32 }}>View your hosted satsangs, and satsangs you are attending or serving seva.</p>

      {/* Sangat Summary Card */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "24px 28px", marginBottom: 32 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.gold, marginBottom: 18 }}>Sangat Summary</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 30, marginBottom: 20 }}>
          {[
            ["Satsangs hosted", hosted.length],
            ["Seva roles active", attending.reduce((a, s) => a + Object.values(s.sevas || {}).filter(sv => (sv.enrolled || []).some(e => e.uid === user.uid)).length, 0)]
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", flexDirection: "column", gap: 6, borderLeft: `3px solid ${C.gold}`, paddingLeft: 16 }}>
              <span style={{ color: C.muted, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "sans-serif" }}>{k}</span>
              <strong style={{ color: C.cream, fontSize: 32, fontWeight: 750 }}>{v}</strong>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", borderTop: `1px solid rgba(255,255,255,0.03)`, paddingTop: 20 }}>
          <Btn onClick={() => nav("post")} outline>+ Host a Satsang</Btn>
          <Btn onClick={() => nav("find")} ghost>Find Upcoming Satsang →</Btn>
        </div>
      </div>

      {upcomingHosted.length > 0 && (
        <div style={{ marginBottom: 36 }}>
          <h3 style={{ fontSize: 19, fontWeight: 700, color: C.cream, marginBottom: 16 }}>Satsangs I'm Hosting</h3>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {upcomingHosted.map(s => <SCard key={s.id} s={s} nav={nav} />)}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 19, fontWeight: 700, color: C.cream, marginBottom: 16 }}>Satsangs I'm Attending</h3>
        {upcomingAttending.length === 0 ? (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "24px 20px", color: C.muted, fontSize: 15 }}>
            You are not registered for any upcoming satsangs yet. Use Find Satsang to register for one, or host your own.
          </div>
        ) : (
          upcomingAttending.map(s => {
            const sevaRoles = Object.values(s.sevas || {}).filter(sv => (sv.enrolled || []).some(e => e.uid === user.uid));
            const statusColor = s.attendanceStatus === "confirmed" ? "#7db87f" : s.attendanceStatus === "waitlisted" ? "#e06b10" : C.gold;
            const statusBg = s.attendanceStatus === "confirmed" ? "rgba(76,130,80,0.2)" : s.attendanceStatus === "waitlisted" ? "rgba(224,107,16,0.15)" : "rgba(212,151,42,0.15)";
            const statusText = s.attendanceStatus === "confirmed" ? "✓ Confirmed" : s.attendanceStatus === "waitlisted" ? "⚠️ Waitlisted" : "⏳ Pending Approval";
            return (
              <div key={s.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 20px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <strong style={{ color: C.cream, fontSize: 15 }}>{s.title}</strong>
                    {s.isPrivate && (
                      <span style={{ background: "rgba(224,107,16,0.15)", color: C.saffron, border: `1px solid ${C.saffron}`, fontSize: 11, fontWeight: "bold", padding: "3px 10px", borderRadius: 20, fontFamily: "sans-serif" }}>
                        🔒 Private
                      </span>
                    )}
                    <span style={{ background: statusBg, color: statusColor, fontSize: 11, fontWeight: "bold", padding: "3px 10px", borderRadius: 20, fontFamily: "sans-serif" }}>
                      {statusText}
                    </span>
                  </div>
                  <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>{fmtDate(s.date)} · {s.city} {s.postcode}</div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                  {sevaRoles.length > 0 ? sevaRoles.map(sv => {
                    const m = STANDARD_SEVAS.find(x => x.id === sv.id);
                    return <span key={sv.id} style={{ background: `rgba(212,151,42,0.15)`, color: C.gold, fontSize: 11, padding: "4px 10px", borderRadius: 18, fontFamily: "sans-serif" }}>{m?.name}</span>;
                  }) : <span style={{ background: `rgba(212,151,42,0.15)`, color: C.gold, fontSize: 11, padding: "4px 10px", borderRadius: 18, fontFamily: "sans-serif" }}>0 seva roles</span>}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Completed Satsangs */}
      {completed.length > 0 && (
        <div style={{ marginTop: 24, marginBottom: 20 }}>
          <h3 style={{ fontSize: 19, fontWeight: 700, color: C.cream, marginBottom: 16 }}>Completed Satsangs</h3>
          {completed.map(s => {
            const roleColor = s.role.includes("Host") ? C.gold : "#7db87f";
            const roleBg = s.role.includes("Host") ? "rgba(212,151,42,0.15)" : "rgba(76,130,80,0.15)";
            return (
              <div
                key={s.id}
                onClick={() => nav("detail", s.id)}
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: `1px solid rgba(255,255,255,0.06)`,
                  borderRadius: 10,
                  padding: "16px 20px",
                  marginBottom: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 10,
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                  e.currentTarget.style.borderColor = C.border;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <strong style={{ color: "#c0a878", fontSize: 15 }}>{s.title}</strong>
                    {s.isPrivate && (
                      <span style={{ background: "rgba(224,107,16,0.15)", color: C.saffron, border: `1px solid ${C.saffron}`, fontSize: 11, fontWeight: "bold", padding: "3px 10px", borderRadius: 20, fontFamily: "sans-serif" }}>
                        🔒 Private
                      </span>
                    )}
                    <span style={{ background: roleBg, color: roleColor, fontSize: 11, fontWeight: "bold", padding: "3px 10px", borderRadius: 20, fontFamily: "sans-serif" }}>
                      {s.role}
                    </span>
                  </div>
                  <div style={{ color: "rgba(156,112,80,0.6)", fontSize: 13, marginTop: 4 }}>{fmtDate(s.date)} · {s.city} {s.postcode}</div>
                </div>
                <div style={{ color: C.muted, fontSize: 13, fontWeight: "bold" }}>Concluded</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
