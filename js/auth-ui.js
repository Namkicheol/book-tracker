/**
 * 공통 auth UI — 우측상단 원형 프로필 버튼 + 로그인 모달 + 프로필 뷰어
 *
 * 의존: js/supabase.js (window.SB)
 *
 * 동작:
 *  - SB.enabled가 false면 조용히 비활성
 *  - 모든 페이지 우측상단에 40px 원형 버튼 자동 주입
 *    · 로그아웃: 로그인 화살표 → 클릭 시 로그인 모달
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

  var BENEFITS = [
    '☁️ 어떤 기기에서도 같은 프로필·목표',
    '📚 폰·태블릿 서재 자동 동기화 <span style="color:#FF9E9E;font-weight:700">(곧)</span>',
    '🏆 다른 엄마들과 독서 랭킹 비교 <span style="color:#FF9E9E;font-weight:700">(곧)</span>',
    '👀 다른 엄마의 서재도 확인할 수 있어요 <span style="color:#FF9E9E;font-weight:700">(곧)</span>',
    '⭐ 우리반·또래 친구들의 인기책 둘러보기 <span style="color:#FF9E9E;font-weight:700">(곧)</span>'
  ];

  var AVATAR_EMOJIS = [
    '👩','🧑','👨','👧','👦','🧑‍🎓','👩‍🎓','👨‍🎓','🦊','🐰',
    '🐱','🐶','🐻','🐼','🐯','🦁','🐨','🐸','🐧','🦄'
  ];

  function svgLogIn() {
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>';
  }

  function ensureAnim() {
    if (document.getElementById('authUiAnim')) return;
    var st = document.createElement('style');
    st.id = 'authUiAnim';
    st.textContent = '@keyframes authFadeIn{from{opacity:0}to{opacity:1}}@keyframes authPop{from{opacity:0;transform:translateY(20px) scale(.96)}to{opacity:1;transform:none}}';
    document.head.appendChild(st);
  }

  function injectTopRightCircle() {
    if (!window.SB || !window.SB.enabled) return;
    if (document.getElementById('authBtnGlobal')) return;

    var btn = document.createElement('button');
    btn.id = 'authBtnGlobal';
    btn.type = 'button';
    btn.title = '로그인';
    btn.setAttribute('aria-label', '로그인');
    btn.innerHTML = svgLogIn();
    btn.style.cssText = [
      'position:fixed', 'top:14px', 'right:14px',
      'width:40px', 'height:40px',
      'border-radius:50%',
      'border:2px solid #fff',
      'background:linear-gradient(135deg,#FF9E9E,#E8C5FF)',
      'color:#fff',
      'box-shadow:0 4px 14px rgba(255,158,158,0.35)',
      'cursor:pointer',
      'display:flex', 'align-items:center', 'justify-content:center',
      'z-index:990',
      'font-size:20px',
      'transition:transform .15s ease',
      'padding:0'
    ].join(';');

    btn.addEventListener('mouseenter', function () { btn.style.transform = 'scale(1.08)'; });
    btn.addEventListener('mouseleave', function () { btn.style.transform = 'scale(1)'; });
    btn.addEventListener('click', onClick);

    document.body.appendChild(btn);
    refresh();
  }

  async function refresh() {
    var btn = document.getElementById('authBtnGlobal');
    if (!btn) return;
    if (!window.SB || !window.SB.enabled) { btn.style.display = 'none'; return; }

    var sess = await window.SB.getSession();
    var user = sess && sess.user ? sess.user : null;
    if (user) {
      btn.title = '내 프로필';
      var emoji = localStorage.getItem('profileAvatar') || '👩';
      btn.innerHTML = '<span style="font-size:20px;line-height:1">' + emoji + '</span>';
    } else {
      btn.title = '로그인';
      btn.innerHTML = svgLogIn();
    }
    // share.html 헤더의 #authBtn은 share.js가 별도로 관리
  }

  async function isLoggedIn() {
    if (!window.SB || !window.SB.enabled) return false;
    var s = await window.SB.getSession();
    return !!(s && s.user);
  }

  async function onClick() {
    var sess = window.SB ? await window.SB.getSession() : null;
    if (sess && sess.user) {
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

    var sess = await window.SB.getSession();
    if (!sess || !sess.user) { showLoginPicker(); return; }

    var meta = sess.user.user_metadata || {};
    var provider = (sess.user.app_metadata && sess.user.app_metadata.provider) || '';
    var importedName = meta.name || meta.full_name || meta.nickname || meta.preferred_username || '';
    var providerLabel = provider === 'kakao' ? '💬 카카오 계정'
                      : provider === 'google' ? '🅖 구글 계정'
                      : '☁️ 연결된 계정';
    var providerImportLabel = provider === 'kakao' ? '💬 카카오 프로필 가져오기'
                            : provider === 'google' ? '🅖 구글 프로필 가져오기'
                            : '☁️ 계정 프로필 가져오기';

    var cur = {
      name:   localStorage.getItem('profileName')   || importedName || '책읽는엄마',
      grade:  localStorage.getItem('profileGrade')  || '초5',
      region: localStorage.getItem('profileRegion') || '강남구',
      goal:   parseInt(localStorage.getItem('monthlyGoal') || '20', 10) || 20,
      avatar: localStorage.getItem('profileAvatar') || '👩'
    };
    var grades = ['초1','초2','초3','초4','초5','초6','중1','중2','중3','고1','고2','고3','기타'];

    var modal = document.createElement('div');
    modal.id = 'authProfileModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:flex-start;justify-content:center;z-index:10000;padding:20px;overflow-y:auto;animation:authFadeIn .18s ease';

    modal.innerHTML = [
      '<div style="background:#fff;border-radius:20px;padding:22px;max-width:380px;width:100%;margin:auto;box-shadow:0 16px 48px rgba(0,0,0,0.2);animation:authPop .22s cubic-bezier(.2,.8,.2,1)">',

      // 헤더 — avatar + 이름 + provider badge
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">',
      '<div style="display:flex;align-items:center;gap:12px">',
      '<div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#FFE0EC,#FFD1DC);display:flex;align-items:center;justify-content:center;font-size:30px;border:3px solid #fff;box-shadow:0 4px 12px rgba(255,158,158,0.3)" id="apvAvatarShow">' + cur.avatar + '</div>',
      '<div>',
      '<div style="font-size:18px;font-weight:800;color:#4A4A4A" id="apvNameShow">' + htmlEscape(cur.name) + '</div>',
      '<div style="font-size:11px;color:#8B8B8B;margin-top:3px">' + providerLabel + '</div>',
      '</div></div>',
      '<button id="apvClose" style="background:none;border:none;font-size:22px;cursor:pointer;color:#8B8B8B;padding:0;line-height:1" aria-label="닫기">×</button>',
      '</div>',

      // 1. 카카오/구글 프로필 가져오기 — 상단
      importedName ?
        '<button type="button" id="apvImport" style="width:100%;padding:12px;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;background:' + (provider === 'kakao' ? '#FEE500' : '#fff') + ';color:#3C1E1E;border:' + (provider === 'kakao' ? 'none' : '1.5px solid #e0e0e0') + ';margin-bottom:16px">' +
        providerImportLabel + ' (닉네임: ' + htmlEscape(importedName) + ')</button>'
        : '',

      // 2. 입력 필드들
      '<div style="display:flex;flex-direction:column;gap:12px">',
      '<label style="display:flex;flex-direction:column;gap:6px"><span style="font-size:12px;font-weight:700;color:#8B8B8B">닉네임</span>',
      '<input id="apvName" type="text" value="' + htmlEscape(cur.name) + '" maxlength="20" style="padding:10px 12px;border:1.5px solid #eee;border-radius:10px;font-size:14px;background:#fff"></label>',
      '<label style="display:flex;flex-direction:column;gap:6px"><span style="font-size:12px;font-weight:700;color:#8B8B8B">학년</span>',
      '<select id="apvGrade" style="padding:10px 12px;border:1.5px solid #eee;border-radius:10px;font-size:14px;background:#fff">',
      grades.map(function (g) { return '<option value="' + g + '"' + (g === cur.grade ? ' selected' : '') + '>' + g + '</option>'; }).join(''),
      '</select></label>',
      '<label style="display:flex;flex-direction:column;gap:6px"><span style="font-size:12px;font-weight:700;color:#8B8B8B">지역 (예: 강남구, 분당)</span>',
      '<input id="apvRegion" type="text" value="' + htmlEscape(cur.region) + '" maxlength="20" style="padding:10px 12px;border:1.5px solid #eee;border-radius:10px;font-size:14px;background:#fff"></label>',
      '<label style="display:flex;flex-direction:column;gap:6px"><span style="font-size:12px;font-weight:700;color:#8B8B8B">이번 달 목표 (권)</span>',
      '<input id="apvGoal" type="number" min="1" max="200" value="' + cur.goal + '" style="padding:10px 12px;border:1.5px solid #eee;border-radius:10px;font-size:14px;background:#fff"></label>',
      '</div>',

      // 3. 이모티콘 아바타 선택 — 하단
      '<details style="margin-top:16px;border:1.5px solid #eee;border-radius:12px;padding:12px">',
      '<summary style="cursor:pointer;font-size:13px;font-weight:700;color:#8B8B8B;list-style:none;display:flex;justify-content:space-between;align-items:center">',
      '<span>아바타 이모티콘 변경</span>',
      '<span id="apvAvatarPreview" style="font-size:22px">' + cur.avatar + '</span>',
      '</summary>',
      '<div id="apvAvatarGrid" style="display:grid;grid-template-columns:repeat(8,1fr);gap:6px;margin-top:12px"></div>',
      '</details>',

      // 4. 액션 버튼들
      '<div style="display:flex;gap:8px;margin-top:18px">',
      '<button id="apvSave" type="button" style="flex:2;padding:12px;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;background:linear-gradient(135deg,#FF9E9E,#E8C5FF);color:#fff">저장</button>',
      '<button id="apvCancel" type="button" style="flex:1;padding:12px;border:1.5px solid #eee;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;background:#fff;color:#8B8B8B">취소</button>',
      '</div>',

      // 5. 로그아웃 — 맨 아래
      '<button id="apvLogout" type="button" style="width:100%;margin-top:10px;padding:10px;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;background:transparent;color:#bbb">',
      '🚪 로그아웃',
      '</button>',

      '</div>'
    ].join('');

    document.body.appendChild(modal);

    // 아바타 이모티콘 그리드 채우기
    var grid = modal.querySelector('#apvAvatarGrid');
    AVATAR_EMOJIS.forEach(function (emo) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = emo;
      b.style.cssText = 'padding:8px;border:1.5px solid ' + (emo === cur.avatar ? '#FF9E9E' : 'transparent') + ';border-radius:10px;font-size:22px;cursor:pointer;background:' + (emo === cur.avatar ? '#FFE0EC' : '#fff');
      b.addEventListener('click', function () {
        cur.avatar = emo;
        grid.querySelectorAll('button').forEach(function (x) {
          x.style.borderColor = 'transparent';
          x.style.background = '#fff';
        });
        b.style.borderColor = '#FF9E9E';
        b.style.background = '#FFE0EC';
        modal.querySelector('#apvAvatarPreview').textContent = emo;
        modal.querySelector('#apvAvatarShow').textContent = emo;
      });
      grid.appendChild(b);
    });

    function close() { modal.remove(); }
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
    modal.querySelector('#apvClose').addEventListener('click', close);
    modal.querySelector('#apvCancel').addEventListener('click', close);

    // 카카오 프로필 가져오기 → 닉네임 input에 채우기
    var importBtn = modal.querySelector('#apvImport');
    if (importBtn) {
      importBtn.addEventListener('click', function () {
        modal.querySelector('#apvName').value = importedName;
        modal.querySelector('#apvNameShow').textContent = importedName;
      });
    }

    modal.querySelector('#apvSave').addEventListener('click', async function () {
      var name   = modal.querySelector('#apvName').value.trim() || cur.name;
      var grade  = modal.querySelector('#apvGrade').value;
      var region = modal.querySelector('#apvRegion').value.trim() || cur.region;
      var goal   = Math.max(1, parseInt(modal.querySelector('#apvGoal').value, 10) || cur.goal);
      var avatar = cur.avatar;

      localStorage.setItem('profileName',   name);
      localStorage.setItem('profileGrade',  grade);
      localStorage.setItem('profileRegion', region);
      localStorage.setItem('monthlyGoal',   String(goal));
      localStorage.setItem('profileAvatar', avatar);

      // share.html DOM에도 즉시 반영 (페이지에 있을 때만)
      ['profileName','profileGrade','profileRegion','profileAvatar'].forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        el.textContent = id === 'profileName' ? name
                       : id === 'profileGrade' ? grade
                       : id === 'profileRegion' ? region
                       : avatar;
      });

      // Supabase upsert
      try {
        await window.SB.upsertProfile({
          nickname: name, avatar: avatar, grade: grade, region: region, monthly_goal: goal
        });
      } catch (e) { /* fail silently — localStorage는 이미 저장됨 */ }

      close();
      refresh(); // top-right 버튼 emoji 갱신
    });

    modal.querySelector('#apvLogout').addEventListener('click', async function () {
      if (!confirm('로그아웃 하시겠어요?')) return;
      await window.SB.signOut();
      close();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    injectTopRightCircle();
    if (window.SB && window.SB.enabled) {
      window.SB.onAuthChange(function () { refresh(); });
    }
  });

  window.AuthUI = {
    showLoginPicker: showLoginPicker,
    showProfileViewer: showProfileViewer,
    refresh: refresh,
    isLoggedIn: isLoggedIn
  };
})();
