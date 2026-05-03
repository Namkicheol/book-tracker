/**
 * 알라딘 책따세 컬렉션 전체 크롤링
 * CID=200316 (책따세 추천도서)
 */

const WORKER_URL = 'https://book-tracker-aladin.obangti.workers.dev';
const CHAEKTASE_CID = '200316';

async function fetchChaektaseList(page = 1) {
  const params = new URLSearchParams({
    QueryType: 'Bestseller',
    CategoryId: CHAEKTASE_CID,
    MaxResults: 50,
    start: page,
    Sort: 'PublishTime',  // 최신순
  });

  const url = `${WORKER_URL}/aladin/list?${params}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.item || [];
  } catch (e) {
    console.error(`[Page ${page}] 실패:`, e.message);
    return [];
  }
}

async function fetchDetailByIsbn(isbn) {
  const params = new URLSearchParams({ isbn });
  const url = `${WORKER_URL}/aladin/lookup?${params}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.item && data.item[0] ? data.item[0] : null;
  } catch (e) {
    console.error(`[Lookup ${isbn}] 실패:`, e.message);
    return null;
  }
}

function extractIsbn(item) {
  return String(item.isbn13 || item.isbn || '').replace(/\D/g, '');
}

function detectTargetAge(category, description) {
  const text = `${category} ${description}`.toLowerCase();

  if (text.includes('유아') || text.includes('그림책')) return '유아';
  if (text.includes('초등 1') || text.includes('초등 저학년') || text.includes('1-2학년')) return '초등 저학년';
  if (text.includes('초등 3') || text.includes('초등 중학년') || text.includes('3-4학년')) return '초등 중학년';
  if (text.includes('초등 5') || text.includes('초등 고학년') || text.includes('5-6학년')) return '초등 고학년';
  if (text.includes('중학') || text.includes('청소년')) return '청소년';

  // 카테고리 기반 추정
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

function generateWhy(book) {
  const desc = book.description || '';
  const title = book.title || '';

  // 간단한 추천 이유 생성 (나중에 수동 개선)
  return `책읽는교육사회실천회의가 선정한 추천도서입니다. 교육 현장 교사들이 직접 읽고 검증한 양서로, ${detectTargetAge(book.categoryName, desc)} 독자에게 적합해요.`;
}

(async () => {
  console.log('📚 책따세 추천도서 100권 수집 시작\n');

  const allBooks = {};
  const seenIsbns = new Set();

  // 여러 페이지에서 수집 (페이지당 50개, 총 3페이지 = 최대 150개)
  for (let page = 1; page <= 3; page++) {
    console.log(`\n[Page ${page}] 수집 중...`);

    const items = await fetchChaektaseList(page);
    console.log(`  → ${items.length}개 검색됨`);

    if (items.length === 0) break;

    for (const item of items) {
      const isbn = extractIsbn(item);
      if (!isbn || isbn.length < 10) continue;
      if (seenIsbns.has(isbn)) continue;

      seenIsbns.add(isbn);

      // 상세 정보 가져오기
      console.log(`  ⋯ ${item.title}`);
      const detail = await fetchDetailByIsbn(isbn);

      const source = detail || item;

      allBooks[isbn] = {
        isbn: isbn,
        title: source.title,
        author: source.author,
        publisher: source.publisher,
        lists: ['chaektase'],
        year: parseInt((source.pubDate || '').substring(0, 4)) || 2024,
        targetAge: detectTargetAge(source.categoryName || '', source.description || ''),
        genre: detectGenre(source.categoryName || ''),
        why: generateWhy(source),
      };

      console.log(`    ✓ ${source.title} - ${allBooks[isbn].targetAge}`);

      // Rate limit (API 과부하 방지)
      await new Promise(r => setTimeout(r, 300));
    }

    console.log(`\n[Page ${page}] ${seenIsbns.size}개 수집됨`);

    // 100권 넘으면 중단
    if (seenIsbns.size >= 100) break;

    // 페이지 간 대기
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\n✅ 총 ${Object.keys(allBooks).length}권 수집 완료`);

  const fs = require('fs');
  fs.writeFileSync(
    'data/chaektase-full.json',
    JSON.stringify({
      collectedAt: new Date().toISOString(),
      source: '책따세 추천도서 (알라딘 CID=200316)',
      count: Object.keys(allBooks).length,
      books: allBooks,
    }, null, 2)
  );

  console.log('✅ data/chaektase-full.json 저장 완료!');
  console.log('\n다음: book-recommendations.json에 병합');
})();
