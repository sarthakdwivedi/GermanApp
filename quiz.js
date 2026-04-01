// ═══════════════════════════════════════════════════════════════
// PHASE 5 — FLASHCARD & QUIZ
// ═══════════════════════════════════════════════════════════════

// ── Quiz state ────────────────────────────────────────────────
const QUIZ = {
  mode:       null,      // 'flashcard' | 'choice' | 'blank' | 'conjugation'
  queue:      [],        // ordered word array for this session
  index:      0,         // current position in queue
  correct:    0,
  wrong:      0,
  mistakes:   [],        // word ids answered incorrectly
  reviewMode: false,     // true when re-running mistakes
  flipped:    false,     // flashcard state
  tense:      null,      // active tense for conjugation drill
  pronoun:    null,      // active pronoun for conjugation drill
};

const TENSES_FOR_DRILL  = ['prasens', 'prateritum', 'perfekt'];
const PRONOUNS_FOR_DRILL = ['ich', 'du', 'er', 'wir', 'ihr', 'sie'];

// ── Score persistence ─────────────────────────────────────────
function loadScores() {
  try { return JSON.parse(localStorage.getItem('wortschatz_scores') || '{}'); }
  catch(e) { return {}; }
}
function saveScores(scores) {
  localStorage.setItem('wortschatz_scores', JSON.stringify(scores));
}
function recordScore(id, correct) {
  const scores = loadScores();
  if (!scores[id]) scores[id] = { correct: 0, wrong: 0 };
  correct ? scores[id].correct++ : scores[id].wrong++;
  scores[id].lastSeen = Date.now();
  saveScores(scores);
}
function wordPriority(id, scores) {
  const s = scores[id];
  if (!s) return 1;                                  // never seen → highest priority
  const total = s.correct + s.wrong;
  const ratio = total === 0 ? 0 : s.wrong / total;
  return ratio + (Math.random() * 0.15);             // small shuffle
}

// ── Queue builder ─────────────────────────────────────────────
function buildQuizQueue(pool) {
  const scores = loadScores();
  return [...pool].sort((a, b) => wordPriority(b.id, scores) - wordPriority(a.id, scores));
}

// ── Open / close quiz panel ───────────────────────────────────
function openQuiz() {
  const pool = getPool();
  if (!pool.length) return;

  QUIZ.reviewMode = false;
  document.getElementById('quiz-overlay').classList.add('open');
  renderQuizSetup(pool);
}

function closeQuiz() {
  document.getElementById('quiz-overlay').classList.remove('open');
  document.getElementById('quiz-body').innerHTML = '';
}

// ── Setup screen ──────────────────────────────────────────────
function renderQuizSetup(pool) {
  const typeLabel  = currentType === 'verb' ? 'Verben' : currentType === 'nomen' ? 'Nomen' : 'Andere';
  const levelLabel = currentLevel === 'all' ? 'All levels' : currentLevel;
  const scores     = loadScores();
  const seen       = pool.filter(w => scores[w.id]).length;
  const weak       = pool.filter(w => {
    const s = scores[w.id];
    return s && s.wrong > s.correct;
  }).length;

  // Hide conjugation mode for non-verbs
  const conjOption = currentType === 'verb' ? `
    <label class="quiz-mode-btn" onclick="selectQuizMode(this,'conjugation')">
      <input type="radio" name="qmode" value="conjugation">
      <div class="quiz-mode-icon">⌨</div>
      <div class="quiz-mode-label">Conjugation drill</div>
      <div class="quiz-mode-sub">Type the verb form</div>
    </label>` : '';

  document.getElementById('quiz-body').innerHTML = `
    <div class="quiz-setup">
      <div class="quiz-scope-pill">
        ${typeLabel} · ${levelLabel} · <strong>${pool.length}</strong> words
        ${seen ? `<span style="color:var(--text3)"> · ${weak} weak</span>` : ''}
      </div>

      <div class="quiz-section-label">Choose mode</div>
      <div class="quiz-modes">
        <label class="quiz-mode-btn active" onclick="selectQuizMode(this,'flashcard')">
          <input type="radio" name="qmode" value="flashcard" checked>
          <div class="quiz-mode-icon">🃏</div>
          <div class="quiz-mode-label">Flashcard</div>
          <div class="quiz-mode-sub">Flip to reveal</div>
        </label>
        <label class="quiz-mode-btn" onclick="selectQuizMode(this,'choice')">
          <input type="radio" name="qmode" value="choice">
          <div class="quiz-mode-icon">✦</div>
          <div class="quiz-mode-label">Multiple choice</div>
          <div class="quiz-mode-sub">Pick the answer</div>
        </label>
        <label class="quiz-mode-btn" onclick="selectQuizMode(this,'blank')">
          <input type="radio" name="qmode" value="blank">
          <div class="quiz-mode-icon">✏</div>
          <div class="quiz-mode-label">Fill in blank</div>
          <div class="quiz-mode-sub">Type the word</div>
        </label>
        ${conjOption}
      </div>

      <button class="quiz-start-btn" onclick="startQuiz('${pool.map(w=>w.id).join(',')}')">
        Start →
      </button>
    </div>`;
}

