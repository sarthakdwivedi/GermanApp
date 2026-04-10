// ── Data sources ─────────────────────────────────────────────
const VERB_FILES = [
  'weak', 'strong', 'mixed_irregular',
  'modal', 'reflexive', 'separable', 'inseparable'
];
const NOMEN_FILES = [
  'people', 'home', 'work_education',
  'food', 'nature_travel', 'society_abstract'
];
const ANDERE_FILES = [
  'conjunctions', 'prepositions', 'adjectives',
  'adverbs', 'particles', 'other'
];

// ── App state ─────────────────────────────────────────────────
let DB = { verben: [], nomen: [], andere: [] };
let currentType = 'verb';
let currentLevel = 'all';
let currentTheme = 'all';
let currentPattern = 'all';
let currentLevelMode = 'cumulative'; // 'cumulative' | 'exact'
let currentVerbTheme = 'all';
let currentAndereCategory = 'all';
let currentStatusFilter = 'all';
let currentIndex = 0;
let searchQuery = '';
let searchPool = null;   // non-null when search is active
let inSearchResult = false;  // viewing a card opened from search
const favs = new Set();
// ── Breakpoints ───────────────────────────────────────────────
function isDesktop() { return window.innerWidth >= 1024; }
function isTablet() { return window.innerWidth >= 600; }
function isLargeScreen() { return window.innerWidth >= 768; }




window.addEventListener('resize', () => {
  renderCurrentWord();
  renderWordListPanel();
});

// ── Persistence ───────────────────────────────────────────────
function saveState() {
  localStorage.setItem('wortschatz_favs', JSON.stringify([...favs]));
  localStorage.setItem('wortschatz_type', currentType);
  localStorage.setItem('wortschatz_level', currentLevel);
  localStorage.setItem('wortschatz_level_mode', currentLevelMode);
  localStorage.setItem('wortschatz_pattern', currentPattern);
  localStorage.setItem('wortschatz_theme', currentTheme);
  localStorage.setItem('wortschatz_index', currentIndex);
  localStorage.setItem('wortschatz_andere_cat', currentAndereCategory);
  localStorage.setItem('wortschatz_verb_theme', currentVerbTheme);
  localStorage.setItem('wortschatz_status_filter', currentStatusFilter);

}

function loadState() {
  try {
    const savedFavs = localStorage.getItem('wortschatz_favs');
    if (savedFavs) JSON.parse(savedFavs).forEach(id => favs.add(id));
    currentType = localStorage.getItem('wortschatz_type') || 'verb';
    currentLevel = localStorage.getItem('wortschatz_level') || 'all';
    currentLevelMode = localStorage.getItem('wortschatz_level_mode') || 'cumulative';
    currentPattern = localStorage.getItem('wortschatz_pattern') || 'all';
    currentTheme = localStorage.getItem('wortschatz_theme') || 'all';
    currentIndex = parseInt(localStorage.getItem('wortschatz_index')) || 0;
    currentAndereCategory = localStorage.getItem('wortschatz_andere_cat') || 'all';
    currentVerbTheme = localStorage.getItem('wortschatz_verb_theme') || 'all';
    currentStatusFilter = localStorage.getItem('wortschatz_status_filter') || 'all';
  } catch (e) { console.warn('Could not load state', e); }
}

// ── Swipe tracking ────────────────────────────────────────────
let touchStartX = 0;
let touchStartY = 0;

// ── Constants ─────────────────────────────────────────────────
const TENSE_LABELS = {
  prasens: 'Präsens', prateritum: 'Präteritum',
  perfekt: 'Perfekt', konjunktiv2: 'Konjunktiv II'
};
const PRONOUNS = {
  ich: 'ich', du: 'du', er: 'er/sie/es',
  wir: 'wir', ihr: 'ihr', sie: 'sie/Sie'
};
const THEME_LABELS = {
  people: 'People', home: 'Home',
  work_education: 'Work & Education', food: 'Food',
  nature_travel: 'Nature & Travel', society_abstract: 'Society & Abstract', furniture: 'Furniture'
};

const ANDERE_CATEGORY_LABELS = {
  conjunctions: 'Conjunctions',
  prepositions: 'Prepositions',
  adjectives: 'Adjectives',
  adverbs: 'Adverbs',
  particles: 'Particles',
  other: 'Other'
};

const VERB_THEME_LABELS = {
  core: 'Core',
  movement: 'Movement',
  communication: 'Communication',
  daily_life: 'Daily Life',
  education: 'Education',
  work: 'Work',
  food: 'Food',
  shopping: 'Shopping',
  home: 'Home',
  leisure: 'Leisure',
  emotions: 'Emotions',
  social: 'Social',
  thinking: 'Thinking',
  sport: 'Sport',
  nature: 'Nature'
};
const PATTERN_LABELS = {
  weak: 'Weak', strong: 'Strong', mixed_irregular: 'Mixed / Irregular',
  modal: 'Modal', reflexive: 'Reflexive',
  separable: 'Separable', inseparable: 'Inseparable'
};

// ══════════════════════════════════════════════
// GENDER & PLURAL DETECTION ENGINE
// ══════════════════════════════════════════════

const GENDER_ENDING_RULES = [
  { pattern: /ung$/,        gender: 'die', rule: 'Nouns ending in -ung are always feminine' },
  { pattern: /heit$|keit$/, gender: 'die', rule: 'Nouns ending in -heit/-keit are always feminine' },
  { pattern: /schaft$/,     gender: 'die', rule: 'Nouns ending in -schaft are always feminine' },
  { pattern: /tion$|ion$/,  gender: 'die', rule: 'Nouns ending in -tion/-ion are always feminine' },
  { pattern: /tät$|ität$/,  gender: 'die', rule: 'Nouns ending in -tät are always feminine' },
  { pattern: /ik$/,         gender: 'die', rule: 'Nouns ending in -ik are always feminine' },
  { pattern: /enz$|anz$/,   gender: 'die', rule: 'Nouns ending in -enz/-anz are always feminine' },
  { pattern: /ie$/,         gender: 'die', rule: 'Nouns ending in -ie are always feminine' },
  { pattern: /ur$/,         gender: 'die', rule: 'Nouns ending in -ur are always feminine' },
  { pattern: /chen$|lein$/, gender: 'das', rule: 'Diminutives in -chen/-lein are always neuter' },
  { pattern: /ment$/,       gender: 'das', rule: 'Nouns ending in -ment are usually neuter' },
  { pattern: /um$/,         gender: 'das', rule: 'Nouns ending in -um are usually neuter' },
  { pattern: /nis$/,        gender: 'das', rule: 'Nouns ending in -nis are usually neuter' },
  { pattern: /tum$/,        gender: 'das', rule: 'Nouns ending in -tum are usually neuter' },
  { pattern: /ling$/,       gender: 'der', rule: 'Nouns ending in -ling are always masculine' },
  { pattern: /ismus$/,      gender: 'der', rule: 'Nouns ending in -ismus are always masculine' },
  { pattern: /ist$/,        gender: 'der', rule: 'Nouns ending in -ist are usually masculine' },
  { pattern: /or$/,         gender: 'der', rule: 'Nouns ending in -or are usually masculine' },
  { pattern: /ig$/,         gender: 'der', rule: 'Nouns ending in -ig are usually masculine' },
];

const THEME_GENDER_MAP = {
  // MASCULINE
  animals:              'der',
  cars:                 'der',
  currency:             'der',
  calendar:             'der',
  days_months_seasons:  'der',
  seasons:              'der',
  months:               'der',
  directions:           'der',
  alcoholic_drinks:     'der',
  plant_drinks:         'der',
  male_people:          'der',
  mountains:            'der',
  rivers_non_german:    'der',
  outer_space:          'der',
  rocks_minerals:       'der',
  weather:              'der',
  // FEMININE
  female_people:        'die',
  ships_aircraft:       'die',
  motorcycles:          'die',
  trees_flowers:        'die',
  fruits:               'die',
  german_rivers:        'die',
  numbers_as_nouns:     'die',
  // NEUTER
  languages:            'das',
  colors_as_nouns:      'das',
  infinitives_as_nouns: 'das',
  metals_elements:      'das',
  scientific_units:     'das',
  young_animals:        'das',
  young_people:         'das',
  countries_cities:     'das',
  continents:           'das',
  letters_notes:        'das',
  hotels_restaurants:   'das',
};

const THEME_GENDER_RULES = {
  animals:              'Most animals are masculine — exceptions: die Katze, das Pferd, das Schaf',
  cars:                 'Car brands and types are always masculine',
  currency:             'Currency units are always masculine (der Euro, der Dollar, der Cent)',
  calendar:             'Days, months and seasons are always masculine',
  days_months_seasons:  'Days, months and seasons are always masculine',
  seasons:              'Seasons are always masculine (der Frühling, der Sommer)',
  months:               'Months are always masculine (der Januar, der März)',
  directions:           'Compass directions are always masculine (der Norden, der Süden)',
  alcoholic_drinks:     'Alcoholic drinks are usually masculine (der Wein, der Whisky)',
  plant_drinks:         'Plant-based drinks are usually masculine (der Kaffee, der Tee)',
  male_people:          'Male persons are always masculine',
  mountains:            'Mountains and mountain ranges are usually masculine',
  rivers_non_german:    'Non-German rivers are usually masculine (der Nil, der Amazonas)',
  outer_space:          'Celestial bodies are usually masculine (der Mond, der Stern)',
  rocks_minerals:       'Rocks and minerals are usually masculine (der Stein, der Granit)',
  weather:              'Weather phenomena are usually masculine (der Regen, der Schnee, der Wind)',
  female_people:        'Female persons are always feminine',
  ships_aircraft:       'Airplane, motorcycle and ship makes/models are always feminine',
  motorcycles:          'Motorcycle brands are always feminine',
  trees_flowers:        'Most trees, fruits and flowers are feminine (die Rose, die Eiche)',
  fruits:               'Most fruits are feminine — exceptions: der Apfel, das Obst',
  german_rivers:        'Rivers in Germany, Austria and Switzerland are always feminine (die Donau)',
  numbers_as_nouns:     'Numerals used as nouns are feminine (die Eins, die Million)',
  languages:            'Languages used as nouns are always neuter (das Deutsch, das Englisch)',
  colors_as_nouns:      'Colours used as nouns are always neuter (das Rot, das Blau)',
  infinitives_as_nouns: 'Gerunds and infinitives used as nouns are always neuter (das Essen)',
  metals_elements:      'Metals and chemical elements are usually neuter (das Gold, das Eisen)',
  scientific_units:     'Scientific units are usually neuter (das Gramm, das Watt) — exception: der Meter',
  young_animals:        'Young and baby animals are always neuter (das Kalb, das Küken)',
  young_people:         'Young persons are always neuter (das Kind, das Baby, das Mädchen)',
  countries_cities:     'Continents, cities and most countries are neuter — no article in normal use',
  continents:           'Continents are always neuter — no article in normal use',
  letters_notes:        'Alphabet letters and music notes are always neuter (das A, das B)',
  hotels_restaurants:   'Hotels, cafes and restaurants are usually neuter (das Hilton, das Ritz)',
};

