// ─── Guruji Satsang Management App — Firebase Edition ────────────────────────
// Full Firebase integration: Auth, Firestore, Cloud Functions (email)
import { useState, useEffect, useCallback } from "react";
import { registerUser, loginUser, logoutUser, resetPassword } from "./firebase/auth";
import {
  createSatsang, getUpcomingSatsangs, getSatsang, getSatsangsByOrganizer,
  getAllSatsangs, updateSatsang, cancelSatsang, getAllUsers, updateUserRole,
  getAttendees, checkAttendance, removeAttendance,
  getUserAttendanceSatsangs, enrollSeva, withdrawSeva, subscribeSatsang,
} from "./firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { functions } from "./firebase/config";
import { useAuth, AuthProvider } from "./hooks/useAuth";

const gurujiImages = import.meta.glob("./assets/images/*.{png,jpg,jpeg,bmp,JPG,JPEG}", { eager: true });
const GURUJI_IMGS = Object.entries(gurujiImages)
  .sort(([pathA], [pathB]) => pathA.localeCompare(pathB))
  .map(([, module]) => module.default)
  .filter(Boolean)
  .slice(0, 12); // Limit to the first 12 images for faster page load


const STANDARD_SEVAS = [
  { id: "s1", icon: "🍲", name: "Langar Distribution Seva", desc: "Serving Langar Prashad during the satsang" },
  { id: "s2", icon: "🧑🏽‍🍳", name: "Langar Preparation Seva", desc: "Preparing Langar either in your house or host's, see details" },
  { id: "s3", icon: "🗑️", name: "Disposable Collection Seva", desc: "Collecting the disposables during the satsang" },
  { id: "s4", icon: "🌸", name: "Decoration Seva", desc: "Darbar decoration & fresh flowers" },
  { id: "s5", icon: "☕️", name: "Chai Prasad Distribution Seva", desc: "Serving chai prasad during the satsang" },
  { id: "s6", icon: "🚗", name: "Transport Seva", desc: "Pickup & drop-off coordination or Parking Management" },
  { id: "s7", icon: "🎛️", name: "AV Seva", desc: "Bringing audio/visual equipment and setup for the satsang" },
  { id: "s8", icon: "🧹", name: "Cleaning Seva", desc: "Pre/post event cleaning" },
  { id: "s9", icon: "👶", name: "Children Seva", desc: "Child care & quiet activities" },
];

