/**
 * elementary-bestsellers.json에서 좋은 책들을 골라
 * book-recommendations.json에 추가
 */

const fs = require('fs');

// 기존 데이터 로드
const current = JSON.parse(fs.readFileSync('data/book-recommendations.json', 'utf8'));
const elementary = JSON.parse(fs.readFileSync('data/elementary-bestsellers.json', 'utf8'));

// 추가할 책 선정 (문학상 수상작, 베스트셀러, 교양 도서 우선)
const SELECTED_ISBNS = [
  '9788949162690',  // 꼬랑지네 떡집 (만복이네 떡집 시리즈)
  '9791175487635',  // 처음 읽는 삼국지 4
  '9788954699402',  // 긴긴밤 (문학동네어린이문학상 대상)
  '9791197882531',  // 우리는 죽으면 어디로 가나요? (볼로냐 라가치상)
  '9791175487468',  // 흔한남매 방방곡곡 한국사 1
  '9791175487598',  // 에그박사 18
  '9791173325953',  // 흔한남매 과학 탐험대 17
  '9788949162676',  // 마음의 주인은 언제나 나야 (초등 심리학)
];

// 수동으로 추가할 책들 (베스트셀러에 없지만 중요한 책)
const MANUAL_BOOKS = {
  '9788954699402': {  // 긴긴밤
    isbn: '9788954699402',
    title: '긴긴밤',
    author: '루리',
    publisher: '문학동네',
    lists: [],
    year: 2021,
    targetAge: '초등',
    genre: '문학',
    why: '제21회 문학동네어린이문학상 대상 수상작. 서로 다른 존재들이 긴긴밤을 함께 견디며 우정을 쌓아가는 이야기로, 타인을 이해하고 공감하는 법을 배울 수 있어요.',
    award: '문학동네어린이문학상',
  },
};

let added = 0;

// elementary-bestsellers에서 선택된 책 추가
for (const isbn of SELECTED_ISBNS) {
  if (current.books[isbn]) {
    console.log(`⊙ ${isbn} - 이미 있음, 스킵`);
    continue;
  }

  const book = elementary.books[isbn];
  if (!book && !MANUAL_BOOKS[isbn]) {
    console.log(`✗ ${isbn} - 데이터 없음`);
    continue;
  }

  const source = book || MANUAL_BOOKS[isbn];

  current.books[isbn] = {
    isbn: source.isbn,
    title: source.title,
    author: source.author,
    publisher: source.publisher,
    lists: source.lists || [],
    year: source.year || parseInt(source.pubDate?.substring(0, 4)) || 2026,
    targetAge: source.targetAge,
    genre: source.genre,
    why: source.why || generateWhy(source),
  };

  if (source.award) {
    current.books[isbn].award = source.award;
  }

  added++;
  console.log(`✓ ${source.title} - 추가됨`);
}

function generateWhy(book) {
  const title = book.title;
  const description = book.description || '';

  // 수상작
  if (description.includes('상 수상') || description.includes('대상')) {
    return `문학상을 수상한 검증된 작품입니다. ${description.slice(0, 80)}...`;
  }

  // 시리즈
  if (title.includes('시리즈') || description.includes('시리즈')) {
    return `인기 시리즈로 많은 어린이 독자들이 사랑하는 책입니다. 재미있게 읽으며 독서 습관을 키울 수 있어요.`;
  }

  // 베스트셀러
  if (book.bestRank < 50000) {
    return `알라딘 베스트셀러 상위권! 많은 초등 독자들이 선택한 인기 도서입니다.`;
  }

  // 기본
  return `초등 독자를 위한 양서입니다. 재미와 유익함을 동시에 얻을 수 있어요.`;
}

// 저장
current.meta.lastUpdated = new Date().toISOString().split('T')[0];

fs.writeFileSync(
  'data/book-recommendations.json',
  JSON.stringify(current, null, 2)
);

console.log(`\n✅ 총 ${added}개 책 추가 완료!`);
console.log(`현재 총 ${Object.keys(current.books).length}권 등록됨`);
