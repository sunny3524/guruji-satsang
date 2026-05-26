// ─── Proximity & Geocoding Utilities ─────────────────────────────────────────

// Haversine formula to calculate spherical distance between two coordinates in km
export function getDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) return null;
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return null;
  
  const l1 = parseFloat(lat1);
  const ln1 = parseFloat(lon1);
  const l2 = parseFloat(lat2);
  const ln2 = parseFloat(lon2);
  
  if (isNaN(l1) || isNaN(ln1) || isNaN(l2) || isNaN(ln2)) return null;
  
  const R = 6371; // Radius of the Earth in km
  const dLat = deg2rad(l2 - l1);
  const dLon = deg2rad(ln2 - ln1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(l1)) * Math.cos(deg2rad(l2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

// Convert a city/postcode into coordinates using Nominatim OpenStreetMap
export async function geocodeLocation(query) {
  if (!query || typeof query !== "string") return null;
  const trimmed = query.trim();
  if (!trimmed) return null;

  const clean = trimmed.replace(/\s+/g, "").toUpperCase();
  
  // UK outcode regex (e.g. BR2, E4, EN4, SE18)
  const outcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]?$/;
  // UK full postcode regex (e.g. EN40DU, SE184ND)
  const fullPostcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]?[0-9][A-Z]{2}$/;

  const isPostcode = outcodeRegex.test(clean) || fullPostcodeRegex.test(clean);

  if (isPostcode) {
    try {
      // 1. Try full postcode endpoint first
      const pUrl = `https://api.postcodes.io/postcodes/${clean}`;
      let response = await fetch(pUrl);
      if (response.ok) {
        const data = await response.json();
        if (data.status === 200 && data.result) {
          return {
            lat: parseFloat(data.result.latitude),
            lng: parseFloat(data.result.longitude),
            displayName: data.result.postcode
          };
        }
      }
      
      // 2. If full postcode fails, try outcode endpoint
      const oUrl = `https://api.postcodes.io/outcodes/${clean}`;
      response = await fetch(oUrl);
      if (response.ok) {
        const data = await response.json();
        if (data.status === 200 && data.result) {
          return {
            lat: parseFloat(data.result.latitude),
            lng: parseFloat(data.result.longitude),
            displayName: data.result.outcode
          };
        }
      }
    } catch (e) {
      console.warn("postcodes.io geocoding failed, falling back to Nominatim:", e);
    }
  }
  
  // Fall back to Nominatim limited to United Kingdom (countrycodes=gb)
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmed)}&format=json&limit=1&countrycodes=gb`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'GurujiSatsangApp/1.0'
      }
    });
    const data = await response.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        displayName: data[0].display_name
      };
    }
  } catch (error) {
    console.error("Geocoding failed for:", query, error);
  }
  return null;
}
