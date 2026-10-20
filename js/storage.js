/**
 * 書架 — Storage Layer
 *
 * Wraps localStorage in a Storage object exposed on window.Storage.
 * Designed for easy swap to Supabase later — all functions are async-ready
 * (synchronous now, but the API shape returns promises so callers don't change).
 *
 * Schemas
 * ───────
 * Book {
 *   id          string   uuid
 *   isbn        string
 *   title       string
 *   authors     string[]
 *   publisher   string
 *   thumbnail   string   image URL
 *   contents    string   description
 *   category    string   카카오 category_name (e.g. "어린이 > 초등 3-4학년")
 *   language    'ko'|'en'|'other'
 *   rating      0..5
 *   review      string   한줄평
 *   readDate    string   YYYY-MM-DD
 *   vocab       [{ word, meaning }]
 *   folders     string[] folder IDs
 *   ar          number|null  AR 지수 (영어책)
 *   lexile      string|null
 *   createdAt   string   ISO
 *   updatedAt   string   ISO
 * }
 *
 * Folder {
 *   id        string  uuid
 *   name      string
 *   emoji     string|null
 *   color     string|null
 *   order     number
 *   createdAt string
 * }
 */

(function () {
  'use strict';

  const KEYS = {
    BOOKS:   'bookTracker.books.v1',
    FOLDERS: 'bookTracker.folders.v1',
  };

  const SCOPE_PREFIX = 'bookTracker.localScope.v1.';
  const SCOPE_KEYS = [
    KEYS.BOOKS, KEYS.FOLDERS,
    'profileName', 'profileAvatar', 'profileCity', 'profileDistrict',
    'profileLibraryPublic', 'profilePrivacy', 'monthlyGoal',
    'bookTracker.garden.v1', 'bookTracker.garden.watered.v1', 'bookTracker.garden.trees.v1',
  ];
  const ACTIVE_OWNER_KEY = SCOPE_PREFIX + 'active-owner';

  function readActiveOwner() {
    const value = localStorage.getItem(ACTIVE_OWNER_KEY);
    if (value === 'guest' || value == null) return null;
    if (value.indexOf('user.') === 0) {
      try { return decodeURIComponent(value.slice(5)); }
      catch (e) { return null; }
    }
    return null;
  }

  function writeActiveOwner(ownerId) {
    localStorage.setItem(ACTIVE_OWNER_KEY, ownerId == null ? 'guest' : 'user.' + encodeURIComponent(String(ownerId)));
  }

  function isOwnerCurrent() {
    return readActiveOwner() === activeOwnerId;
  }

  let reloadScheduled = false;
  function scheduleScopeReload() {
    if (reloadScheduled) return;
    reloadScheduled = true;
    if (window.location && typeof window.location.reload === 'function') window.location.reload();
  }

  function ownerIsCurrent() {
    if (isOwnerCurrent()) return true;
    scheduleScopeReload();
    return false;
  }

  if (typeof window.addEventListener === 'function') {
    window.addEventListener('storage', function(event) {
      if ((!event.key || event.key === ACTIVE_OWNER_KEY) && !isOwnerCurrent()) scheduleScopeReload();
    });
  }

  // The base keys persist as the active owner's view across page reloads.
  let activeOwnerId = readActiveOwner();

  function scopeName(ownerId) {
    return ownerId == null ? 'guest' : 'user.' + encodeURIComponent(String(ownerId));
  }

  function scopeDataKey(key, ownerId) {
    return SCOPE_PREFIX + scopeName(ownerId) + '.' + key;
  }

  function scopeMarkerKey(ownerId) {
    return SCOPE_PREFIX + scopeName(ownerId) + '.ready';
  }

  function readScopedJSON(key, fallback, ownerId) {
    const scope = arguments.length >= 3 ? ownerId : activeOwnerId;
    const raw = scope === activeOwnerId ? localStorage.getItem(key) : localStorage.getItem(scopeDataKey(key, scope));
    if (!raw) return fallback;
    try { return JSON.parse(raw) ?? fallback; }
    catch (e) { console.warn('[Storage] scoped parse error for', key, e); return fallback; }
  }

  function hasScope(ownerId) {
    const scope = arguments.length ? ownerId : activeOwnerId;
    if (localStorage.getItem(scopeMarkerKey(scope)) === '1') return true;
    if (scope === activeOwnerId) return SCOPE_KEYS.some(key => localStorage.getItem(key) != null);
    return SCOPE_KEYS.some(key => localStorage.getItem(scopeDataKey(key, scope)) != null);
  }

  // The base keys are an active view buffer for legacy callers. Each switch first
  // snapshots that buffer, then restores only the selected guest/account scope.
  function setOwner(ownerId) {
    const nextOwnerId = ownerId == null ? null : String(ownerId);
    const persistedOwnerId = readActiveOwner();
    const externalSwitch = persistedOwnerId !== activeOwnerId;
    if (externalSwitch) activeOwnerId = persistedOwnerId;
    if (nextOwnerId === activeOwnerId) return externalSwitch;

    const previousOwnerId = activeOwnerId;
    let previousSnapshotComplete = false;
    try {
      SCOPE_KEYS.forEach(key => {
        const value = localStorage.getItem(key);
        if (value == null) localStorage.removeItem(scopeDataKey(key, previousOwnerId));
        else localStorage.setItem(scopeDataKey(key, previousOwnerId), value);
      });
      localStorage.setItem(scopeMarkerKey(previousOwnerId), '1');
      previousSnapshotComplete = true;

      SCOPE_KEYS.forEach(key => localStorage.removeItem(key));
      activeOwnerId = nextOwnerId;
      SCOPE_KEYS.forEach(key => {
        const value = localStorage.getItem(scopeDataKey(key, nextOwnerId));
        if (value != null) localStorage.setItem(key, value);
      });
      localStorage.setItem(scopeMarkerKey(nextOwnerId), '1');
      writeActiveOwner(nextOwnerId);
      return true;
    } catch (e) {
      // Recover the previous active view if a storage write fails mid-switch.
      if (previousSnapshotComplete) {
        SCOPE_KEYS.forEach(key => localStorage.removeItem(key));
        activeOwnerId = previousOwnerId;
        SCOPE_KEYS.forEach(key => {
          const value = localStorage.getItem(scopeDataKey(key, previousOwnerId));
          if (value != null) localStorage.setItem(key, value);
        });
      }
      try { writeActiveOwner(previousOwnerId); } catch (ignored) {}
      throw e;
    }
  }

  function clearCurrentScope() {
    if (!ownerIsCurrent()) return false;
    SCOPE_KEYS.forEach(key => localStorage.removeItem(key));
    SCOPE_KEYS.forEach(key => localStorage.removeItem(scopeDataKey(key, activeOwnerId)));
    localStorage.setItem(scopeMarkerKey(activeOwnerId), '1');
    return true;
  }

  // ── Internal helpers ──────────────────────────────────────────

  function uid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
  }

  function nowIso() { return new Date().toISOString(); }

  function readJSON(key, fallback) {
    if (!ownerIsCurrent()) return fallback;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed ?? fallback;
    } catch (e) {
      console.warn('[Storage] parse error for', key, e);
      return fallback;
    }
  }

  function writeJSON(key, value) {
    if (!ownerIsCurrent()) return false;
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('[Storage] write error for', key, e);
      return false;
    }
  }

  // ── Books ────────────────────────────────────────────────────

  function getAllBooksRaw() {
    // 동기화 레이어 전용 — soft-deleted 포함 전체 리턴
    if (!ownerIsCurrent()) return [];
    const ownerId = arguments.length ? arguments[0] : activeOwnerId;
    if (ownerId === activeOwnerId) return readJSON(KEYS.BOOKS, []);
    return readScopedJSON(KEYS.BOOKS, [], ownerId);
  }

  function getAllBooks(ownerId) {
    // 일반 호출자용 — soft-deleted 제외
    return (arguments.length ? getAllBooksRaw(ownerId) : getAllBooksRaw()).filter(b => !b.deletedAt);
  }

  function getBook(id) {
    return getAllBooks().find(b => b.id === id) || null;
  }

  function getBookByIsbn(isbn) {
    if (!isbn) return null;
    const norm = String(isbn).replace(/\D/g, '');
    return getAllBooks().find(b => String(b.isbn).replace(/\D/g, '') === norm) || null;
  }

  function saveBook(book) {
    if (!ownerIsCurrent()) return null;
    // soft-deleted 항목과 동일한 id가 들어오면 그 행을 in-place로 부활시켜야
    // 중복 row가 생기지 않으므로 getAllBooksRaw 위에서 동작한다.
    const books = getAllBooksRaw();
    const now = nowIso();

    if (book.id) {
      const idx = books.findIndex(b => b.id === book.id);
      if (idx === -1) {
        const fresh = normalizeBook({ ...book, createdAt: now, updatedAt: now });
        books.push(fresh);
        writeJSON(KEYS.BOOKS, books);
        if (window.Sync) window.Sync.pushBook(fresh);
        return fresh;
      }
      // 부활: deletedAt 명시적으로 null로 클리어 (caller가 안 보내도)
      const updated = normalizeBook({
        ...books[idx],
        ...book,
        deletedAt: book.deletedAt !== undefined ? book.deletedAt : null,
        updatedAt: now,
      });
      books[idx] = updated;
      writeJSON(KEYS.BOOKS, books);
      if (window.Sync) window.Sync.pushBook(updated);
      return updated;
    }

    const fresh = normalizeBook({
      ...book,
      id: uid(),
      createdAt: now,
      updatedAt: now,
    });
    books.push(fresh);
    writeJSON(KEYS.BOOKS, books);
    if (window.Sync) window.Sync.pushBook(fresh);
    return fresh;
  }

  function updateBook(id, partial) {
    const book = getBook(id);
    if (!book) return null;
    return saveBook({ ...book, ...partial, id });
  }

  function deleteBook(id) {
    if (!ownerIsCurrent()) return false;
    // soft-delete: deletedAt만 표시. 동기화가 켜진 상태에서 다른 디바이스도
    // 이 시점 이후 같이 지움. 30일 지난 항목은 별도로 청소.
    const books = getAllBooksRaw();
    const idx = books.findIndex(b => b.id === id);
    if (idx === -1) return false;
    const now = nowIso();
    books[idx] = normalizeBook({ ...books[idx], deletedAt: now, updatedAt: now });
    writeJSON(KEYS.BOOKS, books);
    if (window.Sync) window.Sync.pushBook(books[idx]);
    return true;
  }

  function purgeOldDeletedBooks(maxAgeDays) {
    if (!ownerIsCurrent()) return 0;
    // 30일 이상 지난 soft-deleted 항목 영구 삭제
    const cutoff = Date.now() - (maxAgeDays || 30) * 86400000;
    const books = getAllBooksRaw();
    const next = books.filter(b => !b.deletedAt || Date.parse(b.deletedAt) >= cutoff);
    if (next.length !== books.length) writeJSON(KEYS.BOOKS, next);
    return books.length - next.length;
  }

  function getBooksByFolder(folderId) {
    if (!folderId) return getAllBooks();
    return getAllBooks().filter(b => Array.isArray(b.folders) && b.folders.includes(folderId));
  }

  function searchBooks(query) {
    if (!query) return getAllBooks();
    const q = query.toLowerCase().trim();
    return getAllBooks().filter(b => {
      const inTitle  = (b.title || '').toLowerCase().includes(q);
      const inAuthor = (b.authors || []).some(a => a.toLowerCase().includes(q));
      const inPub    = (b.publisher || '').toLowerCase().includes(q);
      return inTitle || inAuthor || inPub;
    });
  }

  function normalizeBook(b) {
    return {
      id:        b.id,
      isbn:      String(b.isbn || ''),
      title:     b.title || '',
      authors:   Array.isArray(b.authors) ? b.authors : (b.authors ? [b.authors] : []),
      publisher: b.publisher || '',
      thumbnail: b.thumbnail || '',
      contents:  b.contents || '',
      category:  b.category || '',
      language:  b.language || 'ko',
      rating:    Math.max(0, Math.min(5, Number(b.rating) || 0)),
      review:    b.review || '',
      readDate:  b.readDate || '',
      vocab:     Array.isArray(b.vocab) ? b.vocab : [],
      folders:   Array.isArray(b.folders) ? b.folders : [],
      ar:        b.ar != null ? Number(b.ar) : null,
      lexile:    b.lexile || null,
      status:    ['want', 'reading'].includes(b.status) ? b.status : null,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
      deletedAt: b.deletedAt || null,
    };
  }

  // ── Folders ──────────────────────────────────────────────────

  function getAllFoldersRaw() {
    if (!ownerIsCurrent()) return [];
    const ownerId = arguments.length ? arguments[0] : activeOwnerId;
    if (ownerId === activeOwnerId) return readJSON(KEYS.FOLDERS, []);
    return readScopedJSON(KEYS.FOLDERS, [], ownerId);
  }

  function getAllFolders(ownerId) {
    const raw = arguments.length ? getAllFoldersRaw(ownerId) : getAllFoldersRaw();
    const folders = raw.filter(f => !f.deletedAt);
    return folders.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  function getFolder(id) {
    return getAllFolders().find(f => f.id === id) || null;
  }

  function saveFolder(folder) {
    if (!ownerIsCurrent()) return null;
    const folders = getAllFoldersRaw();
    const now = nowIso();

    if (folder.id) {
      const idx = folders.findIndex(f => f.id === folder.id);
      if (idx !== -1) {
        const updated = { ...folders[idx], ...folder, updatedAt: now };
        folders[idx] = updated;
        writeJSON(KEYS.FOLDERS, folders);
        if (window.Sync) window.Sync.pushFolder(updated);
        return updated;
      }
    }

    const visibleCount = folders.filter(f => !f.deletedAt).length;
    const fresh = {
      id: uid(),
      name: folder.name || '새 폴더',
      emoji: folder.emoji || null,
      color: folder.color || null,
      order: folder.order != null ? folder.order : visibleCount,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    folders.push(fresh);
    writeJSON(KEYS.FOLDERS, folders);
    if (window.Sync) window.Sync.pushFolder(fresh);
    return fresh;
  }

  function deleteFolder(id) {
    if (!ownerIsCurrent()) return false;
    const folders = getAllFoldersRaw();
    const idx = folders.findIndex(f => f.id === id && !f.deletedAt);
    if (idx === -1) return false;
    const now = nowIso();

    // Books FIRST: 책에서 폴더 참조 제거하고 updatedAt 갱신해 동기화 신호 보냄.
    const books = getAllBooksRaw();
    let touched = false;
    const nextBooks = books.map(b => {
      if (Array.isArray(b.folders) && b.folders.includes(id)) {
        touched = true;
        return normalizeBook({ ...b, folders: b.folders.filter(fid => fid !== id), updatedAt: now });
      }
      return b;
    });
    if (touched) writeJSON(KEYS.BOOKS, nextBooks);

    const deletedFolder = { ...folders[idx], deletedAt: now, updatedAt: now };
    folders[idx] = deletedFolder;
    writeJSON(KEYS.FOLDERS, folders);
    if (window.Sync) {
      window.Sync.pushFolder(deletedFolder);
      if (touched) nextBooks.forEach(function(b) { if (b.updatedAt === now) window.Sync.pushBook(b); });
    }
    return true;
  }

  function purgeOldDeletedFolders(maxAgeDays) {
    if (!ownerIsCurrent()) return 0;
    const cutoff = Date.now() - (maxAgeDays || 30) * 86400000;
    const folders = getAllFoldersRaw();
    const next = folders.filter(f => !f.deletedAt || Date.parse(f.deletedAt) >= cutoff);
    if (next.length !== folders.length) writeJSON(KEYS.FOLDERS, next);
    return folders.length - next.length;
  }

  function reorderFolders(orderedIds) {
    if (!ownerIsCurrent()) return [];
    const folders = getAllFolders();
    const map = new Map(folders.map(f => [f.id, f]));
    const next = orderedIds
      .map((id, i) => map.get(id) ? { ...map.get(id), order: i } : null)
      .filter(Boolean);
    writeJSON(KEYS.FOLDERS, next);
    return next;
  }

  // ── Stats ────────────────────────────────────────────────────

  function getStats() {
    const books = getAllBooks();
    const folders = getAllFolders();
    const now = new Date();
    const thisYear  = now.getFullYear();
    const thisMonth = now.getMonth();

    const total = books.length;
    const thisMonthBooks = books.filter(b => {
      if (!b.readDate) return false;
      const d = new Date(b.readDate);
      return d.getFullYear() === thisYear && d.getMonth() === thisMonth;
    }).length;

    const ratings = books.map(b => b.rating).filter(r => r > 0);
    const avgRating = ratings.length
      ? (ratings.reduce((s, r) => s + r, 0) / ratings.length).toFixed(1)
      : null;

    const totalVocab = books.reduce((s, b) => s + (b.vocab?.length || 0), 0);

    // Books per month — last 6 months
    const byMonth = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(thisYear, thisMonth - i, 1);
      const y = d.getFullYear(), m = d.getMonth();
      const count = books.filter(b => {
        if (!b.readDate) return false;
        const bd = new Date(b.readDate);
        return bd.getFullYear() === y && bd.getMonth() === m;
      }).length;
      byMonth.push({
        label: `${m + 1}월`,
        ym: `${y}-${String(m + 1).padStart(2, '0')}`,
        count,
      });
    }

    // Books per folder
    const byFolder = folders.map(f => ({
      id: f.id,
      name: f.name,
      count: books.filter(b => (b.folders || []).includes(f.id)).length,
    }));

    // Untagged
    const untagged = books.filter(b => !b.folders || b.folders.length === 0).length;
    if (untagged > 0) byFolder.push({ id: '__untagged', name: '미분류', count: untagged });

    return { total, thisMonthBooks, avgRating, totalVocab, byMonth, byFolder };
  }

  // ── Import / Export ──────────────────────────────────────────

  function exportData() {
    return JSON.stringify({
      version: 1,
      exportedAt: nowIso(),
      books:   getAllBooks(),
      folders: getAllFolders(),
    }, null, 2);
  }

  function importData(jsonString, opts = { merge: false }) {
    if (!ownerIsCurrent()) return false;
    try {
      const data = JSON.parse(jsonString);
      if (!data || typeof data !== 'object') return false;
      const incomingBooks   = Array.isArray(data.books)   ? data.books   : [];
      const incomingFolders = Array.isArray(data.folders) ? data.folders : [];

      if (opts.merge) {
        const existingBooks = getAllBooks();
        const byId = new Map(existingBooks.map(b => [b.id, b]));
        incomingBooks.forEach(b => byId.set(b.id, normalizeBook(b)));
        writeJSON(KEYS.BOOKS, [...byId.values()]);

        const existingFolders = getAllFolders();
        const fById = new Map(existingFolders.map(f => [f.id, f]));
        incomingFolders.forEach(f => fById.set(f.id, f));
        writeJSON(KEYS.FOLDERS, [...fById.values()]);
      } else {
        writeJSON(KEYS.BOOKS,   incomingBooks.map(normalizeBook));
        writeJSON(KEYS.FOLDERS, incomingFolders);
      }
      return true;
    } catch (e) {
      console.error('[Storage] importData failed', e);
      return false;
    }
  }

  function clearAll() {
    if (!ownerIsCurrent()) return false;
    localStorage.removeItem(KEYS.BOOKS);
    localStorage.removeItem(KEYS.FOLDERS);
    localStorage.removeItem(scopeDataKey(KEYS.BOOKS, activeOwnerId));
    localStorage.removeItem(scopeDataKey(KEYS.FOLDERS, activeOwnerId));
  }

  // ── Demo seeding (for testing) ───────────────────────────────

  function seedDemo() {
    clearAll();
    const f1 = saveFolder({ name: '1학년 추천', emoji: '📕' });
    const f2 = saveFolder({ name: '영어책',   emoji: '📘' });
    const f3 = saveFolder({ name: '엄마책',   emoji: '📗' });

    saveBook({
      isbn: '9788936434120',
      title: '나의 라임오렌지나무',
      authors: ['J.M. 바스콘셀로스'],
      publisher: '동녘',
      thumbnail: '',
      category: '어린이 > 초등 5-6학년',
      language: 'ko',
      rating: 5,
      review: '제제의 마음이 너무 안쓰러워서 한참을 울었다.',
      readDate: '2026-04-12',
      folders: [f1.id],
      vocab: [],
    });

    saveBook({
      isbn: '9780545010221',
      title: 'Charlotte\'s Web',
      authors: ['E.B. White'],
      publisher: 'Scholastic',
      thumbnail: '',
      category: 'Children > Ages 8-12',
      language: 'en',
      rating: 4,
      review: 'Some pig.',
      readDate: '2026-03-20',
      folders: [f2.id],
      ar: 4.4,
      lexile: '680L',
      vocab: [
        { word: 'humble', meaning: '겸손한' },
        { word: 'radiant', meaning: '빛나는, 환한' },
      ],
    });

    saveBook({
      isbn: '9788937473135',
      title: '데미안',
      authors: ['헤르만 헤세'],
      publisher: '민음사',
      thumbnail: '',
      category: '소설',
      language: 'ko',
      rating: 5,
      review: '새는 알에서 나오려고 투쟁한다.',
      readDate: '2026-04-25',
      folders: [f3.id],
      vocab: [],
    });

    return { books: getAllBooks().length, folders: getAllFolders().length };
  }

  // ── Public API ───────────────────────────────────────────────

  window.Storage = {
    // books
    getAllBooks,
    getAllBooksRaw,
    getBook,
    getBookByIsbn,
    saveBook,
    updateBook,
    deleteBook,
    purgeOldDeletedBooks,
    getBooksByFolder,
    getBooksByStatus(status) {
      if (status === null) return getAllBooks().filter(b => !b.status);
      return getAllBooks().filter(b => b.status === status);
    },
    searchBooks,
    // folders
    getAllFolders,
    getAllFoldersRaw,
    getFolder,
    saveFolder,
    deleteFolder,
    purgeOldDeletedFolders,
    reorderFolders,
    // stats
    getStats,
    // utils
    exportData,
    importData,
    clearAll,
    clearCurrentScope,
    getOwner() { return activeOwnerId; },
    isOwnerCurrent,
    setOwner,
    hasScope,
    seedDemo,
    normalizeBook,
    // constants
    _KEYS: KEYS,
  };
})();
