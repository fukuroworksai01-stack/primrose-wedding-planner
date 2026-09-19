const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const client = require('../invite/rsvp-client.js');
const code = fs.readFileSync(path.join(__dirname, '../apps-script/Code.gs'), 'utf8');
const headers = ['初回受付日時', '更新日時', '回答ID', '送信ID', 'ご出欠', 'お名前', 'ふりがな', 'アレルギー有無', 'アレルギー詳細', 'シャトルバス', 'メッセージ', 'デザイン'];

class Sheet {
  constructor() { this.rows = [headers.slice()]; this.capacity = 20; this.failNextWrite = false; }
  getLastRow() { return this.rows.length; }
  getMaxRows() { return this.capacity; }
  insertRowsAfter(row, number) { this.capacity += number; }
  getRange(row, column, rowCount = 1, columnCount = 1) {
    const sheet = this;
    return {
      getValue() { return (sheet.rows[row - 1] || [])[column - 1] ?? ''; },
      getValues() { return Array.from({ length: rowCount }, (_, r) => Array.from({ length: columnCount }, (_, c) => (sheet.rows[row + r - 1] || [])[column + c - 1] ?? '')); },
      setValues(values) {
        if (sheet.failNextWrite) { sheet.failNextWrite = false; throw new Error('write unavailable'); }
        values.forEach((record, r) => { sheet.rows[row + r - 1] ||= []; record.forEach((value, c) => sheet.rows[row + r - 1][column + c - 1] = value); });
        return this;
      },
      setNumberFormat() { return this; },
      createTextFinder(id) {
        return { matchEntireCell() { return this; }, useRegularExpression() { return this; }, findNext() {
          for (let r = row; r < row + rowCount; r++) if ((sheet.rows[r - 1] || [])[column - 1] === id) return { getRow: () => r };
          return null;
        } };
      }
    };
  }
}
function backend(options = {}) {
  const answers = new Sheet(), history = new Sheet();
  let readCount = 0, releases = 0;
  const context = vm.createContext({
    SpreadsheetApp: { openById: () => { readCount++; return { getSheetByName: name => name === '回答一覧' ? answers : name === '回答履歴' ? history : null }; }, flush() { if (options.flushFailure) throw new Error('flush'); } },
    LockService: { getScriptLock: () => ({ tryLock: () => !options.busy, releaseLock: () => releases++ }) },
    HtmlService: { XFrameOptionsMode: { ALLOWALL: 'ALLOWALL' }, createHtmlOutput: content => ({ content, setXFrameOptionsMode(value) { this.frame = value; return this; }, setTitle(title) { this.title = title; return this; } }) },
    ContentService: { MimeType: { JSON: 'application/json' }, createTextOutput: content => ({ content, setMimeType(mime) { this.mime = mime; return this; } }) },
    Utilities: { getUuid: randomUUID }, Date, JSON
  });
  const api = new vm.Script(code.replace('closed: false', 'closed: ' + !!options.closed) + '\n({submitRsvp, doPost, doGet, safeCell_, validate_})').runInContext(context);
  return { api, answers, history, get readCount() { return readCount; }, get releases() { return releases; } };
}
function payload(extra = {}) {
  return { eventKey: 'primrose-20270307-3c7ec32e6d1f4fda', responseId: randomUUID(), requestId: randomUUID(), attendance: '出席します', name: '動作確認用ゲスト', kana: 'どうさかくにんようげすと', allergyFlag: 'あり', allergy: '動作確認用（実在のアレルギー情報ではありません）', shuttle: '未定', message: '送信テスト', design: 'balloon', website: '', ...extra };
}

