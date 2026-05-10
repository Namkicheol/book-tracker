/**
 * 첫 로그인 시 localStorage → Supabase users 테이블 마이그레이션
 *
 * 의존: js/supabase.js (window.SB)
 *
 * 동작:
 *  - 로그인된 사용자의 users 행이 없으면 localStorage 프로필을 insert
 *  - 이미 행이 있으면 Supabase 값을 권위로 두고 localStorage를 거기에 맞춰 갱신
 *
 * 호출: share.js 등에서 onAuthChange의 SIGNED_IN 이벤트 후 1회
 */
(function () {
  'use strict';

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
    if (row.monthly_goal) localStorage.setItem('monthlyGoal',   String(row.monthly_goal));
  }

  /**
   * 로그인 직후 호출. Supabase에 행 없으면 localStorage 값을 올리고,
   * 있으면 Supabase 값을 localStorage에 반영. 동기화 후 row 반환.
   */
  async function syncProfileOnSignIn() {
    if (!window.SB || !window.SB.enabled) return null;

    var existing = await window.SB.getProfile();
    if (existing) {
      writeLocalProfile(existing);
      return existing;
    }

    // 신규 사용자: localStorage 프로필 업로드
    var local = readLocalProfile();
    var saved = await window.SB.upsertProfile(local);
    return saved || null;
  }

  window.Sync = {
    syncProfileOnSignIn: syncProfileOnSignIn,
    readLocalProfile: readLocalProfile,
    writeLocalProfile: writeLocalProfile
  };
})();
