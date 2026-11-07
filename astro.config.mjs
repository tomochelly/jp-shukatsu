// @ts-check
import { defineConfig } from 'astro/config';

// 정적 생성(output: 'static') → dist/ 를 Cloudflare Workers 정적 자산으로 배포 (wrangler.jsonc).
// 나중에 로그인·D1이 필요해지면 Worker 코드(API)를 추가하거나 @astrojs/cloudflare 어댑터 검토.
export default defineConfig({
  site: 'https://example.pages.dev', // TODO: 실제 도메인 정해지면 교체
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
});
