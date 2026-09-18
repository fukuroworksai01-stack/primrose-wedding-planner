// 公開Webアプリは書き込みと受付確認だけを行い、回答を読み出すAPIは持ちません。
const RSVP_CONFIG = Object.freeze({
  spreadsheetId: 'REPLACE_WITH_PRIVATE_SHEET_ID',
  eventKey: 'primrose-20270307-3c7ec32e6d1f4fda',
  origins: ['https://fukuroworksai01-stack.github.io', 'http://127.0.0.1:43871'],
  maximumResponses: 2000,
  maximumHistory: 5000,
  closed: false
});
const RSVP_HEADERS = ['初回受付日時', '更新日時', '回答ID', '送信ID', 'ご出欠', 'お名前', 'ふりがな', 'アレルギー有無', 'アレルギー詳細', 'シャトルバス', 'メッセージ', 'デザイン'];

function doPost(e) {
  const p = (e && e.parameter) || {};
  const origin = RSVP_CONFIG.origins.indexOf(p.replyOrigin) >= 0 ? p.replyOrigin : '';
  const result = origin ? submitRsvp(p) : failure_('送信元を確認できませんでした。招待状からもう一度お試しください。');
  result.type = 'wedding-rsvp-result';
  result.requestId = validId_(p.requestId) ? p.requestId : '';
  // Cookieを送らないfetch用。Googleのマルチログインの影響を避ける。
  if (p.transport === 'json') return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  // <script>内のJSONはユーザー入力で閉じられないようにエスケープ。
  const json = JSON.stringify(result).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const target = JSON.stringify(origin || RSVP_CONFIG.origins[0]);
  return HtmlService.createHtmlOutput('<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"></head><body><p>' + (result.ok ? '回答を受け付けました。招待状へお戻りください。' : '回答の送信を完了できませんでした。招待状へお戻りください。') + '</p><script>window.top.postMessage(' + json + ',' + target + ');</script></body></html>')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// google.script.runに公開するのはこの書き込み関数のみ。補助関数は末尾_で非公開。
function submitRsvp(input) {
  let lock;
  try {
    if (RSVP_CONFIG.closed) return failure_('現在、出欠回答の受付を終了しています。変更は新郎新婦へご連絡ください。');
    const p = validate_(input);
    lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return failure_('送信が混み合っています。少し待って、同じ内容で再送してください。');
    const book = SpreadsheetApp.openById(RSVP_CONFIG.spreadsheetId);
    const sheet = book.getSheetByName('回答一覧');
    const history = book.getSheetByName('回答履歴');
    if (!sheet || !history) throw new Error('storage');
    verifyHeaders_(sheet); verifyHeaders_(history);
    const receipt = p.responseId.slice(0, 8).toUpperCase();
    // 確認できなかった送信の再試行でも、履歴と集計を二重に増やさない。
    const duplicateRow = findRow_(history, 4, p.requestId);
    if (duplicateRow) {
      if (String(history.getRange(duplicateRow, 3).getValue()) !== p.responseId) invalid_('受付番号を確認できませんでした。もう一度ご回答ください。');
      return { ok: true, receipt: receipt, duplicate: true };
    }
    let row = findRow_(sheet, 3, p.responseId);
    if (!row && sheet.getLastRow() >= RSVP_CONFIG.maximumResponses + 1) return failure_('現在、出欠回答を受け付けられません。新郎新婦へご連絡ください。');
    if (history.getLastRow() >= RSVP_CONFIG.maximumHistory + 1) return failure_('現在、出欠回答を受け付けられません。新郎新婦へご連絡ください。');
    const now = new Date();
    const created = row ? sheet.getRange(row, 1).getValue() : now;
    const values = [created, now, p.responseId, p.requestId, p.attendance, safeCell_(p.name), safeCell_(p.kana), p.allergyFlag, safeCell_(p.allergy), p.shuttle, safeCell_(p.message), p.design];
    if (!row) row = sheet.getLastRow() + 1;
    ensureRows_(sheet, row); ensureRows_(history, history.getLastRow() + 1);
    // 最新回答を先に保存。履歴保存前に失敗しても、同じIDの再試行で修復できる。
    sheet.getRange(row, 1, 1, RSVP_HEADERS.length).setValues([values]);
    sheet.getRange(row, 1, 1, 2).setNumberFormat('yyyy-mm-dd hh:mm:ss');
    history.getRange(history.getLastRow() + 1, 1, 1, RSVP_HEADERS.length).setValues([values]);
    SpreadsheetApp.flush();
    if (String(sheet.getRange(row, 4).getValue()) !== p.requestId) throw new Error('write-check');
    return { ok: true, receipt: receipt, duplicate: false };
  } catch (error) {
    return failure_(error && error.name === 'ValidationError' ? error.message : '保存を確認できませんでした。内容を変えずに、もう一度送信してください。');
  } finally {
    if (lock) lock.releaseLock();
  }
}

function failure_(message) { return { ok: false, message: message }; }
function validId_(value) { return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
function invalid_(message) { const error = new Error(message); error.name = 'ValidationError'; throw error; }
function text_(input, key, maximum, required) {
  const raw = input[key];
  if (raw !== undefined && typeof raw !== 'string') invalid_('入力内容を確認してください。');
  const value = (raw || '').replace(/\r\n?/g, '\n').trim();
  if (value.length > maximum || (required && !value) || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value)) invalid_('入力内容の長さ、または必須項目を確認してください。');
  return value;
}
function validate_(input) {
  if (!input || input.eventKey !== RSVP_CONFIG.eventKey || input.website) invalid_('招待状からもう一度ご回答ください。');
  if (!validId_(input.requestId) || !validId_(input.responseId)) invalid_('受付番号を確認できませんでした。ページを開き直してください。');
  const attendance = text_(input, 'attendance', 12, true);
  if (['出席します', '欠席します'].indexOf(attendance) < 0) invalid_('ご出欠を選択してください。');
  const attending = attendance === '出席します';
  let allergyFlag = attending ? text_(input, 'allergyFlag', 8, true) : '対象外';
  if (attending && ['なし', 'あり'].indexOf(allergyFlag) < 0) invalid_('アレルギーの有無を選択してください。');
  const allergy = attending && allergyFlag === 'あり' ? text_(input, 'allergy', 1000, true) : attending ? 'なし' : '対象外';
  const shuttle = attending ? text_(input, 'shuttle', 16, true) : '対象外';
  if (attending && ['利用する予定', '利用しない予定', '未定'].indexOf(shuttle) < 0) invalid_('シャトルバスのご希望を選択してください。');
  const design = text_(input, 'design', 24, false);
  return {
    responseId: input.responseId.toLowerCase(), requestId: input.requestId.toLowerCase(),
    attendance: attendance, name: text_(input, 'name', 100, true), kana: text_(input, 'kana', 100, false),
    allergyFlag: allergyFlag, allergy: allergy, shuttle: shuttle, message: text_(input, 'message', 1000, false),
    design: ['balloon', 'garden', 'botanical', 'direct'].indexOf(design) >= 0 ? design : 'direct'
  };
}
function safeCell_(value) { return /^[\s\u200b\ufeff]*[=+\-@]/.test(value) ? "'" + value : value; }
function verifyHeaders_(sheet) {
  const actual = sheet.getRange(1, 1, 1, RSVP_HEADERS.length).getValues()[0];
  if (JSON.stringify(actual) !== JSON.stringify(RSVP_HEADERS)) throw new Error('headers');
}
function findRow_(sheet, column, id) {
  if (sheet.getLastRow() < 2) return 0;
  const cell = sheet.getRange(2, column, sheet.getLastRow() - 1, 1).createTextFinder(id).matchEntireCell(true).useRegularExpression(false).findNext();
  return cell ? cell.getRow() : 0;
}
function ensureRows_(sheet, row) { if (row > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), Math.max(50, row - sheet.getMaxRows())); }

