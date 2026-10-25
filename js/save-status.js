/* Small account-aware save status shared by library screens. */
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('.page-header');
    if (!header || !window.Sync) return;
    const region = document.createElement('div');
    region.style.cssText = 'padding:8px 20px;text-align:right;font-size:12px;color:#876772;background:#fff8fa';
    const message = document.createElement('span');
    message.setAttribute('role', 'status');
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.textContent = '다시 저장';
    retry.style.cssText = 'margin-left:10px;border:1px solid #edced8;border-radius:12px;padding:5px 10px;color:#8e5368;background:#fff;font:inherit';
    retry.hidden = true;
    region.append(message, retry);
    header.after(region);
    const render = detail => {
      const state = detail?.state || 'local';
      const labels = { local: '이 기기에 저장돼요', ready: '계정 연결됨', saving: '계정에 저장 중…', pending: '기기에 저장됨 · 계정 저장 대기', saved: '계정에 저장 완료', error: '저장하지 못했어요. 다시 시도해 주세요.' };
      message.textContent = labels[state] || labels.local;
      // Local storage failures require repeating the original edit, not outbox replay.
      retry.hidden = state !== 'pending';
      retry.disabled = state === 'saving';
    };
    retry.addEventListener('click', () => window.Sync.flushOutbox());
    window.addEventListener('sync-status', event => render(event.detail));
    render(window.Sync.getSaveStatus());
  });
})();
