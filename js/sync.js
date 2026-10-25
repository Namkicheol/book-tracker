/**
 * sync.js — localStorage ↔ Supabase 동기화 레이어
 *
 * 의존: js/supabase.js (window.SB), js/storage.js (window.Storage)
 *
 * window.Sync 노출:
 *   syncProfileOnSignIn()     프로필 1회 동기화 (첫 로그인)
 *   pushBook(book)            책 1권 Supabase upsert (실패 시 outbox 보관)
 *   pushFolder(folder)        폴더 1개 Supabase upsert
 *   uploadAll()               현재 계정 localStorage → 같은 계정 Supabase
 *   pullBooks()               Supabase → localStorage 병합 (LWW by updated_at)
 *   pullFolders()             Supabase → localStorage 병합
 *   flushOutbox()             오프라인 보관 항목 재시도
 */
(function () {
  'use strict';

  function storedUserId() {
    try {
      if (typeof localStorage.length !== 'number' || typeof localStorage.key !== 'function') return null;
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (!key || key.indexOf('-auth-token') < 0) continue;
        var value = JSON.parse(localStorage.getItem(key) || 'null');
        if (value && value.user && value.user.id && (!value.expires_at || value.expires_at * 1000 > Date.now() + 30000)) return value.user.id;
      }
    } catch (e) { /* ignore malformed or inaccessible auth storage */ }
    return null;
  }

  var activeUserId = storedUserId();
  var scopeGeneration = 0;
  var saveError = false;
  var cloudSaved = false;
  var pendingWrites = new Map();

  function getSaveStatus() {
    var count = outboxAll().filter(function(item) { return item.user_id === activeUserId && eligibleOutboxItem(item); }).length;
    var saving = Array.from(pendingWrites.keys()).some(function(key) { return key.indexOf(activeUserId + ':') === 0; });
    return { state: saveError ? 'error' : !activeUserId ? 'local' : saving ? 'saving' : count ? 'pending' : cloudSaved ? 'saved' : 'ready', pending: count };
  }

  function emitSaveStatus() {
    if (typeof window.dispatchEvent === 'function' && typeof window.CustomEvent === 'function') {
      window.dispatchEvent(new window.CustomEvent('sync-status', { detail: getSaveStatus() }));
    }
  }

  function notifyLocalSave(failed) { saveError = failed; emitSaveStatus(); }

  function queuePush(type, data, send) {
    var owner = activeUserId, generation = scopeGeneration;
    if (!owner || !window.SB || !window.SB.enabled || !isCurrentUser(owner)) { emitSaveStatus(); return Promise.resolve(); }
    // Persist before awaiting the network: navigation must not lose pending saves.
    if (!outboxAdd(type, data, owner)) { saveError = true; emitSaveStatus(); return Promise.resolve(); }
    var key = owner + ':' + type + ':' + data.id;
    var previous = pendingWrites.get(key) || Promise.resolve();
    var task = previous.catch(function() {}).then(function() {
      if (generation !== scopeGeneration || !isCurrentUser(owner)) return;
      var readRows = window.Storage && (type === 'book' ? window.Storage.getAllBooksRaw : window.Storage.getAllFoldersRaw);
      var latest = readRows && readRows().find(function(row) { return row.id === data.id; });
      if (latest && compareRecordVersion(latest, data) === 1) { outboxRemove(type, data.id, owner, data); return; }
      var newer = outboxAll().some(function(item) { return item.user_id === owner && item.type === type && item.data.id === data.id && compareRecordVersion(item.data, data) === 1; });
      if (!newer && generation === scopeGeneration && isCurrentUser(owner)) return send(data);
    }).finally(function() {
      if (pendingWrites.get(key) === task) pendingWrites.delete(key);
      emitSaveStatus();
    });
    pendingWrites.set(key, task);
    emitSaveStatus();
    return task;
  }

  function pushBook(book) { return queuePush('book', book, pushBookNow); }
  function pushFolder(folder) { return queuePush('folder', folder, pushFolderNow); }

  function legacyImportKey(userId) { return '_syncLegacyGuestPending_' + userId; }
  function uploadedKey(userId) { return '_syncUploaded_' + userId; }

  function activateOwner(userId) {
    var next = userId == null ? null : String(userId);
    if (next === activeUserId && (!window.Storage || typeof window.Storage.getOwner !== 'function' || window.Storage.getOwner() === next)) return false;
    if (window.Storage && typeof window.Storage.setOwner === 'function') window.Storage.setOwner(next);
    activeUserId = next;
    scopeGeneration++;
    saveError = false;
    cloudSaved = false;
    emitSaveStatus();
    return true;
  }

  function isCurrentUser(userId) {
    return activeUserId === userId && (!window.Storage || typeof window.Storage.getOwner !== 'function' || window.Storage.getOwner() === userId)
      && (!window.Storage || typeof window.Storage.isOwnerCurrent !== 'function' || window.Storage.isOwnerCurrent());
  }

  // Scope local records before page scripts render them. The legacy base keys
  // become the guest archive when a restored account is already present.
  if (window.Storage && typeof window.Storage.setOwner === 'function') {
    try { activateOwner(activeUserId); }
    catch (e) { activeUserId = null; console.warn('[Sync] 계정별 저장 공간을 전환하지 못했습니다.'); }
  }

  function authStateChanged(event, session) {
    if (event !== 'SIGNED_IN' && event !== 'INITIAL_SESSION' && event !== 'SIGNED_OUT') return;
    var userId = session && session.user ? session.user.id : null;
    try {
      if (activateOwner(userId) && window.location && typeof window.location.reload === 'function') window.location.reload();
    } catch (e) { console.warn('[Sync] 계정별 저장 공간을 전환하지 못했습니다.'); }
  }

  if (window.SB && window.SB.enabled && typeof window.SB.onAuthChange === 'function') window.SB.onAuthChange(authStateChanged);

  // ── 프로필 동기화 (기존 로직 유지) ───────────────────────────

  // Remove legacy identifying profile fields only; book and folder records stay untouched.
  ['profileSchool', 'profileClass', 'profileAddress', 'profileChildName', 'profileBirthdate', 'profileBirthday', 'profileRegion', 'profileGrade'].forEach(function (key) { localStorage.removeItem(key); });

  function readLocalProfile() {
    return {
      nickname: localStorage.getItem('profileName') || '책읽는엄마',
      avatar: localStorage.getItem('profileAvatar') || '👩',
      city: localStorage.getItem('profileCity') || null,
      district: localStorage.getItem('profileDistrict') || null,
      library_public: localStorage.getItem('profileLibraryPublic') === 'true',
      monthly_goal: parseInt(localStorage.getItem('monthlyGoal') || '20', 10) || 20
    };
  }

  function writeLocalProfile(row) {
    if (!row) return;
    if (activeUserId && !isCurrentUser(activeUserId)) return false;
    if (row.nickname) localStorage.setItem('profileName', row.nickname);
    if (row.avatar) localStorage.setItem('profileAvatar', row.avatar);
    if ('city' in row) localStorage.setItem('profileCity', row.city || '');
    if ('district' in row) localStorage.setItem('profileDistrict', row.district || '');
    if ('library_public' in row) {
      localStorage.setItem('profileLibraryPublic', String(row.library_public === true));
      localStorage.setItem('profilePrivacy', row.library_public === true ? 'public' : 'private');
    }
    if (row.monthly_goal != null) localStorage.setItem('monthlyGoal', String(row.monthly_goal));
    return true;
  }

  async function syncProfileOnSignIn() {
    if (!window.SB || !window.SB.enabled) return null;
    var user = await window.SB.getUser();
    if (!user) return null;
    var ownerId = user.id == null ? activeUserId : user.id;
    if (user.id != null && activateOwner(user.id)) return null;
    var existing = await window.SB.getProfile(ownerId);
    if (!isCurrentUser(ownerId)) return null;
    if (existing) { writeLocalProfile(existing); return existing; }
    // OAuth account names may be real names; never copy them into a public nickname.
    var saved = await window.SB.upsertProfile(readLocalProfile(), {expectedUserId:ownerId});
    if (!isCurrentUser(ownerId)) return null;
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
      read_history: Array.isArray(book.readHistory) ? book.readHistory : [],
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
      readHistory: Array.isArray(row.read_history) ? row.read_history : [],
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

  function compareRecordVersion(a, b) {
    var aTime = Date.parse(a && (a.updatedAt || a.updated_at)) || 0;
    var bTime = Date.parse(b && (b.updatedAt || b.updated_at)) || 0;
    if (aTime !== bTime) return aTime > bTime ? 1 : -1;
    return JSON.stringify(a) === JSON.stringify(b) ? 0 : null;
  }

  function outboxAdd(type, data, userId) {
    try {
      var q = JSON.parse(localStorage.getItem(OUTBOX_KEY || 'sync.outbox.v1') || '[]');
      var matching = q.filter(function(e) { return e.type === type && e.data && e.data.id === data.id && e.user_id === userId; });
      if (matching.some(function(e) { var order = compareRecordVersion(e.data, data); return order === 1 || order === null; })) return true;
      // 같은 계정의 같은 id만 교체한다. 소유자가 없는 과거 항목은 격리한다.
      var next = q.filter(function(e) { return !(e.type === type && e.data && e.data.id === data.id && e.user_id === userId); });
      next.push({ type: type, data: data, user_id: userId, ts: Date.now() });
      localStorage.setItem(OUTBOX_KEY, JSON.stringify(next));
      return true;
    } catch (e) { return false; }
  }

  function outboxRemove(type, id, userId, completedData) {
    try {
      var q = JSON.parse(localStorage.getItem(OUTBOX_KEY || 'sync.outbox.v1') || '[]');
      var next = q.filter(function(e) {
        if (e.type !== type || !e.data || e.data.id !== id || e.user_id !== userId) return true;
        if (!completedData) return false;
        var order = compareRecordVersion(e.data, completedData);
        return order === 1 || order === null;
      });
      localStorage.setItem(OUTBOX_KEY, JSON.stringify(next));
    } catch (e) { /* ignore */ }
  }

  function outboxAll() {
    try { return JSON.parse(localStorage.getItem(OUTBOX_KEY || 'sync.outbox.v1') || '[]'); }
    catch (e) { return []; }
  }

  function clearCurrentAccount(userId) {
    if (!userId || !isCurrentUser(userId)) return false;
    scopeGeneration++;
    if (window.Storage && typeof window.Storage.clearCurrentScope === 'function' && !window.Storage.clearCurrentScope()) return false;
    try {
      localStorage.setItem(OUTBOX_KEY, JSON.stringify(outboxAll().filter(function(item) { return item.user_id !== userId; })));
      localStorage.removeItem(uploadedKey(userId));
      localStorage.removeItem(legacyImportKey(userId));
    } catch (e) { return false; }
    return true;
  }

  // ── 단건 push ────────────────────────────────────────────────

  async function pushBookNow(book) {
    var ownerId = activeUserId;
    var generation = scopeGeneration;
    if (!ownerId || !window.SB || !window.SB.enabled || !isCurrentUser(ownerId)) return;
    if (!localStorage.getItem(uploadedKey(ownerId))) { outboxAdd('book', book, ownerId); return; }
    var user;
    try { user = await window.SB.getUser(); }
    catch (e) { outboxAdd('book', book, ownerId); return; }
    if (!user) { outboxAdd('book', book, ownerId); return; }
    if (user.id !== ownerId || generation !== scopeGeneration || !isCurrentUser(ownerId)) { outboxAdd('book', book, ownerId); return; }
    var row = bookToRow(book, ownerId);
    var r;
    try { r = await window.SB.client.from('books').upsert(row, { onConflict: 'id' }); }
    catch (e) {
      console.warn('[Sync] pushBook 오류 — outbox 저장:', e && e.message);
      outboxAdd('book', book, ownerId);
      return;
    }
    if (r.error) {
      console.warn('[Sync] pushBook 오류 — outbox 저장:', r.error.message);
      outboxAdd('book', book, ownerId);
    } else {
      outboxRemove('book', book.id, ownerId, book);
      if (isCurrentUser(ownerId) && generation === scopeGeneration) cloudSaved = true;
    }
  }

  async function pushFolderNow(folder) {
    var ownerId = activeUserId;
    var generation = scopeGeneration;
    if (!ownerId || !window.SB || !window.SB.enabled || !isCurrentUser(ownerId)) return;
    if (!localStorage.getItem(uploadedKey(ownerId))) { outboxAdd('folder', folder, ownerId); return; }
    var user;
    try { user = await window.SB.getUser(); }
    catch (e) { outboxAdd('folder', folder, ownerId); return; }
    if (!user) { outboxAdd('folder', folder, ownerId); return; }
    if (user.id !== ownerId || generation !== scopeGeneration || !isCurrentUser(ownerId)) { outboxAdd('folder', folder, ownerId); return; }
    var row = folderToRow(folder, ownerId);
    var r;
    try { r = await window.SB.client.from('folders').upsert(row, { onConflict: 'id' }); }
    catch (e) {
      console.warn('[Sync] pushFolder 오류 — outbox 저장:', e && e.message);
      outboxAdd('folder', folder, ownerId);
      return;
    }
    if (r.error) {
      console.warn('[Sync] pushFolder 오류 — outbox 저장:', r.error.message);
      outboxAdd('folder', folder, ownerId);
    } else {
      outboxRemove('folder', folder.id, ownerId, folder);
      if (isCurrentUser(ownerId) && generation === scopeGeneration) cloudSaved = true;
    }
  }

  // ── 현재 계정의 전체 업로드 (다른 계정·guest 이전 불가) ─────────────────────────

  async function uploadAll(options) {
    if (!window.SB || !window.SB.enabled) return { complete: false, books: 0, folders: 0 };
    var user = await window.SB.getUser();
    if (!user || !isCurrentUser(user.id)) return { complete: false, books: 0, folders: 0 };

    var sourceOwnerId = options && Object.prototype.hasOwnProperty.call(options, 'sourceOwnerId') ? options.sourceOwnerId : undefined;
    if (sourceOwnerId !== undefined && sourceOwnerId !== user.id) return { complete: false, books: 0, folders: 0 };
    var books = window.Storage ? window.Storage.getAllBooksRaw.apply(null, sourceOwnerId === undefined ? [] : [sourceOwnerId]) : [];
    var folders = window.Storage ? window.Storage.getAllFoldersRaw.apply(null, sourceOwnerId === undefined ? [] : [sourceOwnerId]) : [];
    var generation = scopeGeneration;

    // Compare IDs against the cloud before writing so a first login from a stale
    // device cannot replace a newer version already synced by another device.
    var remoteBooks = await window.SB.client.from('books').select('*').eq('user_id', user.id);
    if (remoteBooks.error || generation !== scopeGeneration || !isCurrentUser(user.id)) {
      return { complete: false, books: 0, folders: 0 };
    }
    var remoteFolders = await window.SB.client.from('folders').select('*').eq('user_id', user.id);
    if (remoteFolders.error || generation !== scopeGeneration || !isCurrentUser(user.id)) {
      return { complete: false, books: 0, folders: 0 };
    }

    function newerRows(localRows, cloudRows, toRow) {
      var cloudById = new Map((cloudRows.data || []).map(function(row) { return [row.id, row]; }));
      return localRows.filter(function(local) {
        var cloud = cloudById.get(local.id);
        if (!cloud) return true;
        return (Date.parse(local.updatedAt) || 0) > (Date.parse(cloud.updated_at) || 0);
      }).map(function(row) { return toRow(row, user.id); });
    }

    var bookRows = newerRows(books, remoteBooks, bookToRow);
    var folderRows = newerRows(folders, remoteFolders, folderToRow);
    var cloudBookById = new Map((remoteBooks.data || []).map(function(row) { return [row.id, row]; }));
    var cloudFolderById = new Map((remoteFolders.data || []).map(function(row) { return [row.id, row]; }));
    books.forEach(function(local) {
      var cloud = cloudBookById.get(local.id);
      if (cloud && (Date.parse(local.updatedAt) || 0) <= (Date.parse(cloud.updated_at) || 0)) outboxRemove('book', local.id, user.id, local);
    });
    folders.forEach(function(local) {
      var cloud = cloudFolderById.get(local.id);
      if (cloud && (Date.parse(local.updatedAt) || 0) <= (Date.parse(cloud.updated_at) || 0)) outboxRemove('folder', local.id, user.id, local);
    });
    var failures = 0;

    // 100건씩 나눠 upsert. 실패한 항목은 소유자와 함께 outbox에 남긴다.
    for (var i = 0; i < bookRows.length; i += 100) {
      if (generation !== scopeGeneration || !isCurrentUser(user.id)) return { complete: false, books: 0, folders: 0 };
      var bookChunk = bookRows.slice(i, i + 100);
      var br = await window.SB.client.from('books').upsert(bookChunk, { onConflict: 'id' });
      if (br.error) {
        failures += bookChunk.length;
        console.warn('[Sync] uploadAll books 오류:', br.error.message);
        bookChunk.forEach(function(row) { var local = books.find(function(item) { return item.id === row.id; }); if (local) outboxAdd('book', local, user.id); });
      } else bookChunk.forEach(function(row) { var local = books.find(function(item) { return item.id === row.id; }); if (local) outboxRemove('book', row.id, user.id, local); });
    }
    for (var j = 0; j < folderRows.length; j += 100) {
      if (generation !== scopeGeneration || !isCurrentUser(user.id)) return { complete: false, books: 0, folders: 0 };
      var folderChunk = folderRows.slice(j, j + 100);
      var fr = await window.SB.client.from('folders').upsert(folderChunk, { onConflict: 'id' });
      if (fr.error) {
        failures += folderChunk.length;
        console.warn('[Sync] uploadAll folders 오류:', fr.error.message);
        folderChunk.forEach(function(row) { var local = folders.find(function(item) { return item.id === row.id; }); if (local) outboxAdd('folder', local, user.id); });
      } else folderChunk.forEach(function(row) { var local = folders.find(function(item) { return item.id === row.id; }); if (local) outboxRemove('folder', row.id, user.id, local); });
    }

    return { complete: failures === 0, books: books.length, folders: folders.length, failures: failures };
  }

  // ── Pull: Supabase → localStorage (LWW by updated_at) ────────

  var BOOKS_LS_KEY   = 'bookTracker.books.v1';
  var FOLDERS_LS_KEY = 'bookTracker.folders.v1';

  async function pullBooks() {
    if (!window.SB || !window.SB.enabled) return false;
    var user = await window.SB.getUser();
    if (!user || !isCurrentUser(user.id)) return false;
    var generation = scopeGeneration;

    var r = await window.SB.client.from('books').select('*').eq('user_id', user.id);
    if (r.error) { console.warn('[Sync] pullBooks 오류:', r.error.message); return false; }
    if (generation !== scopeGeneration || !isCurrentUser(user.id)) return false;

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
        if (remoteTs >= localTs) localMap.set(remote.id, remote);
      }
    });

    try {
      if (generation !== scopeGeneration || !isCurrentUser(user.id)) return false;
      localStorage.setItem(BOOKS_LS_KEY, JSON.stringify(Array.from(localMap.values())));
      return true;
    } catch (e) { console.warn('[Sync] pullBooks 쓰기 오류:', e); return false; }
  }

  async function pullFolders() {
    if (!window.SB || !window.SB.enabled) return false;
    var user = await window.SB.getUser();
    if (!user || !isCurrentUser(user.id)) return false;
    var generation = scopeGeneration;

    var r = await window.SB.client.from('folders').select('*').eq('user_id', user.id);
    if (r.error) { console.warn('[Sync] pullFolders 오류:', r.error.message); return false; }
    if (generation !== scopeGeneration || !isCurrentUser(user.id)) return false;

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
        if (remoteTs >= localTs) localMap.set(remote.id, remote);
      }
    });

    try {
      if (generation !== scopeGeneration || !isCurrentUser(user.id)) return false;
      localStorage.setItem(FOLDERS_LS_KEY, JSON.stringify(Array.from(localMap.values())));
      return true;
    } catch (e) { console.warn('[Sync] pullFolders 쓰기 오류:', e); return false; }
  }

  // ── Outbox 재시도 ─────────────────────────────────────────────

  function eligibleOutboxItem(item) {
    if (!item.data || !['book', 'folder'].includes(item.type)) return false;
    if (!window.Storage) return true;
    var readRows = item.type === 'book' ? window.Storage.getAllBooksRaw : window.Storage.getAllFoldersRaw;
    var ownRows = readRows();
    var guestRows = readRows(null);
    return ownRows.some(function(row) { return row.id === item.data.id; })
      || !guestRows.some(function(row) { return row.id === item.data.id; });
  }

  async function flushOutbox() {
    if (!window.SB || !window.SB.enabled) return;
    var user;
    try { user = await window.SB.getUser(); }
    catch (e) { return; }
    if (!user || !isCurrentUser(user.id)) return;
    if (!localStorage.getItem(uploadedKey(user.id))) return;
    var items = outboxAll();
    if (!items.length) return;
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (item.user_id !== user.id || !isCurrentUser(user.id)) continue;
      if (!eligibleOutboxItem(item)) continue;
      if (item.type === 'book')   await pushBook(item.data);
      if (item.type === 'folder') await pushFolder(item.data);
    }
  }

  // 온라인 복귀 시 outbox 자동 재시도
  window.addEventListener('online', function() {
    if (window.SB && window.SB.enabled) flushOutbox();
  });

  window.Sync = {
    getSaveStatus:        getSaveStatus,
    getStatus:            getSaveStatus,
    notifyLocalSave:      notifyLocalSave,
    syncProfileOnSignIn: syncProfileOnSignIn,
    setOwner:            activateOwner,
    getOwner:            function() { return activeUserId; },
    clearCurrentAccount: clearCurrentAccount,
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
