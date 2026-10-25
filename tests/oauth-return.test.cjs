const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function boot(pathname) {
  const calls=[];
  const window={location:{origin:'https://moms.test',pathname,search:'?id=guest-book&code=old',hash:'#access_token=old'},supabase:{createClient:()=>({auth:{signInWithOAuth:async options=>{calls.push(options);return {error:null};}}})}};
  vm.runInNewContext(fs.readFileSync('js/supabase.js','utf8'),{window,SUPABASE_URL:'https://test.invalid',SUPABASE_ANON_KEY:'fixture',console,alert(){}});
  return {sb:window.SB,calls};
}
test('detail login returns to the authenticated library without the previous account book id',async()=>{
  for(const provider of ['signInWithKakao','signInWithGoogle']) {
    const {sb,calls}=boot('/detail.html');await sb[provider]();
    assert.equal(calls[0].options.redirectTo,'https://moms.test/index.html');
  }
});
test('other pages retain their path without forwarding OAuth parameters or fragments',async()=>{
  const {sb,calls}=boot('/recommendations.html');await sb.signInWithGoogle();
  assert.equal(calls[0].options.redirectTo,'https://moms.test/recommendations.html');
  assert.equal(calls[0].options.scopes,undefined);
});
test('nested detail URLs remain on the same app origin and directory',async()=>{
  const {sb,calls}=boot('/app/detail.html');await sb.signInWithKakao();
  assert.equal(calls[0].options.redirectTo,'https://moms.test/app/index.html');
  assert.equal(calls[0].options.scopes,'profile_nickname profile_image');
});
