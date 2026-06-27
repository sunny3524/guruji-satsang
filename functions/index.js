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

const FROM = `"Guruji Satsangs" <${functions.config().email?.user || "noreply@gurujisatsang.com"}>`;
const region = functions.region("europe-west2");

const GURUJI_VACHANS = [
  {
    punjabi: "Ahankaar rab di raah te chalan nai denda.",
    english: "Ego does not let you walk on the path of God."
  },
  {
    punjabi: "Health is a person's real wealth.",
    english: "Health is a person's real wealth."
  },
  {
    punjabi: "Your children, when they turn out well, are your actual earnings.",
    english: "Your children, when they turn out well, are your actual earnings."
  },
  {
    punjabi: "If you are affected by what another's opinion of you is, you would be under that person's control. Be under your own control.",
    english: "If you are affected by what another's opinion of you is, you would be under that person's control. Be under your own control."
  },
  {
    punjabi: "Never gossip about another person sarcastically: they would receive your share of blessings and you would get their negativity.",
    english: "Never gossip about another person sarcastically: they would receive your share of blessings and you would get their negativity."
  },
  {
    punjabi: "You can never see God. Love Him, don't ever be scared of him. But love Him with respect.",
    english: "You can never see God. Love Him, don't ever be scared of him. But love Him with respect."
  },
  {
    punjabi: "One should not depend too much on pundits. What if a particular one is not well-versed? Birth stones that are worn for prosperity and good health can themselves have a negative influence and, therefore, should not be worn.",
    english: "One should not depend too much on pundits. What if a particular one is not well-versed? Birth stones that are worn for prosperity and good health can themselves have a negative influence and, therefore, should not be worn."
  },
  {
    punjabi: "The Bade Mandir has the power of twelve holy places. Whoever comes here would receive my blessings.",
    english: "The Bade Mandir has the power of twelve holy places. Whoever comes here would receive my blessings."
  },
  {
    punjabi: "Main apne bhakt nu bahut pyar karda ha.",
    english: "I love my bhakts dearly."
  },
  {
    punjabi: "Jad jutti bahar lande ho taa apni intelligence vi bahar la ke aaya karo, uda aaithe koi kam nahi.",
    english: "When you take off your shoes outside the temple, divest of your intelligence too because it is of no use here before me."
  },
  {
    punjabi: "Jeh cellphone mere nal use kitta te teri blessings unu transfer ho jaan giyan.",
    english: "Do not use your cell phone in my presence, as your share of blessings will be transferred to that person."
  },
  {
    punjabi: "Ghar da ek member ve je mere kol aa jave te poori family da kalyan ho janda ve.",
    english: "Even if one member from a family comes to me, the whole family is blessed."
  },
  {
    punjabi: "Aes mandir vich 12 teerth sthano ka dhaam hai.",
    english: "The Bada Mandir has the power of twelve pious places put together."
  },
  {
    punjabi: "Insaan kis kum da? Janwar mar ke bhi kam ande ne, chamde de bag, joote, belt, khan de ve kam aande ne, lekin insaan te mar ke kisi kam da nahin. Jeende ji sirf paath kar sakda ve.",
    english: "Of what use is man? Animals come in handy even after death (leather bags, shoes, belts, etc.), but man is of no use after death. While alive, he can only do path (worship)."
  },
  {
    punjabi: "Mere naal direct connection jodo.",
    english: "Build a direct connection with me."
  },
  {
    punjabi: "Sirf kitabi paath, paath nahin honda.",
    english: "Paath does not mean reading scripture alone."
  },
  {
    punjabi: "Dur baitha jo mere kol nahi pahuch sakraya, o meri photo naal gal kare. Main sunana haa.",
    english: "If you are distant from me, don't worry. Talk to my photo - I listen to you."
  },
  {
    punjabi: "Discussion karan naal rab nahin milda.",
    english: "God is not attained through discussions."
  },
  {
    punjabi: "Mahapursha de level honde ne. Jo lokan da marz apne utte le sakda hai o universe ich sirf ek honda hai. o Satguru honda hai. o mai haa.",
    english: "Mahapurush (saints) have levels. There is only a single mahapurush in the universe who can take people's diseases upon himself. That is who I am."
  },
  {
    punjabi: "Dwai vi taa lagdi hai jad main bless karanga.",
    english: "Medicine works when I bless it."
  },
  {
    punjabi: "Langar te chai parshad vich meri blessings ne. Langar twadi dawai hai. Aithe poora khatam karna chahida hai. Ainu varat vale dina vich vi kha sakde ho. Ainu parshad di tarah dekho, padarth nahi. Jad tusi aaithe langar khande ho twade ghar de member, jo nahi aaye, bacche, ma pyo, o v bless ho jande ne.",
    english: "The langar and chai prasad contain my blessings. Langar is your medicine. It should be finished completely. It can also be eaten during fast days. Look at it as prasad, not food. When you eat langar here, your family members who did not come, children, parents, are also blessed."
  }
];

function getRandomVachan() {
  const randomIndex = Math.floor(Math.random() * GURUJI_VACHANS.length);
  return GURUJI_VACHANS[randomIndex];
}

// ── Helper ────────────────────────────────────────────────────────────────────
async function sendMail(to, subject, html) {
  if (!to || !to.includes("@")) {
    console.warn(`[Mail service] Missing or invalid email address. Skipping email to: ${to}`);
    return;
  }
  const user = functions.config().email?.user || process.env.EMAIL_USER;
  const pass = functions.config().email?.pass || process.env.EMAIL_PASS;
  if (!user || !pass) {
    console.warn(`[Mail service] Missing email user/pass credentials. Skipping email to: ${to}`);
    return;
  }

  // Inject a random Guruji Vachan into the email body
  const vachan = getRandomVachan();
  const vachanHtml = `
    <div style="margin-top: 36px; padding: 22px 24px; background-color: #270e03; border: 1px dashed #5c2a0a; border-radius: 12px; text-align: center; font-family: Georgia, serif; max-width: 560px; margin-left: auto; margin-right: auto; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
      <div style="font-size: 10px; color: #d4972a; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 10px; font-family: sans-serif; font-weight: bold;">
        🌹 Guruji's Divine Vachan
      </div>
      <p style="font-size: 17px; font-style: italic; color: #f5e8d0; margin: 0 0 10px; line-height: 1.5; font-weight: normal;">
        "${vachan.punjabi}"
      </p>
      <p style="font-size: 13px; color: #9c7050; margin: 0; font-style: italic; line-height: 1.4;">
        — ${vachan.english}
      </p>
    </div>
  `;
  const fullHtml = html + vachanHtml;

  try {
    await transporter.sendMail({ from: FROM, to, subject, html: fullHtml });
  } catch (error) {
    console.error(`[Mail service] Failed to send email to ${to}:`, error);
    throw new functions.https.HttpsError(
      "internal",
      `Mail delivery failed. Please verify your SMTP credentials and mail server status. Details: ${error.message}`
    );
  }
}

function satsangEmailBlock(s) {
  return `
    <div style="background:#270e03;border:1px solid #5c2a0a;border-radius:10px;padding:20px 24px;margin:16px 0;">
      <h3 style="color:#d4972a;margin:0 0 8px">${s.title}</h3>
      <p style="color:#c0a878;margin:4px 0">📅 ${s.date} at ${s.time}</p>
      <p style="color:#c0a878;margin:4px 0">📍 ${s.addressLine1 || s.address || ""}, ${s.city} ${s.postcode}</p>
    </div>`;
}

