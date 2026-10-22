const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = name => fs.readFileSync('js/' + name, 'utf8');
function localStore(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {getItem:k => values.get(k) ?? null, setItem:(k,v) => values.set(k,String(v)), removeItem:k => values.delete(k)};
}
test('legacy identifying fields are removed without touching books or folders', () => {
  const localStorage = localStore({'profileSchool':'school','profileRegion':'exact old address','profileClass':'class','bookTracker.books.v1':'saved books','bookTracker.folders.v1':'saved folders'});
  const context = {window:{addEventListener(){}},localStorage,console};
  vm.runInNewContext(source('sync.js'),context);
  assert.equal(localStorage.getItem('profileSchool'),null);
  assert.equal(localStorage.getItem('profileRegion'),null);
  assert.equal(localStorage.getItem('profileClass'),null);
  assert.equal(localStorage.getItem('bookTracker.books.v1'),'saved books');
  assert.equal(localStorage.getItem('bookTracker.folders.v1'),'saved folders');
  assert.equal(context.window.Sync.readLocalProfile().library_public,false);
  context.window.Sync.writeLocalProfile({city:null,district:null,library_public:false});
  assert.equal(localStorage.getItem('profilePrivacy'),'private');
});
test('new profile never imports OAuth real name',async () => {
  let saved;
  const SB={enabled:true,getProfile:async()=>null,getUser:async()=>({user_metadata:{full_name:'Real Name'}}),upsertProfile:async row => {saved=row; return row;}};
  const context={window:{SB,addEventListener(){}},localStorage:localStore(),console};
  vm.runInNewContext(source('sync.js'),context);
  await context.window.Sync.syncProfileOnSignIn();
  assert.equal(saved.nickname,'책읽는엄마');
  assert.equal(saved.library_public,false);
  assert.equal('school' in saved,false);
});
test('profile upsert cannot change ownership or persist school/address fields',async () => {
  let saved;
  const query={upsert:row=>{saved=row;return query},select:()=>query,single:async()=>({data:saved})};
  const client={auth:{getUser:async()=>({data:{user:{id:'owner'}}})},from:()=>query};
  const context={window:{supabase:{createClient:()=>client}},SUPABASE_URL:'https://example.test',SUPABASE_ANON_KEY:'test',console,setTimeout};
  vm.runInNewContext(source('supabase.js'),context);
  await context.window.SB.upsertProfile({id:'other',nickname:'reader',school:'school',address:'address',grade:'grade',library_public:true});
  assert.equal(saved.id,'owner');
  assert.equal(saved.privacy,'public');
  assert.equal(saved.library_public,true);
  assert.equal('school' in saved,false);
  assert.equal('address' in saved,false);
  assert.equal('grade' in saved,false);
});
test('global restored session syncs a profile before books without visiting share',async () => {
  let ready, callback, profileSyncs=0;
  const noop=()=>{};
  const el=()=>({style:{},setAttribute:noop,addEventListener:noop,appendChild:noop,innerHTML:'',textContent:''});
  const document={getElementById:()=>null,querySelector:()=>null,createElement:el,body:{appendChild:noop},head:{appendChild:noop},addEventListener:(event,cb)=>{if(event==='DOMContentLoaded')ready=cb;}};
  const window={SB:{enabled:true,getProfile:async()=>({id:'google-user',nickname:'책별명',library_public:false}),getUser:async()=>({id:'google-user'}),getSession:async()=>({user:{id:'google-user'}}),onAuthChange:cb=>{callback=cb;}},Sync:{syncProfileOnSignIn:async()=>{profileSyncs++;},pullBooks:async()=>{},pullFolders:async()=>{}},Storage:{getAllBooks:()=>[]}};
  vm.runInNewContext(source('auth-ui.js'),{window,document,localStorage:localStore(),console,setTimeout});
  ready();
  await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(profileSyncs,1);
  assert.equal(typeof callback,'function');
});

test('profile lookup distinguishes unavailable service from a new account',async () => {
  const error = new Error('offline');
  const query={select:()=>query,eq:()=>query,maybeSingle:async()=>({data:null,error})};
  const client={auth:{getUser:async()=>({data:{user:{id:'owner'}}})},from:()=>query};
  const context={window:{supabase:{createClient:()=>client}},SUPABASE_URL:'https://example.test',SUPABASE_ANON_KEY:'test',console:{warn(){}},setTimeout};
  vm.runInNewContext(source('supabase.js'),context);
  await assert.rejects(context.window.SB.getProfile(),/offline/);
});
test('profile auth lookup cannot redirect an A edit into a newly active B account',async()=>{
 let resolveUser,writes=0;
 const query={upsert:()=>{writes++;return query;},select:()=>query,single:async()=>({data:{id:'account-b'}})};
 const client={auth:{getUser:()=>new Promise(resolve=>{resolveUser=resolve;})},from:()=>query};
 const context={window:{supabase:{createClient:()=>client}},SUPABASE_URL:'https://example.test',SUPABASE_ANON_KEY:'test',console,setTimeout};
 vm.runInNewContext(source('supabase.js'),context);
 const pending=context.window.SB.upsertProfile({nickname:'A name',library_public:true},{expectedUserId:'account-a'});
 resolveUser({data:{user:{id:'account-b'}}});
 assert.equal(await pending,null);
 assert.equal(writes,0,'must refuse before any database write');
});
test('profile owner guard still allows an explicitly scoped edit for the matching account',async()=>{
 let saved;
 const query={upsert:row=>{saved=row;return query;},select:()=>query,single:async()=>({data:saved})};
 const client={auth:{getUser:async()=>({data:{user:{id:'account-a'}}})},from:()=>query};
 const context={window:{supabase:{createClient:()=>client}},SUPABASE_URL:'https://example.test',SUPABASE_ANON_KEY:'test',console,setTimeout};
 vm.runInNewContext(source('supabase.js'),context);
 const result=await context.window.SB.upsertProfile({nickname:'reader',library_public:false},{expectedUserId:'account-a'});
 assert.equal(result.id,'account-a');assert.equal(result.library_public,false);
});
