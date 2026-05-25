import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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

async function inspect() {
  console.log("🔍 Fetching all Satsangs from live Firestore...");
  const snap = await getDocs(collection(db, "satsangs"));
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  console.log(`\nFound ${docs.length} Satsang documents:`);
  docs.forEach((doc, i) => {
    console.log(`\n[${i+1}] ID: ${doc.id}`);
    console.log(`    Title: ${doc.title}`);
    console.log(`    City: ${doc.city}`);
    console.log(`    Postcode: ${doc.postcode}`);
    console.log(`    Date: ${doc.date} Time: ${doc.time}`);
    console.log(`    Latitude: ${doc.latitude} (Type: ${typeof doc.latitude})`);
    console.log(`    Longitude: ${doc.longitude} (Type: ${typeof doc.longitude})`);
    console.log(`    Status: ${doc.status}`);
  });
  
  process.exit(0);
}

inspect().catch(console.error);
