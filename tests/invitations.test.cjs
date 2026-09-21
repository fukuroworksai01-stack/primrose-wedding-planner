const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const designs = {balloon:'', garden:'reference/', botanical:'botanical/', letter:'letter/', story:'story/', rose:'rose/', celestial:'celestial/', japonica:'japonica/', champagne:'champagne/'};
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('9つのプレビューはJavaScriptが動く前も送信不可モードで開く', () => {
  const html = read('showcase/index.html');
  const links = [...html.matchAll(/class="sample-link invite-link" data-route="([^"]+)" href="([^"]+)"/g)];
  assert.equal(links.length, 9);
  assert.equal(new Set(links.map(match => match[1])).size, 9);
  for (const match of links) assert.equal(new URL(match[2], 'https://example.test/showcase/').searchParams.get('preview'), '1');
});

test('9つの招待状は同じ必要情報と操作、個別のテーマを持つ', () => {
  for (const [design, directory] of Object.entries(designs)) {
    const html = read('invite/' + directory + 'index.html');
    assert.match(html, new RegExp('data-design="' + design + '"'));
    for (const id of ['message', 'details', 'rsvp']) assert.ok(html.includes('id="' + id + '"'));
    assert.match(html, /class="motion-toggle".*aria-pressed="false"/);
    assert.match(html, /class="guest-nav".*hidden/);
    assert.match(html, /motion\.js\?v=9/);
    assert.match(html, /<noscript>/);
    assert.equal((html.match(/<h1 /g) || []).length, 1);
    assert.ok(!html.includes('<iframe'));
    const base = path.join(root, 'invite', directory);
    for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
      const asset = match[1].split(/[?#]/)[0];
      if (!asset || /^https?:/.test(asset)) continue;
      assert.ok(fs.existsSync(path.resolve(base, asset)), design + ': missing ' + asset);
    }
  }
});

test('すべてのCSS装飾画像が存在し、モーション低減と印刷時も本文を表示する', () => {
  for (const file of ['invite/authentic.css', 'showcase/gallery.css']) {
    const css = read(file);
    for (const match of css.matchAll(/url\("([^"]+)"\)/g)) {
      assert.ok(fs.existsSync(path.resolve(root, path.dirname(file), match[1])), match[1]);
    }
    assert.match(css, /prefers-reduced-motion:reduce/);
  }
  assert.match(read('invite/authentic.css'), /\.reveal\.is-ready\{opacity:1;transform:none\}/);
  assert.doesNotThrow(() => new vm.Script(read('invite/motion.js')));
  assert.doesNotThrow(() => new vm.Script(read('invite/variants.js')));
});

test('動きを減らす設定ではスクロール表示待ちにしない', () => {
  let observed = 0;
  const classes = {add(){ throw new Error('content must stay visible'); }, remove(){}};
  const context = vm.createContext({
    window: {matchMedia: () => ({matches:true, addEventListener(){}})},
    document: {body:{classList:classes}, querySelector:()=>null, querySelectorAll:()=>[{classList:classes}], addEventListener(){}},
    IntersectionObserver: class { constructor(){ observed++; } observe(){} }
  });
  vm.runInContext(read('invite/motion.js'), context);
  assert.equal(observed, 0);
});
