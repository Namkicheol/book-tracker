#!/usr/bin/env python3
"""초등 학년 재매핑: 저/중/고 3단계 → 저학년(1-3)/고학년(4-6) 2단계
- 초등 중학년(3-4) → 초등 저학년
- 초등 1-2학년    → 초등 저학년
- 초등 (학년 미지정) → 초등 저학년 (기본값)
"""
import json, os
from collections import Counter

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(BASE, "data", "book-recommendations.json")

REMAP = {
    "초등 중학년":   "초등 저학년",
    "초등 1-2학년": "초등 저학년",
    "초등":          "초등 저학년",
}

def main():
    d = json.load(open(PATH, encoding="utf-8"))
    changed = 0
    for isbn, book in d["books"].items():
        old = book.get("targetAge", "")
        new = REMAP.get(old, old)
        if new != old:
            book["targetAge"] = new
            changed += 1
    json.dump(d, open(PATH, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"완료: {changed}권 재매핑")
    dist = Counter(b.get("targetAge", "") for b in d["books"].values())
    for k, v in sorted(dist.items()):
        print(f"  {k}: {v}권")

if __name__ == "__main__":
    main()
