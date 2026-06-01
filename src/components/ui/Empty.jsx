import { C } from "../../utils/constants";

export default function Empty({ children }) {
  return (
    <div style={{
      textAlign: "center",
      padding: "60px 32px",
      color: C.muted,
      fontSize: 17,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 20
    }}>
      {children}
    </div>
  );
}