const THEME_GENDER_CONFIDENCE = {
  // High
  male_people:          'high',
  female_people:        'high',
  languages:            'high',
  days_months_seasons:  'high',
  calendar:             'high',
  seasons:              'high',
  months:               'high',
  directions:           'high',
  infinitives_as_nouns: 'high',
  young_people:         'high',
  letters_notes:        'high',
  colors_as_nouns:      'high',
  german_rivers:        'high',
  rivers_non_german:    'high',
  ships_aircraft:       'high',
  motorcycles:          'high',
  numbers_as_nouns:     'high',
  continents:           'high',
  countries_cities:     'high',
  // Medium
  currency:             'medium',
  weather:              'medium',
  rocks_minerals:       'medium',
  outer_space:          'medium',
  metals_elements:      'medium',
  scientific_units:     'medium',
  young_animals:        'medium',
  trees_flowers:        'medium',
  hotels_restaurants:   'medium',
  mountains:            'medium',
  alcoholic_drinks:     'medium',
  plant_drinks:         'medium',
  // Low — show rule but never flag exception
  animals:              'low',
  fruits:               'low',
  cars:                 'low',
};

const PLURAL_ENDING_RULES = [
  { test: w => /ung$|heit$|keit$|schaft$|tion$|ion$|tät$/.test(w.german.toLowerCase()),
    predict: w => w.german + 'en', pattern: '-en',
    rule: 'Feminine nouns with these endings always take -en in plural' },
  { test: w => w.article === 'die' && /e$/.test(w.german),
    predict: w => w.german + 'n', pattern: '-n',
    rule: 'Feminine nouns ending in -e add -n in plural' },
  { test: w => /chen$|lein$/.test(w.german.toLowerCase()),
    predict: w => w.german, pattern: '-',
    rule: 'Diminutives are always unchanged in plural' },
  { test: w => w.article !== 'die' && /er$|el$|en$/.test(w.german.toLowerCase()),
    predict: w => w.german, pattern: '-',
    rule: 'Masculine/neuter nouns ending in -er/-el/-en are usually unchanged in plural' },
  { test: w => /ment$/.test(w.german.toLowerCase()),
    predict: w => w.german + 's', pattern: '-s',
    rule: 'Nouns ending in -ment usually take -s in plural' },
  { test: w => /um$/.test(w.german.toLowerCase()),
    predict: w => w.german.replace(/um$/, 'en'), pattern: '-en',
    rule: 'Nouns ending in -um usually take -en in plural (Datum → Daten)' },
];

// ── Verb analysis ─────────────────────────────
const SEIN_VERBS_HINTS = [
  'gehen', 'kommen', 'fahren', 'fliegen', 'laufen', 'rennen',
  'schwimmen', 'reisen', 'wandern', 'fallen', 'steigen', 'steigen',
  'aufstehen', 'einschlafen', 'aufwachen', 'ankommen', 'abfahren',
  'werden', 'sein', 'bleiben', 'passieren', 'geschehen', 'wachsen'
];

const STRONG_ABLAUT_CLASSES = [
  { name: 'Class I — ei → ie/i → ie/i',   pattern: /^ei/, prät: /ie$|i$/, },
  { name: 'Class II — ie/ü → o → o',      pattern: /^(ie|ü)/, prät: /o$/ },
  { name: 'Class III — i/e → a → u/o',    pattern: /^(i|e)/, prät: /a$/ },
  { name: 'Class IV — e → a → e/o',       pattern: /^e/, prät: /a$/ },
  { name: 'Class V — a → u → a',          pattern: /^a/, prät: /u$/ },
  { name: 'Class VI — a → ie → a',        pattern: /^a/, prät: /ie$/ },
];

const INSEPARABLE_PREFIXES = ['be','ge','er','ver','zer','ent','emp','miss'];
const SEPARABLE_PREFIXES   = ['ab','an','auf','aus','bei','ein','los','mit',
                               'nach','vor','weg','zu','zurück','zusammen',
                               'fern','spazieren','statt'];
// ── Adjective generator ───────────────────────
const ADJ_DECLENSION = {
  strong: {
    nom: ['-er', '-e', '-es', '-e'],
    akk: ['-en', '-e', '-es', '-e'],
    dat: ['-em', '-er', '-em', '-en'],
    gen: ['-en', '-er', '-en', '-er']
  },
  weak: {
    nom: ['-e', '-e', '-e', '-en'],
    akk: ['-en', '-e', '-e', '-en'],
    dat: ['-en', '-en', '-en', '-en'],
    gen: ['-en', '-en', '-en', '-en']
  },
  mixed: {
    nom: ['-er', '-e', '-es', '-en'],
    akk: ['-en', '-e', '-es', '-en'],
    dat: ['-en', '-en', '-en', '-en'],
    gen: ['-en', '-en', '-en', '-en']
  }
};
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const TENSES_BY_LEVEL = {
  A1: ['prasens'],
  A2: ['prasens', 'perfekt'],
  B1: ['prasens', 'perfekt', 'prateritum'],
  B2: ['prasens', 'perfekt', 'prateritum', 'konjunktiv2'],
  C1: ['prasens', 'perfekt', 'prateritum', 'konjunktiv2'],
  C2: ['prasens', 'perfekt', 'prateritum', 'konjunktiv2'],
  all: ['prasens', 'perfekt', 'prateritum', 'konjunktiv2'],
};


// ══════════════════════════════════════════════
// CONJUGATION & DECLENSION GENERATORS
// ══════════════════════════════════════════════

// ── Weak verb conjugation generator ──────────
function generateWeakConjugations(w) {
  const inf = w.german
    .replace('(sich) ', '').replace('sich ', '').trim();

  // Stem
  let stem;
  if (inf.endsWith('eln')) stem = inf.slice(0, -3) + 'l';
  else if (inf.endsWith('ern')) stem = inf.slice(0, -3) + 'r';
  else stem = inf.slice(0, -2);

  // Separable: strip prefix to get base stem for Partizip II
  const sep = w.separablePrefix || '';
  const baseStem = sep ? stem.slice(sep.length) : stem;

  // -e- insertion before endings
  const needsE = /[td]$|chn$|ffn$|gn$|tm$/.test(stem);
  const e = needsE ? 'e' : '';

  // Partizip II
  const noGe = w.inseparable || false;
  const part2 = sep
    ? `${sep}ge${baseStem}${e}t`
    : noGe ? `${stem}${e}t`
      : `ge${stem}${e}t`;

  const aux = w.auxiliary || 'haben';
  const AUX = aux === 'sein'
    ? { ich: 'bin', du: 'bist', er: 'ist', wir: 'sind', ihr: 'seid', sie: 'sind' }
    : { ich: 'habe', du: 'hast', er: 'hat', wir: 'haben', ihr: 'habt', sie: 'haben' };

  // Use stored Präsens if provided (for irregular du/er forms)
  const prasens = w.stems?.prasens || {
    ich: `${stem}e`,
    du: `${stem}${e}st`,
    er: `${stem}${e}t`,
    wir: inf,
    ihr: `${stem}${e}t`,
    sie: inf
  };

  const prätStem = `${stem}${e}te`;
  const prateritum = {
    ich: prätStem,
    du: `${stem}${e}test`,
    er: prätStem,
    wir: `${stem}${e}ten`,
    ihr: `${stem}${e}tet`,
    sie: `${stem}${e}ten`
  };

  const perfekt = {};
  for (const p of ['ich', 'du', 'er', 'wir', 'ihr', 'sie'])
    perfekt[p] = `${AUX[p]} ${part2}`;

  return {
    prasens,
    prateritum,
    perfekt,
    konjunktiv2: { ...prateritum } // always identical for weak
  };
}

// ── Strong verb conjugation generator ────────
function generateStrongConjugations(w) {
  const s = w.stems;
  const aux = w.auxiliary || 'haben';
  const AUX = aux === 'sein'
    ? { ich: 'bin', du: 'bist', er: 'ist', wir: 'sind', ihr: 'seid', sie: 'sind' }
    : { ich: 'habe', du: 'hast', er: 'hat', wir: 'haben', ihr: 'habt', sie: 'haben' };

  const part2 = s.partizip2;
  const perfekt = {};
  for (const p of ['ich', 'du', 'er', 'wir', 'ihr', 'sie'])
    perfekt[p] = `${AUX[p]} ${part2}`;

  // Präteritum — ich/er stem stored, endings derived
  const prät = s.prateritum;
  const duEnding = /[szß]$/.test(prät) ? 't' : 'st';
  const prateritum = {
    ich: prät,
    du: `${prät}${duEnding}`,
    er: prät,
    wir: `${prät}en`,
    ihr: `${prät}t`,
    sie: `${prät}en`
  };

  // Konjunktiv II — stem stored explicitly, endings derived
  const k2 = s.konjunktiv2;
  const konjunktiv2 = {
    ich: `${k2}e`,
    du: `${k2}est`,
    er: `${k2}e`,
    wir: `${k2}en`,
    ihr: `${k2}et`,
    sie: `${k2}en`
  };

  // Präsens must be stored in full (vowel changes unpredictable)
  return { prasens: s.prasens, prateritum, perfekt, konjunktiv2 };
}

// ── Nomen declension generator ────────────────
function generateNomenDeclension(w) {
  const { article, german, plural } = w;
  if (!article || !plural) return null;

  // No plural words
  if (w.declensionType === 'no_plural') {
    const genS = /[szxß]$/.test(german) ? 'es' : 's';
    const akk = article === 'die' ? `die ${german}`
      : article === 'der' ? `den ${german}` : `das ${german}`;
    const dat = article === 'die' ? `der ${german}` : `dem ${german}`;
    const gen = article === 'die' ? `der ${german}` : `des ${german}${genS}`;
    return {
      sg: { nom: `${article} ${german}`, akk, dat, gen },
      pl: { nom: '—', akk: '—', dat: '—', gen: '—' }
    };
  }

  // Weak masculine nouns (der Name, der Herr etc.)
  if (w.declensionType === 'weak_masc') {
    const sfx = german.endsWith('e') ? 'n' : 'en';
    const oblq = `${german}${sfx}`;
    const plDat = plural.endsWith('n') || plural.endsWith('s')
      ? plural : `${plural}n`;
    return {
      sg: { nom: `der ${german}`, akk: `den ${oblq}`, dat: `dem ${oblq}`, gen: `des ${oblq}` },
      pl: { nom: `die ${plural}`, akk: `die ${plural}`, dat: `den ${plDat}`, gen: `der ${plural}` }
    };
  }

  // Standard declension
  const genS = /[szxßch]$/.test(german) ? 'es' : 's';
  const plDat = plural.endsWith('n') || plural.endsWith('s')
    ? plural : `${plural}n`;

  const sg = {
    nom: `${article} ${german}`,
    akk: article === 'die' ? `die ${german}`
      : article === 'der' ? `den ${german}` : `das ${german}`,
    dat: article === 'die' ? `der ${german}` : `dem ${german}`,
    gen: article === 'die' ? `der ${german}` : `des ${german}${genS}`
  };

  const pl = {
    nom: `die ${plural}`,
    akk: `die ${plural}`,
    dat: `den ${plDat}`,
    gen: `der ${plural}`
  };

  return { sg, pl };
}

function generateAdjectiveForms(w) {
  if (w.irregularForms) return; // gut, groß etc — keep stored values

  // Comparative — stem + er
  // Handle stems ending in -el (dunkel → dunkler not dunkleer)
  const stem = w.german.endsWith('el')
    ? w.german.slice(0, -2) + 'l'    // dunkel → dunkl
    : w.german.endsWith('er')
      ? w.german.slice(0, -2) + 'r'    // teuer → teur
      : w.german;

  if (!w.comparative) w.comparative = `${stem}er`;

  // Superlative attr stem — handle -t insertion (schnell→schnellst, kurz→kürzest)
  // Only store custom superlative if provided, else generate
  if (!w.superlative) {
    const needsEst = /[szßdt]$/.test(w.german) ? 'est' : 'st';
    w.superlative = `am ${stem}${needsEst}en`;
  }

  // Declension — always the same constant table for regular adjectives
  if (!w.declension) w.declension = ADJ_DECLENSION;
}

