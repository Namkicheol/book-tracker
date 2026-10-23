const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function feed(){
 const search={value:''},more={hidden:false},status={textContent:''};
 const list={children:[],appendChild(node){this.children.push(node);},set innerHTML(value){this.children=[];this.html=value;},textContent:''};
 const document={getElementById:id=>({rankList:list,feedSearch:search,feedMore:more,feedStatus:status}[id]),createElement:()=>({innerHTML:'',querySelectorAll:()=>[],querySelector:()=>({addEventListener(){}})}),querySelectorAll:()=>[]};
 const window={};const full=fs.readFileSync('js/share.js','utf8');const segment=full.slice(full.indexOf('  let publicLibraryRequest'),full.indexOf('  async function showPublicLibrary('));
 const escape=value=>String(value||'').replace(/[<>"&]/g,c=>({'<':'&lt;','>':'&gt;','"':'&quot;','&':'&amp;'}[c]));
 vm.runInNewContext(segment+'\nwindow.feed=(items)=>{publicFeed=items;feedLimit=6;renderFeedCards();};window.more=()=>{feedLimit+=6;renderFeedCards();};window.paint=renderFeedCards;window.cover=coverMarkup;',{window,document,escapeHtml:escape,escapeAttr:escape,shortId:id=>id.slice(0,6),currentTab:'all'});
 return {window,list,search,more};
}
test('neighbor cards paginate six at a time and search only explicit nicknames',()=>{
 const a=feed(),items=Array.from({length:7},(_,i)=>({owner_id:'owner'+i,nickname:'책토끼'+i,city:'서울',district:'종로구',book_count:3,books:[{title:'같은책제목',thumbnail:''}]}));
 a.window.feed(items);assert.equal(a.list.children.length,6);assert.equal(a.more.hidden,false);a.window.more();assert.equal(a.list.children.length,7);assert.equal(a.more.hidden,true);
 a.search.value='책토끼6';a.window.paint();assert.equal(a.list.children.length,1);assert.match(a.list.children[0].innerHTML,/책토끼6/);
 a.search.value='같은책제목';a.window.paint();assert.equal(a.list.children.length,0,'preview books must not imply whole-library title search');
});
test('missing and noimg covers keep a book placeholder and broken image fallback preserves space',()=>{
 const a=feed();assert.match(a.window.cover({thumbnail:''}),/feed-cover-empty/);assert.match(a.window.cover({thumbnail:'https://image.aladin.co.kr/noimg.gif'}),/feed-cover-empty/);assert.match(a.window.cover({thumbnail:'https://example.org/cover.jpg'}),/replaceWith/);
});
