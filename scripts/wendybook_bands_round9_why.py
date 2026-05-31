#!/usr/bin/env python3
"""Round-9 why 작성: /tmp/wb9_enriched.json. 한국 부모·아이 관점, 슬롭 금지. 성숙 드롭 없음.
Run from repo root: python3 scripts/wendybook_bands_round9_why.py
"""
import json

CKPT = '/tmp/wb9_enriched.json'

WHY = {
    # ── Band 0 ──────────────────────────────────────────────────────────
    '9780060560454': 'Byron Barton의 My Car. 운전사 Sam이 자기 차를 소개하는 단순 반복 문장으로 탈것·일상 어휘를 익힌다.',
    '9780060589400': 'Byron Barton의 My Car. 큼직한 그림과 짧은 문장으로 자동차 부품·교통 어휘를 첫 리더 단계에서 익힌다.',
    '9780062455444': 'My Car 영–스페인어 이중언어판. 탈것 어휘를 두 언어로 비교하며 익히는 입문 리더.',
    '9780063373471': 'My First I Can Read Big Dog and Little Dog. 반의어 중심 짧은 문장으로 파닉스 직후 단계에 맞다.',
    '9780064443159': 'Biscuit 시리즈 Wants to Play. 강아지 Biscuit의 놀이 이야기를 의성어와 짧은 대화로 담아 첫 리더에 좋다.',
    '9780062237002': 'Biscuit Flies a Kite. 연날리기 에피소드로 바람·놀이 어휘를 반복 구조로 익힌다.',
    '9780064436168': 'Biscuit Goes to School. 학교 구경 이야기로 교실·규칙 어휘를 친근하게 익힌다.',
    '9780061177491': 'Biscuit Meets the Class Pet. 반려동물 만남을 통해 동물·인사 어휘를 익힌다.',
    '9780061177460': 'Biscuit Takes a Walk. 산책 이야기로 장소·동작 어휘를 반복 학습한다.',
    '9780060094614': 'Biscuit and the Baby. 아기를 만난 강아지 이야기로 가족·돌봄 어휘를 익힌다.',
    '9780060741723': 'Biscuit and the Little Pup. 작은 강아지와의 우정을 짧은 문장으로 담았다.',
    '9780061935046': 'Biscuit in the Garden. 정원 탐험으로 식물·자연 어휘를 익히는 첫 리더.',
    '9780060741693': 'Biscuit\'s Day at the Farm. 농장 나들이로 동물·장소 어휘를 반복 구조로 익힌다.',
    '9780062398710': 'My First I Can Read Fox Is Late. 늦은 여우 이야기를 짧은 문장으로 담아 시간·동작 어휘를 익힌다.',
    '9780064442732': 'How Many Fish? 물고기를 세는 반복 구조로 숫자·위치 어휘를 익히는 입문 리더.',
    '9780060835637': 'Mercer Mayer의 Little Critter Just Helping My Dad. 아빠 돕기 일상으로 가족·동작 어휘를 익힌다.',
    '9780064442138': 'Crosby Bonsall의 Mine\'s the Best. 누구 풍선이 최고인지 다투는 두 아이로 비교·감정 어휘를 익힌다.',
    '9780063343726': 'Olivier Dunrea의 Gossie & Friends Ollie the Stomper. 씩씩한 새끼 거위 이야기로 자립·감정 어휘를 익힌다.',

    # ── Band 1 ──────────────────────────────────────────────────────────
    '9780140547528': 'David McPhail의 Fix-It. 고장 난 TV 대신 책 읽기의 즐거움을 발견하는 곰 이야기로 일상·해결 어휘를 익힌다.',
    '9780439639064': 'Tedd Arnold의 Fly Guy 4권. 파리를 삼킨 할머니 노래를 패러디해 운율·유머 어휘를 익힌다.',
    '9780545007245': 'Fly Guy 6권 Hooray for Fly Guy! 풋볼 경기 에피소드로 스포츠·응원 어휘를 익힌다.',
    '9780545312844': 'Fly Guy 12권 수프 속 소동. 음식·유머 어휘를 짧은 문장으로 담았다.',
    '9780545493284': 'Fly Guy 13권 Frankenfly. 핼러윈 분위기 에피소드로 상상·계절 어휘를 익힌다.',
    '9781338549218': 'Fly Guy & Fly Girl Night Fright. 두 캐릭터의 밤 모험으로 두려움·우정 어휘를 익힌다.',
    '9780142403426': 'Jonathan London의 Froggy\'s Baby Sister. 동생을 맞은 개구리의 마음을 의성어로 담아 가족·감정 어휘를 익힌다.',
    '9780544966352': 'Giggle Gang My Toothbrush Is Missing. 칫솔 찾기 소동으로 위생·위치 어휘를 익히는 리더.',
    '9780544941656': 'Giggle Gang There\'s a Pest in the Garden! 정원의 불청객을 둘러싼 짧은 이야기로 자연·문제해결 어휘를 익힌다.',
    '9780553533910': 'Charise Mericle Harper의 Go! Go! Go! Stop! 멈춤과 출발 신호를 통해 반대말·교통 어휘를 익힌다.',
    '9780679886297': 'P.D. Eastman의 Go, Dog. Go! 탈것과 색깔, 반복 구문으로 영어 첫 리더의 고전. 운율로 읽는 재미가 크다.',
    '9781484712757': 'Greg Pizzoli의 Good Night Owl. 잠 못 드는 올빼미의 소리 찾기로 의성어·취침 어휘를 익힌다.',
    '9781627794169': 'Kenard Pak의 Goodbye Autumn, Hello Winter. 계절 전환을 자연과의 대화로 담아 계절·자연 어휘를 서정적으로 익힌다.',
    '9780062286208': 'Jory John의 Goodnight Already! 자려는 곰과 놀자는 오리의 대비로 감정·취침 어휘를 유머로 익힌다.',

    # ── Band 2 ──────────────────────────────────────────────────────────
    '9780399169137': 'Micha Archer의 Daniel Finds a Poem. 공원 동물들에게 시가 무엇인지 묻는 이야기로 자연·표현 어휘를 익힌다.',
    '9780062422507': 'Amy Krouse Rosenthal의 Dear Girl. 딸에게 보내는 응원 편지 형식으로 자존감·격려 어휘를 담았다.',
    '9781338877663': 'Diary of a Pug 12권. 겁 많은 퍼그 Baron의 일기 만화로 감정·반려 어휘를 익힌다.',
    '9781546139188': 'Diary of a Pug 13권 Super Pug. 슈퍼히어로 상상 에피소드로 용기·유머 어휘를 익힌다.',
    '9781338530094': 'Diary of a Pug 3권. 봉사 에피소드로 협동·반려 어휘를 담았다.',
    '9781338530124': 'Diary of a Pug 4권. 장기자랑 이야기로 자신감·표현 어휘를 익힌다.',
    '9781338713503': 'Diary of a Pug 7권 Road Trip. 여행 에피소드로 장소·가족 어휘를 익힌다.',
    '9781338713534': 'Diary of a Pug 8권 New Puppy. 새 강아지를 맞는 이야기로 가족·감정 어휘를 담았다.',
    '9780060001551': 'Doreen Cronin의 Diary of a Spider. 거미의 일기로 곤충 생태와 유머 어휘를 익히는 인기작.',
    '9780547076690': 'Jackie French의 Diary of a Wombat. 웜뱃의 무던한 일상을 일기로 담아 호주 동물·유머 어휘를 익힌다.',
    '9780679856177': 'Jonah Winter의 Diego (영–스페인어). 화가 디에고 리베라의 어린 시절을 이중언어로 담아 예술·인물 어휘를 익힌다.',
    '9780316406352': 'Chris Gall의 Dinotrux 2권. 공룡과 트럭을 합친 상상 생물 이야기로 기계·동물 어휘를 익힌다.',
    '9780545533768': 'Scholastic Discover More 1단계 Things That Go! 탈것을 소개하는 논픽션으로 교통·과학 어휘를 익힌다.',
    '9780593175699': 'Tom Booth의 Don\'t Blink! 눈 깜빡이면 지는 게임 형식의 인터랙티브 그림책으로 명령·놀이 어휘를 익힌다.',

    # ── Band 3 ──────────────────────────────────────────────────────────
    '9780679803706': 'Stepping Stone Classics의 Black Beauty. 말의 시선으로 본 고전을 초등 수준으로 옮겨 연민·동물 어휘를 익힌다.',
    '9780618636877': 'David Macaulay의 칼데콧 수상작 Black and White. 네 갈래 이야기를 한 면에 엮은 실험적 그림책으로 비판적 읽기를 키운다.',
    '9780807508527': 'Boxcar Children 1권. 네 남매의 자립 미스터리로 협동·생활 어휘를 담은 클래식 시리즈의 시작.',
    '9780142400104': 'David A. Adler의 Cam Jansen 1권. 사진 기억력 소녀 탐정의 추리로 관찰·논리 어휘를 익힌다.',
    '9780142400111': 'Cam Jansen 2권 UFO 미스터리. 추론·과학 어휘를 흥미롭게 담았다.',
    '9780142400128': 'Cam Jansen 3권 공룡 뼈 미스터리. 박물관 배경 추리로 관찰·과학 어휘를 익힌다.',
    '9780142400135': 'Cam Jansen 4권 텔레비전 개 미스터리. 추론·일상 어휘를 이어 익힌다.',
    '9780142400142': 'Cam Jansen 5권 금화 미스터리. 단서를 모으는 구조로 논리 어휘를 익힌다.',
    '9780142400173': 'Cam Jansen 8권 괴물 영화 미스터리. 추리·상상 어휘를 담았다.',
    '9780142402115': 'Cam Jansen 14권 초콜릿 퍼지 미스터리. 시리즈 일관된 추론 구조로 읽기 자신감을 키운다.',
    '9780142403549': 'Cam Jansen 20권 생일 미스터리. 일상 속 추리로 관찰·기억 어휘를 익힌다.',
    '9780142403266': 'Cam Jansen 22권 개학 첫날 미스터리. 학교 배경 추리로 또래·논리 어휘를 담았다.',
    '9780142414569': 'Cam Jansen 28권 Green School 미스터리. 환경을 소재로 추론 어휘를 익힌다.',
    '9780142419588': 'Cam Jansen 30권 웨딩 케이크 미스터리. 시리즈 후반 추리로 논리 어휘를 심화한다.',

    # ── Band 4 ──────────────────────────────────────────────────────────
    '9780689839290': 'Cloudy with a Chance of Meatballs 2권 Pickles to Pittsburgh. 음식이 내리는 마을 상상 이야기로 날씨·음식 어휘를 익힌다.',
    '9780698118942': 'Jan Brett의 Comet\'s Nine Lives. 아홉 목숨 고양이의 모험을 세밀한 그림으로 담아 숫자·바다 어휘를 익힌다.',
    '9780544651630': 'Curious George Discovers Plants. 호기심 원숭이로 식물 과학을 익히는 Science Storybook.',
    '9780395174449': 'H.A. Rey의 Curious George Rides a Bike. 자전거를 탄 조지의 소동으로 균형·동작 어휘를 익히는 고전.',
    '9780380709588': 'Beverly Cleary의 뉴베리 수상작 Dear Mr. Henshaw. 작가에게 편지를 쓰는 소년의 성장으로 글쓰기·감정 어휘를 풍부하게 담았다.',
    '9780689812897': 'Alma Flor Ada의 Dear Peter Rabbit. 동화 캐릭터들이 주고받는 편지 형식으로 명작·편지 어휘를 익힌다.',
    '9780142402191': 'Anthony Horowitz의 Diamond Brothers The Falcon\'s Malteser. 탐정 패러디 미스터리로 추리·유머 어휘를 익힌다.',
    '9780448453507': 'Frankly, Frannie Doggy Day Care. 직업을 꿈꾸는 소녀의 좌충우돌로 진로·일상 어휘를 익힌다.',
    '9781442411906': 'Rachel Renée Russell의 Dork Diaries 3권. 중학교 일기 형식의 만화 소설로 또래·감정 어휘를 익힌다.',
    '9781442411920': 'Dork Diaries 4권. 아이스스케이팅 에피소드로 도전·또래 어휘를 담았다.',
    '9781481479202': 'Dork Diaries 11권. 프레너미를 둘러싼 학교 이야기로 관계·감정 어휘를 익힌다.',
    '9781534426382': 'Dork Diaries 13권. 생일 에피소드로 우정·감정 어휘를 이어 익힌다.',
    '9781534405608': 'Dork Diaries 12권. 짝사랑 소동으로 또래 감정 어휘를 유머로 담았다.',
    '9781338875485': 'Maddy Mara의 Dragon Girls 10권. 소녀가 드래곤으로 변신하는 판타지로 상상·자연 어휘를 익힌다.',

    # ── Band 5 ──────────────────────────────────────────────────────────
    '9780064471091': 'C.S. Lewis의 나니아 연대기 6권 The Silver Chair. 지하 세계 구출 모험으로 판타지·용기 어휘를 심화한다.',
    '9780689814747': 'Cinderella 그림책판. 익숙한 명작을 영어로 만나 서사·감정 어휘를 익힌다.',
    '9781534414921': 'James Ponti의 City Spies 1권. 십대 스파이 팀의 첩보 모험으로 협동·추리 어휘를 담았다.',
    '9781665911580': 'City Spies 4권 City of the Dead. 시리즈 모험을 이어가며 추리·전략 어휘를 심화한다.',
    '9780593323380': 'Lisa McMann의 Clarice the Brave. 형제 생쥐의 바다 모험으로 용기·생존 어휘를 담았다.',
    '9781402745737': 'Classic Starts Arabian Nights. 천일야화를 초등 수준으로 옮겨 이야기·문화 어휘를 익힌다.',
    '9781454945338': 'Classic Starts The Swiss Family Robinson. 무인도 생존 고전을 쉬운 문장으로 담아 모험·자연 어휘를 익힌다.',
    '9781454950981': 'Classic Starts The War of the Worlds. SF 고전을 초등 수준으로 옮겨 상상·과학 어휘를 익힌다.',
    '9781402736964': 'Classic Starts The Wind in the Willows. 강가 동물들의 고전을 쉬운 문장으로 담아 우정·자연 어휘를 익힌다.',
    '9780060092740': 'Lynne Rae Perkins의 뉴베리 수상작 Criss Cross. 여름날 십대들의 잔잔한 성장 이야기로 감정·관계 어휘를 담았다. 감수성 높은 고학년에게.',
    '9780385742313': 'Gary Paulsen의 Crush. 첫 짝사랑을 과학 실험처럼 분석하는 소년의 유머로 감정·표현 어휘를 익힌다.',
    '9780679854289': 'Noel Streatfeild의 Dancing Shoes. 춤을 둘러싼 자매 이야기로 예술·성장 어휘를 풍부하게 담았다.',
    '9781665932912': 'Susan Cooper의 Dark Is Rising 1권 Over Sea, Under Stone. 아서왕 전설 기반 판타지로 신화·모험 어휘를 담았다.',
    '9781665932936': 'Dark Is Rising 3권 Greenwitch. 켈트 신화 기반 판타지로 서사·상징 어휘를 심화한다.',
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
    print(f'why: {len(objs)-len(missing)}/{len(objs)}, 누락 {len(missing)}')
    for isbn in missing:
        print(f'  누락: {isbn} | {objs[isbn]["title"]}')


if __name__ == '__main__':
    main()
