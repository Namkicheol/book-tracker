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
    // 핑크 밝음 모드가 기본 — 시스템 다크모드는 따라가지 않음
    return 'light';
  }

  function apply(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(KEY, theme);
    const btn = document.getElementById('themeToggleBtn');
    if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  // Apply immediately (before paint) to avoid flash
  apply(getPreferred());
})();
