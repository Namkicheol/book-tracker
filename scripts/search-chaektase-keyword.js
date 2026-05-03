/**
 * 알라딘에서 "책따세" 키워드로 검색해서 추천도서 수집
 */

const WORKER_URL = 'https://book-tracker-aladin.obangti.workers.dev';

const SEARCH_KEYWORDS = [
  '책따세 추천',
  '책읽는교육사회실천회의',
  '책따세 초등',
  '책따세 어린이',
];

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
    console.error(`[Search "${query}"] 실패:`, e.message);
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

(async () => {
  console.log('📚 알라딘 "책따세" 키워드 검색 시작\n');

  const allBooks = {};
  const seenIsbns = new Set();

  for (const keyword of SEARCH_KEYWORDS) {
    console.log(`\n[${keyword}] 검색 중...`);

    for (let page = 1; page <= 3; page++) {
      const items = await searchAladin(keyword, page);
      console.log(`  Page ${page}: ${items.length}개`);

      if (items.length === 0) break;

      for (const item of items) {
        const isbn = extractIsbn(item);
        if (!isbn || isbn.length < 10) continue;
        if (seenIsbns.has(isbn)) continue;

        // "책따세" 관련 책인지 확인
        const title = item.title || '';
        const desc = item.description || '';
        const isRelevant =
          title.includes('책따세') ||
          desc.includes('책따세') ||
          desc.includes('책읽는교육사회실천회의') ||
          desc.includes('추천도서');

        if (!isRelevant) continue;

        seenIsbns.add(isbn);

        allBooks[isbn] = {
          isbn: isbn,
          title: item.title,
          author: item.author,
          publisher: item.publisher,
          lists: ['chaektase'],
          year: parseInt((item.pubDate || '').substring(0, 4)) || 2024,
          targetAge: detectTargetAge(item.categoryName || '', title, desc),
          genre: detectGenre(item.categoryName || ''),
          why: `책읽는교육사회실천회의가 선정한 추천도서입니다. 교육 현장 교사들이 직접 읽고 검증한 양서예요.`,
        };

        console.log(`    ✓ ${item.title} [${allBooks[isbn].targetAge}]`);
      }

      await new Promise(r => setTimeout(r, 500));
    }

    console.log(`  → 현재까지 ${seenIsbns.size}권`);
  }

  console.log(`\n✅ 총 ${Object.keys(allBooks).length}권 수집 완료`);

  const fs = require('fs');
  fs.writeFileSync(
    'data/chaektase-keyword-search.json',
    JSON.stringify({
      collectedAt: new Date().toISOString(),
      method: 'Aladin keyword search',
      count: Object.keys(allBooks).length,
      books: allBooks,
    }, null, 2)
  );

  console.log('✅ data/chaektase-keyword-search.json 저장 완료!');
})();
