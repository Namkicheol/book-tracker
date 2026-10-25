const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const scope = {window:{}};
vm.runInNewContext(fs.readFileSync('js/curated-books.js','utf8'),scope);
const books = scope.window.CURATED_BOOKS;
test('curated editions have unique valid ISBNs, original prompts and attributable sources',()=>{
 const ids=new Set();
 for(const book of books){
  assert.match(book.isbn,/^\d{13}$/);
  const sum=[...book.isbn].reduce((n,c,i)=>n+Number(c)*(i%2?3:1),0);
  assert.equal(sum%10,0,book.title+' ISBN checksum');
  assert.ok(!ids.has(book.isbn),'duplicate edition '+book.isbn); ids.add(book.isbn);
  for(const field of ['title','author','note','activity']) assert.ok(book[field]?.trim(),book.isbn+' '+field);
  assert.equal(new URL(book.source).protocol,'https:');
  assert.ok(book.ages.length && book.topics.length);
  assert.ok(Array.isArray(book.provenance));
  for(const credit of book.provenance){
   assert.ok(['moms','publisher','library','award','social'].includes(credit.kind));
   assert.ok(credit.label); assert.equal(new URL(credit.source).protocol,'https:');
   if(credit.kind==='award') assert.ok(Number.isInteger(Number(credit.year)) && Number(credit.year)>1900);
   if(credit.kind==='social') assert.ok(credit.checkedAt && /instagram\.com|threads\.(net|com)/.test(new URL(credit.source).hostname));
  }
 }
});
test('individual reading prompts retain 60 books without unlicensed institutional recommendation grouping',()=>{
 assert.equal(books.length,60);
 assert.equal(books.filter(b=>b.provenance.some(p=>p.kind==='moms')).length,26);
 for(const book of books){
  assert.ok(!book.provenance.some(p=>p.kind==='library'));
  assert.ok(!/nlcy\.go\.kr/.test(book.source));
 }
});

test('launch additions keep exact edition metadata, independent prompts and dated publisher evidence',()=>{
 const additions=JSON.parse(fs.readFileSync('data/editorial-additions.json','utf8')).filter(b=>b.provenance.some(p=>p.checkedAt==='2026-10-25'));
 assert.equal(additions.length,22);
 assert.equal(new Set(additions.map(b=>b.note)).size,22);
 assert.equal(new Set(additions.map(b=>b.activity)).size,22);
 for(const addition of additions){
  const card=books.find(b=>b.isbn===addition.isbn);
  assert.ok(card,addition.isbn);
  for(const key of ['title','author','publisher','thumbnail','source','note','activity']) assert.equal(card[key],addition[key]);
  assert.equal(new URL(card.source).hostname,'bir.co.kr');
  assert.equal(new URL(card.thumbnail).hostname,'image.aladin.co.kr');
  assert.ok(card.evidenceNotes.some(note=>note.includes('isbn13')));
  assert.ok(card.provenance.some(p=>p.kind==='publisher' && p.checkedAt==='2026-10-25'));
 }
});
