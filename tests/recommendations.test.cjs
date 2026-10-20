const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function setup(search, lookup, catalog) {
  const nodes = new Map();
  function node(id) {
    if (!nodes.has(id)) nodes.set(id, { value: id === 'recAge' ? '초등 저학년' : '', hidden: false, disabled: false, innerHTML: '', textContent: '', dataset: {}, handlers: {}, setAttribute() {}, classList: {toggle() {}}, querySelector() {return null;}, addEventListener(name, fn) {this.handlers[name] = fn;} });
    return nodes.get(id);
  }
  const saved = [];
  let init;
  const document = {getElementById: node, querySelectorAll: () => [], addEventListener(name, fn) {if (name === 'DOMContentLoaded') init = fn;}, createElement() { return {textContent: '', get innerHTML() {return this.textContent;}};}};
  const API = {aladinSearch: search, aladinLookup: lookup, normalizeAladin: item => item};
  const Storage = {getBookByIsbn: isbn => saved.find(book => book.isbn === isbn), saveBook: book => saved.push(book)};
  const events = {};
  const window = {CURATED_BOOKS: catalog || [], API, Storage, addEventListener(name, fn) { events[name] = fn; }};
  if (!catalog) vm.runInNewContext(fs.readFileSync('js/curated-books.js', 'utf8'), {window});
  vm.runInNewContext(fs.readFileSync('js/recommendations.js', 'utf8'), {window, document, API, Storage, localStorage:{getItem(){return null;}}, console, setTimeout});
  return {init, node, saved, events};
}

test('deduplicates catalog ISBNs and explicitly bulk adds only missing books', async () => {
  const app = setup(async () => [{isbn:'1',title:'First'}, {isbn:'1',title:'Duplicate'}, {isbn:'2',title:'Second'}]);
  app.saved.push({isbn:'1', title:'Already reading', status:'reading'});
  await app.init();
  assert.match(app.node('searchMeta').textContent, /2권/);
  assert.match(app.node('searchGrid').innerHTML, /내 서재에 있어요/);
  app.node('recSelectAll').handlers.click();
  assert.match(app.node('recAddSelected').textContent, /1권/);
  assert.equal(app.saved.length, 1, 'selection must not write');
  app.node('recAddSelected').handlers.click();
  assert.equal(app.saved.length, 2);
  assert.equal(app.saved[0].status, 'reading');
  assert.equal(app.saved[1].status, 'want');
  app.node('recAddSelected').handlers.click();
  assert.equal(app.saved.length, 2, 'repeated add must not duplicate');
});

test('failed request exposes retry and retry clears error', async () => {
  let calls = 0;
  const app = setup(async () => { if (++calls === 1) throw new Error('offline'); return []; });
  await app.init();
  assert.equal(app.node('recRetry').hidden, false);
  assert.equal(app.node('recSearchBtn').disabled, false);
  await app.node('recRetry').handlers.click();
  assert.equal(app.node('recRetry').hidden, true);
  assert.match(app.node('searchGrid').innerHTML, /검색 결과가 없어요/);
});

test('age changes search immediately and old responses cannot replace new results', async () => {
  const resolvers = [];
  const queries = [];
  const app = setup(params => {queries.push(params); return new Promise(resolve => resolvers.push(resolve));});
  const first = app.init();
  app.node('recAge').value = '청소년';
  const second = app.node('recAge').handlers.change();
  resolvers[1]([{isbn:'2', title:'Current'}]);
  await second;
  resolvers[0]([{isbn:'1', title:'Outdated'}]);
  await first;
  assert.equal(queries[1].categoryId, 1137);
  assert.equal(queries[1].query, "그림책");
  assert.match(app.node('searchGrid').innerHTML, /Current/);
  assert.doesNotMatch(app.node('searchGrid').innerHTML, /Outdated/);
});


test('search uses an age category and excludes multi-volume bundles', async () => {
  let parameters;
  const app = setup(async params => {parameters=params; return [{isbn:'1',title:'그림책 한 권'}, {isbn:'2',title:'추천 20권 세트'}, {isbn:'3',title:'그림책 전집'}];});
  await app.init();
  assert.equal(parameters.categoryId,48825);
  assert.equal(parameters.query,'그림책');
  assert.match(app.node('searchMeta').textContent,/1권/);
  assert.doesNotMatch(app.node('searchGrid').innerHTML,/20권 세트|전집/);
});

