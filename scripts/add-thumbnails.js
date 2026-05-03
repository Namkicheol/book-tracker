/**
 * book-recommendations.json의 책들에 썸네일 추가
 */

const fs = require('fs');
const WORKER_URL = 'https://book-tracker-aladin.obangti.workers.dev';

async function aladinLookup(isbn) {
  const url = `${WORKER_URL}/aladin/lookup?isbn=${isbn}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data.item && data.item[0] ? data.item[0] : null;
  } catch (e) {
    return null;
  }
}

(async () => {
  console.log('📚 썸네일 추가 시작\n');

  const data = JSON.parse(fs.readFileSync('data/book-recommendations.json', 'utf8'));

  let updated = 0;
  let total = Object.keys(data.books).length;
  let processed = 0;

  console.log(`총 ${total}권 처리 예정...\n`);

  for (const isbn in data.books) {
    const book = data.books[isbn];
    processed++;

    // 이미 썸네일이 있으면 스킵
    if (book.thumbnail && book.thumbnail.startsWith('http')) {
      if (processed % 100 === 0) {
        console.log(`  진행: ${processed}/${total} (썸네일: ${updated}개 추가)`);
      }
      continue;
    }

    // Aladin에서 표지 가져오기
    try {
      const item = await aladinLookup(isbn);
      if (item && item.cover) {
        book.thumbnail = item.cover;
        updated++;

        if (updated % 10 === 0) {
          console.log(`  ✓ ${updated}개 썸네일 추가됨 (${processed}/${total})`);
        }
      }
    } catch (e) {
      // Skip on error
    }

    // Rate limiting
    await new Promise(r => setTimeout(r, 200));
  }

  // 저장
  data.meta.lastUpdated = new Date().toISOString().split('T')[0];

  fs.writeFileSync(
    'data/book-recommendations.json',
    JSON.stringify(data, null, 2)
  );

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ 완료!`);
  console.log(`   총 처리: ${total}권`);
  console.log(`   썸네일 추가: ${updated}권`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━`);
})();