function selectQuizMode(label, mode) {
  document.querySelectorAll('.quiz-mode-btn').forEach(b => b.classList.remove('active'));
  label.classList.add('active');
  QUIZ.mode = mode;
}

// ── Start quiz ────────────────────────────────────────────────
function startQuiz(idList) {
  const mode = document.querySelector('input[name="qmode"]:checked')?.value || 'flashcard';
  QUIZ.mode     = mode;
  QUIZ.correct  = 0;
  QUIZ.wrong    = 0;
  QUIZ.mistakes = [];
  QUIZ.index    = 0;
  QUIZ.flipped  = false;

  const all = [...DB.verben, ...DB.nomen, ...DB.andere];
  const ids = idList.split(',');
  const pool = ids.map(id => all.find(w => w.id === id)).filter(Boolean);
  QUIZ.queue = buildQuizQueue(pool);

  renderQuizCard();
}

// ── Quiz progress bar ─────────────────────────────────────────
function quizProgressHTML() {
  const total = QUIZ.queue.length;
  const done  = QUIZ.index;
  const pct   = total ? (done / total) * 100 : 0;
  return `<div class="quiz-progress-wrap">
    <div class="quiz-progress-bar">
      <div class="quiz-progress-fill" style="width:${pct}%"></div>
    </div>
    <div class="quiz-progress-label">
      <span style="color:var(--a1)">✓ ${QUIZ.correct}</span>
      <span style="color:var(--text3)">${done} / ${total}</span>
      <span style="color:var(--c2)">✗ ${QUIZ.wrong}</span>
    </div>
  </div>`;
}

// ── Route to correct renderer ─────────────────────────────────
function renderQuizCard() {
  if (QUIZ.index >= QUIZ.queue.length) { renderQuizEnd(); return; }
  const w = QUIZ.queue[QUIZ.index];
  QUIZ.flipped = false;

  if      (QUIZ.mode === 'flashcard')   renderFlashcard(w);
  else if (QUIZ.mode === 'choice')      renderMultipleChoice(w);
  else if (QUIZ.mode === 'blank')       renderFillBlank(w);
  else if (QUIZ.mode === 'conjugation') renderConjDrill(w);
}

// ── FLASHCARD ─────────────────────────────────────────────────
function renderFlashcard(w) {
  const [lbg, lc] = levelStyle(w.level);
  const [gbg, gc] = w.article ? genderStyle(w.article) : ['var(--bg3)','var(--text2)'];
  const frontWord = w.article
    ? `<span style="color:${gc};opacity:0.6;font-size:18px;margin-right:4px">${w.article}</span>${w.german}`
    : w.german;
  const example = w.usage?.[0];

  document.getElementById('quiz-body').innerHTML = `
    ${quizProgressHTML()}
    <div class="flashcard-wrap" onclick="flipCard()">
      <div class="flashcard ${QUIZ.flipped ? 'flipped' : ''}">
        <div class="flashcard-face flashcard-front">
          <div class="fc-level" style="background:${lbg};color:${lc}">${w.level}</div>
          <div class="fc-word">${frontWord}</div>
          <div class="fc-hint">tap to reveal</div>
        </div>
        <div class="flashcard-face flashcard-back">
          <div class="fc-meaning">${w.english}</div>
          ${example ? `<div class="fc-example">
            <div class="fc-example-de">${example.de}</div>
            <div class="fc-example-en">${example.en}</div>
          </div>` : ''}
          <div class="fc-pattern">${w.patternLabel || w.wordType || ''}</div>
        </div>
      </div>
    </div>
    <div class="flashcard-actions" id="fc-actions" style="display:${QUIZ.flipped?'flex':'none'}">
      <button class="fc-btn fc-wrong" onclick="answerFlashcard(false)">✗ Didn't know</button>
      <button class="fc-btn fc-correct" onclick="answerFlashcard(true)">✓ Knew it</button>
    </div>`;
}

