// ─── Firebase Cloud Functions ─────────────────────────────────────────────────
// Deploy with: firebase deploy --only functions
// Requires: firebase-admin, firebase-functions, nodemailer (or SendGrid)
//
// Install deps: cd functions && npm install firebase-admin firebase-functions nodemailer
//
// Set your email credentials:
//   firebase functions:config:set email.user="your@gmail.com" email.pass="your-app-password"
// OR use SendGrid:
//   firebase functions:config:set sendgrid.key="SG.xxx"

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();
const db = admin.firestore();

// ── Email transport (Gmail example — swap for SendGrid in production) ──────────
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: functions.config().email?.user || process.env.EMAIL_USER,
    pass: functions.config().email?.pass || process.env.EMAIL_PASS,
  },
});

const FROM = `"Guruji Satsang" <${functions.config().email?.user || "noreply@gurujisatsang.com"}>`;
const region = functions.region("europe-west2");

// ── Helper ────────────────────────────────────────────────────────────────────
async function sendMail(to, subject, html) {
  await transporter.sendMail({ from: FROM, to, subject, html });
}

function satsangEmailBlock(s) {
  return `
    <div style="background:#270e03;border:1px solid #5c2a0a;border-radius:10px;padding:20px 24px;margin:16px 0;">
      <h3 style="color:#d4972a;margin:0 0 8px">${s.title}</h3>
      <p style="color:#c0a878;margin:4px 0">📅 ${s.date} at ${s.time}</p>
      <p style="color:#c0a878;margin:4px 0">📍 ${s.address}, ${s.city} ${s.postcode}</p>
    </div>`;
}

// ── 1. Welcome email on new user registration ─────────────────────────────────
exports.onUserCreated = region.firestore
  .document("users/{uid}")
  .onCreate(async (snap) => {
    const user = snap.data();
    await sendMail(
      user.email,
      "🙏 Welcome to Guruji Satsang — Jai Guruji!",
      `
      <div style="background:#1a0800;color:#f5e8d0;font-family:Georgia,serif;padding:32px;max-width:560px;margin:auto;border-radius:12px;">
        <div style="text-align:center;margin-bottom:24px;">
          <img src="https://www.gurujimaharaj.com/img/Guruji1m.jpg" width="100" style="border-radius:50%;border:2px solid #d4972a;" alt="Guruji"/>
          <p style="color:#d4972a;letter-spacing:0.2em;font-size:11px;margin-top:12px;">OM NAMAH SHIVAY GURUJI SADA SAHAY</p>
        </div>
        <h2 style="color:#d4972a;">Jai Guruji, ${user.name}!</h2>
        <p style="color:#c0a878;line-height:1.8;">
          You have been registered with the Guruji Satsang platform. 
          You can now find Satsangs near you, register to attend, offer Seva, and host your own Satsangs.
        </p>
        <p style="color:#c0a878;line-height:1.8;">
          Please take a moment to read the <strong style="color:#d4972a;">Satsang Guidelines</strong> 
          in the app so that every Darbar is kept with the discipline and devotion Guruji always taught.
        </p>
        <p style="color:#9c7050;font-size:13px;margin-top:24px;font-style:italic;">
          "Ahankaar rab di raah te chalan nai denda."<br/>
          — Guruji Maharaj
        </p>
        <p style="color:#9c7050;font-size:12px;margin-top:24px;">Shukrana Guruji 🙏</p>
      </div>`
    );
  });

// ── 2. Confirmation email when user registers attendance ──────────────────────
exports.onAttendanceRegistered = region.firestore
  .document("satsangs/{satsangId}/attendees/{userId}")
  .onCreate(async (snap, ctx) => {
    const att = snap.data();
    const satsangSnap = await db.doc(`satsangs/${ctx.params.satsangId}`).get();
    if (!satsangSnap.exists) return;
    const s = satsangSnap.data();

    await sendMail(
      att.userEmail,
      `✅ Registered: ${s.title} — Jai Guruji!`,
      `
      <div style="background:#1a0800;color:#f5e8d0;font-family:Georgia,serif;padding:32px;max-width:560px;margin:auto;border-radius:12px;">
        <p style="color:#d4972a;letter-spacing:0.2em;font-size:10px;">OM NAMAH SHIVAY GURUJI SADA SAHAY</p>
        <h2 style="color:#d4972a;">You're registered, ${att.userName}! 🙏</h2>
        <p style="color:#c0a878;">Your attendance has been confirmed for:</p>
        ${satsangEmailBlock(s)}
        ${att.guests > 0 ? `<p style="color:#c0a878;">You have registered <strong style="color:#d4972a;">${att.guests} guest(s)</strong> in addition to yourself.</p>` : ""}
        <p style="color:#c0a878;line-height:1.8;">
          Please remember to observe Guruji's Satsang guidelines — 
          switch off your mobile phone, maintain silence, and go home directly after Langar Prasad.
        </p>
        <p style="color:#9c7050;font-size:12px;margin-top:24px;">Shukrana Guruji 🙏</p>
      </div>`
    );

    // Also notify the organiser
    const orgSnap = await db.doc(`users/${s.organizerUid}`).get();
    if (orgSnap.exists) {
      const org = orgSnap.data();
      await sendMail(
        org.email,
        `New attendee: ${att.userName} registered for ${s.title}`,
        `
        <div style="background:#1a0800;color:#f5e8d0;font-family:Georgia,serif;padding:32px;max-width:560px;margin:auto;border-radius:12px;">
          <h3 style="color:#d4972a;">New Registration</h3>
          <p style="color:#c0a878;"><strong style="color:#d4972a;">${att.userName}</strong> has registered for your Satsang:</p>
          ${satsangEmailBlock(s)}
          <p style="color:#c0a878;">Guests: ${att.guests} &nbsp;|&nbsp; Phone: ${att.userPhone} &nbsp;|&nbsp; Email: ${att.userEmail}</p>
          <p style="color:#9c7050;font-size:12px;margin-top:24px;">Shukrana Guruji 🙏</p>
        </div>`
      );
    }
  });

