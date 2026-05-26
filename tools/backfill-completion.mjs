import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, writeBatch } from "firebase/firestore";
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

async function backfill() {
  console.log("🔑 Authenticating as admin...");
  try {
    await signInWithEmailAndPassword(auth, "aggarwal.vani1@gmail.com", "asdfgh");
    console.log("   Authenticated successfully!");
  } catch (err) {
    console.error("❌ Authentication failed:", err.message);
    process.exit(1);
  }

  const ukTimeStr = new Date().toLocaleString("sv-SE", { timeZone: "Europe/London" });
  const cleanStr = ukTimeStr.replace(",", "");
  const parts = cleanStr.trim().split(/\s+/);
  const currentDate = parts[0]; // "YYYY-MM-DD"
  const currentTime = parts[1] ? parts[1].substring(0, 5) : ""; // "HH:MM"

  console.log(`🚀 Checking live Firestore Satsangs against London current time: ${currentDate} ${currentTime}`);

  const snap = await getDocs(collection(db, "satsangs"));
  const batch = writeBatch(db);
  let count = 0;

  for (const sDoc of snap.docs) {
    const s = sDoc.data();
    if (s.status === "upcoming") {
      const isPastDate = s.date < currentDate;
      const isSameDateAndPastTime = s.date === currentDate && s.time <= currentTime;

      if (isPastDate || isSameDateAndPastTime) {
        console.log(`📌 Updating elapsed Satsang: "${s.title}" (Scheduled: ${s.date} at ${s.time})`);
        batch.update(doc(db, "satsangs", sDoc.id), {
          status: "completed"
        });
        count++;
      }
    }
  }

  if (count > 0) {
    await batch.commit();
    console.log(`\n✅ Successfully updated ${count} elapsed Satsang(s) to "completed"!`);
  } else {
    console.log("\nNo elapsed upcoming Satsangs were found.");
  }
  
  process.exit(0);
}

backfill().catch(console.error);
