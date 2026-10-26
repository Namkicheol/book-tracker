const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const books=count=>Array.from({length:count},(_,id)=>({id, title:'Book '+id}));
function setup(){
 const values=new Map();let current=true,fail=false;
 const localStorage={getItem:key=>values.get(key)??null,setItem(key,value){if(fail)throw Error('quota');values.set(key,value);}};
 const window={addEventListener(){}};
 vm.runInNewContext(fs.readFileSync('js/garden.js','utf8'),{window,localStorage,Storage:{getAllBooks:()=>books(30),isOwnerCurrent:()=>current},document:{addEventListener(){}}});
 return {garden:window.ReadingGarden,values,setCurrent:value=>current=value,setFail:value=>fail=value};
}
test('collection unlock thresholds and next reward follow distinct completed books',()=>{
 const {garden}=setup();
 for(const [count,earned,next] of [[0,0,1],[1,1,3],[3,2,5],[5,3,10],[10,4,20],[20,5,30],[30,6,null]]){
  const collection=garden.getCollection(books(count));
  assert.equal(collection.earnedCount,earned);assert.equal(collection.next?.at??null,next);
 }
 const collection=garden.getCollection([{id:'a',isbn:'9781234567890'},{id:'b',isbn:'1234567890 9781234567890'},{id:'c',status:'reading'},{id:'d',status:'want'}]);
 assert.equal(collection.count,1);assert.equal(collection.earnedCount,1);
 assert.equal(garden.getCollection().earnedCount,6);
});
test('original item illustrations are distinct self-contained SVGs',()=>{
 const {garden}=setup(),items=garden.getCollection().items;
 assert.equal(new Set(items.map(item=>item.svg)).size,6);
 for(const item of items){assert.match(item.svg,/^<svg .*width="64" height="64" viewBox="0 0 64 64"/);assert.doesNotMatch(item.svg,/<image|href=|<script/);}
 assert.equal(garden.itemArt('unknown'),'');
});
test('equipping rejects locked items, caps at two and persists remove or replacement',()=>{
 const {garden,values}=setup();
 assert.equal(garden.toggleItem('rabbit',books(1)).error,'locked');
 assert.equal(garden.toggleItem('unknown').error,'unknown');
 assert.equal(garden.toggleItem('clover').ok,true);assert.equal(garden.toggleItem('rabbit').ok,true);
 const saved=values.get('bookTracker.garden.collection.v1');
 assert.equal(garden.toggleItem('bird').error,'full');assert.equal(values.get('bookTracker.garden.collection.v1'),saved);
 assert.deepEqual(Array.from(garden.getCollection().equipped,item=>item.id),['clover','rabbit']);
 assert.equal(garden.toggleItem('clover').ok,true);assert.equal(garden.toggleItem('bird').ok,true);
 assert.deepEqual(Array.from(garden.getCollection().equipped,item=>item.id),['bird','rabbit']);
});
test('deleting then restoring completed books hides and restores selections without farming rewards',()=>{
 const {garden,values}=setup();garden.toggleItem('rabbit');
 const before=values.get('bookTracker.garden.collection.v1');
 assert.equal(garden.getCollection(books(19)).equipped.length,0);
 assert.equal(garden.getCollection(books(20)).equipped[0].id,'rabbit');
 assert.equal(values.get('bookTracker.garden.collection.v1'),before,'derived collection reads never write');
 garden.toggleItem('clover',books(1));
 assert.deepEqual(Array.from(garden.getCollection().equipped,item=>item.id),['clover'],'new choice replaces hidden selection');
});
test('stale owner and storage quota failures leave selection intact',()=>{
 const {garden,values,setCurrent,setFail}=setup();garden.toggleItem('clover');
 const saved=values.get('bookTracker.garden.collection.v1');
 setCurrent(false);assert.equal(garden.toggleItem('bird').error,'owner');
 setCurrent(true);setFail(true);assert.equal(garden.toggleItem('clover').error,'storage');
 assert.equal(values.get('bookTracker.garden.collection.v1'),saved);
 assert.equal(garden.getCollection().equipped[0].id,'clover');
});
