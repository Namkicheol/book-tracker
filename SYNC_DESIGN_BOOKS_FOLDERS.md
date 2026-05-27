# 백로그 C — books / folders Supabase 동기화 설계 메모

> 코드 작성 전 합의해야 할 4가지 결정사항과 권장안. 합의 후 마이그레이션 SQL · `sync.js` 변경 · 페이지별 script include 통합을 차례로 진행한다.
> 본 메모는 합의 기준 문서이며 **실제 작업은 별도 PR**.

---

## 결정 1. Tombstone (삭제 동기화) 전략

### 문제
현재 `js/storage.js:132-138` `deleteBook`은 `localStorage`에서 단순 filter한다. 동기화가 켜진 상태에서 device A에서 책을 지우면 Supabase에는 그대로 남고, device B에서 다시 가져와 사용자 localStorage에 되살아난다("좀비 복귀").

### 옵션
| 옵션 | 장점 | 단점 |
|---|---|---|
| **A. soft-delete (`deleted_at`)** | row 영구 보존, RLS·인덱스 그대로 활용, 복구 가능 | 모든 select에 `.is('deleted_at', null)` 필터 잊으면 좀비 노출, 테이블이 영구히 부풀어 오름 |
| B. hard-delete + 별도 `tombstones` 테이블 | books 테이블 깔끔 | 별도 read·write, 정리 cron 필요, 복잡 |
| C. hard-delete + `updated_at` 기반 vector | 단순 | 시계 어긋남 시 좀비 복귀 불가피, 안전 못 함 |

### 권장: A (soft-delete with `deleted_at`)
이유:
- 본 앱 규모(개인 단위 1~3 device, 책 수 1000건 이하 추정)에서 row bloat 무시 가능
- 사용자가 실수로 책 지웠을 때 30일 이내 자동 복구 가능 (별점·한줄평 보호)
- RLS 정책에 `deleted_at IS NULL`을 추가하면 클라이언트가 잊어도 안전
- 30일 지난 row는 nightly Supabase cron(또는 Edge Function)으로 hard-delete

### 클라이언트 영향
- `js/storage.js`의 `deleteBook` → 실제로는 `updateBook({deleted_at: now})`로 변경
- `getAllBooks` → filter `!b.deletedAt`
- localStorage 스키마에도 `deletedAt` 필드 추가 (필요 시 30일 지나면 로컬에서도 청소)

---

## 결정 2. Last-Write-Wins 권위 (클라 vs 서버)

### 문제
사용자가 device A에서 별점 변경 후 동기화 전, device B에서 같은 책 별점 다시 변경 → 둘 중 누가 이김?

### 옵션
| 옵션 | 메커니즘 |
|---|---|
| **A. 클라이언트 supplied `updated_at`** | 클라가 `updated_at: nowIso()`를 보내고, upsert 시 `where books.updated_at < new.updated_at` |
| B. 서버 트리거 (현 `set_updated_at()`) | DB가 자동 갱신 → 동기화 race 시 "마지막 도착한 쪽"이 이김 (실제 사용자 의도와 무관) |
| C. CRDT 머지 | 너무 무거움 |

### 권장: A
- 사용자의 **실제 수정 시각**을 기준으로 분쟁 해결 (의도 보존)
- 클라이언트 시계 어긋남 위험은 있으나 동일 사용자의 device들이라 큰 차이 없음
- 구현: SQL에서 `set_updated_at` 트리거를 books/folders에는 **달지 않는다**. INSERT/UPDATE 시 클라가 보낸 값을 그대로 사용.

### 절차
1. 클라이언트 mutation 시:
   ```js
   row.updated_at = nowIso();
   await SB.client.from('books').upsert(row, { onConflict: 'id' });
   ```
2. 서버 측은 conflict 시 last-write-wins (`upsert`는 항상 덮어씀).
3. 진짜 race가 우려되면 별도 컬럼 `client_updated_at` + 트리거에서 `if new.client_updated_at > old.client_updated_at then new else old`로 가드 (Phase 2).

---

## 결정 3. 페이지별 script include 통합

### 현 문제
- `index.html`: theme/supabase/auth-ui 없음 (헤더 아바타 미노출)
- `share.html`: `sync.js` 있음, 다른 페이지엔 없음
- 같은 storage.js가 페이지마다 다른 캐시 버스터로 로드됨

### 옵션
| 옵션 | 비고 |
|---|---|
| **A. SSR partial — `partials/scripts.html` + Vercel rewrites** | 정적 사이트 무프레임워크 원칙 깨짐, 비용 |
| **B. 런타임 loader — `js/loader.js`가 표준 deps 주입** | 1회 추가 script로 끝, 캐시 버스터 자동화, 추천 |
| C. 현재 유지 + 수동 sync | 동기화 추가 시 매번 7페이지 수동 수정, 누락 위험 |

### 권장: B
- 새 파일 `js/loader.js?v=<global>` 한 줄만 모든 HTML 상단에 추가
- loader 내부에서 페이지가 필요로 하는 standard deps(`config`, `storage`, `theme`, `supabase`, `auth-ui`, `sync`, `books-sync`)를 `document.write`나 dynamic import로 순서대로 주입
- 캐시 버스터는 loader 내부 상수 하나로 통일 (HTML 7개 안 건드림)
- 각 페이지 고유 스크립트(index.js, detail.js 등)만 HTML에 남김

