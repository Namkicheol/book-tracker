const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function runtime(fail = false, confirmed = true) {
  const button = { addEventListener(_, fn) { this.click = fn; } }, alerts = [], location = {};
  let cleared = 0;
  const full = fs.readFileSync('settings.html', 'utf8');
  const source = full.slice(full.indexOf('      const clearBtn ='), full.indexOf('      // ── 회원 탈퇴'));
  vm.runInNewContext(source, { document: { getElementById: () => button }, localStorage: { clear() { if (fail) throw new Error('SecurityError'); cleared++; } }, confirm: () => confirmed, alert: text => alerts.push(text), location });
  return { button, alerts, location, get cleared() { return cleared; } };
}
test('failed local clear stays on settings and reports failure', () => {
  const app = runtime(true); app.button.click();
  assert.equal(app.location.href, undefined);
  assert.equal(app.alerts.length, 1);
  assert.match(app.alerts[0], /삭제하지 못/);
});
test('successful local clear reports completion and returns home', () => {
  const app = runtime(); app.button.click(); assert.equal(app.cleared, 1); assert.equal(app.location.href, 'index.html'); assert.match(app.alerts[0], /삭제했어요/);
});
test('cancelled local clear keeps all local data', () => {
  const app = runtime(false, false); app.button.click(); assert.equal(app.cleared, 0); assert.equal(app.alerts.length, 0);
});
