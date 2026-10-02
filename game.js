'use strict';

/* =====================================================================
 * CLOSE ENOUGH — pure logic (no DOM). Exported for Node tests at bottom.
 * ===================================================================== */

const ROUND_SIZE = 5;
const ANSWER_MS = 20000;
const BOARD_MAX = 10;
const NAME_MAX = 12;
const DAILY_EPOCH_UTC = Date.UTC(2026, 9, 2); // Daily #1 = 2026-10-02

// ---------- PRNG / selection ----------

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Same seed + same bank => same 5 questions in the same order for everyone.
function pickQuestions(bank, seed, n = ROUND_SIZE) {
  const pool = bank.filter(q => !q.verify).slice().sort((a, b) => a.id - b.id);
  const rnd = mulberry32(seed);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}

// ---------- Scoring ----------

function scoreGuess(q, guess) {
  if (guess === null || guess === undefined || !Number.isFinite(guess)) return 0;
  if (q.type === 'year') {
    const span = q.span || 50;
    return Math.round(1000 * Math.max(0, 1 - Math.abs(guess - q.answer) / span));
  }
  if (guess <= 0 || q.answer <= 0) return 0;
  const e = Math.abs(Math.log(guess / q.answer));
  return Math.round(1000 * Math.exp(-3 * e));
}

function emojiFor(points) {
  if (points >= 800) return '🟩';
  if (points >= 500) return '🟨';
  if (points >= 200) return '🟧';
  return '🟥';
}

// ---------- Spoken number parser (en + ru) ----------

const SMALL = {
  // English
  zero: 0, oh: 0, nought: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
  fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fourty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90,
  // Russian (nominative + common oblique forms)
  ноль: 0, нуль: 0, один: 1, одна: 1, одно: 1, одного: 1, одной: 1, одну: 1,
  два: 2, две: 2, двух: 2, три: 3, трех: 3, четыре: 4, четырех: 4,
  пять: 5, пяти: 5, шесть: 6, шести: 6, семь: 7, семи: 7, восемь: 8, восьми: 8,
  девять: 9, девяти: 9, десять: 10, десяти: 10,
  одиннадцать: 11, одиннадцати: 11, двенадцать: 12, двенадцати: 12,
  тринадцать: 13, тринадцати: 13, четырнадцать: 14, четырнадцати: 14,
  пятнадцать: 15, пятнадцати: 15, шестнадцать: 16, шестнадцати: 16,
  семнадцать: 17, семнадцати: 17, восемнадцать: 18, восемнадцати: 18,
  девятнадцать: 19, девятнадцати: 19,
  двадцать: 20, двадцати: 20, тридцать: 30, тридцати: 30, сорок: 40, сорока: 40,
  пятьдесят: 50, пятидесяти: 50, шестьдесят: 60, шестидесяти: 60,
  семьдесят: 70, семидесяти: 70, восемьдесят: 80, восьмидесяти: 80,
  девяносто: 90, девяноста: 90,
  сто: 100, ста: 100, двести: 200, двухсот: 200, триста: 300, трехсот: 300,
  четыреста: 400, четырехсот: 400, пятьсот: 500, пятисот: 500,
  шестьсот: 600, шестисот: 600, семьсот: 700, семисот: 700,
  восемьсот: 800, восьмисот: 800, девятьсот: 900, девятисот: 900,
  полтора: 1.5, полторы: 1.5, полутора: 1.5
};

const SCALES = {
  thousand: 1e3, thousands: 1e3, k: 1e3, grand: 1e3,
  million: 1e6, millions: 1e6, mln: 1e6, mil: 1e6,
  billion: 1e9, billions: 1e9, bn: 1e9,
  trillion: 1e12, trillions: 1e12,
  тысяча: 1e3, тысячи: 1e3, тысяч: 1e3, тысячу: 1e3, тысячей: 1e3, тыс: 1e3, тыщ: 1e3, тыщи: 1e3,
  миллион: 1e6, миллиона: 1e6, миллионов: 1e6, миллионом: 1e6, млн: 1e6, лям: 1e6, ляма: 1e6, лямов: 1e6,
  миллиард: 1e9, миллиарда: 1e9, миллиардов: 1e9, млрд: 1e9, ярд: 1e9,
  триллион: 1e12, триллиона: 1e12, триллионов: 1e12, трлн: 1e12
};

