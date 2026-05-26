// ─── Guruji Satsang Management App — Firebase Edition ────────────────────────
// Full Firebase integration: Auth, Firestore, Cloud Functions (email)
import { useState, useEffect, useCallback } from "react";
import { registerUser, loginUser, logoutUser, resetPassword } from "./firebase/auth";
import {
  createSatsang, getUpcomingSatsangs, getSatsang, getSatsangsByOrganizer,
  getAllSatsangs, updateSatsang, cancelSatsang, getAllUsers, updateUserRole,
  getAttendees, checkAttendance, removeAttendance,
  getUserAttendanceSatsangs, enrollSeva, withdrawSeva, subscribeSatsang, updateUserGuests,
} from "./firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { functions } from "./firebase/config";
import { useAuth, AuthProvider } from "./hooks/useAuth";
import { geocodeLocation, getDistanceKm } from "./utils/geoUtils";
import { getRandomVachan } from "./utils/vachans";
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
      { l: "Profile", v: "profile" },
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
            <span style={{ display: "block", fontSize: 17, fontWeight: 700, color: C.gold, letterSpacing: "0.02em" }}>Guruji Satsang App</span>
            <span style={{ display: "block", fontSize: 9, color: C.muted, letterSpacing: "0.2em", fontFamily: "sans-serif" }}>Jai Guruji</span>
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
        {view === "find" && <FindView search={search} setSearch={setSearch} nav={nav} user={user} profile={profile} upcoming={upcoming} />}
        {view === "detail" && <DetailView satsangId={sel} user={user} profile={profile} nav={nav} notify={notify} onRefresh={loadUpcoming} />}
        {view === "post" && <PostView user={user} profile={profile} nav={nav} notify={notify} onRefresh={loadUpcoming} />}
        {view === "dashboard" && <DashboardView user={user} profile={profile} nav={nav} notify={notify} />}
        {view === "profile" && <ProfileView user={user} profile={profile} nav={nav} notify={notify} />}
        {view === "guidelines" && <GuidelinesView />}
        {view === "admin" && isAdmin && <AdminView user={user} profile={profile} nav={nav} notify={notify} />}
      </main>
      {view !== "home" && view !== "guidelines" && <DivineVachanBanner view={view} />}
      <footer style={{ borderTop: `1px solid ${C.border}`, padding: "28px 32px", textAlign: "center" }}>
        <div style={{ fontSize: 10, color: C.gold, letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 8, fontFamily: "sans-serif" }}>
          OM NAMAH SHIVAY SHIVJI SADA SAHAY · OM NAMAH SHIVAY GURUJI SADA SAHAY
        </div>
        <div style={{ fontSize: 13, color: C.muted }}>Guruji Satsang · Built with devotion & seva</div>
      </footer>
    </div>
  );
}
// ─── Home ─────────────────────────────────────────────────────────────────────
function HomeView({ nav, upcoming, user, heroImg }) {
  const [vachan] = useState(() => getRandomVachan());
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 1180, margin: "0 auto", padding: "56px 32px 40px", gap: 48, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 380px", maxWidth: 540 }}>
          {/* <div style={{ fontSize: 10, letterSpacing: "0.28em", color: C.gold, textTransform: "uppercase", marginBottom: 18, fontFamily: "sans-serif" }}>OM NAMAH SHIVAY SHIVJI SADA SAHAY</div>
          <div style={{ fontSize: 10, letterSpacing: "0.28em", color: C.gold, textTransform: "uppercase", marginBottom: 18, fontFamily: "sans-serif" }}>OM NAMAH SHIVAY GURUJI SADA SAHAY</div> */}
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
      <SectionWrap label="Guruji's Divine Vachan">
        <div style={{
          background: `linear-gradient(135deg, ${C.card} 0%, rgba(39,14,3,0.85) 100%)`,
          border: `1px solid ${C.gold}`,
          borderRadius: 16,
          padding: "36px 40px",
          textAlign: "center",
          boxShadow: `0 8px 32px rgba(212,151,42,0.1)`,
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{
            position: "absolute",
            top: -20,
            left: -20,
            fontSize: 120,
            opacity: 0.03,
            color: C.gold,
            fontFamily: "Georgia, serif",
            userSelect: "none"
          }}>“</div>
          <div style={{ fontSize: 10, color: C.gold, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 14, fontFamily: "sans-serif", fontWeight: 700 }}>Guruji's Bani</div>
          <h3 style={{ fontSize: "clamp(20px, 4vw, 25px)", fontStyle: "italic", color: C.cream, margin: "0 0 16px", lineHeight: 1.6, fontWeight: "normal" }}>
            "{vachan.punjabi}"
          </h3>
          <p style={{ fontSize: "clamp(14px, 3.2vw, 16px)", color: C.gold, margin: 0, fontStyle: "italic", lineHeight: 1.6 }}>
            — {vachan.english}
          </p>
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
function FindView({ search, setSearch, nav, user, profile, upcoming }) {
  const [userCoords, setUserCoords] = useState(null);
  const [searchCoords, setSearchCoords] = useState(null);
  const [isGeocodingSearch, setIsGeocodingSearch] = useState(false);
  const [isGeocodingProfile, setIsGeocodingProfile] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationLabel, setLocationLabel] = useState("");
  const [geoError, setGeoError] = useState(null);
  const [searchError, setSearchError] = useState(null);
  // 1. Geocode Profile Location on Mount
  useEffect(() => {
    let active = true;
    async function initProfileLocation() {
      if (!profile) return;
      const queryParts = [];
      if (profile.postcode) queryParts.push(profile.postcode);
      if (profile.city) queryParts.push(profile.city);

      const queryStr = queryParts.join(" ").trim();
      if (!queryStr) return;
      setIsGeocodingProfile(true);
      try {
        const coords = await geocodeLocation(queryStr);
        if (coords && active) {
          setUserCoords(coords);
          setLocationLabel(`profile location (${profile.postcode || profile.city})`);
        }
      } catch (err) {
        console.warn("Could not geocode profile location", err);
      } finally {
        if (active) setIsGeocodingProfile(false);
      }
    }
    initProfileLocation();
    return () => { active = false; };
  }, [profile]);
  // 2. Debounced Search Geocoding (600ms)
  useEffect(() => {
    const trimmed = search.trim();
    if (!trimmed) {
      setSearchCoords(null);
      setIsGeocodingSearch(false);
      setSearchError(null);
      return;
    }
    setIsGeocodingSearch(true);
    setSearchError(null);
    const delayDebounce = setTimeout(async () => {
      try {
        const coords = await geocodeLocation(trimmed);
        if (coords) {
          setSearchCoords(coords);
          setSearchError(null);
        } else {
          setSearchCoords(null);
          setSearchError(`"${trimmed}" is not a valid city or postcode. Please enter a valid location.`);
        }
      } catch (err) {
        console.warn("Search geocoding error", err);
        setSearchCoords(null);
        setSearchError("Failed to connect to the geocoding service. Please try again.");
      } finally {
        setIsGeocodingSearch(false);
      }
    }, 600);
    return () => clearTimeout(delayDebounce);
  }, [search]);
  // 3. HTML5 Geolocation Trigger
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }
    setIsLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setLocationLabel("your device location");
        setIsLocating(false);
        // Clear search inputs and search errors when active location changes
        setSearch("");
        setSearchCoords(null);
        setSearchError(null);
      },
      (error) => {
        console.warn("Geolocation error", error);
        setIsLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setGeoError("Location access was denied. Please search by city or postcode.");
        } else {
          setGeoError("Could not retrieve device location. Please try searching instead.");
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };
  // 4. Calculate Distance and Filter/Sort List
  const activeSearch = search.trim().toLowerCase();

  // Create calculated list
  const calculatedSatsangs = upcoming.map(s => {
    let distance = null;
    if (activeSearch && searchCoords) {
      distance = getDistanceKm(s.latitude, s.longitude, searchCoords.lat, searchCoords.lng);
    } else if (userCoords && !activeSearch) {
      distance = getDistanceKm(s.latitude, s.longitude, userCoords.lat, userCoords.lng);
    }
    return { ...s, distance };
  });
  // Filter list
  const filteredSatsangs = calculatedSatsangs.filter(s => {
    // If there's an invalid search error, return zero results
    if (searchError) return false;
    // Strict client-side date safety filter: ensure elapsed events are never shown
    const todayStr = new Date().toISOString().split("T")[0];
    if (s.date && s.date < todayStr) return false;
    if (!activeSearch) return true;

    // If searchCoords is successfully resolved, we DO NOT filter the list by text matching.
    // Instead, we search ALL satsangs and sort them all by proximity!
    if (searchCoords) {
      return true;
    }

    // Default text filter while resolving/fallback
    return s.city?.toLowerCase().includes(activeSearch) || s.postcode?.toLowerCase().includes(activeSearch);
  });
  // Sort list:
  // - First sort by distance if available (ascending, closest first)
  // - Then sort by date and time (ascending, chronological)
  const sortedSatsangs = [...filteredSatsangs].sort((a, b) => {
    const aHasDist = typeof a.distance === "number" && !isNaN(a.distance);
    const bHasDist = typeof b.distance === "number" && !isNaN(b.distance);
    if (aHasDist && bHasDist) {
      return a.distance - b.distance; // Ascending: nearest first!
    }
    if (aHasDist) return -1;
    if (bHasDist) return 1;

    // Fallback: Chronological
    const dateComp = (a.date || "").localeCompare(b.date || "");
    if (dateComp !== 0) return dateComp;
    return (a.time || "").localeCompare(b.time || "");
  });
  // Render Label explaining the sequence
  let sequenceHeading = "Upcoming Satsangs";
  if (activeSearch) {
    if (isGeocodingSearch) {
      sequenceHeading = `Searching near "${search}"…`;
    } else if (searchCoords) {
      sequenceHeading = `Satsangs nearest to "${search}"`;
    } else {
      sequenceHeading = `Search results for "${search}"`;
    }
  } else if (userCoords) {
    sequenceHeading = `Satsangs nearest to ${locationLabel}`;
  }
  return (
    <Page title="Find a Satsang" sub="Connect with the Sangat in your region">

      {/* Geolocation, search, and sequencing control panel */}
      <div style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: "24px 28px",
        marginBottom: 36,
        boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        display: "flex",
        flexDirection: "column",
        gap: 16
      }}>

        <div style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "stretch"
        }}>
          {/* Search bar */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "rgba(0,0,0,0.2)",
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "10px 16px",
            flex: "1 1 300px"
          }}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke={C.gold}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ opacity: 0.8, flexShrink: 0 }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              style={{
                background: "none",
                border: "none",
                outline: "none",
                color: C.cream,
                fontSize: 15,
                width: "100%",
                fontFamily: "Georgia,serif"
              }}
              placeholder="Enter city or postcode (e.g. Manchester)"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {isGeocodingSearch && (
              <span style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: C.gold,
                animation: "pulse 1.2s infinite ease-in-out"
              }} />
            )}
          </div>
          {/* Near Me Button */}
          <button
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
            style={{
              background: userCoords && locationLabel.includes("device") ? `rgba(212,151,42,0.15)` : "none",
              border: `1px solid ${C.gold}`,
              borderRadius: 10,
              padding: "10px 20px",
              color: C.gold,
              fontWeight: 700,
              cursor: isLocating ? "not-allowed" : "pointer",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.2s ease-in-out",
              boxShadow: userCoords && locationLabel.includes("device") ? `0 0 12px rgba(212,151,42,0.2)` : "none"
            }}
            onMouseOver={e => {
              if (!isLocating) {
                e.currentTarget.style.background = `rgba(212,151,42,0.1)`;
                e.currentTarget.style.transform = "translateY(-1px)";
              }
            }}
            onMouseOut={e => {
              if (!isLocating) {
                e.currentTarget.style.background = userCoords && locationLabel.includes("device") ? `rgba(212,151,42,0.15)` : "none";
                e.currentTarget.style.transform = "translateY(0)";
              }
            }}
          >
            {isLocating ? "⏳ Finding Location…" : "📍 Near Me"}
          </button>
        </div>
        {/* Search Error Message */}
        {searchError && (
          <div style={{
            fontSize: 13,
            color: C.saffron,
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(122,26,10,0.15)",
            padding: "10px 14px",
            borderRadius: 8,
            borderLeft: `3px solid ${C.red}`
          }}>
            <span>⚠️ {searchError}</span>
          </div>
        )}
        {/* Location Status Message & Info */}
        {(userCoords || geoError || isGeocodingProfile) && !activeSearch && (
          <div style={{
            fontSize: 13,
            color: geoError ? C.saffron : C.muted,
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(0,0,0,0.15)",
            padding: "8px 14px",
            borderRadius: 8,
            borderLeft: `3px solid ${geoError ? C.saffron : C.gold}`
          }}>
            {isGeocodingProfile ? (
              <span>✨ Finding your location from profile…</span>
            ) : geoError ? (
              <span>⚠️ {geoError}</span>
            ) : (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", flexWrap: "wrap", gap: 8 }}>
                <span>
                  Proximity sequencing active based on <strong style={{ color: C.gold }}>{locationLabel}</strong>.
                </span>
                {userCoords && (
                  <button
                    onClick={() => {
                      setUserCoords(null);
                      setLocationLabel("");
                      setGeoError(null);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: C.saffron,
                      cursor: "pointer",
                      fontSize: 12,
                      textDecoration: "underline",
                      padding: 0
                    }}
                  >
                    Clear location
                  </button>
                )}
              </span>
            )}
          </div>
        )}
      </div>
      {/* Header and Results */}
      <h3 style={{
        fontSize: 20,
        fontWeight: 700,
        color: C.cream,
        marginBottom: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <span>{sequenceHeading}</span>
        <span style={{ fontSize: 13, color: C.muted, fontWeight: "normal" }}>
          {sortedSatsangs.length} {sortedSatsangs.length === 1 ? "satsang" : "satsangs"} found
        </span>
      </h3>
      {sortedSatsangs.length === 0 ? (
        <Empty>
          <p>
            {searchError
              ? "Search aborted due to invalid location input."
              : `No upcoming Satsangs found${activeSearch ? ` matching "${search}"` : ""}.`}
          </p>
          {user ? (
            <Btn onClick={() => nav("post")}>Host the first one →</Btn>
          ) : (
            <Btn onClick={() => nav("login")}>Login to Host →</Btn>
          )}
        </Empty>
      ) : (
        <div style={{
          display: "flex",
          gap: 16,
          flexWrap: "wrap"
        }}>
          {sortedSatsangs.map(s => (
            <SCard key={s.id} s={s} nav={nav} />
          ))}
        </div>
      )}
      {/* Embedded CSS animation in component or via style tag */}
      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.9); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(0.9); opacity: 0.5; }
        }
      `}</style>
    </Page>
  );
}
// ─── Detail (live Firestore subscription) ─────────────────────────────────────
function DetailView({ satsangId, user, profile, nav, notify, onRefresh }) {
  const [s, setS] = useState(null);
  const [attendees, setAt] = useState([]);
  const [myAtt, setMyAtt] = useState(null);
  const [selectedGuests, setSelectedGuests] = useState([]);
  const [sevaMapping, setSevaMapping] = useState({});
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState("attendance");
  useEffect(() => {
    if (!satsangId) return;
    // Real-time subscription
    const unsub = subscribeSatsang(satsangId, setS);
    return unsub;
  }, [satsangId]);
  useEffect(() => {
    if (!satsangId || !user) return;
    checkAttendance(satsangId, user.uid).then(setMyAtt);
  }, [satsangId, user]);
  useEffect(() => {
    if (!satsangId || !user || !s) return;
    if (s.organizerUid === user.uid || profile?.role === "admin") {
      getAttendees(satsangId).then(setAt).catch(err => console.warn("Failed fetching attendees:", err));
    }
  }, [satsangId, user, s, profile]);
  if (!s) return <div style={{ textAlign: "center", padding: 80, color: C.muted }}>Loading Satsang… 🙏</div>;
  const left = s.maxAttendees - (s.attendeeCount || 0);
  const isHost = s && user && s.organizerUid === user.uid;
  const isAdmin = profile?.role === "admin";
  const mySevaNames = Object.values(s.sevas || {})
    .filter(sv => sv.enrolled?.some(e => e.attendeeUid === user?.uid || e.uid === user?.uid))
    .map(sv => STANDARD_SEVAS.find(x => x.id === sv.id)?.name)
    .filter(Boolean);
  const formatRequestedSevas = (reqs) => {
    if (!Array.isArray(reqs)) return "";
    return reqs.map(rs => {
      if (typeof rs === "string") {
        return STANDARD_SEVAS.find(x => x.id === rs)?.name;
      }
      if (rs && typeof rs === "object" && rs.sevaId) {
        const sName = STANDARD_SEVAS.find(x => x.id === rs.sevaId)?.name || rs.sevaId;
        const pLabel = rs.personId === user?.uid ? "Me" : rs.personName;
        return `${sName} for ${pLabel}`;
      }
      return "";
    }).filter(Boolean).join(", ");
  };
  const renderAttendeeSevaStatus = (a) => {
    const reqSevas = a.requestedSevas || [];
    if (reqSevas.length === 0) return null;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
        {reqSevas.map((rs, idx) => {
          const sName = STANDARD_SEVAS.find(x => x.id === rs.sevaId)?.name || rs.sevaId;
          const label = rs.personId === a.id ? rs.personName : `${rs.personName} (Guest)`;

          if (a.status === 'confirmed') {
            if (rs.status === 'pending') {
              return (
                <div key={idx} style={{ display: "inline-flex", background: "rgba(212,151,42,0.1)", border: `1px solid rgba(212,151,42,0.3)`, color: C.gold, fontSize: 12, padding: "6px 12px", borderRadius: 6, alignItems: "center", gap: 6, width: "fit-content" }}>
                  ✉ Offered Seva: <strong>{sName}</strong> for {label} (Needs approval in Seva tab)
                </div>
              );
            } else if (rs.status === 'confirmed') {
              return (
                <div key={idx} style={{ display: "inline-flex", background: "rgba(76,130,80,0.1)", border: `1px solid rgba(76,130,80,0.3)`, color: "#7db87f", fontSize: 12, padding: "6px 12px", borderRadius: 6, alignItems: "center", gap: 6, width: "fit-content" }}>
                  ✓ Seva Confirmed: <strong>{sName}</strong> for {label}
                </div>
              );
            } else if (rs.status === 'declined') {
              return (
                <div key={idx} style={{ display: "inline-flex", background: "rgba(224,107,16,0.05)", border: `1px solid rgba(224,107,16,0.2)`, color: C.saffron, fontSize: 12, padding: "6px 12px", borderRadius: 6, alignItems: "center", gap: 6, width: "fit-content" }}>
                  ❌ Seva Declined: <strong>{sName}</strong> for {label}
                </div>
              );
            }
          } else {
            // Attendance is pending/waitlisted
            return (
              <div key={idx} style={{ display: "inline-flex", background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, color: C.muted, fontSize: 12, padding: "6px 12px", borderRadius: 6, alignItems: "center", gap: 6, width: "fit-content" }}>
                🕒 Also offered Seva: <strong>{sName}</strong> for {label} (Reviewable upon confirming attendance)
              </div>
            );
          }
          return null;
        })}
      </div>
    );
  };
  const exportSevaSheet = () => {
    // Gather all confirmed sevas
    const confirmedSevas = [];
    Object.values(s.sevas || {}).forEach(sv => {
      const enrolled = sv.enrolled || [];
      const sName = STANDARD_SEVAS.find(x => x.id === sv.id)?.name || sv.id;
      enrolled.forEach(e => {
        // Find attendee document to get primary member phone
        const att = attendees.find(a => a.id === e.attendeeUid);
        confirmedSevas.push({
          personName: e.name,
          sevaName: sName,
          primaryName: att ? att.userName : e.name,
          phone: att ? att.userPhone : ""
        });
      });
    });
    // Sort alphabetically by personName
    confirmedSevas.sort((a, b) => a.personName.localeCompare(b.personName));
    // Open print window
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      notify("Popup blocker prevented exporting seva sheet. Please allow popups.", "err");
      return;
    }
    const htmlContent = `
      <html>
        <head>
          <title>Day-of Seva Sheet - ${s.title}</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #333; background: #fff; }
            h1 { font-size: 24px; margin-bottom: 5px; color: #111; }
            h2 { font-size: 14px; font-weight: normal; color: #666; margin-top: 0; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { text-align: left; padding: 12px 10px; border-bottom: 2px solid #ddd; font-size: 13px; text-transform: uppercase; color: #666; }
            td { padding: 12px 10px; border-bottom: 1px solid #eee; font-size: 14px; }
            .checkbox { width: 20px; height: 20px; border: 1px solid #999; border-radius: 4px; display: inline-block; }
            .header-info { margin-bottom: 30px; border-bottom: 1px solid #eee; padding-bottom: 20px; }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header-info">
            <h1>🌹 Day-of Seva Allocation Sheet</h1>
            <h2><strong>Event:</strong> ${s.title} &nbsp;|&nbsp; <strong>Date:</strong> ${s.date} at ${s.time} &nbsp;|&nbsp; <strong>Venue:</strong> ${s.address}, ${s.city}</h2>
            <button onclick="window.print()" style="padding: 10px 20px; background: #d4972a; border: none; color: #fff; font-weight: bold; border-radius: 6px; cursor: pointer; font-size: 14px;">Print Seva Sheet</button>
          </div>
          
          ${confirmedSevas.length === 0 ? `
            <p style="text-align: center; color: #666; padding: 40px; font-style: italic;">No confirmed Seva assignments found for this Satsang.</p>
          ` : `
            <table>
              <thead>
                <tr>
                  <th style="width: 5%">Check-in</th>
                  <th style="width: 30%">Sevadar Name</th>
                  <th style="width: 30%">Seva Role</th>
                  <th style="width: 20%">Primary Member</th>
                  <th style="width: 15%">Phone Number</th>
                </tr>
              </thead>
              <tbody>
                ${confirmedSevas.map(cs => `
                  <tr>
                    <td><div class="checkbox"></div></td>
                    <td><strong>${cs.personName}</strong></td>
                    <td>${cs.sevaName}</td>
                    <td>${cs.primaryName}</td>
                    <td>${cs.phone || '<span style="color: #ccc;">N/A</span>'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };
  const allSevaRequests = [];
  attendees.forEach(a => {
    const reqs = a.requestedSevas || [];
    reqs.forEach(rs => {
      allSevaRequests.push({
        ...rs,
        attendeeUid: a.id,
        attendeeName: a.userName,
        attendeeStatus: a.status
      });
    });
  });
  const fmtTimestamp = (ts) => {
    if (!ts) return "";
    const date = typeof ts.toDate === "function" ? ts.toDate() : ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    return date.toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
  };
  const sortAttendeesByTime = (list) => {
    return [...list].sort((a, b) => {
      const timeA = a.registeredAt?.seconds || (a.registeredAt ? new Date(a.registeredAt).getTime() / 1000 : 0);
      const timeB = b.registeredAt?.seconds || (b.registeredAt ? new Date(b.registeredAt).getTime() / 1000 : 0);
      return timeA - timeB;
    });
  };
  const handleSevaMapChange = (sevaId, personId) => {
    setSevaMapping(p => ({ ...p, [sevaId]: personId }));
  };
  const toggleGuestSelect = (guestId) => {
    setSelectedGuests(p => {
      const next = p.includes(guestId) ? p.filter(id => id !== guestId) : [...p, guestId];
      setSevaMapping(mapping => {
        const nextMapping = { ...mapping };
        Object.entries(nextMapping).forEach(([sId, pId]) => {
          if (pId === guestId) {
            delete nextMapping[sId];
          }
        });
        return nextMapping;
      });
      return next;
    });
  };
  const markAtt = async () => {
    if (!user) { notify("Please login to register", "err"); nav("login"); return; }
    if (myAtt) { notify("Already registered", "err"); return; }
    setBusy(true);
    try {
      const guestsCount = selectedGuests.length;
      const primaryAttendee = { id: user.uid, name: profile?.name || user.displayName, isPrimary: true };
      const guestAttendees = (profile?.guests || [])
        .filter(g => selectedGuests.includes(g.id))
        .map(g => ({ id: g.id, name: g.name, isPrimary: false, relationship: g.relationship }));
      const fullAttendeesList = [primaryAttendee, ...guestAttendees];
      const mappedSevas = Object.entries(sevaMapping)
        .filter(([_, personId]) => !!personId)
        .map(([sevaId, personId]) => {
          let personName = "";
          if (personId === user.uid) {
            personName = profile?.name || user.displayName;
          } else {
            const gst = (profile?.guests || []).find(g => g.id === personId);
            personName = gst ? gst.name : "Guest";
          }
          return {
            sevaId,
            personId,
            personName,
            status: "pending"
          };
        });
      const registerAttendanceFn = httpsCallable(functions, "registerAttendance");
      await registerAttendanceFn({
        satsangId,
        guests: guestsCount,
        userName: profile?.name || user.displayName,
        userEmail: user.email,
        userPhone: profile?.phone || "",
        requestedSevas: mappedSevas,
        attendeesList: fullAttendeesList
      });
      const isWaitlist = left < 1 + guestsCount;
      const localState = {
        guests: guestsCount,
        status: isWaitlist ? "waitlisted" : "pending",
        requestedSevas: mappedSevas,
        attendeesList: fullAttendeesList
      };
      setMyAtt(localState);
      setSevaMapping({});
      setSelectedGuests([]);
      onRefresh();
      if (isWaitlist) {
        notify("Jai Guruji! Placed on Waitlist (Satsang over capacity) 🙏");
      } else {
        notify("Jai Guruji! Attendance request submitted (pending approval) 🙏");
      }
    } catch (e) { notify(e.message, "err"); }
    setBusy(false);
  };
  const approveAtt = async (attendeeUid) => {
    setBusy(true);
    try {
      const confirmAttendanceFn = httpsCallable(functions, "confirmAttendance");
      await confirmAttendanceFn({ satsangId, attendeeUid });
      notify("Attendance request confirmed successfully! 🙏");
      getAttendees(satsangId).then(setAt).catch(() => { });
      onRefresh();
    } catch (e) {
      notify(e.message, "err");
    }
    setBusy(false);
  };
  const declineAtt = async (attendeeUid) => {
    setBusy(true);
    try {
      const declineAttendanceFn = httpsCallable(functions, "declineAttendance");
      await declineAttendanceFn({ satsangId, attendeeUid });
      notify("Request declined and moved to waitlist. 🙏");
      getAttendees(satsangId).then(setAt).catch(() => { });
      onRefresh();
    } catch (e) {
      notify(e.message, "err");
    }
    setBusy(false);
  };
  const handleConfirmSeva = async (attendeeUid, sevaId, personId) => {
    setBusy(true);
    try {
      const confirmSevaFn = httpsCallable(functions, "confirmSeva");
      await confirmSevaFn({ satsangId, attendeeUid, sevaId, personId });
      notify("Seva role confirmed successfully! 🙏");
      getAttendees(satsangId).then(setAt).catch(() => { });
      onRefresh();
    } catch (e) {
      notify(e.message, "err");
    }
    setBusy(false);
  };
  const handleDeclineSeva = async (attendeeUid, sevaId, personId) => {
    setBusy(true);
    try {
      const declineSevaFn = httpsCallable(functions, "declineSeva");
      await declineSevaFn({ satsangId, attendeeUid, sevaId, personId });
      notify("Seva request declined. 🙏");
      getAttendees(satsangId).then(setAt).catch(() => { });
      onRefresh();
    } catch (e) {
      notify(e.message, "err");
    }
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
      {/* Attendance */}
      {!isHost && (
        <>
          {s.status !== "upcoming" && (
            <div style={{
              background: s.status === "completed" ? "rgba(245,232,208,0.05)" : "rgba(224,107,16,0.05)",
              border: `1px solid ${s.status === "completed" ? "rgba(245,232,208,0.3)" : C.saffron}`,
              borderRadius: 12,
              padding: "20px 24px",
              color: s.status === "completed" ? "#f5e8d0" : C.saffron,
              fontSize: 16,
              fontWeight: 600,
              textAlign: "center",
              marginBottom: 20
            }}>
              {s.status === "completed"
                ? <>🌹 This Satsang has concluded. Registrations are closed.</>
                : <>⚠️ This Satsang has been cancelled. Registrations are closed.</>
              }
            </div>
          )}
          {s.status === "upcoming" ? (
            !myAtt ? (
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: C.cream, marginBottom: 18 }}>Register Attendance</h3>
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "24px 28px" }}>
                  <Label style={{ marginBottom: 10, display: "block" }}>Select Attending Guests</Label>
                  {(!profile?.guests || profile.guests.length === 0) ? (
                    <div style={{ background: "rgba(212,151,42,0.03)", border: `1px dashed rgba(212,151,42,0.25)`, borderRadius: 10, padding: "16px 20px", marginBottom: 20 }}>
                      <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.6, margin: "0 0 10px", fontStyle: "italic" }}>
                        🙏 Want to bring someone along? Satsang is always more beautiful when shared with loved ones. If you would like to bring family, children, or friends along, please register them in your Profile first and then select them here.
                      </p>
                      <button
                        onClick={() => nav("profile")}
                        style={{
                          background: "none",
                          border: "none",
                          color: C.gold,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                          padding: 0,
                          textDecoration: "underline"
                        }}
                      >
                        👉 Manage Guests in Profile
                      </button>
                    </div>
                  ) : (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
                        {profile.guests.map(g => {
                          const isSelected = selectedGuests.includes(g.id);
                          return (
                            <label key={g.id} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", color: isSelected ? C.cream : C.muted, fontSize: 14, transition: "color 0.2s" }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleGuestSelect(g.id)}
                                style={{ accentColor: C.gold, cursor: "pointer" }}
                              />
                              <strong>{g.name}</strong> <span style={{ fontSize: 12, color: C.muted }}>({g.relationship})</span>
                            </label>
                          );
                        })}
                      </div>
                      <div style={{ fontSize: 12, color: C.muted, display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid rgba(255,255,255,0.03)`, paddingTop: 10 }}>
                        <span>✨ You can always add or update your regular guests in your Profile page.</span>
                        <button
                          onClick={() => nav("profile")}
                          style={{
                            background: "none",
                            border: "none",
                            color: C.gold,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                            padding: 0,
                            textDecoration: "underline"
                          }}
                        >
                          Manage Guests
                        </button>
                      </div>
                    </div>
                  )}
                  {Object.keys(s.sevas || {}).length > 0 && (
                    <div style={{ marginBottom: 24, marginTop: 10 }}>
                      <Label style={{ marginBottom: 4, display: "block" }}>Request Seva Roles</Label>
                      <p style={{ color: C.muted, fontSize: 12, marginBottom: 12 }}>You can assign specific Seva roles to yourself or any of your attending guests.</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        {Object.values(s.sevas || {}).map(sv => {
                          const m = STANDARD_SEVAS.find(x => x.id === sv.id);
                          const full = (sv.opted || 0) >= sv.needed;
                          const selectedPersonId = sevaMapping[sv.id] || "";

                          const options = [
                            { id: user.uid, name: `${profile?.name || user.displayName} (Me)` }
                          ];
                          (profile?.guests || []).forEach(g => {
                            if (selectedGuests.includes(g.id)) {
                              options.push({ id: g.id, name: `${g.name} (Guest)` });
                            }
                          });
                          return (
                            <div key={sv.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.01)", border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", flexWrap: "wrap", gap: 10 }}>
                              <div>
                                <span style={{ color: C.cream, fontSize: 14, fontWeight: 600 }}>{m?.icon} {m?.name}</span>
                                <span style={{ color: C.muted, fontSize: 12, marginLeft: 8 }}>({sv.opted || 0} of {sv.needed} filled)</span>
                              </div>
                              <select
                                disabled={full && !selectedPersonId}
                                value={selectedPersonId}
                                onChange={(e) => handleSevaMapChange(sv.id, e.target.value)}
                                style={{
                                  background: C.bg,
                                  border: `1px solid ${C.border}`,
                                  color: selectedPersonId ? C.gold : C.muted,
                                  padding: "6px 10px",
                                  borderRadius: 6,
                                  fontSize: 13,
                                  cursor: "pointer",
                                  outline: "none"
                                }}
                              >
                                <option value="">-- No Seva --</option>
                                {options.map(opt => (
                                  <option key={opt.id} value={opt.id}>{opt.name}</option>
                                ))}
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {left <= 0 && <div style={{ color: C.saffron, fontSize: 13, marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>⚠️ Note: This Satsang is currently over capacity. Registering will place you on the Waitlist.</div>}
                  <Btn onClick={markAtt} disabled={busy} full>{busy ? "Registering…" : "Register Attendance →"}</Btn>
                </div>
              </div>
            ) : (
              <div style={{ background: myAtt.status === "confirmed" ? "rgba(76,130,80,0.1)" : myAtt.status === "waitlisted" ? "rgba(224,107,16,0.1)" : "rgba(212,151,42,0.1)", border: `1px solid ${myAtt.status === "confirmed" ? "rgba(76,130,80,0.35)" : myAtt.status === "waitlisted" ? "rgba(224,107,16,0.3)" : "rgba(212,151,42,0.35)"}`, borderRadius: 10, padding: "18px 24px", color: myAtt.status === "confirmed" ? "#7db87f" : myAtt.status === "waitlisted" ? C.saffron : C.gold, fontSize: 16, fontWeight: 600 }}>
                {myAtt.status === "confirmed" && <>✓ Attendance Confirmed! Shukrana Guruji 🙏</>}
                {myAtt.status === "waitlisted" && <>⚠️ Waitlisted (Satsang is currently over capacity. Your request has been placed on the Waitlist.)</>}
                {(!myAtt.status || myAtt.status === "pending") && <>⏳ Attendance Pending Host Approval</>}
                {myAtt.guests > 0 ? ` (with ${myAtt.guests} guest(s))` : ""}
                {mySevaNames.length > 0 && ` · Seva Confirmed: ${mySevaNames.join(", ")}`}
                {(!myAtt.status || myAtt.status === "pending" || myAtt.status === "waitlisted") && myAtt.requestedSevas?.length > 0 && ` · Requested Seva: ${formatRequestedSevas(myAtt.requestedSevas)}`}
              </div>
            )
          ) : (
            myAtt && (
              <div style={{ background: myAtt.status === "confirmed" ? "rgba(76,130,80,0.1)" : myAtt.status === "waitlisted" ? "rgba(224,107,16,0.1)" : "rgba(212,151,42,0.1)", border: `1px solid ${myAtt.status === "confirmed" ? "rgba(76,130,80,0.35)" : myAtt.status === "waitlisted" ? "rgba(224,107,16,0.3)" : "rgba(212,151,42,0.35)"}`, borderRadius: 10, padding: "18px 24px", color: myAtt.status === "confirmed" ? "#7db87f" : myAtt.status === "waitlisted" ? C.saffron : C.gold, fontSize: 16, fontWeight: 600 }}>
                {myAtt.status === "confirmed" && <>✓ Attendance Confirmed! Shukrana Guruji 🙏</>}
                {myAtt.status === "waitlisted" && <>⚠️ Waitlisted (Satsang is currently over capacity. Your request has been placed on the Waitlist.)</>}
                {(!myAtt.status || myAtt.status === "pending") && <>⏳ Attendance Pending Host Approval</>}
                {myAtt.guests > 0 ? ` (with ${myAtt.guests} guest(s))` : ""}
                {mySevaNames.length > 0 && ` · Seva Confirmed: ${mySevaNames.join(", ")}`}
                {(!myAtt.status || myAtt.status === "pending" || myAtt.status === "waitlisted") && myAtt.requestedSevas?.length > 0 && ` · Requested Seva: ${formatRequestedSevas(myAtt.requestedSevas)}`}
              </div>
            )
          )}
        </>
      )}
      {/* Host / Admin Sangat Attendance Management */}
      {(isHost || isAdmin) && (
        <div style={{ marginTop: 40, borderTop: `1px solid ${C.border}`, paddingTop: 30 }}>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: C.cream, marginBottom: 20 }}>Sangat Attendance & Seva Management</h3>

          {/* Segmented Tab Controls */}
          <div style={{ display: "flex", gap: 16, borderBottom: `1px solid ${C.border}`, marginBottom: 24 }}>
            <button
              onClick={() => setActiveTab("attendance")}
              style={{
                background: "none",
                border: "none",
                borderBottom: activeTab === "attendance" ? `2px solid ${C.gold}` : "2px solid transparent",
                color: activeTab === "attendance" ? C.gold : C.muted,
                padding: "10px 16px",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
                outline: "none"
              }}
            >
              Attendance Registry
            </button>
            <button
              onClick={() => setActiveTab("seva")}
              style={{
                background: "none",
                border: "none",
                borderBottom: activeTab === "seva" ? `2px solid ${C.gold}` : "2px solid transparent",
                color: activeTab === "seva" ? C.gold : C.muted,
                padding: "10px 16px",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
                outline: "none"
              }}
            >
              Seva Registry
            </button>
          </div>

          {/* TAB A: Attendance Registry */}
          {activeTab === "attendance" && (
            <div>
              {/* 1. Pending Requests */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 24px", marginBottom: 20 }}>
                <h4 style={{ fontSize: 15, fontWeight: 700, color: C.gold, margin: "0 0 12px", display: "flex", justifyContent: "space-between" }}>
                  <span>⏳ Pending Requests</span>
                  <span style={{ fontSize: 12, color: C.muted }}>{attendees.filter(a => a.status === "pending" || !a.status).length} pending</span>
                </h4>
                {attendees.filter(a => a.status === "pending" || !a.status).length === 0 ? (
                  <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>No pending requests.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {sortAttendeesByTime(attendees.filter(a => a.status === "pending" || !a.status)).map(a => {
                      const guestNamesText = a.attendeesList && a.attendeesList.filter(p => !p.isPrimary).map(p => p.name).join(", ");
                      return (
                        <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: `1px solid rgba(92,42,10,0.25)`, paddingBottom: 12, flexWrap: "wrap", gap: 10 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                              <strong style={{ color: C.cream, fontSize: 14 }}>{a.userName}</strong>
                              <span style={{ color: C.muted, fontSize: 12 }}>
                                ({a.guests} guest(s){guestNamesText ? `: ${guestNamesText}` : ""})
                              </span>
                              <span style={{ color: C.muted, fontSize: 11, background: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: 4, display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "sans-serif" }}>
                                🕒 Applied: {fmtTimestamp(a.registeredAt)}
                              </span>
                            </div>
                            <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>📞 {a.userPhone} &nbsp;|&nbsp; ✉️ {a.userEmail}</div>
                            {renderAttendeeSevaStatus(a)}
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => approveAtt(a.id)} disabled={busy} style={{ background: C.gold, color: C.bg, border: "none", cursor: "pointer", fontSize: 12, fontWeight: "bold", padding: "6px 14px", borderRadius: 6 }}>
                              Approve
                            </button>
                            <button onClick={() => declineAtt(a.id)} disabled={busy} style={{ background: "none", border: `1px solid ${C.saffron}`, color: C.saffron, cursor: "pointer", fontSize: 12, fontWeight: "bold", padding: "6px 14px", borderRadius: 6 }}>
                              Decline
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {/* 2. Waitlisted Requests */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 24px", marginBottom: 20 }}>
                <h4 style={{ fontSize: 15, fontWeight: 700, color: C.saffron, margin: "0 0 12px", display: "flex", justifyContent: "space-between" }}>
                  <span>⚠️ Waitlisted Sangat</span>
                  <span style={{ fontSize: 12, color: C.muted }}>{attendees.filter(a => a.status === "waitlisted").length} waitlisted</span>
                </h4>
                {attendees.filter(a => a.status === "waitlisted").length === 0 ? (
                  <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>No waitlisted requests.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {sortAttendeesByTime(attendees.filter(a => a.status === "waitlisted")).map(a => {
                      const guestNamesText = a.attendeesList && a.attendeesList.filter(p => !p.isPrimary).map(p => p.name).join(", ");
                      return (
                        <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: `1px solid rgba(92,42,10,0.25)`, paddingBottom: 12, flexWrap: "wrap", gap: 10 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                              <strong style={{ color: C.cream, fontSize: 14 }}>{a.userName}</strong>
                              <span style={{ color: C.muted, fontSize: 12 }}>
                                ({a.guests} guest(s){guestNamesText ? `: ${guestNamesText}` : ""})
                              </span>
                              <span style={{ color: C.muted, fontSize: 11, background: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: 4, display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "sans-serif" }}>
                                🕒 Applied: {fmtTimestamp(a.registeredAt)}
                              </span>
                            </div>
                            <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>📞 {a.userPhone} &nbsp;|&nbsp; ✉️ {a.userEmail}</div>
                            {renderAttendeeSevaStatus(a)}
                          </div>
                          <div>
                            <button onClick={() => approveAtt(a.id)} disabled={busy} style={{ background: C.gold, color: C.bg, border: "none", cursor: "pointer", fontSize: 12, fontWeight: "bold", padding: "6px 14px", borderRadius: 6 }}>
                              Confirm
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {/* 3. Confirmed Sangat */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 24px" }}>
                <h4 style={{ fontSize: 15, fontWeight: 700, color: "#7db87f", margin: "0 0 12px", display: "flex", justifyContent: "space-between" }}>
                  <span>✓ Confirmed Sangat</span>
                  <span style={{ fontSize: 12, color: C.muted }}>{attendees.filter(a => a.status === "confirmed").length} confirmed</span>
                </h4>
                {attendees.filter(a => a.status === "confirmed").length === 0 ? (
                  <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>No confirmed attendees yet.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {sortAttendeesByTime(attendees.filter(a => a.status === "confirmed")).map(a => {
                      const guestNamesText = a.attendeesList && a.attendeesList.filter(p => !p.isPrimary).map(p => p.name).join(", ");
                      return (
                        <div key={a.id} style={{ borderBottom: `1px solid rgba(92,42,10,0.25)`, paddingBottom: 12 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                                <strong style={{ color: C.cream, fontSize: 14 }}>{a.userName}</strong>
                                <span style={{ color: C.muted, fontSize: 12 }}>
                                  ({a.guests} guest(s){guestNamesText ? `: ${guestNamesText}` : ""})
                                </span>
                                <span style={{ color: C.muted, fontSize: 11, background: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: 4, display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "sans-serif" }}>
                                  🕒 Applied: {fmtTimestamp(a.registeredAt)}
                                </span>
                              </div>
                              <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>📞 {a.userPhone} &nbsp;|&nbsp; ✉️ {a.userEmail}</div>
                              {renderAttendeeSevaStatus(a)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
          {/* TAB B: Seva Registry */}
          {activeTab === "seva" && (
            <div>
              {/* Summary of Roles */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
                {Object.values(s.sevas || {}).map(sv => {
                  const m = STANDARD_SEVAS.find(x => x.id === sv.id);
                  const filled = sv.opted || 0;
                  const needed = sv.needed || 0;
                  const isFull = filled >= needed;
                  return (
                    <div key={sv.id} style={{ background: C.card, border: `1px solid ${isFull ? "rgba(76,130,80,0.3)" : C.border}`, borderRadius: 10, padding: "14px 18px", position: "relative" }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.cream, marginBottom: 4 }}>
                        {m?.icon} {m?.name}
                      </div>
                      <div style={{ fontSize: 12, color: isFull ? "#7db87f" : C.muted }}>
                        {filled} of {needed} Confirmed
                      </div>
                      {isFull && <span style={{ position: "absolute", top: 12, right: 12, fontSize: 10, background: "rgba(76,130,80,0.15)", color: "#7db87f", padding: "2px 6px", borderRadius: 4, fontFamily: "sans-serif" }}>FULL</span>}
                    </div>
                  );
                })}
              </div>
              {/* Master Seva Requests Table */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "24px 28px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
                  <h4 style={{ fontSize: 16, fontWeight: 700, color: C.gold, margin: 0 }}>Seva Allocation Registry</h4>
                  <button
                    onClick={exportSevaSheet}
                    style={{
                      background: "rgba(212,151,42,0.1)",
                      border: `1px solid ${C.gold}`,
                      color: C.gold,
                      padding: "6px 14px",
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={(e) => e.target.style.background = "rgba(212,151,42,0.2)"}
                    onMouseLeave={(e) => e.target.style.background = "rgba(212,151,42,0.1)"}
                  >
                    📥 Export Seva Sheet
                  </button>
                </div>
                {allSevaRequests.length === 0 ? (
                  <p style={{ color: C.muted, fontSize: 14, margin: 0, textAlign: "center", padding: "20px 0" }}>No Seva requests have been made for this Satsang.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {allSevaRequests.map((req, idx) => {
                      const sName = STANDARD_SEVAS.find(x => x.id === req.sevaId)?.name || req.sevaId;
                      const label = req.personId === req.attendeeUid ? req.personName : `${req.personName} (Guest of ${req.attendeeName})`;

                      const isAttendanceConfirmed = req.attendeeStatus === 'confirmed';
                      const isSevaConfirmed = req.status === 'confirmed';
                      const isSevaDeclined = req.status === 'declined';
                      const isSevaPending = req.status === 'pending' || !req.status;
                      return (
                        <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid rgba(92,42,10,0.25)`, paddingBottom: 12, flexWrap: "wrap", gap: 12 }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                              <strong style={{ color: C.cream, fontSize: 14 }}>{label}</strong>
                              <span style={{
                                background: isAttendanceConfirmed ? "rgba(76,130,80,0.15)" : "rgba(224,107,16,0.15)",
                                color: isAttendanceConfirmed ? "#7db87f" : C.saffron,
                                fontSize: 10,
                                padding: "2px 8px",
                                borderRadius: 4,
                                fontFamily: "sans-serif",
                                fontWeight: 600
                              }}>
                                {isAttendanceConfirmed ? "✓ Attendance Confirmed" : "⏳ Attendance Pending"}
                              </span>
                            </div>
                            <div style={{ color: C.gold, fontSize: 13, marginTop: 4, fontWeight: 500 }}>
                              Role: {sName}
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                            <span style={{
                              color: isSevaConfirmed ? "#7db87f" : isSevaDeclined ? C.saffron : C.gold,
                              fontSize: 12,
                              fontWeight: 600
                            }}>
                              {isSevaConfirmed ? "✓ Confirmed" : isSevaDeclined ? "❌ Declined" : "⏳ Pending Approval"}
                            </span>
                            <div style={{ display: "flex", gap: 8 }}>
                              {isSevaPending && (
                                <>
                                  <button
                                    onClick={() => handleConfirmSeva(req.attendeeUid, req.sevaId, req.personId)}
                                    disabled={busy || !isAttendanceConfirmed}
                                    style={{
                                      background: isAttendanceConfirmed ? C.gold : C.muted,
                                      color: C.bg,
                                      border: "none",
                                      cursor: isAttendanceConfirmed ? "pointer" : "not-allowed",
                                      fontSize: 12,
                                      fontWeight: "bold",
                                      padding: "6px 14px",
                                      borderRadius: 6,
                                      opacity: isAttendanceConfirmed ? 1 : 0.5
                                    }}
                                    title={!isAttendanceConfirmed ? "Confirm attendance first to allocate" : ""}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleDeclineSeva(req.attendeeUid, req.sevaId, req.personId)}
                                    disabled={busy}
                                    style={{
                                      background: "none",
                                      border: `1px solid ${C.saffron}`,
                                      color: C.saffron,
                                      cursor: "pointer",
                                      fontSize: 12,
                                      fontWeight: "bold",
                                      padding: "6px 14px",
                                      borderRadius: 6
                                    }}
                                  >
                                    Decline
                                  </button>
                                </>
                              )}
                              {isSevaConfirmed && (
                                <button
                                  onClick={() => handleDeclineSeva(req.attendeeUid, req.sevaId, req.personId)}
                                  disabled={busy}
                                  style={{
                                    background: "none",
                                    border: `1px solid ${C.saffron}`,
                                    color: C.saffron,
                                    cursor: "pointer",
                                    fontSize: 12,
                                    fontWeight: "bold",
                                    padding: "6px 14px",
                                    borderRadius: 6
                                  }}
                                >
                                  Unassign
                                </button>
                              )}
                              {isSevaDeclined && (
                                <button
                                  onClick={() => handleConfirmSeva(req.attendeeUid, req.sevaId, req.personId)}
                                  disabled={busy || !isAttendanceConfirmed}
                                  style={{
                                    background: isAttendanceConfirmed ? C.gold : C.muted,
                                    color: C.bg,
                                    border: "none",
                                    cursor: isAttendanceConfirmed ? "pointer" : "not-allowed",
                                    fontSize: 12,
                                    fontWeight: "bold",
                                    padding: "6px 14px",
                                    borderRadius: 6,
                                    opacity: isAttendanceConfirmed ? 1 : 0.5
                                  }}
                                  title={!isAttendanceConfirmed ? "Confirm attendance first to allocate" : ""}
                                >
                                  Re-approve
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
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
  // Get current date in London timezone for restricting date input
  const ukTimeStr = new Date().toLocaleString("sv-SE", { timeZone: "Europe/London" });
  const currentDate = ukTimeStr.replace(",", "").trim().split(/\s+/)[0];
  if (!user) return <Empty><p>Please login to host a Satsang.</p><Btn onClick={() => nav("login")}>Login →</Btn></Empty>;
  const toggleSv = id => setChosenSv(p => p.find(x => x.id === id) ? p.filter(x => x.id !== id) : [...p, { id, needed: 2, confirmed: 0 }]);
  const setNd = (id, v) => setChosenSv(p => p.map(x => x.id === id ? { ...x, needed: +v, confirmed: Math.min(x.confirmed || 0, +v) } : x));
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("guruji.showSevaPanel", showSevaPanel ? "true" : "false");
  }, [showSevaPanel]);
  const submit = async () => {
    if (!f.title || !f.city || !f.address || !f.date || !f.time) { notify("Please fill all required fields", "err"); return; }
    // Date/time elapsed validation
    const checkTimeStr = new Date().toLocaleString("sv-SE", { timeZone: "Europe/London" });
    const cleanStr = checkTimeStr.replace(",", "");
    const parts = cleanStr.trim().split(/\s+/);
    const checkDate = parts[0]; // "YYYY-MM-DD"
    const checkTime = parts[1] ? parts[1].substring(0, 5) : ""; // "HH:MM"
    if (f.date < checkDate || (f.date === checkDate && f.time < checkTime)) {
      notify("Cannot host a Satsang in the past. Please select a future date and time.", "err");
      return;
    }
    setBusy(true);
    try {
      // Geocode city and postcode for physical coordinates
      let latitude = null;
      let longitude = null;
      try {
        let coords = await geocodeLocation(`${f.city} ${f.postcode || ""}`);
        if (!coords && f.city) {
          coords = await geocodeLocation(f.city);
        }
        if (coords) {
          latitude = coords.lat;
          longitude = coords.lng;
        }
      } catch (ge) {
        console.warn("Geocoding during event creation failed:", ge);
      }
      const sevas = chosenSv.reduce((acc, sv) => ({
        ...acc,
        [sv.id]: { id: sv.id, needed: sv.needed, opted: 0, confirmed: sv.confirmed || 0, enrolled: [] }
      }), {});
      await createSatsang({
        ...f, maxAttendees: +f.maxAttendees, sevas,
        latitude,
        longitude,
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
        <FField label="Date *" type="date" v={f.date} on={set("date")} min={currentDate} />
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
    // Load Satsangs hosted by the user
    getSatsangsByOrganizer(user.uid)
      .then(hostedList => {
        setHosted(hostedList || []);
      })
      .catch(err => {
        console.error("hosted load failed", err);
        setHosted([]);
      });
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
  const upcomingHosted = hosted.filter(s => s.status === "upcoming");
  const upcomingAttending = attending.filter(s => s.status === "upcoming");
  const completedHosted = hosted.filter(s => s.status === "completed").map(s => ({ ...s, role: "Host" }));
  const completedAttending = attending.filter(s => s.status === "completed" && s.attendanceStatus !== "waitlisted").map(s => ({ ...s, role: "Sangat" }));
  const completedMap = new Map();
  completedHosted.forEach(s => completedMap.set(s.id, s));
  completedAttending.forEach(s => {
    if (completedMap.has(s.id)) {
      completedMap.set(s.id, { ...completedMap.get(s.id), role: "Host & Sangat" });
    } else {
      completedMap.set(s.id, s);
    }
  });
  const completed = Array.from(completedMap.values())
    .sort((a, b) => b.date.localeCompare(a.date) || (b.time || "").localeCompare(a.time || ""));
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 32px" }}>
      <h2 style={{ fontSize: 32, fontWeight: 700, color: C.cream, margin: "0 0 6px" }}>Satsang Dashboard</h2>
      <p style={{ color: C.muted, marginBottom: 32 }}>View your hosted satsangs, and satsangs you are attending or serving seva.</p>

      {/* Sangat Summary Card */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "24px 28px", marginBottom: 32 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.gold, marginBottom: 18 }}>Sangat Summary</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 30, marginBottom: 20 }}>
          {[["Satsangs hosted", hosted.length], ["Seva roles active", attending.reduce((a, s) => a + Object.values(s.sevas || {}).filter(sv => (sv.enrolled || []).some(e => e.uid === user.uid)).length, 0)]].map(([k, v]) => (
            <div key={k} style={{ display: "flex", flexDirection: "column", gap: 6, borderLeft: `3px solid ${C.gold}`, paddingLeft: 16 }}>
              <span style={{ color: C.muted, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "sans-serif" }}>{k}</span>
              <strong style={{ color: C.cream, fontSize: 32, fontWeight: 750 }}>{v}</strong>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", borderTop: `1px solid rgba(255,255,255,0.03)`, paddingTop: 20 }}>
          <Btn onClick={() => nav("post")} outline>+ Host a Satsang</Btn>
          <Btn onClick={() => nav("find")} ghost>Find Upcoming Satsang →</Btn>
        </div>
      </div>
      {upcomingHosted.length > 0 && <div style={{ marginBottom: 36 }}>
        <h3 style={{ fontSize: 19, fontWeight: 700, color: C.cream, marginBottom: 16 }}>Satsangs I'm Hosting</h3>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>{upcomingHosted.map(s => <SCard key={s.id} s={s} nav={nav} />)}</div>
      </div>}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 19, fontWeight: 700, color: C.cream, marginBottom: 16 }}>Satsangs I'm Attending</h3>
        {upcomingAttending.length === 0 ? (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "24px 20px", color: C.muted, fontSize: 15 }}>
            You are not registered for any upcoming satsangs yet. Use Find Satsang to register for one, or host your own.
          </div>
        ) : (
          upcomingAttending.map(s => {
            const sevaRoles = Object.values(s.sevas || {}).filter(sv => (sv.enrolled || []).some(e => e.uid === user.uid));
            const statusColor = s.attendanceStatus === "confirmed" ? "#7db87f" : s.attendanceStatus === "waitlisted" ? "#e06b10" : C.gold;
            const statusBg = s.attendanceStatus === "confirmed" ? "rgba(76,130,80,0.2)" : s.attendanceStatus === "waitlisted" ? "rgba(224,107,16,0.15)" : "rgba(212,151,42,0.15)";
            const statusText = s.attendanceStatus === "confirmed" ? "✓ Confirmed" : s.attendanceStatus === "waitlisted" ? "⚠️ Waitlisted" : "⏳ Pending Approval";
            return (
              <div key={s.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 20px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <strong style={{ color: C.cream, fontSize: 15 }}>{s.title}</strong>
                    <span style={{ background: statusBg, color: statusColor, fontSize: 11, fontWeight: "bold", padding: "3px 10px", borderRadius: 20, fontFamily: "sans-serif" }}>
                      {statusText}
                    </span>
                  </div>
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
      {/* Completed Satsangs */}
      {completed.length > 0 && (
        <div style={{ marginTop: 24, marginBottom: 20 }}>
          <h3 style={{ fontSize: 19, fontWeight: 700, color: C.cream, marginBottom: 16 }}>Completed Satsangs</h3>
          {completed.map(s => {
            const roleColor = s.role.includes("Host") ? C.gold : "#7db87f";
            const roleBg = s.role.includes("Host") ? "rgba(212,151,42,0.15)" : "rgba(76,130,80,0.15)";
            return (
              <div key={s.id} onClick={() => nav("detail", s.id)} style={{ background: "rgba(255,255,255,0.02)", border: `1px solid rgba(255,255,255,0.06)`, borderRadius: 10, padding: "16px 20px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, cursor: "pointer", transition: "all 0.2s ease" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = C.border; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <strong style={{ color: "#c0a878", fontSize: 15 }}>{s.title}</strong>
                    <span style={{ background: roleBg, color: roleColor, fontSize: 11, fontWeight: "bold", padding: "3px 10px", borderRadius: 20, fontFamily: "sans-serif" }}>
                      {s.role}
                    </span>
                  </div>
                  <div style={{ color: "rgba(156,112,80,0.6)", fontSize: 13, marginTop: 4 }}>{fmtDate(s.date)} · {s.city} {s.postcode}</div>
                </div>
                <div style={{ color: C.muted, fontSize: 13, fontWeight: "bold" }}>Concluded</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
// ─── Profile View ─────────────────────────────────────────────────────────────
function ProfileView({ user, profile, nav, notify }) {
  const [newGuestName, setNewGuestName] = useState("");
  const [newGuestRel, setNewGuestRel] = useState("Spouse");
  const [isChild, setIsChild] = useState(false);
  const [guestBusy, setGuestBusy] = useState(false);
  const handleAddGuest = async () => {
    const trimmedName = newGuestName.trim();
    if (!trimmedName) {
      notify("Please enter a guest name", "err");
      return;
    }
    setGuestBusy(true);
    try {
      const isActuallyChild = (newGuestRel === "Son" || newGuestRel === "Daughter") && isChild;
      const newGuest = {
        id: "g_" + Math.random().toString(36).slice(2, 9),
        name: trimmedName,
        relationship: newGuestRel,
        isChild: isActuallyChild
      };
      const currentGuests = profile?.guests || [];
      await updateUserGuests(user.uid, [...currentGuests, newGuest]);
      setNewGuestName("");
      setIsChild(false);
      notify("Guest added successfully! 🙏");
    } catch (err) {
      console.error(err);
      notify("Failed to add guest", "err");
    }
    setGuestBusy(false);
  };
  const handleRemoveGuest = async (guestId) => {
    if (!window.confirm("Are you sure you want to remove this guest?")) return;
    try {
      const currentGuests = profile?.guests || [];
      const updated = currentGuests.filter(g => g.id !== guestId);
      await updateUserGuests(user.uid, updated);
      notify("Guest removed successfully! 🙏");
    } catch (err) {
      console.error(err);
      notify("Failed to remove guest", "err");
    }
  };
  if (!user) return <Empty><Btn onClick={() => nav("login")}>Login to view profile →</Btn></Empty>;
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 32px" }}>
      <h2 style={{ fontSize: 32, fontWeight: 700, color: C.cream, margin: "0 0 6px" }}>My Profile</h2>
      <p style={{ color: C.muted, marginBottom: 32 }}>Manage your basic personal details and register regular guests or children.</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24, marginBottom: 24 }}>
        {/* Personal Details */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "24px 28px" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.gold, marginBottom: 18 }}>Personal Details</div>
          {[["Name", profile?.name], ["Email", user.email], ["Phone", profile?.phone], ["City", profile?.city], ["Address", `${profile?.address || ""} ${profile?.postcode || ""}`]].map(([k, v]) => v ? (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, paddingBottom: 10, marginBottom: 10, borderBottom: `1px solid ${C.border}`, gap: 12, flexWrap: "wrap" }}>
              <span style={{ color: C.muted }}>{k}</span><strong style={{ color: C.cream }}>{v}</strong>
            </div>
          ) : null)}
        </div>
        {/* Managed Guests & Children */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "24px 28px" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.gold, marginBottom: 10 }}>Family & Regular Guests</div>
          <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
            Satsang is a gathering of love and devotion. Add your regular family members, children, or friends here so they are registered in your profile. You will then be able to easily select them and assign Sevas to them when registering for any upcoming Satsang.
          </p>

          {/* Add Guest Form */}
          <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: "1 1 200px" }}>
              <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: C.gold }}>Name</label>
              <input
                style={{
                  background: "none",
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding: "8px 12px",
                  color: C.cream,
                  fontSize: 14,
                  width: "100%",
                  outline: "none"
                }}
                placeholder="e.g. Rajiv Aggarwal"
                value={newGuestName}
                onChange={e => setNewGuestName(e.target.value)}
              />
            </div>
            <div style={{ flex: "1 1 150px" }}>
              <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: C.gold }}>Relationship</label>
              <select
                style={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding: "8px 12px",
                  color: C.cream,
                  fontSize: 14,
                  width: "100%",
                  outline: "none"
                }}
                value={newGuestRel}
                onChange={e => setNewGuestRel(e.target.value)}
              >
                {["Spouse", "Son", "Daughter", "Parent", "Sibling", "Friend", "Other"].map(r => (
                  <option key={r} value={r} style={{ background: C.bg }}>{r}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleAddGuest}
              disabled={guestBusy}
              style={{
                background: C.gold,
                color: C.bg,
                border: "none",
                borderRadius: 8,
                padding: "10px 20px",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                height: 38,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              {guestBusy ? "Adding…" : "+ Add Member"}
            </button>
            {/* Child Checkbox for Profile page */}
            {(newGuestRel === "Son" || newGuestRel === "Daughter") && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flex: "1 1 100%" }}>
                <input
                  type="checkbox"
                  id="profileIsChild"
                  checked={isChild}
                  onChange={e => setIsChild(e.target.checked)}
                  style={{ cursor: "pointer", width: 16, height: 16, accentColor: C.gold }}
                />
                <label htmlFor="profileIsChild" style={{ fontSize: 13, color: C.cream, cursor: "pointer", fontFamily: "sans-serif" }}>
                  12 or younger (Child)
                </label>
              </div>
            )}
          </div>
          {/* Guests List */}
          {(!profile?.guests || profile.guests.length === 0) ? (
            <div style={{ border: `1px dashed ${C.border}`, borderRadius: 10, padding: "24px", textAlign: "center", color: C.muted, fontSize: 14, fontStyle: "italic" }}>
              No family members or guests added yet.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
              {profile.guests.map(g => (
                <div key={g.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.01)", border: `1px solid rgba(92,42,10,0.3)`, borderRadius: 10, padding: "12px 16px" }}>
                  <div>
                    <div style={{ fontWeight: 600, color: C.cream, fontSize: 14 }}>{g.name}</div>
                    <div style={{ fontSize: 11, color: C.gold, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                      {g.relationship}
                      {g.isChild && (
                        <span style={{
                          color: C.bg,
                          background: C.gold,
                          fontSize: 9,
                          fontWeight: "bold",
                          padding: "1px 6px",
                          borderRadius: 8,
                          textTransform: "uppercase",
                          fontFamily: "sans-serif"
                        }}>
                          Child
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveGuest(g.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: C.saffron,
                      cursor: "pointer",
                      fontSize: 12,
                      padding: "4px 8px",
                      fontWeight: "bold",
                      borderRadius: 4
                    }}
                    onMouseOver={e => e.currentTarget.style.textDecoration = "underline"}
                    onMouseOut={e => e.currentTarget.style.textDecoration = "none"}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Guidelines ───────────────────────────────────────────────────────────────
function GuidelinesView() {
  const [open, setOpen] = useState(null);
  const [vachan] = useState(() => getRandomVachan());
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
        <div style={{ fontSize: 9, color: C.gold, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 12, fontFamily: "sans-serif", fontWeight: 700 }}>🌹 Guruji's Divine Vachan</div>
        <p style={{ fontSize: 22, fontStyle: "italic", color: C.cream, margin: "0 0 12px", lineHeight: 1.6 }}>"{vachan.punjabi}"</p>
        <p style={{ fontSize: 14, color: C.gold, fontStyle: "italic" }}>— {vachan.english}</p>
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
  const TABS = [["satsangs", "All Satsangs"], ["users", "Users"], ["broadcast", "Broadcast"]];
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "48px 32px" }}>
      <h2 style={{ fontSize: 32, fontWeight: 700, color: C.cream, margin: "0 0 6px" }}>Admin Panel</h2>
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
                {["Title", "Date", "Time", "City", "Attendees", "Status", "Actions"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 12px", color: C.muted, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "sans-serif" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allSatsangs.map(s => (
                <tr key={s.id} style={{ borderBottom: `1px solid rgba(92,42,10,0.3)` }}>
                  <td style={{ padding: "12px" }}>
                    <button
                      onClick={() => nav("detail", s.id)}
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        color: C.cream,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontSize: 14,
                        textAlign: "left",
                        fontFamily: "Georgia,serif",
                        transition: "color 0.2s ease"
                      }}
                      onMouseOver={e => e.currentTarget.style.color = C.gold}
                      onMouseOut={e => e.currentTarget.style.color = C.cream}
                    >
                      {s.title}
                    </button>
                  </td>
                  <td style={{ padding: "12px", color: C.muted }}>{s.date}</td>
                  <td style={{ padding: "12px", color: C.muted }}>{fmtTime(s.time)}</td>
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
  const [guests, setGuests] = useState([]);
  const [newGuestName, setNewGuestName] = useState("");
  const [newGuestRel, setNewGuestRel] = useState("Spouse");
  const [isChild, setIsChild] = useState(false);
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  const handleAddLocalGuest = () => {
    const trimmed = newGuestName.trim();
    if (!trimmed) {
      notify("Please enter a guest name", "err");
      return;
    }
    const isActuallyChild = (newGuestRel === "Son" || newGuestRel === "Daughter") && isChild;
    const newGuest = {
      id: "g_" + Math.random().toString(36).slice(2, 9),
      name: trimmed,
      relationship: newGuestRel,
      isChild: isActuallyChild
    };
    setGuests(prev => [...prev, newGuest]);
    setNewGuestName("");
    setIsChild(false);
  };
  const handleRemoveLocalGuest = (id) => {
    setGuests(prev => prev.filter(g => g.id !== id));
  };
  const submit = async () => {
    if (!f.name || !f.email || !f.phone || !f.address || !f.city || !f.postcode || !f.password) { notify("Please fill all required fields", "err"); return; }
    if (f.password !== f.confirm) { notify("Passwords do not match", "err"); return; }
    if (f.password.length < 6) { notify("Password must be at least 6 characters", "err"); return; }
    setBusy(true);
    try {
      await registerUser({
        email: f.email,
        password: f.password,
        name: f.name,
        phone: f.phone,
        address: f.address,
        city: f.city,
        postcode: f.postcode,
        guests
      });
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

    {/* Subtle & Compelling Guest/Child Registration Form */}
    <div style={{
      background: "rgba(212,151,42,0.03)",
      border: `1px dashed rgba(212,151,42,0.25)`,
      borderRadius: 10,
      padding: "16px 20px",
      margin: "8px 0 20px 0",
      fontSize: 13,
      lineHeight: 1.6,
      color: C.muted
    }}>
      <span style={{ color: C.gold, fontWeight: 700, display: "block", marginBottom: 6 }}>Add Family and Friends</span>
      <p style={{ margin: "0 0 12px 0", fontSize: 12, lineHeight: 1.5 }}>
        Add your family, children, or regular guests here to include them in your profile. You can easily include them when registering for a Satsang.
      </p>
      {/* Inline Guest Inputs */}
      <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ flex: "1 1 180px" }}>
          <label style={{ display: "block", marginBottom: 4, fontSize: 10, color: C.gold, letterSpacing: "0.05em", fontFamily: "sans-serif" }}>Name</label>
          <input
            style={{
              background: "rgba(255,255,255,0.02)",
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              padding: "7px 10px",
              color: C.cream,
              fontSize: 13,
              width: "100%",
              outline: "none",
              boxSizing: "border-box"
            }}
            placeholder="e.g. Rajiv Aggarwal"
            value={newGuestName}
            onChange={e => setNewGuestName(e.target.value)}
          />
        </div>
        <div style={{ flex: "1 1 120px" }}>
          <label style={{ display: "block", marginBottom: 4, fontSize: 10, color: C.gold, letterSpacing: "0.05em", fontFamily: "sans-serif" }}>Relationship</label>
          <select
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              padding: "7px 10px",
              color: C.cream,
              fontSize: 13,
              width: "100%",
              outline: "none",
              boxSizing: "border-box",
              height: 31
            }}
            value={newGuestRel}
            onChange={e => setNewGuestRel(e.target.value)}
          >
            {["Spouse", "Son", "Daughter", "Parent", "Sibling", "Friend", "Other"].map(r => (
              <option key={r} value={r} style={{ background: C.bg }}>{r}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={handleAddLocalGuest}
          style={{
            background: "none",
            color: C.gold,
            border: `1px solid ${C.gold}`,
            borderRadius: 6,
            padding: "6px 14px",
            fontWeight: 700,
            fontSize: 12,
            cursor: "pointer",
            height: 31,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            boxSizing: "border-box"
          }}
        >
          + Add
        </button>
        {/* Child Checkbox for Join Sangat page */}
        {(newGuestRel === "Son" || newGuestRel === "Daughter") && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flex: "1 1 100%" }}>
            <input
              type="checkbox"
              id="registerIsChild"
              checked={isChild}
              onChange={e => setIsChild(e.target.checked)}
              style={{ cursor: "pointer", width: 16, height: 16, accentColor: C.gold }}
            />
            <label htmlFor="registerIsChild" style={{ fontSize: 13, color: C.cream, cursor: "pointer", fontFamily: "sans-serif" }}>
              12 or younger (Child)
            </label>
          </div>
        )}
      </div>
      {/* Local Guest List */}
      {guests.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
          {guests.map((g) => (
            <div key={g.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.02)", border: `1px solid rgba(212,151,42,0.15)`, borderRadius: 6, padding: "8px 12px" }}>
              <div>
                <span style={{ fontWeight: 600, color: C.cream, fontSize: 13 }}>{g.name}</span>
                <span style={{ fontSize: 11, color: C.gold, textTransform: "uppercase", letterSpacing: "0.05em", marginLeft: 8, display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {g.relationship}
                  {g.isChild && (
                    <span style={{
                      color: C.bg,
                      background: C.gold,
                      fontSize: 8,
                      fontWeight: "bold",
                      padding: "1px 5px",
                      borderRadius: 6,
                      textTransform: "uppercase",
                      fontFamily: "sans-serif",
                      lineHeight: 1
                    }}>
                      Child
                    </span>
                  )}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveLocalGuest(g.id)}
                style={{
                  background: "none",
                  border: "none",
                  color: C.saffron,
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: "bold",
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: C.muted, fontStyle: "italic", marginTop: 8, textAlign: "center" }}>
          No family members or guests added yet.
        </div>
      )}
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
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📍 {s.city} {s.postcode}</span>
        {s.distance !== undefined && s.distance !== null && (
          <span style={{ color: C.gold, fontSize: 11, fontWeight: "bold", whiteSpace: "nowrap", flexShrink: 0 }}>
            {s.distance.toFixed(1)} km
          </span>
        )}
      </div>
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

function FField({ label, type = "text", v, on, ph, ...rest }) {
  return <div style={{ marginBottom: 18 }}>
    <Label>{label}</Label>
    <input type={type} value={v} onChange={on} placeholder={ph} {...rest} style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 8, padding: "11px 14px", color: C.cream, fontSize: 15, fontFamily: "Georgia,serif", outline: "none", boxSizing: "border-box" }} />
  </div>;
}

function Label({ children }) {
  return <label style={{ display: "block", fontSize: 10, color: C.muted, marginBottom: 7, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "sans-serif" }}>{children}</label>;
}

function DivineVachanBanner({ view }) {
  const [vachan, setVachan] = useState(null);

  useEffect(() => {
    setVachan(getRandomVachan());
  }, [view]);

  if (!vachan) return null;

  return (
    <div style={{
      maxWidth: 900,
      margin: "40px auto 20px",
      padding: "24px 28px",
      background: "rgba(39, 14, 3, 0.4)",
      border: `1px dashed ${C.border}`,
      borderRadius: 12,
      textAlign: "center",
      boxShadow: "0 4px 24px rgba(0,0,0,0.2)"
    }}>
      <div style={{
        fontSize: 9,
        color: C.gold,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        marginBottom: 8,
        fontFamily: "sans-serif",
        fontWeight: 700
      }}>
        Guruji's Divine Vachan
      </div>
      <p style={{
        fontSize: 16,
        fontStyle: "italic",
        color: C.cream,
        margin: "0 0 6px",
        lineHeight: 1.5
      }}>
        "{vachan.punjabi}"
      </p>
      <p style={{
        fontSize: 13,
        color: C.muted,
        margin: 0,
        fontStyle: "italic",
        lineHeight: 1.4
      }}>
        — {vachan.english}
      </p>
    </div>
  );
}
