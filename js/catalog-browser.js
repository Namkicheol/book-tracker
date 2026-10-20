/* Local bibliographic browsing. Source compilations and unverified claims stay private. */
(function () {
  'use strict';
  const books = (window.BOOK_CATALOG || {}).books || [];
  const PAGE_SIZE = 24;
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
    $('catalogSource').innerHTML='<option value="">모든 추천 목록</option>'+sources.map(source=>`<option value="${escape(source.id)}">${escape(source.name)}</option>`).join('');
    ['catalogSource','catalogAr','catalogAward'].forEach(id=>$(id).addEventListener('change',filter));
    $('catalogTabs').addEventListener('click',event=>{
      const button=event.target.closest('[data-catalog-tab]');
      if(!button)return;
      tab=button.dataset.catalogTab;
      ['catalogQuery','catalogAge','catalogGenre','catalogPublisher','catalogSource','catalogAr','catalogAward'].forEach(id=>{$(id).value='';});
      document.querySelectorAll('[data-catalog-tab]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
      $('catalogEnglishFilters').hidden=tab!=='english';
      filter();
    });
    $('catalogQuery').addEventListener('input', filter);
    $('catalogForm').addEventListener('submit', event => { event.preventDefault(); filter(); });
    $('catalogPrevious').addEventListener('click', () => { if (page > 1) changePage(-1); });
    $('catalogNext').addEventListener('click', () => { if (page * PAGE_SIZE < matches.length) changePage(1); });
    $('catalogReset').addEventListener('click', () => {
      tab='all';
      $('catalogEnglishFilters').hidden=true;
      document.querySelectorAll('[data-catalog-tab]').forEach(item=>item.setAttribute('aria-pressed',String(item.dataset.catalogTab==='all')));
      ['catalogQuery','catalogAge','catalogGenre','catalogPublisher','catalogSource','catalogAr','catalogAward'].forEach(id => { $(id).value = ''; });
      filter();
    });
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
    const bands={b01:[0,1],b12:[1,2],b23:[2,3],b34:[3,4],b4:[4,Infinity]};
    const english=book=>book.language==='en' || book.genre==='원서';
    matches = books.filter(book => {
      const lists=book.lists || [];
      const level=book.ar;
      const known=typeof level==='number' && Number.isFinite(level);
      return (tab==='all' || (tab==='korean' ? !english(book) : tab==='english' ? english(book) : lists.includes('textbook') || Boolean(book.textbookGrade))) &&
        (!query || compact([book.title,book.author,book.publisher,book.isbn].join(' ')).includes(query)) &&
        (!age || (age==='__unclassified' ? !book.age : book.age===age)) && (!genre || book.genre===genre) && (!publisher || book.publisher===publisher) &&
        (!source || lists.includes(source)) && (!award || (Array.isArray(book.awards) ? book.awards.some(item=>item.id===award) : lists.includes(award))) &&
        (!ar || (ar==='unknown' ? !known : known && level>=bands[ar][0] && level<bands[ar][1]));
    });
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
      const cover=/^https:\/\//.test(book.thumbnail || '') ? `<img class="catalog-cover" src="${escape(book.thumbnail)}" alt="" loading="lazy" onerror="this.hidden=true">` : '<span class="catalog-cover catalog-cover-empty" aria-hidden="true">📖</span>';
      const awards=(book.awards || []).map(item=>`${item.id==='newbery-award'?'뉴베리':item.id==='caldecott-award'?'칼데콧':item.id} ${item.year || ''} ${item.distinction || ''}`).join(' · ');
      const ar=typeof book.ar==='number' && Number.isFinite(book.ar) ? ` · AR ${escape(String(book.ar))}` : '';
      return `<li><button type="button" class="catalog-book" data-catalog-isbn="${escape(book.isbn)}">${cover}<strong>${escape(book.title)}</strong><span>${escape(book.author)}</span><small>${escape(book.publisher)}</small><small>${escape(book.age || (book.genre==='원서' ? '영어 원서' : '연령 미분류'))}${ar}</small>${awards ? `<small>${escape(awards)}</small>` : ''}</button></li>`;
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
      const title = compact(entry.title.split(/\s[-–—:]\s/)[0]);
      if (!book || book.isbn !== isbn || !compact(raw.title || book.title).includes(title)) {
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
