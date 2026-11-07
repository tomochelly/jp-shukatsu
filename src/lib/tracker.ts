/**
 * 내 전형 관리·내 캘린더 저장소 (브라우저 localStorage).
 * 로그인을 붙이면 이 모듈의 load/save만 서버(Workers + D1)로 바꾸면 되도록
 * 화면 코드는 이 모듈의 함수만 쓴다.
 */
import { STORAGE_KEYS } from './site.ts';
import type { EventTiming } from './dates.ts';

/** 단계 종류 (일본어 원문은 화면에서 병기) */
export const STAGE_TYPES = [
  '엔트리',
  'ES',
  '웹테스트',
  '그룹 디스커션',
  '1차 면접',
  '2차 면접',
  '최종 면접',
  '내정',
  '기타',
] as const;
export type StageType = (typeof STAGE_TYPES)[number];

/**
 * 공개 일정을 내 캘린더에 담은 것. 키는 일정 id(events[].id).
 * 날짜·제목은 담을 때의 사본이고, 화면에서는 같은 id의 최신 공개 데이터가 있으면 그쪽을 우선한다
 * (마감 연장 등이 반영되도록). 공개 데이터에서 사라진 일정만 사본으로 보여준다.
 */
export interface SavedEvent extends EventTiming {
  id: string;
  company: string;
  companyName: string;
  title: string;
  kind: string;
  timezone: string;
  addedAt: string;
}

export interface Stage extends EventTiming {
  id: string;
  type: StageType;
  note?: string;
  done: boolean;
}

export interface Application {
  companyId: string;
  companyName: string;
  addedAt: string;
  stages: Stage[];
}

export interface TrackerData {
  version: 1;
  events: Record<string, SavedEvent>;
  applications: Record<string, Application>;
}

export const CHANGE_EVENT = 'jpj:tracker-change';

const empty = (): TrackerData => ({ version: 1, events: {}, applications: {} });

export function load(): TrackerData {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.applications);
    if (!raw) return empty();
    const d = JSON.parse(raw) as Partial<TrackerData>;
    if (d.version !== 1) return empty();
    return { version: 1, events: d.events ?? {}, applications: d.applications ?? {} };
  } catch {
    return empty();
  }
}

/** 저장 실패(사생활 보호 모드 등)면 false */
export function save(data: TrackerData): boolean {
  try {
    localStorage.setItem(STORAGE_KEYS.applications, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
    return true;
  } catch {
    return false;
  }
}

/** 다른 탭에서 바뀐 것까지 알림 */
export function subscribe(fn: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEYS.applications) fn();
  };
  window.addEventListener(CHANGE_EVENT, fn);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, fn);
    window.removeEventListener('storage', onStorage);
  };
}

export function hasEvent(id: string): boolean {
  return id in load().events;
}

/** 담기/빼기. 결과 상태(true = 담김)와 저장 성공 여부 */
export function toggleEvent(ev: Omit<SavedEvent, 'addedAt'>): { saved: boolean; ok: boolean } {
  const d = load();
  if (d.events[ev.id]) delete d.events[ev.id];
  else d.events[ev.id] = { ...ev, addedAt: new Date().toISOString() };
  const ok = save(d);
  return { saved: ev.id in d.events, ok };
}

export function hasApplication(companyId: string): boolean {
  return companyId in load().applications;
}

/**
 * 기업을 내 전형 관리에 추가. 이미 있으면 그대로 둔다.
 * (단계 기록이 한 번에 지워지지 않도록 빼기는 전형 관리 화면에서만)
 */
export function addApplication(companyId: string, companyName: string): { saved: boolean; ok: boolean } {
  const d = load();
  if (d.applications[companyId]) return { saved: true, ok: true };
  d.applications[companyId] = { companyId, companyName, addedAt: new Date().toISOString(), stages: [] };
  return { saved: true, ok: save(d) };
}
