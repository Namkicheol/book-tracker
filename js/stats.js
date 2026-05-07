/**
 * 독서 통계 — Storage 데이터 기반 4개 카드 + 월별/폴더별 차트 + 캘린더 + 스트릭.
 */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', render);

  function render() {
    const books = Storage.getAllBooks();
    const folders = (typeof Storage.getAllFolders === 'function') ? Storage.getAllFolders() : [];

    if (books.length === 0) {
      document.getElementById('statsEmpty')?.classList.remove('hidden');
      document.querySelectorAll('.chart-card').forEach(el => el.style.display = 'none');
      return;
    }

    renderTopCards(books, folders);
    renderStatusCards(books);
    renderMonthlyReport(books, folders);
    renderMonthlyChart(books);
    renderFolderChart(books, folders);
    renderStreak(books);
    renderCalendarView(books);
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

  function renderStatusCards(books) {
    const wantEl    = document.getElementById('statusWant');
    const readingEl = document.getElementById('statusReading');
    const readEl    = document.getElementById('statusRead');
    if (!wantEl) return;
    wantEl.textContent    = books.filter(b => b.status === 'want').length;
    readingEl.textContent = books.filter(b => b.status === 'reading').length;
    readEl.textContent    = books.filter(b => !b.status).length;
  }

  // ── Monthly Report ────────────────────────────────────────────

  function renderMonthlyReport(books, folders) {
    const el = document.getElementById('monthlyReport');
    if (!el) return;

    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth();
    const thisKey  = `${y}-${String(m + 1).padStart(2,'0')}`;
    const lastKey  = m === 0
      ? `${y - 1}-12`
      : `${y}-${String(m).padStart(2,'0')}`;

    const thisMonthBooks = books.filter(b => readDateOf(b)?.startsWith(thisKey));
    const lastMonthBooks = books.filter(b => readDateOf(b)?.startsWith(lastKey));

    if (thisMonthBooks.length === 0 && lastMonthBooks.length === 0) {
      el.style.display = 'none';
      return;
    }

    // Month vs last month delta
    const delta = thisMonthBooks.length - lastMonthBooks.length;
    const deltaText = delta === 0 ? '지난달과 동일' :
      delta > 0 ? `지난달보다 ${delta}권 더 읽었어요 📈` :
                  `지난달보다 ${Math.abs(delta)}권 적어요 📉`;

    // Best day of week this month
    const dowCounts = [0,0,0,0,0,0,0];
    const dowNames = ['일','월','화','수','목','금','토'];
    thisMonthBooks.forEach(b => {
      const d = readDateOf(b);
      if (!d) return;
      const dow = new Date(d).getDay();
      dowCounts[dow]++;
    });
    const maxDow = dowCounts.indexOf(Math.max(...dowCounts));
    const bestDowText = dowCounts[maxDow] > 0 ? `${dowNames[maxDow]}요일 (${dowCounts[maxDow]}권)` : '—';

    // Most read folder/genre this month
    let topFolder = null;
    if (folders.length > 0) {
      const fCounts = folders.map(f => ({
        name: f.emoji ? `${f.emoji} ${f.name}` : f.name,
        count: thisMonthBooks.filter(b => (b.folders||[]).includes(f.id)).length,
      })).filter(f => f.count > 0);
      if (fCounts.length > 0) {
        fCounts.sort((a, b) => b.count - a.count);
        topFolder = `${fCounts[0].name} (${fCounts[0].count}권)`;
      }
    }

    // Avg rating this month
    const monthRatings = thisMonthBooks.map(b => Number(b.rating || 0)).filter(r => r > 0);
    const monthAvg = monthRatings.length
      ? (monthRatings.reduce((s, r) => s + r, 0) / monthRatings.length).toFixed(1)
      : null;

    // Highest rated book this month
    const topBook = thisMonthBooks
      .filter(b => b.rating > 0)
      .sort((a, b) => b.rating - a.rating)[0];

    const monthName = `${m + 1}월`;

    el.innerHTML = `
      <p class="section-eyebrow">Monthly Report</p>
      <p class="section-title">${monthName} 독서 리포트</p>

      <div class="report-delta">${deltaText}</div>

      <div class="report-grid">
        <div class="report-item">
          <div class="report-icon">📅</div>
          <div class="report-body">
            <div class="report-label">가장 많이 읽은 요일</div>
            <div class="report-value">${bestDowText}</div>
          </div>
        </div>
        ${topFolder ? `<div class="report-item">
          <div class="report-icon">📂</div>
          <div class="report-body">
            <div class="report-label">이번 달 주력 폴더</div>
            <div class="report-value">${topFolder}</div>
          </div>
        </div>` : ''}
        ${monthAvg ? `<div class="report-item">
          <div class="report-icon">⭐</div>
          <div class="report-body">
            <div class="report-label">이번 달 평균 별점</div>
            <div class="report-value">${monthAvg}점</div>
          </div>
        </div>` : ''}
        ${topBook ? `<div class="report-item">
          <div class="report-icon">🏆</div>
          <div class="report-body">
            <div class="report-label">이번 달 최고 책</div>
            <div class="report-value" style="font-size:12px;line-height:1.3">${topBook.title}</div>
          </div>
        </div>` : ''}
      </div>
    `;
    el.style.display = 'block';
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

  // ── Streak ────────────────────────────────────────────────────

  function renderStreak(books) {
    const row = document.getElementById('streakRow');
    if (!row) return;

    // Collect all unique read dates (YYYY-MM-DD) that have a book
    const dateBooksMap = {};
    books.forEach(b => {
      const d = readDateOf(b);
      if (!d) return;
      const key = d.slice(0, 10);
      if (!dateBooksMap[key]) dateBooksMap[key] = [];
      dateBooksMap[key].push(b);
    });

    const allDates = Object.keys(dateBooksMap).sort();
    if (allDates.length === 0) return;

    // Current streak (consecutive days ending today or yesterday)
    const todayStr = new Date().toISOString().slice(0, 10);
    let currentStreak = 0;
    let cursor = new Date(todayStr);
    while (true) {
      const key = cursor.toISOString().slice(0, 10);
      if (dateBooksMap[key]) {
        currentStreak++;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        // Allow yesterday as "active" start — if today has no entry, check if yesterday does
        if (currentStreak === 0) {
          cursor.setDate(cursor.getDate() - 1);
          const yKey = cursor.toISOString().slice(0, 10);
          if (dateBooksMap[yKey]) {
            currentStreak++;
            cursor.setDate(cursor.getDate() - 1);
            continue;
          }
        }
        break;
      }
    }

    // Best streak (all-time)
    let bestStreak = 0;
    let runStreak = 1;
    for (let i = 1; i < allDates.length; i++) {
      const prev = new Date(allDates[i - 1]);
      const cur  = new Date(allDates[i]);
      const diff = (cur - prev) / 86400000;
      if (diff === 1) {
        runStreak++;
        bestStreak = Math.max(bestStreak, runStreak);
      } else {
        runStreak = 1;
      }
    }
    bestStreak = Math.max(bestStreak, currentStreak, 1);

    // Total days with reading this year
    const thisYear = new Date().getFullYear();
    const totalDaysThisYear = allDates.filter(d => d.startsWith(String(thisYear))).length;

    document.getElementById('streakCurrent').textContent = currentStreak;
    document.getElementById('streakBest').textContent = bestStreak;
    document.getElementById('streakTotal').textContent = totalDaysThisYear;

    const emoji = currentStreak >= 30 ? '🔥🔥🔥' : currentStreak >= 14 ? '🔥🔥' : currentStreak >= 7 ? '🔥' : currentStreak >= 3 ? '✨' : '📚';
    document.getElementById('streakEmoji').textContent = emoji + ' ' + (currentStreak >= 7 ? '대단해요!' : currentStreak >= 3 ? '잘하고 있어요!' : '');

    row.style.display = 'flex';
  }

  // ── Calendar View ─────────────────────────────────────────────

  let _calState = { year: null, month: null, books: [] };

  function renderCalendarView(books) {
    const now = new Date();
    _calState = { year: now.getFullYear(), month: now.getMonth(), books };
    _buildCalendar();

    document.getElementById('calPrev')?.addEventListener('click', () => {
      _calState.month--;
      if (_calState.month < 0) { _calState.month = 11; _calState.year--; }
      _buildCalendar();
    });
    document.getElementById('calNext')?.addEventListener('click', () => {
      _calState.month++;
      if (_calState.month > 11) { _calState.month = 0; _calState.year++; }
      _buildCalendar();
    });
  }

  function _buildCalendar() {
    const { year, month, books } = _calState;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

    // Title
    const titleEl = document.getElementById('calTitle');
    if (titleEl) titleEl.textContent = `${year}년 ${month + 1}월`;

    // Date → books map for this month
    const dateMap = {};
    books.forEach(b => {
      const d = readDateOf(b);
      if (!d) return;
      const key = d.slice(0, 10);
      if (!dateMap[key]) dateMap[key] = [];
      dateMap[key].push(b);
    });

    const grid = document.getElementById('calGrid');
    if (!grid) return;

    // Day-of-week headers (일 월 화 수 목 금 토)
    const dows = ['일', '월', '화', '수', '목', '금', '토'];
    let html = dows.map(d => `<div class="cal-dow">${d}</div>`).join('');

    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrev  = new Date(year, month, 0).getDate();

    // Leading days from prev month
    for (let i = firstDay - 1; i >= 0; i--) {
      const dayNum = daysInPrev - i;
      html += `<div class="cal-day other-month"><span>${dayNum}</span></div>`;
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dayBooks = dateMap[dateStr] || [];
      const hasBooks = dayBooks.length > 0;
      const isToday  = dateStr === todayStr;
      const isMulti  = dayBooks.length > 1;

      let cls = 'cal-day';
      if (hasBooks) cls += ' has-books';
      if (isToday)  cls += ' today';
      if (isMulti)  cls += ' multi';

      const dot  = hasBooks ? '<div class="cal-dot"></div>' : '';
      const dcnt = isMulti  ? ` data-count="${dayBooks.length}"` : '';
      const ds   = hasBooks ? ` data-date="${dateStr}"` : '';

      html += `<div class="${cls}"${dcnt}${ds}><span>${d}</span>${dot}</div>`;
    }

    // Trailing days from next month
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
    const trailing = totalCells - firstDay - daysInMonth;
    for (let d = 1; d <= trailing; d++) {
      html += `<div class="cal-day other-month"><span>${d}</span></div>`;
    }

    grid.innerHTML = html;

    // Wire day-click
    const detail = document.getElementById('calDetail');
    grid.querySelectorAll('.cal-day.has-books').forEach(cell => {
      cell.addEventListener('click', () => {
        const dateStr = cell.dataset.date;
        if (!dateStr) return;

        // Toggle off if already selected
        if (cell.classList.contains('selected')) {
          cell.classList.remove('selected');
          if (detail) detail.style.display = 'none';
          return;
        }

        grid.querySelectorAll('.cal-day.selected').forEach(c => c.classList.remove('selected'));
        cell.classList.add('selected');

        const dayBooks = dateMap[dateStr] || [];
        const [y, m, day] = dateStr.split('-');
        const dateLabel = `${y}년 ${parseInt(m)}월 ${parseInt(day)}일`;

        if (detail) {
          const booksHtml = dayBooks.map(b => {
            const stars = b.rating ? '★'.repeat(b.rating) + '☆'.repeat(5 - b.rating) : '';
            return `<div class="cal-detail-book">
              <span style="font-size:16px;line-height:1.2">📖</span>
              <div>
                <div style="font-weight:600">${b.title}</div>
                ${b.authors?.length ? `<div style="font-size:11px;color:var(--text-soft);margin-top:1px">${b.authors[0]}</div>` : ''}
                ${stars ? `<div style="font-size:11px;color:#e8a000;margin-top:2px;letter-spacing:-0.5px">${stars}</div>` : ''}
              </div>
            </div>`;
          }).join('');
          detail.innerHTML = `<div class="cal-detail-date">${dateLabel}</div>${booksHtml}`;
          detail.style.display = 'block';
        }
      });
    });
  }
})();
