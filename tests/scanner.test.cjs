const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function scannerHarness({ lookup = async () => null, start = async () => {}, photo = async () => '9780306406157' } = {}) {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, {
      disabled: false, textContent: '', dataset: {}, style: {},
      classList: { add() {}, remove() {} },
    });
    return elements.get(id);
  };
  const calls = { stop: 0, clear: 0, lookup: 0, preview: 0, start: 0 };
  class Camera {
    constructor(id, config) { calls.config = config; }
    async start(camera, config, callback) {
      calls.start++;
      calls.camera = camera;
      calls.scanConfig = config;
      calls.decode = callback;
      await start();
    }
    async scanFile() { return photo(); }
    getRunningTrackCapabilities() { return {}; }
    async stop() { calls.stop++; }
    clear() { calls.clear++; }
  }
  const context = {
    window: { addEventListener() {}, BookPreview: true },
    document: { getElementById: element, addEventListener() {}, querySelectorAll() { return []; } },
    history: { replaceState() {} },
    Html5Qrcode: Camera, Html5QrcodeSupportedFormats: { EAN_13: 9 },
    API: { async searchByIsbn(value) { calls.lookup++; return lookup(value); } },
    Storage: { getBookByIsbn() { return null; } },
    BookPreview: { show() { calls.preview++; } },
    console: { log() {}, warn() {}, error() {} }, setTimeout, clearTimeout,
  };
  const source = fs.readFileSync('js/scanner.js', 'utf8').replace(
    '  // ── Boot',
    '  window.scannerTest = { startBarcode, stopBarcode, onDecodeSuccess, isBookBarcode, scanBarcodePhoto, searchByIsbn, setMode };\n  // ── Boot'
  );
  vm.runInNewContext(source, context);
  return { ...context.window.scannerTest, calls, element };
}

test('only checksum-valid book EAN13 codes are accepted', () => {
  const scanner = scannerHarness();
  assert.equal(scanner.isBookBarcode('9780306406157'), true);
  assert.equal(scanner.isBookBarcode('9791191056020'), true);
  for (const value of ['9780306406158', '4006381333931', '1234567890', 'ISBN9780306406157']) {
    assert.equal(scanner.isBookBarcode(value), false, value);
  }
});

test('unrelated codes and read errors keep camera running without catalog requests', async () => {
  const scanner = scannerHarness();
  await scanner.startBarcode();
  await scanner.onDecodeSuccess('4006381333931');
  await scanner.onDecodeSuccess('9780306406158');
  assert.equal(scanner.calls.stop, 0);
  assert.equal(scanner.calls.lookup, 0);
  assert.equal(scanner.element('startBtn').dataset.state, 'running');
  const region = scanner.calls.scanConfig.qrbox(240, 180);
  assert.ok(region.width < 240 && region.height < 180);
  assert.equal(scanner.element('scanOverlay').style.left, `${(240 - region.width) / 2}px`);
  assert.equal(scanner.element('scanOverlay').style.top, `${(180 - region.height) / 2}px`);
  assert.deepEqual(Array.from(scanner.calls.config.formatsToSupport), [9]);
});

test('catalog misses and failures do not shut off the camera', async () => {
  for (const lookup of [async () => null, async () => { throw new Error('offline'); }]) {
    const scanner = scannerHarness({ lookup });
    await scanner.startBarcode();
    await scanner.onDecodeSuccess('9780306406157');
    assert.equal(scanner.calls.stop, 0);
    assert.equal(scanner.element('startBtn').dataset.state, 'running');
  }
});

test('overlapping decoded frames cause one lookup and one stop after a found book', async () => {
  let finish;
  const scanner = scannerHarness({ lookup: () => new Promise(resolve => { finish = resolve; }) });
  await scanner.startBarcode();
  const pending = scanner.onDecodeSuccess('9780306406157');
  assert.equal(scanner.element('barcodeStatus').textContent, 'ISBN 9780306406157 인식 · 책 찾는 중…');
  await scanner.onDecodeSuccess('9791191056020');
  assert.equal(scanner.calls.lookup, 1);
  assert.equal(scanner.calls.stop, 0);
  finish({ isbn: '9780306406157', title: 'Book' });
  await pending;
  assert.equal(scanner.calls.stop, 1);
  assert.equal(scanner.calls.preview, 1);
});

