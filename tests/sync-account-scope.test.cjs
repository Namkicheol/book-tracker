const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const read = name => fs.readFileSync('js/' + name, 'utf8');

function localStore(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {
    get length() { return values.size; },
    key(index) { return Array.from(values.keys())[index] ?? null; },
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(String(key), String(value)); },
    removeItem(key) { values.delete(key); },
    clear() { values.clear(); },
  };
}

function loadStorage(localStorage, window = {}) {
  vm.runInNewContext(read('storage.js'), { window, localStorage, console, Date, Math });
  return window.Storage;
}

function syncRuntime({ user = null, getUser, select, upsert, localStorage = localStore() } = {}) {
  const window = { addEventListener() {}, location: { reload() {} } };
  const client = {
    from(table) {
      return {
        select() {
          const query = { eq: (_column, ownerId) => select ? select(table, ownerId) : { data: [], error: null } };
          return query;
        },
        upsert(rows) { return upsert ? upsert(table, rows) : Promise.resolve({ error: null }); },
      };
    },
  };
  window.SB = { enabled: true, getUser: getUser || (async () => user), client };
  window.Storage = loadStorage(localStorage);
  vm.runInNewContext(read('sync.js'), { window, localStorage, console, Date, Map, JSON });
  return { window, localStorage, client };
}

test('active owner survives reload and account, guest, profile, and garden data stay separate', () => {
  const localStorage = localStore({
    'bookTracker.books.v1': JSON.stringify([{ id: 'legacy', title: 'guest book' }]),
    profileName: 'Guest',
    'bookTracker.garden.v1': 'flower',
    'bookTracker.garden.watered.v1': JSON.stringify(['isbn:guest']),
    'bookTracker.garden.trees.v1': JSON.stringify(['flower']),
    'bookTracker.garden.collection.v1': JSON.stringify(['clover']),
  });
  let Storage = loadStorage(localStorage);
  assert.equal(Storage.getOwner(), null);
  assert.equal(Storage.setOwner('account-a'), true);
  assert.deepEqual(JSON.parse(JSON.stringify(Storage.getAllBooksRaw())), []);
  assert.equal(localStorage.getItem('profileName'), null);
  assert.deepEqual(JSON.parse(JSON.stringify(Storage.getAllBooksRaw(null))), [{ id: 'legacy', title: 'guest book' }]);

  localStorage.setItem('bookTracker.books.v1', JSON.stringify([{ id: 'a-book', title: 'A book' }]));
  localStorage.setItem('profileName', 'A');
  localStorage.setItem('bookTracker.garden.v1', 'forest');
  localStorage.setItem('bookTracker.garden.watered.v1', JSON.stringify(['isbn:a']));
  localStorage.setItem('bookTracker.garden.trees.v1', JSON.stringify(['forest']));
  localStorage.setItem('bookTracker.garden.collection.v1', JSON.stringify(['rabbit','bird']));

  // A fresh page load must recognize that the base keys still belong to A.
  Storage = loadStorage(localStorage);
  assert.equal(Storage.getOwner(), 'account-a');
  assert.equal(Storage.getAllBooksRaw()[0].id, 'a-book');
  assert.equal(localStorage.getItem('profileName'), 'A');

  Storage.setOwner('account-b');
  assert.deepEqual(JSON.parse(JSON.stringify(Storage.getAllBooksRaw())), []);
  assert.equal(localStorage.getItem('profileName'), null);
  assert.equal(localStorage.getItem('bookTracker.garden.collection.v1'),null);
  localStorage.setItem('bookTracker.books.v1', JSON.stringify([{ id: 'b-book', title: 'B book' }]));
  localStorage.setItem('profileName', 'B');
  localStorage.setItem('bookTracker.garden.v1', 'fruit');
  localStorage.setItem('bookTracker.garden.collection.v1', JSON.stringify(['flowers']));

  Storage.setOwner('account-a');
  assert.equal(Storage.getAllBooksRaw()[0].id, 'a-book');
  assert.equal(localStorage.getItem('profileName'), 'A');
  assert.equal(localStorage.getItem('bookTracker.garden.v1'), 'forest');
  assert.deepEqual(JSON.parse(localStorage.getItem('bookTracker.garden.watered.v1')), ['isbn:a']);
  assert.deepEqual(JSON.parse(localStorage.getItem('bookTracker.garden.trees.v1')), ['forest']);
  assert.deepEqual(JSON.parse(localStorage.getItem('bookTracker.garden.collection.v1')), ['rabbit','bird']);

  Storage.setOwner('account-b');
  assert.equal(Storage.getAllBooksRaw()[0].id, 'b-book');
  assert.equal(localStorage.getItem('profileName'), 'B');
  assert.deepEqual(JSON.parse(localStorage.getItem('bookTracker.garden.collection.v1')), ['flowers']);
  Storage.setOwner(null);
  assert.equal(Storage.getAllBooksRaw()[0].id, 'legacy');
  assert.equal(localStorage.getItem('profileName'), 'Guest');
  assert.equal(localStorage.getItem('bookTracker.garden.v1'), 'flower');
  assert.deepEqual(JSON.parse(localStorage.getItem('bookTracker.garden.collection.v1')), ['clover']);
});

