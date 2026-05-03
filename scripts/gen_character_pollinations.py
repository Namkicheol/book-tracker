#!/usr/bin/env python3
"""
귀여운 독서 캐릭터 생성 (Pollinations.ai - 무료!)
"""

import os
import sys
import time
import urllib.request

TOKEN_PATH = os.path.expanduser('~/.pollinations_token')
OUTPUT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/img'

def generate_character(prompt, output_name='reading-character.png'):
    """Pollinations.ai로 캐릭터 이미지 생성 (무료)"""

    # URL 인코딩
    encoded_prompt = urllib.parse.quote(prompt)
    url = f'https://image.pollinations.ai/prompt/{encoded_prompt}?width=800&height=800&nologo=true&enhance=true'

    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }

    # 토큰이 있으면 사용 (선택사항)
    if os.path.exists(TOKEN_PATH):
        with open(TOKEN_PATH) as f:
            token = f.read().strip()
            headers['Authorization'] = f'Bearer {token}'

    print(f"🎨 캐릭터 생성 중...")
    print(f"   프롬프트: {prompt[:60]}...")

    req = urllib.request.Request(url, headers=headers)

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
    except Exception as e:
        print(f"❌ 예외 발생: {e}")
        return False

if __name__ == '__main__':
    # 귀여운 초딩맘 스타일 캐릭터 프롬프트
    prompts = [
        ("cute kawaii child reading book, pastel pink and purple colors, chibi anime style, big sparkly eyes, happy smile, sitting with open book, storybook illustration, flat colors, soft rounded shapes, white background",
         "character-reading.png"),

        ("adorable cartoon girl holding book, kawaii style, pastel pink hair, lavender dress, cheerful smile, simple clean illustration, children's book art, cute and friendly",
         "character-girl.png"),

        ("cute smiling book stack mascot, kawaii style, pastel pink purple peach colors, simple rounded shapes, happy face, children's illustration, flat design, transparent background",
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
