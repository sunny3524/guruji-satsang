# Guruji Satsang — Firebase Setup & Deployment Guide
# OM NAMAH SHIVAY GURUJI SADA SAHAY 🙏

---

## What's in this project

```
guruji-satsang/
├── src/
│   ├── App.jsx                  ← Main app (all views, UI)
│   ├── main.jsx                 ← React entry point
│   ├── firebase/
│   │   ├── config.js            ← YOUR Firebase credentials go here
│   │   ├── auth.js              ← Login / register / logout
│   │   └── firestore.js         ← All database operations
│   └── hooks/
│       └── useAuth.jsx          ← Auth context (current user)
├── functions/
│   ├── index.js                 ← Cloud Functions (email notifications)
│   └── package.json
├── firestore.rules              ← Database security rules
├── firestore.indexes.json       ← Database indexes
├── firebase.json                ← Firebase project config
├── package.json
├── vite.config.js
└── index.html
```

---

## STEP 1 — Create a Firebase Project

1. Go to https://console.firebase.google.com
2. Click **"Add project"**
3. Name it `guruji-satsang` (or any name you prefer)
4. Disable Google Analytics (optional)
5. Click **"Create project"**

---

## STEP 2 — Enable Firebase Services

### Authentication
1. In Firebase Console → **Authentication** → **Get started**
2. Click **Sign-in method** → Enable **Email/Password**
3. Save

### Firestore Database
1. In Firebase Console → **Firestore Database** → **Create database**
2. Choose **Start in production mode**
3. Select region: **eur3 (Europe)** or closest to your users
4. Click **Done**

### Cloud Functions
1. In Firebase Console → **Functions** → **Get started**
2. You need to upgrade to the **Blaze plan** (pay-as-you-go)
   - Free tier covers ~2 million invocations/month — more than enough
   - You need a credit card but costs will be negligible for this usage

---

## STEP 3 — Get your Firebase Config

1. Firebase Console → **Project Settings** (gear icon) → **General**
2. Scroll to **"Your apps"** → Click **"</> Web"**
3. Register the app (give it any nickname)
4. Copy the `firebaseConfig` object
5. Open `src/firebase/config.js` and replace the placeholder values:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",               // ← paste your values
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123",
};
```

---

## STEP 4 — Install dependencies

```bash
# Install frontend dependencies
npm install

# Install Cloud Functions dependencies
cd functions && npm install && cd ..
```

---

## STEP 5 — Install Firebase CLI & login

```bash
npm install -g firebase-tools
firebase login
firebase use --add        # select your project
```

---

## STEP 6 — Set up email credentials for notifications

The Cloud Functions use Gmail (or you can swap for SendGrid).

### Gmail option (easiest):
1. Enable 2-Factor Authentication on your Gmail account
2. Go to https://myaccount.google.com/apppasswords
3. Generate an App Password for "Mail"
4. Run:

```bash
firebase functions:config:set email.user="youraddress@gmail.com" email.pass="your-16-char-app-password"
```

### SendGrid option (better for production):
1. Create a free account at https://sendgrid.com
2. Generate an API key
3. In `functions/index.js`, replace nodemailer with `@sendgrid/mail`:
   ```js
   const sgMail = require('@sendgrid/mail');
   sgMail.setApiKey(functions.config().sendgrid.key);
   ```
4. Run: `firebase functions:config:set sendgrid.key="SG.xxx"`

---

## STEP 7 — Deploy everything

```bash
# Deploy Firestore rules + indexes
firebase deploy --only firestore

# Deploy Cloud Functions
firebase deploy --only functions

# Build and deploy the frontend
npm run build
firebase deploy --only hosting
```

Your app will be live at: `https://YOUR_PROJECT_ID.web.app`

---

## STEP 8 — Set up your first Admin user

1. Register normally through the app to create your account
2. In Firebase Console → **Firestore** → `users` collection
3. Find your user document (by name/email)
4. Edit the `role` field and set it to `"admin"`

You will now see the **⚙ Admin** menu item when logged in.

---

## Email Notifications Triggered Automatically

| Trigger | Who receives email |
|---|---|
| New user registers | New user (welcome email) |
| Attendance registered | Attendee (confirmation) + Organiser (new registration alert) |
| Seva enrolled | Sevadar (seva confirmation) |
| Satsang reaches capacity | Organiser (full alert) |
| Day before satsang | All registered attendees (reminder) |
| Admin sends broadcast | All registered members |

---

## Running locally for development

```bash
npm run dev
# App runs at http://localhost:3000
```

For local Functions emulation:
```bash
firebase emulators:start
```

---

## Firestore Data Structure

```
users/
  {uid}/
    name, email, phone, address, city, postcode, role, createdAt

satsangs/
  {satsangId}/
    title, date, time, city, postcode, address, description
    maxAttendees, attendeeCount, status
    organizerUid, organizerName, organizerEmail, organizerPhone
    sevas: [{ id, needed, enrolled: [{uid, name}] }]
    createdAt, updatedAt
    attendees/
      {uid}/
        userUid, userName, userEmail, userPhone, guests, registeredAt
```

---

## Security

- Passwords handled entirely by Firebase Authentication (never stored in Firestore)
- Firestore rules prevent users from reading/writing other users' data
- Role changes can only be made by admins
- Cloud Functions verify admin role server-side before executing sensitive operations

---

## Shukrana Guruji 🙏
