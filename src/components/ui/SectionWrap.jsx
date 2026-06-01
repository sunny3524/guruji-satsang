import { C } from "../../utils/constants";

export default function SectionWrap({ label, shaded, children }) {
  return (
    <div style={{
      background: shaded ? "rgba(255,255,255,0.015)" : "transparent",
      borderTop: shaded ? `1px solid ${C.border}` : "none",
      borderBottom: shaded ? `1px solid ${C.border}` : "none",
      padding: "48px 0"
    }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 32px" }}>
        {label && (
          <div style={{
            fontSize: 10,
            letterSpacing: "0.22em",
            color: C.gold,
            textTransform: "uppercase",
            marginBottom: 22,
            fontFamily: "sans-serif"
          }}>
            {label}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
