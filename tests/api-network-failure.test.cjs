const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function runtime(file,{key='fixture-key',fetch}={}) {
 const signals=[],durations=[];
 const window={KAKAO_API_KEY:key,WORKER_URL:'https://worker.example',localStorage:{getItem:()=>null,setItem(){}}};
 const AbortSignal={timeout(ms){durations.push(ms);const c=new AbortController();signals.push(c);return c.signal;}};
 vm.runInNewContext(fs.readFileSync(file,'utf8'),{window,fetch,AbortSignal,URLSearchParams,console,Date,Set,Map,Math,JSON,localStorage:window.localStorage});
 return {window,signals,durations};
}
function stalledFetch(_url,{signal}) {return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(signal.reason)));}
function timeout(controller) {const e=new Error('timed out');e.name='TimeoutError';controller.abort(e);}
test('missing Kakao configuration never returns a fake saveable book or makes a request',async()=>{
 let calls=0;const a=runtime('js/api.js',{key:'',fetch:async()=>{calls++;}});
 await assert.rejects(a.window.API.searchByIsbn('9780306406157'),/책 검색 연결/);await assert.rejects(a.window.API.searchByTitle('책'),/책 검색 연결/);assert.equal(calls,0);
});
test('Kakao searches time out instead of keeping the scanner waiting',async()=>{
 const a=runtime('js/api.js',{fetch:stalledFetch});const result=a.window.API.searchByIsbn('9780306406157');assert.deepEqual(a.durations,[10000]);timeout(a.signals[0]);await assert.rejects(result,/검색 시간이 초과/);
});
test('Kakao request errors remain retryable and successful data is unchanged',async()=>{
 let fail=true;const a=runtime('js/api.js',{fetch:async()=>fail?{ok:false,status:503}:{ok:true,json:async()=>({documents:[{isbn:'9780306406157',title:'실제 응답',authors:['저자']}]})}});
 await assert.rejects(a.window.API.searchByTitle('책'),/다시 시도/);fail=false;const books=await a.window.API.searchByTitle('책');assert.equal(books[0].title,'실제 응답');assert.equal(books[0].isbn,'9780306406157');
});
test('library search and availability are both bounded',async()=>{
 const a=runtime('js/library-api.js',{fetch:stalledFetch});
 const search=a.window.LibraryAPI.searchLibraries('9780306406157',{region:'11'});timeout(a.signals[0]);await assert.rejects(search,/조회 시간이 초과/);
 const available=a.window.LibraryAPI.checkAvailability('9780306406157','one');timeout(a.signals[1]);await assert.rejects(available,/조회 시간이 초과/);assert.deepEqual(a.durations,[10000,10000]);
});
test('library errors are not mistaken for a successful empty or unavailable result',async()=>{
 const a=runtime('js/library-api.js',{fetch:async()=>({ok:false,status:500})});await assert.rejects(a.window.LibraryAPI.searchLibraries('9780306406157'),/다시 시도/);await assert.rejects(a.window.LibraryAPI.checkAvailability('9780306406157','one'),/다시 시도/);
});
