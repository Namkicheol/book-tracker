const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('js/share.js','utf8');
function setup(){
 let authCalls=0;const opened=[];
 const window={SB:{getUser:async()=>{authCalls++;throw Error('must not use member access');}},BookPreview:{show:(book,options)=>opened.push({book,options})}};
 vm.runInNewContext(fs.readFileSync('js/community-shelves.js','utf8'),{window});
 const segment=source.slice(source.indexOf('  let publicLibraryRequest'),source.indexOf('  async function showPublicLibrary('));
 vm.runInNewContext(segment+'\nwindow.shelves=EXAMPLE_LIBRARIES;window.openThemeBook=book=>openFeedBook(book,true);',{window});
 return {window,opened,authCalls:()=>authCalls};
}
test('six themed shelves use real matching ISBN title and cover records without fake member fields',()=>{
 const a=setup(),catalog={window:{}};vm.runInNewContext(fs.readFileSync('js/book-catalog.js','utf8'),catalog);
 assert.equal(a.window.shelves.length,6);
 assert.equal(new Set(a.window.shelves.map(s=>s.title)).size,6);
 for(const shelf of a.window.shelves){
  for(const field of ['owner_id','city','district','likes','followers','book_count'])assert.equal(field in shelf,false);
  assert.equal(shelf.books.length,5);
  for(const book of shelf.books){const original=catalog.window.BOOK_CATALOG.books.find(b=>b.isbn===book.isbn);assert.ok(original);assert.equal(book.title,original.title);assert.equal(book.thumbnail,original.thumbnail);}
 }
 assert.doesNotMatch(fs.readFileSync('share.html','utf8'),/>[^<]*(?:예시|샘플|가상의)[^<]*</);
});
test('theme book preview works signed out without using private member RPC or auth',async()=>{
 const a=setup();await a.window.openThemeBook(a.window.shelves[0].books[0]);assert.equal(a.authCalls(),0);assert.equal(a.opened.length,1);assert.equal(a.opened[0].options.mode,'recommend');assert.equal(a.opened[0].book.isbn,'9791160947502');
});
