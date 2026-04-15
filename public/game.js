'use strict';

const CONTINENTS = {
  "Serbia":"Europe","Spain":"Europe","Italy":"Europe","Switzerland":"Europe","Britain":"Europe",
  "France":"Europe","Greece":"Europe","Norway":"Europe","Denmark":"Europe","Germany":"Europe",
  "Poland":"Europe","Belgium":"Europe","Croatia":"Europe","Austria":"Europe","Sweden":"Europe",
  "Czech Republic":"Europe","Portugal":"Europe","Bulgaria":"Europe","Slovakia":"Europe",
  "Hungary":"Europe","Netherlands":"Europe","Romania":"Europe","Georgia":"Europe","Slovenia":"Europe",
  "Montenegro":"Europe","Bosnia":"Europe","Finland":"Europe","Latvia":"Europe","Cyprus":"Europe",
  "Russia":"Europe","Ukraine":"Europe","Belarus":"Europe",
  "Kazakhstan":"Asia","Japan":"Asia","South Korea":"Asia","China":"Asia","India":"Asia","Thailand":"Asia",
  "USA":"North America","Canada":"North America","Mexico":"North America",
  "Argentina":"South America","Brazil":"South America","Chile":"South America",
  "Colombia":"South America","Uruguay":"South America","Ecuador":"South America",
  "Australia":"Oceania","New Zealand":"Oceania",
  "South Africa":"Africa","Morocco":"Africa","Tunisia":"Africa",
};

let PLAYERS       = [];
let answer        = null;
let selectedPlayer = null;
let guessCount    = 0;
let guessedNames  = new Set();
let gameOver      = false;
let guessLog      = [];
let darkMode      = false;
let practiceMode  = false;

async function init() {
  if (localStorage.getItem('alcarazle-dark') === '1') toggleDark();
  practiceMode = new URLSearchParams(window.location.search).get('practice') === '1';
  if (practiceMode) document.getElementById('mode-badge').style.display = 'inline-block';

  try {
    const res = await fetch('/api/players');
    if (!res.ok) {
      const raw = await res.text();
      let detail = raw;
      try {
        const errJson = JSON.parse(raw);
        detail = errJson?.detail || errJson?.error || raw;
      } catch {
        // Keep raw text when response is not JSON.
      }
      throw new Error(`Failed to load players (${res.status})${detail ? `: ${detail}` : ''}`);
    }
    PLAYERS = await res.json();
    if (!Array.isArray(PLAYERS) || PLAYERS.length === 0) {
      throw new Error('Players list is empty. Check Supabase table data and RLS policy.');
    }
    document.getElementById('loading').style.display = 'none';
    setupGame();
  } catch (err) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('guesses-container').innerHTML =
      `<div id="error-msg">Could not load player data. ${err.message}</div>`;
    console.error(err);
  }
}

function getDailySeed() {
  const now = new Date();
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
}

function pickDailyAnswer() {
  return PLAYERS[getDailySeed() % PLAYERS.length];
}

function pickRandomAnswer(excludeName) {
  const pool = excludeName ? PLAYERS.filter(p => p.name !== excludeName) : PLAYERS;
  return pool[Math.floor(Math.random() * pool.length)];
}

function setupGame() {
  if (practiceMode) {
    answer = pickRandomAnswer();
    resetUI();
  } else {
    const saved = loadSavedState();
    if (saved) { restoreState(saved); }
    else { answer = pickDailyAnswer(); resetUI(); }
  }

  document.getElementById('player-input').addEventListener('input', handleInput);
  document.getElementById('player-input').addEventListener('keydown', handleKey);
  document.getElementById('guess-btn').addEventListener('click', submitGuess);
  document.addEventListener('click', e => {
    if (!e.target.closest('#search-area')) document.getElementById('autocomplete').style.display = 'none';
  });
}

function resetUI() {
  guessCount   = 0;
  guessedNames = new Set();
  guessLog     = [];
  gameOver     = false;
  document.getElementById('guesses-container').innerHTML = '';
  document.getElementById('result-banner').style.display = 'none';
  document.getElementById('guesses-left').textContent = '6 guesses remaining';
  const input = document.getElementById('player-input');
  input.disabled = false;
  input.value = '';
  document.getElementById('guess-btn').disabled = true;
}

