/**
 * Instagram 공유 템플릿 V2 - 감성 폭발 버전 🎨
 */

const INSTA_WIDTH = 1080;
const INSTA_HEIGHT = 1350;

// FLUX 배경 템플릿 (밝은 감성만)
const TEMPLATES = {
  1: { name: '소프트 핑크', icon: '🌸', bg: 'img/templates/01-insta-soft-pink.png' },
  2: { name: '피치 코랄', icon: '🍑', bg: 'img/templates/02-insta-peach.png' },
  3: { name: '민트 파스텔', icon: '🌿', bg: 'img/templates/03-insta-mint.png' },
  4: { name: '크림 베이지', icon: '☕', bg: 'img/templates/04-insta-cream.png' },
  5: { name: '코지 독서', icon: '📖', bg: 'img/templates/05-book-cozy.png' },
  6: { name: '북카페', icon: '☕', bg: 'img/templates/06-book-cafe.png' },
  7: { name: '손글씨 노트', icon: '✍️', bg: 'img/templates/07-book-handwritten.png' },
  8: { name: '책 읽는 아이', icon: '👧', bg: 'img/templates/08-kids-reading.png' },
  9: { name: '동물 친구', icon: '🐻', bg: 'img/templates/09-kids-animals.png' },
  10: { name: '우주 탐험', icon: '🚀', bg: 'img/templates/10-kids-space.png' },
  11: { name: '숲속 동화', icon: '🦊', bg: 'img/templates/11-kids-forest.png' },
  12: { name: '스티커북', icon: '✨', bg: 'img/templates/12-sticker.png' },
  13: { name: '포토카드', icon: '💕', bg: 'img/templates/13-photocard.png' },
  14: { name: '일기장', icon: '📝', bg: 'img/templates/14-diary.png' }
};

// 폰트 로드 확인 및 대기
async function ensureFontsLoaded() {
  const fontsToLoad = [
    'Gowun Batang',
    'Noto Serif KR',
    'Noto Sans KR',
    'Nanum Myeongjo',
    'Black Han Sans',
    'Jua',
    'Nanum Gothic'
  ];

  try {
    // 1. document.fonts.ready 대기
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    // 2. 각 폰트가 실제로 로드되었는지 확인
    const checks = fontsToLoad.map(font => document.fonts.check(`16px "${font}"`));
    const allLoaded = checks.every(Boolean);

    if (!allLoaded) {
      console.warn('[Fonts] Some fonts not loaded, waiting...');
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('[Fonts] All fonts ready');
  } catch (err) {
    console.warn('[Fonts] Font check failed:', err);
  }
}

async function generateInstagramTemplate(bookData, review, rating, templateId = 1) {
  try {
    console.log('[Template] Generating template', templateId, 'for book:', bookData.title);

    // 폰트 로드 대기
    await ensureFontsLoaded();

    // FLUX 배경 기반 통합 템플릿 사용
    const canvas = await generateFluxTemplate(bookData, review, rating, templateId);

    console.log('[Template] Generation complete');
    return canvas;
  } catch (err) {
    console.error('[Template] Generation failed:', err);
    throw new Error(`템플릿 생성 실패: ${err.message}`);
  }
}

// FLUX 배경 기반 통합 템플릿 생성
async function generateFluxTemplate(bookData, review, rating, templateId) {
  const canvas = document.createElement('canvas');
  canvas.width = INSTA_WIDTH;
  canvas.height = INSTA_HEIGHT;
  const ctx = canvas.getContext('2d');

  const template = TEMPLATES[templateId] || TEMPLATES[1];

  // 1. FLUX 배경 이미지 로드 & 그리기
  try {
    const bgUrl = new URL(template.bg, window.location.href).href;
    const bgImg = await loadImage(bgUrl);
    ctx.drawImage(bgImg, 0, 0, INSTA_WIDTH, INSTA_HEIGHT);
  } catch (err) {
    console.warn('[Template] Background load failed, using fallback:', err);
    // 폴백: 흰색 배경
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, INSTA_WIDTH, INSTA_HEIGHT);
  }

  // 2. 책 표지 (중앙 상단)
  const coverSize = 320;
  const coverX = (INSTA_WIDTH - coverSize) / 2;
  const coverY = 280;

  if (bookData.cover) {
    try {
      const img = await loadImage(bookData.cover);
      // 그림자
      ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetY = 10;
      ctx.drawImage(img, coverX, coverY, coverSize, coverSize * 1.4);
      ctx.shadowColor = 'transparent';
    } catch (err) {
      console.warn('[Template] Cover load failed:', err);
      // 플레이스홀더
      ctx.fillStyle = '#E0E0E0';
      ctx.fillRect(coverX, coverY, coverSize, coverSize * 1.4);
    }
  }

  // 3. 책 정보 (표지 아래)
  const infoY = coverY + coverSize * 1.4 + 60;

  ctx.fillStyle = '#2D3748';
  ctx.font = 'bold 42px "Gowun Batang", serif';
  ctx.textAlign = 'center';
  ctx.fillText(truncateText(ctx, bookData.title || '책 제목', 800), INSTA_WIDTH / 2, infoY);

  ctx.font = '32px "Gowun Batang", serif';
  ctx.fillStyle = '#718096';
  ctx.fillText(truncateText(ctx, bookData.author || '저자', 700), INSTA_WIDTH / 2, infoY + 50);

  // 4. 별점
  if (rating) {
    const starY = infoY + 110;
    ctx.font = '50px Arial';
    ctx.fillStyle = '#FFD700';
    const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
    ctx.fillText(stars, INSTA_WIDTH / 2, starY);
  }

  // 5. 리뷰 (간단하게)
  if (review && review.trim()) {
    const cleanReview = stripHtml(review);
    const reviewY = infoY + 200;

    ctx.fillStyle = '#4A5568';
    ctx.font = '34px "Gowun Batang", serif';
    ctx.textAlign = 'center';
    wrapText(ctx, '"' + cleanReview + '"', INSTA_WIDTH / 2, reviewY, INSTA_WIDTH - 200, 54, 3);
  }

  // 6. 맘스북스 브랜딩 (하단 우측)
  await drawBranding(ctx, INSTA_WIDTH - 120, INSTA_HEIGHT - 120, 'normal');

  return canvas;
}

