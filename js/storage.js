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

  // ── Internal helpers ──────────────────────────────────────────

  function uid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
  }

  function nowIso() { return new Date().toISOString(); }

  function readJSON(key, fallback) {
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
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('[Storage] write error for', key, e);
      return false;
    }
  }

  // ── Books ────────────────────────────────────────────────────

  function getAllBooks() {
    return readJSON(KEYS.BOOKS, []);
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
    const books = getAllBooks();
    const now = nowIso();

    if (book.id) {
      const idx = books.findIndex(b => b.id === book.id);
      if (idx === -1) {
        // id supplied but not found → treat as new
        const fresh = normalizeBook({ ...book, createdAt: now, updatedAt: now });
        books.push(fresh);
        writeJSON(KEYS.BOOKS, books);
        return fresh;
      }
      const updated = normalizeBook({ ...books[idx], ...book, updatedAt: now });
      books[idx] = updated;
      writeJSON(KEYS.BOOKS, books);
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
    return fresh;
  }

  function updateBook(id, partial) {
    const book = getBook(id);
    if (!book) return null;
    return saveBook({ ...book, ...partial, id });
  }

  function deleteBook(id) {
    const books = getAllBooks();
    const next = books.filter(b => b.id !== id);
    if (next.length === books.length) return false;
    writeJSON(KEYS.BOOKS, next);
    return true;
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
    };
  }

  // ── Folders ──────────────────────────────────────────────────

  function getAllFolders() {
    const folders = readJSON(KEYS.FOLDERS, []);
    return [...folders].sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  function getFolder(id) {
    return getAllFolders().find(f => f.id === id) || null;
  }

  function saveFolder(folder) {
    const folders = getAllFolders();
    const now = nowIso();

    if (folder.id) {
      const idx = folders.findIndex(f => f.id === folder.id);
      if (idx !== -1) {
        const updated = { ...folders[idx], ...folder };
        folders[idx] = updated;
        writeJSON(KEYS.FOLDERS, folders);
        return updated;
      }
    }

    const fresh = {
      id: uid(),
      name: folder.name || '새 폴더',
      emoji: folder.emoji || null,
      color: folder.color || null,
      order: folder.order != null ? folder.order : folders.length,
      createdAt: now,
    };
    folders.push(fresh);
    writeJSON(KEYS.FOLDERS, folders);
    return fresh;
  }

  function deleteFolder(id) {
    const folders = getAllFolders();
    const nextFolders = folders.filter(f => f.id !== id);
    if (nextFolders.length === folders.length) return false;

    // Update books FIRST so they never reference a folder that no longer exists.
    // If books write fails, folders is untouched and state stays consistent.
    const books = getAllBooks();
    let touched = false;
    const nextBooks = books.map(b => {
      if (Array.isArray(b.folders) && b.folders.includes(id)) {
        touched = true;
        return { ...b, folders: b.folders.filter(fid => fid !== id) };
      }
      return b;
    });
    if (touched) writeJSON(KEYS.BOOKS, nextBooks);
    writeJSON(KEYS.FOLDERS, nextFolders);
    return true;
  }

  function reorderFolders(orderedIds) {
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
    localStorage.removeItem(KEYS.BOOKS);
    localStorage.removeItem(KEYS.FOLDERS);
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
    getBook,
    getBookByIsbn,
    saveBook,
    updateBook,
    deleteBook,
    getBooksByFolder,
    getBooksByStatus(status) {
      if (status === null) return getAllBooks().filter(b => !b.status);
      return getAllBooks().filter(b => b.status === status);
    },
    searchBooks,
    // folders
    getAllFolders,
    getFolder,
    saveFolder,
    deleteFolder,
    reorderFolders,
    // stats
    getStats,
    // utils
    exportData,
    importData,
    clearAll,
    seedDemo,
    // constants
    _KEYS: KEYS,
  };
})();
