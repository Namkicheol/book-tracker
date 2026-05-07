/**
 * 추천 도서 브라우징 페이지 (학년별 섹션)
 */

(function () {
  'use strict';

  let recommendationData = null;
  let allBooks = [];

  // ── Load data ────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    try {
      const res = await fetch('data/book-recommendations.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      recommendationData = await res.json();
      if (window.BookPreview) BookPreview.setRecData(recommendationData);

      // Convert books object to array
      allBooks = Object.values(recommendationData.books || {});

      if (allBooks.length === 0) {
        throw new Error('No books in database');
      }

      console.log(`[recommendations] ${allBooks.length}권 로드 완료`);
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

  // ── Grade Sections ───────────────────────────────────────────

  // 각 학년별 상태 관리
  const sectionState = {};

  function renderGradeSections() {
    const content = document.getElementById('gradeContent');

    const grades = [
      { id: '유아',        icon: '🐣', name: '유아'                },
      { id: '초등 저학년', icon: '📖', name: '초등 저학년 (1-3학년)' },
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

      // 출처 칩 — 이 학년 책에 실제 등장한 소스만, meta.sources 정의 순서로
      const sourcesPresent = new Set();
      allGradeBooks.forEach(b => (b.lists || []).forEach(id => sourcesPresent.add(id)));
      const availableSources = (recommendationData.meta.sources || []).filter(s => sourcesPresent.has(s.id));
      const activeSource = sectionState[grade.id].source;
      const sourceChips = availableSources.length === 0 ? '' : (() => {
        const allChip =
          `<button class="source-chip ${activeSource === 'all' ? 'active' : ''}" data-grade="${grade.id}" data-source="all" style="padding:6px 12px;border:1px solid #ddd;border-radius:16px;background:${activeSource === 'all' ? '#444' : '#fff'};color:${activeSource === 'all' ? '#fff' : '#666'};font-size:12px;cursor:pointer;flex-shrink:0;white-space:nowrap">전체</button>`;
        const items = availableSources.map(s => {
          const count = allGradeBooks.filter(b => (b.lists || []).includes(s.id)).length;
          const isActive = activeSource === s.id;
          const bg = isActive ? s.badge.color : '#fff';
          const fg = isActive ? '#fff' : '#666';
          return `<button class="source-chip ${isActive ? 'active' : ''}" data-grade="${grade.id}" data-source="${s.id}" style="padding:6px 12px;border:1px solid #ddd;border-radius:16px;background:${bg};color:${fg};font-size:12px;cursor:pointer;flex-shrink:0;white-space:nowrap">${escapeHtml(s.badge.text)} <span style="opacity:0.7;font-size:11px">${count}</span></button>`;
        }).join('');
        return allChip + items;
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

            ${sourceChips ? `
            <!-- 출처(추천 기관) 필터 -->
            <div style="margin-bottom:8px">
              <span style="font-size:11px;color:#999;letter-spacing:0.04em;display:block;margin-bottom:4px">출처</span>
              <div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;-webkit-overflow-scrolling:touch;scrollbar-width:none">
                ${sourceChips}
              </div>
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
          </div>
        </details>
      `;
    }).filter(Boolean).join('');

    content.innerHTML = sections;

    // 각 섹션의 책 목록 렌더링
    grades.forEach(grade => {
      renderSectionBooks(grade.id, INITIAL_SHOW);
    });

    // 이벤트 리스너 등록
    attachSectionListeners();
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

    // 출처 필터
    document.querySelectorAll('.source-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const gradeId = chip.dataset.grade;
        const source = chip.dataset.source;
        sectionState[gradeId].source = source;
        sectionState[gradeId].current = 8;
        sectionState[gradeId].open = true;
        renderGradeSections();
      });
    });
  }

  function attachCardListeners() {
    document.querySelectorAll('.rec-browse-card').forEach(card => {
      if (card.dataset.listenerAttached) return;
      card.dataset.listenerAttached = 'true';

      card.addEventListener('click', () => {
        const bookData = JSON.parse(card.dataset.book);
        showBookPreview(bookData);
      });
    });
  }

  // 빈 표지 placeholder (한 군데서 재사용)
  const PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 140%22%3E%3Crect fill=%22%23e0e0e0%22 width=%22100%22 height=%22140%22/%3E%3Ctext x=%2250%22 y=%2270%22 text-anchor=%22middle%22 font-size=%2240%22 fill=%22%23999%22%3E書%3C/text%3E%3C/svg%3E';

  // ISBN별 alanin lookup 결과 캐시 (thumbnail만)
  const thumbCache = new Map();

  function renderCard(book) {
    const cover = book.thumbnail || PLACEHOLDER;
    const needsLookup = !book.thumbnail && !!book.isbn;

    const badges = (book.lists || []).map(listId => {
      const source = recommendationData.meta.sources.find(s => s.id === listId);
      if (!source) return '';
      return `<span class="rec-browse-badge" style="background:${source.badge.color}">${escapeHtml(source.badge.text)}</span>`;
    }).filter(Boolean).join('');

    const bookJson = escapeAttr(JSON.stringify(book));

    return `
      <button type="button" class="rec-browse-card" data-book="${bookJson}"${needsLookup ? ` data-needs-thumb="${escapeAttr(book.isbn)}"` : ''}>
        <img class="rec-browse-cover" src="${escapeAttr(cover)}" alt="" loading="lazy" onerror="this.src='${PLACEHOLDER}'">
        <div class="rec-browse-info">
          <h3 class="rec-browse-book-title">${escapeHtml(book.title)}</h3>
          <p class="rec-browse-author">${escapeHtml(book.author || '')}</p>
          ${badges ? `<div class="rec-browse-badges">${badges}</div>` : ''}
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
