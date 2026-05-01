# 書架 — Book Tracker

모바일 우선 독서기록 웹앱. GitHub Pages 호스팅.

## 기능
- 바코드 스캔으로 책 검색 (카카오 책 API)
- 별점, 한줄평, 읽은 날짜, 어휘 노트 기록
- 월별/장르별 독서 통계
- 인스타그램용 1080×1080 공유 카드 생성

## 설정

1. `js/config.example.js`를 복사해 `js/config.js`로 저장
2. `KAKAO_API_KEY`에 카카오 REST API 키 입력
3. `config.js`는 `.gitignore`에 등록되어 있으므로 커밋되지 않음

## 카카오 API 키 발급

1. [카카오 개발자센터](https://developers.kakao.com) 접속
2. 애플리케이션 추가
3. 앱 키 → REST API 키 복사

## 로컬 실행

```bash
# Python 3
python3 -m http.server 8080

# 또는 VS Code Live Server 확장
```

브라우저에서 `http://localhost:8080` 접속.

## GitHub Pages 배포

1. 저장소를 `namkicheol/book-tracker`로 push
2. Settings → Pages → Source: `main` branch `/root`
3. `https://namkicheol.github.io/book-tracker/` 로 접속

## 기술 스택

- 순수 HTML / CSS / JavaScript (프레임워크 없음)
- 데이터: localStorage (storage.js로 추상화, 추후 Supabase 교체 예정)
- 바코드: html5-qrcode
- 차트: Chart.js
- 공유 이미지: Canvas API (html2canvas 없이 native Canvas 사용)
- 폰트: Fraunces + Noto Serif KR (Google Fonts)