function saveState() {
  if (practiceMode) return;
  localStorage.setItem('alcarazle-state', JSON.stringify({
    date: getDailySeed(),
    answerName: answer.name,
    guessCount,
    guessedNames: [...guessedNames],
    guessLog,
    gameOver,
  }));
}

function loadSavedState() {
  try {
    const raw = localStorage.getItem('alcarazle-state');
    if (!raw) return null;
    const state = JSON.parse(raw);
    if (state.date !== getDailySeed()) return null;
    return state;
  } catch { return null; }
}

function restoreState(state) {
  answer       = PLAYERS.find(p => p.name === state.answerName) || pickDailyAnswer();
  guessCount   = state.guessCount;
  guessedNames = new Set(state.guessedNames);
  guessLog     = state.guessLog;
  gameOver     = state.gameOver;
  const rem    = 6 - guessCount;
  document.getElementById('guesses-left').textContent = gameOver ? '' : `${rem} guess${rem===1?'':'es'} remaining`;
  state.guessedNames.forEach(name => {
    const g = PLAYERS.find(p => p.name === name);
    if (g) renderGuessRow(g, false);
  });
  if (gameOver) {
    const won = state.guessedNames[state.guessedNames.length - 1] === answer.name;
    showResult(won);
  }
}

function toggleDark() {
  darkMode = !darkMode;
  document.body.classList.toggle('dark', darkMode);
  document.getElementById('dark-toggle').textContent = darkMode ? 'Light mode' : 'Dark mode';
  localStorage.setItem('alcarazle-dark', darkMode ? '1' : '0');
}

