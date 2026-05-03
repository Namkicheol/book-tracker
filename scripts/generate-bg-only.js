import { HfInference } from '@huggingface/inference';
import fs from 'fs';

const hf = new HfInference('***REMOVED-HF-TOKEN***');

async function generateTemplate(prompt, outputFile) {
  console.log(`\n[HF] Generating ${outputFile}...`);
  
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

// 텍스트 없이 배경만!
const stickerPrompt = `Instagram background 1080x1350 portrait.
Soft pastel pink and lavender gradient background, dreamy clouds.
Small floating open books, tiny sparkles, gentle hearts decorating the corners.
Large clean empty center space.
No text, no letters, no words.
Professional warm aesthetic, modern Instagram style.`;

const photocardPrompt = `K-POP photocard background 1080x1350 portrait.
Holographic pastel gradient lavender to pink to butter yellow.
Clean white rounded rectangular card frame centered with soft shadow.
Empty space inside the card.
No text, no letters, no words.
Premium collectible aesthetic, professional Instagram worthy.`;

const diaryPrompt = `Notebook diary background 1080x1350 portrait.
Soft cream yellow paper texture, horizontal light pink ruled lines.
Small hand-drawn doodle hearts and stars in corners.
Clean empty center space for content.
No text, no letters, no words.
Warm cozy study notes aesthetic.`;

const minimalPrompt = `Modern minimal background 1080x1350 portrait.
Clean white background, large soft coral geometric circle accent.
Simple elegant composition with negative space.
No text, no letters, no words.
Professional sophisticated Instagram aesthetic.`;

console.log('🎨 Generating background-only templates...\n');
await generateTemplate(stickerPrompt, 'bg-sticker.png');
await generateTemplate(photocardPrompt, 'bg-photocard.png');
await generateTemplate(diaryPrompt, 'bg-diary.png');
await generateTemplate(minimalPrompt, 'bg-minimal.png');
console.log('\n✅ All backgrounds ready!');
