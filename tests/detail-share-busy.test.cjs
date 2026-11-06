const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function runtime() {
  const full = fs.readFileSync('js/detail.js', 'utf8');
  const source = full.slice(full.indexOf('  function showInstagramModal('), full.indexOf('  // ── AR fetch'));
  const element = () => ({ disabled: false, setAttribute() {}, focus() {}, getClientRects: () => [{}] });
  const download = element(), share = element(), template = { ...element(), dataset: { template: '2' } };
  const preview = { getContext: () => ({ drawImage() {} }), setAttribute() {} };
  const modal = { hidden: true, querySelector: () => element(), querySelectorAll: selector => selector === '.template-btn' ? [template] : [] };
  let finishExport, rejectExport, renders = 0, exports = 0;
  const pending = () => { exports++; return new Promise((resolve, reject) => { finishExport = resolve; rejectExport = reject; }); };
  const env = { document: { getElementById: id => ({ instagramModal: modal, sharePreviewCanvas: preview, shareDownloadBtn: download, shareAllBtn: share, instagramShareBtn: element() })[id], addEventListener() {}, removeEventListener() {} },
    generateInstagramTemplate: async () => { renders++; return { width: 1080, height: 1350 }; }, prepareShareCanvas: async () => {}, downloadCanvas: pending, showToast() {}, window: { shareToAll: pending } };
  vm.runInNewContext(source + '\nthis.open = showInstagramModal;', env);
  env.open({ width: 1080, height: 1350 }, { title: '책' }, '', 0);
  return { download, share, template, get renders() { return renders; }, get exports() { return exports; }, finish: value => finishExport(value), reject: () => rejectExport(new Error('failed')) };
}

for (const action of ['download', 'share']) {
  test(`${action} keeps template changes blocked until export finishes`, async () => {
    const app = runtime();
    const pending = app[action].onclick();
    assert.equal(app.template.disabled, true);
    await app[action].onclick();
    assert.equal(app.exports, 1);
    await app.template.onclick();
    assert.equal(app.renders, 0);
    assert.equal(app.download.disabled, true);
    app.finish({ success: false, cancelled: true });
    await pending;
    assert.equal(app.template.disabled, false);
    assert.equal(app.download.disabled, false);
    await app.template.onclick();
    assert.equal(app.renders, 1);
  });
  test(`${action} failure unlocks template and export buttons`, async () => {
    const app = runtime();
    const pending = app[action].onclick();
    app.reject();
    await pending;
    assert.equal(app.template.disabled, false);
    assert.equal(app.share.disabled, false);
    assert.equal(app.download.disabled, false);
  });
}
