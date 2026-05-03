# FLUX 이미지 생성 가이드 — 맘스북스 템플릿

> HuggingFace Inference API + FLUX.1-schnell로 Instagram 템플릿 배경 생성하는 방법

---

## 🎯 핵심 개념

**목표:** 책 리뷰 공유용 Instagram 배경 템플릿 생성  
**요구사항:**
- 중앙 빈 공간 (책 표지 + 리뷰 텍스트 들어갈 자리)
- 텍스트 없이 배경만
- 1080x1350 (Instagram 세로 4:5)
- 밝고 감성적인 디자인

---

## 🔧 환경 설정

### 1. HuggingFace API 키 발급

```
https://huggingface.co/settings/tokens
```

- Fine-grained token 생성
- 권한: "Make calls to Inference Providers" 체크

### 2. 패키지 설치

```bash
npm install @huggingface/inference
```

### 3. 기본 코드 구조

```javascript
import { HfInference } from '@huggingface/inference';
import fs from 'fs';

const hf = new HfInference('YOUR_API_KEY_HERE');

async function generate(prompt, outputFile) {
  try {
    const blob = await hf.textToImage({
      model: 'black-forest-labs/FLUX.1-schnell',
      inputs: prompt,
    });
    
    const buffer = Buffer.from(await blob.arrayBuffer());
    fs.writeFileSync(outputFile, buffer);
    console.log(`✅ Saved: ${outputFile}`);
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
  }
}
```

---

## ✍️ 프롬프트 작성 원칙

### 핵심 규칙

1. **크기 명시:** `1080x1350 portrait`
2. **빈 공간 강조:** `LARGE EMPTY CENTER` / `clean space for content`
3. **텍스트 금지:** `No text, no letters, no words`
4. **장식 위치 제한:** `ONLY in corners` / `around edges`

### 프롬프트 구조

```
Instagram background [크기]
[색상/분위기 설명]
IMPORTANT: [장식 요소] ONLY in corners/edges, small size
Large white card frame with HUGE EMPTY SPACE inside
Center completely clean for content
No text, no letters
[스타일 설명]
```

---

## 🎨 카테고리별 프롬프트 예시

### 1. 인스타 감성 (파스텔)

```javascript
const softPinkCard = `Instagram aesthetic background 1080x1350.
Soft pastel pink and peach watercolor brushstrokes around edges.
White rounded rectangle card frame centered, clean and minimal.
Tiny scattered stars, hearts, sparkles decorating the corners and edges.
Dreamy soft aesthetic, warm gentle vibe.
No text, no letters, no words.
Professional Instagram post style, Korean mom aesthetic.`;
```

**포인트:**
- 수채화 효과: `watercolor brushstrokes`
- 가장자리만: `around edges`
- 카드 프레임: `white rounded rectangle card frame`

### 2. 책 테마 (독서 감성)

```javascript
const cozyReading = `Instagram aesthetic 1080x1350.
Soft warm lighting, cozy reading moment vibe.
Gentle pastel background with floating open books, reading glasses, coffee cup.
White rounded card frame.
Small bookmark ribbons, page corners, tiny hearts scattered.
Warm inviting bookworm aesthetic.
No text, no letters.
Professional bookstagram style.`;
```

**포인트:**
- 독서 요소: `open books, reading glasses, coffee cup`
- 분위기: `cozy reading moment`, `warm lighting`
- 작은 장식: `small bookmark ribbons`

### 3. 어린이 (캐릭터 + 빈 공간)

```javascript
const kidReading = `Instagram background 1080x1350.
Bright pastel colors, playful kids vibe.
IMPORTANT: Cute cartoon child reading book ONLY in bottom left corner, small size.
White rounded card frame in center with LARGE EMPTY SPACE inside.
Colorful stars and hearts scattered ONLY around the edges.
Center area completely clean and empty for text content.
No text, no letters.
Children's illustration style.`;
```

**포인트:**
- **IMPORTANT 강조:** AI가 지침을 따르도록
- 위치 명시: `ONLY in bottom left corner, small size`
- 반복 강조: `LARGE EMPTY SPACE` + `completely clean`

---

## 🚫 피해야 할 것들

### 1. 중국어/한글 텍스트

```javascript
// ❌ 나쁜 예
"Bottom right: 맘스북스 text"