// LINE内ブラウザーなどで埋め込み送信が確認できないときの回答画面。
function doGet(e) {
  const responseId = validId_(e && e.parameter && e.parameter.response) ? e.parameter.response.toLowerCase() : Utilities.getUuid();
  const config = JSON.stringify({ responseId: responseId, eventKey: RSVP_CONFIG.eventKey }).replace(/</g, '\\u003c');
  const html = '<!doctype html><html lang="ja"><head><base target="_top"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><title>結婚式の出欠回答</title><style>body{margin:0;background:#f7eee8;color:#302922;font:16px/1.8 -apple-system,BlinkMacSystemFont,"Noto Sans JP",sans-serif}main{max-width:430px;margin:auto;padding:32px 24px}h1{font-size:24px}form{background:white;padding:24px;border-radius:20px}label,fieldset{display:block;margin:0 0 22px}fieldset{border:0;padding:0}input:not([type=radio]),textarea,select{width:100%;box-sizing:border-box;font:inherit;padding:12px;border:1px solid #d6c8c0;border-radius:8px;background:#fff}textarea{min-height:100px}button{font:inherit;padding:12px 16px;border:0;border-radius:10px;background:#bd4c17;color:white;min-height:48px;width:100%}button:disabled{opacity:.5}#back{background:#ede4de;color:#302922;margin-top:12px}#error{color:#a12b16}.hidden,[hidden]{display:none!important}pre{font:inherit;white-space:pre-wrap;overflow-wrap:anywhere}.note{font-size:13px}input[type=radio]{margin:10px 8px 10px 0}</style></head><body><main><h1>結婚式の出欠回答</h1><p>2027年3月7日 · PRIMROSE<br>おひとりずつご回答ください</p><form id="form"><div id="fields"><fieldset><legend>ご出欠（必須）</legend><label><input type="radio" name="attendance" value="出席します" required>出席します</label><label><input type="radio" name="attendance" value="欠席します" required>欠席します</label></fieldset><label>お名前（必須）<input name="name" autocomplete="name" maxlength="100" required></label><label>ふりがな<input name="kana" maxlength="100"></label><fieldset id="meal"><legend>食物アレルギー・食事制限</legend><label>有無（出席者必須）<select name="allergyFlag" required><option value="">選択してください</option><option>なし</option><option>あり</option></select></label><label id="allergyWrap" hidden>詳しい内容（必須）<textarea name="allergy" maxlength="1000" placeholder="食材名・症状・注意点など"></textarea></label><label>岡山駅からのシャトルバス（出席者必須）<select name="shuttle" required><option value="">選択してください</option><option>利用する予定</option><option>利用しない予定</option><option>未定</option></select></label></fieldset><label>ふたりへのメッセージ<textarea name="message" maxlength="1000"></textarea></label><label hidden>Website<input name="website" tabindex="-1" autocomplete="off"></label><p class="note">ご回答は結婚式の準備とお食事・送迎の手配に使用し、新郎新婦が管理します。アレルギーについて必要な範囲で式場へお伝えします。</p></div><div id="review" hidden><h2>回答内容の確認</h2><pre id="details"></pre></div><p id="error" role="alert"></p><button id="send" type="submit">回答内容を確認する</button><button id="back" type="button" hidden>修正する</button></form><div id="success" role="status" tabindex="-1" hidden><h2>ご回答ありがとうございました</h2><p>回答を受け付けました。<br>受付番号：<strong id="receipt"></strong></p><p>招待状の画面へお戻りください。</p><button id="change" type="button">回答を変更する</button></div><script>const cfg=' + config + ';const f=document.getElementById("form"),fields=document.getElementById("fields"),review=document.getElementById("review"),send=document.getElementById("send"),back=document.getElementById("back"),err=document.getElementById("error"),success=document.getElementById("success");let ready=false,busy=false,payload=null;function sync(){const absent=f.elements.attendance.value==="欠席します";document.getElementById("meal").hidden=absent;["allergyFlag","shuttle"].forEach(k=>{f.elements[k].disabled=absent;f.elements[k].required=!absent});const detail=!absent&&f.elements.allergyFlag.value==="あり";document.getElementById("allergyWrap").hidden=!detail;f.elements.allergy.disabled=!detail;f.elements.allergy.required=detail}f.addEventListener("change",sync);sync();back.onclick=()=>{if(busy)return;ready=false;payload=null;review.hidden=true;fields.hidden=false;back.hidden=true;send.textContent="回答内容を確認する"};f.onsubmit=event=>{event.preventDefault();if(busy)return;if(!ready){sync();if(!f.reportValidity())return;payload=Object.fromEntries(new FormData(f));payload.responseId=cfg.responseId;payload.requestId=crypto.randomUUID();payload.eventKey=cfg.eventKey;payload.design="direct";document.getElementById("details").textContent=["ご出欠："+payload.attendance,"お名前："+payload.name,"ふりがな："+(payload.kana||"未入力"),"アレルギー："+(payload.allergyFlag==="あり"?payload.allergy:payload.attendance==="欠席します"?"対象外":"なし"),"シャトル："+(payload.shuttle||"対象外"),"メッセージ："+(payload.message||"未入力")].join("\\n");fields.hidden=true;review.hidden=false;back.hidden=false;ready=true;send.textContent="この内容で送信";return}busy=true;send.disabled=true;back.disabled=true;send.textContent="送信しています…";err.textContent="";google.script.run.withSuccessHandler(result=>{busy=false;send.disabled=false;back.disabled=false;send.textContent="この内容で送信";if(result&&result.ok){f.hidden=true;success.hidden=false;document.getElementById("receipt").textContent=result.receipt;success.focus()}else{err.textContent=result&&result.message||"保存を確認できませんでした。同じ内容で再送してください。"}}).withFailureHandler(()=>{busy=false;send.disabled=false;back.disabled=false;send.textContent="もう一度送信";err.textContent="保存を確認できませんでした。同じ内容で再送してください。"}).submitRsvp(payload)};document.getElementById("change").onclick=()=>{success.hidden=true;f.hidden=false;back.click()};</script></main></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle('結婚式の出欠回答');
}
