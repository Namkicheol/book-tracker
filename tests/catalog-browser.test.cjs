const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function setup(lookup=async isbn=>({isbn,title:`Book ${isbn}`}), normalize=x=>x) {
  const nodes=new Map();
  const node=id=>{if(!nodes.has(id))nodes.set(id,{value:'',textContent:'',innerHTML:'',handlers:{},addEventListener(k,fn){this.handlers[k]=fn;}});return nodes.get(id);};
  const books=Array.from({length:55},(_,i)=>({isbn:String(i),title:`Book ${i}`,author:'Writer',publisher:i%2?'A':'B',age:i%3?'younger':'',genre:i%2?'fiction':'science',language:i%2?'en':'ko',lists:i%2?['newbery-award']:['textbook'],ar:i===1?0:i===3?1:i===5?2:null,thumbnail:'https://example.org/cover.jpg',awards:i===1?[{id:'newbery-award',year:2020,distinction:'Honor',source:'https://ala.org/'}]:[]}));
  let init,calls=0;const previews=[];
  const window={BOOK_CATALOG:{books},API:{aladinLookup:isbn=>{calls++;return lookup(isbn);},normalizeAladin:normalize},BookPreview:{show:book=>previews.push(book)}};
  vm.runInNewContext(fs.readFileSync('js/catalog-browser.js','utf8'),{window,document:{querySelectorAll:()=>[],getElementById:node,addEventListener(k,fn){init=fn;}}});init();
  const click=isbn=>node('catalogList').handlers.click({target:{closest:()=>({dataset:{catalogIsbn:isbn}})}});
  return {node,click,previews,calls:()=>calls};
}
const tick=()=>new Promise(r=>setImmediate(r));
test('all books browse locally, 24 per page, without initial API calls',()=>{const a=setup();assert.equal(a.calls(),0);assert.equal((a.node('catalogList').innerHTML.match(/<li>/g)||[]).length,24);assert.match(a.node('catalogStatus').textContent,/55권 · 1 \/ 3/);a.node('catalogNext').handlers.click();assert.match(a.node('catalogList').innerHTML,/Book 24</);a.node('catalogNext').handlers.click();assert.equal((a.node('catalogList').innerHTML.match(/<li>/g)||[]).length,7);assert.equal(a.node('catalogNext').disabled,true);});
test('search, age, genre, publisher filters combine and reset page',()=>{const a=setup();a.node('catalogQuery').value='Writer';a.node('catalogAge').value='__unclassified';a.node('catalogGenre').value='science';a.node('catalogPublisher').value='B';a.node('catalogAge').handlers.change();assert.match(a.node('catalogStatus').textContent,/10권/);assert.doesNotMatch(a.node('catalogList').innerHTML,/Book 1</);a.node('catalogQuery').value='absent';a.node('catalogQuery').handlers.input();assert.match(a.node('catalogStatus').textContent,/조건에 맞는 책이 없어요/);a.node('catalogReset').handlers.click();assert.match(a.node('catalogStatus').textContent,/55권/);});
test('opens only exact ISBN and matching title; failures remain retryable',async()=>{let fail=true;const a=setup(async isbn=>{if(fail)throw Error('offline');return {isbn,title:`Book ${isbn}`};});a.click('2');await tick();assert.match(a.node('catalogActionStatus').textContent,/다시 눌러/);fail=false;a.click('2');await tick();assert.equal(a.previews.length,1);const wrong=setup(async()=>({isbn:'other',title:'Book 2'}));wrong.click('2');await tick();assert.equal(wrong.previews.length,0);assert.match(wrong.node('catalogActionStatus').textContent,/일치하지/);const title=setup(async isbn=>({isbn,title:'Different'}));title.click('2');await tick();assert.equal(title.previews.length,0);});
test('late detail responses cannot replace the latest book selection',async()=>{const pending=[];const a=setup(isbn=>new Promise(r=>pending.push(()=>r({isbn,title:`Book ${isbn}`}))));a.click('1');a.click('2');pending[1]();await tick();pending[0]();await tick();assert.equal(a.previews.length,1);assert.equal(a.previews[0].isbn,'2');});

test('English AR intervals include zero, have exact boundaries, and combine award filters',()=>{
 const a=setup();
 a.node('catalogTabs').handlers.click({target:{closest:()=>({dataset:{catalogTab:'english'}})}});
 assert.match(a.node('catalogStatus').textContent,/27권/);
 a.node('catalogAr').value='b01';a.node('catalogAr').handlers.change();
 assert.match(a.node('catalogList').innerHTML,/Book 1</);assert.doesNotMatch(a.node('catalogList').innerHTML,/Book 3</);
 a.node('catalogAr').value='b12';a.node('catalogAr').handlers.change();assert.match(a.node('catalogList').innerHTML,/Book 3</);
 a.node('catalogAr').value='unknown';a.node('catalogAr').handlers.change();assert.match(a.node('catalogStatus').textContent,/24권/);
 a.node('catalogAr').value='';a.node('catalogAward').value='caldecott-award';a.node('catalogAward').handlers.change();assert.match(a.node('catalogStatus').textContent,/조건に|조건에 맞는 책이 없어요/);
 assert.equal(a.calls(),0);
});
test('cover cards render lazy images and source/textbook filters use stored memberships',()=>{
 const a=setup();assert.match(a.node('catalogList').innerHTML,/loading="lazy"/);
 a.node('catalogSource').value='textbook';a.node('catalogSource').handlers.change();assert.match(a.node('catalogStatus').textContent,/28권/);
 a.node('catalogTabs').handlers.click({target:{closest:()=>({dataset:{catalogTab:'textbook'}})}});assert.match(a.node('catalogStatus').textContent,/28권/);
});

test('English awards prefer verified award records over legacy list labels and preserve Honor',()=>{
 const a=setup();a.node('catalogTabs').handlers.click({target:{closest:()=>({dataset:{catalogTab:'english'}})}});
 a.node('catalogAward').value='newbery-award';a.node('catalogAward').handlers.change();
 assert.match(a.node('catalogStatus').textContent,/1권/);assert.match(a.node('catalogList').innerHTML,/뉴베리 2020 Honor/);assert.doesNotMatch(a.node('catalogList').innerHTML,/Book 3</);
});

test('catalog preserves English main titles before a subtitle colon',async()=>{
 const a=setup(async isbn=>({isbn,title:`Book ${isbn}: A Story`}), raw=>({...raw,title:'A Story'}));
 a.click('2');await tick();assert.equal(a.previews.length,1);assert.equal(a.previews[0].title,'Book 2: A Story');
});
