const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

// Use Python's independent HTML parser as a small DOMParser adapter in Node.
// This tests text export without requiring a browser dependency in this static app.
class DOMParserAdapter {
  parseFromString(html) {
    const script = `import sys,json
from html.parser import HTMLParser
class Text(HTMLParser):
 def __init__(self): super().__init__(convert_charrefs=True); self.parts=[]; self.skip=0
 def handle_starttag(self,tag,attrs):
  if tag in ('script','style','iframe','object'): self.skip+=1
 def handle_endtag(self,tag):
  if tag in ('script','style','iframe','object') and self.skip: self.skip-=1
 def handle_data(self,data):
  if not self.skip: self.parts.append(data)
p=Text();p.feed(sys.stdin.read());print(json.dumps(''.join(p.parts)))`;
    const text = JSON.parse(execFileSync('python3', ['-c', script], { input: html, encoding: 'utf8' }));
    return { body: { textContent: text }, querySelectorAll() { return []; } };
  }
}
function runtime(books = [], persisted = {}, imagesLoad = false) {
  const drawn = [];
  const textPositions = [];
  const imageDraws = [];
  const context2d = new Proxy({ font: '', fillRect() {}, drawImage(...args) { imageDraws.push(args); }, fillText(text,x,y) { drawn.push(text); textPositions.push({text,x,y}); }, measureText(text) { return { width: [...text].length * 24 }; } }, { get(target,key) { return key in target ? target[key] : () => {}; } });
  const context = {
    window: { addEventListener() {} },
    document: { addEventListener() {}, fonts: { ready: Promise.resolve() }, createElement() { return { width: 0, height: 0, getContext() { return context2d; } }; } },
    Storage: { getAllBooks() { return books; } }, localStorage: { getItem(key) { return persisted[key] ?? null; }, setItem(key,value) { persisted[key] = value; } },
    DOMParser: DOMParserAdapter, Image: class { set src(value) { this.source=value; this.width=2048; this.height=value.includes('mature-trees') ? 683 : 1366; imagesLoad ? this.onload() : this.onerror(); } },
    setTimeout, clearTimeout, navigator: {}
  };
  vm.createContext(context);
  for (const file of ['garden.js', 'journal-export.js', 'share-template-new.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', file), 'utf8'), context);
  }
  return { ...context.window, drawn, textPositions, imageDraws };
}

test('garden uses actual unique completed books, with milestone boundaries', () => {
  const { ReadingGarden: garden } = runtime();
  assert.equal(garden.progress([]).stage, 0);
  assert.equal(garden.progress([{ id: '1', isbn: '9781' }, { id: '2', isbn: '9781' }, { id: '3', status: 'want' }, { id: '4', status: 'reading' }]).count, 1);
  assert.equal(garden.progress([{ id: '1' }, { id: '1' }]).count, 1);
  for (const [count, stage, next] of [[0,0,1],[1,1,3],[3,2,5],[5,3,10],[10,4,20],[19,4,20],[20,5,null],[100,5,null]]) {
    const actual = garden.progress(Array.from({ length: count }, (_, id) => ({ id })));
    assert.deepEqual(JSON.parse(JSON.stringify(actual)), { count, stage, next });
  }
});

test('journal exports rich review text, line breaks and decoded entities without markup', () => {
  const { ReadingJournal: journal } = runtime();
  const review = '<div>첫 줄 <b>강조</b> &amp; 마음</div><p>다음 줄<br>마지막 줄</p><script>private()</script>';
  assert.equal(journal.plainReview(review), '첫 줄 강조 & 마음\n다음 줄\n마지막 줄');
  const book = { title: '<unsafe>', authors: ['A & B'], readDate: '2026-10-20', rating: 4, review };
  const html = journal.printMarkup([book], '전체');
  assert.ok(html.includes('&lt;unsafe&gt;'));
  assert.ok(html.includes('첫 줄 강조 &amp; 마음\n다음 줄\n마지막 줄'));
  assert.ok(!html.includes('private()'));
  assert.ok(!html.includes('&lt;div&gt;'));
  assert.ok(journal.csv([book]).includes('첫 줄 강조 & 마음\n다음 줄\n마지막 줄'));
});

