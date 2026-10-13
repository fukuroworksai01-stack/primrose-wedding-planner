const test = require('node:test');
const assert = require('node:assert/strict');
const preparation = require('../preparation-data.js');
const ui = require('../source-updates.js');
const sources = preparation.sourceUpdates;

test('料理の原本価格は税抜・税込を区別し、選択済みにしない', () => {
  assert.deepEqual(sources.cuisine.courses.map(row => [row.beforeTax, row.includingTax]), [
    [10000, 11000], [14000, 15400], [16000, 17600], [18000, 19800], [17000, 18700]
  ]);
  assert.equal(sources.cuisine.additions.length, 11);
  for (const row of [...sources.cuisine.courses, ...sources.cuisine.additions]) {
    assert.equal(row.includingTax, Math.round(row.beforeTax * 1.1));
  }
  assert.match(sources.cuisine.selectionStatus, /決定記載なし/);
});

test('映像注文書の3品は税込274450円で、持ち込み・確認状態を区別する', () => {
  assert.deepEqual(sources.media.orderLines.map(row => row.includingTax), [242000, 7150, 25300]);
  assert.equal(ui.mediaTotal(sources.media), 274450);
  assert.equal(sources.media.openingMovie, '持ち込み');
  assert.equal(sources.media.profileMovie, '持ち込み');
  assert.match(sources.media.sampleStatus, /未確認/);
  assert.match(sources.media.costNote, /全額を追加費用として加算していません/);
});

test('試着日と7点の候補を保存し、記録の印刷時刻を予約時刻にしない', () => {
  assert.equal(sources.attire.fittingDate, '2026-10-12');
  assert.deepEqual(sources.attire.items.map(row => [row.number, row.price]), [
    ['W6033', 270000], ['W6066', 320000], ['W8030', 360000], ['W1109', 360000],
    ['W1111', 400000], ['W1210', 360000], ['BRM4014', 320000]
  ]);
  const event = preparation.tasks.find(task => task.id === 'pdf-october-fitting');
  assert.equal(event.dueDate, '2026-10-12'); assert.equal(event.dueTime, '');
  assert.match(sources.attire.selectionStatus, /最終選択の記載なし/);
  assert.match(sources.attire.note, /税込・税抜の区分は資料に記載がありません/);
  for (const id of ['pdf-media-assets', 'pdf-media-bgm']) {
    assert.equal(preparation.tasks.find(task => task.id === id).dueDate, '');
  }
});

test('追加資料は公開用の要点と権限付き原本リンクだけを表示する', () => {
  const doc = { createElement: tagName => ({
    tagName, children: [], attributes: {}, dataset: {}, textContent: '',
    append(...nodes) { this.children.push(...nodes); },
    replaceChildren(...nodes) { this.children = [...nodes]; },
    setAttribute(key, value) { this.attributes[key] = value; }
  }) };
  const root = doc.createElement('div'); root.dataset.sourceUpdates = 'cuisine media attire';
  ui.render(root, preparation, doc);
  function descendants(node) { return [node, ...node.children.flatMap(descendants)]; }
  const all = descendants(root);
  const text = all.map(node => node.textContent).join('\n');
  const links = all.filter(node => node.tagName === 'a');
  assert.equal(root.children.length, 3);
  assert.equal(links.length, 3);
  assert.ok(links.every(link => /^https:\/\/drive\.google\.com\/file\/d\/[A-Za-z0-9_-]+\/view$/.test(link.href)));
  assert.match(text, /274,450円/);
  assert.ok(!/06911561|39448|谷山|三宗/.test(text));
  assert.ok(!all.some(node => node.tagName === 'img' || node.tagName === 'iframe'));
  root.dataset.sourceUpdates = 'media'; ui.render(root, preparation, doc);
  assert.equal(root.children.length, 1);
});
