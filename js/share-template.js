/**
 * Instagram 공유 템플릿 생성
 * HTML Canvas로 1080x1350px 이미지 생성
 */

const INSTA_WIDTH = 1080;
const INSTA_HEIGHT = 1350;

const TEMPLATES = {
  1: { name: '클래식', icon: '📖' },
  2: { name: '매거진', icon: '📰' },
  3: { name: '손글씨', icon: '✍️' },
  4: { name: '미니멀', icon: '⬜' }
};

async function generateInstagramTemplate(bookData, review, rating, templateId = 1) {
  switch (templateId) {
    case 2: return generateMagazineTemplate(bookData, review, rating);
    case 3: return generateHandwritingTemplate(bookData, review, rating);
    case 4: return generateMinimalTemplate(bookData, review, rating);
    default: return generateClassicTemplate(bookData, review, rating);
  }
}

// Template 1: 클래식 (기존)
async function generateClassicTemplate(bookData, review, rating) {
  const canvas = document.createElement('canvas');
  canvas.width = INSTA_WIDTH;
  canvas.height = INSTA_HEIGHT;
  const ctx = canvas.getContext('2d');

  // 1. 파스텔 그라데이션 배경
  const gradient = ctx.createLinearGradient(0, 0, INSTA_WIDTH, INSTA_HEIGHT);
  gradient.addColorStop(0, '#FFF8F0');
  gradient.addColorStop(0.5, '#FFE8F0');
  gradient.addColorStop(1, '#F0E8FF');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, INSTA_WIDTH, INSTA_HEIGHT);

  // 2. 장식 요소들 (배경)
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = '#FFB8C6';
  ctx.beginPath();
  ctx.arc(200, 200, 300, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(INSTA_WIDTH - 150, INSTA_HEIGHT - 200, 250, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // 3. 상단 브랜딩
  ctx.fillStyle = '#FF9E9E';
  ctx.font = 'bold 48px "Gowun Batang", serif';
  ctx.textAlign = 'center';
  ctx.fillText('📚', INSTA_WIDTH / 2, 100);

  const brandGradient = ctx.createLinearGradient(0, 120, INSTA_WIDTH, 120);
  brandGradient.addColorStop(0, '#FF9E9E');
  brandGradient.addColorStop(0.5, '#FFB8C6');
  brandGradient.addColorStop(1, '#E8C5FF');
  ctx.fillStyle = brandGradient;
  ctx.font = 'bold 64px "Gowun Batang", serif';
  ctx.fillText('맘스북스', INSTA_WIDTH / 2, 180);

  // 4. 책 표지 (중앙)
  const coverSize = 420;
  const coverX = (INSTA_WIDTH - coverSize) / 2;
  const coverY = 250;

  // 그림자
  ctx.shadowColor = 'rgba(255, 158, 158, 0.3)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 15;

  // 책 표지 배경
  ctx.fillStyle = '#fff';
  ctx.fillRect(coverX, coverY, coverSize, coverSize * 1.5);
  ctx.shadowColor = 'transparent';

  // 책 표지 이미지 로드
  if (bookData.cover) {
    try {
      const img = await loadImage(bookData.cover);
      ctx.drawImage(img, coverX, coverY, coverSize, coverSize * 1.5);
    } catch (err) {
      // 이미지 로드 실패시 플레이스홀더
      const placeholderGradient = ctx.createLinearGradient(coverX, coverY, coverX + coverSize, coverY + coverSize * 1.5);
      placeholderGradient.addColorStop(0, '#FFE8F0');
      placeholderGradient.addColorStop(1, '#FFB8C6');
      ctx.fillStyle = placeholderGradient;
      ctx.fillRect(coverX, coverY, coverSize, coverSize * 1.5);

      ctx.fillStyle = '#FF9E9E';
      ctx.font = 'bold 120px "Gowun Batang", serif';
      ctx.textAlign = 'center';
      ctx.fillText('書', INSTA_WIDTH / 2, coverY + coverSize);
    }
  }

  // 5. 별점 (책 표지 아래)
  const starY = coverY + coverSize * 1.5 + 60;
  ctx.font = '48px Arial';
  ctx.textAlign = 'center';
  const stars = '★'.repeat(rating || 0) + '☆'.repeat(5 - (rating || 0));
  ctx.fillStyle = '#FFD700';
  ctx.fillText(stars, INSTA_WIDTH / 2, starY);

  // 6. 리뷰 텍스트
  if (review && review.trim()) {
    const reviewY = starY + 100;
    const maxWidth = INSTA_WIDTH - 160;

    // 리뷰 본문 (HTML 제거)
    const cleanReview = stripHtml(review);

    // 텍스트 배경 카드
    const cardPadding = 50;
    const cardY = reviewY - 70;
    const cardHeight = 260;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.shadowColor = 'rgba(255, 184, 198, 0.2)';
    ctx.shadowBlur = 25;
    ctx.shadowOffsetY = 8;
    roundRect(ctx, 80, cardY, INSTA_WIDTH - 160, cardHeight, 20);
    ctx.fill();
    ctx.shadowColor = 'transparent';

    // 따옴표 장식
    ctx.fillStyle = '#FFB8C6';
    ctx.font = 'bold 100px "Gowun Batang", serif';
    ctx.textAlign = 'left';
    ctx.globalAlpha = 0.3;
    ctx.fillText('"', 110, reviewY - 30);
    ctx.textAlign = 'right';
    ctx.fillText('"', INSTA_WIDTH - 110, reviewY + 140);
    ctx.globalAlpha = 1;

    // 리뷰 본문
    ctx.fillStyle = '#2A2A2A';
    ctx.font = '42px "Gowun Batang", serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.05)';
    ctx.shadowBlur = 2;
    ctx.shadowOffsetY = 1;
    wrapText(ctx, cleanReview, INSTA_WIDTH / 2, reviewY + 10, maxWidth - 100, 58);
    ctx.shadowColor = 'transparent';
  }

  // 7. 하단 책 정보
  const bottomY = INSTA_HEIGHT - 120;
  ctx.fillStyle = '#8B8B8B';
  ctx.font = 'bold 32px "Gowun Batang", serif';
  ctx.textAlign = 'center';
  ctx.fillText(bookData.title || '책 제목', INSTA_WIDTH / 2, bottomY);

  ctx.font = '28px "Gowun Batang", serif';
  ctx.fillStyle = '#ABABAB';
  ctx.fillText((bookData.author || '저자') + ' · ' + (bookData.publisher || '출판사'), INSTA_WIDTH / 2, bottomY + 45);

  return canvas;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Template 2: 매거진 스타일 (큰 타이포그래피, 대담한 레이아웃)
async function generateMagazineTemplate(bookData, review, rating) {
  const canvas = document.createElement('canvas');
  canvas.width = INSTA_WIDTH;
  canvas.height = INSTA_HEIGHT;
  const ctx = canvas.getContext('2d');

  // 1. 배경 - 대담한 색상
  ctx.fillStyle = '#2A2A2A';
  ctx.fillRect(0, 0, INSTA_WIDTH, INSTA_HEIGHT);

  // 2. 상단 컬러 바
  const topGradient = ctx.createLinearGradient(0, 0, INSTA_WIDTH, 0);
  topGradient.addColorStop(0, '#FF9E9E');
  topGradient.addColorStop(0.5, '#FFB8C6');
  topGradient.addColorStop(1, '#E8C5FF');
  ctx.fillStyle = topGradient;
  ctx.fillRect(0, 0, INSTA_WIDTH, 20);

  // 3. 맘스북스 로고 (작게, 왼쪽 상단)
  ctx.fillStyle = '#FFB8C6';
  ctx.font = 'bold 32px "Gowun Batang", serif';
  ctx.textAlign = 'left';
  ctx.fillText('맘스북스', 60, 100);

  // 4. 리뷰 텍스트 (크고 대담하게)
  if (review && review.trim()) {
    const cleanReview = stripHtml(review);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 56px "Gowun Batang", serif';
    ctx.textAlign = 'left';
    wrapTextLeft(ctx, cleanReview, 60, 200, INSTA_WIDTH - 120, 75, 4);
  }

  // 5. 별점
  const starY = 550;
  ctx.font = '40px Arial';
  ctx.textAlign = 'left';
  const stars = '★'.repeat(rating || 0) + '☆'.repeat(5 - (rating || 0));
  ctx.fillStyle = '#FFD700';
  ctx.fillText(stars, 60, starY);

  // 6. 책 표지 (하단 오른쪽)
  const coverSize = 350;
  const coverX = INSTA_WIDTH - coverSize - 60;
  const coverY = INSTA_HEIGHT - coverSize * 1.45 - 60;

  ctx.shadowColor = 'rgba(255, 184, 198, 0.4)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetX = -10;
  ctx.shadowOffsetY = 10;

  if (bookData.cover) {
    try {
      const img = await loadImage(bookData.cover);
      ctx.drawImage(img, coverX, coverY, coverSize, coverSize * 1.45);
    } catch {
      ctx.fillStyle = '#FFB8C6';
      ctx.fillRect(coverX, coverY, coverSize, coverSize * 1.45);
    }
  }
  ctx.shadowColor = 'transparent';

  // 7. 책 정보 (하단 왼쪽)
  const bottomY = INSTA_HEIGHT - 80;
  ctx.fillStyle = '#FFB8C6';
  ctx.font = 'bold 38px "Gowun Batang", serif';
  ctx.textAlign = 'left';
  ctx.fillText(bookData.title || '책 제목', 60, bottomY);

  ctx.font = '28px "Gowun Batang", serif';
  ctx.fillStyle = '#ABABAB';
  ctx.fillText((bookData.author || '저자'), 60, bottomY + 45);

  return canvas;
}

// Template 3: 손글씨 느낌 (따뜻하고 개인적인)
async function generateHandwritingTemplate(bookData, review, rating) {
  const canvas = document.createElement('canvas');
  canvas.width = INSTA_WIDTH;
  canvas.height = INSTA_HEIGHT;
  const ctx = canvas.getContext('2d');

  // 1. 배경 - 노트 종이 느낌
  ctx.fillStyle = '#FFFEF7';
  ctx.fillRect(0, 0, INSTA_WIDTH, INSTA_HEIGHT);

  // 노트 줄무늬
  ctx.strokeStyle = 'rgba(255, 184, 198, 0.15)';
  ctx.lineWidth = 2;
  for (let y = 200; y < INSTA_HEIGHT - 200; y += 70) {
    ctx.beginPath();
    ctx.moveTo(100, y);
    ctx.lineTo(INSTA_WIDTH - 100, y);
    ctx.stroke();
  }

  // 2. 손글씨 스타일 헤더
  ctx.fillStyle = '#FF9E9E';
  ctx.font = 'italic 48px "Gowun Batang", serif';
  ctx.textAlign = 'center';
  ctx.fillText('📖 오늘의 독서', INSTA_WIDTH / 2, 120);

  // 3. 책 표지 (중앙 상단)
  const coverSize = 300;
  const coverX = (INSTA_WIDTH - coverSize) / 2;
  const coverY = 180;

  // 테이프 효과
  ctx.fillStyle = 'rgba(255, 184, 198, 0.4)';
  ctx.fillRect(coverX - 20, coverY - 10, coverSize + 40, 30);

  if (bookData.cover) {
    try {
      const img = await loadImage(bookData.cover);
      ctx.drawImage(img, coverX, coverY, coverSize, coverSize * 1.45);
    } catch {
      ctx.fillStyle = '#FFE8F0';
      ctx.fillRect(coverX, coverY, coverSize, coverSize * 1.45);
    }
  }

  // 4. 별점 (스티커 느낌)
  const starY = coverY + coverSize * 1.45 + 80;
  ctx.font = '50px Arial';
  ctx.textAlign = 'center';
  const stars = '★'.repeat(rating || 0) + '☆'.repeat(5 - (rating || 0));

  // 배경 원
  ctx.fillStyle = '#FFE8F0';
  ctx.beginPath();
  ctx.arc(INSTA_WIDTH / 2, starY - 15, 160, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFD700';
  ctx.fillText(stars, INSTA_WIDTH / 2, starY);

  // 5. 리뷰 (손글씨 느낌)
  if (review && review.trim()) {
    const cleanReview = stripHtml(review);
    const reviewY = starY + 100;

    ctx.fillStyle = '#4A4A4A';
    ctx.font = 'italic 38px "Gowun Batang", serif';
    ctx.textAlign = 'center';
    wrapText(ctx, '"' + cleanReview + '"', INSTA_WIDTH / 2, reviewY, INSTA_WIDTH - 200, 60);
  }

  // 6. 하단 서명
  const bottomY = INSTA_HEIGHT - 100;
  ctx.fillStyle = '#FF9E9E';
  ctx.font = 'italic 32px "Gowun Batang", serif';
  ctx.textAlign = 'center';
  ctx.fillText('— 맘스북스 —', INSTA_WIDTH / 2, bottomY);

  return canvas;
}

// Template 4: 미니멀 (깔끔하고 모던)
async function generateMinimalTemplate(bookData, review, rating) {
  const canvas = document.createElement('canvas');
  canvas.width = INSTA_WIDTH;
  canvas.height = INSTA_HEIGHT;
  const ctx = canvas.getContext('2d');

  // 1. 배경 - 순백
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, INSTA_WIDTH, INSTA_HEIGHT);

  // 2. 미니멀 프레임
  ctx.strokeStyle = '#E0E0E0';
  ctx.lineWidth = 3;
  ctx.strokeRect(80, 80, INSTA_WIDTH - 160, INSTA_HEIGHT - 160);

  // 3. 책 표지 (크게, 중앙)
  const coverSize = 450;
  const coverX = (INSTA_WIDTH - coverSize) / 2;
  const coverY = 200;

  ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 15;

  if (bookData.cover) {
    try {
      const img = await loadImage(bookData.cover);
      ctx.drawImage(img, coverX, coverY, coverSize, coverSize * 1.45);
    } catch {
      ctx.fillStyle = '#F5F5F5';
      ctx.fillRect(coverX, coverY, coverSize, coverSize * 1.45);
    }
  }
  ctx.shadowColor = 'transparent';

  // 4. 별점 (미니멀 스타일)
  const starY = coverY + coverSize * 1.45 + 80;
  ctx.font = '44px Arial';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFD700';
  const stars = '★'.repeat(rating || 0) + '☆'.repeat(5 - (rating || 0));
  ctx.fillText(stars, INSTA_WIDTH / 2, starY);

  // 5. 구분선
  ctx.strokeStyle = '#FFB8C6';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(INSTA_WIDTH / 2 - 150, starY + 40);
  ctx.lineTo(INSTA_WIDTH / 2 + 150, starY + 40);
  ctx.stroke();

  // 6. 책 정보 (깔끔하게)
  const infoY = starY + 100;
  ctx.fillStyle = '#2A2A2A';
  ctx.font = 'bold 36px "Gowun Batang", serif';
  ctx.textAlign = 'center';
  ctx.fillText(bookData.title || '책 제목', INSTA_WIDTH / 2, infoY);

  ctx.font = '28px "Gowun Batang", serif';
  ctx.fillStyle = '#8B8B8B';
  ctx.fillText((bookData.author || '저자') + ' · ' + (bookData.publisher || '출판사'), INSTA_WIDTH / 2, infoY + 45);

  // 7. 하단 로고
  const bottomY = INSTA_HEIGHT - 120;
  ctx.fillStyle = '#FFB8C6';
  ctx.font = 'bold 32px "Gowun Batang", serif';
  ctx.fillText('맘스북스', INSTA_WIDTH / 2, bottomY);

  return canvas;
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
        ctx.fillText(line + '...', x, currentY);
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

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  // 한국어는 공백 없이도 줄바꿈 가능
  const chars = text.split('');
  let line = '';
  let currentY = y;
  const maxLines = 3;
  let lineCount = 0;

  for (let i = 0; i < chars.length; i++) {
    const testLine = line + chars[i];
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && line.length > 0) {
      if (lineCount >= maxLines - 1) {
        ctx.fillText(line + '...', x, currentY);
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

function downloadCanvas(canvas, filename) {
  return new Promise((resolve, reject) => {
    // 파일명 확인
    if (!filename || !filename.endsWith('.png')) {
      filename = `맘스북스_${Date.now()}.png`;
    }

    canvas.toBlob(blob => {
      if (!blob) {
        reject(new Error('Canvas toBlob failed'));
        return;
      }

      // iOS Safari 호환 다운로드
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';

      document.body.appendChild(link);

      // iOS에서는 클릭 이벤트를 수동으로 생성
      const clickEvent = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: false
      });
      link.dispatchEvent(clickEvent);

      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);

      resolve(blob);
    }, 'image/png', 1.0);
  });
}

async function shareToInstagram(canvas, filename, bookTitle) {
  const blob = await new Promise(resolve => {
    canvas.toBlob(resolve, 'image/png', 1.0);
  });

  const file = new File([blob], filename, { type: 'image/png' });

  // Web Share API 지원 확인
  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: `맘스북스 - ${bookTitle}`,
        text: `📚 ${bookTitle} 독서 기록`
      });
      return true;
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Share failed:', err);
      }
      return false;
    }
  }
  return false;
}

// 글로벌 export
window.generateInstagramTemplate = generateInstagramTemplate;
window.downloadCanvas = downloadCanvas;
window.shareToInstagram = shareToInstagram;
window.INSTAGRAM_TEMPLATES = TEMPLATES;
