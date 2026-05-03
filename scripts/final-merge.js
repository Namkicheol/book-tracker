/**
 * expanded-database.json을 book-recommendations.json에 병합
 */

const fs = require('fs');

const current = JSON.parse(fs.readFileSync('data/book-recommendations.json', 'utf8'));

// Try expanded database first, fallback to old file
let collected;
try {
  collected = JSON.parse(fs.readFileSync('data/expanded-database.json', 'utf8'));
  console.log('📥 expanded-database.json 로드');
} catch (e) {
  collected = JSON.parse(fs.readFileSync('data/all-sources-collected.json', 'utf8'));
  console.log('📥 all-sources-collected.json 로드 (fallback)');
}

let added = 0;
let updated = 0;

for (const isbn in collected.books) {
  const newBook = collected.books[isbn];

  // 초등 위주 - 청소년 책 제외
  if (newBook.targetAge === '청소년') continue;

  if (current.books[isbn]) {
    // 이미 있으면 lists만 병합
    const existing = current.books[isbn];
    const combinedLists = [...new Set([...existing.lists, ...newBook.lists])];

    if (JSON.stringify(combinedLists.sort()) !== JSON.stringify(existing.lists.sort())) {
      existing.lists = combinedLists;

      // why 업데이트
      const sourcesMap = {
        'chaektase': '책읽는교육사회실천회의',
        'morning-reading': '전국 아침독서 프로그램',
        'seoul-univ': '서울대 권장도서선정위원회',
        'slj': '학교도서관저널 추천위원회',
        'childbook': '어린이도서연구회',
        'nlcy': '국립어린이청소년도서관',
      };

      const sourceNames = combinedLists.map(id => sourcesMap[id]).filter(Boolean);

      if (sourceNames.length === 1) {
        existing.why = `${sourceNames[0]}가 선정한 추천도서입니다. 교육 전문가들이 직접 검증한 양서예요.`;
      } else if (sourceNames.length >= 2) {
        existing.why = `${sourceNames.slice(0, 2).join(', ')} 등 ${sourceNames.length}곳에서 추천한 검증된 도서입니다. 다양한 전문가들의 추천을 받은 명저예요.`;
      }

      updated++;
      console.log(`  ✎ ${existing.title} (${combinedLists.length}곳)`);
    }
  } else {
    // 새 책 추가
    current.books[isbn] = newBook;
    added++;
    console.log(`  ✓ ${newBook.title} [${newBook.targetAge}] (${newBook.lists.length}곳)`);
  }
}

// 저장
current.meta.lastUpdated = new Date().toISOString().split('T')[0];

fs.writeFileSync(
  'data/book-recommendations.json',
  JSON.stringify(current, null, 2)
);

console.log(`\n━━━ 병합 완료 ━━━`);
console.log(`  ✓ 신규 추가: ${added}권`);
console.log(`  ✎ 출처 갱신: ${updated}권`);
console.log(`  📚 전체: ${Object.keys(current.books).length}권`);

// 출처별 통계
const finalStats = {};
for (const isbn in current.books) {
  for (const sourceId of current.books[isbn].lists) {
    finalStats[sourceId] = (finalStats[sourceId] || 0) + 1;
  }
}

console.log('\n━━━ 최종 출처별 통계 ━━━');
for (const [sourceId, count] of Object.entries(finalStats).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${sourceId}: ${count}권`);
}

console.log('\n✅ book-recommendations.json 업데이트 완료!');