test('leaving while camera permission is pending closes the late stream', async () => {
  let finish;
  const scanner = scannerHarness({ start: () => new Promise(resolve => { finish = resolve; }) });
  const pending = scanner.startBarcode();
  await scanner.startBarcode();
  await scanner.stopBarcode();
  finish();
  await pending;
  assert.equal(scanner.calls.start, 1);
  assert.equal(scanner.calls.stop, 1);
  assert.equal(scanner.element('startBtn').dataset.state, '');
});

test('late catalog success after user stops does not open a preview', async () => {
  let finish;
  const scanner = scannerHarness({ lookup: () => new Promise(resolve => { finish = resolve; }) });
  await scanner.startBarcode();
  const pending = scanner.onDecodeSuccess('9780306406157');
  await scanner.stopBarcode();
  finish({ isbn: '9780306406157', title: 'Book' });
  await pending;
  assert.equal(scanner.calls.preview, 0);
  assert.equal(scanner.calls.stop, 1);
});


test('photo recognition closes live stream before decoding and looks up the ISBN', async () => {
  const scanner = scannerHarness({ lookup: async isbn => ({ isbn, title: 'Book' }) });
  await scanner.startBarcode();
  await scanner.scanBarcodePhoto({ name: 'barcode.png' });
  assert.equal(scanner.calls.stop, 1);
  assert.equal(scanner.calls.lookup, 1);
  assert.equal(scanner.calls.preview, 1);
  assert.equal(scanner.element('startBtn').disabled, false);
});


test('old camera lookup cannot stop a restarted camera or block its fresh decode', async () => {
  const finishes = [];
  const scanner = scannerHarness({ lookup: () => new Promise(resolve => finishes.push(resolve)) });
  await scanner.startBarcode();
  const old = scanner.onDecodeSuccess('9780306406157');
  await scanner.stopBarcode();
  await scanner.startBarcode();
  const fresh = scanner.onDecodeSuccess('9791191056020');
  assert.equal(scanner.calls.lookup, 2);
  finishes[0]({ isbn: '9780306406157', title: 'Old' });
  await old;
  assert.equal(scanner.calls.preview, 0);
  assert.equal(scanner.calls.stop, 1);
  await scanner.onDecodeSuccess('9780306406157');
  assert.equal(scanner.calls.lookup, 2, 'old request must not unlock the newer decode');
  finishes[1]({ isbn: '9791191056020', title: 'Fresh' });
  await fresh;
  assert.equal(scanner.calls.preview, 1);
  assert.equal(scanner.calls.stop, 2);
});

test('photo completion after a mode change cannot search or open a preview', async () => {
  let finish;
  const scanner = scannerHarness({ photo: () => new Promise(resolve => { finish = resolve; }) });
  const pending = scanner.scanBarcodePhoto({ name: 'photo.png' });
  await new Promise(resolve => setImmediate(resolve));
  scanner.setMode('isbn');
  finish('9780306406157');
  await pending;
  assert.equal(scanner.calls.lookup, 0);
  assert.equal(scanner.calls.preview, 0);
});

test('new manual ISBN request cancels a pending photo result', async () => {
  let finish;
  const scanner = scannerHarness({ photo: () => new Promise(resolve => { finish = resolve; }), lookup: async isbn => ({isbn, title: 'Manual'}) });
  const pending = scanner.scanBarcodePhoto({ name: 'photo.png' });
  await new Promise(resolve => setImmediate(resolve));
  await scanner.searchByIsbn('9791191056020');
  finish('9780306406157');
  await pending;
  assert.equal(scanner.calls.lookup, 1);
  assert.equal(scanner.calls.preview, 1);
});
