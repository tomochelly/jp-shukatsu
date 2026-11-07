// @ts-check
import { defineConfig } from 'astro/config';

// 정적 생성(output: 'static') → Cloudflare Pages에 dist/ 를 그대로 올림.
// 나중에 로그인·D1이 필요해지면 @astrojs/cloudflare 어댑터를 붙여 일부 경로만 서버 렌더링.
export default defineConfig({
  site: 'https://example.pages.dev', // TODO: 실제 도메인 정해지면 교체
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
});
