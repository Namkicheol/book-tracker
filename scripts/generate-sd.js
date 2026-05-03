const fs = require('fs');

const HF_API_KEY = '***REMOVED-HF-TOKEN***';

async function generateImage(model, prompt, outputFile) {
  console.log(`[HF] Model: ${model}`);
  console.log(`[HF] Generating ${outputFile}...`);
  
  const response = await fetch(
    `https://api-inference.huggingface.co/models/${model}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_API_KEY}`,
      },
      body: JSON.stringify({ inputs: prompt }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error(`Error: ${response.status}`);
    console.error(error.substring(0, 200));
    return false;
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(outputFile, buffer);
  console.log(`✅ Saved: ${outputFile}\n`);
  return true;
}

const stickerPrompt = `Instagram background template, pastel pink gradient, floating books and sparkles in corners, empty center, "맘스북스" text bottom right, 1080x1350`;

const photocardPrompt = `K-POP photocard holographic background, lavender pink yellow gradient, white card frame, "맘스북스" text, 1080x1350`;

(async () => {
  console.log('🎨 Trying Stable Diffusion models...\n');
  
  // Stable Diffusion 2.1 시도
  await generateImage(
    'stabilityai/stable-diffusion-2-1',
    stickerPrompt,
    'template-sticker.png'
  );
  
  await generateImage(
    'stabilityai/stable-diffusion-2-1',
    photocardPrompt,
    'template-photocard.png'
  );
})();
