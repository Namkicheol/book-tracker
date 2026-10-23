/**
 * 맘스북스 — Share/Ranking page
 *
 * 엄마들 자극용 독서 랭킹 시스템
 */

(function () {
  'use strict';

  let currentTab = 'all';
  let notifications = [];

  // ── 뱃지 정의 ────────────────────────────────────────────────
  const BADGES = [
    { id: 'streak3', emoji: '🔥', name: '3일 연속', condition: (stats) => stats.streak >= 3 },
    { id: 'streak7', emoji: '💪', name: '일주일 완주', condition: (stats) => stats.streak >= 7 },
    { id: 'streak30', emoji: '👑', name: '한달 연속', condition: (stats) => stats.streak >= 30 },
    { id: 'books10', emoji: '📚', name: '10권 달성', condition: (stats) => stats.total >= 10 },
    { id: 'books50', emoji: '🎓', name: '50권 달성', condition: (stats) => stats.total >= 50 },
    { id: 'books100', emoji: '💎', name: '100권 독파', condition: (stats) => stats.total >= 100 },
    { id: 'rank1', emoji: '🏆', name: '1등 독서왕', condition: (stats) => stats.rank === 1 },
    { id: 'goal', emoji: '🎯', name: '목표 달성', condition: (stats) => stats.monthBooks >= stats.goalTarget },
    { id: 'early', emoji: '⚡', name: '조기 달성', condition: (stats) => stats.goalAchievedEarly },
    { id: 'weekly', emoji: '📖', name: '매주 독서', condition: (stats) => stats.weeksInRow >= 4 },
    { id: 'thick', emoji: '🌟', name: '두꺼운 책', condition: (stats) => stats.thickBooks >= 3 },
    { id: 'genre', emoji: '⭐', name: '장르 마스터', condition: (stats) => stats.genreBooks >= 10 },
  ];

  // ── 알림 생성 (듀오링고 스타일) ─────────────────────────────
  function generateNotifications() {
    notifications = [];
    const now = Date.now();

    // 1. Streak 격려
    if (myStats.streak >= 3) {
      notifications.push({
        id: 'streak',
        icon: '🔥',
        text: `${myStats.streak}일 연속 독서 중! 대단해요!`,
        time: '방금 전',
        unread: true,
        timestamp: now,
      });
    } else if (myStats.streak === 0) {
      const lastRead = localStorage.getItem('lastReadDate');
      if (lastRead) {
        notifications.push({
          id: 'streak_broken',
          icon: '💔',
          text: '연속 독서 기록이 끊겼어요. 오늘 한 권 읽어볼까요?',
          time: '내 독서 기록',
          unread: true,
          timestamp: now - 3600000,
        });
      }
    }

    // 3. 목표 진행
    const percent = Math.round((myStats.monthBooks / myStats.goalTarget) * 100);
    if (percent >= 80 && percent < 100) {
      notifications.push({
        id: 'goal_near',
        icon: '🎯',
        text: `목표까지 ${myStats.goalTarget - myStats.monthBooks}권 남았어요! 거의 다 왔어요!`,
        time: '내 독서 기록',
        unread: false,
        timestamp: now - 5 * 3600000,
      });
    } else if (percent >= 100) {
      notifications.push({
        id: 'goal_done',
        icon: '🎉',
        text: '이번 달 목표를 달성했어요! 축하합니다!',
        time: '내 독서 기록',
        unread: true,
        timestamp: now - 12 * 3600000,
      });
    }

    // 5. 뱃지 획득
    const newBadges = BADGES.filter(b => b.condition(myStats)).slice(0, 1);
    if (newBadges.length > 0) {
      notifications.push({
        id: 'badge_new',
        icon: newBadges[0].emoji,
        text: `달성한 뱃지: "${newBadges[0].name}"`,
        time: '내 독서 기록',
        unread: false,
        timestamp: now - 2 * 24 * 3600000,
      });
    }

    // 배지 업데이트
    const unreadCount = notifications.filter(n => n.unread).length;
    const badge = document.getElementById('notificationBadge');
    if (badge) {
      if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }
  }

  // ── 격려 체크 (듀오링고 스타일 팝업) ──────────────────────────
  function checkEncouragement() {
    const lastEncouragement = localStorage.getItem('lastEncouragement');
    const now = Date.now();

    // 하루에 한 번만 표시
    if (lastEncouragement && now - parseInt(lastEncouragement) < 24 * 60 * 60 * 1000) {
      return;
    }

    // 조건별 격려 메시지
    let encouragement = null;

    if (myStats.streak === 0 && myStats.total > 5) {
      encouragement = {
        icon: '📚',
        title: '오늘도 한 권!',
        message: '연속 독서 기록을 다시 시작해보세요.\n작은 한 권이 큰 변화를 만듭니다!',
      };
    } else if (myStats.streak >= 7) {
      encouragement = {
        icon: '🔥',
        title: '놀라워요!',
        message: `${myStats.streak}일 연속 독서 중!\n이 기록을 계속 이어가보세요!`,
      };
    } else if (myStats.monthBooks >= myStats.goalTarget) {
      encouragement = {
        icon: '🎉',
        title: '목표 달성!',
        message: '이번 달 목표를 완료했어요!\n새로운 목표를 설정해보시겠어요?',
      };
    } else if (myStats.weekBooks === 0 && myStats.total > 0) {
      encouragement = {
        icon: '💪',
        title: '이번 주는 어떠세요?',
        message: '아직 이번 주에 읽은 책이 없어요.\n짧은 책 한 권으로 시작해보세요!',
      };
    }

    if (encouragement) {
      setTimeout(() => showEncouragementPopup(encouragement), 1000);
      localStorage.setItem('lastEncouragement', now.toString());
    }
  }

  function showEncouragementPopup(data) {
    const overlay = document.createElement('div');
    overlay.className = 'friend-modal';
    overlay.innerHTML = `
      <div class="encouragement-popup">
        <div class="encouragement-icon">${escapeHtml(data.icon)}</div>
        <div class="encouragement-title">${escapeHtml(data.title)}</div>
        <div class="encouragement-message">${escapeHtml(data.message)}</div>
        <button class="encouragement-btn">좋아요!</button>
      </div>
    `;

    document.body.appendChild(overlay);

    const btn = overlay.querySelector('.encouragement-btn');
    btn.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  }

  // ── Boot ─────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    document.getElementById('feedSearch')?.addEventListener('input',()=>{feedLimit=6;renderFeedCards();});
    document.getElementById('feedMore')?.addEventListener('click',()=>{feedLimit+=6;renderFeedCards();});
    renderExampleLibraries();
    loadProfile();
    calculateMyStats();
    generateNotifications();
    renderGoal();
    renderBadges();
    renderRanking();
    wireEvents();
    wireAuth();
    checkEncouragement();
  }

  // ── 짧은 ID — UUID 앞 6자, 닉네임 미설정 시 표시용 ──────────────
  function shortId(uuid) {
    if (!uuid) return '????';
    return String(uuid).replace(/-/g, '').slice(0, 6).toUpperCase();
  }

  let publicLibraryRequest = 0;
  const EXAMPLE_LIBRARIES = [{"nickname":"잠자리 그림책장","books":[{"isbn":"9788949161341","title":"만복이네 떡집","authors":["김리리 (지은이), 이승현 (그림)"],"publisher":"비룡소","thumbnail":"https://image.aladin.co.kr/product/716/52/cover200/8949161346_2.jpg"},{"isbn":"9788986621136","title":"강아지똥","authors":["권정생 (글), 정승각 (그림)"],"publisher":"길벗어린이","thumbnail":"https://image.aladin.co.kr/product/0/48/cover200/8986621134_1.jpg"},{"isbn":"9788936446819","title":"수박 수영장","authors":["안녕달"],"publisher":"창비","thumbnail":"https://image.aladin.co.kr/product/6365/38/cover200/8936446819_1.jpg"}]},{"nickname":"호기심 많은 책장","books":[{"isbn":"9791160947502","title":"수영 이불","authors":["재희 (지은이)"],"publisher":"사계절","thumbnail":"https://image.aladin.co.kr/product/27663/83/cover200/k212733232_1.jpg"},{"isbn":"9791170820314","title":"달팽이 달리기","authors":["이혜인 (지은이)"],"publisher":"킨더랜드","thumbnail":"https://image.aladin.co.kr/product/32753/25/cover200/k552936080_1.jpg"},{"isbn":"9788949182216","title":"발명가 매티","authors":["에밀리 아놀드 맥컬리 (지은이), 김고연주 (옮긴이)"],"publisher":"비룡소","thumbnail":"https://image.aladin.co.kr/product/88/45/cover200/8949182211_2.jpg"}]},{"nickname":"영어책 읽는 집","books":[{"isbn":"9780241003008","title":"The Very Hungry Caterpillar","authors":["에릭 칼"],"publisher":"Hamish Hamilton","thumbnail":"https://image.aladin.co.kr/product/28/65/cover200/0241003008_1.jpg"},{"isbn":"9780064410939","title":"Charlotte's Web","authors":["엘윈 브룩스 화이트"],"publisher":"Harper Collins","thumbnail":"https://image.aladin.co.kr/product/57/64/cover200/0064410935_2.jpg"},{"isbn":"9780064430173","title":"Goodnight Moon","authors":["마거릿 와이즈 브라운"],"publisher":"HarperTrophy","thumbnail":"https://image.aladin.co.kr/product/90/35/cover200/0064430170ff_1.jpg"}]}];
  let publicFeed = [];
  let feedLimit = 6;
  function clearPublicLibraryViews() {
    document.querySelectorAll('.public-library-modal').forEach(modal => modal._close ? modal._close() : modal.remove());
  }
  async function publicViewer() {
    const user = await window.SB.getUser();
    if (!user) return null;
    const profile = await window.SB.getProfile(user.id);
    const current = await window.SB.getUser();
    if (!current || current.id !== user.id || !profile || profile.id !== user.id || profile.library_public !== true) return null;
    return user;
  }
  function showPrivateLibraryNotice(list) {
    publicFeed = [];
    const more = document.getElementById('feedMore'); if (more) more.hidden = true;
    clearPublicLibraryViews();
    list.textContent = '내 서재를 공개한 회원만 다른 회원의 공개 서재를 볼 수 있어요. 비공개 상태에서는 볼 수 없습니다.';
    const settings = document.createElement('a');settings.href='settings.html';settings.textContent='서재 공개 설정하기';list.appendChild(settings);
  }
  if (window.addEventListener) {
    window.addEventListener('focus', renderPublicLibraries);
    window.addEventListener('profile-visibility-change', renderPublicLibraries);
    window.addEventListener('storage', event => { if (!event.key || /profileLibraryPublic|profilePrivacy/.test(event.key)) renderPublicLibraries(); });
  }

  // 공개에 동의한 서재만 서버의 제한된 조회 함수로 읽는다.
  async function renderPublicLibraries() {
    const list = document.getElementById('rankList');
    if (!list) return;
    const request = ++publicLibraryRequest;
    publicFeed = [];feedLimit = 6;
    const more = document.getElementById('feedMore');if(more)more.hidden=true;
    const status = document.getElementById('feedStatus');if(status)status.textContent='';
    clearPublicLibraryViews();
    list.textContent = '공개 서재를 불러오는 중이에요…';
    if (!window.SB || !window.SB.enabled) {
      list.textContent = '공개 서재 연결을 준비 중이에요. 내 독서 기록은 이 기기에 안전하게 남아 있어요.';
      return;
    }
    try {
      if (!await window.SB.getUser()) {
        list.textContent = '로그인 후 내 서재를 공개하면 다른 회원의 공개 서재도 볼 수 있어요.';
        const login = document.createElement('button'); login.type = 'button'; login.textContent = '로그인';
        login.addEventListener('click', showLoginPicker); list.appendChild(login); return;
      }
      const viewer = await publicViewer();
      if (request !== publicLibraryRequest) return;
      if (!viewer) { showPrivateLibraryNotice(list); return; }
      const city = currentTab === 'region' ? localStorage.getItem('profileCity') : '';
      if (currentTab === 'region' && !city) {
        list.textContent = '동네 서재를 보려면 프로필에서 시·도를 선택해 주세요. 지역 입력은 선택이에요.';
        return;
      }
      const libraries = await window.SB.getPublicLibraryFeed(city || null,
        currentTab === 'region' ? localStorage.getItem('profileDistrict') || null : null);
      if (request !== publicLibraryRequest) return;
      const stillPublic = await publicViewer();
      if (request !== publicLibraryRequest) return;
      if (!stillPublic || stillPublic.id !== viewer.id) { showPrivateLibraryNotice(list); return; }
      publicFeed = libraries.filter(library => library.owner_id !== viewer.id);
      feedLimit = 6;
      renderFeedCards();
    } catch (e) {
      if (request !== publicLibraryRequest) return;
      clearPublicLibraryViews();
      list.textContent = '공개 서재를 연결하지 못했어요. 잠시 후 다시 시도해 주세요.';
      const retry = document.createElement('button');
      retry.type = 'button'; retry.textContent = '다시 시도';
      retry.addEventListener('click', renderPublicLibraries); list.appendChild(retry);
    }
  }

  function feedMatches() {
    const query = (document.getElementById('feedSearch')?.value || '').trim().toLocaleLowerCase();
    return publicFeed.filter(library => !query || (library.nickname || '서재 #' + shortId(library.owner_id)).toLocaleLowerCase().includes(query));
  }
  function coverMarkup(book) {
    const src = /^https?:\/\//.test(book.thumbnail || '') && !/noimg|no_image/i.test(book.thumbnail) ? book.thumbnail.replace(/^http:/,'https:') : '';
    return src ? `<img src="${escapeAttr(src)}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'feed-cover-empty',textContent:'📖'}))">` : '<span class="feed-cover-empty" aria-hidden="true">📖</span>';
  }
  async function openFeedBook(book, example = false) {
    try {
      if (!example && !await publicViewer()) { renderPublicLibraries(); return; }
      window.BookPreview?.show(book, {mode:'recommend'});
    } catch (_) { showToast('공개 설정을 확인하지 못했어요. 다시 시도해 주세요.'); }
  }
  function renderExampleLibraries() {
    const list = document.getElementById('exampleLibraries');if(!list)return;
    list.innerHTML='';
    EXAMPLE_LIBRARIES.forEach(library=>{
      const card=document.createElement('article');card.className='neighbor-card';
      card.innerHTML=`<header class="neighbor-top"><span class="neighbor-avatar" aria-hidden="true">📖</span><div><h3>${escapeHtml(library.nickname)}</h3><p>함께 펼쳐볼 책 3권</p></div></header><div class="neighbor-covers">${library.books.map((book,index)=>`<button type="button" data-example-book="${index}" aria-label="${escapeAttr(book.title)} 자세히 보기">${coverMarkup(book)}<span>${escapeHtml(book.title)}</span></button>`).join('')}</div><button type="button" class="neighbor-open">책장 전체 보기 →</button>`;
      card.querySelectorAll('[data-example-book]').forEach(button=>button.addEventListener('click',()=>openFeedBook(library.books[Number(button.dataset.exampleBook)],true)));
      card.querySelector('.neighbor-open').addEventListener('click',()=>showPublicLibrary(library,true));
      list.appendChild(card);
    });
  }

  function renderFeedCards() {
    const list = document.getElementById('rankList');
    if (!list) return;
    const matches = feedMatches();
    list.innerHTML = '';
    if (!matches.length) list.textContent = publicFeed.length ? '다른 이웃 별명으로 찾아보세요.' : '아직 이곳에 공개한 서재가 없어요. 첫 책장을 기다리고 있어요.';
    matches.slice(0,feedLimit).forEach(library => {
      const card = document.createElement('article');card.className = 'neighbor-card';
      const name = library.nickname || '서재 #' + shortId(library.owner_id);
      const books = (library.books || []).slice(0,3);
      card.innerHTML = `<header class="neighbor-top"><span class="neighbor-avatar" aria-hidden="true">📚</span><div><h3>${escapeHtml(name)}</h3><p>${escapeHtml([library.city,library.district].filter(Boolean).join(' ') || '지역 미선택')} · 서재 ${Number(library.book_count) || 0}권</p></div></header><div class="neighbor-covers">${books.map((book,index)=>`<button type="button" data-feed-book="${index}" aria-label="${escapeAttr(book.title || '책')} 자세히 보기">${coverMarkup(book)}<span>${escapeHtml(book.title || '')}</span></button>`).join('') || '<p class="neighbor-empty">새 책이 꽂히길 기다리는 책장이에요.</p>'}</div><button type="button" class="neighbor-open">${escapeHtml(name)}님의 서재 보기 <span aria-hidden="true">→</span></button>`;
      card.querySelectorAll('[data-feed-book]').forEach(button => button.addEventListener('click',()=>openFeedBook(books[Number(button.dataset.feedBook)])));
      card.querySelector('.neighbor-open').addEventListener('click',()=>showPublicLibrary(library));
      list.appendChild(card);
    });
    const more=document.getElementById('feedMore');if(more)more.hidden=matches.length<=feedLimit;
    const status=document.getElementById('feedStatus');if(status)status.textContent=matches.length ? `${matches.length}개의 이웃 서재` : '';
  }

  async function showPublicLibrary(library, example = false) {
    const modal = document.createElement('div');
    modal.className = example ? 'friend-modal example-library-modal' : 'friend-modal public-library-modal';
    modal.innerHTML = `<div class="friend-modal-content" role="dialog" aria-modal="true" aria-labelledby="neighborLibraryTitle"><div class="friend-modal-header"><h2 id="neighborLibraryTitle">${escapeHtml(library.nickname || '서재 #' + shortId(library.owner_id))}</h2><button type="button" aria-label="닫기">✕</button></div><div class="public-library-books" aria-live="polite">책을 불러오는 중이에요…</div></div>`;
    const returnFocus = document.activeElement;
    const close = () => { modal.remove(); document.removeEventListener('keydown', keydown); returnFocus?.focus(); };
    modal._close = close;
    const keydown = event => { if(document.body.classList.contains('preview-open'))return; if(event.key==='Escape'){event.preventDefault();close();} if(event.key==='Tab'){const buttons=[...modal.querySelectorAll('button')];if(event.shiftKey && document.activeElement===buttons[0]){event.preventDefault();buttons.at(-1)?.focus();}else if(!event.shiftKey && document.activeElement===buttons.at(-1)){event.preventDefault();buttons[0]?.focus();}} };
    document.addEventListener('keydown',keydown);
    modal.querySelector('button').addEventListener('click', close);
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    document.body.appendChild(modal);
    modal.querySelector('button').focus();
    const content = modal.querySelector('.public-library-books');
    try {
      const viewer = example ? null : await publicViewer();
      if (!example && !viewer) { close(); renderPublicLibraries(); return; }
      const books = example ? library.books : await window.SB.getPublicLibraryBooks(library.owner_id);
      const stillPublic = example ? null : await publicViewer();
      if ((!example && (!stillPublic || stillPublic.id !== viewer.id)) || !modal.isConnected) { close(); renderPublicLibraries(); return; }
      content.textContent = '';
      if (!books.length) content.textContent = '아직 공유한 책이 없거나 비공개로 전환된 서재예요.';
      books.forEach(book => {
        const row = document.createElement('button');row.type='button';row.className='neighbor-book-row';
        row.innerHTML=`${coverMarkup(book)}<span><strong>${escapeHtml(book.title || '')}</strong><small>${escapeHtml((book.authors || []).join(', '))}</small></span><span aria-hidden="true">›</span>`;
        row.addEventListener('click',()=>openFeedBook(book,example));content.appendChild(row);
      });
    } catch (e) { content.textContent = '서재를 불러오지 못했어요. 닫은 뒤 다시 시도해 주세요.'; }
  }

  // ── Auth (Supabase) ─────────────────────────────────────────
  // 비로그인 상태도 정상 동작 — 로그인은 랭킹/소셜 기능 활성화용
  function wireAuth() {
    if (!window.SB || !window.SB.enabled) {
      // Supabase 비활성: 로그인 버튼 자체를 숨김
      const btn = document.getElementById('authBtn');
      if (btn) btn.style.display = 'none';
      return;
    }

    refreshAuthUI();

    const btn = document.getElementById('authBtn');
    if (btn) btn.addEventListener('click', onAuthBtnClick);

    window.SB.onAuthChange(async (event, session) => {
      // SIGNED_IN: 새 OAuth 흐름 직후 / INITIAL_SESSION: 페이지 로드 시 세션 복원
      // 둘 다 sync 한 번 돌려서 다른 기기에서 변경된 프로필 가져오기
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        if (window.Sync) {
          const row = await window.Sync.syncProfileOnSignIn();
          if (row) {
            loadProfile();
            myStats.goalTarget = row.monthly_goal || myStats.goalTarget;
            renderGoal();
          }
        }
        if (event === 'SIGNED_IN') showToast('✅ 로그인 완료');
        renderPublicLibraries();
      }
      if (event === 'SIGNED_OUT') {
        showToast('로그아웃 되었어요');
        renderPublicLibraries();
      }
      refreshAuthUI();
    });
  }

  async function refreshAuthUI() {
    const btn = document.getElementById('authBtn');
    if (!btn) return;
    const sess = await window.SB.getSession();
    const user = sess && sess.user ? sess.user : null;
    if (user) {
      btn.title = '로그아웃';
      btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
        </svg>`;
    } else {
      btn.title = '로그인';
      btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
        </svg>`;
    }
  }

  async function onAuthBtnClick() {
    const sess = await window.SB.getSession();
    if (sess && sess.user) {
      if (confirm('로그아웃 하시겠어요?')) await window.SB.signOut();
      return;
    }
    showLoginPicker();
  }

  function showLoginPicker() {
    if (window.AuthUI && window.AuthUI.showLoginPicker) {
      window.AuthUI.showLoginPicker();
    }
  }

  // ── 프로필 로드 ──────────────────────────────────────────────
  function loadProfile() {
    const avatar = localStorage.getItem('profileAvatar') || '👩';
    const name = localStorage.getItem('profileName') || '책읽는엄마';
    const grade = '';
    const region = [localStorage.getItem('profileCity'), localStorage.getItem('profileDistrict')].filter(Boolean).join(' ');

    if (window.setAvatarEl) {
      window.setAvatarEl(document.getElementById('profileAvatar'), avatar);
    } else {
      document.getElementById('profileAvatar').textContent = avatar;
    }
    document.getElementById('profileName').textContent = name;
    document.getElementById('profileGrade').textContent = grade;
    document.getElementById('profileRegion').textContent = region || '지역 선택 안 함';
  }

  // ── 내 통계 계산 (로컬 스토리지에서) ─────────────────────────
  let myStats = {};

  function calculateMyStats() {
    const books = Storage.getAllBooks();
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearAgo = new Date(now.getFullYear(), 0, 1);

    const dated = books.filter(b => b.readDate);
    const thisWeek = dated.filter(b => new Date(b.readDate) >= weekAgo).length;
    const thisMonth = dated.filter(b => new Date(b.readDate) >= monthAgo).length;
    const thisYear = dated.filter(b => new Date(b.readDate) >= yearAgo).length;

    // 연속 독서일 계산
    const streak = calculateStreak(books);

    // 매주 독서 체크
    const weeksInRow = calculateWeeksInRow(books);

    // 페이지/장르 통계는 실제 근거가 생길 때까지 뱃지를 부여하지 않는다.
    const thickBooks = 0;


    const genreBooks = 0;

    myStats = {
      total: books.length,
      weekBooks: thisWeek,
      monthBooks: thisMonth,
      yearBooks: thisYear,
      streak,
      weeksInRow,
      thickBooks,
      genreBooks,
      rank: null,
      goalTarget: parseInt(localStorage.getItem('monthlyGoal') || '20'),
      goalAchievedEarly: false, // TODO: 실제 계산
    };

    document.getElementById('statWeek').textContent = thisWeek;
    document.getElementById('statMonth').textContent = thisMonth;
    document.getElementById('statYear').textContent = thisYear;

  }

  function calculateStreak(books) {
    const dated = books.filter(b => b.readDate);
    if (dated.length === 0) return 0;
    const sorted = dated.map(b => new Date(b.readDate).setHours(0,0,0,0))
      .sort((a, b) => b - a);

    let streak = 1;
    const today = new Date().setHours(0,0,0,0);
    let lastDate = sorted[0];

    if (lastDate < today - 86400000) return 0; // 어제나 오늘 기록 없으면 0

    for (let i = 1; i < sorted.length; i++) {
      const diff = (lastDate - sorted[i]) / 86400000;
      if (diff === 1) {
        streak++;
        lastDate = sorted[i];
      } else if (diff > 1) {
        break;
      }
    }
    return streak;
  }

  function calculateWeeksInRow(books) {
    const now = new Date();
    let weeks = 0;
    for (let i = 0; i < 8; i++) {
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (i * 7 + 7));
      const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (i * 7));
      const hasBooks = books.some(b => {
        const d = new Date(b.readDate);
        return d >= weekStart && d < weekEnd;
      });
      if (hasBooks) weeks++;
      else break;
    }
    return weeks;
  }

  // ── 목표 렌더링 ──────────────────────────────────────────────
  function renderGoal() {
    const target = myStats.goalTarget;
    const current = myStats.monthBooks;
    const percent = Math.min(Math.round((current / target) * 100), 100);

    document.getElementById('goalCurrent').textContent = current;
    document.getElementById('goalTarget').textContent = target;
    document.getElementById('goalPercent').textContent = percent + '%';
    document.getElementById('goalFill').style.width = percent + '%';

    const remaining = target - current;
    let message = '';
    if (remaining <= 0) {
      message = '🎉 목표 달성! 축하합니다!';
    } else if (remaining <= 3) {
      message = `🔥 ${remaining}권만 더 읽으면 목표 달성!`;
    } else if (percent >= 80) {
      message = `💪 거의 다 왔어요! ${remaining}권 남았어요!`;
    } else if (percent >= 50) {
      message = `📚 절반 넘었어요! ${remaining}권 더 화이팅!`;
    } else {
      message = `📖 ${remaining}권 남았어요. 천천히 꾸준히!`;
    }
    document.getElementById('goalMessage').textContent = message;
  }

  // ── 뱃지 렌더링 ──────────────────────────────────────────────
  function renderBadges() {
    const grid = document.getElementById('badgesGrid');
    const unlocked = BADGES.filter(b => b.condition(myStats));

    document.getElementById('badgesCount').textContent =
      `${unlocked.length}/${BADGES.length}`;

    grid.innerHTML = BADGES.map(badge => {
      const isUnlocked = unlocked.some(u => u.id === badge.id);
      return `
        <div class="badge-item ${isUnlocked ? 'unlocked' : 'locked'}"
             data-badge="${badge.id}">
          <div class="badge-emoji">${badge.emoji}</div>
          <div class="badge-name">${badge.name}</div>
        </div>
      `;
    }).join('');

    // 뱃지 클릭 이벤트
    grid.querySelectorAll('.badge-item').forEach(item => {
      item.addEventListener('click', () => {
        const badgeId = item.dataset.badge;
        const badge = BADGES.find(b => b.id === badgeId);
        const isUnlocked = unlocked.some(u => u.id === badgeId);
        showBadgeDetail(badge, isUnlocked);
      });
    });
  }

  function showBadgeDetail(badge, isUnlocked) {
    const messages = {
      streak3: '3일 연속으로 독서를 했어요!',
      streak7: '일주일 동안 매일 책을 읽었어요!',
      streak30: '한 달 동안 하루도 빠짐없이 독서했어요!',
      books10: '총 10권의 책을 읽었어요!',
      books50: '총 50권의 책을 읽었어요!',
      books100: '총 100권의 책을 읽었어요!',
      rank1: '이번 달 독서 랭킹 1위를 달성했어요!',
      goal: '이번 달 목표를 달성했어요!',
      early: '목표보다 일찍 달성했어요!',
      weekly: '4주 연속 독서를 했어요!',
      thick: '두꺼운 책(300쪽 이상) 3권을 읽었어요!',
      genre: '한 장르의 책을 10권 이상 읽었어요!',
    };

    const msg = isUnlocked
      ? `${badge.emoji} ${badge.name}\n\n${messages[badge.id]}`
      : `${badge.emoji} ${badge.name}\n\n아직 획득하지 못한 뱃지예요.\n열심히 독서해서 뱃지를 모아보세요!`;

    showToast(msg);
  }

  // ── 랭킹 렌더링 ──────────────────────────────────────────────
  function renderRanking() { renderPublicLibraries(); }

  // ── 탭 전환 ──────────────────────────────────────────────────
  function wireEvents() {
    document.querySelectorAll('.rank-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.rank-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentTab = tab.dataset.tab;
        renderRanking();
      });
    });

    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', showProfileEditor);
    }

    const profileGrade = document.getElementById('profileGrade');
    if (profileGrade) {
      profileGrade.addEventListener('click', showProfileEditor);
      profileGrade.style.cursor = 'pointer';
    }
    const profileRegion = document.getElementById('profileRegion');
    if (profileRegion) {
      profileRegion.addEventListener('click', showProfileEditor);
      profileRegion.style.cursor = 'pointer';
    }

    const shareCardBtn = document.getElementById('shareCardBtn');
    if (shareCardBtn) {
      shareCardBtn.addEventListener('click', showShareCard);
    }

    const editGoalBtn = document.getElementById('editGoalBtn');
    if (editGoalBtn) {
      editGoalBtn.addEventListener('click', () => {
        const current = myStats.goalTarget;
        const newGoal = prompt(`이번 달 목표 권수를 입력하세요 (현재: ${current}권)`, current);
        if (newGoal && !isNaN(newGoal) && newGoal > 0) {
          if (window.Storage?.isOwnerCurrent && !Storage.isOwnerCurrent()) { location.reload(); return; }
          localStorage.setItem('monthlyGoal', newGoal);
          myStats.goalTarget = parseInt(newGoal);
          renderGoal();
          showToast(`✅ 목표가 ${newGoal}권으로 변경되었습니다!`);
        }
      });
    }

    const profileAvatar = document.getElementById('profileAvatar');
    if (profileAvatar) {
      // 프로필 편집 — 닉네임·선택 지역·목표
      // + 아바타 변경(카카오 사진 또는 이모지)을 한 화면에서 설정
      profileAvatar.addEventListener('click', showProfileEditor);
      profileAvatar.style.cursor = 'pointer';
    }

    const profileName = document.getElementById('profileName');
    if (profileName) {
      profileName.addEventListener('click', showProfileEditor);
      profileName.style.cursor = 'pointer';
      profileName.style.textDecoration = 'underline';
      profileName.style.textDecorationStyle = 'dotted';
      profileName.style.textDecorationColor = 'rgba(255, 184, 198, 0.5)';
    }

    const notificationBtn = document.getElementById('notificationBtn');
    if (notificationBtn) {
      notificationBtn.addEventListener('click', showNotificationCenter);
    }
  }

  // ── 알림 센터 표시 ────────────────────────────────────────────
  function showNotificationCenter() {
    const modal = document.createElement('div');
    modal.className = 'notification-center';

    const content = notifications.length === 0
      ? `<div class="notification-empty">
           <div class="notification-empty-icon">🔔</div>
           <p>아직 알림이 없어요</p>
         </div>`
      : notifications.map(n => `
          <div class="notification-item ${n.unread ? 'unread' : ''}" data-id="${n.id}">
            <div class="notification-icon">${n.icon}</div>
            <div class="notification-body">
              <div class="notification-text">${escapeHtml(n.text)}</div>
              <div class="notification-time">${escapeHtml(n.time)}</div>
            </div>
          </div>
        `).join('');

    modal.innerHTML = `
      <div class="notification-header">
        <div class="notification-title">
          🔔 알림
        </div>
        <button class="notification-close">✕</button>
      </div>
      <div class="notification-content">
        ${content}
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.notification-close').addEventListener('click', () => {
      modal.remove();
    });

    modal.querySelectorAll('.notification-item').forEach(item => {
      item.addEventListener('click', () => {
        item.classList.remove('unread');
        const id = item.dataset.id;
        const noti = notifications.find(n => n.id === id);
        if (noti) noti.unread = false;

        // 배지 업데이트
        const unreadCount = notifications.filter(n => n.unread).length;
        const badge = document.getElementById('notificationBadge');
        if (badge) {
          if (unreadCount > 0) {
            badge.textContent = unreadCount;
          } else {
            badge.style.display = 'none';
          }
        }
      });
    });
  }

  // ── 아바타 선택기 ────────────────────────────────────────────
  function showAvatarPicker(onChange) {
    const avatars = [
      '👩', '👨', '👧', '👦', '🧑', '👶', '👵', '👴',
      '👩‍🎓', '👨‍🎓', '👩‍🏫', '👨‍🏫', '🧑‍🚀', '🦸', '🦸‍♀️', '🧙',
      '🐰', '🐻', '🐱', '🐶', '🦊', '🐼', '🦁', '🐯',
      '🐨', '🐷', '🐹', '🐭', '🐮', '🐸', '🐵', '🐧',
      '🦄', '🐲', '🦖', '🐙', '🦋', '🐝', '🐞', '🦉'
    ];

    const modal = document.createElement('div');
    modal.className = 'friend-modal';
    modal.innerHTML = `
      <div class="friend-modal-content">
        <div class="avatar-picker-header">
          <span class="avatar-picker-icon">😊</span>
          <span class="avatar-picker-title">프로필 아바타 선택</span>
        </div>
        <div class="avatar-picker-grid">
          ${avatars.map(emoji => `
            <button class="avatar-picker-btn">${emoji}</button>
          `).join('')}
        </div>
        <button class="cheer-cancel">취소</button>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.cheer-cancel').addEventListener('click', () => {
      modal.remove();
    });

    modal.querySelectorAll('.avatar-picker-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const emoji = btn.textContent;
        if (window.Storage?.isOwnerCurrent && !Storage.isOwnerCurrent()) { location.reload(); return; }
        localStorage.setItem('profileAvatar', emoji);
        const mainAvatar = document.getElementById('profileAvatar');
        if (mainAvatar) {
          if (window.setAvatarEl) window.setAvatarEl(mainAvatar, emoji);
          else mainAvatar.textContent = emoji;
        }
        if (typeof onChange === 'function') onChange(emoji);
        showToast(`✅ 프로필 아바타가 변경되었어요!`);
        modal.remove();
      });
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  // ── Utils ────────────────────────────────────────────────────
  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = String(s ?? '');
    return d.innerHTML;
  }

  function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  // ── 프로필 편집 모달 ──────────────────────────────────────────
  function showProfileEditor() {
    const ownerId = window.Storage && window.Storage.getOwner ? window.Storage.getOwner() : null;
    const modal = document.createElement('div'); modal.className = 'friend-modal';
    const regions = window.REGIONS || {};
    const city = localStorage.getItem('profileCity') || '';
    const district = localStorage.getItem('profileDistrict') || '';
    modal.innerHTML = `<form class="friend-modal-content" style="display:flex;flex-direction:column;gap:14px"><h2>프로필 편집</h2><label>닉네임<input name="nickname" maxlength="20" value="${escapeAttr(localStorage.getItem('profileName') || '책읽는엄마')}" style="width:100%"></label><p>아이 이름·생년월일·학교·반·상세 주소를 입력하지 마세요.</p><label>시·도 (선택)<select name="city" style="width:100%"><option value="">선택 안 함</option>${Object.keys(regions).map(c => `<option${c === city ? ' selected' : ''}>${escapeHtml(c)}</option>`).join('')}</select></label><label>시·군·구 (선택)<select name="district" style="width:100%"></select></label><label>이번 달 목표 (권)<input type="number" name="goal" min="1" max="200" value="${myStats.goalTarget || 20}"></label><a href="settings.html">내 서재 공개 설정</a><div style="display:flex;gap:10px"><button type="button" id="profileCancel">취소</button><button type="submit">저장</button></div></form>`;
    document.body.appendChild(modal);
    const form = modal.querySelector('form');
    function updateDistrict() {
      form.elements.district.innerHTML = '<option value="">선택 안 함</option>' + (regions[form.elements.city.value] || []).map(d => `<option${d === district ? ' selected' : ''}>${escapeHtml(d)}</option>`).join('');
    }
    updateDistrict(); form.elements.city.addEventListener('change', updateDistrict);
    modal.querySelector('#profileCancel').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const profile = {public_nickname:form.elements.nickname.value.trim() || '책읽는엄마',nickname:form.elements.nickname.value.trim() || '책읽는엄마',city:form.elements.city.value || null,district:form.elements.district.value || null,monthly_goal:Math.min(200,Math.max(1,Number(form.elements.goal.value) || 20))};
      const saveButton = form.querySelector('button[type="submit"]');
      saveButton.disabled = true;
      try {
        if (window.Storage && !window.Storage.isOwnerCurrent()) throw new Error('account');
        if (ownerId) {
          const user = await window.SB.getUser();
          if (!user || user.id !== ownerId) throw new Error('account');
          const saved = await window.SB.upsertProfile(profile, {expectedUserId:ownerId});
          if (!saved || saved.id !== ownerId || !window.Storage.isOwnerCurrent() || window.Storage.getOwner() !== ownerId) throw new Error('save');
        } else if (window.Storage && window.Storage.getOwner() !== null) throw new Error('account');
        window.Sync.writeLocalProfile(profile); loadProfile(); myStats.goalTarget = profile.monthly_goal; renderGoal(); modal.remove();
        showToast(ownerId ? '프로필을 저장했어요' : '이 기기에 프로필을 저장했어요');
      } catch (_) {
        showToast('프로필 저장을 확인하지 못했어요. 계정을 확인한 뒤 다시 저장해 주세요.');
        saveButton.disabled = false;
        return;
      }
      renderPublicLibraries();
    });
  }

  // ── 공유 카드 (Canvas 1080×1350) ──────────────────────────────
  async function showShareCard() {
    const name   = localStorage.getItem('profileName')   || '책읽는엄마';
    const avatar = localStorage.getItem('profileAvatar') || '👩';
    const grade = '';
    const region = [localStorage.getItem('profileCity'), localStorage.getItem('profileDistrict')].filter(Boolean).join(' ');
    const books  = Storage.getAllBooks();

    const W = 1080, H = 1350;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    // 배경 그라디언트
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0,   '#FFF8F0');
    bg.addColorStop(0.5, '#FFE8F0');
    bg.addColorStop(1,   '#F8E8FF');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // 장식 원
    ctx.fillStyle = 'rgba(255, 184, 198, 0.18)';
    ctx.beginPath(); ctx.arc(W - 80, 120, 140, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(232, 197, 255, 0.15)';
    ctx.beginPath(); ctx.arc(120, H - 180, 180, 0, Math.PI*2); ctx.fill();

    // 헤더 — 맘스북스
    ctx.fillStyle = '#FF9E9E';
    ctx.font = '700 32px "Gowun Batang", serif';
    ctx.textAlign = 'center';
    ctx.fillText('📚 맘스북스', W/2, 110);
    ctx.fillStyle = 'rgba(139, 139, 139, 0.7)';
    ctx.font = '500 20px sans-serif';
    ctx.fillText('READING TRACKER FOR KIDS', W/2, 145);

    // 아바타 원
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(W/2, 250, 60, 0, Math.PI*2); ctx.fill();
    ctx.font = '64px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(avatar, W/2, 252);
    ctx.textBaseline = 'alphabetic';

    // 닉네임
    ctx.fillStyle = '#4A4A4A';
    ctx.font = '700 44px sans-serif';
    ctx.fillText(name, W/2, 360);

    // 학년·지역
    if (grade || region) {
      ctx.fillStyle = '#8B8B8B';
      ctx.font = '500 24px sans-serif';
      ctx.fillText([grade, region].filter(Boolean).join(' · '), W/2, 400);
    }

    // 큰 숫자 — 이번 달
    ctx.fillStyle = '#8B8B8B';
    ctx.font = '700 22px sans-serif';
    ctx.fillText('이번 달', W/2, 510);

    // 그라디언트 큰 숫자
    const numGrad = ctx.createLinearGradient(0, 530, 0, 700);
    numGrad.addColorStop(0, '#FF9E9E');
    numGrad.addColorStop(1, '#E8C5FF');
    ctx.fillStyle = numGrad;
    ctx.font = '800 200px "Gowun Batang", serif';
    ctx.fillText(String(myStats.monthBooks), W/2, 700);

    ctx.fillStyle = '#FF9E9E';
    ctx.font = '700 36px sans-serif';
    ctx.fillText('권 읽었어요', W/2, 760);

    // 3-칸 통계 박스
    const boxY = 830, boxH = 140;
    const boxes = [
      { num: myStats.weekBooks,  label: '이번 주' },
      { num: myStats.yearBooks,  label: '올해' },
      { num: myStats.streak,     label: '연속 일' },
    ];
    const boxW = (W - 160) / 3;
    boxes.forEach((b, i) => {
      const x = 80 + i * boxW;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      _roundRect(ctx, x + 8, boxY, boxW - 16, boxH, 18);
      ctx.fill();

      ctx.fillStyle = '#FF9E9E';
      ctx.font = '800 56px "Gowun Batang", serif';
      ctx.fillText(String(b.num), x + boxW/2, boxY + 70);

      ctx.fillStyle = '#8B8B8B';
      ctx.font = '600 22px sans-serif';
      ctx.fillText(b.label, x + boxW/2, boxY + 110);
    });

    // 목표 진행
    const goalY = 1020;
    const target = myStats.goalTarget || 20;
    const pct = Math.min(myStats.monthBooks / target, 1);
    ctx.fillStyle = '#4A4A4A';
    ctx.font = '600 28px sans-serif';
    ctx.fillText(`🎯 목표 ${target}권 · ${Math.round(pct*100)}%`, W/2, goalY);
    // 바 배경
    const barX = 140, barW = W - 280, barH = 24, barY = goalY + 30;
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    _roundRect(ctx, barX, barY, barW, barH, 12); ctx.fill();
    // 바 fill
    const barGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    barGrad.addColorStop(0, '#FF9E9E');
    barGrad.addColorStop(1, '#E8C5FF');
    ctx.fillStyle = barGrad;
    _roundRect(ctx, barX, barY, Math.max(barH, barW * pct), barH, 12); ctx.fill();

    // 뱃지
    const unlocked = BADGES.filter(b => b.condition(myStats));
    ctx.fillStyle = '#4A4A4A';
    ctx.font = '600 26px sans-serif';
    ctx.fillText(`🏆 뱃지 ${unlocked.length}/${BADGES.length}`, W/2, 1140);

    // 푸터
    ctx.fillStyle = 'rgba(139, 139, 139, 0.7)';
    ctx.font = '500 22px sans-serif';
    ctx.fillText('우리 아이 독서 기록 · 맘스북스', W/2, H - 60);

    // 카드 미리보기 + 공유 모달
    canvas.toBlob(async (blob) => {
      if (!blob) { showToast('이미지 생성 실패'); return; }
      const url = URL.createObjectURL(blob);
      _showShareCardModal(url, blob, name);
    }, 'image/png', 0.95);
  }

  function _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function _showShareCardModal(imgUrl, blob, name) {
    const modal = document.createElement('div');
    modal.className = 'friend-modal';
    modal.innerHTML = `
      <div class="friend-modal-content" style="max-width:380px;padding:20px">
        <div style="text-align:center;margin-bottom:14px">
          <div style="font-size:14px;font-weight:700;color:var(--text-dark);margin-bottom:4px">📤 독서 기록 공유</div>
          <div style="font-size:12px;color:var(--text-gray)">인스타·카톡으로 자랑하기</div>
        </div>
        <div style="background:#f5f5f5;border-radius:12px;overflow:hidden;margin-bottom:14px">
          <img src="${imgUrl}" alt="공유 카드" style="width:100%;display:block">
        </div>
        <div style="display:flex;gap:8px">
          <button id="shareCardCancel" class="cheer-cancel" style="flex:1;margin:0">닫기</button>
          <button id="shareCardDownload" class="encouragement-btn" style="flex:1;margin:0">📥 저장</button>
          <button id="shareCardShare" class="encouragement-btn" style="flex:1;margin:0">📤 공유</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const close = () => { URL.revokeObjectURL(imgUrl); modal.remove(); };
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    modal.querySelector('#shareCardCancel').addEventListener('click', close);

    modal.querySelector('#shareCardDownload').addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = imgUrl;
      a.download = `momsbooks_${name}_${new Date().toISOString().slice(0,10)}.png`;
      document.body.appendChild(a); a.click(); a.remove();
      showToast('📥 이미지가 저장됐어요');
    });

    modal.querySelector('#shareCardShare').addEventListener('click', async () => {
      try {
        const file = new File([blob], 'momsbooks_share.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: '맘스북스 독서 기록',
            text: `${name}의 독서 기록 — 이번 달 ${myStats.monthBooks}권`,
          });
          close();
        } else {
          showToast('이 기기는 공유 미지원 — 저장 후 직접 공유해주세요');
        }
      } catch (e) {
        if (e.name !== 'AbortError') showToast('공유 실패: ' + e.message);
      }
    });
  }

  function escapeAttr(s) { return String(s ?? '').replace(/"/g, '&quot;'); }
})();