const GUIDELINES = [
  {
    icon: "🏠", title: "Setting Up Your Darbar", items: [
      "Choose a clean, quiet area of the venue dedicated as Guruji's Darbar (spiritual court).",
      "Place Guruji's Swaroop (photograph) on a clean chair or elevated table draped with a fresh white or saffron cloth.",
      "Light a single diya (oil lamp) or Akhand Jyot near the Swaroop before the sangat arrives.",
      "Arrange fresh flowers — roses or lilies are ideal — near the photograph.",
      "Provide floor seating on rugs or cushions. Chairs should be available for elderly sangat.",
      "Ensure the venue is clean and fragrant with incense before the first sangat arrives.",
    ]
  },
  {
    icon: "⏰", title: "Timings & Order of Service", items: [
      "Begin punctually at the stated time — do not wait for late arrivals. Discipline in timings is Guruji's teaching.",
      "Offer Jal Prasad (water) to all sangat at the entrance on arrival.",
      "Shabad Gurbani should be played for 90–120 minutes, including Mantra Jaap and Aarti.",
      "Chai Prasad and snack prasad should be served in 15-minute intervals, no more than 4 times, finishing 30 minutes before the Satsang ends.",
      "Mantra Jaap is followed by Shivji Ki Aarti (approximately 5 minutes).",
      "Satsang sharing follows the Aarti. If it exceeds 30 minutes, begin serving Langar Prasad alongside.",
      "Kada Prasad is served after Satsang sharing, preferably placed in hands.",
      "All sangat should take Aagya from Guruji and head home directly after Langar Prasad.",
    ]
  },
  {
    icon: "🔇", title: "Conduct & Discipline", items: [
      "Switch off or silence all mobile phones before entering the Satsang hall.",
      "Maintain noble silence throughout. The direct connection with Guruji is built through silent meditation.",
      "Do not socialise or greet the host during the Satsang — reserve all greetings until after.",
      "Wear modest, clean and respectable clothing to Satsang.",
      "Do not touch Guruji's photograph or the Akhand Jyot.",
      "Sangat with young children should sit at the back of the hall.",
      "Children below 12 years of age should not perform any Seva.",
      "Follow the instructions of Sevadars at all times.",
    ]
  },
  {
    icon: "🎵", title: "Shabad & Music Guidelines", items: [
      "Only Gurbani Shabads, Guruji's Mantra Jaap, and Shivji Ki Aarti should be played.",
      "At least one Gurbani with Vyakhya (explanation) must be included.",
      "Bhajans may be played toward the end of the Satsang.",
      "Do not change or interfere with the playlist during Satsang.",
      "All sangat is encouraged to chant along with Guruji's Mantra Jaap recording.",
    ]
  },
  {
    icon: "🍵", title: "Prasad & Langar", items: [
      "Jal Prasad is offered first — to Guruji's Swaroop then distributed to all sangat.",
      "Keep portions to a quantity the sangat can comfortably finish — prasad must never be wasted.",
      "Guruji's Langar is a simple, pure vegetarian meal: one dal, one sabzi, roti or rice, and a sweet.",
      "Finish all Langar Prasad entirely — every morsel carries Guruji's blessings.",
      "Serve all prasad silently and respectfully.",
    ]
  },
  {
    icon: "🙏", title: "Satsang Sharing", items: [
      "Guruji always encouraged sangat to share their personal experiences of His blessings.",
      "Keep sharing concise and personal — do not deliver lectures or sermons.",
      "This gives every sangat member an equal chance to share.",
      "The host should gently guide proceedings if sharing becomes prolonged.",
    ]
  },
  {
    icon: "🚗", title: "After the Satsang", items: [
      "Go home directly after Satsang. Do not linger outside socialising.",
      "If dropping someone home, go directly and then straight to your own home.",
      "Sevadars should ensure the venue is left clean and the Jyot safely extinguished.",
    ]
  },
  {
    icon: "🌟", title: "Organiser Responsibilities", items: [
      "Inform all invited guests of the guidelines before the Satsang.",
      "Ensure the Jyot is lit at the scheduled time.",
      "Arrange for Sevadars in advance across all required roles.",
      "Notify neighbours in advance to prevent noise complaints.",
      "Keep the atmosphere serene and spiritual at all times.",
      "The purpose of Satsang is devotion — keep it simple, disciplined and pure.",
    ]
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().split("T")[0];
const fmtDate = d => new Date(d + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const fmtTime = t => { if (!t) return ""; const [h, m] = t.split(":"); const ap = +h >= 12 ? "PM" : "AM"; return `${((+h % 12) || 12).toString().padStart(2, "0")}:${m} ${ap}`; };
const uid = () => Math.random().toString(36).slice(2, 9);

// ─── Colors ───────────────────────────────────────────────────────────────────
const C = {
  bg: "#1a0800", card: "#270e03", border: "#5c2a0a",
  gold: "#d4972a", saffron: "#e06b10", cream: "#f5e8d0",
  muted: "#9c7050", red: "#7a1a0a",
};

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

function AppInner() {
  const { user, profile, loading } = useAuth();
  const [view, setView] = useState("home");
  const [sel, setSel] = useState(null);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [heroImg] = useState(GURUJI_IMGS[Math.floor(Math.random() * GURUJI_IMGS.length)]);

  const notify = (msg, type = "ok") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3600); };

  const nav = (v, p = null) => { setSel(p); setView(v); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const loadUpcoming = useCallback(async () => {
    try { setUpcoming(await getUpcomingSatsangs()); } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { loadUpcoming(); }, [loadUpcoming]);

  const searchTerm = search.trim().toLowerCase();
  const filtered = searchTerm
    ? upcoming.filter(s => s.city?.toLowerCase().includes(searchTerm) || s.postcode?.toLowerCase().includes(searchTerm))
    : upcoming;

  const isAdmin = profile?.role === "admin";

  const navItems = user
    ? [
      { l: "Find Satsang", v: "find" },
      { l: "Guidelines", v: "guidelines" },
      { l: "Satsang Dashboard", v: "dashboard" },
      ...(isAdmin ? [{ l: "⚙ Admin", v: "admin" }] : []),
      { l: "+ Host", v: "post", accent: true },
      { l: "Logout", fn: async () => { await logoutUser(); nav("home"); } },
    ]
    : [
      { l: "Find Satsang", v: "find" },
      { l: "Guidelines", v: "guidelines" },
      { l: "Login", v: "login" },
      { l: "Join Sangat", v: "register", accent: true },
    ];

  if (loading) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <img src={GURUJI_IMGS[0]} alt="Guruji" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: `2px solid ${C.gold}`, opacity: 0.8 }} onError={e => { e.target.style.display = "none"; }} />
      <p style={{ color: C.gold, fontFamily: "Georgia,serif", letterSpacing: "0.15em", fontSize: 13 }}>OM NAMAH SHIVAY…</p>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(160deg,#1a0800 0%,#0f0500 100%)`, color: C.cream, fontFamily: "Georgia,'Times New Roman',serif" }}>
      <div style={{ height: 4, background: `linear-gradient(90deg,${C.red},${C.gold},${C.saffron},${C.gold},${C.red})` }} />

      {/* NAV */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", height: 66, background: "rgba(26,8,0,0.97)", borderBottom: `1px solid ${C.border}`, position: "sticky", top: 4, zIndex: 100, backdropFilter: "blur(12px)" }}>
        <button onClick={() => nav("home")} style={{ display: "flex", alignItems: "center", gap: 12, background: "none", border: "none", cursor: "pointer" }}>
          <img src={GURUJI_IMGS[0]} alt="Guruji" style={{ width: 42, height: 42, borderRadius: "50%", objectFit: "cover", border: `2px solid ${C.gold}` }} onError={e => { e.target.style.display = "none"; }} />
          <span>
            <span style={{ display: "block", fontSize: 17, fontWeight: 700, color: C.gold, letterSpacing: "0.02em" }}>Guruji Satsang</span>
            <span style={{ display: "block", fontSize: 9, color: C.muted, letterSpacing: "0.2em", fontFamily: "sans-serif" }}>OM NAMAH SHIVAY</span>
          </span>
        </button>
        <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
          {navItems.map(item => (
            <button key={item.l} onClick={item.fn ? item.fn : () => nav(item.v)}
              style={item.accent
                ? { background: C.gold, border: "none", cursor: "pointer", color: C.bg, fontSize: 13, fontWeight: 700, padding: "7px 16px", borderRadius: 6 }
                : { background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 13, padding: "7px 14px", borderRadius: 6 }}>
              {item.l}
            </button>
          ))}
        </div>
      </nav>

      {toast && <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: toast.type === "err" ? "#5a1010" : "#3a1800", color: C.gold, padding: "13px 28px", borderRadius: 10, fontSize: 15, fontWeight: 600, zIndex: 9999, border: `1px solid ${C.border}`, whiteSpace: "nowrap", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>{toast.msg}</div>}

      <main>
        {view === "home" && <HomeView nav={nav} upcoming={upcoming} user={user} heroImg={heroImg} />}
        {view === "login" && <LoginView nav={nav} notify={notify} />}
        {view === "register" && <RegisterView nav={nav} notify={notify} />}
        {view === "forgot" && <ForgotView nav={nav} notify={notify} />}
        {view === "find" && <FindView filtered={filtered} search={search} setSearch={setSearch} nav={nav} user={user} />}
        {view === "detail" && <DetailView satsangId={sel} user={user} profile={profile} nav={nav} notify={notify} onRefresh={loadUpcoming} />}
        {view === "post" && <PostView user={user} profile={profile} nav={nav} notify={notify} onRefresh={loadUpcoming} />}
        {view === "dashboard" && <DashboardView user={user} profile={profile} nav={nav} notify={notify} />}
        {view === "guidelines" && <GuidelinesView />}
        {view === "admin" && isAdmin && <AdminView user={user} profile={profile} nav={nav} notify={notify} />}
      </main>

      <footer style={{ borderTop: `1px solid ${C.border}`, padding: "28px 32px", textAlign: "center" }}>
        <div style={{ fontSize: 10, color: C.gold, letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 8, fontFamily: "sans-serif" }}>
          OM NAMAH SHIVAY SHIVJI SADA SAHAY · OM NAMAH SHIVAY GURUJI SADA SAHAY
        </div>
        <div style={{ fontSize: 13, color: C.muted }}>Guruji Satsang · Built with devotion & seva 🙏</div>
      </footer>
    </div>
  );
}

// ─── Home ─────────────────────────────────────────────────────────────────────
function HomeView({ nav, upcoming, user, heroImg }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 1180, margin: "0 auto", padding: "56px 32px 40px", gap: 48, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 380px", maxWidth: 540 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.28em", color: C.gold, textTransform: "uppercase", marginBottom: 18, fontFamily: "sans-serif" }}>OM NAMAH SHIVAY GURUJI SADA SAHAY</div>
          <h1 style={{ fontSize: "clamp(44px,7vw,82px)", lineHeight: 1.05, fontWeight: 700, margin: "0 0 18px", color: C.cream }}>
            Guruji<br /><span style={{ color: C.gold, fontStyle: "italic" }}>Satsang</span>
          </h1>
          <p style={{ fontSize: 17, color: C.muted, lineHeight: 1.85, marginBottom: 30, maxWidth: 440 }}>
            Connect with the Sangat. Find Satsangs near you, offer Seva, and grow together in Guruji's divine presence.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Btn onClick={() => nav("find")}>Find Satsang →</Btn>
            <Btn outline onClick={() => nav("guidelines")}>Satsang Guidelines</Btn>
            {!user && <Btn ghost onClick={() => nav("register")}>Join the Sangat</Btn>}
          </div>
        </div>
        <div style={{ flex: "0 0 auto" }}>
          <div style={{ border: `3px solid ${C.gold}`, borderRadius: 14, overflow: "hidden", boxShadow: `0 0 50px rgba(212,151,42,0.25)`, maxWidth: 280 }}>
            <img src={heroImg} alt="Guruji Maharaj" style={{ width: 280, height: 340, objectFit: "cover", display: "block" }} onError={e => { e.target.style.display = "none"; }} />
            <div style={{ background: C.card, padding: "10px 16px", fontSize: 11, color: C.gold, textAlign: "center", letterSpacing: "0.08em", borderTop: `1px solid ${C.border}` }}>
              Guruji Maharaj · Lord Shiva in Human Form
            </div>
          </div>
        </div>
      </div>
      <SectionWrap label="Upcoming Satsangs" shaded>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {upcoming.slice(0, 3).map(s => <SCard key={s.id} s={s} nav={nav} />)}
          {upcoming.length === 0 && <p style={{ color: C.muted, fontSize: 15 }}>No upcoming satsangs yet. Be the first to host one! 🙏</p>}
        </div>
      </SectionWrap>
      <SectionWrap label="Guruji's Swaroops">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {GURUJI_IMGS.map((src, i) => (
            <a key={i} href={src} target="_blank" rel="noopener noreferrer" title={`Open full-size Guruji image ${i + 1}`} style={{ display: "block", width: 116, height: 138, borderRadius: 8, overflow: "hidden", border: `1px solid ${C.border}` }}>
              <img
                src={src}
                alt={`Guruji ${i + 1}`}
                loading="lazy"
                decoding="async"
                width={116}
                height={138}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                onError={e => { e.target.style.display = "none"; }}
              />
            </a>
          ))}
        </div>
      </SectionWrap>
    </div>
  );
}

