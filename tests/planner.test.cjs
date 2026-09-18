const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const details = require('../wedding-details.js');
const page = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const main = [...page.matchAll(/<script>([\s\S]*?)<\/script>/g)].find(match => match[1].includes('const defaultRows'))[1];
function planner(saved) {
  const context = vm.createContext({
    WEDDING_DETAILS: details, structuredClone, crypto: { randomUUID },
    document: { querySelector: () => ({}) },
    localStorage: { getItem: key => key.endsWith('-v3') && saved ? JSON.stringify(saved) : null }
  });
  vm.runInContext(main.slice(0, main.indexOf('    function saveState()')), context);
  vm.runInContext(main.slice(main.indexOf('    function recomputeRows()'), main.indexOf('    function updateSummary()')), context);
  return { context, read: expression => JSON.parse(vm.runInContext(`JSON.stringify(${expression})`, context)) };
}
test('PDFの挙式・披露宴・氏名を全ページの共通初期値にする', () => {
  const event = details.resolve('');
  assert.equal(event.date, '2027-03-07'); assert.equal(event.names, '智哉 & 梨那');
  assert.equal(event.getTime('time'), '12:00'); assert.equal(event.getTime('reception'), '13:00'); assert.equal(event.getTime('end'), '15:20');
  assert.equal(event.getTime('arrival'), ''); assert.equal(event.getTime('photoTime'), ''); assert.equal(event.deadline, '');
  for (const file of ['index.html', 'showcase/index.html', 'invite/index.html', 'invite/reference/index.html', 'invite/botanical/index.html']) {
    const html = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    assert.ok(html.includes('wedding-details.js'));
    for (const script of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) assert.doesNotThrow(() => new vm.Script(script[1]));
  }
});
test('古い11時の共有リンクを修正し、別日程や無効な時刻を補完しない', () => {
  assert.equal(details.resolve('?date=2027-03-07&time=11%3A00').getTime('time'), '12:00');
  assert.equal(details.resolve('?date=2027-01-23&time=11%3A00').date, '2027-03-07');
  assert.equal(details.resolve('?date=2028-01-01').getTime('time'), '');
  assert.equal(details.resolve('?time=99%3A00').getTime('time'), '');
  assert.equal(details.resolve('?arrival=11%3A30').getTime('arrival'), '11:30');
});
test('プリムローズのPDF原本と初期見積の金額・各小計が一致する', () => {
  const p = planner(); vm.runInContext('recomputeRows()', p.context);
  const t = p.read('totals()');
  assert.equal(t.gross, 3584950); assert.equal(t.discount, -675250); assert.equal(t.final, 2350670);
  assert.deepEqual(t.section, { '①': 2555950, '②': 178000, '③': 575000, '④': 276000 });
  const settings = p.read('settings');
  assert.equal(settings.deposit, 50000); assert.equal(settings.nonTaxBenefits, 800000);
  assert.equal(settings.guestCount, 50); assert.equal(settings.giftPerGuest, 33000);
});
test('保存済みの見積・メモ・担当・完了・独自期限を保って旧日程を更新する', () => {
  const baseline = planner().read('rows'); baseline[0][5] = 320000;
  const p = planner({ uxVersion: 8, rows: baseline, settings: {
    weddingDate: '2027-03-07', weddingTime: '11:00', nextMeetingDate: '2026-09-06', nextMeetingTime: '09:30',
    guestCount: 60, venueMemo: '持参物を確認', rsvpDeadline: '2027-01-15', googleFormUrl: 'https://forms.gle/OLD'
  }, prepTasks: [
    { id: 'choose-dress', text: 'ドレス試着', owner: '新郎', done: true, dueDate: '2026-09-20', daysBefore: 170 },
    { id: 'my-plan', text: 'ふたりの追加予定', owner: '新婦', done: false, dueDate: '', daysBefore: null, custom: true }
  ] });
  const settings = p.read('settings');
  assert.equal(settings.weddingTime, '12:00'); assert.equal(settings.nextMeetingDate, '2026-09-19');
  assert.equal(settings.guestCount, 60); assert.equal(settings.venueMemo, '持参物を確認'); assert.equal(settings.rsvpDeadline, '2027-01-15');
  assert.ok(!('googleFormUrl' in settings)); assert.equal(p.read('rows')[0][5], 320000);
  const dress = p.read('prepTasks.find(task => task.id === "choose-dress")');
  assert.equal(dress.owner, '新郎'); assert.equal(dress.done, true); assert.equal(dress.dueDate, '2026-09-20'); assert.equal(dress.source, 'user');
  assert.equal(p.read('prepTasks.find(task => task.id === "my-plan")').daysBefore, null);
});
test('式場の予定を追加し、3つの締切と衣裳合わせ日を維持する', () => {
  const p = planner(); const tasks = p.read('prepTasks');
  for (const [id, date] of Object.entries({ 'choose-dress': '2026-09-19', 'venue-second-meeting': '2026-09-19', 'venue-video-meeting': '2026-09-27', 'venue-content-lock': '2027-02-07', 'venue-quantity-lock': '2027-02-21', 'venue-payment': '2027-02-24' })) {
    const task = tasks.find(task => task.id === id); assert.equal(task.dueDate, date); assert.equal(task.source, 'venue');
  }
  assert.equal(p.read('settings.rsvpDeadline'), '');
  const normalized = p.read('normalizePrepTasks([null, {id:"x",text:"予定",daysBefore:null}, {id:"x",text:"重複"}, {text:"期限なし",daysBefore:""}])');
  assert.equal(normalized.length, 2); assert.equal(normalized[0].daysBefore, null); assert.equal(normalized[1].daysBefore, null);
  assert.equal(p.read('migratePrepTasks(prepTasks, 9)').length, tasks.length);
});
test('共有URLは選択デザインと確定時刻を使い、Googleフォームへ誘導しない', () => {
  const p = planner();
  p.context.URL = URL; p.context.URLSearchParams = URLSearchParams;
  vm.runInContext(main.slice(main.indexOf('    function invitationPageUrl()'), main.indexOf('    function updateInvitationPreview()')), p.context);
  vm.runInContext('settings.invitationDesign = "botanical"; settings.rsvpDeadline = "2027-01-15"', p.context);
  const url = new URL(p.read('invitationPageUrl()'));
  assert.equal(url.pathname, '/primrose-wedding-planner/invite/botanical/');
  assert.equal(url.searchParams.get('time'), '12:00'); assert.equal(url.searchParams.get('reception'), '13:00'); assert.equal(url.searchParams.get('end'), '15:20');
  assert.equal(url.searchParams.get('deadline'), '2027-01-15'); assert.ok(!url.searchParams.has('form'));
  assert.ok(!page.includes('公開したGoogleフォーム')); assert.ok(page.includes('原本の') || page.includes('日程・時間・締切の原本'));
});
test('明細に入力ラベルを付け、手動で消したタスク期限を復活させない', () => {
  assert.ok(page.includes('td.dataset.label = cellLabels[cellIndex]'));
  assert.ok(page.includes('input.setAttribute("aria-label", `${row[3]}の${cellLabels[cellIndex]}`)'));
  assert.ok(page.includes('.detail-table tbody tr { display: grid;'));
  const p = planner();
  vm.runInContext(main.slice(main.indexOf('    function parseLocalDate('), main.indexOf('    function prepDueDate(')), p.context);
  assert.equal(p.read('prepDueValue({source:"user",dueDate:"",daysBefore:170})'), '');
  assert.equal(p.read('prepDueValue({source:"venue",dueDate:"2027-02-07",daysBefore:null})'), '2027-02-07');
});
