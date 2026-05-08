/**
 * 추천 도서 브라우징 페이지 (학년별 섹션)
 */

(function () {
  'use strict';

  let recommendationData = null;
  let allBooks = [];
  let textbookMode = false;
  let kinderData = null;

  // ── Load data ────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    try {
      const [res, kinderRes] = await Promise.all([
        fetch('data/book-recommendations.json'),
        fetch('data/kindergarten-curated.json').catch(() => null),
      ]);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      recommendationData = await res.json();
      if (window.BookPreview) BookPreview.setRecData(recommendationData);

      // Convert books object to array
      allBooks = Object.values(recommendationData.books || {});

      if (allBooks.length === 0) {
        throw new Error('No books in database');
      }

      if (kinderRes && kinderRes.ok) {
        kinderData = await kinderRes.json();
      }

      console.log(`[recommendations] ${allBooks.length}권 로드 완료`);
      attachModeTabListeners();
      attachScrollTop();
      renderGradeSections();
      attachSearchListener();
    } catch (err) {
      console.error('[recommendations] 데이터 로드 실패:', err);
      const content = document.getElementById('gradeContent');
      content.innerHTML = `
        <p style="text-align:center;padding:60px 16px;color:#999">
          추천 도서 목록을 불러올 수 없습니다.<br>
          <small style="color:#ccc;font-size:11px">${escapeHtml(err.message)}</small>
        </p>
      `;
    }
  }

  // ── Mode Tabs ────────────────────────────────────────────────

  function attachModeTabListeners() {
    const btnAll = document.getElementById('modeAll');
    const btnTB  = document.getElementById('modeTextbook');
    if (!btnAll || !btnTB) return;

    function setMode(tb) {
      textbookMode = tb;
      btnAll.style.color = tb ? '#999' : '#FF6B6B';
      btnAll.style.borderBottom = tb ? 'none' : '2px solid #FF6B6B';
      btnAll.style.marginBottom = tb ? '' : '-2px';
      btnTB.style.color  = tb ? '#27ae60' : '#999';
      btnTB.style.borderBottom = tb ? '2px solid #27ae60' : 'none';
      btnTB.style.marginBottom = tb ? '-2px' : '';

      // 검색 상태 초기화 + gradeContent 강제 표시
      const searchInput = document.getElementById('recSearch');
      if (searchInput) searchInput.value = '';
      const resultsEl = document.getElementById('searchResults');
      if (resultsEl) resultsEl.hidden = true;
      const gradeEl = document.getElementById('gradeContent');
      if (gradeEl) gradeEl.style.display = 'block';

      renderGradeSections();
    }

    btnAll.addEventListener('click', () => setMode(false));
    btnTB.addEventListener('click', () => setMode(true));
  }

  // ── Grade Sections ───────────────────────────────────────────

  // 각 학년별 상태 관리
  const sectionState = {};

  function renderGradeSections() {
    if (textbookMode) { renderTextbookSections(); return; }

    const content = document.getElementById('gradeContent');

    // 유치원 특선은 유아 섹션 안쪽 (책 목록 아래) 에 nested details로 들어감
    const kinderInnerHtml = kinderData ? renderKindergartenSection() : '';

    const grades = [
      { id: '유아',        icon: '🐣', name: '유치원 (5~7세)'       },
      { id: '초등 1학년', icon: '📗', name: '초등 1학년 (입문)'    },
      { id: '초등 저학년', icon: '📖', name: '초등 저학년 (2-3학년)' },
      { id: '초등 고학년', icon: '📕', name: '초등 고학년 (4-6학년)' },
    ];

    const INITIAL_SHOW = 8;

    const sections = grades.map((grade, gradeIdx) => {
      const allGradeBooks = allBooks.filter(b => b.targetAge === grade.id);
      if (allGradeBooks.length === 0) return '';

      // 초기 상태 설정
      if (!sectionState[grade.id]) {
        sectionState[grade.id] = {
          sort: 'popularity', // popularity, recent, title
          genre: 'all',
          source: 'all',
          current: INITIAL_SHOW,
          open: false,
        };
      }

      // 장르 목록 추출
      const genres = ['all', ...new Set(allGradeBooks.map(b => b.genre).filter(Boolean))];

      const genreChips = genres.map(g =>
        `<button class="genre-chip ${sectionState[grade.id].genre === g ? 'active' : ''}" data-grade="${grade.id}" data-genre="${g}" style="padding:6px 12px;border:1px solid #ddd;border-radius:16px;background:${sectionState[grade.id].genre === g ? '#FF6B6B' : '#fff'};color:${sectionState[grade.id].genre === g ? '#fff' : '#666'};font-size:12px;cursor:pointer;flex-shrink:0;white-space:nowrap">${g === 'all' ? '전체' : g}</button>`
      ).join('');

      // 출처(추천 기관) 드롭다운 — 이 학년 책에 실제 등장한 소스만, meta.sources 정의 순서로
      const sourcesPresent = new Set();
      allGradeBooks.forEach(b => (b.lists || []).forEach(id => sourcesPresent.add(id)));
      const availableSources = (recommendationData.meta.sources || []).filter(s => sourcesPresent.has(s.id));
      const activeSource = sectionState[grade.id].source;
      const sourceSelect = availableSources.length === 0 ? '' : (() => {
        const allOpt = `<option value="all" ${activeSource === 'all' ? 'selected' : ''}>전체 (${allGradeBooks.length})</option>`;
        const items = availableSources.map(s => {
          const count = allGradeBooks.filter(b => (b.lists || []).includes(s.id)).length;
          return `<option value="${s.id}" ${activeSource === s.id ? 'selected' : ''}>${escapeHtml(s.badge.text)} (${count})</option>`;
        }).join('');
        return `<select class="source-select" data-grade="${grade.id}">${allOpt}${items}</select>`;
      })();

      return `
        <details class="grade-section" data-grade-idx="${gradeIdx}" data-grade-id="${grade.id}" ${sectionState[grade.id].open ? 'open' : ''} style="margin-bottom:16px;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden">
          <summary style="padding:16px;cursor:pointer;background:#f9f9f9;display:flex;justify-content:space-between;align-items:center;user-select:none">
            <h2 class="grade-title" style="margin:0">${grade.icon} ${grade.name}</h2>
            <span class="grade-count">${allGradeBooks.length}권</span>
          </summary>
          <div style="padding:16px">
            <!-- 정렬 버튼 -->
            <div style="margin-bottom:12px;display:flex;gap:8px;flex-wrap:wrap">
              <button class="sort-btn ${sectionState[grade.id].sort === 'popularity' ? 'active' : ''}" data-grade="${grade.id}" data-sort="popularity" style="padding:8px 14px;border:1px solid #ddd;border-radius:6px;background:${sectionState[grade.id].sort === 'popularity' ? '#4A90E2' : '#fff'};color:${sectionState[grade.id].sort === 'popularity' ? '#fff' : '#666'};font-size:13px;font-weight:${sectionState[grade.id].sort === 'popularity' ? '600' : '400'};cursor:pointer">📊 인기순</button>
              <button class="sort-btn ${sectionState[grade.id].sort === 'recent' ? 'active' : ''}" data-grade="${grade.id}" data-sort="recent" style="padding:8px 14px;border:1px solid #ddd;border-radius:6px;background:${sectionState[grade.id].sort === 'recent' ? '#4A90E2' : '#fff'};color:${sectionState[grade.id].sort === 'recent' ? '#fff' : '#666'};font-size:13px;font-weight:${sectionState[grade.id].sort === 'recent' ? '600' : '400'};cursor:pointer">🆕 최신순</button>
              <button class="sort-btn ${sectionState[grade.id].sort === 'title' ? 'active' : ''}" data-grade="${grade.id}" data-sort="title" style="padding:8px 14px;border:1px solid #ddd;border-radius:6px;background:${sectionState[grade.id].sort === 'title' ? '#4A90E2' : '#fff'};color:${sectionState[grade.id].sort === 'title' ? '#fff' : '#666'};font-size:13px;font-weight:${sectionState[grade.id].sort === 'title' ? '600' : '400'};cursor:pointer">🔤 가나다순</button>
            </div>

            ${sourceSelect ? `
            <!-- 출처(추천 기관) 필터 -->
            <div style="margin-bottom:8px">
              <span style="font-size:11px;color:#999;letter-spacing:0.04em;display:block;margin-bottom:4px">출처</span>
              ${sourceSelect}
            </div>` : ''}

            <!-- 장르 필터 -->
            <div style="margin-bottom:16px">
              <span style="font-size:11px;color:#999;letter-spacing:0.04em;display:block;margin-bottom:4px">장르</span>
              <div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;-webkit-overflow-scrolling:touch;scrollbar-width:none">
                ${genreChips}
              </div>
            </div>

            <!-- 책 그리드 -->
            <div class="rec-browse-grid" data-grade="${grade.id}">
              <!-- 동적으로 렌더링 -->
            </div>

            <!-- 더보기 버튼 -->
            <div class="more-btn-container" data-grade="${grade.id}"></div>
            ${grade.id === '유아' ? kinderInnerHtml : ''}
          </div>
        </details>
      `;
    }).filter(Boolean).join('');

    content.innerHTML = sections;

    // 각 섹션의 책 목록 렌더링
    grades.forEach(grade => {
      renderSectionBooks(grade.id, INITIAL_SHOW);
    });

    // Kindergarten section card listeners (now nested inside 유아 section)
    if (kinderInnerHtml) {
      const kinderSection = content.querySelector('#kinderSection');
      if (kinderSection) {
        attachCardListeners();
        backfillThumbnails(kinderSection);
      }
    }

    // 이벤트 리스너 등록
    attachSectionListeners();
    applyRecView();
  }

  function renderSectionBooks(gradeId, showCount) {
    const allGradeBooks = allBooks.filter(b => b.targetAge === gradeId);
    const state = sectionState[gradeId];

    // 출처 필터 + 장르 필터 (AND)
    let filteredBooks = allGradeBooks;
    if (state.source && state.source !== 'all') {
      filteredBooks = filteredBooks.filter(b => (b.lists || []).includes(state.source));
    }
    if (state.genre && state.genre !== 'all') {
      filteredBooks = filteredBooks.filter(b => b.genre === state.genre);
    }

    // 정렬 적용
    if (state.sort === 'popularity') {
      filteredBooks.sort((a, b) => (b.lists || []).length - (a.lists || []).length);
    } else if (state.sort === 'recent') {
      filteredBooks.sort((a, b) => (b.year || 0) - (a.year || 0));
    } else if (state.sort === 'title') {
      filteredBooks.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'ko'));
    }

    // 표시할 책 수 제한
    const booksToShow = filteredBooks.slice(0, showCount);
    const hasMore = filteredBooks.length > showCount;

    // 그리드 렌더링
    const grid = document.querySelector(`.rec-browse-grid[data-grade="${CSS.escape(gradeId)}"]`);
    if (grid) {
      grid.innerHTML = booksToShow.map(book => renderCard(book)).join('');
      attachCardListeners();
      backfillThumbnails(grid);
    }

    // 더보기 버튼 렌더링
    const moreContainer = document.querySelector(`.more-btn-container[data-grade="${CSS.escape(gradeId)}"]`);
    if (moreContainer) {
      if (hasMore) {
        moreContainer.innerHTML = `
          <button class="btn-secondary" style="width:100%;margin-top:16px" data-load-more="${gradeId}" data-current="${showCount}">
            더보기 (+${filteredBooks.length - showCount}권)
          </button>
        `;
      } else {
        moreContainer.innerHTML = '';
      }
    }

    // 더보기 버튼 이벤트
    const moreBtn = moreContainer?.querySelector('[data-load-more]');
    if (moreBtn) {
      moreBtn.addEventListener('click', () => {
        const current = parseInt(moreBtn.dataset.current);
        const LOAD_MORE = 12;
        renderSectionBooks(gradeId, current + LOAD_MORE);
      });
    }
  }

  // ── Kindergarten Curated Section ──────────────────────────────

  function renderKindergartenSection() {
    if (!kinderData || !kinderData.themes) return '';

    const themes = kinderData.themes;
    const booksMap = new Map(allBooks.map(b => [String(b.isbn), b]));

    const themeHtml = themes.map(theme => {
      const themeBooks = (theme.books || []).map(pick => {
        const fromDB = booksMap.get(String(pick.isbn));
        const book = fromDB
          ? { ...fromDB, why: pick.why || fromDB.why }
          : { isbn: pick.isbn, title: pick.title, author: pick.author, publisher: pick.publisher, why: pick.why, lists: [], targetAge: '유아', genre: '그림책' };
        return book;
      });

      const cards = themeBooks.map(book => renderCard(book)).join('');

      return `<div style="margin-bottom:16px">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;padding:0 16px">
          <span style="font-size:18px">${theme.emoji}</span>
          <span style="font-family:var(--font-body);font-size:13px;font-weight:700;color:var(--text)">${escapeHtml(theme.name)}</span>
          <span style="font-size:11px;color:var(--text-mute)">${escapeHtml(theme.description)}</span>
        </div>
        <div class="kinder-book-grid">${cards}</div>
      </div>`;
    }).join('');

    return `<details id="kinderSection" style="margin-top:20px;padding-top:16px;border-top:1px dashed var(--border)">
      <summary class="kinder-summary" style="margin:0 -16px;padding:12px 16px">
        <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0">
          <span style="font-size:18px">🌸</span>
          <div>
            <div style="font-family:var(--font-body);font-size:14px;font-weight:700;color:var(--text)">유치원 특선 <span style="font-size:11px;font-weight:400;color:var(--text-soft)">(5~7세)</span></div>
            <div style="font-size:11px;color:var(--text-mute);margin-top:2px;font-style:italic">어린이도서연구회·학교도서관저널·행복한아침독서 추천 그림책</div>
          </div>
        </div>
        <svg class="kinder-chevron" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </summary>
      <div style="padding-top:12px">${themeHtml}</div>
    </details>`;
  }

  // ── Textbook Mode: 1~6학년 개별 섹션 ────────────────────────

  const tbState = {};  // { [grade]: { sort, current, open } }

  function renderTextbookSections() {
    const content = document.getElementById('gradeContent');
    const tbGrades = [
      { g: 1, icon: '📗', name: '1학년' },
      { g: 2, icon: '📘', name: '2학년' },
      { g: 3, icon: '📙', name: '3학년' },
      { g: 4, icon: '📕', name: '4학년' },
      { g: 5, icon: '📓', name: '5학년' },
      { g: 6, icon: '📔', name: '6학년' },
    ];
    const INITIAL = 8;

    const sections = tbGrades.map(({ g, icon, name }) => {
      const books = allBooks.filter(b => b.textbookGrade === g);
      if (!books.length) return '';
      if (!tbState[g]) tbState[g] = { sort: 'title', current: INITIAL, open: false };

      return `
        <details class="grade-section tb-section" data-tb-grade="${g}" ${tbState[g].open ? 'open' : ''} style="margin-bottom:16px;border:1px solid #b8e0c8;border-radius:8px;overflow:hidden">
          <summary style="padding:16px;cursor:pointer;background:#f0faf4;display:flex;justify-content:space-between;align-items:center;user-select:none">
            <h2 class="grade-title" style="margin:0;color:#1a7a45">${icon} 초등 ${name}</h2>
            <span class="grade-count" style="color:#27ae60">${books.length}권</span>
          </summary>
          <div style="padding:16px">
            <div style="margin-bottom:12px;display:flex;gap:8px">
              ${['title','popularity','recent'].map(s => {
                const label = s === 'title' ? '🔤 가나다' : s === 'popularity' ? '📊 인기' : '🆕 최신';
                const active = tbState[g].sort === s;
                return `<button class="tb-sort-btn" data-tbg="${g}" data-sort="${s}" style="padding:7px 12px;border:1px solid ${active ? '#27ae60' : '#ddd'};border-radius:6px;background:${active ? '#27ae60' : '#fff'};color:${active ? '#fff' : '#666'};font-size:12px;cursor:pointer">${label}</button>`;
              }).join('')}
            </div>
            <div class="tb-grid" data-tbg="${g}"></div>
            <div class="tb-more" data-tbg="${g}"></div>
          </div>
        </details>
      `;
    }).filter(Boolean).join('');

    content.innerHTML = sections;

    tbGrades.forEach(({ g }) => renderTbBooks(g, INITIAL));
    attachTbListeners();
    applyRecView();
  }

  function renderTbBooks(g, showCount) {
    const state = tbState[g];
    let books = allBooks.filter(b => b.textbookGrade === g);

    if (state.sort === 'popularity') books.sort((a, b) => (b.lists||[]).length - (a.lists||[]).length);
    else if (state.sort === 'recent') books.sort((a, b) => (b.year||0) - (a.year||0));
    else books.sort((a, b) => (a.title||'').localeCompare(b.title||'', 'ko'));

    const shown = books.slice(0, showCount);
    const hasMore = books.length > showCount;

    const grid = document.querySelector(`.tb-grid[data-tbg="${g}"]`);
    if (grid) {
      grid.innerHTML = shown.map(b => renderCard(b, true)).join('');
      attachCardListeners();
      backfillThumbnails(grid);
    }

    const more = document.querySelector(`.tb-more[data-tbg="${g}"]`);
    if (more) {
      more.innerHTML = hasMore
        ? `<button class="btn-secondary" style="width:100%;margin-top:16px" data-tb-more="${g}" data-current="${showCount}">더보기 (+${books.length - showCount}권)</button>`
        : '';
      more.querySelector('[data-tb-more]')?.addEventListener('click', e => {
        const cur = parseInt(e.target.dataset.current);
        renderTbBooks(g, cur + 12);
      });
    }
  }

  function attachTbListeners() {
    document.querySelectorAll('details.tb-section').forEach(d => {
      d.addEventListener('toggle', () => {
        const g = parseInt(d.dataset.tbGrade);
        if (tbState[g]) tbState[g].open = d.open;
      });
    });
    document.querySelectorAll('.tb-sort-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation(); e.preventDefault();
        const g = parseInt(btn.dataset.tbg);
        tbState[g].sort = btn.dataset.sort;
        tbState[g].open = true;
        renderTextbookSections();
      });
    });
  }

  function attachSectionListeners() {
    // details 열림/닫힘 상태 보존
    document.querySelectorAll('details.grade-section').forEach(d => {
      d.addEventListener('toggle', () => {
        const gradeId = d.dataset.gradeId;
        if (gradeId && sectionState[gradeId]) {
          sectionState[gradeId].open = d.open;
        }
      });
    });

    // 정렬 버튼
    document.querySelectorAll('.sort-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const gradeId = btn.dataset.grade;
        const sortType = btn.dataset.sort;
        sectionState[gradeId].sort = sortType;
        sectionState[gradeId].current = 8;
        sectionState[gradeId].open = true; // 정렬 변경 시 열림 유지
        renderGradeSections();
      });
    });

    // 장르 필터
    document.querySelectorAll('.genre-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const gradeId = chip.dataset.grade;
        const genre = chip.dataset.genre;
        sectionState[gradeId].genre = genre;
        sectionState[gradeId].current = 8;
        sectionState[gradeId].open = true;
        renderGradeSections();
      });
    });

    // 출처 필터 (드롭다운)
    document.querySelectorAll('.source-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        e.stopPropagation();
        const gradeId = sel.dataset.grade;
        sectionState[gradeId].source = sel.value;
        sectionState[gradeId].current = 8;
        sectionState[gradeId].open = true;
        renderGradeSections();
      });
      // summary 클릭 토글이 select 클릭에 반응하지 않도록 차단
      sel.addEventListener('click', (e) => e.stopPropagation());
    });
  }

  function attachCardListeners() {
    document.querySelectorAll('.rec-browse-card').forEach(card => {
      if (card.dataset.listenerAttached) return;
      card.dataset.listenerAttached = 'true';

      card.addEventListener('click', () => {
        const bookData = JSON.parse(card.dataset.book);

        // Build list from the same grid section for swipe navigation
        const grid = card.closest('.rec-browse-grid, .tb-grid, .kinder-book-grid, #searchGrid');
        if (grid && window.BookPreview && BookPreview.showList) {
          const siblings = [...grid.querySelectorAll('.rec-browse-card')];
          const books = siblings.map(c => {
            try {
              const b = JSON.parse(c.dataset.book);
              return { ...b, authors: b.authors || (b.author ? [b.author] : []) };
            } catch { return null; }
          }).filter(Boolean);
          const idx = books.findIndex(b => b.isbn === bookData.isbn);
          BookPreview.showList(books, Math.max(0, idx), { mode: 'recommend' });
        } else {
          showBookPreview(bookData);
        }
      });
    });
  }

  // 빈 표지 placeholder (한 군데서 재사용)
  const PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 140%22%3E%3Crect fill=%22%23e0e0e0%22 width=%22100%22 height=%22140%22/%3E%3Ctext x=%2250%22 y=%2270%22 text-anchor=%22middle%22 font-size=%2240%22 fill=%22%23999%22%3E書%3C/text%3E%3C/svg%3E';

  // ISBN별 alanin lookup 결과 캐시 (thumbnail만)
  const thumbCache = new Map();

  function renderCard(book, showUnit = false) {
    const cover = book.thumbnail || PLACEHOLDER;
    const needsLookup = !book.thumbnail && !!book.isbn;

    const badges = (book.lists || []).map(listId => {
      const source = recommendationData.meta.sources.find(s => s.id === listId);
      if (!source) return '';
      return `<span class="rec-browse-badge" style="background:${source.badge.color}">${escapeHtml(source.badge.text)}</span>`;
    }).filter(Boolean).join('');

    const bookJson = escapeAttr(JSON.stringify(book));
    const unitBadge = showUnit && book.textbookUnit
      ? `<span style="display:inline-block;margin-top:3px;padding:2px 6px;border-radius:3px;background:#e8f5e9;color:#2e7d32;font-size:9px;font-weight:600">${escapeHtml(book.textbookUnit)}</span>`
      : '';

    return `
      <button type="button" class="rec-browse-card" data-book="${bookJson}"${needsLookup ? ` data-needs-thumb="${escapeAttr(book.isbn)}"` : ''}>
        <img class="rec-browse-cover" src="${escapeAttr(cover)}" alt="" loading="lazy" onerror="this.src='${PLACEHOLDER}'">
        <div class="rec-browse-info">
          <h3 class="rec-browse-book-title">${escapeHtml(book.title)}</h3>
          <p class="rec-browse-author">${escapeHtml(book.author || '')}</p>
          ${badges ? `<div class="rec-browse-badges">${badges}</div>` : ''}
          ${unitBadge}
        </div>
      </button>
    `;
  }

  /**
   * 카드 렌더 후 thumbnail 없는 책들을 알라딘 lookup으로 채움.
   * 동시 4개까지 병렬로 fetch — 합격자 노트 책은 알라딘에 cover가 있는데
   * 우리 DB에 미수집된 경우가 다수.
   */
  async function backfillThumbnails(root = document) {
    if (!window.API || typeof API.aladinLookup !== 'function') return;
    const cards = [...root.querySelectorAll('[data-needs-thumb]')];
    if (!cards.length) return;

    const CONCURRENCY = 4;
    let cursor = 0;

    async function worker() {
      while (cursor < cards.length) {
        const card = cards[cursor++];
        const isbn = card.dataset.needsThumb;
        delete card.dataset.needsThumb;
        if (!isbn) continue;

        let cover = thumbCache.get(isbn);
        if (cover === undefined) {
          try {
            const item = await API.aladinLookup(isbn);
            cover = (item && item.cover) || null;
          } catch {
            cover = null;
          }
          thumbCache.set(isbn, cover);
        }
        if (cover) {
          const img = card.querySelector('img.rec-browse-cover');
          if (img && img.src.startsWith('data:')) img.src = cover;
          // 미리보기 모달에서도 표지가 보이도록 dataset.book에 반영
          try {
            const bookData = JSON.parse(card.dataset.book);
            bookData.thumbnail = cover;
            card.dataset.book = JSON.stringify(bookData);
          } catch {}
        }
      }
    }

    await Promise.all(Array(CONCURRENCY).fill(0).map(() => worker()));
  }

  // ── Search ───────────────────────────────────────────────────

  function attachSearchListener() {
    const input = document.getElementById('recSearch');
    if (!input) return;
    let timer = null;
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => runSearch(input.value.trim()), 150);
    });
  }

  function runSearch(query) {
    const resultsEl = document.getElementById('searchResults');
    const gradeEl = document.getElementById('gradeContent');
    const grid = document.getElementById('searchGrid');
    const meta = document.getElementById('searchMeta');
    if (!resultsEl || !grid || !meta) return;

    if (!query) {
      resultsEl.hidden = true;
      gradeEl.style.display = '';
      return;
    }

    // 공백 무시 + 소문자 (한글은 영향 없음, 영어 입력 대응)
    const norm = s => (s || '').toLowerCase().replace(/\s+/g, '');
    const q = norm(query);
    const matches = allBooks.filter(b => {
      return norm(b.title).includes(q) || norm(b.author).includes(q);
    }).slice(0, 60);

    meta.textContent = `"${query}" 검색 결과 ${matches.length}권${matches.length === 60 ? ' (상위 60)' : ''}`;
    grid.innerHTML = matches.map(b => renderCard(b)).join('') ||
      `<p class="rec-empty">일치하는 책이 없어요.</p>`;
    attachCardListeners();
    backfillThumbnails(grid);

    resultsEl.hidden = false;
    gradeEl.style.display = 'none';
  }

  // ── Preview Modal (delegated to BookPreview module) ──────────

  function showBookPreview(book) {
    if (!window.BookPreview) {
      console.error('[recommendations] BookPreview 모듈 미로드');
      return;
    }
    // Recommendation entries store author as string; normalize to authors[]
    const normalized = {
      ...book,
      authors: book.authors || (book.author ? [book.author] : []),
    };
    BookPreview.show(normalized, { mode: 'recommend' });
  }

  // ── List view (forced) ──────────────────────────────────────

  function applyRecView() {
    document.querySelectorAll('.rec-browse-grid, .tb-grid, .kinder-book-grid').forEach(el => {
      el.classList.add('list-view');
    });
  }

  // ── Scroll to Top ────────────────────────────────────────────

  function attachScrollTop() {
    const btn = document.getElementById('scrollTopBtn');
    if (!btn) return;
    window.addEventListener('scroll', () => {
      btn.classList.toggle('visible', window.scrollY > 300);
    }, { passive: true });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  // ── Utilities ────────────────────────────────────────────────

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return (str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

})();
