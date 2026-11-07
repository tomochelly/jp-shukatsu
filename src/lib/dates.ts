/**
 * 일정 날짜 계산. "오늘", D-day, 마감 임박, 지난 일정은 전부 일정 데이터의
 * 시간대(기본 Asia/Tokyo) 기준으로 판단한다. 보는 사람 기기의 시간대와 무관.
 *
 * 빌드(서버)와 브라우저 양쪽에서 쓰므로 Astro·Node 전용 API를 쓰지 않는다.
 */

export const DEFAULT_TIME_ZONE = 'Asia/Tokyo';
/** 마감까지 이 일수 이하이면 "마감 임박" */
export const IMMINENT_DAYS = 7;

/** 날짜 계산에 필요한 최소 필드 (스키마의 CompanyEvent와 호환) */
export interface EventTiming {
  date: string;
  time?: string | undefined;
  end?: string | undefined;
  endTime?: string | undefined;
}

const WEEKDAYS_KO = ['일', '월', '화', '수', '목', '금', '토'] as const;

/* ---------------- 시간대 기본 연산 ---------------- */

const dtfCache = new Map<string, Intl.DateTimeFormat>();
function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = dtfCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    dtfCache.set(timeZone, f);
  }
  return f;
}

/** 어떤 순간이 그 시간대에서 몇 년 몇 월 며칠 몇 시인지 */
function wallClock(instant: Date, timeZone: string) {
  const p: Record<string, number> = {};
  for (const { type, value } of partsFormatter(timeZone).formatToParts(instant)) {
    if (type !== 'literal') p[type] = Number(value);
  }
  return { y: p.year!, m: p.month!, d: p.day!, h: p.hour!, mi: p.minute!, s: p.second! };
}

/** 그 시간대의 UTC 오프셋(분). 예: Asia/Tokyo → 540 */
function offsetMinutes(instant: Date, timeZone: string): number {
  const w = wallClock(instant, timeZone);
  const asUtc = Date.UTC(w.y, w.m - 1, w.d, w.h, w.mi, w.s);
  return Math.round((asUtc - Math.floor(instant.getTime() / 1000) * 1000) / 60000);
}

/** "그 시간대의 YYYY-MM-DD HH:mm"이 실제로 어느 순간인지 */
export function zonedToInstant(date: string, time: string, timeZone = DEFAULT_TIME_ZONE): Date {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const [h, mi] = time.split(':').map(Number) as [number, number];
  const guess = Date.UTC(y, m - 1, d, h, mi);
  let result = guess - offsetMinutes(new Date(guess), timeZone) * 60000;
  // 서머타임이 있는 시간대 대비 한 번 더 보정 (Asia/Tokyo에는 영향 없음)
  result = guess - offsetMinutes(new Date(result), timeZone) * 60000;
  return new Date(result);
}

/** 그 시간대의 오늘 날짜 "YYYY-MM-DD" */
export function todayIn(timeZone = DEFAULT_TIME_ZONE, now: Date = new Date()): string {
  const w = wallClock(now, timeZone);
  return `${w.y}-${pad(w.m)}-${pad(w.d)}`;
}

/* ---------------- 달력 날짜 연산 (시간대 무관) ---------------- */

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function dateToUtcMs(date: string): number {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d);
}

/** to - from 일수 (달력 기준) */
export function diffDays(from: string, to: string): number {
  return Math.round((dateToUtcMs(to) - dateToUtcMs(from)) / 86400000);
}

export function addDays(date: string, days: number): string {
  return new Date(dateToUtcMs(date) + days * 86400000).toISOString().slice(0, 10);
}

/** "일" ~ "토" */
export function weekdayKo(date: string): string {
  return WEEKDAYS_KO[new Date(dateToUtcMs(date)).getUTCDay()]!;
}

/** "2026-12-01" → "12.01" */
export function formatMonthDay(date: string): string {
  return `${Number(date.slice(5, 7))}.${date.slice(8, 10)}`;
}

/** "2026-12-01" → "2026.12.01" */
export function formatFullDate(date: string): string {
  return date.replaceAll('-', '.');
}

/* ---------------- 일정 판단 ---------------- */

/** 여러 날짜에 걸친 일정인지 */
export function isRange(ev: EventTiming): boolean {
  return ev.end !== undefined && ev.end !== ev.date;
}

