/**
 * Supabase 클라이언트 + Auth helper
 *
 * 의존: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *       <script src="js/config.js">
 *
 * config.js의 SUPABASE_URL / SUPABASE_ANON_KEY가 비어 있으면 모든 함수는 no-op 반환.
 * 그 경우 앱은 익명·localStorage 전용 모드로 동작.
 *
 * 전역으로 `window.SB` 객체 노출:
 *   SB.client                  Supabase JS client (혹은 null)
 *   SB.enabled                 boolean
 *   SB.getUser()               Promise<User|null>
 *   SB.getSession()            Promise<Session|null>
 *   SB.signInWithKakao()       카카오 OAuth 리다이렉트
 *   SB.signInWithGoogle()      구글 OAuth 리다이렉트
 *   SB.signOut()               로그아웃
 *   SB.onAuthChange(cb)        세션 변화 구독 (cb(event, session))
 *   SB.upsertProfile(profile)  users 테이블 upsert
 *   SB.getProfile(userId?)     users 테이블 select (없으면 null)
 */
(function () {
  'use strict';

  var url = (typeof SUPABASE_URL !== 'undefined') ? SUPABASE_URL : '';
  var key = (typeof SUPABASE_ANON_KEY !== 'undefined') ? SUPABASE_ANON_KEY : '';
  var enabled = !!(url && key && typeof window.supabase !== 'undefined');

  var client = null;
  if (enabled) {
    try {
      client = window.supabase.createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true, // OAuth callback 자동 처리
          flowType: 'pkce'
        }
      });
    } catch (e) {
      console.warn('[supabase] createClient 실패:', e);
      enabled = false;
    }
  } else if (!url || !key) {
    console.info('[supabase] SUPABASE_URL/ANON_KEY 미설정 → localStorage 전용 모드');
  } else {
    console.warn('[supabase] supabase-js CDN 로드 안됨 → <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"> 확인');
  }

  function getRedirectTo() {
    // OAuth 후 돌아올 URL — 현재 페이지 그대로 (해시는 supabase가 처리 후 정리)
    return window.location.origin + window.location.pathname;
  }

  async function getUser() {
    if (!client) return null;
    try {
      var r = await client.auth.getUser();
      return r && r.data ? r.data.user : null;
    } catch (e) { return null; }
  }

  async function getSession() {
    if (!client) return null;
    try {
      var r = await client.auth.getSession();
      return r && r.data ? r.data.session : null;
    } catch (e) { return null; }
  }

  async function signInWithKakao() {
    if (!client) { alert('로그인 기능이 비활성 상태입니다.'); return; }
    // 카카오 이메일(account_email)은 비즈 앱 검수 필요 → 닉네임·프로필사진만 요청
    return client.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: getRedirectTo(),
        scopes: 'profile_nickname profile_image'
      }
    });
  }

  async function signInWithGoogle() {
    if (!client) { alert('로그인 기능이 비활성 상태입니다.'); return; }
    return client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: getRedirectTo() }
    });
  }

  async function signOut() {
    if (!client) return;
    return client.auth.signOut();
  }

  function onAuthChange(cb) {
    if (!client) return { data: { subscription: { unsubscribe: function () {} } } };
    return client.auth.onAuthStateChange(cb);
  }

  async function upsertProfile(profile) {
    if (!client) return null;
    var user = await getUser();
    if (!user) return null;
    var row = Object.assign({ id: user.id, updated_at: new Date().toISOString() }, profile);
    var r = await client.from('users').upsert(row, { onConflict: 'id' }).select().single();
    if (r.error) {
      console.warn('[supabase] upsertProfile error:', r.error);
      return null;
    }
    return r.data;
  }

  async function getProfile(userId) {
    if (!client) return null;
    var id = userId;
    if (!id) {
      var u = await getUser();
      if (!u) return null;
      id = u.id;
    }
    var r = await client.from('users').select('*').eq('id', id).maybeSingle();
    if (r.error) {
      console.warn('[supabase] getProfile error:', r.error);
      return null;
    }
    return r.data;
  }

  // 같은 학교 친구 조회 — RLS가 자동으로 privacy != 'private' AND
  //   (privacy='public' OR same school as auth.uid()) 필터링
  async function getSchoolFriends() {
    if (!client) return [];
    var u = await getUser();
    if (!u) return [];
    var me = await getProfile(u.id);
    if (!me || !me.school) return [];
    var r = await client
      .from('users')
      .select('id, nickname, avatar, grade, school, city, district, privacy')
      .eq('school', me.school)
      .neq('id', u.id)
      .neq('privacy', 'private')
      .limit(50);
    if (r.error) {
      console.warn('[supabase] getSchoolFriends error:', r.error);
      return [];
    }
    return r.data || [];
  }

  window.SB = {
    client: client,
    enabled: enabled,
    getUser: getUser,
    getSession: getSession,
    signInWithKakao: signInWithKakao,
    signInWithGoogle: signInWithGoogle,
    signOut: signOut,
    onAuthChange: onAuthChange,
    upsertProfile: upsertProfile,
    getProfile: getProfile,
    getSchoolFriends: getSchoolFriends
  };
})();
