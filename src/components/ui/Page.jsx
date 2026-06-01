import { C } from "../../utils/constants";

export default function Page({ title, sub, children }) {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 32px" }}>
      <h2 style={{ fontSize: 32, fontWeight: 700, color: C.cream, margin: "0 0 8px" }}>{title}</h2>
      {sub && <p style={{ color: C.muted, marginBottom: 28, fontSize: 15 }}>{sub}</p>}
      {children}
    </div>
  );
}
