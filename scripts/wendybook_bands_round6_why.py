#!/usr/bin/env python3
"""Round-6 why 작성: /tmp/wb6_enriched.json 에 why 채우기.
한국 부모·아이 관점 구체적 설명. 슬롭·보일러플레이트 금지.
Run from repo root: python3 scripts/wendybook_bands_round6_why.py
"""
import json

CKPT = '/tmp/wb6_enriched.json'

WHY = {
    # ── Band 0 (AR 0.5~0.9) ─────────────────────────────────────────────
    '9781423102953': 'Elephant & Piggie 시리즈 1권. "Today I will fly!" 한 문장 반복으로 미래시제·감정 표현을 소리 내어 읽는다. 영어 첫 리더에 최적.',
    '9781423106876': 'Elephant & Piggie 파티 초대 에피소드. 옷차림 걱정을 주고받는 대화로 의문문·형용사 어휘를 자연스럽게 익힌다.',
    '9781423154044': 'Elephant & Piggie 트럼펫 에피소드. 의성어와 짧은 대화로 소리·감정 표현을 배운다. 두 캐릭터 역할극으로 읽기 좋다.',
    '9781423133087': 'Elephant & Piggie가 "책 속에 있다"는 메타픽션 설정. 아이가 직접 단어를 외치게 만들어 읽기 참여도를 끌어올린다.',
    '9780399256172': 'Tee Weninger의 Frog and Fly. 개구리와 파리의 짧은 여섯 이야기로 먹이사슬을 유머러스하게 담아 첫 리더 단계에 맞다.',
    '9780544966550': 'Jane O\'Connor의 Giggle Gang 리더. 친구가 나를 행복하게 한다는 주제를 큼직한 글씨·짧은 문장으로 담았다.',
    '9780544939073': 'Giggle Gang 시리즈. "무엇이 오리를 쫓고 있나?" 반복 의문문으로 추측·동물 어휘를 익힌다.',
    '9780394829135': 'Dr. Seuss의 Great Day for Up. up 한 단어를 변주한 라임으로 파닉스 첫걸음에 좋다. 경쾌한 리듬이 소리 내어 읽기를 부른다.',
    '9780152062439': 'Green Light Readers 1단계 영–스페인어 이중언어판 Daniel\'s Pet. 짧은 문장과 큰 그림으로 첫 리더에 적합하다.',
    '9780152062811': 'Green Light Readers 1단계 이중언어판. 요일 어휘를 반복 구조로 익히는 입문 리더.',
    '9780152065614': 'Green Light Readers 1단계 이중언어판 Big Pig, Little Pig. 크기 비교·반의어 어휘를 그림과 함께 담았다.',
    '9780547338989': 'Green Light Readers 1단계 Rabbit and Turtle Go to School. 등교 상황 어휘를 쉬운 문장으로 익힌다.',
    '9780544530959': 'Green Light Readers 1단계 Big Dog and Little Dog. 단순 대비 구조로 첫 리더의 자신감을 키운다.',
    '9780152048570': 'Green Light Readers 1단계 Big Pig and Little Pig. 짧은 반복 문장으로 파닉스 직후 단계에 맞다.',
    '9780152048655': 'Green Light Readers 1단계 Daniel\'s Pet. 애완동물 어휘를 큰 그림과 함께 익히는 입문 리더.',
    '9780544146716': 'Olivier Dunrea의 Gossie & Friends 리더 Ollie. 알에서 나오기 싫은 새끼 거위 이야기로 인내·감정 어휘를 담았다.',
    '9780152048617': 'Green Light Readers 1단계 Popcorn. 의성어와 반복 문장으로 소리 내어 읽기에 좋다.',
    '9780152048518': 'Green Light Readers 1단계 Rabbit and Turtle Go to School. 학교 어휘를 짧은 문장으로 익히는 첫 리더.',
    '9780152048532': 'Green Light Readers 1단계 The Big, Big Wall. 협동으로 문제를 푸는 이야기를 쉬운 문장으로 담았다.',
    '9780152056056': 'Green Light Readers 1단계 Tick Tock. 시계·시간 어휘를 반복 구조로 익히는 입문 리더.',

    # ── Band 1 (AR 1.0~1.9) ─────────────────────────────────────────────
    '9781423121909': 'John Rocco의 칼데콧 아너 Blackout. 정전된 밤 가족이 다시 모이는 이야기를 거의 글 없이 그림으로 풀어내 정서·관찰 어휘를 키운다.',
    '9780618755059': 'Olivier Dunrea의 Gossie & Friends 보드북 Booboo. 먹보 새끼 거위의 짧은 이야기로 음식·일상 어휘를 익힌다.',
    '9781338646825': 'Graphix Chapters의 Bunbun & Bonbon 1권. 사탕과 토끼의 만화 형식 이야기로 그림책에서 만화 챕터북으로 넘어가기 좋다.',
    '9781452141978': 'Claudia Rueda의 Bunny Slopes. 책을 기울이고 흔드는 인터랙티브 그림책으로 방향·동작 어휘를 몸으로 익힌다.',
    '9781554534609': 'Mélanie Watt의 Chester. 작가와 고양이가 펜을 두고 다투는 메타픽션으로 유머와 창의적 읽기를 동시에 준다.',
    '9780316015486': 'Peter Brown의 Children Make Terrible Pets. 곰이 남자아이를 애완동물로 키우는 역발상 이야기로 책임·돌봄 어휘를 익힌다.',
    '9781442496736': 'Doreen Cronin의 Click, Clack 크리스마스 에피소드. 의성어와 농장 동물로 시즌 어휘를 유쾌하게 담았다.',
    '9780545215787': 'Norman Bridwell의 Clifford the Big Red Dog 원작. 거대한 빨강 강아지의 따뜻한 이야기로 크기·우정 어휘를 익힌다.',
    '9781338850062': 'Clifford 이스터 에피소드. 봄·계절 행사 어휘를 친숙한 캐릭터로 담아 시즌 읽기에 좋다.',
    '9780698114357': 'Cindy Ward·Tomie dePaola의 Cookie\'s Week. 새끼 고양이의 요일별 사고뭉치 이야기로 요일 어휘를 반복 학습한다.',
    '9780593354865': 'Counting to Bananas. 라임을 활용한 과일·숫자 그림책으로 수 세기와 운율 감각을 함께 키운다.',
    '9780316126564': 'Samantha Berger의 Crankenstein. 짜증 난 아이를 괴물에 빗댄 유머 그림책으로 감정 표현 어휘를 익힌다.',
    '9780544430570': 'Curious George 얼리리더 1단계 체조 에피소드. 친숙한 원숭이 캐릭터로 운동·동작 어휘를 쉽게 접한다.',
    '9780547242996': 'Curious George 얼리리더 1단계 당근 에피소드. 짧은 문장과 익숙한 캐릭터로 첫 리더 자신감을 키운다.',
    '9781454952770': 'Mo Willems의 비둘기 시리즈 크리스마스판. "썰매 운전 좀 하게 해줘" 협상 패턴이 아이를 폭소케 하며 설득·거절 표현을 익힌다.',

    # ── Band 2 (AR 2.0~2.9) ─────────────────────────────────────────────
    '9780020430902': 'Marjorie Flack의 클래식 Ask Mr. Bear. 엄마 선물을 찾아 동물들에게 묻는 반복 구조로 의문문과 동물 어휘를 익힌다.',
    '9780531292785': 'Rookie Read-About Geography 시리즈 호주 편. 실제 사진과 짧은 문장으로 지리·문화 어휘를 처음 접하는 논픽션.',
    '9781338762952': 'Baby-Sitters Little Sister 3권. Karen의 최악의 하루를 일상 어휘로 담아 또래 공감과 감정 표현을 익힌다.',
    '9781338315196': 'Baby-Sitters Little Sister 그래픽노블 1권. 만화 형식으로 부담 없이 읽으며 상상·또래 어휘를 접한다.',
    '9780307931610': 'Babymouse 18권 생일 에피소드. 흑백+분홍 만화로 상상력 넘치는 생쥐의 일상을 담아 자발적 읽기를 부른다.',
    '9780307931627': 'Babymouse 19권 베이비시터 에피소드. 시리즈 특유의 공상 장면으로 유머와 어휘를 함께 익힌다.',
    '9780307931634': 'Babymouse 20권 올림픽 에피소드. 스포츠·경쟁 어휘를 만화로 가볍게 담았다.',
    '9781250835840': 'Nick Bruel의 Bad Kitty 베이비시터 에피소드. 시리즈 특유의 블랙 유머로 아이들이 자발적으로 완독한다.',
    '9781416902720': 'Karma Wilson의 Bear Snores On. 라임과 반복 후렴으로 동면·계절 어휘를 노래하듯 익히는 인기 그림책.',
    '9780763688905': 'Bonny Becker의 Bear and Mouse 취침 에피소드. 까칠한 곰과 다정한 쥐의 대화로 잠자리 루틴 어휘를 익힌다.',
    '9780310720867': 'Berenstain Bears: Show Some Respect. 존중이라는 가치를 곰 가족 일상으로 풀어내 인성·태도 어휘를 담았다.',
    '9781449402327': 'Lincoln Peirce의 Big Nate 컬러 만화. 6학년 말썽쟁이 Nate의 학교 생활로 유머와 일상 어휘를 익힌다.',
    '9780062086983': 'Big Nate 만화 Genius Mode. 시리즈 특유의 학교 코미디로 자발적 읽기 동기를 높인다.',

    # ── Band 3 (AR 3.0~3.9) ─────────────────────────────────────────────
    '9780142417188': 'Gennifer Choldenko의 알카트라즈 시리즈 2권. 1930년대 교도소 섬 배경 미스터리로 역사·가족 어휘를 심화한다.',
    '9781101938164': '알카트라즈 시리즈 4권. 시리즈 연속 읽기로 역사적 배경과 추리 어휘를 이어 익힌다.',
    '9780689711732': 'Judith Viorst의 클래식 Alexander 시리즈. 최악의 하루를 늘어놓는 반복 구조로 감정 표현·일상 어휘를 익힌다.',
    '9780399555510': 'Leo Lionni의 칼데콧 아너 Alexander and the Wind-Up Mouse. 진짜 쥐와 장난감 쥐의 우정으로 정체성·우정 주제를 담았다.',
    '9780375866418': 'Stepping Stone Classics의 이상한 나라의 앨리스. 원작을 초등 수준으로 재구성해 고전을 부담 없이 만난다.',
    '9780375873690': 'Lenore Look의 Alvin Ho 시리즈. 겁 많은 아시아계 미국 소년의 학교 적응기로 다양성·감정 어휘를 담았다.',
    '9780375849305': 'Alvin Ho 1권. 모든 게 무서운 소년의 좌충우돌로 두려움·용기 어휘를 유머로 풀어낸다.',
    '9780142406199': 'Paula Danziger의 Amber Brown 1권. 단짝의 이사를 겪는 소녀 이야기로 우정·이별 감정을 또래 눈높이로 담았다.',
    '9780142406298': 'Amber Brown 2권. 수두에 걸린 일상을 유머로 담아 건강·또래 어휘를 익힌다.',
    '9780142409015': 'Amber Brown 3권. 4학년 진급 이야기로 성장·학교 어휘를 친근하게 담았다.',
    '9780142427576': 'Amber Brown 10권. 시리즈 후반으로 인물 변화와 감정 어휘를 심화한다.',
    '9780147512239': 'Amber Brown 11권. 이사 에피소드로 변화 적응·가족 어휘를 담았다.',
    '9780147515520': 'Amber Brown 12권. 승마 에피소드로 새로운 도전·취미 어휘를 익힌다.',

    # ── Band 4 (AR 4.0~4.9) ─────────────────────────────────────────────
    '9780062370914': 'Nate Ball의 Alien in My Pocket 8권. 주머니 외계인과의 학교 모험으로 SF·과학 어휘를 가볍게 익힌다.',
    '9781442483699': 'Jimmy Gownley의 Amelia 시리즈. 지루함을 이겨내는 소녀의 아이디어를 만화 형식으로 담아 창의·일상 어휘를 익힌다.',
    '9781481485982': 'Ada Lace 1권. 과학을 좋아하는 소녀 탐정의 코딩·관찰 미스터리로 STEM 어휘를 자연스럽게 담았다.',
    '9781481486019': 'Ada Lace 2권. 색맹을 소재로 한 관찰 미스터리로 과학·우정 어휘를 이어 익힌다.',
    '9780544336681': 'Lois Lowry의 Anastasia Krupnik 1권. 10살 소녀의 솔직한 일상과 가족 이야기로 감정·성장 어휘를 풍부하게 담았다.',
    '9780544439597': 'Anastasia 시리즈 속편. 시리즈 특유의 유머로 사춘기 초입의 감정 어휘를 담았다.',
    '9780375835650': 'Andrew Lost 16권. 작아진 채 떠나는 모험 SF 시리즈로 과학·탐험 어휘를 익힌다.',
    '9780375829499': 'Andrew Lost 9권. 시간 여행 소재로 과학·시간 어휘를 흥미롭게 담았다.',
    '9781454941804': 'Dusti Bowling의 Aven Green 1권. 팔 없이 태어난 소녀 탐정의 추리로 다양성·관찰 어휘를 유쾌하게 담았다.',
    '9781454941811': 'Aven Green 2권. 요리 미스터리로 추론·일상 어휘를 이어 익힌다.',
    '9781454941828': 'Aven Green 3권. 음악 소재 미스터리로 관찰·추리 어휘를 심화한다.',
    '9781454941835': 'Aven Green 4권. 축구 미스터리로 스포츠·추리 어휘를 담았다.',
    '9780375856037': 'David A. Kelly의 Ballpark Mysteries 외전. 야구 역사 베이브 루스 일화로 스포츠·역사 어휘를 담았다.',

    # ── Band 5 (AR 5.0~5.9) ─────────────────────────────────────────────
    '9780142302378': 'Brian Jacques의 Redwall 1권. 생쥐 수도원을 지키는 동물 대서사 판타지로 풍부한 묘사 어휘를 경험한다. 읽기 체력이 붙은 고학년에게.',
    '9781368014748': 'Rick Riordan Presents의 Dragon Pearl. 한국 신화 기반 우주 판타지로 다양성·모험 어휘를 담아 한국 아이에게 특히 친근하다.',
    '9781368042406': 'Kwame Mbalia의 Tristan Strong 2권. 서아프리카 신화 기반 판타지로 신화·용기 어휘를 심화한다.',
    '9781338840483': 'A True Book 논픽션 타이타닉 편. 실제 사진·도해로 역사·공학 어휘를 익히는 탐구형 읽기.',
    '9781599905181': 'Dr. Cuthbert Soup의 A Whole Nother Story. 능청스러운 화자의 유머 모험으로 서사·유머 어휘를 즐긴다.',
    '9781536222975': 'Christina Soontornvat의 뉴베리 아너 A Wish in the Dark. 태국 배경 빛과 정의의 판타지로 사회·도덕 어휘를 담았다.',
    '9781416997252': 'Andrew Clements의 About Average. 평범함을 고민하는 소녀의 학교 이야기로 자존감·또래 어휘를 잔잔하게 담았다.',
    '9780147515636': 'Jonathan W. Stokes의 Addison Cooke 1권. 잉카 보물을 쫓는 모험으로 역사·지리 어휘를 흥미롭게 담았다.',
    '9780147515643': 'Addison Cooke 2권. 칸의 무덤을 쫓는 모험으로 역사·탐험 어휘를 이어 익힌다.',
    '9780147515650': 'Addison Cooke 3권. 시리즈 마무리 모험으로 지리·추리 어휘를 심화한다.',
    '9780545722872': 'Jordan Sonnenblick의 After Ever After. 소아암을 이겨낸 소년의 중학 적응기로 회복·우정 어휘를 따뜻하게 담았다. 감수성 높은 고학년에게.',
    '9780316335478': 'Lemony Snicket의 All the Wrong Questions 1권. 특유의 비틀린 유머 미스터리로 추리·어휘 감각을 키운다.',
    '9780316380607': 'All the Wrong Questions 3권. 시리즈 일관된 분위기로 추리·서사 어휘를 이어 익힌다.',
}


def main():
    objs = json.load(open(CKPT, encoding='utf-8'))
    missing = []
    for isbn, v in objs.items():
        why = WHY.get(isbn, '')
        if not why:
            missing.append(isbn)
        v['why'] = why
    json.dump(objs, open(CKPT, 'w'), ensure_ascii=False, indent=1)
    print(f'why 작성: {len(objs) - len(missing)}/{len(objs)}, 누락 {len(missing)}')
    for isbn in missing:
        print(f'  누락: {isbn} | {objs[isbn]["title"]}')


if __name__ == '__main__':
    main()
