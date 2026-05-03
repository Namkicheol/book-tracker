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
    checkEncouragement();
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
      settingsBtn.addEventListener('click', () => {
        showToast('프로필 설정 (준비 중)');
      });
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
      profileName.addEventListener('click', () => {
        const current = localStorage.getItem('profileName') || '책읽는엄마';
        const newName = prompt('닉네임을 입력하세요', current);
        if (newName && newName.trim()) {
          localStorage.setItem('profileName', newName.trim());
          profileName.textContent = newName.trim();
          showToast('✅ 닉네임이 변경되었어요!');
        }
      });
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
  function showAvatarPicker() {
    const avatars = ['👩', '👨', '👧', '👦', '🧑', '👶', '🐰', '🐻', '🐱', '🐶', '🦊', '🐼', '🦁', '🐯', '🐨', '🐷'];

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
        document.getElementById('profileAvatar').textContent = emoji;
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
})();
