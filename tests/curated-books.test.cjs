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
  assert.ok(book.provenance.length);
  for(const credit of book.provenance){
   assert.ok(['moms','publisher','library','award','social'].includes(credit.kind));
   assert.ok(credit.label); assert.equal(new URL(credit.source).protocol,'https:');
   if(credit.kind==='award') assert.ok(Number.isInteger(Number(credit.year)) && Number(credit.year)>1900);
   if(credit.kind==='social') assert.ok(credit.checkedAt && /instagram\.com|threads\.(net|com)/.test(new URL(credit.source).hostname));
  }
 }
});
