#!/usr/bin/env python3
"""Round-10 why 작성: /tmp/wb10_enriched.json. 한국 부모·아이 관점, 슬롭 금지. 성숙 드롭 없음.
Run from repo root: python3 scripts/wendybook_bands_round10_why.py
"""
import json

CKPT = '/tmp/wb10_enriched.json'

WHY = {
    # ── Band 0 ──────────────────────────────────────────────────────────
    '9780064442114': 'Nola Buck의 My First I Can Read Sid and Sam. 짧은 라임 이름과 반복 문장으로 파닉스 첫걸음에 좋다.',
    '9780312681975': 'My Readers 1단계 Carl and the Kitten. 말 없는 개 Carl이 새끼 고양이를 돌보는 이야기로 그림 읽기와 돌봄 어휘를 익힌다.',
    '9781426315121': 'National Geographic Kids 프리리더 Go Cub! 실제 동물 사진과 한두 단어로 동물·동작 어휘를 익히는 첫 논픽션.',
    '9781426321252': 'NatGeo Kids 프리리더 Hoot, Owl! 올빼미 사진과 의성어로 동물 소리 어휘를 익힌다.',
    '9781426317392': 'NatGeo Kids 프리리더 Hop, Bunny! 토끼의 움직임을 사진과 동사로 담아 동작 어휘를 익힌다.',
    '9781426315084': 'NatGeo Kids 프리리더 Jump, Pup! 강아지 사진과 명령형 한 단어로 동작·동물 어휘를 익힌다.',
    '9781426324369': 'NatGeo Kids 프리리더 Peek, Otter. 수달 사진과 짧은 단어로 자연·동물 어휘를 익힌다.',
    '9781426324093': 'NatGeo Kids 프리리더 Play, Kitty! 고양이 사진과 동사로 놀이·동물 어휘를 익힌다.',
    '9781426319594': 'NatGeo Kids 프리리더 Sleep, Bear! 곰의 겨울잠을 사진으로 담아 계절·동물 어휘를 익힌다.',
    '9781426324130': 'NatGeo Kids 프리리더 Trot, Pony! 조랑말 사진과 동작 단어로 동물 어휘를 익힌다.',
    '9780425288566': 'Gianna Marino의 Night Animals. 밤이 무서운 동물들의 반전 유머로 두려움·동물 어휘를 익힌다.',
    '9780451469540': 'Night Animals. 어둠 속 동물들의 익살스러운 소동으로 감정·동물 어휘를 익힌다.',
    '9780618755035': 'Olivier Dunrea의 Gossie & Friends Ollie. 알에서 나오기를 거부하는 새끼 거위 이야기로 인내·감정 어휘를 익힌다.',
    '9780618755042': 'Gossie & Friends Ollie the Stomper. 씩씩한 새끼 거위의 일상으로 자립·동작 어휘를 익힌다.',
    '9780141309057': 'Puffin Young Readers 2단계 Scat, Cats! 고양이를 쫓는 반복 구조로 명령·동물 어휘를 익힌다.',
    '9780448411279': 'Penguin Young Readers 2단계 Who Stole the Cookies? 쿠키 도둑을 찾는 노래 형식으로 리듬·추리 어휘를 익힌다.',
    '9780448478128': 'Penguin Young Readers 1단계 Clara and Clem Under the Sea. 바다 모험을 짧은 문장으로 담아 해양·상상 어휘를 익힌다.',
    '9780448461588': 'Penguin Young Readers 1단계 Max Has a Fish. short-a 라임 패턴으로 파닉스 직후 단계에 맞다.',

    # ── Band 1 ──────────────────────────────────────────────────────────
    '9780618747931': 'Olivier Dunrea의 Gossie & Gertie. 두 새끼 거위의 우정을 짧은 문장으로 담아 우정·동작 어휘를 익힌다.',
    '9780618747917': 'Gossie & Friends 시리즈의 주인공 Gossie. 빨간 장화를 좋아하는 새끼 거위 이야기로 일상·소유 어휘를 익힌다.',
    '9780544313637': 'Green Light Readers 1단계 BooBoo. 먹보 새끼 거위의 짧은 이야기로 음식·일상 어휘를 익힌다.',
    '9780544430617': 'Green Light Readers 1단계 Gideon & Otto. 잃어버린 인형을 찾는 이야기로 위치·감정 어휘를 익힌다.',
    '9780544528017': 'Green Light Readers 1단계 I Can Help! 서로 돕는 동물들의 반복 구조로 협동·동작 어휘를 익힌다.',
    '9780544503816': 'Green Light Readers 1단계 Jasper & Joop. 정반대 두 친구의 이야기로 성격·우정 어휘를 익힌다.',
    '9780544553941': 'Green Light Readers 1단계 Merry Christmas, Ollie. 크리스마스를 맞은 새끼 거위 이야기로 계절·행사 어휘를 익힌다.',
    '9780544959026': 'Green Light Readers 1단계 Woof and Quack in Winter. 겨울을 나는 두 친구 이야기로 계절·우정 어휘를 익힌다.',
    '9780152048457': 'Green Light Readers 2단계 Daniel\'s Mystery Egg. 알에서 무엇이 나올지 추측하는 이야기로 예측·동물 어휘를 익힌다.',
    '9780152048419': 'Green Light Readers 2단계 Farmer\'s Market. 시장 나들이를 통해 음식·셈 어휘를 익힌다.',
    '9780152048334': 'Green Light Readers 2단계 Get That Pest! 농장의 불청객을 쫓는 이야기로 동물·문제해결 어휘를 익힌다.',
    '9780694012237': 'Biscuit 시리즈 Happy Easter, Biscuit! 이스터를 맞은 강아지 이야기로 계절·행사 어휘를 익힌다.',
    '9780694012213': 'Happy Thanksgiving, Biscuit. 추수감사절 에피소드로 감사·가족 어휘를 익힌다.',
    '9780689716119': 'Mem Fox의 Hattie and the Fox. 위험을 알리는 암탉과 무심한 동물들의 누적 반복 구조로 동물·긴장 어휘를 익힌다.',

    # ── Band 2 ──────────────────────────────────────────────────────────
    '9780593616673': 'Neil Sharpson의 Don\'t Trust Fish. 물고기를 의심하라는 엉뚱한 논픽션 패러디로 유머·동물 어휘를 익힌다.',
    '9780593615997': 'Abby Hanlon의 Dory Fantasmagory 6권. 상상력 풍부한 막내 Dory의 이야기로 상상·가족 어휘를 익힌다.',
    '9780394800387': 'Dr. Seuss Beginner Fox in Socks. 빠른 혀 꼬임 라임으로 발음 연습에 최고인 텅트위스터 그림책.',
    '9780394839127': 'Dr. Seuss Beginner I Can Read with My Eyes Shut! 읽기의 즐거움을 라임으로 노래해 읽기 동기를 끌어올린다.',
    '9780394800523': 'Berenstain Beginner The Bears\' Vacation. 휴가 중 안전 수칙을 유머로 담아 인과·자연 어휘를 익힌다.',
    '9780394800516': 'P.D. Eastman의 The Best Nest. 둥지를 찾는 새 부부의 소동으로 집·가족 어휘를 익힌다.',
    '9780448431109': 'Kate McMullan의 Dragon Slayers\' Academy 3권. 용 잡는 학교의 좌충우돌로 판타지·유머 어휘를 익힌다.',
    '9780525428886': 'Adam Rubin의 Dragons Love Tacos 2. 타코를 좋아하는 용들의 시간여행 소동으로 음식·유머 어휘를 익힌다.',
    '9780593649749': 'Kaz Windness의 Earl & Worm. 지렁이와 친구들의 짧은 만화로 우정·유머 어휘를 익힌다.',
    '9781368116961': 'Mo Willems의 Edwina. 멸종한 줄 모르는 공룡 Edwina의 따뜻한 이야기로 공동체·증거 어휘를 익힌다.',
    '9781419712173': 'Cece Bell의 뉴베리 아너 El Deafo. 청각장애 작가의 자전적 그래픽노블로 다양성·자기수용 어휘를 담았다.',
    '9781416926887': 'Peter Catalanotto의 Emily\'s Art. 미술 대회를 둘러싼 감정을 담아 예술·공정 어휘를 익힌다.',
    '9780374314286': 'Dashka Slater의 Escargot. 프랑스 달팽이의 능청스러운 독백으로 음식·자존감 어휘를 익힌다.',
    '9781984816269': 'Michael Rex의 Facts vs. Opinions vs. Robots. 사실과 의견을 구분하는 법을 로봇으로 담아 비판적 사고 어휘를 익힌다.',

    # ── Band 3 ──────────────────────────────────────────────────────────
    '9780142427477': 'David A. Adler의 Cam Jansen 32권 백만장자 미스터리. 사진 기억력 탐정의 추리로 관찰·논리 어휘를 익힌다.',
    '9780307265104': 'Ron Roy의 Capital Mysteries 1권. 대통령 복제를 둘러싼 워싱턴 미스터리로 사회·추리 어휘를 익힌다.',
    '9780316307505': 'Drew Brockington의 CatStronauts 2권 Race to Mars. 우주 고양이들의 화성 경주로 과학·협동 어휘를 익힌다.',
    '9780062499615': 'Kimberly Derting의 Cece Loves Science. 과학을 좋아하는 소녀의 실험 이야기로 STEM·탐구 어휘를 익힌다.',
    '9781442496774': 'Doreen Cronin의 Chicken Squad 1권. 병아리 탐정단의 첫 사건으로 추리·유머 어휘를 익힌다.',
    '9781442496804': 'Chicken Squad 2권 파란 닭 사건. 추론·동물 어휘를 이어 익힌다.',
    '9780395479421': 'Virginia Lee Burton의 Choo Choo. 폭주하는 기관차 이야기를 흑백 그림으로 담아 교통·인과 어휘를 익힌다.',
    '9780064434874': 'Laura Ingalls Wilder의 Little House 그림책 Christmas in the Big Woods. 개척 시대 크리스마스로 역사·가족 어휘를 익힌다.',
    '9780698114197': 'Jane Yolen의 Commander Toad and the Space Pirates. 두꺼비 선장의 우주 SF 패러디로 상상·모험 어휘를 익힌다.',
    '9780064405713': 'Jane Leslie Conly의 뉴베리 아너 Crazy Lady! 어려운 이웃을 돕는 소년의 성장으로 공감·책임 어휘를 담았다. 다소 무거워 고학년에게.',
    '9781250091666': 'Katherine Applegate의 Crenshaw. 가난을 겪는 소년과 상상 친구 고양이의 이야기로 가족·희망 어휘를 따뜻하게 담았다.',
    '9780140501728': 'Taro Yashima의 칼데콧 아너 Crow Boy. 외톨이 소년의 재능을 알아보는 이야기로 다양성·존중 어휘를 익힌다.',
    '9780544651647': 'Curious George Discovers the Stars. 호기심 원숭이로 별과 우주를 익히는 Science Storybook.',
    '9780062232984': 'Doreen Cronin의 Diary of a Fly. 파리의 일기로 곤충 생태와 유머 어휘를 익힌다.',

    # ── Band 4 ──────────────────────────────────────────────────────────
    '9781338680638': 'Maddy Mara의 Dragon Girls 1권. 소녀가 드래곤으로 변신하는 판타지 시리즈의 시작. 상상·자연 어휘를 익힌다.',
    '9781338680645': 'Dragon Girls 2권. 은빛 드래곤 모험으로 우정·판타지 어휘를 이어 익힌다.',
    '9781338680652': 'Dragon Girls 3권. 무지개 드래곤 이야기로 색깔·상상 어휘를 익힌다.',
    '9781338680669': 'Dragon Girls 4권. 루비 보물 드래곤 모험으로 판타지·용기 어휘를 익힌다.',
    '9781338680676': 'Dragon Girls 5권. 사파이어 드래곤 이야기로 우정·모험 어휘를 익힌다.',
    '9781338680683': 'Dragon Girls 6권. 진주 드래곤 모험으로 협동·판타지 어휘를 익힌다.',
    '9781338846607': 'Dragon Girls 8권. 달빛 드래곤 이야기로 상상·자연 어휘를 익힌다.',
    '9781338846614': 'Dragon Girls 9권. 별빛 드래곤 모험으로 판타지 어휘를 이어 익힌다.',
    '9781338875492': 'Dragon Girls 11권. 바다 드래곤 이야기로 해양·상상 어휘를 익힌다.',
    '9781338875508': 'Dragon Girls 12권. 석호 드래곤 모험으로 자연·판타지 어휘를 익힌다.',
    '9781339019888': 'Dragon Girls 13권. 천둥 드래곤 이야기로 날씨·용기 어휘를 익힌다.',
    '9781546121947': 'Dragon Girls 스페셜 1권. 마법 드래곤 모험으로 판타지 어휘를 심화한다.',
    '9781338776973': 'Tracey West의 Dragon Masters 24권. 드래곤을 다루는 소년들의 모험으로 판타지·협동 어휘를 익힌다.',
    '9781339022499': 'Dragon Masters 30권. 혼돈의 드래곤 이야기로 판타지·용기 어휘를 이어 익힌다.',

    # ── Band 5 ──────────────────────────────────────────────────────────
    '9781368080842': 'Rick Riordan의 Daughter of the Deep. 해저 학교를 배경으로 한 SF 모험으로 과학·바다 어휘를 담았다.',
    '9781250010230': 'Jack Gantos의 뉴베리 수상작 Dead End in Norvelt. 실제 마을을 배경으로 한 역사 코미디 미스터리로 역사·유머 어휘를 담았다.',
    '9780439825979': 'Jim Benton의 Dear Dumb Diary 8권. 중학생 Jamie의 솔직한 일기로 또래·유머 어휘를 익힌다.',
    '9780545116121': 'Dear Dumb Diary 9권. 우정의 복잡함을 일기로 담아 관계·감정 어휘를 익힌다.',
    '9781484732786': 'Rick Riordan의 Demigods & Magicians. 퍼시 잭슨과 케인 가문의 크로스오버 모험으로 신화·판타지 어휘를 익힌다.',
    '9780316068703': 'Dewey the Library Cat 어린이판. 도서관 고양이의 실화로 공동체·동물 어휘를 따뜻하게 담았다.',
    '9780375800665': 'Dick King-Smith의 A Mouse Called Wolf. 노래하는 생쥐와 피아니스트의 우정으로 음악·우정 어휘를 익힌다.',
    '9780439114943': 'Barbara Kerley의 칼데콧 아너 The Dinosaurs of Waterhouse Hawkins. 공룡 모형을 만든 실존 인물 논픽션으로 과학·역사 어휘를 익힌다.',
    '9780061229572': 'Wendy Lichtman의 Do the Math: Secrets, Lies, and Algebra. 수학으로 사건을 푸는 소녀 이야기로 수·논리 어휘를 익힌다.',
    '9780316487481': 'James Patterson의 Dog Diaries 1권. 개의 시선으로 본 중학교 이야기를 만화로 담아 유머·반려 어휘를 익힌다.',
    '9780316456180': 'Dog Diaries 2권 Happy Howlidays. 시즌 에피소드로 가족·반려 어휘를 익힌다.',
    '9780316494472': 'Dog Diaries 3권 Mission Impawsible. 개의 모험을 유머로 담아 읽기 동기를 높인다.',
    '9780316430074': 'Dog Diaries 4권 Curse of the Mystery Mutt. 미스터리 소재로 추론·반려 어휘를 익힌다.',
    '9780316500210': 'Dog Diaries 5권 Ruffing It. 캠핑 에피소드로 자연·유머 어휘를 익힌다.',
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
