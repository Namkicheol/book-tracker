#!/usr/bin/env python3
"""Round-4 why-authoring pass: fill Korean parent-perspective `why` for every kept book,
then strip the temp `_src` field. Reads /tmp/wb4_enriched.json, writes /tmp/wb4_final.json.

`why` is matched to series/title (1-2 Korean sentences), in the same style as the existing
EN entries (series-aware, parent reading-guidance tone). No book ships with empty `why`.

Run from repo root: python3 scripts/wendybook_bands_round4_why.py
"""
import json

SRC = '/tmp/wb4_enriched.json'
OUT = '/tmp/wb4_final.json'

# Per-ISBN why text. Series share a tone; individual picture/chapter books get tailored notes.
WHY = {
    # --- My First I Can Read (easy starters) ---
    '9780062222299': 'My First I Can Read 단계 얼리리더. 짧은 문장과 트럭 소재로 영어 첫 읽기를 떼기 좋습니다.',
    '9780062222312': 'My First I Can Read 단계 얼리리더. Axel 트럭 시리즈로 같은 패턴을 반복하며 자신감을 키웁니다.',
    '9780062436177': '비스킷(Biscuit) 강아지 시리즈. 반복되는 쉬운 문장으로 파닉스를 막 뗀 아이가 혼자 읽기 시작하기 좋습니다.',
    '9780062436146': '비스킷(Biscuit) 강아지 시리즈. 일상 소재와 반복 문장으로 영어 첫 챕터 읽기에 부담이 없습니다.',
    '9780060835613': 'Little Critter 시리즈 얼리리더. 정원 가꾸기 일상 이야기로 쉬운 어휘를 반복합니다.',
    '9780062303790': 'Pete the Cat 얼리리더. 인기 캐릭터와 짧은 문장으로 첫 읽기 흥미를 끌어줍니다.',

    # --- Mercer Mayer Little Critter / Just series ---
    '9780307119483': 'Mercer Mayer의 Little Critter 그림책. 따뜻한 일상 이야기로 그림책에서 글밥 읽기로 넘어가기 좋습니다.',
    '9780307119360': 'Little Critter "Just" 시리즈. 할아버지와의 하루를 그린 일상 이야기로 친근하게 읽힙니다.',
    '9780307119759': 'Little Critter "Just" 시리즈. 깜빡한 하루를 유머러스하게 그려 아이가 공감하며 읽습니다.',
    '9780307125835': 'Little Critter "Just" 시리즈. 치과 가는 날 이야기로 생활 어휘를 자연스럽게 익힙니다.',
    '9780060539474': 'Little Critter "Just" 시리즈. 눈사람 만들기 이야기로 계절 어휘를 즐겁게 만납니다.',

    # --- MathStart (math picture readers) ---
    '9780064467070': 'MathStart 수학 그림책. 이야기 속에서 수 개념을 익혀 영어와 수학을 함께 잡습니다.',
    '9780064467162': 'MathStart 수학 그림책. 동물 소재로 덧셈 개념을 쉽게 풀어 영어와 수학을 함께 잡습니다.',
    '9780064467094': 'MathStart 수학 그림책. 엘리베이터 이야기로 수 개념을 익혀 영어와 수학을 함께 잡습니다.',

    # --- Maisy / Mouse Shapes / Move Over Rover / Little Blue Truck ---
    '9780763650865': '메이지(Maisy) 시리즈. 유아가 좋아하는 일상 소재로 첫 영어 그림책 읽기에 좋습니다.',
    '9781328740533': 'Ellen Stoll Walsh의 도형 그림책. 쥐들과 함께 모양을 익히며 어휘와 개념을 같이 배웁니다.',
    '9780544809000': '운율이 살아있는 그림책. 반복되는 리듬으로 소리 내어 읽기 좋습니다.',
    '9780544568051': 'Little Blue Truck 시리즈. 의성어와 리듬이 풍부해 소리 내어 읽기 좋은 인기 그림책입니다.',

    # --- Katie Woo / King & Kayla (early mystery) ---
    '9781666335743': '케이티 우 & 페드로 미스터리 시리즈. 짧은 추리 이야기로 챕터북 입문에 좋습니다.',
    '9781666332162': '케이티 우 & 페드로 미스터리 시리즈. 또래 주인공의 추리로 영어 챕터 읽기에 흥미를 붙입니다.',
    '9781682630174': 'King & Kayla 시리즈. 강아지 시점의 가벼운 추리로 얼리 챕터북 읽기에 좋습니다.',

    # --- Mr. Putter & Tabby ---
    '9780547850757': 'Mr. Putter & Tabby 시리즈. 따뜻한 일상 이야기로 짧은 챕터 읽기에 익숙해지기 좋습니다.',

    # --- Fancy Nancy (I Can Read 1) ---
    '9780061703706': '팬시 낸시(Fancy Nancy) 시리즈. 화려한 어휘를 재미있게 익히며 I Can Read 단계를 다집니다.',
    '9780062269812': '팬시 낸시(Fancy Nancy) 시리즈. 일상 이벤트를 통해 표현 어휘를 늘리기 좋습니다.',
    '9780062083074': '팬시 낸시(Fancy Nancy) 시리즈. 발레 소재로 고급 어휘를 자연스럽게 만나는 인기 얼리리더입니다.',

    # --- Berenstain Bears ---
    '9780060583354': '베렌스타인 베어즈 시리즈. 가족 일상 이야기로 생활 어휘를 익히는 얼리리더입니다.',
    '9780062350282': '베렌스타인 베어즈 시리즈. 야구 소재로 일상 어휘를 익히며 즐겁게 읽습니다.',

    # --- Mercer Mayer "I Just" ---
    '9780307119759': 'Little Critter "Just" 시리즈. 깜빡한 하루를 유머러스하게 그려 아이가 공감하며 읽습니다.',

    # --- Let's Read and Find Out / Ranger Rick (science readers) ---
    '9780062381927': 'Let\'s Read and Find Out 과학 시리즈. 오감 주제를 쉽게 풀어 영어로 과학 개념을 처음 만납니다.',
    '9780062432063': 'Ranger Rick 과학 리더. 동물 이야기로 논픽션 영어 읽기에 흥미를 붙입니다.',
    '9780062432100': 'Ranger Rick 과학 리더. 고릴라 이야기로 동물 어휘와 논픽션 읽기를 함께 익힙니다.',

    # --- I Can Read classics ---
    '9780064442633': 'I Can Read 단계 고전 얼리리더. 짧은 우화로 영어 읽기 흐름을 익힙니다.',
    '9780064440028': 'Danny and the Dinosaur. 오래 사랑받은 I Can Read 고전으로 첫 챕터 읽기에 좋습니다.',
    '9780062868381': 'Pete the Cat 얼리리더. 가족 여행 이야기로 인기 캐릭터와 함께 읽기 흥미를 끕니다.',
    '9780064440080': 'Harry the Dirty Dog 작가의 I Can Read 시리즈. 강아지 이야기로 친근하게 읽힙니다.',
    '9780064441711': '아멜리아 베델리아(Amelia Bedelia) 시리즈. 말장난 유머로 영어 어휘의 재미를 느낍니다.',

    # --- How to Read a Story / Frederick / Finding Winnie (picture) ---
    '9781452112336': '읽기 그 자체를 다룬 그림책. 책 읽는 즐거움을 일러스트로 풀어 읽기 동기를 키웁니다.',
    '9780399555527': '레오 리오니의 고전 그림책 Frederick. 따뜻한 메시지와 아름다운 그림으로 오래 읽힙니다.',
    '9780316324908': '실화 바탕 그림책 Finding Winnie. 곰돌이 푸의 실제 이야기로 칼데콧 수상작입니다.',

    # --- Galaxy Zack (early chapter sci-fi) ---
    '9781442453869': 'Galaxy Zack 시리즈 1권. 우주 배경의 가벼운 모험으로 얼리 챕터북 시리즈 읽기에 좋습니다.',
    '9781442467187': 'Galaxy Zack 시리즈. 우주 모험을 이어가며 시리즈 읽기 습관을 들이기 좋습니다.',
    '9781442453906': 'Galaxy Zack 시리즈. 행성 탐험 이야기로 SF를 좋아하는 아이에게 잘 맞습니다.',

    # --- Dragon Slayers' Academy ---
    '9780448431093': 'Dragon Slayers\' Academy 시리즈. 유머러스한 용 잡기 학교 이야기로 챕터북 시리즈 읽기에 좋습니다.',
    '9780448431086': 'Dragon Slayers\' Academy 시리즈 1권. 용 잡기 학교 입학 이야기로 가볍게 시작하기 좋습니다.',
    '9780448432779': 'Dragon Slayers\' Academy 시리즈. 짧은 모험 에피소드로 시리즈 읽기 흐름을 이어갑니다.',
    '9780448438207': 'Dragon Slayers\' Academy 시리즈. 라틴어 말장난까지 더한 유머로 즐겁게 읽힙니다.',
    '9780448435077': 'Dragon Slayers\' Academy 시리즈. 운명의 수레바퀴 에피소드로 모험을 이어갑니다.',
    '9780448435084': 'Dragon Slayers\' Academy 시리즈. 천년 카운트다운 이야기로 시리즈 재미를 더합니다.',
    '9780448441122': 'Dragon Slayers\' Academy 시리즈. 가장 오래 산 용 이야기로 시리즈 후반 모험을 즐깁니다.',

    # --- Enola Holmes graphic ---
    '9781524871321': '에놀라 홈즈 그래픽노블. 그림과 추리를 함께 즐기며 챕터 분량 읽기로 넘어가기 좋습니다.',

    # --- George Brown Class Clown ---
    '9780448482859': 'George Brown 시리즈. 트림 마법에 걸린 장난꾸러기 이야기로 유머 챕터북을 좋아하는 아이에게 맞습니다.',
    '9780448482835': 'George Brown 시리즈. 엉뚱한 학교 에피소드로 가볍게 읽는 유머 챕터북입니다.',
    '9780448482842': 'George Brown 시리즈. 유머와 반전이 있는 에피소드로 시리즈 읽기 재미를 줍니다.',

    # --- Emily Windsnap ---
    '9780763660208': 'Emily Windsnap 인어 판타지 시리즈 1권. 바다 모험을 좋아하는 아이가 챕터북 장편에 빠져들기 좋습니다.',
    '9781536213126': 'Emily Windsnap 인어 판타지 시리즈. 해적 왕자 이야기로 시리즈 모험을 이어갑니다.',

    # --- Heroes in Training (myth chapter) ---
    '9781481488341': 'Heroes in Training 시리즈. 그리스 신화 영웅들의 모험으로 신화 입문과 영어 읽기를 함께 잡습니다.',
    '9781534432918': 'Heroes in Training 시리즈. 헤라클레스와 히드라 이야기로 신화 모험을 즐깁니다.',

    # --- Hank Zipzer ---
    '9780448431628': 'Hank Zipzer 시리즈 1권. 난독증 소년의 학교 이야기로 공감과 유머가 살아있는 챕터북입니다.',
    '9780448431635': 'Hank Zipzer 시리즈. 학교 일상의 유머로 본격 챕터북 읽기에 좋습니다.',
    '9780448431932': 'Hank Zipzer 시리즈. 좌충우돌 학교 에피소드로 시리즈 읽기 흐름을 이어갑니다.',
    '9780448433523': 'Hank Zipzer 시리즈. 현장학습 에피소드로 또래 공감 이야기를 즐깁니다.',
    '9780448433530': 'Hank Zipzer 시리즈. 유머러스한 학교 이야기로 중급 원서 읽기를 다집니다.',
    '9780448437491': 'Hank Zipzer 시리즈. 탁구 챔피언 이야기로 시리즈 읽기 재미를 더합니다.',
    '9780448438788': 'Hank Zipzer 시리즈. 핼러윈 에피소드로 계절 소재 챕터북을 즐깁니다.',
    '9780448443805': 'Hank Zipzer 시리즈. 가족 여행 모험으로 시리즈 후반을 이어갑니다.',
    '9780448437392': 'Hank Zipzer 시리즈. 여름학교 에피소드로 또래 공감 유머를 즐깁니다.',
    '9780448443287': 'Hank Zipzer 시리즈. 차 안에서 벌어지는 소동 이야기로 유머 챕터북을 이어갑니다.',
    '9780448443744': 'Hank Zipzer 시리즈. 동생이 생긴 소동 이야기로 가족 소재 챕터북을 즐깁니다.',
    '9780448443768': 'Hank Zipzer 시리즈. 자기 인생을 그린 에피소드로 시리즈 읽기를 이어갑니다.',
    '9780448452104': 'Hank Zipzer 시리즈. 새로워진 주인공 이야기로 시리즈를 마무리하며 읽기 자신감을 키웁니다.',

    # --- Hot Shot (sports reader) ---
    '9780316044820': '스포츠 소재 챕터북. 짧은 분량과 빠른 전개로 운동을 좋아하는 아이가 읽기에 좋습니다.',

    # --- Geronimo Stilton Kingdom of Fantasy ---
    '9781338756920': '제로니모 스틸턴 판타지 왕국 시리즈. 화려한 일러스트와 모험으로 두꺼운 원서에 도전하기 좋습니다.',

    # --- Gossamer / Old Yeller (Lois Lowry / classic) ---
    '9780385734165': '뉴베리 작가 로이스 로리의 판타지. 꿈을 만드는 존재를 그린 따뜻한 이야기입니다.',
    '9780064403825': 'Old Yeller. 소년과 개의 우정을 그린 미국 고전으로 본격 원서 소설 읽기에 좋습니다.',
    '9780060935474': 'Old Yeller(클래식 판). 소년과 개의 우정을 그린 미국 고전 소설입니다.',

    # --- Masterminds / Mr. Terupt / My Weird School Fast Facts ---
    '9780062300065': '고든 코먼의 Masterminds 시리즈. 비밀과 반전이 있는 모험으로 장편 원서 읽기에 빠져들기 좋습니다.',
    '9780449818282': 'Mr. Terupt 시리즈. 여러 아이의 시점으로 전하는 감동 이야기로 중급 원서 읽기에 좋습니다.',
    '9780062673060': 'My Weird School Fast Facts 논픽션. 흥미로운 사실을 유머와 함께 풀어 논픽션 읽기에 좋습니다.',
    '9780062673091': 'My Weird School Fast Facts 논픽션. 공룡 이야기를 재미있게 풀어 논픽션 읽기에 흥미를 붙입니다.',
    '9780062673121': 'My Weird School Fast Facts 논픽션. 미라와 신화 이야기로 호기심을 자극하는 논픽션입니다.',
    '9780062306234': 'My Weird School Fast Facts 논픽션. 탐험가와 대통령 이야기로 배경지식을 영어로 넓힙니다.',

    # --- Now & Ben (nonfiction picture) ---
    '9780312535698': '벤자민 프랭클린의 발명을 그린 논픽션 그림책. 과학과 역사를 영어로 함께 만납니다.',

    # --- My Teacher Books ---
    '9781416903314': 'My Teacher 시리즈. 엉뚱한 SF 설정의 학교 이야기로 유머 장편 읽기에 좋습니다.',

    # --- National Geographic Kids Readers ---
    '9781426313523': '내셔널지오그래픽 키즈 리더 3단계. 안네 프랑크 이야기를 사진과 함께 풀어 논픽션 읽기에 좋습니다.',
    '9781426307577': '내셔널지오그래픽 키즈 리더 3단계. 위험한 동물들을 사진과 함께 다뤄 논픽션 흥미를 끕니다.',
    '9781426313448': '내셔널지오그래픽 키즈 리더 3단계. 로봇 주제를 사진과 함께 풀어 과학 논픽션 읽기에 좋습니다.',

    # --- Pax (Sara Pennypacker) ---
    '9780062930361': '사라 페니패커의 Pax 2권. 소년과 여우의 재회를 그린 감동 장편으로 깊이 있는 원서 읽기에 좋습니다.',
    '9780062377029': '사라 페니패커의 Pax. 소년과 여우의 우정을 그린 감동 장편 소설입니다.',

    # --- My Father's Dragon / Nevermoor / Paul Bunyan ---
    '9780440421214': 'My Father\'s Dragon. 용을 구하러 떠나는 모험을 그린 고전 동화로 첫 장편 원서로 사랑받습니다.',
    '9780316508896': 'Nevermoor 판타지 시리즈 1권. 마법 세계의 모험으로 두꺼운 판타지 원서에 도전하기 좋습니다.',
    '9780688058005': 'Paul Bunyan. 미국 민담을 화려한 그림으로 풀어낸 그림책으로 문화 배경지식을 넓힙니다.',
}


def main():
    o = json.load(open(SRC, encoding='utf-8'))
    missing = [k for k in o if k not in WHY]
    if missing:
        print('WARNING missing why for', len(missing))
        for k in missing:
            print('   ', k, o[k]['title'])
        return
    out = {}
    for isbn, v in o.items():
        v2 = {k: val for k, val in v.items() if k != '_src'}
        v2['why'] = WHY[isbn]
        out[isbn] = v2
    json.dump(out, open(OUT, 'w'), ensure_ascii=False, indent=1)
    print(f'wrote {len(out)} with why, dropped _src')
    # sanity: every why non-empty, no _src
    assert all(v['why'] for v in out.values())
    assert all('_src' not in v for v in out.values())
    print('all why populated, _src removed')


if __name__ == '__main__':
    main()
