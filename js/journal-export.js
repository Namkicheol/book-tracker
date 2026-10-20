(function () {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const status = book => book.status === 'want' ? '읽을 책' : book.status === 'reading' ? '읽는 중' : '읽음';
  function plainReview(value) {
    const html = String(value || '').replace(/<br\s*\/?\s*>/gi, '\n').replace(/<\/(?:div|p|li)>/gi, '\n');
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    parsed.querySelectorAll('script,style,iframe,object').forEach(node => node.remove());
    return parsed.body.textContent.replace(/\n{3,}/g, '\n\n').trim();
  }
  function selectedBooks(scope) {
    return Storage.getAllBooks().filter(b => scope === 'all' || String(b.readDate || '').startsWith(scope)).sort((a,b) => String(b.readDate || '').localeCompare(String(a.readDate || '')));
  }
  function csv(books) {
    const cell = value => '"' + String(value ?? '').replace(/^[=+@\-\t\r]/, "'$&").replace(/"/g, '""') + '"';
    return '\uFEFF' + [['책 제목','지은이','읽은 날짜','상태','별점 (5점)','한줄평'], ...books.map(b => [b.title, (b.authors || []).join(', '), b.readDate || '', status(b), b.rating || '', plainReview(b.review)])].map(row => row.map(cell).join(',')).join('\r\n');
  }
  function printMarkup(books, label) {
    return `<h1>나의 독서 기록</h1><p class="journal-period">${esc(label)} · ${books.length}권</p>${books.map(b => `<article><h2>${esc(b.title)}</h2><p class="journal-meta">${esc((b.authors || []).join(', ') || '지은이 미기록')} · ${esc(b.readDate || '읽은 날짜 미기록')} · ${status(b)}</p><p class="journal-rating">별점 ${b.rating ? `${esc(b.rating)} / 5` : '미기록'}</p><p class="journal-review">${esc(plainReview(b.review) || '아직 한줄평을 남기지 않았어요.')}</p></article>`).join('')}`;
  }
  function init() {
    const root = document.getElementById('journalExport');
    if (!root) return;
    const months = [...new Set(Storage.getAllBooks().map(b => String(b.readDate || '').slice(0,7)).filter(d => /^\d{4}-\d{2}$/.test(d)))].sort().reverse();
    root.innerHTML = `<span class="section-eyebrow">READING JOURNAL</span><h2>독서 기록을 간직해요</h2><p>책 제목, 읽은 날짜, 별점과 한줄평을 한 장의 기록으로.</p><label for="journalScope">기록 기간</label><select id="journalScope"><option value="all">전체 기록</option>${months.map(m => `<option value="${m}">${m.replace('-', '년 ')}월</option>`).join('')}</select><p id="journalCount" role="status"></p><div class="journal-actions"><button type="button" id="journalPrint">인쇄 / PDF 저장</button><button type="button" id="journalCsv">표 파일 (CSV)</button></div><p class="journal-help">PDF는 인쇄 화면에서 ‘PDF로 저장’을 선택해요. 이름·학교·프로필 정보는 포함하지 않아요.</p>`;
    const select = root.querySelector('select');
    function update() {
      const count = selectedBooks(select.value).length;
      root.querySelector('#journalCount').textContent = count ? `${count}권의 기록을 내보낼 수 있어요.` : '아직 기록이 없어요. 책을 추가하면 여기서 간직할 수 있어요.';
      root.querySelectorAll('button').forEach(b => b.disabled = count === 0);
    }
    select.addEventListener('change', update);
    update();
    root.querySelector('#journalCsv').addEventListener('click', () => {
      const blob = new Blob([csv(selectedBooks(select.value))], { type:'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `독서기록-${select.value}.csv`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    root.querySelector('#journalPrint').addEventListener('click', () => {
      document.getElementById('journalPrintPage')?.remove();
      const page = document.createElement('section'); page.id = 'journalPrintPage';
      page.innerHTML = printMarkup(selectedBooks(select.value), select.selectedOptions[0].textContent);
      document.body.appendChild(page); window.print();
    });
    window.addEventListener('afterprint', () => document.getElementById('journalPrintPage')?.remove());
  }
  window.ReadingJournal = { csv, printMarkup, selectedBooks, plainReview };
  document.addEventListener('DOMContentLoaded', init);
})();
