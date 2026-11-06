const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const full=fs.readFileSync('js/share.js','utf8');
const guard=full.slice(full.indexOf('  // Invalidate private previews/forms'),full.indexOf('  // ── 프로필 편집 모달'));
const editor=full.slice(full.indexOf('  function showProfileEditor('),full.indexOf('  // ── 공유 카드'));
const modalSource=full.slice(full.indexOf('  function _showShareCardModal('),full.indexOf('  function escapeAttr('));
function element(){return {listeners:{},style:{},dataset:{},disabled:false,addEventListener(k,fn){this.listeners[k]=fn},setAttribute(k,v){this[k]=v},focus(){},remove(){this.removed=true}};}
function setup(owner='A',avatar='https://example.test/avatar.jpg') {
  let active=owner, current=true, auth, downloads=0, shares=0, writes=[];
  const events={}, keys={}, nodes={}, revoked=[], created=[];
  const avatarButtons=Array.from({length:12},element), button=element(), form=element(), modal=element(), layout=element();
  layout.dataset.cardLayout='monthly';
  form.elements=Object.fromEntries(['nickname','city','district','goal'].map(key=>[key,Object.assign(element(),{value:key==='goal'?'20':key==='nickname'?'별명':''})]));
  form.querySelector=()=>button;
  modal.querySelector=selector=>selector==='form'?form:(nodes[selector] ||= element());
  modal.querySelectorAll=selector=>selector==='[data-profile-avatar]'?avatarButtons:selector.includes('data-card')?[layout]:[form.elements.nickname,button];
  const env={window:{Storage:{getOwner:()=>active,isOwnerCurrent:()=>current},SB:{enabled:true,onAuthChange(fn){auth=fn},getUser:async()=>({id:active}),upsertProfile:async profile=>({id:active,...profile})},Sync:{writeLocalProfile:row=>writes.push(row)},addEventListener(k,fn){events[k]=fn}},
    document:{activeElement:element(),body:{appendChild(){}},getElementById:()=>button,createElement:type=>type==='a'?{click(){downloads++},remove(){}}:modal,addEventListener(k,fn){keys[k]=fn},removeEventListener(k){delete keys[k]}},
    localStorage:{getItem:k=>k==='profileAvatar'?avatar:null},
    URL:{createObjectURL:blob=>{created.push(blob);return 'blob:next'},revokeObjectURL:url=>revoked.push(url)},
    navigator:{canShare:()=>true,share:async()=>{shares++}},File,
    Image:class{decode(){return Promise.resolve()}},
    myStats:{goalTarget:20},escapeAttr:String,escapeHtml:String,loadProfile(){},renderGoal(){},renderPublicLibraries(){},showToast(){}};
  vm.runInNewContext(guard+editor+modalSource+'\nthis.api={captureProfileOwner,isProfileOwnerCurrent,checkProfileOwner,showProfileEditor,_showShareCardModal};',env);
  return {env,api:env.api,events,keys,modal,form,button,nodes,avatarButtons,writes,revoked,created,layout,
    change(id){active=id;auth('SIGNED_IN',{user:{id}})},logout(){active=null;auth('SIGNED_OUT',null)},stale(){current=false},get downloads(){return downloads},get shares(){return shares}};
}
test('owner generation invalidates snapshots across switch-away/back but not same-account sign-in',()=>{
  const h=setup(),snapshot=h.api.captureProfileOwner();
  h.change('A');assert.equal(h.api.isProfileOwnerCurrent(snapshot),true);
  h.change('B');h.change('A');assert.equal(h.api.isProfileOwnerCurrent(snapshot),false);
});
test('stale share modal closes and blocks download/native share before exports',async()=>{
  for(const action of ['#shareCardDownload','#shareCardShare']) {
    const h=setup();h.api._showShareCardModal('blob:old',new Blob(['png']),'별명',async()=>new Blob(['next']));
    h.stale();await h.nodes[action].listeners.click();
    assert.equal(h.modal.removed,true);assert.equal(h.downloads,0);assert.equal(h.shares,0);assert.deepEqual(h.revoked,['blob:old']);
  }
});
test('logout closes share modal and revokes private preview URL',()=>{
  const h=setup();h.api._showShareCardModal('blob:old',new Blob(['png']),'별명',async()=>{});
  h.logout();assert.equal(h.modal.removed,true);assert.deepEqual(h.revoked,['blob:old']);
});
test('avatar changes stay in editor until Save, preserve original photo option, Cancel writes nothing',()=>{
  const h=setup(null);h.api.showProfileEditor();
  h.avatarButtons[2].listeners.click();assert.equal(h.writes.length,0);
  h.nodes['#profileCancel'].listeners.click();assert.equal(h.writes.length,0);
  assert.equal(h.avatarButtons[0].textContent,'📖');
});
test('saved emoji is included in guarded profile payload',async()=>{
  const h=setup(null);h.api.showProfileEditor();h.avatarButtons[2].listeners.click();
  await h.form.listeners.submit({preventDefault(){}});
  assert.equal(h.writes.length,1);assert.equal(h.writes[0].avatar,'👨');
});
test('switching accounts closes editor and stale submit cannot save',async()=>{
  const h=setup();h.api.showProfileEditor();h.change('B');h.change('A');
  await h.form.listeners.submit({preventDefault(){}});
  assert.equal(h.modal.removed,true);assert.equal(h.writes.length,0);
});
test('profile response after account switch cannot write to local profile',async()=>{
  const h=setup();let finish;
  h.env.window.SB.upsertProfile=()=>new Promise(resolve=>{finish=resolve});
  h.api.showProfileEditor();const saving=h.form.listeners.submit({preventDefault(){}});
  await new Promise(resolve=>setImmediate(resolve));h.change('B');finish({id:'A'});await saving;
  assert.equal(h.writes.length,0);assert.equal(h.modal.removed,true);
});
test('Escape closes profile editor and removes keyboard listener',()=>{
  const h=setup();h.api.showProfileEditor();let prevented=false;
  h.keys.keydown({key:'Escape',preventDefault(){prevented=true}});
  assert.equal(prevented,true);assert.equal(h.modal.removed,true);assert.equal(h.keys.keydown,undefined);
});

