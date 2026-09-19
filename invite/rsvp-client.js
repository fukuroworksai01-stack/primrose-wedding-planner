(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root.document) {
    const start = () => {
      if (api.isPreviewMode(root.location?.search || '')) api.addPreviewNavigation(root.document);
      root.document.querySelectorAll('[data-rsvp-widget]').forEach((mount, index) => api.mount(mount, root.WEDDING_RSVP_CONFIG || {}, index));
    };
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
  }
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  function validEndpoint(value) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && url.hostname === 'script.google.com' && /^\/macros\/s\/[\w-]+\/exec$/.test(url.pathname) && !url.search && !url.hash && !url.username && !url.password ? url.href : '';
    } catch { return ''; }
  }
  function trustedOrigin(origin) {
    try {
      const url = new URL(origin);
      return url.protocol === 'https:' && (url.hostname === 'script.google.com' || /(^|\.)googleusercontent\.com$/.test(url.hostname)) && url.origin === origin;
    } catch { return false; }
  }
  function acceptedMessage(event, requestId) {
    const data = event && event.data;
    return !!requestId && trustedOrigin(event.origin) && data && data.type === 'wedding-rsvp-result' && data.requestId === requestId && typeof data.ok === 'boolean' && (data.ok === false || /^[0-9A-F]{8}$/.test(data.receipt));
  }
  function isPreviewMode(search) {
    return new URLSearchParams(search).get('preview') === '1';
  }
  function addPreviewNavigation(doc) {
    if (doc.querySelector('.rsvp-preview-nav')) return;
    const source = [...doc.scripts].find(script => /\/rsvp-client\.js(?:\?|$)/.test(script.src));
    if (!source) return;
    const nav = doc.createElement('nav');
    nav.className = 'rsvp-preview-nav';
    nav.dataset.design = doc.querySelector('[data-rsvp-widget]')?.dataset.design || '';
    nav.setAttribute('aria-label', '招待状プレビューの操作');
    const back = doc.createElement('a');
    back.href = new URL('../showcase/#invitations', source.src).href;
    back.textContent = '← デザイン一覧へ戻る';
    const note = doc.createElement('span');
    note.textContent = 'プレビュー・送信なし';
    nav.append(back, note);
    doc.body.classList.add('rsvp-preview-mode');
    doc.body.prepend(nav);
  }
  function normaliseFields(source) {
    const get = key => String(source[key] || '').replace(/\r\n?/g, '\n').trim();
    const attendance = get('attendance');
    const attending = attendance === '出席します';
    return {
      attendance, name: get('name'), kana: get('kana'),
      allergyFlag: attending ? get('allergyFlag') : '対象外',
      allergy: attending ? get('allergyFlag') === 'あり' ? get('allergy') : 'なし' : '対象外',
      shuttle: attending ? get('shuttle') : '対象外', message: get('message'), website: get('website')
    };
  }
  function uuid() {
    if (globalThis.crypto.randomUUID) return globalThis.crypto.randomUUID();
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
    const hex = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
    return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
  }
  function mount(element, config, index) {
    const endpoint = validEndpoint(config.endpoint);
    const preview = isPreviewMode(globalThis.location?.search || '');
    const prefix = 'rsvp-' + index;
    const input = (key, title, attributes, hint) => '<div class="rsvp-field"><label class="rsvp-label" for="' + prefix + '-' + key + '">' + title + '</label><input class="rsvp-input" id="' + prefix + '-' + key + '" name="' + key + '" ' + attributes + '>' + (hint ? '<small class="rsvp-hint">' + hint + '</small>' : '') + '</div>';
    const required = '<span class="rsvp-required">必須</span>';
    element.classList.add('rsvp-widget');
    // ここに挿入するHTMLは固定文のみ。入力内容・URLパラメーターはtextContent/valueで扱う。
    element.innerHTML = '<form data-role="form" class="rsvp-panel" novalidate>' +
      '<div data-role="fields" tabindex="-1">' +
      '<fieldset class="rsvp-field"><legend>ご出欠' + required + '</legend><div class="rsvp-choices"><label class="rsvp-choice"><input type="radio" name="attendance" value="出席します" required><span>出席します</span></label><label class="rsvp-choice"><input type="radio" name="attendance" value="欠席します" required><span>欠席します</span></label></div></fieldset>' +
      input('name', 'お名前' + required, 'autocomplete="name" maxlength="100" placeholder="例）山田 花子" required', 'おひとりずつご回答ください') +
      input('kana', 'ふりがな', 'maxlength="100" placeholder="例）やまだ はなこ"', '') +
      '<div data-role="attending"><fieldset class="rsvp-field"><legend>食物アレルギー・食事制限' + required + '</legend><div class="rsvp-choices"><label class="rsvp-choice"><input type="radio" name="allergyFlag" value="なし" required><span>なし</span></label><label class="rsvp-choice"><input type="radio" name="allergyFlag" value="あり" required><span>あり</span></label></div><div data-role="allergy-detail" hidden><label class="rsvp-label" for="' + prefix + '-allergy" style="margin-top:16px">詳しい内容' + required + '</label><textarea class="rsvp-input" id="' + prefix + '-allergy" name="allergy" maxlength="1000" placeholder="食材名・症状・注意点など"></textarea><small class="rsvp-hint">対応について、必要に応じて個別に確認させていただきます</small></div></fieldset>' +
      '<fieldset class="rsvp-field"><legend>岡山駅からのシャトルバス' + required + '</legend><div class="rsvp-choices stack"><label class="rsvp-choice"><input type="radio" name="shuttle" value="利用する予定" required><span>利用する予定</span></label><label class="rsvp-choice"><input type="radio" name="shuttle" value="利用しない予定" required><span>利用しない予定</span></label><label class="rsvp-choice"><input type="radio" name="shuttle" value="未定" required><span>未定</span></label></div></fieldset></div>' +
      '<div class="rsvp-field"><label class="rsvp-label" for="' + prefix + '-message">ふたりへのメッセージ</label><textarea class="rsvp-input" id="' + prefix + '-message" name="message" maxlength="1000" placeholder="任意でご入力ください"></textarea></div>' +
      '<label class="rsvp-honeypot" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label>' +
      '<p class="rsvp-privacy">ご回答は結婚式の準備とお食事・送迎の手配に使用し、新郎新婦が管理します。アレルギーについて必要な範囲で式場へお伝えします。</p>' +
      '<button class="rsvp-action" type="submit" data-role="review-button">回答内容を確認する</button></div>' +
      '<div data-role="review" tabindex="-1" hidden><h3 class="rsvp-review-title">回答内容の確認</h3><dl class="rsvp-review-list"><div><dt>ご出欠</dt><dd data-review="attendance"></dd></div><div><dt>お名前</dt><dd data-review="name"></dd></div><div><dt>ふりがな</dt><dd data-review="kana"></dd></div><div><dt>アレルギー</dt><dd data-review="allergy"></dd></div><div><dt>シャトルバス</dt><dd data-review="shuttle"></dd></div><div><dt>メッセージ</dt><dd data-review="message"></dd></div></dl><div class="rsvp-actions"><button class="rsvp-action" type="submit" data-role="send">この内容で送信</button><button class="rsvp-action secondary" type="button" data-role="edit">修正する</button></div></div></form>' +
      '<p class="rsvp-feedback" data-role="feedback" role="alert" tabindex="-1" hidden></p>' +
      '<div class="rsvp-panel rsvp-success" data-role="success" role="status" tabindex="-1" hidden><h3 class="rsvp-success-title">ご回答ありがとうございました</h3><p>回答を受け付けました。</p><p>受付番号<strong class="rsvp-receipt" data-role="receipt"></strong></p><div class="rsvp-actions"><button class="rsvp-action secondary" type="button" data-role="change">回答を変更する</button><button class="rsvp-action secondary" type="button" data-role="another">別の方の回答をする</button></div></div>' +
      '<a class="rsvp-fallback" data-role="fallback" target="_blank" rel="noopener noreferrer" hidden>送信できない場合は別の画面で回答する</a>';
    const q = role => element.querySelector('[data-role="' + role + '"]');
    const form = q('form'), fields = q('fields'), review = q('review'), success = q('success');
    const send = q('send'), edit = q('edit'), feedback = q('feedback');
    let responseId = uuid(), payload = null, pendingId = '', timer = 0, controller = null, busy = false;
    const fallback = () => { if (!preview && endpoint) { const url = new URL(endpoint); url.searchParams.set('response', responseId); q('fallback').href = url.href; q('fallback').hidden = false; } };
    const focus = panel => { panel.focus({ preventScroll: true }); panel.scrollIntoView({ behavior: globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' }); };
    const message = text => { feedback.textContent = text; feedback.hidden = !text; };
    const status = sending => { busy = sending; send.disabled = sending || preview || !endpoint; edit.disabled = sending; form.setAttribute('aria-busy', String(sending)); send.textContent = preview ? 'プレビューでは送信できません' : sending ? '送信しています…' : 'この内容で送信'; };
    const stop = () => { clearTimeout(timer); pendingId = ''; status(false); };
    function syncConditional() {
      const absent = form.elements.attendance.value === '欠席します';
      q('attending').hidden = absent;
      ['allergyFlag', 'shuttle'].forEach(key => [...form.querySelectorAll('[name="' + key + '"]')].forEach(control => { control.disabled = absent; control.required = !absent; }));
      const detail = !absent && form.elements.allergyFlag.value === 'あり';
      q('allergy-detail').hidden = !detail;
      form.elements.allergy.disabled = !detail; form.elements.allergy.required = detail;
    }
    function showFields() {
      if (busy) return;
      stop(); payload = null; message(''); form.hidden = false; success.hidden = true; review.hidden = true; fields.hidden = false; focus(fields);
    }
    function showReview() {
      syncConditional();
      form.elements.name.value = form.elements.name.value.trim();
      form.elements.allergy.value = form.elements.allergy.value.trim();
      if (!form.reportValidity()) return;
      const data = normaliseFields(Object.fromEntries(new FormData(form)));
      payload = Object.freeze({ ...data, responseId, requestId: uuid(), eventKey: config.eventKey, replyOrigin: location.origin, design: element.dataset.design || 'direct' });
      element.querySelectorAll('[data-review]').forEach(item => { item.textContent = data[item.dataset.review] || '未入力'; });
      fields.hidden = true; review.hidden = false; message(''); focus(review);
      if (preview) message('プレビュー中のため、回答は送信されません。');
      else if (!endpoint) message('現在、出欠回答の受付準備中です。');
    }
    function receive(data, origin) {
      if (!acceptedMessage({ data, origin }, pendingId)) return false;
      stop();
      if (!data.ok) { message(data.message || '保存を確認できませんでした。もう一度送信してください。'); focus(feedback); return true; }
      form.hidden = true; success.hidden = false; message(''); q('receipt').textContent = data.receipt; focus(success);
      return true;
    }
    async function submit() {
      if (busy || preview || !payload || !endpoint) return;
      pendingId = payload.requestId; status(true); message('');
      const currentId = pendingId;
      controller = new AbortController();
      const currentController = controller;
      const fail = () => {
        if (pendingId !== currentId) return;
        stop(); message('保存されたか確認できませんでした。内容を変えずにもう一度送信できます。うまくいかない場合は、下のリンクからご回答ください。'); focus(feedback);
      };
      timer = setTimeout(() => { currentController.abort(); fail(); }, Math.min(60000, Math.max(10000, Number(config.timeoutMs) || 35000)));
      try {
        // URLSearchParamsはプリフライト不要。匿名送信なのでGoogleのCookieを送らない。
        const response = await fetch(endpoint, { method: 'POST', mode: 'cors', credentials: 'omit', redirect: 'follow', body: new URLSearchParams({ ...payload, transport: 'json' }), signal: currentController.signal });
        const data = await response.json();
        if (pendingId !== currentId) return;
        if (!response.ok || !receive(data, new URL(response.url).origin)) fail();
      } catch { fail(); }
    }
    form.addEventListener('change', syncConditional);
    form.addEventListener('submit', event => { event.preventDefault(); if (busy) return; if (review.hidden) showReview(); else submit(); });
    edit.addEventListener('click', showFields);
    q('change').addEventListener('click', showFields);
    q('another').addEventListener('click', () => { responseId = uuid(); form.reset(); syncConditional(); fallback(); showFields(); });
    globalThis.addEventListener('beforeunload', event => { if (busy) { event.preventDefault(); event.returnValue = ''; } });
    status(false); syncConditional(); fallback();
    if (preview) message('プレビュー中のため、回答は送信されません。');
    else if (!endpoint) message('現在、出欠回答の受付準備中です。');
  }
  return { mount, validEndpoint, trustedOrigin, acceptedMessage, normaliseFields, isPreviewMode, addPreviewNavigation };
});
