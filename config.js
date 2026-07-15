// Sternen-Challenge — Konfiguration
// Testphase: TEST_MODE = true (ignoriert Start-/Enddatum, zeigt immer den heutigen Aufgaben-Tag)
// Vor dem echten Rollout an die Kinder (Start 2026-07-20) auf false setzen.
const TEST_MODE = true;

const CHALLENGE = {
  startDate: "2026-07-20", // Tag 1 der echten Challenge
  totalDays: 21,           // 3 Wochen inkl. Wochenenden
  starValueCHF: 0.30,
};

// Aktives Kind für diesen Build. Für den Test nur Elias.
const KID = {
  id: "elias",
  name: "Elias",
  emoji: "🚵",
  colorPrimary: "#1a6f8f",
  colorAccent: "#0f4c5c",
  colorBg: "#eaf6fa",
};

// Hauptaufgaben — Reihenfolge wie im Original-PDF. Max 9 Sterne/Tag.
const TASKS = [
  {
    id: "lesen",
    label: "10 Minuten lesen mit Mama oder Papa",
    hint: "Am besten zwischen 8:00 und 9:00 Uhr",
    stars: 2,
    mandatory: true,
  },
  {
    id: "waesche",
    label: "Schmutzwäsche in den Wäschekorb",
    stars: 1,
  },
  {
    id: "geschirr",
    label: "Geschirr aus Zimmer, Wohnbereich und Fernsehzimmer in die Küche bringen",
    hint: "Falls leer: in die Spülmaschine einräumen",
    stars: 1,
  },
  {
    id: "schuhe",
    label: "Schuhe und Jacke ordentlich versorgen",
    stars: 1,
  },
  {
    id: "wohnbereich",
    label: "Wohnbereich ordentlich verlassen (Spielzeug wegräumen)",
    stars: 1,
  },
  {
    id: "zimmer",
    label: "Eigenes Zimmer ordentlich aufräumen",
    stars: 1,
  },
  {
    id: "bonus_geholfen",
    label: "Bonus: ohne Aufforderung geholfen",
    stars: 1,
  },
  {
    id: "alles_erledigt",
    label: "Alle Aufgaben vollständig erledigt",
    stars: 1,
    auto: true, // wird automatisch vergeben, sobald dependsOn erfüllt ist
    dependsOn: ["lesen", "waesche", "geschirr", "schuhe", "wohnbereich", "zimmer"],
  },
];

// Extra-Bonusaufgaben — zählen zusätzlich zu den 9 Stern-Maximum der Hauptliste.
const BONUS_TASKS = [
  {
    id: "spuelmaschine",
    label: "Spülmaschine ausräumen",
    maxStars: 3,
  },
  {
    id: "waesche_einraeumen",
    label: "Saubere Wäsche in den Kleiderschrank verräumen",
    maxStars: 2,
  },
];
