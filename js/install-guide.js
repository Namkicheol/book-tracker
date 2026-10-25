/* Optional home-screen installation. Never prompts without a button click. */
(function () {
  'use strict';
  let deferredPrompt = null;
  let installed = false;
  let button, status, instructions;
  const displayMode = window.matchMedia('(display-mode: standalone)');

  function isInstalled() {
    return installed || displayMode.matches || navigator.standalone === true;
  }
  function render() {
    if (!button) return;
    const ready = isInstalled();
    button.hidden = ready || !deferredPrompt;
    instructions.hidden = ready;
    if (ready) status.textContent = '홈 화면 앱으로 사용 중이에요.';
  }
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
    render();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    deferredPrompt = null;
    render();
    if (status) status.textContent = '홈 화면에 추가됐어요.';
  });
  displayMode.addEventListener?.('change', render);

  document.addEventListener('DOMContentLoaded', () => {
    button = document.getElementById('installAppBtn');
    status = document.getElementById('installStatus');
    instructions = document.getElementById('installInstructions');
    if (!button || !status || !instructions) return;
    render();
    button.addEventListener('click', async () => {
      const prompt = deferredPrompt;
      if (!prompt || isInstalled()) return;
      deferredPrompt = null;
      button.disabled = true;
      try {
        await prompt.prompt();
        const choice = await prompt.userChoice;
        if (!isInstalled()) status.textContent = choice.outcome === 'accepted'
          ? '설치를 요청했어요. 홈 화면을 확인해 주세요.'
          : '나중에 아래 안내를 따라 추가할 수 있어요.';
      } catch (_) {
        if (!isInstalled()) status.textContent = '설치 창을 열지 못했어요. 아래 브라우저 안내를 이용해 주세요.';
      } finally {
        button.disabled = false;
        render();
      }
    });
  });
})();
