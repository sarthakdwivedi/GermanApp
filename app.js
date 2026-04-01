// ── Data sources ─────────────────────────────────────────────
const VERB_FILES = [
  'weak', 'strong', 'mixed_irregular',
  'modal', 'reflexive', 'separable', 'inseparable'
];
const NOMEN_FILES = [
  'people', 'home', 'work_education',
  'food', 'nature_travel', 'society_abstract'
];

// ── App state ─────────────────────────────────────────────────
let DB = { verben: [], nomen: [], andere: [] };
let currentType    = 'verb';
let currentLevel   = 'all';
let currentTheme   = 'all';
let currentPattern = 'all';
let currentIndex   = 0;
let searchQuery    = '';
let searchPool     = null;   // non-null when search is active
let inSearchResult = false;  // viewing a card opened from search
const favs = new Set();

// ── Swipe tracking ────────────────────────────────────────────
let touchStartX = 0;
let touchStartY = 0;

// ── Constants ─────────────────────────────────────────────────
const TENSE_LABELS = {
  prasens:'Präsens', prateritum:'Präteritum',
  perfekt:'Perfekt', konjunktiv2:'Konjunktiv II'
};
const PRONOUNS = {
  ich:'ich', du:'du', er:'er/sie/es',
  wir:'wir', ihr:'ihr', sie:'sie/Sie'
};
const THEME_LABELS = {
  people:'People', home:'Home',
  work_education:'Work & Education', food:'Food',
  nature_travel:'Nature & Travel', society_abstract:'Society & Abstract'
};
const PATTERN_LABELS = {
  weak:'Weak', strong:'Strong', mixed_irregular:'Mixed / Irregular',
  modal:'Modal', reflexive:'Reflexive',
  separable:'Separable', inseparable:'Inseparable'
};

