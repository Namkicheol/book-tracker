const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup({onboarding=false,privacy='false',profile={},save}={}){
 const values=new Map([['profileLibraryPublic',privacy]]),elements=new Map();
 function el(){return {style:{},dataset:{},listeners:{},children:[],value:'',checked:false,disabled:false,appendChild(x){this.children.push(x);if(x.id)elements.set(x.id,x);},setAttribute(){},addEventListener(k,f){this.listeners[k]=f;},querySelector(s){return this.nodes?.get(s)||null;},querySelectorAll(){return [];},remove(){if(this.id)elements.delete(this.id);},focus(){}};}
 const document={getElementById:id=>elements.get(id)||null,addEventListener(){},querySelector(){return null;},head:el(),body:el(),createElement(){const e=el();Object.defineProperty(e,'innerHTML',{get(){return this.html||'';},set(html){this.html=html;this.nodes=new Map();for(const match of html.matchAll(/<(input|button|select|div|p|span)[^>]*id="([^"]+)"[^>]*>/g)){const n=el(),tag=match[0];n.value=tag.match(/value="([^"]*)"/)?.[1]||'';n.checked=/ checked/.test(tag);this.nodes.set('#'+match[2],n);}this.nodes.set('details',el());}});return e;}};
 let user={id:'u',user_metadata:{full_name:'Real Name'},app_metadata:{provider:'google'}};
 const calls=[];const window={Storage:{getAllBooksRaw:()=>[],getAllFoldersRaw:()=>[],getAllBooks:()=>[],getAllFolders:()=>[]},Sync:{setOwner:()=>false,syncProfileOnSignIn:async()=>{},pullBooks:async()=>true,pullFolders:async()=>true,flushOutbox:async()=>{}},REGIONS:{서울:['강남구','종로구'],세종:[]},SB:{enabled:true,getProfile:async()=>{if(profile instanceof Error)throw profile;return profile;},getSession:async()=>({user}),upsertProfile:async p=>{calls.push(p);const result=save?save(p):p;if(result)profile=result;return result;},signOut:async()=>{user=null;return {error:null};}}};
 const localStorage={length:0,getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 vm.runInNewContext(fs.readFileSync('js/auth-ui.js','utf8').replace('  window.AuthUI = {','  window.testSignIn = handleSignIn;\n  window.AuthUI = {'),{document,window,localStorage,console,setTimeout(){},alert(){},confirm(){return true;}});
 return {setUser:next=>user=next,window,handle:()=>window.testSignIn(user),elements,async open(){await window.AuthUI.showProfileViewer({onboarding});return elements.get('authProfileModal');},calls,values};
}
test('new setup starts with an empty nickname and public radio but performs no publication',async()=>{const a=setup({onboarding:true}),m=await a.open();assert.equal(m.querySelector('#apvName').value,'');assert.equal(m.querySelector('#apvPublic').checked,true);assert.equal(m.querySelector('#apvCity').disabled,false);assert.equal(a.calls.length,0);assert.doesNotMatch(m.innerHTML,/Real Name/);assert.match(m.innerHTML,/독서감상은 제외/);});
test('existing private preference survives profile reopening',async()=>{const a=setup(),m=await a.open();assert.equal(m.querySelector('#apvPublic').checked,false);assert.equal(m.querySelector('#apvPrivate').checked,true);});
test('region validation blocks invalid city district pairs before server writes',async()=>{const a=setup(),m=await a.open();m.querySelector('#apvName').value='별명';m.querySelector('#apvCity').value='서울';m.querySelector('#apvDistrict').value='다른구';await m.querySelector('#apvSave').listeners.click();assert.equal(a.calls.length,0);assert.match(m.querySelector('#apvError').textContent,/다시 선택/);});
test('only a confirmed server save applies nickname region and explicit public choice locally',async()=>{const a=setup({onboarding:true}),m=await a.open();m.querySelector('#apvName').value='책토끼';m.querySelector('#apvCity').value='서울';m.querySelector('#apvDistrict').value='강남구';await m.querySelector('#apvSave').listeners.click();assert.equal(a.calls[0].library_public,true);assert.equal(a.calls[0].public_nickname,'책토끼');assert.equal(a.values.get('profileName'),'책토끼');assert.equal(a.values.get('profileCity'),'서울');assert.equal(m.querySelector('#apvSave').dataset.saved,'1');});
test('failed server save leaves private local preference unchanged and never claims success',async()=>{const a=setup({onboarding:true,save:()=>null}),m=await a.open();m.querySelector('#apvName').value='책토끼';await m.querySelector('#apvSave').listeners.click();assert.equal(a.values.get('profileLibraryPublic'),'false');assert.equal(m.querySelector('#apvSave').dataset.saved,'');assert.equal(m.querySelector('#apvSave').disabled,false);assert.match(m.querySelector('#apvError').textContent,/저장하지 못했어요/);});

test('initial account detection opens setup only for an absent server profile',async()=>{
 const fresh=setup({profile:null});const pending=fresh.handle();await new Promise(resolve=>setImmediate(resolve));assert.equal(fresh.values.get('_profileSetupPending_u'),'1');assert.ok(fresh.elements.get('authProfileModal'));assert.equal(fresh.calls.length,0);fresh.elements.get('authProfileModal').querySelector('#apvCancel').listeners.click();await pending;
 const existing=setup({profile:{nickname:'별명',library_public:false}});await existing.handle();assert.equal(existing.elements.has('authProfileModal'),false);assert.equal(existing.values.has('_profileSetupPending_u'),false);
});

test('a setup marker for another account cannot trigger setup for the current existing account',async()=>{
 const a=setup({profile:{nickname:'기존별명',library_public:false}});a.values.set('_profileSetupPending_other','1');await a.handle();assert.equal(a.elements.has('authProfileModal'),false);assert.equal(a.values.get('_profileSetupPending_other'),'1');
});

test('profile lookup errors offer an explicit retry without creating setup or public writes',async()=>{
 const a=setup({profile:new Error('offline')});await a.handle();assert.ok(a.elements.get('authSetupRetry'));assert.equal(a.elements.has('authProfileModal'),false);assert.equal(a.calls.length,0);assert.equal(a.values.has('_profileSetupPending_u'),false);
});
test('account sync waits until setup is saved and never opens an import prompt',async()=>{
 const a=setup({profile:null});a.window.Storage.getAllBooks=()=>[{id:'book'}];
 let pending=a.handle();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(a.elements.has('syncConsentModal'),false);
 a.elements.get('authProfileModal').querySelector('#apvCancel').listeners.click();await pending;
 assert.equal(a.values.get('_profileSetupPending_u'),'1');
 pending=a.handle();await new Promise(resolve=>setImmediate(resolve));const m=a.elements.get('authProfileModal');assert.ok(m);m.querySelector('#apvName').value='책토끼';await m.querySelector('#apvSave').listeners.click();m.querySelector('#apvClose').listeners.click();await pending;
 assert.equal(a.values.has('_profileSetupPending_u'),false);assert.equal(a.elements.has('syncConsentModal'),false);assert.equal(a.values.get('_syncUploaded_u'),'1');
});


test('cancelled setup resumes account sync after profile is reopened and saved',async()=>{
 const a=setup({profile:null});let pulls=0,flushes=0;a.window.Sync.pullBooks=async()=>{pulls++;return true;};a.window.Sync.flushOutbox=async()=>{flushes++;};
 const pending=a.handle();await new Promise(r=>setImmediate(r));a.elements.get('authProfileModal').querySelector('#apvCancel').listeners.click();await pending;
 const m=await a.open();m.querySelector('#apvName').value='돌아온 별명';await m.querySelector('#apvSave').listeners.click();
 assert.equal(a.values.has('_profileSetupPending_u'),false);assert.equal(a.values.get('_syncUploaded_u'),'1');assert.equal(pulls,1);assert.equal(flushes,1);
});
test('default server profile still needs nickname setup on a fresh browser',async()=>{
 const a=setup({profile:{nickname:'책읽는엄마',public_nickname:null,library_public:false}});const pending=a.handle();await new Promise(r=>setImmediate(r));
 const m=a.elements.get('authProfileModal');assert.ok(m);assert.equal(m.querySelector('#apvName').value,'');assert.equal(a.values.get('_profileSetupPending_u'),'1');m.querySelector('#apvCancel').listeners.click();await pending;
});
test('explicit default nickname and legacy distinct nicknames remain completed',async()=>{
 for(const profile of [{nickname:'책읽는엄마',public_nickname:'책읽는엄마'},{nickname:'기존 별명',public_nickname:null}]){
  const a=setup({profile});a.values.set('_profileSetupPending_u','1');await a.handle();assert.equal(a.elements.has('authProfileModal'),false);assert.equal(a.values.get('_syncUploaded_u'),'1');assert.equal(a.values.has('_profileSetupPending_u'),false);
 }
});
test('profile save cannot resume sync after the active account changes',async()=>{
 const a=setup({profile:null});const m=await a.open();a.setUser({id:'other'});m.querySelector('#apvName').value='이전 별명';await m.querySelector('#apvSave').listeners.click();assert.equal(a.calls.length,0);assert.equal(a.values.has('_syncUploaded_u'),false);assert.match(m.querySelector('#apvError').textContent,/저장하지 못했어요/);
});
test('logout reports an SDK error and keeps the profile dialog open',async()=>{
 const a=setup(),m=await a.open();a.window.SB.signOut=async()=>({error:new Error('offline')});await m.querySelector('#apvLogout').listeners.click();assert.ok(a.elements.get('authProfileModal'));assert.match(m.querySelector('#apvError').textContent,/로그아웃을 완료하지 못했어요/);assert.equal(m.querySelector('#apvLogout').disabled,false);
});
test('logout checks remaining session and closes only after it is gone',async()=>{
 const a=setup(),m=await a.open();a.window.SB.signOut=async()=>({error:null});await m.querySelector('#apvLogout').listeners.click();assert.ok(a.elements.get('authProfileModal'));a.window.SB.signOut=async()=>{a.setUser(null);return {error:null};};await m.querySelector('#apvLogout').listeners.click();assert.equal(a.elements.has('authProfileModal'),false);
});
test('stale profile logout cannot sign out a different account',async()=>{
 const a=setup(),m=await a.open();let calls=0;a.window.SB.signOut=async()=>{calls++;};a.setUser({id:'other'});await m.querySelector('#apvLogout').listeners.click();assert.equal(calls,0);assert.ok(a.elements.get('authProfileModal'));
});
test('monthly goal is capped at the displayed maximum',async()=>{
 const a=setup(),m=await a.open();m.querySelector('#apvName').value='별명';m.querySelector('#apvGoal').value='999';await m.querySelector('#apvSave').listeners.click();assert.equal(a.calls[0].monthly_goal,200);
});

test('a profile lookup finishing after an account switch cannot open setup for the new account',async()=>{
 let finishLookup;
 const a=setup({profile:new Promise(resolve=>{finishLookup=resolve;})});
 let profileSyncs=0;a.window.Sync.syncProfileOnSignIn=async()=>{profileSyncs++;};
 const pending=a.handle();await new Promise(resolve=>setImmediate(resolve));
 a.setUser({id:'other'});finishLookup(null);
 await new Promise(resolve=>setImmediate(resolve));
 const opened=a.elements.has('authProfileModal');
 if(opened)a.elements.get('authProfileModal').querySelector('#apvCancel').listeners.click();
 await pending;
 assert.equal(opened,false);
 assert.equal(profileSyncs,0);
 assert.equal(a.values.has('_profileSetupPending_u'),false);
});

test('profile sync finishing after an account switch cannot open setup for the new account',async()=>{
 const a=setup({profile:null});let finishSync;
 a.window.Sync.syncProfileOnSignIn=()=>new Promise(resolve=>{finishSync=resolve;});
 const pending=a.handle();await new Promise(resolve=>setImmediate(resolve));
 a.setUser({id:'other'});finishSync();
 await new Promise(resolve=>setImmediate(resolve));
 const opened=a.elements.has('authProfileModal');
 if(opened)a.elements.get('authProfileModal').querySelector('#apvCancel').listeners.click();
 await pending;
 assert.equal(opened,false);
 assert.equal(a.values.has('_profileSetupPending_other'),false);
});
