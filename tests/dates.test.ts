import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deadlineInstant, eventStatus, todayIn, zonedToInstant } from '../src/lib/dates.ts';

const at = (iso: string) => new Date(iso);

test('오늘 날짜는 기기 시간대가 아니라 Asia/Tokyo 기준', () => {
  // UTC 11-07 16:00 = JST 11-08 01:00
  assert.equal(todayIn('Asia/Tokyo', at('2026-11-07T16:00:00Z')), '2026-11-08');
  assert.equal(todayIn('Asia/Tokyo', at('2026-11-07T14:59:00Z')), '2026-11-07');
});

test('JST 벽시계 → 순간 변환', () => {
  assert.equal(zonedToInstant('2026-12-18', '15:00').toISOString(), '2026-12-18T06:00:00.000Z');
});

test('마감 시각(endTime)이 있으면 그 시각까지 유효', () => {
  const ev = { date: '2026-12-01', time: '15:00', end: '2026-12-18', endTime: '15:00' };
  assert.equal(deadlineInstant(ev).toISOString(), '2026-12-18T06:00:00.000Z');
  const before = eventStatus(ev, 'Asia/Tokyo', at('2026-12-18T05:59:00Z'));
  assert.equal(before.phase, 'open');
  assert.equal(before.label, '오늘 15:00 마감');
  assert.equal(eventStatus(ev, 'Asia/Tokyo', at('2026-12-18T06:00:00Z')).phase, 'past');
});

test('마감 시각이 없으면 그날 JST 23:59:59까지 유효', () => {
  const ev = { date: '2026-11-21' };
  const last = eventStatus(ev, 'Asia/Tokyo', at('2026-11-21T14:59:59Z'));
  assert.equal(last.phase, 'open');
  assert.equal(last.label, '오늘');
  assert.equal(eventStatus(ev, 'Asia/Tokyo', at('2026-11-21T15:00:00Z')).phase, 'past');
});

test('응모 기간 시작 전에는 시작까지 남은 날', () => {
  const ev = { date: '2026-12-01', end: '2026-12-18' };
  const s = eventStatus(ev, 'Asia/Tokyo', at('2026-11-07T03:00:00Z'));
  assert.equal(s.phase, 'upcoming');
  assert.equal(s.label, '시작 D-24');
  assert.equal(s.tone, 'plain');
});

test('시작 시각 전까지는 기간이 열리지 않음', () => {
  const ev = { date: '2026-12-01', time: '15:00', end: '2026-12-18', endTime: '15:00' };
  assert.equal(eventStatus(ev, 'Asia/Tokyo', at('2026-12-01T05:59:00Z')).label, '오늘 시작');
  const open = eventStatus(ev, 'Asia/Tokyo', at('2026-12-01T06:00:00Z'));
  assert.equal(open.phase, 'open');
  assert.equal(open.label, '진행 중 · D-17');
});

test('마감 임박은 7일 이내', () => {
  const now = at('2026-11-07T03:00:00Z'); // JST 11-07 12:00
  const d7 = eventStatus({ date: '2026-11-14' }, 'Asia/Tokyo', now);
  assert.equal(d7.imminent, true);
  assert.equal(d7.label, '마감 임박 D-7');
  assert.equal(d7.tone, 'danger');
  const d8 = eventStatus({ date: '2026-11-15' }, 'Asia/Tokyo', now);
  assert.equal(d8.imminent, false);
  assert.equal(d8.label, 'D-8');
});

test('한국 시간 자정 직후에도 일본 기준으로 판단', () => {
  // KST 11-22 00:30 = JST 11-22 00:30 (같은 오프셋) → 11-21 일정은 지남
  assert.equal(eventStatus({ date: '2026-11-21' }, 'Asia/Tokyo', at('2026-11-21T15:30:00Z')).phase, 'past');
  // UTC 기기에서 UTC 11-21 15:30은 아직 11-21이지만, JST로는 지남이어야 함 → 위와 같은 결과
});
