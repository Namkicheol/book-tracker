const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync('sw.js','utf8');
const currentCache = source.match(/const CACHE = '([^']+)'/)[1];
function runtime({ cached = new Map(), failInstall = false } = {}) {
  const handlers = {}, removed = [], added = [], lifecycle = [];
  const cache = { add: async url => { if (failInstall) throw Error('offline'); added.push(url); }, put() {} };
  const context = { URL, Response, self: { location: { origin:'https://moms.test' }, addEventListener:(n,fn)=>handlers[n]=fn, skipWaiting:async()=>lifecycle.push('skip'), clients:{claim:async()=>lifecycle.push('claim')} }, caches:{open:async()=>cache, keys:async()=>['momsbooks-old',currentCache,'other-app-cache'], delete:async k=>removed.push(k), match:async key=>cached.get(typeof key==='string'?key:key.url)}, fetch:async()=>{throw Error('network offline')} };
  vm.runInNewContext(source,context);
  return {handlers,removed,added,lifecycle};
}
async function lifecycle(r, name) { let pending; r.handlers[name]({waitUntil:p=>pending=p}); await pending; }
function request(r,path,mode='navigate') { let response; r.handlers.fetch({request:{url:'https://moms.test'+path,method:'GET',mode},respondWith:p=>response=p}); return response; }
test('offline fallback installs before skipWaiting; unrelated caches are retained',async()=>{
 const r=runtime();await lifecycle(r,'install');assert.deepEqual(r.added,['/offline.html']);assert.deepEqual(r.lifecycle,['skip']);await lifecycle(r,'activate');assert.deepEqual(r.removed,['momsbooks-old']);
});
test('failed fallback fetch prevents a new worker from skipping waiting',async()=>{
 const r=runtime({failInstall:true});await assert.rejects(lifecycle(r,'install'));assert.deepEqual(r.lifecycle,[]);
});
test('unvisited navigation gets offline page, visited navigation keeps cached page',async()=>{
 const fallback=new Response('offline'),visited=new Response('library');const r=runtime({cached:new Map([['/offline.html',fallback],['https://moms.test/index.html',visited]])});assert.equal(await (await request(r,'/detail.html?id=one')).text(),'offline');assert.equal(await (await request(r,'/index.html')).text(),'library');
});
test('JSON and assets never receive HTML fallback; retired data stays blocked',async()=>{
 const r=runtime({cached:new Map([['/offline.html',new Response('offline')]])});await assert.rejects(request(r,'/manifest.json','cors'));await assert.rejects(request(r,'/js/index.js','cors'));assert.equal((await request(r,'/data/private.json','cors')).status,404);
});
