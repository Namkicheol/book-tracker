const fs = require('fs');

const HF_API_KEY = '***REMOVED-HF-TOKEN***';

async function generateImage(model, prompt, outputFile) {
  console.log(`[HF] Generating ${outputFile}...`);
  
  const response = await fetch(
    `https://api-inference.huggingface.co/models/${model}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: prompt }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error(`Error: ${response.status}`, error);
    return false;
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(outputFile, buffer);
  console.log(`✅ Saved: ${outputFile}`);
  return true;
}

// 맘스북스 스타일 프롬프트 - 배경만!
const stickerPrompt = `Instagram story background template, 1080x1350 portrait.
Soft pastel pink and lavender gradient, dreamy clouds.
Small decorative books, sparkles, hearts floating in corners only.
Clean empty center space for content.
Bottom right tiny text "맘스북스" in gradient.
Professional, warm, Korean aesthetic.`;

const photocardPrompt = `K-POP photocard background, 1080x1350 portrait.
Holographic gradient lavender to pink to yellow.
Clean white card frame centered.
Empty space inside for content.
Premium collectible aesthetic.
Bottom right small "맘스북스" text.`;

(async () => {
  console.log('🎨 Generating templates with FLUX.1-schnell...\n');
  
  // FLUX.1-schnell 사용
  await generateImage(
    'black-forest-labs/FLUX.1-schnell',
    stickerPrompt,
    'template-sticker.png'
  );
  
  console.log('');
  
  await generateImage(
    'black-forest-labs/FLUX.1-schnell',
    photocardPrompt,
    'template-photocard.png'
  );
  
  console.log('\n🎉 Done!');
})();
