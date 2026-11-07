/**
 * 업계별 데이터 파일을 합쳐서 페이지에서 쓰기 좋은 형태로 만든다.
 * 파일 간 검사(기업 id 중복, 일정의 기업 참조, 일정 중복)도 여기서 하고, 문제가 있으면 예외를 던져 빌드를 멈춘다.
 * astro:content에 의존하지 않는 순수 모듈 (테스트용으로 분리).
 */
import { compareEvents } from './dates.ts';
import { eventId } from './ids.ts';
import type { Company, CompanyEvent, IndustryFile, TimeZone } from './schema.ts';

export interface Industry {
  /** URL·필터용 id (파일 이름) */
  id: string;
  name: string;
  checkedAt: string;
  targetYear: number;
  targetYearLabel: string;
  timezone: TimeZone;
  companyIds: string[];
}

export interface CompanyEntry extends Company {
  industryId: string;
  industry: string;
  checkedAt: string;
  targetYear: number;
  targetYearLabel: string;
  timezone: TimeZone;
  /** guideYear < targetYear → 대상 연도 요강이 아직 없음 */
  isGuideOutdated: boolean;
}

export interface EventEntry extends CompanyEvent {
  id: string;
  companyName: string;
  companyNameJa: string;
  industryId: string;
  timezone: TimeZone;
  checkedAt: string;
}

export interface CompanyData {
  industries: Industry[];
  companies: CompanyEntry[];
  /** 기한 순으로 정렬됨 */
  events: EventEntry[];
  byId: Map<string, CompanyEntry>;
}

/** 파일 목록 → 합친 데이터 파일 목록 → 합친 데이터. 테스트하기 쉽게 getCollection과 분리 */
export function buildCompanyData(files: ReadonlyArray<{ id: string; data: IndustryFile }>): CompanyData {
  const errors: string[] = [];
  const industries: Industry[] = [];
  const companies: CompanyEntry[] = [];
  const byId = new Map<string, CompanyEntry>();
  const fileOf = new Map<string, string>();

  const sorted = [...files].sort((a, b) => a.id.localeCompare(b.id));

  for (const { id: industryId, data } of sorted) {
    industries.push({
      id: industryId,
      name: data.industry,
      checkedAt: data.checkedAt,
      targetYear: data.targetYear,
      targetYearLabel: data.targetYearLabel,
      timezone: data.timezone,
      companyIds: data.companies.map((c) => c.id),
    });
    for (const c of data.companies) {
      if (byId.has(c.id)) {
        errors.push(`기업 id "${c.id}"가 ${fileOf.get(c.id)}.json과 ${industryId}.json에 중복됩니다`);
        continue;
      }
      const entry: CompanyEntry = {
        ...c,
        industryId,
        industry: data.industry,
        checkedAt: data.checkedAt,
        targetYear: data.targetYear,
        targetYearLabel: data.targetYearLabel,
        timezone: data.timezone,
        isGuideOutdated: c.guideYear < data.targetYear,
      };
      byId.set(c.id, entry);
      fileOf.set(c.id, industryId);
      companies.push(entry);
    }
  }

  const events: EventEntry[] = [];
  const eventIds = new Set<string>();
  for (const { id: industryId, data } of sorted) {
    data.events.forEach((ev, i) => {
      const c = byId.get(ev.company);
      if (!c) {
        errors.push(`${industryId}.json events[${i}]: 기업 id "${ev.company}"를 찾을 수 없습니다`);
        return;
      }
      const id = eventId(ev);
      if (eventIds.has(id)) {
        errors.push(`${industryId}.json events[${i}]: 같은 기업·날짜·제목의 일정이 중복됩니다 (${id})`);
        return;
      }
      eventIds.add(id);
      events.push({
        ...ev,
        id,
        companyName: c.name,
        companyNameJa: c.nameJa,
        industryId,
        timezone: data.timezone,
        checkedAt: data.checkedAt,
      });
    });
  }

  if (errors.length) {
    throw new Error(`기업 데이터 오류 ${errors.length}건:\n- ${errors.join('\n- ')}`);
  }

  events.sort((a, b) => compareEvents(a, b, a.timezone));
  companies.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  return { industries, companies, events, byId };
}
