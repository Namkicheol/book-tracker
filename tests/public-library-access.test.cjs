const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup({publicMember=false,delayed=false}={}){
 let isPublic=publicMember,calls=0,resolveLibraries,removed=0;
 const list={textContent:'',innerHTML:'',children:[],appendChild(x){this.children.push(x);}};
 const document={getElementById:()=>list,querySelectorAll:()=>[{remove(){removed++;}}],createElement:()=>({style:{},addEventListener(){}})};
 const window={SB:{enabled:true,getUser:async()=>({id:'self'}),getProfile:async()=>({id:'self',library_public:isPublic}),getPublicLibraries:async()=>{calls++;return delayed?new Promise(r=>{resolveLibraries=r;}):[];}}};
 const full=fs.readFileSync('js/share.js','utf8');const segment=full.slice(full.indexOf('  let publicLibraryRequest'),full.indexOf('  async function showPublicLibrary('));
 const context={window,document,currentTab:'all',localStorage:{getItem:()=>null},showLoginPicker(){}};
 vm.runInNewContext(segment+'\nwindow.render=renderPublicLibraries;',context);
 return {render:window.render,list,calls:()=>calls,removed:()=>removed,revoke(){isPublic=false;},resolve(){resolveLibraries([]);}};
}
test('private members receive a settings link without querying other libraries',async()=>{const a=setup();await a.render();assert.equal(a.calls(),0);assert.match(a.list.textContent,/비공개 상태에서는 볼 수 없습니다/);assert.equal(a.list.children[0].href,'settings.html');assert.ok(a.removed()>0);});
test('public membership is checked on the server before querying libraries',async()=>{const a=setup({publicMember:true});await a.render();assert.equal(a.calls(),1);assert.match(a.list.textContent,/아직 공개한 서재가 없어요/);});
test('revoking public membership while a request is pending cannot render its results',async()=>{const a=setup({publicMember:true,delayed:true});const pending=a.render();await new Promise(r=>setImmediate(r));assert.equal(a.calls(),1);a.revoke();a.resolve();await pending;assert.match(a.list.textContent,/비공개 상태에서는 볼 수 없습니다/);});
