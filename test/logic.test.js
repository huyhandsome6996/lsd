'use strict';
/* Kiểm thử logic thuần của 5 CỬA ẢI 1954 — chạy: node --test test/ */
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../app.js');

/* ---------- 1. Tính toàn vẹn dữ liệu câu hỏi ---------- */
test('Dữ liệu: đủ 5 câu chính + 2 câu phụ + 1 câu cứu trợ', () => {
  assert.equal(L.QUESTIONS.length, 5);
  assert.equal(L.TIEBREAKERS.length, 2);
  assert.ok(L.RESCUE_QUESTION && L.RESCUE_QUESTION.id === 'rescue');
  assert.equal(L.ALL_QUESTIONS.length, 8);
});

test('Dữ liệu: mỗi câu có 4 phương án, id duy nhất, correctOptionId thuộc phương án', () => {
  const allIds = new Set();
  for (const q of L.ALL_QUESTIONS) {
    assert.equal(q.options.length, 4, q.id + ' phải có 4 phương án');
    const ids = q.options.map(o => o.id);
    for (const id of ids) assert.ok(!allIds.has(id), 'id trùng: ' + id);
    ids.forEach(id => allIds.add(id));
    assert.ok(ids.includes(q.correctOptionId), q.id + ' correctOptionId phải thuộc options');
    assert.ok(q.prompt && q.explanation && q.source && q.difficulty);
    assert.ok(Number.isInteger(q.durationMs) && q.durationMs >= 15000);
  }
});

test('Dữ liệu: thời gian và mức độ đúng spec (15/17/18/20/20 giây)', () => {
  const durs = L.QUESTIONS.map(q => q.durationMs);
  assert.deepEqual(durs, [15000, 17000, 18000, 20000, 20000]);
  assert.deepEqual(L.QUESTIONS.map(q => q.difficulty),
    ['Khởi động', 'Nắm mốc', 'Hiểu chủ trương', 'Nối sự kiện', 'Tổng hợp']);
  assert.equal(L.TIEBREAKERS[0].durationMs, 15000);
  assert.equal(L.RESCUE_QUESTION.durationMs, 15000);
});

test('Dữ liệu: nội dung câu hỏi khớp nguyên văn spec', () => {
  assert.equal(L.QUESTIONS[0].prompt, 'Chiến dịch nào kết thúc với thắng lợi lúc 17 giờ 30 phút ngày 7/5/1954?');
  assert.equal(L.QUESTIONS[0].correctOptionId, 'q1o1');
  assert.equal(L.QUESTIONS[1].correctOptionId, 'q2o1');
  assert.ok(L.QUESTIONS[2].options.find(o => o.id === 'q3o1').text.startsWith('Tôn trọng độc lập thật sự'));
  assert.ok(L.QUESTIONS[4].statements.length === 3);
  assert.ok(L.QUESTIONS[4].statements[0].startsWith('I.'));
  assert.equal(L.TIEBREAKERS[0].correctOptionId, 'tb1o1');
  assert.equal(L.TIEBREAKERS[1].correctOptionId, 'tb2o1');
  assert.equal(L.RESCUE_QUESTION.correctOptionId, 'rco1');
  assert.ok(L.SOURCE_TEXT.includes('Giáo trình Lịch sử Đảng Cộng sản Việt Nam'));
  assert.ok(L.SOURCE_TEXT.includes('PDF tr. 82–84'));
});

/* ---------- 2. Fisher–Yates + correctOptionId ổn định sau xáo ---------- */
test('Xáo thứ tự: bộ id không đổi, không trùng, correctOptionId luôn còn', () => {
  for (let seed = 1; seed <= 300; seed++) {
    const order = L.buildOptionOrder(L.mulberry32(seed));
    assert.ok(L.validateOptionOrder(order), 'seed ' + seed + ' sinh order không hợp lệ');
    for (const q of L.ALL_QUESTIONS) {
      assert.ok(order[q.id].includes(q.correctOptionId));
    }
  }
});

test('Xáo thứ tự: xác định theo seed (cùng seed cùng kết quả) và đa dạng giữa các seed', () => {
  const a = JSON.stringify(L.buildOptionOrder(L.mulberry32(42)));
  const b = JSON.stringify(L.buildOptionOrder(L.mulberry32(42)));
  assert.equal(a, b);
  const seen = new Set();
  for (let s = 0; s < 50; s++) seen.add(JSON.stringify(L.buildOptionOrder(L.mulberry32(s))));
  assert.ok(seen.size > 10, 'Nhiều seed phải cho nhiều thứ tự khác nhau');
});

