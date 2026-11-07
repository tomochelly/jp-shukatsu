import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guideSchema } from '../src/lib/schema.ts';

const base = { title: 't', description: 'd', tracks: ['new'], order: 1 };

test('draft 글은 확인일 없이도 통과, 기본 상태는 draft', () => {
  const r = guideSchema.parse(base);
  assert.equal(r.status, 'draft');
});

test('공개 글은 최종 확인일 필수', () => {
  assert.equal(guideSchema.safeParse({ ...base, status: 'published' }).success, false);
  assert.equal(guideSchema.safeParse({ ...base, status: 'published', lastChecked: '2026-11-08' }).success, true);
});

test('YAML이 날짜를 Date로 읽어도 YYYY-MM-DD로 맞춤', () => {
  const r = guideSchema.parse({ ...base, status: 'published', lastChecked: new Date('2026-11-08T00:00:00Z') });
  assert.equal(r.lastChecked, '2026-11-08');
});

test('없는 트랙은 거부', () => {
  assert.equal(guideSchema.safeParse({ ...base, tracks: ['abroad'] }).success, false);
  assert.equal(guideSchema.safeParse({ ...base, tracks: [] }).success, false);
});
