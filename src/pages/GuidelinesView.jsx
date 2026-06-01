import { useState } from "react";
import { getRandomVachan } from "../utils/vachans";
import { C, GUIDELINES } from "../utils/constants";
import guruji2 from "../assets/images/Guruji 2.jpg";

export default function GuidelinesView() {
  const [open, setOpen] = useState(null);
  const [vachan] = useState(() => getRandomVachan());

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 32px" }}>
      <div style={{ display: "flex", gap: 36, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 40 }}>
        <img
          src={guruji2}
          alt="Guruji Maharaj"
          style={{
            width: 190,
            height: 230,
            objectFit: "cover",
            borderRadius: 12,
            border: `2px solid ${C.gold}`,
            boxShadow: `0 0 30px rgba(212,151,42,0.22)`,
            flexShrink: 0
          }}
          onError={e => { e.target.style.display = "none"; }}
        />
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 10,
            letterSpacing: "0.25em",
            color: C.gold,
            textTransform: "uppercase",
            marginBottom: 14,
            fontFamily: "sans-serif"
          }}>
            JAI GURUJI · SHUKRANA GURUJI
          </div>
          <h2 style={{ fontSize: 34, fontWeight: 700, color: C.gold, margin: "0 0 16px" }}>Satsang Guidelines</h2>
          <p style={{ color: C.muted, fontSize: 16, lineHeight: 1.85, maxWidth: 560 }}>
            Guruji always taught that discipline and devotion are the two pillars of Satsang.
            These guidelines reflect His teachings and are observed by Sangat around the world
            to maintain the sanctity and purity of His Darbar.
          </p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {GUIDELINES.map((g, i) => (
          <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              style={{
                width: "100%",
                background: "none",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "18px 20px",
                color: C.cream,
                textAlign: "left"
              }}
            >
              <span style={{ flex: 1, fontSize: 17, fontWeight: 700 }}>{g.title}</span>
              <span style={{ color: C.gold, fontSize: 12, transform: open === i ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease", display: "inline-block" }}>▼</span>
            </button>
            <div className={`panel-collapse ${open === i ? "open" : ""}`}>
              <div className="panel-collapse-inner" style={{ padding: "4px 20px 22px 20px", borderTop: `1px solid ${C.border}` }}>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {g.items.map((item, j) => (
                    <li
                      key={j}
                      style={{
                        display: "flex",
                        gap: 12,
                        padding: "10px 0",
                        borderBottom: `1px solid rgba(92,42,10,0.4)`,
                        fontSize: 15,
                        lineHeight: 1.75,
                        color: "#d4b98a"
                      }}
                    >
                      <span style={{ flexShrink: 0, paddingTop: 2 }}>🌹</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 48,
        padding: "32px 36px",
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        textAlign: "center"
      }}>
        <div style={{ width: 60, height: 3, background: `linear-gradient(90deg,${C.gold},${C.saffron})`, margin: "0 auto 20px", borderRadius: 2 }} />
        <div style={{
          fontSize: 9,
          color: C.gold,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          marginBottom: 12,
          fontFamily: "sans-serif",
          fontWeight: 700
        }}>
          🌹 Guruji's Divine Vachan
        </div>
        <p style={{ fontSize: 22, fontStyle: "italic", color: C.cream, margin: "0 0 12px", lineHeight: 1.6 }}>
          "{vachan.punjabi}"
        </p>
        <p style={{ fontSize: 14, color: C.gold, fontStyle: "italic" }}>— {vachan.english}</p>
      </div>
    </div>
  );
}
