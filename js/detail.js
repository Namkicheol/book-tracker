/**
 * 書架 — Detail page (detail.html)
 *
 * URL: detail.html?id=<bookId>[&new=1]
 *
 * Sections:
 *   - Hero (cover, title, author, publisher, ISBN, AR badge for English books)
 *   - Form (rating, review with 300-char counter + live quote preview, date, folders)
 *   - Save / Delete actions
 *   - Recommendations (3 rails: same author / same publisher / similar level)
 */

(function () {
  'use strict';

  let book = null;
  let isNew = false;
  let folders = [];
  let selectedRating = 0;

  // ── Boot ─────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', loadBook);

  function loadBook() {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    isNew = params.get('new') === '1';

    if (!id) return showFatal('책 ID가 URL에 없습니다');

    book = Storage.getBook(id);
    if (!book) return showFatal('책을 찾을 수 없습니다 (id 확인 필요)');

    folders = Storage.getAllFolders();

    renderHero();
    renderRating();
    renderReview();
    renderDate();
    renderFolderPicker();
    wireActions();

    if (book.language === 'en' && !book.ar) tryFetchAR();

    // Lazy-load recommendations
    setTimeout(loadRecommendations, 100);
  }

  // ── Hero ─────────────────────────────────────────────────────

  function renderHero() {
    document.getElementById('bookTitle').textContent = book.title || '제목 없음';
    document.getElementById('bookAuthor').textContent = (book.authors || []).join(', ') || '저자 미상';
    document.getElementById('bookPublisher').textContent = book.publisher || '';
    document.getElementById('bookIsbn').textContent = book.isbn ? `ISBN ${book.isbn}` : '';

    const img = document.getElementById('coverImg');
    const ph = document.getElementById('coverPlaceholder');
    if (book.thumbnail) {
      img.src = book.thumbnail;
      img.style.display = 'block';
      ph.style.display = 'none';
      img.onerror = () => { img.style.display = 'none'; ph.style.display = ''; };
    }

    if (book.ar) showARBadge(book.ar, book.lexile);
  }

  function showARBadge(ar, lexile) {
    const el = document.getElementById('arBadge');
    const lex = lexile ? `<span class="ar-badge" style="background:var(--text-mute);margin-left:4px">${escapeHtml(lexile)}</span>` : '';
    el.innerHTML = `<span class="ar-badge">AR ${ar}</span>${lex}`;
    el.classList.remove('hidden');
  }

  // ── Rating ───────────────────────────────────────────────────

  function renderRating() {
    selectedRating = book.rating || 0;
    paintStars();
    document.querySelectorAll('#starRating .star-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const v = Number(btn.dataset.val);
        selectedRating = (selectedRating === v) ? v - 1 : v;  // tap-again to lower
        paintStars();
      });
    });
  }

  function paintStars() {
    document.querySelectorAll('#starRating .star-btn').forEach(btn => {
      const v = Number(btn.dataset.val);
      btn.classList.toggle('filled', v <= selectedRating);
    });
  }

  // ── Review ───────────────────────────────────────────────────

  function renderReview() {
    const editor       = document.getElementById('reviewInput');
    const counter      = document.getElementById('reviewCounter');
    const preview      = document.getElementById('reviewPreview');
    const previewText  = document.getElementById('reviewPreviewText');

    // Load existing review (HTML)
    editor.innerHTML = book.review || '';
    update();

    editor.addEventListener('input', update);
    editor.addEventListener('keydown', enforceLimit);

    // Force plain-text paste — strips dangerous HTML and external styles
    editor.addEventListener('paste', e => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text/plain') || '';
      document.execCommand('insertText', false, text);
    });

    // Toolbar
    document.querySelectorAll('.review-toolbar .rt-btn').forEach(btn => {
      // Prevent button click from stealing focus from the editor
      btn.addEventListener('mousedown', e => e.preventDefault());
      btn.addEventListener('click', () => {
        applyFormat(btn.dataset.cmd, btn.dataset.color);
        editor.focus();
        update();
      });
    });

    function update() {
      const plain = editor.innerText.replace(/ /g, ' ');
      const len = plain.length;
      if (counter) {
        counter.textContent = `${len} / 300`;
        counter.style.color = len > 270 ? 'var(--wine)' : 'var(--text-mute)';
      }
      if (plain.trim()) {
        previewText.innerHTML = editor.innerHTML;
        preview.style.display = 'block';
      } else {
        preview.style.display = 'none';
      }
    }

    function enforceLimit(e) {
      const plain = editor.innerText;
      if (plain.length < 300) return;
      // Allow editing keys: backspace/arrows/etc
      const allow = ['Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','Tab'];
      if (allow.includes(e.key)) return;
      if (e.ctrlKey || e.metaKey) return;
      e.preventDefault();
    }
  }

  function applyFormat(cmd, color) {
    if (!cmd) return;

    const sel = window.getSelection();
    const hasSel = sel && sel.rangeCount > 0 && !sel.isCollapsed;

    // bold/underline have built-in toggle and work on cursor position too
    if (cmd === 'bold')      { document.execCommand('bold',      false); return; }
    if (cmd === 'underline') { document.execCommand('underline', false); return; }

    // hilite/color/clear MUST have a selection — otherwise execCommand
    // sets the "next typed text" color which silently persists.
    if (!hasSel) {
      const what = cmd === 'hilite' ? '형광펜 칠할' : cmd === 'color' ? '색 입힐' : '서식 지울';
      showToast(`${what} 글자를 먼저 드래그로 선택`);
      return;
    }

    if (cmd === 'hilite') {
      // Toggle: if selection already has this background, remove it
      if (selectionHasBgColor(color)) {
        // Remove highlight from selection
        document.execCommand('backColor', false, 'transparent');
      } else {
        document.execCommand('backColor', false, color);
      }
      // Collapse selection so subsequent typing isn't styled
      sel.collapseToEnd();
      return;
    }

    if (cmd === 'color') {
      if (selectionHasFgColor(color)) {
        // Remove color → use default by applying inherit / removeFormat trick
        document.execCommand('foreColor', false, getComputedStyle(document.body).color);
      } else {
        document.execCommand('foreColor', false, color);
      }
      sel.collapseToEnd();
      return;
    }

    if (cmd === 'clear') {
      document.execCommand('removeFormat', false);
      return;
    }
  }

  // Compare selection's effective bg color with target hex
  function selectionHasBgColor(hex) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    let n = sel.anchorNode;
    if (n && n.nodeType === 3) n = n.parentElement;
    if (!n) return false;
    return colorMatches(getComputedStyle(n).backgroundColor, hex);
  }

  function selectionHasFgColor(hex) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    let n = sel.anchorNode;
    if (n && n.nodeType === 3) n = n.parentElement;
    if (!n) return false;
    return colorMatches(getComputedStyle(n).color, hex);
  }

  function colorMatches(rgbStr, hex) {
    const target = hexToRgb(hex);
    if (!target) return false;
    const m = (rgbStr || '').match(/\d+/g);
    if (!m || m.length < 3) return false;
    return Number(m[0]) === target.r && Number(m[1]) === target.g && Number(m[2]) === target.b;
  }

  function hexToRgb(hex) {
    if (!hex) return null;
    const h = hex.replace('#', '');
    if (h.length !== 6) return null;
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  }

  // ── Date ─────────────────────────────────────────────────────

  function renderDate() {
    const input = document.getElementById('dateInput');
    // Always default to today when no date is set; user can change freely
    input.value = book.readDate || new Date().toISOString().slice(0, 10);
  }

  // ── Folders ──────────────────────────────────────────────────

  function renderFolderPicker() {
    const wrap = document.getElementById('folderSelect');
    const selected = new Set(book.folders || []);

    const html = folders.map(f =>
      `<button type="button" class="folder-chip ${selected.has(f.id) ? 'active' : ''}" data-folder="${escapeAttr(f.id)}">${escapeHtml(f.name)}</button>`
    ).join('') +
    `<button type="button" class="folder-chip folder-chip-add" id="addFolderInline">＋ 폴더</button>`;

    wrap.innerHTML = html;

    wrap.querySelectorAll('[data-folder]').forEach(chip => {
      chip.addEventListener('click', () => {
        chip.classList.toggle('active');
        // 즉시 저장 — "저장" 버튼 안 눌러도 폴더 변경 반영
        const folders = getCurrentFolderSelections();
        Storage.updateBook(book.id, { folders });
        book.folders = folders;
        const folderName = (Storage.getFolder(chip.dataset.folder) || {}).name || '';
        const isOn = chip.classList.contains('active');
        showToast(isOn ? `"${folderName}" 폴더에 추가` : `"${folderName}" 폴더에서 제외`);
      });
    });
    document.getElementById('addFolderInline').addEventListener('click', addFolderInline);
  }

  function addFolderInline() {
    const name = (prompt('새 폴더 이름') || '').trim();
    if (!name) return;
    const f = Storage.saveFolder({ name });
    folders = Storage.getAllFolders();
    book.folders = [...(book.folders || []), f.id];
    renderFolderPicker();
  }

  function getCurrentFolderSelections() {
    return [...document.querySelectorAll('#folderSelect .folder-chip.active[data-folder]')]
      .map(chip => chip.dataset.folder);
  }

  // ── Actions ──────────────────────────────────────────────────

  function wireActions() {
    const deleteBtn = document.getElementById('deleteBtn');
    if (book.id) deleteBtn.style.display = 'inline-flex';

    document.getElementById('recordForm').addEventListener('submit', save);
    deleteBtn.addEventListener('click', deleteCurrent);
  }

  function save(e) {
    e.preventDefault();
    const editor = document.getElementById('reviewInput');
    const reviewHtml = editor.innerText.trim() ? editor.innerHTML : '';

    book = Storage.updateBook(book.id, {
      rating: selectedRating,
      review: reviewHtml,
      readDate: document.getElementById('dateInput').value,
      folders: getCurrentFolderSelections(),
    });
    isNew = false;  // After first save it's no longer "new"
    showToast('저장됨 — 계속 수정 가능');
  }

  function deleteCurrent() {
    if (!confirm(`"${book.title}"을(를) 서재에서 삭제할까요?`)) return;
    Storage.deleteBook(book.id);
    showToast('삭제됨');
    setTimeout(() => location.href = 'index.html', 600);
  }

  // ── AR fetch (English books only) ────────────────────────────

  async function tryFetchAR() {
    showARLoading();
    try {
      const data = await API.fetchAR(book.isbn);
      if (data && data.ar) {
        Storage.updateBook(book.id, { ar: data.ar, lexile: data.il });
        book.ar = data.ar;
        book.lexile = data.il;
        showARBadge(data.ar, data.il);
        showToast(`AR ${data.ar} 자동 적용`);
        return;
      }
    } catch (e) {
      console.warn('[detail] AR fetch error', e);
    }
    showARInput();
  }

  function showARLoading() {
    const el = document.getElementById('arBadge');
    el.innerHTML = `<span class="ar-badge" style="background:var(--text-mute)">AR 조회 중…</span>`;
    el.classList.remove('hidden');
  }

  function showARInput() {
    const el = document.getElementById('arBadge');
    el.innerHTML = `
      <div style="display:flex;gap:6px;align-items:center;margin-top:6px;flex-wrap:wrap">
        <span class="ar-badge" style="background:var(--text-mute)">AR 미확인</span>
        <input type="text" id="arInput" placeholder="직접 입력 (예: 4.5)"
               style="flex:1;min-width:120px;background:var(--bg-paper);border:1px solid var(--border);padding:5px 8px;font-size:12px;font-family:var(--font-display);font-style:italic;border-radius:1px;outline:none">
      </div>
    `;
    el.classList.remove('hidden');

    const input = document.getElementById('arInput');
    input.addEventListener('blur', () => {
      const v = input.value.trim();
      if (!v) return;
      const ar = Number(v);
      if (!isNaN(ar) && ar > 0 && ar < 15) {
        Storage.updateBook(book.id, { ar });
        book.ar = ar;
        showARBadge(ar);
        showToast('AR 저장됨');
      } else {
        showToast('AR 값은 0~15 사이 숫자');
      }
    });
    input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); });
  }

  // ── Recommendations ──────────────────────────────────────────

  /**
   * Reading Ladder 추천 — 4개 rail 구조.
   *   #1 같은 작가          : ItemSearch(Author, CategoryId)
   *   #2 같은 단계 책        : ItemList(Bestseller, leaf CategoryId)
   *   #3 이 책도 좋아요       : Aladin similarBookList → 비어있으면 부모 categoryId Bestseller
   *   #4 다음 단계 추천책     : 분야+다음 학년 키워드 search → fallback 부모 categoryId
   *                            (UI에서 <details>로 접힘)
   */
  async function loadRecommendations() {
    const wrap = document.getElementById('recommendations');
    wrap.classList.remove('hidden');

    ['recAuthor', 'recPublisher', 'recAlsoLike', 'recSimilar'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = renderRailLoading();
    });

    const currentIsbn = String(book.isbn).replace(/\D/g, '');
    const filterCurrent = list =>
      (list || []).filter(b => b && String(b.isbn).replace(/\D/g, '') !== currentIsbn);

    // Step 1: Aladin lookup
    let lookupItem = null;
    let categoryId = book.categoryId || null;

    if (window.WORKER_URL) {
      try {
        lookupItem = await API.aladinLookup(book.isbn);
        if (lookupItem) {
          const cid = API.extractCategoryId(lookupItem);
          if (cid) {
            categoryId = cid;
            const categoryName = lookupItem.categoryName || book.categoryName || '';
            if (book.categoryId !== cid) {
              Storage.updateBook(book.id, { categoryId: cid, categoryName });
              book.categoryId = cid;
              book.categoryName = categoryName;
            }
          }
        }
      } catch (e) {
        console.warn('[detail] Aladin lookup 실패 — 카카오 폴백', e.message);
      }
    }

    const author = (book.authors || [])[0];
    const useAladin = !!(window.WORKER_URL && lookupItem);

    // Step 2: 4 rails
    const authorPromise = author && useAladin
      ? API.aladinSearch({ query: author, queryType: 'Author', categoryId, maxResults: 12 })
          .then(items => items.map(API.normalizeAladin))
          .catch(() => fallbackAuthor(author))
      : (author ? fallbackAuthor(author) : Promise.resolve([]));

    const sameLevelPromise = useAladin && categoryId
      ? API.aladinList({ queryType: 'Bestseller', categoryId, maxResults: 12 })
          .then(items => items.map(API.normalizeAladin))
          .catch(() => fallbackPublisher(book.publisher))
      : fallbackPublisher(book.publisher);

    // 이 책도 좋아요 = similarBookList 우선 → 비어있으면 부모 categoryId Bestseller
    const alsoLikePromise = (async () => {
      if (!useAladin) return [];
      const similar = API.extractSimilarBooks(lookupItem).map(API.normalizeAladin).filter(Boolean);
      if (similar.length >= 4) return similar;
      const parentId = API.extractParentCategoryId(lookupItem);
      if (!parentId) return similar;
      try {
        const parent = await API.aladinList({ queryType: 'Bestseller', categoryId: parentId, maxResults: 12 });
        const parentNorm = parent.map(API.normalizeAladin)
          .filter(b => b && String(b.isbn).replace(/\D/g, '') !== currentIsbn)
          .filter(b => String(b.categoryId) !== String(categoryId));
        return [...similar, ...parentNorm].slice(0, 12);
      } catch (e) {
        return similar;
      }
    })();

    const nextLevelPromise = useAladin
      ? API.searchNextLevel(lookupItem, { maxResults: 12 })
          .then(items => items.map(API.normalizeAladin))
          .catch(() => [])
      : Promise.resolve([]);

    const [authorBooks, sameLevelBooks, alsoLikeBooks, nextLevelBooks] = await Promise.all([
      authorPromise, sameLevelPromise, alsoLikePromise, nextLevelPromise,
    ]);

    const currentBookCategory = book.categoryName || '';
    const currentBookTitle = book.title || '이 책';
    const currentAuthor = author || '';

    renderRail('recAuthor',    filterCurrent(authorBooks), {
      reason: '같은 작가의 책',
      why: currentAuthor
        ? `『${currentBookTitle}』의 저자 "${currentAuthor}"가 쓴 다른 작품입니다. 작가 특유의 시선·문체를 좋아한 독자에게 자연스럽게 이어집니다.`
        : `같은 저자의 다른 작품입니다.`,
    });
    renderRail('recPublisher', filterCurrent(sameLevelBooks), {
      reason: '같은 단계 베스트',
      why: currentBookCategory
        ? `『${currentBookTitle}』과 같은 분야(${prettyCategory(currentBookCategory)})의 베스트셀러입니다. 비슷한 수준·관심사의 또래 독자가 가장 많이 읽고 있는 책이에요.`
        : `같은 분야의 베스트셀러입니다.`,
    });
    renderRail('recAlsoLike',  filterCurrent(alsoLikeBooks), {
      reason: '이 책을 좋아한 독자가 본 책',
      why: `알라딘 데이터 기반으로 『${currentBookTitle}』을 산 독자들이 함께 본 책 + 한 단계 넓은 분야의 베스트를 섞었습니다. 비슷한 톤이지만 분야는 살짝 다양해요.`,
    });
    renderRail('recSimilar',   filterCurrent(nextLevelBooks), {
      reason: '한 단계 다음 추천책',
      why: `『${currentBookTitle}』보다 한 단계 위(어휘·주제 깊이) 책으로 골랐습니다. 지금 읽은 책이 쉽게 느껴진다면 다음에 도전해볼 만한 책이에요.`,
    });
  }

  function prettyCategory(name) {
    return String(name || '')
      .replace(/^국내도서>/, '')
      .replace(/^외국도서>/, '')
      .replace(/>/g, ' › ');
  }

  // 카카오 fallback (알라딘 키 미설정 / 호출 실패 시)
  function fallbackAuthor(author) {
    return API.searchByAuthor(author, { size: 8 }).catch(() => []);
  }
  function fallbackPublisher(publisher) {
    if (!publisher) return Promise.resolve([]);
    return API.searchByPublisher(publisher, { size: 8 }).catch(() => []);
  }

  function renderRailLoading() {
    return Array(4).fill(0).map(() =>
      `<div class="rec-card"><div class="rec-cover" style="background:var(--bg-paper);animation:pulse 1.4s ease-in-out infinite"></div></div>`
    ).join('');
  }

  function renderRail(railId, books, meta = {}) {
    const rail = document.getElementById(railId);
    if (!rail) return;

    const detailsWrap = rail.closest('details.rec-collapse');

    if (books.length === 0) {
      if (detailsWrap) {
        detailsWrap.style.display = 'none';
      } else {
        rail.style.display = 'none';
        const sectionTitle = rail.previousElementSibling;
        const eyebrow = sectionTitle?.previousElementSibling;
        if (sectionTitle) sectionTitle.style.display = 'none';
        if (eyebrow && eyebrow.classList.contains('section-eyebrow')) eyebrow.style.display = 'none';
      }
      return;
    }

    rail.innerHTML = books.map((b, i) => {
      const cover = b.thumbnail
        ? `<img class="rec-cover" src="${escapeAttr(b.thumbnail)}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'rec-cover',style:'background:linear-gradient(160deg,var(--bg-paper),var(--border));display:flex;align-items:center;justify-content:center;font-family:var(--font-han);font-size:24px;color:var(--text-mute);opacity:0.5',textContent:'書'}))">`
        : `<div class="rec-cover" style="background:linear-gradient(160deg,var(--bg-paper),var(--border));display:flex;align-items:center;justify-content:center;font-family:var(--font-han);font-size:24px;color:var(--text-mute);opacity:0.5">書</div>`;
      return `
        <button type="button" class="rec-card" data-rail="${escapeAttr(railId)}" data-idx="${i}" style="cursor:pointer;border:none;background:transparent;padding:0;text-align:left">
          ${cover}
          <div class="rec-title">${escapeHtml(b.title)}</div>
        </button>
      `;
    }).join('');

    rail.querySelectorAll('[data-rail]').forEach(card => {
      card.addEventListener('click', () => {
        const idx = Number(card.dataset.idx);
        const picked = books[idx];
        if (picked) showBookPreview(picked, meta);
      });
    });
  }

  // ── Book Preview Modal ───────────────────────────────────────
  /**
   * 추천 카드 클릭 시 책 정보 미리보기. 알라딘 lookup으로 description / 평점 / 리뷰 가져옴.
   * 사용자가 "서재에 기록"을 눌러야 storage에 저장.
   */
  async function showBookPreview(book, meta = {}) {
    const modal   = document.getElementById('bookPreviewModal');
    const bodyEl  = document.getElementById('previewBody');
    if (!modal || !bodyEl) return;

    // 즉시 모달 띄우고 로딩 상태
    bodyEl.innerHTML = renderPreviewSkeleton(book, meta);
    modal.hidden = false;
    document.body.classList.add('preview-open');

    wirePreviewClose(modal);

    // 알라딘 lookup으로 풍부한 메타 가져오기
    let detail = null;
    try {
      detail = await API.aladinLookup(book.isbn);
    } catch (e) {
      console.warn('[preview] 알라딘 lookup 실패', e.message);
    }

    bodyEl.innerHTML = renderPreviewContent(book, meta, detail);
    wirePreviewActions(book, modal);
  }

  function renderPreviewSkeleton(b, meta) {
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

  function renderPreviewContent(b, meta, detail) {
    const item = detail || {};
    const ratingInfo = (item.subInfo && item.subInfo.ratingInfo) || {};
    const reviewList = (item.subInfo && item.subInfo.reviewList) || [];

    const description = (item.description || b.contents || '').trim();
    const ratingScore = Number(ratingInfo.ratingScore || 0);
    const ratingCount = Number(ratingInfo.ratingCount || 0);
    const categoryName = item.categoryName || b.categoryName || '';
    const pubDate = item.pubDate || b.datetime || '';
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
        <span class="preview-row-value">${escapeHtml(categoryName.replace(/^국내도서>/, '').replace(/>/g, ' › '))}</span>
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

    const aladinLink = item.link || b.url
      ? `<a href="${escapeAttr(item.link || b.url)}" target="_blank" rel="noopener" class="btn btn-secondary">알라딘에서 보기</a>`
      : '';

    const whyBlock = meta.why ? `
      <div class="preview-why">
        <p class="preview-why-label">WHY THIS BOOK</p>
        <p class="preview-why-text">${escapeHtml(meta.why)}</p>
      </div>
    ` : '';

    return `
      <div class="preview-hero">
        <div class="preview-cover">${b.thumbnail ? `<img src="${escapeAttr(b.thumbnail)}" alt="">` : '書'}</div>
        <div class="preview-meta">
          <p class="preview-reason">${escapeHtml(meta.reason || '추천 도서')}</p>
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
        <button type="button" class="btn btn-primary" id="previewSaveBtn">＋ 내 서재에 기록</button>
        ${aladinLink}
      </div>
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

  function wirePreviewClose(modal) {
    const close = () => closePreview(modal);
    modal.querySelectorAll('[data-close-preview]').forEach(el => {
      el.addEventListener('click', close, { once: true });
    });
    document.addEventListener('keydown', escClose);
    function escClose(e) {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', escClose);
        close();
      }
    }
  }

  function closePreview(modal) {
    modal.hidden = true;
    document.body.classList.remove('preview-open');
  }

  function wirePreviewActions(book, modal) {
    const saveBtn = document.getElementById('previewSaveBtn');
    if (!saveBtn) return;
    saveBtn.addEventListener('click', () => {
      const existing = Storage.getBookByIsbn(book.isbn);
      if (existing) {
        showToast('이미 기록된 책');
        setTimeout(() => location.href = `detail.html?id=${encodeURIComponent(existing.id)}`, 600);
        return;
      }
      const saved = Storage.saveBook({
        isbn:      book.isbn,
        title:     book.title,
        authors:   book.authors,
        publisher: book.publisher,
        thumbnail: book.thumbnail,
        contents:  book.contents || '',
        language:  book.language || 'ko',
      });
      showToast(`"${book.title}" 기록됨`);
      closePreview(modal);
      setTimeout(() => location.href = `detail.html?id=${encodeURIComponent(saved.id)}&new=1`, 700);
    });
  }

  // ── UI helpers ───────────────────────────────────────────────

  function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function showFatal(msg) {
    const main = document.querySelector('main');
    if (main) main.innerHTML = `<div class="empty-state"><div class="empty-state-glyph">!</div><p class="empty-state-title">${escapeHtml(msg)}</p><a href="index.html" class="btn btn-primary mt-md">서재로</a></div>`;
  }

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = String(s ?? '');
    return d.innerHTML;
  }
  function escapeAttr(s) { return String(s ?? '').replace(/"/g, '&quot;'); }
})();
