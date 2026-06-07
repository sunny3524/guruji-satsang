import { C, fmtDate, fmtTime } from "../../utils/constants";

export default function SCard({ s, nav }) {
  const left = s.maxAttendees - (s.attendeeCount || 0);
  return (
    <button
      onClick={() => nav("detail", s.id)}
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: "20px 22px",
        cursor: "pointer",
        textAlign: "left",
        width: 278,
        color: C.cream,
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        outline: "none",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = `0 6px 20px rgba(0, 0, 0, 0.4)`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div style={{
        fontSize: 10,
        color: C.gold,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        marginBottom: 8,
        fontFamily: "sans-serif",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <span>{fmtDate(s.date)} · {fmtTime(s.time)}</span>
        {s.isPrivate && (
          <span style={{ color: C.saffron, fontWeight: "bold" }}>🔒 Private</span>
        )}
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{s.title}</div>
      <div style={{
        fontSize: 13,
        color: C.muted,
        marginBottom: 14,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 8
      }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          📍 {s.city} {s.postcode}
        </span>
        {s.distance !== undefined && s.distance !== null && (
          <span style={{
            color: C.gold,
            fontSize: 11,
            fontWeight: "bold",
            whiteSpace: "nowrap",
            flexShrink: 0
          }}>
            {s.distance.toFixed(1)} km
          </span>
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{
          background: `rgba(212,151,42,0.15)`,
          color: C.gold,
          fontSize: 11,
          padding: "3px 10px",
          borderRadius: 20,
          fontFamily: "sans-serif"
        }}>
          {left > 0 ? `${left} spots left` : 'Full'}
        </span>
        <span style={{ fontSize: 12, color: C.muted }}>
          {Object.keys(s.sevas || {}).length} seva roles
        </span>
      </div>
    </button>
  );
}