// Template 1: 스티커북 - 귀여운 스티커들과 큰 리뷰 텍스트
async function generateStickerTemplate(bookData, review, rating) {
  const canvas = document.createElement('canvas');
  canvas.width = INSTA_WIDTH;
  canvas.height = INSTA_HEIGHT;
  const ctx = canvas.getContext('2d');

  // 1. 배경 - 파스텔 핑크 그라데이션
  const bgGradient = ctx.createLinearGradient(0, 0, 0, INSTA_HEIGHT);
  bgGradient.addColorStop(0, '#FFF0F5');
  bgGradient.addColorStop(0.5, '#FFE4EC');
  bgGradient.addColorStop(1, '#FFD4E5');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, INSTA_WIDTH, INSTA_HEIGHT);

  // 2. 귀여운 도형 장식들
  ctx.globalAlpha = 0.3;
  // 별
  drawStar(ctx, 150, 150, 5, 40, 20, '#FFB8C6');
  drawStar(ctx, INSTA_WIDTH - 120, 200, 5, 35, 18, '#E8C5FF');
  drawStar(ctx, 200, INSTA_HEIGHT - 200, 5, 30, 15, '#FFD4B8');
  // 하트
  drawHeart(ctx, INSTA_WIDTH - 180, INSTA_HEIGHT - 250, 45, '#FFB8C6');
  drawHeart(ctx, 120, INSTA_HEIGHT - 350, 35, '#E8C5FF');
  // 동그라미
  ctx.fillStyle = '#FFE599';
  ctx.beginPath();
  ctx.arc(INSTA_WIDTH - 100, 400, 50, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // 3. 상단 귀여운 헤더
  ctx.fillStyle = '#FF9E9E';
  ctx.font = 'bold 52px "Gowun Batang", serif';
  ctx.textAlign = 'center';
  ctx.fillText('📚', INSTA_WIDTH / 2, 120);

  ctx.font = 'bold 48px "Gowun Batang", serif';
  const titleGradient = ctx.createLinearGradient(0, 150, INSTA_WIDTH, 150);
  titleGradient.addColorStop(0, '#FF9E9E');
  titleGradient.addColorStop(0.5, '#FFB8C6');
  titleGradient.addColorStop(1, '#E8C5FF');
  ctx.fillStyle = titleGradient;
  ctx.fillText("What I Read", INSTA_WIDTH / 2, 180);

  // 4. 책 표지 - 왼쪽 중앙
  const coverSize = 300;
  const coverX = 100;
  const coverY = 280;

  // 스티커 테두리
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 8;
  ctx.strokeRect(coverX - 5, coverY - 5, coverSize + 10, coverSize * 1.4 + 10);

  if (bookData.cover) {
    try {
      console.log('[Template] Loading cover image:', bookData.cover);
      const img = await loadImage(bookData.cover);
      console.log('[Template] Cover loaded, drawing...');
      ctx.drawImage(img, coverX, coverY, coverSize, coverSize * 1.4);
    } catch (err) {
      console.warn('[Template] Cover load failed, using placeholder:', err);
      ctx.fillStyle = '#FFE8F0';
      ctx.fillRect(coverX, coverY, coverSize, coverSize * 1.4);
      ctx.fillStyle = '#FFB8C6';
      ctx.font = 'bold 70px "Gowun Batang", serif';
      ctx.textAlign = 'center';
      ctx.fillText('書', coverX + coverSize / 2, coverY + coverSize * 0.7);
    }
  } else {
    // 표지 없을 때 placeholder
    ctx.fillStyle = '#FFE8F0';
    ctx.fillRect(coverX, coverY, coverSize, coverSize * 1.4);
    ctx.fillStyle = '#FFB8C6';
    ctx.font = 'bold 70px "Gowun Batang", serif';
    ctx.textAlign = 'center';
    ctx.fillText('書', coverX + coverSize / 2, coverY + coverSize * 0.7);
  }

  // 5. 별점 스티커 (책 표지 바로 아래)
  const starY = coverY + coverSize * 1.4 + 90;

  // 별 배경 원
  ctx.fillStyle = '#FFF9E6';
  ctx.beginPath();
  ctx.arc(coverX + coverSize / 2, starY, 100, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFD700';
  ctx.font = '48px Arial';
  const stars = '★'.repeat(rating || 0) + '☆'.repeat(5 - (rating || 0));
  ctx.textAlign = 'center';
  ctx.fillText(stars, coverX + coverSize / 2, starY + 15);

  // 6. 리뷰 말풍선 - 오른쪽 상단
  if (review && review.trim()) {
    const cleanReview = stripHtml(review);

    const bubbleX = coverX + coverSize + 60;
    const bubbleY = 280;
    const bubbleWidth = INSTA_WIDTH - bubbleX - 80;
    const bubbleHeight = 500;

    // 그림자
    ctx.shadowColor = 'rgba(255, 158, 158, 0.3)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 15;

    // 말풍선
    ctx.fillStyle = '#FFFFFF';
    roundRect(ctx, bubbleX, bubbleY, bubbleWidth, bubbleHeight, 30);
    ctx.fill();
    ctx.shadowColor = 'transparent';

    // 따옴표
    ctx.fillStyle = '#FFB8C6';
    ctx.font = 'bold 100px "Gowun Batang", serif';
    ctx.globalAlpha = 0.15;
    ctx.textAlign = 'left';
    ctx.fillText('"', bubbleX + 20, bubbleY + 80);
    ctx.globalAlpha = 1;

    // 리뷰 본문
    ctx.fillStyle = '#2A2A2A';
    ctx.font = 'bold 42px "Gowun Batang", serif';
    ctx.textAlign = 'left';
    wrapTextLeft(ctx, cleanReview, bubbleX + 30, bubbleY + 120, bubbleWidth - 60, 60, 6);
  }

  // 7. 책 정보 - 하단
  const infoY = 1140;

  ctx.fillStyle = '#FF9E9E';
  ctx.font = 'bold 42px "Gowun Batang", serif';
  ctx.textAlign = 'center';
  ctx.fillText(truncateText(ctx, bookData.title || '책 제목', 900), INSTA_WIDTH / 2, infoY);

  ctx.font = '32px "Gowun Batang", serif';
  ctx.fillStyle = '#8B8B8B';
  ctx.fillText(truncateText(ctx, bookData.author || '저자', 900), INSTA_WIDTH / 2, infoY + 50);

  // 8. 하단 브랜딩 (통일)
  await drawBranding(ctx, INSTA_WIDTH - 120, INSTA_HEIGHT - 120, 'normal');

  return canvas;
}

// Template 2: 일기장 - 손글씨 느낌
async function generateDiaryTemplate(bookData, review, rating) {
  const canvas = document.createElement('canvas');
  canvas.width = INSTA_WIDTH;
  canvas.height = INSTA_HEIGHT;
  const ctx = canvas.getContext('2d');

  // 1. 노트 배경
  ctx.fillStyle = '#FFFEF7';
  ctx.fillRect(0, 0, INSTA_WIDTH, INSTA_HEIGHT);

  // 노트 구멍
  const holeY = [200, 450, 700, 950, 1200];
  ctx.fillStyle = '#E8E8E8';
  holeY.forEach(y => {
    ctx.beginPath();
    ctx.arc(80, y, 20, 0, Math.PI * 2);
    ctx.fill();
  });

  // 2. 마스킹 테이프
  ctx.fillStyle = 'rgba(255, 184, 198, 0.5)';
  ctx.fillRect(0, 0, INSTA_WIDTH, 50);
  ctx.fillRect(0, INSTA_HEIGHT - 50, INSTA_WIDTH, 50);

  // 3. 날짜 (손글씨 느낌)
  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  ctx.fillStyle = '#FF9E9E';
  ctx.font = 'italic 36px "Gowun Batang", serif';
  ctx.textAlign = 'right';
  ctx.fillText(today, INSTA_WIDTH - 120, 120);

  ctx.font = 'italic bold 48px "Gowun Batang", serif';
  ctx.fillText('My Reading Journal', INSTA_WIDTH - 120, 170);

  // 4. 책 표지 (폴라로이드 스타일) - 오른쪽 상단
  const coverSize = 300;
  const coverX = INSTA_WIDTH - coverSize - 100;
  const coverY = 220;

  // 폴라로이드 프레임
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 10;
  ctx.fillRect(coverX - 20, coverY - 20, coverSize + 40, coverSize * 1.4 + 100);
  ctx.shadowColor = 'transparent';

  if (bookData.cover) {
    try {
      const img = await loadImage(bookData.cover);
      ctx.drawImage(img, coverX, coverY, coverSize, coverSize * 1.4);
    } catch {
      ctx.fillStyle = '#FFE8F0';
      ctx.fillRect(coverX, coverY, coverSize, coverSize * 1.4);
    }
  }

  // 폴라로이드 캡션
  ctx.fillStyle = '#8B8B8B';
  ctx.font = 'italic 22px "Gowun Batang", serif';
  ctx.textAlign = 'center';
  wrapText(ctx, bookData.title || '책 제목', coverX + coverSize / 2, coverY + coverSize * 1.4 + 50, coverSize, 32, 2);

  ctx.font = 'italic 18px "Gowun Batang", serif';
  ctx.fillText(truncateText(ctx, bookData.author || '저자', coverSize - 20), coverX + coverSize / 2, coverY + coverSize * 1.4 + 85);

  // 5. 리뷰 영역 (왼쪽)
  const reviewX = 140;
  const reviewY = 680;
  const reviewWidth = coverX - reviewX - 60;

  // 밑줄 장식
  ctx.strokeStyle = 'rgba(255, 158, 158, 0.15)';
  ctx.lineWidth = 1.5;
  for (let y = reviewY + 50; y < reviewY + 520; y += 75) {
    ctx.beginPath();
    ctx.moveTo(reviewX, y);
    ctx.lineTo(reviewX + reviewWidth, y);
    ctx.stroke();
  }

  // 리뷰 배경 (가독성)
  if (review && review.trim()) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    roundRect(ctx, reviewX - 20, reviewY, reviewWidth + 40, 540, 15);
    ctx.fill();
  }

  // 리뷰 텍스트
  if (review && review.trim()) {
    const cleanReview = stripHtml(review);

    ctx.fillStyle = '#1A1A1A';
    ctx.font = 'italic bold 46px "Gowun Batang", serif';
    ctx.textAlign = 'left';

    wrapTextLeft(ctx, cleanReview, reviewX + 20, reviewY + 70, reviewWidth - 40, 72, 6);
  }

  // 6. 별점 (동그라미) - 왼쪽 하단
  const starY = 1210;
  ctx.fillStyle = '#FFE8F0';
  ctx.beginPath();
  ctx.arc(220, starY, 90, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFD700';
  ctx.font = '44px Arial';
  ctx.textAlign = 'center';
  const stars = '★'.repeat(rating || 0) + '☆'.repeat(5 - (rating || 0));
  ctx.fillText(stars, 220, starY + 13);

  // 8. 하단 브랜딩 (통일)
  await drawBranding(ctx, INSTA_WIDTH - 120, INSTA_HEIGHT - 120, 'normal');

  return canvas;
}

// Template 3: 하이라이트 - 형광펜 강조
async function generateHighlightTemplate(bookData, review, rating) {
  const canvas = document.createElement('canvas');
  canvas.width = INSTA_WIDTH;
  canvas.height = INSTA_HEIGHT;
  const ctx = canvas.getContext('2d');

  // 1. 배경
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, INSTA_WIDTH, INSTA_HEIGHT);

  // 2. 상단 헤더 (노란 형광펜)
  ctx.fillStyle = '#FFE98A';
  ctx.globalAlpha = 0.6;
  ctx.fillRect(0, 80, INSTA_WIDTH, 80);
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#2A2A2A';
  ctx.font = 'bold 56px "Gowun Batang", serif';
  ctx.textAlign = 'center';
  ctx.fillText('📖  Worth Every Page', INSTA_WIDTH / 2, 140);

  // 3. 책 표지 - 왼쪽 상단에 작게
  const coverSize = 260;
  const coverX = 80;
  const coverY = 200;

  // 4. 책 정보 (책 표지 옆)
  const infoX = coverX + coverSize + 40;
  const infoY = coverY + 40;

  ctx.fillStyle = '#FF9E9E';
  ctx.font = 'bold 36px "Gowun Batang", serif';
  ctx.textAlign = 'left';
  ctx.fillText(truncateText(ctx, bookData.title || '책 제목', 560), infoX, infoY);

  ctx.font = '28px "Gowun Batang", serif';
  ctx.fillStyle = '#8B8B8B';
  ctx.fillText(truncateText(ctx, bookData.author || '저자', 560), infoX, infoY + 45);

  // 5. 별점 (노란 형광펜) - 책 정보 아래
  const starY = infoY + 110;

  ctx.fillStyle = '#FFE98A';
  ctx.globalAlpha = 0.6;
  ctx.fillRect(infoX - 10, starY - 40, 350, 80);
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#FFD700';
  ctx.font = '48px Arial';
  ctx.textAlign = 'left';
  const stars = '★'.repeat(rating || 0) + '☆'.repeat(5 - (rating || 0));
  ctx.fillText(stars, infoX, starY);

  // 6. 리뷰 - 형광펜으로 강조! (중앙 크게)
  if (review && review.trim()) {
    const cleanReview = stripHtml(review);
    const reviewY = coverY + coverSize * 1.45 + 100;

    // 형광펜 배경 (핑크)
    ctx.fillStyle = '#FFC8C8';
    ctx.globalAlpha = 0.4;
    roundRect(ctx, 80, reviewY - 50, INSTA_WIDTH - 160, 400, 25);
    ctx.fill();
    ctx.globalAlpha = 1;

    // 텍스트
    ctx.fillStyle = '#1A1A1A';
    ctx.font = 'bold 54px "Gowun Batang", serif';
    ctx.textAlign = 'center';
    wrapText(ctx, '"' + cleanReview + '"', INSTA_WIDTH / 2, reviewY + 20, INSTA_WIDTH - 240, 75, 4);
  }

  // 7. 책 표지 그리기

  // 흰색 프레임
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
  ctx.shadowBlur = 25;
  ctx.shadowOffsetY = 12;
  ctx.fillRect(coverX - 10, coverY - 10, coverSize + 20, coverSize * 1.45 + 20);

  if (bookData.cover) {
    try {
      const img = await loadImage(bookData.cover);
      ctx.drawImage(img, coverX, coverY, coverSize, coverSize * 1.45);
    } catch {
      ctx.fillStyle = '#FFE8F0';
      ctx.fillRect(coverX, coverY, coverSize, coverSize * 1.45);
    }
  }
  ctx.shadowColor = 'transparent';

  // 7. 하단 브랜딩
  // 하단 브랜딩 (통일)
  await drawBranding(ctx, INSTA_WIDTH - 120, INSTA_HEIGHT - 120, 'normal');

  return canvas;
}