function toggleHow() {
  const el = document.getElementById('how-to');
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function enterPractice() { window.location.href = '/?practice=1'; }
function exitPractice()  { window.location.href = '/'; }

function handleInput() {
  const val = document.getElementById('player-input').value.trim().toLowerCase();
  const ac  = document.getElementById('autocomplete');
  selectedPlayer = null;
  document.getElementById('guess-btn').disabled = true;
  if (val.length < 2) { ac.style.display = 'none'; return; }
  const matches = PLAYERS
    .filter(p => p.name.toLowerCase().includes(val) && !guessedNames.has(p.name))
    .slice(0, 7);
  if (!matches.length) { ac.style.display = 'none'; return; }
  ac.innerHTML = matches.map(p =>
    `<div class="ac-item" data-name="${p.name}">
      <span style="font-weight:500">${p.name}</span>
      <span class="ac-nat">${p.nat}</span>
    </div>`
  ).join('');
  ac.querySelectorAll('.ac-item').forEach(el => {
    el.addEventListener('click', () => selectPlayer(el.dataset.name));
  });
  ac.style.display = 'block';
}

function handleKey(e) {
  if (e.key === 'Enter' && !document.getElementById('guess-btn').disabled) submitGuess();
}

function selectPlayer(name) {
  selectedPlayer = PLAYERS.find(p => p.name === name);
  document.getElementById('player-input').value = name;
  document.getElementById('autocomplete').style.display = 'none';
  document.getElementById('guess-btn').disabled = false;
}

function natClass(gNat, aNat) {
  if (gNat === aNat) return 'correct';
  if (CONTINENTS[gNat] && CONTINENTS[gNat] === CONTINENTS[aNat]) return 'present';
  return 'absent';
}

function heightLabel(cm) {
  if (!cm) return '?';
  const totalIn = Math.round(cm / 2.54);
  const ft      = Math.floor(totalIn / 12);
  const inch    = totalIn % 12;
  return `${ft}'${inch}"`;
}

function buildCells(g, a) {
  const htG  = g.height_cm  || 0;
  const htA  = a.height_cm  || 0;
  // "Close" on height = within 1 inch = within ~2.54cm; we use 3cm to account for rounding
  const htCls = htG === htA ? 'correct' : Math.abs(htG - htA) <= 3 ? 'present' : 'absent';

  return [
    { label:'Nation',     val:g.nat,            arrow:'',                                                  cls: natClass(g.nat, a.nat) },
    { label:'Age',        val:g.age,            arrow: g.age===a.age?'':g.age<a.age?'▲':'▼',             cls: g.age===a.age?'correct':Math.abs(g.age-a.age)<=3?'present':'absent' },
    { label:'Hand',       val:g.hand,           arrow:'',                                                  cls: g.hand===a.hand?'correct':'absent' },
    { label:'Backhand',   val:g.bh,             arrow:'',                                                  cls: g.bh===a.bh?'correct':'absent' },
    { label:'Height',     val:heightLabel(htG), arrow: htG===htA?'':htG<htA?'▲':'▼',                    cls: htCls },
    { label:'Titles',     val:g.titles,         arrow: g.titles===a.titles?'':g.titles<a.titles?'▲':'▼', cls: g.titles===a.titles?'correct':Math.abs(g.titles-a.titles)<=5?'present':'absent' },
  ];
}

function renderGuessRow(g, animate) {
  const cells     = buildCells(g, answer);
  const container = document.getElementById('guesses-container');
  const row       = document.createElement('div');
  row.className   = 'guess-row';
  if (animate) row.style.animation = 'fadeIn 0.25s ease';
  row.innerHTML = `
    <div class="guess-name">${g.name}</div>
    <div class="guess-grid">
      ${cells.map(c => `
        <div class="guess-cell ${c.cls}">
          <div class="cell-label">${c.label}</div>
          <div class="cell-val">${c.val}</div>
          <div class="cell-arrow">${c.arrow}</div>
        </div>`).join('')}
    </div>`;
  container.appendChild(row);
  const emojiMap = { correct:'🟩', present:'🟪', absent:'⬜' };
  return cells.map(c => emojiMap[c.cls]).join('');
}

function submitGuess() {
  if (!selectedPlayer || gameOver) return;
  guessCount++;
  guessedNames.add(selectedPlayer.name);
  const g     = selectedPlayer;
  const emoji = renderGuessRow(g, true);
  guessLog.push(emoji);

  const won  = g.name === answer.name;
  const lost = !won && guessCount >= 6;
  const rem  = 6 - guessCount;
  document.getElementById('guesses-left').textContent = (won || lost) ? '' : `${rem} guess${rem===1?'':'es'} remaining`;

  if (won || lost) {
    gameOver = true;
    document.getElementById('guess-btn').disabled = true;
    document.getElementById('player-input').disabled = true;
    showResult(won);
  }

  saveState();
  selectedPlayer = null;
  document.getElementById('player-input').value = '';
  document.getElementById('guess-btn').disabled = true;
}

function showResult(won) {
  const banner = document.getElementById('result-banner');
  banner.style.display = 'block';
  banner.className     = won ? 'win' : 'lose';

  const actionBtns = practiceMode
    ? `<button class="btn-primary" onclick="nextPracticeRound()">Next player</button>
       <button class="btn-secondary" onclick="exitPractice()">Back to daily</button>`
    : `<button class="btn-primary" onclick="shareResult()">Share result</button>
       <button class="btn-secondary" onclick="enterPractice()">Practice mode</button>`;

  banner.innerHTML = `
    <div id="result-title">${won ? 'Ace!' : 'Better luck tomorrow'}</div>
    <div id="result-sub">${won
      ? `You identified <strong>${answer.name}</strong> in ${guessCount} guess${guessCount===1?'':'es'}.`
      : `The answer was <strong>${answer.name}</strong> — ${answer.nat}, ${answer.titles} career titles.`}
    </div>
    <div class="result-btns">${actionBtns}</div>
    <div id="share-confirm"></div>
  `;
}

function nextPracticeRound() {
  answer = pickRandomAnswer(answer.name);
  resetUI();
}

function shareResult() {
  const date = new Date().toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
  const text = `Alcarazle ${date}\n${guessCount}/6\n\n${guessLog.join('\n')}\n\nalcarazle.com`;
  navigator.clipboard.writeText(text).then(() => {
    document.getElementById('share-confirm').textContent = 'Copied to clipboard!';
  }).catch(() => {
    document.getElementById('share-confirm').textContent = 'Copy failed — try manually.';
  });
}

init();
