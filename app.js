'use strict';
/* =====================================================================
   5 CỬA ẢI 1954 — app.js
   Trò chơi lịch sử trên lớp — HTML/CSS/JS thuần, chạy tĩnh trên GitHub Pages.
   Kiến trúc:
   - Máy trạng thái hữu hạn (FSM): setup → map → questionReady → counting →
     locked → revealed → survivorEntry → (map | tieBreaker | rescue |
     winner | finished). Câu phụ/cứu trợ dùng trạng thái riêng với sub-state.
   - Undo: stack tối đa 10 snapshot BẤT BIẾN (không lưu DOM node).
   - Bộ đếm: performance.now() + requestAnimationFrame (chỉ để vẽ),
     pause/resume chính xác tới milliseconds.
   - localStorage có schema version + validate; khôi phục sau F5 ở trạng
     thái tạm dừng.
   ===================================================================== */

/* ================= 1. DỮ LIỆU CÂU HỎI (GIỮ NGUYÊN) ================= */
/* correctOptionId dựa trên id cố định, KHÔNG dựa chữ A/B/C/D
   vì vị trí có thể bị xáo (Fisher–Yates một lần đầu ván). */

const SOURCE_TEXT = 'Giáo trình Lịch sử Đảng Cộng sản Việt Nam (Ban Tuyên giáo Trung ương – Bộ GD&ĐT, 2019), PDF tr. 82–84';

const QUESTIONS = [
  {
    id: 'q1',
    difficulty: 'Khởi động',
    durationMs: 15000,
    prompt: 'Chiến dịch nào kết thúc với thắng lợi lúc 17 giờ 30 phút ngày 7/5/1954?',
    options: [
      { id: 'q1o1', text: 'Chiến dịch Điện Biên Phủ.' },
      { id: 'q1o2', text: 'Chiến dịch Biên giới Thu–Đông 1950.' },
      { id: 'q1o3', text: 'Chiến dịch Việt Bắc Thu–Đông 1947.' },
      { id: 'q1o4', text: 'Chiến dịch Hòa Bình 1951–1952.' }
    ],
    correctOptionId: 'q1o1',
    explanation: 'Sau 56 ngày đêm và ba đợt tiến công, quân ta chiếm hầm chỉ huy ở Điện Biên Phủ vào chiều 7/5/1954.',
    source: SOURCE_TEXT
  },
  {
    id: 'q2',
    difficulty: 'Nắm mốc',
    durationMs: 17000,
    prompt: 'Phương châm tác chiến gắn với Chiến dịch Điện Biên Phủ là gì?',
    options: [
      { id: 'q2o1', text: 'Đánh chắc, tiến chắc.' },
      { id: 'q2o2', text: 'Đánh nhanh, giải quyết nhanh.' },
      { id: 'q2o3', text: 'Chỉ phòng ngự, không tiến công.' },
      { id: 'q2o4', text: 'Đợi địch rút rồi mới tiến quân.' }
    ],
    correctOptionId: 'q2o1',
    explanation: 'Giáo trình nêu phương châm ‘đánh chắc, tiến chắc’, phù hợp với việc tập trung lực lượng và tiến công từng bước.',
    source: SOURCE_TEXT
  },
  {
    id: 'q3',
    difficulty: 'Hiểu chủ trương',
    durationMs: 18000,
    prompt: 'Cuối năm 1953, Chủ tịch Hồ Chí Minh nêu điều kiện cốt lõi nào để mở khả năng thương lượng?',
    options: [
      { id: 'q3o1', text: 'Tôn trọng độc lập thật sự, đình chỉ chiến tranh xâm lược và thương lượng trực tiếp với Chính phủ Việt Nam Dân chủ Cộng hòa.' },
      { id: 'q3o2', text: 'Chỉ công nhận quyền tự trị trong Liên hiệp Pháp rồi thương lượng với một bên thứ ba.' },
      { id: 'q3o3', text: 'Hoãn thương lượng đến sau khi ký hiệp định, chưa cần bàn điều kiện đình chiến.' },
      { id: 'q3o4', text: 'Chỉ hòa hoãn kinh tế, chưa đặt vấn đề độc lập và chấm dứt chiến tranh.' }
    ],
    correctOptionId: 'q3o1',
    explanation: 'Lập trường cuối năm 1953 mở đường cho đấu tranh ngoại giao trước khi chiến dịch kết thúc.',
    source: SOURCE_TEXT
  },
  {
    id: 'q4',
    difficulty: 'Nối sự kiện',
    durationMs: 20000,
    prompt: 'Vì sao phái đoàn Việt Nam Dân chủ Cộng hòa bước vào bàn đàm phán về Đông Dương ngày 8/5/1954 với vị thế mới?',
    options: [
      { id: 'q4o1', text: 'Thắng lợi 7/5 tạo thêm vị thế, còn lập trường ngoại giao đã được nêu từ trước.' },
      { id: 'q4o2', text: 'Hiệp định đã ký trước 8/5, nên phái đoàn chỉ tới để công bố văn kiện.' },
      { id: 'q4o3', text: 'Diễn biến chiến trường không liên quan, phái đoàn chỉ dự với tư cách quan sát.' },
      { id: 'q4o4', text: 'Thắng lợi 7/5 tự tạo ra hiệp định mà không cần bất cứ cuộc thương lượng nào.' }
    ],
    correctOptionId: 'q4o1',
    explanation: 'Giáo trình đặt chiến thắng 7/5 và phái đoàn do Phạm Văn Đồng dẫn đầu đến hội nghị ngày 8/5 trong mối liên hệ trực tiếp.',
    source: SOURCE_TEXT
  },
  {
    id: 'q5',
    difficulty: 'Tổng hợp',
    durationMs: 20000,
    prompt: 'Tổ hợp nhận định nào thể hiện đầy đủ nhất nghệ thuật kết hợp ‘đánh’ và ‘đàm’ trong giai đoạn này?',
    statements: [
      'I. Ngoại giao chủ động mở đường từ cuối 1953.',
      'II. Thắng lợi Điện Biên Phủ tạo thêm vị thế đàm phán.',
      'III. Tại Giơnevơ, ta kiên trì nguyên tắc và nhân nhượng có điều kiện trong bối cảnh sức ép quốc tế.'
    ],
    options: [
      { id: 'q5o1', text: 'Cả I, II và III.' },
      { id: 'q5o2', text: 'Chỉ I và II.' },
      { id: 'q5o3', text: 'Chỉ II và III.' },
      { id: 'q5o4', text: 'Chỉ I và III.' }
    ],
    correctOptionId: 'q5o1',
    explanation: 'Quân sự tạo thực lực; ngoại giao tranh thủ thời cơ, giữ nguyên tắc và xử lý điều kiện quốc tế phức tạp. Cả ba vế phải được xét cùng nhau.',
    source: SOURCE_TEXT
  }
];

