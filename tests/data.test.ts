import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { industryFileSchema, type IndustryFile } from '../src/lib/schema.ts';
import { buildCompanyData } from '../src/lib/company-data.ts';

const dir = new URL('../src/data/companies/', import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith('.json'));

test('모든 업계 파일이 스키마를 통과', () => {
  assert.ok(files.length > 0);
  for (const f of files) {
    const r = industryFileSchema.safeParse(JSON.parse(readFileSync(new URL(f, dir), 'utf8')));
    assert.ok(r.success, `${f}: ${r.success ? '' : JSON.stringify(r.error.issues, null, 2)}`);
  }
});

test('업계 파일을 합쳐도 id 중복·참조 오류 없음', () => {
  const parsed = files.map((f) => ({
    id: f.replace(/\.json$/, ''),
    data: industryFileSchema.parse(JSON.parse(readFileSync(new URL(f, dir), 'utf8'))),
  }));
  const d = buildCompanyData(parsed);
  assert.equal(d.byId.size, d.companies.length);
});

const base = (): IndustryFile =>
  industryFileSchema.parse({
    checkedAt: '2026-11-08',
    industry: '테스트',
    targetYear: 28,
    targetYearLabel: '28졸',
    timezone: 'Asia/Tokyo',
    companies: [
      {
        id: 'acme', name: '에이크미', nameJa: 'アクメ', guideStatus: '28졸 요강 공개', guideYear: 28,
        locations: '도쿄', roles: ['총합직'], flow: 'ES → 면접', pay: '30만엔', foreigner: '기재 없음',
        japanese: '기재 없음', sources: [{ label: '募集要項', url: 'https://example.com/' }],
      },
    ],
    events: [],
  });

test('다른 업계 파일과 기업 id가 겹치면 오류', () => {
  assert.throws(() => buildCompanyData([{ id: 'a', data: base() }, { id: 'b', data: base() }]), /중복/);
});

test('없는 기업을 가리키는 일정은 오류', () => {
  const f = base();
  f.events.push({ company: 'nope', date: '2026-12-01', title: 'x', kind: '응모' });
  assert.throws(() => buildCompanyData([{ id: 'a', data: f }]), /찾을 수 없습니다/);
});

test('guideYear < targetYear면 요강 미공개 표시', () => {
  const f = base();
  f.companies[0]!.guideYear = 27;
  assert.equal(buildCompanyData([{ id: 'a', data: f }]).companies[0]!.isGuideOutdated, true);
});

test('스키마: 잘못된 시각·날짜·순서를 거부', () => {
  const bad = (ev: object) => industryFileSchema.safeParse({ ...base(), events: [ev] }).success;
  const ok = { company: 'acme', date: '2026-12-01', title: 'x', kind: '응모' };
  assert.equal(bad(ok), true);
  assert.equal(bad({ ...ok, time: '25:00' }), false);
  assert.equal(bad({ ...ok, endTime: '9:00' }), false);
  assert.equal(bad({ ...ok, date: '2026-02-30' }), false);
  assert.equal(bad({ ...ok, end: '2026-11-30' }), false);
  assert.equal(bad({ ...ok, time: '15:00', endTime: '14:00' }), false);
  assert.equal(industryFileSchema.safeParse({ ...base(), timezone: 'Asia/Seoul' }).success, false);
  assert.equal(industryFileSchema.safeParse({ ...base(), targetYear: '28졸' }).success, false);
});
