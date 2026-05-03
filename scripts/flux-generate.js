const fs = require('fs');

const HF_API_KEY = '***REMOVED-HF-TOKEN***';
const API_URL = 'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell';

async function generateFlux(prompt, outputFile) {
  console.log(`[Flux] Generating ${outputFile}...`);
  
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HF_API_KEY}`,
      'Content-Type': 'application/json',
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

// 맘스북스 브랜드에 맞는 귀여운 스타일
const stickerPrompt = `Professional Instagram post background template, 1080x1350 portrait format.
Soft dreamy aesthetic matching 맘스북스 (Mom's Books) brand identity.
Pastel gradient background: peachy cream #FFF8F0 transitioning to soft pink #FFE8F0.
Delicate decorative elements: tiny floating book icons, soft sparkles, gentle heart shapes in corners.
Three subtle rectangular zones with very light borders for content placement.
Warm, loving, sophisticated mom aesthetic - cute but not childish.
Bottom right: elegant "맘스북스" in coral-to-pink-to-lavender gradient with small book icon.
Clean Instagram aesthetic, professional photography style, soft natural lighting.
High quality, modern Korean design sensibility.`;

const photocardPrompt = `Professional Instagram K-POP photocard style template, 1080x1350 portrait.
Soft holographic pastel gradient: lavender #E8C5FF to pink #FFE8F0 to butter yellow #FFE599.
Subtle iridescent effect, dreamy light rays.
Clean white rounded card frame centered with elegant shadow.
Empty content zones inside card with minimal guides.
Matches 맘스북스 brand: warm, precious, collectible feel.
Bottom right: "맘스북스" gradient text with tiny book icon.
Premium aesthetic, K-culture design, Instagram-worthy, professional quality.`;

(async () => {
  try {
    await generateFlux(stickerPrompt, 'flux-sticker-template.png');
    await generateFlux(photocardPrompt, 'flux-photocard-template.png');
    console.log('\n🎉 Both templates generated successfully!');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
