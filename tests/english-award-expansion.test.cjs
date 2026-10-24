const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const entries=JSON.parse(fs.readFileSync('data/english-award-expansion.json','utf8'));
const context={window:{}};vm.runInNewContext(fs.readFileSync('js/book-catalog.js','utf8'),context);
const catalog=context.window.BOOK_CATALOG;
test('each additional English award has actual books and official item-level evidence',()=>{
 for(const id of ['geisel-award','sibert-award','coretta-scott-king-award','schneider-family-award']){
  assert.ok(entries.filter(e=>e.awardId===id).length>=3,id);
  assert.ok(catalog.meta.sources.some(s=>s.id===id),id);
 }
 const keys=new Set();
 for(const entry of entries){
  const key=[entry.isbn,entry.awardId,entry.year,entry.distinction].join(':');
  assert.ok(!keys.has(key),key);keys.add(key);
  const book=catalog.books.find(b=>b.isbn===entry.isbn);assert.ok(book,entry.isbn);
  assert.equal(book.language,'en');
  assert.match(entry.source,/^https:\/\/www\.ala\.org\//);
  assert.ok(['Medal','Winner','Honor'].includes(entry.distinction));
  assert.ok(Number.isInteger(entry.year) && entry.year<=2026);
  assert.ok(book.awards.some(a=>a.id===entry.awardId && a.year===entry.year && a.distinction===entry.distinction && a.source===entry.source));
  assert.ok(book.thumbnail && !/noimg|no_image/i.test(book.thumbnail));
 }
});
