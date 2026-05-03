import { HfInference } from '@huggingface/inference';
import fs from 'fs';

const hf = new HfInference('***REMOVED-HF-TOKEN***');

async function generate(prompt, file) {
  console.log(`\n[FLUX] ${file}...`);
  try {
    const blob = await hf.textToImage({
      model: 'black-forest-labs/FLUX.1-schnell',
      inputs: prompt,
    });
    const buffer = Buffer.from(await blob.arrayBuffer());
    fs.writeFileSync(file, buffer);
    console.log(`✅ Done!`);
  } catch (err) {
    console.error(`❌ ${err.message}`);
  }
}

// 1. 책 읽는 순간 (코지)
const cozyReading = `Instagram aesthetic 1080x1350.
Soft warm lighting, cozy reading moment vibe.
Gentle pastel background with floating open books, reading glasses, coffee cup.
White rounded card frame.
Small bookmark ribbons, page corners, tiny hearts scattered.
Warm inviting bookworm aesthetic.
No text, no letters.
Professional bookstagram style.`;

// 2. 북카페 감성
const bookCafe = `Instagram aesthetic 1080x1350.
Soft beige and cream tones, cafe vibes.
Watercolor books stacked in corners, steaming coffee, gentle leaves.
White card frame with book page texture edges.
Cozy reading space aesthetic, warm atmosphere.
No text, no letters.
Modern bookstagram, gentle sophisticated.`;

// 3. 손글씨 독서 노트
const handwrittenNote = `Instagram aesthetic 1080x1350.
Soft yellow cream notebook paper background.
Light ruled lines, hand-drawn doodles of books and stars.
Handwritten style decorations, sketch-like hearts and arrows.
Watercolor book illustrations in corners.
Personal reading journal vibe, warm intimate.
No typed text, only decorative hand-drawn elements.
Cozy bookish aesthetic.`;

// 4. 밤 독서 (달빛)
const moonlightReading = `Instagram aesthetic 1080x1350.
Deep soft purple to navy gradient, night reading vibes.
Glowing moon, twinkling stars, floating books illuminated.
White card frame with soft glow.
Dreamy night reader aesthetic, magical peaceful.
No text, no letters.
Bookstagram night vibes, enchanting.`;

// 5. 봄 독서 (플로럴)
const springReading = `Instagram aesthetic 1080x1350.
Soft pastel pink and green, spring garden vibes.
Delicate watercolor flowers, books with blooming petals.
White rounded frame with floral accents.
Fresh bright bookish aesthetic, cheerful gentle.
No text, no letters.
Modern bookstagram, youthful spring.`;

console.log('📚 Generating bookish templates...\n');
await generate(cozyReading, 'book-cozy.png');
await generate(bookCafe, 'book-cafe.png');
await generate(handwrittenNote, 'book-handwritten.png');
await generate(moonlightReading, 'book-moonlight.png');
await generate(springReading, 'book-spring.png');
console.log('\n✨ 5 bookish templates ready!');