const HUNDRED = new Set(['hundred', 'hundreds']);
const HALF = new Set(['half', 'половина', 'половиной', 'половину', 'половины']);
const POINT = new Set(['point', 'dot', 'точка', 'запятая']);

// Russian ordinal stems ("тысяча девятьсот сорок пятом году")
const RU_ORD = [
  ['двухтысячн', 2000], ['тысячн', 1000],
  ['девятисот', 900], ['восьмисот', 800], ['семисот', 700], ['шестисот', 600], ['пятисот', 500],
  ['четырехсот', 400], ['трехсот', 300], ['двухсот', 200], ['сот', 100],
  ['девяност', 90], ['восьмидесят', 80], ['семидесят', 70], ['шестидесят', 60], ['пятидесят', 50],
  ['сороков', 40], ['тридцат', 30], ['двадцат', 20],
  ['девятнадцат', 19], ['восемнадцат', 18], ['семнадцат', 17], ['шестнадцат', 16],
  ['пятнадцат', 15], ['четырнадцат', 14], ['тринадцат', 13], ['двенадцат', 12], ['одиннадцат', 11],
  ['десят', 10], ['девят', 9], ['восьм', 8], ['седьм', 7], ['шест', 6], ['пят', 5],
  ['четверт', 4], ['трет', 3], ['втор', 2], ['перв', 1], ['нулев', 0]
];
const RU_ORD_END = /^(ый|ой|ий|ая|ое|ого|ому|ом|ым|ые|ых|ую|ья|ье|ьего|ьему|ьем|ьей|ей|ем)$/;

function ruOrdinal(w) {
  for (const [stem, v] of RU_ORD) {
    if (w.startsWith(stem) && RU_ORD_END.test(w.slice(stem.length))) return v;
  }
  return null;
}

function tokenize(input) {
  let s = String(input).toLowerCase().replace(/ё/g, 'е');
  s = s.replace(/[   ]/g, ' ');
  s = s.replace(/[−–—-]/g, ' ');
  // "8 848" / "1 000 000" -> joined digit groups
  for (let i = 0; i < 4; i++) s = s.replace(/(\d)\s+(?=\d{3}(?!\d))/g, '$1');
  // "8,848" -> 8848 (thousands separator); other "1,5" -> 1.5 (decimal comma)
  s = s.replace(/(\d),(?=\d{3}(?!\d))/g, '$1');
  s = s.replace(/(\d),(?=\d)/g, '$1.');
  // split glued digits/letters: "10млн", "1.5k"
  s = s.replace(/(\d)([a-zа-я])/g, '$1 $2').replace(/([a-zа-я])(\d)/g, '$1 $2');
  s = s.replace(/[^0-9a-zа-я.\s]/g, ' ');
  return s.split(/\s+/).map(t => t.replace(/^\.+|\.+$/g, '')).filter(Boolean);
}

function classify(tok) {
  if (/^\d+(\.\d+)?$/.test(tok)) return [{ k: 'num', v: parseFloat(tok), digits: tok }];
  if (tok in SMALL) return [{ k: 'num', v: SMALL[tok] }];
  if (tok in SCALES) return [{ k: 'scale', v: SCALES[tok] }];
  if (HUNDRED.has(tok)) return [{ k: 'hundred' }];
  if (HALF.has(tok)) return [{ k: 'half' }];
  if (POINT.has(tok)) return [{ k: 'point' }];
  if (tok === 'пол') return [{ k: 'num', v: 0.5 }];
  // "полмиллиона", "полтысячи"
  if (tok.startsWith('пол') && tok.slice(3) in SCALES) return [{ k: 'num', v: 0.5 }, { k: 'scale', v: SCALES[tok.slice(3)] }];
  const ord = ruOrdinal(tok);
  if (ord !== null) return [{ k: 'num', v: ord }];
  return []; // filler: "about", "meters", "и", "года", ...
}

// Trailing-zero "place" of an integer: 800 -> 100, 80 -> 10, 0 ("oh") -> 10, 7 -> 1
function placeOf(v) {
  if (!Number.isInteger(v)) return 0;
  if (v === 0) return 10;
  let p = 1;
  while (v % (p * 10) === 0) p *= 10;
  return p;
}

