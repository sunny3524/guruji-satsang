import { useState, useEffect } from "react";
import { geocodeLocation, getDistanceKm } from "../utils/geoUtils";
import { C } from "../utils/constants";
import Page from "../components/ui/Page";
import Btn from "../components/ui/Btn";
import Empty from "../components/ui/Empty";
import SCard from "../components/satsang/SCard";

export default function FindView({ search, setSearch, nav, user, profile, upcoming }) {
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
    </Page>
  );
}
