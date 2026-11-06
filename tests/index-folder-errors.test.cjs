const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function runtime(success = false) {
  const source = fs.readFileSync('js/index.js', 'utf8');
  const section = source.slice(source.indexOf('  function promptAddFolder()'), source.indexOf('  // ── Sort', source.indexOf('  function promptAddFolder()')));
  const messages = [], renders = [];
  const env = { Storage: { saveFolder: () => success ? { name: '새 폴더' } : false, getFolder: () => ({ name: '보관함' }), deleteFolder: () => success },
    prompt: () => '새 폴더', confirm: () => true, showToast: value => messages.push(value), renderFolders: () => renders.push('folders'), renderBooks: () => renders.push('books') };
  vm.runInNewContext("let currentFolderId = 'folder';\n" + section + '\nthis.add = promptAddFolder; this.remove = promptDeleteFolder; this.current = () => currentFolderId;', env);
  return { ...env, messages, renders };
}
test('failed folder creation shows failure without success render', () => {
  const app = runtime(); app.add(); assert.match(app.messages[0], /추가하지 못/); assert.deepEqual(app.renders, []);
});
test('failed folder deletion preserves selected folder and reports failure', () => {
  const app = runtime(); app.remove('folder'); assert.equal(app.current(), 'folder'); assert.match(app.messages[0], /삭제하지 못/); assert.deepEqual(app.renders, []);
});
test('successful folder mutations keep existing render and selected-folder behavior', () => {
  const app = runtime(true); app.add(); app.remove('folder'); assert.equal(app.current(), ''); assert.deepEqual(app.renders, ['folders', 'folders', 'books']); assert.match(app.messages[0], /추가됨/); assert.equal(app.messages[1], '폴더 삭제됨');
});