test('pending pull from account A cannot write after switching the active scope to B', async () => {
  let user = { id: 'account-a' };
  let finishPull;
  const runtime = syncRuntime({
    get user() { return user; },
    select: (table, ownerId) => table === 'books' && ownerId === 'account-a'
      ? new Promise(resolve => { finishPull = resolve; })
      : Promise.resolve({ data: [], error: null }),
  });
  // syncRuntime takes a snapshot of the options object, so make getUser dynamic.
  runtime.window.SB.getUser = async () => user;
  runtime.window.Sync.setOwner('account-a');
  const pending = runtime.window.Sync.pullBooks();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(typeof finishPull, 'function');

  user = { id: 'account-b' };
  runtime.window.Sync.setOwner('account-b');
  finishPull({ data: [{ id: 'from-a', title: 'A remote', updated_at: '2026-10-20T00:00:00Z' }], error: null });
  assert.equal(await pending, false);
  assert.deepEqual(JSON.parse(JSON.stringify(runtime.window.Storage.getAllBooksRaw())), []);
  runtime.window.Sync.setOwner('account-a');
  assert.deepEqual(JSON.parse(JSON.stringify(runtime.window.Storage.getAllBooksRaw())), []);
});

test('a write waiting for auth cannot cross into the account that becomes active next', async () => {
  let resolveUser;
  const calls = [];
  const runtime = syncRuntime({
    getUser: () => new Promise(resolve => { resolveUser = resolve; }),
    upsert: async (table, row) => { calls.push({ table, row }); return { error: null }; },
  });
  runtime.window.Sync.setOwner('account-a');
  runtime.localStorage.setItem('_syncUploaded_account-a', '1');
  const pending = runtime.window.Sync.pushBook({ id: 'a-book', title: 'A book' });
  await new Promise(resolve => setImmediate(resolve));
  runtime.window.Sync.setOwner('account-b');
  resolveUser({ id: 'account-b' });
  await pending;
  assert.deepEqual(calls, []);
  assert.deepEqual(JSON.parse(JSON.stringify(runtime.window.Storage.getAllBooksRaw())), []);
});

test('stale tabs refuse reads and writes after another tab changes the active owner marker', async () => {
  const sharedStore = localStore();
  const first = syncRuntime({
    getUser: async () => ({ id: 'account-a' }),
    upsert: async () => { throw new Error('must not call'); },
    localStorage: sharedStore,
  });
  first.window.Sync.setOwner('account-a');
  sharedStore.setItem('bookTracker.books.v1', JSON.stringify([{ id: 'a-book', title: 'A book' }]));

  const secondStorage = loadStorage(sharedStore);
  secondStorage.setOwner('account-b');
  sharedStore.setItem('bookTracker.books.v1', JSON.stringify([{ id: 'b-book', title: 'B book' }]));

  assert.equal(first.window.Storage.isOwnerCurrent(), false);
  assert.deepEqual(JSON.parse(JSON.stringify(first.window.Storage.getAllBooksRaw())), []);
  assert.equal(first.window.Storage.saveBook({ id: 'stale', title: 'stale write' }), null);
  await first.window.Sync.pushBook({ id: 'a-book', title: 'A book' });
  assert.equal(secondStorage.getAllBooksRaw()[0].id, 'b-book');

  assert.equal(first.window.Sync.setOwner('account-b'), true);
  assert.equal(first.window.Storage.getOwner(), 'account-b');
  assert.equal(first.window.Storage.getAllBooksRaw()[0].id, 'b-book');
});