test('late regenerated card after logout never replaces or recreates the private preview',async()=>{
  const h=setup();let finish;
  h.api._showShareCardModal('blob:old',new Blob(['png']),'별명',()=>new Promise(resolve=>{finish=resolve}));
  h.layout.listeners.click();h.logout();finish(new Blob(['late']));
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(h.modal.removed,true);assert.equal(h.created.length,0);assert.deepEqual(h.revoked,['blob:old']);
});

test('saving without changing avatar preserves existing photo',async()=>{
  const h=setup(null);h.api.showProfileEditor();await h.form.listeners.submit({preventDefault(){}});
  assert.equal(h.writes[0].avatar,'https://example.test/avatar.jpg');
});
test('data image avatar is preserved but never passed as raw text to the avatar renderer',async()=>{
  const h=setup(null,'data:image/png;base64,private-image'),rendered=[];
  h.env.window.setAvatarEl=(button,value)=>rendered.push(value);
  h.api.showProfileEditor();
  assert.equal(rendered[0],'📖');assert.ok(!rendered.some(value=>value.startsWith('data:')));
  await h.form.listeners.submit({preventDefault(){}});
  assert.equal(h.writes[0].avatar,'data:image/png;base64,private-image');
});
test('Tab remains inside profile editor and closing restores trigger focus',()=>{
  const h=setup();let restored=false,focused=false,prevented=false;
  h.env.document.activeElement={focus(){restored=true}};
  h.api.showProfileEditor();h.env.document.activeElement=h.button;
  h.form.elements.nickname.focus=()=>{focused=true};
  h.keys.keydown({key:'Tab',shiftKey:false,preventDefault(){prevented=true}});
  assert.equal(prevented,true);assert.equal(focused,true);
  h.nodes['#profileCancel'].listeners.click();assert.equal(restored,true);
});
