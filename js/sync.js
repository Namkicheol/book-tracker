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
    if (row.monthly_goal != null) localStorage.setItem('monthlyGoal', String(row.monthly_goal));
  }

  // 카카오/구글 OAuth 메타데이터에서 닉네임을 추출
  function extractProviderNickname(user) {
    if (!user) return '';
    var meta = user.user_metadata || {};
    return meta.name || meta.full_name || meta.nickname || meta.preferred_username || '';
  }

  // localStorage에 있는 닉네임이 "기본값"이라 OAuth 닉네임으로 대체해도 되는지
  function isDefaultNickname(name) {
    return !name || name === '책읽는엄마';
  }

  /**
   * 로그인 직후 호출. Supabase에 행 없으면 localStorage 값을 올리고,
   * 있으면 Supabase 값을 localStorage에 반영. 동기화 후 row 반환.
   * 신규 사용자라면 카카오/구글 닉네임을 우선 사용.
   */
  async function syncProfileOnSignIn() {
    if (!window.SB || !window.SB.enabled) return null;

    var existing = await window.SB.getProfile();
    if (existing) {
      writeLocalProfile(existing);
      return existing;
    }

    // 신규 사용자: localStorage + OAuth 메타데이터 병합
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

  window.Sync = {
    syncProfileOnSignIn: syncProfileOnSignIn,
    readLocalProfile: readLocalProfile,
    writeLocalProfile: writeLocalProfile
  };
})();