test('outbox retry only writes to the account that owns the queued operation', async () => {
  let user = { id: 'account-a' };
  let fail = true;
  const calls = [];
  const runtime = syncRuntime({
    upsert: async (table, row) => {
      calls.push({ table, row });
      return { error: fail ? { message: 'offline' } : null };
    },
  });
  runtime.window.SB.getUser = async () => user;
  runtime.window.Sync.setOwner('account-a');
  runtime.localStorage.setItem('_syncUploaded_account-a', '1');
  await runtime.window.Sync.pushBook({ id: 'a-book', title: 'A book', updatedAt: '2026-10-20T00:00:00Z' });
  const queued = JSON.parse(runtime.localStorage.getItem('sync.outbox.v1'));
  assert.equal(queued.length, 1);
  assert.equal(queued[0].user_id, 'account-a');
  assert.equal(calls[0].row.user_id, 'account-a');

  calls.length = 0;
  user = { id: 'account-b' };
  runtime.window.Sync.setOwner('account-b');
  await runtime.window.Sync.flushOutbox();
  assert.deepEqual(calls, []);
  assert.equal(JSON.parse(runtime.localStorage.getItem('sync.outbox.v1')).length, 1);

  user = { id: 'account-a' };
  runtime.window.Sync.setOwner('account-a');
  fail = false;
  await runtime.window.Sync.flushOutbox();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].row.user_id, 'account-a');
  assert.deepEqual(JSON.parse(runtime.localStorage.getItem('sync.outbox.v1')), []);

  runtime.window.SB.getUser = async () => ({ id: 'account-a' });
  runtime.window.Sync.setOwner('account-a');
  runtime.client.from = () => ({ upsert: async () => { throw new Error('network unavailable'); } });
  await runtime.window.Sync.pushFolder({ id: 'a-folder', name: 'A folder' });
  const afterNetworkFailure = JSON.parse(runtime.localStorage.getItem('sync.outbox.v1'));
  assert.equal(afterNetworkFailure.length, 1);
  assert.equal(afterNetworkFailure[0].user_id, 'account-a');
  assert.equal(afterNetworkFailure[0].type, 'folder');

  runtime.window.SB.getUser = async () => null;
  await runtime.window.Sync.pushBook({ id: 'offline-book', title: 'Offline book' });
  const afterAuthLookupFailure = JSON.parse(runtime.localStorage.getItem('sync.outbox.v1'));
  assert.ok(afterAuthLookupFailure.some(item => item.data.id === 'offline-book' && item.user_id === 'account-a'));
});

test('a late success cannot remove a newer failed edit from the outbox', async () => {
  let resolveOldWrite;
  let writeCount = 0;
  const runtime = syncRuntime({
    getUser: async () => ({ id: 'account-a' }),
    upsert: async () => {
      writeCount++;
      if (writeCount === 1) return new Promise(resolve => { resolveOldWrite = resolve; });
      return { error: { message: 'newer edit failed' } };
    },
  });
  runtime.window.Sync.setOwner('account-a');
  runtime.localStorage.setItem('_syncUploaded_account-a', '1');

  const oldWrite = runtime.window.Sync.pushBook({ id: 'same', title: 'Old', updatedAt: '2026-10-20T00:00:00Z' });
  await new Promise(resolve => setImmediate(resolve));
  const newWrite = runtime.window.Sync.pushBook({ id: 'same', title: 'New', updatedAt: '2026-10-20T01:00:00Z' });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(writeCount, 1, "same-record saves must be serialized");
  resolveOldWrite({ error: null });
  await Promise.all([oldWrite, newWrite]);

  const queue = JSON.parse(runtime.localStorage.getItem('sync.outbox.v1'));
  assert.equal(queue.length, 1);
  assert.equal(queue[0].data.title, 'New');
});

test('first upload keeps a newer cloud row and reports failed writes as incomplete', async () => {
  let fail = false;
  const writes = [];
  const remote = {
    books: [{ id: 'same', user_id: 'account-a', title: 'Cloud newer', updated_at: '2026-10-19T00:00:00Z' }],
    folders: [],
  };
  const runtime = syncRuntime({
    select: async table => ({ data: remote[table] || [], error: null }),
    upsert: async (table, rows) => { writes.push({ table, rows }); return { error: fail ? { message: 'write failed' } : null }; },
  });
  runtime.window.SB.getUser = async () => ({ id: 'account-a' });
  runtime.window.Sync.setOwner('account-a');
  runtime.localStorage.setItem('bookTracker.books.v1', JSON.stringify([
    { id: 'same', title: 'Stale local', updatedAt: '2026-10-18T00:00:00Z' },
    { id: 'new-local', title: 'New local', updatedAt: '2026-10-20T00:00:00Z' },
  ]));

  const result = await runtime.window.Sync.uploadAll();
  assert.equal(result.complete, true);
  assert.equal(writes.length, 1);
  assert.deepEqual(Array.from(writes[0].rows, row => row.id), ['new-local']);

  fail = true;
  const failed = await runtime.window.Sync.uploadAll();
  assert.equal(failed.complete, false);
  assert.ok(failed.failures > 0);
});

