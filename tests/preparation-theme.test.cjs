const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(__dirname, '../preparation-home.css'), 'utf8');
const token = name => {
  const match = css.match(new RegExp('--' + name + ':\\s*(#[a-f\\d]{6})', 'i'));
  assert.ok(match, '色の定義が存在する: ' + name);
  return match[1];
};
function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map(value => {
    const channel = parseInt(value, 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
function assertReadable(foreground, background, label) {
  const a = luminance(foreground); const b = luminance(background);
  const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  assert.ok(ratio >= 4.5, `${label}: ${ratio.toFixed(2)}:1`);
}

test('本文・補助文と操作ボタンは4.5:1以上のコントラストを持つ', () => {
  for (const name of ['prep-plum', 'prep-rose']) assertReadable('#ffffff', token(name), name + ' / button');
  for (const name of ['prep-ink', 'prep-muted', 'prep-rose']) {
    assertReadable(token(name), token('prep-canvas'), name + ' / canvas');
    assertReadable(token(name), token('prep-paper'), name + ' / paper');
  }
});

test('3種類の準備項目の番号はどの配色でも読める', () => {
  const colors = [...css.matchAll(/--action-color:\s*(#[a-f\d]{6});\s*--action-tint:\s*(#[a-f\d]{6})/gi)];
  assert.equal(colors.length, 3);
  colors.forEach(([, foreground, background], index) => {
    assertReadable('#ffffff', foreground, `準備${index + 1}の番号`);
  });
});

test('予定欄は印刷時に白地と黒文字へそろえる', () => {
  const print = css.slice(css.indexOf('@media print'));
  assert.match(print, /\.ui-ios-modern \.planner-next \{ background: #fff;/);
  assert.match(print, /\.planner-next :is\(h2, \.planner-overline, \.planner-meeting-topic, \.planner-duration\) \{ color: #222;/);
});
