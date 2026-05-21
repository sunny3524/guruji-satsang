// ─── Auth Context ─────────────────────────────────────────────────────────────
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthChange } from "../firebase/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(undefined); // undefined = loading
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const unsub = onAuthChange((u) => {
      setUser(u);
      setProfile(u?.profile || null);
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading: user === undefined }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