const TIEBREAKERS = [
  {
    id: 'tb1',
    difficulty: 'Phân thắng',
    durationMs: 15000,
    prompt: 'Phái đoàn Chính phủ Việt Nam Dân chủ Cộng hòa tại Hội nghị Giơnevơ do ai dẫn đầu?',
    options: [
      { id: 'tb1o1', text: 'Phạm Văn Đồng.' },
      { id: 'tb1o2', text: 'Võ Nguyên Giáp' },
      { id: 'tb1o3', text: 'Trường Chinh' },
      { id: 'tb1o4', text: 'Hoàng Văn Thái' }
    ],
    correctOptionId: 'tb1o1',
    explanation: 'Giáo trình ghi nhận phái đoàn Việt Nam Dân chủ Cộng hòa do Phạm Văn Đồng dẫn đầu dự Hội nghị Giơnevơ bàn về Đông Dương.',
    source: SOURCE_TEXT
  },
  {
    id: 'tb2',
    difficulty: 'Phân thắng',
    durationMs: 15000,
    prompt: 'Giáo trình mô tả quá trình đàm phán tại Giơnevơ kéo dài bao nhiêu ngày?',
    options: [
      { id: 'tb2o1', text: '75 ngày' },
      { id: 'tb2o2', text: '56 ngày' },
      { id: 'tb2o3', text: '18 ngày' },
      { id: 'tb2o4', text: '90 ngày' }
    ],
    correctOptionId: 'tb2o1',
    explanation: 'Giáo trình mô tả quá trình đàm phán tại Giơnevơ kéo dài 75 ngày.',
    source: SOURCE_TEXT
  }
];

const RESCUE_QUESTION = {
  id: 'rescue',
  difficulty: 'Cứu trợ',
  durationMs: 15000,
  prompt: 'Đoàn Việt Nam Dân chủ Cộng hòa vào hội nghị bàn về Đông Dương vào ngày nào?',
  options: [
    { id: 'rco1', text: '8/5/1954' },
    { id: 'rco2', text: '7/5/1954' },
    { id: 'rco3', text: '13/3/1954' },
    { id: 'rco4', text: '21/7/1954' }
  ],
  correctOptionId: 'rco1',
  explanation: 'Đoàn Việt Nam Dân chủ Cộng hòa vào hội nghị bàn về Đông Dương ngày 8/5/1954, một ngày sau chiến thắng Điện Biên Phủ.',
  source: SOURCE_TEXT
};

const ALL_QUESTIONS = QUESTIONS.concat(TIEBREAKERS, [RESCUE_QUESTION]);

/* ================= 2. HẰNG SỐ ================= */
const STORAGE_KEY = 'game-5-cua-ai-1954';
const SCHEMA_VERSION = 1;
const HISTORY_MAX = 10;
const MIN_PLAYERS = 5;
const MAX_PLAYERS = 15;

const GAME_STATES = ['setup', 'map', 'questionReady', 'counting', 'locked',
  'revealed', 'survivorEntry', 'rescue', 'tieBreaker', 'winner', 'finished'];
const SUB_STATES = ['ready', 'counting', 'locked', 'revealed', 'entry'];

/* Bảng chuyển trạng thái hợp lệ — chặn công bố trước khóa, qua câu mới
   trước khi xác nhận survivors, bấm liên tiếp gây bỏ câu, v.v. */
const TRANSITIONS = {
  setup: ['map'],
  map: ['questionReady'],
  questionReady: ['counting'],
  counting: ['locked'],
  locked: ['revealed'],
  revealed: ['survivorEntry'],
  survivorEntry: ['map', 'tieBreaker', 'rescue', 'winner', 'finished'],
  tieBreaker: ['rescue', 'winner', 'finished'],
  rescue: ['map', 'tieBreaker', 'winner', 'finished'],
  winner: ['finished'],
  finished: ['setup']
};

/* ================= 3. HÀM THUẦN (PURE) ================= */
function canTransition(from, to) {
  return Array.isArray(TRANSITIONS[from]) && TRANSITIONS[from].includes(to);
}

function effPhase(g) {
  if (g.state === 'tieBreaker' || g.state === 'rescue') return g.sub || 'ready';
  if (g.state === 'questionReady') return 'ready';
  if (g.state === 'survivorEntry') return 'entry';
  return g.state;
}

function setPhase(g, ph) {
  if (g.state === 'tieBreaker' || g.state === 'rescue') {
    g.sub = ph;
  } else if (ph === 'ready') {
    g.state = 'questionReady';
  } else if (ph === 'entry') {
    g.state = 'survivorEntry';
  } else {
    g.state = ph;
  }
}

function currentQuestion(g) {
  if (g.state === 'rescue') return RESCUE_QUESTION;
  if (g.state === 'tieBreaker') return TIEBREAKERS[Math.max(0, g.tbRound - 1)] || TIEBREAKERS[0];
  if (g.mode === 'tb') return TIEBREAKERS[Math.max(0, g.tbRound - 1)] || TIEBREAKERS[0];
  if (g.mode === 'rescue') return RESCUE_QUESTION;
  return QUESTIONS[Math.max(0, g.round - 1)] || QUESTIONS[0];
}

function createInitialState() {
  return {
    state: 'setup',
    sub: null,
    mode: 'main',
    round: 0,
    tbRound: 0,
    survivors: 0,
    survivorsBefore: 0,
    rescueUsed: false,
    rescueContext: null,
    eliminatedCount: 0,
    winnerName: '',
    finishKind: null, /* 'winner' | 'tie' | 'none' */
    finishCount: 0,
    timerPaused: false,
    remainingMs: 0,
    lastEntered: null,
    optionOrder: null,
    updatedAt: 0
  };
}

