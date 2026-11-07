# 일본취준 다리 (가칭)

한국인을 위한 일본 취준 정보 사이트. Astro 정적 생성 + Cloudflare Workers (Static Assets).

## 개발

Node 24 (`.node-version`: 24.22.1, 배포 빌드 환경과 같음). fnm·nvm·mise 등은 이 파일을 자동으로 읽음.

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # dist/ 생성
npm run check    # 타입 검사
npm test         # 날짜·.ics·데이터 검증 테스트
npm run preview:worker  # 빌드 후 Workers 환경으로 미리보기 (localhost:8787)
```

## 배포: Cloudflare Workers (Static Assets)

어댑터 없이 정적 빌드 결과(`dist/`)를 Worker의 정적 자산으로 올립니다. 설정은 `wrangler.jsonc`.

- `assets.directory: ./dist`
- `not_found_handling: "404-page"`: 없는 경로는 `dist/404.html`을 404로 응답
- `html_handling: "auto-trailing-slash"`: `/companies/cygames` → `/companies/cygames/`
- `preview_urls: true`: 버전별 미리보기 주소 사용 (`wrangler versions upload`용. 브랜치 미리보기는 `wrangler preview`)
- `public/_headers`의 응답 헤더가 그대로 적용됨

나중에 로그인·D1이 필요해지면 `wrangler.jsonc`에 `main`(Worker 코드)과 `d1_databases`를 추가합니다.

### 로컬에서 실제 배포 환경처럼 보기

```bash
npm run preview:worker   # 빌드 후 wrangler dev → http://localhost:8787 (404·헤더까지 실제와 같게)
```

### GitHub 연결 (Workers Builds)

> **2026-11 기준 화면**입니다. Cloudflare가 메뉴 이름·위치를 자주 바꾸니 다르면 이 절을 고쳐주세요.
> 실제 화면에서 다시 확인하지 못한 것은 **(확인 필요)** 로 표시했습니다.

1. Cloudflare 대시보드 → **Workers & Pages**에서 새 Worker 만들기 → Git 저장소 연결
   → GitHub 연결 후 `tomochelly/jp-shukatsu` 선택
2. 설정
   - **Worker 이름: `jp-shukatsu`**: `wrangler.jsonc`의 `name`과 같아야 빌드가 성공함
   - Production branch: `main`
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy` (기본값)
   - **Enable Preview builds: 켜기** (브랜치 미리보기용)
   - Preview command: `npx wrangler preview` (기본값)
   - Root directory: 비워둠 (저장소 루트)
   - API token: **이 프로젝트용으로 새로 만들기** (예: `jp-shukatsu-builds`). 아래 "연결할 때 주의" 참고
   - Wrangler 버전: 빌드 때 `package.json`(devDependencies)에 적힌 버전을 씀.
     `wrangler preview`는 4.158.0에 있음 (open beta). 올리려면 `npm install -D wrangler@4`
   - Node 버전: 빌드 환경 기본값이 **Node 24.22.1** (2026-11 첫 빌드 #ae0fe840에서 확인)이라 따로 지정하지 않음.
     저장소의 `.node-version`도 `24.22.1`로 맞춰둠. 나중에 빌드 환경 기본값이 바뀌어 어긋나면
     Build variables에 `NODE_VERSION` = `24.22.1` 추가 (Workers Builds가 `.node-version`을 읽는지는 확인 필요)
3. 저장하면 첫 배포 → `https://jp-shukatsu.<계정 서브도메인>.workers.dev`

나중에 빌드 설정을 바꾸려면: Worker의 Builds 설정 위쪽 **Production / Previews Base** 탭 (확인 필요)

#### 연결할 때 주의

- **"Configured API token unavailable"**: 다른 프로젝트용 API 토큰을 고르면 뜰 수 있음.
  이 프로젝트용 토큰을 새로 만들어 선택 (예: `jp-shukatsu-builds`)
- **"disconnected from your Git account" 배너**: GitHub → Settings → Applications →
  Cloudflare 앱의 **Repository access**에 `jp-shukatsu`가 들어 있는지 확인

### 브랜치 미리보기 (PR로 확인 후 머지)

- `main`에 푸시·머지 → 빌드 후 `wrangler deploy`로 실제 사이트에 배포
- 다른 브랜치에 푸시 → 빌드 후 `wrangler preview`로 **실제 사이트는 그대로 두고** 미리보기만 배포
  - 브랜치별 고정 주소: `https://<브랜치 이름>-jp-shukatsu.<서브도메인>.workers.dev`
    (같은 브랜치에 다시 푸시하면 같은 주소가 최신으로 바뀜)
  - PR을 열면 미리보기 주소가 PR에 댓글로 달림
  - 대시보드에서는 Worker 화면의 **Production** 드롭다운에서 환경(브랜치)을 바꿔서 봄.
    브랜치를 처음 푸시하기 전에는 "Create your first Preview" 안내만 뜸
  - 브랜치 이름은 주소에 들어가므로 영소문자·숫자·하이픈 권장 (예: `step5-companies-list`)
- 작업 흐름: 화면이 바뀌는 작업은 브랜치 → PR → 미리보기 확인 → 머지. 문서만 바뀌면 `main`에 바로

**미리보기 주소는 기본으로 공개**되어 있어 주소를 아는 누구나 볼 수 있습니다.
제한하려면 **Settings > Domains & Routes > Preview URLs**에서 Cloudflare Access를 켭니다.

빌드 중 데이터 검증이 실패하면 배포되지 않고 이전 버전이 그대로 남습니다
(실패 이유는 해당 빌드 로그에서 확인).

### 직접 배포 (선택)

GitHub 연결 없이 로컬에서 올릴 때 (`wrangler login` 필요):

```bash
npm run deploy           # 빌드 + 실제 사이트 배포
npm run deploy:preview   # 빌드 + 현재 git 브랜치 이름으로 미리보기 배포 (wrangler preview)
```

실제 도메인이 정해지면 `astro.config.mjs`의 `site`를 바꿔주세요 (canonical URL에 쓰임).

## 구조 원칙

- 색·간격·글자 크기는 `src/styles/tokens.css`에서만 정의 (라이트/다크는 `light-dark()`)
- 사이트 이름·메뉴·localStorage 키는 `src/lib/site.ts`
- 날짜 판단(오늘, D-day, 마감)은 전부 Asia/Tokyo 기준
- 기업 데이터는 공식 채용 페이지를 사람이 확인해 정리한 것만. 크롤링 코드 없음.

## 데이터 추가 방법

기업 정보와 채용 일정은 업계별 JSON 파일 하나에 모아둡니다.

```
src/data/companies/
├─ game.json      ← 게임 업계 (업계 id = 파일 이름 "game")
└─ <업계>.json    ← 새 업계는 파일을 새로 만들면 목록·필터에 자동으로 추가
```

정리 원칙: **기업 공식 채용 페이지를 직접 보고 사람이 정리한 내용만** 넣습니다.
취업 사이트에서 가져온 정보는 일정의 `sourceNote`에 출처를 밝힙니다.

### 파일 전체

| 필드 | 형식 | 설명 |
|---|---|---|
| `checkedAt` | `"YYYY-MM-DD"` | 공식 페이지를 마지막으로 확인한 날 (일본 시간). 모든 기업 페이지에 "확인일"로 표시 |
| `industry` | 문자열 | 화면에 보이는 업계 이름 (예: `"게임"`) |
| `targetYear` | 숫자 | 대상 졸업 연도 2자리 (예: `28` = 2028년 졸업) |
| `targetYearLabel` | 문자열 | 표시용 (예: `"28졸 (2028년 졸업)"`) |
| `timezone` | `"Asia/Tokyo"` | 날짜·시각의 기준 시간대. 현재 이 값만 허용 |
| `companies` | 배열 | 아래 기업 항목 |
| `events` | 배열 | 아래 일정 항목 |

### 기업 (`companies[]`)

| 필드 | 필수 | 설명 |
|---|---|---|
| `id` | ✓ | URL에 쓰임 → `/companies/<id>/`. 영소문자·숫자·하이픈. **모든 업계 파일을 통틀어 유일**해야 하고, 한 번 공개하면 바꾸지 않기 |
| `name` / `nameJa` | ✓ | 한국어 이름 / 일본어 원문 |
| `guideStatus` | ✓ | 요강 상태 문장 (예: `"28졸 요강 공개"`, `"27졸 기준 (28졸 미공개)"`) |
| `guideYear` | ✓ | 정리한 요강이 몇 졸 기준인지 (숫자). `targetYear`보다 작으면 상세 페이지에 경고 표시 |
| `locations`, `flow`, `pay` | ✓ | 근무지, 전형 흐름, 초임. `flow`에서 `→`로 이은 문장은 단계 목록으로 표시 |
| `roles` | ✓ | 모집 직종 배열 (1개 이상) |
| `foreigner` / `japanese` | ✓ | 국적·비자 / 일본어 요건. 요강에 없으면 정확히 `"기재 없음"` |
| `notes` | | 정리하면서 남길 메모 배열 |
| `sources` | ✓ | `[{ "label": "募集要項", "url": "https://..." }]` 1개 이상, https만 |

### 일정 (`events[]`)

| 필드 | 필수 | 설명 |
|---|---|---|
| `id` | ✓ | 일정 고유 id. 영소문자·숫자·하이픈, **모든 업계 파일을 통틀어 유일**. 권장 형식 `<기업 id>-<졸업연도>-<내용>` (예: `cygames-28-regular-1`) |
| `company` | ✓ | 기업 `id` (다른 업계 파일의 기업도 가능) |
| `date` | ✓ | 시작일 (또는 하루짜리 일정의 날짜) `"YYYY-MM-DD"` |
| `time` | | 시작 시각 `"HH:mm"` (24시간제) |
| `end` | | 기간 일정의 마지막 날 |
| `endTime` | | 마감 시각 `"HH:mm"`. 있으면 **(end ?? date)의 이 시각까지** 유효 |
| `title` | ✓ | 일정 내용. 시각은 제목에 쓰지 말고 `time`/`endTime`에 |
| `kind` | ✓ | 구분 (예: `엔트리`, `설명회`, `응모`, `인턴`) |
| `sourceNote` | | 공식 페이지 외 출처일 때 (예: `"キャリタス就活 게재 정보"`) |

**시각을 어떻게 넣을지**

| 경우 | 예 | 화면 / .ics |
|---|---|---|
| 시각 없음 | `date` | 종일 일정. 그날 일본 시간 24:00까지 유효 |
| 응모 기간 | `date`+`time`, `end`+`endTime` | 시작 전 "시작 D-n", 기간 중 "진행 중 · D-n", 마감 시각까지 유효 |
| 마감 시각만 | `date`+`endTime` | "D-n", 당일은 "오늘 23:59 마감" |
| 시간 정해진 행사 | `date`+`time`(+`endTime`) | 그 시각의 일정 |

"오늘", D-day, 마감 임박(7일 이내), 지난 일정은 보는 사람 기기와 관계없이 **일본 시간** 기준입니다.

> **일정 `id`는 한 번 정하면 바꾸지 마세요.** 방문자의 "내 캘린더" 저장과 .ics UID가
> 이 `id`로 연결됩니다. 마감 연장(`date`/`end`/`endTime` 변경)이나 제목 수정은
> `id`를 그대로 두고 값만 고치면, 저장해둔 일정에도 바뀐 내용이 반영되고
> 캘린더 앱에서도 같은 일정으로 갱신됩니다. 행사 자체가 다른 것일 때만 새 `id`를 만드세요.

### 추가한 뒤 확인

```bash
npm test         # 스키마·참조 검사
npm run build    # 같은 검사를 빌드에서도 함. 틀리면 어느 파일 몇 번째 항목인지 알려주고 멈춤
```

새 업계 파일을 만들 때는 `game.json`을 복사해서 시작하면 됩니다.
