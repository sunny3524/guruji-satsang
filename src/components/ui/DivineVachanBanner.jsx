import { useState, useEffect } from "react";
import { C } from "../../utils/constants";
import { getRandomVachan } from "../../utils/vachans";

export default function DivineVachanBanner({ view }) {
  const [vachan, setVachan] = useState(null);

  useEffect(() => {
    setVachan(getRandomVachan());
  }, [view]);

  if (!vachan) return null;

  return (
    <div style={{
      maxWidth: 900,
      margin: "40px auto 20px",
      padding: "24px 28px",
      background: "rgba(39, 14, 3, 0.4)",
      border: `1px dashed ${C.border}`,
      borderRadius: 12,
      textAlign: "center",
      boxShadow: "0 4px 24px rgba(0,0,0,0.2)"
    }}>
      <div style={{
        fontSize: 9,
        color: C.gold,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        marginBottom: 8,
        fontFamily: "sans-serif",
        fontWeight: 700
      }}>
        Guruji's Divine Vachan
      </div>
      <p style={{
        fontSize: 16,
        fontStyle: "italic",
        color: C.cream,
        margin: "0 0 6px",
        lineHeight: 1.5
      }}>
        "{vachan.punjabi}"
      </p>
      <p style={{
        fontSize: 13,
        color: C.muted,
        margin: 0,
        fontStyle: "italic",
        lineHeight: 1.4
      }}>
        — {vachan.english}
      </p>
    </div>
  );
}
