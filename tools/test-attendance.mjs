// 🧪 Guruji Satsang Attendance Confirmation & Decoupled Seva Logic Tests
import assert from "assert";

console.log("🚀 Running Attendance & Decoupled Seva Workflow Unit Tests...\n");

// Mock representation of the database states and transactional logic
const mockSatsang = {
  id: "satsang_test_1",
  title: "Aura of Blessings Satsang",
  status: "upcoming",
  organizerUid: "host_uid",
  maxAttendees: 10,
  attendeeCount: 8, // 2 spots remaining
  sevas: {
    s1: { id: "s1", needed: 2, opted: 0, enrolled: [] }, // Langar Distribution Seva (available)
    s2: { id: "s2", needed: 1, opted: 1, enrolled: [{ uid: "legacy_user", name: "Vikram" }] } // Langar Prep Seva (full)
  }
};

const mockAttendees = [];

// Mock registerAttendance logic supporting named guests and person-to-seva mappings
function mockRegisterAttendance(userUid, userName, attendeesList, requestedSevas) {
  if (mockSatsang.organizerUid === userUid) {
    throw new Error("Host cannot register for their own hosted Satsang");
  }
  if (mockSatsang.status !== "upcoming") {
    throw new Error("Cannot register for a Satsang that is not upcoming");
  }
  
  const finalList = attendeesList || [{ id: userUid, name: userName, isPrimary: true }];
  const spotsNeeded = finalList.length;
  const currentCount = mockSatsang.attendeeCount;
  
  // Decide status
  let status = "pending";
  if (currentCount + spotsNeeded > mockSatsang.maxAttendees) {
    status = "waitlisted";
  }

  const record = {
    userUid,
    userName,
    attendeesList: finalList,
    guests: spotsNeeded - 1,
    status,
    requestedSevas: (requestedSevas || []).map(s => {
      if (typeof s === "string") {
        return { sevaId: s, personId: userUid, personName: userName, status: "pending" };
      }
      return { ...s, status: "pending" };
    }),
    registeredAt: new Date()
  };

  mockAttendees.push(record);
  return record;
}

// Mock confirmAttendance logic (no auto-allocation of sevas)
function mockConfirmAttendance(attendeeUid) {
  const attendee = mockAttendees.find(a => a.userUid === attendeeUid);
  if (!attendee) throw new Error("Attendee not found");
  if (attendee.status === "confirmed") throw new Error("Already confirmed");

  const currentCount = mockSatsang.attendeeCount;
  const spotsNeeded = attendee.attendeesList ? attendee.attendeesList.length : 1;

  if (currentCount + spotsNeeded > mockSatsang.maxAttendees) {
    throw new Error("Not enough spots available in the Satsang");
  }

  // Update status and count (No auto-allocation of Sevas!)
  attendee.status = "confirmed";
  mockSatsang.attendeeCount += spotsNeeded;

  return { success: true };
}

// Mock declineAttendance logic
function mockDeclineAttendance(attendeeUid) {
  const attendee = mockAttendees.find(a => a.userUid === attendeeUid);
  if (!attendee) throw new Error("Attendee not found");
  attendee.status = "waitlisted";
}

// Mock confirmSeva logic with strict safety constraint
function mockConfirmSeva(attendeeUid, sevaId, personId) {
  const attendee = mockAttendees.find(a => a.userUid === attendeeUid);
  if (!attendee) throw new Error("Attendee not found");
  
  // SAFETY CONSTRAINT: Cannot allocate Seva if attendee is not confirmed
  if (attendee.status !== "confirmed") {
    throw new Error("Cannot allocate Seva to an attendee whose registration is not confirmed");
  }

  const reqSeva = attendee.requestedSevas.find(s => s.sevaId === sevaId && s.personId === personId);
  if (!reqSeva) throw new Error("Requested Seva not found");
  if (reqSeva.status === "confirmed") throw new Error("Seva already confirmed");

  const sv = mockSatsang.sevas[sevaId];
  if (!sv) throw new Error("Seva role not found");
  if (sv.opted >= sv.needed) throw new Error("No available slots for this Seva role");

  reqSeva.status = "confirmed";
  sv.opted += 1;
  sv.enrolled.push({ uid: personId, name: reqSeva.personName, attendeeUid });
  
  return { success: true };
}