test('sign-in ignores legacy guest-import flags and hydrates only the current account', async () => {
  const localStorage = localStore();
  localStorage.setItem('_syncLegacyGuestPending_account-a', '1');
  const elements = new Map();
  const noop = () => {};
  function element() {
    const handlers = {};
    const childNodes = new Map();
    const node = {
      style: {},
      disabled: false,
      textContent: '',
      setAttribute: noop,
      addEventListener(type, handler) { handlers[type] = handler; },
      appendChild(child) { if (child.id) elements.set(child.id, child); },
      remove() { if (node.id) elements.delete(node.id); },
      querySelector(selector) {
        const id = selector.slice(1);
        if (!childNodes.has(id)) childNodes.set(id, element());
        return childNodes.get(id);
      },
      click(type = 'click') { return handlers[type] && handlers[type](); },
    };
    Object.defineProperty(node, 'id', { get() { return node._id || ''; }, set(value) { node._id = value; elements.set(value, node); } });
    return node;
  }
  let onReady;
  const document = {
    body: { appendChild(node) { if (node.id) elements.set(node.id, node); } },
    head: { appendChild(node) { if (node.id) elements.set(node.id, node); } },
    addEventListener(event, handler) { if (event === 'DOMContentLoaded') onReady = handler; },
    createElement: element,
    getElementById: id => elements.get(id) || null,
    querySelector: () => null,
  };
  let profileSyncs = 0;
  let uploadCalls = 0;
  let uploadOptions;
  const window = {
    location: { reload: noop },
    SB: {
      enabled: true,
      getUser: async () => ({ id: 'account-a' }),
      getProfile: async () => ({ id: 'account-a', nickname: '책별명', library_public: false }),
      getSession: async () => ({ user: { id: 'account-a' } }),
      onAuthChange: noop,
    },
    Sync: {
      setOwner: () => false,
      syncProfileOnSignIn: async () => { profileSyncs++; },
      uploadAll: async options => { uploadCalls++; uploadOptions = options; return { complete: false }; },
      pullBooks: async () => true,
      pullFolders: async () => true,
      flushOutbox: async () => {},
    },
    Storage: {
      getAllBooksRaw: ownerId => ownerId === null ? [{ id: 'guest-book' }] : [],
      getAllFoldersRaw: () => [],
      getAllBooks: () => [],
      getAllFolders: () => [],
    },
  };
  vm.runInNewContext(read('auth-ui.js'), { window, document, localStorage, console, setTimeout });
  onReady();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(profileSyncs, 1);
  assert.equal(elements.has('syncConsentModal'), false);
  assert.equal(uploadCalls, 0);
  assert.equal(uploadOptions, undefined);
  assert.equal(localStorage.getItem('_syncUploaded_account-a'), '1');
  assert.equal(localStorage.getItem('_syncLegacyGuestPending_account-a'), '1');
});

test('legacy uploadAll refuses guest and other account sources without changing stored books', async () => {
  const writes = [];
  const localStorage = localStore({ 'bookTracker.books.v1': JSON.stringify([{ id: 'guest-book' }]) });
  const app = syncRuntime({ user: { id: 'account-b' }, localStorage, upsert: async (table, rows) => { writes.push({ table, rows }); return { error: null }; } });
  app.window.Sync.setOwner('account-a');
  localStorage.setItem('bookTracker.books.v1', JSON.stringify([{ id: 'a-book' }]));
  app.window.Sync.setOwner('account-b');
  assert.equal((await app.window.Sync.uploadAll({ sourceOwnerId: null })).complete, false);
  assert.equal((await app.window.Sync.uploadAll({ sourceOwnerId: 'account-a' })).complete, false);
  assert.deepEqual(writes, []);
  assert.equal(app.window.Storage.getAllBooksRaw(null)[0].id, 'guest-book');
  assert.equal(app.window.Storage.getAllBooksRaw('account-a')[0].id, 'a-book');
  assert.deepEqual(JSON.parse(JSON.stringify(app.window.Storage.getAllBooksRaw())), []);
});