test('buildOptionOrder trả về đối tượng đóng băng (bất biến)', () => {
  const order = L.buildOptionOrder(L.mulberry32(7));
  assert.ok(Object.isFrozen(order));
  assert.ok(Object.isFrozen(order.q1));
});

/* ---------- 3. Chặn biên số người còn trụ (stepper −/+) ---------- */
test('clampSurvivors: chặn biên 0..before (main/câu phụ)', () => {
  assert.equal(L.clampSurvivors('main', 10, 0, 10), 10, 'biên trên = before');
  assert.equal(L.clampSurvivors('main', 10, 0, 0), 0, 'biên dưới = 0');
  assert.equal(L.clampSurvivors('main', 10, 0, 11), 10, '11 > before=10 bị chặn về 10');
  assert.equal(L.clampSurvivors('main', 10, 0, -1), 0, 'âm bị chặn về 0');
  assert.equal(L.clampSurvivors('main', 10, 0, 7), 7);
  assert.equal(L.clampSurvivors('main', 0, 0, 1), 0, 'before=0 chỉ được 0');
  assert.equal(L.clampSurvivors('main', 10, 0, NaN), 0, 'không phải số nguyên về 0');
  assert.equal(L.clampSurvivors('main', 10, 0, 7.5), 0, 'số lẻ không phải Integer về 0');
  assert.equal(L.clampSurvivors('tb', 3, 0, 2), 2, 'câu phụ dùng cùng luật main');
});

test('clampSurvivors: chế độ cứu trợ dùng số người vừa bị loại làm trần', () => {
  assert.equal(L.clampSurvivors('rescue', 0, 8, 9), 8, '9 > eliminated=8 bị chặn về 8');
  assert.equal(L.clampSurvivors('rescue', 0, 8, 8), 8);
  assert.equal(L.clampSurvivors('rescue', 0, 8, 3), 3);
  assert.equal(L.clampSurvivors('rescue', 0, 8, 0), 0);
  assert.equal(L.clampSurvivors('rescue', 0, 8, -3), 0);
});

/* ---------- 4. FSM: bảng chuyển trạng thái ---------- */
test('FSM: các chuyển hợp lệ được chấp nhận', () => {
  assert.equal(L.canTransition('setup', 'map'), true);
  assert.equal(L.canTransition('map', 'questionReady'), true);
  assert.equal(L.canTransition('questionReady', 'counting'), true);
  assert.equal(L.canTransition('counting', 'locked'), true);
  assert.equal(L.canTransition('locked', 'revealed'), true);
  assert.equal(L.canTransition('revealed', 'questionReady'), true, 'công bố xong sang thẳng câu kế');
  assert.equal(L.canTransition('revealed', 'tieBreaker'), true);
  assert.equal(L.canTransition('revealed', 'rescue'), true);
  assert.equal(L.canTransition('revealed', 'winner'), true);
  assert.equal(L.canTransition('revealed', 'finished'), true);
  assert.equal(L.canTransition('tieBreaker', 'rescue'), true);
  assert.equal(L.canTransition('rescue', 'questionReady'), true, 'cứu trợ xong chơi tiếp');
  assert.equal(L.canTransition('winner', 'finished'), true);
  assert.equal(L.canTransition('finished', 'setup'), true);
});

test('FSM: chặn chuyển sai (công bố trước khóa, bấm liên tiếp, bỏ câu)', () => {
  assert.equal(L.canTransition('counting', 'revealed'), false, 'không công bố trước khóa');
  assert.equal(L.canTransition('questionReady', 'locked'), false, 'phải đếm rồi mới khóa');
  assert.equal(L.canTransition('revealed', 'map'), false, 'không quay lại bản đồ từ màn công bố');
  assert.equal(L.canTransition('revealed', 'counting'), false, 'không đếm lại trực tiếp');
  assert.equal(L.canTransition('revealed', 'revealed'), false, 'không công bố hai lần');
  assert.equal(L.canTransition('map', 'counting'), false);
  assert.equal(L.canTransition('setup', 'questionReady'), false);
  assert.equal(L.canTransition('questionReady', 'revealed'), false);
  assert.equal(L.canTransition('counting', 'counting'), false);
  assert.equal(L.canTransition('winner', 'map'), false);
  assert.equal(L.canTransition('rescue', 'setup'), false);
});

