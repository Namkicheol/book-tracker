# book-tracker 프로젝트 가이드

> 사용자가 "커밋", "vercel 확인", "배포해" 등을 요청하면 아래 워크플로를 **자동으로 끝까지** 수행. 매 단계마다 묻지 말 것.

## 배포 파이프라인

- 호스팅: **Vercel** (자동 배포)
- 트리거: GitHub `main` push → production 배포 / 다른 브랜치 push → preview 배포
- Repo: `Namkicheol/book-tracker` (https://github.com/Namkicheol/book-tracker)
- Production URL: `https://book-tracker-git-main-namkicheols-projects.vercel.app`

## "커밋하고 배포" 자동 워크플로

1. **변경 범위 확인**: `git status`, `git diff` 로 의도된 변경만 staged.
   - iCloud 동기화로 line-ending(CRLF↔LF) noise diff가 자주 끼어 있음. 의도하지 않은 파일은 staged에서 제외.
2. **세션 변경만 staged → 커밋**: `git add <파일>` 명시적으로. `git add -A` 금지.
3. **main 직접 push 시도**: 시스템 정책으로 막힐 가능성 높음. 막히면 4번으로.
4. **feature 브랜치 → PR → 머지** (main push 막혔을 때 표준 경로):
   ```bash
   git checkout -b feat/<설명>
   git push -u origin feat/<설명>
   gh pr create --base main --head feat/<설명> --title "<제목>" --body "<요약>"
   gh pr merge <번호> --merge --delete-branch
   ```
5. **머지 충돌 시**: school 노트북에서 push되지 않은 origin/main 커밋이 있을 수 있음.
   - working tree에 untracked WIP 있으면 먼저 `git stash push --include-untracked`
   - `git merge origin/main` → 충돌 파일은 origin/main 버전(`--theirs`) 받고 세션 의도 수동 재적용
   - 머지 커밋 push → PR 머지
   - 끝나면 `git stash pop` 으로 WIP 복구
6. **Vercel 배포 확인**: Vercel MCP `list_deployments` 로 production 배포 SHA가 main HEAD와 일치 + state READY 확인.
7. 사용자에게 production URL과 SHA 보고하고 종료.

## 권한·제약 사항

- `git push origin main` — 시스템이 self-modification으로 차단. 항상 PR 경로로.
- `~/.claude/settings.json` 자기 수정 — 차단됨. 사용자에게 직접 수정 요청.
- iCloud Drive 경로의 working tree는 line-ending이 자주 흔들림. `.gitattributes` 없음.

## 학교/집 두 머신 워크플로

- **현상**: school 노트북에서 작업 후 push 안 하고 iCloud로 working tree만 동기화되는 경우 자주 있음.
- 시작 시 `git status`에 다수 파일이 modified로 나오면 school WIP 의심.
- 본 세션 변경만 골라 커밋, school WIP는 working tree에 남겨둠.

## 기타

- 캐시 버스터: `<script src="js/foo.js?v=YYYYMMDD<letter>">` 형식. 변경 시 letter 한 칸 올림.
- 한국어 작성 시 합격자 노트/refs MD에 있는 표현만 사용 (전역 CLAUDE.md 규칙 따름).
