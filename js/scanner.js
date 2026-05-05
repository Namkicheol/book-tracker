/**
 * 書架 — Scan / Add page (scan.html)
 *
 * Three modes:
 *   - barcode : html5-qrcode camera scan
 *   - isbn    : direct ISBN entry → Kakao API
 *   - title   : title/author search → multi-result list → pick one
 *
 * Common flow:
 *   detect/pick book → preview card → "이 책 기록하기" → detail.html?isbn=XXX&pending=1
 *   (the detail page handles the "new book" flow when isbn is in URL but no id)
 */

(function () {
  'use strict';

  // ── State ────────────────────────────────────────────────────

  let html5QrCode = null;
  let scannerRunning = false;
  let pickedBook = null;  // currently shown in resultCard

  const PANES = {
    barcode: 'modeBarcode',
    isbn:    'modeIsbn',
    manual:  'modeIsbn',  // alias
    title:   'modeTitle',
  };

  // ── Mode tabs ────────────────────────────────────────────────

  function setMode(mode, opts = {}) {
    const target = PANES[mode] || PANES.barcode;

    document.querySelectorAll('.mode-pane').forEach(el => {
      el.classList.toggle('hidden', el.id !== target);
    });
    document.querySelectorAll('#modeTabs [data-mode]').forEach(btn => {
      const isActive = (PANES[btn.dataset.mode] || PANES.barcode) === target;
      btn.classList.toggle('active', isActive);
    });

    // Hide shared result/error/loading on mode switch
    hideResult();
    hideLoading();
    hideError();
    document.getElementById('titleResults')?.classList.add('hidden');

    // Stop camera if leaving barcode mode
    if (target !== 'modeBarcode' && scannerRunning) stopBarcode();

    // Auto-start camera ONLY from user gesture (탭 클릭). 페이지 로드에서 자동 시작하면
    // iOS Safari·Chrome이 user gesture 컨텍스트 부재로 NotAllowedError 발생.
    if (target === 'modeBarcode' && !scannerRunning && opts.autoStart) {
      startBarcode();
    }

    // URL hash
    if (history.replaceState) {
      const hash = mode === 'manual' ? 'isbn' : mode;
      history.replaceState(null, '', `#${hash}`);
    }
  }

  function initModeTabs() {
    document.querySelectorAll('#modeTabs [data-mode]').forEach(btn => {
      btn.addEventListener('click', () => setMode(btn.dataset.mode, { autoStart: true }));
    });
    const hash = (location.hash || '').replace('#', '').toLowerCase();
    // 페이지 로드 시점은 user gesture가 아니므로 autoStart 생략 — 사용자가 "카메라 시작" 버튼을 눌러야 함
    setMode(hash in PANES ? hash : 'title');
  }

  // ── Barcode (html5-qrcode) ───────────────────────────────────

  let lastDecoded = null;
  let lastDecodedAt = 0;

  async function startBarcode() {
    if (scannerRunning) return;
    if (typeof Html5Qrcode === 'undefined') {
      showError('바코드 라이브러리를 불러올 수 없어요. 인터넷 연결 후 새로고침해 주세요.');
      return;
    }

    const startBtn = document.getElementById('startBtn');
    startBtn.disabled = true;
    startBtn.textContent = '카메라 준비 중…';

    try {
      html5QrCode = new Html5Qrcode('reader', /* verbose= */ false);
      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 280, height: 140 }, aspectRatio: 4/3 },
        onDecodeSuccess,
        () => { /* per-frame mismatch errors are noisy; ignore */ }
      );
      scannerRunning = true;
      const overlay = document.getElementById('scanOverlay');
      if (overlay) overlay.style.display = 'block';
      startBtn.textContent = '카메라 정지';
      startBtn.disabled = false;
      startBtn.dataset.state = 'running';
    } catch (e) {
      console.error('[scanner] camera error', e);
      const errStr = String(e?.message || e || '');
      const errName = e?.name || '';
      const isDenied = errName === 'NotAllowedError' || /NotAllowed|permission|denied/i.test(errStr);
      const isNotFound = errName === 'NotFoundError' || /NotFound|not\s*found/i.test(errStr);
      const msg = isDenied
        ? '카메라 권한이 거부됐어요. 브라우저 설정에서 카메라 허용 후 다시 시도해 주세요.'
        : isNotFound
        ? '카메라를 찾을 수 없어요. 데스크탑이라면 ISBN 직접 입력 또는 제목 검색을 사용하세요.'
        : `카메라를 시작할 수 없어요: ${errStr}`;
      showError(msg);
      startBtn.textContent = '카메라 시작';
      startBtn.disabled = false;
      startBtn.dataset.state = '';
    }
  }

  function onDecodeSuccess(decoded) {
    const num = String(decoded || '').replace(/\D/g, '');
    if (num.length !== 13 && num.length !== 10) return;

    // Debounce — html5-qrcode can fire same code several times
    const now = Date.now();
    if (num === lastDecoded && (now - lastDecodedAt) < 1500) return;
    lastDecoded = num;
    lastDecodedAt = now;

    // Auto-stop and search
    stopBarcode().then(() => searchByIsbn(num));
  }

  async function stopBarcode() {
    if (!html5QrCode || !scannerRunning) return;
    try {
      await html5QrCode.stop();
      await html5QrCode.clear();
    } catch (e) {
      console.warn('[scanner] stop error', e);
    }
    scannerRunning = false;
    document.getElementById('scanOverlay').style.display = 'none';
    const btn = document.getElementById('startBtn');
    btn.textContent = '카메라 시작';
    btn.dataset.state = '';
  }

  function toggleBarcode() {
    if (scannerRunning) stopBarcode();
    else startBarcode();
  }

  // ── ISBN search ──────────────────────────────────────────────

  async function searchByIsbn(isbnRaw) {
    const isbn = String(isbnRaw || '').replace(/\D/g, '');
    if (isbn.length !== 10 && isbn.length !== 13) {
      showError('ISBN은 10자리 또는 13자리여야 합니다.');
      return;
    }
    showLoading();
    hideError();
    hideResult();

    try {
      // Already in our library?
      const existing = Storage.getBookByIsbn(isbn);
      if (existing) {
        hideLoading();
        showToast('이미 기록된 책이에요. 상세로 이동합니다.');
        setTimeout(() => location.href = `detail.html?id=${encodeURIComponent(existing.id)}`, 700);
        return;
      }

      const book = await API.searchByIsbn(isbn);
      hideLoading();
      if (!book) {
        showError(`ISBN ${isbn}에 해당하는 책을 찾을 수 없어요.`);
        return;
      }
      showResult(book);
    } catch (e) {
      hideLoading();
      console.error('[scanner] ISBN search error', e);
      showError(`검색 실패: ${e.message || e}`);
    }
  }

  // ── Title search (multi-result) ──────────────────────────────

  async function searchByTitle(query) {
    const q = String(query || '').trim();
    if (!q) {
      showError('검색어를 입력하세요.');
      return;
    }
    showLoading();
    hideError();
    hideResult();
    document.getElementById('titleResults').classList.add('hidden');

    try {
      const [p1, p2] = await Promise.all([
        API.searchByTitle(q, { size: 50, page: 1 }),
        API.searchByTitle(q, { size: 50, page: 2 }),
      ]);
      const seen = new Set();
      const list = [...p1, ...p2].filter(b => {
        const key = b.isbn || b.title;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      hideLoading();
      renderTitleResults(list, q);
    } catch (e) {
      hideLoading();
      console.error('[scanner] title search error', e);
      showError(`검색 실패: ${e.message || e}`);
    }
  }

  const PAGE_SIZE = 20;

  function renderTitleResults(list, query) {
    const wrap  = document.getElementById('titleResults');
    const label = document.getElementById('titleResultsLabel');

    if (list.length === 0) {
      label.textContent = `검색 결과 — "${query}" (없음)`;
      const listEl0 = document.getElementById('titleResultsList');
      if (listEl0) listEl0.innerHTML =
        `<p class="text-soft text-center" style="padding:var(--sp-md);font-family:var(--font-display);font-style:italic">결과가 없어요. 다른 검색어를 시도해 보세요.</p>`;
      const pg0 = document.getElementById('titleResultsPager');
      if (pg0) pg0.innerHTML = '';
      wrap.classList.remove('hidden');
      return;
    }

    const totalPages = Math.ceil(list.length / PAGE_SIZE);
    let currentPage = 1;

    function renderPage(page) {
      currentPage = page;
      const start = (page - 1) * PAGE_SIZE;
      const slice = list.slice(start, start + PAGE_SIZE);
      const listEl = document.getElementById('titleResultsList');
      if (!listEl) return;

      label.textContent = `검색 결과 — "${query}" (${list.length}권)`;

      listEl.innerHTML = slice.map(b => `
        <button type="button" class="result-card" data-isbn="${escapeAttr(b.isbn)}" style="text-align:left;width:100%;cursor:pointer">
          ${b.thumbnail
            ? `<img class="result-cover" src="${escapeAttr(b.thumbnail)}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'result-cover-placeholder',textContent:'書'}))">`
            : `<div class="result-cover-placeholder">書</div>`}
          <div class="result-info">
            <div class="result-title">${escapeHtml(b.title)}</div>
            <div class="result-author">${escapeHtml((b.authors||[]).join(', ') || '저자 미상')}</div>
            <div class="result-publisher">${escapeHtml(b.publisher || '')}</div>
          </div>
        </button>
      `).join('');

      listEl.querySelectorAll('[data-isbn]').forEach(btn => {
        btn.addEventListener('click', () => {
          const picked = list.find(b => b.isbn === btn.dataset.isbn);
          if (picked) showResult(picked);
        });
      });

      // 페이저
      const pager = document.getElementById('titleResultsPager');
      if (!pager) return;
      if (totalPages <= 1) { pager.innerHTML = ''; return; }

      pager.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;gap:6px;padding:var(--sp-md) 0">
          <button class="pager-btn" data-page="${page - 1}" ${page === 1 ? 'disabled' : ''}>‹</button>
          ${Array.from({ length: totalPages }, (_, i) => i + 1).map(p =>
            `<button class="pager-btn ${p === page ? 'active' : ''}" data-page="${p}">${p}</button>`
          ).join('')}
          <button class="pager-btn" data-page="${page + 1}" ${page === totalPages ? 'disabled' : ''}>›</button>
        </div>
      `;

      pager.querySelectorAll('[data-page]').forEach(btn => {
        btn.addEventListener('click', () => {
          const p = parseInt(btn.dataset.page);
          if (!isNaN(p) && p >= 1 && p <= totalPages) {
            renderPage(p);
            wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      });
    }

    renderPage(1);
    wrap.classList.remove('hidden');
  }

  // ── Result preview ───────────────────────────────────────────
  // 풍부한 미리보기는 BookPreview 모듈에 위임. 알라딘 평점·리뷰·추천 이유까지 보고
  // "＋ 내 서재에 기록" 버튼 누르면 자동 저장 + detail.html?id=...&new=1 이동.

  function showResult(book) {
    pickedBook = book;
    if (window.BookPreview) {
      BookPreview.show(book, { mode: 'recommend' });
      return;
    }
    // Fallback (BookPreview 미로드 시 옛 in-page 카드)
    console.warn('[scanner] BookPreview 미로드, fallback 카드 표시');
    const card = document.getElementById('resultCard');
    const section = document.getElementById('resultSection');
    if (!card || !section) return;
    card.innerHTML = `
      ${book.thumbnail
        ? `<img class="result-cover" src="${escapeAttr(book.thumbnail)}" alt="">`
        : `<div class="result-cover-placeholder">書</div>`}
      <div class="result-info">
        <div class="result-title">${escapeHtml(book.title)}</div>
        <div class="result-author">${escapeHtml((book.authors||[]).join(', ') || '저자 미상')}</div>
        <div class="result-publisher">${escapeHtml(book.publisher || '')}</div>
      </div>
    `;
    section.classList.remove('hidden');
  }

  // BookPreview의 saveBtn이 직접 저장 + 이동을 처리하므로 recordPicked는 fallback 용도만 유지.
  function recordPicked() {
    if (!pickedBook) return;
    const saved = Storage.saveBook({
      isbn: pickedBook.isbn,
      title: pickedBook.title,
      authors: pickedBook.authors,
      publisher: pickedBook.publisher,
      thumbnail: pickedBook.thumbnail,
      contents: pickedBook.contents || '',
      category: pickedBook.category || '',
      language: pickedBook.language || 'ko',
    });
    location.href = `detail.html?id=${encodeURIComponent(saved.id)}&new=1`;
  }

  function cancelPicked() {
    pickedBook = null;
    hideResult();
  }

  // ── UI helpers ───────────────────────────────────────────────

  function showLoading() { document.getElementById('loadingSection').classList.remove('hidden'); }
  function hideLoading() { document.getElementById('loadingSection').classList.add('hidden'); }
  function showError(msg) {
    document.getElementById('errorMsg').textContent = msg;
    document.getElementById('errorSection').classList.remove('hidden');
  }
  function hideError()  { document.getElementById('errorSection').classList.add('hidden'); }
  function hideResult() { document.getElementById('resultSection').classList.add('hidden'); pickedBook = null; }

  function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = String(s ?? '');
    return d.innerHTML;
  }
  function escapeAttr(s) { return String(s ?? '').replace(/"/g, '&quot;'); }

  // ── Boot ─────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', () => {
    initModeTabs();

    // Barcode toggle
    const startBtn = document.getElementById('startBtn');
    if (startBtn) startBtn.addEventListener('click', toggleBarcode);

    // ISBN form
    const isbnInput = document.getElementById('isbnInput');
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) searchBtn.addEventListener('click', () => searchByIsbn(isbnInput.value));
    if (isbnInput) isbnInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); searchByIsbn(isbnInput.value); }
    });

    // Title search form
    const titleInput = document.getElementById('titleInput');
    const titleBtn = document.getElementById('titleSearchBtn');
    if (titleBtn) titleBtn.addEventListener('click', () => searchByTitle(titleInput.value));
    if (titleInput) titleInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); searchByTitle(titleInput.value); }
    });

    // Result card actions
    const recordBtn = document.getElementById('recordBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    if (recordBtn) recordBtn.addEventListener('click', recordPicked);
    if (cancelBtn) cancelBtn.addEventListener('click', cancelPicked);
  });
})();
