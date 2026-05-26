import { getDistanceKm, geocodeLocation } from "../src/utils/geoUtils.js";

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

  console.log("🎉 All proximity and geocoding tests completed successfully!");
}

runTests().catch(err => {
  console.error("❌ Tests failed:", err.message || err);
  process.exit(1);
});