// ── 1. Welcome email on new user registration ─────────────────────────────────
exports.onUserCreated = region.firestore
  .document("users/{uid}")
  .onCreate(async (snap, context) => {
    const user = snap.data();
    const uid = context.params.uid || snap.id;

    // Automatically sync phone number to Firebase Auth user so they can log in via SMS OTP under the same UID
    if (user.phone) {
      try {
        await admin.auth().updateUser(uid, {
          phoneNumber: user.phone
        });
        console.log(`[Auth Sync] Successfully synced phone number ${user.phone} to Firebase Auth user ${uid}`);
      } catch (err) {
        console.warn(`[Auth Sync] Could not sync phone number to Auth for ${uid}:`, err.message || err);
      }
    }

    await sendMail(
      user.email,
      "🙏 Welcome to Guruji Satsangs — Jai Guruji!",
      `
      <div style="background:#1a0800;color:#f5e8d0;font-family:Georgia,serif;padding:32px;max-width:560px;margin:auto;border-radius:12px;">
        <div style="text-align:center;margin-bottom:24px;">
          <img src="https://gurujisatsangs.com/guruji-01.jpg" width="100" style="border-radius:50%;border:2px solid #d4972a;" alt="Guruji"/>
          <p style="color:#d4972a;letter-spacing:0.2em;font-size:11px;margin-top:12px;">OM NAMAH SHIVAY SHIVJI SADA SAHAY</p>
          <p style="color:#d4972a;letter-spacing:0.2em;font-size:11px;margin-top:12px;">OM NAMAH SHIVAY GURUJI SADA SAHAY</p>
        </div>
        <h2 style="color:#d4972a;">Jai Guruji, ${user.name}!</h2>
        <p style="color:#c0a878;line-height:1.8;">
          You have been registered with the Guruji Satsangs platform. 
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

    if (att.status === 'waitlisted') {
      // 1. Send Waitlisted Request Received email to applicant
      await sendMail(
        att.userEmail,
        `⚠️ Waitlisted: ${s.title} — Satsang Over Capacity`,
        `
        <div style="background:#1a0800;color:#f5e8d0;font-family:Georgia,serif;padding:32px;max-width:560px;margin:auto;border-radius:12px;">
          <p style="color:#d4972a;letter-spacing:0.2em;font-size:10px;">OM NAMAH SHIVAY SHIVJI SADA SAHAY</p>
          <p style="color:#d4972a;letter-spacing:0.2em;font-size:10px;">OM NAMAH SHIVAY GURUJI SADA SAHAY</p>
          <h2 style="color:#e06b10;">Waitlist Status, ${att.userName}! 🙏</h2>
          <p style="color:#c0a878;">This Satsang is currently **over capacity**. Your request has been placed on the **Waitlist**:</p>
          ${satsangEmailBlock(s)}
          ${att.guests > 0 ? `<p style="color:#c0a878;">Requested spots: <strong style="color:#d4972a;">1 + ${att.guests} guest(s)</strong></p>` : ""}
          <p style="color:#c0a878;line-height:1.8;">
            If spots open up (e.g. someone cancels or host increases capacity) and the host confirms your attendance, you will be notified immediately via email.
          </p>
          <p style="color:#9c7050;font-size:12px;margin-top:24px;">Shukrana Guruji 🙏</p>
        </div>`
      );

      // 2. Send New Waitlist Registration email to host
      const orgSnap = await db.doc(`users/${s.organizerUid}`).get();
      if (orgSnap.exists) {
        const org = orgSnap.data();
        await sendMail(
          org.email,
          `⚠️ New Waitlist Registration: ${att.userName} for ${s.title}`,
          `
          <div style="background:#1a0800;color:#f5e8d0;font-family:Georgia,serif;padding:32px;max-width:560px;margin:auto;border-radius:12px;">
            <h3 style="color:#e06b10;">New Waitlist Registration</h3>
            <p style="color:#c0a878;"><strong style="color:#d4972a;">${att.userName}</strong> (with ${att.guests} guest(s)) has been placed on the **Waitlist** because your Satsang is over capacity:</p>
            ${satsangEmailBlock(s)}
            <p style="color:#c0a878;">Guests: ${att.guests} &nbsp;|&nbsp; Phone: ${att.userPhone} &nbsp;|&nbsp; Email: ${att.userEmail}</p>
            <p style="color:#9c7050;font-size:12px;margin-top:24px;">Shukrana Guruji 🙏</p>
          </div>`
        );
      }
    } else {
      // Default: status === 'pending'
      // 1. Send Pending Request Received email to applicant
      await sendMail(
        att.userEmail,
        `⏳ Request Received: ${s.title} — Pending Host Approval`,
        `
        <div style="background:#1a0800;color:#f5e8d0;font-family:Georgia,serif;padding:32px;max-width:560px;margin:auto;border-radius:12px;">
          <p style="color:#d4972a;letter-spacing:0.2em;font-size:10px;">OM NAMAH SHIVAY SHIVJI SADA SAHAY</p>
          <p style="color:#d4972a;letter-spacing:0.2em;font-size:10px;">OM NAMAH SHIVAY GURUJI SADA SAHAY</p>
          <h2 style="color:#d4972a;">Attendance Request Received, ${att.userName}! 🙏</h2>
          <p style="color:#c0a878;">Your request to attend the following Satsang has been received and is currently **pending host approval**:</p>
          ${satsangEmailBlock(s)}
          ${att.guests > 0 ? `<p style="color:#c0a878;">Requested spots: <strong style="color:#d4972a;">1 + ${att.guests} guest(s)</strong></p>` : ""}
          <p style="color:#c0a878;line-height:1.8;">
            You will receive another email confirmation as soon as the host approves your request.
          </p>
          <p style="color:#9c7050;font-size:12px;margin-top:24px;">Shukrana Guruji 🙏</p>
        </div>`
      );

      // 2. Send New Attendance Request Pending Approval email to host
      const orgSnap = await db.doc(`users/${s.organizerUid}`).get();
      if (orgSnap.exists) {
        const org = orgSnap.data();
        await sendMail(
          org.email,
          `⏳ Pending Approval: ${att.userName} wishes to attend ${s.title}`,
          `
          <div style="background:#1a0800;color:#f5e8d0;font-family:Georgia,serif;padding:32px;max-width:560px;margin:auto;border-radius:12px;">
            <h3 style="color:#d4972a;">New Attendance Request</h3>
            <p style="color:#c0a878;"><strong style="color:#d4972a;">${att.userName}</strong> (with ${att.guests} guest(s)) has wished to attend your Satsang:</p>
            ${satsangEmailBlock(s)}
            <p style="color:#c0a878;">Please log into the app to confirm any pending sangat (attendees).</p>
            <p style="color:#c0a878;">Guests: ${att.guests} &nbsp;|&nbsp; Phone: ${att.userPhone} &nbsp;|&nbsp; Email: ${att.userEmail}</p>
            <p style="color:#9c7050;font-size:12px;margin-top:24px;">Shukrana Guruji 🙏</p>
          </div>`
        );
      }
    }
  });

// ── 3. Attendance registration helper ───────────────────────────────────────
exports.registerAttendance = region.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Login required');
  }

  const { satsangId, guests = 0, userName, userEmail, userPhone, attendeesList, requestedSevas = [] } = data || {};
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
    if (satsang.organizerUid === context.auth.uid) {
      throw new functions.https.HttpsError('failed-precondition', 'Host cannot register for their own hosted Satsang');
    }
    if (satsang.status !== 'upcoming') {
      throw new functions.https.HttpsError('failed-precondition', 'Cannot register for a Satsang that is not upcoming');
    }

    const currentCount = Number(satsang.attendeeCount || 0);
    const finalAttendeesList = attendeesList || [
      { id: context.auth.uid, name: userName, isPrimary: true }
    ];
    const partySize = finalAttendeesList.length;

    // Determine initial status based on capacity
    let status = 'pending';
    if (typeof satsang.maxAttendees === 'number' && currentCount + partySize > satsang.maxAttendees) {
      status = 'waitlisted';
    }

    tx.set(attendeeRef, {
      userUid: context.auth.uid,
      userName,
      userEmail,
      userPhone,
      attendeesList: finalAttendeesList,
      guests: partySize - 1,
      status,
      requestedSevas: (requestedSevas || []).map(s => ({
        sevaId: s.sevaId,
        personId: s.personId,
        personName: s.personName,
        status: 'pending'
      })),
      registeredAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // NOTE: attendeeCount is NOT updated here. It is updated only upon host confirmation!
  });

  return { success: true };
});

// ── 3a. Confirm Attendance ───────────────────────────────────────────────────
exports.confirmAttendance = region.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Login required');
  }

  const { satsangId, attendeeUid } = data || {};
  if (!satsangId || !attendeeUid) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
  }

  const satsangRef = db.doc(`satsangs/${satsangId}`);
  const attendeeRef = satsangRef.collection('attendees').doc(attendeeUid);

  let recipientEmail, recipientName, satsangData, attendeeData;

  await db.runTransaction(async tx => {
    const satsangSnap = await tx.get(satsangRef);
    if (!satsangSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Satsang not found');
    }
    const satsang = satsangSnap.data();
    satsangData = satsang;

    // Permissions check: must be host or admin
    const isHost = satsang.organizerUid === context.auth.uid;
    let isAdmin = false;
    const callerSnap = await tx.get(db.doc(`users/${context.auth.uid}`));
    if (callerSnap.exists && callerSnap.data().role === 'admin') {
      isAdmin = true;
    }
    if (!isHost && !isAdmin) {
      throw new functions.https.HttpsError('permission-denied', 'Only the host or admin can confirm attendance');
    }

    const attendeeSnap = await tx.get(attendeeRef);
    if (!attendeeSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Attendee record not found');
    }
    const attendee = attendeeSnap.data();
    attendeeData = attendee;
    recipientEmail = attendee.userEmail;
    recipientName = attendee.userName;

    if (attendee.status === 'confirmed') {
      throw new functions.https.HttpsError('failed-precondition', 'Attendee is already confirmed');
    }

    const finalAttendeesList = attendee.attendeesList || [
      { id: attendeeUid, name: attendee.userName, isPrimary: true }
    ];
    const partySize = finalAttendeesList.length;
    const currentCount = Number(satsang.attendeeCount || 0);
    if (typeof satsang.maxAttendees === 'number' && currentCount + partySize > satsang.maxAttendees) {
      throw new functions.https.HttpsError('failed-precondition', 'Not enough spots available in the Satsang');
    }

    tx.update(attendeeRef, {
      status: 'confirmed',
      confirmedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    tx.update(satsangRef, {
      attendeeCount: currentCount + partySize,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });

  // Send Confirmation Email
  if (recipientEmail) {
    await sendMail(
      recipientEmail,
      `✅ Attendance Confirmed: ${satsangData.title} — Jai Guruji!`,
      `
      <div style="background:#1a0800;color:#f5e8d0;font-family:Georgia,serif;padding:32px;max-width:560px;margin:auto;border-radius:12px;">
        <p style="color:#d4972a;letter-spacing:0.2em;font-size:10px;">OM NAMAH SHIVAY SHIVJI SADA SAHAY</p>
        <p style="color:#d4972a;letter-spacing:0.2em;font-size:10px;">OM NAMAH SHIVAY GURUJI SADA SAHAY</p>
        <h2 style="color:#d4972a;">Attendance Confirmed, ${recipientName}! 🙏</h2>
        <p style="color:#c0a878;">Your attendance request has been **confirmed** by the host for:</p>
        ${satsangEmailBlock(satsangData)}
        ${attendeeData.guests > 0 ? `<p style="color:#c0a878;">Confirmed spots: <strong style="color:#d4972a;">1 + ${attendeeData.guests} guest(s)</strong></p>` : ""}
        <p style="color:#c0a878;line-height:1.8;">
          Please remember to observe Guruji's Satsang guidelines — 
          switch off your mobile phone, maintain silence, and go home directly after Langar Prasad.
        </p>
        <p style="color:#9c7050;font-size:12px;margin-top:24px;">Shukrana Guruji 🙏</p>
      </div>`
    );
  }

  return { success: true };
});

// ── 3d. Confirm Seva ──────────────────────────────────────────────────────────
exports.confirmSeva = region.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Login required');
  }

  const { satsangId, attendeeUid, sevaId, personId } = data || {};
  if (!satsangId || !attendeeUid || !sevaId || !personId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
  }

  const satsangRef = db.doc(`satsangs/${satsangId}`);
  const attendeeRef = satsangRef.collection('attendees').doc(attendeeUid);

  let recipientEmail, recipientName, satsangData, personName, sevaName;

  await db.runTransaction(async tx => {
    const satsangSnap = await tx.get(satsangRef);
    if (!satsangSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Satsang not found');
    }
    const satsang = satsangSnap.data();
    satsangData = satsang;

    // Permissions check: must be host or admin
    const isHost = satsang.organizerUid === context.auth.uid;
    let isAdmin = false;
    const callerSnap = await tx.get(db.doc(`users/${context.auth.uid}`));
    if (callerSnap.exists && callerSnap.data().role === 'admin') {
      isAdmin = true;
    }
    if (!isHost && !isAdmin) {
      throw new functions.https.HttpsError('permission-denied', 'Only the host or admin can confirm Seva');
    }

    const attendeeSnap = await tx.get(attendeeRef);
    if (!attendeeSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Attendee record not found');
    }
    const attendee = attendeeSnap.data();
    recipientEmail = attendee.userEmail;
    recipientName = attendee.userName;

    // CRITICAL SAFETY CHECK: The host is strictly blocked from confirming a Seva if the associated registration status is not confirmed.
    if (attendee.status !== 'confirmed') {
      throw new functions.https.HttpsError('failed-precondition', 'Cannot allocate Seva to an attendee whose registration is not confirmed');
    }

    const requestedSevas = attendee.requestedSevas || [];
    const sevaIndex = requestedSevas.findIndex(r => r.sevaId === sevaId && r.personId === personId);
    if (sevaIndex === -1) {
      throw new functions.https.HttpsError('not-found', 'Requested Seva not found for this individual');
    }

    const reqSeva = requestedSevas[sevaIndex];
    if (reqSeva.status === 'confirmed') {
      throw new functions.https.HttpsError('failed-precondition', 'Seva is already confirmed for this individual');
    }

    personName = reqSeva.personName || 'Guest';

    // Check if the Seva slot is available in the Satsang
    const sevas = satsang.sevas || {};
    const sv = sevas[sevaId];
    if (!sv) {
      throw new functions.https.HttpsError('not-found', 'Seva role not found in Satsang definition');
    }
    
    if ((sv.opted || 0) >= sv.needed) {
      throw new functions.https.HttpsError('failed-precondition', 'No available slots for this Seva role');
    }

    // Update the specific requested Seva's status to 'confirmed'
    const updatedRequestedSevas = [...requestedSevas];
    updatedRequestedSevas[sevaIndex] = {
      ...reqSeva,
      status: 'confirmed'
    };

    // Update satsang sevas definition: increment opted, append to enrolled
    const enrolledList = sv.enrolled || [];
    // Ensure not already enrolled (deduplication)
    if (!enrolledList.some(e => e.uid === personId)) {
      const updatedSevas = {
        ...sevas,
        [sevaId]: {
          ...sv,
          opted: (sv.opted || 0) + 1,
          enrolled: [...enrolledList, { uid: personId, name: personName, attendeeUid: attendeeUid }]
        }
      };

      tx.update(attendeeRef, {
        requestedSevas: updatedRequestedSevas
      });

      tx.update(satsangRef, {
        sevas: updatedSevas,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    const standardSevaNames = {
      s1: "Langar Distribution Seva",
      s2: "Langar Preparation Seva",
      s3: "Disposable Collection Seva",
      s4: "Decoration Seva",
      s5: "Chai Prasad Distribution Seva",
      s6: "Transport Seva",
      s7: "AV Seva",
      s8: "Cleaning Seva",
      s9: "Children Seva"
    };
    sevaName = standardSevaNames[sevaId] || sevaId;
  });

  // Send Seva Confirmation Email
  if (recipientEmail) {
    await sendMail(
      recipientEmail,
      `🙏 Seva Confirmed: ${sevaName} at ${satsangData.title} — Jai Guruji!`,
      `
      <div style="background:#1a0800;color:#f5e8d0;font-family:Georgia,serif;padding:32px;max-width:560px;margin:auto;border-radius:12px;">
        <p style="color:#d4972a;letter-spacing:0.2em;font-size:10px;">OM NAMAH SHIVAY SHIVJI SADA SAHAY</p>
        <p style="color:#d4972a;letter-spacing:0.2em;font-size:10px;">OM NAMAH SHIVAY GURUJI SADA SAHAY</p>
        <h2 style="color:#d4972a;">Seva Confirmed, ${personName}! 🙏</h2>
        <p style="color:#c0a878;">You have been confirmed for <strong style="color:#d4972a;">${sevaName}</strong> at:</p>
        ${satsangEmailBlock(satsangData)}
        <p style="color:#c0a878;line-height:1.8;">
          Please arrive 30–45 minutes early so the Darbar is ready before the Sangat arrives. 
          Seva is Guruji's greatest blessing — perform it with love and humility.
        </p>
        <p style="color:#9c7050;font-size:12px;margin-top:24px;">Shukrana Guruji 🙏</p>
      </div>`
    ).catch(console.error);
  }

  return { success: true };
});

// ── 3e. Decline Seva ──────────────────────────────────────────────────────────
exports.declineSeva = region.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Login required');
  }

  const { satsangId, attendeeUid, sevaId, personId } = data || {};
  if (!satsangId || !attendeeUid || !sevaId || !personId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
  }

  const satsangRef = db.doc(`satsangs/${satsangId}`);
  const attendeeRef = satsangRef.collection('attendees').doc(attendeeUid);

  let recipientEmail, recipientName, satsangData, personName, sevaName;

  await db.runTransaction(async tx => {
    const satsangSnap = await tx.get(satsangRef);
    if (!satsangSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Satsang not found');
    }
    const satsang = satsangSnap.data();
    satsangData = satsang;

    // Permissions check: must be host or admin
    const isHost = satsang.organizerUid === context.auth.uid;
    let isAdmin = false;
    const callerSnap = await tx.get(db.doc(`users/${context.auth.uid}`));
    if (callerSnap.exists && callerSnap.data().role === 'admin') {
      isAdmin = true;
    }
    if (!isHost && !isAdmin) {
      throw new functions.https.HttpsError('permission-denied', 'Only the host or admin can decline Seva');
    }

    const attendeeSnap = await tx.get(attendeeRef);
    if (!attendeeSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Attendee record not found');
    }
    const attendee = attendeeSnap.data();
    recipientEmail = attendee.userEmail;
    recipientName = attendee.userName;

    const requestedSevas = attendee.requestedSevas || [];
    const sevaIndex = requestedSevas.findIndex(r => r.sevaId === sevaId && r.personId === personId);
    if (sevaIndex === -1) {
      throw new functions.https.HttpsError('not-found', 'Requested Seva not found for this individual');
    }

    const reqSeva = requestedSevas[sevaIndex];
    const previousStatus = reqSeva.status;

    // If it was already declined, no-op
    if (previousStatus === 'declined') {
      return;
    }

    personName = reqSeva.personName || 'Guest';

    // Update the status to 'declined'
    const updatedRequestedSevas = [...requestedSevas];
    updatedRequestedSevas[sevaIndex] = {
      ...reqSeva,
      status: 'declined'
    };

    // If previous status was confirmed, we also need to free the slot from satsang.sevas!
    const sevas = satsang.sevas || {};
    const sv = sevas[sevaId];
    let updatedSevas = { ...sevas };

    if (previousStatus === 'confirmed' && sv) {
      const enrolledList = sv.enrolled || [];
      const updatedEnrolled = enrolledList.filter(e => e.uid !== personId);
      updatedSevas[sevaId] = {
        ...sv,
        opted: Math.max(0, (sv.opted || 0) - 1),
        enrolled: updatedEnrolled
      };
    }

    tx.update(attendeeRef, {
      requestedSevas: updatedRequestedSevas
    });

    if (previousStatus === 'confirmed' && sv) {
      tx.update(satsangRef, {
        sevas: updatedSevas,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    const standardSevaNames = {
      s1: "Langar Distribution Seva",
      s2: "Langar Preparation Seva",
      s3: "Disposable Collection Seva",
      s4: "Decoration Seva",
      s5: "Chai Prasad Distribution Seva",
      s6: "Transport Seva",
      s7: "AV Seva",
      s8: "Cleaning Seva",
      s9: "Children Seva"
    };
    sevaName = standardSevaNames[sevaId] || sevaId;
  });

  // Optional: Send Seva Decline Email
  if (recipientEmail) {
    await sendMail(
      recipientEmail,
      `⚠️ Seva Request Status: ${sevaName} at ${satsangData.title}`,
      `
      <div style="background:#1a0800;color:#f5e8d0;font-family:Georgia,serif;padding:32px;max-width:560px;margin:auto;border-radius:12px;">
        <p style="color:#d4972a;letter-spacing:0.2em;font-size:10px;">OM NAMAH SHIVAY SHIVJI SADA SAHAY</p>
        <p style="color:#d4972a;letter-spacing:0.2em;font-size:10px;">OM NAMAH SHIVAY GURUJI SADA SAHAY</p>
        <h2 style="color:#e06b10;">Seva Request Update, ${personName} 🙏</h2>
        <p style="color:#c0a878;">Your request for <strong style="color:#d4972a;">${sevaName}</strong> at the following Satsang has been declined or unassigned by the host:</p>
        ${satsangEmailBlock(satsangData)}
        <p style="color:#c0a878;line-height:1.8;">
          There are only limited Seva spots available. You can review other available Seva opportunities on the app.
        </p>
        <p style="color:#9c7050;font-size:12px;margin-top:24px;">Shukrana Guruji 🙏</p>
      </div>`
    ).catch(console.error);
  }

  return { success: true };
});

// ── 3b. Decline Attendance (Moves to Waitlist) ────────────────────────────────
exports.declineAttendance = region.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Login required');
  }

  const { satsangId, attendeeUid } = data || {};
  if (!satsangId || !attendeeUid) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
  }

  const satsangRef = db.doc(`satsangs/${satsangId}`);
  const attendeeRef = satsangRef.collection('attendees').doc(attendeeUid);

  let recipientEmail, recipientName, satsangData, attendeeData;

  await db.runTransaction(async tx => {
    const satsangSnap = await tx.get(satsangRef);
    if (!satsangSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Satsang not found');
    }
    const satsang = satsangSnap.data();
    satsangData = satsang;

    // Permissions check: must be host or admin
    const isHost = satsang.organizerUid === context.auth.uid;
    let isAdmin = false;
    const callerSnap = await tx.get(db.doc(`users/${context.auth.uid}`));
    if (callerSnap.exists && callerSnap.data().role === 'admin') {
      isAdmin = true;
    }
    if (!isHost && !isAdmin) {
      throw new functions.https.HttpsError('permission-denied', 'Only the host or admin can decline attendance');
    }

    const attendeeSnap = await tx.get(attendeeRef);
    if (!attendeeSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Attendee record not found');
    }
    const attendee = attendeeSnap.data();
    attendeeData = attendee;
    recipientEmail = attendee.userEmail;
    recipientName = attendee.userName;

    // Decline moves them to waitlist
    tx.update(attendeeRef, {
      status: 'waitlisted',
      declinedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });

  // Send Waitlist Notification Email
  if (recipientEmail) {
    await sendMail(
      recipientEmail,
      `⚠️ Waitlist Status: ${satsangData.title} — Satsang Request Placed on Waitlist`,
      `
      <div style="background:#1a0800;color:#f5e8d0;font-family:Georgia,serif;padding:32px;max-width:560px;margin:auto;border-radius:12px;">
        <p style="color:#d4972a;letter-spacing:0.2em;font-size:10px;">OM NAMAH SHIVAY SHIVJI SADA SAHAY</p>
        <p style="color:#d4972a;letter-spacing:0.2em;font-size:10px;">OM NAMAH SHIVAY GURUJI SADA SAHAY</p>
        <h2 style="color:#e06b10;">Waitlist Notification, ${recipientName} 🙏</h2>
        <p style="color:#c0a878;">Your request to attend the following Satsang has been **placed on the Waitlist** by the host:</p>
        ${satsangEmailBlock(satsangData)}
        ${attendeeData.guests > 0 ? `<p style="color:#c0a878;">Waitlisted spots: <strong style="color:#d4972a;">1 + ${attendeeData.guests} guest(s)</strong></p>` : ""}
        <p style="color:#c0a878;line-height:1.8;">
          If spots open up and the host is able to accommodate you, your status will be updated and you will be notified immediately.
        </p>
        <p style="color:#9c7050;font-size:12px;margin-top:24px;">Shukrana Guruji 🙏</p>
      </div>`
    );
  }

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
    if (satsang.organizerUid === context.auth.uid) {
      throw new functions.https.HttpsError('failed-precondition', 'Host cannot enroll in Seva for their own hosted Satsang');
    }
    if (satsang.status !== 'upcoming') {
      throw new functions.https.HttpsError('failed-precondition', 'Cannot enroll in Seva for a Satsang that is not upcoming');
    }
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
      <p style="color:#d4972a;letter-spacing:0.2em;font-size:10px;">OM NAMAH SHIVAY SHIVJI SADA SAHAY</p>
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

// ── 3c. Auto-complete past Satsangs — runs every hour on the hour ──
exports.autoCompleteSatsangs = region.pubsub
  .schedule("0 * * * *")
  .timeZone("Europe/London")
  .onRun(async () => {
    const ukTimeStr = new Date().toLocaleString("sv-SE", { timeZone: "Europe/London" });
    const cleanStr = ukTimeStr.replace(",", "");
    const parts = cleanStr.trim().split(/\s+/);
    const currentDate = parts[0]; // "YYYY-MM-DD"
    const currentTime = parts[1] ? parts[1].substring(0, 5) : ""; // "HH:MM"

    console.log(`Checking elapsed Satsangs against UK time: ${currentDate} ${currentTime}`);

    const snap = await db.collection("satsangs")
      .where("status", "==", "upcoming")
      .get();

    const batch = db.batch();
    let count = 0;

    for (const doc of snap.docs) {
      const s = doc.data();
      const isPastDate = s.date < currentDate;
      const isSameDateAndPastTime = s.date === currentDate && s.time <= currentTime;

      if (isPastDate || isSameDateAndPastTime) {
        batch.update(doc.ref, {
          status: "completed",
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        count++;
      }
    }

    if (count > 0) {
      await batch.commit();
      console.log(`Auto-completed ${count} elapsed Satsang(s).`);
    } else {
      console.log("No elapsed Satsangs found to auto-complete.");
    }
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
            <p style="color:#d4972a;letter-spacing:0.2em;font-size:10px;">OM NAMAH SHIVAY SHIVJI SADA SAHAY</p>
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

// ── 5a. Email Notification when a Satsang is Cancelled ───────────────────────
exports.onSatsangCancelled = region.firestore
  .document("satsangs/{satsangId}")
  .onUpdate(async (change, ctx) => {
    const before = change.before.data();
    const after = change.after.data();

    // Check if status changed to 'cancelled'
    if (before.status !== "cancelled" && after.status === "cancelled") {
      const { satsangId } = ctx.params;

      // Fetch all attendees in the subcollection
      const attendeesSnap = await db
        .collection("satsangs")
        .doc(satsangId)
        .collection("attendees")
        .get();

      // Filter for approved / confirmed attendees
      const confirmedAttendees = attendeesSnap.docs
        .map(d => d.data())
        .filter(a => a.status === "confirmed");

      const organizerName = after.organizerName || "the Host";
      const organizerEmail = after.organizerEmail;
      const organizerPhone = after.organizerPhone;
      let contactInfo = "";
      if (organizerEmail && organizerPhone) {
        contactInfo = `${organizerEmail} / ${organizerPhone}`;
      } else if (organizerEmail) {
        contactInfo = organizerEmail;
      } else if (organizerPhone) {
        contactInfo = organizerPhone;
      }

      // 1. Send cancellation email to all approved Sangat attendees
      if (confirmedAttendees.length > 0) {
        for (const attendee of confirmedAttendees) {
          if (!attendee.userEmail) continue;

          await sendMail(
            attendee.userEmail,
            `⚠️ Satsang Cancelled: ${after.title} — Jai Guruji`,
            `
            <div style="background:#1a0800;color:#f5e8d0;font-family:Georgia,serif;padding:32px;max-width:560px;margin:auto;border-radius:12px;">
              <p style="color:#d4972a;letter-spacing:0.2em;font-size:10px;">OM NAMAH SHIVAY SHIVJI SADA SAHAY</p>
              <p style="color:#d4972a;letter-spacing:0.2em;font-size:10px;">OM NAMAH SHIVAY GURUJI SADA SAHAY</p>
              <h2 style="color:#d4972a;">Satsang Cancellation Notice 🙏</h2>
              <p style="color:#c0a878; font-size: 15px; line-height: 1.7;">
                Dear ${attendee.userName},
              </p>
              <p style="color:#c0a878; font-size: 15px; line-height: 1.7;">
                We are extremely sorry to inform you that the upcoming Satsang, <strong style="color:#d4972a;">${after.title}</strong>, has been cancelled due to unforeseen circumstances. 
                We sincerely apologize for any inconvenience this may cause to you and your family.
              </p>
              <div style="background:#270e03;border:1px solid #5c2a0a;border-radius:10px;padding:16px 20px;margin:20px 0;text-align:center;">
                <h3 style="color:#d4972a;margin:0 0 8px">${after.title} (Cancelled)</h3>
                <p style="color:#c0a878;margin:4px 0">📅 Originally scheduled: ${after.date} at ${after.time}</p>
              </div>
              <p style="color:#c0a878; font-size: 15px; line-height: 1.7;">
                <strong>Next Steps:</strong><br />
                If you have any questions, need support, or wish to connect, please feel free to reach out to the host, <strong>${organizerName}</strong>, directly at:
                <br />
                <strong style="color:#d4972a; font-size: 16px;">${contactInfo || "the Satsang team"}</strong>
              </p>
              <p style="color:#c0a878; font-size: 15px; line-height: 1.7;">
                We pray for Guruji's blessings upon you and hope we can gather together in devotion again very soon.
              </p>
              <p style="color:#9c7050;font-size:12px;margin-top:24px;">Shukrana Guruji 🙏</p>
            </div>`
          ).catch(console.error);
        }
      }

      // 2. Send cancellation notice email to all Admins
      try {
        const adminsSnap = await db
          .collection("users")
          .where("role", "==", "admin")
          .get();

        const adminEmails = adminsSnap.docs
          .map(d => d.data().email)
          .filter(Boolean);

        if (adminEmails.length > 0) {
          const adminSubject = `🚨 Host Cancelled Satsang: ${after.title} — Admin Alert`;
          const adminHtml = `
            <div style="background:#1a0800;color:#f5e8d0;font-family:Georgia,serif;padding:32px;max-width:560px;margin:auto;border-radius:12px;">
              <p style="color:#d4972a;letter-spacing:0.2em;font-size:10px;">OM NAMAH SHIVAY SHIVJI SADA SAHAY</p>
              <p style="color:#d4972a;letter-spacing:0.2em;font-size:10px;">OM NAMAH SHIVAY GURUJI SADA SAHAY</p>
              <h2 style="color:#e06b10;">🚨 Admin Alert: Satsang Cancelled by Host</h2>
              <p style="color:#c0a878; font-size: 15px; line-height: 1.7;">
                Dear Admin Team,
              </p>
              <p style="color:#c0a878; font-size: 15px; line-height: 1.7;">
                This is to notify you that the host <strong style="color:#d4972a;">${organizerName}</strong> has cancelled their scheduled Satsang: <strong style="color:#d4972a;">${after.title}</strong>.
              </p>
              <div style="background:#270e03;border:1px solid #5c2a0a;border-radius:10px;padding:16px 20px;margin:20px 0;">
                <p style="color:#c0a878;margin:4px 0"><strong>Event:</strong> ${after.title}</p>
                <p style="color:#c0a878;margin:4px 0"><strong>Host Name:</strong> ${organizerName}</p>
                <p style="color:#c0a878;margin:4px 0"><strong>Host Email:</strong> ${after.organizerEmail || "N/A"}</p>
                <p style="color:#c0a878;margin:4px 0"><strong>Host Phone:</strong> ${after.organizerPhone || "N/A"}</p>
                <p style="color:#c0a878;margin:4px 0"><strong>Original Date/Time:</strong> ${after.date} at ${after.time}</p>
              </div>

              <h3 style="color:#d4972a; margin-top: 24px;">📋 Admin Action Guidance</h3>
              <p style="color:#c0a878; font-size: 14px; line-height: 1.7;">
                As an admin, please review this cancellation and perform the following checks:
              </p>
              <ul style="color:#c0a878; font-size: 14px; line-height: 1.7; padding-left: 20px;">
                <li style="margin-bottom: 8px;">
                  <strong>Cancellation Frequency Check:</strong> Review the host's hosting history in the dashboard to determine if they are cancelling scheduled Satsangs frequently. Frequent cancellations can disrupt the Sangat's devotion and planning.
                </li>
                <li style="margin-bottom: 8px;">
                  <strong>Host Outreach:</strong> Contact the host gently to understand if they are facing any personal difficulties or space constraints where the admin team can offer support or volunteer help.
                </li>
                <li style="margin-bottom: 8px;">
                  <strong>Explain Satsang Value:</strong> Remind the host of the profound spiritual value and sacred responsibility of hosting Guruji's Satsang. Hosting is a rare blessing and opening one's home brings immense divine grace to the household and Sangat. Emphasize committing fully to scheduled dates.
                </li>
              </ul>

              <p style="color:#9c7050;font-size:12px;margin-top:28px;">Shukrana Guruji 🙏</p>
            </div>
          `;

          await sendMail(
            adminEmails.join(","),
            adminSubject,
            adminHtml
          ).catch(console.error);
        }
      } catch (err) {
        console.error("Error in admin cancellation alert email: ", err);
      }
    }
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

// ── 7. Real-time Attendee Sync Trigger ──────────────────────────────────────────
exports.onUserUpdated = region.firestore
  .document("users/{uid}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const uid = context.params.uid;
    
    // Automatically sync updated phone number to Firebase Auth user so they can log in via SMS OTP under the same UID
    const phoneChanged = before.phone !== after.phone;
    if (phoneChanged && after.phone) {
      try {
        await admin.auth().updateUser(uid, {
          phoneNumber: after.phone
        });
        console.log(`[Auth Sync] Successfully updated phone number ${after.phone} on Firebase Auth user ${uid}`);
      } catch (err) {
        console.warn(`[Auth Sync] Could not sync updated phone number to Auth for ${uid}:`, err.message || err);
      }
    }
    
    // Check if phone or address details changed
    const addressLine1Changed = before.addressLine1 !== after.addressLine1;
    const cityChanged = before.city !== after.city;
    const postcodeChanged = before.postcode !== after.postcode;
    const countryChanged = before.country !== after.country;
    
    if (!phoneChanged && !addressLine1Changed && !cityChanged && !postcodeChanged && !countryChanged) {
      return null;
    }
    
    console.log(`User ${uid} updated profile. Propagating changes to attendees subcollections.`);
    
    // Sweep all satsangs and find attendees subcollections where this user is enrolled
    const satsangsSnap = await db.collection("satsangs").get();
    const batch = db.batch();
    let count = 0;
    
    for (const satsangDoc of satsangsSnap.docs) {
      const attendeeRef = db.collection("satsangs").doc(satsangDoc.id).collection("attendees").doc(uid);
      const attendeeSnap = await attendeeRef.get();
      if (attendeeSnap.exists) {
        batch.update(attendeeRef, {
          userPhone: after.phone || "",
          userAddress: after.addressLine1 || after.address || "",
          userCity: after.city || "",
          userPostcode: after.postcode || "",
          userCountry: after.country || "United Kingdom",
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        count++;
      }
    }
    
    if (count > 0) {
      await batch.commit();
      console.log(`Propagated updates to ${count} attendee records.`);
    } else {
      console.log(`No active attendee records found for user ${uid}.`);
    }
    return null;
  });

// ── 8. Administrative Migration: Addresses & Phone Numbers ────────────────────
exports.migrateAddressesAndPhones = region.https.onRequest(async (req, res) => {
  const secret = req.query.secret;
  if (secret !== "GurujiBlessings108") {
    return res.status(403).send("Unauthorized: Invalid administrative secret key");
  }
  
  try {
    const usersSnap = await db.collection("users").get();
    const satsangsSnap = await db.collection("satsangs").get();
    
    const userBatch = db.batch();
    let migratedUsersCount = 0;
    
    // 1. Migrate Users address and phone formatting
    usersSnap.docs.forEach(userDoc => {
      const uData = userDoc.data();
      const updates = {};
      let changed = false;
      
      // Address migration
      if (uData.address && !uData.addressLine1) {
        updates.addressLine1 = uData.address;
        updates.addressLine2 = uData.addressLine2 || "";
        updates.addressLine3 = uData.addressLine3 || "";
        updates.state = uData.state || "";
        updates.country = uData.country || "United Kingdom";
        changed = true;
      } else if (!uData.country) {
        updates.country = "United Kingdom";
        changed = true;
      }
      
      // Phone number normalization
      if (uData.phone) {
        let cleanPhone = uData.phone.trim().replace(/\s+/g, "").replace(/[-()]/g, "");
        const userCountry = updates.country || uData.country || "United Kingdom";
        
        const countryDialCodes = {
          "United Kingdom": "44", "India": "91", "United States": "1", "Canada": "1",
          "Australia": "61", "New Zealand": "64", "United Arab Emirates": "971",
          "Singapore": "65", "South Africa": "27", "Germany": "49", "France": "33",
          "Ireland": "353", "Kenya": "254", "Netherlands": "31", "Switzerland": "41",
          "Malaysia": "60", "Hong Kong": "852"
        };
        
        if (!cleanPhone.startsWith("+")) {
          if (cleanPhone.startsWith("00")) {
            cleanPhone = "+" + cleanPhone.slice(2);
          } else {
            const dial = countryDialCodes[userCountry];
            if (dial) {
              if (cleanPhone.startsWith("0")) {
                cleanPhone = cleanPhone.slice(1);
              }
              if (cleanPhone.startsWith(dial)) {
                cleanPhone = "+" + cleanPhone;
              } else {
                cleanPhone = `+${dial}${cleanPhone}`;
              }
            }
          }
          if (cleanPhone !== uData.phone) {
            updates.phone = cleanPhone;
            changed = true;
          }
        }
      }
      
      if (changed) {
        userBatch.update(userDoc.ref, updates);
        migratedUsersCount++;
      }
    });
    
    if (migratedUsersCount > 0) {
      await userBatch.commit();
    }
    
    // 2. Migrate Satsangs address fields
    const satsangBatch = db.batch();
    let migratedSatsangsCount = 0;
    
    satsangsSnap.docs.forEach(sDoc => {
      const sData = sDoc.data();
      const updates = {};
      let changed = false;
      
      if (sData.address && !sData.addressLine1) {
        updates.addressLine1 = sData.address;
        updates.addressLine2 = sData.addressLine2 || "";
        updates.addressLine3 = sData.addressLine3 || "";
        updates.state = sData.state || "";
        updates.country = sData.country || "United Kingdom";
        changed = true;
      } else if (!sData.country) {
        updates.country = "United Kingdom";
        changed = true;
      }
      
      if (changed) {
        satsangBatch.update(sDoc.ref, updates);
        migratedSatsangsCount++;
      }
    });
    
    if (migratedSatsangsCount > 0) {
      await satsangBatch.commit();
    }
    
    return res.status(200).send({
      success: true,
      migratedUsers: migratedUsersCount,
      migratedSatsangs: migratedSatsangsCount,
      message: "Database addresses and phone numbers successfully migrated! Jai Guruji 🙏"
    });
  } catch (err) {
    console.error("Migration error:", err);
    return res.status(500).send({
      success: false,
      error: err.message
    });
  }
});

// ── Secure HTTP POST Helper ──────────────────────────────────────────────────
function postRequest(urlStr, headers, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const bodyData = JSON.stringify(body);
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: url.pathname + url.search,
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(bodyData)
      }
    };
    
    const httpOrHttps = url.protocol === "https:" ? require("https") : require("http");
    const req = httpOrHttps.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`Server responded with status ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on("error", (err) => { reject(err); });
    req.write(bodyData);
    req.end();
  });
}