test('CSV protects formula cells, quotes, newlines and keeps Korean BOM', () => {
  const { ReadingJournal: journal } = runtime();
  const csv = journal.csv([{ title: '=SUM(A1)', authors: ['작가,"이름"'], review: '첫줄\n둘째줄' }]);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes("\"'=SUM(A1)\""));
  assert.ok(csv.includes('"작가,""이름"""'));
  assert.ok(csv.includes('첫줄\n둘째줄'));
});

test('period selection uses read dates, sorts newest first, never substitutes creation date', () => {
  const { ReadingJournal: journal } = runtime([{ id:'a',readDate:'2026-10-02' }, { id:'b',readDate:'2026-10-20' }, { id:'c',createdAt:'2026-10-20' }]);
  assert.deepEqual(Array.from(journal.selectedBooks('2026-10'), b => b.id), ['b', 'a']);
  assert.equal(journal.selectedBooks('all').length, 3);
  assert.equal(journal.selectedBooks('2025-01').length, 0);
  assert.ok(journal.printMarkup([{ title:'책' }], '전체').includes('읽은 날짜 미기록'));
});

test('PNG retains complete long text when artwork fails and caps oversized canvases', async () => {
  const app = runtime();
  const review = '가'.repeat(3000);
  const canvas = await app.generateInstagramTemplate({ title:'긴 제목'.repeat(30), author:'작가' },review,4,1);
  assert.ok(canvas.height > 1350 && canvas.height <= 8000);
  assert.ok(app.drawn.join('').includes(review));
  assert.ok(app.drawn.includes('★★★★☆'));
  assert.equal(Object.keys(app.INSTAGRAM_TEMPLATES).length, 9);
  await assert.rejects(app.generateInstagramTemplate({ title:'책' }, '가'.repeat(20000),5,1), /PDF/);
});

test('stats count only completed books and never present a creation date as reading', () => {
  const today = new Date();
  const date = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  function renderStats(books) {
    const nodes = new Map();
    const node = id => {
      if (!nodes.has(id)) nodes.set(id, { textContent:'', innerHTML:'',style:{},classList:{remove(){}},addEventListener(){},querySelectorAll(){return [];} });
      return nodes.get(id);
    };
    let onReady;
    const context = { window:{},document:{addEventListener(_,callback){onReady=callback;},getElementById:node,querySelectorAll(){return [];}},Storage:{getAllBooks(){return books;},getAllFolders(){return [];}} };
    vm.createContext(context);
    vm.runInContext(fs.readFileSync(path.join(__dirname,'..','js','stats.js'),'utf8'), context);
    onReady();
    return node;
  }
  const node = renderStats([
    { id:'done',readDate:date,rating:4 },
    { id:'undated',createdAt:date+'T10:00:00Z' },
    { id:'invalid',readDate:'2026-02-31' },
    { id:'wishlist',status:'want',readDate:date,rating:5 },
    { id:'reading',status:'reading',createdAt:date+'T10:00:00Z',rating:1 }
  ]);
  assert.equal(node('totalBooks').textContent,3);
  assert.equal(node('thisMonthBooks').textContent,1);
  assert.equal(node('avgRating').textContent,'4.0');
  assert.equal(node('statusWant').textContent,1);
  assert.equal(node('statusReading').textContent,1);
  assert.equal(node('statusRead').textContent,3);
  assert.equal(node('streakTotal').textContent,1);
  const onlyWant = renderStats([{status:'want',createdAt:date+'T10:00:00Z'}]);
  assert.equal(onlyWant('totalBooks').textContent,0);
  assert.equal(onlyWant('thisMonthBooks').textContent,0);
  assert.equal(onlyWant('statusWant').textContent,1);
});


