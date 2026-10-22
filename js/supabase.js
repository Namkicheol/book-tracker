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

  async function signIn(provider) {
    if (!client) { alert('로그인 연결을 확인해 주세요.'); return null; }
    try {
      const options = { redirectTo: getRedirectTo() };
      if (provider === 'kakao') options.scopes = 'profile_nickname profile_image';
      const result = await client.auth.signInWithOAuth({ provider: provider, options: options });
      if (result.error) throw result.error;
      return result;
    } catch (e) {
      alert(provider === 'google' ? '구글 로그인을 시작하지 못했어요. 잠시 후 다시 시도해 주세요. 카카오 로그인이나 로그인 없이도 서재를 사용할 수 있어요.' : '로그인을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.');
      return null;
    }
  }
  function signInWithKakao() { return signIn('kakao'); }
  function signInWithGoogle() { return signIn('google'); }

  async function signOut() {
    if (!client) return;
    return client.auth.signOut();
  }

  function onAuthChange(cb) {
    if (!client) return { data: { subscription: { unsubscribe: function () {} } } };
    return client.auth.onAuthStateChange(function (event, session) {
      // Release the auth lock before listeners call getUser/getSession or sync.
      setTimeout(function () {
        Promise.resolve().then(function () { return cb(event, session); }).catch(function () {
          console.warn('[supabase] 세션 변경 후 동기화를 완료하지 못했습니다.');
        });
      }, 0);
    });
  }

  async function upsertProfile(profile, options) {
    var expectedUserId = options && options.expectedUserId;
    if (!client) return null;
    var user = await getUser();
    if (!user) return null;
    if (expectedUserId != null && user.id !== expectedUserId) return null;
    var row = { id: user.id, updated_at: new Date().toISOString() };
    ['nickname', 'avatar', 'city', 'district', 'monthly_goal', 'library_public', 'public_nickname'].forEach(function (field) {
      if (Object.prototype.hasOwnProperty.call(profile, field)) row[field] = profile[field];
    });
    if (typeof row.library_public === 'boolean') row.privacy = row.library_public ? 'public' : 'private';
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
    var r = await client.from('users').select('id,nickname,avatar,city,district,monthly_goal,library_public,public_nickname').eq('id', id).maybeSingle();
    if (r.error) {
      console.warn('[supabase] getProfile error:', r.error);
      throw r.error;
    }
    return r.data;
  }

  async function getPublicLibraries(city, district) {
    if (!client) return [];
    var r = await client.rpc('list_public_libraries_v2', {filter_city: city || null, filter_district: district || null});
    if (r.error) throw r.error;
    return r.data || [];
  }
  async function getPublicLibraryBooks(ownerId) {
    if (!client) return [];
    var r = await client.rpc('get_public_library_books', {owner: ownerId});
    if (r.error) throw r.error;
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
    getPublicLibraries: getPublicLibraries,
    getPublicLibraryBooks: getPublicLibraryBooks
  };
})();
