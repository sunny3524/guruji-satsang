// ─── Firestore Service Layer ──────────────────────────────────────────────────
// All database operations are centralised here.

import {
  collection, collectionGroup, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, arrayUnion, arrayRemove,
  onSnapshot, limit,
} from "firebase/firestore";
import { db } from "./config";

// ── Collections ───────────────────────────────────────────────────────────────
const USERS      = "users";
const SATSANGS   = "satsangs";
const ATTENDEES  = "attendees";   // subcollection of satsang
const SEVAS      = "sevas";       // subcollection of satsang

// ── User Profiles ─────────────────────────────────────────────────────────────
export async function createUserProfile(uid, data) {
  await updateDoc(doc(db, USERS, uid), { ...data, updatedAt: serverTimestamp() })
    .catch(async () => {
      // doc doesn't exist yet — create it
      const { setDoc } = await import("firebase/firestore");
      await setDoc(doc(db, USERS, uid), {
        ...data,
        role: "member",          // member | organiser | admin
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, USERS, uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getAllUsers() {
  const snap = await getDocs(collection(db, USERS));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function updateUserRole(uid, role) {
  await updateDoc(doc(db, USERS, uid), { role, updatedAt: serverTimestamp() });
}

// ── Satsangs ──────────────────────────────────────────────────────────────────
export async function createSatsang(data, organizerUid) {
  const ref = await addDoc(collection(db, SATSANGS), {
    ...data,
    organizerUid,
    status: "upcoming",          // upcoming | completed | cancelled
    attendeeCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getSatsang(id) {
  const snap = await getDoc(doc(db, SATSANGS, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getUpcomingSatsangs() {
  const today = new Date().toISOString().split("T")[0];
  const q = query(
    collection(db, SATSANGS),
    where("date", ">=", today),
    where("status", "==", "upcoming"),
    orderBy("date", "asc"),
    orderBy("time", "asc")
  );
  try {
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.warn("getUpcomingSatsangs query failed, falling back to client-side filter:", error?.message || error);
    const snap = await getDocs(collection(db, SATSANGS));
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(s => s.status === "upcoming" && typeof s.date === "string" && s.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.time || "").localeCompare(b.time || ""));
  }
}

export async function getSatsangsByOrganizer(uid) {
  const q = query(collection(db, SATSANGS), where("organizerUid", "==", uid), orderBy("date", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getAllSatsangs() {
  const q = query(collection(db, SATSANGS), orderBy("date", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function updateSatsang(id, data) {
  await updateDoc(doc(db, SATSANGS, id), { ...data, updatedAt: serverTimestamp() });
}

export async function cancelSatsang(id) {
  await updateDoc(doc(db, SATSANGS, id), { status: "cancelled", updatedAt: serverTimestamp() });
}

// ── Attendance (subcollection) ────────────────────────────────────────────────
// Document ID = userUid for easy lookup
export async function registerAttendance(satsangId, userUid, { guests = 0, userName, userEmail, userPhone }) {
  const { runTransaction, setDoc } = await import("firebase/firestore");
  const satsangRef = doc(db, SATSANGS, satsangId);
  const attendeeRef = doc(db, SATSANGS, satsangId, ATTENDEES, userUid);

  await runTransaction(db, async tx => {
    const satsangSnap = await tx.get(satsangRef);
    if (!satsangSnap.exists()) throw new Error("Satsang not found");
    const satsang = satsangSnap.data();
    const currentCount = Number(satsang.attendeeCount || 0);

    await tx.set(attendeeRef, {
      userUid, userName, userEmail, userPhone, guests,
      registeredAt: serverTimestamp(),
    });

    tx.update(satsangRef, {
      attendeeCount: currentCount + 1 + guests,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function getAttendees(satsangId) {
  const snap = await getDocs(collection(db, SATSANGS, satsangId, ATTENDEES));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function checkAttendance(satsangId, userUid) {
  const snap = await getDoc(doc(db, SATSANGS, satsangId, ATTENDEES, userUid));
  return snap.exists() ? snap.data() : null;
}

export async function getUserAttendanceSatsangs(userUid) {
  const q = query(collectionGroup(db, ATTENDEES), where("userUid", "==", userUid));
  const snap = await getDocs(q);
  const satsangIds = [...new Set(snap.docs.map(d => d.ref.parent.parent?.id).filter(Boolean))];
  const satsangs = await Promise.all(satsangIds.map(id => getSatsang(id)));
  return satsangs.filter(Boolean);
}

export async function removeAttendance(satsangId, userUid, guests = 0) {
  await deleteDoc(doc(db, SATSANGS, satsangId, ATTENDEES, userUid));
  const { increment } = await import("firebase/firestore");
  await updateDoc(doc(db, SATSANGS, satsangId), {
    attendeeCount: increment(-(1 + guests)),
    updatedAt: serverTimestamp(),
  });
}

// ── Seva Enrolment (stored on satsang doc as mapped Seva records) ─────────────
export async function enrollSeva(satsangId, sevaId, userUid, userName) {
  const satsang = await getSatsang(satsangId);
  if (!satsang) throw new Error("Satsang not found");
  const sevas = Array.isArray(satsang.sevas)
    ? satsang.sevas.reduce((acc, sv) => ({ ...acc, [sv.id]: sv }), {})
    : satsang.sevas || {};
  const sv = sevas[sevaId];
  if (!sv) throw new Error("Seva not found");
  if ((sv.opted || 0) >= sv.needed) throw new Error("Seva role is full");
  if ((sv.enrolled || []).some(e => e.uid === userUid)) throw new Error("Already enrolled");

  const updatedSeva = {
    ...sv,
    opted: Math.min((sv.opted || 0) + 1, sv.needed),
    confirmed: Math.min(sv.confirmed || 0, sv.needed),
    enrolled: [...(sv.enrolled || []), { uid: userUid, name: userName }],
  };

  await updateDoc(doc(db, SATSANGS, satsangId), {
    sevas: { ...sevas, [sevaId]: updatedSeva },
    updatedAt: serverTimestamp(),
  });
}

export async function withdrawSeva(satsangId, sevaId, userUid) {
  const satsang = await getSatsang(satsangId);
  if (!satsang) throw new Error("Satsang not found");
  const sevas = Array.isArray(satsang.sevas)
    ? satsang.sevas.reduce((acc, sv) => ({ ...acc, [sv.id]: sv }), {})
    : satsang.sevas || {};
  const sv = sevas[sevaId];
  if (!sv) throw new Error("Seva not found");

  const updatedSeva = {
    ...sv,
    opted: Math.max((sv.opted || 1) - 1, 0),
    confirmed: Math.min(sv.confirmed || 0, sv.needed),
    enrolled: (sv.enrolled || []).filter(e => e.uid !== userUid),
  };

  await updateDoc(doc(db, SATSANGS, satsangId), {
    sevas: { ...sevas, [sevaId]: updatedSeva },
    updatedAt: serverTimestamp(),
  });
}

// ── Real-time listener for a single satsang ───────────────────────────────────
export function subscribeSatsang(id, callback) {
  return onSnapshot(doc(db, SATSANGS, id), snap => {
    if (snap.exists()) callback({ id: snap.id, ...snap.data() });
  });
}
