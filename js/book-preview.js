/**
 * 공유 미리보기 모달 — index.html / detail.html / recommendations.html 공통.
 * 풍부한 "왜 이 책을 읽어야 할까요?" 카드 + 알라딘 lookup 기반 평점/리뷰 표시.
 *
 * Usage:
 *   BookPreview.setRecData(recommendationData);
 *   BookPreview.show(book, {
 *     meta: { reason: '같은 저자', why: '...' },  // optional
 *     mode: 'library' | 'recommend'              // default 'recommend'
 *   });
 *
 * mode:
 *   'recommend' — "＋ 내 서재에 기록" (Storage.saveBook 후 detail로 이동)
 *   'library'   — "📝 기록하러 가기" (이미 서재의 책: detail.html?id=... 로 이동)
 */
(function () {
  'use strict';

  let recData = null;

  // List-navigation state
  let _listCtx   = null;  // { books, idx, opts } | null
  let _renderGen = 0;     // monotonic counter to cancel stale renders
  let _swipeEl        = null;  // element that has swipe listeners attached
  let _swipeStart     = null; // { x, y }
  let _swipeDir       = null; // 'h' | 'v' | null — direction locked after first move

  // Status display config — mirrors STATUS_BADGE / STATUS_ICONS in index.js
  const STATUS_CFG = {
    want:    { label: '읽을 책', bg: 'rgba(255,158,158,0.15)', fg: 'var(--accent,#FF9E9E)' },
    reading: { label: '읽는 중', bg: 'rgba(243,156,18,0.12)',  fg: '#c17f00'               },
    read:    { label: '읽은 책', bg: 'rgba(46,204,113,0.12)',  fg: '#1a7a43'               },
  };
  const _SVG_PATHS = {
    want:    `<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>`,
    reading: `<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>`,
    read:    `<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>`,
    pencil:  `<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>`,
  };
  function svgIcon(key, size) {
    const sz = size || 14;
    return `<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${_SVG_PATHS[key] || ''}</svg>`;
  }

  function setRecData(data) { recData = data; }

  // ── Public: single-book mode ─────────────────────────────────
  async function show(book, opts = {}) {
    _listCtx = null;
    await _openModal(book, opts);
  }

  // ── Public: list mode (swipe navigation) ─────────────────────
  async function showList(books, idx, opts = {}) {
    if (!books || !books.length) return;
    _listCtx = { books, idx: Math.max(0, Math.min(idx, books.length - 1)), opts };
    const book = _listCtx.books[_listCtx.idx];
    // onVisible: inject nav/swipe IMMEDIATELY after skeleton (before Aladin lookup)
    await _openModal(book, opts, () => {
      if (_listCtx && _listCtx.books.length > 1) {
        _injectNav();
        _updateNav();
        _wireSwipe();
      }
    });
  }

  // ── Internal: open modal, render skeleton → detail ───────────
  async function _openModal(book, opts, onVisible) {
    const meta = opts.meta || {};
    const mode = opts.mode || 'recommend';

    const modal  = document.getElementById('bookPreviewModal');
    const bodyEl = document.getElementById('previewBody');
    if (!modal || !bodyEl) {
      console.warn('[BookPreview] 모달 DOM 없음 — bookPreviewModal/previewBody 필요');
      return;
    }

    // Remove stale nav from previous session
    modal.querySelector('.preview-list-nav')?.remove();

    bodyEl.style.cssText = '';
    bodyEl.innerHTML = renderSkeleton(book, meta);
    modal.hidden = false;
    document.body.classList.add('preview-open');
    wireClose(modal);

    // Immediately visible — wire nav/swipe before slow async work
    if (onVisible) onVisible();

    const gen = ++_renderGen;
    let detail = null;
    if (book.isbn && window.API && typeof API.aladinLookup === 'function') {
      try {
        detail = await API.aladinLookup(book.isbn);
      } catch (e) {
        console.warn('[BookPreview] 알라딘 lookup 실패', e.message);
      }
    }
    if (gen !== _renderGen) return;

    bodyEl.innerHTML = renderContent(book, meta, detail, mode);
    wireActions(book, modal, mode, detail);
  }

  // ── Navigation bar ───────────────────────────────────────────

  function _injectNav() {
    const card = document.querySelector('.book-preview-card');
    if (!card || card.querySelector('.preview-list-nav')) return;
    const nav = document.createElement('div');
    nav.className = 'preview-list-nav';
    const closeBtn = card.querySelector('.book-preview-close');
    if (closeBtn) closeBtn.insertAdjacentElement('afterend', nav);
    else card.prepend(nav);
  }

  function _updateNav() {
    const nav = document.querySelector('.preview-list-nav');
    if (!nav || !_listCtx) return;
    const { idx, books } = _listCtx;
    nav.innerHTML = `
      <button class="preview-nav-btn" id="prevBookBtn" aria-label="이전 책"${idx === 0 ? ' disabled' : ''}>‹</button>
      <span class="preview-nav-counter">${idx + 1} / ${books.length}</span>
      <button class="preview-nav-btn" id="nextBookBtn" aria-label="다음 책"${idx === books.length - 1 ? ' disabled' : ''}>›</button>
    `;
    nav.querySelector('#prevBookBtn').addEventListener('click', () => _navigateBook(-1));
    nav.querySelector('#nextBookBtn').addEventListener('click', () => _navigateBook(1));
  }

  async function _navigateBook(dir) {
    if (!_listCtx) return;
    const next = Math.max(0, Math.min(_listCtx.idx + dir, _listCtx.books.length - 1));
    if (next === _listCtx.idx) return;
    _listCtx.idx = next;

    const gen = ++_renderGen;
    const book = _listCtx.books[next];
    const mode = (_listCtx.opts || {}).mode || 'recommend';
    const modal = document.getElementById('bookPreviewModal');
    const bodyEl = document.getElementById('previewBody');

    // Slide out
    if (bodyEl) {
      bodyEl.style.transition = 'opacity .13s ease, transform .13s ease';
      bodyEl.style.opacity = '0';
      bodyEl.style.transform = `translateX(${dir > 0 ? '-28px' : '28px'})`;
      await new Promise(r => setTimeout(r, 140));
      if (gen !== _renderGen) return;
    }

    // Show skeleton from opposite side, slide in
    if (bodyEl) {
      bodyEl.style.transition = 'none';
      bodyEl.style.transform = `translateX(${dir > 0 ? '28px' : '-28px'})`;
      bodyEl.innerHTML = renderSkeleton(book, {});
      bodyEl.getBoundingClientRect(); // force reflow
      bodyEl.style.transition = 'opacity .13s ease, transform .13s ease';
      bodyEl.style.opacity = '1';
      bodyEl.style.transform = 'translateX(0)';
    }

    _updateNav();
    const card = document.querySelector('.book-preview-card');
    if (card) card.scrollTop = 0;

    // Load detail
    let detail = null;
    if (book.isbn && window.API && typeof API.aladinLookup === 'function') {
      try { detail = await API.aladinLookup(book.isbn); } catch {}
    }
    if (gen !== _renderGen) return;

    if (bodyEl) {
      bodyEl.innerHTML = renderContent(book, {}, detail, mode);
      bodyEl.style.cssText = '';
    }
    wireActions(book, modal, mode, detail);
  }

  // ── Swipe detection ──────────────────────────────────────────

  function _wireSwipe() {
    _unwireSwipe();
    const card = document.querySelector('.book-preview-card');
    if (!card) return;
    _swipeEl = card;
    card.addEventListener('touchstart', _onTouchStart, { passive: true });
    card.addEventListener('touchend',   _onTouchEnd,   { passive: true });
    card.addEventListener('touchcancel', _onTouchCancel, { passive: true });
  }

  function _unwireSwipe() {
    if (!_swipeEl) return;
    _swipeEl.removeEventListener('touchstart', _onTouchStart);
    _swipeEl.removeEventListener('touchend',   _onTouchEnd);
    _swipeEl.removeEventListener('touchcancel', _onTouchCancel);
    _swipeEl = null;
    _swipeStart = null;
    _swipeDir   = null;
  }

  function _onTouchStart(e) {
    _swipeStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    _swipeDir   = null;
  }

  function _onTouchEnd(e) {
    if (!_swipeStart) return;
    const dx = e.changedTouches[0].clientX - _swipeStart.x;
    const dy = e.changedTouches[0].clientY - _swipeStart.y;
    _swipeStart = null; _swipeDir = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      _navigateBook(dx < 0 ? 1 : -1);
    }
  }

  function _onTouchCancel() {
    _swipeStart = null; _swipeDir = null;
  }

  // ── Why block (multi-reason cards) ────────────────────────────

  function buildWhyBlock(book, meta, detail) {
    const isbn = book.isbn ? String(book.isbn).replace(/\D/g, '') : '';
    const recBookData = recData && isbn ? recData.books[isbn] : null;

    // 평점은 ratingInfo.ratingScore 우선 (실제 평균), 없으면 customerReviewRank로 fallback
    const ratingInfo = (detail && detail.subInfo && detail.subInfo.ratingInfo) || {};
    const effectiveRating = Number(
      ratingInfo.ratingScore ||
      (detail && detail.customerReviewRank) ||
      (book._raw && book._raw.customerReviewRank) ||
      0
    );

    const badges = recBookData && recBookData.lists
      ? recBookData.lists.map(listId => {
          const source = recData.meta.sources.find(s => s.id === listId);
          if (!source) return '';
          return `<span style="display:inline-block;background:${source.badge.color};color:#fff;padding:4px 10px;border-radius:12px;font-size:11px;font-weight:700;letter-spacing:0.06em;margin-right:6px;margin-bottom:6px;box-shadow:0 2px 6px rgba(0,0,0,0.15)">${escapeHtml(source.badge.text)}</span>`;
        }).filter(Boolean).join('')
      : '';

    const reasons = [];
    const raw = book._raw || detail || {};

    // 1. Curated list reason
    if (recBookData && recBookData.why) {
      reasons.push({ icon: '📚', title: '전문가 추천', text: recBookData.why });
    }

    // 2. Algorithm-based meta reason
    if (meta.why) {
      reasons.push({
        icon: meta.reason === '같은 저자의 다른 책' ? '✍️'
            : meta.reason === '같은 출판사' ? '🏢' : '💡',
        title: meta.reason || '추천 도서',
        text: meta.why,
      });
    }

    // 3. Best-seller / rating
    const bestRank = raw.bestRank;
    if (bestRank && bestRank <= 100) {
      reasons.push({ icon: '🏆', title: '베스트셀러', text: `알라딘 베스트셀러 ${bestRank}위! 많은 독자들이 선택한 책이에요.` });
    } else if (bestRank && bestRank <= 500) {
      reasons.push({ icon: '📈', title: '인기 도서', text: `알라딘 베스트셀러 ${bestRank}위 안에 드는 인기 도서예요.` });
    }

    if (effectiveRating >= 9.0) {
      reasons.push({ icon: '⭐', title: '최고 평점', text: `독자 평점 ${effectiveRating.toFixed(1)}/10점. 읽은 사람들의 만족도가 매우 높아요.` });
    } else if (effectiveRating >= 8.0) {
      reasons.push({ icon: '⭐', title: '높은 평점', text: `독자 평점 ${effectiveRating.toFixed(1)}/10점. 독자들이 만족한 책이에요.` });
    }

    const reviewCount = Number(raw.reviewCount || 0);
    if (reviewCount >= 50 && reasons.filter(r => ['⭐','🏆','📈'].includes(r.icon)).length === 0) {
      reasons.push({ icon: '💬', title: '검증된 도서', text: `${reviewCount}명 이상의 독자가 리뷰를 남긴 검증된 책이에요.` });
    }

    // 4. Awards
    if (recBookData && recBookData.award && recData.awards) {
      const award = recData.awards[recBookData.award];
      if (award) reasons.push({ icon: '🏆', title: award.name, text: award.description });
    }

    // 5. 최신 도서 — 알라딘 pubDate는 "최신 인쇄판 출간일"이라 고전(15소년 표류기 등)도
    // 매번 신간으로 잡힘. 추천 DB의 curator year(book.year)가 최근인 경우에만 표시.
    const curatorYear = Number(book.year || (recBookData && recBookData.year) || 0);
    if (curatorYear) {
      const currentYear = new Date().getFullYear();
      if (curatorYear >= currentYear - 1 && curatorYear <= currentYear) {
        reasons.push({ icon: '🆕', title: '신간 추천', text: `${curatorYear}년 추천 목록에 새로 오른 책이에요.` });
      }
    }

    // 6. Genre/Age
    const categoryName = (detail && detail.categoryName) || book.categoryName || '';
    if (categoryName) {
      const parts = categoryName.replace(/^국내도서>/, '').replace(/^외국도서>/, '').split('>');
      const cat = parts[0];
      const sub = parts[1] || '';
      if (cat === '어린이') {
        if (sub.includes('그림책'))   reasons.push({ icon: '🎨', title: '그림책', text: '아름다운 그림과 함께 이야기를 즐길 수 있어요. 상상력과 감성을 키워줘요.' });
        else if (sub.includes('동화')) reasons.push({ icon: '📖', title: '동화책', text: '어린이 독자를 위한 재미있는 이야기로, 독서 습관을 기르는 데 도움이 돼요.' });
        else if (sub.includes('학습')) reasons.push({ icon: '📚', title: '학습 도서', text: '재미와 학습을 동시에! 유익한 내용을 쉽고 재미있게 배울 수 있어요.' });
        else                           reasons.push({ icon: '👧', title: '어린이 권장도서', text: '어린이 발달 단계에 적합한 내용과 어휘로 구성되어 있어요.' });
      } else if (cat === '청소년') {
        reasons.push({ icon: '🎓', title: '청소년 권장도서', text: '청소년기 필독서. 생각의 폭을 넓히고 세상을 이해하는 데 도움이 돼요.' });
      } else if (cat === '외국어') {
        reasons.push({ icon: '🌍', title: '영어 원서', text: '영어 실력을 키우면서 재미있는 이야기를 즐길 수 있어요.' });
      }
    }

    // 7. fallback
    if (reasons.length === 0) {
      reasons.push({ icon: '💝', title: '맘스북스 추천', text: '우리 아이의 독서 여정에 도움이 될 책이에요. 함께 읽으며 대화해보세요.' });
    }

    const reasonsHTML = reasons.map(r => `
      <div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:12px;padding:12px;background:linear-gradient(135deg,rgba(255,184,198,0.08),rgba(232,197,255,0.08));border-radius:12px;border:2px solid rgba(255,184,198,0.2)">
        <span style="font-size:24px;flex-shrink:0">${r.icon}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:700;color:var(--cute-coral,#FF9E9E);margin-bottom:4px">${escapeHtml(r.title)}</div>
          <div style="font-size:14px;color:var(--text-dark,#4A4A4A);line-height:1.5">${escapeHtml(r.text)}</div>
        </div>
      </div>
    `).join('');

    return `
      <div class="preview-why">
        <p class="preview-why-label" style="color:var(--cute-coral,#FF9E9E);font-size:12px;font-weight:800;letter-spacing:0.1em;margin-bottom:12px">💝 왜 이 책을 읽어야 할까요?</p>
        ${badges ? `<div style="margin-bottom:16px">${badges}</div>` : ''}
        ${reasonsHTML}
      </div>
    `;
  }

  // ── Skeleton (로딩 중) ────────────────────────────────────────

  function renderSkeleton(b, meta) {
    return `
      <div class="preview-hero">
        <div class="preview-cover">${b.thumbnail ? `<img src="${escapeAttr(b.thumbnail)}" alt="">` : '書'}</div>
        <div class="preview-meta">
          <p class="preview-reason">${escapeHtml(meta.reason || '추천 도서')}</p>
          <h3 class="preview-title" id="previewTitle">${escapeHtml(b.title || '')}</h3>
          <p class="preview-author">${escapeHtml((b.authors || []).join(', ') || '저자 미상')}</p>
        </div>
      </div>
      <div class="preview-loading">정보 불러오는 중…</div>
    `;
  }

  // ── 본 컨텐츠 ────────────────────────────────────────────────

  function renderContent(b, meta, detail, mode) {
    // 알라딘 lookup이 다른 책일 가능성 — title이 비슷할 때만 detail 신뢰.
    // (사용자가 잘못된 ISBN으로 저장한 책 → ISBN으로 lookup하면 엉뚱한 책이 와서
    //  표지·소개·평점이 다 다른 책 정보로 표시되는 사고 방지)
    const titleMatches = !!(detail && detail.title && b.title && (
      detail.title.includes(b.title.split(/\s|:/)[0]) ||
      b.title.includes(detail.title.split(/\s|:/)[0])
    ));
    const item = titleMatches ? detail : {};
    const ratingInfo = (item.subInfo && item.subInfo.ratingInfo) || {};
    const reviewList = (item.subInfo && item.subInfo.reviewList) || [];

    const description = (item.description || b.contents || b.description || '').trim();
    const fallbackScore = Number(item.customerReviewRank || ((b._raw || {}).customerReviewRank) || 0);
    const ratingScore = Number(ratingInfo.ratingScore || fallbackScore);
    const ratingCount = Number(ratingInfo.ratingCount || (b._raw || {}).reviewCount || 0);
    const categoryName = item.categoryName || b.categoryName || '';
    const pubDate = item.pubDate || b.datetime || b.pubDate || '';
    const publisher = item.publisher || b.publisher || '';

    const stars = ratingScore > 0
      ? `<span class="preview-stars" aria-label="평점 ${ratingScore}/10">${renderStars(ratingScore / 2)}</span>
         <span class="preview-rating-text">${ratingScore.toFixed(1)} / 10 · ${ratingCount}명</span>`
      : '<span class="preview-rating-text" style="color:var(--text-mute)">아직 평점 없음</span>';

    const reviewItems = reviewList.slice(0, 2).map(r => {
      const body = (r.reviewBody || '').replace(/<[^>]*>/g, '').trim().slice(0, 140);
      if (!body) return '';
      return `<blockquote class="preview-review">"${escapeHtml(body)}${body.length === 140 ? '…' : ''}"</blockquote>`;
    }).join('');

    const levelLine = categoryName ? `
      <div class="preview-row">
        <span class="preview-row-label">분야 / 수준</span>
        <span class="preview-row-value">${escapeHtml(categoryName.replace(/^국내도서>/, '').replace(/^외국도서>/, '').replace(/>/g, ' › '))}</span>
      </div>
    ` : '';

    const pubLine = publisher ? `
      <div class="preview-row">
        <span class="preview-row-label">출판</span>
        <span class="preview-row-value">${escapeHtml(publisher)}${pubDate ? ` · ${escapeHtml(pubDate)}` : ''}</span>
      </div>
    ` : '';

    const descLine = description ? `
      <p class="preview-desc">${escapeHtml(description.slice(0, 360))}${description.length > 360 ? '…' : ''}</p>
    ` : '';

    const aladinHref = item.link || b.url || '';
    const searchQ = b.isbn ? String(b.isbn).replace(/\D/g, '') : encodeURIComponent(b.title || '');
    const yes24Href  = `https://www.yes24.com/Product/Search?query=${searchQ}`;
    const kyoboHref  = `https://search.kyobobook.co.kr/search?keyword=${searchQ}`;
    const shopLinks = `
      <div style="display:flex;gap:6px;margin-top:8px">
        ${aladinHref ? `<a href="${escapeAttr(aladinHref)}" target="_blank" rel="noopener" class="btn btn-secondary" style="flex:1;font-size:12px;padding:8px 4px">알라딘</a>` : ''}
        <a href="${escapeAttr(yes24Href)}" target="_blank" rel="noopener" class="btn btn-secondary" style="flex:1;font-size:12px;padding:8px 4px">YES24</a>
        <a href="${escapeAttr(kyoboHref)}" target="_blank" rel="noopener" class="btn btn-secondary" style="flex:1;font-size:12px;padding:8px 4px">교보문고</a>
      </div>
    `;

    const whyBlock = buildWhyBlock(b, meta, item);

    // recommend 모드일 때 이미 서재에 있으면 다른 버튼 노출
    const existingInLibrary = (mode === 'recommend' && window.Storage && Storage.getBookByIsbn)
      ? Storage.getBookByIsbn(b.isbn)
      : null;

    const _statusKey = b.status === 'want' ? 'want' : b.status === 'reading' ? 'reading' : 'read';
    let primaryBtn;
    if (mode === 'library') {
      function _statusBtnStyle(key) {
        const s = STATUS_CFG[key];
        const active = key === _statusKey;
        return `flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 4px;border-radius:12px;cursor:pointer;font-size:12px;font-weight:700;font-family:var(--font-body,inherit);background:${s.bg};color:${s.fg};border:${active ? `2px solid ${s.fg}` : '2px solid transparent'};box-shadow:${active ? `0 0 0 1px ${s.fg}44` : 'none'}`;
      }
      primaryBtn = `
        <div>
          <p style="font-size:11px;font-weight:700;color:var(--text-mute,#999);letter-spacing:0.08em;text-align:center;margin:0 0 10px;font-family:var(--font-body,inherit)">읽기 상태</p>
          <div style="display:flex;gap:8px;margin-bottom:12px">
            <button type="button" id="previewLibraryWantBtn" data-lib-status="want" style="${_statusBtnStyle('want')}">
              ${svgIcon('want', 18)}읽을 책
            </button>
            <button type="button" id="previewLibraryReadingBtn" data-lib-status="reading" style="${_statusBtnStyle('reading')}">
              ${svgIcon('reading', 18)}읽는 중
            </button>
            <button type="button" id="previewLibraryReadBtn" data-lib-status="read" style="${_statusBtnStyle('read')}">
              ${svgIcon('read', 18)}읽은 책
            </button>
          </div>
          <button type="button" class="btn btn-primary" id="previewLibraryBtn" style="display:flex;align-items:center;justify-content:center;gap:6px;width:100%">
            ${svgIcon('pencil', 14)} 기록하러 가기
          </button>
        </div>`;
    } else if (existingInLibrary) {
      const eKey = existingInLibrary.status === 'want' ? 'want' : existingInLibrary.status === 'reading' ? 'reading' : 'read';
      const s = STATUS_CFG[eKey];
      primaryBtn = `
        <div>
          <div style="display:flex;justify-content:center;margin-bottom:12px">
            <span style="display:inline-flex;align-items:center;gap:5px;background:${s.bg};color:${s.fg};padding:6px 16px;border-radius:16px;font-size:13px;font-weight:700">
              ${svgIcon(eKey, 13)}${s.label}
            </span>
          </div>
          <button type="button" class="btn btn-secondary" id="previewLibraryBtn" data-existing-id="${escapeAttr(existingInLibrary.id)}" style="background:#6f8b7a;color:#fff;border:none;display:flex;align-items:center;justify-content:center;gap:6px;width:100%">
            이미 내 서재에 있어요 — 보러가기
          </button>
        </div>`;
    } else {
      primaryBtn = `
        <div>
          <p style="font-size:11px;font-weight:700;color:var(--text-mute,#999);letter-spacing:0.08em;text-align:center;margin:0 0 10px;font-family:var(--font-body,inherit)">서재에 추가</p>
          <div style="display:flex;gap:8px">
            <button type="button" id="previewSaveWantBtn"
              style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 4px;border-radius:12px;border:none;background:${STATUS_CFG.want.bg};color:${STATUS_CFG.want.fg};font-size:12px;font-weight:700;cursor:pointer;font-family:var(--font-body,inherit)">
              ${svgIcon('want', 18)}읽을 책
            </button>
            <button type="button" id="previewSaveReadingBtn"
              style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 4px;border-radius:12px;border:none;background:${STATUS_CFG.reading.bg};color:${STATUS_CFG.reading.fg};font-size:12px;font-weight:700;cursor:pointer;font-family:var(--font-body,inherit)">
              ${svgIcon('reading', 18)}읽는 중
            </button>
            <button type="button" id="previewSaveBtn" data-save-status=""
              style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 4px;border-radius:12px;border:none;background:${STATUS_CFG.read.bg};color:${STATUS_CFG.read.fg};font-size:12px;font-weight:700;cursor:pointer;font-family:var(--font-body,inherit)">
              ${svgIcon('read', 18)}읽은 책
            </button>
          </div>
        </div>`;
    }

    const heroCover = b.thumbnail || (titleMatches && item.cover) || '';

    const librarySection = b.isbn ? `
      <div id="previewLibrarySection" style="margin-top:var(--sp-sm)">
        <button type="button" id="previewFindLibraryBtn"
          style="width:100%;padding:10px 16px;border:1.5px solid rgba(45,106,79,0.35);border-radius:6px;background:rgba(45,106,79,0.06);color:#2d6a4f;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px">
          <span style="font-size:16px">📍</span> 가까운 도서관에서 찾기
        </button>
      </div>
    ` : '';

    return `
      <div class="preview-hero">
        <div class="preview-cover">${heroCover ? `<img src="${escapeAttr(heroCover)}" alt="">` : '書'}</div>
        <div class="preview-meta">
          <p class="preview-reason">${escapeHtml(meta.reason || (mode === 'library' ? '내 서재' : '추천 도서'))}</p>
          <h3 class="preview-title" id="previewTitle">${escapeHtml(b.title || '')}</h3>
          <p class="preview-author">${escapeHtml((b.authors || []).join(', ') || '저자 미상')}</p>
          <div class="preview-rating">${stars}</div>
        </div>
      </div>

      ${whyBlock}

      <div class="preview-info">
        ${levelLine}
        ${pubLine}
      </div>

      ${descLine}

      ${reviewItems ? `<div class="preview-reviews">${reviewItems}</div>` : ''}

      <div class="preview-actions">
        ${primaryBtn}
        ${shopLinks}
      </div>

      ${librarySection}
    `;
  }

  function renderStars(n) {
    const full = Math.floor(n);
    const half = (n - full) >= 0.25 && (n - full) < 0.75;
    let out = '';
    for (let i = 0; i < 5; i++) {
      if (i < full) out += '★';
      else if (i === full && half) out += '☆';
      else out += '☆';
    }
    return out;
  }

  // ── 모달 닫기 / 액션 ────────────────────────────────────────

  function wireClose(modal) {
    const close = () => closePreview(modal);
    modal.querySelectorAll('[data-close-preview]').forEach(el => {
      el.addEventListener('click', close, { once: true });
    });
    function escClose(e) {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', escClose);
        close();
      }
    }
    document.addEventListener('keydown', escClose);
  }

  function closePreview(modal) {
    modal.hidden = true;
    document.body.classList.remove('preview-open');
    _listCtx = null;
    _unwireSwipe();
    modal.querySelector('.preview-list-nav')?.remove();
  }

  function wireActions(book, modal, mode, detail) {
    // 'library' 모드 또는 recommend 모드인데 이미 서재에 있어 "보러가기" 버튼이 노출된 경우
    const libBtn = document.getElementById('previewLibraryBtn');
    if (libBtn) {
      libBtn.addEventListener('click', () => {
        const targetId = libBtn.dataset.existingId || book.id;
        if (!targetId) return;
        location.href = `detail.html?id=${encodeURIComponent(targetId)}`;
      });
    }

    // 도서관 찾기 — 모달 열리면 자동 시작
    const findLibBtn = document.getElementById('previewFindLibraryBtn');
    if (findLibBtn && book.isbn && window.LibraryAPI) {
      handleFindLibrary(book.isbn, findLibBtn);
    }

    if (mode === 'library') {
      // Status change buttons
      ['previewLibraryWantBtn', 'previewLibraryReadingBtn', 'previewLibraryReadBtn'].forEach(id => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.addEventListener('click', () => {
          const newStatusKey = btn.dataset.libStatus; // 'want'|'reading'|'read'
          const newStatus = newStatusKey === 'read' ? null : newStatusKey;
          if (!window.Storage || !book.id) return;
          Storage.updateBook(book.id, { status: newStatus });
          // Update local list context so navigation uses fresh status
          if (_listCtx) {
            const listBook = _listCtx.books[_listCtx.idx];
            if (listBook && listBook.id === book.id) listBook.status = newStatus;
          }
          // Re-render buttons with new active state
          const statuses = { want: 'want', reading: 'reading', read: null };
          const cfgKeys = ['want', 'reading', 'read'];
          cfgKeys.forEach(k => {
            const el = document.querySelector(`[data-lib-status="${k}"]`);
            if (!el) return;
            const s = STATUS_CFG[k];
            const active = k === newStatusKey;
            el.style.border = active ? `2px solid ${s.fg}` : '2px solid transparent';
            el.style.boxShadow = active ? `0 0 0 1px ${s.fg}44` : 'none';
          });
          toast(newStatusKey === 'want' ? '읽을 책으로 변경' : newStatusKey === 'reading' ? '읽는 중으로 변경' : '읽은 책으로 변경');
        });
      });
      return;
    }

    // recommend mode — 상태별 저장 공통 함수
    if (!window.Storage) return;

    function saveWithStatus(status) {
      const existing = Storage.getBookByIsbn ? Storage.getBookByIsbn(book.isbn) : null;
      if (existing) {
        if (status !== null) Storage.updateBook(existing.id, { status });
        const label = status === 'want' ? '읽을 책으로 저장' : status === 'reading' ? '읽는 중으로 저장' : '이미 서재에 있어요';
        toast(label);
        setTimeout(() => location.href = `detail.html?id=${encodeURIComponent(existing.id)}`, 600);
        return;
      }
      const saved = Storage.saveBook({
        isbn:        book.isbn,
        title:       book.title,
        authors:     book.authors || (book.author ? [book.author] : []),
        publisher:   book.publisher,
        thumbnail:   book.thumbnail,
        contents:    book.contents || '',
        language:    book.language || 'ko',
        status:      status,
        categoryId:   book.categoryId   || (window.API && API.extractCategoryId ? API.extractCategoryId(detail || {}) : undefined),
        categoryName: book.categoryName || (detail && detail.categoryName),
      });
      const label = status === 'want' ? `"${book.title}" 읽을 책으로 저장` : status === 'reading' ? `"${book.title}" 읽는 중으로 저장` : `"${book.title}" 기록됨`;
      toast(label);
      closePreview(modal);
      setTimeout(() => location.href = `detail.html?id=${encodeURIComponent(saved.id)}&new=1`, 700);
    }

    const saveBtn = document.getElementById('previewSaveBtn');
    if (saveBtn) saveBtn.addEventListener('click', () => saveWithStatus(null));

    const saveWantBtn = document.getElementById('previewSaveWantBtn');
    if (saveWantBtn) saveWantBtn.addEventListener('click', () => saveWithStatus('want'));

    const saveReadingBtn = document.getElementById('previewSaveReadingBtn');
    if (saveReadingBtn) saveReadingBtn.addEventListener('click', () => saveWithStatus('reading'));
  }

  async function handleFindLibrary(isbn, btn) {
    if (!window.LibraryAPI) return;

    const section = document.getElementById('previewLibrarySection');
    if (!section) return;

    btn.disabled = true;
    btn.innerHTML = '<span style="opacity:0.6">검색 중…</span>';

    try {
      const { libraries, regionName, needsRegion } = await LibraryAPI.findNearbyLibraries(isbn);

      if (needsRegion) {
        section.innerHTML = `
          <div style="padding:14px;background:rgba(0,0,0,0.04);border-radius:8px;text-align:center">
            <div style="font-size:13px;color:var(--text-soft);margin-bottom:8px">위치 권한을 허용하면<br>가까운 도서관을 찾아드려요</div>
            <button type="button" id="previewFindLibraryBtn"
              style="padding:8px 16px;border:1.5px solid rgba(45,106,79,0.35);border-radius:6px;background:rgba(45,106,79,0.06);color:#2d6a4f;font-size:12px;font-weight:600;cursor:pointer">
              📍 다시 시도
            </button>
          </div>`;
        const retryBtn = section.querySelector('#previewFindLibraryBtn');
        if (retryBtn) retryBtn.addEventListener('click', () => handleFindLibrary(isbn, retryBtn));
        return;
      }

      if (!libraries.length) {
        section.innerHTML = `
          <div style="padding:14px;background:rgba(139,58,58,0.06);border-radius:8px;border:1.5px solid rgba(139,58,58,0.15);text-align:center">
            <div style="font-size:20px;margin-bottom:6px">📚</div>
            <div style="font-size:13px;font-weight:600;color:#8b3a3a;margin-bottom:4px">우리 동네 도서관엔 없네요</div>
            <div style="font-size:12px;color:var(--text-mute)">${regionName ? regionName + ' 지역 기준' : ''}</div>
          </div>`;
        return;
      }

      const regionLabel = regionName ? ` · ${regionName}` : '';
      const items = libraries.map(lib => {
        const avail = lib.available === true;
        const unknown = lib.available === null;
        const availText = avail ? '지금 바로 빌릴 수 있어요!' : unknown ? '대출 여부 미확인' : '지금은 다른 친구가 읽고 있어요';
        const availColor = avail ? '#2d6a4f' : unknown ? 'var(--text-mute)' : '#8b3a3a';
        const dot = avail ? '🟢' : unknown ? '⚪' : '🔴';
        const libName = escapeHtml(lib.libName || '');
        const distKm = lib.distance && lib.distance < 9999 ? `${lib.distance.toFixed(1)}km` : '';
        const tel = lib.tel && lib.tel !== '-' ? lib.tel : '';
        const mapUrl = `https://map.kakao.com/link/search/${encodeURIComponent(lib.libName || '')}`;
        return `
          <div style="padding:10px 12px;border-bottom:1px solid var(--border-soft)">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px">
              <span style="font-size:13px;flex-shrink:0">${dot}</span>
              <div style="font-size:13px;font-weight:700;color:var(--text);flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${libName}</div>
              ${distKm ? `<span style="font-size:11px;color:var(--text-mute);flex-shrink:0">${distKm}</span>` : ''}
            </div>
            <div style="display:flex;align-items:center;gap:8px;padding-left:21px">
              <div style="font-size:11px;color:${availColor};flex:1">${escapeHtml(availText)}</div>
              <div style="display:flex;gap:6px;flex-shrink:0">
                ${tel ? `<a href="tel:${escapeAttr(tel.replace(/\D/g,''))}" style="font-size:11px;color:var(--text-mute);text-decoration:none;padding:3px 7px;border:1px solid var(--border-soft);border-radius:4px">📞</a>` : ''}
                <a href="${escapeAttr(mapUrl)}" target="_blank" rel="noopener"
                   style="font-size:11px;color:var(--text-mute);text-decoration:none;padding:3px 7px;border:1px solid var(--border-soft);border-radius:4px">지도</a>
              </div>
            </div>
          </div>`;
      }).join('');

      section.innerHTML = `
        <div style="border:1.5px solid rgba(45,106,79,0.25);border-radius:8px;overflow:hidden;background:rgba(45,106,79,0.04)">
          <div style="padding:10px 12px;background:rgba(45,106,79,0.08);font-size:11px;font-weight:700;color:#2d6a4f;letter-spacing:0.06em">
            📍 가까운 도서관${regionLabel}
          </div>
          ${items}
        </div>`;
    } catch (e) {
      section.innerHTML = `
        <div style="padding:12px;background:rgba(0,0,0,0.04);border-radius:8px;text-align:center;font-size:12px;color:var(--text-mute)">
          도서관 검색 실패. 잠시 후 다시 시도해주세요.
        </div>`;
      btn.disabled = false;
      btn.innerHTML = '<span style="font-size:16px">📍</span> 가까운 도서관에서 찾기';
    }
  }

  // ── utils ────────────────────────────────────────────────────

  function toast(msg) {
    const el = document.getElementById('toast');
    if (!el) { console.log('[toast]', msg); return; }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('show'), 2200);
  }

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = String(s ?? '');
    return d.innerHTML;
  }
  function escapeAttr(s) { return String(s ?? '').replace(/"/g, '&quot;'); }

  window.BookPreview = { show, showList, setRecData };
})();