// ── Gender & Plural detection ─────────────────
function detectNounGender(w) {
  // 1. Theme-based — check all themes
  const themes = getThemesArray(w);
  for (const t of themes) {
    if (THEME_GENDER_MAP[t]) {
      return {
        predictedArticle: THEME_GENDER_MAP[t],
        rule: THEME_GENDER_RULES[t] || `Words in theme "${t}" are usually ${THEME_GENDER_MAP[t]}`,
        confidence: THEME_GENDER_CONFIDENCE[t] || 'medium',
        source: 'theme'
      };
    }
  }

  // 2. Ending rules — medium confidence
  const lower = w.german.toLowerCase();
  for (const rule of GENDER_ENDING_RULES) {
    if (rule.pattern.test(lower)) {
      return {
        predictedArticle: rule.gender,
        rule: rule.rule,
        confidence: 'medium',
        source: 'ending'
      };
    }
  }

  return null;
}

function detectNounPlural(w) {
  for (const rule of PLURAL_ENDING_RULES) {
    if (rule.test(w)) {
      return {
        predictedPlural: rule.predict(w),
        pattern: rule.pattern,
        rule: rule.rule
      };
    }
  }
  return null;
}

function analyseNoun(w) {
  // ── Gender analysis ───────────────────────────
  const genderResult = detectNounGender(w);
  if (genderResult) {
    if (genderResult.predictedArticle === w.article) {
      // Matches rule
      w._genderRule    = genderResult.rule;
      w._genderSource  = genderResult.source;
      w._genderMatch   = true;
    } else {
      // Mismatch
      if (genderResult.confidence === 'low') {
        // Low confidence — show rule but don't flag exception
        w._genderRule   = genderResult.rule;
        w._genderMatch  = true; // informational only
      } else {
        // Medium or high — flag as exception
        w._genderMatch     = false;
        w._genderRule      = genderResult.rule;
        w._genderException = `Rule predicts ${genderResult.predictedArticle} — but is ${w.article}. Memorise this exception.`;
        if (genderResult.confidence === 'medium') {
          w._genderException += ' (rule has some exceptions)';
        }
      }
    }
  }

  // ── Plural analysis ───────────────────────────
  const pluralResult = detectNounPlural(w);
  if (pluralResult) {
    if (pluralResult.predictedPlural === w.plural) {
      w._pluralRule  = pluralResult.rule;
      w._pluralMatch = true;
    } else {
      w._pluralMatch     = false;
      w._pluralRule      = pluralResult.rule;
      w._pluralException = `Rule predicts "${pluralResult.predictedPlural}" — but plural is "${w.plural}". Memorise this exception.`;
    }
  }
}

function analyseVerb(w) {
  if (!w.conjugations) return;

  // ── 1. Weak verb exception detection ─────────
  if (w.patternColor === 'weak') {
    const generated = generateWeakConjugations(w);
    const exceptions = [];

    for (const tense of ['prasens', 'prateritum', 'perfekt']) {
      if (!w.conjugations[tense] || !generated[tense]) continue;
      for (const pronoun of ['ich','du','er','wir','ihr','sie']) {
        const actual    = w.conjugations[tense][pronoun];
        const expected  = generated[tense][pronoun];
        if (actual && expected && actual !== expected) {
          exceptions.push({
            tense: TENSE_LABELS[tense] || tense,
            pronoun: PRONOUNS[pronoun] || pronoun,
            expected,
            actual
          });
        }
      }
    }

    if (exceptions.length) {
      w._conjugationExceptions = exceptions;
      w._verbRule = 'Weak verb — but has irregular forms (see below)';
    } else {
      w._verbRule        = 'Regular weak verb — all forms follow standard pattern';
      w._verbFollowsRule = true;
    }
  }

  // ── 2. Strong verb — identify ablaut class ───
  if (w.patternColor === 'strong' && w.stems) {
    const inf   = w.german.toLowerCase().replace(/^(sich |auf|an|ab|ein|aus|zu|mit|vor|nach|fern)/, '');
    const prät  = (w.stems.prateritum || '').toLowerCase();

    const infVowel  = inf.match(/[aeiouäöü]+/)?.[0] || '';
    const prätVowel = prät.match(/[aeiouäöü]+/)?.[0] || '';
    const part2Vowel = w.stems.partizip2?.match(/[aeiouäöü]+/)?.[0] || '?';

    const foundClass = STRONG_ABLAUT_CLASSES.find(cls =>
      cls.pattern.test(inf) && cls.prät.test(prät)
    );
    if (foundClass) w._ablautClass = foundClass.name;

    if (infVowel && prätVowel) {
      w._ablautPattern = `${infVowel} → ${prätVowel} → ${part2Vowel}`;
      w._verbRule = `Strong verb — ablaut pattern: ${w._ablautPattern}` +
        (w._ablautClass ? ` (${w._ablautClass})` : '');
    }

    const k2 = w.stems.konjunktiv2 || '';
    const hasUmlaut = /[äöü]/.test(k2);
    if (!hasUmlaut && /[aou]/.test(prät)) {
      w._konjunktiv2Note = 'Konjunktiv II has no umlaut — memorise this form';
    }
  }

  // ── 3. Auxiliary check ────────────────────────
  const infAux = w.german.toLowerCase();
  if (w.auxiliary === 'sein') {
    const expectedSein = SEIN_VERBS_HINTS.some(v => infAux.includes(v));
    if (!expectedSein) {
      w._auxiliaryNote = 'Uses sein — verb expresses movement or change of state';
    }
  } else if (w.auxiliary === 'haben') {
    const isSeinVerb = SEIN_VERBS_HINTS.some(v => infAux === v || infAux.endsWith(v));
    if (isSeinVerb) {
      w._auxiliaryException = `Expected sein (motion/change verb) — but uses haben. Memorise.`;
    }
  }

  // ── 4. Prefix validation ──────────────────────
  const inf = w.german.toLowerCase();
  if (!w.separablePrefix && !w.inseparable) {
    const matchedInsep = INSEPARABLE_PREFIXES.find(p => inf.startsWith(p));
    const matchedSep   = SEPARABLE_PREFIXES.find(p => inf.startsWith(p));
    if (matchedInsep) {
      w._prefixNote = `Inseparable prefix "${matchedInsep}" — no -ge- in Partizip II`;
    } else if (matchedSep) {
      w._prefixNote = `Possible separable prefix "${matchedSep}" — verify`;
    }
  }
}

// ── Data loading ──────────────────────────────────────────────
async function loadData() {
  try {

    const nomenManifest = await fetch('data/nomen/manifest.json').then(r => r.json());
    const responses = await Promise.all([
      ...VERB_FILES.map(f => fetch(`data/verben/${f}.json`)),
      ...nomenManifest.map(f => fetch(`data/nomen/${f}.json`)),
      ...ANDERE_FILES.map(f => fetch(`data/andere/${f}.json`))
    ]);

    for (const r of responses) {
      if (!r.ok) throw new Error(`404: ${r.url}`);
    }

    const verbResults = responses.slice(0, VERB_FILES.length);
    const nomenResults = responses.slice(VERB_FILES.length, VERB_FILES.length + nomenManifest.length);
    const andereResults = responses.slice(VERB_FILES.length + nomenManifest.length);

    const verbenArrays = await Promise.all(verbResults.map(r => r.json()));
    const nomenArrays = await Promise.all(nomenResults.map(r => r.json()));
    const andereArrays = await Promise.all(andereResults.map(r => r.json()));

    // Tag each verb with its pattern group
    VERB_FILES.forEach((f, i) => {
      verbenArrays[i].forEach(w => { w.verbFile = f; });
    });

    // Tag each andere word with its category file
    ANDERE_FILES.forEach((f, i) => {
      andereArrays[i].forEach(w => { w.andereFile = f; });
    });



    DB.verben = verbenArrays.flat();
    DB.nomen = nomenArrays.flat();
    DB.andere = andereArrays.flat();

    DB.verben.forEach(w => {
      if (w.conjugations) return;          // already stored — skip
      if (w.patternColor === 'weak') w.conjugations = generateWeakConjugations(w);
      else if (w.stems) w.conjugations = generateStrongConjugations(w);
    });

    // Generate declensions for nouns that don't have them stored
    DB.nomen.forEach(w => {
      if (w.declension) return;            // already stored — skip
      const generated = generateNomenDeclension(w);
      if (generated) w.declension = generated;
    });

    // Analyse gender and plural patterns
    DB.nomen.forEach(w => analyseNoun(w));

    // Analyse verb patterns and exceptions
    DB.verben.forEach(w => analyseVerb(w));

    // Generate adjective forms
    DB.andere
      .filter(w => w.wordCategory === 'adjective')
      .forEach(w => generateAdjectiveForms(w));
    initApp();
  } catch (err) {
    document.getElementById('loading').innerHTML =
      `<div style="color:var(--c2);text-align:center;padding:20px">
        <div style="font-size:24px;margin-bottom:8px">⚠</div>
        <div>${err.message}</div>
        <div style="font-size:11px;margin-top:6px;color:var(--text3)">
          Check all JSON files exist and are valid.
        </div>
      </div>`;
    console.error('Load error:', err);
  }
}

