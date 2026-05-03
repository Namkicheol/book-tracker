/**
 * 성인용/수험서 도서 필터링
 */

const fs = require('fs');

// 제외할 키워드 (제목, 저자, 출판사에서 검색)
const EXCLUDE_KEYWORDS = [
  // 수험서
  '공무원', '수험', '기출', '모의고사', '봉투모의', '합격', '시험대비',
  '9급', '7급', '5급', 'PSAT', '경찰', '소방', '군무원',

  // 법률
  '형법', '민법', '상법', '행정법', '헌법', '형사소송법', '민사소송법',
  '변호사시험', '법학', '로스쿨', '사법시험',

  // 자격증
  '재경관리', '세무사', '회계사', '공인회계사', 'CPA', 'CFA',
  '관세사', '감정평가사', '변리사', '법무사', '공인중개사',
  '주택관리사', '사회복지사', '보육교사', '임용',

  // 대학 수험
  '수능', '내신', '기말고사', '중간고사', '학력평가', '모평',
  '수학능력시험', 'EBS', '수능특강',

  // 성인 교육
  '토익', 'TOEIC', 'TOEFL', 'IELTS', 'HSK', 'JLPT',
  '편입', '전공영어', '학점은행',

  // 출판 연도 (너무 오래된 책)
  // 제목에 연도가 들어간 수험서들
];

// 제외할 출판사
const EXCLUDE_PUBLISHERS = [
  '에듀윌', '해커스', '박문각', '메가공무원', '에스티유니타스', 'SD에듀',
  '영진닷컴', '시대고시기획', '고시동네', '고시넷', '공단기',
  '에듀피디', '위포트', '수비니겨', '권규호언어연구실',
  '느루(미래인재컴퍼니)', 'EBS', 'EBS한국교육방송공사',
  '이투스북', '메가스터디', '비상교육', '천재교육', '미래엔',
];

(async () => {
  console.log('━━━ 성인용/수험서 도서 필터링 시작 ━━━\n');

  const data = JSON.parse(fs.readFileSync('data/book-recommendations.json', 'utf8'));

  let removed = 0;
  const removeList = [];

  for (const isbn in data.books) {
    const book = data.books[isbn];

    // 청소년/성인용은 무조건 제외
    if (book.targetAge === '청소년' || book.targetAge === '성인') {
      removeList.push(isbn);
      removed++;
      continue;
    }

    // 초등/유아만 검사
    if (!book.targetAge || !book.targetAge.includes('초등') && !book.targetAge.includes('유아')) {
      continue;
    }

    const text = `${book.title} ${book.author} ${book.publisher}`.toLowerCase();

    // 키워드 검사
    const hasExcludeKeyword = EXCLUDE_KEYWORDS.some(kw =>
      text.includes(kw.toLowerCase())
    );

    // 출판사 검사
    const hasExcludePublisher = EXCLUDE_PUBLISHERS.some(pub =>
      (book.publisher || '').includes(pub)
    );

    // 제목에 2024, 2025, 2026, 2027 등 연도가 들어가고 "모의고사", "기출" 같은 게 있으면
    const hasYearInTitle = /20\d{2}/.test(book.title) &&
      (book.title.includes('모의고사') || book.title.includes('기출') ||
       book.title.includes('합격') || book.title.includes('봉투'));

    if (hasExcludeKeyword || hasExcludePublisher || hasYearInTitle) {
      removeList.push(isbn);
      removed++;

      if (removed % 50 === 0) {
        console.log(`  제거: ${removed}권`);
      }
    }
  }

  // 제거
  for (const isbn of removeList) {
    delete data.books[isbn];
  }

  console.log(`✅ 필터링 완료: ${removed}권 제거\n`);

  // 통계
  const stats = {};
  for (const isbn in data.books) {
    const age = data.books[isbn].targetAge;
    stats[age] = (stats[age] || 0) + 1;
  }

  console.log('━━━ 최종 학년별 통계 ━━━');
  for (const [age, count] of Object.entries(stats).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${age}: ${count}권`);
  }

  // 저장
  data.meta.lastUpdated = new Date().toISOString().split('T')[0];

  fs.writeFileSync(
    'data/book-recommendations.json',
    JSON.stringify(data, null, 2)
  );

  console.log(`\n✅ 완료! 총 ${Object.keys(data.books).length}권`);
})();
