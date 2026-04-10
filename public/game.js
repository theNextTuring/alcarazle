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

let PLAYERS = [];
let answer = null;
let selectedPlayer = null;
let guessCount = 0;
let guessedNames = new Set();
let gameOver = false;
let guessLog = [];
let darkMode = false;

async function init() {
  if (localStorage.getItem('tennisle-dark') === '1') toggleDark();

  try {
    const res = await fetch('/api/players');
    if (!res.ok) {
      let detail = '';
      try {
        const errJson = await res.json();
        detail = errJson?.detail || errJson?.error || '';
      } catch {
        detail = await res.text();
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

function pickAnswer() {
  const seed = getDailySeed();
  return PLAYERS[seed % PLAYERS.length];
}

function setupGame() {
  const saved = loadSavedState();
  if (saved) {
    restoreState(saved);
  } else {
    answer = pickAnswer();
  }

  document.getElementById('player-input').addEventListener('input', handleInput);
  document.getElementById('player-input').addEventListener('keydown', handleKey);
  document.getElementById('guess-btn').addEventListener('click', submitGuess);
  document.addEventListener('click', e => {
    if (!e.target.closest('#search-area')) document.getElementById('autocomplete').style.display = 'none';
  });
}

function saveState() {
  const state = {
    date: getDailySeed(),
    answerName: answer.name,
    guessCount,
    guessedNames: [...guessedNames],
    guessLog,
    gameOver,
  };
  localStorage.setItem('tennisle-state', JSON.stringify(state));
}

function loadSavedState() {
  try {
    const raw = localStorage.getItem('tennisle-state');
    if (!raw) return null;
    const state = JSON.parse(raw);
    if (state.date !== getDailySeed()) return null;
    return state;
  } catch { return null; }
}

function restoreState(state) {
  answer = PLAYERS.find(p => p.name === state.answerName) || pickAnswer();
  guessCount = state.guessCount;
  guessedNames = new Set(state.guessedNames);
  guessLog = state.guessLog;
  gameOver = state.gameOver;

  const rem = 6 - guessCount;
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
  localStorage.setItem('tennisle-dark', darkMode ? '1' : '0');
}

function toggleHow() {
  const el = document.getElementById('how-to');
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function handleInput() {
  const val = document.getElementById('player-input').value.trim().toLowerCase();
  const ac = document.getElementById('autocomplete');
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

function rankLabel(r) {
  if (r >= 999) return 'Retired';
  if (r <= 10)  return 'Top 10';
  if (r <= 25)  return 'Top 25';
  if (r <= 50)  return 'Top 50';
  if (r <= 100) return 'Top 100';
  return 'Top 150';
}

function rankOrder(r) {
  if (r >= 999) return 6;
  if (r <= 10)  return 1;
  if (r <= 25)  return 2;
  if (r <= 50)  return 3;
  if (r <= 100) return 4;
  return 5;
}

function natClass(gNat, aNat) {
  if (gNat === aNat) return 'correct';
  if (CONTINENTS[gNat] && CONTINENTS[gNat] === CONTINENTS[aNat]) return 'present';
  return 'absent';
}

function buildCells(g, a) {
  return [
    { label:'Nation',   val:g.nat,              arrow:'', cls:natClass(g.nat, a.nat) },
    { label:'Age',      val:g.age,              arrow:g.age===a.age?'':g.age<a.age?'▲':'▼', cls:g.age===a.age?'correct':Math.abs(g.age-a.age)<=3?'present':'absent' },
    { label:'Hand',     val:g.hand,             arrow:'', cls:g.hand===a.hand?'correct':'absent' },
    { label:'Backhand', val:g.bh,               arrow:'', cls:g.bh===a.bh?'correct':'absent' },
    { label:'Ranking',  val:rankLabel(g.ranking), arrow:rankOrder(g.ranking)===rankOrder(a.ranking)?'':rankOrder(g.ranking)<rankOrder(a.ranking)?'▼':'▲', cls:rankOrder(g.ranking)===rankOrder(a.ranking)?'correct':Math.abs(rankOrder(g.ranking)-rankOrder(a.ranking))===1?'present':'absent' },
    { label:'Titles',   val:g.titles,           arrow:g.titles===a.titles?'':g.titles<a.titles?'▲':'▼', cls:g.titles===a.titles?'correct':Math.abs(g.titles-a.titles)<=5?'present':'absent' },
  ];
}

function renderGuessRow(g, animate) {
  const cells = buildCells(g, answer);
  const container = document.getElementById('guesses-container');
  const row = document.createElement('div');
  row.className = 'guess-row';
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
  const g = selectedPlayer;

  const emoji = renderGuessRow(g, true);
  guessLog.push(emoji);

  const won = g.name === answer.name;
  const lost = !won && guessCount >= 6;
  const rem = 6 - guessCount;
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
  banner.className = won ? 'win' : 'lose';
  banner.innerHTML = `
    <div id="result-title">${won ? 'Ace!' : 'Better luck tomorrow'}</div>
    <div id="result-sub">${won
      ? `You identified <strong>${answer.name}</strong> in ${guessCount} guess${guessCount===1?'':'es'}.`
      : `The answer was <strong>${answer.name}</strong> — ${answer.nat}, ${answer.titles} career titles.`}
    </div>
    <div class="result-btns">
      <button class="btn-primary" onclick="shareResult()">Share result</button>
    </div>
    <div id="share-confirm"></div>
  `;
}

function shareResult() {
  const date = new Date().toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
  const text = `Tennisle ${date}\n${guessCount}/6\n\n${guessLog.join('\n')}\n\ntennisle.com`;
  navigator.clipboard.writeText(text).then(() => {
    document.getElementById('share-confirm').textContent = 'Copied to clipboard!';
  }).catch(() => {
    document.getElementById('share-confirm').textContent = 'Copy failed — try manually.';
  });
}

init();
