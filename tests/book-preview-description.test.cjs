const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{execFileSync}=require('node:child_process');
// Independent HTML parser adapter for the inert document's plain-text result.
class DOMParserAdapter {
 parseFromString(source){
  const script=`import sys,json
from html.parser import HTMLParser
class Text(HTMLParser):
 def __init__(self):super().__init__(convert_charrefs=True);self.parts=[];self.skip=0
 def handle_starttag(self,tag,attrs):
  if tag in ('script','style','iframe','object','template'):self.skip+=1
 def handle_endtag(self,tag):
  if tag in ('script','style','iframe','object','template') and self.skip:self.skip-=1
 def handle_data(self,data):
  if not self.skip:self.parts.append(data)
p=Text();p.feed(sys.stdin.read());print(json.dumps(''.join(p.parts)))`;
  return {body:{textContent:JSON.parse(execFileSync('python3',['-c',script],{input:source,encoding:'utf8'}))},querySelectorAll:()=>[]};
 }
}
const context={window:{},DOMParser:DOMParserAdapter};
vm.runInNewContext(fs.readFileSync('js/book-preview.js','utf8').replace('window.BookPreview = { show, showList, setRecData };','window.BookPreview = { descriptionText };'),context);
const clean=context.window.BookPreview.descriptionText;
test('API ASP links become natural book introduction text without exposing markup',()=>{
 assert.equal(clean('함께 읽는 <a href="/catalog/book.asp?ISBN=123&UID=<%=qsUID%>">마음의 이야기</a>입니다.'),'함께 읽는 마음의 이야기입니다.');
});
test('encoded markup and entities decode to ordinary text and keep paragraphs',()=>{
 assert.equal(clean('&lt;p&gt;첫 문장 &amp;amp; 다음 문장&lt;/p&gt;&lt;p&gt;둘째 문장&lt;/p&gt;'),'첫 문장 & 다음 문장\n둘째 문장');
 assert.equal(clean('책 &amp; 자연&nbsp;  이야기'),'책 & 자연 이야기');
});
test('executable content and handlers are never included while legitimate words remain',()=>{
 assert.equal(clean('<script>alert(1)</script><p onclick="evil()">아이의 용기</p><img src=x onerror=evil()>를 응원해요.'),'아이의 용기\n를 응원해요.');
 assert.equal(clean('평범한 소개, 1 < 3 그리고 좋은 책.'),'평범한 소개, 1 < 3 그리고 좋은 책.');
});
