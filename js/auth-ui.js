/**
 * 공통 auth UI — 헤더 우측 프로필 버튼 + 로그인 모달 + 프로필 뷰어
 *
 * 의존: js/supabase.js (window.SB)
 *
 * 동작:
 *  - SB.enabled가 false면 조용히 비활성
 *  - 모든 페이지 헤더 우측에 프로필 버튼 자동 주입
 *    · 로그아웃: outline person icon → 클릭 시 로그인 모달
 *    · 로그인: 사용자 emoji 아바타 → 클릭 시 프로필 뷰어
 *
 * window.AuthUI:
 *   AuthUI.showLoginPicker()
 *   AuthUI.showProfileViewer()
 *   AuthUI.refresh()
 *   AuthUI.isLoggedIn()
 */
(function () {
  'use strict';

  var BENEFITS = ['☁️ 기기를 바꿔도 같은 서재', '📚 공개에 동의한 다른 부모들의 책 둘러보기', '🔒 내 서재는 기본 비공개'];

  var AVATAR_EMOJIS = [
    '👩','🧑','👨','👧','👦','🧑‍🎓','👩‍🎓','👨‍🎓','🦊','🐰',
    '🐱','🐶','🐻','🐼','🐯','🦁','🐨','🐸','🐧','🦄'
  ];

  function svgPerson() {
    return '<svg aria-hidden="true" focusable="false" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.5"/><path d="M5 21v-1a7 7 0 0 1 14 0v1"/></svg>';
  }

  function ensureAuthButtonStyles() {
    if (document.getElementById('authUiButtonStyles')) return;
    var st = document.createElement('style');
    st.id = 'authUiButtonStyles';
    st.textContent = [
      '#authBtnGlobal{box-sizing:border-box;width:44px;height:44px;min-width:44px;flex-shrink:0;display:flex;align-items:center;justify-content:center;margin-left:6px;padding:0;border:0;border-radius:50%;background:transparent;color:#c9899d;box-shadow:none;font-size:22px;line-height:1;cursor:pointer;transition:color .15s ease,background-color .15s ease}',
      '#authBtnGlobal:hover{background-color:rgba(185,68,101,.07)}',
      '#authBtnGlobal:focus-visible{outline:2px solid #c9899d;outline-offset:2px}',
      '#authBtnGlobal svg{display:block;width:24px;height:24px}',
      '#authBtnGlobal img{display:block;width:100%;height:100%;border-radius:50%;object-fit:cover}'
    ].join('');
    document.head.appendChild(st);
  }

  // 외부 이미지 URL을 https 로 강제 (http://k.kakaocdn.net 등 mixed-content 차단 방지)
  function toHttps(u) {
    return typeof u === 'string' ? u.replace(/^http:\/\//, 'https://') : u;
  }

  // avatar 값(URL 또는 emoji) → DOM 엘리먼트에 적절히 렌더
  function setAvatarEl(el, value) {
    if (!el) return;
    el.innerHTML = '';
    if (value && /^https?:\/\//.test(value)) {
      var img = document.createElement('img');
      img.src = toHttps(value);
      img.alt = '';
      img.referrerPolicy = 'no-referrer';
      img.style.cssText = 'width:100%;height:100%;border-radius:50%;object-fit:cover;display:block';
      img.addEventListener('error', function () {
        el.innerHTML = '';
        el.textContent = '👩';
      }, { once: true });
      el.appendChild(img);
    } else {
      el.textContent = value || '👩';
    }
  }

  function isUrl(v) { return v && /^https?:\/\//.test(v); }
  window.setAvatarEl = setAvatarEl; // share.js에서도 재사용

  // localStorage 의 supabase auth token 직접 읽기 — getSession() 비동기 토큰 refresh
  // 도중 일시적으로 null 반환하는 케이스를 우회하는 fast path.
  function getStoredSupabaseUser() {
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (!key || key.indexOf('-auth-token') < 0) continue;
        var raw = localStorage.getItem(key);
        if (!raw) continue;
        var parsed = JSON.parse(raw);
        if (!parsed || !parsed.user || !parsed.expires_at) continue;
        // expires_at(초) — 만료 30초 전부터 만료로 간주(여유)
        if (parsed.expires_at * 1000 < Date.now() + 30000) continue;
        return parsed.user;
      }
    } catch (e) { /* ignore */ }
    return null;
  }

  async function getCurrentUser() {
    var user = getStoredSupabaseUser();
    if (user) return user;
    var sess = window.SB ? await window.SB.getSession() : null;
    return sess && sess.user ? sess.user : null;
  }

  function ensureAnim() {
    if (document.getElementById('authUiAnim')) return;
    var st = document.createElement('style');
    st.id = 'authUiAnim';
    st.textContent = '@keyframes authFadeIn{from{opacity:0}to{opacity:1}}@keyframes authPop{from{opacity:0;transform:translateY(20px) scale(.96)}to{opacity:1;transform:none}}';
    document.head.appendChild(st);
  }

  function injectHeaderProfileButton() {
    if (!window.SB || !window.SB.enabled) return;
    if (document.getElementById('authBtnGlobal')) return;

    ensureAuthButtonStyles();
    var btn = document.createElement('button');
    btn.id = 'authBtnGlobal';
    btn.type = 'button';
    btn.title = '로그인';
    btn.setAttribute('aria-label', '로그인');
    btn.innerHTML = svgPerson();

    // masthead는 액션 줄에, 그 외 페이지는 page-header의 마지막 항목으로 배치.
    // 헤더가 없는 페이지에서는 기존처럼 화면 우측 상단에 안전하게 fallback.
    var slimHeader = document.querySelector('.page-header:not(.page-header-masthead)');
    var browseHeader = document.querySelector('.rec-browse-header');
    var mastheadActions = document.querySelector('.page-header-masthead .hdr-actions');
    if (mastheadActions) {
      mastheadActions.appendChild(btn);
    } else if (slimHeader) {
      slimHeader.appendChild(btn);
    } else if (browseHeader) {
      btn.style.cssText = 'position:absolute;top:20px;right:14px';
      browseHeader.appendChild(btn);
    } else {
      btn.style.cssText = [
        'position:fixed', 'top:14px', 'right:14px',
        'z-index:990', 'box-sizing:border-box',
        'width:44px', 'height:44px', 'min-width:44px',
        'border:0', 'border-radius:50%', 'background:transparent',
        'color:#c9899d', 'box-shadow:none', 'cursor:pointer',
        'display:flex', 'align-items:center', 'justify-content:center',
        'font-size:22px', 'line-height:1', 'padding:0'
      ].join(';');
      document.body.appendChild(btn);
    }

    btn.addEventListener('click', onClick);

    // Supabase 세션 복원/토큰 refresh가 늦게 끝나는 경우를 위해 폴링.
    // 세션이 감지되면 즉시 중단. 최대 10초까지 시도.
    var pollAttempts = 0;
    async function pollRefresh() {
      await refresh();
      pollAttempts++;
      try {
        var sess = window.SB ? await window.SB.getSession() : null;
        if (sess && sess.user) return; // 로그인 감지 → 중단
      } catch (e) { /* ignore */ }
      if (pollAttempts >= 10) return; // 10초 후 포기
      setTimeout(pollRefresh, 1000);
    }
    pollRefresh();
  }

  async function refresh() {
    var btn = document.getElementById('authBtnGlobal');
    if (!btn) return;
    if (!window.SB || !window.SB.enabled) { btn.style.display = 'none'; return; }

    // Fast path: localStorage에서 supabase 토큰을 직접 읽어 user 즉시 결정
    var user = await getCurrentUser();
    if (user) {
      btn.title = '내 프로필';
      btn.setAttribute('aria-label', '내 프로필');
      var avatar = localStorage.getItem('profileAvatar') || '👩';
      setAvatarEl(btn, avatar);
      btn.style.padding = '0';
    } else {
      btn.title = '로그인';
      btn.setAttribute('aria-label', '로그인');
      btn.innerHTML = svgPerson();
    }
    // share.html 헤더의 #authBtn은 share.js가 별도로 관리
  }

  async function isLoggedIn() {
    if (!window.SB || !window.SB.enabled) return false;
    var s = await window.SB.getSession();
    return !!(s && s.user);
  }

  async function onClick() {
    // localStorage 빠른 경로 우선 — getSession 비동기 지연으로 잘못 로그인 모달
    // 띄우는 케이스 방지
    var user = await getCurrentUser();
    if (user) {
      showProfileViewer();
    } else {
      showLoginPicker();
    }
  }

  function showLoginPicker() {
    if (!window.SB || !window.SB.enabled) {
      alert('로그인 기능이 준비되지 않았습니다.');
      return;
    }
    if (document.getElementById('authLoginModal')) return;
    ensureAnim();

    var modal = document.createElement('div');
    modal.id = 'authLoginModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;padding:20px;animation:authFadeIn .18s ease';

    modal.innerHTML = [
      '<div style="background:#fff;border-radius:20px;padding:22px;max-width:360px;width:100%;box-shadow:0 16px 48px rgba(0,0,0,0.2);animation:authPop .22s cubic-bezier(.2,.8,.2,1)">',
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">',
      '<div><div style="font-size:20px;font-weight:800;color:#4A4A4A">맘스북스에 로그인</div>',
      '<div style="font-size:12px;color:#8B8B8B;margin-top:4px">기록은 그대로, 더 많은 기능이 열려요</div></div>',
      '<button id="authModalClose" style="background:none;border:none;font-size:22px;cursor:pointer;color:#8B8B8B;padding:0;line-height:1" aria-label="닫기">×</button>',
      '</div>',
      '<ul style="list-style:none;padding:14px;margin:0 0 16px 0;display:flex;flex-direction:column;gap:9px;background:linear-gradient(135deg,#FFF8F0,#FFE8F0);border-radius:14px">',
      BENEFITS.map(function (b) { return '<li style="font-size:13px;color:#4A4A4A;line-height:1.55">' + b + '</li>'; }).join(''),
      '</ul>',
      '<div style="display:flex;flex-direction:column;gap:10px">',
      '<button id="authLoginKakao" type="button" style="padding:14px;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;background:#FEE500;color:#3C1E1E;display:flex;align-items:center;justify-content:center;gap:8px">',
      '<span style="font-size:17px">💬</span> 카카오로 시작하기',
      '</button>',
      '<button id="authLoginGoogle" type="button" style="padding:14px;border:1.5px solid #e0e0e0;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;background:#fff;color:#333;display:flex;align-items:center;justify-content:center;gap:8px">',
      '<span style="color:#4285F4;font-weight:900;font-size:17px">G</span> 구글로 시작하기',
      '</button></div>',
      '<div style="margin-top:14px;font-size:11px;color:#999;text-align:center;line-height:1.5">이미 등록한 책·폴더는 그대로 유지되고<br>로그인 시 다른 기기와 자동 연결돼요</div>',
      '</div>'
    ].join('');

    document.body.appendChild(modal);
    function close() { modal.remove(); }
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
    modal.querySelector('#authModalClose').addEventListener('click', close);
    modal.querySelector('#authLoginKakao').addEventListener('click', function () { window.SB.signInWithKakao(); });
    modal.querySelector('#authLoginGoogle').addEventListener('click', function () { window.SB.signInWithGoogle(); });
  }

  function htmlEscape(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
    });
  }

  async function showProfileViewer() {
    if (!window.SB || !window.SB.enabled) return;
    if (document.getElementById('authProfileModal')) return;
    ensureAnim();

    var user = await getCurrentUser();
    if (!user) { showLoginPicker(); return; }

    var meta = user.user_metadata || {};
    var provider = (user.app_metadata && user.app_metadata.provider) || '';
    var importedName = ''; // 계정 실명을 닉네임으로 가져오지 않는다.
    var importedAvatar = meta.avatar_url || meta.picture || meta.profile_image || '';
    var providerLabel = provider === 'kakao' ? '💬 카카오 계정'
                      : provider === 'google' ? '🅖 구글 계정'
                      : '☁️ 연결된 계정';
    var providerImportLabel = provider === 'kakao' ? '💬 카카오 프로필 가져오기'
                            : provider === 'google' ? '🅖 구글 프로필 가져오기'
                            : '☁️ 계정 프로필 가져오기';

    var cur = {
      name:   localStorage.getItem('profileName') || '책읽는엄마',
      city: localStorage.getItem('profileCity') || '',
      district: localStorage.getItem('profileDistrict') || '',
      goal:   parseInt(localStorage.getItem('monthlyGoal') || '20', 10) || 20,
      avatar: localStorage.getItem('profileAvatar') || '👩'
    };
    var regions = window.REGIONS || {};

    var modal = document.createElement('div');
    modal.id = 'authProfileModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:flex-start;justify-content:center;z-index:10000;padding:20px;overflow-y:auto;animation:authFadeIn .18s ease';

    modal.innerHTML = [
      '<div style="background:#fff;border-radius:20px;padding:22px;max-width:380px;width:100%;margin:auto;box-shadow:0 16px 48px rgba(0,0,0,0.2);animation:authPop .22s cubic-bezier(.2,.8,.2,1)">',

      // 헤더 — avatar + 이름 + provider badge
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">',
      '<div style="display:flex;align-items:center;gap:12px">',
      '<div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#FFE0EC,#FFD1DC);display:flex;align-items:center;justify-content:center;font-size:30px;border:3px solid #fff;box-shadow:0 4px 12px rgba(255,158,158,0.3);overflow:hidden" id="apvAvatarShow"></div>',
      '<div>',
      '<div style="font-size:18px;font-weight:800;color:#4A4A4A" id="apvNameShow">' + htmlEscape(cur.name) + '</div>',
      '<div style="font-size:11px;color:#8B8B8B;margin-top:3px">' + providerLabel + '</div>',
      '</div></div>',
      '<button id="apvClose" style="background:none;border:none;font-size:22px;cursor:pointer;color:#8B8B8B;padding:0;line-height:1" aria-label="닫기">×</button>',
      '</div>',

      // 1. 카카오/구글 프로필 가져오기 — 상단
      // 이미 카카오 사진을 아바타로 가져온 상태면 버튼 숨김 (닉네임은 사용자가 별명으로
      // 자유롭게 바꾸기 때문에 일치 여부와 무관).
      ((importedName || importedAvatar) && !(importedAvatar && cur.avatar === importedAvatar)) ?
        '<button type="button" id="apvImport" style="width:100%;padding:12px;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;background:' + (provider === 'kakao' ? '#FEE500' : '#fff') + ';color:#3C1E1E;border:' + (provider === 'kakao' ? 'none' : '1.5px solid #e0e0e0') + ';margin-bottom:16px;display:flex;align-items:center;justify-content:center;gap:10px">' +
          (importedAvatar ? '<img src="' + importedAvatar.replace(/"/g, '%22') + '" alt="" referrerpolicy="no-referrer" style="width:24px;height:24px;border-radius:50%;object-fit:cover;flex-shrink:0">' : '') +
          '<span>' + providerImportLabel + (importedName ? '<br><span style="font-size:11px;font-weight:500;opacity:0.7">' + htmlEscape(importedName) + '</span>' : '') + '</span>' +
        '</button>'
        : '',

      // 2. 입력 필드들
      '<div style="display:flex;flex-direction:column;gap:12px">',
      '<label style="display:flex;flex-direction:column;gap:6px"><span style="font-size:12px;font-weight:700;color:#8B8B8B">닉네임</span>',
      '<input id="apvName" type="text" value="' + htmlEscape(cur.name) + '" maxlength="20" style="padding:10px 12px;border:1.5px solid #eee;border-radius:10px;font-size:14px;background:#fff"></label>',
      '<p style="font-size:12px;color:#8B8B8B">아이 이름·생년월일·학교·반·상세 주소는 입력하지 마세요. 지역은 선택이에요.</p>',
      '<label>시·도 (선택)<select id="apvCity" style="width:100%;padding:10px"><option value="">선택 안 함</option>' + Object.keys(regions).map(function(c) { return '<option' + (c === cur.city ? ' selected' : '') + '>' + htmlEscape(c) + '</option>'; }).join('') + '</select></label>',
      '<label>시·군·구 (선택)<select id="apvDistrict" style="width:100%;padding:10px"></select></label>',
      '<label style="display:flex;flex-direction:column;gap:6px"><span style="font-size:12px;font-weight:700;color:#8B8B8B">이번 달 목표 (권)</span>',
      '<input id="apvGoal" type="number" min="1" max="200" value="' + cur.goal + '" style="padding:10px 12px;border:1.5px solid #eee;border-radius:10px;font-size:14px;background:#fff"></label>',
      '</div>',

      // 3. 이모티콘 아바타 선택 — 하단
      '<details style="margin-top:16px;border:1.5px solid #eee;border-radius:12px;padding:12px">',
      '<summary style="cursor:pointer;font-size:13px;font-weight:700;color:#8B8B8B;list-style:none;display:flex;justify-content:space-between;align-items:center">',
      '<span>아바타 이모티콘으로 변경</span>',
      '<span id="apvAvatarPreview" style="font-size:22px;width:28px;height:28px;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center"></span>',
      '</summary>',
      '<div id="apvAvatarGrid" style="display:grid;grid-template-columns:repeat(8,1fr);gap:6px;margin-top:12px"></div>',
      '</details>',

      // 4. 액션 버튼들 — 저장/취소 50/50
      '<div style="display:flex;gap:8px;margin-top:18px">',
      '<button id="apvCancel" type="button" style="flex:1;padding:12px;border:1.5px solid #eee;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;background:#fff;color:#8B8B8B">취소</button>',
      '<button id="apvSave" type="button" style="flex:1;padding:12px;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;background:linear-gradient(135deg,#FF9E9E,#E8C5FF);color:#fff;transition:background .15s ease,color .15s ease">✏️ 수정</button>',
      '</div>',

      // 5. 앱 설정 + 로그아웃 — 맨 아래 (50/50, 둘 다 톤다운)
      '<div style="display:flex;gap:8px;margin-top:10px">',
      '<a href="settings.html" style="flex:1;padding:10px;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;background:transparent;color:#bbb;text-align:center;text-decoration:none">⚙️ 앱 설정</a>',
      '<button id="apvLogout" type="button" style="flex:1;padding:10px;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;background:transparent;color:#bbb;display:flex;align-items:center;justify-content:center;gap:6px">' +
        '<svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">' +
          '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>' +
          '<path d="M16 17l5-5-5-5"></path>' +
          '<path d="M21 12H9"></path>' +
        '</svg>' +
        '<span>로그아웃</span>' +
      '</button>',
      '</div>',

      '</div>'
    ].join('');

    document.body.appendChild(modal);

    // 보기/편집 모드 토글 — 평소엔 필드 잠금 + '✏️ 수정', 수정 누르면 편집 + '저장'
    var saveBtn = modal.querySelector('#apvSave');
    var editFields = ['#apvName', '#apvCity', '#apvDistrict', '#apvGoal'].map(function (s) { return modal.querySelector(s); });
    var avatarDetails = modal.querySelector('details');
    var editing = false;
    function setEditing(on) {
      editing = on;
      editFields.forEach(function (el) { if (el) el.disabled = !on; });
      if (avatarDetails) {
        avatarDetails.style.opacity = on ? '1' : '0.5';
        avatarDetails.style.pointerEvents = on ? '' : 'none';
        if (!on) avatarDetails.open = false;
      }
      var imp = modal.querySelector('#apvImport');
      if (imp) imp.style.display = on ? '' : 'none';
      saveBtn.dataset.saved = '';
      saveBtn.disabled = false;
      saveBtn.style.cursor = 'pointer';
      saveBtn.style.background = 'linear-gradient(135deg,#FF9E9E,#E8C5FF)';
      saveBtn.style.color = '#fff';
      saveBtn.textContent = on ? '저장' : '✏️ 수정';
    }
    function updateDistrict() {
      modal.querySelector('#apvDistrict').innerHTML = '<option value="">선택 안 함</option>' + (regions[modal.querySelector('#apvCity').value] || []).map(function(d) { return '<option' + (d === cur.district ? ' selected' : '') + '>' + htmlEscape(d) + '</option>'; }).join('');
    }
    updateDistrict(); modal.querySelector('#apvCity').addEventListener('change', updateDistrict);
    setEditing(false); // 초기엔 보기 모드

    // 초기 avatar 렌더 (URL이면 img, emoji면 텍스트)
    setAvatarEl(modal.querySelector('#apvAvatarShow'), cur.avatar);
    setAvatarEl(modal.querySelector('#apvAvatarPreview'), cur.avatar);

    // 아바타 이모티콘 그리드 채우기 (클릭하면 emoji로 전환 — URL 덮어쓰기)
    var grid = modal.querySelector('#apvAvatarGrid');
    AVATAR_EMOJIS.forEach(function (emo) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = emo;
      var isActive = emo === cur.avatar;
      b.style.cssText = 'padding:8px;border:1.5px solid ' + (isActive ? '#FF9E9E' : 'transparent') + ';border-radius:10px;font-size:22px;cursor:pointer;background:' + (isActive ? '#FFE0EC' : '#fff');
      b.addEventListener('click', function () {
        cur.avatar = emo;
        grid.querySelectorAll('button').forEach(function (x) {
          x.style.borderColor = 'transparent';
          x.style.background = '#fff';
        });
        b.style.borderColor = '#FF9E9E';
        b.style.background = '#FFE0EC';
        setAvatarEl(modal.querySelector('#apvAvatarPreview'), emo);
        setAvatarEl(modal.querySelector('#apvAvatarShow'), emo);
      });
      grid.appendChild(b);
    });

    function close() { modal.remove(); }
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
    modal.querySelector('#apvClose').addEventListener('click', close);
    modal.querySelector('#apvCancel').addEventListener('click', close);

    // 카카오 프로필 가져오기 → 닉네임 + 아바타 사진 둘 다 적용
    var importBtn = modal.querySelector('#apvImport');
    if (importBtn) {
      importBtn.addEventListener('click', function () {
        if (importedName) {
          modal.querySelector('#apvName').value = importedName;
          modal.querySelector('#apvNameShow').textContent = importedName;
        }
        if (importedAvatar) {
          cur.avatar = importedAvatar;
          setAvatarEl(modal.querySelector('#apvAvatarShow'), importedAvatar);
          setAvatarEl(modal.querySelector('#apvAvatarPreview'), importedAvatar);
          // 그리드 emoji 활성 표시 해제
          grid.querySelectorAll('button').forEach(function (x) {
            x.style.borderColor = 'transparent';
            x.style.background = '#fff';
          });
        }
      });
    }

    saveBtn.addEventListener('click', async function () {
      if (saveBtn.dataset.saved === '1') return;
      if (window.Storage && typeof window.Storage.isOwnerCurrent === 'function' && !window.Storage.isOwnerCurrent()) {
        window.location.reload();
        return;
      }
      // 보기 모드: '✏️ 수정' 클릭 → 편집 모드 진입
      if (!editing) {
        setEditing(true);
        var nf = modal.querySelector('#apvName');
        if (nf) nf.focus();
        return;
      }
      // 편집 모드: '저장' 클릭 → 저장
      var name   = modal.querySelector('#apvName').value.trim() || cur.name;
      var city = modal.querySelector('#apvCity').value;
      var district = modal.querySelector('#apvDistrict').value;
      var goal   = Math.max(1, parseInt(modal.querySelector('#apvGoal').value, 10) || cur.goal);
      var avatar = cur.avatar;

      localStorage.setItem('profileName',   name);
      localStorage.setItem('profileCity', city);
      localStorage.setItem('profileDistrict', district);
      localStorage.setItem('monthlyGoal',   String(goal));
      localStorage.setItem('profileAvatar', avatar);

      // 즉시 피드백 — 버튼을 '✅ 저장됐어요'로 변신 후 0.8초 뒤 닫힘
      saveBtn.dataset.saved = '1';
      saveBtn.disabled = true;
      saveBtn.textContent = '✅ 저장됐어요';
      saveBtn.style.cursor = 'default';
      saveBtn.style.background = '#E8F8EE';
      saveBtn.style.color = '#2E9E5B';

      // share.html DOM에도 즉시 반영 (페이지에 있을 때만)
      var nameEl = document.getElementById('profileName');
      if (nameEl) nameEl.textContent = name;
      var gradeEl = document.getElementById('profileGrade');
      if (gradeEl) gradeEl.textContent = '';
      var regionEl = document.getElementById('profileRegion');
      if (regionEl) regionEl.textContent = [city, district].filter(Boolean).join(' ');
      setAvatarEl(document.getElementById('profileAvatar'), avatar);

      refresh(); // top-right 버튼 emoji 갱신
      setTimeout(close, 800);

      // Supabase upsert (피드백/닫힘과 독립적으로 진행)
      try {
        await window.SB.upsertProfile({
          nickname: name, avatar: avatar, city: city || null, district: district || null, monthly_goal: goal
        });
      } catch (e) { /* fail silently — localStorage는 이미 저장됨 */ }
    });

    modal.querySelector('#apvLogout').addEventListener('click', async function () {
      if (!confirm('로그아웃 하시겠어요?')) return;
      await window.SB.signOut();
      close();
    });
  }

  // ── 첫 로그인 동기화 동의 + 재로그인 pull ──────────────────────

  function showSyncConsentDialog(userId, bookCount, sourceOwnerId) {
    if (document.getElementById('syncConsentModal')) return;
    ensureAnim();
    var modal = document.createElement('div');
    modal.id = 'syncConsentModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10001;padding:20px;animation:authFadeIn .18s ease';
    modal.innerHTML = [
      '<div style="background:#fff;border-radius:20px;padding:24px;max-width:340px;width:100%;box-shadow:0 16px 48px rgba(0,0,0,0.2);animation:authPop .22s cubic-bezier(.2,.8,.2,1);text-align:center">',
      '<div style="font-size:40px;margin-bottom:12px">☁️</div>',
      '<div style="font-size:18px;font-weight:800;color:#4A4A4A;margin-bottom:8px">서재를 클라우드에 올릴까요?</div>',
      '<div style="font-size:14px;color:#8B8B8B;line-height:1.6;margin-bottom:20px">',
      '이 기기에 <strong>' + bookCount + '권</strong>이 있어요.<br>',
      '클라우드에 올리면 다른 기기에서도<br>같은 서재를 쓸 수 있어요.',
      '</div>',
      '<p id="syncConsentError" role="alert" style="min-height:0;margin:0 0 12px;color:#b42318;font-size:12px;line-height:1.5"></p>',
      '<div style="display:flex;gap:8px">',
      '<button id="syncConsentLater" style="flex:1;padding:12px;border:1.5px solid #eee;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;background:#fff;color:#8B8B8B">나중에</button>',
      '<button id="syncConsentOk" style="flex:2;padding:12px;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;background:linear-gradient(135deg,#FF9E9E,#E8C5FF);color:#fff">올리기</button>',
      '</div>',
      '</div>'
    ].join('');
    document.body.appendChild(modal);

    modal.querySelector('#syncConsentLater').addEventListener('click', function () {
      modal.remove();
    });

    modal.querySelector('#syncConsentOk').addEventListener('click', async function () {
      var btn = modal.querySelector('#syncConsentOk');
      btn.disabled = true;
      btn.textContent = '올리는 중…';
      try {
        var upload = await window.Sync.uploadAll({ sourceOwnerId: sourceOwnerId });
        if (!upload || upload.complete !== true) throw new Error('upload');
        var booksOk = await window.Sync.pullBooks();
        var foldersOk = await window.Sync.pullFolders();
        if (booksOk !== true || foldersOk !== true) throw new Error('pull');
        localStorage.setItem('_syncUploaded_' + userId, '1');
        localStorage.removeItem('_syncLegacyGuestPending_' + userId);
        await window.Sync.flushOutbox();
        modal.remove();
      } catch (e) {
        btn.disabled = false;
        btn.textContent = '다시 시도';
        var error = modal.querySelector('#syncConsentError');
        if (error) error.textContent = '일부 데이터를 확인하지 못했어요. 서재는 이 기기에 남아 있어요. 다시 시도해 주세요.';
      }
    });
  }

  var activeSignInUser = null;
  async function handleSignIn(user) {
    if (!window.Sync || !window.Storage || activeSignInUser === user.id) return;
    activeSignInUser = user.id;
    try {
      if (typeof window.Sync.setOwner === 'function' && window.Sync.setOwner(user.id)) {
        window.location.reload();
        return;
      }
      await window.Sync.syncProfileOnSignIn();
      var uploadedKey = '_syncUploaded_' + user.id;
      var pendingGuestImport = localStorage.getItem('_syncLegacyGuestPending_' + user.id) === '1';
      var guestBooks = window.Storage.getAllBooksRaw(null);
      var guestFolders = window.Storage.getAllFoldersRaw(null);
      if (pendingGuestImport && (guestBooks.length || guestFolders.length)) {
        showSyncConsentDialog(user.id, guestBooks.length, null);
        await window.Sync.pullBooks();
        await window.Sync.pullFolders();
        return;
      }
      if (localStorage.getItem(uploadedKey)) {
        // 이미 동기화 동의한 사용자 — 조용히 pull
        try {
          await window.Sync.pullBooks();
          await window.Sync.pullFolders();
          await window.Sync.flushOutbox();
        } catch (e) { /* ignore */ }
        return;
      }
      var books = window.Storage.getAllBooks();
      var folders = window.Storage.getAllFolders();
      if (books.length || folders.length) {
        showSyncConsentDialog(user.id, books.length, user.id);
        return;
      }
      // Empty account scope: pull first and set the flag only after both reads succeed.
      var booksOk = await window.Sync.pullBooks();
      var foldersOk = await window.Sync.pullFolders();
      if (booksOk === true && foldersOk === true) {
        localStorage.setItem(uploadedKey, '1');
        await window.Sync.flushOutbox();
      }
    } finally { activeSignInUser = null; }
  }

  document.addEventListener('DOMContentLoaded', function () {
    injectHeaderProfileButton();
    if (window.SB && window.SB.enabled) {
      window.SB.onAuthChange(function (event, session) {
        refresh();
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session && session.user) {
          handleSignIn(session.user);
        }
      });
      // Session restoration can finish before DOMContentLoaded subscribes.
      window.SB.getUser().then(function (user) { if (user) return handleSignIn(user); }).catch(function () {});
    }
  });

  window.AuthUI = {
    showLoginPicker: showLoginPicker,
    showProfileViewer: showProfileViewer,
    refresh: refresh,
    isLoggedIn: isLoggedIn
  };
})();
