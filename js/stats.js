/**
 * 독서 통계 — Storage 데이터 기반 4개 카드 + 월별/폴더별 차트.
 */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', render);

  function render() {
    const books = Storage.getAllBooks();
    const folders = (typeof Storage.getAllFolders === 'function') ? Storage.getAllFolders() : [];

    if (books.length === 0) {
      document.getElementById('statsEmpty')?.classList.remove('hidden');
      // 차트 영역도 숨김
      document.querySelectorAll('.chart-card').forEach(el => el.style.display = 'none');
      return;
    }

    renderTopCards(books, folders);
    renderMonthlyChart(books);
    renderFolderChart(books, folders);
  }

  function readDateOf(book) {
    return book.readDate || (book.createdAt ? book.createdAt.slice(0, 10) : null);
  }

  function renderTopCards(books, folders) {
    const total = books.length;
    document.getElementById('totalBooks').textContent = total;

    const now = new Date();
    const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const thisMonth = books.filter(b => {
      const d = readDateOf(b);
      return d && d.startsWith(thisMonthKey);
    }).length;
    document.getElementById('thisMonthBooks').textContent = thisMonth;

    const ratings = books.map(b => Number(b.rating || 0)).filter(r => r > 0);
    const avg = ratings.length
      ? (ratings.reduce((a, b) => a + b, 0) / ratings.length)
      : null;
    document.getElementById('avgRating').textContent = avg !== null ? avg.toFixed(1) : '—';

    document.getElementById('totalFolders').textContent = folders.length;
  }

  function renderMonthlyChart(books) {
    const canvas = document.getElementById('monthlyChart');
    if (!canvas || !window.Chart) return;

    // 최근 12개월
    const now = new Date();
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: `${d.getMonth() + 1}월`,
        count: 0,
      });
    }
    const byKey = Object.fromEntries(months.map(m => [m.key, m]));
    books.forEach(b => {
      const d = readDateOf(b);
      if (!d) return;
      const k = d.slice(0, 7);
      if (byKey[k]) byKey[k].count++;
    });

    new Chart(canvas, {
      type: 'bar',
      data: {
        labels: months.map(m => m.label),
        datasets: [{
          data: months.map(m => m.count),
          backgroundColor: '#8b6f47',
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
          y: { beginAtZero: true, ticks: { precision: 0, font: { size: 11 } } },
        },
      },
    });
  }

  function renderFolderChart(books, folders) {
    const canvas = document.getElementById('genreChart');
    if (!canvas || !window.Chart) return;

    if (folders.length === 0) {
      canvas.parentElement.style.display = 'none';
      return;
    }

    const counts = folders.map(f => ({
      name: f.name,
      count: books.filter(b => Array.isArray(b.folders) && b.folders.includes(f.id)).length,
    }));
    const uncategorized = books.filter(b => !Array.isArray(b.folders) || b.folders.length === 0).length;
    if (uncategorized > 0) counts.push({ name: '미분류', count: uncategorized });

    const palette = ['#c47c5a', '#8b6f47', '#a8956d', '#6f8b7a', '#9b8bb8', '#d4a574', '#7a8b6f'];
    new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: counts.map(c => c.name),
        datasets: [{
          data: counts.map(c => c.count),
          backgroundColor: counts.map((_, i) => palette[i % palette.length]),
          borderWidth: 2,
          borderColor: '#fff',
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 12 }, padding: 12 } },
        },
      },
    });
  }
})();
