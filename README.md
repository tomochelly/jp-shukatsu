# 일본취준 다리 (가칭)

한국인을 위한 일본 취준 정보 사이트. Astro 정적 생성 + Cloudflare Pages.

## 개발

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # dist/ 생성
npm run check    # 타입 검사
```

## Cloudflare Pages 설정

- Build command: `npm run build`
- Build output directory: `dist`
- 환경 변수 `NODE_VERSION=22`

## 구조 원칙

- 색·간격·글자 크기는 `src/styles/tokens.css`에서만 정의 (라이트/다크는 `light-dark()`)
- 사이트 이름·메뉴·localStorage 키는 `src/lib/site.ts`
- 날짜 판단(오늘, D-day, 마감)은 전부 Asia/Tokyo 기준
- 기업 데이터는 공식 채용 페이지를 사람이 확인해 정리한 것만. 크롤링 코드 없음.
