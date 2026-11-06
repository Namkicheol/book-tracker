const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function runtime({ failFolder = true, failRestore = false } = {}) {
  let bookWrites = 0;
  const values = new Map(), pushes = [], statuses = [];
  const localStorage = { getItem: key => values.get(key) ?? null, setItem(key, value) { if ((key === 'bookTracker.folders.v1' && failFolder) || (key === 'bookTracker.books.v1' && ++bookWrites > 1 && failRestore)) throw new Error('quota'); values.set(key, String(value)); }, removeItem: key => values.delete(key) };
  const window = {};
  vm.runInNewContext(fs.readFileSync('js/storage.js', 'utf8'), { window, localStorage, console: { error() {}, warn() {} }, Date, Math });
  values.set('bookTracker.books.v1', JSON.stringify([{ id: 'book', title: '책', folders: ['folder'], updatedAt: '2026-11-01T00:00:00Z' }]));
  values.set('bookTracker.folders.v1', JSON.stringify([{ id: 'folder', name: '보관함' }]));
  window.Sync = { notifyLocalSave: error => statuses.push(error), pushBook: book => pushes.push(book), pushFolder: folder => pushes.push(folder) };
  return { Storage: window.Storage, pushes, statuses };
}
test('failed folder tombstone write preserves book memberships and reports save error', () => {
  const app = runtime();
  assert.equal(app.Storage.deleteFolder('folder'), false);
  assert.deepEqual(Array.from(app.Storage.getBook('book').folders), ['folder']);
  assert.equal(app.Storage.getBook('book').updatedAt, '2026-11-01T00:00:00Z');
  assert.ok(app.Storage.getFolder('folder'));
  assert.equal(app.pushes.length, 0);
  assert.equal(app.statuses.at(-1), true);
});

test('failed rollback remains an error and never starts cloud deletion', () => {
  const app = runtime({ failRestore: true });
  assert.equal(app.Storage.deleteFolder('folder'), false);
  assert.ok(app.Storage.getFolder('folder'));
  assert.equal(app.pushes.length, 0);
  assert.equal(app.statuses.at(-1), true);
});
test('successful folder deletion removes memberships and queues both mutations', () => {
  const app = runtime({ failFolder: false });
  assert.equal(app.Storage.deleteFolder('folder'), true);
  assert.equal(app.Storage.getFolder('folder'), null);
  assert.deepEqual(Array.from(app.Storage.getBook('book').folders), []);
  assert.equal(app.pushes.length, 2);
  assert.equal(app.statuses.at(-1), false);
});
