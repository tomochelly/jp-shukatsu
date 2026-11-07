/**
 * 페이지에서 기업 데이터를 꺼내는 진입점 (빌드 전용).
 */
import { getCollection } from 'astro:content';
import { buildCompanyData, type CompanyData } from './company-data.ts';

export type { CompanyData, CompanyEntry, EventEntry, Industry } from './company-data.ts';

let cache: Promise<CompanyData> | undefined;

export function getCompanyData(): Promise<CompanyData> {
  cache ??= getCollection('industries').then((entries) =>
    buildCompanyData(entries.map((e) => ({ id: e.id, data: e.data }))),
  );
  return cache;
}