function flipCard() {
  QUIZ.flipped = !QUIZ.flipped;
  const card = document.querySelector('.flashcard');
  const actions = document.getElementById('fc-actions');
  if (card) card.classList.toggle('flipped', QUIZ.flipped);
  if (actions) actions.style.display = QUIZ.flipped ? 'flex' : 'none';
}

function answerFlashcard(correct) {
  recordScore(QUIZ.queue[QUIZ.index].id, correct);
  correct ? QUIZ.correct++ : QUIZ.wrong++;
  if (!correct) QUIZ.mistakes.push(QUIZ.queue[QUIZ.index].id);
  QUIZ.index++;
  renderQuizCard();
}

// ── MULTIPLE CHOICE ───────────────────────────────────────────
function renderMultipleChoice(w) {
  const q = buildChoiceQuestion(w);
  const [lbg, lc] = levelStyle(w.level);

  document.getElementById('quiz-body').innerHTML = `
    ${quizProgressHTML()}
    <div class="quiz-question-wrap">
      <div class="quiz-q-label">${q.label}</div>
      <div class="quiz-q-word">
        <span class="level-badge" style="background:${lbg};color:${lc};margin-right:8px">${w.level}</span>
        ${q.word}
      </div>
    </div>
    <div class="quiz-choices" id="quiz-choices">
      ${q.options.map((opt, i) => `
        <button class="quiz-choice" onclick="answerChoice(this, ${i === q.correctIndex}, '${QUIZ.queue[QUIZ.index].id}')">
          ${opt}
        </button>`).join('')}
    </div>`;
}

function buildChoiceQuestion(w) {
  const all  = [...DB.verben, ...DB.nomen, ...DB.andere];
  const pool = getPool();

  // Pick question type based on word
  const qTypes = ['meaning'];
  if (w.type === 'nomen')  qTypes.push('article');
  if (w.type === 'verb')   qTypes.push('auxiliary');
  const qType = qTypes[Math.floor(Math.random() * qTypes.length)];

  if (qType === 'article') {
    const options = shuffle(['der', 'die', 'das', w.article === 'der' ? 'die' : 'der'])
      .filter((v,i,a) => a.indexOf(v) === i).slice(0,4);
    // ensure correct is included
    if (!options.includes(w.article)) options[0] = w.article;
    const opts = shuffle(options);
    return { label:'What is the article?', word:w.german, options:opts, correctIndex:opts.indexOf(w.article) };
  }

  if (qType === 'auxiliary') {
    const options = shuffle(['haben', 'sein', 'haben / sein']);
    const correct = w.auxiliary || 'haben';
    const match   = options.find(o => o === correct) ? correct : options[0];
    return { label:'Which auxiliary verb?', word:w.german, options, correctIndex:options.indexOf(match) };
  }

  // Default: meaning
  const distractors = shuffle(pool.filter(x => x.id !== w.id))
    .slice(0, 3).map(x => x.english);
  const options = shuffle([w.english, ...distractors]);
  return { label:'What does this mean?', word: w.article ? `${w.article} ${w.german}` : w.german,
           options, correctIndex: options.indexOf(w.english) };
}

