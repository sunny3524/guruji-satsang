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
          <img src="https://guruji-satsang-b650a.web.app/guruji-01.png" width="100" style="border-radius:50%;border:2px solid #d4972a;" alt="Guruji"/>
          <p style="color:#d4972a;letter-spacing:0.2em;font-size:11px;margin-top:12px;">OM NAMAH SHIVAY SHIVJI SADA SAHAY</p>
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

// ── 1a. Sync phone updates to all attendee records on user profile change ─────
exports.onUserUpdated = region.firestore
  .document("users/{uid}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const uid = context.params.uid;

    if (before.phone !== after.phone) {
      const newPhone = after.phone || "";
      console.log(`User ${uid} phone changed from ${before.phone} to ${newPhone}. Syncing attendees...`);

      const attendeesSnap = await db.collectionGroup("attendees").where("userUid", "==", uid).get();
      const batch = db.batch();
      attendeesSnap.docs.forEach(doc => {
        batch.update(doc.ref, { userPhone: newPhone });
      });
      await batch.commit();
      console.log(`Synced ${attendeesSnap.size} attendee documents for user ${uid}.`);
    }
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

// ── 7. Admin: migration HTTP trigger to standardise phone formats to E.164 (+44) ─
exports.migratePhoneNumbers = region.https.onRequest(async (req, res) => {
  const results = {
    usersAttempted: 0,
    usersMigrated: 0,
    attendeesAttempted: 0,
    attendeesMigrated: 0,
    logs: []
  };

  const normalizeToE164 = (rawPhone) => {
    if (!rawPhone) return "";
    let cleaned = rawPhone.trim().replace(/[^\d+]/g, "");
    if (cleaned.startsWith("+00")) {
      cleaned = "+" + cleaned.substring(3);
    }
    let digits = cleaned.replace(/\D/g, "");
    if (digits.startsWith("00")) {
      digits = digits.substring(2);
    }
    if (digits.startsWith("0")) {
      digits = "44" + digits.substring(1);
    }
    if (digits.startsWith("440")) {
      digits = "44" + digits.substring(3);
    }
    if (digits.startsWith("7") && digits.length === 10) {
      digits = "44" + digits;
    }
    return "+" + digits;
  };

  try {
    // 1. Migrate users collection
    const usersSnap = await db.collection("users").get();
    for (const doc of usersSnap.docs) {
      const data = doc.data();
      const uid = doc.id;
      let rawPhone = data.phone;
      if (!rawPhone) continue;

      results.usersAttempted++;
      const cleanPhone = normalizeToE164(rawPhone);

      if (cleanPhone !== rawPhone) {
        await db.collection("users").doc(uid).update({ phone: cleanPhone });
        results.usersMigrated++;
        results.logs.push(`User ${data.name || uid}: ${rawPhone} -> ${cleanPhone}`);
      }
    }

    // 2. Migrate attendees subcollections (using collectionGroup)
    const attendeesSnap = await db.collectionGroup("attendees").get();
    for (const doc of attendeesSnap.docs) {
      const data = doc.data();
      const attendeeRef = doc.ref;
      let rawPhone = data.userPhone;
      if (!rawPhone) continue;

      results.attendeesAttempted++;
      const cleanPhone = normalizeToE164(rawPhone);

      if (cleanPhone !== rawPhone) {
        await attendeeRef.update({ userPhone: cleanPhone });
        results.attendeesMigrated++;
        results.logs.push(`Attendee ${data.userName || doc.id}: ${rawPhone} -> ${cleanPhone}`);
      }
    }

    res.status(200).json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
