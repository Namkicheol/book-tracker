/* Local bibliographic browsing. Source compilations and unverified claims stay private. */
(function () {
  'use strict';
  // Hide explicitly named adult recruitment-exam workbooks from children's browsing.
  // Keep the underlying catalog intact; ordinary school tests and career stories stay visible.
  function isAdultExamBook(title) {
    const text = String(title || '');
    const main = text.split(' - ')[0];
    return (/\bNCS\b|공무원|취업/i.test(main) && /기출|모의고사|기본서|시험\s*대비|채용\s*시험|\d\s*급|수리능력|응용수리|문제집|인적성|PSAT/i.test(main)) ||
      /공무원\s*(?:채용\s*)?시험\s*대비/.test(text);
  }
  const seenIsbns = new Set();
  const books = ((window.BOOK_CATALOG || {}).books || []).filter(book => {
    if (isAdultExamBook(book.title)) return false;
    if (!book.isbn) return true;
    if (seenIsbns.has(book.isbn)) return false;
    seenIsbns.add(book.isbn);
    return true;
  });
  const PAGE_SIZE = 24;
  const ENGLISH_FIELDS = ['catalogStage','catalogSeries','catalogSeriesStep','catalogTopic','catalogDistinction'];
  const STAGES = {picture:'그림책 함께 읽기',phonics:'파닉스 첫걸음',reader:'리더스',chapter:'챕터북',novel:'소설'};
  const TOPICS = {animals:'동물',friendship:'우정',adventure:'모험',humor:'유머',dinosaurs:'공룡',science:'과학'};
  let page = 1;
  let tab = 'all';
  let matches = books;
  let openRequest = 0;
  const $ = id => document.getElementById(id);
  const escape = value => String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  const compact = value => String(value || '').normalize('NFC').toLocaleLowerCase().replace(/\s/g, '');

  document.addEventListener('DOMContentLoaded', () => {
    ['Age', 'Genre', 'Publisher'].forEach((field, index) => {
      const key = ['age', 'genre', 'publisher'][index];
      const values = [...new Set(books.map(book => book[key]).filter(Boolean))].sort((a,b) => a.localeCompare(b, 'ko'));
      $('catalog' + field).innerHTML = '<option value="">모두</option>' + values.map(value => `<option value="${escape(value)}">${escape(field==='Age' ? ({'유아':'유아','초등 저학년':'초등 1~2학년','초등 중학년':'초등 3~4학년','초등 고학년':'초등 5~6학년'}[value] || value) : value)}</option>`).join('') + (field === 'Age' ? '<option value="__unclassified">연령 미분류</option>' : '');
      $('catalog' + field).addEventListener('change', filter);
    });
    const sources=(window.BOOK_CATALOG.meta || {}).sources || [];
    const awardOptions=sources.map(source=>`<option value="${escape(source.id)}">${escape(source.name)}</option>`).join('');
    $('catalogSource').innerHTML='<option value="">모든 수상 목록</option>'+awardOptions;
    $('catalogAward').innerHTML='<option value="">모든 수상작</option>'+awardOptions;
    const englishBooks=books.filter(book=>book.language==='en' || book.genre==='원서');
    const series=[...new Map(englishBooks.filter(book=>book.series?.id && typeof book.series.name==='string' && book.series.name.trim()).map(book=>[book.series.id,book.series])).values()].sort((a,b)=>a.name.localeCompare(b.name));
    $('catalogStage').innerHTML='<option value="">모든 단계</option>'+Object.entries(STAGES).map(([id,name])=>`<option value="${id}">${name} (${englishBooks.filter(book=>book.stage===id).length})</option>`).join('')+`<option value="unknown">단계 미분류 (${englishBooks.filter(book=>!book.stage).length})</option>`;
    $('catalogTopic').innerHTML='<option value="">모든 관심사</option>'+Object.entries(TOPICS).map(([id,name])=>`<option value="${id}">${name}</option>`).join('');
    $('catalogSeries').innerHTML='<option value="">모든 시리즈</option>'+series.map(item=>`<option value="${escape(item.id)}">${escape(item.name)}</option>`).join('');
    ENGLISH_FIELDS.forEach(id=>$(id).addEventListener('change',filter));
    $('catalogEnglishExplore').addEventListener('click',event=>{const button=event.target.closest('[data-english-field]');if(!button)return;const field=button.dataset.englishField;if(!['catalogStage','catalogTopic'].includes(field))$('catalogEnglishAdvanced').open=true;$(field)?.focus?.();$(field)?.scrollIntoView?.({block:'nearest',behavior:'smooth'});});
    ['catalogSource','catalogAr','catalogAward'].forEach(id=>$(id).addEventListener('change',filter));
    function selectTab(value) {
      tab=value;
      ['catalogQuery','catalogAge','catalogGenre','catalogPublisher','catalogSource','catalogAr','catalogAward',...ENGLISH_FIELDS].forEach(id=>{$(id).value='';});
      document.querySelectorAll('[data-catalog-tab]').forEach(item=>item.setAttribute('aria-pressed',String(item.dataset.catalogTab===tab)));
      $('catalogEnglishFilters').hidden=tab!=='english';
      $('catalogSourceField').hidden=tab==='english';
      $('catalogAgeField').hidden=tab==='english';
      $('catalogEnglishAdvanced').open=false;
      filter();
    }
    $('catalogTabs').addEventListener('click',event=>{
      const button=event.target.closest('[data-catalog-tab]');
      if(button)selectTab(button.dataset.catalogTab);
    });
    $('catalogQuickLinks')?.addEventListener('click',event=>{
      const button=event.target.closest('[data-catalog-quick]');
      if(!button)return;
      selectTab(button.dataset.catalogQuick==='korean'?'korean':'english');
      if(button.dataset.catalogQuick==='awards'){
        $('catalogEnglishAdvanced').open=true;
        $('catalogAward').focus?.();
        $('catalogAward').scrollIntoView?.({block:'center',behavior:'smooth'});
      }else{
        $('catalogTitle').focus?.();
        $('catalogTitle').scrollIntoView?.({block:'start',behavior:'smooth'});
      }
    });
    $('catalogQuery').addEventListener('input', filter);
    $('catalogForm').addEventListener('submit', event => { event.preventDefault(); filter(); });
    $('catalogPrevious').addEventListener('click', () => { if (page > 1) changePage(-1); });
    $('catalogNext').addEventListener('click', () => { if (page * PAGE_SIZE < matches.length) changePage(1); });
    $('catalogReset').addEventListener('click', () => {
      if(tab!=='english')tab='all';
      $('catalogEnglishFilters').hidden=tab!=='english';
      $('catalogSourceField').hidden=tab==='english';
      $('catalogAgeField').hidden=tab==='english';
      $('catalogEnglishAdvanced').open=false;
      document.querySelectorAll('[data-catalog-tab]').forEach(item=>item.setAttribute('aria-pressed',String(item.dataset.catalogTab===tab)));
      ['catalogQuery','catalogAge','catalogGenre','catalogPublisher','catalogSource','catalogAr','catalogAward',...ENGLISH_FIELDS].forEach(id => { $(id).value = ''; });
      filter();
    });
    $('catalogList').addEventListener('error', event => {
      const image = event.target;
      if (image.tagName !== 'IMG' || !image.classList.contains('catalog-cover')) return;
      image.style.display = 'none';
      image.nextElementSibling.style.display = 'grid';
    }, true);
    $('catalogList').addEventListener('click', event => {
      const button = event.target.closest('[data-catalog-isbn]');
      if (button) openBook(button.dataset.catalogIsbn);
    });
    render();
  });

  function changePage(direction) {
    page += direction;
    openRequest++;
    $('catalogActionStatus').textContent = '';
    render();
    $('catalogList').querySelector?.('button')?.focus();
  }

  function filter() {
    const query = compact($('catalogQuery').value);
    const age = $('catalogAge').value;
    const genre = $('catalogGenre').value;
    const publisher = $('catalogPublisher').value;
    const source=$('catalogSource').value, ar=$('catalogAr').value, award=$('catalogAward').value;
    const stage=$('catalogStage').value,series=$('catalogSeries').value,seriesStep=$('catalogSeriesStep').value,topic=$('catalogTopic').value,distinction=$('catalogDistinction').value;
    const bands={b01:[0,1],b12:[1,2],b23:[2,3],b34:[3,4],b4:[4,Infinity]};
    const english=book=>book.language==='en' || book.genre==='원서';
    matches = books.filter(book => {
      const awards=book.awards || [];
      const level=book.ar;
      const known=book.arStatus==='verified' && typeof level==='number' && Number.isFinite(level);
      return (tab==='all' || (tab==='korean' ? !english(book) : tab==='english' ? english(book) : Boolean(book.textbookGrade))) &&
        (!query || compact([book.title,book.author,book.publisher,book.isbn].join(' ')).includes(query)) &&
        (!age || (age==='__unclassified' ? !book.age : book.age===age)) && (!genre || book.genre===genre) && (!publisher || book.publisher===publisher) &&
        (!source || awards.some(item=>item.id===source)) && (!award && !distinction || awards.some(item=>(!award || item.id===award) && (!distinction || (distinction==='Medal' ? ['Medal','Winner'].includes(item.distinction) : item.distinction===distinction)))) &&
        (!stage || (stage==='unknown' ? !book.stage : book.stage===stage)) && (!series || book.series?.id===series) &&
        (!seriesStep || (seriesStep==='first' ? book.series?.order===1 : Number.isFinite(book.series?.order) && book.series.order>1)) &&
        (!topic || (book.topics || []).includes(topic)) &&
        (!ar || (ar==='unknown' ? !known : known && level>=bands[ar][0] && level<bands[ar][1]));
    });
    if(series)matches.sort((a,b)=>(a.series?.order ?? Infinity)-(b.series?.order ?? Infinity) || a.title.localeCompare(b.title));
    else if(tab==='english')matches.sort((a,b)=>Number(Boolean(b.discoverySource))-Number(Boolean(a.discoverySource)));
    page = 1;
    openRequest++;
    $('catalogActionStatus').textContent = '';
    render();
  }

  function render() {
    const start = (page - 1) * PAGE_SIZE;
    const visible = matches.slice(start, start + PAGE_SIZE);
    $('catalogStatus').textContent = matches.length ? `${matches.length.toLocaleString('ko-KR')}권 · ${page} / ${Math.ceil(matches.length / PAGE_SIZE)}페이지` : '조건에 맞는 책이 없어요. 검색어나 분류를 바꿔 보세요.';
    $('catalogList').innerHTML = visible.map(book => {
      const hasCover = /^https:\/\//.test(book.thumbnail || '');
      const cover = `${hasCover ? `<img class="catalog-cover" src="${escape(book.thumbnail)}" alt="" loading="lazy">` : ''}<span class="catalog-cover catalog-cover-empty" role="img" aria-label="표지 준비 중"${hasCover ? ' style="display:none"' : ''}>📖</span>`;
      const setBook = /(?:세트|전집|전\s*\d+\s*권|\bbox(?:ed)?\s+set\b)/i.test(book.title || '');
      const awards=(book.awards || []).map(item=>{const source=(window.BOOK_CATALOG.meta?.sources || []).find(source=>source.id===item.id);const name=source?.name?.replace(/\s*공식 수상 목록$/,'') || ({'newbery-award':'뉴베리','caldecott-award':'칼데콧'}[item.id]) || '수상작';return `${name} ${item.year || ''} ${item.distinction || ''}`;}).join(' · ');
      const arSource=book.arStatus==='verified' && /^https:\/\//.test(book.arEvidence?.source || '') ? `<a href="${escape(book.arEvidence.source)}" target="_blank" rel="noopener noreferrer">AR 확인 출처 ↗</a>` : '';
      const discoverySource=/^https:\/\//.test(book.discoverySource || '') ? `<a href="${escape(book.discoverySource)}" target="_blank" rel="noopener noreferrer">책·시리즈 출처 ↗</a>` : '';
      const ar=book.arStatus==='verified' && typeof book.ar==='number' && Number.isFinite(book.ar) ? ` · AR ${escape(String(book.ar))}` : '';
      return `<li><button type="button" class="catalog-book" data-catalog-isbn="${escape(book.isbn)}">${cover}<strong>${escape(book.title)}</strong>${setBook ? '<small>세트 도서 · 낱권은 제목으로 찾아보세요</small>' : ''}<span>${escape(book.author)}</span><small>${escape(book.publisher)}</small><small>${escape(book.age || (book.genre==='원서' ? '영어 원서' : '연령 미분류'))}${ar}</small>${book.series ? `<small>${escape(book.series.name)}${Number.isFinite(book.series.order) ? ` · ${book.series.order===1?'첫 권':`${book.series.order}권`}` : ''}</small>` : ''}${book.stage ? `<small>${escape(STAGES[book.stage] || '')}</small>` : ''}${awards ? `<small>${escape(awards)}</small>` : ''}</button>${arSource || discoverySource ? `<div class="catalog-evidence">${arSource}${discoverySource}</div>` : ''}</li>`;
    }).join('');
    $('catalogPrevious').disabled = page === 1;
    $('catalogNext').disabled = start + PAGE_SIZE >= matches.length;
  }

  async function openBook(isbn) {
    const entry = books.find(book => book.isbn === isbn);
    if (!entry) return;
    const current = ++openRequest;
    $('catalogActionStatus').textContent = '책 정보를 불러오고 있어요.';
    try {
      const raw = await window.API.aladinLookup(isbn);
      const book = raw && window.API.normalizeAladin(raw);
      if (current !== openRequest) return;
      // Aladin can append subtitles/edition notes; require the saved main title and exact ISBN.
      const mainTitle = value => String(value || '').replace(/^.*?#\s*0*\d+\s*:\s*/, '').split(/\s[-–—:]\s/)[0].normalize('NFC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
      const title = mainTitle(entry.title);
      if (!book || book.isbn !== isbn || !title || !mainTitle(raw.title || book.title).includes(title)) {
        $('catalogActionStatus').textContent = '등록된 책과 도서 정보가 일치하지 않아요. 다른 책을 골라 주세요.';
        return;
      }
      book.title = String(raw.title || book.title).trim();
      delete book._raw;
      delete book.contents;
      $('catalogActionStatus').textContent = '';
      if (window.BookPreview) window.BookPreview.show(book, {mode:'recommend'});
    } catch {
      if (current === openRequest) $('catalogActionStatus').textContent = '책 정보를 불러오지 못했어요. 책 보기를 다시 눌러 주세요.';
    }
  }
})();
