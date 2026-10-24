"""Build the browse index retaining navigation metadata, without old review blurbs."""
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
data=json.loads((ROOT/'data/book-recommendations.json').read_text())
original_count=len(data['books'])
addition_file=ROOT/'data/editorial-additions.json'
if addition_file.exists():
 for b in json.loads(addition_file.read_text()):
  data['books'].setdefault(b['isbn'],dict(b,targetAge=b['ages'][0],genre=b['topics'][0],language='ko',lists=[]))
supplement_file=ROOT/'data/catalog-supplemental.json'
if supplement_file.exists():
 for b in json.loads(supplement_file.read_text()):
  if b['isbn'] not in data['books']:
   data['books'][b['isbn']]=b
  else:
   existing=data['books'][b['isbn']]
   for award in b.get('awards',[]):
    if award not in existing.setdefault('awards',[]):existing['awards'].append(award)
   if not existing.get('thumbnail'):existing['thumbnail']=b.get('thumbnail','')
publisher_file=ROOT/'data/publisher-additions.json'
if publisher_file.exists():
 for b in json.loads(publisher_file.read_text()):
  data['books'].setdefault(b['isbn'],b)
discovery_file=ROOT/'data/english-discovery-evidence.json'
discovery=json.loads(discovery_file.read_text()) if discovery_file.exists() else []
for entry in discovery:
 if entry.get('bibliographic'):
  data['books'].setdefault(entry['isbn'],dict(entry['bibliographic'],isbn=entry['isbn'],language='en'))
award_expansion_file=ROOT/'data/english-award-expansion.json'
award_expansion=json.loads(award_expansion_file.read_text()) if award_expansion_file.exists() else []
for entry in award_expansion:
 if entry.get('bibliographic'):
  data['books'].setdefault(entry['isbn'],dict(entry['bibliographic'],isbn=entry['isbn'],language='en'))
books=[]
for isbn,b in data['books'].items():
 if not re.fullmatch(r'97[89]\d{10}',isbn):continue
 if sum(int(c)*(1 if i%2==0 else 3) for i,c in enumerate(isbn))%10:continue
 title=b.get('title','').strip()
 parts=title.split(' - ')
 if len(parts)>1 and re.search(r'추천|수상|선정|베스트셀러',parts[-1]):title=' - '.join(parts[:-1])
 age=b.get('targetAge','')
 genre=b.get('genre','')
 # This legacy batch assigned adult/teen novels to elementary fiction wholesale.
 if 'one-book' in b.get('lists',[]) or title=='천 개의 파랑':
  age='';genre='문학'
 books.append(dict(isbn=isbn,title=title,author=b.get('author',''),publisher=b.get('publisher',''),age=age,genre=genre,language=b.get('language','ko'),thumbnail=b.get('thumbnail',''),ar=b.get('ar'),textbookGrade=b.get('textbookGrade')))
 if b.get('awards'):
  books[-1]['awards']=[{k:a[k] for k in ['id','year','distinction','source']} for a in b['awards']]
award_file=ROOT/'data/english-award-mapping.json'
if award_file.exists():
 by_isbn={b['isbn']:b for b in books}
 for award in json.loads(award_file.read_text()):
  book=by_isbn.get(award['isbn'])
  if book:
   evidence={'id':award['awardId'],'year':award['year'],'distinction':award['distinction'],'source':award['source']}
   if evidence not in book.setdefault('awards',[]):book['awards'].append(evidence)
 for book in books:
  if book['isbn']=='9780062691194':book['title']='New Kid'
  if book['isbn']=='9780374390402':book['author']='George Selden'
by_isbn={b['isbn']:b for b in books}
for entry in award_expansion:
 book=by_isbn.get(entry['isbn'])
 if not book:
  raise ValueError('Award ISBN missing from catalog: '+entry['isbn'])
 award={'id':entry['awardId'],'year':entry['year'],'distinction':entry['distinction'],'source':entry['source']}
 if award not in book.setdefault('awards',[]):book['awards'].append(award)
for book in books:
 book['arStatus']='legacy' if isinstance(book.get('ar'),(int,float)) else 'unknown'
for entry in discovery:
 book=by_isbn.get(entry['isbn'])
 if not book:
  raise ValueError('Discovery ISBN missing from catalog: '+entry['isbn'])
 if book['language']!='en':
  raise ValueError('Discovery entry must be English: '+entry['isbn'])
 for field in ['stage','series','topics']:
  if field in entry:book[field]=entry[field]
 book['discoverySource']=entry['source']
 book['discoveryCheckedAt']=entry['checkedAt']
 if entry.get('ar'):
  book['ar']=entry['ar']['value']
  book['arStatus']='verified'
  book['arEvidence']={k:v for k,v in entry['ar'].items() if k!='value'}
sources=[]
for award_id,name in [('newbery-award','뉴베리상 공식 수상 목록'),('caldecott-award','칼데콧상 공식 수상 목록')]:
 evidence=next((a for b in books for a in b.get('awards',[]) if a['id']==award_id),None)
 if evidence:sources.append({'id':award_id,'name':name,'url':evidence['source']})
for entry in award_expansion:
 if not any(s['id']==entry['awardId'] for s in sources):
  sources.append({'id':entry['awardId'],'name':entry['awardName'],'url':entry['source']})
result={'meta':{'originalCount':original_count,'addedCount':len(data['books'])-original_count,'excludedCount':len(data['books'])-len(books),'sources':sources},'books':books}
(ROOT/'js/book-catalog.js').write_text('/* Bibliographic browsing and individually verified award facts; third-party recommendation lists and blurbs are excluded. */\nwindow.BOOK_CATALOG = '+json.dumps(result,ensure_ascii=False,separators=(',',':'))+';\n')
print('Browse books:',len(books))
