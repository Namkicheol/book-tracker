const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

async function runtime({ invoke, getSession } = {}) {
  let active = 'account-a';
  let owner = active;
  const location = {};
  let onSignOut;
  const calls = [], alerts = [], cleanups = [], signouts = [];
  const button = { disabled: false, textContent: '탈퇴', addEventListener(_, listener) { this.click = listener; } };
  const window = {
    Storage: { getOwner: () => owner, isOwnerCurrent: () => true },
    Sync: { clearCurrentAccount(id) { cleanups.push(id); return true; }, setOwner(id) { owner = id; } },
    SB: {
      enabled: true, getUser: async () => ({ id: active }),
      getSession: async () => getSession ? getSession(active) : ({ user: { id: active }, access_token: 'fixture-' + active }),
      client: { functions: { async invoke(name, options) {
        calls.push({ name, options, active });
        return invoke ? invoke() : { data: { ok: true, deletedUserId: 'account-a' }, error: null };
      } } },
      signOut: async () => {
        signouts.push(active);
        // Model sync.js's deferred SIGNED_OUT callback: changing the owner reloads this page.
        onSignOut = () => { if (owner !== null) { owner = null; location.href = 'settings.html'; } };
      },
    },
  };
  const source = fs.readFileSync('settings.html', 'utf8');
  const start = source.indexOf('(async function initAccount()');
  const end = source.indexOf('})();', start) + 5;
  await vm.runInNewContext(source.slice(start, end), {
    window, document: { getElementById: id => id === 'deleteAccountBtn' ? button : { style: {} } },
    confirm: () => true, alert: value => alerts.push(value), location,
  });
  return { button, calls, alerts, cleanups, signouts, location, flushSignOut() { onSignOut?.(); }, switchAccount(id) { active = id; owner = id; } };
}

test('deletion refuses a settings handler retained from a different account', async () => {
  const app = await runtime();
  app.switchAccount('account-b');
  await app.button.click();
  assert.equal(app.calls.length, 0);
  assert.equal(app.cleanups.length, 0);
  assert.equal(app.signouts.length, 0);
});

test('deletion pins the confirmed account token instead of acquiring a later account token', async () => {
  const app = await runtime();
  await app.button.click();
  assert.equal(app.calls[0].options.headers.Authorization, 'Bearer fixture-account-a');
  assert.deepEqual(app.cleanups, ['account-a']);
  assert.deepEqual(app.signouts, ['account-a']);
});

test('an account switch during session lookup prevents the destructive request', async () => {
  let finish;
  const app = await runtime({ getSession: () => new Promise(resolve => { finish = resolve; }) });
  const pending = app.button.click();
  await new Promise(resolve => setImmediate(resolve));
  app.switchAccount('account-b');
  finish({ user: { id: 'account-a' }, access_token: 'fixture-account-a' });
  await pending;
  assert.equal(app.calls.length, 0);
});

test('switching while deletion is pending never clears or signs out the new account', async () => {
  let finish;
  const app = await runtime({ invoke: () => new Promise(resolve => { finish = resolve; }) });
  const pending = app.button.click();
  await new Promise(resolve => setImmediate(resolve));
  app.switchAccount('account-b');
  finish({ data: { ok: true, deletedUserId: 'account-a' }, error: null });
  await pending;
  assert.equal(app.cleanups.length, 0);
  assert.equal(app.signouts.length, 0);
});

test('repeated clicks produce only one destructive invocation', async () => {
  let finish;
  const app = await runtime({ invoke: () => new Promise(resolve => { finish = resolve; }) });
  const pending = app.button.click();
  await new Promise(resolve => setImmediate(resolve));
  const duplicate = app.button.click();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(app.calls.length, 1);
  finish({ data: { ok: true, deletedUserId: 'account-a' }, error: null });
  await Promise.all([pending, duplicate]);
});

test('a malformed deletion response never clears local data or claims completion', async () => {
  const app = await runtime({ invoke: () => ({ data: { ok: false }, error: null }) });
  await app.button.click();
  assert.equal(app.cleanups.length, 0);
  assert.equal(app.signouts.length, 0);
  assert.ok(app.alerts.every(value => !value.includes('탈퇴가 완료')));
});

test('deferred SIGNED_OUT cannot reload settings over the successful home navigation', async () => {
  const app = await runtime();
  await app.button.click();
  app.flushSignOut();
  assert.equal(app.location.href, 'index.html');
});
