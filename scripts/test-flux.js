/**
 * Flux.1 이미지 생성 테스트
 * HuggingFace Inference API 사용
 */

const HF_API_KEY = '***REMOVED-HF-TOKEN***';

async function generateFluxImage(prompt, outputPath = 'flux-output.png') {
  const API_URL = 'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell';

  console.log('[Flux] Generating image...');
  console.log('[Flux] Prompt:', prompt);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          num_inference_steps: 4, // Schnell은 4 steps 권장
          guidance_scale: 0, // Schnell은 guidance-free
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error: ${response.status} - ${error}`);
    }

    // 이미지를 blob으로 받기
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 파일로 저장
    const fs = require('fs');
    fs.writeFileSync(outputPath, buffer);

    console.log('[Flux] Image saved to:', outputPath);
    return outputPath;

  } catch (error) {
    console.error('[Flux] Error:', error);
    throw error;
  }
}

// 테스트 실행
const testPrompt = `
Instagram post background template for book review app.
Aesthetic cute sticker scrapbook style.
Pastel pink and lavender gradient background.
Decorative sparkles, hearts, and stars in corners.
Empty rectangular zones for book cover and review text.
Bottom right: small "맘스북스" gradient text.
Clean, modern, Instagram-worthy aesthetic.
1080x1350 portrait format.
`;

if (require.main === module) {
  generateFluxImage(testPrompt.trim(), 'flux-sticker-template.png')
    .then(() => console.log('✅ Done!'))
    .catch(err => console.error('❌ Failed:', err));
}

module.exports = { generateFluxImage };
