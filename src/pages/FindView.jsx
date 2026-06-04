import { useState, useEffect, useRef } from "react";
import { geocodeLocation, getDistanceKm } from "../utils/geoUtils";
import { C, SANGAT_COUNTRIES } from "../utils/constants";
import Page from "../components/ui/Page";
import Btn from "../components/ui/Btn";
import Empty from "../components/ui/Empty";
import SCard from "../components/satsang/SCard";

export default function FindView({ search, setSearch, nav, user, profile, upcoming, ipCoords, ipCity, ipCountry }) {
  const [userCoords, setUserCoords] = useState(null);
  const [searchCoords, setSearchCoords] = useState(null);
  const [isGeocodingSearch, setIsGeocodingSearch] = useState(false);
  const [isGeocodingProfile, setIsGeocodingProfile] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationLabel, setLocationLabel] = useState("");
  const [geoError, setGeoError] = useState(null);
  const [searchError, setSearchError] = useState(null);

  // 1. Geocode Profile or Estimate IP Geolocation on Mount
  useEffect(() => {
    let active = true;
    async function initLocation() {
      if (profile) {
        // Logged-in: geocode profile location
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
      } else if (ipCoords) {
        setUserCoords(ipCoords);
        setLocationLabel(`approximate location (${ipCity || ipCountry || "estimated via IP"})`);
      } else {
        // Logged-out: estimate approximate location via IP Geolocation API fallback
        try {
          const res = await fetch("https://ipapi.co/json/");
          const data = await res.json();
          if (data && data.latitude && data.longitude && active) {
            setUserCoords({ lat: data.latitude, lng: data.longitude });
            setLocationLabel(`approximate location (${data.city || data.country_name || "estimated via IP"})`);
          }
        } catch (err) {
          console.warn("Could not estimate location via IP Geolocation", err);
        }
      }
    }
    initLocation();
    return () => { active = false; };
  }, [profile, ipCoords, ipCity, ipCountry]);

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
    if (searchError) return false;
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

  const within500 = sortedSatsangs.filter(s => s.distance === null || s.distance <= 500);
  const over500 = sortedSatsangs.filter(s => s.distance !== null && s.distance > 500);

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
                fontFamily: "var(--font-body)"
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
          {within500.length} {within500.length === 1 ? "satsang" : "satsangs"} found
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
        <>
          {/* Main Proximity / Default List (Within 500 KM or No Distance) */}
          {within500.length === 0 ? (
            <div style={{ color: C.muted, fontStyle: "italic", fontSize: 14, marginBottom: 28, padding: "12px 0" }}>
              No upcoming Satsangs found near you.
            </div>
          ) : (
            <div style={{
              display: "flex",
              gap: 16,
              flexWrap: "wrap",
              marginBottom: over500.length > 0 ? 40 : 0
            }}>
              {within500.map(s => (
                <SCard key={s.id} s={s} nav={nav} />
              ))}
            </div>
          )}

          {/* Farther Away List (Over 500 KM) */}
          {over500.length > 0 && (
            <>
              <h3 style={{
                fontSize: 18,
                fontWeight: 700,
                color: C.cream,
                marginTop: 28,
                marginBottom: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderTop: `1px solid ${C.border}`,
                paddingTop: 28
              }}>
                <span>Satsangs farther away</span>
                <span style={{ fontSize: 13, color: C.muted, fontWeight: "normal" }}>
                  {over500.length} {over500.length === 1 ? "satsang" : "satsangs"} found
                </span>
              </h3>
              <div style={{
                display: "flex",
                gap: 16,
                flexWrap: "wrap"
              }}>
                {over500.map(s => (
                  <SCard key={s.id} s={s} nav={nav} />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Embedded CSS pulse animation */}
      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.9); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(0.9); opacity: 0.5; }
        }
      `}</style>

      {/* Interactive Sangat Near You Map */}
      <SangatNearYouMap upcoming={upcoming} nav={nav} />
    </Page>
  );
}

function SangatNearYouMap({ upcoming, nav }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [activeTab, setActiveTab] = useState("all"); // all, hubs, satsangs
  
  useEffect(() => {
    // Check if Leaflet is globally available
    if (!window.L || !mapContainerRef.current) return;

    // Destroy existing map instance if any
    if (mapRef.current) {
      mapRef.current.remove();
    }

    // Initialize Leaflet map
    const map = window.L.map(mapContainerRef.current, {
      center: [20, 10],
      zoom: 2,
      minZoom: 2,
      maxBounds: [
        [-85, -180],
        [85, 180]
      ],
      maxBoundsViscosity: 1.0
    });

    mapRef.current = map;

    // Add Tile Layer
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" style="color: #d4972a;">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Custom Marker Icons
    const hubIcon = window.L.divIcon({
      className: "custom-hub-marker",
      html: `<div style="background: #d4972a; border: 2px solid #270e03; width: 14px; height: 14px; border-radius: 50%; box-shadow: 0 0 10px #d4972a;"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });

    const satsangIcon = window.L.divIcon({
      className: "custom-satsang-marker",
      html: `<div style="background: #e06b10; border: 2px solid #270e03; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 12px #e06b10; font-size: 10px;">🌹</div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });

    // 1. Add Global Hubs (aligned with official sangatnearyou.html)
    const hubs = [
      { lat: 28.6139, lng: 77.2090, label: "India (New Delhi GK)", count: "12,000+" },
      { lat: 19.0760, lng: 72.8777, label: "India (Mumbai)", count: "4,500+" },
      { lat: 12.9716, lng: 77.5946, label: "India (Bangalore)", count: "3,100+" },
      { lat: 51.5074, lng: -0.1278, label: "United Kingdom (London)", count: "6,200+" },
      { lat: 52.4862, lng: -1.8904, label: "United Kingdom (Birmingham)", count: "2,200+" },
      { lat: 40.7128, lng: -74.0060, label: "United States (New York)", count: "3,100+" },
      { lat: 37.7749, lng: -122.4194, label: "United States (San Francisco)", count: "1,800+" },
      { lat: 43.6532, lng: -79.3832, label: "Canada (Toronto)", count: "2,500+" },
      { lat: 49.2827, lng: -123.1207, label: "Canada (Vancouver)", count: "1,200+" },
      { lat: -33.8688, lng: 151.2093, label: "Australia (Sydney)", count: "1,800+" },
      { lat: -37.8136, lng: 144.9631, label: "Australia (Melbourne)", count: "1,150+" },
      { lat: -36.8485, lng: 174.7633, label: "New Zealand (Auckland)", count: "800+" },
      { lat: 25.2048, lng: 55.2708, label: "United Arab Emirates (Dubai)", count: "2,200+" },
      { lat: 1.3521, lng: 103.8198, label: "Singapore", count: "1,100+" },
      { lat: -26.2041, lng: 28.0473, label: "South Africa (Johannesburg)", count: "600+" },
      { lat: 52.5200, lng: 13.4050, label: "Germany (Berlin)", count: "450+" },
      { lat: 48.8566, lng: 2.3522, label: "France (Paris)", count: "380+" },
      { lat: 53.3498, lng: -6.2603, label: "Ireland (Dublin)", count: "700+" },
      { lat: -1.2921, lng: 36.8219, label: "Kenya (Nairobi)", count: "550+" },
      { lat: 52.3676, lng: 4.9041, label: "Netherlands (Amsterdam)", count: "480+" },
      { lat: 47.3769, lng: 8.5417, label: "Switzerland (Zurich)", count: "320+" },
      { lat: 3.1390, lng: 101.6869, label: "Malaysia (Kuala Lumpur)", count: "950+" },
      { lat: 22.3193, lng: 114.1694, label: "Hong Kong", count: "620+" },
      { lat: 26.2285, lng: 50.5860, label: "Bahrain (Manama)", count: "650+" },
      { lat: 55.6761, lng: 12.5683, label: "Denmark (Copenhagen)", count: "220+" },
      { lat: 5.6037, lng: -0.1870, label: "Ghana (Accra)", count: "450+" },
      { lat: 47.4979, lng: 19.0402, label: "Hungary (Budapest)", count: "150+" },
      { lat: -6.2088, lng: 106.8456, label: "Indonesia (Jakarta)", count: "500+" },
      { lat: 29.3759, lng: 47.9774, label: "Kuwait", count: "800+" },
      { lat: 49.6116, lng: 6.1319, label: "Luxembourg", count: "180+" },
      { lat: 23.5859, lng: 58.4059, label: "Oman (Muscat)", count: "750+" },
      { lat: 33.6844, lng: 73.0479, label: "Pakistan (Islamabad)", count: "400+" },
      { lat: 25.2854, lng: 51.5310, label: "Qatar (Doha)", count: "850+" },
      { lat: 24.7136, lng: 46.6753, label: "Saudi Arabia (Riyadh)", count: "900+" },
      { lat: 28.9630, lng: -13.6064, label: "Spain (Lanzarote)", count: "300+" },
      { lat: 40.4168, lng: -3.7037, label: "Spain (Madrid)", count: "250+" },
      { lat: 59.3293, lng: 18.0686, label: "Sweden (Stockholm)", count: "380+" },
      { lat: 13.7563, lng: 100.5018, label: "Thailand (Bangkok)", count: "1,200+" }
    ];

    if (activeTab === "all" || activeTab === "hubs") {
      hubs.forEach(h => {
        window.L.marker([h.lat, h.lng], { icon: hubIcon })
          .bindPopup(`
            <div style="font-family: var(--font-body); text-align: center;">
              <strong style="color: #d4972a; font-size: 14px; display: block; margin-bottom: 4px;">🌹 ${h.label} Hub</strong>
              <span style="color: #fdfbf7; font-size: 12px; display: block; margin-bottom: 8px;">Estimated Sangat Size: <strong>${h.count} Devotees</strong></span>
              <p style="font-size: 11px; color: #9c7050; margin: 0; line-height: 1.4;">Connecting regional sangat for group prayers, seva activities, and monthly Satsang gatherings.</p>
            </div>
          `)
          .addTo(map);
      });
    }

    // 2. Add upcoming Satsangs pins
    if (activeTab === "all" || activeTab === "satsangs") {
      upcoming.forEach(s => {
        if (s.latitude && s.longitude && s.status !== "cancelled") {
          window.L.marker([s.latitude, s.longitude], { icon: satsangIcon })
            .bindPopup(`
              <div style="font-family: var(--font-body); min-width: 180px;">
                <strong style="color: #e06b10; font-size: 14px; display: block; margin-bottom: 4px;">🌹 ${s.title}</strong>
                <span style="color: #fdfbf7; font-size: 12px; display: block; margin-bottom: 4px;">📅 ${s.date} at ${s.time}</span>
                <span style="color: #9c7050; font-size: 11px; display: block; margin-bottom: 8px;">📍 ${s.city}, ${s.country}</span>
                <button 
                  id="find-map-btn-${s.id}"
                  style="width: 100%; padding: 7px 12px; background: #d4972a; color: #1a0800; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 11px; transition: opacity 0.2s;"
                >
                  View Details & Register
                </button>
              </div>
            `)
            .addTo(map);
            
          // Set programmatic navigation hook inside Leaflet popup DOM
          map.on("popupopen", () => {
            const btn = document.getElementById(`find-map-btn-${s.id}`);
            if (btn) {
              btn.onclick = () => {
                nav("detail", s.id);
              };
            }
          });
        }
      });
    }
  }, [upcoming, activeTab]);

  return (
    <div style={{
      background: C.card,
      border: `1px solid ${C.border}`,
      borderRadius: 16,
      padding: "24px 28px",
      marginTop: 28,
      marginBottom: 8,
      boxShadow: "0 8px 32px rgba(0,0,0,0.3)"
    }}>
      <h3 style={{
        fontSize: 18,
        fontWeight: 700,
        color: C.cream,
        marginBottom: 16,
        fontFamily: "var(--font-headings)"
      }}>
        Sangat Near You
      </h3>
      {/* Toggle controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            ["all", "Show All Pins"],
            ["hubs", "Global Sangat Hubs"],
            ["satsangs", "Upcoming Satsangs"]
          ].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setActiveTab(k)}
              style={{
                background: activeTab === k ? C.gold : "none",
                border: `1px solid ${activeTab === k ? C.gold : C.border}`,
                color: activeTab === k ? C.bg : C.cream,
                padding: "6px 14px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: "bold",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              {l}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 13, color: C.muted }}>
          🗺️ Interactive Map · Covered in {SANGAT_COUNTRIES.length - 1} countries
        </span>
      </div>

      {/* Map Container */}
      <div 
        ref={mapContainerRef} 
        style={{ 
          height: 440, 
          borderRadius: 12, 
          border: `1px solid ${C.border}`,
          boxShadow: "inset 0 4px 20px rgba(0,0,0,0.8)",
          zIndex: 1
        }} 
      />
    </div>
  );
}
