#!/usr/bin/env python3
"""Round-8 why 작성: /tmp/wb8_enriched.json 에 why 채우기.
한국 부모·아이 관점 구체적 설명. 슬롭·보일러플레이트 금지. 이번 라운드 성숙 드롭 없음.
Run from repo root: python3 scripts/wendybook_bands_round8_why.py
"""
import json

CKPT = '/tmp/wb8_enriched.json'

WHY = {
    # ── Band 0 ──────────────────────────────────────────────────────────
    '9780823438532': 'I Like to Read D단계 Pizza Mouse. 피자를 좋아하는 쥐 이야기를 짧은 문장으로 담아 음식·일상 어휘를 익힌다.',
    '9780823434558': 'I Like to Read D단계 Snow Joke. 눈 오는 날 유머를 짧은 문장으로 담아 계절·농담 어휘를 익힌다.',
    '9780823434459': 'I Like to Read E단계 A Night at the Zoo. 밤의 동물원을 상상한 이야기로 동물·시간 어휘를 익힌다.',
    '9780823439683': 'I Like to Read E단계 Dance, Dance, Dance! 춤추는 동물들의 반복 구조로 동작·리듬 어휘를 익힌다.',
    '9780823435418': 'I Like to Read E단계 Drew the Screw. long 모음 라임으로 파닉스 심화에 좋은 리더.',
    '9780823433971': 'I Like to Read E단계 Look Out, Mouse! 쥐의 아슬아슬한 하루를 짧은 문장으로 담아 위치·경고 표현을 익힌다.',
    '9780823431830': 'I Like to Read E단계 Pete Won\'t Eat. 안 먹겠다는 아이와의 실랑이로 음식·고집 어휘를 유머로 담았다.',
    '9780823430604': 'I Like to Read E단계 Sam and the Big Kids. 형 누나들과 어울리고 싶은 마음을 짧은 문장으로 담았다.',
    '9780823433964': 'I Like to Read E단계 The End of the Rainbow. 무지개 끝을 찾아가는 이야기로 색깔·탐색 어휘를 익힌다.',
    '9780823426416': 'I Like to Read E단계 The Lion and the Mice. 이솝우화를 쉬운 문장으로 재구성해 협동·은혜 어휘를 익힌다.',
    '9780823438440': 'I Like to Read F단계 A Hippo in Our Yard. 마당에 하마가 나타난 상상 이야기로 크기·동물 어휘를 익힌다.',
    '9780823433148': 'I Like to Read G단계 3, 2, 1, Go! 경주 이야기를 통해 숫자·속도 어휘를 담은 상급 리더.',
    '9780394811420': 'Dr. Seuss Bright & Early Inside Outside Upside Down. 위치·방향 어휘를 라임으로 반복해 공간 개념을 익힌다.',
    '9781416985822': 'Jan Thomas의 Is That Wise, Pig? 돼지의 엉뚱한 수프 만들기로 셈·유머 어휘를 익힌다.',
    '9780553112542': 'Grace Lin의 Kite Flying. 가족이 함께 연을 만들어 날리는 이야기로 가족·과정 어휘를 담았다.',
    '9780553507706': 'Cynthia Rylant의 Little Penguins. 다섯 펭귄의 겨울 외출을 반복 구조로 담아 계절·옷 어휘를 익힌다.',
    '9781481439749': 'Maggie and Wendel 그래픽 입문서 Imagine Everything! 상상 놀이를 만화로 담아 창의·우정 어휘를 익힌다.',
    '9781416989981': 'Tammi Sauer의 Making a Friend. 친구 사귀기의 마음을 따뜻한 그림과 짧은 문장으로 담았다.',

    # ── Band 1 ──────────────────────────────────────────────────────────
    '9781484726464': 'Elephant & Piggie Like Reading! The Good for Nothing Button. 단순한 버튼 하나로 감정 소동을 일으켜 감정 표현 어휘를 익힌다.',
    '9781368005647': 'Elephant & Piggie Like Reading! The Itchy Book! 가려움을 참는 공룡들의 유머로 인내·신체 어휘를 익힌다.',
    '9781368045735': 'Elephant & Piggie Like Reading! What About Worms!? 두려움을 뒤집는 반전 유머로 감정·동물 어휘를 익힌다.',
    '9781423174912': 'Elephant & Piggie A Big Guy Took My Ball! 큰 친구와의 오해와 화해로 공정·감정 어휘를 익힌다.',
    '9781423133094': 'Elephant & Piggie I Broke My Trunk! 과장된 사연을 늘어놓는 코끼리의 유머로 서사·신체 어휘를 익힌다.',
    '9781484722626': 'Elephant & Piggie I Really Like Slop! 친구 음식을 먹어보는 용기 이야기로 우정·맛 표현을 익힌다.',
    '9781484716304': 'Elephant & Piggie I Will Take a Nap! 낮잠 소동을 통해 잠·상상 어휘를 유쾌하게 담았다.',
    '9781423164821': 'Elephant & Piggie Let\'s Go for a Drive! 드라이브 준비물을 챙기는 과정으로 계획·사물 어휘를 익힌다.',
    '9781423179580': 'Elephant & Piggie My New Friend Is So Fun! 새 친구를 둘러싼 질투와 안심을 통해 우정 어휘를 익힌다.',
    '9781423178286': 'Elephant & Piggie The Thank You Book. 시리즈 마지막 권으로 감사 표현을 반복하며 인사 어휘를 익힌다.',
    '9781423113485': 'Elephant & Piggie Watch Me Throw the Ball! 자랑과 좌절을 짧은 대화로 담아 감정 표현을 익힌다.',
    '9781250004734': 'Dan Yaccarino의 Every Friday. 아빠와 매주 금요일 아침을 함께하는 이야기로 가족·요일 어휘를 따뜻하게 담았다.',
    '9781984849021': 'Mike Boldt의 Find Fergus. 숨은그림찾기 형식의 인터랙티브 그림책으로 관찰·위치 어휘를 익힌다.',
    '9780544488007': 'Five Little Monkeys 시리즈 침대에서 책 읽기. 반복 라임 후렴으로 숫자·취침 어휘를 노래하듯 익힌다.',

    # ── Band 2 ──────────────────────────────────────────────────────────
    '9781452172637': 'Laurel Snyder의 Charlie & Mouse 1권. 두 형제의 일상을 짧은 챕터로 담아 가족·놀이 어휘를 익힌다.',
    '9781452183428': 'Charlie & Mouse 3권. 시리즈 일관된 따뜻함으로 형제·일상 어휘를 이어 익힌다.',
    '9780448446974': 'Lauren Child의 Charlie and Lola: But I Am an Alligator. 떼쟁이 여동생 Lola의 고집을 유머로 담아 감정·설득 어휘를 익힌다.',
    '9780448453286': 'Charlie and Lola: I Am Going to Save a Panda! 환경 보호를 어린이 시선으로 담아 자연·실천 어휘를 익힌다.',
    '9780545823357': 'Clifford Goes to Kindergarten. 유치원 첫날을 친숙한 강아지로 담아 학교 적응 어휘를 익힌다.',
    '9780590442947': 'Clifford The Small Red Puppy. 거대한 빨강 강아지의 작았던 시절 이야기로 성장·크기 어휘를 익힌다.',
    '9780545215930': 'Clifford\'s Day With Dad. 아빠와의 하루를 통해 가족·일상 어휘를 익힌다.',
    '9780689717697': 'Pat Hutchins의 Clocks and More Clocks. 여러 시계가 다른 시간을 가리키는 소동으로 시간·논리 어휘를 익힌다.',
    '9780593529171': 'Bob McKinnon의 Cookie & Broccoli 만화. 학교 갈 준비를 둘러싼 친구 이야기로 일상·감정 어휘를 익힌다.',
    '9781423160656': 'Mac Barnett의 Count the Monkeys. 원숭이를 세려다 방해받는 인터랙티브 그림책으로 숫자·동물 어휘를 익힌다.',
    '9780395150238': 'H.A. Rey의 Curious George 원작. 호기심 많은 원숭이의 첫 모험으로 탐구·도시 어휘를 익히는 고전.',
    '9780358168775': 'Curious George and the Firefighters. 소방서 견학 소동을 통해 직업·안전 어휘를 익힌다.',
    '9780547691183': 'Curious George 얼리리더 1단계 Home Run. 야구를 소재로 스포츠·동작 어휘를 쉽게 익힌다.',
    '9780618605644': 'Curious George\'s First Day of School. 학교 첫날 소동으로 교실·규칙 어휘를 친근하게 익힌다.',

    # ── Band 3 ──────────────────────────────────────────────────────────
    '9780375812804': 'Andrew Lost 4권 In the Garden. 작아진 채 정원을 탐험하며 식물·곤충 어휘를 익힌다.',
    '9780375825231': 'Andrew Lost 5권 Under Water. 물속 미세 세계 탐험으로 수중 생태 어휘를 담았다.',
    '9780140502770': 'James Daugherty의 칼데콧 수상작 Andy and the Lion. 가시를 빼준 사자와의 우정으로 은혜·용기 어휘를 익힌다.',
    '9781524875848': 'Animal Rescue Friends 2권. 동물 보호소 봉사 이야기를 만화로 담아 돌봄·우정 어휘를 익힌다.',
    '9781770499324': '빨간 머리 앤 챕터북 2권. 클래식을 초등 수준으로 재구성해 Anne의 우정과 감정 표현을 익힌다.',
    '9780316115476': 'Marc Brown의 Arthur 챕터북 1권. 사라진 숙제 봉투를 둘러싼 미스터리로 학교·추리 어휘를 익힌다.',
    '9780316115537': 'Arthur 챕터북 4권. 시리얼 대회 에피소드로 일상·경쟁 어휘를 담았다.',
    '9780316112918': 'Arthur Meets the President. 대통령을 만나는 견학 이야기로 사회·시민 어휘를 익힌다.',
    '9781338776676': 'Baby-Sitters Little Sister 10권. Karen과 할머니들 이야기로 가족·세대 어휘를 익힌다.',
    '9781338776591': 'Baby-Sitters Little Sister 6권. 의붓동생을 맞는 이야기로 가족 변화·감정 어휘를 담았다.',
    '9781250762702': 'Nick Bruel의 Bad Kitty Joins the Team. 스포츠팀에 들어간 고양이 소동으로 협동·운동 어휘를 유머로 익힌다.',
    '9781368019019': 'Mo Willems·Amber Ren의 Because. 한 곡의 음악이 부른 우연들을 통해 인과·예술 어휘를 시적으로 담았다.',
    '9781536214352': 'Kate DiCamillo의 뉴베리 아너 Because of Winn-Dixie. 떠돌이 개와 외로운 소녀의 우정으로 상실·치유 어휘를 따뜻하게 담았다.',
    '9780062283580': 'Lincoln Peirce의 Big Nate 소설 2권. 6학년 Nate의 학교 소동으로 유머·일상 어휘를 익힌다.',

    # ── Band 4 ──────────────────────────────────────────────────────────
    '9781665936620': 'Ursula K. Le Guin의 Catwings 2권. 날개 달린 고양이들의 모험을 서정적 문장으로 담아 상상·자연 어휘를 익힌다.',
    '9780064430876': 'Barbara Cooney의 칼데콧 수상작 Chanticleer and the Fox. 초서 우화를 그림책으로 옮겨 허영·지혜 어휘를 익힌다.',
    '9781534405721': 'Doreen Cronin의 Chicken Squad 5권. 병아리 탐정단의 미스터리로 추리·유머 어휘를 익힌다.',
    '9781534405752': 'Chicken Squad 6권 Bear Country. 곰을 둘러싼 소동으로 추론·동물 어휘를 이어 익힌다.',
    '9780763669317': 'Chitty Chitty Bang Bang 3권. 하늘을 나는 자동차의 모험으로 상상·기계 어휘를 담았다.',
    '9780763676667': 'Chitty Chitty Bang Bang 4권. 시리즈 모험을 이어가며 서사·탐험 어휘를 심화한다.',
    '9781536244397': 'Patrick Ness의 Chronicles of a Lizard Nobody. 도마뱀 주인공의 학교 만화로 유머·또래 어휘를 익힌다.',
    '9780688162955': 'Ellen Jackson의 Cinder Edna. 신데렐라를 자립적 소녀로 비튼 패러디로 자존감·문제해결 어휘를 익힌다.',
    '9781454948018': 'Classic Starts Peter Pan. 원작을 초등 수준으로 재구성해 네버랜드 모험을 부담 없이 만난다.',
    '9781454945390': 'Classic Starts The Secret Garden. 비밀의 화원 고전을 쉬운 문장으로 옮겨 치유·성장 어휘를 익힌다.',
    '9780786838851': 'Sara Pennypacker의 Clementine 3권. 엉뚱한 3학년 소녀의 편지 에피소드로 감정·표현 어휘를 익힌다.',
    '9781423115601': 'Clementine 4권 Friend of the Week. 우정과 책임을 다루며 또래·감정 어휘를 담았다.',
    '9781423124375': 'Clementine 6권 Spring Trip. 현장학습 이야기로 학교·협동 어휘를 익힌다.',
    '9781423124382': 'Clementine 7권 Completely Clementine. 시리즈 마무리로 성장·가족 어휘를 따뜻하게 담았다.',

    # ── Band 5 ──────────────────────────────────────────────────────────
    '9780142422977': 'Jacqueline West의 Books of Elsewhere 5권. 그림 속 세계 판타지 시리즈 완결로 상상·미스터리 어휘를 심화한다.',
    '9780375822742': 'Jeanne DuPrau의 The City of Ember 1권. 빛이 꺼져가는 지하 도시를 탈출하는 디스토피아로 문제해결·과학 어휘를 담았다. 고학년 SF 입문에 좋다.',
    '9780307929594': 'Gary Paulsen의 Brian\'s Hunt. Hatchet 후속으로 야생 생존 어휘를 강렬한 문장으로 담았다.',
    '9780307929600': 'Brian\'s Return. Hatchet 시리즈로 자연·자아 성찰 어휘를 이어 익힌다.',
    '9780142421949': 'John Flanagan의 Brotherband 1권. 바이킹 소년들의 항해 모험으로 협동·전략 어휘를 담았다. 모험을 좋아하는 고학년에게.',
    '9780142426630': 'Brotherband 2권 The Invaders. 시리즈 모험을 이어가며 항해·전략 어휘를 심화한다.',
    '9780147515827': 'Jacqueline Woodson의 뉴베리 아너 Brown Girl Dreaming. 시로 쓴 성장 회고록으로 정체성·역사 어휘를 서정적으로 담았다.',
    '9780440413288': 'Christopher Paul Curtis의 뉴베리 수상작 Bud, Not Buddy. 대공황기 고아 소년의 여정으로 역사·가족 어휘를 풍부하게 담았다.',
    '9780316286121': 'Sid Fleischman의 By the Great Horn Spoon. 골드러시 시대 모험을 유머로 담아 역사·모험 어휘를 익힌다.',
    '9780763673789': 'Martin Jenkins의 Can We Save the Tiger? 멸종위기 동물을 다룬 논픽션으로 생태·보전 어휘를 익힌다.',
    '9780385740074': 'Adeline Yen Mah의 Chinese Cinderella. 사랑받지 못한 중국 소녀의 자전적 이야기로 가족·인내 어휘를 담았다. 다소 무거워 감수성 높은 고학년에게.',
    '9780375868276': 'Carl Hiaasen의 Chomp. 플로리다 늪을 배경으로 한 환경 모험 코미디로 자연·유머 어휘를 익힌다.',
    '9780064409407': 'C.S. Lewis의 나니아 연대기 3권 The Horse and His Boy. 말과 소년의 탈출 모험으로 판타지·여정 어휘를 익힌다.',
    '9780064409445': '나니아 연대기 4권 Prince Caspian. 나니아 왕국의 부활을 그린 판타지로 서사·용기 어휘를 심화한다.',
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
