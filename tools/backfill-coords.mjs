import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCPmzH9kKoqzf4hOQgmJHx85k7bKPZE9cg",
  authDomain: "guruji-satsang-b650a.firebaseapp.com",
  projectId: "guruji-satsang-b650a",
  storageBucket: "guruji-satsang-b650a.firebasestorage.app",
  messagingSenderId: "668074740281",
  appId: "1:668074740281:web:55885e8f3f057365f21be8",
  measurementId: "G-3RRN6J00NJ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Simple geocode helper for the script
async function geocodeLocation(query) {
  if (!query) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'GurujiSatsangApp/1.0'
      }
    });
    const data = await response.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
  } catch (error) {
    console.error("Geocoding failed for:", query, error);
  }
  return null;
}

async function backfill() {
  console.log("🔑 Authenticating as admin...");
  try {
    await signInWithEmailAndPassword(auth, "aggarwal.vani1@gmail.com", "asdfgh");
    console.log("   Authenticated successfully!");
  } catch (err) {
    console.error("❌ Authentication failed:", err.message);
    process.exit(1);
  }

  console.log("🔍 Fetching all Satsangs for backfilling coordinates...");
  const snap = await getDocs(collection(db, "satsangs"));
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  console.log(`Found ${docs.length} documents. Starting backfill...`);

  for (const s of docs) {
    if (s.latitude !== undefined && s.longitude !== undefined && s.latitude !== null) {
      console.log(`⏭️ Skipping "${s.title}" - already has coordinates (${s.latitude}, ${s.longitude})`);
      continue;
    }

    const queryStr = `${s.city || ""} ${s.postcode || ""}`.trim();
    if (!queryStr) {
      console.log(`⏭️ Skipping "${s.title}" - no city or postcode.`);
      continue;
    }

    console.log(`🌐 Geocoding for "${s.title}" (Query: "${queryStr}")...`);
    // Rate limit OSM Nominatim requests by waiting 1.2 seconds between geocoding requests
    await new Promise(resolve => setTimeout(resolve, 1200));

    let coords = await geocodeLocation(queryStr);
    if (!coords && s.city) {
      console.log(`   ⚠️ Failed with postcode. Retrying with just city: "${s.city}"...`);
      coords = await geocodeLocation(s.city);
    }
    
    if (coords) {
      console.log(`   ✅ Resolved: (${coords.lat}, ${coords.lng}). Saving to Firestore...`);
      const ref = doc(db, "satsangs", s.id);
      await updateDoc(ref, {
        latitude: coords.lat,
        longitude: coords.lng
      });
      console.log("   💾 Saved successfully!");
    } else {
      console.warn(`   ❌ Failed to geocode completely: "${queryStr}"`);
    }
  }

  console.log("\n🎉 Coords backfilling complete!");
  process.exit(0);
}

backfill().catch(console.error);
