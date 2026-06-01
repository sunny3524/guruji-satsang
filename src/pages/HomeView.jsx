import { useState } from "react";
import { getRandomVachan } from "../utils/vachans";
import { C } from "../utils/constants";
import Btn from "../components/ui/Btn";
import SectionWrap from "../components/ui/SectionWrap";
import SCard from "../components/satsang/SCard";

export default function HomeView({ nav, upcoming, user, heroImg, gurujiImgs }) {
  const [vachan] = useState(() => getRandomVachan());
  
  return (
    <div>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        maxWidth: 1180,
        margin: "0 auto",
        padding: "56px 32px 40px",
        gap: 48,
        flexWrap: "wrap"
      }}>
        <div style={{ flex: "1 1 380px", maxWidth: 540 }}>
          <h1 style={{ fontSize: "clamp(44px,7vw,82px)", lineHeight: 1.05, fontWeight: 700, margin: "0 0 18px", color: C.cream }}>
            Guruji<br /><span style={{ color: C.gold, fontStyle: "italic" }}>Satsang</span>
          </h1>
          <p style={{ fontSize: 17, color: C.muted, lineHeight: 1.85, marginBottom: 30, maxWidth: 440 }}>
            Connect with the Sangat. Find Satsangs near you, offer Seva, and grow together in Guruji's divine presence.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Btn onClick={() => nav("find")}>Find Satsang →</Btn>
            <Btn outline onClick={() => nav("guidelines")}>Satsang Guidelines</Btn>
            {!user && <Btn ghost onClick={() => nav("register")}>Join the Sangat</Btn>}
          </div>
        </div>
        <div style={{ flex: "0 0 auto" }}>
          <div style={{
            border: `3px solid ${C.gold}`,
            borderRadius: 14,
            overflow: "hidden",
            boxShadow: `0 0 50px rgba(212,151,42,0.25)`,
            maxWidth: 280
          }}>
            <img
              src={heroImg}
              alt="Guruji Maharaj"
              style={{ width: 280, height: 340, objectFit: "cover", display: "block" }}
              onError={e => { e.target.style.display = "none"; }}
            />
            <div style={{
              background: C.card,
              padding: "10px 16px",
              fontSize: 11,
              color: C.gold,
              textAlign: "center",
              letterSpacing: "0.08em",
              borderTop: `1px solid ${C.border}`
            }}>
              Guruji Maharaj · Lord Shiva in Human Form
            </div>
          </div>
        </div>
      </div>

      <SectionWrap label="Upcoming Satsangs" shaded>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {upcoming.slice(0, 3).map(s => (
            <SCard key={s.id} s={s} nav={nav} />
          ))}
          {upcoming.length === 0 && (
            <p style={{ color: C.muted, fontSize: 15 }}>
              No upcoming satsangs yet. Be the first to host one! 🙏
            </p>
          )}
        </div>
      </SectionWrap>

      <SectionWrap label="Guruji's Divine Vachan">
        <div style={{
          background: `linear-gradient(135deg, ${C.card} 0%, rgba(39,14,3,0.85) 100%)`,
          border: `1px solid ${C.gold}`,
          borderRadius: 16,
          padding: "36px 40px",
          textAlign: "center",
          boxShadow: `0 8px 32px rgba(212,151,42,0.1)`,
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{
            position: "absolute",
            top: -20,
            left: -20,
            fontSize: 120,
            opacity: 0.03,
            color: C.gold,
            fontFamily: "var(--font-headings)",
            userSelect: "none"
          }}>“</div>
          <div style={{
            fontSize: 10,
            color: C.gold,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: 14,
            fontFamily: "sans-serif",
            fontWeight: 700
          }}>
            Guruji's Bani
          </div>
          <h3 style={{
            fontSize: "clamp(20px, 4vw, 25px)",
            fontStyle: "italic",
            color: C.cream,
            margin: "0 0 16px",
            lineHeight: 1.6,
            fontWeight: "normal"
          }}>
            "{vachan.punjabi}"
          </h3>
          <p style={{
            fontSize: "clamp(14px, 3.2vw, 16px)",
            color: C.gold,
            margin: 0,
            fontStyle: "italic",
            lineHeight: 1.6
          }}>
            — {vachan.english}
          </p>
        </div>
      </SectionWrap>

      <SectionWrap label="Guruji's Swaroops">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {gurujiImgs.map((src, i) => (
            <a
              key={i}
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              title={`Open full-size Guruji image ${i + 1}`}
              style={{
                display: "block",
                width: 116,
                height: 138,
                borderRadius: 8,
                overflow: "hidden",
                border: `1px solid ${C.border}`
              }}
            >
              <img
                src={src}
                alt={`Guruji ${i + 1}`}
                loading="lazy"
                decoding="async"
                width={116}
                height={138}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                onError={e => { e.target.style.display = "none"; }}
              />
            </a>
          ))}
        </div>
      </SectionWrap>
    </div>
  );
}
