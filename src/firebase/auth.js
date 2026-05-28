// ─── Authentication Service ───────────────────────────────────────────────────
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
} from "firebase/auth";
import { auth, db } from "./config";
import { createUserProfile, getUserProfile } from "./firestore";
import { onSnapshot, doc } from "firebase/firestore";

export async function registerUser({ email, password, name, ...profileData }) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  await createUserProfile(cred.user.uid, { name, email, ...profileData });
  return cred.user;
}

export async function loginUser(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function logoutUser() {
  await signOut(auth);
}

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

export function onAuthChange(callback) {
  let unsubProfile = null;
  const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
    if (unsubProfile) {
      unsubProfile();
      unsubProfile = null;
    }

    if (firebaseUser) {
      unsubProfile = onSnapshot(
        doc(db, "users", firebaseUser.uid),
        (docSnap) => {
          const profile = docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
          callback({ ...firebaseUser, profile });
        },
        (err) => {
          console.warn("Profile listener failed, falling back to fetch:", err);
          getUserProfile(firebaseUser.uid).then((profile) => {
            callback({ ...firebaseUser, profile });
          });
        }
      );
    } else {
      callback(null);
    }
  });

  return () => {
    if (unsubProfile) unsubProfile();
    unsubAuth();
  };
}
