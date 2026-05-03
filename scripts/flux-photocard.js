const fetch = require('node-fetch');
const fs = require('fs');

const HF_API_KEY = '***REMOVED-HF-TOKEN***';
const API_URL = 'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell';

const prompt = `Instagram post background template, 1080x1350 portrait, K-POP photocard aesthetic.
Holographic pastel gradient background (lavender #E8C5FF to pink #FFE8F0 to soft yellow #FFE599).
Iridescent shine effect, soft rainbow light streaks.
White rounded card frame in center with subtle drop shadow.
Empty zones inside card: top for logo, center for book cover, bottom for info.
Bottom right corner outside card: small "맘스북스" gradient text with tiny book icon.
Clean, premium, collectible feel, K-culture aesthetic.
Professional, high quality, Instagram-worthy, modern Korean design.`;

(async () => {
  console.log('[Flux Photocard] Generating...');
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
    console.error('Error:', error);
    process.exit(1);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync('flux-photocard-template.png', buffer);
  console.log('✅ Saved: flux-photocard-template.png');
})();