test('FSM: effPhase ánh xạ đúng trạng thái hiệu lực', () => {
  assert.equal(L.effPhase({ state: 'questionReady' }), 'ready');
  assert.equal(L.effPhase({ state: 'counting' }), 'counting');
  assert.equal(L.effPhase({ state: 'revealed' }), 'revealed');
  assert.equal(L.effPhase({ state: 'tieBreaker', sub: 'counting' }), 'counting');
  assert.equal(L.effPhase({ state: 'rescue', sub: 'revealed' }), 'revealed');
});

test('setPhase: trạng thái chính và sub-state khớp tên spec', () => {
  const g = L.createInitialState();
  g.state = 'questionReady';
  L.setPhase(g, 'counting');
  assert.equal(g.state, 'counting');
  const t = { state: 'tieBreaker', sub: 'ready' };
  L.setPhase(t, 'locked');
  assert.equal(t.state, 'tieBreaker');
  assert.equal(t.sub, 'locked');
});

test('currentQuestion: chọn đúng câu theo mode/trạng thái', () => {
  assert.equal(L.currentQuestion({ state: 'questionReady', mode: 'main', round: 3 }).id, 'q3');
  assert.equal(L.currentQuestion({ state: 'tieBreaker', sub: 'ready', mode: 'tb', tbRound: 2 }).id, 'tb2');
  assert.equal(L.currentQuestion({ state: 'rescue', sub: 'ready', mode: 'rescue' }).id, 'rescue');
});

/* ---------- 5. Snapshot & Undo ---------- */
test('Snapshot bất biến: sửa game sau khi chụp không ảnh hưởng snapshot', () => {
  const g = L.createInitialState();
  g.state = 'revealed';
  g.survivors = 9;
  g.rescueContext = { from: 'main', round: 2, tbRound: 0 };
  const snap = L.makeSnapshot(g, 12345, { q1: ['q1o1'] });
  g.survivors = 3;
  g.rescueContext.round = 99;
  assert.equal(snap.survivors, 9);
  assert.equal(snap.rescueContext.round, 2);
  assert.equal(snap.remainingMs, 12345);
  assert.ok(Object.isFrozen(snap));
});

test('pushSnapshot: stack tối đa 10, tự bỏ snapshot cũ nhất', () => {
  const stack = [];
  for (let i = 0; i < 12; i++) {
    L.pushSnapshot(stack, L.makeSnapshot(L.createInitialState(), i, null));
  }
  assert.equal(stack.length, L.HISTORY_MAX);
  assert.equal(stack[0].remainingMs, 2, 'hai snapshot đầu (0,1) phải bị bỏ');
  assert.equal(stack[stack.length - 1].remainingMs, 11);
});

/* ---------- 6. Timer với đồng hồ giả ---------- */
function fakeTimer() {
  let t = 0;
  return { now: () => t, advance: (ms) => { t += ms; } };
}

test('Timer: start/pause/resume chính xác theo performance.now', () => {
  const clock = fakeTimer();
  const tm = L.createTimer(clock.now, null, null);
  let expired = 0;
  tm.setCallbacks(null, () => { expired++; });
  tm.start(20000);
  tm.poll();
  assert.equal(tm.getRemainingMs(), 20000);
  clock.advance(5000);
  assert.equal(tm.poll(), 15000);
  tm.pause();
  clock.advance(2000);
  assert.equal(tm.getRemainingMs(), 15000, 'tạm dừng thì thời gian đứng yên');
  tm.resume();
  clock.advance(3000);
  assert.equal(tm.poll(), 12000);
  clock.advance(12000);
  assert.equal(tm.poll(), 0);
  assert.equal(expired, 1, 'hết giờ gọi đúng một lần onExpire');
  assert.equal(tm.isRunning(), false);
});

test('Timer: hết giờ chỉ kích onExpire một lần (không lặp)', () => {
  const clock = fakeTimer();
  const tm = L.createTimer(clock.now, null, null);
  let expired = 0;
  tm.setCallbacks(null, () => { expired++; });
  tm.start(1000);
  clock.advance(1500);
  tm.poll();
  tm.poll();
  tm.poll();
  assert.equal(expired, 1);
});

test('Timer: setRemaining ở chế độ dừng để khôi phục sau refresh', () => {
  const clock = fakeTimer();
  const tm = L.createTimer(clock.now, null, null);
  tm.setRemaining(9876, true);
  assert.equal(tm.isRunning(), false);
  clock.advance(5000);
  assert.equal(tm.getRemainingMs(), 9876);
  tm.resume();
  clock.advance(9876);
  assert.equal(tm.poll(), 0);
});

