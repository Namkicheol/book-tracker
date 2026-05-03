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

// 1. 소프트 핑크 카드 (Canva 느낌)
const softPinkCard = `Instagram aesthetic background 1080x1350.
Soft pastel pink and peach watercolor brushstrokes around edges.
White rounded rectangle card frame centered, clean and minimal.
Tiny scattered stars, hearts, sparkles decorating the corners and edges.
Dreamy soft aesthetic, warm gentle vibe.
No text, no letters, no words.
Professional Instagram post style, Korean mom aesthetic.`;

// 2. 라벤더 드림
const lavenderDream = `Instagram aesthetic background 1080x1350.
Soft lavender and lilac gradient, dreamy clouds.
White rounded card frame with subtle shadow.
Delicate floating butterflies, small flowers, gentle sparkles.
Ethereal soft romantic vibe.
No text, no letters.
Instagram worthy, modern feminine aesthetic.`;

// 3. 피치 코랄 
const peachCoral = `Instagram aesthetic background 1080x1350.
Peachy coral and soft orange gradient, sunset vibes.
White card frame with rounded corners.
Tiny stars, hearts, confetti scattered around edges.
Warm cozy aesthetic, golden hour feeling.
No text, no letters.
Professional Instagram story style.`;

// 4. 민트 파스텔
const mintPastel = `Instagram aesthetic background 1080x1350.
Soft mint green and sky blue gradient, fresh spring vibes.
Clean white rounded rectangle frame.
Small doodle flowers, leaves, sparkles in corners.
Fresh bright cheerful aesthetic.
No text, no letters.
Modern Instagram post, youthful vibe.`;

// 5. 크림 베이지 (우아한)
const creamBeige = `Instagram aesthetic background 1080x1350.
Soft cream and beige tones, elegant minimal.
White card frame with delicate border.
Subtle gold accents, small stars, tiny hearts.
Sophisticated warm aesthetic, luxury feel.
No text, no letters.
Premium Instagram aesthetic, refined style.`;

console.log('🎨 Generating Instagram vibe templates...\n');
await generate(softPinkCard, 'insta-soft-pink.png');
await generate(lavenderDream, 'insta-lavender.png');
await generate(peachCoral, 'insta-peach.png');
await generate(mintPastel, 'insta-mint.png');
await generate(creamBeige, 'insta-cream.png');
console.log('\n✨ 5 Instagram aesthetic templates ready!');