test('failed legacy guest imports remain queued while normal current-account writes retry', async () => {
  const writes = [];
  const guestBook = { id: 'guest-book', title: 'Guest original' };
  const guestFolder = { id: 'guest-folder', name: 'Guest folder' };
  const ownBook = { id: 'own-book', title: 'Current account edit' };
  const localStorage = localStore({
    'bookTracker.books.v1': JSON.stringify([guestBook]),
    'bookTracker.folders.v1': JSON.stringify([guestFolder]),
  });
  const a = syncRuntime({ user: { id: 'account-b' }, localStorage, upsert: async (table, row) => { writes.push({ table, row }); return { error: null }; } });
  a.window.Sync.setOwner('account-b');
  localStorage.setItem('bookTracker.books.v1', JSON.stringify([ownBook]));
  localStorage.setItem('_syncUploaded_account-b', '1');
  localStorage.setItem('_syncLegacyGuestPending_account-b', '1');
  localStorage.setItem('sync.outbox.v1', JSON.stringify([
    { type: 'book', data: guestBook, user_id: 'account-b' },
    { type: 'folder', data: guestFolder, user_id: 'account-b' },
    { type: 'book', data: ownBook, user_id: 'account-b' },
  ]));
  await a.window.Sync.flushOutbox();
  assert.equal(writes.length, 1);
  assert.equal(writes[0].row.id, 'own-book');
  assert.deepEqual(JSON.parse(localStorage.getItem('sync.outbox.v1')).map(row => row.data.id), ['guest-book', 'guest-folder']);
  assert.equal(a.window.Storage.getAllBooksRaw(null)[0].title, 'Guest original');
  assert.equal(a.window.Storage.getAllFoldersRaw(null)[0].name, 'Guest folder');
  assert.equal(a.window.Storage.getAllBooksRaw()[0].id, 'own-book');
});

test('account deletion cleanup clears only the active account and its outbox', () => {
  const runtime = syncRuntime();
  runtime.window.Sync.setOwner('account-a');
  runtime.localStorage.setItem('bookTracker.books.v1', JSON.stringify([{ id: 'a-book' }]));
  runtime.localStorage.setItem('profileName', 'A');
  runtime.localStorage.setItem('sync.outbox.v1', JSON.stringify([
    { type: 'book', data: { id: 'a-book' }, user_id: 'account-a' },
    { type: 'book', data: { id: 'b-book' }, user_id: 'account-b' },
  ]));
  runtime.localStorage.setItem('_syncUploaded_account-a', '1');
  runtime.localStorage.setItem('_syncUploaded_account-b', '1');

  assert.equal(runtime.window.Sync.clearCurrentAccount('account-a'), true);
  assert.deepEqual(JSON.parse(JSON.stringify(runtime.window.Storage.getAllBooksRaw())), []);
  assert.equal(runtime.localStorage.getItem('profileName'), null);
  assert.deepEqual(JSON.parse(runtime.localStorage.getItem('sync.outbox.v1')), [
    { type: 'book', data: { id: 'b-book' }, user_id: 'account-b' },
  ]);
  assert.equal(runtime.localStorage.getItem('_syncUploaded_account-a'), null);
  assert.equal(runtime.localStorage.getItem('_syncUploaded_account-b'), '1');
  runtime.window.Sync.setOwner(null);
  assert.deepEqual(JSON.parse(JSON.stringify(runtime.window.Storage.getAllBooksRaw())), []);
});


test('failed local persistence does not report success or upload an unsaved book', () => {
  const localStorage = localStore();
  let pushes = 0;
  const Storage = loadStorage(localStorage, { Sync: { pushBook() { pushes++; }, pushFolder() { pushes++; } } });
  const originalSet = localStorage.setItem;
  localStorage.setItem = (key, value) => { if (key === 'bookTracker.books.v1' || key === 'bookTracker.folders.v1') throw Error('quota'); originalSet(key, value); };
  assert.equal(Storage.saveBook({title:'Unsaved'}), null);
  assert.equal(Storage.saveFolder({name:'Unsaved'}), false);
  assert.equal(pushes, 0);
  assert.equal(Storage.getAllBooks().length, 0);
});

test('rereads preserve original date, deduplicate days and retain one library book', () => {
  const Storage = loadStorage(localStore());
  const book = Storage.saveBook({title:'Read again', readDate:'2026-10-01'});
  Storage.recordReread(book.id, '2026-10-25');
  const twice = Storage.recordReread(book.id, '2026-10-25');
  assert.deepEqual(Array.from(twice.readHistory), ['2026-10-01','2026-10-25']);
  assert.equal(twice.readDate,'2026-10-25');
  assert.equal(Storage.getAllBooks().length,1);
  assert.equal(Storage.recordReread(book.id,'2026-02-30'),null);
});

