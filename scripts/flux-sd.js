const fs = require('fs');

const HF_API_KEY = '***REMOVED-HF-TOKEN***';
// Stable Diffusion XL - 무료로 사용 가능
const API_URL = 'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0';

async function generateImage(prompt, outputFile) {
  console.log(`[SDXL] Generating ${outputFile}...`);
  console.log(`[SDXL] Prompt: ${prompt.substring(0, 100)}...`);
  
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HF_API_KEY}`,
    },
    body: JSON.stringify({ inputs: prompt })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error: ${response.status} - ${error}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(outputFile, buffer);
  console.log(`✅ Saved: ${outputFile}`);
}

// 맘스북스 스티커 템플릿
const stickerPrompt = `Instagram post background template, 1080x1350 portrait.
Soft pastel aesthetic, dreamy gradient from peachy cream to soft pink.
Delicate floating books, tiny sparkles, gentle hearts in corners.
Three empty rectangular zones for content.
Bottom right small text "맘스북스" in gradient.
Professional, clean, warm, loving mom aesthetic, Instagram worthy.
High quality, soft lighting, modern Korean design.`;

// 포토카드 템플릿
const photocardPrompt = `Instagram K-POP photocard template, 1080x1350 portrait.
Holographic pastel gradient, lavender to pink to yellow.
White rounded card frame centered with elegant shadow.
Empty content zones, clean layout.
Premium collectible aesthetic, K-culture design.
Bottom right "맘스북스" gradient text.
Professional, Instagram worthy, high quality.`;

(async () => {
  try {
    console.log('🎨 Generating templates with Stable Diffusion XL...\n');
    await generateImage(stickerPrompt, 'template-sticker-bg.png');
    console.log('');
    await generateImage(photocardPrompt, 'template-photocard-bg.png');
    console.log('\n🎉 Both templates generated!');
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
})();
