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
  
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmed)}&format=json&limit=1`;
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
