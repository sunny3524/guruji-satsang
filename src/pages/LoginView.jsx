import { useState } from "react";
import { loginUser } from "../firebase/auth";
import { C } from "../utils/constants";
import FWrap from "../components/ui/FWrap";
import FField from "../components/ui/FField";
import Btn from "../components/ui/Btn";

export default function LoginView({ nav, notify }) {
  const [f, setF] = useState({ email: "", password: "" });
  const [busy, setBusy] = useState(false);
  
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));

  const submit = async () => {
    setBusy(true);
    try {
      await loginUser(f.email, f.password);
      notify("Jai Guruji! Welcome back 🙏");
      nav("find");
    } catch (e) {
      notify(e.message.replace("Firebase:", "").trim(), "err");
    }
    setBusy(false);
  };

  return (
    <FWrap title="Welcome Back" sub="Login to your Sangat account">
      <FField label="Email *" type="email" v={f.email} on={set("email")} />
      <FField label="Password *" type="password" v={f.password} on={set("password")} />
      <Btn onClick={submit} disabled={busy} full>{busy ? "Logging in…" : "Login →"}</Btn>
      
      <p style={{ textAlign: "center", color: C.muted, fontSize: 13, marginTop: 14 }}>
        <button
          onClick={() => nav("forgot")}
          style={{ background: "none", border: "none", color: C.gold, cursor: "pointer", textDecoration: "underline" }}
        >
          Forgot password?
        </button>
      </p>
      
      <p style={{ textAlign: "center", color: C.muted, fontSize: 14, marginTop: 8 }}>
        New to the Sangat?{" "}
        <button
          onClick={() => nav("register")}
          style={{ background: "none", border: "none", color: C.gold, cursor: "pointer", textDecoration: "underline" }}
        >
          Join here
        </button>
      </p>
    </FWrap>
  );
}
