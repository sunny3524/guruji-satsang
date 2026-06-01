import { C } from "../../utils/constants";
import gurujiCharan from "../../assets/images/Guruji Charan.jpg";

export default function FWrap({ title, sub, children }) {
  return (
    <div style={{ maxWidth: 620, margin: "0 auto", padding: "48px 32px" }}>
      <div style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: "40px 44px"
      }}>
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <img
            src={gurujiCharan}
            alt="Guruji Charan"
            style={{
              width: 68,
              height: 68,
              borderRadius: "50%",
              objectFit: "cover",
              border: `2px solid ${C.gold}`,
              marginBottom: 12,
              boxShadow: `0 0 20px rgba(212,151,42,0.3)`
            }}
            onError={e => { e.target.style.display = "none"; }}
          />
          <div style={{
            fontSize: 9,
            letterSpacing: "0.28em",
            color: C.gold,
            textTransform: "uppercase",
            marginBottom: 10,
            fontFamily: "sans-serif"
          }}>
            OM NAMAH SHIVAY
          </div>
          <h2 style={{ color: C.cream, fontSize: 25, margin: "0 0 6px" }}>{title}</h2>
          {sub && <p style={{ color: C.muted, fontSize: 14 }}>{sub}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