// Template 4: 포토카드 - K-POP 포토카드 느낌
async function generatePhotocardTemplate(bookData, review, rating) {
  const canvas = document.createElement('canvas');
  canvas.width = INSTA_WIDTH;
  canvas.height = INSTA_HEIGHT;
  const ctx = canvas.getContext('2d');

  // 1. 배경 그라데이션
  const bgGradient = ctx.createLinearGradient(0, 0, INSTA_WIDTH, INSTA_HEIGHT);
  bgGradient.addColorStop(0, '#E8C5FF');
  bgGradient.addColorStop(0.5, '#FFE8F0');
  bgGradient.addColorStop(1, '#FFE599');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, INSTA_WIDTH, INSTA_HEIGHT);

  // 2. 홀로그램 효과
  ctx.globalAlpha = 0.1;
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#FFB8C6' : '#E8C5FF';
    ctx.fillRect(0, i * 270, INSTA_WIDTH, 135);
  }
  ctx.globalAlpha = 1;

  // 3. 중앙 카드
  const cardPadding = 80;
  const cardX = cardPadding;
  const cardY = 120;
  const cardWidth = INSTA_WIDTH - cardPadding * 2;
  const cardHeight = INSTA_HEIGHT - 240;

  // 카드 그림자
  ctx.shadowColor = 'rgba(232, 197, 255, 0.5)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 20;

  // 카드 배경
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, cardX, cardY, cardWidth, cardHeight, 30);
  ctx.fill();
  ctx.shadowColor = 'transparent';

  // 4. 상단 - 로고 이미지만 크게
  try {
    const logoUrl = new URL('img/3YzCR.png', window.location.href).href;
    const logoImg = await loadImage(logoUrl);
    const logoSize = 100;

    // 그림자
    ctx.shadowColor = 'rgba(255, 184, 198, 0.5)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 10;

    ctx.drawImage(logoImg, INSTA_WIDTH / 2 - logoSize / 2, cardY + 30, logoSize, logoSize);
    ctx.shadowColor = 'transparent';
  } catch (err) {
    console.warn('[Photocard] Logo load failed:', err);
    // Fallback: gradient text
    const gradient = ctx.createLinearGradient(0, cardY + 30, 0, cardY + 100);
    gradient.addColorStop(0, '#FF9E9E');
    gradient.addColorStop(0.5, '#FFB8C6');
    gradient.addColorStop(1, '#E8C5FF');

    ctx.fillStyle = gradient;
    ctx.font = 'bold 48px "Gowun Batang", serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(255, 184, 198, 0.5)';
    ctx.shadowBlur = 20;
    ctx.fillText("Mom's Books", INSTA_WIDTH / 2, cardY + 80);
    ctx.shadowColor = 'transparent';
  }

  // 5. 책 표지 - 중앙 상단에 크게!
  const coverSize = 360;
  const coverX = (INSTA_WIDTH - coverSize) / 2;
  const coverY = cardY + 130;

  if (bookData.cover) {
    try {
      const img = await loadImage(bookData.cover);
      ctx.shadowColor = 'rgba(232, 197, 255, 0.3)';
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 15;
      ctx.drawImage(img, coverX, coverY, coverSize, coverSize * 1.45);
      ctx.shadowColor = 'transparent';
    } catch {
      ctx.fillStyle = '#FFE8F0';
      ctx.fillRect(coverX, coverY, coverSize, coverSize * 1.45);
    }
  }

  // 6. 책 정보
  const infoY = coverY + coverSize * 1.45 + 70;

  ctx.fillStyle = '#FF9E9E';
  ctx.font = 'bold 40px "Gowun Batang", serif';
  ctx.fillText(truncateText(ctx, bookData.title || '책 제목', cardWidth - 100), INSTA_WIDTH / 2, infoY);

  ctx.font = '32px "Gowun Batang", serif';
  ctx.fillStyle = '#8B8B8B';
  ctx.fillText(truncateText(ctx, bookData.author || '저자', cardWidth - 100), INSTA_WIDTH / 2, infoY + 50);

  // 7. 별점
  const starY = infoY + 110;
  ctx.font = '56px Arial';
  ctx.fillStyle = '#FFD700';
  const stars = '★'.repeat(rating || 0) + '☆'.repeat(5 - (rating || 0));
  ctx.fillText(stars, INSTA_WIDTH / 2, starY);

  // 8. 리뷰 (하단에 작게)
  if (review && review.trim()) {
    const cleanReview = stripHtml(review);
    const reviewY = starY + 90;

    ctx.fillStyle = '#6B6B6B';
    ctx.font = 'italic 38px "Gowun Batang", serif';
    ctx.textAlign = 'center';

    wrapText(ctx, '"' + cleanReview + '"', INSTA_WIDTH / 2, reviewY, cardWidth - 180, 60, 3);
  }

  // 8. 시리얼 넘버 (포토카드 느낌)
  ctx.font = 'italic 24px "Gowun Batang", serif';
  ctx.fillStyle = '#CCCCCC';
  ctx.textAlign = 'right';
  ctx.fillText(`No. ${Date.now().toString().slice(-6)}`, INSTA_WIDTH - cardX - 60, cardY + cardHeight - 120);

  // 9. 하단 우측 - 통일 브랜딩
  const bottomBoxSize = 100;
  const bottomBoxX = INSTA_WIDTH - cardX - bottomBoxSize - 20;
  const bottomBoxY = cardY + cardHeight - bottomBoxSize - 20;
  await drawBranding(ctx, bottomBoxX, bottomBoxY, 'normal');

  return canvas;
}

