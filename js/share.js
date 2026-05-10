/**
 * 맘스북스 — Share/Ranking page
 *
 * 엄마들 자극용 독서 랭킹 시스템
 */

(function () {
  'use strict';

  let currentTab = 'class';
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

  // ── 더미 랭킹 데이터 (MVP용) ──────────────────────────────────
  const MOCK_RANKINGS = {
    class: [
      { rank: 1, name: '김○○', books: 32, trend: '⬆️ 3', recent: '해리포터 7, 나의 라임오렌지나무' },
      { rank: 2, name: '박○○', books: 28, trend: '⬇️ 1', recent: '어린왕자, 채식주의자' },
      { rank: 3, name: '우리 아이', books: 27, trend: '➡️ 0', recent: '순례 주택, 리얼 마래', isMe: true },
      { rank: 4, name: '이○○', books: 25, trend: '⬆️ 1', recent: '완득이, 소년이 온다' },
      { rank: 5, name: '정○○', books: 23, trend: '➡️ 0', recent: '참을 수 없는 존재의 가벼움' },
    ],
    region: [
      { rank: 1, name: '서○○', books: 45, trend: '⬆️ 2', recent: '도둑맞은 집중력, 총균쇠' },
      { rank: 2, name: '최○○', books: 38, trend: '⬆️ 5', recent: '사피엔스, 코스모스' },
      { rank: 3, name: '우리 아이', books: 27, trend: '⬇️ 1', recent: '순례 주택, 리얼 마래', isMe: true },
      { rank: 4, name: '강○○', books: 26, trend: '➡️ 0', recent: '이기적 유전자, 침묵의 봄' },
      { rank: 5, name: '윤○○', books: 24, trend: '⬆️ 3', recent: '정의란 무엇인가, 국가' },
    ],
    national: [
      { rank: 1, name: '서울 박○○', books: 156, trend: '⬆️ 1', recent: '전쟁과 평화, 카라마조프 가의 형제들' },
      { rank: 2, name: '경기 김○○', books: 142, trend: '⬇️ 1', recent: '율리시스, 잃어버린 시간을 찾아서' },
      { rank: 3, name: '부산 최○○', books: 138, trend: '➡️ 0', recent: '마의 산, 파우스트' },
      { rank: 17, name: '우리 아이', books: 27, trend: '⬆️ 12', recent: '순례 주택, 리얼 마래', isMe: true },
    ],
  };

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
          time: '1시간 전',
          unread: true,
          timestamp: now - 3600000,
        });
      }
    }

    // 2. 친구 활동 (더미)
    const friends = [
      { name: '김○○', action: '3권을 읽었어요' },
      { name: '박○○', action: '목표를 달성했어요' },
    ];
    friends.forEach((f, i) => {
      notifications.push({
        id: `friend_${i}`,
        icon: '👥',
        text: `${f.name}님이 ${f.action}!`,
        time: `${i + 2}시간 전`,
        unread: i === 0,
        timestamp: now - (i + 2) * 3600000,
      });
    });

    // 3. 목표 진행
    const percent = Math.round((myStats.monthBooks / myStats.goalTarget) * 100);
    if (percent >= 80 && percent < 100) {
      notifications.push({
        id: 'goal_near',
        icon: '🎯',
        text: `목표까지 ${myStats.goalTarget - myStats.monthBooks}권 남았어요! 거의 다 왔어요!`,
        time: '5시간 전',
        unread: false,
        timestamp: now - 5 * 3600000,
      });
    } else if (percent >= 100) {
      notifications.push({
        id: 'goal_done',
        icon: '🎉',
        text: '이번 달 목표를 달성했어요! 축하합니다!',
        time: '12시간 전',
        unread: true,
        timestamp: now - 12 * 3600000,
      });
    }

    // 4. 랭킹 변동 (더미)
    notifications.push({
      id: 'rank_change',
      icon: '📈',
      text: '우리 반 랭킹이 3위로 올라갔어요!',
      time: '어제',
      unread: false,
      timestamp: now - 24 * 3600000,
    });

    // 5. 뱃지 획득
    const newBadges = BADGES.filter(b => b.condition(myStats)).slice(0, 1);
    if (newBadges.length > 0) {
      notifications.push({
        id: 'badge_new',
        icon: newBadges[0].emoji,
        text: `새 뱃지 획득! "${newBadges[0].name}"`,
        time: '2일 전',
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
        <div class="encouragement-icon">${data.icon}</div>
        <div class="encouragement-title">${data.title}</div>
        <div class="encouragement-message">${data.message}</div>
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
      if (event === 'SIGNED_IN' && session) {
        if (window.Sync) {
          const row = await window.Sync.syncProfileOnSignIn();
          if (row) {
            loadProfile();
            myStats.goalTarget = row.monthly_goal || myStats.goalTarget;
            renderGoal();
          }
        }
        showToast('✅ 로그인 완료');
      }
      if (event === 'SIGNED_OUT') {
        showToast('로그아웃 되었어요');
      }
      refreshAuthUI();
    });
  }

  async function refreshAuthUI() {
    const btn = document.getElementById('authBtn');
    if (!btn) return;
    const user = await window.SB.getUser();
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
    const user = await window.SB.getUser();
    if (user) {
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
    const grade = localStorage.getItem('profileGrade') || '초5';
    const region = localStorage.getItem('profileRegion') || '강남구';

    document.getElementById('profileAvatar').textContent = avatar;
    document.getElementById('profileName').textContent = name;
    document.getElementById('profileGrade').textContent = grade;
    document.getElementById('profileRegion').textContent = region;
  }

  // ── 내 통계 계산 (로컬 스토리지에서) ─────────────────────────
  let myStats = {};

  function calculateMyStats() {
    const books = Storage.getAllBooks();
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearAgo = new Date(now.getFullYear(), 0, 1);

    const thisWeek = books.filter(b => new Date(b.readDate) >= weekAgo).length;
    const thisMonth = books.filter(b => new Date(b.readDate) >= monthAgo).length;
    const thisYear = books.filter(b => new Date(b.readDate) >= yearAgo).length;

    // 연속 독서일 계산
    const streak = calculateStreak(books);

    // 매주 독서 체크
    const weeksInRow = calculateWeeksInRow(books);

    // 두꺼운 책 (페이지 수 300 이상 - 더미로 임의 계산)
    const thickBooks = Math.floor(books.length * 0.15);

    // 장르별 최다 (더미)
    const genreBooks = Math.floor(thisYear * 0.4);

    myStats = {
      total: books.length,
      weekBooks: thisWeek,
      monthBooks: thisMonth,
      yearBooks: thisYear,
      streak,
      weeksInRow,
      thickBooks,
      genreBooks,
      rank: 3, // 더미
      goalTarget: parseInt(localStorage.getItem('monthlyGoal') || '20'),
      goalAchievedEarly: false, // TODO: 실제 계산
    };

    document.getElementById('statWeek').textContent = thisWeek;
    document.getElementById('statMonth').textContent = thisMonth;
    document.getElementById('statYear').textContent = thisYear;

    // 더미 데이터 업데이트 (내 실제 수치 반영)
    ['class', 'region', 'national'].forEach(tab => {
      const me = MOCK_RANKINGS[tab].find(r => r.isMe);
      if (me) me.books = thisMonth;
    });
  }

  function calculateStreak(books) {
    if (books.length === 0) return 0;
    const sorted = books.map(b => new Date(b.readDate).setHours(0,0,0,0))
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
  function renderRanking() {
    const list = document.getElementById('rankList');
    const data = MOCK_RANKINGS[currentTab];

    if (!data || data.length === 0) {
      list.innerHTML = `
        <div class="empty-rank">
          <div class="empty-rank-icon">📚</div>
          <p>아직 랭킹 데이터가 없어요</p>
        </div>
      `;
      return;
    }

    list.innerHTML = data.map(renderRankItem).join('');

    // 클릭 이벤트
    list.querySelectorAll('.rank-item').forEach((item, idx) => {
      item.addEventListener('click', () => {
        if (data[idx].isMe) {
          location.href = 'index.html';
        } else {
          showFriendActions(data[idx]);
        }
      });
    });
  }

  // ── 친구 액션 모달 ────────────────────────────────────────────
  function showFriendActions(friend) {
    const modal = document.createElement('div');
    modal.className = 'friend-modal';
    modal.innerHTML = `
      <div class="friend-modal-content">
        <div class="friend-modal-header">
          <div class="friend-avatar">👤</div>
          <div class="friend-info">
            <div class="friend-name">${escapeHtml(friend.name)}</div>
            <div class="friend-stats">${friend.books}권 읽음</div>
          </div>
          <button class="friend-close">✕</button>
        </div>
        <div class="friend-actions">
          <button class="friend-action-btn" data-action="cheer">
            💌 응원하기
          </button>
          <button class="friend-action-btn" data-action="follow">
            ➕ 친구 추가
          </button>
          <button class="friend-action-btn" data-action="library">
            📚 서재 구경
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.friend-close').addEventListener('click', () => {
      modal.remove();
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    modal.querySelectorAll('.friend-action-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action === 'cheer') {
          showCheerMessages(friend);
        } else if (action === 'follow') {
          showToast(`✅ ${friend.name}님을 친구로 추가했어요!`);
          modal.remove();
        } else if (action === 'library') {
          showToast(`📚 ${friend.name}님의 서재 (준비 중)`);
          modal.remove();
        }
      });
    });
  }

  // ── 응원 메시지 ──────────────────────────────────────────────
  function showCheerMessages(friend) {
    const messages = [
      '📚 화이팅! 우리 아이도 따라잡을게요!',
      '👏 대단해요! 어떤 책 읽으셨어요?',
      '🔥 저도 열심히 읽을게요!',
      '💪 함께 독서왕 도전해요!',
      '✨ 꾸준한 독서 습관 부러워요!',
      '🎯 목표 달성 축하드려요!',
    ];

    const modal = document.createElement('div');
    modal.className = 'friend-modal';
    modal.innerHTML = `
      <div class="friend-modal-content">
        <div class="cheer-header">
          <span class="cheer-icon">💌</span>
          <span class="cheer-title">${escapeHtml(friend.name)}님께 응원 보내기</span>
        </div>
        <div class="cheer-messages">
          ${messages.map(msg => `
            <button class="cheer-msg-btn">${escapeHtml(msg)}</button>
          `).join('')}
        </div>
        <button class="cheer-cancel">취소</button>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.cheer-cancel').addEventListener('click', () => {
      modal.remove();
    });

    modal.querySelectorAll('.cheer-msg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        showToast(`💌 ${friend.name}님께 응원을 보냈어요!`);
        modal.remove();
      });
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  function renderRankItem(r) {
    const medal = r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : '';
    const meClass = r.isMe ? 'me' : '';

    return `
      <div class="rank-item ${meClass}">
        <div class="rank-number ${medal ? 'medal' : ''}">
          ${medal || r.rank}
        </div>
        <div class="rank-info">
          <div class="rank-name">${escapeHtml(r.name)}</div>
          <div class="rank-books">이번 달 ${r.books}권</div>
          <div class="rank-recent">최근: ${escapeHtml(r.recent)}</div>
        </div>
        <div class="rank-count">
          <div class="rank-count-num">${r.books}</div>
          <div class="rank-count-label">권</div>
          <div class="rank-trend">${r.trend}</div>
        </div>
      </div>
    `;
  }

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
          localStorage.setItem('monthlyGoal', newGoal);
          myStats.goalTarget = parseInt(newGoal);
          renderGoal();
          showToast(`✅ 목표가 ${newGoal}권으로 변경되었습니다!`);
        }
      });
    }

    const profileAvatar = document.getElementById('profileAvatar');
    if (profileAvatar) {
      profileAvatar.addEventListener('click', showAvatarPicker);
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
        localStorage.setItem('profileAvatar', emoji);
        const mainAvatar = document.getElementById('profileAvatar');
        if (mainAvatar) mainAvatar.textContent = emoji;
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
    const cur = {
      name:   localStorage.getItem('profileName')   || '책읽는엄마',
      grade:  localStorage.getItem('profileGrade')  || '초5',
      region: localStorage.getItem('profileRegion') || '강남구',
      goal:   parseInt(localStorage.getItem('monthlyGoal') || '20', 10),
      avatar: localStorage.getItem('profileAvatar') || '👩',
    };
    const grades = ['초1','초2','초3','초4','초5','초6','중1','중2','중3','고1','고2','고3','기타'];

    const modal = document.createElement('div');
    modal.className = 'friend-modal';
    modal.innerHTML = `
      <div class="friend-modal-content" style="max-width:360px">
        <div class="friend-modal-header">
          <button class="friend-avatar" id="profEditAvatar" type="button"
            style="background:linear-gradient(135deg,#FFE0EC,#FFD1DC);border:none;cursor:pointer"
            title="아바타 변경">${cur.avatar}</button>
          <div class="friend-info">
            <div class="friend-name">프로필 편집</div>
            <div class="friend-stats">아바타·이름은 직접 클릭해서도 변경 가능</div>
          </div>
          <button class="friend-close" id="profEditClose">✕</button>
        </div>

        <div id="profEditAuthBanner" style="display:none"></div>

        <div style="display:flex;flex-direction:column;gap:14px">
          <label style="display:flex;flex-direction:column;gap:6px">
            <span style="font-size:12px;font-weight:700;color:var(--text-gray)">닉네임</span>
            <input id="profEditName" type="text" value="${escapeAttr(cur.name)}" maxlength="20"
              style="padding:10px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:14px;background:#fff">
          </label>
          <label style="display:flex;flex-direction:column;gap:6px">
            <span style="font-size:12px;font-weight:700;color:var(--text-gray)">학년</span>
            <select id="profEditGrade"
              style="padding:10px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:14px;background:#fff">
              ${grades.map(g => `<option value="${g}"${g===cur.grade?' selected':''}>${g}</option>`).join('')}
            </select>
          </label>
          <label style="display:flex;flex-direction:column;gap:6px">
            <span style="font-size:12px;font-weight:700;color:var(--text-gray)">지역 (예: 강남구, 분당)</span>
            <input id="profEditRegion" type="text" value="${escapeAttr(cur.region)}" maxlength="20"
              style="padding:10px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:14px;background:#fff">
          </label>
          <label style="display:flex;flex-direction:column;gap:6px">
            <span style="font-size:12px;font-weight:700;color:var(--text-gray)">이번 달 목표 (권)</span>
            <input id="profEditGoal" type="number" min="1" max="200" value="${cur.goal}"
              style="padding:10px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:14px;background:#fff">
          </label>
        </div>

        <div style="display:flex;gap:8px;margin-top:18px">
          <button id="profEditCancel" class="cheer-cancel" style="flex:1;margin:0">취소</button>
          <button id="profEditSave" class="encouragement-btn" style="flex:1;margin:0">저장</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const close = () => modal.remove();
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    modal.querySelector('#profEditClose').addEventListener('click', close);
    modal.querySelector('#profEditCancel').addEventListener('click', close);

    const avatarBtn = modal.querySelector('#profEditAvatar');
    avatarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showAvatarPicker(() => {
        avatarBtn.textContent = localStorage.getItem('profileAvatar') || '👩';
      });
    });

    // 비로그인 상태면 모달 상단에 로그인 CTA 배너 노출
    if (window.SB && window.SB.enabled) {
      window.SB.getUser().then(user => {
        if (user) return;
        const banner = modal.querySelector('#profEditAuthBanner');
        if (!banner) return;
        banner.style.cssText = 'display:block;background:linear-gradient(135deg,#FFF8F0,#FFE8F0);border-radius:14px;padding:14px;margin-bottom:14px;font-size:13px;line-height:1.55;color:#4A4A4A';
        banner.innerHTML = `
          <div style="font-weight:800;color:#FF7B7B;margin-bottom:6px">💝 로그인하면 더 좋아요</div>
          <div style="margin-bottom:10px">기기 바꿔도 같은 프로필·서재 그대로, 곧 다른 엄마들과 랭킹·인기책도 둘러볼 수 있어요</div>
          <button type="button" id="profEditLoginBtn"
            style="width:100%;padding:10px;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;background:#FFD1DC;color:#C2185B">
            로그인 / 가입
          </button>`;
        const loginBtn = banner.querySelector('#profEditLoginBtn');
        if (loginBtn && window.AuthUI) {
          loginBtn.addEventListener('click', () => {
            close();
            window.AuthUI.showLoginPicker();
          });
        }
      });
    }

    modal.querySelector('#profEditSave').addEventListener('click', () => {
      const name   = modal.querySelector('#profEditName').value.trim()   || cur.name;
      const grade  = modal.querySelector('#profEditGrade').value         || cur.grade;
      const region = modal.querySelector('#profEditRegion').value.trim() || cur.region;
      const goal   = Math.max(1, parseInt(modal.querySelector('#profEditGoal').value, 10) || cur.goal);

      localStorage.setItem('profileName',   name);
      localStorage.setItem('profileGrade',  grade);
      localStorage.setItem('profileRegion', region);
      localStorage.setItem('monthlyGoal',   String(goal));

      document.getElementById('profileName').textContent   = name;
      document.getElementById('profileGrade').textContent  = grade;
      document.getElementById('profileRegion').textContent = region;
      myStats.goalTarget = goal;
      renderGoal();

      close();
      showToast('✅ 프로필이 저장됐어요');

      // 로그인 상태면 Supabase에도 저장 (실패해도 localStorage는 이미 반영됨)
      if (window.SB && window.SB.enabled) {
        window.SB.upsertProfile({
          nickname: name,
          avatar: localStorage.getItem('profileAvatar') || '👩',
          grade: grade,
          region: region,
          monthly_goal: goal
        }).catch(() => {});
      }
    });
  }

  // ── 공유 카드 (Canvas 1080×1350) ──────────────────────────────
  async function showShareCard() {
    const name   = localStorage.getItem('profileName')   || '책읽는엄마';
    const avatar = localStorage.getItem('profileAvatar') || '👩';
    const grade  = localStorage.getItem('profileGrade')  || '';
    const region = localStorage.getItem('profileRegion') || '';
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
