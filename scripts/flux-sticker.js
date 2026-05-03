const fetch = require('node-fetch');
const fs = require('fs');

const HF_API_KEY = '***REMOVED-HF-TOKEN***';
const API_URL = 'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell';

const prompt = `Instagram post background template, 1080x1350 portrait.
Cute aesthetic sticker scrapbook style for Korean mom book review app.
Soft pastel pink and lavender gradient background (#FFF0F5 to #FFD4E5).
Decorative elements in corners: small sparkle stickers, heart stickers, tiny star shapes.
Three empty rectangular zones with subtle light borders for content placement.
Top zone for book cover image, middle zone for text, bottom zone for rating.
Bottom right corner: small gradient text "맘스북스" (coral to pink to lavender) with tiny book icon.
Clean, modern, Instagram aesthetic, warm and loving vibe.
High quality, professional design, soft shadows, dreamy atmosphere.`;

(async () => {
  console.log('[Flux Sticker] Generating...');
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
  fs.writeFileSync('flux-sticker-template.png', buffer);
  console.log('✅ Saved: flux-sticker-template.png');
})();
