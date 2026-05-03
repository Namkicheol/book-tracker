/**
 * "추천 도서 목록책" 필터링
 * 실제 동화/소설이 아니라 "추천 도서를 정리한 책" 제거
 */

const fs = require('fs');

// 제외할 패턴 (도서 목록집, 추천 가이드북 등)
const META_BOOK_PATTERNS = [
  '추천도서', '필독서', '권장도서', '도서목록', '책 100권', '책리스트',
  '도서 100', '도서100', '100권', '200권', '50권',
  '선생님이 추천', '사서가 추천', '교사가 추천', '전문가가 추천',
  '학년별 추천', '연령별 추천', '시기별 추천',
  '독서 가이드', '독서지도', '책 읽어주기', '그림책 읽어주기',
  '북 가이드', '북리스트', 'book guide', 'booklist',
  '도서 가이드', '어린이책 가이드',
];

(async () => {
  console.log('━━━ 추천 도서 목록책 필터링 시작 ━━━\n');

  const data = JSON.parse(fs.readFileSync('data/book-recommendations.json', 'utf8'));

  let removed = 0;
  const removeList = [];

  for (const isbn in data.books) {
    const book = data.books[isbn];

    const title = book.title.toLowerCase();

    // 패턴 검사
    const isMetaBook = META_BOOK_PATTERNS.some(pattern =>
      title.includes(pattern.toLowerCase())
    );

    if (isMetaBook) {
      // 단, 실제 동화책인데 제목에 "추천"이 들어간 경우 예외 처리
      // 예: "선생님이 추천한 마법의 모험" (X) vs "초등 추천도서 100권" (O 제거)

      // 장르가 '그림책', '문학', '동화'이고 제목이 짧으면 (< 30자) 예외
      const isProbablyStory =
        (book.genre === '그림책' || book.genre === '문학' || book.genre === '동화') &&
        book.title.length < 30 &&
        !title.includes('100') && !title.includes('목록') && !title.includes('가이드');

      if (!isProbablyStory) {
        removeList.push(isbn);
        removed++;

        if (removed % 20 === 0) {
          console.log(`  제거: ${removed}권`);
        }

        // 로그 출력 (처음 50권)
        if (removed <= 50) {
          console.log(`    - ${book.title}`);
        }
      }
    }
  }

  // 제거
  for (const isbn of removeList) {
    delete data.books[isbn];
  }

  console.log(`\n✅ 필터링 완료: ${removed}권 제거\n`);

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