// Template 5: 그래픽 포스터 - 모던 미니멀
async function generateGraphicTemplate(bookData, review, rating) {
  const canvas = document.createElement('canvas');
  canvas.width = INSTA_WIDTH;
  canvas.height = INSTA_HEIGHT;
  const ctx = canvas.getContext('2d');

  // 1. 배경 - 화이트
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, INSTA_WIDTH, INSTA_HEIGHT);

  // 2. 기하학적 장식 - 큰 원
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = '#FF9E9E';
  ctx.beginPath();
  ctx.arc(INSTA_WIDTH - 200, 200, 400, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#E8C5FF';
  ctx.beginPath();
  ctx.arc(100, INSTA_HEIGHT - 200, 350, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // 3. 책 표지 - 중앙 상단에 크게
  const coverSize = 380;
  const coverX = (INSTA_WIDTH - coverSize) / 2;
  const coverY = 150;

  if (bookData.cover) {
    try {
      const img = await loadImage(bookData.cover);
      ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
      ctx.shadowBlur = 40;
      ctx.shadowOffsetY = 20;
      ctx.drawImage(img, coverX, coverY, coverSize, coverSize * 1.4);
      ctx.shadowColor = 'transparent';
    } catch {
      ctx.fillStyle = '#F8F8F8';
      ctx.fillRect(coverX, coverY, coverSize, coverSize * 1.4);
    }
  }

  // 4. 책 정보 - 중앙 정렬
  const infoY = coverY + coverSize * 1.4 + 80;

  ctx.fillStyle = '#1A1A1A';
  ctx.font = 'bold 44px "Noto Sans KR", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(truncateText(ctx, bookData.title || '책 제목', 900), INSTA_WIDTH / 2, infoY);

  ctx.font = '32px "Noto Sans KR", sans-serif';
  ctx.fillStyle = '#888888';
  ctx.fillText(truncateText(ctx, bookData.author || '저자', 900), INSTA_WIDTH / 2, infoY + 50);

  // 5. 별점 - 미니멀 스타일
  const starY = infoY + 120;
  ctx.font = '44px Arial';
  ctx.fillStyle = '#FFD700';
  const stars = '★'.repeat(rating || 0) + '☆'.repeat(5 - (rating || 0));
  ctx.fillText(stars, INSTA_WIDTH / 2, starY);

  // 6. 리뷰 - 간결하게
  if (review && review.trim()) {
    const cleanReview = stripHtml(review);
    const reviewY = starY + 100;

    // 얇은 라인
    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(150, reviewY - 40);
    ctx.lineTo(INSTA_WIDTH - 150, reviewY - 40);
    ctx.stroke();

    ctx.fillStyle = '#2A2A2A';
    ctx.font = '36px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'center';
    wrapText(ctx, cleanReview, INSTA_WIDTH / 2, reviewY, INSTA_WIDTH - 200, 60, 4);
  }

  // 7. 하단 브랜딩 (통일)
  await drawBranding(ctx, INSTA_WIDTH - 120, INSTA_HEIGHT - 120, 'normal');

  return canvas;
}

// Template 6: 매거진 - 에디토리얼 스타일
async function generateMagazineTemplate(bookData, review, rating) {
  const canvas = document.createElement('canvas');
  canvas.width = INSTA_WIDTH;
  canvas.height = INSTA_HEIGHT;
  const ctx = canvas.getContext('2d');

  // 1. 배경 - 아이보리
  ctx.fillStyle = '#F9F7F4';
  ctx.fillRect(0, 0, INSTA_WIDTH, INSTA_HEIGHT);

  // 2. 상단 헤더 - 매거진 스타일
  ctx.fillStyle = '#1A1A1A';
  ctx.font = '28px "Noto Serif KR", serif';
  ctx.textAlign = 'left';
  ctx.fillText('BOOK REVIEW', 80, 100);

  // 작은 장식선
  ctx.strokeStyle = '#8B3A3A';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(80, 120);
  ctx.lineTo(280, 120);
  ctx.stroke();

  // 날짜
  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  ctx.fillStyle = '#888888';
  ctx.font = '22px "Noto Serif KR", serif';
  ctx.textAlign = 'right';
  ctx.fillText(today, INSTA_WIDTH - 80, 100);

  // 3. 책 표지 - 왼쪽 컬럼
  const coverSize = 340;
  const coverX = 80;
  const coverY = 200;

  if (bookData.cover) {
    try {
      const img = await loadImage(bookData.cover);
      ctx.drawImage(img, coverX, coverY, coverSize, coverSize * 1.45);
    } catch {
      ctx.fillStyle = '#E8E8E8';
      ctx.fillRect(coverX, coverY, coverSize, coverSize * 1.45);
    }
  }

  // 4. 책 정보 - 오른쪽 컬럼
  const infoX = coverX + coverSize + 60;
  const infoY = coverY + 40;

  ctx.fillStyle = '#8B3A3A';
  ctx.font = 'bold 42px "Noto Serif KR", serif';
  ctx.textAlign = 'left';
  wrapTextLeft(ctx, bookData.title || '책 제목', infoX, infoY, 460, 60, 3);

  ctx.font = '28px "Noto Serif KR", serif';
  ctx.fillStyle = '#555555';
  ctx.fillText('by ' + truncateText(ctx, bookData.author || '저자', 400), infoX, infoY + 200);

  // 별점
  const starY = infoY + 270;
  ctx.font = '40px Arial';
  ctx.fillStyle = '#C9A86A';
  const stars = '★'.repeat(rating || 0) + '☆'.repeat(5 - (rating || 0));
  ctx.fillText(stars, infoX, starY);

  // 5. 리뷰 - 본문 스타일
  if (review && review.trim()) {
    const cleanReview = stripHtml(review);
    const reviewY = coverY + coverSize * 1.45 + 80;

    // 구분선
    ctx.strokeStyle = '#D0D0D0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(80, reviewY - 40);
    ctx.lineTo(INSTA_WIDTH - 80, reviewY - 40);
    ctx.stroke();

    ctx.fillStyle = '#2A2A2A';
    ctx.font = '34px "Noto Serif KR", serif';
    ctx.textAlign = 'left';
    wrapTextLeft(ctx, '"' + cleanReview + '"', 100, reviewY, INSTA_WIDTH - 200, 56, 5);
  }

  // 6. 하단 브랜딩 (통일)
  await drawBranding(ctx, INSTA_WIDTH - 120, INSTA_HEIGHT - 120, 'normal');

  return canvas;
}

// Template 7: 빈티지 레트로
async function generateVintageTemplate(bookData, review, rating) {
  const canvas = document.createElement('canvas');
  canvas.width = INSTA_WIDTH;
  canvas.height = INSTA_HEIGHT;
  const ctx = canvas.getContext('2d');

  // 1. 배경 - 세피아 톤
  ctx.fillStyle = '#F4EDE3';
  ctx.fillRect(0, 0, INSTA_WIDTH, INSTA_HEIGHT);

  // 빈티지 텍스처 효과
  ctx.globalAlpha = 0.05;
  for (let i = 0; i < 1000; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? '#5C4033' : '#8B7355';
    ctx.fillRect(Math.random() * INSTA_WIDTH, Math.random() * INSTA_HEIGHT, 2, 2);
  }
  ctx.globalAlpha = 1;

  // 2. 클래식 프레임
  ctx.strokeStyle = '#8B7355';
  ctx.lineWidth = 8;
  ctx.strokeRect(60, 60, INSTA_WIDTH - 120, INSTA_HEIGHT - 120);

  // 이중 테두리
  ctx.lineWidth = 2;
  ctx.strokeRect(50, 50, INSTA_WIDTH - 100, INSTA_HEIGHT - 100);

  // 3. 상단 타이틀
  ctx.fillStyle = '#5C4033';
  ctx.font = 'bold 48px "Nanum Myeongjo", serif';
  ctx.textAlign = 'center';
  ctx.fillText('Reading Notes', INSTA_WIDTH / 2, 160);

  // 장식 라인
  ctx.strokeStyle = '#8B7355';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(INSTA_WIDTH / 2 - 150, 180);
  ctx.lineTo(INSTA_WIDTH / 2 + 150, 180);
  ctx.stroke();

  // 4. 책 표지 - 중앙
  const coverSize = 320;
  const coverX = (INSTA_WIDTH - coverSize) / 2;
  const coverY = 240;

  // 빈티지 프레임
  ctx.fillStyle = '#D4C4B0';
  ctx.fillRect(coverX - 15, coverY - 15, coverSize + 30, coverSize * 1.45 + 30);
  ctx.strokeStyle = '#8B7355';
  ctx.lineWidth = 3;
  ctx.strokeRect(coverX - 15, coverY - 15, coverSize + 30, coverSize * 1.45 + 30);

  if (bookData.cover) {
    try {
      const img = await loadImage(bookData.cover);
      // 세피아 필터 효과
      ctx.drawImage(img, coverX, coverY, coverSize, coverSize * 1.45);
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = '#8B7355';
      ctx.fillRect(coverX, coverY, coverSize, coverSize * 1.45);
      ctx.globalAlpha = 1;
    } catch {
      ctx.fillStyle = '#E8DDD0';
      ctx.fillRect(coverX, coverY, coverSize, coverSize * 1.45);
    }
  }

  // 5. 책 정보
  const infoY = coverY + coverSize * 1.45 + 70;

  ctx.fillStyle = '#5C4033';
  ctx.font = 'bold 38px "Nanum Myeongjo", serif';
  ctx.textAlign = 'center';
  ctx.fillText(truncateText(ctx, bookData.title || '책 제목', 800), INSTA_WIDTH / 2, infoY);

  ctx.font = '30px "Nanum Myeongjo", serif';
  ctx.fillStyle = '#8B7355';
  ctx.fillText(truncateText(ctx, bookData.author || '저자', 800), INSTA_WIDTH / 2, infoY + 50);

  // 별점
  const starY = infoY + 110;
  ctx.font = '42px Arial';
  ctx.fillStyle = '#C9A86A';
  const stars = '★'.repeat(rating || 0) + '☆'.repeat(5 - (rating || 0));
  ctx.fillText(stars, INSTA_WIDTH / 2, starY);

  // 6. 리뷰
  if (review && review.trim()) {
    const cleanReview = stripHtml(review);
    const reviewY = starY + 80;

    ctx.fillStyle = '#5C4033';
    ctx.font = 'italic 32px "Nanum Myeongjo", serif';
    ctx.textAlign = 'center';
    wrapText(ctx, '"' + cleanReview + '"', INSTA_WIDTH / 2, reviewY, INSTA_WIDTH - 240, 54, 3);
  }

  // 7. 하단 브랜딩 (통일)
  await drawBranding(ctx, INSTA_WIDTH - 120, INSTA_HEIGHT - 120, 'normal');

  return canvas;
}

// Template 8: 팝아트 - 화려한 만화풍
async function generatePopartTemplate(bookData, review, rating) {
  const canvas = document.createElement('canvas');
  canvas.width = INSTA_WIDTH;
  canvas.height = INSTA_HEIGHT;
  const ctx = canvas.getContext('2d');

  // 1. 배경 - 화려한 그라데이션
  const bgGradient = ctx.createLinearGradient(0, 0, INSTA_WIDTH, INSTA_HEIGHT);
  bgGradient.addColorStop(0, '#FF6B9D');
  bgGradient.addColorStop(0.3, '#FEC163');
  bgGradient.addColorStop(0.6, '#EE76FF');
  bgGradient.addColorStop(1, '#4DD0E1');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, INSTA_WIDTH, INSTA_HEIGHT);

  // 하프톤 효과
  ctx.globalAlpha = 0.15;
  for (let i = 0; i < 3000; i++) {
    ctx.fillStyle = '#FFFFFF';
    const x = Math.random() * INSTA_WIDTH;
    const y = Math.random() * INSTA_HEIGHT;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // 2. 상단 타이틀 - 만화풍
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 8;
  ctx.font = 'bold 72px "Black Han Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.strokeText('What I Read', INSTA_WIDTH / 2, 140);
  ctx.fillText('What I Read', INSTA_WIDTH / 2, 140);

  // 3. 중앙 화이트 카드
  const cardX = 140;
  const cardY = 200;
  const cardWidth = INSTA_WIDTH - 280;
  const cardHeight = 900;

  // 카드 그림자
  ctx.fillStyle = '#000000';
  ctx.fillRect(cardX + 15, cardY + 15, cardWidth, cardHeight);

  // 카드 본체
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(cardX, cardY, cardWidth, cardHeight);

  // 4. 책 표지
  const coverSize = 300;
  const coverX = (INSTA_WIDTH - coverSize) / 2;
  const coverY = cardY + 60;

  if (bookData.cover) {
    try {
      const img = await loadImage(bookData.cover);
      ctx.drawImage(img, coverX, coverY, coverSize, coverSize * 1.4);

      // 만화풍 테두리
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 6;
      ctx.strokeRect(coverX, coverY, coverSize, coverSize * 1.4);
    } catch {
      ctx.fillStyle = '#FFE082';
      ctx.fillRect(coverX, coverY, coverSize, coverSize * 1.4);
    }
  }

  // 5. 책 정보
  const infoY = coverY + coverSize * 1.4 + 60;

  ctx.fillStyle = '#FF6B9D';
  ctx.font = 'bold 42px "Black Han Sans", sans-serif';
  ctx.textAlign = 'center';
  wrapText(ctx, bookData.title || '책 제목', INSTA_WIDTH / 2, infoY, cardWidth - 80, 56, 2);

  ctx.font = 'bold 32px "Black Han Sans", sans-serif';
  ctx.fillStyle = '#4DD0E1';
  ctx.fillText(truncateText(ctx, bookData.author || '저자', cardWidth - 80), INSTA_WIDTH / 2, infoY + 120);

  // 별점
  const starY = infoY + 190;
  ctx.font = '52px Arial';
  ctx.fillStyle = '#FEC163';
  const stars = '★'.repeat(rating || 0) + '☆'.repeat(5 - (rating || 0));
  ctx.fillText(stars, INSTA_WIDTH / 2, starY);

  // 6. 리뷰 - 말풍선
  if (review && review.trim()) {
    const cleanReview = stripHtml(review);
    const reviewY = starY + 90;

    ctx.fillStyle = '#1A1A1A';
    ctx.font = 'bold 34px "Black Han Sans", sans-serif';
    wrapText(ctx, cleanReview, INSTA_WIDTH / 2, reviewY, cardWidth - 100, 52, 3);
  }

  // 7. 하단 브랜딩 (통일)
  await drawBranding(ctx, INSTA_WIDTH - 120, INSTA_HEIGHT - 120, 'normal');

  return canvas;
}

// Template 9: 손글씨 노트 - 따뜻한 느낌
async function generateHandwritingTemplate(bookData, review, rating) {
  const canvas = document.createElement('canvas');
  canvas.width = INSTA_WIDTH;
  canvas.height = INSTA_HEIGHT;
  const ctx = canvas.getContext('2d');

  // 1. 배경 - 연한 노란색 (노트)
  ctx.fillStyle = '#FFFACD';
  ctx.fillRect(0, 0, INSTA_WIDTH, INSTA_HEIGHT);

  // 노트 선
  ctx.strokeStyle = 'rgba(255, 192, 203, 0.3)';
  ctx.lineWidth = 2;
  for (let y = 200; y < INSTA_HEIGHT; y += 80) {
    ctx.beginPath();
    ctx.moveTo(100, y);
    ctx.lineTo(INSTA_WIDTH - 100, y);
    ctx.stroke();
  }

  // 2. 귀여운 낙서들
  ctx.globalAlpha = 0.3;
  // 별
  drawStar(ctx, 150, 150, 5, 30, 15, '#FFB6C1');
  drawStar(ctx, INSTA_WIDTH - 150, 180, 5, 25, 12, '#98D8C8');
  // 하트
  drawHeart(ctx, INSTA_WIDTH - 120, INSTA_HEIGHT - 200, 40, '#FFB6C1');
  drawHeart(ctx, 140, INSTA_HEIGHT - 150, 35, '#F7DC6F');
  ctx.globalAlpha = 1;

  // 3. 상단 타이틀
  ctx.fillStyle = '#FF6B9D';
  ctx.font = 'bold 54px "Jua", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText("📖 What I Found 📖", INSTA_WIDTH / 2, 120);

  // 4. 책 표지 - 스티커처럼
  const coverSize = 320;
  const coverX = 120;
  const coverY = 220;

  // 스티커 테두리
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 12;
  ctx.strokeRect(coverX - 6, coverY - 6, coverSize + 12, coverSize * 1.4 + 12);

  ctx.strokeStyle = '#FFB6C1';
  ctx.lineWidth = 4;
  ctx.strokeRect(coverX - 6, coverY - 6, coverSize + 12, coverSize * 1.4 + 12);

  if (bookData.cover) {
    try {
      const img = await loadImage(bookData.cover);
      ctx.drawImage(img, coverX, coverY, coverSize, coverSize * 1.4);
    } catch {
      ctx.fillStyle = '#FFE0E6';
      ctx.fillRect(coverX, coverY, coverSize, coverSize * 1.4);
    }
  }

  // 5. 책 정보 - 오른쪽
  const infoX = coverX + coverSize + 50;
  const infoY = coverY + 60;

  ctx.fillStyle = '#FF6B9D';
  ctx.font = 'bold 40px "Jua", sans-serif';
  ctx.textAlign = 'left';
  wrapTextLeft(ctx, bookData.title || '책 제목', infoX, infoY, 420, 60, 3);

  ctx.font = '32px "Jua", sans-serif';
  ctx.fillStyle = '#7FB3D5';
  ctx.fillText(truncateText(ctx, bookData.author || '저자', 380), infoX, infoY + 200);

  // 별점
  const starY = infoY + 280;
  ctx.font = '48px Arial';
  ctx.fillStyle = '#F7DC6F';
  const stars = '★'.repeat(rating || 0) + '☆'.repeat(5 - (rating || 0));
  ctx.fillText(stars, infoX, starY);

  // 6. 리뷰 - 중앙 하단
  if (review && review.trim()) {
    const cleanReview = stripHtml(review);
    const reviewY = coverY + coverSize * 1.4 + 100;

    // 배경 박스
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    roundRect(ctx, 100, reviewY - 50, INSTA_WIDTH - 200, 300, 20);
    ctx.fill();

    ctx.fillStyle = '#2A2A2A';
    ctx.font = 'bold 42px "Jua", sans-serif';
    ctx.textAlign = 'center';
    wrapText(ctx, cleanReview, INSTA_WIDTH / 2, reviewY + 20, INSTA_WIDTH - 280, 65, 4);
  }

  // 7. 하단 브랜딩 (통일)
  await drawBranding(ctx, INSTA_WIDTH - 120, INSTA_HEIGHT - 120, 'normal');

  return canvas;
}

// Template 10: 모던 블랙 - 고급스러운 미니멀
async function generateModernBlackTemplate(bookData, review, rating) {
  const canvas = document.createElement('canvas');
  canvas.width = INSTA_WIDTH;
  canvas.height = INSTA_HEIGHT;
  const ctx = canvas.getContext('2d');

  // 1. 배경 - 블랙
  ctx.fillStyle = '#1A1A1A';
  ctx.fillRect(0, 0, INSTA_WIDTH, INSTA_HEIGHT);

  // 2. 상단 화이트 바
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, INSTA_WIDTH, 10);

  // 3. 타이틀
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 42px "Nanum Gothic", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('BOOK ARCHIVE', 80, 100);

  ctx.font = '24px "Nanum Gothic", sans-serif';
  ctx.fillStyle = '#999999';
  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });
  ctx.fillText(today, 80, 140);

  // 4. 책 표지 - 중앙에 크게
  const coverSize = 380;
  const coverX = (INSTA_WIDTH - coverSize) / 2;
  const coverY = 220;

  if (bookData.cover) {
    try {
      const img = await loadImage(bookData.cover);
      // 그림자
      ctx.shadowColor = 'rgba(255, 255, 255, 0.15)';
      ctx.shadowBlur = 50;
      ctx.shadowOffsetY = 30;
      ctx.drawImage(img, coverX, coverY, coverSize, coverSize * 1.4);
      ctx.shadowColor = 'transparent';
    } catch {
      ctx.fillStyle = '#2A2A2A';
      ctx.fillRect(coverX, coverY, coverSize, coverSize * 1.4);
    }
  }

  // 5. 책 정보
  const infoY = coverY + coverSize * 1.4 + 70;

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 44px "Nanum Gothic", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(truncateText(ctx, bookData.title || '책 제목', 900), INSTA_WIDTH / 2, infoY);

  ctx.font = '30px "Nanum Gothic", sans-serif';
  ctx.fillStyle = '#AAAAAA';
  ctx.fillText(truncateText(ctx, bookData.author || '저자', 900), INSTA_WIDTH / 2, infoY + 50);

  // 별점
  const starY = infoY + 120;
  ctx.font = '48px Arial';
  ctx.fillStyle = '#FFD700';
  const stars = '★'.repeat(rating || 0) + '☆'.repeat(5 - (rating || 0));
  ctx.fillText(stars, INSTA_WIDTH / 2, starY);

  // 6. 리뷰 - 흰색 텍스트
  if (review && review.trim()) {
    const cleanReview = stripHtml(review);
    const reviewY = starY + 90;

    // 구분선
    ctx.strokeStyle = '#444444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(150, reviewY - 40);
    ctx.lineTo(INSTA_WIDTH - 150, reviewY - 40);
    ctx.stroke();

    ctx.fillStyle = '#E0E0E0';
    ctx.font = '34px "Nanum Gothic", sans-serif';
    ctx.textAlign = 'center';
    wrapText(ctx, '"' + cleanReview + '"', INSTA_WIDTH / 2, reviewY, INSTA_WIDTH - 200, 56, 4);
  }

  // 7. 하단 화이트 바
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, INSTA_HEIGHT - 10, INSTA_WIDTH, 10);

  // 8. 하단 브랜딩 (통일)
  await drawBranding(ctx, INSTA_WIDTH - 120, INSTA_HEIGHT - 120, 'normal');

  return canvas;
}

