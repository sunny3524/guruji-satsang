import { C } from "../../utils/constants";

export default function Btn({ onClick, children, outline, ghost, disabled, full, style = {} }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: outline || ghost ? "none" : C.gold,
        color: outline ? C.gold : ghost ? C.muted : C.bg,
        border: outline ? `1px solid ${C.gold}` : ghost ? `1px solid ${C.border}` : "none",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        fontSize: 15,
        fontWeight: 700,
        padding: "12px 24px",
        borderRadius: 8,
        width: full ? "100%" : undefined,
        transition: "all 0.2s ease",
        outline: "none",
        ...style
      }}
    >
      {children}
    </button>
  );
}
