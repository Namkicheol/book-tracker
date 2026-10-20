/**
 * Search current Aladin catalog results by reading age and interest.
 */

(function () {
  'use strict';

  // Official catalog age/fiction categories; see source audit for verification.
  const AGE_CATEGORIES = {'유아':13789, '초등 저학년':48825, '초등 중학년':48837, '초등 고학년':48846, '청소년':1137};
  const CATALOG = window.CURATED_BOOKS || [];
  const SHELF_PAGE_SIZE = 6;
  const shelfCache = new Map();
  let shelfLimit = SHELF_PAGE_SIZE;
  let shelfRequest = 0;
  let shelfQueue = Promise.resolve();
  const SOURCE_LABELS = {moms:'맘스북스', library:'기관 추천', publisher:'출판사 소개', award:'수상작', social:'SNS 소개'};
  const PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 140%22%3E%3Crect fill=%22%23f8eff3%22 width=%22100%22 height=%22140%22/%3E%3Ctext x=%2250%22 y=%2278%22 text-anchor=%22middle%22 font-size=%2240%22 fill=%22%23a4779a%22%3E書%3C/text%3E%3C/svg%3E';

  const COLLECTIONS = [
    { title: '마음을 말해요', topic: '감정', question: '오늘 마음을 색으로 표현하면 무슨 색일까?', note: '기쁨, 속상함, 두려움을 이야기하는 독서 시간을 준비해 보세요.' },
    { title: '친구와 함께 자라요', topic: '우정', question: '친구에게 오늘 해 주고 싶은 말은 무엇일까?', note: '친구 관계를 주제로 함께 읽고 대화할 책을 찾아요.' },
    { title: '작은 자연 탐험가', topic: '자연', question: '산책길에서 궁금했던 것은 무엇일까?', note: '주변의 동식물을 관찰하며 읽을 책을 찾아요.' },
    { title: '왜 그럴까? 과학 시간', topic: '과학', question: '오늘 발견한 왜 그럴까 질문은 무엇일까?', note: '아이의 질문에서 시작하는 과학 독서를 준비해 보세요.' },
  ];
  let selectedTopic = '그림책';
  let recView = localStorage.getItem('recView') || 'grid';
  let requestId = 0;
  let searchBooks = [];
  const selected = new Set();
  let shelfBooks = [];
  let searchState = 'idle';

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    const data = window.RecsCache
      ? await window.RecsCache.load()
      : { meta: { sources: [] }, books: {}, awards: {} };
    if (window.BookPreview) BookPreview.setRecData(data);

    const collections = document.getElementById('recCollections');
    collections.innerHTML = COLLECTIONS.map((item, index) => `<button type="button" class="rec-collection" data-collection="${index}" aria-pressed="false"><strong>${item.title}</strong><span>${item.note}</span></button>`).join('');
    collections.addEventListener('click', event => {
      const button = event.target.closest('[data-collection]');
      if (!button) return;
      const item = COLLECTIONS[Number(button.dataset.collection)];
      selectedTopic = item.topic;
      document.getElementById('recSearch').value = '';
      document.querySelectorAll('[data-collection]').forEach(node => node.setAttribute('aria-pressed', String(node === button)));
      updateTopics();
      document.getElementById('recThemeQuestion').textContent = `함께 이야기해요 · ${item.question}`;
      const topic = document.getElementById('recShelfTopic');
      topic.value = [...topic.options].some(option => option.value === item.topic) ? item.topic : '';
      refreshShelf();
      runSearch();
    });
    document.getElementById('recAge').addEventListener('change', runSearch);
    document.getElementById('recRetry').addEventListener('click', runSearch);
    document.getElementById('recAddSelected').addEventListener('click', addSelected);
    document.getElementById('recSelectAll').addEventListener('click', () => {
      const eligible = searchBooks.filter(book => book.isbn && !inLibrary(book));
      const allSelected = eligible.every(book => selected.has(book.isbn));
      eligible.forEach(book => allSelected ? selected.delete(book.isbn) : selected.add(book.isbn));
      renderBooks();
    });
    window.addEventListener('focus', renderBooks);
    document.getElementById('bookPreviewModal')?.addEventListener('click', () => setTimeout(renderBooks, 0));
    document.getElementById('recShelfRetry').addEventListener('click', loadStarterShelf);
    initShelfFilters();
    loadStarterShelf();
    attachTopicListeners();
    attachSearchListener();
    attachViewToggle();
    attachScrollTop();
    await runSearch();
  }

  function attachTopicListeners() {
    document.querySelectorAll('.rec-topic-chip[data-topic]').forEach(button => {
      button.addEventListener('click', () => {
        selectedTopic = button.dataset.topic || '';
        updateTopics();
        document.getElementById('recThemeQuestion').textContent = '';
        document.querySelectorAll('[data-collection]').forEach(node => node.setAttribute('aria-pressed', 'false'));
        runSearch();
      });
    });
  }

  function filteredShelf() {
    const source = document.getElementById('recShelfSource').value;
    const age = document.getElementById('recShelfAge').value;
    const topic = document.getElementById('recShelfTopic').value;
    return CATALOG.filter(entry => (!source || (entry.provenance || []).some(p => p.kind === source)) &&
      (!age || (entry.ages || []).includes(age)) && (!topic || (entry.topics || []).includes(topic)));
  }

  function initShelfFilters() {
    const options = (values, label) => `<option value="">${label}</option>` + values.map(value => `<option value="${escapeAttr(value)}">${escapeHtml(value)}</option>`).join('');
    const kinds = Object.keys(SOURCE_LABELS).filter(kind => CATALOG.some(entry => (entry.provenance || []).some(p => p.kind === kind)));
    document.getElementById('recShelfSource').innerHTML = '<option value="">모든 출처</option>' + kinds.map(kind => `<option value="${kind}">${SOURCE_LABELS[kind]}</option>`).join('');
    document.getElementById('recShelfAge').innerHTML = options([...new Set(CATALOG.flatMap(entry => entry.ages || []))], '모든 연령');
    document.getElementById('recShelfTopic').innerHTML = options([...new Set(CATALOG.flatMap(entry => entry.topics || []))], '모든 주제');
    ['recShelfSource', 'recShelfAge', 'recShelfTopic'].forEach(id => document.getElementById(id).addEventListener('change', refreshShelf));
    document.getElementById('recShelfMore').addEventListener('click', () => { shelfLimit += SHELF_PAGE_SIZE; return loadStarterShelf(); });
  }

  function refreshShelf() {
    shelfLimit = SHELF_PAGE_SIZE;
    return loadStarterShelf();
  }

  function loadStarterShelf() {
    const current = ++shelfRequest;
    const entries = filteredShelf();
    const visible = entries.slice(0, shelfLimit);
    const status = document.getElementById('recShelfStatus');
    const retry = document.getElementById('recShelfRetry');
    const more = document.getElementById('recShelfMore');
    shelfBooks = [];
    renderShelf();
    if (entries.length) document.getElementById('recShelfGrid').innerHTML = '<p class="rec-empty">책을 불러오고 있어요.</p>';
    status.textContent = entries.length ? '책을 불러오고 있어요.' : '조건에 맞는 책이 없어요.';
    retry.hidden = true;
    more.hidden = true;
    // Serialize batches across filter changes; each batch has at most four requests.
    shelfQueue = shelfQueue.then(async () => {
      if (current !== shelfRequest) return;
      let cursor = 0;
      await Promise.all(Array.from({length: Math.min(4, visible.length)}, async () => {
        while (cursor < visible.length && current === shelfRequest) {
          const entry = visible[cursor++];
          if (shelfCache.has(entry.isbn)) continue;
          try {
            if (!window.API || typeof API.aladinLookup !== 'function') continue;
            const item = await API.aladinLookup(entry.isbn);
            const book = item && normalizeItem(item);
            const compact = value => value.normalize('NFC').replace(/\s/g, '');
            if (book && book.isbn === entry.isbn && compact(book.title).includes(compact(entry.title)) && compact(book.author).includes(compact(entry.author))) {
              shelfCache.set(entry.isbn, {...book, selection:entry});
            }
          } catch { /* Failed metadata remains retryable and is never cached. */ }
        }
      }));
      if (current !== shelfRequest) return;
      shelfBooks = visible.map(entry => shelfCache.get(entry.isbn)).filter(Boolean);
      const filtered = entries.length !== CATALOG.length;
      const missing = visible.length - shelfBooks.length;
      status.textContent = entries.length ? `${filtered ? '조건에 맞는 ' : ''}${entries.length}권 중 ${shelfBooks.length}권을 보고 있어요.${missing ? ` ${missing}권은 정보를 불러오지 못했어요.` : ''}` : '조건에 맞는 책이 없어요.';
      retry.hidden = shelfBooks.length === visible.length;
      more.hidden = shelfLimit >= entries.length;
      more.textContent = `다음 ${Math.min(SHELF_PAGE_SIZE, entries.length - shelfLimit)}권 더 보기`;
      renderShelf();
      attachCardListeners();
    });
    return shelfQueue;
  }

  function renderShelf() {
    document.getElementById('recShelfGrid').innerHTML = shelfBooks.map(book => {
      const entry = book.selection;
      const sources = (entry.provenance || []).map(p => `<a href="${escapeAttr(p.source)}" target="_blank" rel="noopener noreferrer">${escapeHtml(p.label)}${p.year && !p.label.includes(String(p.year)) ? ` · ${escapeHtml(String(p.year))}` : ''}${p.kind === 'social' ? ` · SNS 소개${p.checkedAt ? ` (확인 ${escapeHtml(p.checkedAt)})` : ''}` : ''} ↗</a>`).join('<br>');
      const note = `<div class="rec-shelf-note"><p><strong>맘스북스 읽기 제안</strong> ${escapeHtml(entry.note)}</p><p><strong>함께 해요</strong> ${escapeHtml(entry.activity)}</p>${sources}<br><a href="${escapeAttr(entry.source)}" target="_blank" rel="noopener noreferrer">서지 확인 출처 ↗</a></div>`;
      return renderCard(book, false).replace('</article>', `${note}</article>`);
    }).join('') || (filteredShelf().length ? '<p class="rec-empty">책 정보를 불러오지 못했어요. 다시 불러오기를 눌러 주세요.</p>' : '<p class="rec-empty">다른 출처·연령·주제를 골라 보세요. 모든 조건을 보고 싶다면 각 항목을 ‘모든’으로 바꿔 주세요.</p>');
  }

  function updateTopics() {
    document.querySelectorAll('.rec-topic-chip[data-topic]').forEach(chip => chip.setAttribute('aria-pressed', String(chip.dataset.topic === selectedTopic)));
  }

  function inLibrary(book) {
    return window.Storage && Storage.getBookByIsbn(book.isbn);
  }

  function updateSelection() {
    const count = selected.size;
    const add = document.getElementById('recAddSelected');
    add.textContent = count ? `선택한 ${count}권 읽을 책에 담기` : '책을 선택해 주세요';
    add.disabled = !count;
    document.getElementById('recSelectAll').disabled = !searchBooks.some(book => book.isbn && !inLibrary(book));
  }

  function addSelected() {
    if (!window.Storage) return;
    let count = 0;
    try {
      searchBooks.filter(book => selected.has(book.isbn)).forEach(book => {
        if (inLibrary(book)) { selected.delete(book.isbn); return; }
        Storage.saveBook({ ...book, status: 'want' });
        selected.delete(book.isbn);
        count++;
      });
      document.getElementById('recActionStatus').textContent = `${count}권을 읽을 책에 담았어요.`;
    } catch {
      document.getElementById('recActionStatus').textContent = `${count}권 저장됨 · 저장 공간을 확인한 뒤 남은 책을 다시 담아 주세요.`;
    }
    renderBooks();
  }

  function attachSearchListener() {
    document.getElementById('recDiscoveryForm')?.addEventListener('submit', event => {
      event.preventDefault();
      runSearch();
    });
  }

  async function runSearch() {
    const form = document.getElementById('recDiscoveryForm');
    const results = document.getElementById('searchResults');
    const meta = document.getElementById('searchMeta');
    const grid = document.getElementById('searchGrid');
    const button = document.getElementById('recSearchBtn');
    const age = document.getElementById('recAge')?.value || '초등 저학년';
    const extra = document.getElementById('recSearch')?.value.trim() || '';
    const query = [selectedTopic, extra]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    const currentRequest = ++requestId;
    searchState = 'loading';
    selected.clear();
    searchBooks = [];
    updateSelection();
    document.getElementById('recActionStatus').textContent = '';
    document.getElementById('recRetry').hidden = true;

    if (!meta || !grid) return;
    if (!window.API || typeof API.aladinSearch !== 'function' || typeof API.normalizeAladin !== 'function') {
      searchState = 'error';
      meta.textContent = '도서 검색을 불러오지 못했어요.';
      grid.innerHTML = '<p class="rec-empty">검색 기능을 사용할 수 없습니다. 잠시 후 다시 열어 주세요.</p>';
      document.getElementById('recRetry').hidden = false;
      return;
    }

    if (form) form.setAttribute('aria-busy', 'true');
    if (results) results.setAttribute('aria-busy', 'true');
    if (button) button.disabled = true;
    meta.textContent = `“${query}” 검색 중…`;
    grid.innerHTML = '<p class="rec-empty">책을 찾아보고 있어요.</p>';

    try {
      const items = await API.aladinSearch({
        query,
        categoryId: AGE_CATEGORIES[age],
        queryType: 'Keyword',
        maxResults: 24,
        sort: 'SalesPoint',
      });
      if (currentRequest !== requestId) return;

      const seen = new Set();
      searchBooks = (items || []).map(normalizeItem).filter(book => {
        if (!book || !book.title || /세트|전집|패키지|\d+\s*권\s*묶음/.test(book.title)) return false;
        const key = book.isbn || `${book.title}|${book.author}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      meta.textContent = `“${query}” · ${age} 분야 ${searchBooks.length}권 · 알라딘 OpenAPI`;
      searchState = 'ready';
      renderBooks();
    } catch (error) {
      if (currentRequest !== requestId) return;
      console.warn('[recommendations] 도서 검색 실패:', error.message);
      searchBooks = [];
      searchState = 'error';
      meta.textContent = '검색 결과를 불러오지 못했어요.';
      document.getElementById('recRetry').hidden = false;
      grid.innerHTML = '<p class="rec-empty">잠시 후 다시 시도하거나 다른 검색어를 입력해 주세요.</p>';
    } finally {
      if (currentRequest === requestId) {
        if (form) form.setAttribute('aria-busy', 'false');
        if (results) results.setAttribute('aria-busy', 'false');
        if (button) button.disabled = false;
      }
    }
  }

  function normalizeItem(item) {
    const normalized = API.normalizeAladin(item);
    if (!normalized) return null;
    const book = { ...normalized };
    delete book._raw;
    delete book.contents;
    book.author = (book.authors || []).join(', ');
    return book;
  }

  function renderBooks() {
    const grid = document.getElementById('searchGrid');
    if (!grid) return;
    renderShelf();
    if (searchState !== 'ready') { attachCardListeners(); return; }
    searchBooks.forEach(book => { if (inLibrary(book)) selected.delete(book.isbn); });
    updateSelection();
    attachCardListeners();
    if (searchBooks.length === 0) {
      grid.innerHTML = '<p class="rec-empty">검색 결과가 없어요. 관심 주제나 검색어를 바꿔 다시 찾아보세요.</p>';
      return;
    }

    grid.innerHTML = searchBooks.map(book => renderCard(book)).join('');
    attachCardListeners();
    applyRecView();
  }

  function renderCard(book, selectable = true) {
    const cover = book.thumbnail || PLACEHOLDER;
    const bookJson = escapeAttr(JSON.stringify(book));
    return `
      <article class="rec-browse-card">
      <button type="button" class="rec-preview-button" data-book="${bookJson}">
        <img class="rec-browse-cover" src="${escapeAttr(cover)}" alt="" loading="lazy" onerror="this.src='${PLACEHOLDER}'">
        <div class="rec-browse-info">
          <h3 class="rec-browse-book-title">${escapeHtml(book.title)}</h3>
          <p class="rec-browse-author">${escapeHtml(book.author || '')}</p>
        </div>
      </button>
      ${inLibrary(book) ? '<span class="rec-library-badge">✓ 내 서재에 있어요</span>' : book.isbn && selectable ? `<label class="rec-book-select"><input type="checkbox" data-select-isbn="${escapeAttr(book.isbn)}" ${selected.has(book.isbn) ? 'checked' : ''}><span>${escapeHtml(book.title)} 선택</span></label>` : '<span class="rec-library-badge">눌러서 상세 보기</span>'}
      </article>
    `;
  }

  function attachCardListeners() {
    document.querySelectorAll('[data-select-isbn]').forEach(input => {
      if (input.dataset.listenerAttached) return;
      input.dataset.listenerAttached = 'true';
      input.addEventListener('change', () => {
        input.checked ? selected.add(input.dataset.selectIsbn) : selected.delete(input.dataset.selectIsbn);
        updateSelection();
      });
    });
    document.querySelectorAll('.rec-preview-button').forEach(card => {
      if (card.dataset.listenerAttached) return;
      card.dataset.listenerAttached = 'true';
      card.addEventListener('click', () => {
        let book;
        try { book = JSON.parse(card.dataset.book); } catch { return; }
        if (window.BookPreview && typeof BookPreview.showList === 'function') {
          const books = [...card.closest('.rec-browse-grid').querySelectorAll('.rec-preview-button')]
            .map(item => {
              try { return JSON.parse(item.dataset.book); } catch { return null; }
            })
            .filter(Boolean);
          const index = books.findIndex(item => item.isbn === book.isbn);
          BookPreview.showList(books, Math.max(index, 0), { mode: 'recommend' });
          return;
        }
        if (window.BookPreview) BookPreview.show(book, { mode: 'recommend' });
      });
    });
  }

  function attachViewToggle() {
    const button = document.getElementById('recViewToggleBtn');
    if (!button) return;
    applyRecView();
    button.addEventListener('click', () => {
      recView = recView === 'grid' ? 'list' : 'grid';
      localStorage.setItem('recView', recView);
      applyRecView();
    });
  }

  function applyRecView() {
    const grid = document.getElementById('searchGrid');
    const button = document.getElementById('recViewToggleBtn');
    if (grid) grid.classList.toggle('list-view', recView === 'list');
    if (!button) return;
    const listIcon = button.querySelector('.icon-list');
    const gridIcon = button.querySelector('.icon-grid');
    if (listIcon) listIcon.style.display = recView === 'list' ? 'none' : '';
    if (gridIcon) gridIcon.style.display = recView === 'list' ? '' : 'none';
    button.setAttribute('aria-label', recView === 'list' ? '그리드 보기로 전환' : '목록 보기로 전환');
  }

  function attachScrollTop() {
    const button = document.getElementById('scrollTopBtn');
    if (!button) return;
    window.addEventListener('scroll', () => {
      button.classList.toggle('visible', window.scrollY > 300);
    }, { passive: true });
    button.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value || '';
    return div.innerHTML;
  }

  function escapeAttr(value) {
    return (value || '').replace(/[&"'<>]/g, char => ({
      '&': '&amp;',
      '"': '&quot;',
      "'": '&#39;',
      '<': '&lt;',
      '>': '&gt;',
    })[char]);
  }
})();