// ─── Find ─────────────────────────────────────────────────────────────────────
function FindView({ filtered, search, setSearch, nav, user }) {
  return (
    <Page title="Find a Satsang" sub="Search upcoming Satsangs by city or postcode">
      <div style={{ display: "flex", alignItems: "center", gap: 12, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 18px", marginBottom: 32, maxWidth: 400 }}>
        <span style={{ fontSize: 18 }}>🔍</span>
        <input style={{ background: "none", border: "none", outline: "none", color: C.cream, fontSize: 15, width: "100%", fontFamily: "Georgia,serif" }} placeholder="City or postcode…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {filtered.length === 0
        ? <Empty><p>No Satsangs found in that area yet.</p>{user && <Btn onClick={() => nav("post")}>Host the first one →</Btn>}</Empty>
        : <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>{filtered.map(s => <SCard key={s.id} s={s} nav={nav} />)}</div>
      }
    </Page>
  );
}

// ─── Detail (live Firestore subscription) ─────────────────────────────────────
function DetailView({ satsangId, user, profile, nav, notify, onRefresh }) {
  const [s, setS] = useState(null);
  const [attendees, setAt] = useState([]);
  const [myAtt, setMyAtt] = useState(null);
  const [guests, setGuests] = useState(0);
  const [selSv, setSelSv] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!satsangId) return;
    // Real-time subscription
    const unsub = subscribeSatsang(satsangId, setS);
    return unsub;
  }, [satsangId]);

  useEffect(() => {
    if (!satsangId || !user) return;
    checkAttendance(satsangId, user.uid).then(setMyAtt);
    getAttendees(satsangId).then(setAt);
  }, [satsangId, user]);

  if (!s) return <div style={{ textAlign: "center", padding: 80, color: C.muted }}>Loading Satsang… 🙏</div>;

  const left = s.maxAttendees - (s.attendeeCount || 0);
  const mySevaNames = Object.values(s.sevas || {}).filter(sv => sv.enrolled?.some(e => e.uid === user?.uid)).map(sv => STANDARD_SEVAS.find(x => x.id === sv.id)?.name);
  const toggleSv = id => setSelSv(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const markAtt = async () => {
    if (!user) { notify("Please login to register", "err"); nav("login"); return; }
    if (myAtt) { notify("Already registered", "err"); return; }
    if (left < 1 + guests) { notify("Not enough spots", "err"); return; }
    setBusy(true);
    try {
      const registerAttendanceFn = httpsCallable(functions, "registerAttendance");
      await registerAttendanceFn({
        satsangId,
        guests,
        userName: profile?.name || user.displayName,
        userEmail: user.email,
        userPhone: profile?.phone || "",
      });
      // Enroll selected sevas
      for (const svId of selSv) {
        const meta = STANDARD_SEVAS.find(x => x.id === svId);
        const enrollSevaFn = httpsCallable(functions, "enrollSeva");
        await enrollSevaFn({ satsangId, sevaId: svId, userName: profile?.name || user.displayName });
        // Send seva confirmation email via Cloud Function
        try {
          const sendSevaConf = httpsCallable(functions, "sendSevaConfirmation");
          await sendSevaConf({ userEmail: user.email, userName: profile?.name, sevaName: meta?.name, satsangTitle: s.title, satsangDate: `${s.date} at ${s.time}`, satsangAddress: `${s.address}, ${s.city}` });
        } catch (e) { console.warn("Email fn:", e); }
      }
      setMyAtt({ guests });
      setSelSv([]);
      onRefresh();
      notify(`Jai Guruji! Registered${guests > 0 ? ` with ${guests} guest(s)` : ""} 🙏`);
    } catch (e) { notify(e.message, "err"); }
    setBusy(false);
  };

  const doEnrollSeva = async (svId) => {
    if (!user) { notify("Please login first", "err"); nav("login"); return; }
    const sv = Object.values(s.sevas || {}).find(x => x.id === svId);
    if ((sv?.enrolled || []).some(e => e.uid === user.uid)) { notify("Already enrolled", "err"); return; }
    if ((sv?.opted || 0) >= (sv?.needed || 0)) { notify("Seva is full", "err"); return; }
    setBusy(true);
    try {
      const enrollSevaFn = httpsCallable(functions, "enrollSeva");
      await enrollSevaFn({ satsangId, sevaId: svId, userName: profile?.name || user.displayName });
      const meta = STANDARD_SEVAS.find(x => x.id === svId);
      try {
        const sendSevaConf = httpsCallable(functions, "sendSevaConfirmation");
        await sendSevaConf({ userEmail: user.email, userName: profile?.name, sevaName: meta?.name, satsangTitle: s.title, satsangDate: `${s.date} at ${s.time}`, satsangAddress: `${s.address}, ${s.city}` });
      } catch (e) { console.warn("Email fn:", e); }
      notify("Shukrana Guruji · Seva enrolled 🙏");
    } catch (e) { notify(e.message, "err"); }
    setBusy(false);
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 32px" }}>
      <button onClick={() => nav("find")} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 14, padding: "0 0 20px", display: "block" }}>← Back to search</button>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: "32px 36px", marginBottom: 32 }}>
        <div style={{ fontSize: 10, color: C.gold, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10, fontFamily: "sans-serif" }}>{fmtDate(s.date)} · {fmtTime(s.time)}</div>
        <h2 style={{ fontSize: 32, fontWeight: 700, color: C.cream, margin: "0 0 10px" }}>{s.title}</h2>
        <div style={{ fontSize: 14, color: C.muted, marginBottom: 14 }}>📍 {s.address}, {s.city} {s.postcode}</div>
        {s.description && <p style={{ fontSize: 15, color: "#c0a060", lineHeight: 1.8, marginBottom: 22 }}>{s.description}</p>}
        <div style={{ display: "flex", gap: 28, marginBottom: 22, flexWrap: "wrap" }}>
          {[["Attending", `${s.attendeeCount || 0}/${s.maxAttendees}`, false], ["Spots Left", left, left < 20], ["Seva Roles", Object.keys(s.sevas || {}).length, false]].map(([l, v, h]) => (
            <div key={l} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: h ? C.saffron : C.gold }}>{v}</div>
              <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "sans-serif" }}>{l}</div>
            </div>
          ))}
        </div>
        {s.organizerName && <div style={{ padding: "12px 16px", background: "rgba(255,255,255,0.03)", borderRadius: 8, fontSize: 14, color: C.muted }}>
          Hosted by <strong style={{ color: C.gold }}>{s.organizerName}</strong>
          {s.organizerEmail && <> · <a href={`mailto:${s.organizerEmail}`} style={{ color: C.gold }}>{s.organizerEmail}</a></>}
          {s.organizerPhone && <> · {s.organizerPhone}</>}
        </div>}
      </div>

      {/* Seva */}
      <h3 style={{ fontSize: 20, fontWeight: 700, color: C.cream, marginBottom: 18 }}>🙏 Seva Opportunities</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(172px,1fr))", gap: 14, marginBottom: 40 }}>
        {Object.entries(s.sevas || {}).map(([svId, sv]) => {
          const m = STANDARD_SEVAS.find(x => x.id === sv.id);
          const enrolled = sv.enrolled || [];
          const opted = sv.opted || 0;
          const full = opted >= sv.needed;
          const mine = user && enrolled.some(e => e.uid === user.uid);
          return (
            <div key={sv.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 16px", display: "flex", flexDirection: "column", gap: 6, opacity: full && !mine ? 0.55 : 1 }}>
              <div style={{ fontSize: 28 }}>{m?.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.cream }}>{m?.name}</div>
              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, flexGrow: 1 }}>{m?.desc}</div>
              <div style={{ fontSize: 12, color: C.gold, fontFamily: "sans-serif" }}>Needed: {sv.needed} · Opted: {opted}</div>
              {mine
                ? <div style={{ color: "#c8a04a", fontSize: 12, fontWeight: 700, marginTop: 4 }}>✓ You're enrolled</div>
                : <button onClick={() => doEnrollSeva(sv.id)} disabled={full || busy} style={{ marginTop: 6, background: full ? C.border : C.gold, color: full ? C.muted : C.bg, border: "none", cursor: full ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 700, padding: "7px 14px", borderRadius: 6 }}>{full ? "Full" : "Offer Seva"}</button>}
            </div>
          );
        })}
      </div>

      {/* Attendance */}
      {!myAtt ? (
        <div>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: C.cream, marginBottom: 18 }}>📋 Register Attendance</h3>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "24px 28px" }}>
            <Label>Guests (excluding yourself)</Label>
            <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 24 }}>
              <button onClick={() => setGuests(Math.max(0, guests - 1))} style={{ width: 36, height: 36, borderRadius: "50%", background: "none", border: `1px solid ${C.border}`, color: C.cream, fontSize: 20, cursor: "pointer" }}>−</button>
              <span style={{ fontSize: 28, fontWeight: 700, color: C.gold, width: 36, textAlign: "center" }}>{guests}</span>
              <button onClick={() => setGuests(guests + 1)} style={{ width: 36, height: 36, borderRadius: "50%", background: "none", border: `1px solid ${C.border}`, color: C.cream, fontSize: 20, cursor: "pointer" }}>+</button>
            </div>
            <Label>Also offer Seva? (optional)</Label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
              {Object.values(s.sevas || {}).map(sv => {
                const m = STANDARD_SEVAS.find(x => x.id === sv.id);
                const full = (sv.opted || 0) >= sv.needed;
                const on = selSv.includes(sv.id);
                return <button key={sv.id} disabled={full} onClick={() => !full && toggleSv(sv.id)}
                  style={{ background: on ? `rgba(212,151,42,0.15)` : "none", border: `1px solid ${on ? C.gold : C.border}`, borderRadius: 20, padding: "6px 14px", color: on ? C.gold : C.muted, fontSize: 13, cursor: full ? "default" : "pointer" }}>
                  {m?.icon} {m?.name}{full ? " (full)" : ""}
                </button>;
              })}
            </div>
            <Btn onClick={markAtt} disabled={busy} full>{busy ? "Registering…" : "Register Attendance →"}</Btn>
          </div>
        </div>
      ) : (
        <div style={{ background: "rgba(212,151,42,0.1)", border: `1px solid rgba(212,151,42,0.35)`, borderRadius: 10, padding: "18px 24px", color: C.gold, fontSize: 16, fontWeight: 600 }}>
          ✓ You are registered{myAtt.guests > 0 ? ` with ${myAtt.guests} guest(s)` : ""}
          {mySevaNames.length > 0 && ` · Seva: ${mySevaNames.join(", ")}`}
        </div>
      )}
    </div>
  );
}

