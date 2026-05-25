import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, orderBy } from "firebase/firestore";

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

async function testQuery() {
  const todayStr = new Date().toISOString().split("T")[0];
  console.log(`📅 Today's Date calculated: "${todayStr}"`);

  console.log("\n🔍 Running live query (where date >= today and status == upcoming)...");
  const q = query(
    collection(db, "satsangs"),
    where("date", ">=", todayStr),
    where("status", "==", "upcoming"),
    orderBy("date", "asc")
  );
  
  const snap = await getDocs(q);
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  console.log(`Query returned ${docs.length} Satsang documents:`);
  docs.forEach((doc, i) => {
    console.log(`[${i+1}] Title: "${doc.title}" | Date: ${doc.date} | Status: ${doc.status}`);
  });

  const elapsedDocs = docs.filter(doc => doc.date < todayStr);
  if (elapsedDocs.length === 0) {
    console.log("\n✅ SUCCESS: No elapsed Satsangs returned! The query successfully filters out past events.");
  } else {
    console.error("\n❌ WARNING: Elapsed Satsangs were returned!", elapsedDocs);
  }

  process.exit(0);
}

testQuery().catch(console.error);
