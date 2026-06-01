import { C } from "../../utils/constants";
import Label from "./Label";

export default function FField({ label, type = "text", v, on, ph, ...rest }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <Label>{label}</Label>
      <input
        type={type}
        value={v}
        onChange={on}
        placeholder={ph}
        {...rest}
        style={{
          width: "100%",
          background: "rgba(255,255,255,0.04)",
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          padding: "11px 14px",
          color: C.cream,
          fontSize: 15,
          fontFamily: "var(--font-body)",
          outline: "none",
          boxSizing: "border-box"
        }}
      />
    </div>
  );
}