/* Fisher–Yates trên bản sao, dùng rng tiêm vào để kiểm thử được. */
function shuffleIds(ids, rng) {
  const a = ids.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

function deepFreeze(obj) {
  if (obj && typeof obj === 'object' && !Object.isFrozen(obj)) {
    Object.freeze(obj);
    for (const key of Object.keys(obj)) deepFreeze(obj[key]);
  }
  return obj;
}

/* Xáo thứ tự bốn phương án MỘT LẦN ĐẦU VÁN và lưu lại. */
function buildOptionOrder(rng) {
  const order = {};
  for (const q of ALL_QUESTIONS) {
    order[q.id] = shuffleIds(q.options.map(function (o) { return o.id; }), rng);
  }
  return deepFreeze(order);
}

function validateOptionOrder(order) {
  if (!order || typeof order !== 'object') return false;
  for (const q of ALL_QUESTIONS) {
    const arr = order[q.id];
    if (!Array.isArray(arr) || arr.length !== q.options.length) return false;
    const set = new Set(arr);
    if (set.size !== arr.length) return false;
    for (const o of q.options) {
      if (!set.has(o.id)) return false;
    }
    if (!arr.includes(q.correctOptionId)) return false;
  }
  return Object.keys(order).length === ALL_QUESTIONS.length;
}

/* Kiểm tra số người còn trụ nhập vào.
   main/tiebreaker: 0 <= after <= before; cứu trợ: 0 <= after <= số người vừa bị loại. */
function validateSurvivorsInput(mode, before, eliminatedCount, raw) {
  const s = String(raw === null || raw === undefined ? '' : raw).trim();
  if (s === '') return { ok: false, error: 'Chưa nhập số người.' };
  if (!/^-?\d+$/.test(s)) return { ok: false, error: 'Hãy nhập số nguyên, ví dụ 7.' };
  const n = parseInt(s, 10);
  if (mode === 'rescue') {
    if (n < 0 || n > eliminatedCount) {
      return { ok: false, error: 'Cứu trợ: chỉ được nhập từ 0 đến ' + eliminatedCount + ' (số người vừa bị loại).' };
    }
  } else {
    if (n < 0 || n > before) {
      return { ok: false, error: 'Chỉ được nhập từ 0 đến ' + before + ' (số người trước vòng này).' };
    }
  }
  return { ok: true, value: n };
}

function sanitizeName(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
    .slice(0, 40);
}

/* Snapshot bất biến cho Undo — KHÔNG lưu DOM node. */
function makeSnapshot(g, remainingMs, orderMap) {
  return deepFreeze({
    state: g.state,
    sub: g.sub,
    mode: g.mode,
    round: g.round,
    tbRound: g.tbRound,
    survivors: g.survivors,
    survivorsBefore: g.survivorsBefore,
    rescueUsed: g.rescueUsed,
    rescueContext: g.rescueContext ? { from: g.rescueContext.from, round: g.rescueContext.round, tbRound: g.rescueContext.tbRound } : null,
    eliminatedCount: g.eliminatedCount,
    winnerName: g.winnerName,
    finishKind: g.finishKind,
    finishCount: g.finishCount,
    timerPaused: g.timerPaused,
    remainingMs: remainingMs,
    lastEntered: g.lastEntered,
    optionOrder: orderMap,
    savedAt: Date.now()
  });
}

function pushSnapshot(stack, snap) {
  stack.push(snap);
  if (stack.length > HISTORY_MAX) stack.shift();
}

/* RNG xác định (mulberry32) phục vụ kiểm thử. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ================= 4. BỘ ĐẾM ================= */
/* performance.now() làm mốc; rAF chỉ để vẽ; pause/resume chính xác. */
function createTimer(nowFn, rafFn, cafFn) {
  let totalMs = 0;
  let remainingMs = 0;
  let endAt = 0;
  let running = false;
  let rafId = 0;
  let expiredFired = false;
  let onTick = null;
  let onExpire = null;

  function schedule() {
    if (typeof rafFn === 'function') rafId = rafFn(step);
  }
  function stopLoop() {
    if (typeof cafFn === 'function' && rafId) { cafFn(rafId); rafId = 0; }
  }
  function step() {
    if (!running) return;
    remainingMs = Math.max(0, endAt - nowFn());
    if (onTick) onTick(remainingMs, totalMs);
    if (remainingMs <= 0) {
      running = false;
      if (onExpire && !expiredFired) { expiredFired = true; onExpire(); }
      return;
    }
    schedule();
  }

  return {
    start: function (ms) {
      stopLoop(); /* hủy chuỗi rAF cũ nếu còn để tránh chạy kép */
      totalMs = ms; remainingMs = ms; expiredFired = false;
      endAt = nowFn() + ms; running = true; schedule();
    },
    pause: function () {
      if (!running) return remainingMs;
      remainingMs = Math.max(0, endAt - nowFn());
      running = false; stopLoop();
      return remainingMs;
    },
    resume: function () {
      if (running) return;
      if (remainingMs <= 0) {
        /* pause trúng đúng/sau thời điểm hết giờ: bấm Tiếp tục phải kích onExpire,
           nếu không câu hỏi treo ở 0 và không tự khóa. */
        if (onExpire && !expiredFired) { expiredFired = true; onExpire(); }
        return;
      }
      endAt = nowFn() + remainingMs; running = true; expiredFired = false;
      schedule();
    },
    /* Đặt trạng thái timer tùy ý (khôi phục/hiển thị đầy đủ). */
    setRemaining: function (ms, paused) {
      stopLoop();
      totalMs = ms; remainingMs = ms; expiredFired = ms <= 0;
      running = !paused && ms > 0;
      if (running) { endAt = nowFn() + ms; schedule(); }
    },
    /* Dùng cho kiểm thử khi không có rAF. */
    poll: function () {
      if (running) {
        remainingMs = Math.max(0, endAt - nowFn());
        if (onTick) onTick(remainingMs, totalMs);
        if (remainingMs <= 0) {
          running = false;
          if (onExpire && !expiredFired) { expiredFired = true; onExpire(); }
        }
      }
      return remainingMs;
    },
    getRemainingMs: function () { return running ? Math.max(0, endAt - nowFn()) : remainingMs; },
    getTotalMs: function () { return totalMs; },
    isRunning: function () { return running; },
    setCallbacks: function (t, e) { onTick = t; onExpire = e; }
  };
}

/* ================= 5. SERIALIZATION (localStorage) ================= */
function serializeGame(g, timerRemainingMs) {
  return {
    v: SCHEMA_VERSION,
    state: g.state, sub: g.sub, mode: g.mode,
    round: g.round, tbRound: g.tbRound,
    survivors: g.survivors, survivorsBefore: g.survivorsBefore,
    rescueUsed: g.rescueUsed, rescueContext: g.rescueContext,
    eliminatedCount: g.eliminatedCount,
    winnerName: g.winnerName,
    finishKind: g.finishKind, finishCount: g.finishCount,
    timerPaused: g.timerPaused,
    remainingMs: typeof timerRemainingMs === 'number' ? Math.round(timerRemainingMs) : g.remainingMs,
    lastEntered: g.lastEntered,
    optionOrder: g.optionOrder,
    savedAt: Date.now()
  };
}

function deserializeGame(raw) {
  try {
    if (!raw || typeof raw !== 'object') return null;
    if (raw.v !== SCHEMA_VERSION) return null;
    if (GAME_STATES.indexOf(raw.state) === -1) return null;
    if (raw.sub !== null && SUB_STATES.indexOf(raw.sub) === -1) return null;
    if (['main', 'tb', 'rescue'].indexOf(raw.mode) === -1) return null;
    const intIn = function (x, lo, hi) { return Number.isInteger(x) && x >= lo && x <= hi; };
    if (!intIn(raw.round, 0, QUESTIONS.length)) return null;
    if (!intIn(raw.tbRound, 0, TIEBREAKERS.length)) return null;
    if (!intIn(raw.survivors, 0, MAX_PLAYERS)) return null;
    if (!intIn(raw.survivorsBefore, 0, MAX_PLAYERS)) return null;
    if (!intIn(raw.eliminatedCount, 0, MAX_PLAYERS)) return null;
    if (typeof raw.rescueUsed !== 'boolean') return null;
    if (!validateOptionOrder(raw.optionOrder)) return null;
    if (typeof raw.remainingMs !== 'number' || !isFinite(raw.remainingMs) || raw.remainingMs < 0 || raw.remainingMs > 60000) return null;
    if (raw.lastEntered !== null && !Number.isInteger(raw.lastEntered)) return null;
    /* Kiểm tra nhất quán chéo — chặn save forged gây khóa mềm/crash */
    if (raw.state === 'map' && raw.round >= QUESTIONS.length) return null;
    if (raw.state !== 'map' && raw.state !== 'setup' && raw.state !== 'winner' && raw.state !== 'finished' && raw.round < 1) return null;
    if (raw.rescueContext && typeof raw.rescueContext === 'object') {
      if (['main', 'tb'].indexOf(String(raw.rescueContext.from)) === -1) return null;
      if (!intIn(Number(raw.rescueContext.round) || 0, 0, QUESTIONS.length)) return null;
      if (!intIn(Number(raw.rescueContext.tbRound) || 0, 0, TIEBREAKERS.length)) return null;
    }
    const finishKinds = ['winner', 'tie', 'none'];
    return {
      state: raw.state,
      sub: raw.sub,
      mode: raw.mode,
      round: raw.round,
      tbRound: raw.tbRound,
      survivors: raw.survivors,
      survivorsBefore: raw.survivorsBefore,
      rescueUsed: raw.state === 'rescue' ? true : raw.rescueUsed,
      rescueContext: (raw.rescueContext && typeof raw.rescueContext === 'object')
        ? { from: String(raw.rescueContext.from), round: Number(raw.rescueContext.round) || 0, tbRound: Number(raw.rescueContext.tbRound) || 0 }
        : null,
      eliminatedCount: raw.eliminatedCount,
      winnerName: sanitizeName(raw.winnerName),
      finishKind: finishKinds.indexOf(raw.finishKind) !== -1 ? raw.finishKind : null,
      finishCount: intIn(raw.finishCount, 0, MAX_PLAYERS) ? raw.finishCount : 0,
      timerPaused: true, /* sau refresh luôn ở trạng thái tạm dừng để công bằng */
      remainingMs: Math.round(raw.remainingMs),
      lastEntered: raw.lastEntered,
      optionOrder: raw.optionOrder,
      updatedAt: Date.now()
    };
  } catch (e) {
    return null;
  }
}

/* ================= 6. LỚP GIAO DIỆN (chỉ chạy trong trình duyệt) ================= */
function initGameUI() {
  const $ = function (id) { return document.getElementById(id); };
  const els = {
    btnUndo: $('btnUndo'), btnFs: $('btnFs'),
    screens: {
      setup: $('screen-setup'), map: $('screen-map'), question: $('screen-question'),
      winner: $('screen-winner'), finished: $('screen-finished')
    },
    playerCount: $('playerCount'), btnCountMinus: $('btnCountMinus'), btnCountPlus: $('btnCountPlus'),
    btnStart: $('btnStart'), btnFsSetup: $('btnFsSetup'), setupError: $('setupError'),
    mapSurvivors: $('mapSurvivors'), btnOpenGate: $('btnOpenGate'), mapNote: $('mapNote'),
    qDiff: $('qDiff'), qCount: $('qCount'), qSurv: $('qSurv'),
    timerBox: $('timerBox'), timerArc: $('timerArc'), timerNum: $('timerNum'), timerSub: $('timerSub'),
    qProgress: $('qProgress'), qPrompt: $('qPrompt'), qStatements: $('qStatements'),
    optionsGrid: $('optionsGrid'),
    revealPanel: $('revealPanel'), qExplain: $('qExplain'), qSource: $('qSource'),
    qControls: $('qControls'),
    btnStartCount: $('btnStartCount'), btnPause: $('btnPause'), btnLock: $('btnLock'),
    btnReveal: $('btnReveal'), btnToEntry: $('btnToEntry'), lockedChip: $('lockedChip'),
    entryPanel: $('entryPanel'), entryLabel: $('entryLabel'),
    survivorsInput: $('survivorsInput'), entryMax: $('entryMax'),
    entryError: $('entryError'), btnConfirm: $('btnConfirm'),
    btnSurvMinus: $('btnSurvMinus'), btnSurvPlus: $('btnSurvPlus'),
    winnerName: $('winnerName'), btnAward: $('btnAward'),
    finishedMedal: $('finishedMedal'), finishedTitle: $('finishedTitle'),
    finishedMsg: $('finishedMsg'), finishedName: $('finishedName'), btnReplay: $('btnReplay'),
    toast: $('toast'),
    modalOverlay: $('modalOverlay'), modalMsg: $('modalMsg'),
    btnModalOk: $('btnModalOk'), btnModalCancel: $('btnModalCancel')
  };

  const CHECK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ARC_LEN = 326.73; /* 2π × r(52) */

  let game = createInitialState();
  let history = [];
  let orderMap = null;
  let currentRenderedQid = null;
  let toastTimer = 0;
  let modalOpen = false;
  let modalOkCb = null;

  const timer = createTimer(
    function () { return performance.now(); },
    function (fn) { return requestAnimationFrame(fn); },
    function (id) { return cancelAnimationFrame(id); }
  );
  timer.setCallbacks(
    function (remaining, total) { drawTimer(remaining, total); },
    function () {
      if (effPhase(game) === 'counting') lockAnswer(true);
    }
  );

  /* ---------- Tiện ích giao diện ---------- */
  let toastTimerId = 0;
  function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.hidden = false;
    /* ép reflow rồi thêm class để chuyển cảnh mượt */
    void els.toast.offsetWidth;
    els.toast.classList.add('is-show');
    clearTimeout(toastTimerId);
    toastTimerId = setTimeout(function () {
      els.toast.classList.remove('is-show');
      setTimeout(function () { els.toast.hidden = true; }, 260); /* để transition fade-out chạy xong */
    }, 3000);
  }

  function openConfirm(msg, cb) {
    els.modalMsg.textContent = msg;
    els.modalOverlay.hidden = false;
    void els.modalOverlay.offsetWidth;
    els.modalOverlay.classList.add('is-open');
    modalOpen = true;
    modalOkCb = cb;
  }
  function closeConfirm(ok) {
    if (!modalOpen) return;
    els.modalOverlay.classList.remove('is-open');
    modalOpen = false;
    const cb = modalOkCb;
    modalOkCb = null;
    setTimeout(function () { els.modalOverlay.hidden = true; }, 200);
    if (ok && cb) cb();
  }

  function enterFullscreen() {
    /* Gọi trong chính sự kiện click (Bắt đầu / Toàn màn hình); bắt lỗi,
       bị từ chối vẫn chơi bình thường — có thể dùng F11. */
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) {
        const p = el.requestFullscreen();
        if (p && typeof p.catch === 'function') {
          p.catch(function () {
            showToast('Trình duyệt từ chối toàn màn hình — trò chơi vẫn chạy. Có thể nhấn F11.');
          });
        }
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen(); /* Safari cũ */
      } else {
        showToast('Toàn màn hình không khả dụng — có thể nhấn F11.');
      }
    } catch (e) {
      showToast('Toàn màn hình không khả dụng — có thể nhấn F11.');
    }
  }
  function toggleFullscreen() {
    if (document.fullscreenElement) {
      const p = document.exitFullscreen();
      if (p && typeof p.catch === 'function') p.catch(function () {});
    } else {
      enterFullscreen();
    }
  }

  /* ---------- localStorage: lưu & khôi phục (có validate) ---------- */
  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeGame(game, timer.getRemainingMs())));
    } catch (e) { /* lưu đầy đủ hay không cũng không chặn trò chơi */ }
  }

  function restore() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (e) { raw = null; }
    const g = deserializeGame(raw);
    if (!g) return false;
    game = g;
    orderMap = g.optionOrder;
    const q = currentQuestion(g);
    const dur = q ? q.durationMs : 15000;
    const rem = (typeof g.remainingMs === 'number' && g.remainingMs >= 0) ? g.remainingMs : dur;
    timer.setRemaining(rem, true); /* sau refresh luôn tạm dừng để công bằng */
    return true;
  }

  /* ---------- Undo ---------- */
  function pushHistory() {
    pushSnapshot(history, makeSnapshot(game, timer.getRemainingMs(), orderMap));
  }
  function undo() {
    if (!history.length) return;
    const snap = history.pop();
    game = {
      state: snap.state, sub: snap.sub, mode: snap.mode,
      round: snap.round, tbRound: snap.tbRound,
      survivors: snap.survivors, survivorsBefore: snap.survivorsBefore,
      rescueUsed: snap.rescueUsed,
      rescueContext: snap.rescueContext ? { from: snap.rescueContext.from, round: snap.rescueContext.round, tbRound: snap.rescueContext.tbRound } : null,
      eliminatedCount: snap.eliminatedCount,
      winnerName: snap.winnerName,
      finishKind: snap.finishKind, finishCount: snap.finishCount,
      timerPaused: snap.timerPaused,
      remainingMs: snap.remainingMs,
      lastEntered: snap.lastEntered,
      optionOrder: snap.optionOrder,
      updatedAt: Date.now()
    };
    orderMap = snap.optionOrder;
    const q = currentQuestion(game);
    const dur = q ? q.durationMs : 15000;
    /* giữ nguyên 0 giây nếu snapshot chụp lúc vừa hết giờ — không hồi sinh thời gian,
       người dẫn hoàn tác thêm một bước về questionReady nếu muốn đếm lại từ đầu */
    const rem = (typeof snap.remainingMs === 'number' && snap.remainingMs >= 0) ? snap.remainingMs : dur;
    timer.setRemaining(rem, true); /* hoàn tác xong luôn cho tạm dừng, người dẫn chủ động Tiếp tục */
    game.timerPaused = true;
    currentRenderedQid = null;
    persist();
    render();
  }

  /* ---------- Vẽ đồng hồ vòng cung ---------- */
  function drawTimer(remaining, total) {
    const t = Math.max(0, total || 0);
    const r = Math.max(0, remaining || 0);
    const frac = t > 0 ? r / t : 0;
    els.timerArc.style.strokeDashoffset = String(ARC_LEN * (1 - frac));
    els.timerNum.textContent = String(Math.ceil(r / 1000));
    els.timerBox.classList.toggle('is-low', r > 0 && r <= 5000);
    els.timerSub.textContent = game.timerPaused ? 'TẠM DỪNG' : 'giây';
  }

  /* ---------- Render tổng ---------- */
  function screenKeyForState(g) {
    switch (g.state) {
      case 'setup': return 'setup';
      case 'map': return 'map';
      case 'winner': return 'winner';
      case 'finished': return 'finished';
      default: return 'question';
    }
  }
  function showScreen() {
    const key = screenKeyForState(game);
    for (const k in els.screens) {
      els.screens[k].classList.toggle('is-active', k === key);
    }
  }

  function pad2(n) { return n < 10 ? '0' + n : String(n); }
  function countLabel(g) {
    if (g.state === 'rescue' || g.mode === 'rescue') return 'Câu cứu trợ';
    if (g.state === 'tieBreaker' || g.mode === 'tb') return 'Câu phụ ' + Math.max(1, g.tbRound) + ' / ' + TIEBREAKERS.length;
    return 'Câu ' + pad2(Math.max(1, g.round)) + ' / ' + pad2(QUESTIONS.length);
  }

  function updateProgress() {
    const dots = els.qProgress.children;
    for (let i = 0; i < dots.length; i++) {
      const n = i + 1;
      dots[i].className = '';
      if (game.state === 'rescue' || game.mode === 'tb' || game.state === 'tieBreaker') {
        dots[i].className = 'done';
      } else if (n < game.round) {
        dots[i].className = 'done';
      } else if (n === game.round) {
        dots[i].className = 'active';
      }
    }
  }

  function renderMap() {
    els.mapSurvivors.textContent = game.survivors;
    for (let i = 1; i <= els.gates.length; i++) {
      const el = els.gates[i - 1];
      el.classList.toggle('is-passed', i <= game.round);
      el.classList.toggle('is-current', i === game.round + 1);
      el.classList.toggle('is-future', i > game.round + 1);
    }
    els.mapNote.textContent = game.rescueUsed && game.state === 'map'
      ? 'Nhóm vừa bị loại đã trở lại sau câu cứu trợ. Tiếp tục hành trình!'
      : 'Cửa ải đang mở nổi sáng. Mở lần lượt theo độ khó tăng dần, tới Giơnevơ!';
  }

  function buildQuestion(q) {
    els.qPrompt.textContent = q.prompt;
    if (q.statements && q.statements.length) {
      els.qStatements.hidden = false;
      els.qStatements.textContent = '';
      for (const s of q.statements) {
        const p = document.createElement('p');
        p.textContent = s;
        els.qStatements.appendChild(p);
      }
    } else {
      els.qStatements.hidden = true;
      els.qStatements.textContent = '';
    }
    els.optionsGrid.textContent = '';
    const order = (orderMap && orderMap[q.id]) ? orderMap[q.id] : q.options.map(function (o) { return o.id; });
    order.forEach(function (optId, idx) {
      let opt = null;
      for (const o of q.options) { if (o.id === optId) { opt = o; break; } }
      if (!opt) return;
      const card = document.createElement('div');
      card.className = 'option-card';
      card.setAttribute('data-opt-id', optId);
      const badge = document.createElement('span');
      badge.className = 'option-letter';
      badge.textContent = String.fromCharCode(65 + idx);
      const text = document.createElement('span');
      text.className = 'option-text';
      text.textContent = opt.text;
      const check = document.createElement('span');
      check.className = 'check-badge';
      check.innerHTML = CHECK_SVG; /* chuỗi tĩnh, không chứa dữ liệu người dùng */
      card.appendChild(badge);
      card.appendChild(text);
      card.appendChild(check);
      els.optionsGrid.appendChild(card);
    });
  }

  function renderControls(ph) {
    els.btnStartCount.hidden = ph !== 'ready';
    els.btnPause.hidden = ph !== 'counting';
    els.btnPause.textContent = game.timerPaused ? 'Tiếp tục' : 'Tạm dừng';
    els.btnLock.hidden = ph !== 'counting';
    els.btnReveal.hidden = ph !== 'locked';
    els.btnToEntry.hidden = ph !== 'revealed';
    els.lockedChip.hidden = ph !== 'locked';
  }

  function showEntryError(msg) { els.entryError.textContent = msg; els.entryError.hidden = false; }
  function hideEntryError() { els.entryError.hidden = true; }

  function renderQuestionScreen() {
    const q = currentQuestion(game);
    if (!q) return;
    const ph = effPhase(game);
    if (currentRenderedQid !== q.id) {
      buildQuestion(q);
      currentRenderedQid = q.id;
    }
    const isRescue = (game.mode === 'rescue' || game.state === 'rescue');
    els.qDiff.textContent = isRescue ? 'Cứu trợ' : q.difficulty;
    els.qDiff.classList.toggle('chip-rescue', isRescue);
    els.qCount.textContent = countLabel(game);
    els.qSurv.textContent = game.survivors;
    updateProgress();

    const revealedLike = (ph === 'revealed' || ph === 'entry');
    const cards = els.optionsGrid.children;
    for (let i = 0; i < cards.length; i++) {
      const id = cards[i].getAttribute('data-opt-id');
      cards[i].classList.toggle('is-correct', revealedLike && id === q.correctOptionId);
      cards[i].classList.toggle('is-dim', revealedLike && id !== q.correctOptionId);
    }
    els.revealPanel.hidden = !revealedLike;
    if (revealedLike) {
      els.qExplain.textContent = q.explanation;
      els.qSource.textContent = 'Nguồn: ' + q.source;
    }

    const isEntry = ph === 'entry';
    els.entryPanel.hidden = !isEntry;
    els.qControls.hidden = isEntry;
    if (isEntry) {
      const max = game.mode === 'rescue' ? game.eliminatedCount : game.survivorsBefore;
      els.entryLabel.textContent = game.mode === 'rescue'
        ? 'Số người trả lời đúng câu cứu trợ (được quay lại):'
        : 'Số người còn trụ sau vòng này:';
      els.entryMax.textContent = '/ tối đa ' + max;
      els.survivorsInput.max = String(max);
      els.survivorsInput.value = game.lastEntered !== null && game.lastEntered !== undefined ? String(game.lastEntered) : '';
      hideEntryError();
    }

    renderControls(ph);
    drawTimer(timer.getRemainingMs(), timer.getTotalMs());
  }

  function renderWinner() {
    els.winnerName.value = game.winnerName || '';
  }

  function renderFinished() {
    const k = game.finishKind;
    els.finishedMedal.hidden = (k === 'none');
    if (k === 'winner') {
      els.finishedTitle.textContent = 'Người trụ lại cuối cùng — mời nhận phần thưởng!';
      els.finishedMsg.textContent = 'Xin chúc mừng! Hãy trao phần thưởng và vỗ tay cho cả lớp.';
    } else if (k === 'tie') {
      els.finishedTitle.textContent = 'Đồng chiến thắng!';
      els.finishedMsg.textContent = 'Sau các câu phụ vẫn còn ' + game.finishCount + ' người trụ — mời người dẫn chia phần thưởng cho các bạn.';
    } else {
      els.finishedTitle.textContent = 'Chưa ai vượt qua cửa ải';
      els.finishedMsg.textContent = 'Trao phần quà khích lệ cho người trụ lâu nhất — người dẫn quyết định tại lớp.';
    }
    els.finishedName.textContent = game.winnerName ? game.winnerName : '';
  }

  function render() {
    els.btnUndo.hidden = !(history.length > 0 && game.state !== 'setup');
    els.btnFs.hidden = game.state === 'setup';
    els.btnFs.textContent = document.fullscreenElement ? 'Thoát toàn màn hình' : 'Toàn màn hình';
    showScreen();
    if (game.state === 'map') renderMap();
    else if (game.state === 'setup') { els.setupError.hidden = true; }
    else if (game.state === 'winner') renderWinner();
    else if (game.state === 'finished') renderFinished();
    else renderQuestionScreen();
  }

  /* ---------- Hành động của người dẫn ---------- */
  function startGame() {
    const n = Number(els.playerCount.value);
    if (!Number.isInteger(n) || n < MIN_PLAYERS || n > MAX_PLAYERS) {
      els.setupError.textContent = 'Số người tham gia phải từ ' + MIN_PLAYERS + ' đến ' + MAX_PLAYERS + '.';
      els.setupError.hidden = false;
      return;
    }
    els.setupError.hidden = true;
    pushHistory();
    orderMap = buildOptionOrder(Math.random);
    game = createInitialState();
    game.state = 'map';
    game.mode = 'main';
    game.survivors = n;
    game.optionOrder = orderMap; /* đồng bộ để persist() lưu đúng thứ tự xáo */
    persist();
    render();
    enterFullscreen(); /* gọi trong chính sự kiện click Bắt đầu */
  }

  function openGate() {
    if (game.state !== 'map') return;
    if (game.round >= QUESTIONS.length) return;
    if (!canTransition(game.state, 'questionReady')) return; /* chặn theo bảng FSM */
    pushHistory();
    game.round += 1;
    game.mode = 'main';
    game.sub = null;
    game.state = 'questionReady';
    game.survivorsBefore = game.survivors;
    game.lastEntered = null;
    const q = QUESTIONS[game.round - 1];
    if (!q) return; /* phòng thủ: dữ liệu persistence forged */
    timer.setRemaining(q.durationMs, true);
    persist();
    render();
  }

  function startCountdown() {
    if (effPhase(game) !== 'ready') return;
    if (!canTransition(game.state, 'counting') && !(game.state === 'tieBreaker' || game.state === 'rescue')) return;
    const q = currentQuestion(game);
    if (!q) return;
    pushHistory();
    setPhase(game, 'counting');
    game.timerPaused = false;
    timer.start(q.durationMs);
    persist();
    render();
  }

  function togglePause() {
    if (effPhase(game) !== 'counting') return;
    if (game.timerPaused) {
      game.timerPaused = false;
      timer.resume();
    } else {
      game.timerPaused = true;
      timer.pause();
    }
    persist();
    render();
  }

  function lockAnswer(auto) {
    if (effPhase(game) !== 'counting') return;
    if (!canTransition('counting', 'locked') && !(game.state === 'tieBreaker' || game.state === 'rescue')) return;
    const rem = timer.pause();
    pushHistory();
    setPhase(game, 'locked');
    game.timerPaused = false;
    game.remainingMs = rem;
    persist();
    render();
    if (auto) showToast('Hết giờ — hệ thống tự khóa đáp án.');
  }

  function revealAnswer() {
    if (effPhase(game) !== 'locked') return;
    if (!canTransition('locked', 'revealed') && !(game.state === 'tieBreaker' || game.state === 'rescue')) return;
    pushHistory();
    setPhase(game, 'revealed');
    persist();
    render();
  }

  function openEntry() {
    if (effPhase(game) !== 'revealed') return;
    if (!canTransition('revealed', 'survivorEntry') && !(game.state === 'tieBreaker' || game.state === 'rescue')) return;
    pushHistory();
    setPhase(game, 'entry');
    game.lastEntered = null;
    persist();
    render();
    try { els.survivorsInput.focus(); } catch (e) {}
  }

  function enterTieBreaker(n) {
    game.mode = 'tb';
    game.state = 'tieBreaker';
    game.sub = 'ready';
    game.tbRound = n;
    game.survivorsBefore = game.survivors;
    game.lastEntered = null;
    const q = TIEBREAKERS[n - 1];
    timer.setRemaining(q.durationMs, true);
  }

  function finishGame(kind, count) {
    game.state = 'finished';
    game.sub = null;
    game.finishKind = kind;
    game.finishCount = count;
    game.timerPaused = false;
  }

  /* Chuyển tiếp sau khi xác nhận survivors — bộ não điều hướng FSM. */
  function applyConfirm(mode, val) {
    const rescueAvailable = !game.rescueUsed;
    const goRescueOrFinish = function () {
      if (rescueAvailable) {
        game.rescueUsed = true;
        game.eliminatedCount = game.survivorsBefore; /* nhóm vừa bị loại ở vòng này */
        game.rescueContext = { from: mode === 'tb' ? 'tb' : 'main', round: game.round, tbRound: game.tbRound };
        game.mode = 'rescue';
        game.state = 'rescue';
        game.sub = 'ready';
        game.survivors = 0;
        game.lastEntered = null;
        timer.setRemaining(RESCUE_QUESTION.durationMs, true);
      } else {
        finishGame('none', 0);
      }
    };

    if (mode === 'main') {
      game.survivors = val;
      if (game.round < QUESTIONS.length) {
        if (val === 0) {
          /* Về 0 giữa chừng -> câu cứu trợ (nếu còn) hoặc kết thúc */
          goRescueOrFinish();
        } else {
          game.state = 'map';
          game.sub = null;
          game.mode = 'main';
        }
      } else if (val >= 2) {
        enterTieBreaker(1);
      } else if (val === 1) {
        game.state = 'winner';
        game.sub = null;
        game.winnerName = '';
      } else {
        goRescueOrFinish();
      }
      return;
    }

    if (mode === 'tb') {
      game.survivors = val;
      if (val === 1) {
        game.state = 'winner';
        game.sub = null;
        game.winnerName = '';
      } else if (val === 0) {
        goRescueOrFinish();
      } else if (game.tbRound < TIEBREAKERS.length) {
        enterTieBreaker(game.tbRound + 1);
      } else {
        finishGame('tie', val);
      }
      return;
    }

    if (mode === 'rescue') {
      game.survivors = val;
      if (val <= 0) {
        finishGame('none', 0);
        return;
      }
      const ctx = game.rescueContext || { from: 'main', round: QUESTIONS.length, tbRound: 0 };
      if (ctx.from === 'tb') {
        if (val === 1) {
          game.state = 'winner';
          game.sub = null;
          game.winnerName = '';
        } else if (ctx.tbRound < TIEBREAKERS.length) {
          enterTieBreaker(ctx.tbRound + 1);
        } else {
          finishGame('tie', val);
        }
      } else {
        if (ctx.round < QUESTIONS.length) {
          game.state = 'map';
          game.sub = null;
          game.mode = 'main';
        } else if (val === 1) {
          game.state = 'winner';
          game.sub = null;
          game.winnerName = '';
        } else {
          enterTieBreaker(1);
        }
      }
    }
  }

  function confirmResult() {
    if (effPhase(game) !== 'entry') return;
    const res = validateSurvivorsInput(game.mode, game.survivorsBefore, game.eliminatedCount, els.survivorsInput.value);
    if (!res.ok) {
      showEntryError(res.error);
      return;
    }
    hideEntryError();
    pushHistory();
    game.lastEntered = res.value;
    applyConfirm(game.mode, res.value);
    persist();
    render();
  }

  function awardWinner() {
    if (game.state !== 'winner') return;
    game.winnerName = sanitizeName(els.winnerName.value); /* gán trước khi chụp snapshot để Undo giữ tên */
    pushHistory();
    finishGame('winner', game.survivors);
    persist();
    render();
  }

  function restart() {
    openConfirm('Bắt đầu ván mới? Toàn bộ tiến trình hiện tại sẽ bị xóa.', function () {
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
      game = createInitialState();
      history = [];
      orderMap = null;
      currentRenderedQid = null;
      persist();
      render();
    });
  }

  /* ---------- Gắn sự kiện ---------- */
  els.btnStart.addEventListener('click', startGame);
  els.btnFsSetup.addEventListener('click', enterFullscreen);
  els.btnFs.addEventListener('click', toggleFullscreen);
  els.btnUndo.addEventListener('click', undo);
  els.btnOpenGate.addEventListener('click', openGate);
  els.btnStartCount.addEventListener('click', startCountdown);
  els.btnPause.addEventListener('click', togglePause);
  els.btnLock.addEventListener('click', function () { lockAnswer(false); });
  els.btnReveal.addEventListener('click', revealAnswer);
  els.btnToEntry.addEventListener('click', openEntry);
  els.btnConfirm.addEventListener('click', confirmResult);
  els.btnAward.addEventListener('click', awardWinner);
  els.btnReplay.addEventListener('click', restart);
  els.btnModalOk.addEventListener('click', function () { closeConfirm(true); });
  els.btnModalCancel.addEventListener('click', function () { closeConfirm(false); });

  els.playerCount.addEventListener('blur', function () {
    let v = parseInt(els.playerCount.value, 10);
    if (!Number.isInteger(v)) v = 10;
    v = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, v));
    els.playerCount.value = String(v);
  });
  function stepPlayerCount(delta) {
    let v = parseInt(els.playerCount.value, 10);
    if (!Number.isInteger(v)) v = 10;
    v = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, v + delta));
    els.playerCount.value = String(v);
  }
  els.btnCountMinus.addEventListener('click', function () { stepPlayerCount(-1); });
  els.btnCountPlus.addEventListener('click', function () { stepPlayerCount(1); });

  els.survivorsInput.addEventListener('input', function () {
    const raw = els.survivorsInput.value;
    const res = validateSurvivorsInput(game.mode, game.survivorsBefore, game.eliminatedCount, raw);
    if (res.ok) {
      game.lastEntered = res.value;
      hideEntryError();
      persist();
    } else if (String(raw).trim() === '') {
      hideEntryError();
    } else {
      showEntryError(res.error);
    }
  });
  els.survivorsInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      confirmResult();
    }
  });
  function stepSurv(delta) {
    const max = game.mode === 'rescue' ? game.eliminatedCount : game.survivorsBefore;
    let v = parseInt(els.survivorsInput.value, 10);
    if (!Number.isInteger(v)) v = 0;
    v = Math.min(max, Math.max(0, v + delta));
    els.survivorsInput.value = String(v);
    els.survivorsInput.dispatchEvent(new Event('input'));
  }
  els.btnSurvMinus.addEventListener('click', function () { stepSurv(-1); });
  els.btnSurvPlus.addEventListener('click', function () { stepSurv(1); });

  els.winnerName.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      awardWinner();
    }
  });

  /* Phím tắt cho người dẫn: Space (mở cửa ải/bắt đầu/tạm dừng/công bố),
     L (khóa đáp án). Không hoạt động khi đang gõ trong ô nhập. */
  document.addEventListener('keydown', function (e) {
    if (modalOpen) {
      if (e.key === 'Escape') closeConfirm(false);
      return;
    }
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    if (e.code === 'Space') {
      e.preventDefault();
      if (game.state === 'map') { openGate(); return; }
      const ph = effPhase(game);
      if (ph === 'ready') startCountdown();
      else if (ph === 'counting') togglePause();
      else if (ph === 'locked') revealAnswer();
      else if (ph === 'revealed') openEntry();
    } else if (e.key === 'l' || e.key === 'L') {
      if (effPhase(game) === 'counting') lockAnswer(false);
    }
  });

  /* Rời tab tự tạm dừng để công bằng */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && effPhase(game) === 'counting' && !game.timerPaused) {
      game.timerPaused = true;
      timer.pause();
      persist();
      render();
      showToast('Vừa rời tab — tự động tạm dừng để công bằng.');
    }
  });

  document.addEventListener('fullscreenchange', function () {
    render();
  });

  /* ---------- Khởi động: khôi phục ván cũ nếu có ---------- */
  els.gates = [];
  for (let i = 1; i <= 5; i++) els.gates.push($('gate-' + i));

  if (restore()) {
    currentRenderedQid = null;
    setTimeout(function () {
      showToast('Đã khôi phục ván chơi — câu hỏi đang tạm dừng, bấm Tiếp tục để chạy lại đồng hồ.');
    }, 400);
  }
  render();
}

