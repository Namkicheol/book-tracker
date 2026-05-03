#!/usr/bin/env python3
"""
귀여운 독서 캐릭터 생성 (Hugging Face Inference API)
무료 tier 사용 - rate limit 조심!
"""

import os
import sys
import time
import urllib.request
import json

HF_TOKEN_PATH = os.path.expanduser('~/.hf_token')
OUTPUT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/img'

def generate_character(prompt, output_name='reading-character.png'):
    """Hugging Face Inference API로 캐릭터 이미지 생성"""

    # 토큰 확인
    if not os.path.exists(HF_TOKEN_PATH):
        print(f"❌ Hugging Face 토큰이 없습니다.")
        print(f"   1. https://huggingface.co/settings/tokens 에서 토큰 생성")
        print(f"   2. echo 'YOUR_TOKEN' > {HF_TOKEN_PATH}")
        return False

    with open(HF_TOKEN_PATH) as f:
        token = f.read().strip()

    # Stable Diffusion XL 모델 사용
    api_url = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0"

    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json',
    }

    payload = {
        'inputs': prompt,
        'parameters': {
            'negative_prompt': 'ugly, deformed, noisy, blurry, distorted, realistic, photograph, 3d render',
            'num_inference_steps': 25,
            'guidance_scale': 7.5,
        }
    }

    print(f"🎨 캐릭터 생성 중...")
    print(f"   프롬프트: {prompt}")

    req = urllib.request.Request(
        api_url,
        data=json.dumps(payload).encode('utf-8'),
        headers=headers
    )

    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            if response.status == 200:
                output_path = os.path.join(OUTPUT_DIR, output_name)
                with open(output_path, 'wb') as f:
                    f.write(response.read())
                print(f"✅ 저장 완료: {output_path}")
                return True
            else:
                print(f"❌ API 오류: {response.status}")
                return False
    except urllib.error.HTTPError as e:
        error_msg = e.read().decode('utf-8')
        if 'loading' in error_msg.lower():
            print(f"⏳ 모델 로딩 중... 20초 후 재시도")
            time.sleep(20)
            return generate_character(prompt, output_name)
        else:
            print(f"❌ 오류: {error_msg}")
            return False
    except Exception as e:
        print(f"❌ 예외 발생: {e}")
        return False

if __name__ == '__main__':
    # 귀여운 초딩맘 스타일 캐릭터 프롬프트
    prompts = [
        ("cute kawaii child reading book, pastel pink and purple colors, simple illustration, chibi style, big sparkly eyes, happy smile, sitting cross-legged with open book, storybook style, flat colors, soft rounded shapes, minimal details, white background, children's book illustration",
         "character-reading.png"),

        ("adorable cartoon girl with book, kawaii anime style, pastel pink hair, lavender dress, holding colorful picture book, cheerful expression, simple clean illustration, soft gradients, cute and friendly, sticker style",
         "character-girl.png"),

        ("cute cartoon stack of books with smiley face, kawaii style, pastel colors pink purple peach, simple rounded shapes, happy friendly expression, children's illustration, flat design, no background",
         "character-books.png"),
    ]

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    for prompt, filename in prompts:
        if generate_character(prompt, filename):
            print(f"✨ {filename} 생성 완료!\n")
            time.sleep(5)  # rate limit 회피
        else:
            print(f"⚠️  {filename} 생성 실패\n")

    print("🎉 모든 캐릭터 생성 완료!")
