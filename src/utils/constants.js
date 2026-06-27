// ─── Shared Constants & Helpers ────────────────────────────────────────────────
// Shared across components and pages for internationalization.

export const C = {
  bg: "var(--color-bg)",
  card: "var(--color-card)",
  border: "var(--color-border)",
  gold: "var(--color-gold)",
  saffron: "var(--color-saffron)",
  cream: "var(--color-cream)",
  muted: "var(--color-muted)",
  red: "var(--color-red)",
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
    icon: "🏠",
    title: "Setting Up Your Darbar",
    description: "The Darbar is the spiritual core of the satsang and represents Guruji's divine presence. It should be clean, elegant, and devoid of excessive or ostentatious display.",
    items: [
      "The Venue: Choose a clean, quiet area of the venue dedicated as Guruji's Darbar (spiritual court).",
      "The Seating (Asan): Set up a clean, slightly elevated chowki, small sofa, or chair designated strictly for Guruji. Cover it with a fresh, clean cloth, a chola (if available), and place a small neat towel on the right side or armrest.",
      "The Swaroop: Place Guruji’s sacred Swaroop (photograph) reverently at the center. Only Guruji’s Swaroop (or alongside Shiv Pariwar, Guru Nanak Dev Ji) and Ganesh Ji is permitted in the Darbar. No other decorative elements should block or overshadow the Swaroop.",
      "The Jyoti (Diya): Light a clean ghee or oil diya (Akhand Jyot) exactly at the designated start time of the satsang to welcome His divine presence. Ensure any candles or lamps used are stable and safe for devotees bowing down.",
      "Fragrance & Aesthetics: Use fresh flowers (roses, marigolds) for minimal decoration. Light mild dhoop or incense. Avoid over-powering perfumes or harsh, flashing LED lights; prefer warm, soft, and tranquil lighting.",
      "Sangat Seating: Provide floor seating on rugs or cushions. Chairs should be available for elderly and physically disabled sangat."
    ]
  },
  {
    icon: "⏰",
    title: "Timings & Order of Service",
    description: "An authentic house satsang is a structured, disciplined spiritual journey designed to mirror the sacred protocols of Bade Mandir. It is suggested that the entire satsang spans 2 hours.",
    items: [
      "Punctual Commencement: The satsang begins exactly at the scheduled time. The path to the Darbar is cleared, the Jyoti (holy lamp) is lit, and the satsangs starts by playing the Welcome Band followed by Ek Onkar. Do not play the welcome band on Maha Samadhi Satsang.",
      "Gurbani Shabad & Bhajans (~1 Hour 30 Mins): This phase is dedicated to deep, inward reflection. Play only divine Shabads selected by Guruji Maharaj himself or specific devotional bhajans authorized and played at Bade Mandir are permitted. The volume should be kept at an optimum level to facilitate meditation.",
      "Mantra Jaap (~ 10-15 Minutes): The entire sangat joins in collective, synchronized chanting of Guruji's powerful Mantra Jaap: \"Om Namah Shivay Shivji Sada Sahay, Om Namah Shivay Guruji Sada Sahay\"",
      "Guruji's Aarti (~10 Minutes): The satsang culminates with closing prayers and the Shivji Aarti. Devotees stand in absolute reverence, and minimal flower petals or small Bhog (sweets) may be offered.",
      "Satsang Sharing (~15-30 Minutes): Members of the sangat are invited to share their personal experiences, blessings, and expressions of love for Guruji. Speakers should speak clearly, keep their accounts focused strictly on their own experiences and Guruji's grace, and maintain humility without extending into socializing.",
      "Distribution of Prasadam (Final Phase): The sacred distribution flows in a precise, traditional sequence. Devotees remain seated while Sewadars respectfully serve Jal Prasad (blessed water), Chai Prasad (blessed herbal tea), and finally, the wholesome Langar Prasad."
    ]
  },
  {
    icon: "🔇",
    title: "Conduct & Discipline",
    description: "Guruji emphasized that satsangs are a place for cleansing the soul, not for socializing. The environment must remain a silent, meditative sanctuary.",
    items: [
      "Total Silence & No Socializing: Devotees must refrain from greetings (\"Hi/Hello\"), chatting, or whispering upon arrival, during service, or during Langar. True connection with Guruji is built individually through silent meditation. Greet the host only after the entire satsang concludes.",
      "Device Blackout: Mobile phones must be completely switched off or put on strict silent mode before entering the hall. Photography or videography of the Darbar during the session is strictly forbidden.",
      "Child Discipline: Parents bringing children must ensure they remain seated beside them quietly. Children are strictly restricted from doing Sewa (serving), and no children are allowed near the kitchen area for safety and decorum.",
      "Punctuality & Etiquette: Devotees should arrive 15 minutes prior. Latecomers must sit quietly in the back rows to minimize disruption and avoid disturbing others who are in deep meditation.",
      "Dress Code: Wear modest, clean, and respectable clothing to Satsang. Women should cover their heads with a dupatta/scarf, and men are also encouraged to keep heads covered as a mark of respect.",
      "Darbar Etiquette: Do not touch Guruji's Swaroop or Charans physically — direct bowing from a respectful distance is the custom.",
      "The Sanctity of Prasadam: Jal, Chai, and Langar Prasad carry immense divine blessings. Every single drop and crumb must be consumed; leaving leftovers on the plate or wasting Prasad is strictly forbidden.",
      "No Packaging or Takeaways: Langar must be eaten at the venue. Packing leftover Langar Prasad to take home is prohibited unless explicitly offered by the host for an ailing family member or elderly person at home.",
      "Sewa Conduct: Sewadars must be exceptionally humble, quiet, and polite. Sewa should be executed gracefully by family members or the sangat—never handed over to domestic help or servants who are unaware of Guruji's customs.",
      "Immediate Departure (Aagya): After consuming Langar Prasad, devotees should bow to the Darbar, take Aagya (permission to leave) from GuruJi, and head straight back home to retain the divine vibrations of the satsang, avoiding post-event gossip.",
      "No Commercial or Business Activities: Promotional material, business networking, or financial collections during or around the satsang are strictly forbidden."
    ]
  }
];

export function normalizePhoneWithCountry(rawPhone, countryName) {
  if (!rawPhone) return "";
  let clean = rawPhone.trim().replace(/\s+/g, "").replace(/[-()]/g, "");
  
  let hasPlus = clean.startsWith("+");
  if (hasPlus) {
    clean = clean.slice(1);
  }
  
  if (clean.startsWith("00")) {
    clean = clean.slice(2);
    hasPlus = true;
  }
  
  const dialCodes = Object.values(COUNTRY_DIAL_CODES).sort((a, b) => b.length - a.length);
  let dialCode = "";
  
  for (const code of dialCodes) {
    if (clean.startsWith(code)) {
      dialCode = code;
      clean = clean.slice(code.length);
      // Remove duplicate dial code if it was prepended or typed twice (e.g. +44447424772861)
      if (clean.startsWith(code) && (clean.length - code.length) >= 8) {
        clean = clean.slice(code.length);
      }
      break;
    }
  }
  
  if (!dialCode && countryName) {
    dialCode = COUNTRY_DIAL_CODES[countryName] || "";
  }
  
  if (clean.startsWith("0")) {
    clean = clean.slice(1);
  }
  
  if (dialCode) {
    return `+${dialCode}${clean}`;
  }
  
  return (hasPlus ? "+" : "") + clean;
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