// ── Branding Functions ──

async function drawBranding(ctx, x, y, size = 'normal') {
  const boxSize = size === 'large' ? 140 : 100;
  const logoSize = size === 'large' ? 60 : 45;

  // "맘스북스" 그라데이션 텍스트
  const gradient = ctx.createLinearGradient(x, y, x + boxSize, y + boxSize);
  gradient.addColorStop(0, '#FF9E9E');
  gradient.addColorStop(0.5, '#FFB8C6');
  gradient.addColorStop(1, '#E8C5FF');

  ctx.fillStyle = gradient;
  ctx.font = `bold ${size === 'large' ? 32 : 24}px "Gowun Batang", serif`;
  ctx.textAlign = 'center';

  // 정사각형 형태로 2줄 배치
  const fontSize = size === 'large' ? 32 : 24;
  const lineHeight = fontSize * 1.2;
  ctx.fillText('맘스', x + boxSize / 2, y + boxSize / 2 - lineHeight / 2 + 8);
  ctx.fillText('북스', x + boxSize / 2, y + boxSize / 2 + lineHeight / 2 + 8);

  // 로고 도장 (우측 위)
  try {
    const logoUrl = new URL('img/3YzCR.png', window.location.href).href;
    const logoImg = await loadImage(logoUrl);
    const logoX = x + boxSize - logoSize / 2;
    const logoY = y - logoSize / 2;

    // 그림자
    ctx.shadowColor = 'rgba(255, 184, 198, 0.3)';
    ctx.shadowBlur = 12;
    ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
    ctx.shadowColor = 'transparent';
  } catch (err) {
    console.warn('[Branding] Logo load failed:', err);
  }
}