function parseSpokenNumber(input) {
  if (input === null || input === undefined) return null;
  const items = [];
  for (const t of tokenize(input)) items.push(...classify(t));
  if (!items.some(i => i.k === 'num' || i.k === 'scale' || i.k === 'hundred')) return null;

  const structural = items.some(i => i.k !== 'num');
  if (!structural) {
    // Only bare numbers: group "twenty"+"one", "сто"+"двадцать"+"пять", etc.
    const groups = [];
    let last = null;
    for (const it of items) {
      const g = groups[groups.length - 1];
      if (g && last !== null && Number.isInteger(it.v) && it.v > 0 && it.v < placeOf(last)) {
        g.v += it.v;
      } else {
        groups.push({ v: it.v });
      }
      last = it.v;
    }
    if (groups.length === 1) return clean(groups[0].v);
    if (groups.every(g => Number.isInteger(g.v) && g.v >= 0)) {
      // "nineteen eighty nine" -> 1989, "twenty twenty one" -> 2021
      if (groups.length === 2 && groups[0].v >= 10 && groups[0].v <= 99 && groups[1].v <= 99) {
        return groups[0].v * 100 + groups[1].v;
      }
      // "eight eight four eight" -> 8848, "one twenty" -> 120
      return clean(parseFloat(groups.map(g => String(g.v)).join('')));
    }
    return clean(groups.reduce((s, g) => s + g.v, 0));
  }

  let total = 0, current = 0, lastScale = 0, inFrac = false, frac = '';
  const flushFrac = () => {
    if (inFrac && frac) current += parseFloat('0.' + frac);
    inFrac = false; frac = '';
  };
  for (const it of items) {
    if (it.k === 'num') {
      if (inFrac && Number.isInteger(it.v)) frac += it.digits || String(it.v);
      else { flushFrac(); current += it.v; }
    } else if (it.k === 'point') {
      flushFrac(); inFrac = true;
    } else if (it.k === 'hundred') {
      flushFrac(); current = (current || 1) * 100;
    } else if (it.k === 'scale') {
      flushFrac();
      total += (current || 1) * it.v;
      current = 0; lastScale = it.v;
    } else if (it.k === 'half') {
      flushFrac();
      if (current === 0 && lastScale) total += 0.5 * lastScale; // "a million and a half"
      else current += 0.5;                                       // "two and a half million"
    }
  }
  flushFrac();
  return clean(total + current);
}

function clean(n) {
  if (!Number.isFinite(n) || n < 0) return null;
  return Number(n.toPrecision(12));
}

// ---------- Challenge board ----------

function cleanName(name) {
  return String(name || '').replace(/[:,]/g, '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
}

function parseBoard(str) {
  if (!str) return [];
  const out = [];
  for (const part of String(str).split(',')) {
    const i = part.lastIndexOf(':');
    if (i < 0) continue;
    let name;
    try { name = decodeURIComponent(part.slice(0, i)); } catch (e) { name = part.slice(0, i); }
    name = cleanName(name);
    const score = parseInt(part.slice(i + 1), 10);
    if (!name || !Number.isFinite(score) || score < 0 || score > 5000) continue;
    out.push({ name, score });
  }
  return sortBoard(out).slice(0, BOARD_MAX);
}

function sortBoard(b) {
  return b.slice().sort((x, y) => y.score - x.score);
}

function serializeBoard(board) {
  return board.map(e => encodeURIComponent(e.name) + ':' + e.score).join(',');
}

function updateBoard(board, name, score) {
  const n = cleanName(name);
  const key = n.toLowerCase();
  const out = board.filter(e => e.name.toLowerCase() !== key);
  const prev = board.find(e => e.name.toLowerCase() === key);
  out.push({ name: n, score: prev ? Math.max(prev.score, score) : score });
  return sortBoard(out).slice(0, BOARD_MAX);
}

function friendToBeat(board, myName) {
  const key = cleanName(myName).toLowerCase();
  return sortBoard(board).find(e => e.name.toLowerCase() !== key) || null;
}

// ---------- Dates ----------

function utcDateSeed(d = new Date()) {
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
}

function dailyNumber(d = new Date()) {
  const today = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.floor((today - DAILY_EPOCH_UTC) / 86400000) + 1;
}

const fmtInt = n => Math.round(n).toLocaleString('en-US');

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    mulberry32, pickQuestions, scoreGuess, emojiFor, parseSpokenNumber, tokenize,
    parseBoard, serializeBoard, updateBoard, friendToBeat, cleanName, utcDateSeed, dailyNumber
  };
}