// ─── Post ─────────────────────────────────────────────────────────────────────
function PostView({ user, profile, nav, notify, onRefresh }) {
  const [f, setF] = useState({ title: "", city: "", postcode: "", address: "", date: "", time: "", maxAttendees: 100, description: "" });
  const [chosenSv, setChosenSv] = useState([]);
  const [showSevaPanel, setShowSevaPanel] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("guruji.showSevaPanel") === "true";
  });
  const [busy, setBusy] = useState(false);
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));

  if (!user) return <Empty><p>Please login to host a Satsang.</p><Btn onClick={() => nav("login")}>Login →</Btn></Empty>;

  const toggleSv = id => setChosenSv(p => p.find(x => x.id === id) ? p.filter(x => x.id !== id) : [...p, { id, needed: 2, confirmed: 0 }]);
  const setNd = (id, v) => setChosenSv(p => p.map(x => x.id === id ? { ...x, needed: +v, confirmed: Math.min(x.confirmed || 0, +v) } : x));

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("guruji.showSevaPanel", showSevaPanel ? "true" : "false");
  }, [showSevaPanel]);

  const submit = async () => {
    if (!f.title || !f.city || !f.address || !f.date || !f.time) { notify("Please fill all required fields", "err"); return; }
    setBusy(true);
    try {
      const sevas = chosenSv.reduce((acc, sv) => ({
        ...acc,
        [sv.id]: { id: sv.id, needed: sv.needed, opted: 0, confirmed: sv.confirmed || 0, enrolled: [] }
      }), {});
      await createSatsang({
        ...f, maxAttendees: +f.maxAttendees, sevas,
        organizerName: profile?.name || user.displayName,
        organizerEmail: user.email,
        organizerPhone: profile?.phone || "",
      }, user.uid);
      onRefresh();
      notify("Satsang posted! Shukrana Guruji 🙏");
      nav("find");
    } catch (e) { notify(e.message, "err"); }
    setBusy(false);
  };

  return (
    <FWrap title="Host a Satsang" sub="Open your home to Guruji's Sangat">
      <FField label="Satsang Title *" v={f.title} on={set("title")} ph="e.g. Shivratri Satsang" />
      <FField label="Description" v={f.description} on={set("description")} ph="Brief description…" />
      <FField label="Venue Address *" v={f.address} on={set("address")} ph="Full street address" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <FField label="City *" v={f.city} on={set("city")} />
        <FField label="Postcode" v={f.postcode} on={set("postcode")} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <FField label="Date *" type="date" v={f.date} on={set("date")} />
        <FField label="Time *" type="time" v={f.time} on={set("time")} />
      </div>
      <FField label="Max Attendees *" type="number" v={f.maxAttendees} on={set("maxAttendees")} />
      <div style={{ marginTop: 26 }}>
        <button onClick={() => setShowSevaPanel(p => !p)} style={{ background: "none", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, width: "100%", padding: "16px 20px", textAlign: "left", color: C.cream, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Choose the sevas needed for the satsang</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>Open this section only if you want to assign seva roles.</div>
          </div>
          <span style={{ fontSize: 18, transform: showSevaPanel ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .2s" }}>▼</span>
        </button>
        {showSevaPanel && <>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 14, marginTop: 18 }}>You may choose Sevas if you want, or leave this blank and host the Satsang without assigned roles.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10 }}>
            {STANDARD_SEVAS.map(sv => {
              const ch = chosenSv.find(x => x.id === sv.id);
              return (
                <div key={sv.id} style={{ background: ch ? `rgba(212,151,42,0.07)` : "rgba(255,255,255,0.02)", border: `1px solid ${ch ? C.gold : C.border}`, borderRadius: 10, overflow: "hidden" }}>
                  <button onClick={() => toggleSv(sv.id)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4, padding: "13px 14px 10px", width: "100%", textAlign: "left", color: C.cream }}>
                    <span style={{ fontSize: 22 }}>{sv.icon}</span>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{sv.name}</span>
                    <span style={{ fontSize: 11, color: C.muted }}>{sv.desc}</span>
                  </button>
                  {ch && <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10, padding: "4px 14px 12px", fontSize: 12, color: C.muted }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span>Needed</span>
                      <input type="number" min={1} max={50} value={ch.needed} onChange={e => setNd(sv.id, e.target.value)} style={{ width: 70, background: "rgba(255,255,255,0.07)", border: `1px solid ${C.border}`, borderRadius: 4, color: C.cream, fontSize: 13, padding: "3px 6px", outline: "none" }} />
                    </label>
                  </div>}
                </div>
              );
            })}
          </div>
        </>}
      </div>
      <div style={{ marginTop: 32 }}><Btn onClick={submit} disabled={busy} full>{busy ? "Posting…" : "Post Satsang →"}</Btn></div>
    </FWrap>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function DashboardView({ user, profile, nav, notify }) {
  const [hosted, setHosted] = useState([]);
  const [attending, setAttending] = useState([]);

  useEffect(() => {
    if (!user?.uid) return;
    getUserAttendanceSatsangs(user.uid)
      .then(attended => {
        const sorted = attended
          .filter(Boolean)
          .sort((a, b) => a.date.localeCompare(b.date) || (a.time || "").localeCompare(b.time || ""));
        setAttending(sorted);
      })
      .catch(err => {
        console.error("attendance load failed", err);
        setAttending([]);
      });
  }, [user]);

  if (!user) return <Empty><Btn onClick={() => nav("login")}>Login to view dashboard →</Btn></Empty>;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 32px" }}>
      <h2 style={{ fontSize: 32, fontWeight: 700, color: C.cream, margin: "0 0 6px" }}>Satsang Dashboard</h2>
      <p style={{ color: C.muted, marginBottom: 32 }}>View your profile, hosted satsangs, and satsangs you are attending or serving seva.</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 40 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "24px 28px" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.cream, marginBottom: 18 }}>👤 My Profile</div>
          {[["Name", profile?.name], ["Email", user.email], ["Phone", profile?.phone], ["City", profile?.city], ["Address", `${profile?.address || ""} ${profile?.postcode || ""}`]].map(([k, v]) => v ? (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, paddingBottom: 10, marginBottom: 10, borderBottom: `1px solid ${C.border}`, gap: 12, flexWrap: "wrap" }}>
              <span style={{ color: C.muted }}>{k}</span><strong style={{ color: C.cream }}>{v}</strong>
            </div>
          ) : null)}
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "24px 28px" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.cream, marginBottom: 18 }}>📊 Summary</div>
          {[["Satsangs hosted", hosted.length], ["Seva roles active", attending.reduce((a, s) => a + Object.values(s.sevas || {}).filter(sv => (sv.enrolled || []).some(e => e.uid === user.uid)).length, 0)]].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 15, paddingBottom: 10, marginBottom: 10, borderBottom: `1px solid ${C.border}` }}>
              <span style={{ color: C.muted }}>{k}</span><strong style={{ color: C.gold, fontSize: 22 }}>{v}</strong>
            </div>
          ))}
          <div style={{ marginTop: 16 }}><Btn onClick={() => nav("post")} outline full>+ Host a Satsang</Btn></div>
        </div>
      </div>
      {hosted.length > 0 && <div style={{ marginBottom: 36 }}>
        <h3 style={{ fontSize: 19, fontWeight: 700, color: C.cream, marginBottom: 16 }}>🏠 Satsangs I'm Hosting</h3>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>{hosted.map(s => <SCard key={s.id} s={s} nav={nav} />)}</div>
      </div>}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 19, fontWeight: 700, color: C.cream, marginBottom: 16 }}>🙏 Satsangs I'm Attending</h3>
        {attending.length === 0 ? (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "24px 20px", color: C.muted, fontSize: 15 }}>
            You are not registered for any upcoming satsangs yet. Use Find Satsang to register for one, or host your own.
          </div>
        ) : (
          attending.map(s => {
            const sevaRoles = Object.values(s.sevas || {}).filter(sv => (sv.enrolled || []).some(e => e.uid === user.uid));
            return (
              <div key={s.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 20px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <strong style={{ color: C.cream, fontSize: 15 }}>{s.title}</strong>
                  <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>{fmtDate(s.date)} · {s.city} {s.postcode}</div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                  {sevaRoles.length > 0 ? sevaRoles.map(sv => {
                    const m = STANDARD_SEVAS.find(x => x.id === sv.id);
                    return <span key={sv.id} style={{ background: `rgba(212,151,42,0.15)`, color: C.gold, fontSize: 11, padding: "4px 10px", borderRadius: 18, fontFamily: "sans-serif" }}>{m?.name}</span>;
                  }) : <span style={{ background: `rgba(212,151,42,0.15)`, color: C.gold, fontSize: 11, padding: "4px 10px", borderRadius: 18, fontFamily: "sans-serif" }}>0 seva roles</span>}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Guidelines ───────────────────────────────────────────────────────────────
function GuidelinesView() {
  const [open, setOpen] = useState(null);
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 32px" }}>
      <div style={{ display: "flex", gap: 36, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 40 }}>
        <img src={GURUJI_IMGS[2]} alt="Guruji" style={{ width: 190, height: 230, objectFit: "cover", borderRadius: 12, border: `2px solid ${C.gold}`, boxShadow: `0 0 30px rgba(212,151,42,0.22)`, flexShrink: 0 }} onError={e => { e.target.style.display = "none"; }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.25em", color: C.gold, textTransform: "uppercase", marginBottom: 14, fontFamily: "sans-serif" }}>JAI GURUJI · SHUKRANA GURUJI</div>
          <h2 style={{ fontSize: 34, fontWeight: 700, color: C.gold, margin: "0 0 16px" }}>Satsang Guidelines</h2>
          <p style={{ color: C.muted, fontSize: 16, lineHeight: 1.85, maxWidth: 560 }}>
            Guruji always taught that discipline and devotion are the two pillars of Satsang.
            These guidelines reflect His teachings and are observed by Sangat around the world
            to maintain the sanctity and purity of His Darbar.
          </p>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {GUIDELINES.map((g, i) => (
          <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
            <button onClick={() => setOpen(open === i ? null : i)} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 14, padding: "18px 20px", color: C.cream, textAlign: "left" }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{g.icon}</span>
              <span style={{ flex: 1, fontSize: 17, fontWeight: 700 }}>{g.title}</span>
              <span style={{ color: C.gold, fontSize: 12 }}>{open === i ? "▲" : "▼"}</span>
            </button>
            {open === i && (
              <div style={{ padding: "4px 20px 22px 20px", borderTop: `1px solid ${C.border}` }}>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {g.items.map((item, j) => (
                    <li key={j} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: `1px solid rgba(92,42,10,0.4)`, fontSize: 15, lineHeight: 1.75, color: "#d4b98a" }}>
                      <span style={{ flexShrink: 0, paddingTop: 2 }}>🌹</span><span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 48, padding: "32px 36px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, textAlign: "center" }}>
        <div style={{ width: 60, height: 3, background: `linear-gradient(90deg,${C.gold},${C.saffron})`, margin: "0 auto 20px", borderRadius: 2 }} />
        <p style={{ fontSize: 22, fontStyle: "italic", color: C.gold, margin: "0 0 12px" }}>"Ahankaar rab di raah te chalan nai denda."</p>
        <p style={{ fontSize: 14, color: C.muted }}>— Guruji Maharaj · Ego is the greatest deterrent on the path of spirituality.</p>
      </div>
    </div>
  );
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────
function AdminView({ user, profile, nav, notify }) {
  const [tab, setTab] = useState("satsangs");
  const [allSatsangs, setAllSatsangs] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [broadcast, setBroadcast] = useState({ subject: "", body: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getAllSatsangs().then(setAllSatsangs);
    getAllUsers().then(setAllUsers);
  }, []);

  const doCancel = async (id) => {
    if (!window.confirm("Cancel this Satsang? All attendees will need to be notified manually.")) return;
    await cancelSatsang(id);
    setAllSatsangs(p => p.map(s => s.id === id ? { ...s, status: "cancelled" } : s));
    notify("Satsang cancelled.");
  };

  const doRoleChange = async (uid, role) => {
    await updateUserRole(uid, role);
    setAllUsers(p => p.map(u => u.id === uid ? { ...u, role } : u));
    notify("Role updated.");
  };

  const doBroadcast = async () => {
    if (!broadcast.subject || !broadcast.body) { notify("Subject and body required", "err"); return; }
    setBusy(true);
    try {
      const sendBroadcast = httpsCallable(functions, "sendBroadcast");
      const res = await sendBroadcast(broadcast);
      notify(`Broadcast sent to ${res.data.sent} members 🙏`);
      setBroadcast({ subject: "", body: "" });
    } catch (e) { notify(e.message, "err"); }
    setBusy(false);
  };

  const TABS = [["satsangs", "📋 All Satsangs"], ["users", "👥 Users"], ["broadcast", "📢 Broadcast"]];

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "48px 32px" }}>
      <h2 style={{ fontSize: 32, fontWeight: 700, color: C.cream, margin: "0 0 6px" }}>⚙ Admin Panel</h2>
      <p style={{ color: C.muted, marginBottom: 32 }}>Manage all Satsangs, users and communications</p>
      <div style={{ display: "flex", gap: 4, marginBottom: 32, borderBottom: `1px solid ${C.border}`, paddingBottom: 0 }}>
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ background: "none", border: "none", cursor: "pointer", padding: "12px 20px", fontSize: 14, color: tab === k ? C.gold : C.muted, borderBottom: tab === k ? `2px solid ${C.gold}` : "2px solid transparent", fontFamily: "Georgia,serif" }}>
            {l}
          </button>
        ))}
      </div>

      {tab === "satsangs" && (
        <div>
          <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: C.muted, fontSize: 14 }}>{allSatsangs.length} total satsangs</span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {["Title", "Date", "City", "Attendees", "Status", "Actions"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 12px", color: C.muted, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "sans-serif" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allSatsangs.map(s => (
                <tr key={s.id} style={{ borderBottom: `1px solid rgba(92,42,10,0.3)` }}>
                  <td style={{ padding: "12px", color: C.cream, fontWeight: 600 }}>{s.title}</td>
                  <td style={{ padding: "12px", color: C.muted }}>{s.date}</td>
                  <td style={{ padding: "12px", color: C.muted }}>{s.city}</td>
                  <td style={{ padding: "12px", color: C.gold }}>{s.attendeeCount || 0}/{s.maxAttendees}</td>
                  <td style={{ padding: "12px" }}>
                    <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, fontFamily: "sans-serif", background: s.status === "cancelled" ? "rgba(122,26,10,0.3)" : s.status === "completed" ? "rgba(76,130,80,0.2)" : "rgba(212,151,42,0.15)", color: s.status === "cancelled" ? C.saffron : s.status === "completed" ? "#7db87f" : C.gold }}>
                      {s.status}
                    </span>
                  </td>
                  <td style={{ padding: "12px" }}>
                    {s.status === "upcoming" && <button onClick={() => doCancel(s.id)} style={{ background: "none", border: `1px solid ${C.border}`, color: C.muted, cursor: "pointer", fontSize: 12, padding: "4px 10px", borderRadius: 4 }}>Cancel</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "users" && (
        <div>
          <div style={{ marginBottom: 16 }}><span style={{ color: C.muted, fontSize: 14 }}>{allUsers.length} registered members</span></div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {["Name", "Email", "Phone", "City", "Role", "Change Role"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 12px", color: C.muted, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "sans-serif" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allUsers.map(u => (
                <tr key={u.id} style={{ borderBottom: `1px solid rgba(92,42,10,0.3)` }}>
                  <td style={{ padding: "12px", color: C.cream, fontWeight: 600 }}>{u.name}</td>
                  <td style={{ padding: "12px", color: C.muted, fontSize: 13 }}>{u.email}</td>
                  <td style={{ padding: "12px", color: C.muted, fontSize: 13 }}>{u.phone}</td>
                  <td style={{ padding: "12px", color: C.muted, fontSize: 13 }}>{u.city}</td>
                  <td style={{ padding: "12px" }}>
                    <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: `rgba(212,151,42,0.15)`, color: C.gold, fontFamily: "sans-serif" }}>{u.role || "member"}</span>
                  </td>
                  <td style={{ padding: "12px" }}>
                    <select onChange={e => doRoleChange(u.id, e.target.value)} value={u.role || "member"}
                      style={{ background: C.card, border: `1px solid ${C.border}`, color: C.cream, padding: "4px 8px", borderRadius: 4, fontSize: 12, cursor: "pointer" }}>
                      <option value="member">member</option>
                      <option value="organiser">organiser</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "broadcast" && (
        <div style={{ maxWidth: 600 }}>
          <p style={{ color: C.muted, marginBottom: 24, fontSize: 15, lineHeight: 1.7 }}>
            Send an email to all registered Sangat members. Use this for important announcements only.
          </p>
          <FField label="Subject *" v={broadcast.subject} on={e => setBroadcast(p => ({ ...p, subject: e.target.value }))} ph="e.g. Important Satsang Update — Jai Guruji" />
          <div style={{ marginBottom: 18 }}>
            <Label>Message Body *</Label>
            <textarea value={broadcast.body} onChange={e => setBroadcast(p => ({ ...p, body: e.target.value }))} placeholder="Write your message here…"
              style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 8, padding: "11px 14px", color: C.cream, fontSize: 15, fontFamily: "Georgia,serif", outline: "none", boxSizing: "border-box", minHeight: 160, resize: "vertical" }} />
          </div>
          <Btn onClick={doBroadcast} disabled={busy} full>{busy ? "Sending…" : "Send Broadcast →"}</Btn>
        </div>
      )}
    </div>
  );
}

// ─── Auth Views ───────────────────────────────────────────────────────────────
function LoginView({ nav, notify }) {
  const [f, setF] = useState({ email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  const submit = async () => {
    setBusy(true);
    try { await loginUser(f.email, f.password); notify("Jai Guruji! Welcome back 🙏"); nav("find"); }
    catch (e) { notify(e.message.replace("Firebase:", "").trim(), "err"); }
    setBusy(false);
  };
  return <FWrap title="Welcome Back" sub="Login to your Sangat account">
    <FField label="Email *" type="email" v={f.email} on={set("email")} />
    <FField label="Password *" type="password" v={f.password} on={set("password")} />
    <Btn onClick={submit} disabled={busy} full>{busy ? "Logging in…" : "Login →"}</Btn>
    <p style={{ textAlign: "center", color: C.muted, fontSize: 13, marginTop: 14 }}>
      <button onClick={() => nav("forgot")} style={{ background: "none", border: "none", color: C.gold, cursor: "pointer", textDecoration: "underline" }}>Forgot password?</button>
    </p>
    <p style={{ textAlign: "center", color: C.muted, fontSize: 14, marginTop: 8 }}>New to the Sangat? <button onClick={() => nav("register")} style={{ background: "none", border: "none", color: C.gold, cursor: "pointer", textDecoration: "underline" }}>Join here</button></p>
  </FWrap>;
}

function RegisterView({ nav, notify }) {
  const [f, setF] = useState({ name: "", email: "", phone: "", address: "", city: "", postcode: "", password: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  const submit = async () => {
    if (!f.name || !f.email || !f.phone || !f.address || !f.city || !f.postcode || !f.password) { notify("Please fill all required fields", "err"); return; }
    if (f.password !== f.confirm) { notify("Passwords do not match", "err"); return; }
    if (f.password.length < 6) { notify("Password must be at least 6 characters", "err"); return; }
    setBusy(true);
    try {
      await registerUser({ email: f.email, password: f.password, name: f.name, phone: f.phone, address: f.address, city: f.city, postcode: f.postcode });
      notify(`Jai Guruji! Welcome to the Sangat, ${f.name} 🙏`);
      nav("find");
    } catch (e) { notify(e.message.replace("Firebase:", "").trim(), "err"); }
    setBusy(false);
  };
  return <FWrap title="Join the Sangat" sub="Create your account to find and host Satsangs">
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <FField label="Full Name *" v={f.name} on={set("name")} />
      <FField label="Phone Number *" type="tel" v={f.phone} on={set("phone")} />
    </div>
    <FField label="Email Address *" type="email" v={f.email} on={set("email")} />
    <FField label="Street Address *" v={f.address} on={set("address")} />
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <FField label="City *" v={f.city} on={set("city")} />
      <FField label="Postcode *" v={f.postcode} on={set("postcode")} />
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <FField label="Password *" type="password" v={f.password} on={set("password")} />
      <FField label="Confirm Password *" type="password" v={f.confirm} on={set("confirm")} />
    </div>
    <Btn onClick={submit} disabled={busy} full>{busy ? "Creating account…" : "Create Account →"}</Btn>
    <p style={{ textAlign: "center", color: C.muted, fontSize: 14, marginTop: 20 }}>Already registered? <button onClick={() => nav("login")} style={{ background: "none", border: "none", color: C.gold, cursor: "pointer", textDecoration: "underline" }}>Login here</button></p>
  </FWrap>;
}

function ForgotView({ nav, notify }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try { await resetPassword(email); notify("Password reset email sent! Check your inbox 🙏"); nav("login"); }
    catch (e) { notify(e.message.replace("Firebase:", "").trim(), "err"); }
    setBusy(false);
  };
  return <FWrap title="Reset Password" sub="We'll send a reset link to your email">
    <FField label="Email Address *" type="email" v={email} on={e => setEmail(e.target.value)} />
    <Btn onClick={submit} disabled={busy} full>{busy ? "Sending…" : "Send Reset Link →"}</Btn>
    <p style={{ textAlign: "center", color: C.muted, fontSize: 14, marginTop: 20 }}><button onClick={() => nav("login")} style={{ background: "none", border: "none", color: C.gold, cursor: "pointer", textDecoration: "underline" }}>← Back to login</button></p>
  </FWrap>;
}

// ─── Reusable small components ────────────────────────────────────────────────
function SCard({ s, nav }) {
  const left = s.maxAttendees - (s.attendeeCount || 0);
  return (
    <button onClick={() => nav("detail", s.id)} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 22px", cursor: "pointer", textAlign: "left", width: 278, color: C.cream }}>
      <div style={{ fontSize: 10, color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8, fontFamily: "sans-serif" }}>{fmtDate(s.date)} · {fmtTime(s.time)}</div>
      <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{s.title}</div>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 14 }}>📍 {s.city} {s.postcode}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ background: `rgba(212,151,42,0.15)`, color: C.gold, fontSize: 11, padding: "3px 10px", borderRadius: 20, fontFamily: "sans-serif" }}>{left} spots left</span>
        <span style={{ fontSize: 12, color: C.muted }}>{Object.keys(s.sevas || {}).length} seva roles</span>
      </div>
    </button>
  );
}

function Btn({ onClick, children, outline, ghost, disabled, full }) {
  return <button onClick={onClick} disabled={disabled} style={{
    background: outline || ghost ? "none" : C.gold, color: outline ? C.gold : ghost ? C.muted : C.bg,
    border: outline ? `1px solid ${C.gold}` : ghost ? `1px solid ${C.border}` : "none",
    cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1,
    fontSize: 15, fontWeight: 700, padding: "12px 24px", borderRadius: 8,
    width: full ? "100%" : undefined,
  }}>{children}</button>;
}

function Page({ title, sub, children }) {
  return <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 32px" }}>
    <h2 style={{ fontSize: 32, fontWeight: 700, color: C.cream, margin: "0 0 8px" }}>{title}</h2>
    {sub && <p style={{ color: C.muted, marginBottom: 28, fontSize: 15 }}>{sub}</p>}
    {children}
  </div>;
}

function SectionWrap({ label, shaded, children }) {
  return <div style={{ background: shaded ? "rgba(255,255,255,0.015)" : "transparent", borderTop: shaded ? `1px solid ${C.border}` : "none", borderBottom: shaded ? `1px solid ${C.border}` : "none", padding: "48px 0" }}>
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 32px" }}>
      {label && <div style={{ fontSize: 10, letterSpacing: "0.22em", color: C.gold, textTransform: "uppercase", marginBottom: 22, fontFamily: "sans-serif" }}>{label}</div>}
      {children}
    </div>
  </div>;
}

function Empty({ children }) {
  return <div style={{ textAlign: "center", padding: "60px 32px", color: C.muted, fontSize: 17, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>{children}</div>;
}

function FWrap({ title, sub, children }) {
  return <div style={{ maxWidth: 620, margin: "0 auto", padding: "48px 32px" }}>
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: "40px 44px" }}>
      <div style={{ textAlign: "center", marginBottom: 30 }}>
        <img src={GURUJI_IMGS[4]} alt="Guruji" style={{ width: 68, height: 68, borderRadius: "50%", objectFit: "cover", border: `2px solid ${C.gold}`, marginBottom: 12, boxShadow: `0 0 20px rgba(212,151,42,0.3)` }} onError={e => { e.target.style.display = "none"; }} />
        <div style={{ fontSize: 9, letterSpacing: "0.28em", color: C.gold, textTransform: "uppercase", marginBottom: 10, fontFamily: "sans-serif" }}>OM NAMAH SHIVAY</div>
        <h2 style={{ color: C.cream, fontSize: 25, margin: "0 0 6px" }}>{title}</h2>
        {sub && <p style={{ color: C.muted, fontSize: 14 }}>{sub}</p>}
      </div>
      {children}
    </div>
  </div>;
}

function FField({ label, type = "text", v, on, ph }) {
  return <div style={{ marginBottom: 18 }}>
    <Label>{label}</Label>
    <input type={type} value={v} onChange={on} placeholder={ph} style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 8, padding: "11px 14px", color: C.cream, fontSize: 15, fontFamily: "Georgia,serif", outline: "none", boxSizing: "border-box" }} />
  </div>;
}

function Label({ children }) {
  return <label style={{ display: "block", fontSize: 10, color: C.muted, marginBottom: 7, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "sans-serif" }}>{children}</label>;
}