### 비용
- 페이지 첫 paint 약간 지연(deps 순차 로드) — 정적 사이트라 무시 가능
- 디버깅 시 script src가 동적으로 변해 인지 부담 살짝 증가

---

## 결정 4. 초기 업로드 마이그레이션

### 문제
사용자가 익명 모드에서 1년 쓰던 책 500권이 localStorage에 있음. 첫 Google 로그인 시:
- Supabase에 이 책들을 어떻게 올릴 것인가?
- 다른 device에서 이미 다른 책들을 올렸다면 충돌은?

### 권장 흐름
1. **첫 로그인 직후 onAuthChange 콜백**에서:
   ```js
   if (!localStorage.getItem('booksSyncedAt')) {
     // 첫 동기화 시점
     const localBooks = Storage.getAllBooks();
     const remoteBooks = await SB.client.from('books').select('*').is('deleted_at', null);
     await mergeAndPush(localBooks, remoteBooks);
     localStorage.setItem('booksSyncedAt', nowIso());
   }
   ```
2. **mergeAndPush 로직**:
   - 동일 `isbn`이 있으면 → `updated_at`이 더 최신인 쪽으로 통합 (clientside LWW)
   - 로컬에만 있는 책 → Supabase insert
   - 리모트에만 있는 책 → localStorage insert
   - 동일 id가 다른 isbn (희박) → 신규 id로 분기
3. **이후 매 mutation은 dual-write**:
   - `Storage.saveBook(b)` 내부에서 `if (SB.enabled && SB.getUser()) SB.client.from('books').upsert(b)`
   - 실패 시 localStorage는 성공, Supabase 재시도는 outbox queue(`localStorage['outbox']`)에 적재 — 다음 페이지 로드 시 flush

### 안전장치
- 첫 동기화는 사용자 확인 dialog: "기기에 저장된 책 N권을 클라우드에 올릴까요?" (한 번만)
- 실패 시 부분 동기화된 상태 표시 + 재시도 버튼

---

## 마이그레이션 SQL (제안 형태, 합의 후 확정)

```sql
-- books 테이블
create table if not exists public.books (
  id           text primary key,           -- 클라이언트 UID (storage.js의 uid())
  user_id      uuid not null references auth.users(id) on delete cascade,
  isbn         text,
  title        text not null,
  authors      text[],                     -- jsonb 대신 text[] (간단)
  publisher    text,
  thumbnail    text,
  contents     text,
  category     text,
  language     text default 'ko',
  rating       int check (rating >= 0 and rating <= 5),
  review       text,                       -- HIGH: H1 XSS 픽스 후에만 raw HTML 신뢰 가능. 우선은 sanitize된 HTML만 받는다는 전제.
  read_date    date,
  status       text,                       -- '' / reading / want
  folders      text[],                     -- folder ids
  ar           jsonb,                      -- English book AR data
  created_at   timestamptz default now(),
  updated_at   timestamptz not null,       -- 클라가 supply
  deleted_at   timestamptz,                -- soft-delete
  unique (user_id, id)
);

create index if not exists books_user_updated_idx on public.books(user_id, updated_at desc) where deleted_at is null;

alter table public.books enable row level security;
create policy "user books read" on public.books for select using (auth.uid() = user_id and deleted_at is null);
create policy "user books upsert" on public.books for insert with check (auth.uid() = user_id);
create policy "user books update" on public.books for update using (auth.uid() = user_id);
-- delete 정책 없음 — soft-delete만 허용

-- folders 테이블 (유사)
create table if not exists public.folders (
  id           text primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  emoji        text,
  color        text,
  created_at   timestamptz default now(),
  updated_at   timestamptz not null,
  deleted_at   timestamptz,
  unique (user_id, id)
);

alter table public.folders enable row level security;
create policy "user folders read" on public.folders for select using (auth.uid() = user_id and deleted_at is null);
create policy "user folders upsert" on public.folders for insert with check (auth.uid() = user_id);
create policy "user folders update" on public.folders for update using (auth.uid() = user_id);

-- 30일 지난 soft-deleted 정리 (수동/cron)
-- delete from public.books where deleted_at is not null and deleted_at < now() - interval '30 days';
```

---

## 합의 후 작업 순서

1. **🔴 선행 차단**: `js/detail.js`의 review HTML XSS sanitize (보안 리뷰 H1). books.review를 다른 user가 만든 row까지 fetch할 일은 없지만 (RLS), 클라이언트 자체의 `innerHTML` 라운드트립이 위험.
2. SQL migration 파일 작성: `migrations/2026-05-27_books_folders_sync.sql`
3. Supabase Dashboard에서 실행 + RLS 검증
4. `js/loader.js` 추가 + 7개 HTML 통합
5. `js/storage.js` mutation 함수에 dual-write hook 추가
6. `js/sync.js`에 `mergeAndPush` + outbox 추가
7. 첫 동기화 다이얼로그 UI
8. 두 디바이스로 통합 테스트 (충돌 시나리오 포함)

---

## 미결 / 사용자 확인 필요

- [ ] **결정 1**: soft-delete with deleted_at — OK?
- [ ] **결정 2**: 클라이언트 supplied updated_at LWW — OK?
- [ ] **결정 3**: `js/loader.js`로 script include 통합 — OK? (반대면 그냥 7개 HTML 일일이 갱신)
- [ ] **결정 4**: 첫 로그인 시 동기화 동의 다이얼로그 — OK?
- [ ] **review 컬럼 XSS 선행**: 백로그 C 시작 전 detail.js의 review sanitize 픽스 필수 — 동의?
