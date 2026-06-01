import { useState } from "react";
import { resetPassword } from "../firebase/auth";
import { C } from "../utils/constants";
import FWrap from "../components/ui/FWrap";
import FField from "../components/ui/FField";
import Btn from "../components/ui/Btn";

export default function ForgotView({ nav, notify }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await resetPassword(email);
      notify("Password reset email sent! Check your inbox 🙏");
      nav("login");
    } catch (e) {
      notify(e.message.replace("Firebase:", "").trim(), "err");
    }
    setBusy(false);
  };

  return (
    <FWrap title="Reset Password" sub="We'll send a reset link to your email">
      <FField label="Email Address *" type="email" v={email} on={e => setEmail(e.target.value)} />
      <Btn onClick={submit} disabled={busy} full>{busy ? "Sending…" : "Send Reset Link →"}</Btn>
      <p style={{ textAlign: "center", color: C.muted, fontSize: 14, marginTop: 20 }}>
        <button
          onClick={() => nav("login")}
          style={{ background: "none", border: "none", color: C.gold, cursor: "pointer", textDecoration: "underline" }}
        >
          ← Back to login
        </button>
      </p>
    </FWrap>
  );
}