// ── Helper Functions ──

function loadImage(src) {
  return new Promise((resolve, reject) => {
    if (!src) {
      console.warn('[Image] No source provided');
      reject(new Error('No image source'));
      return;
    }

    console.log('[Image] Attempting to load:', src);

    const img = new Image();
    img.crossOrigin = 'anonymous';

    const timeout = setTimeout(() => {
      console.error('[Image] Timeout after 3 seconds:', src);
      reject(new Error('Image load timeout'));
    }, 3000);

    img.onload = () => {
      clearTimeout(timeout);
      console.log('[Image] Successfully loaded:', src);
      resolve(img);
    };

    img.onerror = (err) => {
      clearTimeout(timeout);
      console.error('[Image] Load failed with CORS:', src);
      console.error('[Image] Error details:', err);

      // CORS 실패 시 재시도하지 않고 바로 실패
      // (재시도 시 tainted canvas 문제 발생)
      reject(new Error('Image load failed'));
    };

    img.src = src;
  });
}

function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  const chars = text.split('');
  let line = '';
  let currentY = y;
  let lineCount = 0;

  for (let i = 0; i < chars.length; i++) {
    const testLine = line + chars[i];
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && line.length > 0) {
      if (lineCount >= maxLines - 1) {
        ctx.fillText(line.trim() + '...', x, currentY);
        return;
      }
      ctx.fillText(line, x, currentY);
      line = chars[i];
      currentY += lineHeight;
      lineCount++;
    } else {
      line = testLine;
    }
  }

  if (lineCount < maxLines) {
    ctx.fillText(line, x, currentY);
  }
}

