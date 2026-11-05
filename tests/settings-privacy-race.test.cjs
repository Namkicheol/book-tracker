const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function runtime() {
  let finishLookup, failLookup;
  const writes = [];
  const select = { value: '', disabled: false, addEventListener(_, listener) { this.change = listener; } };
  const warning = { style: {} };
  const window = {
    Storage: { getOwner: () => 'account-a', isOwnerCurrent: () => true },
    SB: { enabled: true, getUser: async () => ({ id: 'account-a' }),
      getProfile: () => new Promise((resolve, reject) => { finishLookup = resolve; failLookup = reject; }),
      upsertProfile: async data => ({ id: 'account-a', ...data }) },
    Sync: { writeLocalProfile: row => writes.push(row.library_public) }, dispatchEvent() {},
  };
  const source = fs.readFileSync('settings.html', 'utf8');
  const start = source.indexOf("const privacySel =");
  const end = source.indexOf("const clearBtn =", start);
  vm.runInNewContext(source.slice(start, end), { window,
    document: { getElementById: id => id === 'privacySelect' ? select : warning },
    localStorage: { getItem: () => 'true' }, Event: class {}, location: { reload() {} }, alert() {},
  });
  return { select, warning, writes, finishLookup, failLookup };
}

test('late initial profile lookup cannot undo a confirmed visibility change', async () => {
  const app = runtime();
  app.select.value = 'private';
  await app.select.change();
  app.finishLookup({ id: 'account-a', library_public: true });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(app.writes, [false]);
  assert.equal(app.select.value, 'private');
  assert.equal(app.warning.style.display, 'block');
});

test('initial lookup still restores server visibility before any user edit', async () => {
  const app = runtime();
  app.finishLookup({ id: 'account-a', library_public: false });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(app.writes, [false]);
  assert.equal(app.select.value, 'private');
});

test('late initial lookup failure cannot replace a confirmed privacy result with an error', async () => {
  const app = runtime();
  app.select.value = 'private';
  await app.select.change();
  app.failLookup(new Error('offline'));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(app.warning.textContent, undefined);
  assert.deepEqual(app.writes, [false]);
});