/* Script chạy với defer nên DOM đã sẵn sàng */
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGameUI);
  } else {
    initGameUI();
  }
}

/* ================= 7. EXPORT CHO KIỂM THỬ LOGIC (Node) ================= */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    QUESTIONS: QUESTIONS,
    TIEBREAKERS: TIEBREAKERS,
    RESCUE_QUESTION: RESCUE_QUESTION,
    ALL_QUESTIONS: ALL_QUESTIONS,
    SOURCE_TEXT: SOURCE_TEXT,
    GAME_STATES: GAME_STATES,
    SUB_STATES: SUB_STATES,
    TRANSITIONS: TRANSITIONS,
    MIN_PLAYERS: MIN_PLAYERS,
    MAX_PLAYERS: MAX_PLAYERS,
    HISTORY_MAX: HISTORY_MAX,
    SCHEMA_VERSION: SCHEMA_VERSION,
    STORAGE_KEY: STORAGE_KEY,
    canTransition: canTransition,
    effPhase: effPhase,
    setPhase: setPhase,
    currentQuestion: currentQuestion,
    createInitialState: createInitialState,
    shuffleIds: shuffleIds,
    buildOptionOrder: buildOptionOrder,
    validateOptionOrder: validateOptionOrder,
    validateSurvivorsInput: validateSurvivorsInput,
    sanitizeName: sanitizeName,
    makeSnapshot: makeSnapshot,
    pushSnapshot: pushSnapshot,
    mulberry32: mulberry32,
    createTimer: createTimer,
    serializeGame: serializeGame,
    deserializeGame: deserializeGame
  };
}