function wrapTextLeft(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  const chars = text.split('');
  let line = '';
  let currentY = y;
  let lineCount = 0;

  for (let i = 0; i < chars.length; i++) {
    const testLine = line + chars[i];
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && line.length > 0) {
      if (lineCount >= maxLines - 1) {
        ctx.fillText(line.trim() + '...', x, currentY);
        return;
      }
      ctx.fillText(line, x, currentY);
      line = chars[i];
      currentY += lineHeight;
      lineCount++;
    } else {
      line = testLine;
    }
  }

  if (lineCount < maxLines) {
    ctx.fillText(line, x, currentY);
  }
}

function truncateText(ctx, text, maxWidth) {
  let width = ctx.measureText(text).width;
  if (width <= maxWidth) return text;

  while (width > maxWidth && text.length > 0) {
    text = text.slice(0, -1);
    width = ctx.measureText(text + '...').width;
  }
  return text + '...';
}

function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius, color) {
  let rot = Math.PI / 2 * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawHeart(ctx, x, y, size, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  const topCurveHeight = size * 0.3;
  ctx.moveTo(x, y + topCurveHeight);
  // Left curve
  ctx.bezierCurveTo(
    x, y,
    x - size / 2, y,
    x - size / 2, y + topCurveHeight
  );
  ctx.bezierCurveTo(
    x - size / 2, y + (size + topCurveHeight) / 2,
    x, y + (size + topCurveHeight) / 2,
    x, y + size
  );
  // Right curve
  ctx.bezierCurveTo(
    x, y + (size + topCurveHeight) / 2,
    x + size / 2, y + (size + topCurveHeight) / 2,
    x + size / 2, y + topCurveHeight
  );
  ctx.bezierCurveTo(
    x + size / 2, y,
    x, y,
    x, y + topCurveHeight
  );
  ctx.closePath();
  ctx.fill();
}

function downloadCanvas(canvas, filename) {
  return new Promise((resolve, reject) => {
    try {
      if (!filename || !filename.endsWith('.png')) {
        filename = `맘스북스_${Date.now()}.png`;
      }

      console.log('[Download] Starting download:', filename);

      canvas.toBlob(blob => {
        if (!blob) {
          console.error('[Download] Blob creation failed');
          reject(new Error('Canvas toBlob failed'));
          return;
        }

        console.log('[Download] Blob created, size:', blob.size);

        // iOS Safari에서 더 안정적인 방법: data URL 사용
        const reader = new FileReader();
        reader.onloadend = () => {
          const link = document.createElement('a');
          link.href = reader.result;
          link.download = filename;

          document.body.appendChild(link);
          link.click();

          setTimeout(() => {
            document.body.removeChild(link);
            console.log('[Download] Download triggered');
            resolve(blob);
          }, 100);
        };
        reader.onerror = () => {
          console.error('[Download] FileReader error');
          reject(new Error('FileReader failed'));
        };
        reader.readAsDataURL(blob);
      }, 'image/png', 1.0);
    } catch (err) {
      console.error('[Download] Error:', err);
      reject(err);
    }
  });
}

// 일반 공유 (모든 앱)
async function shareToAll(canvas, filename, bookTitle) {
  const blob = await new Promise(resolve => {
    canvas.toBlob(resolve, 'image/png', 1.0);
  });

  const file = new File([blob], filename, { type: 'image/png' });

  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: `📚 ${bookTitle}`,
        text: `오늘 읽은 책 - ${bookTitle}\n맘스북스에서 기록했어요 💕`
      });
      return { success: true };
    } catch (err) {
      if (err.name === 'AbortError') {
        return { success: false, cancelled: true };
      }
      console.error('Share failed:', err);
      return { success: false, error: err.message };
    }
  }
  return { success: false, error: 'Web Share API not supported' };
}

