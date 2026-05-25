// ─── Guruji's Divine Vachans (Bani) — Map & Helper ──────────────────────────

export const GURUJI_VACHANS = [
  {
    punjabi: "Ahankaar rab di raah te chalan nai denda.",
    english: "Ego does not let you walk on the path of God."
  },
  // Commandments Part 1
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
  // Commandments Part 2
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
  // Commandments Part 3
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

export function getRandomVachan() {
  const randomIndex = Math.floor(Math.random() * GURUJI_VACHANS.length);
  return GURUJI_VACHANS[randomIndex];
}
