const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const full = fs.readFileSync('js/share.js', 'utf8');
const source = full.slice(full.indexOf('  async function showShareCard('), full.indexOf('  function _showShareCardModal('));
async function render(avatar, fail = false, theme = 'paper', layout = 'profile', books = []) {
  const texts = [], images = [], loaded = [];
  let result;
  const gradient = { addColorStop() {} };
  const ctx = new Proxy({ measureText: value => ({width:String(value).length*12}), fillText(value) { texts.push(value); }, drawImage(image) { images.push(image.src); }, createLinearGradient() { return gradient; } }, { get: (target, key) => target[key] || (() => {}) });
  const canvas = { getContext: () => ctx, toBlob(callback, type) { assert.equal(type, 'image/png'); callback({ type }); } };
  const env = {
    window: {},
    document: { fonts: { ready: Promise.resolve() }, createElement: () => canvas },
    localStorage: { getItem: key => key === 'profileAvatar' ? avatar : '책친구' },
    Image: class { set src(value) { this._src = value; loaded.push({ value, cors: this.crossOrigin }); this.naturalWidth = 200; this.naturalHeight = 100; queueMicrotask(() => fail ? this.onerror() : this.onload()); } get src() { return this._src; } },
    setTimeout, clearTimeout, myStats: { monthBooks: 0, weekBooks: 0, yearBooks: 0, streak: 0 }, BADGES: [],
    URL: { createObjectURL: () => 'blob:card' }, _showShareCardModal(url, blob) { result = { url, blob }; }, showToast() {}
  };
  env.window.Storage = env.Storage = {getAllBooks:()=>books};
  env.window.ReadingGarden = env.ReadingGarden = {getGarden:()=>({count:books.filter(book=>!book.status).length,matureTrees:[],currentTree:null})};
  vm.runInNewContext(source + '\nthis.render = showShareCard;', env);
  await env.render({theme,layout});
  return { texts, images, loaded, result };
}
for (const avatar of ['https://example.org/profile.jpg', 'data:image/png;base64,profile-data']) {
  test(`avatar image is cropped as an image, never printed: ${avatar.slice(0, 16)}`, async () => {
    const card = await render(avatar);
    assert.ok(card.images.includes(avatar));
    assert.ok(!card.texts.includes(avatar));
    assert.equal(card.loaded[0].cors, 'anonymous');
    assert.equal(card.result.blob.type, 'image/png');
  });
  test(`failed avatar load falls back without exposing source: ${avatar.slice(0, 16)}`, async () => {
    const card = await render(avatar, true);
    assert.ok(card.texts.includes('📖'));
    assert.ok(!card.texts.includes(avatar));
    assert.equal(card.result.url, 'blob:card');
  });
}
test('emoji remains bounded and unexpected text uses a safe fallback', async () => {
  assert.ok((await render('👩')).texts.includes('👩'));
  assert.ok((await render('unexpected private text')).texts.includes('📖'));
  assert.ok((await render('👩'.repeat(50))).texts.includes('📖'));
});
test('generated paper artwork is drawn under the content and remains optional', async () => {
  const card = await render('👩');
  assert.equal(card.images[0], 'img/cards/monthly-paper.png');
  assert.ok(card.texts.includes('아이와 함께한 독서 기록'));
  const fallback = await render('👩', true);
  assert.equal(fallback.images.length, 0);
  assert.equal(fallback.result.blob.type, 'image/png');
});

test('each selected artwork is drawn and branding appears at top and footer', async () => {
  for (const [theme, asset] of [['paper', 'monthly-paper'], ['coffee', 'reading-coffee'], ['forest', 'reading-forest'], ['bookshelf', 'profile-bookshelf'], ['garden', 'garden-postcard']]) {
    const card = await render('👩', false, theme);
    assert.equal(card.images[0], `img/cards/${asset}.png`);
    assert.equal(card.texts.filter(text => text === '맘스북스').length, 2);
  }
});

test('profile, monthly and garden exports contain distinct truthful content', async () => {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const books = [{title:'읽은 책',readDate:today},{title:'읽을 책',readDate:today,status:'want'}];
  const profile = await render('👩',false,'paper','profile',books);
  assert.ok(profile.texts.includes('한 권씩 모인 2권의 이야기'));
  assert.ok(profile.texts.includes('함께 읽은 책 1권'));
  const monthly = await render('👩',false,'paper','monthly',books);
  assert.ok(monthly.texts.includes('1권'));
  assert.ok(!monthly.texts.includes('읽을 책'));
  const garden = await render('👩',false,'garden','garden',books);
  assert.ok(garden.texts.includes('책으로 자라는 정원'));
  assert.ok(garden.texts.includes('함께 읽은 책 1권'));
});
test('empty monthly record avoids invented progress and zero-stat dashboard', async () => {
  const card = await render('👩',false,'paper','monthly');
  assert.ok(card.texts.includes('아직 빈 책갈피'));
  assert.ok(!card.texts.includes('0'));
  assert.ok(!card.texts.some(text=>String(text).includes('지역')));
});