function initApp() {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('app').style.display = '';

  loadState();

  const total = DB.verben.length + DB.nomen.length + DB.andere.length;

  buildPatternFilter();
  buildThemeFilter();

  // Restore UI state
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.tab.${currentType}`)?.classList.add('active');
  updateLevelPill();
  showContextualFilter();
  renderCurrentWord();
  updateFavButton();
  setupSwipe();

  // Show level picker on first ever load
  if (!localStorage.getItem('wortschatz_level_set')) {
    document.getElementById('level-picker-overlay').style.display = 'flex';
  }
}

function getThemesArray(w) {
  if (!w || !w.theme) return [];
  return Array.isArray(w.theme) ? w.theme.filter(Boolean) : [w.theme];
}

// ── Filter builders ───────────────────────────────────────────
function buildPatternFilter() {
  const pool = getPool();
  // Only show patterns that have words in current pool
  const activeFiles = VERB_FILES.filter(f =>
    DB.verben.some(w => w.verbFile === f &&
      (currentLevel === 'all' || (currentLevelMode === 'cumulative'
        ? LEVELS.indexOf(w.level) <= LEVELS.indexOf(currentLevel)
        : w.level === currentLevel))
    )
  );

  const items = [
    { val: 'all', label: 'All patterns' },
    ...activeFiles.map(f => ({ val: f, label: PATTERN_LABELS[f] || f }))
  ];

  // Dropdown menu
  document.getElementById('pattern-dropdown-menu').innerHTML = items.map(item =>
    `<button class="ctx-menu-item${currentPattern === item.val ? ' active' : ''}"
      onclick="pickPattern('${item.val}')">${item.label}</button>`
  ).join('');

  // Desktop pills
  document.getElementById('pattern-pills').innerHTML = items.map(item =>
    `<button class="theme-btn${currentPattern === item.val ? ' active' : ''}"
      onclick="pickPattern('${item.val}')">${item.label}</button>`
  ).join('');

  updateCtxDropdownBtn('pattern');
}


function updateFavButton() {
  const count = favs.size;
  const btn = document.getElementById('fav-header-btn');
  const label = document.getElementById('fav-count');
  btn.classList.toggle('has-favs', count > 0);
  btn.childNodes[0].textContent = count > 0 ? '♥ ' : '♡ ';
  label.textContent = count > 0 ? count : '';
}

function buildThemeFilter() {
  const isNomen = currentType === 'nomen';
  const isAndere = currentType === 'andere';
  if (!isNomen && !isAndere) return;

  const sourceDB = isNomen ? DB.nomen : DB.andere;
  const maxIdx = currentLevel === 'all' ? 99 : LEVELS.indexOf(currentLevel);

  // Only show themes/categories that have words at this level
  const activeItems = isNomen
    ? [...new Set(
      sourceDB
        .filter(w =>
          currentLevel === 'all' ||
          (currentLevelMode === 'cumulative'
            ? LEVELS.indexOf(w.level) <= maxIdx
            : w.level === currentLevel)
        )
        .flatMap(w => getThemesArray(w))
    )]
      .map(t => ({ val: t, label: THEME_LABELS[t] || t }))
    : ANDERE_FILES
      .filter(f => sourceDB.some(w =>
        w.andereFile === f &&
        (currentLevel === 'all' ||
          (currentLevelMode === 'cumulative'
            ? LEVELS.indexOf(w.level) <= maxIdx
            : w.level === currentLevel))
      ))
      .map(f => ({ val: f, label: ANDERE_CATEGORY_LABELS[f] || f }));

  const items = [{ val: 'all', label: isNomen ? 'All themes' : 'All' }, ...activeItems];
  const currentVal = isNomen ? currentTheme : currentAndereCategory;

  document.getElementById('theme-dropdown-menu').innerHTML = items.map(item =>
    `<button class="ctx-menu-item${currentVal === item.val ? ' active' : ''}"
      onclick="${isNomen ? `pickTheme('${item.val}')` : `pickAndereCategory('${item.val}')`}">${item.label}</button>`
  ).join('');

  document.getElementById('theme-pills').innerHTML = items.map(item =>
    `<button class="theme-btn${currentVal === item.val ? ' active' : ''}"
      onclick="${isNomen ? `pickTheme('${item.val}')` : `pickAndereCategory('${item.val}')`}">${item.label}</button>`
  ).join('');

  updateCtxDropdownBtn('theme');
}

function showContextualFilter() {
  const pf = document.getElementById('pattern-filter');
  const tf = document.getElementById('theme-filter');
  pf.style.display = currentType === 'verb' ? 'block' : 'none';
  tf.style.display = (currentType === 'nomen' || currentType === 'andere') ? 'block' : 'none';
  if (currentType === 'nomen' || currentType === 'andere') buildThemeFilter();
  if (currentType === 'verb') buildPatternFilter();
}

// ── Pool helpers ──────────────────────────────────────────────

function getPool() {
  if (searchPool !== null) return searchPool;

  let pool = currentType === 'verb' ? DB.verben
    : currentType === 'nomen' ? DB.nomen
      : DB.andere;

  if (currentLevel !== 'all') {
    if (currentLevelMode === 'cumulative') {
      const maxIdx = LEVELS.indexOf(currentLevel);
      pool = pool.filter(w => LEVELS.indexOf(w.level) <= maxIdx);
    } else {
      pool = pool.filter(w => w.level === currentLevel);
    }
  }

  if (currentType === 'nomen' && currentTheme !== 'all') {
    pool = pool.filter(w => getThemesArray(w).includes(currentTheme));
  }

  if (currentType === 'verb' && currentPattern !== 'all')
    pool = pool.filter(w => w.verbFile === currentPattern);

  if (currentType === 'andere' && currentAndereCategory !== 'all')
    pool = pool.filter(w => w.andereFile === currentAndereCategory);

  if (currentStatusFilter !== 'all') {
    pool = pool.filter(w => getWordStatus(w.id) === currentStatusFilter);
  }

  return pool;
}

// ── Search ────────────────────────────────────────────────────
function onSearch(query) {
  searchQuery = query.trim().toLowerCase();
  document.getElementById('search-clear').style.display = searchQuery ? 'block' : 'none';

  if (!searchQuery) {
    // Restore normal browse mode
    searchPool = null;
    inSearchResult = false;
    document.getElementById('search-results').style.display = 'none';
    document.getElementById('type-tabs').style.display = 'flex';
    //document.getElementById('level-filter').style.display = 'flex';
    showContextualFilter();
    currentIndex = 0;
    renderCurrentWord();
    return;
  }

  // Hide browse chrome during search
  document.getElementById('type-tabs').style.display = 'none';
  //document.getElementById('level-filter').style.display = 'none';
  document.getElementById('pattern-filter').classList.remove('visible');
  document.getElementById('theme-filter').classList.remove('visible');
  document.getElementById('nav-bar').style.display = 'none';
  document.getElementById('card-area').innerHTML = '';
  inSearchResult = false;
  searchPool = null;

  const all = [...DB.verben, ...DB.nomen, ...DB.andere];
  const results = all.filter(w =>
    w.german.toLowerCase().includes(searchQuery) ||
    w.english.toLowerCase().includes(searchQuery) ||
    w.id.toLowerCase().includes(searchQuery)
  );

  renderSearchResults(results);
}

function clearSearch() {
  document.getElementById('search-input').value = '';
  onSearch('');
}

function renderSearchResults(results) {
  const container = document.getElementById('search-results');
  container.style.display = 'block';

  if (!results.length) {
    container.innerHTML = `<div class="search-empty">
      <div class="big">🔍</div>
      <div>No words found for "<strong>${searchQuery}</strong>"</div>
    </div>`;
    return;
  }

  container.innerHTML = results.map(w => {
    const [lbg, lc] = levelStyle(w.level);
    const [, gc] = w.article ? genderStyle(w.article) : [];
    const articleHtml = w.article
      ? `<span class="search-result-article" style="color:${gc}">${w.article} </span>` : '';
    const patLabel = w.verbFile ? PATTERN_LABELS[w.verbFile] || w.verbFile
      : w.theme ? getThemesArray(w).map(t => THEME_LABELS[t] || t).join(' · ')
        : w.wordType || 'Andere';
    return `<div class="search-result-item" onclick="openSearchResult('${w.id}')">
      <div style="flex:1;min-width:0">
        <div class="search-result-word">${articleHtml}${w.german}</div>
        <div class="search-result-meaning">${w.english}</div>
      </div>
      <div class="search-result-badges">
        <span class="search-result-lvl" style="background:${lbg};color:${lc}">${w.level}</span>
        <span class="search-result-pat">${patLabel}</span>
      </div>
    </div>`;
  }).join('');
}

function openSearchResult(id) {
  const all = [...DB.verben, ...DB.nomen, ...DB.andere];
  const w = all.find(x => x.id === id);
  if (!w) return;

  searchPool = [w];
  currentIndex = 0;
  inSearchResult = true;

  document.getElementById('search-results').style.display = 'none';
  renderCurrentWord();
}

function exitSearchResult() {
  searchPool = null;
  inSearchResult = false;
  document.getElementById('card-area').innerHTML = '';
  document.getElementById('nav-bar').style.display = 'none';
  document.getElementById('search-results').style.display = 'block';
}

// ── Type / Level / Pattern / Theme switching ──────────────────
function switchType(type) {
  currentType = type;
  //currentLevel = 'all';
  currentTheme = 'all';
  currentPattern = 'all';
  currentVerbTheme = 'all';
  currentAndereCategory = 'all';
  // remove the old pf/tf querySelector lines — handled by showContextualFilter now
  currentIndex = 0;
  searchPool = null;
  inSearchResult = false;

  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.tab.${type}`).classList.add('active');

  showContextualFilter();
  renderCurrentWord();
  saveState();
}

