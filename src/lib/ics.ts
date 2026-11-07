/**
 * iCalendar(.ics, RFC 5545) 생성. 구글 캘린더·애플 캘린더 등에서 가져오기용.
 * 빌드(공개 일정 파일)와 브라우저(내 전형 일정) 양쪽에서 쓴다.
 *
 * 규칙
 * - time·endTime이 둘 다 없으면 종일 일정 (VALUE=DATE, DTEND는 마지막 날 다음 날)
 * - 시각이 있으면 TZID=<시간대>를 붙인 시각 일정 + VTIMEZONE 정의 포함
 *   - 시작: date + (time ?? 하루짜리면 endTime, 기간이면 00:00)
 *   - 끝:   endTime이 있으면 (end ?? date) + endTime
 *           없고 기간이면 end 다음 날 00:00
 *           없고 하루짜리면 DTEND 생략 (그 시각의 일정)
 */
import { addDays, DEFAULT_TIME_ZONE, isRange, lastDate, type EventTiming } from './dates.ts';

export interface IcsEvent extends EventTiming {
  /** 일정마다 고정된 고유 id. 같은 일정을 다시 가져와도 중복되지 않게 */
  uid: string;
  summary: string;
  description?: string | undefined;
  url?: string | undefined;
}

export interface IcsOptions {
  /** 캘린더 이름 (가져올 때 표시) */
  calendarName: string;
  timeZone?: string;
  /** DTSTAMP용. 테스트에서 고정하려고 받는다 */
  now?: Date;
}

/** 지원하는 시간대의 VTIMEZONE 정의 */
const VTIMEZONES: Record<string, string[]> = {
  'Asia/Tokyo': [
    'BEGIN:VTIMEZONE',
    'TZID:Asia/Tokyo',
    'X-LIC-LOCATION:Asia/Tokyo',
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZOFFSETFROM:+0900',
    'TZOFFSETTO:+0900',
    'TZNAME:JST',
    'END:STANDARD',
    'END:VTIMEZONE',
  ],
};

const PRODID = '-//jp-shukatsu//Japan Job Hunting Calendar//KO';

/** TEXT 값 이스케이프 */
export function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** 한 줄이 75바이트(UTF-8)를 넘으면 접기. 한글이 중간에 잘리지 않게 문자 단위로 */
export function foldLine(line: string): string {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = '';
  let bytes = 0;
  let limit = 75;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (bytes + b > limit) {
      out.push(cur);
      cur = '';
      bytes = 0;
      limit = 74; // 이어지는 줄은 앞에 공백 1바이트가 붙는다
    }
    cur += ch;
    bytes += b;
  }
  out.push(cur);
  return out.join('\r\n ');
}

const compactDate = (date: string) => date.replaceAll('-', '');
const compactTime = (time: string) => `${time.replace(':', '')}00`;

function utcStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function eventLines(ev: IcsEvent, timeZone: string, stamp: string): string[] {
  const lines = ['BEGIN:VEVENT', `UID:${ev.uid}`, `DTSTAMP:${stamp}`];
  const range = isRange(ev);

  if (ev.time === undefined && ev.endTime === undefined) {
    lines.push(`DTSTART;VALUE=DATE:${compactDate(ev.date)}`);
    lines.push(`DTEND;VALUE=DATE:${compactDate(addDays(lastDate(ev), 1))}`);
  } else {
    const startTime = ev.time ?? (range ? '00:00' : ev.endTime!);
    lines.push(`DTSTART;TZID=${timeZone}:${compactDate(ev.date)}T${compactTime(startTime)}`);
    if (ev.endTime !== undefined && (range || ev.time !== undefined)) {
      lines.push(`DTEND;TZID=${timeZone}:${compactDate(lastDate(ev))}T${compactTime(ev.endTime)}`);
    } else if (range) {
      lines.push(`DTEND;TZID=${timeZone}:${compactDate(addDays(lastDate(ev), 1))}T000000`);
    }
  }

  lines.push(`SUMMARY:${escapeText(ev.summary)}`);
  if (ev.description) lines.push(`DESCRIPTION:${escapeText(ev.description)}`);
  if (ev.url) lines.push(`URL:${ev.url}`);
  lines.push('TRANSP:TRANSPARENT', 'END:VEVENT');
  return lines;
}

export function buildIcs(events: readonly IcsEvent[], opts: IcsOptions): string {
  const timeZone = opts.timeZone ?? DEFAULT_TIME_ZONE;
  const stamp = utcStamp(opts.now ?? new Date());
  const needsTz = events.some((e) => e.time !== undefined || e.endTime !== undefined);
  const vtz = VTIMEZONES[timeZone];
  if (needsTz && !vtz) throw new Error(`VTIMEZONE 정의가 없는 시간대입니다: ${timeZone}`);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(opts.calendarName)}`,
    `X-WR-TIMEZONE:${timeZone}`,
    ...(needsTz && vtz ? vtz : []),
    ...events.flatMap((ev) => eventLines(ev, timeZone, stamp)),
    'END:VCALENDAR',
  ];
  return lines.map(foldLine).join('\r\n') + '\r\n';
}