test('Timer: pause trúng đúng thời điểm hết giờ thì resume phải kích onExpire (không treo ở 0)', () => {
  const clock = fakeTimer();
  const tm = L.createTimer(clock.now, null, null);
  let expired = 0;
  tm.setCallbacks(null, () => { expired++; });
  tm.start(1000);
  clock.advance(1000);      // deadline đã qua nhưng chưa poll/rAF
  tm.pause();               // host bấm Tạm dừng đúng khung này → remaining = 0
  assert.equal(tm.getRemainingMs(), 0);
  tm.resume();              // host bấm Tiếp tục → phải kích onExpire, không được no-op
  assert.equal(expired, 1, 'onExpire phải kích khi resume ở 0');
  assert.equal(tm.isRunning(), false);
  clock.advance(60000);
  tm.poll();
  assert.equal(expired, 1, 'không kích thêm lần nữa');
});

/* ---------- 7. Serialization + validate schema ---------- */
function validGame() {
  const g = L.createInitialState();
  g.state = 'map';
  g.mode = 'main';
  g.round = 2;
  g.survivors = 9;
  g.survivorsBefore = 10;
  g.optionOrder = L.buildOptionOrder(L.mulberry32(3));
  return g;
}

test('serializeGame → deserializeGame bảo toàn trạng thái', () => {
  const g = validGame();
  const s = JSON.parse(JSON.stringify(L.serializeGame(g, 12345)));
  const r = L.deserializeGame(s);
  assert.ok(r);
  assert.equal(r.state, 'map');
  assert.equal(r.round, 2);
  assert.equal(r.survivors, 9);
  assert.equal(r.remainingMs, 12345);
  assert.equal(r.timerPaused, true, 'sau khôi phục luôn tạm dừng');
  assert.ok(L.validateOptionOrder(r.optionOrder));
});

test('deserializeGame từ chối dữ liệu hỏng/giả mạo', () => {
  const bad = [
    null,
    {},
    { v: 999 },
    Object.assign(L.serializeGame(validGame(), 100), { v: 2 }),
    Object.assign(L.serializeGame(validGame(), 100), { state: 'cheat-state' }),
    Object.assign(L.serializeGame(validGame(), 100), { survivors: 99 }),
    Object.assign(L.serializeGame(validGame(), 100), { survivors: 2.5 }),
    Object.assign(L.serializeGame(validGame(), 100), { optionOrder: {} }),
    Object.assign(L.serializeGame(validGame(), 100), { remainingMs: -5 }),
    Object.assign(L.serializeGame(validGame(), 100), { round: 9 }),
    /* forged gây khóa mềm: map với round=5 thì không còn cửa nào để mở */
    Object.assign(L.serializeGame(validGame(), 100), { state: 'map', round: 5 }),
    /* forged gây crash: rescueContext.round âm → openGate đọc QUESTIONS[âm] */
    Object.assign(L.serializeGame(validGame(), 100), { rescueContext: { from: 'main', round: -5, tbRound: 0 } }),
    Object.assign(L.serializeGame(validGame(), 100), { rescueContext: { from: 'hack', round: 1, tbRound: 0 } })
  ];
  for (const b of bad) assert.equal(L.deserializeGame(b), null, JSON.stringify(b).slice(0, 60));
});

test('deserializeGame: nhận save cũ ở survivorEntry/entry (tương thích ngược)', () => {
  const s = Object.assign(L.serializeGame(validGame(), 100), { state: 'survivorEntry', sub: null });
  const r = L.deserializeGame(s);
  assert.ok(r, 'save cũ survivorEntry phải được nhận');
  assert.equal(r.state, 'revealed');
  const s2raw = L.serializeGame(validGame(), 100);
  s2raw.state = 'tieBreaker'; s2raw.sub = 'entry';
  const r2 = L.deserializeGame(s2raw);
  assert.ok(r2, 'save cũ sub=entry phải được nhận');
  assert.equal(r2.sub, 'revealed');
});

test('sanitizeName chống XSS/ký tự điều khiển, giới hạn 40 ký tự', () => {
  assert.equal(L.sanitizeName('<img src=x onerror=alert(1)>'), '<img src=x onerror=alert(1)>'.slice(0, 40).trim());
  assert.equal(L.sanitizeName('A\u0000B\u001FC'), 'ABC');
  assert.equal(L.sanitizeName('  Minh  '), 'Minh');
  assert.equal(L.sanitizeName('x'.repeat(100)).length, 40);
  assert.equal(L.sanitizeName(null), '');
});