function answerChoice(btn, correct, id) {
  const btns = document.querySelectorAll('.quiz-choice');
  btns.forEach(b => b.disabled = true);
  btn.classList.add(correct ? 'correct' : 'wrong');
  if (!correct) {
    // highlight the correct one
    const q = buildChoiceQuestion(QUIZ.queue[QUIZ.index]);
    btns[q.correctIndex]?.classList.add('correct');
  }
  recordScore(id, correct);
  correct ? QUIZ.correct++ : QUIZ.wrong++;
  if (!correct) QUIZ.mistakes.push(id);
  setTimeout(() => { QUIZ.index++; renderQuizCard(); }, 1100);
}

// ── FILL IN THE BLANK ─────────────────────────────────────────
function renderFillBlank(w) {
  const q = buildBlankQuestion(w);
  const [lbg, lc] = levelStyle(w.level);

  document.getElementById('quiz-body').innerHTML = `
    ${quizProgressHTML()}
    <div class="quiz-question-wrap">
      <div class="quiz-q-label">${q.label}</div>
      <div class="quiz-q-sentence">${q.sentence}</div>
      <div class="quiz-q-hint">${q.hint}</div>
    </div>
    <div class="quiz-blank-wrap">
      <input id="blank-input" class="quiz-blank-input"
        type="text" placeholder="type here…"
        autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
        onkeydown="if(event.key==='Enter')submitBlank('${w.id}','${escQ(q.answer)}')">
      <button class="quiz-blank-submit" onclick="submitBlank('${w.id}','${escQ(q.answer)}')">→</button>
    </div>
    <div id="blank-feedback"></div>`;

  setTimeout(() => document.getElementById('blank-input')?.focus(), 100);
}

function buildBlankQuestion(w) {
  const example = w.usage?.[0];
  if (example) {
    // Try to find the word (or a form of it) in the sentence
    const stem  = w.german.toLowerCase().replace('sich ', '').replace('(sich) ', '');
    const words = example.de.split(/\s+/);
    const match = words.find(word => {
      const clean = word.toLowerCase().replace(/[.,!?]/g,'');
      return clean.includes(stem.slice(0,4)) || stem.includes(clean.slice(0,4));
    });
    if (match) {
      const blanked = example.de.replace(match, '___');
      return { label:'Complete the sentence:', sentence:blanked,
               hint:`(${example.en})`, answer:match.replace(/[.,!?]/g,'') };
    }
  }
  // Fallback: translate the word
  return { label:'Translate into German:', sentence:w.english,
           hint: w.article ? `(hint: ${w.article} ___)` : '(German word)',
           answer: w.german.replace('sich ', '').replace('(sich) ', '') };
}