function switchLevel(level, btn) {
  currentLevel = level;
  currentIndex = 0;
  document.querySelectorAll('.lvl-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderCurrentWord();
  saveState();
}

function switchPattern(pattern, btn) {
  currentPattern = pattern;
  currentIndex = 0;
  document.querySelectorAll('#pattern-filter .theme-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderCurrentWord();
  saveState();
}
function switchVerbTheme(theme, btn) {
  currentVerbTheme = theme;
  currentIndex = 0;
  document.querySelectorAll('[data-vtheme]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderCurrentWord();
  renderWordListPanel();
  saveState();
}

function switchAndereCategory(cat, btn) {
  currentAndereCategory = cat;
  currentIndex = 0;
  document.querySelectorAll('[data-acat]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderCurrentWord();
  renderWordListPanel();
  saveState();
}

function switchTheme(theme, btn) {
  currentTheme = theme;
  currentIndex = 0;
  document.querySelectorAll('#theme-filter .theme-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderCurrentWord();
  saveState();
}

// ── Level dropdown ─────────────────────────────────────────────
function toggleLevelDropdown() {
  const dd = document.getElementById('level-dropdown');
  dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
}

function closeLevelDropdown() {
  document.getElementById('level-dropdown').style.display = 'none';
}

function setLevelMode(mode) {
  currentLevelMode = mode;
  document.getElementById('ldm-cumulative').classList.toggle('active', mode === 'cumulative');
  document.getElementById('ldm-exact').classList.toggle('active', mode === 'exact');
  currentIndex = 0;
  buildPatternFilter();
  buildThemeFilter();
  updateLevelPill();
  renderCurrentWord();
  renderWordListPanel();
  saveState();
}

function pickLevel(level) {
  currentLevel = level;
  currentIndex = 0;
  document.querySelectorAll('.ldo-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.ldo-btn[data-lvl="${level}"]`)?.classList.add('active');
  closeLevelDropdown();
  buildPatternFilter();
  buildThemeFilter();
  updateLevelPill();
  renderCurrentWord();
  renderWordListPanel();
  saveState();
}

function updateLevelPill() {
  const btn = document.getElementById('level-pill');
  if (!btn) return;
  if (currentLevel === 'all') {
    btn.innerHTML = `All <span class="level-pill-arrow">▾</span>`;
  } else {
    const prefix = currentLevelMode === 'cumulative' ? '≤ ' : '= ';
    btn.innerHTML = `${prefix}${currentLevel} <span class="level-pill-arrow">▾</span>`;
  }
}

// ── First-load level picker ────────────────────────────────────
function pickInitialLevel(level) {
  localStorage.setItem('wortschatz_level_set', '1');
  document.getElementById('level-picker-overlay').style.display = 'none';
  pickLevel(level);
}

// ── Contextual filter dropdowns ───────────────────────────────
function toggleCtxDropdown(which) {
  const menuId = `${which}-dropdown-menu`;
  const menu = document.getElementById(menuId);
  // Close other first
  // REPLACE the forEach inside toggleCtxDropdown:
  ['pattern', 'theme', 'sheet-ctx'].forEach(w => {
    if (w !== which) {
      const el = document.getElementById(`${w}-dropdown-menu`);
      if (el) el.style.display = 'none';
    }
  });
  menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

function updateCtxDropdownBtn(which) {
  const btn = document.getElementById(`${which}-dropdown-btn`);
  if (!btn) return;
  const currentVal = which === 'pattern' ? currentPattern
    : currentType === 'nomen' ? currentTheme
      : currentAndereCategory;
  const label = which === 'pattern'
    ? (currentPattern === 'all' ? 'All patterns' : PATTERN_LABELS[currentPattern] || currentPattern)
    : currentType === 'nomen'
      ? (currentTheme === 'all' ? 'All themes' : THEME_LABELS[currentTheme] || currentTheme)
      : (currentAndereCategory === 'all' ? 'All' : ANDERE_CATEGORY_LABELS[currentAndereCategory] || currentAndereCategory);
  btn.innerHTML = `${label} <span>▾</span>`;
}

function pickPattern(val) {
  currentPattern = val;
  currentIndex = 0;
  document.getElementById('pattern-dropdown-menu').style.display = 'none';
  buildPatternFilter();
  renderCurrentWord();
  renderWordListPanel();
  saveState();
}

function pickTheme(val) {
  currentTheme = val;
  currentIndex = 0;
  document.getElementById('theme-dropdown-menu').style.display = 'none';
  buildThemeFilter();
  renderCurrentWord();
  renderWordListPanel();
  saveState();
}

function pickAndereCategory(val) {
  currentAndereCategory = val;
  currentIndex = 0;
  document.getElementById('theme-dropdown-menu').style.display = 'none';
  buildThemeFilter();
  renderCurrentWord();
  renderWordListPanel();
  saveState();
}

// ── Navigation ────────────────────────────────────────────────
function navigateWord(dir) {
  const pool = getPool();
  if (!pool.length) return;
  const next = currentIndex + dir;
  if (next < 0 || next >= pool.length) return;
  currentIndex = next;
  renderCurrentWord(dir < 0 ? 'right' : 'left');
  saveState();
}

function renderCurrentWord(slideDir) {
  const pool = getPool();
  const navBar = document.getElementById('nav-bar');
  const cardArea = document.getElementById('card-area');

  if (!pool.length) {
    navBar.style.display = 'none';
    cardArea.innerHTML = `<div style="text-align:center;padding:40px 20px;
      color:var(--text3);font-size:13px">No words at this level.</div>`;
    return;
  }

  currentIndex = Math.max(0, Math.min(currentIndex, pool.length - 1));
  const w = pool[currentIndex];

  // Build card HTML
  let html = '';
  if (inSearchResult) {
    html += `<button class="card-back-btn" onclick="exitSearchResult()">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M9 2L4 7L9 12" stroke="currentColor" stroke-width="1.5"
          stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Back to results
    </button>`;
  }

  // Build card with slide animation class
  let cardHtml = '';
  if (w.type === 'verb') cardHtml = buildVerbCard(w);
  else if (w.type === 'nomen') cardHtml = buildNomenCard(w);
  else cardHtml = buildAndereCard(w);

  if (slideDir) {
    cardHtml = cardHtml.replace(
      'class="word-card"',
      `class="word-card slide-${slideDir}"`
    );
  }

  cardArea.innerHTML = html + cardHtml;

  // Nav bar

  navBar.style.display = isLargeScreen() ? 'none' : 'flex';
  updateNavBar(pool, currentIndex);
  document.getElementById('nav-prev').disabled = currentIndex === 0;
  document.getElementById('nav-next').disabled = currentIndex === pool.length - 1;
  renderWordListPanel();
}

function updateNavBar(pool, idx) {
  // Progress bar
  const pct = pool.length === 1 ? 100 : (idx / (pool.length - 1)) * 100;
  document.getElementById('nav-progress-fill').style.width = `${pct}%`;

  // Dots — up to 7, centred around current position
  const total = pool.length;
  const maxDots = 7;
  const dotsEl = document.getElementById('nav-dots');

  if (total <= 1) { dotsEl.innerHTML = ''; return; }

  let start = Math.max(0, idx - Math.floor(maxDots / 2));
  let end = Math.min(total - 1, start + maxDots - 1);
  if (end - start < maxDots - 1) start = Math.max(0, end - maxDots + 1);

  dotsEl.innerHTML = Array.from({ length: end - start + 1 }, (_, i) => {
    const pos = start + i;
    const diff = Math.abs(pos - idx);
    const cls = diff === 0 ? 'active' : diff === 1 ? 'nearby' : '';
    return `<div class="nav-dot${cls ? ' ' + cls : ''}"></div>`;
  }).join('');
}

// ── Word list panel (desktop / tablet) ───────────────────────
function renderWordListPanel() {
  const panel = document.getElementById('word-list-panel');
  if (!panel) return;

  // Only show on large screens
  if (!isLargeScreen()) {
    panel.style.display = 'none';
    return;
  }

  const pool = getPool();
  const scores = loadScores();  // from quiz.js — safe if not loaded yet
  panel.style.display = 'block';

  if (!pool.length) {
    panel.innerHTML = `<div class="wlp-empty">No words at this level.</div>`;
    return;
  }

  panel.innerHTML = pool.map((w, i) => {
    const [lbg, lc] = levelStyle(w.level);
    const isActive = i === currentIndex;
    const article = w.article ? `<span class="wlp-article" style="color:${genderStyle(w.article)[1]}">${w.article} </span>` : '';

    // Quiz score dot
    const wordStatus = getWordStatus(w.id);
    const dotClass = wordStatus === 'known' ? 'wlp-dot-known'
      : wordStatus === 'unknown' ? 'wlp-dot-unknown'
        : 'wlp-dot-unseen';

    // Fav
    const isFav = favs.has(w.id);

    return `<div class="wlp-row${isActive ? ' active' : ''}" onclick="selectFromList(${i})">
      <div class="wlp-dot ${dotClass}"
  onclick="event.stopPropagation();cycleStatusFromList('${w.id}',this)"></div>
      <div class="wlp-content">
        <div class="wlp-word">${article}${w.german}</div>
        <div class="wlp-meaning">${w.english}</div>
${w.type === 'verb' ? `<div class="wlp-parts">${principalParts(w)}</div>` : ''}
      </div>
      <div class="wlp-right">
        <span class="wlp-level" style="background:${lbg};color:${lc}">${w.level}</span>
        <button class="wlp-fav${isFav ? ' active' : ''}"
          onclick="event.stopPropagation();toggleFavFromList('${w.id}',this)">
          ${isFav ? '♥' : '♡'}
        </button>
      </div>
    </div>`;
  }).join('');

  // Scroll active row into view
  setTimeout(() => {
    const active = panel.querySelector('.wlp-row.active');
    active?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, 50);
}

function selectFromList(index) {
  currentIndex = index;
  renderCurrentWord(null);  // ← no slide on list click, always instant
  document.querySelectorAll('.wlp-row').forEach((r, i) => {
    r.classList.toggle('active', i === index);
  });
  saveState();
}

function toggleFavFromList(id, btn) {
  favs.has(id) ? favs.delete(id) : favs.add(id);
  btn.classList.toggle('active');
  btn.textContent = favs.has(id) ? '♥' : '♡';
  saveState();
  updateFavButton();
}

function cycleStatusFromList(id, dotEl) {
  const next = cycleStatus(id);
  dotEl.className = `wlp-dot wlp-dot-${next}`;
  updateFilterActiveDot();
  if (currentStatusFilter !== 'all') {
    currentIndex = 0;
    renderCurrentWord();
    renderWordListPanel();
  }
}

function loadScores() {
  try { return JSON.parse(localStorage.getItem('wortschatz_scores') || '{}'); }
  catch (e) { return {}; }
}






// ── Known / Unknown status ────────────────────────────────────
function loadKnownStatus() {
  try { return JSON.parse(localStorage.getItem('wortschatz_known') || '{}'); }
  catch (e) { return {}; }
}
function saveKnownStatus(data) {
  localStorage.setItem('wortschatz_known', JSON.stringify(data));
}
let _knownCache = null;
function getKnownCache() {
  if (!_knownCache) _knownCache = loadKnownStatus();
  return _knownCache;
}
function getWordStatus(id) {
  return getKnownCache()[id] || 'unseen';
}
function setWordStatus(id, status) {
  const data = getKnownCache();
  data[id] = status;
  _knownCache = data;
  saveKnownStatus(data);
}
function cycleStatus(id) {
  const current = getWordStatus(id);
  const next = current === 'unseen' ? 'known'
    : current === 'known' ? 'unknown'
      : 'unseen';
  setWordStatus(id, next);
  return next;
}
// ── Swipe support ─────────────────────────────────────────────
function setupSwipe() {
  const area = document.getElementById('card-area');

  area.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  area.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      navigateWord(dx < 0 ? 1 : -1);
    }
  }, { passive: true });

  // Close dropdowns on outside click
  document.addEventListener('click', e => {
    if (!e.target.closest('#level-dropdown') && !e.target.closest('#level-pill'))
      closeLevelDropdown();
    if (!e.target.closest('.ctx-dropdown-wrap'))
      document.querySelectorAll('.ctx-dropdown-menu').forEach(m => m.style.display = 'none');
  });
}

// ── Colour helpers ────────────────────────────────────────────
function levelStyle(l) {
  const m = {
    A1: ['rgba(105,219,124,0.15)', 'var(--a1)'],
    A2: ['rgba(169,227,75,0.15)', 'var(--a2)'],
    B1: ['rgba(74,158,255,0.15)', 'var(--b1)'],
    B2: ['rgba(116,143,252,0.15)', 'var(--b2)'],
    C1: ['rgba(218,119,242,0.15)', 'var(--c1)'],
    C2: ['rgba(255,107,107,0.15)', 'var(--c2)'],
  };
  return m[l] || ['var(--bg3)', 'var(--text2)'];
}
function patternStyle(pc) {
  if (pc === 'weak') return ['var(--verb-weak-bg)', 'var(--verb-weak)'];
  if (pc === 'strong') return ['var(--verb-strong-bg)', 'var(--verb-strong)'];
  if (pc === 'mixed') return ['var(--verb-mixed-bg)', 'var(--verb-mixed)'];
  return ['var(--bg3)', 'var(--text2)'];
}
function genderStyle(article) {
  if (article === 'der') return ['var(--der-bg)', 'var(--der)'];
  if (article === 'die') return ['var(--die-bg)', 'var(--die)'];
  if (article === 'das') return ['var(--das-bg)', 'var(--das)'];
  return ['var(--bg3)', 'var(--text2)'];
}
function pluralStyle(pp) {
  if (pp === '-en' || pp === '-n' || pp === '-se') return ['var(--pl-en-bg)', 'var(--pl-en)'];
  if (pp === '-er' || pp === 'umlaut-er') return ['var(--pl-er-bg)', 'var(--pl-er)'];
  if (pp === '-e' || pp === 'umlaut-e' || pp === 'umlaut') return ['var(--pl-e-bg)', 'var(--pl-e)'];
  if (pp === '-s') return ['var(--pl-s-bg)', 'var(--pl-s)'];
  return ['var(--pl-same-bg)', 'var(--pl-same)'];
}

function principalParts(w) {
  if (w.type !== 'verb') return '';
  const prasens = w.conjugations?.prasens?.er || '';
  const prateritum = w.conjugations?.prateritum?.er || '';
  const perfekt = w.conjugations?.perfekt?.er || '';
  return `${w.german} · ${prasens} · ${perfekt} · ${prateritum}`;
}
// ── Card builders ─────────────────────────────────────────────
function buildVerbCard(w) {
  const [lbg, lc] = levelStyle(w.level);
  const [pbg, pc] = patternStyle(w.patternColor);
  const excSet = new Set(w.exceptionForms || []);
  // REPLACE:
  if (!w.conjugations) return `<div class="word-card"><div class="card-header"><div class="word-title">${w.german}</div><div class="meaning">${w.english} — conjugation data missing</div></div></div>`;
  const allTenses = Object.keys(w.conjugations);

  const visibleTenses = TENSES_BY_LEVEL[currentLevel] || TENSES_BY_LEVEL['all'];
  const tenses = allTenses.filter(t => visibleTenses.includes(t));
  const favActive = favs.has(w.id);

  // ── Responsive conjugation ────────────────────────────────
  let conjSection = '';

  if (isDesktop()) {
    // All 4 tenses in a 2×2 grid — no tabs
    const tenseBlocks = tenses.map(tense => {
      const rows = Object.entries(w.conjugations[tense]).map(([p, form]) => {
        const isExc = excSet.has('prasens-all') || excSet.has(`${tense}-all`) ||
          excSet.has(`${tense}-${p}`) || excSet.has('all');
        return `<div class="conj-row">
          <span class="conj-pronoun">${PRONOUNS[p]}</span>
          <span class="conj-form${isExc ? ' exc' : ''}">${form}</span>
        </div>`;
      }).join('');
      return `<div class="conj-tense-block">
        <div class="conj-tense-label">${TENSE_LABELS[tense] || tense}</div>
        <div class="conj-grid">${rows}</div>
      </div>`;
    }).join('');
    conjSection = `<div class="conj-all-grid">${tenseBlocks}</div>`;

  } else if (isTablet()) {
    // First 2 tenses visible, rest tabbed
    const visibleTenses = tenses.slice(0, 2);
    const tabbedTenses = tenses.slice(2);
    const allTabs = tenses.map((t, i) =>
      `<button class="tense-tab${i < 2 ? ' active' : ''}"
        onclick="switchTense(this,'${w.id}','${t}')">${TENSE_LABELS[t] || t}</button>`
    ).join('');
    const panels = tenses.map((tense, i) => {
      const rows = Object.entries(w.conjugations[tense]).map(([p, form]) => {
        const isExc = excSet.has('prasens-all') || excSet.has(`${tense}-all`) ||
          excSet.has(`${tense}-${p}`) || excSet.has('all');
        return `<div class="conj-row">
          <span class="conj-pronoun">${PRONOUNS[p]}</span>
          <span class="conj-form${isExc ? ' exc' : ''}">${form}</span>
        </div>`;
      }).join('');
      return `<div id="cp-${w.id}-${tense}" class="conj-grid tense-panel"
        style="${i >= 2 ? 'display:none' : ''}">${rows}</div>`;
    }).join('');
    conjSection = `<div class="tense-tabs">${allTabs}</div>
      <div class="conj-tablet-grid">${panels}</div>`;

  } else {
    // Mobile — original tabbed behaviour
    const conjPanels = tenses.map((tense, i) => {
      const rows = Object.entries(w.conjugations[tense]).map(([p, form]) => {
        const isExc = excSet.has('prasens-all') || excSet.has(`${tense}-all`) ||
          excSet.has(`${tense}-${p}`) || excSet.has('all');
        return `<div class="conj-row">
          <span class="conj-pronoun">${PRONOUNS[p]}</span>
          <span class="conj-form${isExc ? ' exc' : ''}">${form}</span>
        </div>`;
      }).join('');
      return `<div id="cp-${w.id}-${tense}" class="conj-grid tense-panel"
        style="${i > 0 ? 'display:none' : ''}">${rows}</div>`;
    }).join('');
    const tenseTabs = tenses.map((t, i) =>
      `<button class="tense-tab${i === 0 ? ' active' : ''}"
        onclick="switchTense(this,'${w.id}','${t}')">${TENSE_LABELS[t] || t}</button>`
    ).join('');
    conjSection = `<div class="tense-tabs">${tenseTabs}</div>${conjPanels}`;
  }

  const excNote = w.exceptions?.length
    ? `<div class="exc-note"><div class="exc-dot">!</div><div>${w.exceptions.join(' · ')}</div></div>` : '';

  const kasus = w.kasus || [];
  const caseBadges = [
    { k: 'akkusativ', label: 'Akkusativ', cls: 'on-akk', color: 'var(--verb-weak)' },
    { k: 'dativ', label: 'Dativ', cls: 'on-dat', color: 'var(--verb-strong)' },
    { k: 'reflexiv', label: 'Reflexiv', cls: 'on-akk', color: 'var(--verb-weak)' },
  ].map(b => {
    const on = b.k === 'reflexiv' ? w.reflexiv : kasus.includes(b.k);
    return `<div class="case-badge${on ? ' ' + b.cls : ''}">
      <div class="case-badge-label">${b.label}</div>
      <div class="case-badge-val" style="color:${on ? b.color : 'var(--text3)'}">
        ${on ? '✓' : '—'}
      </div>
    </div>`;
  }).join('');

  const prepSection = w.preposition ? `
    <div class="section">
      <div class="section-label">Präposition</div>
      <div class="prep-block">
        <div class="prep-word" style="color:${pc}">${w.preposition.prep}</div>
        <div class="prep-arrow">→</div>
        <div>
          <div class="prep-name">${w.german} <span style="color:${pc}">${w.preposition.prep}</span> + ${w.preposition.case}</div>
          <div class="prep-case">${w.preposition.meaning}</div>
        </div>
      </div>
    </div>` : '';

  const patBadge = w.verbFile ? PATTERN_LABELS[w.verbFile] || 'Verb' : 'Verb';

  // ── Verb rule / exception block ───────────────
  let verbRuleSection = '';

  if (w._verbRule) {
    const followsRule = w._verbFollowsRule;
    verbRuleSection = `<div class="section">
      <div class="section-label">Verb pattern</div>
      <div class="ending-rule">
        <div class="ending-bubble${followsRule ? '' : ' exc-bubble'}"
          style="background:${followsRule ? pbg : 'rgba(105,219,124,0.15)'};color:${followsRule ? pc : 'var(--a1)'}">
          ${followsRule ? '✓' : '~'}
        </div>
        <div>
          <div class="ending-rule-text" style="color:${followsRule ? pc : 'var(--text)'}">
            ${w._verbRule}
          </div>
          ${w._ablautPattern
            ? `<div class="ending-rule-sub">Ablaut: ${w._ablautPattern}${w._ablautClass ? ` · ${w._ablautClass}` : ''}</div>`
            : ''}
          ${w._konjunktiv2Note
            ? `<div class="ending-rule-sub">${w._konjunktiv2Note}</div>`
            : ''}
        </div>
      </div>
      ${w._conjugationExceptions?.length
        ? `<div class="exc-note" style="margin-top:8px">
            <div class="exc-dot">!</div>
            <div>
              <div style="font-weight:500;margin-bottom:4px">Irregular forms:</div>
              ${w._conjugationExceptions.map(e =>
                `<div style="font-size:12px;margin-top:2px">
                  ${e.tense} · ${e.pronoun}: 
                  <span style="color:var(--text3);text-decoration:line-through">${e.expected}</span>
                  → <span style="color:var(--verb-strong)">${e.actual}</span>
                </div>`
              ).join('')}
            </div>
          </div>`
        : ''}
    </div>`;
  }

  const auxNote = w._auxiliaryException
    ? `<div class="exc-note" style="margin-top:6px">
        <div class="exc-dot">!</div>
        <div>${w._auxiliaryException}</div>
      </div>`
    : w._auxiliaryNote
      ? `<div class="rule-note">${w._auxiliaryNote}</div>`
      : '';

  const prefixNote = w._prefixNote
    ? `<div class="rule-note">${w._prefixNote}</div>`
    : '';

  return `<div class="word-card">
    <div class="card-header">
      <div class="card-header-top">
        <div>
          <div class="word-title">${w.german}</div>
          <div class="meaning">${w.english}</div>
<div class="principal-parts">${principalParts(w)}</div>
        </div>
        <div class="badges">
          <span class="level-badge" style="background:${lbg};color:${lc}">${w.level}</span>
          <span class="type-badge">${patBadge}</span>
          <button class="fav-btn${favActive ? ' active' : ''}"
            onclick="toggleFav('${w.id}',this)">${favActive ? '♥' : '♡'}</button>
        </div>
      </div>
      <div class="pattern-strip">
        <span class="pattern-chip" style="background:${pbg};color:${pc}">
          <span class="dot" style="background:${pc}"></span>${w.patternLabel}
        </span>
        <span class="pattern-chip" style="background:var(--bg3);color:var(--text3)">
          <span class="dot" style="background:var(--text3)"></span>Aux: ${w.auxiliary}
        </span>
      </div>
    </div>
    ${buildKnownButtons(w.id)}
    ${verbRuleSection}
    <div class="section">
      <div class="section-label">Konjugation</div>
      ${conjSection}
      ${excNote}
    </div>
    <div class="section">
      <div class="section-label">Kasus</div>
      <div class="case-row">${caseBadges}</div>
      ${auxNote}
      ${prefixNote}
    </div>
    ${prepSection}
    <div class="section">
      <div class="section-label">Verwendung</div>
      <div class="example-list">
        ${(w.usage || []).map(e => `
          <div class="example-item" style="border-left-color:${pc}">
            <div class="example-de">${e.de}</div>
            <div class="example-en">${e.en}</div>
          </div>`).join('')}
      </div>
    </div>
  </div>`;
}

function buildNomenCard(w) {
  const [lbg, lc] = levelStyle(w.level);
  const [gbg, gc] = genderStyle(w.article);
  const [pbg, pc] = pluralStyle(w.pluralPattern);
  const favActive = favs.has(w.id);
  const themeLabels = getThemesArray(w).map(t => THEME_LABELS[t] || t);
  const d = w.declension;

  let endingSection = '';

  if (w.endingRule) {
    endingSection = `<div class="section">
      <div class="section-label">Noun group rule</div>
      <div class="ending-rule">
        <div class="ending-bubble" style="background:${gbg};color:${gc}">${w.endingRule}</div>
        <div>
          <div class="ending-rule-text">Ending <strong style="color:${gc}">${w.endingRule}</strong> → always <em>${w.article}</em></div>
          <div class="ending-rule-sub">${w.nounGroupRule || ''}</div>
        </div>
      </div>
    </div>`;

  } else if (w._genderMatch === false) {
    endingSection = `<div class="section">
      <div class="section-label">Gender rule</div>
      <div class="ending-rule">
        <div class="ending-bubble exc-bubble"
          style="background:rgba(255,107,107,0.15);color:var(--c2)">!</div>
        <div>
          <div class="ending-rule-text" style="color:var(--c2)">Exception</div>
          <div class="ending-rule-sub">${w._genderException}</div>
          ${w._genderRule ? `<div class="ending-rule-sub" style="margin-top:4px;color:var(--text3)">Rule: ${w._genderRule}</div>` : ''}
        </div>
      </div>
    </div>`;

  } else if (w._genderRule) {
    endingSection = `<div class="section">
      <div class="section-label">Gender rule</div>
      <div class="ending-rule">
        <div class="ending-bubble" style="background:${gbg};color:${gc}">${w.article}</div>
        <div>
          <div class="ending-rule-text" style="color:${gc}">${w._genderRule}</div>
        </div>
      </div>
    </div>`;

  } else if (w.nounGroupRule) {
    endingSection = `<div class="section">
      <div class="section-label">Gender rule</div>
      <div class="ending-rule">
        <div class="ending-bubble" style="background:${gbg};color:${gc}">${w.article}</div>
        <div>
          <div class="ending-rule-sub">${w.nounGroupRule}</div>
        </div>
      </div>
    </div>`;
  }

  const pluralNote = w._pluralMatch === false
    ? `<div class="exc-note" style="margin-top:8px">
        <div class="exc-dot">!</div>
        <div>${w._pluralException}</div>
      </div>`
    : w._pluralRule && w._pluralMatch
      ? `<div class="rule-note" style="margin-top:6px">${w._pluralRule}</div>`
      : '';

  return `<div class="word-card">
    <div class="card-header">
      <div class="card-header-top">
        <div>
          <div class="word-title">
            <span class="word-article" style="color:${gc}">${w.article}</span>${w.german}
          </div>
          <div class="meaning">${w.english}</div>
        </div>
        <div class="badges">
          <span class="level-badge" style="background:${lbg};color:${lc}">${w.level}</span>
          <span class="type-badge">Nomen</span>
          ${themeLabels.map(label => `<span class="theme-badge">${label}</span>`).join('')}
          <button class="fav-btn${favActive ? ' active' : ''}"
            onclick="toggleFav('${w.id}',this)">${favActive ? '♥' : '♡'}</button>
        </div>
      </div>
      <div class="pattern-strip">
        <span class="pattern-chip" style="background:${gbg};color:${gc}">
          <span class="dot" style="background:${gc}"></span>
          ${w.gender === 'masculine' ? 'Maskulin (der)' : w.gender === 'feminine' ? 'Feminin (die)' : 'Neutrum (das)'}
        </span>
        <span class="pattern-chip" style="background:${pbg};color:${pc}">
          <span class="dot" style="background:${pc}"></span>${w.pluralPatternLabel}
        </span>
      </div>
    </div>
    ${buildKnownButtons(w.id)}
    <div class="section">
      <div class="section-label">Plural</div>
      <div class="plural-display">
        <div class="plural-word">${w.plural}</div>
        <span class="plural-pill" style="background:${pbg};color:${pc}">${w.pluralPatternLabel}</span>
      </div>
      ${pluralNote}
    </div>
    ${endingSection}
    <div class="section">
      <div class="section-label">Deklination</div>
      <table class="decl-table">
        <thead><tr><th>Kasus</th><th>Singular</th><th>Plural</th></tr></thead>
        <tbody>
          <tr><td>Nom.</td><td class="sf">${d.sg.nom}</td><td class="sf">${d.pl.nom}</td></tr>
          <tr><td>Akk.</td><td>${d.sg.akk}</td><td>${d.pl.akk}</td></tr>
          <tr><td>Dat.</td><td>${d.sg.dat}</td><td>${d.pl.dat}</td></tr>
          <tr><td>Gen.</td><td>${d.sg.gen}</td><td>${d.pl.gen}</td></tr>
        </tbody>
      </table>
    </div>
    <div class="section">
      <div class="section-label">Verwendung</div>
      <div class="example-list">
        ${(w.usage || []).map(e => `
          <div class="example-item" style="border-left-color:${gc}">
            <div class="example-de">${e.de}</div>
            <div class="example-en">${e.en}</div>
          </div>`).join('')}
      </div>
    </div>
  </div>`;
}

function buildAndereCard(w) {
  if (w.wordCategory === 'preposition') return buildPrepositionCard(w);
  if (w.wordCategory === 'adjective') return buildAdjectiveCard(w);
  return buildDefaultAndereCard(w);
}
function buildDefaultAndereCard(w) {
  const [lbg, lc] = levelStyle(w.level);
  const favActive = favs.has(w.id);
  const c = 'var(--andere)';
  const bg = 'var(--andere-bg)';

  const varSection = w.variants?.length
    ? `<div class="section">
        <div class="section-label">Formen & Varianten</div>
        <div class="variants-list">
          ${w.variants.map(v => `
            <div class="variant-row">
              <span class="variant-label">${v.label}</span>
              <span class="variant-form" style="color:${c}">${v.form}</span>
            </div>`).join('')}
        </div>
      </div>` : '';

  const relSection = w.relatedWords?.length
    ? `<div class="section">
        <div class="section-label">Verwandte Wörter</div>
        <div class="variants-list">
          ${w.relatedWords.map(r => `
            <div class="variant-row">
              <span class="variant-label">${r.meaning}</span>
              <span class="variant-form" style="color:${c}">${r.word}</span>
            </div>`).join('')}
        </div>
      </div>` : '';

  return `<div class="word-card">
    <div class="card-header">
      <div class="card-header-top">
        <div>
          <div class="word-title">${w.german}</div>
          <div class="meaning">${w.english}</div>
        </div>
        <div class="badges">
          <span class="level-badge" style="background:${lbg};color:${lc}">${w.level}</span>
          <span class="type-badge">${w.wordType}</span>
          <button class="fav-btn${favActive ? ' active' : ''}"
            onclick="toggleFav('${w.id}',this)">${favActive ? '♥' : '♡'}</button>
        </div>
      </div>
      <div class="pattern-strip">
        <span class="pattern-chip" style="background:${bg};color:${c}">
          <span class="dot" style="background:${c}"></span>${w.wordTypeEN}
        </span>
      </div>
    </div>
    ${buildKnownButtons(w.id)}
    <div class="section">
      <div class="section-label">Grammatikregel</div>
      <div class="grammar-rule">
        <div class="grammar-rule-title">${w.grammarRule}</div>
        <div class="grammar-rule-desc">${w.grammarRuleDetail}</div>
        <div class="grammar-rule-formula">${w.structureFormula}</div>
      </div>
    </div>
    ${varSection}
    ${relSection}
    <div class="section">
      <div class="section-label">Verwendung</div>
      <div class="example-list">
        ${(w.usage || []).map(e => `
          <div class="example-item" style="border-left-color:${c}">
            <div class="example-de">${e.de}</div>
            <div class="example-en">${e.en}</div>
          </div>`).join('')}
      </div>
    </div>
  </div>`;
}
function buildPrepositionCard(w) {
  const [lbg, lc] = levelStyle(w.level);
  const favActive = favs.has(w.id);
  const c = 'var(--andere)';
  const bg = 'var(--andere-bg)';

  // Case badges
  const caseColors = {
    akkusativ: 'var(--verb-weak)',
    dativ: 'var(--verb-strong)',
    genitiv: 'var(--verb-mixed)'
  };
  const caseLabels = { akkusativ: 'Akkusativ', dativ: 'Dativ', genitiv: 'Genitiv' };
  const cases = w.cases || [];

  const caseBadges = ['akkusativ', 'dativ', 'genitiv'].map(k => {
    const on = cases.includes(k);
    const col = caseColors[k];
    return `<div class="prep-case-badge${on ? ' active' : ''}">
      <div class="prep-case-name" style="${on ? `color:${col}` : ''}">
        ${caseLabels[k]}
      </div>
      <div class="prep-case-check" style="color:${on ? col : 'var(--text3)'}">
        ${on ? '✓' : '—'}
      </div>
    </div>`;
  }).join('');

  // Case meaning blocks
  const meaningBlocks = [];
  if (w.meaning_akk) meaningBlocks.push(
    `<div class="prep-meaning-block" style="border-left-color:var(--verb-weak)">
      <div class="prep-meaning-case" style="color:var(--verb-weak)">+ Akkusativ</div>
      <div class="prep-meaning-text">${w.meaning_akk}</div>
    </div>`
  );
  if (w.meaning_dat) meaningBlocks.push(
    `<div class="prep-meaning-block" style="border-left-color:var(--verb-strong)">
      <div class="prep-meaning-case" style="color:var(--verb-strong)">+ Dativ</div>
      <div class="prep-meaning-text">${w.meaning_dat}</div>
    </div>`
  );
  if (w.meaning_gen) meaningBlocks.push(
    `<div class="prep-meaning-block" style="border-left-color:var(--verb-mixed)">
      <div class="prep-meaning-case" style="color:var(--verb-mixed)">+ Genitiv</div>
      <div class="prep-meaning-text">${w.meaning_gen}</div>
    </div>`
  );

  // Verb combinations
  const verbCombos = (w.verbCombinations || []).map(vc => {
    const col = vc.case === 'Akk' ? 'var(--verb-weak)'
      : vc.case === 'Dat' ? 'var(--verb-strong)'
        : 'var(--verb-mixed)';
    return `<div class="prep-verb-row">
      <span class="prep-verb-phrase">${vc.verb}</span>
      <span class="prep-verb-case" style="color:${col}">+${vc.case}</span>
      <span class="prep-verb-meaning">${vc.meaning}</span>
    </div>`;
  }).join('');

  const verbSection = w.verbCombinations?.length ? `
    <div class="section">
      <div class="section-label">Verb combinations</div>
      <div class="prep-verb-list">${verbCombos}</div>
    </div>` : '';

  // Fixed expressions
  const fixedSection = w.fixedExpressions?.length ? `
    <div class="section">
      <div class="section-label">Fixed expressions</div>
      <div class="variants-list">
        ${w.fixedExpressions.map(f => `
          <div class="variant-row">
            <span class="variant-form" style="color:${c}">${f.expression}</span>
            <span class="variant-label">${f.meaning}</span>
          </div>`).join('')}
      </div>
    </div>` : '';

  return `<div class="word-card">
    <div class="card-header">
      <div class="card-header-top">
        <div>
          <div class="word-title">${w.german}</div>
          <div class="meaning">${w.english}</div>
        </div>
        <div class="badges">
          <span class="level-badge" style="background:${lbg};color:${lc}">${w.level}</span>
          <span class="type-badge">Präp.</span>
          <button class="fav-btn${favActive ? ' active' : ''}"
            onclick="toggleFav('${w.id}',this)">${favActive ? '♥' : '♡'}</button>
        </div>
      </div>
      <div class="pattern-strip">
        <span class="pattern-chip" style="background:${bg};color:${c}">
          <span class="dot" style="background:${c}"></span>${w.wordTypeEN}
        </span>
      </div>
    </div>
    ${buildKnownButtons(w.id)}
    <div class="section">
      <div class="section-label">Kasus</div>
      <div class="prep-case-row">${caseBadges}</div>
      <div class="prep-meanings">${meaningBlocks.join('')}</div>
    </div>
    <div class="section">
      <div class="section-label">Grammatikregel</div>
      <div class="grammar-rule">
        <div class="grammar-rule-title">${w.grammarRule}</div>
        <div class="grammar-rule-desc">${w.grammarRuleDetail}</div>
        <div class="grammar-rule-formula">${w.structureFormula}</div>
      </div>
    </div>
    ${verbSection}
    ${fixedSection}
    <div class="section">
      <div class="section-label">Verwendung</div>
      <div class="example-list">
        ${(w.usage || []).map(e => `
          <div class="example-item" style="border-left-color:${c}">
            <div class="example-de">${e.de}</div>
            <div class="example-en">${e.en}</div>
          </div>`).join('')}
      </div>
    </div>
  </div>`;
}

function buildAdjectiveCard(w) {
  const [lbg, lc] = levelStyle(w.level);
  const favActive = favs.has(w.id);
  const c = 'var(--andere)';
  const bg = 'var(--andere-bg)';

  // Steigerung bar
  const steigerung = `
    <div class="adj-steig-row">
      <div class="adj-steig-cell">
        <div class="adj-steig-label">Positiv</div>
        <div class="adj-steig-form">${w.german}</div>
      </div>
      <div class="adj-steig-arrow">→</div>
      <div class="adj-steig-cell">
        <div class="adj-steig-label">Komparativ</div>
        <div class="adj-steig-form" style="color:${c}">${w.comparative}</div>
      </div>
      <div class="adj-steig-arrow">→</div>
      <div class="adj-steig-cell">
        <div class="adj-steig-label">Superlativ</div>
        <div class="adj-steig-form" style="color:${c}">${w.superlative}</div>
      </div>
    </div>`;

  // Opposite
  const oppositeSection = w.opposite ? `
    <div class="adj-opposite">
      <span class="adj-opposite-label">Gegenteil</span>
      <span class="adj-opposite-word" style="color:${c}">${w.opposite}</span>
    </div>` : '';

  // Declension table — only on desktop, CSS handles hide/show
  const d = w.declension;
  const declSection = d ? `
    <div class="section adj-decl-section">
      <div class="section-label">Deklination</div>
      <div class="adj-decl-tabs">
        <button class="adj-decl-tab active" onclick="switchDeclTab(this,'${w.id}','strong')">Strong</button>
        <button class="adj-decl-tab" onclick="switchDeclTab(this,'${w.id}','weak')">Weak</button>
        <button class="adj-decl-tab" onclick="switchDeclTab(this,'${w.id}','mixed')">Mixed</button>
      </div>
      ${['strong', 'weak', 'mixed'].map((type, ti) => `
        <table class="decl-table adj-decl-table" id="adj-decl-${w.id}-${type}"
          style="${ti > 0 ? 'display:none' : ''}">
          <thead>
            <tr>
              <th>Kasus</th>
              <th style="color:var(--der)">Mask.</th>
              <th style="color:var(--die)">Fem.</th>
              <th style="color:var(--das)">Neut.</th>
              <th style="color:var(--text3)">Plural</th>
            </tr>
          </thead>
          <tbody>
            ${['nom', 'akk', 'dat', 'gen'].map((kasus, ki) => `
              <tr>
                <td>${kasus.charAt(0).toUpperCase() + kasus.slice(1)}.</td>
                ${d[type][kasus].map((ending, ei) =>
    `<td class="${ki === 0 ? 'sf' : ''}" style="color:${c}">${w.german.replace(/[^a-zA-ZäöüÄÖÜß]/g, '')}${ending}</td>`
  ).join('')}
              </tr>`).join('')}
          </tbody>
        </table>`).join('')}
    </div>` : '';

  return `<div class="word-card">
    <div class="card-header">
      <div class="card-header-top">
        <div>
          <div class="word-title">${w.german}</div>
          <div class="meaning">${w.english}</div>
        </div>
        <div class="badges">
          <span class="level-badge" style="background:${lbg};color:${lc}">${w.level}</span>
          <span class="type-badge">Adj.</span>
          ${w.irregularForms ? `<span class="type-badge" style="color:var(--verb-strong);border-color:rgba(180,127,255,0.3)">irreg.</span>` : ''}
          <button class="fav-btn${favActive ? ' active' : ''}"
            onclick="toggleFav('${w.id}',this)">${favActive ? '♥' : '♡'}</button>
        </div>
      </div>
      <div class="pattern-strip">
        <span class="pattern-chip" style="background:${bg};color:${c}">
          <span class="dot" style="background:${c}"></span>${w.wordTypeEN}
        </span>
      </div>
    </div>
    ${buildKnownButtons(w.id)}
    <div class="section">
      <div class="section-label">Steigerung</div>
      ${steigerung}
      ${oppositeSection}
    </div>
    <div class="section">
      <div class="section-label">Grammatikregel</div>
      <div class="grammar-rule">
        <div class="grammar-rule-title">${w.grammarRule}</div>
        <div class="grammar-rule-desc">${w.grammarRuleDetail}</div>
        <div class="grammar-rule-formula">${w.structureFormula}</div>
      </div>
    </div>
    ${declSection}
    <div class="section">
      <div class="section-label">Verwandte Wörter</div>
      <div class="variants-list">
        ${(w.relatedWords || []).map(r => `
          <div class="variant-row">
            <span class="variant-label">${r.meaning}</span>
            <span class="variant-form" style="color:${c}">${r.word}</span>
          </div>`).join('')}
      </div>
    </div>
    <div class="section">
      <div class="section-label">Verwendung</div>
      <div class="example-list">
        ${(w.usage || []).map(e => `
          <div class="example-item" style="border-left-color:${c}">
            <div class="example-de">${e.de}</div>
            <div class="example-en">${e.en}</div>
          </div>`).join('')}
      </div>
    </div>
    
  </div>`;
}

function buildKnownButtons(id) {
  const status = getWordStatus(id);
  return `<div class="known-btns">
    <button class="known-btn known-btn-unknown${status === 'unknown' ? ' active' : ''}"
      onclick="markFromCard('${id}','unknown',this)">✗ Still learning</button>
    <button class="known-btn known-btn-known${status === 'known' ? ' active' : ''}"
      onclick="markFromCard('${id}','known',this)">✓ Known</button>
  </div>`;
}

function markFromCard(id, status, btn) {
  const current = getWordStatus(id);
  const next = current === status ? 'unseen' : status;
  setWordStatus(id, next);
  const wrap = btn.closest('.known-btns');
  wrap.querySelectorAll('.known-btn').forEach(b => b.classList.remove('active'));
  if (next !== 'unseen') btn.classList.add('active');
  // Sync dot in word list
  const pool = getPool();
  const idx = pool.findIndex(w => w.id === id);
  const dots = document.querySelectorAll('.wlp-dot');
  if (dots[idx]) dots[idx].className = `wlp-dot wlp-dot-${next}`;
  updateFilterActiveDot();
}
// ── Interactions ──────────────────────────────────────────────
function switchTense(btn, wid, tense) {
  const area = document.getElementById('card-area');
  area.querySelectorAll('.tense-tab').forEach(t => t.classList.remove('active'));
  area.querySelectorAll('.tense-panel').forEach(p => p.style.display = 'none');
  btn.classList.add('active');
  const panel = document.getElementById(`cp-${wid}-${tense}`);
  if (panel) panel.style.display = 'grid';
}

function switchDeclTab(btn, wid, type) {
  const card = document.getElementById('card-area');
  card.querySelectorAll('.adj-decl-tab').forEach(b => b.classList.remove('active'));
  ['strong', 'weak', 'mixed'].forEach(t => {
    const tbl = document.getElementById(`adj-decl-${wid}-${t}`);
    if (tbl) tbl.style.display = t === type ? '' : 'none';
  });
  btn.classList.add('active');
}

function toggleFav(id, btn) {
  favs.has(id) ? favs.delete(id) : favs.add(id);
  btn.classList.toggle('active');
  btn.textContent = favs.has(id) ? '♥' : '♡';
  saveState();          // ← persist
  updateFavButton();    // ← update header count
  // If we're inside the My Words panel, refresh the list live
  if (document.getElementById('mywords-overlay').classList.contains('open')) {
    if (!favs.has(id)) {
      closeMyWordsCard();
      renderMyWords();
    }
  }
}

// ── My Words ─────────────────────────────────────────────────
function openMyWords() {
  renderMyWords();
  document.getElementById('mywords-overlay').classList.add('open');
}

function closeMyWords() {
  document.getElementById('mywords-overlay').classList.remove('open');
  document.getElementById('mywords-card').innerHTML = '';
}

function renderMyWords() {
  const all = [...DB.verben, ...DB.nomen, ...DB.andere];
  const words = all
    .filter(w => favs.has(w.id))
    .sort((a, b) => a.german.localeCompare(b.german));

  document.getElementById('mywords-count').textContent = `· ${words.length}`;

  const listEl = document.getElementById('mywords-list');
  document.getElementById('mywords-card').innerHTML = '';

  if (!words.length) {
    listEl.innerHTML = `<div class="mywords-empty">
      <div class="big">♡</div>
      <div>No favourites yet.</div>
      <div style="font-size:12px;margin-top:6px;color:var(--text3)">
        Tap ♡ on any word card to save it here.
      </div>
    </div>`;
    return;
  }

  listEl.innerHTML = words.map(w => {
    const [lbg, lc] = levelStyle(w.level);
    const [, gc] = w.article ? genderStyle(w.article) : [];
    const articleHtml = w.article
      ? `<span class="search-result-article" style="color:${gc}">${w.article} </span>` : '';
    const patLabel = w.verbFile ? PATTERN_LABELS[w.verbFile]
      : w.theme ? getThemesArray(w).map(t => THEME_LABELS[t] || t).join(' · ')
        : w.wordType || 'Andere';
    return `<div class="search-result-item" onclick="openMyWordsCard('${w.id}')">
      <div style="flex:1;min-width:0">
        <div class="search-result-word">${articleHtml}${w.german}</div>
        <div class="search-result-meaning">${w.english}</div>
      </div>
      <div class="search-result-badges">
        <span class="search-result-lvl" style="background:${lbg};color:${lc}">${w.level}</span>
        <span class="search-result-pat">${patLabel}</span>
      </div>
    </div>`;
  }).join('');
}

function openMyWordsCard(id) {
  const all = [...DB.verben, ...DB.nomen, ...DB.andere];
  const w = all.find(x => x.id === id);
  if (!w) return;

  document.getElementById('mywords-list').style.display = 'none';

  let html = `<button class="card-back-btn" onclick="closeMyWordsCard()"
    style="margin-top:14px">
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M9 2L4 7L9 12" stroke="currentColor" stroke-width="1.5"
        stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    My Words
  </button>`;

  if (w.type === 'verb') html += buildVerbCard(w);
  else if (w.type === 'nomen') html += buildNomenCard(w);
  else html += buildAndereCard(w);

  document.getElementById('mywords-card').innerHTML = html;
}

function closeMyWordsCard() {
  document.getElementById('mywords-card').innerHTML = '';
  document.getElementById('mywords-list').style.display = 'block';
}
// ── Filter sheet ──────────────────────────────────────────────
function toggleFilterSheet() {
  const sheet = document.getElementById('filter-sheet');
  sheet.classList.contains('open') ? closeFilterSheet() : openFilterSheet();
}
function openFilterSheet() {
  buildFilterSheetCtx();
  syncStatusPills();
  document.getElementById('filter-sheet').classList.add('open');
  document.getElementById('filter-backdrop').classList.add('open');
}
function closeFilterSheet() {
  document.getElementById('filter-sheet').classList.remove('open');
  document.getElementById('filter-backdrop').classList.remove('open');
}
function buildFilterSheetCtx() {
  const isVerb = currentType === 'verb';
  const isNomen = currentType === 'nomen';
  let items = [{ val: 'all', label: 'All' }];

  if (isVerb) {
    items = [
      { val: 'all', label: 'All patterns' },
      ...VERB_FILES.map(f => ({ val: f, label: PATTERN_LABELS[f] || f }))
    ];
  } else if (isNomen) {
    const themes = [...new Set(DB.nomen.flatMap(w => getThemesArray(w)))];
    items = [
      { val: 'all', label: 'All themes' },
      ...themes.map(t => ({ val: t, label: THEME_LABELS[t] || t }))
    ];
  } else {
    items = [
      { val: 'all', label: 'All' },
      ...ANDERE_FILES.map(f => ({ val: f, label: ANDERE_CATEGORY_LABELS[f] || f }))
    ];
  }

  const currentVal = isVerb ? currentPattern
    : isNomen ? currentTheme : currentAndereCategory;

  const lbl = items.find(i => i.val === currentVal)?.label || 'All';
  document.getElementById('sheet-ctx-btn').innerHTML = `${lbl} <span>▾</span>`;
  document.getElementById('sheet-ctx-dropdown-menu').innerHTML = items.map(item =>
    `<button class="ctx-menu-item${currentVal === item.val ? ' active' : ''}"
      onclick="pickSheetCtx('${item.val}')">${item.label}</button>`
  ).join('');
}
function syncStatusPills() {
  document.querySelectorAll('.fsp-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.status === currentStatusFilter);
  });
}
function pickSheetCtx(val) {
  document.getElementById('sheet-ctx-dropdown-menu').style.display = 'none';
  if (currentType === 'verb') currentPattern = val;
  else if (currentType === 'nomen') currentTheme = val;
  else currentAndereCategory = val;
  currentIndex = 0;
  buildPatternFilter(); buildThemeFilter(); buildFilterSheetCtx();
  renderCurrentWord(); renderWordListPanel();
  updateFilterActiveDot(); saveState();
}
function pickStatus(status, btn) {
  currentStatusFilter = status;
  document.querySelectorAll('.fsp-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentIndex = 0;
  renderCurrentWord(); renderWordListPanel();
  updateFilterActiveDot(); saveState();
}
function resetFilters() {
  currentPattern = 'all'; currentTheme = 'all';
  currentAndereCategory = 'all'; currentStatusFilter = 'all';
  currentIndex = 0;
  syncStatusPills();
  buildPatternFilter(); buildThemeFilter(); buildFilterSheetCtx();
  renderCurrentWord(); renderWordListPanel();
  updateFilterActiveDot(); closeFilterSheet(); saveState();
}
function updateFilterActiveDot() {
  const active = currentPattern !== 'all' || currentTheme !== 'all' ||
    currentAndereCategory !== 'all' || currentStatusFilter !== 'all';
  document.getElementById('filter-active-dot').style.display = active ? 'block' : 'none';
}


// ── Boot ──────────────────────────────────────────────────────
loadData();
