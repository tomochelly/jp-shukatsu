/**
 * 일정 고유 id. 공개 일정의 "내 캘린더에 추가"(localStorage 키)와 .ics UID에 같이 쓴다.
 * 제목이 바뀌면 id도 바뀌므로, 제목은 가능하면 수정하지 말고 새 일정으로 추가할 것.
 */
import type { EventTiming } from './dates.ts';

/** FNV-1a 32bit — 짧고 안정적인 해시 (보안용 아님) */
function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (const ch of s) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

export function eventId(ev: EventTiming & { company: string; title: string }): string {
  return `${ev.company}-${ev.date.replaceAll('-', '')}-${fnv1a(ev.title)}`;
}

export const ICS_UID_DOMAIN = 'jp-shukatsu';
export const icsUid = (id: string) => `${id}@${ICS_UID_DOMAIN}`;