test('starter shelf displays only exact ISBN/title/author matches, without persisting response', async () => {
  const app = setup(async()=>[], async isbn => {
    if(isbn==='9788949161341') return {isbn,title:'만복이네 떡집',authors:['김리리']};
    if(isbn==='9788971968710') return {isbn:'wrong',title:'마당을 나온 암탉',authors:['황선미']};
    if(isbn==='9788993242980') return {isbn,title:'다른 책',authors:['유설화']};
    throw new Error('offline');
  });
  await app.init();
  await new Promise(resolve=>setImmediate(resolve));
  assert.match(app.node('recShelfGrid').innerHTML,/만복이네 떡집/);
  assert.match(app.node('recShelfGrid').innerHTML,/서지 확인 출처/);
  assert.doesNotMatch(app.node('recShelfGrid').innerHTML,/마당을 나온 암탉|다른 책/);
  assert.equal(app.node('recShelfRetry').hidden,false);
  assert.equal(app.saved.length,0);
});


test('focus refresh preserves loading and error messages', async () => {
  let reject;
  const app = setup(()=>new Promise((resolve, failure)=>{reject=failure;}));
  const pending = app.init();
  app.events.focus();
  assert.match(app.node('searchGrid').innerHTML,/찾아보고/);
  reject(new Error('offline'));
  await pending;
  app.events.focus();
  assert.match(app.node('searchGrid').innerHTML,/잠시 후 다시 시도/);
});

const tick = () => new Promise(resolve => setImmediate(resolve));
function fixtureCatalog(count = 14) {
  return Array.from({length:count}, (_,i) => ({isbn:String(i),title:`Book ${i}`,author:'Writer',source:'https://example.org/book',note:'Original prompt',activity:'Question',ages:[i % 2 ? 'older' : 'younger'],topics:[i % 2 ? 'nature' : 'friendship'],provenance:[{kind:i % 2 ? 'award' : 'publisher',label:i % 2 ? 'Exact award' : 'Publisher introduction',year:2025,source:'https://example.org/evidence'}]}));
}
const metadata = isbn => ({isbn,title:`Book ${isbn}`,authors:['Writer']});

test('curated pagination limits initial requests and caches only successful lookups in memory', async () => {
  const calls = [];
  let failure = true;
  const app = setup(async()=>[], async isbn => { calls.push(isbn); if(isbn === '1' && failure) throw new Error('offline'); return metadata(isbn); }, fixtureCatalog());
  await app.init(); await tick();
  assert.equal(calls.length,6);
  assert.match(app.node('recShelfStatus').textContent,/14권 중 5권.*1권은 정보를/);
  failure = false;
  await app.node('recShelfRetry').handlers.click();
  assert.equal(calls.length,7,'retry must only re-fetch the missing metadata');
  await app.node('recShelfMore').handlers.click();
  assert.equal(calls.length,13);
  assert.match(app.node('recShelfStatus').textContent,/14권 중 12권/);
  assert.equal(app.saved.length,0);
  assert.match(app.node('recShelfGrid').innerHTML,/Exact award · 2025/);
});

test('curated source age and topic filters combine independently', async () => {
  const app = setup(async()=>[], async isbn => metadata(isbn), fixtureCatalog());
  await app.init(); await tick();
  app.node('recShelfSource').value='award';
  app.node('recShelfAge').value='older';
  app.node('recShelfTopic').value='nature';
  await app.node('recShelfTopic').handlers.change();
  assert.match(app.node('recShelfStatus').textContent,/조건에 맞는 7권/);
  assert.doesNotMatch(app.node('recShelfGrid').innerHTML,/Book 0</);
  app.node('recShelfAge').value='younger';
  await app.node('recShelfAge').handlers.change();
  assert.match(app.node('recShelfStatus').textContent,/조건에 맞는 책이 없어요/);
  assert.match(app.node('recShelfGrid').innerHTML,/다른 출처·연령·주제/);
});

test('curated filter races cannot render stale books and never exceed four active requests', async () => {
  let active=0, peak=0;
  const pending=[];
  const app=setup(async()=>[], isbn => new Promise(resolve => {active++;peak=Math.max(peak,active);pending.push(()=>{active--;resolve(metadata(isbn));});}), fixtureCatalog());
  await app.init(); await tick();
  assert.equal(pending.length,4);
  app.node('recShelfSource').value='award';
  const change=app.node('recShelfSource').handlers.change();
  pending.splice(0).forEach(resolve=>resolve());
  await tick();
  while(pending.length) { pending.splice(0).forEach(resolve=>resolve()); await tick(); }
  await change;
  assert.equal(peak,4);
  assert.match(app.node('recShelfStatus').textContent,/조건에 맞는 7권/);
  assert.doesNotMatch(app.node('recShelfGrid').innerHTML,/Book 0</);
});