// Mock declineSeva logic
function mockDeclineSeva(attendeeUid, sevaId, personId) {
  const attendee = mockAttendees.find(a => a.userUid === attendeeUid);
  if (!attendee) throw new Error("Attendee not found");

  const reqSeva = attendee.requestedSevas.find(s => s.sevaId === sevaId && s.personId === personId);
  if (!reqSeva) throw new Error("Requested Seva not found");

  const previousStatus = reqSeva.status;
  reqSeva.status = "declined";

  // If it was confirmed, free the slot in mockSatsang
  if (previousStatus === "confirmed") {
    const sv = mockSatsang.sevas[sevaId];
    if (sv) {
      sv.opted = Math.max(0, sv.opted - 1);
      sv.enrolled = sv.enrolled.filter(e => e.uid !== personId);
    }
  }

  return { success: true };
}

// Mock enrollSeva logic
function mockEnrollSeva(userUid, userName, sevaId) {
  if (mockSatsang.organizerUid === userUid) {
    throw new Error("Host cannot enroll in Seva for their own hosted Satsang");
  }
  if (mockSatsang.status !== "upcoming") {
    throw new Error("Cannot enroll in Seva for a Satsang that is not upcoming");
  }
  const sv = mockSatsang.sevas[sevaId];
  if (!sv) throw new Error("Seva not found");
  if (sv.opted >= sv.needed) throw new Error("Seva role is full");
  if (sv.enrolled.some(e => e.uid === userUid)) throw new Error("Already enrolled");
  sv.opted += 1;
  sv.enrolled.push({ uid: userUid, name: userName });
}

// ── TEST 1: Register within capacity ──────────────────────────────────────────
console.log("🧪 Test 1: Registering Alice (no guests) when 2 spots left...");
const aliceList = [{ id: "alice_uid", name: "Alice", isPrimary: true }];
const aliceReg = mockRegisterAttendance("alice_uid", "Alice", aliceList, ["s1"]);
console.log(`   - Alice registered with status: "${aliceReg.status}"`);
assert.strictEqual(aliceReg.status, "pending", "Should be pending since there is capacity");
assert.strictEqual(mockSatsang.attendeeCount, 8, "Satsang attendeeCount should NOT increment yet");
console.log("   ✅ Success: Registered as pending without consuming spots!\n");

// ── TEST 2: Register exceeding capacity ────────────────────────────────────────
console.log("🧪 Test 2: Registering Bob + 2 guests (3 spots total) when 2 spots left...");
const bobList = [
  { id: "bob_uid", name: "Bob", isPrimary: true },
  { id: "guest_1", name: "Anshul", isPrimary: false },
  { id: "guest_2", name: "Kabir", isPrimary: false }
];
const bobReg = mockRegisterAttendance("bob_uid", "Bob", bobList, [
  { sevaId: "s1", personId: "bob_uid", personName: "Bob" },
  { sevaId: "s2", personId: "guest_1", personName: "Anshul" }
]);
console.log(`   - Bob registered with status: "${bobReg.status}"`);
assert.strictEqual(bobReg.status, "waitlisted", "Should be waitlisted immediately since 8 + 3 > 10");
console.log("   ✅ Success: Registered directly into waitlist because of capacity limit!\n");

// ── TEST 3: Confirm Pending Registrant (Alice) ─────────────────────────────────
console.log("🧪 Test 3: Confirming Alice's pending attendance...");
const confirmResult = mockConfirmAttendance("alice_uid");
console.log(`   - Confirmation result: success=${confirmResult.success}`);
assert.strictEqual(aliceReg.status, "confirmed", "Alice status should now be confirmed");
assert.strictEqual(mockSatsang.attendeeCount, 9, "Satsang attendeeCount should now be 9 (8 + 1)");
assert.strictEqual(aliceReg.requestedSevas[0].status, "pending", "Seva request s1 should still be pending after attendance confirmation!");
assert.strictEqual(mockSatsang.sevas.s1.opted, 0, "Seva s1 opted should still be 0 (decoupled!)");
console.log("   ✅ Success: Confirmed attendance without auto-allocating Seva!\n");

// ── TEST 4: Attempt to confirm over-capacity Bob ──────────────────────────────
console.log("🧪 Test 4: Attempting to confirm Bob (requires 3 spots, only 1 left)...");
try {
  mockConfirmAttendance("bob_uid");
  throw new Error("Should not allow confirming Bob over capacity!");
} catch (err) {
  console.log(`   - Expected transaction rejection received: "${err.message}"`);
  assert.strictEqual(bobReg.status, "waitlisted", "Bob status should remain waitlisted");
  assert.strictEqual(mockSatsang.attendeeCount, 9, "Satsang attendeeCount should remain 9");
  console.log("   ✅ Success: Transaction correctly protected the Satsang from overbooking!\n");
}

// ── TEST 5: Decline pending registrant ────────────────────────────────────────
console.log("🧪 Test 5: Declining another request and moving to waitlist...");
const charlieReg = mockRegisterAttendance("charlie_uid", "Charlie", null, []);
assert.strictEqual(charlieReg.status, "pending", "Charlie starts as pending");
mockDeclineAttendance("charlie_uid");
assert.strictEqual(charlieReg.status, "waitlisted", "Decline should move Charlie to waitlist");
console.log("   ✅ Success: Decline successfully updated status to waitlisted!\n");

