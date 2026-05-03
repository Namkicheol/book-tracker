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

// 캐릭터는 모서리에만! 중앙은 비워두기!

const kidReading = `Instagram background 1080x1350.
Bright pastel colors, playful kids vibe.
IMPORTANT: Cute cartoon child reading book ONLY in bottom left corner, small size.
White rounded card frame in center with LARGE EMPTY SPACE inside.
Colorful stars and hearts scattered ONLY around the edges.
Center area completely clean and empty for text content.
No text, no letters.
Children's illustration style.`;

const animalFriends = `Instagram background 1080x1350.
Soft pastel rainbow, adorable vibe.
IMPORTANT: Cute animals (bear, bunny) ONLY in corners, small decorative size.
Large white card frame centered with BIG EMPTY SPACE inside.
Colorful clouds and stars ONLY at the edges, not in center.
Center completely clean for content.
No text, no letters.
Kawaii kids style.`;

const spaceReading = `Instagram background 1080x1350.
Bright purple blue space background.
IMPORTANT: Small astronaut kid character ONLY in top right corner.
Cute planets and stars scattered ONLY around edges.
Large white rounded frame centered with HUGE EMPTY SPACE.
Center area pristine and clean.
No text, no letters.
Kids space illustration.`;

const forestStory = `Instagram background 1080x1350.
Bright green yellow forest scene.
IMPORTANT: Woodland animals (fox, owl) ONLY at bottom corners, small.
Trees and mushrooms ONLY around the border edges.
Large white card frame with MASSIVE EMPTY CENTER.
Clean space for book cover and text.
No text, no letters.
Whimsical kids forest art.`;

const rainbowCandy = `Instagram background 1080x1350.
Bright rainbow gradient, super fun.
IMPORTANT: Kawaii characters with faces ONLY in corners, tiny size.
Candies and lollipops scattered ONLY at edges.
Large white rounded frame with GIANT EMPTY MIDDLE.
Center completely clear.
No text, no letters.
Sweet kids illustration.`;

console.log('👶 Generating kids templates with space...\n');
await generate(kidReading, 'kids-reading-v2.png');
await generate(animalFriends, 'kids-animals-v2.png');
await generate(spaceReading, 'kids-space-v2.png');
await generate(forestStory, 'kids-forest-v2.png');
await generate(rainbowCandy, 'kids-rainbow-v2.png');
console.log('\n✨ Done! Center space reserved!');
