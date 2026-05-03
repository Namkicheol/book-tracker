/**
 * 추천 도서 데이터 수집 스크립트
 *
 * 실행: node scripts/collect-recommendations.js
 */

const WORKER_URL = 'https://book-tracker-aladin.obangti.workers.dev';

// 수집할 컬렉션 목록
const COLLECTIONS = {
  chaektase_elem: {
    // 책따세 초등 저학년
    query: '책따세 초등 저학년',
    maxResults: 50,
    sourceId: 'chaektase',
    targetAge: '초등 저학년',
  },
  chaektase_high: {
    // 책따세 초등 고학년
    query: '책따세 초등 고학년',
    maxResults: 50,
    sourceId: 'chaektase',
    targetAge: '초등 고학년',
  },
  morning_reading: {
    // 아침독서 추천도서
    query: '아침독서 초등',
    maxResults: 50,
    sourceId: 'morning-reading',
    targetAge: '초등',
  },
};

// 알라딘 검색
async function aladinSearch(query, maxResults = 50) {
  const params = new URLSearchParams({
    QueryType: 'Keyword',
    Query: query,
    MaxResults: maxResults,
    start: 1,
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

// 알라딘 lookup (상세 정보)
async function aladinLookup(isbn) {
  const params = new URLSearchParams({
    isbn: String(isbn).replace(/\D/g, ''),
  });

  const url = `${WORKER_URL}/aladin/lookup?${params}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.item && data.item[0] ? data.item[0] : null;
  } catch (e) {
    console.error(`[Lookup] ${isbn} 실패:`, e.message);
    return null;
  }
}

// ISBN 추출
function extractIsbn(item) {
  const isbn = item.isbn13 || item.isbn || '';
  return String(isbn).replace(/\D/g, '');
}

// 추천 이유 생성
function generateWhy(item, collection) {
  const title = item.title || '';
  const description = item.description || '';
  const author = item.author || '';

  // 간단한 추천 이유 (나중에 수동으로 개선 가능)
  if (collection.sourceId === 'chaektase') {
    return `책읽는교육사회실천회의가 선정한 ${collection.targetAge} 추천도서입니다. 교육 현장 교사들이 직접 읽고 검증한 양서예요.`;
  } else if (collection.sourceId === 'morning-reading') {
    return `전국 학교 아침독서 프로그램 공식 추천 도서입니다. 많은 학교에서 실제로 읽히고 있는 검증된 책이에요.`;
  }
  return '전문가들이 추천하는 도서입니다.';
}

// 장르 추출
function extractGenre(item) {
  const category = item.categoryName || '';
  if (category.includes('문학')) return '문학';
  if (category.includes('인문')) return '인문사회';
  if (category.includes('과학')) return '과학';
  if (category.includes('그림책')) return '그림책';
  return '기타';
}

// 메인 수집 함수
async function collectAll() {
  const allBooks = {};

  for (const [key, collection] of Object.entries(COLLECTIONS)) {
    console.log(`\n[${key}] 수집 중: ${collection.query}`);

    const items = await aladinSearch(collection.query, collection.maxResults);
    console.log(`  → ${items.length}개 검색됨`);

    let added = 0;
    for (const item of items.slice(0, 30)) {  // 최대 30개씩
      const isbn = extractIsbn(item);
      if (!isbn || isbn.length < 10) continue;

      // 이미 있으면 스킵
      if (allBooks[isbn]) continue;

      // lookup으로 상세 정보 가져오기
      const detail = await aladinLookup(isbn);
      if (!detail) continue;

      allBooks[isbn] = {
        isbn: isbn,
        title: detail.title || item.title,
        author: detail.author || item.author,
        publisher: detail.publisher || item.publisher,
        lists: [collection.sourceId],
        year: parseInt((detail.pubDate || item.pubDate || '').substring(0, 4)) || 2024,
        targetAge: collection.targetAge,
        genre: extractGenre(detail),
        why: generateWhy(detail, collection),
      };

      added++;
      console.log(`    ✓ ${detail.title} - ${detail.author}`);

      // API 레이트 리밋 방지
      await new Promise(r => setTimeout(r, 200));
    }

    console.log(`  → ${added}개 추가됨`);
  }

  return allBooks;
}

// 실행
(async () => {
  console.log('📚 추천 도서 데이터 수집 시작\n');

  try {
    const books = await collectAll();

    console.log(`\n✅ 총 ${Object.keys(books).length}개 수집 완료`);
    console.log('\n결과를 data/collected-books.json에 저장합니다...');

    const fs = require('fs');
    const output = {
      collectedAt: new Date().toISOString(),
      count: Object.keys(books).length,
      books: books,
    };

    fs.writeFileSync(
      'data/collected-books.json',
      JSON.stringify(output, null, 2)
    );

    console.log('✅ 저장 완료!');
    console.log('\n다음 단계:');
    console.log('1. data/collected-books.json 확인');
    console.log('2. 추천 이유(why) 수동으로 개선');
    console.log('3. data/book-recommendations.json에 병합');

  } catch (e) {
    console.error('❌ 오류:', e);
  }
})();
