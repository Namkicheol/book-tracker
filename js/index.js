/**
 * 書架 — Library page (index.html)
 *
 * Renders the book gallery + folder filter chips + sort cycle.
 */

(function () {
  'use strict';

  let currentFolderId = '';        // '' === 전체
  let currentSort     = 'newest';  // newest | oldest | rating | title
  let currentStatus   = 'all';     // all | want | reading | read
  let currentView     = localStorage.getItem('libraryView') || 'grid'; // grid | list

  const STATUS_BADGE = {
    want:    {
      label: '읽을 책',
      bg: 'rgba(255,158,158,0.15)', fg: 'var(--accent)',
      icon: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`,
    },
    reading: {
      label: '읽는 중',
      bg: 'rgba(243,156,18,0.12)', fg: '#c17f00',
      icon: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
    },
  };

  // 다중 선택 모드
  let selectMode = false;
  const selectedIds = new Set();

  const SORT_LABELS = {
    newest: '최근 읽은 순',
    oldest: '오래된 순',
    rating: '별점 높은 순',
    title:  '제목 순',
  };

  // Load recommendation database
  let recommendationData = null;
  fetch('data/book-recommendations.json')
    .then(res => res.json())
    .then(data => {
      recommendationData = data;
      if (window.BookPreview) BookPreview.setRecData(data);
      renderBooks(); // Re-render to show badges
    })
    .catch(err => console.warn('[index] 추천 도서 DB 로드 실패', err));

  // ── Sort ─────────────────────────────────────────────────────

  function sortBooks(books, mode) {
    const arr = [...books];
    switch (mode) {
      case 'oldest':
        return arr.sort((a, b) =>
          (a.readDate || a.createdAt || '').localeCompare(b.readDate || b.createdAt || ''));
      case 'rating':
        return arr.sort((a, b) =>
          (b.rating || 0) - (a.rating || 0) ||
          (b.readDate || b.createdAt || '').localeCompare(a.readDate || a.createdAt || ''));
      case 'title':
        return arr.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'ko'));
      case 'newest':
      default:
        return arr.sort((a, b) =>
          (b.readDate || b.createdAt || '').localeCompare(a.readDate || a.createdAt || ''));
    }
  }

  // ── Render: masthead + stats ─────────────────────────────────

  function renderHeader() {
    const books = Storage.getAllBooks();
    const total = books.length;

    // Masthead date
    const now = new Date();
    const DAYS_KAN = ['日曜', '月曜', '火曜', '水曜', '木曜', '金曜', '土曜'];
    const pad = n => String(n).padStart(2, '0');
    const dateEl = document.getElementById('hdrDate');
    const dayEl  = document.getElementById('hdrDay');
    if (dateEl) dateEl.textContent = `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())}`;
    if (dayEl)  dayEl.textContent  = DAYS_KAN[now.getDay()];

    // Caption
    const caption = document.getElementById('hdrCaption');
    if (caption) caption.textContent = `An archive of ${total} volume${total !== 1 ? 's' : ''}`;

    // Colophon total
    const colVol = document.getElementById('colTotalVol');
    if (colVol) colVol.textContent = total;

    // Stats: volumes
    const figVol = document.getElementById('figVol');
    if (figVol) figVol.textContent = total;

    // Stats: pages
    const totalPages = books.reduce((s, b) => s + (parseInt(b.pages) || 0), 0);
    const figPages = document.getElementById('figPages');
    if (figPages) {
      if (totalPages >= 1000) {
        figPages.innerHTML = `${(totalPages / 1000).toFixed(1)}<small>k</small>`;
      } else {
        figPages.textContent = totalPages || '0';
      }
    }

    // Stats: avg rating
    const rated = books.filter(b => b.rating > 0);
    const avg   = rated.length
      ? (rated.reduce((s, b) => s + b.rating, 0) / rated.length).toFixed(1)
      : '—';
    const figRating = document.getElementById('figRating');
    if (figRating) figRating.textContent = avg;
  }

  // ── Render: status tabs ──────────────────────────────────────

  function renderStatusTabs() {
    const bar = document.getElementById('statusTabBar');
    if (!bar) return;
    const all = Storage.getAllBooks();
    const counts = {
      all:     all.length,
      reading: all.filter(b => b.status === 'reading').length,
      want:    all.filter(b => b.status === 'want').length,
      read:    all.filter(b => !b.status).length,
    };
    const STATUS_ICONS = {
      all:     `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
      want:    `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`,
      reading: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
      read:    `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    };
    const tabs = [
      { key: 'all',     label: '전체',    count: counts.all     },
      { key: 'want',    label: '읽을 책', count: counts.want    },
      { key: 'reading', label: '읽는 중', count: counts.reading },
      { key: 'read',    label: '읽은 책', count: counts.read    },
    ];
    bar.innerHTML = tabs.map(t => {
      const active = currentStatus === t.key;
      const showCount = t.count > 0 && t.key !== 'all';
      return `<button class="status-tab ${active ? 'active' : ''}" data-status="${t.key}"
        style="display:inline-flex;align-items:center;gap:5px;padding:6px 13px;border:none;border-radius:16px;font-size:13px;cursor:pointer;white-space:nowrap;
               background:${active ? 'var(--accent)' : 'rgba(255,184,198,0.15)'};
               color:${active ? '#fff' : 'var(--text-soft)'};
               font-weight:${active ? '700' : '400'};font-family:var(--font-body)">
        ${STATUS_ICONS[t.key]}${t.label}${showCount ? `<span style="font-size:10px;opacity:0.8;margin-left:1px">${t.count}</span>` : ''}
      </button>`;
    }).join('');
    bar.querySelectorAll('[data-status]').forEach(btn => {
      btn.addEventListener('click', () => {
        currentStatus = btn.dataset.status;
        renderStatusTabs();
        renderBooks();
      });
    });
  }

  // ── Render: folders ──────────────────────────────────────────

  function renderFolders() {
    const bar = document.getElementById('folderBar');
    const folders = Storage.getAllFolders();
    const allBooks = Storage.getAllBooks();

    const totalCount = allBooks.length;

    const html = [];
    html.push(chipHTML('', '전체', totalCount, currentFolderId === ''));

    folders.forEach(f => {
      const count = allBooks.filter(b => (b.folders || []).includes(f.id)).length;
      html.push(chipHTML(f.id, f.name, count, currentFolderId === f.id));
    });

    html.push(`<button class="folder-tab folder-tab-add" id="addFolderChip" title="새 폴더">＋ 폴더</button>`);

    bar.innerHTML = html.join('');

    bar.querySelectorAll('[data-folder]').forEach(chip => {
      chip.addEventListener('click', () => {
        currentFolderId = chip.dataset.folder;
        renderFolders();
        renderBooks();
      });
      // Long-press to delete (only for actual folders, not "전체")
      if (chip.dataset.folder) {
        attachLongPress(chip, () => promptDeleteFolder(chip.dataset.folder));
      }
      // Drop target — 책 카드 드롭 시 그 폴더로 이동 ("전체" 제외)
      if (chip.dataset.folder) {
        attachFolderDropTarget(chip);
      }
    });

    document.getElementById('addFolderChip').addEventListener('click', promptAddFolder);
  }

  // 폴더 칩을 drop target으로 만든다. dragover 시 하이라이트, drop 시 책 → 폴더 추가.
  function attachFolderDropTarget(chip) {
    const folderId = chip.dataset.folder;

    chip.addEventListener('dragenter', e => {
      e.preventDefault();
      chip.classList.add('drag-over');
    });
    chip.addEventListener('dragover', e => {
      e.preventDefault();          // drop 허용
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      chip.classList.add('drag-over');
    });
    chip.addEventListener('dragleave', () => {
      chip.classList.remove('drag-over');
    });
    chip.addEventListener('drop', e => {
      e.preventDefault();
      e.stopPropagation();
      chip.classList.remove('drag-over');
      const dt = e.dataTransfer;
      const bookId = (dt && (dt.getData('text/book-id') || dt.getData('text/plain'))) || '';
      if (!bookId) return;
      moveBookToFolder(bookId, folderId);
    });
  }

  function moveBookToFolder(bookId, folderId) {
    const b = Storage.getBook(bookId);
    if (!b) return;
    const folders = new Set(b.folders || []);
    if (folders.has(folderId)) {
      showToast('이미 그 폴더에 있어요');
      return;
    }
    folders.add(folderId);
    Storage.updateBook(bookId, { folders: [...folders] });
    const folderName = (Storage.getFolder(folderId) || {}).name || '';
    showToast(`"${folderName}" 폴더로 이동`);
    renderFolders();
    renderBooks();
  }

  function chipHTML(folderId, name, count, isActive) {
    const safe = escapeHtml(name);
    const countTag = count > 0
      ? `<sup class="num">${count}</sup>`
      : '';
    return `<button class="folder-tab ${isActive ? 'active' : ''}" data-folder="${escapeAttr(folderId)}">${safe}${countTag}</button>`;
  }

  // ── Render: book grid ────────────────────────────────────────

  let librarySearchQuery = '';

  function renderBooks() {
    const grid  = document.getElementById('booksGrid');
    const empty = document.getElementById('emptyState');

    const all = Storage.getAllBooks();
    let books = currentFolderId
      ? Storage.getBooksByFolder(currentFolderId)
      : all;

    // 검색바: 책이 3권 이상일 때만 노출 (1~2권일 땐 굳이 검색 필요 없음)
    const searchBar = document.getElementById('librarySearchBar');
    if (searchBar) searchBar.hidden = all.length < 3;

    if (librarySearchQuery) {
      const norm = s => (s || '').toLowerCase().replace(/\s+/g, '');
      const q = norm(librarySearchQuery);
      books = books.filter(b => {
        return norm(b.title).includes(q) || (b.authors || []).some(a => norm(a).includes(q));
      });
    }

    if (currentStatus !== 'all') {
      if (currentStatus === 'read') {
        books = books.filter(b => !b.status);
      } else {
        books = books.filter(b => b.status === currentStatus);
      }
    }

    books = sortBooks(books, currentSort);

    if (books.length === 0) {
      grid.innerHTML = '';
      empty.classList.remove('hidden');
      // 검색 중인데 결과 없으면 다른 메시지
      if (librarySearchQuery && all.length > 0) {
        const title = document.querySelector('#emptyState .empty-state-title');
        const desc  = document.querySelector('#emptyState .empty-state-desc');
        if (title) title.textContent = `"${librarySearchQuery}" 일치 없음`;
        if (desc)  desc.innerHTML    = '다른 검색어를 시도해보세요.';
      } else {
        tweakEmpty(all.length === 0);
      }
      renderHeader();
      return;
    }

    empty.classList.add('hidden');
    grid.innerHTML = books.map(renderCard).join('');
    grid.classList.toggle('list-view', currentView === 'list');

    const inSelectMode = selectMode;
    grid.classList.toggle('select-mode', inSelectMode);

    grid.querySelectorAll('.book-card').forEach(card => {
      const id = card.dataset.id;

      // 선택 모드일 때 모든 카드에 selectable 클래스, 선택된 책엔 selected
      if (inSelectMode) {
        card.classList.add('selectable');
        if (selectedIds.has(id)) card.classList.add('selected');
      }

      card.addEventListener('click', e => {
        if (selectMode) {
          e.preventDefault();
          toggleSelection(id);
          return;
        }
        e.preventDefault();
        const book = Storage.getBook(id);
        if (!book) return;
        if (window.BookPreview && BookPreview.showList) {
          const allCards = [...document.querySelectorAll('.book-card')];
          const books = allCards.map(c => Storage.getBook(c.dataset.id)).filter(Boolean);
          const idx = books.findIndex(b => b.id === book.id);
          BookPreview.showList(books, Math.max(0, idx), { mode: 'library' });
        } else {
          showBookPreview(book);
        }
      });

      // 드래그는 선택 모드 아닐 때만
      if (!inSelectMode) {
        card.addEventListener('dragstart', e => {
          e.dataTransfer.setData('text/book-id', id);
          e.dataTransfer.setData('text/plain', id);  // 호환용
          e.dataTransfer.effectAllowed = 'move';
          card.classList.add('dragging');
        });
        card.addEventListener('dragend', () => {
          card.classList.remove('dragging');
        });
      } else {
        // 선택 모드에선 native drag 비활성
        card.setAttribute('draggable', 'false');
      }

      // long-press → 선택 모드 진입 + 자동 선택
      attachLongPress(card, () => {
        if (!selectMode) selectMode = true;
        selectedIds.add(id);
        renderBooks();
        renderSelectionBar();
        updateSelectBtn();
      }, 450);
    });

    renderHeader();
    renderSelectionBar();
  }

  function toggleSelection(bookId) {
    if (selectedIds.has(bookId)) selectedIds.delete(bookId);
    else selectedIds.add(bookId);
    // 선택 모드 진입 후 빈 상태도 유지 (헤더 "완료" 버튼으로만 종료)
    const card = document.querySelector(`.book-card[data-id="${cssEscape(bookId)}"]`);
    if (card) card.classList.toggle('selected');
    renderSelectionBar();
  }

  function exitSelectMode() {
    selectMode = false;
    selectedIds.clear();
    renderBooks();
    renderSelectionBar();
    updateSelectBtn();
  }

  function enterSelectMode() {
    selectMode = true;
    renderBooks();
    renderSelectionBar();
    updateSelectBtn();
  }

  function updateSelectBtn() {
    const btn = document.getElementById('selectBtn');
    if (!btn) return;
    btn.textContent = selectMode ? '완료' : '선택';
    btn.classList.toggle('active', selectMode);
  }

  // ── Selection Action Bar ─────────────────────────────────────
  function renderSelectionBar() {
    let bar = document.getElementById('selectionBar');
    // 선택 모드 OFF면 항상 숨김
    if (!selectMode) {
      if (bar) bar.hidden = true;
      return;
    }
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'selectionBar';
      bar.className = 'selection-bar';
      document.body.appendChild(bar);
    }
    const n = selectedIds.size;
    if (n === 0) {
      bar.innerHTML = `
        <span class="selection-bar-count">0</span>권 — 책을 탭해 선택
        <button type="button" class="selection-bar-btn" id="selCancelBtn">완료</button>
      `;
    } else {
      bar.innerHTML = `
        <span class="selection-bar-count">${n}</span>권 선택
        <button type="button" class="selection-bar-btn primary" id="selMoveBtn">＋ 폴더로 이동</button>
        <button type="button" class="selection-bar-btn" id="selCancelBtn">완료</button>
      `;
      document.getElementById('selMoveBtn').addEventListener('click', openBulkFolderSheet);
    }
    bar.hidden = false;
    document.getElementById('selCancelBtn').addEventListener('click', exitSelectMode);
  }

  function openBulkFolderSheet() {
    if (selectedIds.size === 0) return;
    const folders = Storage.getAllFolders();
    if (folders.length === 0) {
      const ok = confirm('폴더가 없어요. 새 폴더를 만들까요?');
      if (ok) promptAddFolder();
      return;
    }
    if (!document.getElementById('folderMoveSheet')) {
      document.body.appendChild(createFolderMoveSheet());
    }
    renderBulkFolderSheet();
  }

  function renderBulkFolderSheet() {
    const sheet = document.getElementById('folderMoveSheet');
    if (!sheet) return;
    document.getElementById('folderSheetTitle').textContent = `${selectedIds.size}권 일괄 이동`;
    const list = document.getElementById('folderSheetList');
    const folders = Storage.getAllFolders();

    list.innerHTML = folders.map(f => `
      <button type="button" class="folder-move-item" data-folder-id="${escapeAttr(f.id)}">
        <span class="folder-move-name">${escapeHtml(f.name)}</span>
        <span class="folder-move-state">→ ${selectedIds.size}권 이동</span>
      </button>
    `).join('');

    list.querySelectorAll('[data-folder-id]').forEach(btn => {
      btn.addEventListener('click', () => bulkMoveTo(btn.dataset.folderId));
    });

    sheet.querySelectorAll('[data-close-folder-sheet]').forEach(el => {
      el.addEventListener('click', closeFolderMoveSheet, { once: true });
    });

    sheet.hidden = false;
    document.body.classList.add('folder-sheet-open');
  }

  function bulkMoveTo(folderId) {
    let n = 0;
    selectedIds.forEach(bookId => {
      const b = Storage.getBook(bookId);
      if (!b) return;
      const set = new Set(b.folders || []);
      if (!set.has(folderId)) {
        set.add(folderId);
        Storage.updateBook(bookId, { folders: [...set] });
        n++;
      }
    });
    const folderName = (Storage.getFolder(folderId) || {}).name || '';
    showToast(n > 0 ? `"${folderName}" 폴더로 ${n}권 이동` : '이미 모두 분류됨');
    closeFolderMoveSheet();
    clearSelection();
  }

  function cssEscape(s) {
    if (window.CSS && CSS.escape) return CSS.escape(s);
    return String(s).replace(/["\\]/g, '\\$&');
  }

  const PALETTE_GLYPHS = ['書', '詩', '夢', '道', '心', '花', '月', '時'];

  function titlePalette(title) {
    let h = 0;
    for (const c of String(title || '')) h = (h * 31 + c.charCodeAt(0)) & 0xffffff;
    return (Math.abs(h) % 8) + 1;
  }

  function renderCard(book) {
    const rating = book.rating || 0;
    const starsHtml = rating > 0
      ? `<div class="book-card-stars"><span>${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}</span></div>`
      : '';
    const palette = titlePalette(book.title);
    const glyph   = PALETTE_GLYPHS[palette - 1];
    const cover = book.thumbnail
      ? `<img class="book-cover" src="${escapeAttr(book.thumbnail)}" alt="" loading="lazy" draggable="false" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`+
        `<div class="book-cover-placeholder" data-palette="${palette}" style="display:none">${glyph}</div>`
      : `<div class="book-cover-placeholder" data-palette="${palette}">${glyph}</div>`;
    const author = (book.authors || []).join(', ') || '저자 미상';

    const statusInfo = STATUS_BADGE[book.status];
    const statusHtml = statusInfo
      ? `<div style="margin-top:5px"><span style="display:inline-flex;align-items:center;gap:3px;background:${statusInfo.bg};color:${statusInfo.fg};padding:2px 7px;border-radius:10px;font-size:10px;font-weight:600">${statusInfo.icon}${statusInfo.label}</span></div>`
      : '';

    // Check if this book is in recommendation database
    let badgesHtml = '';
    if (recommendationData && book.isbn) {
      const isbn = String(book.isbn).replace(/\D/g, '');
      const bookData = recommendationData.books[isbn];
      if (bookData && bookData.lists && bookData.lists.length > 0) {
        const badges = bookData.lists.map(listId => {
          const source = recommendationData.meta.sources.find(s => s.id === listId);
          if (!source) return '';
          return `<span style="background:${source.badge.color};color:#fff;padding:2px 6px;border-radius:2px;font-size:9px;font-weight:600;letter-spacing:0.05em;display:inline-block;margin-right:3px">${escapeHtml(source.badge.text)}</span>`;
        }).filter(Boolean).join('');
        if (badges) {
          badgesHtml = `<div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:3px">${badges}</div>`;
        }
      }
    }

    return `
      <article class="book-card" data-id="${escapeAttr(book.id)}" draggable="true">
        <div class="book-cover-wrap">
          ${cover}
        </div>
        <div class="book-card-info">
          <h3 class="book-card-title">${escapeHtml(book.title)}</h3>
          <p class="book-card-author">${escapeHtml(author)}</p>
          ${statusHtml}
          ${starsHtml}
          ${badgesHtml}
        </div>
      </article>
    `;
  }

  // ── Folder Move Sheet (모바일 / desktop 공용) ────────────────
  /**
   * long-press로 책 카드에 트리거. 폴더 목록 시트로 띄움.
   * 클릭 시 즉시 그 폴더에 추가/제거(toggle).
   */
  function openFolderMoveSheet(bookId) {
    const b = Storage.getBook(bookId);
    if (!b) return;

    const folders = Storage.getAllFolders();
    if (folders.length === 0) {
      const ok = confirm('폴더가 없어요. 새 폴더를 만들까요?');
      if (ok) promptAddFolder();
      return;
    }

    const sheet = document.getElementById('folderMoveSheet');
    if (!sheet) {
      const created = createFolderMoveSheet();
      document.body.appendChild(created);
    }
    renderFolderMoveSheet(b);
  }

  function createFolderMoveSheet() {
    const wrap = document.createElement('div');
    wrap.id = 'folderMoveSheet';
    wrap.className = 'folder-move-sheet';
    wrap.hidden = true;
    wrap.innerHTML = `
      <div class="folder-move-backdrop" data-close-folder-sheet></div>
      <div class="folder-move-card" role="dialog">
        <button type="button" class="folder-move-close" data-close-folder-sheet aria-label="닫기">×</button>
        <p class="folder-move-eyebrow">Move to folder</p>
        <h3 class="folder-move-title" id="folderSheetTitle"></h3>
        <p class="folder-move-hint">탭해서 이 책의 폴더 분류 추가/제외</p>
        <div class="folder-move-list" id="folderSheetList"></div>
      </div>
    `;
    return wrap;
  }

  function renderFolderMoveSheet(book) {
    const sheet = document.getElementById('folderMoveSheet');
    if (!sheet) return;

    document.getElementById('folderSheetTitle').textContent = book.title || '';
    const list = document.getElementById('folderSheetList');
    const folders = Storage.getAllFolders();
    const inFolders = new Set(book.folders || []);

    list.innerHTML = folders.map(f => `
      <button type="button" class="folder-move-item ${inFolders.has(f.id) ? 'active' : ''}" data-folder-id="${escapeAttr(f.id)}">
        <span class="folder-move-name">${escapeHtml(f.name)}</span>
        <span class="folder-move-state">${inFolders.has(f.id) ? '✓ 분류됨' : '＋'}</span>
      </button>
    `).join('');

    list.querySelectorAll('[data-folder-id]').forEach(btn => {
      btn.addEventListener('click', () => toggleFolderForBook(book.id, btn.dataset.folderId));
    });

    sheet.querySelectorAll('[data-close-folder-sheet]').forEach(el => {
      el.addEventListener('click', closeFolderMoveSheet, { once: true });
    });

    sheet.hidden = false;
    document.body.classList.add('folder-sheet-open');

    document.addEventListener('keydown', escCloseSheet);
    function escCloseSheet(e) {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', escCloseSheet);
        closeFolderMoveSheet();
      }
    }
  }

  function toggleFolderForBook(bookId, folderId) {
    const b = Storage.getBook(bookId);
    if (!b) return;
    const set = new Set(b.folders || []);
    const wasIn = set.has(folderId);
    if (wasIn) set.delete(folderId);
    else set.add(folderId);
    Storage.updateBook(bookId, { folders: [...set] });
    const folderName = (Storage.getFolder(folderId) || {}).name || '';
    showToast(wasIn ? `"${folderName}"에서 제외` : `"${folderName}" 폴더로 이동`);
    renderFolders();
    renderBooks();
    // 시트 안 폴더 목록 갱신 (책 정보 새로 가져와서)
    const updated = Storage.getBook(bookId);
    if (updated) renderFolderMoveSheet(updated);
  }

  function closeFolderMoveSheet() {
    const sheet = document.getElementById('folderMoveSheet');
    if (!sheet) return;
    sheet.hidden = true;
    document.body.classList.remove('folder-sheet-open');
  }

  function tweakEmpty(isReallyEmpty) {
    const title = document.querySelector('#emptyState .empty-state-title');
    const desc  = document.querySelector('#emptyState .empty-state-desc');
    const glyph = document.querySelector('#emptyState .empty-state-glyph');
    if (!title || !desc) return;

    if (isReallyEmpty) {
      if (glyph) glyph.textContent = '書';
      title.textContent = '아직 읽은 책이 없어요';
      desc.innerHTML    = '바코드 스캔, ISBN 직접 입력, 또는<br>제목으로 검색해 첫 번째 책을 기록해 보세요.';
    } else {
      const folder = Storage.getFolder(currentFolderId);
      if (glyph) glyph.textContent = '空';
      title.textContent = folder ? `"${folder.name}" 폴더가 비었어요` : '책이 없어요';
      desc.innerHTML    = '책 상세에서 이 폴더로 분류하면<br>여기 모입니다.';
    }
  }

  // ── Folder CRUD via prompts ──────────────────────────────────

  function promptAddFolder() {
    const name = (prompt('새 폴더 이름을 입력하세요') || '').trim();
    if (!name) return;
    const f = Storage.saveFolder({ name });
    showToast(`"${f.name}" 폴더 추가됨`);
    renderFolders();
  }

  function promptDeleteFolder(folderId) {
    const f = Storage.getFolder(folderId);
    if (!f) return;
    const ok = confirm(`"${f.name}" 폴더를 삭제할까요?\n\n폴더 안 책은 삭제되지 않고, 폴더 분류만 해제됩니다.`);
    if (!ok) return;
    Storage.deleteFolder(folderId);
    if (currentFolderId === folderId) currentFolderId = '';
    showToast('폴더 삭제됨');
    renderFolders();
    renderBooks();
  }

  // ── Sort ─────────────────────────────────────────────────────

  function cycleSort() {
    const modes = Object.keys(SORT_LABELS);
    const i = modes.indexOf(currentSort);
    currentSort = modes[(i + 1) % modes.length];
    showToast(`정렬: ${SORT_LABELS[currentSort]}`);
    renderBooks();
  }

  // ── Long-press helper ────────────────────────────────────────

  function attachLongPress(el, callback, delay = 500) {
    let timer = null;
    let fired = false;

    const start = () => {
      fired = false;
      timer = setTimeout(() => {
        fired = true;
        callback();
      }, delay);
    };
    const cancel = () => {
      if (timer) { clearTimeout(timer); timer = null; }
    };

    el.addEventListener('mousedown',  start);
    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('mouseup',    cancel);
    el.addEventListener('mouseleave', cancel);
    el.addEventListener('mousemove',  cancel);   // 드래그 시작 시 long-press 취소
    el.addEventListener('dragstart',  cancel);
    el.addEventListener('touchend',   cancel);
    el.addEventListener('touchmove',  cancel);

    el.addEventListener('click', (e) => {
      if (fired) {
        e.stopPropagation();
        e.preventDefault();
      }
    }, true);
  }

  // ── Toast ────────────────────────────────────────────────────

  function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  // ── Book Preview Modal (delegated to BookPreview module) ─────

  function showBookPreview(book) {
    if (!window.BookPreview) {
      console.error('[index] BookPreview 모듈 미로드');
      return;
    }
    BookPreview.show(book, { mode: 'library' });
  }

  // ── Utils ────────────────────────────────────────────────────

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = String(s ?? '');
    return d.innerHTML;
  }
  function escapeAttr(s) {
    return String(s ?? '').replace(/"/g, '&quot;');
  }
  function sanitizeDescription(html) {
    if (!html) return '';
    // HTML 태그를 임시 div에 넣고 textContent로 순수 텍스트만 추출
    const temp = document.createElement('div');
    temp.innerHTML = html;
    let text = temp.textContent || temp.innerText || '';
    // 연속된 공백과 줄바꿈 정리
    text = text.replace(/\s+/g, ' ').trim();
    return escapeHtml(text);
  }

  // ── Boot ─────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', () => {
    renderStatusTabs();
    renderFolders();
    renderBooks();
    const sortBtn = document.getElementById('sortBtn');
    if (sortBtn) sortBtn.addEventListener('click', cycleSort);
    const selectBtnEl = document.getElementById('selectBtn');
    if (selectBtnEl) selectBtnEl.addEventListener('click', () => {
      if (selectMode) exitSelectMode();
      else enterSelectMode();
    });

    const libSearch = document.getElementById('librarySearch');
    if (libSearch) {
      let timer = null;
      libSearch.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          librarySearchQuery = libSearch.value.trim();
          renderBooks();
        }, 150);
      });
    }

    const viewBtn = document.getElementById('viewToggleBtn');
    if (viewBtn) {
      viewBtn.querySelector('.icon-list').style.display = currentView === 'list' ? 'none' : '';
      viewBtn.querySelector('.icon-grid').style.display = currentView === 'list' ? '' : 'none';
      viewBtn.addEventListener('click', () => {
        currentView = currentView === 'grid' ? 'list' : 'grid';
        localStorage.setItem('libraryView', currentView);
        viewBtn.querySelector('.icon-list').style.display = currentView === 'list' ? 'none' : '';
        viewBtn.querySelector('.icon-grid').style.display = currentView === 'list' ? '' : 'none';
        renderBooks();
      });
    }

    if (window.LibraryAPI) LibraryAPI.prefetchPosition();
  });
})();
