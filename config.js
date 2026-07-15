// Sternen-Challenge — Konfiguration
// Testphase: TEST_MODE = true (ignoriert Start-/Enddatum, zeigt immer den heutigen Aufgaben-Tag)
// Vor dem echten Rollout an die Kinder (Start 2026-07-20) auf false setzen.
const TEST_MODE = true;

const CHALLENGE = {
  startDate: "2026-07-20", // Tag 1 der echten Challenge
  totalDays: 21,           // 3 Wochen inkl. Wochenenden
  starValueCHF: 0.30,
};

// Beide Kind-Themes (Linda vorerst nur vorbereitet, aktiv ist nur Elias fuer den Test).
const KIDS = {
  elias: {
    id: "elias",
    name: "Elias",
    emoji: "🚵",
    colorPrimary: "#1a6f8f",
    colorAccent: "#0f4c5c",
    colorBg: "#eaf6fa",
    titleImage: "assets/title-elias.jpg",
  },
  linda: {
    id: "linda",
    name: "Linda",
    emoji: "🐱",
    colorPrimary: "#178a9c",
    colorAccent: "#5a3b82",
    colorBg: "#eafaf6",
    titleImage: "assets/title-linda.jpg",
  },
};

// Aktives Kind für diesen Build. Für den Test nur Elias.
const KID = KIDS.elias;

// Bildschirm, der nach dem Absenden des Tagesberichts bis zum naechsten Tag gezeigt wird.
const WAIT_IMAGE = "assets/wait-screen.jpg";

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
    id: "alles_erledigt",
    label: "Alle Aufgaben vollständig erledigt",
    stars: 1,
    auto: true, // wird automatisch vergeben, sobald dependsOn erfüllt ist
    dependsOn: ["lesen", "waesche", "geschirr", "schuhe", "wohnbereich", "zimmer"],
  },
];

// Extra-Bonusaufgaben — zählen zusätzlich zum Hauptaufgaben-Maximum, jeweils per Stern-Auswahl (kein Abhaken).
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
  {
    id: "bonus_geholfen",
    label: "Bonus: ohne Aufforderung geholfen",
    maxStars: 1,
  },
];
