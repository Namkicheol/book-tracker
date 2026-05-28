/**
 * sync.js — localStorage ↔ Supabase 동기화 레이어
 *
 * 의존: js/supabase.js (window.SB), js/storage.js (window.Storage)
 *
 * window.Sync 노출:
 *   syncProfileOnSignIn()     프로필 1회 동기화 (첫 로그인)
 *   pushBook(book)            책 1권 Supabase upsert (실패 시 outbox 보관)
 *   pushFolder(folder)        폴더 1개 Supabase upsert
 *   uploadAll()               localStorage 전체 → Supabase (첫 로그인 동의 후)
 *   pullBooks()               Supabase → localStorage 병합 (LWW by updated_at)
 *   pullFolders()             Supabase → localStorage 병합
 *   flushOutbox()             오프라인 보관 항목 재시도
 */
(function () {
  'use strict';

  // ── 프로필 동기화 (기존 로직 유지) ───────────────────────────

  function readLocalProfile() {
    return {
      nickname:     localStorage.getItem('profileName')   || '책읽는엄마',
      avatar:       localStorage.getItem('profileAvatar') || '👩',
      grade:        localStorage.getItem('profileGrade')  || '초5',
      region:       localStorage.getItem('profileRegion') || '강남구',
      monthly_goal: parseInt(localStorage.getItem('monthlyGoal') || '20', 10) || 20
    };
  }

  function writeLocalProfile(row) {
    if (!row) return;
    if (row.nickname)     localStorage.setItem('profileName',   row.nickname);
    if (row.avatar)       localStorage.setItem('profileAvatar', row.avatar);
    if (row.grade)        localStorage.setItem('profileGrade',  row.grade);
    if (row.region)       localStorage.setItem('profileRegion', row.region);
    if (row.monthly_goal != null) localStorage.setItem('monthlyGoal', String(row.monthly_goal));
  }

  function extractProviderNickname(user) {
    if (!user) return '';
    var meta = user.user_metadata || {};
    return meta.name || meta.full_name || meta.nickname || meta.preferred_username || '';
  }

  function isDefaultNickname(name) {
    return !name || name === '책읽는엄마';
  }

  async function syncProfileOnSignIn() {
    if (!window.SB || !window.SB.enabled) return null;
    var existing = await window.SB.getProfile();
    if (existing) {
      writeLocalProfile(existing);
      return existing;
    }
    var user = await window.SB.getUser();
    var providerNick = extractProviderNickname(user);
    var local = readLocalProfile();
    if (providerNick && isDefaultNickname(local.nickname)) {
      local.nickname = providerNick;
    }
    var saved = await window.SB.upsertProfile(local);
    if (saved) writeLocalProfile(saved);
    return saved || null;
  }

  // ── camelCase ↔ snake_case 변환 ──────────────────────────────

  function bookToRow(book, userId) {
    return {
      id:         book.id,
      user_id:    userId,
      isbn:       book.isbn       || null,
      title:      book.title      || '',
      authors:    Array.isArray(book.authors) ? book.authors : [],
      publisher:  book.publisher  || null,
      thumbnail:  book.thumbnail  || null,
      contents:   book.contents   || null,
      category:   book.category   || null,
      language:   book.language   || 'ko',
      rating:     (book.rating != null && book.rating > 0) ? book.rating : null,
      review:     book.review     || null,
      read_date:  book.readDate   || null,
      vocab:      Array.isArray(book.vocab) ? book.vocab : [],
      folders:    Array.isArray(book.folders) ? book.folders : [],
      ar:         book.ar   != null ? book.ar   : null,
      lexile:     book.lexile != null ? book.lexile : null,
      status:     book.status     || null,
      created_at: book.createdAt,
      updated_at: book.updatedAt,
      deleted_at: book.deletedAt  || null,
    };
  }

  function rowToBook(row) {
    return {
      id:        row.id,
      isbn:      row.isbn       || '',
      title:     row.title      || '',
      authors:   row.authors    || [],
      publisher: row.publisher  || '',
      thumbnail: row.thumbnail  || '',
      contents:  row.contents   || '',
      category:  row.category   || '',
      language:  row.language   || 'ko',
      rating:    row.rating     != null ? row.rating : 0,
      review:    row.review     || '',
      readDate:  row.read_date  || '',
      vocab:     row.vocab      || [],
      folders:   row.folders    || [],
      ar:        row.ar         != null ? row.ar    : null,
      lexile:    row.lexile     || null,
      status:    row.status     || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at || null,
    };
  }

  function folderToRow(folder, userId) {
    return {
      id:         folder.id,
      user_id:    userId,
      name:       folder.name   || '새 폴더',
      emoji:      folder.emoji  || null,
      color:      folder.color  || null,
      ord:        folder.order  != null ? folder.order : 0,
      created_at: folder.createdAt,
      updated_at: folder.updatedAt,
      deleted_at: folder.deletedAt || null,
    };
  }

  function rowToFolder(row) {
    return {
      id:        row.id,
      name:      row.name   || '새 폴더',
      emoji:     row.emoji  || null,
      color:     row.color  || null,
      order:     row.ord    != null ? row.ord : 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at || null,
    };
  }

  // ── Outbox: 오프라인 시 실패한 push 저장 ─────────────────────

  var OUTBOX_KEY = 'sync.outbox.v1';

  function outboxAdd(type, data) {
    try {
      var q = JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]');
      // 같은 id면 교체 (중복 방지)
      var next = q.filter(function(e) { return !(e.type === type && e.data.id === data.id); });
      next.push({ type: type, data: data, ts: Date.now() });
      localStorage.setItem(OUTBOX_KEY, JSON.stringify(next));
    } catch (e) { /* ignore */ }
  }

  function outboxRemove(type, id) {
    try {
      var q = JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]');
      var next = q.filter(function(e) { return !(e.type === type && e.data.id === id); });
      localStorage.setItem(OUTBOX_KEY, JSON.stringify(next));
    } catch (e) { /* ignore */ }
  }

  function outboxAll() {
    try { return JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]'); }
    catch (e) { return []; }
  }

  // ── 단건 push ────────────────────────────────────────────────

  async function pushBook(book) {
    if (!window.SB || !window.SB.enabled) return;
    var user = await window.SB.getUser();
    if (!user) return;
    var row = bookToRow(book, user.id);
    var r = await window.SB.client.from('books').upsert(row, { onConflict: 'id' });
    if (r.error) {
      console.warn('[Sync] pushBook 오류 — outbox 저장:', r.error.message);
      outboxAdd('book', book);
    } else {
      outboxRemove('book', book.id);
    }
  }

  async function pushFolder(folder) {
    if (!window.SB || !window.SB.enabled) return;
    var user = await window.SB.getUser();
    if (!user) return;
    var row = folderToRow(folder, user.id);
    var r = await window.SB.client.from('folders').upsert(row, { onConflict: 'id' });
    if (r.error) {
      console.warn('[Sync] pushFolder 오류 — outbox 저장:', r.error.message);
      outboxAdd('folder', folder);
    } else {
      outboxRemove('folder', folder.id);
    }
  }

  // ── 전체 업로드 (첫 로그인 동의 후) ─────────────────────────

  async function uploadAll() {
    if (!window.SB || !window.SB.enabled) return { books: 0, folders: 0 };
    var user = await window.SB.getUser();
    if (!user) return { books: 0, folders: 0 };

    var books   = window.Storage ? window.Storage.getAllBooksRaw()   : [];
    var folders = window.Storage ? window.Storage.getAllFoldersRaw() : [];

    var bookRows   = books.map(function(b) { return bookToRow(b, user.id); });
    var folderRows = folders.map(function(f) { return folderToRow(f, user.id); });

    var bOk = 0, fOk = 0;

    // 100건씩 나눠 upsert
    for (var i = 0; i < bookRows.length; i += 100) {
      var br = await window.SB.client.from('books').upsert(bookRows.slice(i, i + 100), { onConflict: 'id' });
      if (br.error) {
        console.warn('[Sync] uploadAll books 오류:', br.error.message);
      } else {
        bOk += Math.min(100, bookRows.length - i);
      }
    }
    for (var j = 0; j < folderRows.length; j += 100) {
      var fr = await window.SB.client.from('folders').upsert(folderRows.slice(j, j + 100), { onConflict: 'id' });
      if (fr.error) {
        console.warn('[Sync] uploadAll folders 오류:', fr.error.message);
      } else {
        fOk += Math.min(100, folderRows.length - j);
      }
    }

    return { books: bOk, folders: fOk };
  }

  // ── Pull: Supabase → localStorage (LWW by updated_at) ────────

  var BOOKS_LS_KEY   = 'bookTracker.books.v1';
  var FOLDERS_LS_KEY = 'bookTracker.folders.v1';

  async function pullBooks() {
    if (!window.SB || !window.SB.enabled) return;
    var user = await window.SB.getUser();
    if (!user) return;

    var r = await window.SB.client.from('books').select('*').eq('user_id', user.id);
    if (r.error) { console.warn('[Sync] pullBooks 오류:', r.error.message); return; }

    var remoteBooks = (r.data || []).map(rowToBook);
    var localBooks  = window.Storage ? window.Storage.getAllBooksRaw() : [];
    var localMap    = new Map(localBooks.map(function(b) { return [b.id, b]; }));

    remoteBooks.forEach(function(remote) {
      var local = localMap.get(remote.id);
      if (!local) {
        localMap.set(remote.id, remote);
      } else {
        var localTs  = Date.parse(local.updatedAt)  || 0;
        var remoteTs = Date.parse(remote.updatedAt) || 0;
        if (remoteTs > localTs) localMap.set(remote.id, remote);
      }
    });

    try {
      localStorage.setItem(BOOKS_LS_KEY, JSON.stringify(Array.from(localMap.values())));
    } catch (e) { console.warn('[Sync] pullBooks 쓰기 오류:', e); }
  }

  async function pullFolders() {
    if (!window.SB || !window.SB.enabled) return;
    var user = await window.SB.getUser();
    if (!user) return;

    var r = await window.SB.client.from('folders').select('*').eq('user_id', user.id);
    if (r.error) { console.warn('[Sync] pullFolders 오류:', r.error.message); return; }

    var remoteFolders = (r.data || []).map(rowToFolder);
    var localFolders  = window.Storage ? window.Storage.getAllFoldersRaw() : [];
    var localMap      = new Map(localFolders.map(function(f) { return [f.id, f]; }));

    remoteFolders.forEach(function(remote) {
      var local = localMap.get(remote.id);
      if (!local) {
        localMap.set(remote.id, remote);
      } else {
        var localTs  = Date.parse(local.updatedAt)  || 0;
        var remoteTs = Date.parse(remote.updatedAt) || 0;
        if (remoteTs > localTs) localMap.set(remote.id, remote);
      }
    });

    try {
      localStorage.setItem(FOLDERS_LS_KEY, JSON.stringify(Array.from(localMap.values())));
    } catch (e) { console.warn('[Sync] pullFolders 쓰기 오류:', e); }
  }

  // ── Outbox 재시도 ─────────────────────────────────────────────

  async function flushOutbox() {
    if (!window.SB || !window.SB.enabled) return;
    var items = outboxAll();
    if (!items.length) return;
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (item.type === 'book')   await pushBook(item.data);
      if (item.type === 'folder') await pushFolder(item.data);
    }
  }

  // 온라인 복귀 시 outbox 자동 재시도
  window.addEventListener('online', function() {
    if (window.SB && window.SB.enabled) flushOutbox();
  });

  window.Sync = {
    syncProfileOnSignIn: syncProfileOnSignIn,
    readLocalProfile:    readLocalProfile,
    writeLocalProfile:   writeLocalProfile,
    pushBook:            pushBook,
    pushFolder:          pushFolder,
    uploadAll:           uploadAll,
    pullBooks:           pullBooks,
    pullFolders:         pullFolders,
    flushOutbox:         flushOutbox,
  };
})();
