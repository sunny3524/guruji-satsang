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

// Convert a city/postcode into coordinates using Google Maps Geocoding (with OSM Nominatim fallback)
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
      console.warn("postcodes.io geocoding failed, falling back:", e);
    }
  }

  const apiKey = "AIzaSyCPmzH9kKoqzf4hOQgmJHx85k7bKPZE9cg";
  
  // Try Google Geocoding first
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(trimmed)}&key=${apiKey}`;
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      if (data.status === "OK" && data.results && data.results.length > 0) {
        return {
          lat: parseFloat(data.results[0].geometry.location.lat),
          lng: parseFloat(data.results[0].geometry.location.lng),
          displayName: data.results[0].formatted_address
        };
      }
    }
  } catch (e) {
    console.warn("Google geocoding failed, trying fallback:", e);
  }

  // Fall back to OSM Nominatim (unrestricted to allow global queries)
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
    console.error("OSM Geocoding failed for:", query, error);
  }
  return null;
}

// Robust address validation using Google Geocoding API matching Zip codes
export async function validateAddressWithGoogle({ addressLine1, addressLine2, addressLine3, city, state, postcode, country }) {
  const apiKey = "AIzaSyCPmzH9kKoqzf4hOQgmJHx85k7bKPZE9cg";
  const queryParts = [addressLine1, addressLine2, addressLine3, city, state, postcode, country].filter(Boolean);
  const fullAddress = queryParts.join(", ");
  
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Google API status ${response.status}`);
    }
    const data = await response.json();
    
    // Check if the API key was restricted, denied, or over quota
    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.warn("Google Geocoding non-OK status:", data.status, data.error_message);
      try {
        console.log("Trying OSM Nominatim fallback due to restricted Google API status...");
        const osmUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fullAddress)}&format=json&limit=1`;
        const osmResponse = await fetch(osmUrl, {
          headers: {
            'User-Agent': 'GurujiSatsangApp/1.0'
          }
        });
        if (osmResponse.ok) {
          const osmData = await osmResponse.json();
          if (osmData && osmData.length > 0) {
            console.log("Nominatim successfully matched address on non-OK Google status:", osmData[0].display_name);
            return {
              valid: true,
              lat: parseFloat(osmData[0].lat),
              lng: parseFloat(osmData[0].lon),
              formattedAddress: osmData[0].display_name,
              countryCode: ""
            };
          }
        }
      } catch (osmErr) {
        console.warn("Nominatim fallback inside bypass failed:", osmErr);
      }
      return { valid: true, fallback: true, message: "Address accepted (validation bypassed)." };
    }
    
    if (data.status === "ZERO_RESULTS" || !data.results || data.results.length === 0) {
      // Try Nominatim fallback validation
      try {
        console.log("Google geocoding returned ZERO_RESULTS, trying Nominatim fallback validation...");
        const osmUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fullAddress)}&format=json&limit=1`;
        const osmResponse = await fetch(osmUrl, {
          headers: {
            'User-Agent': 'GurujiSatsangApp/1.0'
          }
        });
        if (osmResponse.ok) {
          const osmData = await osmResponse.json();
          if (osmData && osmData.length > 0) {
            console.log("Nominatim successfully matched address:", osmData[0].display_name);
            return {
              valid: true,
              lat: parseFloat(osmData[0].lat),
              lng: parseFloat(osmData[0].lon),
              formattedAddress: osmData[0].display_name,
              countryCode: ""
            };
          }
        }
      } catch (osmErr) {
        console.warn("Nominatim validation fallback failed:", osmErr);
      }
      
      return { valid: false, error: "No matching address found. Please verify your address." };
    }

    const result = data.results[0];
    const components = result.address_components || [];
    
    const postalComponent = components.find(c => c.types.includes("postal_code"));
    const countryComponent = components.find(c => c.types.includes("country"));

    const geocodedPostcode = postalComponent ? postalComponent.long_name.replace(/\s+/g, "").toUpperCase() : "";
    const inputPostcode = postcode ? postcode.replace(/\s+/g, "").toUpperCase() : "";
    
    if (inputPostcode && geocodedPostcode) {
      const matchesPostcode = geocodedPostcode.includes(inputPostcode) || inputPostcode.includes(geocodedPostcode);
      if (!matchesPostcode) {
        return { 
          valid: false, 
          error: `Zip/Postal code '${postcode}' does not match the matched address postal code '${postalComponent.long_name}'.` 
        };
      }
    }

    return {
      valid: true,
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      formattedAddress: result.formatted_address,
      countryCode: countryComponent ? countryComponent.short_name : ""
    };
  } catch (error) {
    console.error("Google address validation failed:", error);
    try {
      console.log("Trying OSM Nominatim fallback due to network/fetch error in Google Geocoding...");
      const osmUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fullAddress)}&format=json&limit=1`;
      const osmResponse = await fetch(osmUrl, {
        headers: {
          'User-Agent': 'GurujiSatsangApp/1.0'
        }
      });
      if (osmResponse.ok) {
        const osmData = await osmResponse.json();
        if (osmData && osmData.length > 0) {
          console.log("Nominatim successfully matched address on network catch:", osmData[0].display_name);
          return {
            valid: true,
            lat: parseFloat(osmData[0].lat),
            lng: parseFloat(osmData[0].lon),
            formattedAddress: osmData[0].display_name,
            countryCode: ""
          };
        }
      }
    } catch (osmErr) {
      console.warn("Nominatim fallback inside catch failed:", osmErr);
    }
    return { valid: true, fallback: true, error: error.message };
  }
}

