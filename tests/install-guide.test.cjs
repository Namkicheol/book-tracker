const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('js/install-guide.js','utf8');
function boot({ standalone=false, ios=false }={}) {
  const events = {}, elements = {};
  for (const id of ['installAppBtn','installStatus','installInstructions']) elements[id] = {hidden:false,disabled:false,textContent:'',addEventListener(type,fn){this[type]=fn;}};
  const media = {matches:standalone,addEventListener(type,fn){this[type]=fn;}};
  const context = {window:{matchMedia:()=>media,addEventListener:(type,fn)=>events[type]=fn},navigator:{standalone:ios},document:{addEventListener:(type,fn)=>events[type]=fn,getElementById:id=>elements[id]}};
  vm.runInNewContext(source,context);
  events.DOMContentLoaded();
  return {events,elements,media};
}
test('unsupported browsers show instructions without an install button or automatic prompt',()=>{
  const {elements}=boot();
  assert.equal(elements.installAppBtn.hidden,true);
  assert.equal(elements.installInstructions.hidden,false);
});
test('deferred prompt is only called by explicit button click and consumed once',async()=>{
  const {events,elements}=boot();let prompts=0,prevented=0;
  events.beforeinstallprompt({preventDefault(){prevented++},prompt:async()=>{prompts++},userChoice:Promise.resolve({outcome:'dismissed'})});
  assert.equal(prompts,0);assert.equal(prevented,1);assert.equal(elements.installAppBtn.hidden,false);
  await elements.installAppBtn.click();await elements.installAppBtn.click();
  assert.equal(prompts,1);assert.equal(elements.installAppBtn.hidden,true);assert.match(elements.installStatus.textContent,/나중에/);
});
test('accepted prompt does not claim installation before browser confirmation',async()=>{
  const {events,elements}=boot();
  events.beforeinstallprompt({preventDefault(){},prompt:async()=>{},userChoice:Promise.resolve({outcome:'accepted'})});
  await elements.installAppBtn.click();assert.match(elements.installStatus.textContent,/요청/);
  events.appinstalled();assert.equal(elements.installInstructions.hidden,true);assert.match(elements.installStatus.textContent,/추가됐어요/);
});
test('standalone and iOS installed launches hide instructions and install action',()=>{
  for(const options of [{standalone:true},{ios:true}]) {
    const {elements}=boot(options);assert.equal(elements.installAppBtn.hidden,true);assert.equal(elements.installInstructions.hidden,true);assert.match(elements.installStatus.textContent,/사용 중/);
  }
});
test('prompt failure returns to manual instructions without claiming success',async()=>{
  const {events,elements}=boot();events.beforeinstallprompt({preventDefault(){},prompt:async()=>{throw Error('failed')}});
  await elements.installAppBtn.click();assert.match(elements.installStatus.textContent,/열지 못했어요/);assert.equal(elements.installAppBtn.disabled,false);assert.equal(elements.installInstructions.hidden,false);
});
