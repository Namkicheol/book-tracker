const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function setup(lookup=async isbn=>({isbn,title:`Book ${isbn}`}), normalize=x=>x, customize=()=>{}) {
  const nodes=new Map();
  const node=id=>{if(!nodes.has(id))nodes.set(id,{value:'',textContent:'',innerHTML:'',handlers:{},addEventListener(k,fn){this.handlers[k]=fn;}});return nodes.get(id);};
  const books=Array.from({length:55},(_,i)=>({isbn:String(i),title:`Book ${i}`,author:'Writer',publisher:i%2?'A':'B',age:i%3?'younger':'',genre:i%2?'fiction':'science',language:i%2?'en':'ko',lists:i%2?['newbery-award']:['textbook'],ar:i===1?0:i===3?1:i===5?2:i===7?.5:null,arEvidence:i===1?{source:'https://example.org/ar-proof',checkedAt:'2026-10-24'}:undefined,discoverySource:i===5?'https://example.org/verified':undefined,arStatus:[1,3,5].includes(i)?'verified':i===7?'legacy':'unknown',stage:i===1?'reader':i===3?'picture':i===5?'chapter':undefined,topics:i===1?['animals']:i===3?['friendship']:[],series:[1,3].includes(i)?{id:'fixture-series',name:'Fixture Series',order:i===1?2:1}:undefined,thumbnail:'https://example.org/cover.jpg',textbookGrade:i%2?null:'1',awards:i===1?[{id:'newbery-award',year:2020,distinction:'Honor',source:'https://ala.org/'}]:[]}));
  customize(books);
  let init,calls=0;const previews=[];
  const window={BOOK_CATALOG:{books,meta:{sources:[{id:'newbery-award',name:'뉴베리 공식 수상 목록'},{id:'geisel-award',name:'가이젤상 공식 수상 목록'}]}},API:{aladinLookup:isbn=>{calls++;return lookup(isbn);},normalizeAladin:normalize},BookPreview:{show:book=>previews.push(book)}};
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
test('cover cards use verified award sources while textbook navigation uses grade metadata',()=>{
 const a=setup();assert.match(a.node('catalogList').innerHTML,/loading="lazy"/);
 a.node('catalogSource').value='newbery-award';a.node('catalogSource').handlers.change();assert.match(a.node('catalogStatus').textContent,/1권/);
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

test('English reading stages and interests combine without inventing tags',()=>{
 const a=setup();a.node('catalogTabs').handlers.click({target:{closest:()=>({dataset:{catalogTab:'english'}})}});
 a.node('catalogStage').value='reader';a.node('catalogTopic').value='animals';a.node('catalogTopic').handlers.change();assert.match(a.node('catalogStatus').textContent,/1권/);assert.match(a.node('catalogList').innerHTML,/Book 1</);
 a.node('catalogTopic').value='dinosaurs';a.node('catalogTopic').handlers.change();assert.match(a.node('catalogStatus').textContent,/조건에 맞는 책이 없어요/);
 a.node('catalogReset').handlers.click();assert.match(a.node('catalogStatus').textContent,/27권/);assert.equal(a.node('catalogEnglishFilters').hidden,false);
});
test('series display the first book before sequels and allow first or next book filtering',()=>{
 const a=setup();a.node('catalogTabs').handlers.click({target:{closest:()=>({dataset:{catalogTab:'english'}})}});a.node('catalogSeries').value='fixture-series';a.node('catalogSeries').handlers.change();
 assert.ok(a.node('catalogList').innerHTML.indexOf('Book 3</')<a.node('catalogList').innerHTML.indexOf('Book 1</'));assert.match(a.node('catalogList').innerHTML,/첫 권/);
 a.node('catalogSeriesStep').value='first';a.node('catalogSeriesStep').handlers.change();assert.match(a.node('catalogList').innerHTML,/Book 3</);assert.doesNotMatch(a.node('catalogList').innerHTML,/Book 1</);
 a.node('catalogSeriesStep').value='next';a.node('catalogSeriesStep').handlers.change();assert.match(a.node('catalogList').innerHTML,/Book 1</);
});
test('verified AR excludes legacy numeric values and exact award distinction is preserved',()=>{
 const a=setup();a.node('catalogTabs').handlers.click({target:{closest:()=>({dataset:{catalogTab:'english'}})}});a.node('catalogAr').value='b01';a.node('catalogAr').handlers.change();assert.doesNotMatch(a.node('catalogList').innerHTML,/Book 7</);
 a.node('catalogAr').value='';a.node('catalogAward').value='newbery-award';a.node('catalogDistinction').value='Honor';a.node('catalogDistinction').handlers.change();assert.match(a.node('catalogList').innerHTML,/Book 1</);
 a.node('catalogDistinction').value='Medal';a.node('catalogDistinction').handlers.change();assert.match(a.node('catalogStatus').textContent,/조건에 맞는 책이 없어요/);
});

test('English discovery entries appear first and stage options show exact counts',()=>{
 const a=setup();a.node('catalogTabs').handlers.click({target:{closest:()=>({dataset:{catalogTab:'english'}})}});
 assert.ok(a.node('catalogList').innerHTML.indexOf('Book 5</')<a.node('catalogList').innerHTML.indexOf('Book 1</'));assert.match(a.node('catalogStage').innerHTML,/리더스 \(1\)/);
 a.node('catalogAr').value='unknown';a.node('catalogAr').handlers.change();assert.match(a.node('catalogList').innerHTML,/Book 7</);assert.doesNotMatch(a.node('catalogList').innerHTML,/AR 0.5/);
});

test('verified AR and discovery evidence links are outside the book preview button',()=>{
 const a=setup();a.node('catalogTabs').handlers.click({target:{closest:()=>({dataset:{catalogTab:'english'}})}});a.node('catalogAr').value='b01';a.node('catalogAr').handlers.change();
 assert.match(a.node('catalogList').innerHTML,/<\/button><div class="catalog-evidence"><a href="https:\/\/example.org\/ar-proof"/);assert.match(a.node('catalogList').innerHTML,/AR 확인 출처/);
 a.node('catalogReset').handlers.click();assert.match(a.node('catalogList').innerHTML,/책·시리즈 출처/);
});

 test('numbered series and punctuation variation preserve exact ISBN title verification',async()=>{
 for(const [saved,actual] of [['Magic Tree House #02: The Knight at Dawn','Magic Tree House #2: The Knight at Dawn (Paperback)'],['Cam Jansen #01: The Mystery of the Stolen Diamonds','Cam Jansen #1: The Mystery of the Stolen Diamonds'],['Cam Jansen #4: The Mystery of the Television Dog','The Mystery of the Television Dog (Paperback)'],['Cam Jansen #2: The Mystery of the U.F.O.','Cam Jansen #02: The Mystery of the UFO']]){
 const a=setup(async isbn=>({isbn,title:actual}),x=>x,books=>books[2].title=saved);a.click('2');await tick();assert.equal(a.previews.length,1,saved);
 }
 const wrong=setup(async isbn=>({isbn,title:'Other Unrelated Book'}),x=>x,books=>books[2].title='Cam Jansen #4: The Mystery of the Television Dog');wrong.click('2');await tick();assert.equal(wrong.previews.length,0);
});
 test('Winner award facts are included in main award filter and Honor stays separate',()=>{
 const a=setup(undefined,undefined,books=>books[3].awards=[{id:'geisel-award',year:2024,distinction:'Winner',source:'https://www.ala.org/winner/'}]);
 a.node('catalogTabs').handlers.click({target:{closest:()=>({dataset:{catalogTab:'english'}})}});assert.match(a.node('catalogAward').innerHTML,/가이젤상 공식 수상 목록/);a.node('catalogAward').value='geisel-award';a.node('catalogDistinction').value='Medal';a.node('catalogDistinction').handlers.change();assert.match(a.node('catalogList').innerHTML,/Book 3</);a.node('catalogDistinction').value='Honor';a.node('catalogDistinction').handlers.change();assert.match(a.node('catalogStatus').textContent,/조건에 맞는 책이 없어요/);
});

test('top shortcuts select the requested catalog and expand award controls only when requested',()=>{
 const a=setup();const quick=value=>a.node('catalogQuickLinks').handlers.click({target:{closest:()=>({dataset:{catalogQuick:value}})}});
 quick('english');assert.equal(a.node('catalogEnglishFilters').hidden,false);assert.match(a.node('catalogStatus').textContent,/27권/);assert.equal(a.node('catalogEnglishAdvanced').open,false);
 quick('awards');assert.equal(a.node('catalogEnglishAdvanced').open,true);assert.match(a.node('catalogStatus').textContent,/27권/);
 quick('korean');assert.equal(a.node('catalogEnglishFilters').hidden,true);assert.match(a.node('catalogStatus').textContent,/28권/);
});
