#!/usr/bin/env python3
"""Round-7 why 작성 + 성숙 콘텐츠 1권(American Born Chinese, Printz YA) 드롭.
한국 부모·아이 관점 구체적 설명. 슬롭·보일러플레이트 금지.
Run from repo root: python3 scripts/wendybook_bands_round7_why.py
"""
import json

CKPT = '/tmp/wb7_enriched.json'
DROP = {'9781250811899'}  # American Born Chinese (Printz=YA, 인종 캐리커처 풍자)

WHY = {
    # ── Band 0 ──────────────────────────────────────────────────────────
    '9780547850610': 'Green Light Readers 1단계 Time for Bed. 취침 루틴 어휘를 짧은 문장으로 익히는 입문 리더.',
    '9780152048464': 'Green Light Readers 1단계 What Day Is It?. 요일 어휘를 반복 구조로 익히는 첫 리더.',
    '9780152064167': 'Green Light Readers 2단계 A Butterfly Grows. 나비의 성장 과정을 짧은 논픽션으로 담아 생명·변화 어휘를 익힌다.',
    '9780152048341': 'Green Light Readers 2단계 Why the Frog Has Big Eyes. 유래담 형식으로 동물 특징 어휘를 재미있게 익힌다.',
    '9780064430753': 'Edward Marshall의 Hooray for Snail! 달팽이의 야구 이야기를 큼직한 글씨로 담아 첫 리더에 좋다.',
    '9780063076662': 'I Can Read Comics 1단계 Fish and Wave. 거의 글 없는 만화로 그림 읽기와 첫 영어 읽기를 동시에 시작한다.',
    '9780064440462': 'I Can Read 1단계 And I Mean It, Stanley. 혼잣말 형식의 짧은 이야기로 명령·강조 표현을 익힌다.',
    '9781534466685': 'Heidi McKinnon의 I Just Ate My Friend. 친구를 삼킨 괴물의 반전 유머로 우정·후회 어휘를 익힌다.',
    '9780823432981': 'I Like to Read C단계 Bad Dog. 말썽 강아지 이야기를 짧은 문장으로 담아 파닉스 직후 단계에 맞다.',
    '9780823434541': 'I Like to Read C단계 Animals Work. 동물의 일을 소개하는 논픽션 리더로 직업·동물 어휘를 익힌다.',
    '9780823439904': 'I Like to Read C단계 Cat Got a Lot. 라임을 활용한 짧은 문장으로 파닉스 감각을 키운다.',
    '9780823439881': 'I Like to Read C단계 Little Ducks Go. 새끼 오리들의 나들이를 반복 구조로 담은 입문 리더.',
    '9780823434305': 'I Like to Read C단계 Lost Dog. 잃어버린 강아지를 찾는 이야기로 위치·동작 어휘를 익힌다.',
    '9780823431793': 'I Like to Read C단계 Me Too!. 따라 하고 싶은 동생의 마음을 짧은 대화로 담았다.',
    '9780823439416': 'I Like to Read D단계 Can You Find Pup?. 숨은 강아지 찾기 구조로 의문문·위치 어휘를 익힌다.',
    '9780823431823': 'I Like to Read D단계 Fireman Fred. 소방관의 하루를 담아 직업·도구 어휘를 익히는 리더.',
    '9780823427550': 'I Like to Read D단계 Late Nate in a Race. 라임 이름과 경주 이야기로 파닉스와 속도 어휘를 익힌다.',
    '9780823435432': 'I Like to Read D단계 Nate Likes to Skate. long-a 라임 패턴을 반복해 파닉스 심화에 좋다.',

    # ── Band 1 ──────────────────────────────────────────────────────────
    '9781492633198': 'Bill Cotter의 Don\'t Touch This Book! 만지지 말라면서 만지게 만드는 인터랙티브 그림책으로 명령·신체 어휘를 몸으로 익힌다.',
    '9781492648048': 'Don\'t Touch This Book! 작은 판형. 책과 상호작용하며 지시문·감정 표현을 즐겁게 익힌다.',
    '9780394800233': 'Dr. Seuss Beginner A Fish Out of Water. 물고기에게 너무 많이 먹인 소동을 라임으로 담아 인과·동물 어휘를 익힌다.',
    '9780375822971': 'Dr. Seuss Beginner Big Dog Little Dog (P.D. Eastman). 반의어 중심 반복 문장으로 파닉스 직후 단계에 맞다.',
    '9780394800134': 'Dr. Seuss의 대표작 One Fish Two Fish. 숫자·색깔·운율을 한데 담아 영어 리듬 감각을 길러 주는 첫 리더 고전.',
    '9780394800417': 'Berenstain 부부의 Beginner The Bears\' Picnic. 소풍 소동을 라임으로 담아 가족·자연 어휘를 익힌다.',
    '9780394800363': 'Berenstain Beginner The Bike Lesson. 자전거 타기를 가르치는 아빠 곰 이야기로 인과·동작 어휘를 유머로 담았다.',
    '9780394800271': 'P.D. Eastman의 Beginner Snow. 눈 오는 날의 놀이를 짧은 문장으로 담아 계절·놀이 어휘를 익힌다.',
    '9781250291097': 'Bruce Hale의 Duck, Duck, Dad?. 거위 아빠와 새끼들의 짧은 만화로 가족·정체성 어휘를 익힌다.',
    '9781619637245': 'Salina Yoon의 Duck, Duck, Porcupine! 말 없는 동생과 수다쟁이 형의 대화로 의사소통·우정 어휘를 익힌다.',
    '9781491483251': 'Smithsonian 리더 Earth. 지구를 소개하는 짧은 논픽션으로 과학·우주 어휘를 처음 접한다.',
    '9781368027168': 'Elephant & Piggie Like Reading! Harold & Hog. 두 친구가 E&P를 흉내 내는 메타 유머로 우정·연기 어휘를 익힌다.',
    '9781484726471': 'Elephant & Piggie Like Reading! It\'s Shoe Time! 짝 안 맞는 신발 고르기로 선택·색깔 어휘를 유쾌하게 담았다.',
    '9781484726365': 'Elephant & Piggie Like Reading! The Cookie Fiasco. 쿠키 나누기를 통해 나눗셈·문제 해결 어휘를 자연스럽게 익힌다.',

    # ── Band 2 ──────────────────────────────────────────────────────────
    '9780062086969': 'Lincoln Peirce의 Big Nate 만화 Here Goes Nothing. 6학년 Nate의 학교 코미디로 유머·일상 어휘를 익힌다.',
    '9780062087003': 'Big Nate 컬러 만화 Mr. Popularity. 인기에 대한 좌충우돌로 또래·감정 어휘를 담았다.',
    '9780062086945': 'Big Nate 만화 What Could Possibly Go Wrong?. 시리즈 특유의 학교 유머로 자발적 읽기 동기를 높인다.',
    '9780698114272': 'Barbara Bottner의 Bootsie Barker Bites. 못된 친구에 맞서는 아이 이야기로 자기주장·감정 어휘를 익힌다.',
    '9780140566673': 'Rosemary Wells의 Bunny Cakes. 토끼 남매의 케이크 만들기로 요리·쪽지 쓰기 어휘를 익힌다.',
    '9780140567502': 'Rosemary Wells의 Bunny Money. 토끼 남매의 용돈 쓰기로 돈·셈 어휘를 자연스럽게 익히는 경제 그림책.',
    '9780593380062': 'Troy Cummings의 Can I Be Your Dog?. 입양처를 찾는 강아지의 편지 형식으로 편지·설득 어휘를 익힌다.',
    '9780763697822': 'Candlewick Sparks Rabbit and Robot and Ribbit. 친구 사이 질투를 짧은 챕터로 담아 우정·감정 어휘를 익힌다.',
    '9781536235623': 'Candlewick Sparks Bear and Bird 단편집. 곰과 새의 잔잔한 우정 이야기로 일상·감정 어휘를 담았다.',
    '9780763668754': 'Candlewick Sparks Rabbit and Robot The Sleepover. 계획대로 안 되는 하룻밤 이야기로 융통성·우정 어휘를 익힌다.',
    '9781338712766': 'Dav Pilkey의 Cat Kid Comic Club 1권. Dog Man 작가의 만화 창작 안내서로 아이의 글쓰기·그리기 동기를 끌어올린다.',
    '9781338896398': 'Cat Kid Comic Club 5권 Influencers. 만화 창작과 자기표현을 다뤄 창의·매체 어휘를 익힌다.',
    '9781524860943': 'Matthew Cody의 Cat Ninja. 평범한 고양이가 닌자가 되는 만화로 액션·유머 어휘를 가볍게 익힌다.',
    '9780316451260': 'Drew Brockington의 CatStronauts 5권. 우주를 탐험하는 고양이들의 만화로 과학·협동 어휘를 담았다.',

    # ── Band 3 (American Born Chinese 제외) ─────────────────────────────
    '9780142410493': 'Paula Danziger의 Amber Brown 4권. 학교 생활과 또래 갈등을 통해 성장·감정 어휘를 익힌다.',
    '9780142412015': 'Amber Brown 5권. 시리즈 후반 인물 변화로 감정·관계 어휘를 심화한다.',
    '9780142412619': 'Amber Brown 6권. 화가 난 마음을 다루며 감정 조절·표현 어휘를 담았다.',
    '9780142419656': 'Amber Brown 8권 I, Amber Brown. 자기 정체성을 고민하는 이야기로 자아·가족 어휘를 익힌다.',
    '9781442403765': 'Jimmy Gownley의 Amelia 만화 BFF. 단짝 관계의 고민을 만화로 담아 우정·감정 어휘를 익힌다.',
    '9781481486040': 'Ada Lace 3권. 외계인을 소재로 한 과학 미스터리로 STEM·추리 어휘를 이어 익힌다.',
    '9780375829505': 'Andrew Lost 10권 On Earth. 작아진 채 떠나는 과학 모험으로 자연·탐험 어휘를 익힌다.',
    '9780375829512': 'Andrew Lost 11권 With the Dinosaurs. 공룡 소재로 과학·시간 어휘를 흥미롭게 담았다.',
    '9780375835636': 'Andrew Lost 14권 With the Bats. 박쥐 동굴 모험으로 생태·과학 어휘를 익힌다.',
    '9780375835643': 'Andrew Lost 15권 In the Jungle. 정글 생태를 소재로 동식물 어휘를 담았다.',
    '9780375812774': 'Andrew Lost 1권 On the Dog. 미니로봇으로 작아진 남매의 첫 모험. SF·과학 어휘 입문에 좋다.',
    '9780375812781': 'Andrew Lost 2권 In the Bathroom. 일상 공간을 과학적으로 탐험하며 관찰·과학 어휘를 익힌다.',
    '9780375812798': 'Andrew Lost 3권 In the Kitchen. 부엌 속 미세 세계 탐험으로 과학·생활 어휘를 담았다.',

    # ── Band 4 ──────────────────────────────────────────────────────────
    '9780689841255': 'Qwerty Stevens 시리즈. 토머스 에디슨을 만나는 시간여행 이야기로 역사·과학 어휘를 담았다.',
    '9781250010162': 'Nick Bruel의 Bad Kitty for President. 고양이 선거 소동으로 민주주의·투표 어휘를 유머로 익힌다.',
    '9780385378758': 'David A. Kelly의 Ballpark Mysteries 10권. 야구장 미스터리로 스포츠·추리 어휘를 담았다.',
    '9780525578925': 'Ballpark Mysteries 슈퍼스페셜 3권 지하철 시리즈. 야구와 도시 어휘를 함께 익힌다.',
    '9780525578956': 'Ballpark Mysteries 슈퍼스페셜 4권 월드시리즈. 스포츠·추리 어휘를 심화한다.',
    '9780593323137': 'Lilliam Rivera의 Barely Floating. 싱크로나이즈드 수영을 꿈꾸는 소녀 이야기로 도전·자존감 어휘를 담았다.',
    '9780062445834': 'Elana K. Arnold의 A Boy Called Bat. 자폐 성향 소년과 새끼 스컹크의 이야기로 다양성·돌봄 어휘를 따뜻하게 담았다.',
    '9781250005601': 'Ruth White의 뉴베리 아너 Belle Prater\'s Boy. 사라진 엄마를 둔 사촌들의 우정으로 상실·치유 어휘를 담았다. 감수성 높은 고학년에게.',
    '9780307265173': 'Ron Roy의 Capital Mysteries 3권. 워싱턴 D.C. 배경 미스터리로 역사·지리 어휘를 흥미롭게 익힌다.',
    '9781442443310': 'Stan Kirby의 Captain Awesome 5권. 슈퍼히어로를 자처하는 소년의 축구 모험으로 상상·스포츠 어휘를 담았다.',
    '9781338864304': 'Dav Pilkey의 Captain Underpants 2권. 황당 슈퍼히어로 만화로 유머·읽기 동기를 끌어올린다.',
    '9781338864328': 'Captain Underpants 4권. 시리즈 특유의 화장실 유머로 자발적 읽기를 부른다.',
    '9781338864335': 'Captain Underpants 5권. 만화+소설 형식으로 부담 없이 완독하는 성취감을 준다.',
    '9780316451277': 'CatStronauts 6권 Digital Disaster. 우주 고양이들의 과학 모험으로 기술·협동 어휘를 담았다.',

    # ── Band 5 ──────────────────────────────────────────────────────────
    '9780316380621': 'Lemony Snicket의 All the Wrong Questions 4권. 특유의 비틀린 유머 미스터리로 추리·어휘 감각을 키운다.',
    '9780316393065': 'All the Wrong Questions 외전 13 Suspicious Incidents. 짧은 미스터리 모음으로 추론 연습에 좋다.',
    '9781416912880': 'Jimmy Gownley의 Amelia Bully Survival Guide. 괴롭힘에 대처하는 법을 만화로 담아 자기보호·감정 어휘를 익힌다.',
    '9781250034144': 'Michael Morpurgo의 An Elephant in the Garden. 2차대전 속 코끼리를 지킨 실화 기반 이야기로 역사·연민 어휘를 담았다.',
    '9781338681444': 'Animals to the Rescue 2권 Sergeant Reckless. 전쟁 영웅 군마의 실화 논픽션으로 역사·동물 어휘를 담았다.',
    '9780060774837': 'Angie Sage의 Araminta Spookie 1권. 유령 들린 집을 좋아하는 소녀의 유쾌한 판타지로 상상·공포 어휘를 가볍게 익힌다.',
    '9780679847595': 'Noel Streatfeild의 클래식 Ballet Shoes. 세 자매의 발레·연기 도전 이야기로 예술·성장 어휘를 풍부하게 담았다.',
    '9781250047755': 'Laura Overdeck의 Bedtime Math. 잠자리에서 푸는 수학 퀴즈 논픽션으로 수·논리 어휘를 친근하게 익힌다.',
    '9781416939078': 'Andrew Clements의 Benjamin Pratt 1권. 학교를 지키려는 아이들의 미스터리로 역사·협동 어휘를 담았다.',
    '9780545046510': 'Steve Jenkins의 Bones 논픽션. 동물 골격을 세밀화로 비교해 해부·과학 어휘를 익힌다.',
    '9781250308702': 'Jennifer Chambliss Bertman의 Book Scavenger 3권. 책 보물찾기 미스터리로 암호·독서 어휘를 담았다.',
    '9780142418727': 'Jacqueline West의 Books of Elsewhere 1권. 그림 속으로 들어가는 으스스한 판타지로 상상·미스터리 어휘를 익힌다.',
    '9780142421024': 'Books of Elsewhere 2권 Spellbound. 마법 그림집의 비밀을 좇으며 판타지 어휘를 심화한다.',
    '9780142425756': 'Books of Elsewhere 4권 The Strangers. 시리즈 후반 긴장감으로 서사·어휘를 이어 익힌다.',
}


def main():
    objs = json.load(open(CKPT, encoding='utf-8'))
    for isbn in list(objs):
        if isbn in DROP:
            del objs[isbn]
    missing = []
    for isbn, v in objs.items():
        why = WHY.get(isbn, '')
        if not why:
            missing.append(isbn)
        v['why'] = why
    json.dump(objs, open(CKPT, 'w'), ensure_ascii=False, indent=1)
    print(f'드롭 {len(DROP)} 적용 후 {len(objs)}권, why {len(objs)-len(missing)}/{len(objs)}, 누락 {len(missing)}')
    for isbn in missing:
        print(f'  누락: {isbn} | {objs[isbn]["title"]}')


if __name__ == '__main__':
    main()
