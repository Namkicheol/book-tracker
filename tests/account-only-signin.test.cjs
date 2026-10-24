const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function app({ pullBooks } = {}) {
  const values = new Map(), nodes = new Map(), calls = [];
  let active = 'account-a', owner = active;
  const scopes = { guest: [{ id: 'guest-book' }], 'account-a': [{ id: 'a-book' }], 'account-b': [{ id: 'b-book' }] };
  const outbox = [{ user_id: 'account-a', id: 'a-pending' }, { user_id: 'account-b', id: 'b-pending' }];
  const document = {
    getElementById: id => nodes.get(id) || null, addEventListener() {}, querySelector() { return null; },
    head: { appendChild() {} }, body: { appendChild(el) { if (el.id) nodes.set(el.id, el); } },
    createElement: () => ({ style: {}, dataset: {}, setAttribute() {}, addEventListener(_, fn) { this.click = fn; }, remove() { nodes.delete(this.id); }, querySelector() { return { addEventListener() {} }; } }),
  };
  const window = {
    location: { reload() {} },
    SB: { enabled: true, getSession: async () => ({ user: { id: active } }), getProfile: async id => ({ id, nickname: '별명' }) },
    Storage: {
      getOwner: () => owner, isOwnerCurrent: () => active === owner,
      getAllBooksRaw: id => scopes[id === null ? 'guest' : id || owner] || [], getAllFoldersRaw: () => [],
      getAllBooks: () => scopes[owner] || [], getAllFolders: () => [],
    },
    Sync: {
      setOwner(id) { owner = id; return false; }, syncProfileOnSignIn: async () => ({}),
      pullBooks: async () => { calls.push(['pullBooks', active]); return pullBooks ? pullBooks() : true; },
      pullFolders: async () => { calls.push(['pullFolders', active]); return true; },
      flushOutbox: async () => { outbox.filter(row => row.user_id === active).forEach(row => calls.push(['write', active, row.id])); },
      uploadAll: async () => { calls.push(['forbidden-import']); return { complete: false }; },
    },
  };
  const localStorage = { length: 0, getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  vm.runInNewContext(fs.readFileSync('js/auth-ui.js', 'utf8').replace('  window.AuthUI = {', '  window.testSignIn = handleSignIn;\n  window.AuthUI = {'), { window, document, localStorage, console, setTimeout, alert() {} });
  return { values, nodes, calls, scopes, getOwner: () => owner, runStale: id => window.testSignIn({ id }), async signIn(id = active) { active = id; await window.testSignIn({ id }); }, switchAccount(id) { active = id; owner = id; } };
}

test('repeated sign-in pages never ask to migrate guest or current-account local records', async () => {
  const a = app(); a.values.set('_syncLegacyGuestPending_account-a', '1');
  for (let page = 0; page < 3; page++) await a.signIn();
  assert.equal(a.nodes.has('syncConsentModal'), false);
  assert.equal(a.calls.some(call => call[0] === 'forbidden-import'), false);
  assert.equal(a.values.get('_syncUploaded_account-a'), '1');
  assert.deepEqual(a.scopes.guest, [{ id: 'guest-book' }]);
  assert.deepEqual(a.scopes['account-a'], [{ id: 'a-book' }]);
});

test('Kakao A to Google B hydrates only the selected account and retries only its pending writes', async () => {
  const a = app(); await a.signIn('account-a'); a.calls.length = 0; await a.signIn('account-b');
  assert.equal(a.nodes.has('syncConsentModal'), false);
  assert.deepEqual(a.calls, [['pullBooks', 'account-b'], ['pullFolders', 'account-b'], ['write', 'account-b', 'b-pending']]);
  assert.deepEqual(a.scopes.guest, [{ id: 'guest-book' }]);
  assert.deepEqual(a.scopes['account-a'], [{ id: 'a-book' }]);
  assert.deepEqual(a.scopes['account-b'], [{ id: 'b-book' }]);
});

test('failed hydration does not mark ready or flush writes and offers a visible retry', async () => {
  const a = app({ pullBooks: async () => false }); await a.signIn();
  assert.equal(a.values.has('_syncUploaded_account-a'), false);
  assert.equal(a.calls.some(call => call[0] === 'write'), false);
  assert.ok(a.nodes.has('authSetupRetry'));
  assert.equal(a.nodes.has('syncConsentModal'), false);
});

test('a delayed A hydration cannot mark A ready or flush B after switching accounts', async () => {
  let finish;
  const a = app({ pullBooks: () => new Promise(resolve => { finish = resolve; }) });
  const pending = a.signIn(); await new Promise(resolve => setImmediate(resolve)); a.switchAccount('account-b'); finish(true); await pending;
  assert.equal(a.values.has('_syncUploaded_account-a'), false);
  assert.equal(a.calls.some(call => call[0] === 'write'), false);
});

test('a stale A retry cannot reactivate A storage after the session has switched to B', async () => {
  const a = app(); a.switchAccount('account-b'); await a.runStale('account-a');
  assert.equal(a.getOwner(), 'account-b');
  assert.deepEqual(a.calls, []);
});