// Instagram 전용 공유
async function shareToInstagram(canvas, filename, bookTitle) {
  // 먼저 이미지 저장
  await downloadCanvas(canvas, filename);

  // Instagram 앱 열기 시도 (URL Scheme)
  const instagramUrl = 'instagram://';
  const canOpenInstagram = await canOpenApp(instagramUrl);

  if (canOpenInstagram) {
    // iOS: Instagram 스토리 URL scheme
    setTimeout(() => {
      window.location.href = 'instagram://story-camera';
    }, 500);
    return { success: true, message: '이미지를 저장했어요! Instagram 스토리에 추가해보세요 📸' };
  } else {
    return { success: true, message: '이미지를 저장했어요! 📸 사진 앱에서 Instagram으로 공유하세요' };
  }
}

// 카카오톡 공유
async function shareToKakao(canvas, filename, bookTitle, bookAuthor, review) {
  // 이미지 저장
  await downloadCanvas(canvas, filename);

  // 카카오톡 URL Scheme으로 공유
  const kakaoUrl = 'kakaotalk://';
  const canOpenKakao = await canOpenApp(kakaoUrl);

  if (canOpenKakao) {
    // 카카오톡 앱 열기
    setTimeout(() => {
      // 텍스트 공유 (이미지는 수동으로)
      const text = `📚 ${bookTitle}\n✍️ ${bookAuthor}\n\n${review ? '"' + review.substring(0, 100) + '..."' : ''}\n\n맘스북스에서 기록했어요 💕`;
      const encodedText = encodeURIComponent(text);
      window.location.href = `kakaotalk://inappbrowser?url=${encodedText}`;
    }, 500);
    return { success: true, message: '이미지를 저장했어요! 카카오톡에서 사진과 함께 공유하세요 💬' };
  } else {
    return { success: true, message: '이미지를 저장했어요! 📱 카카오톡 앱에서 공유하세요' };
  }
}

// Facebook 공유
async function shareToFacebook(canvas, filename) {
  await downloadCanvas(canvas, filename);

  // Facebook 앱 열기 시도
  const fbUrl = 'fb://';
  const canOpenFB = await canOpenApp(fbUrl);

  if (canOpenFB) {
    setTimeout(() => {
      window.location.href = 'fb://';
    }, 500);
    return { success: true, message: '이미지를 저장했어요! Facebook 앱에서 게시하세요 👍' };
  } else {
    return { success: true, message: '이미지를 저장했어요! 📱 Facebook 앱에서 공유하세요' };
  }
}

// Twitter/X 공유
async function shareToTwitter(canvas, filename, bookTitle) {
  await downloadCanvas(canvas, filename);

  // Twitter 앱 열기 시도
  const twitterUrl = 'twitter://';
  const canOpenTwitter = await canOpenApp(twitterUrl);

  if (canOpenTwitter) {
    const text = encodeURIComponent(`📚 ${bookTitle}\n\n#맘스북스 #독서기록 #책스타그램`);
    setTimeout(() => {
      window.location.href = `twitter://post?message=${text}`;
    }, 500);
    return { success: true, message: '이미지를 저장했어요! X(트위터)에서 사진과 함께 트윗하세요 🐦' };
  } else {
    return { success: true, message: '이미지를 저장했어요! 📱 X 앱에서 공유하세요' };
  }
}

// 앱 URL Scheme 확인 (비동기)
async function canOpenApp(urlScheme) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve(false);
    }, 500);

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = urlScheme;

    document.body.appendChild(iframe);

    setTimeout(() => {
      document.body.removeChild(iframe);
      clearTimeout(timeout);
      resolve(true);
    }, 100);
  });
}

// 글로벌 export
window.generateInstagramTemplate = generateInstagramTemplate;
window.downloadCanvas = downloadCanvas;
window.shareToAll = shareToAll;
window.shareToInstagram = shareToInstagram;
window.shareToKakao = shareToKakao;
window.shareToFacebook = shareToFacebook;
window.shareToTwitter = shareToTwitter;
window.INSTAGRAM_TEMPLATES = TEMPLATES;