/** 시각이 하나도 없으면 종일 일정 */
export function isAllDay(ev: EventTiming): boolean {
  return ev.time === undefined && ev.endTime === undefined;
}

/** 마지막 날짜 (end ?? date) */
export function lastDate(ev: EventTiming): string {
  return ev.end ?? ev.date;
}

/** 시작 순간: date + (time ?? 00:00) */
export function startInstant(ev: EventTiming, timeZone = DEFAULT_TIME_ZONE): Date {
  return zonedToInstant(ev.date, ev.time ?? '00:00', timeZone);
}

/**
 * 유효 기한 순간. 이 순간이 지나면 "지난 일정".
 * - endTime이 있으면 (end ?? date)의 endTime
 * - 없으면 (end ?? date) 다음 날 00:00 (= 그날 하루 끝까지)
 */
export function deadlineInstant(ev: EventTiming, timeZone = DEFAULT_TIME_ZONE): Date {
  return ev.endTime !== undefined
    ? zonedToInstant(lastDate(ev), ev.endTime, timeZone)
    : zonedToInstant(addDays(lastDate(ev), 1), '00:00', timeZone);
}

export type StatusTone = 'danger' | 'ok' | 'plain' | 'past';

export interface EventStatus {
  /** past: 지남 / upcoming: 시작 전 / open: 진행 중(시작했고 기한 전) */
  phase: 'past' | 'upcoming' | 'open';
  /** 마감일까지 남은 일수 (오늘 마감 = 0, 지난 일정은 음수) */
  daysLeft: number;
  /** 시작일까지 남은 일수 (이미 시작했으면 0 이하) */
  daysToStart: number;
  /** 기한까지 IMMINENT_DAYS 이하 (지난 일정 제외) */
  imminent: boolean;
  tone: StatusTone;
  /** 칩에 표시할 문구 (예: "마감 임박 D-3", "시작 D-24", "지남") */
  label: string;
}

export function eventStatus(
  ev: EventTiming,
  timeZone = DEFAULT_TIME_ZONE,
  now: Date = new Date(),
): EventStatus {
  const today = todayIn(timeZone, now);
  const daysLeft = diffDays(today, lastDate(ev));
  const daysToStart = diffDays(today, ev.date);
  const range = isRange(ev);

  if (now.getTime() >= deadlineInstant(ev, timeZone).getTime()) {
    return { phase: 'past', daysLeft, daysToStart, imminent: false, tone: 'past', label: '지남' };
  }

  const imminent = daysLeft <= IMMINENT_DAYS;
  const started = now.getTime() >= startInstant(ev, timeZone).getTime();
  const todayLabel = ev.endTime !== undefined ? `오늘 ${ev.endTime} 마감` : range ? '오늘 마감' : '오늘';

  if (range && !started) {
    // 응모 기간 시작 전: 마감이 아니라 시작까지 남은 날을 보여준다
    return {
      phase: 'upcoming',
      daysLeft,
      daysToStart,
      imminent,
      tone: imminent ? 'danger' : 'plain',
      label: daysToStart === 0 ? '오늘 시작' : `시작 D-${daysToStart}`,
    };
  }

  if (range) {
    return {
      phase: 'open',
      daysLeft,
      daysToStart,
      imminent,
      tone: imminent ? 'danger' : 'ok',
      label: daysLeft === 0 ? todayLabel : imminent ? `마감 임박 D-${daysLeft}` : `진행 중 · D-${daysLeft}`,
    };
  }

  // 하루짜리 일정
  return {
    phase: started ? 'open' : 'upcoming',
    daysLeft,
    daysToStart,
    imminent,
    tone: imminent ? 'danger' : 'plain',
    label: daysLeft === 0 ? todayLabel : imminent ? `마감 임박 D-${daysLeft}` : `D-${daysLeft}`,
  };
}

/** 정렬 기준: 기한 → 시작 순 */
export function compareEvents(a: EventTiming, b: EventTiming, timeZone = DEFAULT_TIME_ZONE): number {
  return (
    deadlineInstant(a, timeZone).getTime() - deadlineInstant(b, timeZone).getTime() ||
    startInstant(a, timeZone).getTime() - startInstant(b, timeZone).getTime()
  );
}
