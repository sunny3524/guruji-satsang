import { getDistanceKm, geocodeLocation, validateAddressWithGoogle } from "../src/utils/geoUtils.js";

async function runTests() {
  console.log("🚀 Running Proximity & Geocoding Unit Tests...\n");

  // 1. Test distance calculations using Haversine formula
  const latLondon = 51.5074;
  const lonLondon = -0.1278;
  const latManchester = 53.4808;
  const lonManchester = -2.2426;

  console.log("🧪 Test 1: Calculating distance from London to Manchester...");
  const distance = getDistanceKm(latLondon, lonLondon, latManchester, lonManchester);
  console.log(`   - London to Manchester: ${distance ? distance.toFixed(2) : "null"} km`);
  
  if (distance && Math.abs(distance - 262) < 5) {
    console.log("   ✅ Success: Distance matches expected value (~262 km)!\n");
  } else {
    throw new Error(`Distance calculation failed! Calculated: ${distance}`);
  }

  // 2. Test boundary/null inputs
  console.log("🧪 Test 2: Checking boundary/null input handling...");
  const nullDist = getDistanceKm(null, null, 51.5, -0.12);
  if (nullDist === null) {
    console.log("   ✅ Success: Null inputs correctly return null!\n");
  } else {
    throw new Error(`Null handling failed! Returned: ${nullDist}`);
  }

  // 3. Test Nominatim API geocoding
  console.log("🧪 Test 3: Geocoding 'Manchester' via OpenStreetMap Nominatim...");
  const mCoords = await geocodeLocation("Manchester");
  console.log("   - Manchester coordinates:", mCoords);
  if (mCoords && Math.abs(mCoords.lat - 53.48) < 0.5) {
    console.log("   ✅ Success: Geocoding matches expected coordinates!\n");
  } else {
    throw new Error("Geocoding failed for 'Manchester'!");
  }

  console.log("🧪 Test 4: Geocoding 'London' via OpenStreetMap Nominatim...");
  const lCoords = await geocodeLocation("London");
  console.log("   - London coordinates:", lCoords);
  if (lCoords && Math.abs(lCoords.lat - 51.5) < 0.5) {
    console.log("   ✅ Success: Geocoding matches expected coordinates!\n");
  } else {
    throw new Error("Geocoding failed for 'London'!");
  }

  console.log("🧪 Test 5: Geocoding invalid query 'xyz123abc'...");
  const invalidCoords = await geocodeLocation("xyz123abc");
  console.log("   - Invalid query coordinates:", invalidCoords);
  if (invalidCoords === null) {
    console.log("   ✅ Success: Invalid location query correctly returns null!\n");
  } else {
    throw new Error(`Invalid location query did not return null! Returned: ${JSON.stringify(invalidCoords)}`);
  }

  // 6. Test Outcode geocoding using postcodes.io
  console.log("🧪 Test 6: Geocoding UK Outcode 'BR2' (Bromley) using postcodes.io...");
  const br2Coords = await geocodeLocation("BR2");
  console.log("   - BR2 coordinates:", br2Coords);
  if (br2Coords && Math.abs(br2Coords.lat - 51.38) < 0.1 && Math.abs(br2Coords.lng - 0.02) < 0.1) {
    console.log("   ✅ Success: Outcode geocoding resolves correctly to Bromley!\n");
  } else {
    throw new Error(`Outcode geocoding failed for 'BR2'! Returned: ${JSON.stringify(br2Coords)}`);
  }

  // 7. Test Full Postcode geocoding using postcodes.io
  console.log("🧪 Test 7: Geocoding UK Full Postcode 'EN4 0DU' using postcodes.io...");
  const en4Coords = await geocodeLocation("EN4 0DU");
  console.log("   - EN4 0DU coordinates:", en4Coords);
  if (en4Coords && Math.abs(en4Coords.lat - 51.64) < 0.1 && Math.abs(en4Coords.lng - (-0.14)) < 0.1) {
    console.log("   ✅ Success: Full postcode geocoding resolves correctly to Barnet!\n");
  } else {
    throw new Error(`Full postcode geocoding failed for 'EN4 0DU'! Returned: ${JSON.stringify(en4Coords)}`);
  }

  // 8. Test validateAddressWithGoogle with Mocked Fetch
  console.log("🧪 Test 8: Testing validateAddressWithGoogle with mocked API responses...");
  const originalFetch = global.fetch;

  try {
    // Case 8a: Successful Google Geocoding with matching postcode
    global.fetch = async (url) => {
      if (url.includes("googleapis.com")) {
        return {
          ok: true,
          json: async () => ({
            status: "OK",
            results: [{
              geometry: { location: { lat: 51.5074, lng: -0.1278 } },
              formatted_address: "London, UK",
              address_components: [
                { long_name: "SW1A 1AA", types: ["postal_code"] },
                { short_name: "GB", types: ["country"] }
              ]
            }]
          })
        };
      }
      return { ok: false };
    };

    const res8a = await validateAddressWithGoogle({
      addressLine1: "Buckingham Palace",
      city: "London",
      postcode: "SW1A 1AA",
      country: "UK"
    });
    console.log("   - Case 8a (Google OK):", res8a);
    if (res8a && res8a.valid && res8a.lat === 51.5074 && res8a.countryCode === "GB") {
      console.log("   ✅ Success: Google Geocoding resolved and verified successfully!\n");
    } else {
      throw new Error(`Google OK verification failed: ${JSON.stringify(res8a)}`);
    }

    // Case 8b: Google Geocoding with non-matching postcode
    const res8b = await validateAddressWithGoogle({
      addressLine1: "Buckingham Palace",
      city: "London",
      postcode: "W1A 1AA",
      country: "UK"
    });
    console.log("   - Case 8b (Postcode Mismatch):", res8b);
    if (res8b && !res8b.valid && res8b.error.includes("does not match")) {
      console.log("   ✅ Success: Correctly rejected mismatched postcode!\n");
    } else {
      throw new Error(`Postcode mismatch verification failed: ${JSON.stringify(res8b)}`);
    }

    // Case 8c: Google Geocoding returns ZERO_RESULTS, falls back to OSM Nominatim
    global.fetch = async (url) => {
      if (url.includes("googleapis.com")) {
        return {
          ok: true,
          json: async () => ({ status: "ZERO_RESULTS" })
        };
      }
      if (url.includes("openstreetmap.org")) {
        return {
          ok: true,
          json: async () => [{
            lat: "53.4808",
            lon: "-2.2426",
            display_name: "Manchester, UK"
          }]
        };
      }
      return { ok: false };
    };

    const res8c = await validateAddressWithGoogle({
      addressLine1: "Unknown Place",
      city: "Manchester"
    });
    console.log("   - Case 8c (Google Zero Results -> OSM Fallback):", res8c);
    if (res8c && res8c.valid && res8c.lat === 53.4808 && res8c.formattedAddress === "Manchester, UK") {
      console.log("   ✅ Success: Successfully fell back to Nominatim on Google ZERO_RESULTS!\n");
    } else {
      throw new Error(`OSM Fallback verification failed: ${JSON.stringify(res8c)}`);
    }

    // Case 8d: Google Geocoding API key restricted (non-OK status), falls back to OSM
    global.fetch = async (url) => {
      if (url.includes("googleapis.com")) {
        return {
          ok: true,
          json: async () => ({ status: "REQUEST_DENIED", error_message: "API key restricted" })
        };
      }
      if (url.includes("openstreetmap.org")) {
        return {
          ok: true,
          json: async () => [{
            lat: "51.5074",
            lon: "-0.1278",
            display_name: "London, UK"
          }]
        };
      }
      return { ok: false };
    };

    const res8d = await validateAddressWithGoogle({
      addressLine1: "Restricted Key Test",
      city: "London"
    });
    console.log("   - Case 8d (Google restricted -> OSM Fallback):", res8d);
    if (res8d && res8d.valid && res8d.lat === 51.5074) {
      console.log("   ✅ Success: Successfully fell back to Nominatim on Google restricted status!\n");
    } else {
      throw new Error(`Google restricted status fallback failed: ${JSON.stringify(res8d)}`);
    }

    // Case 8e: Google Geocoding throws exception, falls back to OSM
    global.fetch = async (url) => {
      if (url.includes("googleapis.com")) {
        throw new Error("Network offline");
      }
      if (url.includes("openstreetmap.org")) {
        return {
          ok: true,
          json: async () => [{
            lat: "52.0",
            lon: "-1.0",
            display_name: "Fallback City"
          }]
        };
      }
      return { ok: false };
    };

    const res8e = await validateAddressWithGoogle({
      addressLine1: "Network Error Test"
    });
    console.log("   - Case 8e (Google exception -> OSM Fallback):", res8e);
    if (res8e && res8e.valid && res8e.lat === 52.0) {
      console.log("   ✅ Success: Successfully fell back to Nominatim on Google network exception!\n");
    } else {
      throw new Error(`Google exception fallback failed: ${JSON.stringify(res8e)}`);
    }

    // Case 8f: Both Google and OSM fail
    global.fetch = async (url) => {
      if (url.includes("googleapis.com")) {
        return { ok: true, json: async () => ({ status: "ZERO_RESULTS" }) };
      }
      if (url.includes("openstreetmap.org")) {
        return { ok: true, json: async () => [] };
      }
      return { ok: false };
    };

    const res8f = await validateAddressWithGoogle({
      addressLine1: "Nonexistent Address"
    });
    console.log("   - Case 8f (Both fail):", res8f);
    if (res8f && !res8f.valid && res8f.error.includes("No matching address found")) {
      console.log("   ✅ Success: Correctly returned invalid when both APIs yielded no results!\n");
    } else {
      throw new Error(`Double failure handling failed: ${JSON.stringify(res8f)}`);
    }

  } finally {
    global.fetch = originalFetch;
  }

  console.log("🎉 All proximity and geocoding tests completed successfully!");
}


runTests().catch(err => {
  console.error("❌ Tests failed:", err.message || err);
  process.exit(1);
});