// Helper to generate variations of a phone number to prevent formatting conflicts
function getPhoneVariations(phone) {
  if (!phone) return [];
  const clean = phone.trim().replace(/[^\d+]/g, "");
  const variations = new Set();
  
  variations.add(clean);
  
  const withoutPlus = clean.startsWith("+") ? clean.slice(1) : clean;
  const withPlus = clean.startsWith("+") ? clean : "+" + clean;
  
  variations.add(withoutPlus);
  variations.add(withPlus);
  
  const dialCodes = [
    "971", "353", "254", "973", "233", "352", "968", "974", "966",
    "44", "91", "61", "64", "65", "27", "49", "33", "31", "41", "60",
    "36", "62", "92", "34", "46", "66", "1"
  ];
  
  const numWithoutPlus = clean.startsWith("+") ? clean.slice(1) : clean;
  for (const code of dialCodes) {
    if (numWithoutPlus.startsWith(code)) {
      const national = numWithoutPlus.slice(code.length);
      if (national.startsWith("0")) {
        const stripped = code + national.slice(1);
        variations.add(stripped);
        variations.add("+" + stripped);
      } else {
        const padded = code + "0" + national;
        variations.add(padded);
        variations.add("+" + padded);
      }
      break;
    }
  }
  
  return Array.from(variations);
}

