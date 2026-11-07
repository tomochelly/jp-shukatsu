import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { industryFileSchema } from './lib/schema.ts';

/**
 * 업계별 기업 데이터. 파일 하나 = 업계 하나.
 * 파일 이름이 업계 id가 된다 (src/data/companies/game.json → "game").
 * 기업 상세 URL은 /companies/<기업 id>/ 이고, 업계는 목록·필터에만 쓴다.
 */
const industries = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/data/companies' }),
  schema: industryFileSchema,
});

export const collections = { industries };
