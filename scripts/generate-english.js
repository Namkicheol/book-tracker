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
    return true;
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    return false;
  }
}

const stickerPrompt = `Instagram background template 1080x1350 portrait.
Soft pastel pink and lavender gradient, dreamy aesthetic.
Small floating open books, tiny sparkles, gentle hearts in corners.
Large empty center space for content.
Bottom right corner: small text "Mom's Books" in elegant gradient pink to lavender.
Professional, warm, modern Instagram aesthetic, Korean parenting style.`;

const photocardPrompt = `K-POP photocard background template 1080x1350 portrait.
Holographic pastel gradient from lavender to pink to butter yellow.
Clean white rounded card frame centered with soft shadow.
Empty space inside card for content.
Bottom right: elegant text "Mom's Books" in gradient.
Premium collectible K-culture aesthetic, Instagram worthy.`;

console.log('🎨 Generating English version templates...');
await generateTemplate(stickerPrompt, 'template-sticker-en.png');
await generateTemplate(photocardPrompt, 'template-photocard-en.png');
console.log('\n✅ Done!');