// ── Check Phone Availability (Uniqueness check) ─────────────────────────────────
exports.checkPhoneAvailability = region.https.onCall(async (data) => {
  const { phone } = data || {};
  if (!phone) {
    throw new functions.https.HttpsError("invalid-argument", "Phone number is required");
  }

  const variations = getPhoneVariations(phone);
  const usersSnap = await db.collection("users").where("phone", "in", variations).limit(1).get();
  return { available: usersSnap.empty };
});

// ── Request WhatsApp OTP (Secure & Anti-Enumeration) ───────────────────────────
exports.requestWhatsAppOTP = region.https.onCall(async (data) => {
  const { phone } = data || {};
  if (!phone) {
    throw new functions.https.HttpsError("invalid-argument", "Phone number is required");
  }

  // Normalize number (ensure digits only after '+' prefix)
  const normalized = phone.trim().replace(/[^\d+]/g, "");

  // Rate Limiting Check (Simple Firestore-based limit, e.g., max 1 code per 2 minutes)
  const otpRef = db.collection("otps").doc(normalized);
  const otpSnap = await otpRef.get();
  if (otpSnap.exists) {
    const otpData = otpSnap.data();
    const ageMs = Date.now() - otpData.createdAt.toDate().getTime();
    if (ageMs < 120 * 1000) {
      throw new functions.https.HttpsError(
        "resource-exhausted",
        "An OTP was recently requested for this number. Please wait 2 minutes before requesting another."
      );
    }
  }

  // Check if phone number is registered
  const variations = getPhoneVariations(phone);
  const usersSnap = await db.collection("users").where("phone", "in", variations).limit(1).get();
  
  // ── Anti-Enumeration Guard ──
  // If the number is NOT registered, IMMEDIATELY return generic success response
  // without calling the WhatsApp daemon.
  if (usersSnap.empty) {
    console.log(`[Anti-Enumeration] OTP requested for unregistered phone number: ${normalized}`);
    return {
      success: true,
      message: "If this phone number is registered with a profile, you will receive a WhatsApp verification code shortly."
    };
  }

  const userDoc = usersSnap.docs[0];
  const uid = userDoc.id;

  // Generate 6-digit random code
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // Save secure OTP to Firestore
  await otpRef.set({
    code: code,
    uid: uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 5 * 60 * 1000)), // 5 minutes validity
    attempts: 0
  });

  // Rotate between 10 spiritually respectful templates to evade spam detection
  const templates = [
    `Jai Guruji 🙏 Your Guruji Sangat App verification code is: ${code}. Valid for 5 minutes.`,
    `Jai Guruji 🙏 Use code ${code} to log securely into the Guruji Sangat App. It expires in 5 minutes.`,
    `Aum Namah Shivay 🙏 Please enter ${code} to verify your number on the Guruji Satsangs App. This code is valid for 5 minutes.`,
    `Jai Guruji 🙏 Your secure access code is ${code}. Enter this on the Guruji Satsangs app within 5 minutes.`,
    `Shukrana Guruji 🙏 Use verification code ${code} to complete your login. Valid for 5 minutes.`,
    `Jai Guruji 🙏 Verification code: ${code}. Please enter this code in the Guruji Sangat App to verify your identity. Valid for 5 minutes.`,
    `Guruji Sangat verification: ${code}. Enter this code on the login page to continue. Expires in 5 minutes. Jai Guruji 🙏`,
    `Aum Namah Shivay 🙏 Verification OTP: ${code} is your code for Guruji Satsangs App login. Do not share.`,
    `Jai Guruji Maharaj 🙏 Code ${code} is your secure login verification code. Valid for 5 minutes.`,
    `Shukrana Guruji 🙏 Secure code: ${code}. Use it on the Guruji Sangat App. Valid for 5 minutes.`
  ];
  const randomMsg = templates[Math.floor(Math.random() * templates.length)];

  // Fetch daemon configurations
  const waUrl = functions.config().whatsapp?.url || process.env.WHATSAPP_API_URL;
  const waSecret = functions.config().whatsapp?.secret || process.env.WHATSAPP_API_SECRET;

  if (!waUrl || !waSecret) {
    console.error("Missing WhatsApp daemon URL or Secret config in Firebase environment.");
    throw new functions.https.HttpsError("failed-precondition", "WhatsApp gateway configurations are currently offline.");
  }
  try {
    // Send to local/VPS daemon (bypassing ngrok warning screens if testing locally)
    await postRequest(
      `${waUrl}/send-otp`,
      { 
        "Authorization": `Bearer ${waSecret}`,
        "ngrok-skip-browser-warning": "true",
        "User-Agent": "FirebaseCloudFunction"
      },
      { phone: normalized, message: randomMsg }
    );
    
    console.log(`[WhatsApp OTP] Successfully triggered OTP delivery to ${normalized}`);
    return {
      success: true,
      message: "If this phone number is registered with a profile, you will receive a WhatsApp verification code shortly."
    };
  } catch (err) {
    console.error(`[WhatsApp OTP] Daemon connection failed for ${normalized}:`, err);
    throw new functions.https.HttpsError("unavailable", "Failed to deliver WhatsApp message. Please try again later.");
  }
});

