const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function setup(navigator = {}) {
  const window = {}, clicks = [];
  vm.runInNewContext(fs.readFileSync('js/share-template-new.js','utf8'), {
    window, navigator, File, WeakMap, setTimeout: fn => fn(),
    URL: {createObjectURL:()=> 'blob:card',revokeObjectURL(){}},
    document: {createElement:()=>({click(){clicks.push(this.download)},remove(){}}),body:{appendChild(){}}}
  });
  return {api:window,clicks};
}
function canvas() { let calls=0; return {get calls(){return calls},toBlob(callback){calls++;queueMicrotask(()=>callback(new Blob(['png'],{type:'image/png'})))}} }
test('prepared card starts native sharing in the click turn without another encoding',async()=>{
  let shared=false;
  const {api}=setup({canShare:()=>true,share:()=>{shared=true;return Promise.resolve()}});
  const card=canvas();await api.prepareShareCanvas(card);
  const result=api.shareToAll(card,'card.png','책');
  assert.equal(shared,true);assert.equal(card.calls,1);
  assert.equal((await result).success,true);
});
test('cancel is distinct from failure and never triggers download',async()=>{
  const {api,clicks}=setup({canShare:()=>true,share:()=>Promise.reject(Object.assign(new Error(),{name:'AbortError'}))});
  const result=await api.shareToAll(canvas(),'card.png','책');
  assert.equal(result.cancelled,true);assert.equal(result.success,false);assert.equal(clicks.length,0);
});
test('unsupported browser returns fallback signal',async()=>{
  const {api}=setup();assert.equal((await api.shareToAll(canvas(),'card.png','책')).success,false);
});
test('native failure remains distinguishable from cancel',async()=>{
  const {api}=setup({canShare:()=>true,share:()=>Promise.reject(Object.assign(new Error('blocked'),{name:'NotAllowedError'}))});
  await assert.rejects(api.shareToAll(canvas(),'card.png','책'),{name:'NotAllowedError'});
});
test('failed encoding never opens a share sheet or download',async()=>{
  let calls=0;const {api,clicks}=setup({canShare:()=>true,share:()=>{calls++}});
  await assert.rejects(api.prepareShareCanvas({toBlob:callback=>callback(null)}));
  assert.equal(calls,0);assert.equal(clicks.length,0);
});
test('download reuses prepared PNG',async()=>{
  const {api,clicks}=setup();const card=canvas();await api.prepareShareCanvas(card);
  await api.downloadCanvas(card,'card.png');assert.equal(card.calls,1);assert.deepEqual(clicks,['card.png']);
});
