/**
 * 공통 auth UI — 모든 페이지에 floating 로그인 버튼 자동 주입 + 혜택 안내 모달
 *
 * 의존: js/supabase.js (window.SB)
 *
 * 동작:
 *  - SB.enabled가 false면 조용히 비활성 (버튼 미표시)
 *  - 페이지 헤더에 이미 #authBtn(share.html)이 있으면 floating 버튼 skip
 *  - 로그아웃 상태 → 🔑 / 로그인 상태 → 👤 (이름 첫 글자 pill)
 *  - 클릭 → 로그인 모달(혜택 4개) 또는 로그아웃 confirm
 *
 * window.AuthUI:
 *   AuthUI.showLoginPicker()  외부에서 호출 가능
 *   AuthUI.refresh()          버튼 상태 강제 갱신
 *   AuthUI.isLoggedIn()       Promise<boolean>
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

  function svgLogIn() {
    return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>';
  }
  function svgUser() {
    return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  }

  function injectFloatingButton() {
    if (!window.SB || !window.SB.enabled) return;
    if (document.getElementById('authBtnGlobal')) return;
    // share.html은 헤더에 자체 #authBtn이 있지만, 모든 페이지에 동일하게 floating CTA 노출 — 중복 허용

    var btn = document.createElement('button');
    btn.id = 'authBtnGlobal';
    btn.type = 'button';
    btn.title = '로그인';
    btn.setAttribute('aria-label', '로그인');
    btn.innerHTML = svgLogIn();
    btn.style.cssText = [
      'position:fixed', 'right:16px', 'bottom:84px',
      'width:48px', 'height:48px',
      'border-radius:50%', 'border:none',
      'background:linear-gradient(135deg,#FF9E9E,#E8C5FF)',
      'color:#fff',
      'box-shadow:0 6px 20px rgba(255,158,158,0.4)',
      'cursor:pointer',
      'display:flex', 'align-items:center', 'justify-content:center',
      'z-index:990',
      'transition:transform .15s ease'
    ].join(';');

    btn.addEventListener('mouseenter', function () { btn.style.transform = 'scale(1.08)'; });
    btn.addEventListener('mouseleave', function () { btn.style.transform = 'scale(1)'; });
    btn.addEventListener('click', onClick);

    document.body.appendChild(btn);
    refresh();
  }

  async function refresh() {
    var btn = document.getElementById('authBtnGlobal') || document.getElementById('authBtn');
    if (!btn) return;
    if (!window.SB || !window.SB.enabled) { btn.style.display = 'none'; return; }

    var sess = await window.SB.getSession();
    var user = sess && sess.user ? sess.user : null;
    if (user) {
      btn.title = '내 계정 (로그아웃)';
      btn.innerHTML = svgUser();
    } else {
      btn.title = '로그인';
      btn.innerHTML = svgLogIn();
    }
  }

  async function isLoggedIn() {
    if (!window.SB || !window.SB.enabled) return false;
    var s = await window.SB.getSession();
    return !!(s && s.user);
  }

  async function onClick() {
    var sess = window.SB ? await window.SB.getSession() : null;
    if (sess && sess.user) {
      if (confirm('로그아웃 하시겠어요?')) await window.SB.signOut();
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

    var modal = document.createElement('div');
    modal.id = 'authLoginModal';
    modal.style.cssText = [
      'position:fixed', 'inset:0',
      'background:rgba(0,0,0,0.5)',
      'display:flex', 'align-items:center', 'justify-content:center',
      'z-index:10000', 'padding:20px',
      'animation:authFadeIn .18s ease'
    ].join(';');

    if (!document.getElementById('authUiAnim')) {
      var st = document.createElement('style');
      st.id = 'authUiAnim';
      st.textContent = '@keyframes authFadeIn{from{opacity:0}to{opacity:1}}@keyframes authPop{from{opacity:0;transform:translateY(20px) scale(.96)}to{opacity:1;transform:none}}';
      document.head.appendChild(st);
    }

    modal.innerHTML = [
      '<div style="background:#fff;border-radius:20px;padding:22px;max-width:360px;width:100%;',
      'box-shadow:0 16px 48px rgba(0,0,0,0.2);animation:authPop .22s cubic-bezier(.2,.8,.2,1)">',

      '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">',
      '<div>',
      '<div style="font-size:20px;font-weight:800;color:#4A4A4A">맘스북스에 로그인</div>',
      '<div style="font-size:12px;color:#8B8B8B;margin-top:4px">기록은 그대로, 더 많은 기능이 열려요</div>',
      '</div>',
      '<button id="authModalClose" style="background:none;border:none;font-size:22px;cursor:pointer;color:#8B8B8B;padding:0;line-height:1" aria-label="닫기">×</button>',
      '</div>',

      '<ul style="list-style:none;padding:14px;margin:0 0 16px 0;display:flex;flex-direction:column;gap:9px;',
      'background:linear-gradient(135deg,#FFF8F0,#FFE8F0);border-radius:14px">',
      BENEFITS.map(function (b) {
        return '<li style="font-size:13px;color:#4A4A4A;line-height:1.55">' + b + '</li>';
      }).join(''),
      '</ul>',

      '<div style="display:flex;flex-direction:column;gap:10px">',
      '<button id="authLoginKakao" type="button" ',
      'style="padding:14px;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;background:#FEE500;color:#3C1E1E;display:flex;align-items:center;justify-content:center;gap:8px">',
      '<span style="font-size:17px">💬</span> 카카오로 시작하기',
      '</button>',
      '<button id="authLoginGoogle" type="button" ',
      'style="padding:14px;border:1.5px solid #e0e0e0;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;background:#fff;color:#333;display:flex;align-items:center;justify-content:center;gap:8px">',
      '<span style="color:#4285F4;font-weight:900;font-size:17px">G</span> 구글로 시작하기',
      '</button>',
      '</div>',

      '<div style="margin-top:14px;font-size:11px;color:#999;text-align:center;line-height:1.5">',
      '이미 등록한 책·폴더는 그대로 유지되고<br>로그인 시 다른 기기와 자동 연결돼요',
      '</div>',

      '</div>'
    ].join('');

    document.body.appendChild(modal);

    function close() { modal.remove(); }
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
    modal.querySelector('#authModalClose').addEventListener('click', close);
    modal.querySelector('#authLoginKakao').addEventListener('click', function () {
      window.SB.signInWithKakao();
    });
    modal.querySelector('#authLoginGoogle').addEventListener('click', function () {
      window.SB.signInWithGoogle();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    injectFloatingButton();
    if (window.SB && window.SB.enabled) {
      window.SB.onAuthChange(function () { refresh(); });
    }
  });

  window.AuthUI = {
    showLoginPicker: showLoginPicker,
    refresh: refresh,
    isLoggedIn: isLoggedIn
  };
})();