// ── Data loading ──────────────────────────────────────────────
async function loadData() {
  try {
    const responses = await Promise.all([
      fetch('data/andere.json'),
      ...VERB_FILES.map(f  => fetch(`data/verben/${f}.json`)),
      ...NOMEN_FILES.map(f => fetch(`data/nomen/${f}.json`))
    ]);

    for (const r of responses) {
      if (!r.ok) throw new Error(`404: ${r.url}`);
    }

    const [andereRes, ...allFileResults] = responses;
    const verbResults  = allFileResults.slice(0, VERB_FILES.length);
    const nomenResults = allFileResults.slice(VERB_FILES.length);

    const verbenArrays = await Promise.all(verbResults.map(r  => r.json()));
    const nomenArrays  = await Promise.all(nomenResults.map(r => r.json()));

    // Tag each verb with its pattern group
    VERB_FILES.forEach((f, i) => {
      verbenArrays[i].forEach(w => { w.verbFile = f; });
    });

    DB.verben = verbenArrays.flat();
    DB.nomen  = nomenArrays.flat();
    DB.andere = await andereRes.json();

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
  document.getElementById('app').style.display = 'block';

  const total = DB.verben.length + DB.nomen.length + DB.andere.length;
  document.getElementById('stats-pill').textContent = `${total} words · A1–C2`;

  buildPatternFilter();
  buildThemeFilter();
  showContextualFilter();
  renderCurrentWord();
  setupSwipe();
}

// ── Filter builders ───────────────────────────────────────────
function buildPatternFilter() {
  const c = document.getElementById('pattern-filter');
  c.innerHTML =
    `<button class="theme-btn active" data-pat="all" onclick="switchPattern('all',this)">All patterns</button>` +
    VERB_FILES.map(f =>
      `<button class="theme-btn" data-pat="${f}" onclick="switchPattern('${f}',this)">${PATTERN_LABELS[f]||f}</button>`
    ).join('');
}

function buildThemeFilter() {
  const themes = [...new Set(DB.nomen.map(w => w.theme).filter(Boolean))];
  const c = document.getElementById('theme-filter');
  c.innerHTML =
    `<button class="theme-btn active" data-theme="all" onclick="switchTheme('all',this)">All themes</button>` +
    themes.map(t =>
      `<button class="theme-btn" data-theme="${t}" onclick="switchTheme('${t}',this)">${THEME_LABELS[t]||t}</button>`
    ).join('');
}

function showContextualFilter() {
  document.getElementById('pattern-filter').classList.toggle('visible', currentType === 'verb');
  document.getElementById('theme-filter').classList.toggle('visible', currentType === 'nomen');
}

// ── Pool helpers ──────────────────────────────────────────────
function getPool() {
  if (searchPool !== null) return searchPool;

  let pool = currentType === 'verb'  ? DB.verben
           : currentType === 'nomen' ? DB.nomen
           : DB.andere;

  if (currentLevel !== 'all')
    pool = pool.filter(w => w.level === currentLevel);
  if (currentType === 'nomen' && currentTheme !== 'all')
    pool = pool.filter(w => w.theme === currentTheme);
  if (currentType === 'verb' && currentPattern !== 'all')
    pool = pool.filter(w => w.verbFile === currentPattern);

  return pool;
}

// ── Search ────────────────────────────────────────────────────
function onSearch(query) {
  searchQuery = query.trim().toLowerCase();
  document.getElementById('search-clear').style.display = searchQuery ? 'block' : 'none';

  if (!searchQuery) {
    // Restore normal browse mode
    searchPool     = null;
    inSearchResult = false;
    document.getElementById('search-results').style.display = 'none';
    document.getElementById('type-tabs').style.display    = 'flex';
    document.getElementById('level-filter').style.display = 'flex';
    showContextualFilter();
    currentIndex = 0;
    renderCurrentWord();
    return;
  }

  // Hide browse chrome during search
  document.getElementById('type-tabs').style.display    = 'none';
  document.getElementById('level-filter').style.display = 'none';
  document.getElementById('pattern-filter').classList.remove('visible');
  document.getElementById('theme-filter').classList.remove('visible');
  document.getElementById('nav-bar').style.display  = 'none';
  document.getElementById('card-area').innerHTML    = '';
  inSearchResult = false;
  searchPool     = null;

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
    const [,gc]     = w.article ? genderStyle(w.article) : [];
    const articleHtml = w.article
      ? `<span class="search-result-article" style="color:${gc}">${w.article} </span>` : '';
    const patLabel = w.verbFile ? PATTERN_LABELS[w.verbFile] || w.verbFile
                   : w.theme    ? THEME_LABELS[w.theme] || w.theme
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
  const w   = all.find(x => x.id === id);
  if (!w) return;

  searchPool     = [w];
  currentIndex   = 0;
  inSearchResult = true;

  document.getElementById('search-results').style.display = 'none';
  renderCurrentWord();
}

function exitSearchResult() {
  searchPool     = null;
  inSearchResult = false;
  document.getElementById('card-area').innerHTML  = '';
  document.getElementById('nav-bar').style.display = 'none';
  document.getElementById('search-results').style.display = 'block';
}

// ── Type / Level / Pattern / Theme switching ──────────────────
function switchType(type) {
  currentType    = type;
  currentLevel   = 'all';
  currentTheme   = 'all';
  currentPattern = 'all';
  currentIndex   = 0;
  searchPool     = null;
  inSearchResult = false;

  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.tab.${type}`).classList.add('active');
  document.querySelectorAll('.lvl-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.lvl-btn[data-lvl="all"]').classList.add('active');

  // Reset sub-filters
  const pf = document.getElementById('pattern-filter');
  const tf = document.getElementById('theme-filter');
  pf.querySelector('[data-pat="all"]')?.classList.add('active');
  tf.querySelector('[data-theme="all"]')?.classList.add('active');
  pf.querySelectorAll('.theme-btn:not([data-pat="all"])').forEach(b => b.classList.remove('active'));
  tf.querySelectorAll('.theme-btn:not([data-theme="all"])').forEach(b => b.classList.remove('active'));

  showContextualFilter();
  renderCurrentWord();
}

function switchLevel(level, btn) {
  currentLevel = level;
  currentIndex = 0;
  document.querySelectorAll('.lvl-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderCurrentWord();
}

function switchPattern(pattern, btn) {
  currentPattern = pattern;
  currentIndex   = 0;
  document.querySelectorAll('#pattern-filter .theme-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderCurrentWord();
}

function switchTheme(theme, btn) {
  currentTheme = theme;
  currentIndex = 0;
  document.querySelectorAll('#theme-filter .theme-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderCurrentWord();
}

// ── Navigation ────────────────────────────────────────────────
function navigateWord(dir) {
  const pool = getPool();
  if (!pool.length) return;
  const next = currentIndex + dir;
  if (next < 0 || next >= pool.length) return;
  currentIndex = next;
  renderCurrentWord(dir < 0 ? 'right' : 'left');
}

function renderCurrentWord(slideDir) {
  const pool     = getPool();
  const navBar   = document.getElementById('nav-bar');
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
  if (w.type === 'verb')       cardHtml = buildVerbCard(w);
  else if (w.type === 'nomen') cardHtml = buildNomenCard(w);
  else                         cardHtml = buildAndereCard(w);

  if (slideDir) {
    cardHtml = cardHtml.replace(
      'class="word-card"',
      `class="word-card slide-${slideDir}"`
    );
  }

  cardArea.innerHTML = html + cardHtml;

  // Nav bar
  navBar.style.display = 'flex';
  updateNavBar(pool, currentIndex);
  document.getElementById('nav-prev').disabled = currentIndex === 0;
  document.getElementById('nav-next').disabled = currentIndex === pool.length - 1;
}

function updateNavBar(pool, idx) {
  // Progress bar
  const pct = pool.length === 1 ? 100 : (idx / (pool.length - 1)) * 100;
  document.getElementById('nav-progress-fill').style.width = `${pct}%`;

  // Dots — up to 7, centred around current position
  const total   = pool.length;
  const maxDots = 7;
  const dotsEl  = document.getElementById('nav-dots');

  if (total <= 1) { dotsEl.innerHTML = ''; return; }

  let start = Math.max(0, idx - Math.floor(maxDots / 2));
  let end   = Math.min(total - 1, start + maxDots - 1);
  if (end - start < maxDots - 1) start = Math.max(0, end - maxDots + 1);

  dotsEl.innerHTML = Array.from({ length: end - start + 1 }, (_, i) => {
    const pos  = start + i;
    const diff = Math.abs(pos - idx);
    const cls  = diff === 0 ? 'active' : diff === 1 ? 'nearby' : '';
    return `<div class="nav-dot${cls?' '+cls:''}"></div>`;
  }).join('');
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
}

// ── Colour helpers ────────────────────────────────────────────
function levelStyle(l) {
  const m = {
    A1:['rgba(105,219,124,0.15)','var(--a1)'],
    A2:['rgba(169,227,75,0.15)', 'var(--a2)'],
    B1:['rgba(74,158,255,0.15)', 'var(--b1)'],
    B2:['rgba(116,143,252,0.15)','var(--b2)'],
    C1:['rgba(218,119,242,0.15)','var(--c1)'],
    C2:['rgba(255,107,107,0.15)','var(--c2)'],
  };
  return m[l] || ['var(--bg3)', 'var(--text2)'];
}
function patternStyle(pc) {
  if (pc==='weak')   return ['var(--verb-weak-bg)',   'var(--verb-weak)'];
  if (pc==='strong') return ['var(--verb-strong-bg)', 'var(--verb-strong)'];
  if (pc==='mixed')  return ['var(--verb-mixed-bg)',  'var(--verb-mixed)'];
  return ['var(--bg3)','var(--text2)'];
}
function genderStyle(article) {
  if (article==='der') return ['var(--der-bg)','var(--der)'];
  if (article==='die') return ['var(--die-bg)','var(--die)'];
  if (article==='das') return ['var(--das-bg)','var(--das)'];
  return ['var(--bg3)','var(--text2)'];
}
function pluralStyle(pp) {
  if (pp==='-en'||pp==='-n'||pp==='-se') return ['var(--pl-en-bg)','var(--pl-en)'];
  if (pp==='-er'||pp==='umlaut-er')      return ['var(--pl-er-bg)','var(--pl-er)'];
  if (pp==='-e'||pp==='umlaut-e'||pp==='umlaut') return ['var(--pl-e-bg)','var(--pl-e)'];
  if (pp==='-s')                         return ['var(--pl-s-bg)', 'var(--pl-s)'];
  return ['var(--pl-same-bg)','var(--pl-same)'];
}

// ── Card builders ─────────────────────────────────────────────
function buildVerbCard(w) {
  const [lbg,lc] = levelStyle(w.level);
  const [pbg,pc] = patternStyle(w.patternColor);
  const excSet   = new Set(w.exceptionForms || []);
  const tenses   = Object.keys(w.conjugations);
  const favActive = favs.has(w.id);

  const conjPanels = tenses.map((tense, i) => {
    const rows = Object.entries(w.conjugations[tense]).map(([p, form]) => {
      const isExc = excSet.has('prasens-all') || excSet.has(`${tense}-all`) ||
                    excSet.has(`${tense}-${p}`) || excSet.has('all');
      return `<div class="conj-row">
        <span class="conj-pronoun">${PRONOUNS[p]}</span>
        <span class="conj-form${isExc?' exc':''}">${form}</span>
      </div>`;
    }).join('');
    return `<div id="cp-${w.id}-${tense}" class="conj-grid tense-panel"
      style="${i>0?'display:none':''}">${rows}</div>`;
  }).join('');

  const tenseTabs = tenses.map((t,i) =>
    `<button class="tense-tab${i===0?' active':''}"
      onclick="switchTense(this,'${w.id}','${t}')">${TENSE_LABELS[t]||t}</button>`
  ).join('');

  const excNote = w.exceptions?.length
    ? `<div class="exc-note"><div class="exc-dot">!</div><div>${w.exceptions.join(' · ')}</div></div>` : '';

  const kasus = w.kasus || [];
  const caseBadges = [
    {k:'akkusativ',label:'Akkusativ',cls:'on-akk',color:'var(--verb-weak)'},
    {k:'dativ',    label:'Dativ',    cls:'on-dat',color:'var(--verb-strong)'},
    {k:'reflexiv', label:'Reflexiv', cls:'on-akk',color:'var(--verb-weak)'},
  ].map(b => {
    const on = b.k==='reflexiv' ? w.reflexiv : kasus.includes(b.k);
    return `<div class="case-badge${on?' '+b.cls:''}">
      <div class="case-badge-label">${b.label}</div>
      <div class="case-badge-val" style="color:${on?b.color:'var(--text3)'}">
        ${on?'✓':'—'}
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

  return `<div class="word-card">
    <div class="card-header">
      <div class="card-header-top">
        <div>
          <div class="word-title">${w.german}</div>
          <div class="meaning">${w.english}</div>
        </div>
        <div class="badges">
          <span class="level-badge" style="background:${lbg};color:${lc}">${w.level}</span>
          <span class="type-badge">${patBadge}</span>
          <button class="fav-btn${favActive?' active':''}"
            onclick="toggleFav('${w.id}',this)">${favActive?'♥':'♡'}</button>
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
    <div class="section">
      <div class="section-label">Konjugation</div>
      <div class="tense-tabs">${tenseTabs}</div>
      ${conjPanels}
      ${excNote}
    </div>
    <div class="section">
      <div class="section-label">Kasus</div>
      <div class="case-row">${caseBadges}</div>
    </div>
    ${prepSection}
    <div class="section">
      <div class="section-label">Verwendung</div>
      <div class="example-list">
        ${(w.usage||[]).map(e=>`
          <div class="example-item" style="border-left-color:${pc}">
            <div class="example-de">${e.de}</div>
            <div class="example-en">${e.en}</div>
          </div>`).join('')}
      </div>
    </div>
  </div>`;
}

function buildNomenCard(w) {
  const [lbg,lc] = levelStyle(w.level);
  const [gbg,gc] = genderStyle(w.article);
  const [pbg,pc] = pluralStyle(w.pluralPattern);
  const favActive = favs.has(w.id);
  const themeLabel = w.theme ? THEME_LABELS[w.theme]||w.theme : null;
  const d = w.declension;

  const endingSection = w.endingRule
    ? `<div class="section">
        <div class="section-label">Noun group rule</div>
        <div class="ending-rule">
          <div class="ending-bubble" style="background:${gbg};color:${gc}">${w.endingRule}</div>
          <div>
            <div class="ending-rule-text">Ending <strong style="color:${gc}">${w.endingRule}</strong> → always <em>${w.article}</em></div>
            <div class="ending-rule-sub">${w.nounGroupRule}</div>
          </div>
        </div>
      </div>`
    : `<div class="section">
        <div class="section-label">Gender rule</div>
        <div class="ending-rule">
          <div class="ending-bubble" style="background:${gbg};color:${gc}">${w.article}</div>
          <div>
            <div class="ending-rule-text" style="color:${gc}">${w.article.toUpperCase()}</div>
            <div class="ending-rule-sub">${w.nounGroupRule}</div>
          </div>
        </div>
      </div>`;

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
          ${themeLabel?`<span class="theme-badge">${themeLabel}</span>`:''}
          <button class="fav-btn${favActive?' active':''}"
            onclick="toggleFav('${w.id}',this)">${favActive?'♥':'♡'}</button>
        </div>
      </div>
      <div class="pattern-strip">
        <span class="pattern-chip" style="background:${gbg};color:${gc}">
          <span class="dot" style="background:${gc}"></span>
          ${w.gender==='masculine'?'Maskulin (der)':w.gender==='feminine'?'Feminin (die)':'Neutrum (das)'}
        </span>
        <span class="pattern-chip" style="background:${pbg};color:${pc}">
          <span class="dot" style="background:${pc}"></span>${w.pluralPatternLabel}
        </span>
      </div>
    </div>
    <div class="section">
      <div class="section-label">Plural</div>
      <div class="plural-display">
        <div class="plural-word">${w.plural}</div>
        <span class="plural-pill" style="background:${pbg};color:${pc}">${w.pluralPatternLabel}</span>
      </div>
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
        ${(w.usage||[]).map(e=>`
          <div class="example-item" style="border-left-color:${gc}">
            <div class="example-de">${e.de}</div>
            <div class="example-en">${e.en}</div>
          </div>`).join('')}
      </div>
    </div>
  </div>`;
}

function buildAndereCard(w) {
  const [lbg,lc] = levelStyle(w.level);
  const favActive = favs.has(w.id);
  const c  = 'var(--andere)';
  const bg = 'var(--andere-bg)';

  const varSection = w.variants?.length
    ? `<div class="section">
        <div class="section-label">Formen & Varianten</div>
        <div class="variants-list">
          ${w.variants.map(v=>`
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
          ${w.relatedWords.map(r=>`
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
          <button class="fav-btn${favActive?' active':''}"
            onclick="toggleFav('${w.id}',this)">${favActive?'♥':'♡'}</button>
        </div>
      </div>
      <div class="pattern-strip">
        <span class="pattern-chip" style="background:${bg};color:${c}">
          <span class="dot" style="background:${c}"></span>${w.wordTypeEN}
        </span>
      </div>
    </div>
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
        ${(w.usage||[]).map(e=>`
          <div class="example-item" style="border-left-color:${c}">
            <div class="example-de">${e.de}</div>
            <div class="example-en">${e.en}</div>
          </div>`).join('')}
      </div>
    </div>
  </div>`;
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

function toggleFav(id, btn) {
  favs.has(id) ? favs.delete(id) : favs.add(id);
  btn.classList.toggle('active');
  btn.textContent = favs.has(id) ? '♥' : '♡';
}

// ── Boot ──────────────────────────────────────────────────────
loadData();
