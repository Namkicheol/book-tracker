/**
 * 1. 기존 "초등" 책들을 학년별로 재분류
 * 2. 유아 책 추가 수집
 */

const fs = require('fs');
const WORKER_URL = 'https://book-tracker-aladin.obangti.workers.dev';

// ━━━ PART 1: 재분류 로직 개선 ━━━
function recategorizeBook(book) {
  const text = `${book.title} ${book.author} ${book.genre}`.toLowerCase();
  const category = (book.categoryName || '').toLowerCase();

  // 유아 키워드
  if (text.includes('0-3세') || text.includes('0~3세') ||
      text.includes('0-5세') || text.includes('0~5세') ||
      text.includes('0-7세') || text.includes('0~7세') ||
      text.includes('유아') || text.includes('영유아') ||
      text.includes('아기') || text.includes('돌잔치') ||
      category.includes('유아') || category.includes('0-7세') ||
      book.genre === '그림책') {
    return '유아';
  }

  // 저학년 키워드
  if (text.includes('1학년') || text.includes('2학년') ||
      text.includes('저학년') || text.includes('1-2학년') ||
      text.includes('초등학교 1') || text.includes('초등학교 2') ||
      text.includes('6-8세') || text.includes('7-8세')) {
    return '초등 저학년';
  }

  // 중학년 키워드
  if (text.includes('3학년') || text.includes('4학년') ||
      text.includes('중학년') || text.includes('3-4학년') ||
      text.includes('초등학교 3') || text.includes('초등학교 4') ||
      text.includes('9-10세') || text.includes('9-11세')) {
    return '초등 중학년';
  }

  // 고학년 키워드
  if (text.includes('5학년') || text.includes('6학년') ||
      text.includes('고학년') || text.includes('5-6학년') ||
      text.includes('초등학교 5') || text.includes('초등학교 6') ||
      text.includes('11-12세') || text.includes('12-13세')) {
    return '초등 고학년';
  }

  // 기본값: 제목 길이/복잡도로 추론
  const titleLength = book.title.length;
  if (titleLength < 10 && book.genre === '그림책') return '유아';
  if (titleLength < 15) return '초등 저학년';
  if (titleLength < 20) return '초등 중학년';
  return '초등 고학년';
}

// ━━━ PART 2: 유아책 추가 수집 ━━━
const INFANT_KEYWORDS = [
  '유아 그림책',
  '0-3세 그림책',
  '0-5세 그림책',
  '아기 그림책',
  '영유아 필독서',
  '첫 그림책',
  '보드북',
];

async function searchAladin(query, page = 1) {
  const params = new URLSearchParams({
    Query: query,
    QueryType: 'Keyword',
    MaxResults: 50,
    start: page,
    SearchTarget: 'Book',
  });

  try {
    const res = await fetch(`${WORKER_URL}/aladin/search?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.item || [];
  } catch (e) {
    return [];
  }
}

function extractIsbn(item) {
  return String(item.isbn13 || item.isbn || '').replace(/\D/g, '');
}

(async () => {
  console.log('━━━ 재분류 + 유아책 확대 시작 ━━━\n');

  const data = JSON.parse(fs.readFileSync('data/book-recommendations.json', 'utf8'));

  // ━━━ STEP 1: 기존 책 재분류 ━━━
  console.log('STEP 1: 기존 "초등" 책 재분류 중...\n');

  let recategorized = 0;
  for (const isbn in data.books) {
    const book = data.books[isbn];

    if (book.targetAge === '초등') {
      const newAge = recategorizeBook(book);
      if (newAge !== '초등') {
        book.targetAge = newAge;
        recategorized++;
        if (recategorized % 50 === 0) {
          console.log(`  재분류: ${recategorized}권`);
        }
      }
    }
  }

  console.log(`✅ STEP 1 완료: ${recategorized}권 재분류\n`);

  // ━━━ STEP 2: 유아책 추가 수집 ━━━
  console.log('STEP 2: 유아책 추가 수집 중...\n');

  let added = 0;

  for (const keyword of INFANT_KEYWORDS) {
    console.log(`  검색: "${keyword}"`);

    for (let page = 1; page <= 5; page++) {
      const items = await searchAladin(keyword, page);
      if (items.length === 0) break;

      for (const item of items) {
        const isbn = extractIsbn(item);
        if (!isbn || isbn.length < 10) continue;
        if (data.books[isbn]) continue; // 이미 있음

        const category = item.categoryName || '';
        if (!category.includes('유아') && !category.includes('그림책')) continue;

        data.books[isbn] = {
          isbn: isbn,
          title: item.title,
          author: item.author,
          publisher: item.publisher,
          thumbnail: item.cover,
          year: parseInt((item.pubDate || '').substring(0, 4)) || 2024,
          targetAge: '유아',
          genre: '그림책',
          lists: [],
          why: '유아를 위한 그림책입니다. 아이의 상상력과 언어 발달에 도움을 줍니다.',
        };

        added++;
        if (added % 20 === 0) {
          console.log(`    ✓ ${added}권 추가`);
        }
      }

      await new Promise(r => setTimeout(r, 300));
    }
  }

  console.log(`✅ STEP 2 완료: 유아책 ${added}권 추가\n`);

  // ━━━ 통계 ━━━
  const stats = {};
  for (const isbn in data.books) {
    const age = data.books[isbn].targetAge;
    stats[age] = (stats[age] || 0) + 1;
  }

  console.log('━━━ 최종 학년별 통계 ━━━');
  for (const [age, count] of Object.entries(stats).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${age}: ${count}권`);
  }

  // ━━━ 저장 ━━━
  data.meta.lastUpdated = new Date().toISOString().split('T')[0];

  fs.writeFileSync(
    'data/book-recommendations.json',
    JSON.stringify(data, null, 2)
  );

  console.log(`\n✅ 완료!`);
  console.log(`   재분류: ${recategorized}권`);
  console.log(`   유아책 추가: ${added}권`);
  console.log(`   총: ${Object.keys(data.books).length}권`);
})();
