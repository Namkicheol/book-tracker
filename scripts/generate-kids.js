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

// 1. 책 읽는 아이 캐릭터
const kidReading = `Instagram background 1080x1350.
Bright cheerful pastel colors, playful vibe.
Cute cartoon child character reading a big book in corner.
Colorful stars, hearts, fun doodles scattered.
White rounded card frame.
Happy energetic elementary school kid aesthetic.
No text, no letters.
Fun children's book illustration style.`;

// 2. 동물 친구들 (곰돌이, 토끼)
const animalFriends = `Instagram background 1080x1350.
Soft pastel rainbow colors, adorable vibe.
Cute cartoon animals (bear, bunny, cat) reading books together.
Colorful clouds, stars, balloons floating.
White card frame with playful edges.
Sweet friendly children's illustration style.
No text, no letters.
Kawaii kids aesthetic.`;

// 3. 우주 탐험 독서
const spaceReading = `Instagram background 1080x1350.
Bright purple and blue space background with cute planets.
Adorable astronaut kid character floating with books.
Colorful stars, comets, friendly aliens.
White rounded frame.
Fun playful space adventure vibe for kids.
No text, no letters.
Children's book illustration style.`;

// 4. 숲속 동화
const forestStory = `Instagram background 1080x1350.
Bright green and yellow forest scene, magical vibes.
Cute woodland animals (fox, owl, deer) with books.
Colorful mushrooms, flowers, trees in background.
White card frame with nature accents.
Whimsical children's storybook illustration.
No text, no letters.
Playful kids forest adventure aesthetic.`;

// 5. 레인보우 캔디
const rainbowCandy = `Instagram background 1080x1350.
Bright rainbow gradient, super colorful and fun.
Cute kawaii characters (clouds, stars with faces) holding books.
Colorful candies, lollipops, sparkles everywhere.
White rounded card frame.
Sweet playful energetic kid aesthetic.
No text, no letters.
Vibrant children's illustration style.`;

console.log('👶 Generating kids character templates...\n');
await generate(kidReading, 'kids-reading.png');
await generate(animalFriends, 'kids-animals.png');
await generate(spaceReading, 'kids-space.png');
await generate(forestStory, 'kids-forest.png');
await generate(rainbowCandy, 'kids-rainbow.png');
console.log('\n✨ 5 kids templates ready!');
