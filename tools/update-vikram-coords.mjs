import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc } from "firebase/firestore";
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

// Simple geocode helper
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

async function updateVikram() {
  console.log("🔑 Authenticating as admin...");
  try {
    await signInWithEmailAndPassword(auth, "aggarwal.vani1@gmail.com", "asdfgh");
    console.log("   Authenticated successfully!");
  } catch (err) {
    console.error("❌ Authentication failed:", err.message);
    process.exit(1);
  }

  const queryStr = "London EN4 0DU";
  console.log(`🌐 Geocoding updated query: "${queryStr}"...`);
  const coords = await geocodeLocation(queryStr);
  
  if (coords) {
    console.log(`   ✅ Resolved: (${coords.lat}, ${coords.lng}). Saving to Firestore...`);
    const ref = doc(db, "satsangs", "DelAmTzwNXQzYPw09X1A");
    await updateDoc(ref, {
      latitude: coords.lat,
      longitude: coords.lng
    });
    console.log("   💾 Saved coordinates for Test satsang Vikram successfully!");
  } else {
    console.error(`   ❌ Failed to geocode: "${queryStr}"`);
  }

  process.exit(0);
}

updateVikram().catch(console.error);
