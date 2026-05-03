/**
 * 모든 초등 추천 목록 출처 통합 수집
 * - 책따세, 아침독서, 서울대, 학교도서관저널, 어린이도서연구회, 국립도서관
 */

const WORKER_URL = 'https://book-tracker-aladin.obangti.workers.dev';

// 출처별 검색 키워드
const SOURCES = {
  'chaektase': [
    '책따세 추천',
    '책읽는교육사회실천회의',
  ],
  'morning-reading': [
    '아침독서 추천',
    '행복한아침독서',
  ],
  'seoul-univ': [
    '서울대 권장도서',
    '서울대 추천',
  ],
  'slj': [
    '학교도서관저널',
    '학교도서관저널 추천',
  ],
  'childbook': [
    '어린이도서연구회',
    '어린이도서연구회 권장',
  ],
  'nlcy': [
    '국립어린이청소년도서관',
    '국립도서관 추천',
  ],
};

async function searchAladin(query, page = 1) {
  const params = new URLSearchParams({
    Query: query,
    QueryType: 'Keyword',
    MaxResults: 50,
    start: page,
    SearchTarget: 'Book',
  });

  const url = `${WORKER_URL}/aladin/search?${params}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.item || [];
  } catch (e) {
    console.error(`[Search] ${query} 실패:`, e.message);
    return [];
  }
}

function extractIsbn(item) {
  return String(item.isbn13 || item.isbn || '').replace(/\D/g, '');
}

function detectTargetAge(category, title, description) {
  const text = `${category} ${title} ${description}`.toLowerCase();

  if (text.includes('유아') || text.includes('그림책')) return '유아';
  if (text.includes('초등 1') || text.includes('저학년') || text.includes('1-2학년')) return '초등 저학년';
  if (text.includes('초등 3') || text.includes('중학년') || text.includes('3-4학년')) return '초등 중학년';
  if (text.includes('초등 5') || text.includes('고학년') || text.includes('5-6학년')) return '초등 고학년';
  if (text.includes('중학') || text.includes('청소년')) return '청소년';

  if (category.includes('어린이')) return '초등';
  if (category.includes('청소년')) return '청소년';

  return '초등';
}

function detectGenre(category) {
  if (category.includes('문학')) return '문학';
  if (category.includes('그림책')) return '그림책';
  if (category.includes('인문') || category.includes('사회')) return '인문사회';
  if (category.includes('과학')) return '과학';
  if (category.includes('역사')) return '역사';
  return '교양';
}

function generateWhy(lists) {
  const sources = {
    'chaektase': '책읽는교육사회실천회의',
    'morning-reading': '전국 아침독서 프로그램',
    'seoul-univ': '서울대 권장도서선정위원회',
    'slj': '학교도서관저널 추천위원회',
    'childbook': '어린이도서연구회',
    'nlcy': '국립어린이청소년도서관',
  };

  const sourceNames = lists.map(id => sources[id]).filter(Boolean);

  if (sourceNames.length === 0) {
    return '전문가들이 추천하는 검증된 도서입니다.';
  } else if (sourceNames.length === 1) {
    return `${sourceNames[0]}가 선정한 추천도서입니다. 교육 전문가들이 직접 검증한 양서예요.`;
  } else {
    return `${sourceNames.join(', ')} 등 ${sourceNames.length}곳에서 추천한 검증된 도서입니다. 다양한 전문가들의 추천을 받은 명저예요.`;
  }
}

(async () => {
  console.log('📚 모든 초등 추천 목록 통합 수집 시작\n');

  const allBooks = {};  // isbn -> book data
  const bookSources = {};  // isbn -> Set of source IDs

  let totalSearched = 0;

  for (const [sourceId, keywords] of Object.entries(SOURCES)) {
    console.log(`\n━━━ [${sourceId}] 수집 시작 ━━━`);

    for (const keyword of keywords) {
      console.log(`  검색: "${keyword}"`);

      for (let page = 1; page <= 2; page++) {
        const items = await searchAladin(keyword, page);
        console.log(`    Page ${page}: ${items.length}개`);

        if (items.length === 0) break;

        for (const item of items) {
          const isbn = extractIsbn(item);
          if (!isbn || isbn.length < 10) continue;

          totalSearched++;

          const title = item.title || '';
          const desc = item.description || '';

          // 추천 목록 관련 키워드가 있는지 확인
          const isRelevant =
            title.toLowerCase().includes(keyword.toLowerCase()) ||
            desc.includes(keyword) ||
            desc.includes('추천도서') ||
            desc.includes('권장도서') ||
            desc.includes('선정');

          // 어린이/청소년 책인지 확인
          const category = item.categoryName || '';
          const isKidsBook =
            category.includes('어린이') ||
            category.includes('청소년') ||
            category.includes('유아');

          if (!isKidsBook) continue;

          // 출처 기록
          if (!bookSources[isbn]) {
            bookSources[isbn] = new Set();
          }
          bookSources[isbn].add(sourceId);

          // 책 데이터 저장 (처음 발견 시)
          if (!allBooks[isbn]) {
            allBooks[isbn] = {
              isbn: isbn,
              title: item.title,
              author: item.author,
              publisher: item.publisher,
              year: parseInt((item.pubDate || '').substring(0, 4)) || 2024,
              targetAge: detectTargetAge(category, title, desc),
              genre: detectGenre(category),
            };

            console.log(`      ✓ ${item.title} [${allBooks[isbn].targetAge}]`);
          }
        }

        await new Promise(r => setTimeout(r, 500));
      }
    }

    console.log(`  → ${sourceId}: ${Object.keys(allBooks).length}권 수집됨`);
  }

  // lists와 why 추가
  for (const isbn in allBooks) {
    const lists = Array.from(bookSources[isbn] || []);
    allBooks[isbn].lists = lists;
    allBooks[isbn].why = generateWhy(lists);
  }

  console.log(`\n✅ 최종: ${Object.keys(allBooks).length}권 수집 완료`);
  console.log(`   (총 ${totalSearched}개 검색됨)`);

  // 출처별 통계
  const stats = {};
  for (const isbn in allBooks) {
    for (const sourceId of allBooks[isbn].lists) {
      stats[sourceId] = (stats[sourceId] || 0) + 1;
    }
  }

  console.log('\n━━━ 출처별 통계 ━━━');
  for (const [sourceId, count] of Object.entries(stats).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${sourceId}: ${count}권`);
  }

  const fs = require('fs');
  fs.writeFileSync(
    'data/all-sources-collected.json',
    JSON.stringify({
      collectedAt: new Date().toISOString(),
      method: 'Multiple sources search',
      count: Object.keys(allBooks).length,
      stats: stats,
      books: allBooks,
    }, null, 2)
  );

  console.log('\n✅ data/all-sources-collected.json 저장 완료!');
  console.log('\n다음: book-recommendations.json에 병합');
})();