test('watering is earned once per completed book and cannot be farmed by re-adding ISBN', () => {
  const persisted = { 'bookTracker.garden.v1': 'flower' };
  const { ReadingGarden: game } = runtime([],persisted);
  const original = { id:'first',isbn:'1234567890 9781234567890' };
  const replacement = { id:'second',isbn:'9781234567890' };
  assert.equal(game.availableWater([original,replacement]).length,1);
  assert.equal(game.water([original]),true);
  assert.equal(game.water([replacement]),false);
  assert.equal(game.availableWater([]).length,0);
  assert.equal(game.availableWater([{id:'reading',status:'reading'},{id:'want',status:'want'}]).length,0);
  assert.equal(persisted['bookTracker.garden.v1'],'flower');
  assert.equal(game.availableWater([{id:'new',isbn:'9782222222222'}]).length,1);
  const restored = runtime([],persisted).ReadingGarden;
  assert.equal(restored.water([replacement]),false);
  assert.equal(restored.progress([original,replacement]).count,1);
  assert.equal(game.progress([{id:'existing',isbn:'9783333333333'}]).stage,1);
});

test('garden retains mature trees and assigns each new tree a persistent seed', () => {
  const persisted = {};
  const books = count => Array.from({length:count},(_,id) => ({id}));
  let garden = runtime([],persisted).ReadingGarden;
  assert.equal(garden.getGarden([]).awaitingSeed,true);
  assert.equal(garden.plant('unknown',[]),false);
  assert.equal(garden.plant('flower',[]),true);
  assert.equal(garden.plant('fruit',[]),false);
  for (const [count, mature, currentCount, stage] of [[0,0,0,0],[1,0,1,1],[3,0,3,2],[5,0,5,3],[10,0,10,4],[19,0,19,4],[20,1,0,0]]) {
    const view = garden.getGarden(books(count));
    assert.equal(view.matureTrees.length,mature);
    assert.equal(view.currentCount,currentCount);
    assert.equal(view.stage,stage);
  }
  assert.equal(garden.getGarden(books(20)).awaitingSeed,true);
  assert.equal(garden.plant('fruit',books(20)),true);
  garden = runtime([],persisted).ReadingGarden;
  assert.equal(garden.getGarden(books(23)).currentSeed,'fruit');
  assert.equal(garden.getGarden(books(23)).stage,2);
  assert.equal(garden.getGarden(books(23)).matureTrees[0].seed,'flower');
  assert.equal(garden.getGarden(books(40)).matureTrees[1].seed,'fruit');
  assert.equal(garden.plant('forest',books(40)),true);
  const before = JSON.stringify(persisted);
  assert.equal(garden.getGarden(books(41)).currentTree.seed,'forest');
  assert.equal(JSON.stringify(persisted),before,'getGarden is read only');
  // Deleting books cannot preserve phantom trees or reset seed history.
  assert.equal(garden.getGarden(books(19)).matureTrees.length,0);
  assert.equal(garden.getGarden(books(19)).currentSeed,'flower');
  assert.equal(garden.plant('forest',books(19)),false);
  assert.equal(garden.getGarden(books(41)).matureTrees.length,2);
  assert.equal(garden.getGarden(books(41)).currentSeed,'forest');
});

test('existing 40+ books become a grove immediately and duplicates cannot farm trees', () => {
  const persisted = {'bookTracker.garden.v1':'flower'};
  const garden = runtime([],persisted).ReadingGarden;
  const books = Array.from({length:47},(_,id) => ({id}));
  const view = garden.getGarden(books);
  assert.equal(view.matureTrees.length,2);
  assert.equal(view.matureTrees[0].seed,'flower');
  assert.equal(view.currentCount,7);
  assert.equal(view.awaitingSeed,true);
  assert.equal(garden.plant('fruit',books),true);
  assert.equal(garden.getGarden(books).currentTree.stage,3);
  assert.equal(garden.getGarden(books).currentTree.seed,'fruit');
  assert.equal(garden.getGarden([...books,...books,{id:'want',status:'want'}]).count,47);
  assert.equal(runtime([],persisted).ReadingGarden.getGarden(books).matureTrees.length,2);
  const fresh = runtime().ReadingGarden;
  assert.equal(fresh.getGarden(books).matureTrees.length,2);
  assert.equal(fresh.plant('fruit',books),true);
  assert.equal(fresh.getGarden(books).currentSeed,'fruit');
});