// ── Verify WhatsApp OTP ──────────────────────────────────────────────────────────
exports.verifyWhatsAppOTP = region.https.onCall(async (data) => {
  const { phone, code } = data || {};
  if (!phone || !code) {
    throw new functions.https.HttpsError("invalid-argument", "Phone number and verification code are required");
  }

  const normalized = phone.trim().replace(/[^\d+]/g, "");
  const otpRef = db.collection("otps").doc(normalized);
  const otpSnap = await otpRef.get();

  if (!otpSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Invalid or expired verification code.");
  }

  const otpData = otpSnap.data();

  // 1. Expiration check
  if (otpData.expiresAt.toDate().getTime() < Date.now()) {
    await otpRef.delete().catch(() => {});
    throw new functions.https.HttpsError("deadline-exceeded", "The verification code has expired. Please request a new one.");
  }

  // 2. Max attempts check
  if (otpData.attempts >= 3) {
    await otpRef.delete().catch(() => {});
    throw new functions.https.HttpsError("resource-exhausted", "Too many failed attempts. Please request a new OTP.");
  }

  // 3. Compare code
  if (otpData.code !== code.trim()) {
    await otpRef.update({
      attempts: admin.firestore.FieldValue.increment(1)
    });
    throw new functions.https.HttpsError("invalid-argument", "Incorrect verification code. Please try again.");
  }

  // Success! Create custom auth token for their uid
  try {
    const customToken = await admin.auth().createCustomToken(otpData.uid);
    
    // Clean up temporary OTP doc
    await otpRef.delete().catch(() => {});
    
    console.log(`[WhatsApp OTP] Successfully verified and issued Custom Token for user: ${otpData.uid}`);
    return {
      success: true,
      token: customToken
    };
  } catch (err) {
    console.error("Custom token creation failed:", err);
    throw new functions.https.HttpsError("internal", "Authentication system error. Please contact administrator.");
  }
});

