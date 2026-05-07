/**
 * 다크모드 토글 — localStorage 'momsbooks.theme' ('light'|'dark')
 * 기기 설정 자동 감지 + 수동 전환 버튼 주입
 */
(function () {
  'use strict';

  const KEY = 'momsbooks.theme';

  function getPreferred() {
    const saved = localStorage.getItem(KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function apply(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(KEY, theme);
    const btn = document.getElementById('themeToggleBtn');
    if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  // Apply immediately (before paint) to avoid flash
  apply(getPreferred());

  document.addEventListener('DOMContentLoaded', function () {
    // Inject floating toggle button
    const btn = document.createElement('button');
    btn.id = 'themeToggleBtn';
    btn.setAttribute('aria-label', '다크모드 전환');
    btn.textContent = getPreferred() === 'dark' ? '☀️' : '🌙';
    btn.style.cssText = [
      'position:fixed',
      'bottom:calc(var(--nav-h) + env(safe-area-inset-bottom,0px) + 14px)',
      'right:14px',
      'z-index:190',
      'width:36px',
      'height:36px',
      'border-radius:50%',
      'background:var(--bg-paper)',
      'border:1.5px solid var(--border)',
      'box-shadow:0 2px 8px var(--shadow)',
      'font-size:17px',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'cursor:pointer',
      'transition:transform 0.15s,box-shadow 0.15s',
      'line-height:1',
      'padding:0',
    ].join(';');

    btn.addEventListener('click', function () {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      apply(next);
      btn.style.transform = 'scale(1.2)';
      setTimeout(() => { btn.style.transform = ''; }, 160);
    });

    document.body.appendChild(btn);

    // Follow system changes if user hasn't set a manual preference
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
      if (!localStorage.getItem(KEY)) apply(e.matches ? 'dark' : 'light');
    });
  });
})();
