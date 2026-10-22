const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ctx={window:{}};vm.runInNewContext(fs.readFileSync('js/book-catalog.js','utf8'),ctx);
const books=ctx.window.BOOK_CATALOG.books;
test('full browse index retains thousands of unique books without copied blurbs or automatic award badges',()=>{
 assert.ok(books.length>=5500);
 assert.equal(new Set(books.map(b=>b.isbn)).size,books.length);
 for(const b of books){
  assert.match(b.isbn,/^97[89]\d{10}$/);
  for(const key of ['why','award','lexile'])assert.equal(key in b,false);
 }
});
test('known bulk-assigned general novels do not carry elementary age labels',()=>{
 for(const isbn of ['9788936434120','9788936434595','9788937473135','9791168340510']){
  const b=books.find(b=>b.isbn===isbn);assert.ok(b);assert.equal(b.age,'');assert.equal(b.genre,'문학');
 }
});
test('supplemental verified ISBNs retain covers, null AR and official award provenance without duplicates',()=>{
 const supplement=JSON.parse(fs.readFileSync('data/catalog-supplemental.json','utf8'));
 assert.equal(supplement.length,66);
 assert.equal(supplement.filter(b=>b.language==='en').length,30);
 assert.equal(supplement.filter(b=>b.language==='ko').length,36);
 for(const entry of supplement){
  const book=books.find(b=>b.isbn===entry.isbn);assert.ok(book);
  assert.equal(book.title,entry.title);assert.equal(book.ar,null);
  assert.match(book.thumbnail,/^https:\/\/image\.aladin\.co\.kr\//);
  if(entry.language==='en'){
   assert.equal(book.language,'en');assert.equal(book.age,'');
   assert.equal(book.awards.length,1);assert.match(book.awards[0].source,/https:\/\/www\.ala\.org\//);
   assert.ok(['Medal','Honor'].includes(book.awards[0].distinction));
  }
 }
});
test('existing editorial additions and all verified award mappings survive regeneration',()=>{
 for(const item of JSON.parse(fs.readFileSync('data/editorial-additions.json','utf8')))assert.ok(books.some(b=>b.isbn===item.isbn));
 for(const item of JSON.parse(fs.readFileSync('data/english-award-mapping.json','utf8'))){
  const book=books.find(b=>b.isbn===item.isbn);assert.ok(book);
  assert.ok(book.awards.some(a=>a.id===item.awardId&&a.year===item.year&&a.distinction===item.distinction&&a.source===item.source));
 }
});
test('public catalog preserves the existing books but excludes every legacy recommendation membership',()=>{
 assert.ok(books.length>=5625);assert.equal(books.filter(b=>b.awards?.length).length,78);
 assert.deepEqual(Array.from(ctx.window.BOOK_CATALOG.meta.sources,s=>s.id).sort(),['caldecott-award','newbery-award']);
 for(const source of ctx.window.BOOK_CATALOG.meta.sources)assert.match(source.url,/^https:\/\/www\.ala\.org\//);
 for(const book of books)assert.equal('lists' in book,false);
});
test('publisher additions preserve verified ISBNs and individual sources without invented AR or recommendation labels',()=>{
 const additions=JSON.parse(fs.readFileSync('data/publisher-additions.json','utf8'));
 assert.ok(additions.length>=40);
 const ids=new Set();
 for(const entry of additions){
  assert.ok(!ids.has(entry.isbn));ids.add(entry.isbn);
  assert.equal([...entry.isbn].reduce((sum,d,i)=>sum+Number(d)*(i%2?3:1),0)%10,0);
  const book=books.find(b=>b.isbn===entry.isbn);assert.ok(book);
  assert.equal(book.title,entry.title);assert.equal(book.language,entry.language);
  assert.equal(book.ar,null);assert.equal('lists' in book,false);
  assert.equal(new URL(entry.source).protocol,'https:');
  assert.ok(entry.evidenceNotes);assert.equal(entry.checkedAt,'2026-10-23');
  assert.match(book.thumbnail,/^https:\/\/image\.aladin\.co\.kr\//);
 }
});