/* =====================================================================
 * UI
 * ===================================================================== */

if (typeof document !== 'undefined') (function () {
  const $ = id => document.getElementById(id);
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const LANG = 'en-US';
  const MAX = ROUND_SIZE * 1000;
  const RING_C = 2 * Math.PI * 34;
  const COLOR = { '🟩': 'g', '🟨': 'y', '🟧': 'o', '🟥': 'r' };

  const store = {
    get(k, d) { try { const v = localStorage.getItem('ce_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('ce_' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } }
  };

  const S = {
    bank: [],
    name: cleanName(store.get('name', '')),
    mode: null,         // 'daily' | 'practice' | 'challenge'
    seed: 0,
    invited: false,     // opened from a challenge link
    board: [],          // challenge leaderboard (from the link, updated after each round)
    friend: null,       // friend to beat at round start
    qs: [], idx: 0, results: [],
    deadline: 0, timerId: 0, answered: false,
    pending: null,      // value heard, awaiting OK
    rec: null, listening: false, pressT: 0,
    last: null          // last finished round
  };

  // ---------- helpers ----------

  function show(id) {
    for (const s of document.querySelectorAll('.screen')) s.hidden = s.id !== id;
  }

  function toast(msg) {
    const t = $('toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toast.t);
    toast.t = setTimeout(() => { t.hidden = true; }, 1600);
  }

  function countUp(el, to, ms = 700) {
    const t0 = performance.now();
    const step = now => {
      const k = Math.min(1, (now - t0) / ms);
      el.textContent = fmtInt(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    };
    el.textContent = '0';
    requestAnimationFrame(step);
  }

  function fmtAnswer(q, v) {
    if (v === null || v === undefined) return '—';
    if (q.type === 'year') return String(Math.round(v));
    return v.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }

  function sizeClass(el, text) {
    el.classList.toggle('long', text.length > 8);
    el.classList.toggle('xlong', text.length > 12);
  }

  function setName(n) {
    S.name = cleanName(n);
    store.set('name', S.name);
    for (const id of ['name-inv', 'name-fr']) if ($(id).value !== S.name) $(id).value = S.name;
  }

  function ensureName() {
    if (S.name) return S.name;
    let n = '';
    try { n = window.prompt('Your name for the leaderboard (max 12):', '') || ''; } catch (e) { /* ignore */ }
    setName(cleanName(n) || 'Anon');
    return S.name;
  }

  function renderBoard(ol, board, highlight) {
    ol.textContent = '';
    const me = (highlight || '').toLowerCase();
    board.forEach((e, i) => {
      const li = document.createElement('li');
      if (i === 0) li.classList.add('top');
      if (me && e.name.toLowerCase() === me) li.classList.add('me');
      const n = document.createElement('span'); n.className = 'n'; n.textContent = e.name + (li.classList.contains('me') ? ' (you)' : '');
      const s = document.createElement('span'); s.className = 's'; s.textContent = fmtInt(e.score);
      li.append(n, s);
      ol.appendChild(li);
    });
    ol.hidden = board.length === 0;
  }

  function challengeUrl(seed, board) {
    return location.origin + location.pathname + '?seed=' + seed + (board.length ? '&b=' + serializeBoard(board) : '');
  }

  // ---------- start ----------

  function renderStart() {
    setName(S.name);
    const daily = store.get('daily_' + utcDateSeed(), null);
    $('btn-daily').textContent = daily ? 'DAILY ✓ ' + fmtInt(daily.score) : 'DAILY';

    const f = S.invited ? friendToBeat(S.board, S.name) : null;
    $('invite').hidden = !S.invited;
    $('invite-actions').hidden = !S.invited;
    $('btn-friends').hidden = S.invited;
    if (S.invited) {
      $('inv-name').textContent = f ? f.name : 'A friend';
      $('inv-score').textContent = f ? fmtInt(f.score) : '—';
      renderBoard($('inv-board'), S.board, S.name);
      if (S.board.length < 2) $('inv-board').hidden = true;
    }
    show('s-start');
  }

  // ---------- round flow ----------

  function startRound(mode, seed) {
    S.mode = mode;
    S.seed = seed >>> 0;
    S.qs = pickQuestions(S.bank, S.seed);
    S.idx = 0;
    S.results = [];
    S.friend = mode === 'challenge' ? friendToBeat(S.board, S.name) : null;
    showQuestion();
  }

  const randomSeed = () => (Math.random() * 4294967296) >>> 0;

  function startDaily() {
    const seed = utcDateSeed();
    const done = store.get('daily_' + seed, null);
    if (done) {
      S.mode = 'daily'; S.seed = seed; S.friend = null;
      S.last = { mode: 'daily', seed, score: done.score, strip: done.strip, prevBest: store.get('best_daily', 0), replay: true };
      renderEnd();
      return;
    }
    startRound('daily', seed);
  }

  function startPractice() { startRound('practice', randomSeed()); }

  function startFriends() {
    const n = cleanName($('name-fr').value);
    if (!n) { toast('Enter your name'); $('name-fr').focus(); return; }
    setName(n);
    S.board = [];
    startRound('challenge', randomSeed());
  }

  function acceptChallenge() {
    const n = cleanName($('name-inv').value);
    if (!n) { toast('Enter your name'); $('name-inv').focus(); return; }
    setName(n);
    startRound('challenge', S.seed);
  }

  function total() { return S.results.reduce((s, r) => s + r.points, 0); }

  function showQuestion() {
    const q = S.qs[S.idx];
    S.answered = false;
    S.pending = null;
    $('q-idx').textContent = (S.idx + 1) + ' / ' + S.qs.length;
    $('q-total').textContent = fmtInt(total());
    $('q-cat').textContent = q.category || '';
    $('q-text').textContent = q.text_en;
    $('q-unit').textContent = q.type === 'year' ? 'year' : (q.unit || '');
    $('num').value = '';
    $('heard').hidden = true;
    $('live').textContent = SR ? 'Hold or tap the mic — or type' : '';
    show('s-q');

    S.deadline = Date.now() + ANSWER_MS;
    clearInterval(S.timerId);
    S.timerId = setInterval(tick, 100);
    tick();
  }

  function tick() {
    const left = Math.max(0, S.deadline - Date.now());
    $('ring-fg').style.strokeDashoffset = String(RING_C * (1 - left / ANSWER_MS));
    $('q-time').textContent = Math.ceil(left / 1000);
    document.querySelector('.ring').classList.toggle('low', left <= 5000);
    // An unconfirmed "I heard" still counts as the player's answer.
    if (left <= 0) submit(S.pending);
  }

  function submit(value) {
    if (S.answered) return;
    S.answered = true;
    clearInterval(S.timerId);
    stopListening(true);
    const q = S.qs[S.idx];
    const guess = (value === null || value === undefined) ? null : value;
    const points = scoreGuess(q, guess);
    S.results.push({ q, guess, points });
    renderReveal(q, guess, points);
  }

  function renderReveal(q, guess, points) {
    const truth = fmtAnswer(q, q.answer);
    const c = COLOR[emojiFor(points)];
    $('r-idx').textContent = (S.idx + 1) + ' / ' + S.qs.length;
    $('r-total').textContent = fmtInt(total());
    $('r-truth').textContent = truth;
    sizeClass($('r-truth'), truth);
    $('r-unit').textContent = q.type === 'year' ? '' : (q.unit || '');
    $('r-you').textContent = guess === null ? 'No answer' : 'You: ' + fmtAnswer(q, guess);
    $('r-points').className = 'points ' + c;
    countUp($('r-points'), points, 600);
    const bar = $('r-bar');
    bar.style.transition = 'none';
    bar.style.transform = 'scaleX(0)';
    bar.className = 'fill ' + c;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      bar.style.transition = '';
      bar.style.transform = 'scaleX(' + (points / 1000) + ')';
    }));
    $('r-fact').textContent = q.fact || '';
    $('r-fact').hidden = !q.fact;
    $('r-strip').textContent = S.results.map(r => emojiFor(r.points)).join('');
    $('btn-next').textContent = S.idx + 1 < S.qs.length ? 'NEXT' : 'RESULTS';
    show('s-reveal');
  }

  function next() {
    if (S.idx + 1 < S.qs.length) { S.idx++; showQuestion(); return; }
    finishRound();
  }

  function finishRound() {
    const score = total();
    const strip = S.results.map(r => emojiFor(r.points)).join('');
    const prevBest = store.get('best_' + S.mode, 0);
    if (score > prevBest) store.set('best_' + S.mode, score);
    if (S.mode === 'daily') store.set('daily_' + S.seed, { score, strip });
    S.last = { mode: S.mode, seed: S.seed, score, strip, prevBest, friend: S.friend };
    if (S.mode === 'challenge' && S.name) {
      S.board = updateBoard(S.board, S.name, score);
      try { history.replaceState(null, '', challengeUrl(S.seed, S.board)); } catch (e) { /* ignore */ }
    }
    renderEnd();
  }

  function renderEnd() {
    const L = S.last;
    const best = Math.max(store.get('best_' + L.mode, 0), L.score);
    countUp($('e-score'), L.score, 900);
    $('e-best').textContent = fmtInt(best) + ' / ' + fmtInt(MAX);
    $('e-new').hidden = L.replay || !(L.score > L.prevBest && L.score > 0);
    $('e-strip').textContent = L.strip;
    $('e-mode').textContent = L.mode === 'daily' ? 'DAILY #' + dailyNumber()
      : L.mode === 'challenge' ? 'FRIENDS CHALLENGE' : 'PRACTICE';

    const f = L.friend;
    $('e-friend').hidden = !f;
    if (f) {
      const gap = f.score - L.score;
      $('e-friend-name').textContent = f.name;
      $('e-friend-score').textContent = fmtInt(f.score);
      $('e-gap').textContent = '(' + (gap > 0 ? fmtInt(gap) + ' to go' : gap < 0 ? 'beaten by ' + fmtInt(-gap) : 'tied') + ')';
      $('e-gap').classList.toggle('win', gap < 0);
    }
    if (L.mode === 'challenge') renderBoard($('e-board'), S.board, S.name);
    else $('e-board').hidden = true;
    show('s-end');
  }

  function tryAgain() {
    const L = S.last;
    if (L.mode === 'challenge') startRound('challenge', L.seed);
    else startPractice();
  }

  function buildShare() {
    const L = S.last;
    const name = ensureName();
    let board;
    if (L.mode === 'challenge') {
      S.board = updateBoard(S.board, name, L.score);
      board = S.board;
      renderBoard($('e-board'), S.board, S.name);
    } else {
      board = [{ name, score: L.score }];
    }
    const url = challengeUrl(L.seed, board);
    const head = L.mode === 'daily'
      ? 'CLOSE ENOUGH Daily #' + dailyNumber() + ' — ' + fmtInt(L.score) + ' ' + L.strip
      : 'CLOSE ENOUGH — ' + fmtInt(L.score) + ' / ' + fmtInt(MAX) + ' ' + L.strip;
    return head + '\nSame 5 questions. Can you beat me? ' + url;
  }

  async function share() {
    const text = buildShare();
    if (navigator.share) {
      try { await navigator.share({ text }); return; } catch (e) {
        if (e && e.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e2) { /* ignore */ }
      ta.remove();
    }
    toast('Copied — send it to your friends');
  }

  // ---------- answering: typed ----------

  function onTyped(ev) {
    ev.preventDefault();
    if (S.answered) return;
    const v = parseSpokenNumber($('num').value);
    if (v === null) { toast('Enter a number'); return; }
    $('num').blur();
    submit(v);
  }

  // ---------- answering: voice ----------

  function startListening() {
    if (!SR || S.answered || S.listening) return;
    $('heard').hidden = true;
    S.pending = null;
    let gotFinal = false, failed = false;
    const rec = new SR();
    rec.lang = LANG;
    rec.interimResults = true;
    rec.maxAlternatives = 5;
    rec.continuous = false;
    rec.onresult = ev => {
      const res = ev.results[ev.results.length - 1];
      $('live').textContent = '“' + res[0].transcript + '”';
      if (!res.isFinal) return;
      gotFinal = true;
      let value = null;
      for (let i = 0; i < res.length && value === null; i++) value = parseSpokenNumber(res[i].transcript);
      if (value === null) {
        $('live').textContent = 'Didn’t catch a number — type it';
        $('num').focus();
      } else {
        showHeard(value);
      }
    };
    rec.onerror = ev => {
      failed = true;
      if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
        $('live').textContent = 'Mic blocked — type your answer';
        $('mic').disabled = true;
      } else if (ev.error === 'no-speech') {
        $('live').textContent = 'Didn’t hear anything — try again';
      } else {
        failed = false;
      }
    };
    rec.onend = () => {
      S.listening = false;
      S.rec = null;
      $('mic').classList.remove('on');
      if (!gotFinal && !failed && !S.answered) $('live').textContent = 'Hold or tap the mic — or type';
    };
    try {
      rec.start();
      S.rec = rec; S.listening = true;
      $('mic').classList.add('on');
      $('live').textContent = 'Listening…';
    } catch (e) {
      $('live').textContent = 'Mic unavailable — type your answer';
    }
  }

  function stopListening(abort) {
    if (!S.rec) return;
    try { abort ? S.rec.abort() : S.rec.stop(); } catch (e) { /* ignore */ }
  }

  function showHeard(value) {
    const q = S.qs[S.idx];
    S.pending = value;
    $('heard-num').textContent = fmtAnswer(q, value);
    sizeClass($('heard-num'), $('heard-num').textContent);
    $('heard').hidden = false;
    $('live').textContent = '';
  }

  function bindMic() {
    const mic = $('mic');
    if (!SR) { mic.disabled = true; mic.classList.add('off'); return; }
    // Tap = toggle; hold = push-to-talk (release stops).
    mic.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (S.listening) { stopListening(false); S.pressT = 0; return; }
      S.pressT = Date.now();
      startListening();
    });
    const release = () => {
      if (S.pressT && Date.now() - S.pressT > 400 && S.listening) stopListening(false);
      S.pressT = 0;
    };
    mic.addEventListener('pointerup', release);
    mic.addEventListener('pointercancel', release);
    mic.addEventListener('contextmenu', e => e.preventDefault());
  }

  // ---------- init ----------

  function readUrl() {
    const seedStr = new URLSearchParams(location.search).get('seed');
    if (seedStr === null || !/^\d{1,10}$/.test(seedStr)) return;
    const seed = Number(seedStr);
    if (seed > 4294967295) return;
    S.invited = true;
    S.mode = 'challenge';
    S.seed = seed;
    // Read b= raw: names inside the board are individually URL-encoded.
    const raw = (location.search.match(/[?&]b=([^&]*)/) || [])[1] || '';
    S.board = parseBoard(raw);
  }

  function bind() {
    $('btn-daily').onclick = startDaily;
    $('btn-practice').onclick = startPractice;
    $('btn-friends').onclick = () => { setName(S.name); show('s-friends'); };
    $('btn-fr-start').onclick = startFriends;
    $('btn-challenge').onclick = acceptChallenge;
    for (const b of document.querySelectorAll('.back')) b.onclick = renderStart;
    for (const id of ['name-inv', 'name-fr']) {
      $(id).addEventListener('change', () => setName($(id).value));
      $(id).addEventListener('keydown', e => { if (e.key === 'Enter') $(id).blur(); });
    }
    $('type-form').addEventListener('submit', onTyped);
    $('h-ok').onclick = () => submit(S.pending);
    $('h-repeat').onclick = () => { $('heard').hidden = true; S.pending = null; startListening(); };
    $('h-type').onclick = () => {
      $('heard').hidden = true;
      if (S.pending !== null) $('num').value = String(S.pending);
      S.pending = null;
      $('num').focus();
    };
    $('btn-next').onclick = next;
    $('btn-again').onclick = tryAgain;
    $('btn-share').onclick = share;
    $('btn-end-daily').onclick = startDaily;
    $('btn-quit').onclick = () => { clearInterval(S.timerId); stopListening(true); S.answered = true; renderStart(); };
    bindMic();
    document.addEventListener('gesturestart', e => e.preventDefault());
    document.addEventListener('dblclick', e => e.preventDefault());
  }

  async function init() {
    bind();
    readUrl();
    try {
      const r = await fetch('questions.json', { cache: 'no-cache' });
      S.bank = await r.json();
    } catch (e) {
      $('tagline').textContent = 'Could not load questions.json — serve this folder over http.';
      return;
    }
    renderStart();
  }

  init();
})();