test('pending save is durable before network completion and status reflects failure then retry', async () => {
  let resolveWrite;
  const runtime = syncRuntime({user:{id:'account-a'},upsert:()=>new Promise(resolve=>{resolveWrite=resolve;})});
  runtime.window.Sync.setOwner('account-a');
  runtime.localStorage.setItem('_syncUploaded_account-a','1');
  const write=runtime.window.Sync.pushBook({id:'durable',title:'Book',readHistory:['2026-10-01']});
  assert.equal(JSON.parse(runtime.localStorage.getItem('sync.outbox.v1'))[0].data.id,'durable');
  assert.equal(runtime.window.Sync.getSaveStatus().state,'saving');
  await new Promise(resolve=>setImmediate(resolve));
  resolveWrite({error:{message:'offline'}});await write;
  assert.equal(runtime.window.Sync.getSaveStatus().state,'pending');
  runtime.client.from=()=>({upsert:async row=>{assert.deepEqual(Array.from(row.read_history),['2026-10-01']);return {error:null};}});
  await runtime.window.Sync.flushOutbox();
  assert.equal(runtime.window.Sync.getSaveStatus().state,'saved');
});


test('rapid local edits have increasing versions so the newest outbox edit is distinguishable', () => {
  const Storage = loadStorage(localStore());
  const first = Storage.saveBook({title:'First'});
  const second = Storage.updateBook(first.id,{title:'Second'});
  const third = Storage.updateBook(first.id,{title:'Third'});
  assert.ok(first.updatedAt < second.updatedAt);
  assert.ok(second.updatedAt < third.updatedAt);
});


test('queued stale flush snapshot cannot overwrite a newer local edit', async () => {
  const writes=[];
  const runtime=syncRuntime({user:{id:'account-a'},upsert:async (_table,row)=>{writes.push(row);return {error:null};}});
  runtime.window.Sync.setOwner('account-a');runtime.localStorage.setItem('_syncUploaded_account-a','1');
  runtime.localStorage.setItem('bookTracker.books.v1',JSON.stringify([{id:'same',title:'Newest',updatedAt:'2026-10-25T12:00:00Z'}]));
  await runtime.window.Sync.pushBook({id:'same',title:'Stale',updatedAt:'2026-10-24T00:00:00Z'});
  assert.equal(writes.length,0);
  assert.equal(runtime.window.Sync.getSaveStatus().pending,0);
});

test('startup and ignored guest imports never falsely claim cloud saving or saved', () => {
  const runtime=syncRuntime();runtime.window.Sync.setOwner('account-a');
  assert.equal(runtime.window.Sync.getSaveStatus().state,'ready');
  runtime.window.Sync.setOwner(null);
  const guest=runtime.window.Storage.saveBook({title:'Guest'});
  runtime.window.Sync.setOwner('account-a');
  runtime.localStorage.setItem('sync.outbox.v1',JSON.stringify([{user_id:'account-a',type:'book',data:guest}]));
  assert.equal(runtime.window.Sync.getSaveStatus().pending,0);
  assert.equal(runtime.window.Sync.getSaveStatus().state,'ready');
});

test('failed durable queue write is visible and does not start untracked network request', async () => {
  let writes=0;
  const runtime=syncRuntime({user:{id:'account-a'},upsert:async()=>{writes++;return {error:null};}});
  runtime.window.Sync.setOwner('account-a');runtime.localStorage.setItem('_syncUploaded_account-a','1');
  const original=runtime.localStorage.setItem;
  runtime.localStorage.setItem=(key,value)=>{if(key==='sync.outbox.v1')throw Error('quota');original(key,value);};
  await runtime.window.Sync.pushBook({id:'unsent',title:'Book'});
  assert.equal(writes,0);
  assert.equal(runtime.window.Sync.getSaveStatus().state,'error');
});

test('planned readDate is not treated as an already completed reread', () => {
  const Storage=loadStorage(localStore());
  const book=Storage.saveBook({title:'Planned',status:'want',readDate:'2026-11-01'});
  const saved=Storage.recordReread(book.id,'2026-10-25');
  assert.deepEqual(Array.from(saved.readHistory),['2026-10-25']);
  assert.equal(saved.readDate,'2026-10-25');
});
