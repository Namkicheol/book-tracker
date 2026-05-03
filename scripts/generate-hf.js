import { HfInference } from '@huggingface/inference';
import fs from 'fs';

const hf = new HfInference('***REMOVED-HF-TOKEN***');

async function generateTemplate(prompt, outputFile) {
  console.log(`\n[HF] Generating ${outputFile}...`);
  console.log(`[HF] Prompt: ${prompt.substring(0, 80)}...`);
  
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

// 맘스북스 스타일 프롬프트
const stickerPrompt = `Instagram background template 1080x1350.
Soft pastel pink lavender gradient, dreamy aesthetic.
Small floating books sparkles hearts in corners only.
Large empty center space for book cover and text.
Bottom right small "맘스북스" gradient text pink to lavender.
Professional warm Korean mom aesthetic, clean modern Instagram style.`;

const photocardPrompt = `K-POP photocard background template 1080x1350.
Holographic pastel gradient lavender to pink to butter yellow.
Clean white rounded card frame centered, empty inside.
Premium collectible K-culture aesthetic.
Bottom right "맘스북스" small gradient text.
Professional Instagram worthy, modern design.`;

console.log('🎨 Generating templates with FLUX.1-schnell...');
await generateTemplate(stickerPrompt, 'template-sticker.png');
await generateTemplate(photocardPrompt, 'template-photocard.png');
console.log('\n🎉 Done!');
