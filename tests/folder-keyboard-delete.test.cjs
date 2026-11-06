const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
test('Delete requests confirmation for actual folder chips and leaves 전체 unchanged', () => {
  const chip = id => ({ dataset: { folder: id }, listeners: {}, attributes: {}, addEventListener(name, fn) { this.listeners[name] = fn; }, setAttribute(name, value) { this.attributes[name] = value; } });
  const all = chip(''), folder = chip('folder-a'), deleted = [];
  const bar = { querySelectorAll: () => [all, folder] };
  const full = fs.readFileSync('js/index.js', 'utf8');
  const start = full.indexOf('  function renderFolders()');
  const source = full.slice(start, full.indexOf('  // 폴더 칩을 drop target', start));
  vm.runInNewContext("let currentFolderId = '';\n" + source + '\nrenderFolders();', {
    document: { getElementById: id => id === 'folderBar' ? bar : { addEventListener() {} } }, Storage: { getAllFolders: () => [{ id: 'folder-a', name: '보관함' }], getAllBooks: () => [] },
    chipHTML: () => '', renderBooks() {}, attachLongPress() {}, attachFolderDropTarget() {}, promptAddFolder() {}, promptDeleteFolder: id => deleted.push(id),
  });
  assert.equal(all.listeners.keydown, undefined);
  assert.equal(folder.attributes['aria-keyshortcuts'], 'Delete');
  assert.match(folder.attributes.title, /Delete/);
  let prevented = false;
  folder.listeners.keydown({ key: 'Enter', preventDefault() { prevented = true; } });
  assert.equal(deleted.length, 0);
  folder.listeners.keydown({ key: 'Delete', preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.deepEqual(deleted, ['folder-a']);
});