test('出席回答を最新一覧と履歴に保存し、再送を重複させない', () => {
  const b = backend(), p = payload();
  assert.equal(b.api.submitRsvp(p).ok, true);
  assert.equal(b.answers.rows.length, 2); assert.equal(b.history.rows.length, 2);
  assert.equal(b.answers.rows[1][5], p.name); assert.equal(b.answers.rows[1][8], p.allergy);
  assert.equal(b.api.submitRsvp(p).duplicate, true);
  assert.equal(b.answers.rows.length, 2); assert.equal(b.history.rows.length, 2);
});
test('ページ内の変更は同じゲストの最新行だけ更新する', () => {
  const b = backend(), p = payload(); b.api.submitRsvp(p);
  const changed = { ...p, requestId: randomUUID(), attendance: '欠席します' };
  assert.equal(b.api.submitRsvp(changed).ok, true);
  assert.equal(b.answers.rows.length, 2); assert.equal(b.history.rows.length, 3);
  assert.equal(b.answers.rows[1][4], '欠席します');
  assert.equal(b.answers.rows[1][7], '対象外'); assert.equal(b.answers.rows[1][8], '対象外'); assert.equal(b.answers.rows[1][9], '対象外');
  assert.equal(b.answers.rows[1][0], b.history.rows[1][0]);
});
test('欠席なら食事・送迎の入力を求めない', () => {
  const b = backend(); assert.equal(b.api.submitRsvp(payload({ attendance: '欠席します', allergyFlag: '', allergy: '', shuttle: '' })).ok, true);
});
test('ありの場合の詳細、氏名、出欠、送迎、文字数をサーバー側で検証', () => {
  for (const extra of [{ allergy: '   ' }, { name: ' ' }, { attendance: '未定' }, { shuttle: '' }, { name: 'x'.repeat(101) }, { message: 'x'.repeat(1001) }, { eventKey: 'wrong' }, { responseId: 'guess' }, { website: 'bot' }]) {
    const b = backend(); assert.equal(b.api.submitRsvp(payload(extra)).ok, false); assert.equal(b.readCount, 0);
  }
});
test('なしを選んだ回答に過去のアレルギー入力を残さない', () => {
  const b = backend(); b.api.submitRsvp(payload({ allergyFlag: 'なし', allergy: '古い情報' }));
  assert.equal(b.answers.rows[1][8], 'なし');
});
test('セルの数式注入を防ぐ', () => {
  const b = backend(); b.api.submitRsvp(payload({ name: '=IMPORTXML("https://example.invalid","//a")', message: '@malicious', kana: '+123' }));
  assert.ok(b.answers.rows[1][5].startsWith("'=")); assert.equal(b.answers.rows[1][10], "'@malicious"); assert.equal(b.answers.rows[1][6], "'+123");
});
test('履歴書き込み失敗は完了にせず、同じIDの再試行で修復する', () => {
  const b = backend(), p = payload(); b.history.failNextWrite = true;
  assert.equal(b.api.submitRsvp(p).ok, false); assert.equal(b.history.rows.length, 1);
  assert.equal(b.api.submitRsvp(p).ok, true); assert.equal(b.answers.rows.length, 2); assert.equal(b.history.rows.length, 2);
});
test('ロック取得失敗・受付終了は保存しない', () => {
  for (const options of [{ busy: true }, { closed: true }]) { const b = backend(options); assert.equal(b.api.submitRsvp(payload()).ok, false); assert.equal(b.readCount, 0); }
});
test('別の回答IDへの送信ID使い回しは成功にしない', () => {
  const b = backend(), p = payload(); b.api.submitRsvp(p);
  assert.equal(b.api.submitRsvp({ ...p, responseId: randomUUID() }).ok, false);
});
test('doPostは許可された招待状へだけ確認を返す', () => {
  const b = backend(), p = payload({ replyOrigin: 'https://fukuroworksai01-stack.github.io' });
  const html = b.api.doPost({ parameter: p });
  assert.ok(html.content.includes('"ok":true')); assert.ok(html.content.includes('window.top.postMessage'));
  assert.ok(html.content.includes(p.requestId)); assert.equal(html.frame, 'ALLOWALL');
  const denied = b.api.doPost({ parameter: payload({ replyOrigin: 'https://attacker.invalid' }) });
  assert.ok(denied.content.includes('"ok":false')); assert.equal(b.answers.rows.length, 2);
});
test('回答用の別画面は他のゲストの情報やSheet URLを公開しない', () => {
  const b = backend(); const html = b.api.doGet({ parameter: {} });
  assert.equal(b.readCount, 0); assert.ok(!html.content.includes('docs.google.com/spreadsheets'));
  const script = html.content.match(/<script>([\s\S]*?)<\/script>/)[1]; assert.doesNotThrow(() => new vm.Script(script));
});
test('匿名fetchには保存確認済みのJSONと今回の送信IDだけ返す', () => {
  const b = backend(), p = payload({ replyOrigin: 'https://fukuroworksai01-stack.github.io', transport: 'json' });
  const reply = b.api.doPost({ parameter: p });
  assert.equal(reply.mime, 'application/json');
  const result = JSON.parse(reply.content);
  assert.equal(result.ok, true); assert.equal(result.requestId, p.requestId);
  assert.equal(result.type, 'wedding-rsvp-result'); assert.equal(result.receipt, p.responseId.slice(0, 8).toUpperCase());
  assert.ok(!reply.content.includes(p.name)); assert.ok(!reply.content.includes('spreadsheet'));
});
test('送信先URLは設定済みApps Scriptのexecだけ許可', () => {
  assert.ok(client.validEndpoint('https://script.google.com/macros/s/EXAMPLE/exec'));
  for (const value of ['javascript:alert(1)', 'https://attacker.invalid/exec', 'https://script.google.com/macros/s/ID/dev', 'https://script.google.com/macros/s/ID/exec?x=1', 'https://name:pass@script.google.com/macros/s/ID/exec']) assert.equal(client.validEndpoint(value), '');
});
test('デザイン比較のプレビューだけを判別し、一覧に戻れる', () => {
  assert.equal(client.isPreviewMode('?preview=1'), true);
  assert.equal(client.isPreviewMode('?preview=0'), false);
  assert.equal(client.isPreviewMode(''), false);
  const created = [];
  const document = {
    scripts: [{ src: 'https://example.test/primrose-wedding-planner/invite/rsvp-client.js?v=2' }],
    body: { classList: { add(value) { assert.equal(value, 'rsvp-preview-mode'); } }, prepend(element) { created.push(element); } },
    querySelector(selector) { return selector === '[data-rsvp-widget]' ? { dataset: { design: 'garden' } } : null; },
    createElement(tagName) { return { tagName, dataset: {}, children: [], setAttribute() {}, append(...children) { this.children.push(...children); } }; }
  };
  client.addPreviewNavigation(document);
  assert.equal(created.length, 1);
  assert.equal(created[0].dataset.design, 'garden');
  assert.equal(created[0].children[0].href, 'https://example.test/primrose-wedding-planner/showcase/#invitations');
  assert.match(created[0].children[1].textContent, /送信なし/);
});
test('Google由来かつ今回の送信IDの確認のみ受け付ける', () => {
  const requestId = randomUUID(), message = { origin: 'https://n-example-script.googleusercontent.com', data: { type: 'wedding-rsvp-result', requestId, ok: true, receipt: 'ABCDEF12' } };
  assert.equal(client.acceptedMessage(message, requestId), true);
  assert.equal(client.acceptedMessage({ ...message, origin: 'https://attacker.invalid' }, requestId), false);
  assert.equal(client.acceptedMessage(message, randomUUID()), false);
  assert.equal(client.acceptedMessage(message, ''), false);
  assert.equal(client.acceptedMessage({ ...message, data: { ...message.data, ok: 'true' } }, requestId), false);
});
test('クライアント側の欠席データを正規化し、表示にHTMLを使わない', () => {
  const data = client.normaliseFields({ attendance: '欠席します', name: ' 山田 花子 ', allergyFlag: 'あり', allergy: '古い情報', shuttle: '利用する予定' });
  assert.equal(data.name, '山田 花子'); assert.equal(data.allergy, '対象外'); assert.equal(data.shuttle, '対象外');
  assert.equal(client.normaliseFields({ attendance: '出席します', allergyFlag: 'なし', allergy: '古い情報' }).allergy, 'なし');
  const source = fs.readFileSync(path.join(__dirname, '../invite/rsvp-client.js'), 'utf8');
  assert.ok(source.includes('item.textContent = data')); assert.ok(!source.includes("addEventListener('load'"));
  assert.ok(source.includes("credentials: 'omit'")); assert.ok(!source.includes("mode: 'no-cors'"));
});
test('3デザインは共通フォームを一つだけ読み込み、未確定の時刻を作らない', () => {
  for (const relative of ['invite/index.html', 'invite/reference/index.html', 'invite/botanical/index.html']) {
    const page = fs.readFileSync(path.join(__dirname, '..', relative), 'utf8');
    assert.equal((page.match(/data-rsvp-widget/g) || []).length, 1);
    assert.ok(page.indexOf('rsvp-config.js') < page.indexOf('rsvp-client.js'));
    assert.ok(page.includes('後日ご案内'));
    assert.ok(!page.includes('addMinutes'));
    assert.ok(!page.includes('params.get("form")'));
    for (const script of page.matchAll(/<script>([\s\S]*?)<\/script>/g)) assert.doesNotThrow(() => new vm.Script(script[1]));
  }
});
