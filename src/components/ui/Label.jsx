import { C } from "../../utils/constants";

export default function Label({ children }) {
  return (
    <label style={{
      display: "block",
      fontSize: 10,
      color: C.muted,
      marginBottom: 7,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      fontFamily: "sans-serif"
    }}>
      {children}
    </label>
  );
}
