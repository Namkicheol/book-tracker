/**
 * 데이터베이스 확장: 추천 출처 깊이 확대 + 베스트셀러 수집
 * 목표: 315권 → 1000권+
 */

const WORKER_URL = 'https://book-tracker-aladin.obangti.workers.dev';

// ━━━ 1. 기존 추천 출처 확대 (페이지 2 → 20) ━━━
const RECOMMENDATION_SOURCES = {
  'morning-reading': ['아침독서 추천', '행복한아침독서'],
  'slj': ['학교도서관저널', '학교도서관저널 추천'],
  'seoul-univ': ['서울대 권장도서', '서울대 추천'],
  'childbook': ['어린이도서연구회', '어린이도서연구회 권장'],
  'chaektase': ['책따세 추천', '책읽는교육사회실천회의'],
  'nlcy': ['국립어린이청소년도서관', '국립도서관 추천'],
};

// ━━━ 2. 알라딘 베스트셀러 카테고리 ━━━
const BESTSELLER_CATEGORIES = [
  { id: '1108', name: '유아', pages: 10 },           // 유아(0~7세)
  { id: '1383', name: '초등1-2학년', pages: 10 },    // 어린이 문학
  { id: '1108', name: '초등3-4학년', pages: 10 },    // 초등 전체
  { id: '1108', name: '초등5-6학년', pages: 10 },
  { id: '1196', name: '그림책', pages: 5 },          // 그림책
  { id: '51688', name: '과학', pages: 5 },           // 어린이 과학
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

async function getBestsellers(categoryId, page = 1) {
  const params = new URLSearchParams({
    QueryType: 'Bestseller',
    CategoryId: categoryId,
    MaxResults: 50,
    start: page,
    SearchTarget: 'Book',
  });

  const url = `${WORKER_URL}/aladin/list?${params}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.item || [];
  } catch (e) {
    console.error(`[Bestseller cat:${categoryId} p:${page}] 실패:`, e.message);
    return [];
  }
}

function extractIsbn(item) {
  return String(item.isbn13 || item.isbn || '').replace(/\D/g, '');
}

function detectTargetAge(category, title, description) {
  const text = `${category} ${title} ${description}`.toLowerCase();

  if (text.includes('유아') || text.includes('그림책') || text.includes('0-7세')) return '유아';
  if (text.includes('초등 1') || text.includes('저학년') || text.includes('1-2학년')) return '초등 저학년';
  if (text.includes('초등 3') || text.includes('중학년') || text.includes('3-4학년')) return '초등 중학년';
  if (text.includes('초등 5') || text.includes('고학년') || text.includes('5-6학년')) return '초등 고학년';
  if (text.includes('중학') || text.includes('청소년')) return '청소년';

  if (category.includes('유아')) return '유아';
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
  if (category.includes('예술')) return '예술';
  if (category.includes('수학')) return '수학';
  return '교양';
}

function generateWhy(lists, isBestseller = false, rank = null) {
  const sources = {
    'chaektase': '책읽는교육사회실천회의',
    'morning-reading': '전국 아침독서 프로그램',
    'seoul-univ': '서울대 권장도서선정위원회',
    'slj': '학교도서관저널 추천위원회',
    'childbook': '어린이도서연구회',
    'nlcy': '국립어린이청소년도서관',
  };

  const sourceNames = lists.map(id => sources[id]).filter(Boolean);

  if (sourceNames.length === 0 && isBestseller && rank) {
    return `알라딘 베스트셀러 ${rank}위 안에 드는 인기 도서예요. 많은 아이들이 선택한 책입니다.`;
  } else if (sourceNames.length === 1) {
    return `${sourceNames[0]}가 선정한 추천도서입니다. 교육 전문가들이 직접 검증한 양서예요.`;
  } else if (sourceNames.length >= 2) {
    return `${sourceNames.slice(0, 2).join(', ')} 등 ${sourceNames.length}곳에서 추천한 검증된 도서입니다. 다양한 전문가들의 추천을 받은 명저예요.`;
  }

  return '초등학생에게 적합한 도서입니다.';
}

(async () => {
  console.log('━━━ 📚 데이터베이스 확장 시작 ━━━\n');

  const allBooks = {};
  const bookSources = {};
  let totalSearched = 0;

  // ━━━ PHASE 1: 추천 출처 확대 (페이지 1-20) ━━━
  console.log('\n━━━ PHASE 1: 추천 출처 깊이 확장 ━━━');

  for (const [sourceId, keywords] of Object.entries(RECOMMENDATION_SOURCES)) {
    console.log(`\n[${sourceId}] 수집 중...`);

    for (const keyword of keywords) {
      console.log(`  키워드: "${keyword}"`);

      for (let page = 1; page <= 20; page++) {
        const items = await searchAladin(keyword, page);

        if (items.length === 0) {
          console.log(`    Page ${page}: 결과 없음, 중단`);
          break;
        }

        console.log(`    Page ${page}: ${items.length}개`);

        for (const item of items) {
          const isbn = extractIsbn(item);
          if (!isbn || isbn.length < 10) continue;

          totalSearched++;

          const category = item.categoryName || '';
          const isKidsBook =
            category.includes('어린이') ||
            category.includes('청소년') ||
            category.includes('유아');

          if (!isKidsBook) continue;

          if (!bookSources[isbn]) bookSources[isbn] = new Set();
          bookSources[isbn].add(sourceId);

          if (!allBooks[isbn]) {
            allBooks[isbn] = {
              isbn: isbn,
              title: item.title,
              author: item.author,
              publisher: item.publisher,
              thumbnail: item.cover,
              year: parseInt((item.pubDate || '').substring(0, 4)) || 2024,
              targetAge: detectTargetAge(category, item.title, item.description || ''),
              genre: detectGenre(category),
            };
          }
        }

        await new Promise(r => setTimeout(r, 300));
      }
    }

    console.log(`  → ${sourceId}: 현재 총 ${Object.keys(allBooks).length}권`);
  }

  console.log(`\n✅ PHASE 1 완료: ${Object.keys(allBooks).length}권 수집`);

  // ━━━ PHASE 2: 베스트셀러 수집 ━━━
  console.log('\n━━━ PHASE 2: 알라딘 베스트셀러 수집 ━━━');

  for (const cat of BESTSELLER_CATEGORIES) {
    console.log(`\n[${cat.name}] 카테고리 (ID: ${cat.id})`);

    for (let page = 1; page <= cat.pages; page++) {
      const items = await getBestsellers(cat.id, page);

      if (items.length === 0) {
        console.log(`  Page ${page}: 결과 없음`);
        break;
      }

      console.log(`  Page ${page}: ${items.length}개`);

      for (const item of items) {
        const isbn = extractIsbn(item);
        if (!isbn || isbn.length < 10) continue;

        totalSearched++;

        const category = item.categoryName || '';
        const targetAge = detectTargetAge(category, item.title, item.description || '');

        // 청소년 제외
        if (targetAge === '청소년') continue;

        if (!allBooks[isbn]) {
          allBooks[isbn] = {
            isbn: isbn,
            title: item.title,
            author: item.author,
            publisher: item.publisher,
            thumbnail: item.cover,
            year: parseInt((item.pubDate || '').substring(0, 4)) || 2024,
            targetAge: targetAge,
            genre: detectGenre(category),
            bestRank: item.bestRank,
          };
        } else {
          // 이미 있으면 bestRank만 업데이트
          if (item.bestRank && !allBooks[isbn].bestRank) {
            allBooks[isbn].bestRank = item.bestRank;
          }
        }

        if (!bookSources[isbn]) bookSources[isbn] = new Set();
      }

      await new Promise(r => setTimeout(r, 300));
    }

    console.log(`  → ${cat.name}: 현재 총 ${Object.keys(allBooks).length}권`);
  }

  console.log(`\n✅ PHASE 2 완료: ${Object.keys(allBooks).length}권 수집`);

  // ━━━ PHASE 3: lists와 why 생성 ━━━
  console.log('\n━━━ PHASE 3: 메타데이터 생성 ━━━');

  for (const isbn in allBooks) {
    const lists = Array.from(bookSources[isbn] || []);
    const isBestseller = !!allBooks[isbn].bestRank;
    const rank = allBooks[isbn].bestRank;

    allBooks[isbn].lists = lists;
    allBooks[isbn].why = generateWhy(lists, isBestseller, rank);
  }

  // ━━━ 출처별 통계 ━━━
  const stats = {};
  for (const isbn in allBooks) {
    for (const sourceId of allBooks[isbn].lists) {
      stats[sourceId] = (stats[sourceId] || 0) + 1;
    }
  }

  console.log('\n━━━ 최종 출처별 통계 ━━━');
  for (const [sourceId, count] of Object.entries(stats).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${sourceId}: ${count}권`);
  }

  // 베스트셀러 비율
  const bestsellerCount = Object.values(allBooks).filter(b => b.bestRank).length;
  console.log(`\n  📈 베스트셀러: ${bestsellerCount}권`);
  console.log(`  ⭐ 추천 출처: ${Object.keys(allBooks).length - bestsellerCount}권`);

  // ━━━ 저장 ━━━
  const fs = require('fs');
  fs.writeFileSync(
    'data/expanded-database.json',
    JSON.stringify({
      collectedAt: new Date().toISOString(),
      method: 'Expanded sources + Bestsellers',
      count: Object.keys(allBooks).length,
      stats: {
        ...stats,
        bestseller: bestsellerCount,
      },
      books: allBooks,
    }, null, 2)
  );

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ 총 ${Object.keys(allBooks).length}권 수집 완료!`);
  console.log(`   (검색된 항목: ${totalSearched}개)`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  console.log('✅ data/expanded-database.json 저장 완료!');
  console.log('\n다음 단계: scripts/final-merge.js 실행해서 book-recommendations.json에 병합');
})();
