// ─── Guruji Satsang Management App — Firebase Edition ────────────────────────
// Full Firebase integration: Auth, Firestore, Cloud Functions (email)
import { useState, useEffect, useCallback } from "react";
import { logoutUser } from "./firebase/auth";
import { getUpcomingSatsangs, updateUserTheme } from "./firebase/firestore";
import { useAuth, AuthProvider } from "./hooks/useAuth";
import { C, estimateCountryFromTimezone } from "./utils/constants";

// Standing Views / Pages
import HomeView from "./pages/HomeView";
import FindView from "./pages/FindView";
import DetailView from "./pages/DetailView";
import PostView from "./pages/PostView";
import DashboardView from "./pages/DashboardView";
import ProfileView from "./pages/ProfileView";
import GuidelinesView from "./pages/GuidelinesView";
import AdminView from "./pages/AdminView";
import LoginView from "./pages/LoginView";
import RegisterView from "./pages/RegisterView";

// Shared UI Primitives
import DivineVachanBanner from "./components/ui/DivineVachanBanner";

// Glob optimized image imports (omitting deprecated raw BMPs)
const gurujiImages = import.meta.glob("./assets/images/*.{png,jpg,jpeg,webp,JPG,JPEG}", { eager: true });
const GURUJI_IMGS = Object.entries(gurujiImages)
  .filter(([path]) => !path.includes("invite_bg") && !path.includes("guruji_portrait"))
  .sort(([pathA], [pathB]) => pathA.localeCompare(pathB))
  .map(([, module]) => module.default)
  .filter(Boolean);

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") return stored;
    return "dark";
  });

  // Apply/remove CSS class whenever the theme state changes
  useEffect(() => {
    if (theme === "light") {
      document.documentElement.classList.add("theme-light");
      localStorage.setItem("theme", "light");
    } else {
      document.documentElement.classList.remove("theme-light");
      localStorage.setItem("theme", "dark");
    }
  }, [theme]);

  // Sync state with logged-in user's profile theme preference
  useEffect(() => {
    if (profile && profile.theme) {
      setTheme(profile.theme);
    }
  }, [profile]);

  const handleToggleTheme = async () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    if (user) {
      try {
        await updateUserTheme(user.uid, nextTheme);
      } catch (err) {
        console.warn("Failed to persist theme to profile:", err);
      }
    }
  };

  const [ipCountry, setIpCountry] = useState(() => estimateCountryFromTimezone()); // Default fallback using timezone estimation
  const [ipCoords, setIpCoords] = useState(null);
  const [ipCity, setIpCity] = useState("");

  useEffect(() => {
    async function fetchIPLoc() {
      try {
        const res = await fetch("https://ipapi.co/json/");
        const data = await res.json();
        if (data) {
          if (data.country_name) setIpCountry(data.country_name);
          if (data.latitude && data.longitude) {
            setIpCoords({ lat: data.latitude, lng: data.longitude });
          }
          if (data.city) setIpCity(data.city);
        }
      } catch (e) {
        console.warn("Could not estimate location/country via IP Geolocation", e);
      }
    }
    fetchIPLoc();
  }, []);

  const notify = (msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3600);
  };

  // ─── Zero-Dependency Native Hash Routing Sync ──────────────────────────
  useEffect(() => {
    const parseHash = () => {
      const hash = window.location.hash;
      if (!hash || hash === "#") {
        window.location.hash = "#/home";
        return;
      }
      const pathPart = hash.startsWith("#/") ? hash.substring(2) : hash.substring(1);
      const [cleanPath] = pathPart.split("?");
      const parts = cleanPath.split("/");
      const page = parts[0] || "home";
      const param = parts[1] || null;

      setView(page);
      setSel(param);
    };

    window.addEventListener("hashchange", parseHash);
    parseHash(); // Initial check on load

    return () => window.removeEventListener("hashchange", parseHash);
  }, []);

  const nav = (v, p = null) => {
    window.location.hash = p ? `#/${v}/${p}` : `#/${v}`;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const loadUpcoming = useCallback(async () => {
    try {
      setUpcoming(await getUpcomingSatsangs());
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadUpcoming();
  }, [loadUpcoming]);

  const hasAuthNoProfile = user && !profile;

  // Intercept users who are logged in (e.g. via Google or Custom Token) but have no profile doc in Firestore.
  // Force-redirect them to the register page to complete profile creation.
  useEffect(() => {
    if (hasAuthNoProfile && view !== "register") {
      nav("register");
      notify("Please complete your Sangat profile details to continue! 🙏", "ok");
    }
  }, [hasAuthNoProfile, view]);

  const isAdmin = profile?.role === "admin";
  const navItems = hasAuthNoProfile
    ? [
      { l: "Complete Profile", v: "register", accent: true },
      { l: "Logout", fn: async () => { await logoutUser(); nav("home"); } },
    ]
    : user
    ? [
      { l: "Find Satsang", v: "find" },
      { l: "Guidelines", v: "guidelines" },
      { l: "Dashboard", v: "dashboard" },
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

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        background: C.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 16
      }}>
        <img
          src={GURUJI_IMGS[0]}
          alt="Guruji"
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            objectFit: "cover",
            border: `2px solid ${C.gold}`,
            opacity: 0.8
          }}
          onError={e => { e.target.style.display = "none"; }}
        />
        <p style={{ color: C.gold, fontFamily: "var(--font-headings)", letterSpacing: "0.15em", fontSize: 13 }}>OM NAMAH SHIVAY…</p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: `linear-gradient(160deg, var(--color-bg) 0%, var(--color-bg-darker) 100%)`,
      color: C.cream,
      fontFamily: "var(--font-body)"
    }}>
      <style>{`
        .nav-links-desktop {
          display: flex;
          gap: 6px;
          align-items: center;
        }
        .nav-hamburger-container {
          display: none;
          position: relative;
        }
        
        @keyframes fadeInSlide {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 850px) {
          .nav-links-desktop {
            display: none;
          }
          .nav-hamburger-container {
            display: block;
          }
        }
      `}</style>
      <div style={{ height: 4, background: `linear-gradient(90deg,${C.red},${C.gold},${C.saffron},${C.gold},${C.red})` }} />
      
      {/* NAV */}
      <nav style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        height: 66,
        background: "rgba(26,8,0,0.97)",
        borderBottom: `1px solid ${C.border}`,
        position: "sticky",
        top: 4,
        zIndex: 100,
        backdropFilter: "blur(12px)"
      }}>
        <button onClick={() => { setMenuOpen(false); nav("home"); }} style={{ display: "flex", alignItems: "center", gap: 12, background: "none", border: "none", cursor: "pointer" }}>
          <img
            src={GURUJI_IMGS[0]}
            alt="Guruji"
            style={{ width: 42, height: 42, borderRadius: "50%", objectFit: "cover", border: `2px solid ${C.gold}` }}
            onError={e => { e.target.style.display = "none"; }}
          />
          <span style={{ textAlign: "left" }}>
            <span style={{ display: "block", fontSize: 17, fontWeight: 700, color: C.gold, letterSpacing: "0.02em" }}>Guruji Satsang App</span>
            <span style={{ display: "block", fontSize: 9, color: C.muted, letterSpacing: "0.2em", fontFamily: "sans-serif" }}>Jai Guruji</span>
          </span>
        </button>

        {/* Desktop Navigation Links */}
        <div className="nav-links-desktop">
          {navItems.map(item => (
            <button
              key={item.l}
              onClick={item.fn ? item.fn : () => nav(item.v)}
              style={item.accent
                ? { background: C.gold, border: "none", cursor: "pointer", color: C.bg, fontSize: 13, fontWeight: 700, padding: "7px 16px", borderRadius: 6 }
                : { background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 13, padding: "7px 14px", borderRadius: 6 }}
            >
              {item.l}
            </button>
          ))}
          <button
            onClick={handleToggleTheme}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: C.muted,
              fontSize: 16,
              padding: "7px 10px",
              marginLeft: 8,
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            title={theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme"}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>

        {/* Mobile Hamburger Navigation */}
        <div className="nav-hamburger-container">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              background: "none",
              border: `1px solid ${menuOpen ? C.gold : "rgba(212,151,42,0.3)"}`,
              borderRadius: 8,
              cursor: "pointer",
              padding: "10px 12px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              transition: "all 0.2s ease",
              position: "relative",
              zIndex: 101,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 5, width: 22, height: 16, justifyContent: "space-between", position: "relative" }}>
              <span style={{
                display: "block",
                width: "100%",
                height: 2,
                background: C.gold,
                transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                transform: menuOpen ? "translateY(7px) rotate(45deg)" : "none"
              }} />
              <span style={{
                display: "block",
                width: "100%",
                height: 2,
                background: C.gold,
                transition: "all 0.15s ease-in-out",
                opacity: menuOpen ? 0 : 1
              }} />
              <span style={{
                display: "block",
                width: "100%",
                height: 2,
                background: C.gold,
                transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                transform: menuOpen ? "translateY(-7px) rotate(-45deg)" : "none"
              }} />
            </div>
          </button>

          {/* Background overlay click-dismisser */}
          {menuOpen && (
            <div 
              onClick={() => setMenuOpen(false)}
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 98,
                background: "transparent",
              }}
            />
          )}

          {/* Floating Dropdown Card */}
          {menuOpen && (
            <div style={{
              position: "absolute",
              top: 54,
              right: 0,
              width: 260,
              background: "var(--color-menu-bg)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: `1px solid var(--color-border)`,
              borderRadius: 14,
              padding: "12px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              boxShadow: "var(--color-menu-shadow)",
              animation: "fadeInSlide 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
              zIndex: 99,
            }}>
              {/* Home link always at the top of the hamburger */}
              <button
                onClick={() => {
                  setMenuOpen(false);
                  nav("home");
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  width: "100%",
                  padding: "10px 14px",
                  background: "none",
                  border: "none",
                  borderRadius: 8,
                  color: C.cream,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.2s ease",
                  fontFamily: "var(--font-headings)"
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "rgba(212, 151, 42, 0.12)";
                  e.target.style.color = C.gold;
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "none";
                  e.target.style.color = C.cream;
                }}
              >
                Home
              </button>

              {navItems.map(item => (
                <button
                  key={item.l}
                  onClick={async () => {
                    setMenuOpen(false);
                    if (item.fn) {
                      await item.fn();
                    } else {
                      nav(item.v);
                    }
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    width: "100%",
                    padding: "10px 14px",
                    background: item.accent ? C.gold : "none",
                    border: "none",
                    borderRadius: 8,
                    color: item.accent ? C.bg : C.cream,
                    fontSize: 14,
                    fontWeight: item.accent ? 700 : 500,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.2s ease",
                    fontFamily: "var(--font-headings)"
                  }}
                  onMouseEnter={(e) => {
                    if (!item.accent) {
                      e.target.style.background = "rgba(212, 151, 42, 0.12)";
                      e.target.style.color = C.gold;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!item.accent) {
                      e.target.style.background = "none";
                      e.target.style.color = C.cream;
                    }
                  }}
                >
                  {item.l}
                </button>
              ))}
              <div style={{ height: 1, background: "rgba(212,151,42,0.15)", margin: "4px 0" }} />
              <div
                onClick={handleToggleTheme}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 8,
                  color: C.cream,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  fontFamily: "var(--font-headings)",
                  userSelect: "none"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(212, 151, 42, 0.12)";
                  e.currentTarget.style.color = C.gold;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "none";
                  e.currentTarget.style.color = C.cream;
                }}
              >
                <span>Theme</span>
                <div style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  background: theme === "light" ? C.gold : "rgba(120, 120, 128, 0.32)",
                  position: "relative",
                  transition: "background-color 0.2s ease",
                  padding: 2,
                  boxSizing: "border-box"
                }}>
                  <div style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "#ffffff",
                    position: "absolute",
                    left: 2,
                    top: 2,
                    transform: theme === "light" ? "translateX(20px)" : "translateX(0px)",
                    transition: "transform 0.2s cubic-bezier(0.25, 0.8, 0.25, 1)",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                  }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {toast && (
        <div style={{
          position: "fixed",
          bottom: 28,
          left: "50%",
          transform: "translateX(-50%)",
          background: toast.type === "err" ? "#5a1010" : "#3a1800",
          color: C.gold,
          padding: "13px 28px",
          borderRadius: 10,
          fontSize: 15,
          fontWeight: 600,
          zIndex: 9999,
          border: `1px solid ${C.border}`,
          whiteSpace: "nowrap",
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)"
        }}>
          {toast.msg}
        </div>
      )}

      <main>
        {view === "home" && <HomeView nav={nav} upcoming={upcoming} user={user} heroImg={heroImg} gurujiImgs={GURUJI_IMGS} />}
        {view === "login" && <LoginView nav={nav} notify={notify} ipCountry={ipCountry} />}
        {view === "register" && <RegisterView nav={nav} notify={notify} user={user} ipCountry={ipCountry} />}
        {view === "find" && <FindView search={search} setSearch={setSearch} nav={nav} user={user} profile={profile} upcoming={upcoming} ipCoords={ipCoords} ipCity={ipCity} ipCountry={ipCountry} />}
        {view === "detail" && <DetailView satsangId={sel} user={user} profile={profile} nav={nav} notify={notify} onRefresh={loadUpcoming} />}
        {view === "post" && <PostView user={user} profile={profile} nav={nav} notify={notify} onRefresh={loadUpcoming} />}
        {view === "dashboard" && <DashboardView user={user} profile={profile} nav={nav} notify={notify} />}
        {view === "profile" && <ProfileView user={user} profile={profile} nav={nav} notify={notify} />}
        {view === "guidelines" && <GuidelinesView />}
        {view === "admin" && isAdmin && <AdminView user={user} profile={profile} nav={nav} notify={notify} />}
      </main>

      {view !== "home" && view !== "guidelines" && <DivineVachanBanner view={view} />}

      <footer style={{
        borderTop: `1px solid ${C.border}`,
        padding: "36px 32px",
        textAlign: "center",
        background: "rgba(39,14,3,0.3)",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        alignItems: "center"
      }}>
        <div style={{ fontSize: 10, color: C.gold, letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: "var(--font-headings)", fontWeight: "bold" }}>
          OM NAMAH SHIVAY SHIVJI SADA SAHAY · OM NAMAH SHIVAY GURUJI SADA SAHAY
        </div>
        
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          gap: 24,
          fontSize: 14,
          marginTop: 8,
          marginBottom: 4
        }}>
          <span style={{ color: C.muted, fontWeight: "500" }}>Contact Us:</span>
          
          <a
            href="https://wa.me/447424772861"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: C.gold,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              transition: "color 0.2s ease",
              fontWeight: "600"
            }}
            onMouseOver={e => e.currentTarget.style.color = C.cream}
            onMouseOut={e => e.currentTarget.style.color = C.gold}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.73-1.45L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.858.002-2.635-1.023-5.11-2.884-6.974C16.59 1.91 14.118.887 11.488.887c-5.44 0-9.866 4.418-9.87 9.857-.001 1.737.476 3.427 1.38 4.931l-.988 3.616 3.738-.979z" />
            </svg>
            +44 7424 772861
          </a>

          <a
            href="mailto:admin.guruji.satsangs@gmail.com"
            style={{
              color: C.gold,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              transition: "color 0.2s ease",
              fontWeight: "600"
            }}
            onMouseOver={e => e.currentTarget.style.color = C.cream}
            onMouseOut={e => e.currentTarget.style.color = C.gold}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            admin.guruji.satsangs@gmail.com
          </a>
        </div>
        
        <div style={{ fontSize: 13, color: C.muted }}>
          Guruji Satsang · Built with devotion & seva
        </div>
      </footer>
    </div>
  );
}