function escQ(s) { return s.replace(/'/g,"\\'"); }

function submitBlank(id, answer) {
  const input    = document.getElementById('blank-input');
  const feedback = document.getElementById('blank-feedback');
  if (!input) return;
  const given   = input.value.trim().toLowerCase();
  const correct = answer.toLowerCase();
  const isRight = given === correct || given === correct.replace(/ß/g,'ss');

  recordScore(id, isRight);
  isRight ? QUIZ.correct++ : QUIZ.wrong++;
  if (!isRight) QUIZ.mistakes.push(id);

  input.disabled = true;
  input.classList.add(isRight ? 'input-correct' : 'input-wrong');
  feedback.innerHTML = isRight
    ? `<div class="blank-result correct">✓ Correct!</div>`
    : `<div class="blank-result wrong">✗ Answer: <strong>${answer}</strong></div>`;

  setTimeout(() => { QUIZ.index++; renderQuizCard(); }, 1200);
}

// ── CONJUGATION DRILL ─────────────────────────────────────────
function renderConjDrill(w) {
  // Skip non-verbs silently
  if (w.type !== 'verb') { QUIZ.index++; renderQuizCard(); return; }

  const tenses   = Object.keys(w.conjugations).filter(t => TENSES_FOR_DRILL.includes(t));
  const tense    = tenses[Math.floor(Math.random() * tenses.length)];
  const pronoun  = PRONOUNS_FOR_DRILL[Math.floor(Math.random() * PRONOUNS_FOR_DRILL.length)];
  const answer   = w.conjugations[tense][pronoun];
  QUIZ.tense     = tense;
  QUIZ.pronoun   = pronoun;

  const [lbg, lc] = levelStyle(w.level);

  document.getElementById('quiz-body').innerHTML = `
    ${quizProgressHTML()}
    <div class="quiz-question-wrap">
      <div class="quiz-q-label">Conjugate the verb</div>
      <div class="quiz-q-word">
        <span class="level-badge" style="background:${lbg};color:${lc};margin-right:8px">${w.level}</span>
        ${w.german}
      </div>
      <div class="conj-drill-row">
        <span class="conj-drill-tense">${TENSE_LABELS[tense]}</span>
        <span class="conj-drill-pronoun">${PRONOUNS[pronoun]}</span>
        <span class="conj-drill-arrow">→</span>
        <span class="conj-drill-q">?</span>
      </div>
    </div>
    <div class="quiz-blank-wrap">
      <input id="blank-input" class="quiz-blank-input"
        type="text" placeholder="type the form…"
        autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
        onkeydown="if(event.key==='Enter')submitConj('${w.id}','${escQ(answer)}')">
      <button class="quiz-blank-submit" onclick="submitConj('${w.id}','${escQ(answer)}')">→</button>
    </div>
    <div id="blank-feedback"></div>`;

  setTimeout(() => document.getElementById('blank-input')?.focus(), 100);
}

function submitConj(id, answer) {
  const input    = document.getElementById('blank-input');
  const feedback = document.getElementById('blank-feedback');
  if (!input) return;
  const given   = input.value.trim().toLowerCase();
  const correct = answer.toLowerCase();
  const isRight = given === correct || given === correct.replace(/ß/g,'ss');

  recordScore(id, isRight);
  isRight ? QUIZ.correct++ : QUIZ.wrong++;
  if (!isRight) QUIZ.mistakes.push(id);

  input.disabled = true;
  input.classList.add(isRight ? 'input-correct' : 'input-wrong');
  feedback.innerHTML = isRight
    ? `<div class="blank-result correct">✓ Correct!</div>`
    : `<div class="blank-result wrong">✗ Answer: <strong>${answer}</strong></div>`;

  setTimeout(() => { QUIZ.index++; renderQuizCard(); }, 1200);
}

// ── END SCREEN ────────────────────────────────────────────────
function renderQuizEnd() {
  const total   = QUIZ.queue.length;
  const pct     = total ? Math.round((QUIZ.correct / total) * 100) : 0;
  const all     = [...DB.verben, ...DB.nomen, ...DB.andere];
  const mistakeWords = QUIZ.mistakes
    .filter((id,i,a) => a.indexOf(id) === i)
    .map(id => all.find(w => w.id === id)).filter(Boolean);

  const emoji = pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '💪';

  const mistakesHTML = mistakeWords.length ? `
    <div class="quiz-section-label" style="margin-top:20px">Review these words</div>
    <div class="quiz-mistakes-list">
      ${mistakeWords.map(w => {
        const [lbg,lc] = levelStyle(w.level);
        return `<div class="quiz-mistake-item">
          <span class="quiz-mistake-word">${w.article?w.article+' ':''}${w.german}</span>
          <span class="quiz-mistake-en">${w.english}</span>
          <span class="search-result-lvl" style="background:${lbg};color:${lc}">${w.level}</span>
        </div>`;
      }).join('')}
    </div>
    <button class="quiz-start-btn quiz-retry-btn"
      onclick="startQuiz('${mistakeWords.map(w=>w.id).join(',')}')">
      Retry mistakes →
    </button>` : '';

  document.getElementById('quiz-body').innerHTML = `
    <div class="quiz-end">
      <div class="quiz-end-emoji">${emoji}</div>
      <div class="quiz-end-score">${pct}%</div>
      <div class="quiz-end-detail">${QUIZ.correct} correct · ${QUIZ.wrong} wrong · ${total} total</div>
      ${mistakesHTML}
      <button class="quiz-start-btn" style="margin-top:16px"
        onclick="startQuiz('${QUIZ.queue.map(w=>w.id).join(',')}')">
        Restart →
      </button>
    </div>`;
}

// ── Utility ───────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}