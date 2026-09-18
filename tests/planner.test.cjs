const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const details = require('../wedding-details.js');
const preparation = require('../preparation-data.js');
const page = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const main = [...page.matchAll(/<script>([\s\S]*?)<\/script>/g)].find(match => match[1].includes('const defaultRows'))[1];
function planner(saved) {
  const context = vm.createContext({
    WEDDING_DETAILS: details, WEDDING_PREPARATION: preparation, structuredClone, crypto: { randomUUID },
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
test('見積とメモは維持し、旧チェックリストは全て表示から外して保管する', () => {
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
  const tasks = p.read('prepTasks');
  assert.equal(tasks.length, 20);
  assert.ok(tasks.every(task => task.id.startsWith('pdf-') && task.source === 'pdf' && !task.done));
  assert.ok(!tasks.some(task => ['choose-dress', 'my-plan'].includes(task.id)));
  const archive = p.read('prepArchive');
  assert.equal(archive.length, 1); assert.equal(archive[0].tasks[0].dueDate, '2026-09-20');
  assert.equal(archive[0].tasks[1].text, 'ふたりの追加予定');
  const reloaded = planner({ uxVersion: 10, settings, rows: baseline, prepTasks: tasks, prepArchive: archive });
  assert.deepEqual(reloaded.read('prepArchive'), archive);
});
test('予定と3つの締切はPDF固定値、宿題は9/19の打ち合わせ前までにする', () => {
  const p = planner(); const tasks = p.read('prepTasks');
  for (const [id, date] of Object.entries({ 'pdf-costume-meeting': '2026-09-19', 'pdf-second-meeting': '2026-09-19', 'pdf-movie-meeting': '2026-09-27', 'pdf-content-deadline': '2027-02-07', 'pdf-quantity-deadline': '2027-02-21', 'pdf-payment-deadline': '2027-02-24' })) {
    const task = tasks.find(task => task.id === id); assert.equal(task.dueDate, date); assert.equal(task.source, 'pdf');
  }
  assert.equal(tasks.find(task => task.id === 'pdf-costume-meeting').dueTime, '12:00');
  assert.equal(tasks.find(task => task.id === 'pdf-onew-guests').dueTime, '09:30');
  assert.equal(tasks.find(task => task.id === 'pdf-movie-meeting').dueTime, '14:00');
  assert.equal(p.read('settings.rsvpDeadline'), '');
  assert.deepEqual(p.read('migratePrepTasks(prepTasks, 10)'), tasks);
});
test('全項目のPDF・ページ・該当箇所があり、一般タスクや逆算用の日数はない', () => {
  assert.equal(new Set(preparation.tasks.map(task => task.id)).size, preparation.tasks.length);
  for (const task of preparation.tasks) {
    const document = preparation.documents[task.document];
    assert.ok(document && document.id && task.page >= 1 && task.page <= document.pages && task.excerpt);
    assert.ok(preparation.phases.some(phase => phase.id === task.phase));
    assert.ok(!('daysBefore' in task));
    assert.equal(task.owner, 'ふたり');
  }
  assert.ok(!page.includes('prepAddForm'));
  assert.ok(!page.includes('平均の追加額は'));
  assert.ok(!page.includes('挙式日から逆算した'));
  assert.ok(!preparation.tasks.some(task => /指輪|旅行|婚姻届|早めに休む/.test(task.text)));
});
test('共有・保存データから本文・日程・出典を書き換えず、担当と完了だけを引き継ぐ', () => {
  const p = planner();
  const tasks = p.read('normalizePrepTasks([null, {id:"unknown",text:"推測した予定"}, {id:"pdf-costume-meeting",text:"書き換え",dueDate:"2026-10-01",dueTime:"11:00",document:"fake",owner:"新婦",done:true}, {id:"pdf-costume-meeting",owner:"新郎",done:false}, {id:"pdf-onew-guests",owner:"不明",done:"false"}])');
  assert.equal(tasks.length, preparation.tasks.length);
  assert.ok(!tasks.some(task => task.id === 'unknown'));
  const costume = tasks.find(task => task.id === 'pdf-costume-meeting');
  assert.equal(costume.text, '衣裳合わせ'); assert.equal(costume.dueDate, '2026-09-19'); assert.equal(costume.dueTime, '12:00');
  assert.equal(costume.document, 'schedule'); assert.equal(costume.owner, '新婦'); assert.equal(costume.done, true);
  assert.equal(tasks.find(task => task.id === 'pdf-onew-guests').owner, 'ふたり');
  assert.equal(tasks.find(task => task.id === 'pdf-onew-guests').done, false);
  const fresh = planner({ uxVersion: 10, rows: p.read('rows'), prepTasks: tasks });
  assert.deepEqual(fresh.read('prepTasks'), tasks);
});
test('旧バックアップを再度読み込んでも旧タスクを復活させず、保管は重複しない', () => {
  const p = planner();
  vm.runInContext('const oldTasks = [{id:"set-priorities",text:"希望と予算",done:true}]; const once = buildPrepArchive(oldTasks, 9, []); const twice = buildPrepArchive(oldTasks, 9, once);', p.context);
  assert.deepEqual(p.read('once'), p.read('twice'));
  assert.ok(p.read('migratePrepTasks(oldTasks, 9)').every(task => task.id.startsWith('pdf-') && !task.done));
  vm.runInContext(main.slice(main.indexOf('    function backupPayload()'), main.indexOf('    function backupFileName()')), p.context);
  assert.equal(p.read('backupPayload().schemaVersion'), 2);
  assert.equal(p.read('backupPayload().prepSourceVersion'), preparation.version);
  assert.ok(Array.isArray(p.read('backupPayload().prepArchive')));
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
test('明細はスマホの入力ラベルを維持し、PDFにない日付は挙式日から推測しない', () => {
  assert.ok(page.includes('td.dataset.label = cellLabels[cellIndex]'));
  assert.ok(page.includes('input.setAttribute("aria-label", `${row[3]}の${cellLabels[cellIndex]}`)'));
  assert.ok(page.includes('.detail-table tbody tr { display: grid;'));
  const p = planner();
  vm.runInContext(main.slice(main.indexOf('    function parseLocalDate('), main.indexOf('    function prepStats(')), p.context);
  assert.equal(p.read('prepDueValue({dueDate:"",daysBefore:170})'), '');
  assert.equal(p.read('prepScheduleLabel(prepTasks.find(task => task.id === "pdf-third-meeting"))'), '日付の記載なし');
  assert.equal(p.read('prepScheduleLabel(prepTasks.find(task => task.id === "pdf-family-costume"))'), '式の2か月前まで');
  assert.ok(p.read('prepScheduleLabel(prepTasks.find(task => task.id === "pdf-onew-guests"))').endsWith('09:30の打ち合わせ前まで'));
  vm.runInContext('settings.weddingDate = "2028-04-01"', p.context);
  assert.equal(p.read('prepDueValue(prepTasks.find(task => task.id === "pdf-fourth-meeting"))'), '');
  assert.equal(p.read('prepDueValue(prepTasks.find(task => task.id === "pdf-content-deadline"))'), '2027-02-07');
});
test('宿題の9時半を過ぎたら超過を示し、12時の衣裳合わせは今日の予定とする', () => {
  const p = planner();
  vm.runInContext(main.slice(main.indexOf('    function parseLocalDate('), main.indexOf('    function updatePrepHome(')), p.context);
  vm.runInContext('const NativeDate = Date; Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : [2026,8,19,9,45,0,0])); } };', p.context);
  assert.equal(p.read('prepStatus(prepTasks.find(task => task.id === "pdf-onew-guests")).className'), 'overdue');
  assert.equal(p.read('prepStatus(prepTasks.find(task => task.id === "pdf-costume-meeting")).label'), '今日の予定');
  assert.equal(p.read('prepStats().overdue.length'), 3);
  vm.runInContext('prepTasks.forEach(task => { if (task.phase === "homework" || task.phase === "appointments") task.done = true; });', p.context);
  assert.equal(p.read('prepStats().open[0].id'), 'pdf-marrysys-email');
});
