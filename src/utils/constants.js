// ─── Shared Constants & Helpers ────────────────────────────────────────────────
// Shared across components and pages for internationalization.

export const C = {
  bg: "#1a0800", card: "#270e03", border: "#5c2a0a",
  gold: "#d4972a", saffron: "#e06b10", cream: "#fdfbf7",
  muted: "#9c7050", red: "#722f37",
};

export const fmtDate = d => new Date(d + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
export const fmtTime = t => { if (!t) return ""; const [h, m] = t.split(":"); const ap = +h >= 12 ? "PM" : "AM"; return `${((+h % 12) || 12).toString().padStart(2, "0")}:${m} ${ap}`; };

export const COUNTRY_DIAL_CODES = {
  "United Kingdom": "44", "India": "91", "United States": "1", "Canada": "1",
  "Australia": "61", "New Zealand": "64", "United Arab Emirates": "971",
  "Singapore": "65", "South Africa": "27", "Germany": "49", "France": "33",
  "Ireland": "353", "Kenya": "254", "Netherlands": "31", "Switzerland": "41",
  "Malaysia": "60", "Hong Kong": "852", "Bahrain": "973", "Denmark": "45",
  "Ghana": "233", "Hungary": "36", "Indonesia": "62", "Kuwait": "965",
  "Luxembourg": "352", "Oman": "968", "Pakistan": "92", "Qatar": "974",
  "Saudi Arabia": "966", "Spain": "34", "Sweden": "46", "Thailand": "66"
};

export const SANGAT_COUNTRIES = [
  "India", "United Kingdom", "United States", "Canada", "Australia", 
  "United Arab Emirates", "Thailand", "Singapore", "Malaysia", "Saudi Arabia", 
  "Qatar", "New Zealand", "Kuwait", "Oman", "Ireland", "Bahrain", 
  "Hong Kong", "South Africa", "Kenya", "Spain", "Indonesia", 
  "Netherlands", "Germany", "Ghana", "Pakistan", "France", "Sweden", 
  "Switzerland", "Denmark", "Luxembourg", "Hungary", "Other"
];

export const COUNTRY_PHONE_EXAMPLES = {
  "United Kingdom": "447700900077",
  "India": "919876543210",
  "United States": "12025550143",
  "Canada": "12025550143",
  "Australia": "61491570156",
  "New Zealand": "6421345678",
  "United Arab Emirates": "971501234567",
  "Singapore": "6581234567",
  "South Africa": "27821234567",
  "Germany": "4915123456789",
  "France": "33612345678",
  "Ireland": "353871234567",
  "Kenya": "254712345678",
  "Netherlands": "31612345678",
  "Switzerland": "41781234567",
  "Malaysia": "60123456789",
  "Hong Kong": "85291234567",
  "Bahrain": "97339123456",
  "Denmark": "4520123456",
  "Ghana": "233241234567",
  "Hungary": "36201234567",
  "Indonesia": "628123456789",
  "Kuwait": "96551234567",
  "Luxembourg": "352621123456",
  "Oman": "96891234567",
  "Pakistan": "923001234567",
  "Qatar": "97433123456",
  "Saudi Arabia": "966501234567",
  "Spain": "34612345678",
  "Sweden": "46701234567",
  "Thailand": "66812345678"
};

export const STANDARD_SEVAS = [
  { id: "s1", icon: "🍲", name: "Langar Distribution Seva", desc: "Serving Langar Prashad during the satsang" },
  { id: "s2", icon: "🧑🏽‍🍳", name: "Langar Preparation Seva", desc: "Preparing Langar either in your house or host's, see details" },
  { id: "s3", icon: "🗑️", name: "Disposable Collection Seva", desc: "Collecting the disposables during the satsang" },
  { id: "s4", icon: "🌸", name: "Decoration Seva", desc: "Darbar decoration & fresh flowers" },
  { id: "s5", icon: "☕️", name: "Chai Prasad Distribution Seva", desc: "Serving chai prasad during the satsang" },
  { id: "s6", icon: "🚗", name: "Transport Seva", desc: "Pickup & drop-off coordination or Parking Management" },
  { id: "s7", icon: "🎛️", name: "AV Seva", desc: "Bringing audio/visual equipment and setup for the satsang" },
  { id: "s8", icon: "🧹", name: "Cleaning Seva", desc: "Pre/post event cleaning" },
  { id: "s9", icon: "👶", name: "Children Seva", desc: "Child care & quiet activities" },
];

export const GUIDELINES = [
  {
    icon: "🏠", title: "Setting Up Your Darbar", items: [
      "Choose a clean, quiet area of the venue dedicated as Guruji's Darbar (spiritual court).",
      "Place Guruji's Swaroop (photograph) on a clean chair or elevated table draped with a fresh white or saffron cloth.",
      "Light a single diya (oil lamp) or Akhand Jyot near the Swaroop before the sangat arrives.",
      "Arrange fresh flowers — roses or lilies are ideal — near the photograph.",
      "Provide floor seating on rugs or cushions. Chairs should be available for elderly sangat.",
      "Ensure the venue is clean and fragrant with incense before the first sangat arrives.",
    ]
  },
  {
    icon: "⏰", title: "Timings & Order of Service", items: [
      "Begin punctually at the stated time — do not wait for late arrivals. Discipline in timings is Guruji's teaching.",
      "Offer Jal Prasad (water) to all sangat at the entrance on arrival.",
      "Shabad Gurbani should be played for 90–120 minutes, including Mantra Jaap and Aarti.",
      "Chai Prasad and snack prasad should be served in 15-minute intervals, no more than 4 times, finishing 30 minutes before the Satsang ends.",
      "Mantra Jaap is followed by Shivji Ki Aarti (approximately 5 minutes).",
      "Satsang sharing follows the Aarti. If it exceeds 30 minutes, begin serving Langar Prasad alongside.",
      "Kada Prasad is served after Satsang sharing, preferably placed in hands.",
      "All sangat should take Aagya from Guruji and head home directly after Langar Prasad.",
    ]
  },
  {
    icon: "🔇", title: "Conduct & Discipline", items: [
      "Switch off or silence all mobile phones before entering the Satsang hall.",
      "Maintain noble silence throughout. The direct connection with Guruji is built through silent meditation.",
      "Do not socialise or greet the host during the Satsang — reserve all greetings until after.",
      "Wear modest, clean and respectable clothing to Satsang.",
      "Do not touch Guruji's Swaroop or Charans physically — direct bowing from a respectful distance is custom.",
      "Women should cover their heads with a dupatta/scarf, and men are also encouraged to keep heads covered as a mark of respect.",
    ]
  }
];

export function normalizePhoneWithCountry(rawPhone, countryName) {
  if (!rawPhone) return "";
  let clean = rawPhone.trim().replace(/\s+/g, "").replace(/[-()]/g, "");
  
  if (clean.startsWith("+")) {
    return clean;
  }
  
  const dialCode = COUNTRY_DIAL_CODES[countryName];
  if (!dialCode) {
    if (clean.startsWith("00")) {
      return "+" + clean.slice(2);
    }
    return clean;
  }
  
  if (clean.startsWith("00")) {
    return "+" + clean.slice(2);
  }
  
  if (clean.startsWith("0")) {
    clean = clean.slice(1);
  }
  
  if (clean.startsWith(dialCode)) {
    return "+" + clean;
  }
  
  return `+${dialCode}${clean}`;
}

export function estimateCountryFromTimezone() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return "India";
    
    const tzLower = tz.toLowerCase();
    
    // United Kingdom & Ireland
    if (tzLower.includes("london") || tzLower.includes("belfast") || tzLower.includes("dublin") || tzLower === "gb" || tzLower === "gmt") {
      return "United Kingdom";
    }
    // India
    if (tzLower.includes("calcutta") || tzLower.includes("kolkata") || tzLower.includes("delhi") || tzLower.includes("mumbai") || tzLower.includes("chennai")) {
      return "India";
    }
    // Canada
    if (
      tzLower.includes("toronto") || tzLower.includes("vancouver") || 
      tzLower.includes("montreal") || tzLower.includes("edmonton") || 
      tzLower.includes("winnipeg") || tzLower.includes("halifax") || 
      tzLower.includes("st_johns") || tzLower.includes("ottawa")
    ) {
      return "Canada";
    }
    // United States (Any other America/ timezone)
    if (tzLower.startsWith("america/")) {
      return "United States";
    }
    // Australia & New Zealand
    if (tzLower.startsWith("australia/") || tzLower.includes("sydney") || tzLower.includes("melbourne") || tzLower.includes("brisbane") || tzLower.includes("adelaide") || tzLower.includes("perth")) {
      return "Australia";
    }
    if (tzLower.startsWith("pacific/auckland") || tzLower.includes("auckland") || tzLower.includes("wellington")) {
      return "New Zealand";
    }
    // UAE
    if (tzLower.includes("dubai") || tzLower.includes("abu_dhabi")) {
      return "United Arab Emirates";
    }
    // Singapore
    if (tzLower.includes("singapore")) {
      return "Singapore";
    }
    // Malaysia
    if (tzLower.includes("kuala_lumpur")) {
      return "Malaysia";
    }
    // Thailand
    if (tzLower.includes("bangkok")) {
      return "Thailand";
    }
    // Middle East
    if (tzLower.includes("riyadh")) return "Saudi Arabia";
    if (tzLower.includes("qatar") || tzLower.includes("doha")) return "Qatar";
    if (tzLower.includes("kuwait")) return "Kuwait";
    if (tzLower.includes("muscat")) return "Oman";
    if (tzLower.includes("bahrain")) return "Bahrain";
    // Europe
    if (tzLower.includes("paris")) return "France";
    if (tzLower.includes("berlin") || tzLower.includes("munich") || tzLower.includes("frankfurt")) return "Germany";
    if (tzLower.includes("amsterdam")) return "Netherlands";
    if (tzLower.includes("madrid") || tzLower.includes("barcelona")) return "Spain";
    if (tzLower.includes("zurich") || tzLower.includes("geneva")) return "Switzerland";
    if (tzLower.includes("stockholm")) return "Sweden";
    if (tzLower.includes("copenhagen")) return "Denmark";
    if (tzLower.includes("brussels")) return "Belgium";
    if (tzLower.includes("vienna")) return "Austria";
    if (tzLower.includes("budapest")) return "Hungary";
    if (tzLower.includes("luxembourg")) return "Luxembourg";
    // Africa
    if (tzLower.includes("johannesburg")) return "South Africa";
    if (tzLower.includes("nairobi")) return "Kenya";
    // Asia
    if (tzLower.includes("hong_kong")) return "Hong Kong";
    if (tzLower.includes("jakarta")) return "Indonesia";
    if (tzLower.includes("karachi") || tzLower.includes("islamabad")) return "Pakistan";
    if (tzLower.includes("accra")) return "Ghana";
  } catch (e) {
    // ignore and fallback
  }
  return "India"; // Default fallback
}
