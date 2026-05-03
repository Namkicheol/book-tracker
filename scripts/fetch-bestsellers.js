/**
 * 알라딘 베스트셀러 수집 (초등 도서)
 */

const WORKER_URL = 'https://book-tracker-aladin.obangti.workers.dev';

// 어린이 카테고리 ID들
const CATEGORIES = {
  '1108': '초등 1-2학년',
  '1109': '초등 3-4학년',
  '1110': '초등 5-6학년',
  '1111': '어린이 문학',
  '1112': '어린이 교양',
  '50927': '그림책',
};

async function fetchBestsellers(categoryId) {
  const params = new URLSearchParams({
    QueryType: 'Bestseller',
    CategoryId: categoryId,
    MaxResults: 50,
    Sort: 'SalesPoint',
  });

  const url = `${WORKER_URL}/aladin/list?${params}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.item || [];
  } catch (e) {
    console.error(`[List] CategoryId=${categoryId} 실패:`, e.message);
    return [];
  }
}

function extractIsbn(item) {
  return String(item.isbn13 || item.isbn || '').replace(/\D/g, '');
}

function extractGenre(category) {
  if (category.includes('문학')) return '문학';
  if (category.includes('교양')) return '교양';
  if (category.includes('그림책')) return '그림책';
  return '기타';
}

(async () => {
  console.log('📚 초등 베스트셀러 수집\n');

  const allBooks = {};

  for (const [catId, catName] of Object.entries(CATEGORIES)) {
    console.log(`[${catName}] 수집 중... (CategoryId: ${catId})`);

    const items = await fetchBestsellers(catId);
    console.log(`  → ${items.length}개 검색됨`);

    let added = 0;
    for (const item of items.slice(0, 20)) {
      const isbn = extractIsbn(item);
      if (!isbn || isbn.length < 10) continue;
      if (allBooks[isbn]) continue;

      const bestRank = item.salesPoint || item.bestRank || 999;
      const rating = item.customerReviewRank || 0;

      allBooks[isbn] = {
        isbn: isbn,
        title: item.title || '',
        author: item.author || '',
        publisher: item.publisher || '',
        pubDate: item.pubDate || '',
        categoryName: item.categoryName || catName,
        thumbnail: item.cover || '',
        description: item.description || '',
        bestRank: bestRank,
        rating: rating,
        targetAge: catName,
        genre: extractGenre(item.categoryName || ''),
      };

      added++;
      console.log(`    ✓ ${item.title}`);
    }

    console.log(`  → ${added}개 추가\n`);

    // Rate limit
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n✅ 총 ${Object.keys(allBooks).length}개 수집 완료`);

  const fs = require('fs');
  fs.writeFileSync(
    'data/elementary-bestsellers.json',
    JSON.stringify({
      collectedAt: new Date().toISOString(),
      count: Object.keys(allBooks).length,
      books: allBooks,
    }, null, 2)
  );

  console.log('✅ data/elementary-bestsellers.json 저장 완료!');
})();