// ✅ 좋은 예  
"No text, no letters, no words"
```

**이유:** FLUX는 한글/중국어 렌더링 못함 → 이상한 글자 나옴

### 2. 중앙 가득 채우기

```javascript
// ❌ 나쁜 예
"Cute animals everywhere, books floating in center"

// ✅ 좋은 예
"Animals ONLY in corners, center completely empty"
```

**이유:** 책 표지/텍스트 넣을 공간 필요

### 3. 복잡한 지시

```javascript
// ❌ 나쁜 예
"Character should be reading, position at 30% from top, size 200px"

// ✅ 좋은 예
"Small character in bottom corner"
```

**이유:** FLUX는 간단하고 명확한 지시가 효과적

---

## 💡 고급 팁

### 1. 배치 생성으로 시간 절약

```javascript
const prompts = [
  { prompt: softPink, file: 'pink.png' },
  { prompt: lavender, file: 'lavender.png' },
  // ...
];

for (const { prompt, file } of prompts) {
  await generate(prompt, file);
}
```

### 2. 크레딧 절약

- **무료 티어:** 월 한정 (정확한 수량 미공개)
- **빠른 모델 사용:** `FLUX.1-schnell` (4 steps, 빠름)
- **테스트:** 소량만 생성 후 확인
- **PRO 구독:** $9/month (20배 더 많음)

### 3. 프롬프트 재사용

```javascript
const basePrompt = `Instagram background 1080x1350.
[COLOR] aesthetic.
White card frame with empty center.
No text.`;

// 색상만 바꿔서 재사용
const pink = basePrompt.replace('[COLOR]', 'Soft pink');
const mint = basePrompt.replace('[COLOR]', 'Fresh mint green');
```

---

## 📊 실전 워크플로우

### Phase 1: 컨셉 정하기

1. 타겟 선정 (인스타 감성 / 독서 / 어린이)
2. 색상 팔레트 결정
3. 필수 요소 리스트

### Phase 2: 프롬프트 작성

```javascript
// 템플릿 사용
const prompt = `
Instagram background 1080x1350.
[색상/분위기]
[장식 요소] ONLY at edges.
Large empty center.
No text.
[스타일]
`.trim();
```

### Phase 3: 생성 & 확인

```bash
node generate.js
open output.png
```

- 중앙 공간 충분한지 확인
- 색감 괜찮은지 확인
- 이상한 텍스트 없는지 확인

### Phase 4: 앱 통합

```javascript
// Canvas로 오버레이
const bgImage = await loadImage('template.png');
ctx.drawImage(bgImage, 0, 0, 1080, 1350);

// 책 표지
ctx.drawImage(bookCover, centerX, centerY, 300, 420);

// 리뷰 텍스트
ctx.fillText(review, x, y);

// 맘스북스 브랜딩
await drawBranding(ctx, x, y);
```

---

## ⚠️ 트러블슈팅

### 1. 크레딧 소진

```
Error: You have depleted your monthly included credits
```

**해결:**
- PRO 구독 ($9/month)
- 또는 다음 달까지 대기
- 또는 Canva 디자인 활용

### 2. 404 에러

```
Cannot POST /models/...
```

**해결:**
- `@huggingface/inference` 패키지 사용 (직접 fetch ❌)
- 모델명 확인: `black-forest-labs/FLUX.1-schnell`

### 3. 이상한 텍스트 생성

**원인:** 프롬프트에 한글/중국어

**해결:** `No text, no letters, no words` 명시

---

## 📚 참고 자료

- **HuggingFace Docs:** https://huggingface.co/docs/api-inference
- **FLUX 모델:** https://huggingface.co/black-forest-labs/FLUX.1-schnell
- **크레딧 확인:** https://huggingface.co/settings/billing

---

## 🎯 맘스북스 적용 사례

**생성된 템플릿:**
- 14개 배경 템플릿
- 카테고리: 인스타(4) + 책(3) + 어린이(4) + 기본(3)
- 크기: 1080x1350 통일
- 텍스트 없음 (Canvas로 추가)

**통합 방법:**
1. 템플릿 ID별 배경 이미지 매핑
2. Canvas API로 동적 오버레이
3. 사용자 선택 UI (템플릿 미리보기)

---

*작성일: 2026-05-03*  
*작성자: Claude Code*  
*프로젝트: 맘스북스 (책 독서 기록 앱)*