// ── Register User With Phone and 6-Digit PIN ───────────────────────────
exports.registerUserWithPhoneAndPIN = region.https.onCall(async (data) => {
  const {
    name, email, phone, pin,
    addressLine1, addressLine2, addressLine3,
    state, city, postcode, country,
    latitude, longitude, guests
  } = data || {};

  if (!name || !phone || !pin) {
    throw new functions.https.HttpsError("invalid-argument", "Name, phone number, and 6-digit PIN are required.");
  }

  if (pin.length !== 6 || isNaN(pin)) {
    throw new functions.https.HttpsError("invalid-argument", "PIN must be a 6-digit numerical code.");
  }

  const normalizedPhone = phone.trim().replace(/[^\d+]/g, "");
  const normalizedEmail = email ? email.trim().toLowerCase() : "";

  // 1. Verify phone uniqueness
  const variations = getPhoneVariations(phone);
  const phoneSnap = await db.collection("users").where("phone", "in", variations).limit(1).get();
  if (!phoneSnap.empty) {
    throw new functions.https.HttpsError("already-exists", "This phone number is already registered with another Sangat profile! Please log in or check the number.");
  }

  // 2. Verify email uniqueness in Firestore if provided
  if (normalizedEmail) {
    const emailSnap = await db.collection("users").where("email", "==", normalizedEmail).limit(1).get();
    if (!emailSnap.empty) {
      throw new functions.https.HttpsError("already-exists", "This email address is already registered with another Sangat profile! Please log in or check the email.");
    }
  }

  // 3. Create Firebase Auth user with phone number and optional email
  const crypto = require("crypto");
  const randomPassword = crypto.randomBytes(24).toString("hex");
  
  let userRecord;
  try {
    const userParams = {
      phoneNumber: normalizedPhone,
      displayName: name.trim()
    };
    if (normalizedEmail) {
      userParams.email = normalizedEmail;
      userParams.password = randomPassword; // Password only needed if email is set
    }
    userRecord = await admin.auth().createUser(userParams);
  } catch (err) {
    console.error("Auth user creation failed:", err);
    throw new functions.https.HttpsError("internal", `Failed to register user account: ${err.message}`);
  }

  // 4. Hash PIN with SHA-256
  const pinHash = crypto.createHash("sha256").update(pin.trim()).digest("hex");

  // 5. Save user profile to Firestore /users/{uid}
  try {
    await db.collection("users").doc(userRecord.uid).set({
      name: name.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      addressLine1: addressLine1 ? addressLine1.trim() : "",
      addressLine2: addressLine2 ? addressLine2.trim() : "",
      addressLine3: addressLine3 ? addressLine3.trim() : "",
      state: state ? state.trim() : "",
      city: city ? city.trim() : "",
      postcode: postcode ? postcode.trim() : "",
      country: country ? country.trim() : "",
      latitude: latitude || null,
      longitude: longitude || null,
      guests: guests || [],
      pinHash,
      role: "member",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (err) {
    console.error("Firestore profile creation failed for uid:", userRecord.uid, err);
    // Cleanup created auth user to avoid orphaned accounts
    await admin.auth().deleteUser(userRecord.uid).catch(() => {});
    throw new functions.https.HttpsError("internal", `Profile database creation failed: ${err.message}`);
  }

  // 6. Generate custom auth token for immediate login
  try {
    const customToken = await admin.auth().createCustomToken(userRecord.uid);
    return {
      success: true,
      token: customToken
    };
  } catch (err) {
    console.error("Custom token creation failed during registration:", err);
    throw new functions.https.HttpsError("internal", "Auth token generation failed.");
  }
});

// ── Login User With Phone and 6-Digit PIN ────────────────────────────────
exports.loginWithPhoneAndPIN = region.https.onCall(async (data) => {
  const { phone, pin } = data || {};
  if (!phone || !pin) {
    throw new functions.https.HttpsError("invalid-argument", "Both phone number and PIN are required.");
  }

  const normalizedPhone = phone.trim().replace(/[^\d+]/g, "");
  const crypto = require("crypto");
  const inputPinHash = crypto.createHash("sha256").update(pin.trim()).digest("hex");

  // Query users where phone matches
  const variations = getPhoneVariations(phone);
  const usersSnap = await db.collection("users").where("phone", "in", variations).limit(1).get();

  // Anti-Enumeration generic error
  const genericError = "Invalid phone number or PIN. If you have not set up your PIN yet, please log in using the WhatsApp OTP option to set your PIN on the Profile page.";

  if (usersSnap.empty) {
    console.log(`[Anti-Enumeration Login] Phone not found: ${normalizedPhone}`);
    throw new functions.https.HttpsError("unauthenticated", genericError);
  }

  const userDoc = usersSnap.docs[0];
  const userData = userDoc.data();

  if (!userData.pinHash) {
    console.log(`[Anti-Enumeration Login] User ${userDoc.id} has no PIN set.`);
    throw new functions.https.HttpsError("unauthenticated", genericError);
  }

  if (userData.pinHash !== inputPinHash) {
    console.log(`[Anti-Enumeration Login] PIN mismatch for user ${userDoc.id}.`);
    throw new functions.https.HttpsError("unauthenticated", genericError);
  }

  // PIN Matches! Generate custom auth token
  try {
    const customToken = await admin.auth().createCustomToken(userDoc.id);
    return {
      success: true,
      token: customToken
    };
  } catch (err) {
    console.error("Custom token creation failed during PIN login:", err);
    throw new functions.https.HttpsError("internal", "Authentication system error. Please contact administrator.");
  }
});

// ── Update User PIN ──────────────────────────────────────────────────────
exports.updateUserPIN = region.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Authentication required to update PIN.");
  }

  const { pin } = data || {};
  if (!pin || pin.length !== 6 || isNaN(pin)) {
    throw new functions.https.HttpsError("invalid-argument", "A valid 6-digit numerical PIN is required.");
  }

  const crypto = require("crypto");
  const pinHash = crypto.createHash("sha256").update(pin.trim()).digest("hex");

  try {
    await db.collection("users").doc(context.auth.uid).update({
      pinHash,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { success: true };
  } catch (err) {
    console.error("PIN update failed for uid:", context.auth.uid, err);
    throw new functions.https.HttpsError("internal", `Failed to update PIN: ${err.message}`);
  }
});

// ── Migrate User Profile to Phone UID (Secure Backend Migration) ───────────
exports.migrateUserProfileToPhoneUID = region.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Authentication required to migrate profile.");
  }

  const { phone } = data || {};
  if (!phone) {
    throw new functions.https.HttpsError("invalid-argument", "Phone number is required for migration lookup.");
  }

  const newUid = context.auth.uid;
  const normalizedPhone = phone.trim().replace(/[^\d+]/g, "");

  try {
    // 1. Query users collection by phone for any document where doc.id != newUid
    const variations = getPhoneVariations(phone);
    const usersSnap = await db.collection("users")
      .where("phone", "in", variations)
      .limit(1)
      .get();

    if (usersSnap.empty) {
      return { success: true, migrated: false, message: "No legacy profile found for this phone number." };
    }

    const oldUserDoc = usersSnap.docs[0];
    const oldUid = oldUserDoc.id;

    if (oldUid === newUid) {
      return { success: true, migrated: false, message: "Profile already associated with current UID." };
    }

    const oldUserData = oldUserDoc.data();
    console.log(`[Migration Service] Migrating user data from oldUid: ${oldUid} to newUid: ${newUid}`);

    // Step A: Copy user profile to newUid
    await db.collection("users").doc(newUid).set({
      ...oldUserData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Step B: Delete old user profile
    await db.collection("users").doc(oldUid).delete();

    // Step C: Update organizerUid in Satsangs organized by oldUid
    const satsangsSnap = await db.collection("satsangs").where("organizerUid", "==", oldUid).get();
    const batch = db.batch();
    satsangsSnap.docs.forEach(docSnap => {
      batch.update(docSnap.ref, {
        organizerUid: newUid,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    // Step D: Update attendance (attendees subcollection)
    const attendeesSnap = await db.collectionGroup("attendees").where("userUid", "==", oldUid).get();
    attendeesSnap.docs.forEach(aDoc => {
      const data = aDoc.data();
      const parentSatsangDoc = aDoc.ref.parent.parent;
      if (parentSatsangDoc) {
        const newAttendeeRef = parentSatsangDoc.collection("attendees").doc(newUid);
        batch.set(newAttendeeRef, {
          ...data,
          userUid: newUid
        });
        batch.delete(aDoc.ref);
      }
    });

    // Step E: Update enrolled sevas on all satsangs
    const allSatsangsSnap = await db.collection("satsangs").get();
    allSatsangsSnap.docs.forEach(sDoc => {
      const satsangData = sDoc.data();
      if (satsangData.sevas) {
        let updated = false;
        const sevas = { ...satsangData.sevas };
        for (const sevaId in sevas) {
          const seva = sevas[sevaId];
          if (seva.enrolled && Array.isArray(seva.enrolled)) {
            const filtered = seva.enrolled.map(item => {
              if (item.uid === oldUid) {
                updated = true;
                return { ...item, uid: newUid };
              }
              return item;
            });
            if (updated) {
              sevas[sevaId].enrolled = filtered;
            }
          }
        }
        if (updated) {
          batch.update(sDoc.ref, {
            sevas,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      }
    });

    await batch.commit();
    console.log(`[Migration Service] Successfully migrated and committed database updates.`);
    return { success: true, migrated: true, oldUid };

  } catch (err) {
    console.error("[Migration Service] Profile migration failed:", err);
    throw new functions.https.HttpsError("internal", `Profile migration failed: ${err.message}`);
  }
});

// ── Request WhatsApp OTP for Registration ─────────────────────────
exports.requestWhatsAppOTPForRegistration = region.https.onCall(async (data) => {
  const { phone } = data || {};
  if (!phone) {
    throw new functions.https.HttpsError("invalid-argument", "Phone number is required");
  }

  const normalized = phone.trim().replace(/[^\d+]/g, "");

  // Check if phone number is already registered in Firestore
  const variations = getPhoneVariations(phone);
  const usersSnap = await db.collection("users").where("phone", "in", variations).limit(1).get();
  if (!usersSnap.empty) {
    throw new functions.https.HttpsError("already-exists", "This phone number is already registered with another profile.");
  }

  // Rate Limiting Check
  const otpRef = db.collection("otps").doc(normalized);
  const otpSnap = await otpRef.get();
  if (otpSnap.exists) {
    const otpData = otpSnap.data();
    const ageMs = Date.now() - otpData.createdAt.toDate().getTime();
    if (ageMs < 120 * 1000) {
      throw new functions.https.HttpsError(
        "resource-exhausted",
        "An OTP was recently requested for this number. Please wait 2 minutes."
      );
    }
  }

  // Generate 6-digit random code
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // Save secure OTP to Firestore
  await otpRef.set({
    code: code,
    isRegistration: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 5 * 60 * 1000)),
    attempts: 0
  });

  const templates = [
    `Jai Guruji 🙏 Your Guruji Sangat App registration code is: ${code}. Valid for 5 minutes.`,
    `Jai Guruji 🙏 Use code ${code} to verify your phone number and register on the Guruji Sangat App.`,
    `Aum Namah Shivay 🙏 Verification code: ${code}. Please enter this code to complete your registration.`,
    `Jai Guruji 🙏 Register on the Guruji Satsangs App using code: ${code}. Expires in 5 minutes.`,
    `Shukrana Guruji 🙏 Registration verification code: ${code}. Welcome to the Sangat.`,
    `Jai Guruji Maharaj 🙏 To complete your Sangat profile, verify with code: ${code}. Valid for 5 mins.`,
    `Aum Namah Shivay 🙏 Registration OTP: ${code}. Enter this to activate your profile on Guruji Satsangs.`,
    `Jai Guruji 🙏 Your phone registration code is: ${code}. Valid for 5 minutes.`,
    `Shukrana Guruji 🙏 Enter code ${code} to complete your register flow on the Sangat portal.`,
    `Jai Guruji 🙏 Account registration code: ${code}. Do not share this OTP. Expires in 5 minutes.`
  ];
  const randomMsg = templates[Math.floor(Math.random() * templates.length)];

  // Fetch daemon configurations
  const waUrl = functions.config().whatsapp?.url || process.env.WHATSAPP_API_URL;
  const waSecret = functions.config().whatsapp?.secret || process.env.WHATSAPP_API_SECRET;

  if (!waUrl || !waSecret) {
    console.warn(`[WhatsApp API] Missing credentials. Logged code is: ${code}`);
    return { success: true, message: "Code generated (credentials missing)." };
  }

  try {
    // Send to local/VPS daemon
    await postRequest(
      `${waUrl}/send-otp`,
      { 
        "Authorization": `Bearer ${waSecret}`,
        "ngrok-skip-browser-warning": "true",
        "User-Agent": "FirebaseCloudFunction"
      },
      { phone: normalized, message: randomMsg }
    );
    return { success: true, message: "Verification code sent to your WhatsApp!" };
  } catch (err) {
    console.error("WhatsApp message delivery failed:", err);
    throw new functions.https.HttpsError("internal", `Failed to send WhatsApp message: ${err.message}`);
  }
});

// ── Register User With WhatsApp OTP ───────────────────────────────────────
exports.registerUserWithWhatsAppOTP = region.https.onCall(async (data, context) => {
  const { phone, code, profile } = data || {};
  if (!phone || !code || !profile) {
    throw new functions.https.HttpsError("invalid-argument", "Phone number, verification code, and profile details are required.");
  }

  const normalized = phone.trim().replace(/[^\d+]/g, "");
  const otpRef = db.collection("otps").doc(normalized);
  const otpSnap = await otpRef.get();

  if (!otpSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Invalid or expired verification code.");
  }

  const otpData = otpSnap.data();

  // Expiration check
  if (otpData.expiresAt.toDate().getTime() < Date.now()) {
    await otpRef.delete().catch(() => {});
    throw new functions.https.HttpsError("deadline-exceeded", "The verification code has expired. Please request a new one.");
  }

  // Max attempts check
  if (otpData.attempts >= 3) {
    await otpRef.delete().catch(() => {});
    throw new functions.https.HttpsError("resource-exhausted", "Too many failed attempts. Please request a new OTP.");
  }

  // Compare code
  if (otpData.code !== code.trim()) {
    await otpRef.update({
      attempts: admin.firestore.FieldValue.increment(1)
    });
    throw new functions.https.HttpsError("invalid-argument", "Incorrect verification code. Please try again.");
  }

  // Verify phone is not registered (double check)
  const variations = getPhoneVariations(phone);
  const usersSnap = await db.collection("users").where("phone", "in", variations).limit(1).get();
  if (!usersSnap.empty) {
    const existingUserDoc = usersSnap.docs[0];
    if (!context.auth || existingUserDoc.id !== context.auth.uid) {
      await otpRef.delete().catch(() => {});
      throw new functions.https.HttpsError("already-exists", "This phone number is already registered.");
    }
  }

  try {
    let targetUid = context.auth ? context.auth.uid : null;

    if (!targetUid) {
      // 1. Create a Firebase Auth user
      const userParams = {
        phoneNumber: normalized,
        displayName: profile.name.trim()
      };
      if (profile.email && profile.email.trim()) {
        userParams.email = profile.email.trim();
      }
      const userRecord = await admin.auth().createUser(userParams);
      targetUid = userRecord.uid;
    } else {
      // For Google users, link or set their phone number in Firebase Auth (best effort)
      try {
        await admin.auth().updateUser(targetUid, {
          phoneNumber: normalized
        });
      } catch (authErr) {
        console.warn(`[WhatsApp Registration] Could not link phone number in Auth for UID ${targetUid}:`, authErr);
      }
    }

    // Hash the PIN if provided in the profile
    let pinHash = "";
    if (profile.pin) {
      const crypto = require("crypto");
      pinHash = crypto.createHash("sha256").update(profile.pin.toString().trim()).digest("hex");
    }

    // 2. Create the Firestore user profile
    await db.collection("users").doc(targetUid).set({
      email: profile.email ? profile.email.trim() : "",
      name: profile.name.trim(),
      phone: normalized,
      addressLine1: profile.addressLine1 ? profile.addressLine1.trim() : "",
      addressLine2: profile.addressLine2 ? profile.addressLine2.trim() : "",
      addressLine3: profile.addressLine3 ? profile.addressLine3.trim() : "",
      state: profile.state ? profile.state.trim() : "",
      city: profile.city ? profile.city.trim() : "",
      postcode: profile.postcode ? profile.postcode.trim() : "",
      country: profile.country ? profile.country.trim() : "",
      latitude: profile.latitude || null,
      longitude: profile.longitude || null,
      guests: profile.guests || [],
      pinHash: pinHash || null,
      role: "member",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 3. Generate a Firebase custom auth token for login (only if they weren't already signed in)
    let customToken = null;
    if (!context.auth) {
      customToken = await admin.auth().createCustomToken(targetUid);
    }

    // Clean up temporary OTP doc
    await otpRef.delete().catch(() => {});

    console.log(`[WhatsApp Registration] Successfully registered user: ${targetUid}`);
    return {
      success: true,
      token: customToken
    };

  } catch (err) {
    console.error("WhatsApp registration failed:", err);
    throw new functions.https.HttpsError("internal", `Registration failed: ${err.message}`);
  }
});

// ── Get Sangat Presence (Anonymized Coordinates and Counts) ──────────────────────
exports.getSangatPresence = region.https.onCall(async (data, context) => {
  try {
    const snap = await db.collection("users").get();
    const buckets = {};

    snap.forEach(doc => {
      const u = doc.data();
      // Only include users who haven't opted out and have valid coordinates
      if (u.showOnCommunityMap === false) return;
      if (!u.latitude || !u.longitude) return;

      // Round coordinates to 2 decimal places to bucket locations (approx. 1.1km block size)
      const latVal = Math.round(u.latitude * 100) / 100;
      const lngVal = Math.round(u.longitude * 100) / 100;
      const key = `${latVal.toFixed(2)},${lngVal.toFixed(2)}`;

      if (!buckets[key]) {
        buckets[key] = {
          lat: latVal,
          lng: lngVal,
          count: 0
        };
      }
      buckets[key].count += 1;
    });

    return {
      success: true,
      buckets: Object.values(buckets)
    };
  } catch (err) {
    console.error("Failed fetching Sangat presence:", err);
    throw new functions.https.HttpsError("internal", `Failed to get Sangat presence: ${err.message}`);
  }
});

// ─── User-Initiated WhatsApp Login Dictionary & Endpoints ────────────────────

const LOGIN_WORDS = [
  "apple", "banana", "cherry", "grape", "orange", "lemon", "peach", "plum", "berry", "melon",
  "river", "forest", "mountain", "valley", "ocean", "lake", "pond", "stream", "brook", "beach",
  "tree", "flower", "leaf", "grass", "branch", "root", "seed", "bloom", "rose", "lily",
  "cloud", "rain", "snow", "wind", "storm", "frost", "mist", "fog", "hail", "gale",
  "star", "moon", "sun", "sky", "space", "orbit", "comet", "planet", "solar", "lunar",
  "bird", "eagle", "hawk", "owl", "dove", "swan", "duck", "goose", "robin", "lark",
  "lion", "tiger", "bear", "wolf", "fox", "deer", "hare", "rabbit", "horse", "pony",
  "camel", "sheep", "goat", "koala", "panda", "otter", "seal", "whale", "dolphin",
  "house", "garden", "bridge", "tower", "castle", "temple", "palace", "cabin", "cottage", "barn",
  "street", "road", "path", "trail", "lane", "track", "gate", "door", "window", "roof",
  "table", "chair", "desk", "bench", "shelf", "couch", "bed", "lamp", "clock", "watch",
  "gold", "silver", "bronze", "copper", "iron", "steel", "metal", "stone", "rock", "sand",
  "clay", "glass", "wood", "paper", "book", "page", "pen", "pencil", "ink", "brush",
  "coat", "hat", "shoe", "boot", "glove", "scarf", "belt", "ring", "crown", "shield",
  "ship", "boat", "canoe", "raft", "sail", "mast", "anchor", "wheel", "engine", "motor",
  "bread", "milk", "honey", "cheese", "butter", "flour", "grain", "wheat", "rice", "corn",
  "sweet", "salt", "sugar", "spice", "fruit", "juice", "water", "tea", "coffee", "cacao",
  "happy", "bright", "sunny", "clear", "peace", "calm", "quiet", "silent", "gentle", "kind",
  "brave", "strong", "swift", "smart", "wise", "noble", "grand", "great", "proud", "light",
  "paint", "color", "shade", "green", "blue", "yellow", "amber", "white", "black", "brown",
  "rose", "daisy", "tulip", "lotus", "maple", "pine", "cedar", "birch", "willow", "palm",
  "brook", "creek", "fjord", "canyon", "dune", "cliff", "hill", "peak", "summit", "ridge",
  "flame", "spark", "ember", "glow", "shine", "beam", "ray", "flash", "glare", "blaze",
  "bell", "drum", "horn", "pipe", "flute", "harp", "lute", "song", "tune", "chord",
  "kite", "balloon", "bubble", "feather", "shadow", "mirror", "lens", "gem",
  "ruby", "pearl", "opal", "coral", "shell", "snail", "fish", "trout", "salmon", "crab",
  "frog", "toad", "newt", "lizard", "turtle", "squirrel", "badger", "beaver", "bison", "moose",
  "crane", "heron", "stork", "falcon", "sparrow", "finch", "canary", "parrot", "toucan", "macaw"
];

function generateLoginCode() {
  const indices = [];
  while (indices.length < 3) {
    const idx = Math.floor(Math.random() * LOGIN_WORDS.length);
    if (!indices.includes(idx)) {
      indices.push(idx);
    }
  }
  return indices.map(idx => LOGIN_WORDS[idx]).join(" ");
}

// Helper to normalize phone numbers consistently
function normalizePhoneNumber(phone) {
  if (!phone) return "";
  let cleaned = phone.trim().replace(/[^\d+]/g, "");
  if (cleaned && !cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  }
  return cleaned;
}

// ── Request WhatsApp Login Words Callable ─────────────────────────────────────
exports.requestWhatsAppLoginWords = region.https.onCall(async (data) => {
  const { phone } = data || {};
  if (!phone) {
    throw new functions.https.HttpsError("invalid-argument", "Phone number is required");
  }

  const normalized = normalizePhoneNumber(phone);

  // Check if phone number is registered
  const variations = getPhoneVariations(phone);
  const usersSnap = await db.collection("users").where("phone", "in", variations).limit(1).get();
  if (usersSnap.empty) {
    throw new functions.https.HttpsError("not-found", "This phone number is not registered. Redirecting to registration... 🙏");
  }

  const userDoc = usersSnap.docs[0];
  const uid = userDoc.id;

  // Generate 3-word code
  const code = generateLoginCode();

  // Save secure login attempt to Firestore
  const attemptRef = db.collection("login_attempts").doc(normalized);
  await attemptRef.set({
    phone: normalized,
    uid: uid,
    code: code,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 5 * 60 * 1000)), // 5 minutes validity
    status: "pending",
    token: null,
    error: null
  });

  const ourNumber = "+447732241682"; // Dedicated WhatsApp Business number

  return {
    success: true,
    code: code,
    ourNumber: ourNumber
  };
});

// ── WhatsApp Webhook (Meta API) ──────────────────────────────────────────────
exports.whatsappWebhook = functions.region("europe-west2").https.onRequest(async (req, res) => {
  // Webhook verification (GET request)
  if (req.method === "GET") {
    const verifyToken = functions.config().whatsapp?.verify_token || process.env.WHATSAPP_VERIFY_TOKEN || "guruji_verify_token_2026";
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === verifyToken) {
      console.log("[WhatsApp Webhook] Verification successful!");
      return res.status(200).send(challenge);
    } else {
      console.warn("[WhatsApp Webhook] Verification failed due to token mismatch.");
      return res.status(403).send("Forbidden");
    }
  }

  // Incoming webhook payload (POST request)
  if (req.method === "POST") {
    try {
      const entry = req.body.entry;
      if (!entry || !Array.isArray(entry) || entry.length === 0) {
        return res.status(200).send("No entries");
      }

      for (const item of entry) {
        const changes = item.changes;
        if (!changes || !Array.isArray(changes)) continue;

        for (const change of changes) {
          const value = change.value;
          if (!value || !value.messages || !Array.isArray(value.messages)) continue;

          const phoneNumberId = value.metadata ? value.metadata.phone_number_id : null;

          for (const message of value.messages) {
            // We only process incoming text messages
            if (message.type !== "text" || !message.text || !message.text.body) continue;

            const rawSenderPhone = message.from; // e.g. "447732241682"
            const msgBody = message.text.body.trim();

            await handleIncomingWhatsAppMessage(rawSenderPhone, msgBody, phoneNumberId);
          }
        }
      }
      return res.status(200).send("EVENT_RECEIVED");
    } catch (err) {
      console.error("[WhatsApp Webhook] Processing error:", err);
      return res.status(500).send("INTERNAL_SERVER_ERROR");
    }
  }

  return res.status(405).send("Method Not Allowed");
});

// Helper to handle parsing and processing of incoming WhatsApp messages
async function handleIncomingWhatsAppMessage(rawSenderPhone, msgBody, phoneNumberId) {
  const senderPhone = normalizePhoneNumber(rawSenderPhone);
  console.log(`[WhatsApp Webhook] Message received from ${senderPhone}: "${msgBody}"`);

  // Parse: "Login: word1 word2 word3" or "Login word1 word2 word3" (with or without colon)
  const match = msgBody.match(/^(?:Login:?)\s*([a-zA-Z]+)\s+([a-zA-Z]+)\s+([a-zA-Z]+)$/i);

  if (!match) {
    console.log(`[WhatsApp Webhook] Message from ${senderPhone} does not match Login pattern.`);
    await sendWhatsAppMessage(
      phoneNumberId,
      rawSenderPhone,
      "🙏 Jai Guruji! To log into your Guruji Satsangs account, please send the exact 3-word code shown on your screen in this format:\n\n*Login: word1 word2 word3*"
    );
    return;
  }

  const w1 = match[1].toLowerCase();
  const w2 = match[2].toLowerCase();
  const w3 = match[3].toLowerCase();
  const receivedCode = `${w1} ${w2} ${w3}`;

  // Fetch active attempt for this phone number
  const attemptRef = db.collection("login_attempts").doc(senderPhone);
  const attemptSnap = await attemptRef.get();

  if (!attemptSnap.exists) {
    console.log(`[WhatsApp Webhook] No active login attempt found for ${senderPhone}.`);
    await sendWhatsAppMessage(
      phoneNumberId,
      rawSenderPhone,
      `❌ Login Failed. We couldn't find any active login request for your number (${senderPhone}). Please initiate a login request on the app first, then send the code. 🙏`
    );
    return;
  }

  const attemptData = attemptSnap.data();

  // 1. Expiration check (5 minutes)
  if (attemptData.expiresAt.toDate().getTime() < Date.now()) {
    console.log(`[WhatsApp Webhook] Login attempt for ${senderPhone} has expired.`);
    await attemptRef.update({
      status: "failed",
      error: "The login code has expired."
    });
    await sendWhatsAppMessage(
      phoneNumberId,
      rawSenderPhone,
      "❌ Login Failed. The code you sent has expired (5-minute limit). Please return to the app, request a new code, and try again. 🙏"
    );
    return;
  }

  // 2. Already processed check
  if (attemptData.status !== "pending") {
    console.log(`[WhatsApp Webhook] Attempt for ${senderPhone} is already processed: ${attemptData.status}`);
    await sendWhatsAppMessage(
      phoneNumberId,
      rawSenderPhone,
      "ℹ️ This login request has already been processed. Please return to the app or start a new request."
    );
    return;
  }

  // 3. Compare code
  const expectedCode = attemptData.code.toLowerCase();
  if (receivedCode !== expectedCode) {
    console.log(`[WhatsApp Webhook] Code mismatch for ${senderPhone}. Expected: "${expectedCode}", Received: "${receivedCode}"`);
    await attemptRef.update({
      status: "failed",
      error: `Code mismatch. Expected "${expectedCode}", received "${receivedCode}".`
    });

    // Provide detailed typo feedback
    await sendWhatsAppMessage(
      phoneNumberId,
      rawSenderPhone,
      `❌ Login Failed.\n\nWe received: "${msgBody}"\nWe expected: "Login: ${attemptData.code}"\n\nPlease check the spelling of your 3 words and try again! 🙏`
    );
    return;
  }

  // Success! Generate custom auth token and update status
  try {
    const customTokenPolling = await admin.auth().createCustomToken(attemptData.uid);
    const customTokenLink = await admin.auth().createCustomToken(attemptData.uid);
    const magicCode = generateMagicCode();
    
    await attemptRef.update({
      status: "approved",
      token: customTokenPolling,
      magicCode: magicCode,
      customTokenLink: customTokenLink
    });

    console.log(`[WhatsApp Webhook] Successfully authenticated ${senderPhone} (magicCode: ${magicCode}).`);

    const magicLink = `https://gurujisatsangs.com/#/login?magic=${magicCode}`;

    // Reply with confirmation and magic link on a clean line (no trailing punctuation to break the link)
    await sendWhatsAppMessage(
      phoneNumberId,
      rawSenderPhone,
      `✅ Jai Guruji! Login successful. Your browser screen has been unlocked.\n\nIf you are on a mobile device, tap the link below to enter the app directly:\n${magicLink}\n\nShukrana Guruji! 🙏`
    );
  } catch (err) {
    console.error(`[WhatsApp Webhook] Custom token generation failed for ${senderPhone}:`, err);
    await attemptRef.update({
      status: "failed",
      error: "Internal authentication error."
    });
    await sendWhatsAppMessage(
      phoneNumberId,
      rawSenderPhone,
      "❌ System Error. We encountered an issue generating your login session. Please contact the admin at admin.guruji.satsangs@gmail.com. 🙏"
    );
  }
}

// Outbound Message sender using Meta Graph API
async function sendWhatsAppMessage(phoneNumberId, toPhone, text) {
  const accessToken = functions.config().whatsapp?.access_token || process.env.WHATSAPP_ACCESS_TOKEN;
  const defaultPhoneId = functions.config().whatsapp?.phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const phoneId = phoneNumberId || defaultPhoneId;

  if (!accessToken || !phoneId) {
    console.error("Missing WhatsApp Meta credentials (access_token or phone_number_id). Message skipped:", text);
    return;
  }

  const url = `https://graph.facebook.com/v20.0/${phoneId}/messages`;
  const body = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: toPhone,
    type: "text",
    text: {
      preview_url: true,
      body: text
    }
  };

  try {
    const res = await postRequest(
      url,
      { "Authorization": `Bearer ${accessToken}` },
      body
    );
    console.log(`[WhatsApp Outbound] Successfully sent message to ${toPhone}. Response: ${res}`);
  } catch (err) {
    console.error(`[WhatsApp Outbound] Failed to send message to ${toPhone}:`, err);
  }
}

function generateMagicCode() {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 24; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ── Redeem Magic Code Callable ────────────────────────────────────────────────
exports.redeemMagicCode = region.https.onCall(async (data) => {
  const { magicCode } = data || {};
  if (!magicCode) {
    throw new functions.https.HttpsError("invalid-argument", "Magic code is required");
  }

  // Look up in login_attempts collection for matching magicCode
  const querySnap = await db.collection("login_attempts")
    .where("magicCode", "==", magicCode.trim())
    .limit(1)
    .get();

  if (querySnap.empty) {
    throw new functions.https.HttpsError("not-found", "Invalid or expired login link.");
  }

  const attemptDoc = querySnap.docs[0];
  const attemptData = attemptDoc.data();

  // Expiration check
  if (attemptData.expiresAt.toDate().getTime() < Date.now()) {
    // Clean up expired doc
    await attemptDoc.ref.delete().catch(() => {});
    throw new functions.https.HttpsError("deadline-exceeded", "This login link has expired.");
  }

  if (attemptData.status !== "approved" || !attemptData.customTokenLink) {
    throw new functions.https.HttpsError("failed-precondition", "This login request is not approved yet.");
  }

  const customToken = attemptData.customTokenLink;

  // Enforce single-use: clear magicCode and customTokenLink from document
  await attemptDoc.ref.update({
    magicCode: admin.firestore.FieldValue.delete(),
    customTokenLink: admin.firestore.FieldValue.delete()
  }).catch((err) => {
    console.error("Failed to delete magicCode:", err);
  });

  console.log(`[Magic Code Redemptions] Successfully redeemed magic code for phone ${attemptData.phone}`);

  return {
    success: true,
    token: customToken
  };
});



