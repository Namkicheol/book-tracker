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
  let recommendationData = null;

  // ── Boot ─────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', loadBook);

  // Load recommendation database
  fetch('data/book-recommendations.json')
    .then(res => res.json())
    .then(data => {
      recommendationData = data;
      if (window.BookPreview) BookPreview.setRecData(data);
      // Retry showing badges after data loads
      if (book) showRecommendationBadges();
    })
    .catch(err => console.warn('[detail] 추천 도서 DB 로드 실패', err));

  function loadBook() {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    isNew = params.get('new') === '1';

    if (!id) return showFatal('책 ID가 URL에 없습니다');

    book = Storage.getBook(id);
    if (!book) return showFatal('책을 찾을 수 없습니다 (id 확인 필요)');

    folders = Storage.getAllFolders();

    renderHero();
    renderStatus();
    renderRating();
    renderReview();
    renderDate();
    renderFolderPicker();
    wireStatus();
    wireActions();

    if (book.language === 'en' && !book.ar) tryFetchAR();

    // Lazy-load recommendations
    setTimeout(loadRecommendations, 100);
  }

  // ── Status ───────────────────────────────────────────────────

  const STATUS_STYLES = {
    '':        { bg: 'rgba(46,204,113,0.12)',  fg: '#1a7a43',               activeBorder: 'rgba(26,122,67,0.4)'   },
    reading:   { bg: 'rgba(243,156,18,0.12)',  fg: '#c17f00',               activeBorder: 'rgba(193,127,0,0.4)'   },
    want:      { bg: 'rgba(255,158,158,0.15)', fg: 'var(--accent,#FF9E9E)', activeBorder: 'rgba(255,158,158,0.5)' },
  };

  function renderStatus() {
    const current = book.status || '';
    document.querySelectorAll('.status-pick-btn').forEach(btn => {
      const val = btn.dataset.status;
      const active = val === current;
      const s = STATUS_STYLES[val] || STATUS_STYLES[''];
      btn.style.background  = s.bg;
      btn.style.color       = s.fg;
      btn.style.borderColor = active ? s.activeBorder : 'transparent';
      btn.style.fontWeight  = active ? '800' : '600';
      btn.style.boxShadow   = active ? `0 0 0 1.5px ${s.activeBorder}` : 'none';
    });
  }

  function wireStatus() {
    document.querySelectorAll('.status-pick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const newStatus = btn.dataset.status || null;
        book = Storage.updateBook(book.id, { status: newStatus });
        renderStatus();
      });
    });
  }

  // ── Hero ─────────────────────────────────────────────────────

  const PALETTE_GLYPHS_D = ['書', '詩', '夢', '道', '心', '花', '月', '時'];

  function detailPalette(title) {
    let h = 0;
    for (const c of String(title || '')) h = (h * 31 + c.charCodeAt(0)) & 0xffffff;
    return (Math.abs(h) % 8) + 1;
  }

  function renderHero() {
    document.getElementById('bookTitle').textContent = book.title || '제목 없음';
    document.getElementById('bookAuthor').textContent = (book.authors || []).join(', ') || '저자 미상';
    document.getElementById('bookPublisher').textContent = book.publisher || '';
    document.getElementById('bookIsbn').textContent = book.isbn ? `ISBN ${book.isbn}` : '';

    const img = document.getElementById('coverImg');
    const ph = document.getElementById('coverPlaceholder');
    const palette = detailPalette(book.title);
    ph.dataset.palette = palette;
    ph.textContent = PALETTE_GLYPHS_D[palette - 1];
    if (book.thumbnail) {
      img.src = book.thumbnail;
      img.style.display = 'block';
      ph.style.display = 'none';
      img.onerror = () => { img.style.display = 'none'; ph.style.display = 'flex'; };
    }

    if (book.ar) showARBadge(book.ar, book.lexile);

    // Show recommendation list badges
    showRecommendationBadges();
  }

  function showARBadge(ar, lexile) {
    const el = document.getElementById('arBadge');
    const lex = lexile ? `<span class="ar-badge" style="background:var(--text-mute);margin-left:4px">${escapeHtml(lexile)}</span>` : '';
    el.innerHTML = `<span class="ar-badge">AR ${ar}</span>${lex}`;
    el.classList.remove('hidden');
  }

  function showRecommendationBadges() {
    if (!recommendationData || !book.isbn) return;

    const isbn = String(book.isbn).replace(/\D/g, '');
    const bookData = recommendationData.books[isbn];

    if (!bookData || !bookData.lists || bookData.lists.length === 0) return;

    // Show recommendation badges
    const tagsEl = document.getElementById('detailTags');
    if (tagsEl) {
      const badges = bookData.lists.map(listId => {
        const source = recommendationData.meta.sources.find(s => s.id === listId);
        if (!source) return '';
        return `<span class="rec-badge" style="background:${source.badge.color};color:#fff;padding:3px 8px;border-radius:2px;font-size:10px;font-weight:600;letter-spacing:0.05em;display:inline-block;margin-right:4px;margin-bottom:4px">${escapeHtml(source.badge.text)}</span>`;
      }).filter(Boolean).join('');

      if (badges) {
        tagsEl.innerHTML = badges;
        tagsEl.style.display = 'flex';
        tagsEl.style.flexWrap = 'wrap';
        tagsEl.style.gap = '4px';
      }
    }
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

    // Instagram 공유 버튼
    const instagramBtn = document.getElementById('instagramShareBtn');
    if (instagramBtn) {
      instagramBtn.addEventListener('click', shareToInstagram);
    }

    // 이미 리뷰가 있으면 Instagram 공유 버튼 표시
    if (book.review) {
      document.getElementById('shareRow').style.display = 'flex';
    }
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

    // 리뷰가 있으면 Instagram 공유 버튼 표시
    if (reviewHtml) {
      document.getElementById('shareRow').style.display = 'flex';
    }
  }

  function deleteCurrent() {
    if (!confirm(`"${book.title}"을(를) 서재에서 삭제할까요?`)) return;
    Storage.deleteBook(book.id);
    showToast('삭제됨');
    setTimeout(() => location.href = 'index.html', 600);
  }

  async function shareToInstagram() {
    const btn = document.getElementById('instagramShareBtn');
    const originalText = btn.innerHTML;

    try {
      btn.disabled = true;
      btn.innerHTML = '🎨 생성 중...';

      console.log('[Detail] Starting template generation...');

      // 책 데이터 준비
      const bookData = {
        title: book.title || '제목 없음',
        author: (book.authors || []).join(', ') || '저자 미상',
        publisher: book.publisher || '출판사 미상',
        cover: book.thumbnail ? `https://book-tracker-aladin.obangti.workers.dev/image-proxy?url=${encodeURIComponent(book.thumbnail)}` : null
      };

      console.log('[Detail] Book data:', bookData);

      const review = document.getElementById('reviewInput').innerHTML;
      const rating = selectedRating || 0;

      console.log('[Detail] Review length:', review.length, 'Rating:', rating);

      // 템플릿 생성 (기본: 스티커북)
      const canvas = await generateInstagramTemplate(bookData, review, rating, 1);

      console.log('[Detail] Canvas created, showing modal...');

      // 모달에 캔버스 표시
      showInstagramModal(canvas, bookData, review, rating);

    } catch (err) {
      console.error('[Detail] Instagram 공유 실패:', err);
      showToast(`이미지 생성 실패: ${err.message || '알 수 없는 오류'}`);
      alert(`디버그 정보:\n${err.stack || err.message}`);
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }

  function showInstagramModal(initialCanvas, bookData, review, rating) {
    const modal = document.getElementById('instagramModal');
    const previewCanvas = document.getElementById('sharePreviewCanvas');
    let currentCanvas = initialCanvas;
    let currentTemplateId = 1;

    // 캔버스를 미리보기에 복사
    function updatePreview(canvas) {
      previewCanvas.width = canvas.width;
      previewCanvas.height = canvas.height;
      const ctx = previewCanvas.getContext('2d');
      ctx.drawImage(canvas, 0, 0);
      currentCanvas = canvas;
    }

    updatePreview(initialCanvas);

    // 모달 표시
    modal.removeAttribute('hidden');

    // 템플릿 선택 버튼
    const templateButtons = modal.querySelectorAll('.template-btn');
    templateButtons.forEach(btn => {
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);

      newBtn.addEventListener('click', async () => {
        const templateId = parseInt(newBtn.dataset.template);
        if (templateId === currentTemplateId) return;

        // 버튼 스타일 업데이트 (매번 새로 조회)
        modal.querySelectorAll('.template-btn').forEach(b => {
          b.style.borderColor = '#E0E0E0';
          b.style.background = '#fff';
        });
        newBtn.style.borderColor = '#FFB8C6';
        newBtn.style.background = '#FFF8F0';

        // 로딩 표시
        newBtn.innerHTML = '⏳ 생성중...';
        newBtn.disabled = true;

        try {
          const newCanvas = await generateInstagramTemplate(bookData, review, rating, templateId);
          updatePreview(newCanvas);
          currentTemplateId = templateId;
        } catch (err) {
          console.error('Template generation failed:', err);
          showToast('템플릿 생성 실패');
        } finally {
          const templateTexts = {
            '1': '🌸 소프트 핑크',
            '2': '🍑 피치 코랄',
            '3': '🌿 민트 파스텔',
            '4': '☕ 크림 베이지',
            '5': '📖 코지 독서',
            '6': '☕ 북카페',
            '7': '✍️ 손글씨 노트',
            '8': '👧 책 읽는 아이',
            '9': '🐻 동물 친구',
            '10': '🚀 우주 탐험',
            '11': '🦊 숲속 동화',
            '12': '✨ 스티커북',
            '13': '💕 포토카드',
            '14': '📝 일기장'
          };
          newBtn.innerHTML = templateTexts[newBtn.dataset.template] || '✨ 스티커북';
          newBtn.disabled = false;
        }
      });
    });

    // 다운로드 버튼
    const downloadBtn = document.getElementById('shareDownloadBtn');
    const newDownloadBtn = downloadBtn.cloneNode(true);
    downloadBtn.parentNode.replaceChild(newDownloadBtn, downloadBtn);

    newDownloadBtn.addEventListener('click', async () => {
      const filename = `맘스북스_${bookData.title.replace(/[^가-힣a-zA-Z0-9]/g, '_')}_${Date.now()}.png`;
      console.log('[Detail] Download button clicked, filename:', filename);

      newDownloadBtn.disabled = true;
      newDownloadBtn.innerHTML = '⏳ 다운로드 중...';

      try {
        await downloadCanvas(currentCanvas, filename);
        showToast('이미지 다운로드 완료! 📥');
        console.log('[Detail] Download success');
      } catch (err) {
        console.error('[Detail] Download failed:', err);
        showToast('다운로드 실패: ' + err.message);
      } finally {
        newDownloadBtn.disabled = false;
        newDownloadBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          저장
        `;
      }
    });

    // 일반 공유 버튼 (모든 앱)
    const shareAllBtn = document.getElementById('shareAllBtn');
    if (shareAllBtn) {
      const newShareAllBtn = shareAllBtn.cloneNode(true);
      shareAllBtn.parentNode.replaceChild(newShareAllBtn, shareAllBtn);

      newShareAllBtn.addEventListener('click', async () => {
        const filename = `맘스북스_${bookData.title.replace(/[^가-힣a-zA-Z0-9]/g, '_')}.png`;
        newShareAllBtn.disabled = true;
        newShareAllBtn.innerHTML = '⏳ 공유 중...';

        try {
          const result = await window.shareToAll(currentCanvas, filename, bookData.title);
          if (result.success) {
            showToast('공유 완료! 📤');
            modal.setAttribute('hidden', '');
          } else if (!result.cancelled) {
            // Web Share API 미지원 - 다운로드로 폴백
            await downloadCanvas(currentCanvas, filename);
            showToast('이미지를 저장했어요! 📱 사진 앱에서 원하는 앱으로 공유하세요');
          }
        } catch (err) {
          console.error('Share failed:', err);
          showToast('공유 실패: ' + err.message);
        } finally {
          newShareAllBtn.disabled = false;
          newShareAllBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
              <polyline points="16 6 12 2 8 6"></polyline>
              <line x1="12" y1="2" x2="12" y2="15"></line>
            </svg>
            공유
          `;
        }
      });
    }

    // 모달 닫기
    const closeButtons = modal.querySelectorAll('[data-close-instagram]');
    closeButtons.forEach(btn => {
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      newBtn.addEventListener('click', () => {
        modal.setAttribute('hidden', '');
      });
    });
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

    // 시리즈 감지 — Rail 2 전략 결정에 사용
    const series = detectSeries(book.title);

    // Step 2: 4 rails
    const authorPromise = author && useAladin
      ? API.aladinSearch({ query: author, queryType: 'Author', categoryId, maxResults: 12 })
          .then(items => items.map(API.normalizeAladin))
          .catch(() => fallbackAuthor(author))
      : (author ? fallbackAuthor(author) : Promise.resolve([]));

    // Rail 2: 시리즈면 다음 권 검색, 아니면 제목 키워드로 같은 분야 검색
    let rail2Reason = '';
    let rail2Why    = '';
    const sameLevelPromise = (async () => {
      if (series && useAladin) {
        const nextQuery = `${series.base} ${series.num + 1}`;
        try {
          const items = await API.aladinSearch({ query: nextQuery, queryType: 'Title', maxResults: 6 });
          const norm = items.map(API.normalizeAladin).filter(Boolean);
          if (norm.length > 0) {
            rail2Reason = `${series.base} 시리즈`;
            rail2Why    = `지금 읽은 ${series.num}권의 바로 다음 이야기, ${series.num + 1}권부터 계속됩니다. 같은 세계관·캐릭터를 이어서 만날 수 있어요.`;
            return norm;
          }
        } catch (e) { /* 폴백으로 */ }
      }
      // 같은 categoryId 베스트셀러 — 가장 안정적인 "수준 비슷한 책" 소스
      if (useAladin && categoryId) {
        try {
          const items = await API.aladinList({ queryType: 'Bestseller', categoryId, maxResults: 30 });
          const norm = items.map(API.normalizeAladin).filter(Boolean);
          if (norm.length > 0) {
            rail2Reason = '같은 분야 베스트';
            rail2Why    = `『${book.title}』과 같은 분야(${(book.categoryName || '').split('>').slice(-1)[0] || ''})에서 가장 많이 읽히는 책들이에요.`;
            return sampleByIsbn(norm, 12, book.isbn);
          }
        } catch (e) { /* 폴백으로 */ }

        // 제목 키워드 보조
        const genre = API.extractGenreKeyword(book.categoryName || '');
        const titleWords = (book.title || '').replace(/[^가-힣\w\s]/g, '').split(/\s+/).filter(w => w.length > 1).slice(0, 2).join(' ');
        const kw = (titleWords || genre || '').trim();
        if (kw) {
          try {
            const items = await API.aladinSearch({ query: kw, queryType: 'Keyword', categoryId, maxResults: 30, sort: 'SalesPoint' });
            const norm = items.map(API.normalizeAladin).filter(Boolean);
            if (norm.length > 0) {
              rail2Reason = `"${kw}" 관련 추천`;
              rail2Why    = `『${book.title}』과 같은 분야에서 "${kw}" 키워드로 많이 읽힌 책들입니다.`;
              return sampleByIsbn(norm, 12, book.isbn);
            }
          } catch (e) { /* 폴백으로 */ }
        }
      }
      // 최후 폴백
      rail2Reason = '같은 출판사 책';
      rail2Why    = `『${book.title}』과 같은 출판사의 책입니다.`;
      return fallbackPublisher(book.publisher);
    })();

    // 이 책도 좋아요 = similarBookList 우선 → 비어있으면 부모 categoryId Bestseller
    const alsoLikePromise = (async () => {
      if (!useAladin) return [];
      const similar = API.extractSimilarBooks(lookupItem).map(API.normalizeAladin).filter(Boolean);
      if (similar.length >= 4) return similar;
      const parentId = API.extractParentCategoryId(lookupItem);
      if (!parentId) return similar;
      try {
        const parent = await API.aladinList({ queryType: 'Bestseller', categoryId: parentId, maxResults: 30 });
        const parentNorm = parent.map(API.normalizeAladin)
          .filter(b => b && String(b.isbn).replace(/\D/g, '') !== currentIsbn)
          .filter(b => String(b.categoryId) !== String(categoryId));
        const sampledParent = sampleByIsbn(parentNorm, 12, book.isbn);
        return [...similar, ...sampledParent].slice(0, 12);
      } catch (e) {
        return similar;
      }
    })();

    const nextLevelPromise = (async () => {
      if (!useAladin) return [];
      try {
        const items = await API.searchNextLevel(lookupItem, { maxResults: 30 });
        const norm = items.map(API.normalizeAladin).filter(Boolean);
        if (norm.length > 0) return sampleByIsbn(norm, 12, book.isbn);
      } catch (e) { /* 폴백으로 */ }

      // Fallback 1: 부모 categoryId 베스트셀러에서 현재 categoryId 제외
      const parentId = API.extractParentCategoryId(lookupItem);
      if (parentId) {
        try {
          const parent = await API.aladinList({ queryType: 'Bestseller', categoryId: parentId, maxResults: 30 });
          const norm = parent.map(API.normalizeAladin)
            .filter(b => b && String(b.categoryId) !== String(categoryId));
          if (norm.length > 0) return sampleByIsbn(norm, 12, book.isbn);
        } catch (e) { /* 다음 폴백 */ }
      }

      // Fallback 2: 추천 DB에서 한 단계 위 학년 책 (source ISBN 시드로 샘플)
      if (recommendationData) {
        const allRec = Object.values(recommendationData.books || {});
        const order = ['유아', '초등 저학년', '초등 중학년', '초등 고학년'];
        // 현재 책의 categoryName으로 학년 추정 (알라딘 기준 → 추천 DB targetAge로 매핑)
        const cat = (book.categoryName || '').toLowerCase();
        let curIdx = -1;
        if (cat.includes('유아') || cat.includes('그림책')) curIdx = 0;
        else if (cat.includes('1') || cat.includes('2') || cat.includes('저학년')) curIdx = 1;
        else if (cat.includes('3') || cat.includes('4') || cat.includes('중학년')) curIdx = 2;
        else if (cat.includes('동화')) curIdx = 1; // 어린이 동화 = 저학년 추정
        const nextAge = curIdx >= 0 && curIdx < 3 ? order[curIdx + 1] : null;
        if (nextAge) {
          const pool = allRec.filter(b => b.targetAge === nextAge && b.thumbnail);
          const normalizedPool = pool.map(b => ({
            isbn: b.isbn,
            title: b.title,
            authors: b.author ? [b.author] : [],
            publisher: b.publisher,
            thumbnail: b.thumbnail,
            categoryId: null,
            categoryName: '',
            // 정렬용: lists 개수를 인기 점수로, year를 pubDate(연-01-01)로 변환
            salesPoint: (b.lists || []).length * 1000 + 1, // ≥1로 0 회피
            bestRank: 0,
            pubDate: b.year ? `${b.year}-01-01` : '',
          }));
          return sampleByIsbn(normalizedPool, 12, book.isbn);
        }
      }
      return [];
    })();

    const [authorBooks, sameLevelBooks, alsoLikeBooks, nextLevelBooks] = await Promise.all([
      authorPromise, sameLevelPromise, alsoLikePromise, nextLevelPromise,
    ]);

    const currentBookCategory = book.categoryName || '';
    const currentBookTitle = book.title || '이 책';
    const currentAuthor = author || '';

    const authorGenre = API.extractGenreKeyword(currentBookCategory);

    renderRail('recAuthor', filterCurrent(authorBooks), {
      reason: `${currentAuthor || '저자'}의 다른 책`,
      why: currentAuthor
        ? `${currentAuthor} 작가가 쓴 다른 작품입니다.${authorGenre ? ` ${authorGenre} 장르에서 꾸준히 활동하며 쌓아온 작가 특유의 시선과 문체를 이어서 만날 수 있어요.` : ' 이 책이 마음에 들었다면 같은 작가의 다음 이야기도 어울릴 거예요.'}`
        : '같은 저자의 다른 작품입니다.',
    });
    const r2eyebrow = document.getElementById('recPublisherEyebrow');
    const r2title   = document.getElementById('recPublisherTitle');
    if (r2eyebrow) r2eyebrow.textContent = series ? '시리즈' : '유사한 책';
    if (r2title)   r2title.textContent   = rail2Reason || '수준 비슷한 책';
    // 유사 rail 보강: sameLevel이 부족하면 alsoLike(similarBookList + 부모카테고리 BS)로 채움
    const filteredSame = filterCurrent(sameLevelBooks);
    const filteredAlso = filterCurrent(alsoLikeBooks);
    const seenIsbn = new Set(filteredSame.map(b => String(b.isbn).replace(/\D/g, '')));
    const merged = [...filteredSame];
    for (const b of filteredAlso) {
      const k = String(b.isbn).replace(/\D/g, '');
      if (k && !seenIsbn.has(k)) { merged.push(b); seenIsbn.add(k); }
    }
    renderRail('recPublisher', merged, {
      reason: rail2Reason || '유사한 책',
      why:    rail2Why    || `『${currentBookTitle}』과 비슷한 분야·수준의 책입니다.`,
    });
    renderRail('recSimilar', filterCurrent(nextLevelBooks), {
      reason: '다음 단계 추천책',
      why: `『${currentBookTitle}』보다 어휘 수준이나 주제 깊이가 한 단계 높은 책으로 골랐습니다. 지금 읽은 책이 쉽게 느껴지기 시작했다면 이 리스트에서 다음 책을 골라보세요.`,
    });
    attachRailSortListeners();
  }

  function prettyCategory(name) {
    return String(name || '')
      .replace(/^국내도서>/, '')
      .replace(/^외국도서>/, '')
      .replace(/>/g, ' › ');
  }

  /**
   * Source ISBN을 시드로 한 deterministic 샘플링.
   * 같은 카테고리의 책들은 알라딘이 동일한 결과를 반환하므로,
   * source 책 ISBN으로 풀에서 count개를 뽑아 책마다 다른 셋이 보이게 함.
   * - 같은 source ISBN → 항상 같은 결과 (일관성)
   * - 다른 source ISBN → 잘 분산된 다른 결과 (다양성)
   * - 풀이 count 이하면 그대로 반환 (graceful degrade)
   */
  function sampleByIsbn(arr, count, sourceIsbn) {
    if (!Array.isArray(arr) || arr.length <= count) return arr || [];
    const seed = fnv32(String(sourceIsbn));
    const rng = mulberry32(seed);
    const tagged = arr.map(item => ({ item, key: rng() }));
    tagged.sort((a, b) => a.key - b.key);
    return tagged.slice(0, count).map(t => t.item);
  }

  function fnv32(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
    }
    return h >>> 0;
  }

  function mulberry32(seed) {
    return function () {
      let t = (seed = (seed + 0x6D2B79F5) | 0);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0);
    };
  }

  /**
   * 시리즈 감지 — "마법천자문 60", "마법천자문 60권", "설민석의 조선왕조실록 2"
   * 반환: { base: "마법천자문", num: 60 } 또는 null
   */
  function detectSeries(title) {
    if (!title) return null;
    const t = title.trim();
    // "제N권" 또는 끝에 숫자
    const patterns = [
      /^(.+?)\s+제\s*(\d+)\s*권$/,
      /^(.+?)\s+(\d+)\s*권$/,
      /^(.+?)\s+(\d+)\s*$/,
    ];
    for (const re of patterns) {
      const m = t.match(re);
      if (m) {
        const base = m[1].trim();
        const num  = parseInt(m[2]);
        if (num > 0 && num < 200) return { base, num };
      }
    }
    return null;
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

  // rail별 책 목록·정렬 상태 보관 (정렬 버튼 클릭 시 재정렬)
  const railState = {};

  function renderRail(railId, books, meta = {}) {
    const rail = document.getElementById(railId);
    if (!rail) return;

    // 섹션 전체 (정렬 토글 + rail) 숨기기/보이기
    const section = rail.closest('.rec-section') || rail;

    if (books.length === 0) {
      section.style.display = 'none';
      return;
    }
    section.style.display = '';

    // 상태 저장 + 정렬
    if (!railState[railId]) railState[railId] = { sort: 'popularity' };
    railState[railId].books = books;
    railState[railId].meta = meta;
    const sortedBooks = sortRailBooks(books, railState[railId].sort);

    const INITIAL_SHOW = 12;
    const hasMore = sortedBooks.length > INITIAL_SHOW;
    const renderTarget = sortedBooks; // closure에서 사용

    const renderBooks = (booksToRender) => booksToRender.map((b, i) => {
      const cover = b.thumbnail
        ? `<img class="rec-cover" src="${escapeAttr(b.thumbnail)}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'rec-cover',style:'background:linear-gradient(160deg,var(--bg-paper),var(--border));display:flex;align-items:center;justify-content:center;font-family:var(--font-han);font-size:24px;color:var(--text-mute);opacity:0.5',textContent:'書'}))">`
        : `<div class="rec-cover" style="background:linear-gradient(160deg,var(--bg-paper),var(--border));display:flex;align-items:center;justify-content:center;font-family:var(--font-han);font-size:24px;color:var(--text-mute);opacity:0.5">書</div>`;

      // Check if this book is in recommendation database
      let badges = '';
      if (recommendationData && b.isbn) {
        const isbn = String(b.isbn).replace(/\D/g, '');
        const bookData = recommendationData.books[isbn];
        if (bookData && bookData.lists && bookData.lists.length > 0) {
          badges = bookData.lists.map(listId => {
            const source = recommendationData.meta.sources.find(s => s.id === listId);
            if (!source) return '';
            return `<span style="background:${source.badge.color};color:#fff;padding:2px 6px;border-radius:2px;font-size:9px;font-weight:600;letter-spacing:0.05em;display:inline-block;margin-right:3px;margin-top:4px">${escapeHtml(source.badge.text)}</span>`;
          }).filter(Boolean).join('');
        }
      }

      return `
        <button type="button" class="rec-card" data-rail="${escapeAttr(railId)}" data-idx="${i}" style="cursor:pointer;border:none;background:transparent;padding:0;text-align:left">
          ${cover}
          <div class="rec-title">${escapeHtml(b.title)}</div>
          ${badges ? `<div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:3px">${badges}</div>` : ''}
        </button>
      `;
    }).join('');

    rail.innerHTML = `
      <div class="rail-books">${renderBooks(renderTarget.slice(0, INITIAL_SHOW))}</div>
      ${hasMore ? `
        <button type="button" class="rail-more-btn" style="width:100%;padding:12px;margin-top:16px;border:2px dashed #E0E0E0;border-radius:8px;background:#FAFAFA;color:#718096;font-weight:600;cursor:pointer;transition:all 0.2s">
          더보기 (+${renderTarget.length - INITIAL_SHOW}권)
        </button>
      ` : ''}
    `;

    // 더보기 버튼
    const moreBtn = rail.querySelector('.rail-more-btn');
    if (moreBtn) {
      moreBtn.addEventListener('click', () => {
        const booksContainer = rail.querySelector('.rail-books');
        booksContainer.innerHTML = renderBooks(renderTarget);
        moreBtn.remove();
        booksContainer.querySelectorAll('[data-rail]').forEach(card => {
          card.addEventListener('click', () => {
            const idx = Number(card.dataset.idx);
            const picked = renderTarget[idx];
            if (picked) showBookPreview(picked, meta);
          });
        });
      });
    }

    rail.querySelectorAll('[data-rail]').forEach(card => {
      card.addEventListener('click', () => {
        const idx = Number(card.dataset.idx);
        const picked = renderTarget[idx];
        if (picked) showBookPreview(picked, meta);
      });
    });
  }

  function sortRailBooks(books, mode) {
    const arr = [...books];
    if (mode === 'recent') {
      // pubDate 기준 최신순 (없으면 datetime fallback, 가장 뒤로)
      return arr.sort((a, b) => {
        const da = (a.pubDate || a.datetime || '').slice(0, 10);
        const db = (b.pubDate || b.datetime || '').slice(0, 10);
        return db.localeCompare(da);
      });
    }
    // popularity: salesPoint DESC, fallback bestRank ASC
    return arr.sort((a, b) => {
      const sa = Number(a.salesPoint || 0);
      const sb = Number(b.salesPoint || 0);
      if (sa !== sb) return sb - sa;
      const ra = Number(a.bestRank || 1e9);
      const rb = Number(b.bestRank || 1e9);
      return ra - rb;
    });
  }

  function attachRailSortListeners() {
    document.querySelectorAll('.rec-sort-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const railId = btn.dataset.rail;
        const sort   = btn.dataset.sort;
        if (!railState[railId]) return;
        // 토글 active
        document.querySelectorAll(`.rec-sort-btn[data-rail="${railId}"]`).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        railState[railId].sort = sort;
        renderRail(railId, railState[railId].books, railState[railId].meta);
      });
    });
  }

  // ── Book Preview Modal (delegated to BookPreview module) ─────

  function showBookPreview(book, meta = {}) {
    if (!window.BookPreview) {
      console.error('[detail] BookPreview 모듈 미로드');
      return;
    }
    BookPreview.show(book, { meta, mode: 'recommend' });
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