// ── 3. Attendance registration helper ───────────────────────────────────────
exports.registerAttendance = region.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Login required');
  }

  const { satsangId, guests = 0, userName, userEmail, userPhone } = data || {};
  if (!satsangId || !userName || !userEmail) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required registration fields');
  }

  const satsangRef = db.doc(`satsangs/${satsangId}`);
  await db.runTransaction(async tx => {
    const snap = await tx.get(satsangRef);
    if (!snap.exists) {
      throw new functions.https.HttpsError('not-found', 'Satsang not found');
    }

    const attendeeRef = satsangRef.collection('attendees').doc(context.auth.uid);
    const attendeeSnap = await tx.get(attendeeRef);
    if (attendeeSnap.exists) {
      throw new functions.https.HttpsError('already-exists', 'Already registered for this satsang');
    }

    const satsang = snap.data();
    const currentCount = Number(satsang.attendeeCount || 0);
    if (typeof satsang.maxAttendees === 'number' && currentCount + 1 + guests > satsang.maxAttendees) {
      throw new functions.https.HttpsError('failed-precondition', 'Not enough spots');
    }

    tx.set(attendeeRef, {
      userUid: context.auth.uid,
      userName,
      userEmail,
      userPhone,
      guests,
      registeredAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    tx.update(satsangRef, {
      attendeeCount: currentCount + 1 + guests,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  return { success: true };
});

// ── 4. Seva enrolment helper ─────────────────────────────────────────────────
exports.enrollSeva = region.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Login required');
  }
  const { satsangId, sevaId, userName } = data;
  if (!satsangId || !sevaId || !userName) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
  }

  const satsangRef = db.doc(`satsangs/${satsangId}`);
  await db.runTransaction(async tx => {
    const snap = await tx.get(satsangRef);
    if (!snap.exists) {
      throw new functions.https.HttpsError('not-found', 'Satsang not found');
    }
    const satsang = snap.data();
    const sevas = Array.isArray(satsang.sevas)
      ? satsang.sevas.reduce((acc, sv) => ({ ...acc, [sv.id]: sv }), {})
      : satsang.sevas || {};
    const sv = sevas[sevaId];
    if (!sv) {
      throw new functions.https.HttpsError('not-found', 'Seva not found');
    }
    if ((sv.opted || 0) >= sv.needed) {
      throw new functions.https.HttpsError('failed-precondition', 'Seva role is full');
    }
    if ((sv.enrolled || []).some(e => e.uid === context.auth.uid)) {
      throw new functions.https.HttpsError('already-exists', 'Already enrolled');
    }

    const updatedSeva = {
      ...sv,
      opted: Math.min((sv.opted || 0) + 1, sv.needed),
      confirmed: Math.min(sv.confirmed || 0, sv.needed),
      enrolled: [...(sv.enrolled || []), { uid: context.auth.uid, name: userName }],
    };

    tx.update(satsangRef, {
      sevas: { ...sevas, [sevaId]: updatedSeva },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  return { success: true };
});

// ── 4. Seva enrolment confirmation ────────────────────────────────────────────
// Triggered by onCall from the frontend when a user enrolls in seva
exports.sendSevaConfirmation = region.https.onCall(async (data) => {
  const { userEmail, userName, sevaName, satsangTitle, satsangDate, satsangAddress } = data;
  await sendMail(
    userEmail,
    `🙏 Seva Confirmed: ${sevaName} at ${satsangTitle}`,
    `
    <div style="background:#1a0800;color:#f5e8d0;font-family:Georgia,serif;padding:32px;max-width:560px;margin:auto;border-radius:12px;">
      <p style="color:#d4972a;letter-spacing:0.2em;font-size:10px;">OM NAMAH SHIVAY GURUJI SADA SAHAY</p>
      <h2 style="color:#d4972a;">Seva Confirmed, ${userName}! 🙏</h2>
      <p style="color:#c0a878;">You have been enrolled for <strong style="color:#d4972a;">${sevaName}</strong> at:</p>
      <div style="background:#270e03;border:1px solid #5c2a0a;border-radius:10px;padding:20px 24px;margin:16px 0;">
        <h3 style="color:#d4972a;margin:0 0 8px">${satsangTitle}</h3>
        <p style="color:#c0a878;margin:4px 0">📅 ${satsangDate}</p>
        <p style="color:#c0a878;margin:4px 0">📍 ${satsangAddress}</p>
      </div>
      <p style="color:#c0a878;line-height:1.8;">
        Please arrive 30–45 minutes early so the Darbar is ready before the Sangat arrives. 
        Seva is Guruji's greatest blessing — perform it with love and humility.
      </p>
      <p style="color:#9c7050;font-size:12px;margin-top:24px;">Shukrana Guruji 🙏</p>
    </div>`
  );
  return { success: true };
});

// ── 4. Satsang reminder — runs daily at 8am UTC, notifies attendees of tomorrow's satsangs ──
exports.dailyReminder = region.pubsub
  .schedule("0 8 * * *")
  .timeZone("Europe/London")
  .onRun(async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const snap = await db.collection("satsangs")
      .where("date", "==", tomorrowStr)
      .where("status", "==", "upcoming")
      .get();

    for (const sDoc of snap.docs) {
      const s = sDoc.data();
      const attendeesSnap = await sDoc.ref.collection("attendees").get();
      for (const aDoc of attendeesSnap.docs) {
        const att = aDoc.data();
        await sendMail(
          att.userEmail,
          `⏰ Reminder: ${s.title} is tomorrow — Jai Guruji!`,
          `
          <div style="background:#1a0800;color:#f5e8d0;font-family:Georgia,serif;padding:32px;max-width:560px;margin:auto;border-radius:12px;">
            <p style="color:#d4972a;letter-spacing:0.2em;font-size:10px;">OM NAMAH SHIVAY GURUJI SADA SAHAY</p>
            <h2 style="color:#d4972a;">Satsang Tomorrow 🙏</h2>
            <p style="color:#c0a878;">This is a gentle reminder that you are registered for:</p>
            ${satsangEmailBlock(s)}
            <ul style="color:#c0a878;line-height:2;">
              <li>Please arrive on time or a few minutes early.</li>
              <li>Switch off your mobile phone before entering.</li>
              <li>Dress modestly and respectfully.</li>
              <li>Go home directly after Langar Prasad.</li>
            </ul>
            <p style="color:#9c7050;font-size:12px;margin-top:24px;">Shukrana Guruji 🙏</p>
          </div>`
        ).catch(console.error);
      }
    }
  });

// ── 5. Organiser alert when their satsang is full ────────────────────────────
exports.checkSatsangCapacity = region.firestore
  .document("satsangs/{satsangId}")
  .onUpdate(async (change, ctx) => {
    const before = change.before.data();
    const after = change.after.data();
    if (before.attendeeCount === after.attendeeCount) return;
    if (after.attendeeCount < after.maxAttendees) return;

    const orgSnap = await db.doc(`users/${after.organizerUid}`).get();
    if (!orgSnap.exists) return;
    const org = orgSnap.data();

    await sendMail(
      org.email,
      `🎉 ${after.title} is now FULL — Guruji's blessings!`,
      `
      <div style="background:#1a0800;color:#f5e8d0;font-family:Georgia,serif;padding:32px;max-width:560px;margin:auto;border-radius:12px;">
        <h2 style="color:#d4972a;">Your Satsang is Full! 🙏</h2>
        <p style="color:#c0a878;">All ${after.maxAttendees} spots for <strong style="color:#d4972a;">${after.title}</strong> have been filled. 
        Guruji has brought His full Sangat together!</p>
        ${satsangEmailBlock(after)}
        <p style="color:#9c7050;font-size:12px;margin-top:24px;">Shukrana Guruji 🙏</p>
      </div>`
    );
  });

// ── 6. Admin: callable function to send broadcast to all users ────────────────
exports.sendBroadcast = region.https.onCall(async (data, ctx) => {
  // Verify caller is admin
  const callerSnap = await db.doc(`users/${ctx.auth?.uid}`).get();
  if (!callerSnap.exists || callerSnap.data().role !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "Admins only");
  }
  const { subject, body } = data;
  const usersSnap = await db.collection("users").get();
  const emails = usersSnap.docs.map(d => d.data().email).filter(Boolean);
  // Send in batches of 50
  for (let i = 0; i < emails.length; i += 50) {
    const batch = emails.slice(i, i + 50);
    await sendMail(batch.join(","), subject, body);
  }
  return { sent: emails.length };
});
