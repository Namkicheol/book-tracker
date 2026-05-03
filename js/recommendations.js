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
      { id: '유아', icon: '🐣', name: '유아' },
      { id: '초등 저학년', icon: '📖', name: '초등 저학년 (1-2학년)' },
      { id: '초등 중학년', icon: '📚', name: '초등 중학년 (3-4학년)' },
      { id: '초등 고학년', icon: '📕', name: '초등 고학년 (5-6학년)' },
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
          current: INITIAL_SHOW
        };
      }

      // 장르 목록 추출
      const genres = ['all', ...new Set(allGradeBooks.map(b => b.genre).filter(Boolean))];

      const genreChips = genres.map(g =>
        `<button class="genre-chip ${sectionState[grade.id].genre === g ? 'active' : ''}" data-grade="${grade.id}" data-genre="${g}" style="padding:6px 12px;margin:4px;border:1px solid #ddd;border-radius:16px;background:${sectionState[grade.id].genre === g ? '#FF6B6B' : '#fff'};color:${sectionState[grade.id].genre === g ? '#fff' : '#666'};font-size:12px;cursor:pointer">${g === 'all' ? '전체' : g}</button>`
      ).join('');

      return `
        <details class="grade-section" data-grade-idx="${gradeIdx}" data-grade-id="${grade.id}" style="margin-bottom:16px;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden">
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

            <!-- 장르 필터 -->
            <div style="margin-bottom:16px;display:flex;flex-wrap:wrap">
              ${genreChips}
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

    // 장르 필터 적용
    let filteredBooks = state.genre === 'all'
      ? allGradeBooks
      : allGradeBooks.filter(b => b.genre === state.genre);

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
    // 정렬 버튼
    document.querySelectorAll('.sort-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const gradeId = btn.dataset.grade;
        const sortType = btn.dataset.sort;
        sectionState[gradeId].sort = sortType;
        sectionState[gradeId].current = 8; // 정렬 변경 시 초기화
        renderGradeSections();
      });
    });

    // 장르 필터
    document.querySelectorAll('.genre-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const gradeId = chip.dataset.grade;
        const genre = chip.dataset.genre;
        sectionState[gradeId].genre = genre;
        sectionState[gradeId].current = 8; // 필터 변경 시 초기화
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

  function renderCard(book) {
    const cover = book.thumbnail || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 140%22%3E%3Crect fill=%22%23e0e0e0%22 width=%22100%22 height=%22140%22/%3E%3Ctext x=%2250%22 y=%2270%22 text-anchor=%22middle%22 font-size=%2240%22 fill=%22%23999%22%3E書%3C/text%3E%3C/svg%3E';

    const badges = (book.lists || []).map(listId => {
      const source = recommendationData.meta.sources.find(s => s.id === listId);
      if (!source) return '';
      return `<span class="rec-browse-badge" style="background:${source.badge.color}">${escapeHtml(source.badge.text)}</span>`;
    }).filter(Boolean).join('');

    // Escape book data for storage in data attribute
    const bookJson = escapeAttr(JSON.stringify(book));

    return `
      <button type="button" class="rec-browse-card" data-book="${bookJson}">
        <img class="rec-browse-cover" src="${escapeAttr(cover)}" alt="" loading="lazy" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 140%22%3E%3Crect fill=%22%23e0e0e0%22 width=%22100%22 height=%22140%22/%3E%3Ctext x=%2250%22 y=%2270%22 text-anchor=%22middle%22 font-size=%2240%22 fill=%22%23999%22%3E書%3C/text%3E%3C/svg%3E'">
        <div class="rec-browse-info">
          <h3 class="rec-browse-book-title">${escapeHtml(book.title)}</h3>
          <p class="rec-browse-author">${escapeHtml(book.author || '')}</p>
          ${badges ? `<div class="rec-browse-badges">${badges}</div>` : ''}
        </div>
      </button>
    `;
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
