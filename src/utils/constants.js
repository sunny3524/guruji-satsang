// ─── Shared Constants & Helpers ────────────────────────────────────────────────
// Shared across components and pages for internationalization.

export const C = {
  bg: "#1a0800", card: "#270e03", border: "#5c2a0a",
  gold: "#d4972a", saffron: "#e06b10", cream: "#f5e8d0",
  muted: "#9c7050", red: "#7a1a0a",
};

export const fmtDate = d => new Date(d + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
export const fmtTime = t => { if (!t) return ""; const [h, m] = t.split(":"); const ap = +h >= 12 ? "PM" : "AM"; return `${((+h % 12) || 12).toString().padStart(2, "0")}:${m} ${ap}`; };

export const COUNTRY_DIAL_CODES = {
  "United Kingdom": "44", "India": "91", "United States": "1", "Canada": "1",
  "Australia": "61", "New Zealand": "64", "United Arab Emirates": "971",
  "Singapore": "65", "South Africa": "27", "Germany": "49", "France": "33",
  "Ireland": "353", "Kenya": "254", "Netherlands": "31", "Switzerland": "41",
  "Malaysia": "60", "Hong Kong": "852"
};

export const SANGAT_COUNTRIES = [
  "United Kingdom", "India", "United States", "Canada", "Australia", 
  "New Zealand", "United Arab Emirates", "Singapore", "South Africa", 
  "Germany", "France", "Ireland", "Kenya", "Netherlands", "Switzerland", 
  "Malaysia", "Hong Kong", "Other"
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
  "Hong Kong": "85291234567"
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
