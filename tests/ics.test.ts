import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildIcs, foldLine } from '../src/lib/ics.ts';

const now = new Date('2026-11-08T00:00:00Z');
const opts = { calendarName: '테스트', now };
const lines = (s: string) => s.split('\r\n');

test('시각이 없으면 종일 일정, VTIMEZONE 없음', () => {
  const ics = buildIcs([{ uid: 'a@x', date: '2026-11-21', summary: '설명회' }], opts);
  assert.ok(ics.includes('DTSTART;VALUE=DATE:20261121\r\n'));
  assert.ok(ics.includes('DTEND;VALUE=DATE:20261122\r\n'));
  assert.ok(!ics.includes('BEGIN:VTIMEZONE'));
  assert.ok(ics.includes('DTSTAMP:20261108T000000Z'));
});

test('기간 + 시각: Asia/Tokyo TZID와 VTIMEZONE', () => {
  const ics = buildIcs(
    [{ uid: 'b@x', date: '2026-12-01', time: '15:00', end: '2026-12-18', endTime: '15:00', summary: '응모' }],
    opts,
  );
  assert.ok(ics.includes('BEGIN:VTIMEZONE\r\nTZID:Asia/Tokyo'));
  assert.ok(ics.includes('DTSTART;TZID=Asia/Tokyo:20261201T150000\r\n'));
  assert.ok(ics.includes('DTEND;TZID=Asia/Tokyo:20261218T150000\r\n'));
  assert.ok(ics.includes('X-WR-TIMEZONE:Asia/Tokyo'));
});

test('기간 + 마감 시각만: 첫날 00:00 시작', () => {
  const ics = buildIcs([{ uid: 'c@x', date: '2027-02-01', end: '2027-02-12', endTime: '15:00', summary: '응모' }], opts);
  assert.ok(ics.includes('DTSTART;TZID=Asia/Tokyo:20270201T000000\r\n'));
  assert.ok(ics.includes('DTEND;TZID=Asia/Tokyo:20270212T150000\r\n'));
});

test('하루짜리 + 마감 시각만: 마감 시각의 일정, DTEND 없음', () => {
  const ics = buildIcs([{ uid: 'd@x', date: '2027-02-26', endTime: '23:59', summary: '마감' }], opts);
  assert.ok(ics.includes('DTSTART;TZID=Asia/Tokyo:20270226T235900\r\n'));
  assert.ok(!/BEGIN:VEVENT[\s\S]*DTEND/.test(ics));
});

test('하루짜리 + 시작·끝 시각', () => {
  const ics = buildIcs([{ uid: 'e@x', date: '2026-11-21', time: '13:00', endTime: '17:00', summary: '합동설명회' }], opts);
  assert.ok(ics.includes('DTSTART;TZID=Asia/Tokyo:20261121T130000\r\n'));
  assert.ok(ics.includes('DTEND;TZID=Asia/Tokyo:20261121T170000\r\n'));
});

test('텍스트 이스케이프와 75바이트 줄 접기', () => {
  const summary = '사이게임즈, 통상선발 1회차; 응모\n'.repeat(5);
  const ics = buildIcs([{ uid: 'f@x', date: '2026-12-01', summary }], opts);
  assert.ok(ics.replace(/\r\n /g, '').includes('사이게임즈\\, 통상선발 1회차\\; 응모\\n'));
  for (const l of lines(ics)) assert.ok(new TextEncoder().encode(l).length <= 75, `too long: ${l}`);
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
});

test('접은 줄을 다시 펴면 원문과 같음 (한글이 잘리지 않음)', () => {
  const src = 'SUMMARY:' + '반다이남코 엔터테인먼트 리크나비 WEB 합동설명회 참가 '.repeat(4);
  assert.equal(foldLine(src).replace(/\r\n /g, ''), src);
});