test('export brands the card and draws real accumulated garden totals below every review line', async () => {
  const books = Array.from({length:43},(_,id) => ({id}));
  for (const template of [1,2,3,4,5,6,7,8]) {
    const app = runtime(books,{'bookTracker.garden.trees.v1':'["forest","flower","fruit"]'});
    const review='마지막 문장까지 남겨요.\n'.repeat(35)+'끝까지 보존된 마음';
    const canvas=await app.generateInstagramTemplate({title:'한 권의 책',authors:['지은이']},review,4,template);
    assert.ok(app.drawn.includes('맘스북스'));
    assert.equal(app.drawn.includes('완독 43권 · 다 자란 나무 2그루'),template===3);
    assert.ok(app.drawn.includes('지은이'));
    const last=app.textPositions.find(item=>item.text==='끝까지 보존된 마음');
    const garden=app.textPositions.find(item=>item.text==='책과 함께 자라는 내 정원');
    if(template===3) {
      assert.ok(last.y<garden.y,'review cannot overlap the garden');
      assert.ok(garden.y+220<canvas.height,'garden stays within canvas');
    } else assert.equal(garden,undefined,'letter and coffee cards have no garden statistics');
    assert.ok(canvas.height>1500);
  }
});


test('export uses distinct mature seed cells and preserves current growth sprite crop', async () => {
  const app=runtime(Array.from({length:63},(_,id)=>({id})),{
    'bookTracker.garden.trees.v1':'["forest","flower","fruit","forest"]'
  },true);
  await app.generateInstagramTemplate({title:'정원'},'오늘의 마음',5,3);
  const mature=app.imageDraws.filter(args=>args[0].source.includes('mature-trees'));
  assert.equal(mature.length,3);
  assert.deepEqual(mature.map(args=>args[1]),[0,2048/3,2048/3*2]);
  assert.ok(mature.every(args=>args[2]===0 && args[4]===683));
  const growth=app.imageDraws.find(args=>args[0].source.includes('growth-sprites'));
  assert.equal(growth[1],2048/3*2);
  assert.equal(growth[2],0);
  assert.equal(growth[4],683*.94);
});


test('all eight themes keep a 300 character review complete on a 4:5 card', async()=>{
  const review='가나다라마바사아자차'.repeat(30);
  for(const template of [1,2,3,4,5,6,7,8]) {
    const app=runtime([],{},true);
    const canvas=await app.generateInstagramTemplate({title:'오늘 읽은 책',author:'지은이'},review,4,template);
    assert.equal(canvas.width,1080);assert.equal(canvas.height,1350);
    const lines=app.textPositions.filter(item=>item.x===180);
    assert.equal(lines.map(item=>item.text).join(''),review);
    assert.ok(lines.every(item=>item.y<canvas.height-100));
    assert.equal(app.drawn.includes('오늘 아이랑 읽은 책'),template===7 || template===8);
    assert.ok(!app.drawn.some(text=>text.includes('완독 자랑')));
    const source=app.imageDraws[0][0].source;
    assert.match(source,[/letter-desk/,/coffee-desk/,/journal-garden/,/flower-desk/,/night-desk/,/picnic-desk/,/animal-friends/,/kids-notebook/][template-1]);
  }
});


test('scrapbook card preserves long title and note within its canvas', async () => {
  const app = runtime();
  const title = '함께 읽은 소중한 책'.repeat(20), review = '오늘의 생각'.repeat(220);
  const canvas = await app.generateInstagramTemplate({title,author:'작가'},review,4,9);
  assert.ok(app.drawn.join('').includes(title));
  assert.ok(app.drawn.join('').includes(review));
  assert.ok(canvas.height > 1350 && canvas.height <= 8000);
  assert.ok(app.textPositions.every(item => item.y < canvas.height));
  assert.ok(app.drawn.includes('맘스북스'));
});

test('book garden card exports equipped art without clipping or requiring image loads', async () => {
  const equipped=[{id:'clover',name:'네잎클로버',svg:'<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"></svg>'}];
  for(const loaded of [true,false]) {
    const app=runtime([],{},loaded);app.ReadingGarden.getCollection=()=>({equipped});
    const canvas=await app.generateInstagramTemplate({title:'정원'},'함께 읽었어요',5,3);
    assert.ok(app.drawn.includes('네잎클로버'));
    assert.equal(canvas.height,1350);
    assert.ok(app.textPositions.every(item=>item.y<canvas.height));
    assert.equal(app.imageDraws.some(args=>args[0].source.startsWith('data:image/svg+xml')),loaded);
  }
});