// ── TEST 6: Reject operations for non-upcoming Satsang ────────────────────────
console.log("🧪 Test 6: Attempting to register and enroll in Seva for a completed Satsang...");
mockSatsang.status = "completed";

// 1. Try to register attendance
try {
  mockRegisterAttendance("david_uid", "David", null, []);
  throw new Error("Should not allow registering for a completed Satsang!");
} catch (err) {
  console.log(`   - Expected registration block received: "${err.message}"`);
  assert.strictEqual(err.message, "Cannot register for a Satsang that is not upcoming");
}

// 2. Try to enroll in Seva
try {
  mockEnrollSeva("david_uid", "David", "s1");
  throw new Error("Should not allow enrolling in Seva for a completed Satsang!");
} catch (err) {
  console.log(`   - Expected Seva enrollment block received: "${err.message}"`);
  assert.strictEqual(err.message, "Cannot enroll in Seva for a Satsang that is not upcoming");
}

// Restore status
mockSatsang.status = "upcoming";
console.log("   ✅ Success: Both registration and Seva enrollment were correctly blocked on the completed Satsang!\n");

// ── TEST 7: Reject operations for the Satsang Host ───────────────────────────
console.log("🧪 Test 7: Attempting to register and enroll in Seva for the host's own Satsang...");
// 1. Try to register attendance
try {
  mockRegisterAttendance("host_uid", "Host", null, []);
  throw new Error("Should not allow host to register!");
} catch (err) {
  console.log(`   - Expected registration block received: "${err.message}"`);
  assert.strictEqual(err.message, "Host cannot register for their own hosted Satsang");
}

// 2. Try to enroll in Seva
try {
  mockEnrollSeva("host_uid", "Host", "s1");
  throw new Error("Should not allow host to enroll in Seva!");
} catch (err) {
  console.log(`   - Expected Seva enrollment block received: "${err.message}"`);
  assert.strictEqual(err.message, "Host cannot enroll in Seva for their own hosted Satsang");
}
console.log("   ✅ Success: Both registration and Seva enrollment were correctly blocked for the host!\n");

// ── TEST 8: Reject Seva allocation for unconfirmed attendee ──────────────────
console.log("🧪 Test 8: Attempting to confirm Seva for a waitlisted attendee (Bob)...");
try {
  mockConfirmSeva("bob_uid", "s1", "bob_uid");
  throw new Error("Should block Seva assignment to unconfirmed guest!");
} catch (err) {
  console.log(`   - Expected safety block received: "${err.message}"`);
  assert.strictEqual(err.message, "Cannot allocate Seva to an attendee whose registration is not confirmed");
  console.log("   ✅ Success: Seva assignment correctly blocked for unconfirmed visitor!\n");
}

// ── TEST 9: Confirm Seva for confirmed attendee ──────────────────────────────
console.log("🧪 Test 9: Confirming Seva role for confirmed attendee (Alice)...");
const sevaConfirmRes = mockConfirmSeva("alice_uid", "s1", "alice_uid");
console.log(`   - Seva confirmation result: success=${sevaConfirmRes.success}`);
assert.strictEqual(aliceReg.requestedSevas[0].status, "confirmed", "Alice Seva request status should now be confirmed");
assert.strictEqual(mockSatsang.sevas.s1.opted, 1, "Satsang Seva slot opted should be incremented to 1");
assert.deepStrictEqual(mockSatsang.sevas.s1.enrolled[0], { uid: "alice_uid", name: "Alice", attendeeUid: "alice_uid" }, "Alice should be listed in main enrolled sevas list");
console.log("   ✅ Success: Decoupled Seva confirmed successfully and slots allocated!\n");

// ── TEST 10: Decline/Unassign Seva role ──────────────────────────────────────
console.log("🧪 Test 10: Declining/unassigning Seva role for Alice...");
mockDeclineSeva("alice_uid", "s1", "alice_uid");
assert.strictEqual(aliceReg.requestedSevas[0].status, "declined", "Alice Seva request status should now be declined");
assert.strictEqual(mockSatsang.sevas.s1.opted, 0, "Satsang Seva slot opted should be decremented to 0");
assert.strictEqual(mockSatsang.sevas.s1.enrolled.length, 0, "Alice should be unassigned from main enrolled list");
console.log("   ✅ Success: Decoupled Seva declined and unassigned successfully!\n");

console.log("🎉 All attendance & decoupled Seva logic unit tests completed successfully!");
