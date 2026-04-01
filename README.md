# Wortschatz 🇩🇪

A mobile-optimised German vocabulary app hosted on GitHub Pages.



---

## Project structure

```
wortschatz/
├── index.html               ← app shell (never edit for word additions)
├── app.js                   ← all UI logic (never edit for word additions)
├── styles.css               ← all styles
├── data/
│   ├── verben.json          ← all verbs (A1–C2)
│   ├── andere.json          ← conjunctions, adverbs, particles (A1–C2)
│   └── nomen/               ← nouns split by theme
│       ├── people.json
│       ├── home.json
│       ├── work_education.json
│       ├── food.json
│       ├── nature_travel.json
│       └── society_abstract.json
└── README.md
```

---

## Adding a new word

**You never need to touch `index.html` or `app.js`.**
Open the right JSON file, scroll to the end of the array, and paste one of the templates below before the closing `]`.

Remember: valid JSON only — no trailing commas after the last item.

---

### VERB template

```json
{
  "id": "trinken",
  "level": "A1",
  "type": "verb",
  "german": "trinken",
  "english": "to drink",
  "patternLabel": "Stark (strong)",
  "patternColor": "strong",
  "auxiliary": "haben",
  "conjugations": {
    "prasens":     { "ich": "trinke",   "du": "trinkst",  "er": "trinkt",   "wir": "trinken",  "ihr": "trinkt",   "sie": "trinken"  },
    "prateritum":  { "ich": "trank",    "du": "trankst",  "er": "trank",    "wir": "tranken",  "ihr": "trankt",   "sie": "tranken"  },
    "perfekt":     { "ich": "habe getrunken", "du": "hast getrunken", "er": "hat getrunken", "wir": "haben getrunken", "ihr": "habt getrunken", "sie": "haben getrunken" },
    "konjunktiv2": { "ich": "tränke",   "du": "tränkest", "er": "tränke",   "wir": "tränken",  "ihr": "tränket",  "sie": "tränken"  }
  },
  "exceptions": ["Präteritum vowel: i→a"],
  "exceptionForms": ["prateritum-all"],
  "kasus": ["akkusativ"],
  "reflexiv": false,
  "preposition": null,
  "usage": [
    { "de": "Ich trinke einen Kaffee.", "en": "I am drinking a coffee." },
    { "de": "Er hat das Wasser getrunken.", "en": "He drank the water." }
  ]
}
```

**patternColor options:** `"weak"` | `"strong"` | `"mixed"`

**exceptionForms options:** `"prasens-du"` | `"prasens-er"` | `"prasens-all"` | `"prateritum-all"` | `"perfekt-aux"` | `"all"`

**preposition example:**
```json
"preposition": { "prep": "auf", "case": "Akkusativ", "meaning": "to wait for sth." }
```

---

### NOMEN template

```json
{
  "id": "Tasse",
  "level": "A1",
  "type": "nomen",
  "theme": "home",
  "german": "Tasse",
  "english": "cup",
  "article": "die",
  "gender": "feminine",
  "plural": "Tassen",
  "pluralPattern": "-n",
  "pluralPatternLabel": "+ -n",
  "nounGroupRule": "Feminine nouns ending in -e → add -n for plural",
  "endingRule": "-e",
  "declension": {
    "sg": { "nom": "die Tasse", "akk": "die Tasse", "dat": "der Tasse", "gen": "der Tasse" },
    "pl": { "nom": "die Tassen","akk": "die Tassen","dat": "den Tassen","gen": "der Tassen" }
  },
  "usage": [
    { "de": "Ich trinke eine Tasse Kaffee.", "en": "I drink a cup of coffee." }
  ]
}
```

**article options:** `"der"` | `"die"` | `"das"`

**gender options:** `"masculine"` | `"feminine"` | `"neuter"`

**pluralPattern options:**
| Value | Meaning | Example |
|---|---|---|
| `"-e"` | + -e | Tische |
| `"-en"` | + -en | Zeitungen |
| `"-n"` | + -n | Schulen |
| `"-er"` | + -er | Kinder |
| `"-s"` | + -s | Büros |
| `"-se"` | + -se | Zeugnisse |
| `"umlaut"` | Umlaut only | Mütter |
| `"umlaut-e"` | Umlaut + -e | Bäume |
| `"umlaut-er"` | Umlaut + -er | Häuser |
| `"same"` | Unchanged | Zimmer |
| `"none"` | No plural | Wetter |

**theme options:** `"people"` | `"home"` | `"work_education"` | `"food"` | `"nature_travel"` | `"society_abstract"`

---

### ANDERE template (conjunction / adverb / particle)

```json
{
  "id": "deshalb",
  "level": "B1",
  "type": "andere",
  "german": "deshalb",
  "english": "therefore / that is why",
  "wordType": "Konjunktionaladverb",
  "wordTypeEN": "Conjunctive adverb",
  "grammarRule": "Position 1 → V2 inversion",
  "grammarRuleDetail": "When deshalb starts a sentence it occupies position 1, pushing the verb to position 2 and the subject to position 3.",
  "structureFormula": "Deshalb + V + S + …",
  "variants": [
    { "label": "Synonym", "form": "daher" },
    { "label": "Formal", "form": "folglich" }
  ],
  "relatedWords": [
    { "word": "daher", "meaning": "hence / therefore" },
    { "word": "also", "meaning": "so / therefore" }
  ],
  "usage": [
    { "de": "Es regnete. Deshalb blieb er zu Hause.", "en": "It was raining. Therefore he stayed home." }
  ]
}
```

**wordType options (common):** `"Konjunktion"` | `"Konjunktionaladverb"` | `"Negationspartikel"` | `"Adjektiv/Adverb"` | `"Modalpartikel"` | `"Präposition"`

---

## CEFR levels

| Level | Description |
|---|---|
| `"A1"` | Complete beginner |
| `"A2"` | Elementary |
| `"B1"` | Intermediate |
| `"B2"` | Upper intermediate |
| `"C1"` | Advanced |
| `"C2"` | Mastery |

---



## Adding a new Nomen theme

1. Create a new file: `data/nomen/YOUR_THEME.json`
2. Add it to the `NOMEN_FILES` array in `app.js` (one line change)
3. Push — done.
