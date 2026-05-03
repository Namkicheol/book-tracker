/**
 * 공유 미리보기 모달 — index.html / detail.html / recommendations.html 공통.
 * 풍부한 "왜 이 책을 읽어야 할까요?" 카드 + 알라딘 lookup 기반 평점/리뷰 표시.
 *
 * Usage:
 *   BookPreview.setRecData(recommendationData);
 *   BookPreview.show(book, {
 *     meta: { reason: '같은 저자', why: '...' },  // optional
 *     mode: 'library' | 'recommend'              // default 'recommend'
 *   });
 *
 * mode:
 *   'recommend' — "＋ 내 서재에 기록" (Storage.saveBook 후 detail로 이동)
 *   'library'   — "📝 기록하러 가기" (이미 서재의 책: detail.html?id=... 로 이동)
 */
(function () {
  'use strict';

  let recData = null;

  function setRecData(data) { recData = data; }

  async function show(book, opts = {}) {
    const meta = opts.meta || {};
    const mode = opts.mode || 'recommend';

    const modal  = document.getElementById('bookPreviewModal');
    const bodyEl = document.getElementById('previewBody');
    if (!modal || !bodyEl) {
      console.warn('[BookPreview] 모달 DOM 없음 — bookPreviewModal/previewBody 필요');
      return;
    }

    bodyEl.innerHTML = renderSkeleton(book, meta);
    modal.hidden = false;
    document.body.classList.add('preview-open');
    wireClose(modal);

    let detail = null;
    if (book.isbn && window.API && typeof API.aladinLookup === 'function') {
      try {
        detail = await API.aladinLookup(book.isbn);
      } catch (e) {
        console.warn('[BookPreview] 알라딘 lookup 실패', e.message);
      }
    }

    bodyEl.innerHTML = renderContent(book, meta, detail, mode);
    wireActions(book, modal, mode, detail);
  }

  // ── Why block (multi-reason cards) ────────────────────────────

  function buildWhyBlock(book, meta, detail) {
    const isbn = book.isbn ? String(book.isbn).replace(/\D/g, '') : '';
    const recBookData = recData && isbn ? recData.books[isbn] : null;

    const badges = recBookData && recBookData.lists
      ? recBookData.lists.map(listId => {
          const source = recData.meta.sources.find(s => s.id === listId);
          if (!source) return '';
          return `<span style="display:inline-block;background:${source.badge.color};color:#fff;padding:4px 10px;border-radius:12px;font-size:11px;font-weight:700;letter-spacing:0.06em;margin-right:6px;margin-bottom:6px;box-shadow:0 2px 6px rgba(0,0,0,0.15)">${escapeHtml(source.badge.text)}</span>`;
        }).filter(Boolean).join('')
      : '';

    const reasons = [];
    const raw = book._raw || detail || {};

    // 1. Curated list reason
    if (recBookData && recBookData.why) {
      reasons.push({ icon: '📚', title: '전문가 추천', text: recBookData.why });
    }

    // 2. Algorithm-based meta reason
    if (meta.why) {
      reasons.push({
        icon: meta.reason === '같은 저자의 다른 책' ? '✍️'
            : meta.reason === '같은 출판사' ? '🏢' : '💡',
        title: meta.reason || '추천 도서',
        text: meta.why,
      });
    }

    // 3. Best-seller / rating
    const bestRank = raw.bestRank;
    if (bestRank && bestRank <= 100) {
      reasons.push({ icon: '🏆', title: '베스트셀러', text: `알라딘 베스트셀러 ${bestRank}위! 많은 독자들이 선택한 책이에요.` });
    } else if (bestRank && bestRank <= 500) {
      reasons.push({ icon: '📈', title: '인기 도서', text: `알라딘 베스트셀러 ${bestRank}위 안에 드는 인기 도서예요.` });
    }

    const rank = Number(raw.customerReviewRank || 0);
    if (rank >= 9.0) {
      reasons.push({ icon: '⭐', title: '최고 평점', text: `독자 평점 ${rank}/10점. 읽은 사람들의 만족도가 매우 높아요.` });
    } else if (rank >= 8.0) {
      reasons.push({ icon: '⭐', title: '높은 평점', text: `독자 평점 ${rank}/10점. 독자들이 만족한 책이에요.` });
    }

    const reviewCount = Number(raw.reviewCount || 0);
    if (reviewCount >= 50 && reasons.filter(r => ['⭐','🏆','📈'].includes(r.icon)).length === 0) {
      reasons.push({ icon: '💬', title: '검증된 도서', text: `${reviewCount}명 이상의 독자가 리뷰를 남긴 검증된 책이에요.` });
    }

    // 4. Awards
    if (recBookData && recBookData.award && recData.awards) {
      const award = recData.awards[recBookData.award];
      if (award) reasons.push({ icon: '🏆', title: award.name, text: award.description });
    }

    // 5. 최신 도서
    const pubDate = (detail && detail.pubDate) || book.datetime || book.pubDate || '';
    if (pubDate) {
      const pubYear = Number(String(pubDate).substring(0, 4));
      const currentYear = new Date().getFullYear();
      if (pubYear >= currentYear - 2 && pubYear <= currentYear) {
        reasons.push({ icon: '🆕', title: '최신 도서', text: `${pubYear}년 출간된 따끈따끈한 신간이에요. 최신 트렌드와 정보를 담고 있어요.` });
      }
    }

    // 6. Genre/Age
    const categoryName = (detail && detail.categoryName) || book.categoryName || '';
    if (categoryName) {
      const parts = categoryName.replace(/^국내도서>/, '').replace(/^외국도서>/, '').split('>');
      const cat = parts[0];
      const sub = parts[1] || '';
      if (cat === '어린이') {
        if (sub.includes('그림책'))   reasons.push({ icon: '🎨', title: '그림책', text: '아름다운 그림과 함께 이야기를 즐길 수 있어요. 상상력과 감성을 키워줘요.' });
        else if (sub.includes('동화')) reasons.push({ icon: '📖', title: '동화책', text: '어린이 독자를 위한 재미있는 이야기로, 독서 습관을 기르는 데 도움이 돼요.' });
        else if (sub.includes('학습')) reasons.push({ icon: '📚', title: '학습 도서', text: '재미와 학습을 동시에! 유익한 내용을 쉽고 재미있게 배울 수 있어요.' });
        else                           reasons.push({ icon: '👧', title: '어린이 권장도서', text: '어린이 발달 단계에 적합한 내용과 어휘로 구성되어 있어요.' });
      } else if (cat === '청소년') {
        reasons.push({ icon: '🎓', title: '청소년 권장도서', text: '청소년기 필독서. 생각의 폭을 넓히고 세상을 이해하는 데 도움이 돼요.' });
      } else if (cat === '외국어') {
        reasons.push({ icon: '🌍', title: '영어 원서', text: '영어 실력을 키우면서 재미있는 이야기를 즐길 수 있어요.' });
      }
    }

    // 7. fallback
    if (reasons.length === 0) {
      reasons.push({ icon: '💝', title: '맘스북스 추천', text: '우리 아이의 독서 여정에 도움이 될 책이에요. 함께 읽으며 대화해보세요.' });
    }

    const reasonsHTML = reasons.map(r => `
      <div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:12px;padding:12px;background:linear-gradient(135deg,rgba(255,184,198,0.08),rgba(232,197,255,0.08));border-radius:12px;border:2px solid rgba(255,184,198,0.2)">
        <span style="font-size:24px;flex-shrink:0">${r.icon}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:700;color:var(--cute-coral,#FF9E9E);margin-bottom:4px">${escapeHtml(r.title)}</div>
          <div style="font-size:14px;color:var(--text-dark,#4A4A4A);line-height:1.5">${escapeHtml(r.text)}</div>
        </div>
      </div>
    `).join('');

    return `
      <div class="preview-why">
        <p class="preview-why-label" style="color:var(--cute-coral,#FF9E9E);font-size:12px;font-weight:800;letter-spacing:0.1em;margin-bottom:12px">💝 왜 이 책을 읽어야 할까요?</p>
        ${badges ? `<div style="margin-bottom:16px">${badges}</div>` : ''}
        ${reasonsHTML}
      </div>
    `;
  }

  // ── Skeleton (로딩 중) ────────────────────────────────────────

  function renderSkeleton(b, meta) {
    return `
      <div class="preview-hero">
        <div class="preview-cover">${b.thumbnail ? `<img src="${escapeAttr(b.thumbnail)}" alt="">` : '書'}</div>
        <div class="preview-meta">
          <p class="preview-reason">${escapeHtml(meta.reason || '추천 도서')}</p>
          <h3 class="preview-title" id="previewTitle">${escapeHtml(b.title || '')}</h3>
          <p class="preview-author">${escapeHtml((b.authors || []).join(', ') || '저자 미상')}</p>
        </div>
      </div>
      <div class="preview-loading">정보 불러오는 중…</div>
    `;
  }

  // ── 본 컨텐츠 ────────────────────────────────────────────────

  function renderContent(b, meta, detail, mode) {
    const item = detail || {};
    const ratingInfo = (item.subInfo && item.subInfo.ratingInfo) || {};
    const reviewList = (item.subInfo && item.subInfo.reviewList) || [];

    const description = (item.description || b.contents || b.description || '').trim();
    const fallbackScore = Number(item.customerReviewRank || ((b._raw || {}).customerReviewRank) || 0);
    const ratingScore = Number(ratingInfo.ratingScore || fallbackScore);
    const ratingCount = Number(ratingInfo.ratingCount || (b._raw || {}).reviewCount || 0);
    const categoryName = item.categoryName || b.categoryName || '';
    const pubDate = item.pubDate || b.datetime || b.pubDate || '';
    const publisher = item.publisher || b.publisher || '';

    const stars = ratingScore > 0
      ? `<span class="preview-stars" aria-label="평점 ${ratingScore}/10">${renderStars(ratingScore / 2)}</span>
         <span class="preview-rating-text">${ratingScore.toFixed(1)} / 10 · ${ratingCount}명</span>`
      : '<span class="preview-rating-text" style="color:var(--text-mute)">아직 평점 없음</span>';

    const reviewItems = reviewList.slice(0, 2).map(r => {
      const body = (r.reviewBody || '').replace(/<[^>]*>/g, '').trim().slice(0, 140);
      if (!body) return '';
      return `<blockquote class="preview-review">"${escapeHtml(body)}${body.length === 140 ? '…' : ''}"</blockquote>`;
    }).join('');

    const levelLine = categoryName ? `
      <div class="preview-row">
        <span class="preview-row-label">분야 / 수준</span>
        <span class="preview-row-value">${escapeHtml(categoryName.replace(/^국내도서>/, '').replace(/^외국도서>/, '').replace(/>/g, ' › '))}</span>
      </div>
    ` : '';

    const pubLine = publisher ? `
      <div class="preview-row">
        <span class="preview-row-label">출판</span>
        <span class="preview-row-value">${escapeHtml(publisher)}${pubDate ? ` · ${escapeHtml(pubDate)}` : ''}</span>
      </div>
    ` : '';

    const descLine = description ? `
      <p class="preview-desc">${escapeHtml(description.slice(0, 360))}${description.length > 360 ? '…' : ''}</p>
    ` : '';

    const aladinHref = item.link || b.url || '';
    const aladinLink = aladinHref
      ? `<a href="${escapeAttr(aladinHref)}" target="_blank" rel="noopener" class="btn btn-secondary">알라딘에서 보기</a>`
      : '';

    const whyBlock = buildWhyBlock(b, meta, detail);

    const primaryBtn = mode === 'library'
      ? `<button type="button" class="btn btn-primary" id="previewLibraryBtn">📝 기록하러 가기</button>`
      : `<button type="button" class="btn btn-primary" id="previewSaveBtn">＋ 내 서재에 기록</button>`;

    return `
      <div class="preview-hero">
        <div class="preview-cover">${b.thumbnail ? `<img src="${escapeAttr(b.thumbnail)}" alt="">` : '書'}</div>
        <div class="preview-meta">
          <p class="preview-reason">${escapeHtml(meta.reason || (mode === 'library' ? '내 서재' : '추천 도서'))}</p>
          <h3 class="preview-title" id="previewTitle">${escapeHtml(b.title || '')}</h3>
          <p class="preview-author">${escapeHtml((b.authors || []).join(', ') || '저자 미상')}</p>
          <div class="preview-rating">${stars}</div>
        </div>
      </div>

      ${whyBlock}

      <div class="preview-info">
        ${levelLine}
        ${pubLine}
      </div>

      ${descLine}

      ${reviewItems ? `<div class="preview-reviews">${reviewItems}</div>` : ''}

      <div class="preview-actions">
        ${primaryBtn}
        ${aladinLink}
      </div>
    `;
  }

  function renderStars(n) {
    const full = Math.floor(n);
    const half = (n - full) >= 0.25 && (n - full) < 0.75;
    let out = '';
    for (let i = 0; i < 5; i++) {
      if (i < full) out += '★';
      else if (i === full && half) out += '☆';
      else out += '☆';
    }
    return out;
  }

  // ── 모달 닫기 / 액션 ────────────────────────────────────────

  function wireClose(modal) {
    const close = () => closePreview(modal);
    modal.querySelectorAll('[data-close-preview]').forEach(el => {
      el.addEventListener('click', close, { once: true });
    });
    function escClose(e) {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', escClose);
        close();
      }
    }
    document.addEventListener('keydown', escClose);
  }

  function closePreview(modal) {
    modal.hidden = true;
    document.body.classList.remove('preview-open');
  }

  function wireActions(book, modal, mode, detail) {
    if (mode === 'library') {
      const btn = document.getElementById('previewLibraryBtn');
      if (btn) {
        btn.addEventListener('click', () => {
          location.href = `detail.html?id=${encodeURIComponent(book.id)}`;
        });
      }
      return;
    }

    // recommend mode
    const saveBtn = document.getElementById('previewSaveBtn');
    if (!saveBtn || !window.Storage) return;
    saveBtn.addEventListener('click', () => {
      const existing = Storage.getBookByIsbn ? Storage.getBookByIsbn(book.isbn) : null;
      if (existing) {
        toast('이미 기록된 책');
        setTimeout(() => location.href = `detail.html?id=${encodeURIComponent(existing.id)}`, 600);
        return;
      }
      const saved = Storage.saveBook({
        isbn:      book.isbn,
        title:     book.title,
        authors:   book.authors || (book.author ? [book.author] : []),
        publisher: book.publisher,
        thumbnail: book.thumbnail,
        contents:  book.contents || '',
        language:  book.language || 'ko',
        categoryId:   book.categoryId   || (window.API && API.extractCategoryId ? API.extractCategoryId(detail || {}) : undefined),
        categoryName: book.categoryName || (detail && detail.categoryName),
      });
      toast(`"${book.title}" 기록됨`);
      closePreview(modal);
      setTimeout(() => location.href = `detail.html?id=${encodeURIComponent(saved.id)}&new=1`, 700);
    });
  }

  // ── utils ────────────────────────────────────────────────────

  function toast(msg) {
    const el = document.getElementById('toast');
    if (!el) { console.log('[toast]', msg); return; }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('show'), 2200);
  }

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = String(s ?? '');
    return d.innerHTML;
  }
  function escapeAttr(s) { return String(s ?? '').replace(/"/g, '&quot;'); }

  window.BookPreview = { show, setRecData };
})();
