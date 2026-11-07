/**
 * 업계별 기업 데이터 파일(src/data/companies/<업계>.json)의 스키마.
 * 빌드할 때 이 스키마로 검증하고, 틀리면 빌드가 실패한다.
 *
 * 날짜 규칙
 * - date / end: "YYYY-MM-DD" (파일의 timezone 기준 달력 날짜)
 * - time / endTime: "HH:mm" 24시간제. 없으면 종일 일정.
 *   - time: 시작 시각 (설명회 시작 등)
 *   - endTime: 마감 시각. 있으면 (end ?? date)의 이 시각까지 유효.
 *   - endTime이 없으면 (end ?? date) 날짜가 끝날 때(24:00)까지 유효.
 */
import { z } from 'astro/zod';

/** 지금 지원하는 시간대. 늘릴 때는 lib/ics.ts의 VTIMEZONE도 함께 추가. */
export const SUPPORTED_TIME_ZONES = ['Asia/Tokyo'] as const;

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 형식이어야 합니다')
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s);
  }, '존재하지 않는 날짜입니다');

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'HH:mm (00:00~23:59) 형식이어야 합니다');

const nonEmpty = z.string().trim().min(1);

/** 졸업 연도 (2자리, 예: 28 = 2028년 졸업) */
const gradYear = z.number().int().min(20).max(99);

export const sourceSchema = z.object({
  /** 링크 이름. 원문(일본어) 그대로 */
  label: nonEmpty,
  url: z.url({ protocol: /^https$/ }),
});

export const companySchema = z.object({
  /** URL에 쓰이는 id. 모든 업계 파일을 통틀어 유일해야 함. 영소문자·숫자·하이픈 */
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'id는 영소문자·숫자·하이픈만 사용'),
  name: nonEmpty,
  nameJa: nonEmpty,
  /** 사람이 읽는 요강 상태 (예: "28졸 요강 공개", "27졸 기준 (28졸 미공개)") */
  guideStatus: nonEmpty,
  /** 정리한 요강이 몇 졸 기준인지. 파일의 targetYear보다 작으면 경고 표시 */
  guideYear: gradYear,
  locations: nonEmpty,
  roles: z.array(nonEmpty).min(1),
  flow: nonEmpty,
  pay: nonEmpty,
  /** 국적·비자 관련. 요강에 없으면 "기재 없음" */
  foreigner: nonEmpty,
  /** 일본어 요건. 요강에 없으면 "기재 없음" */
  japanese: nonEmpty,
  notes: z.array(nonEmpty).default([]),
  /** 출처는 최소 1개 필수 */
  sources: z.array(sourceSchema).min(1),
});

export const eventSchema = z
  .object({
    /** companies[].id 참조 (다른 업계 파일의 기업도 가능) */
    company: nonEmpty,
    date: isoDate,
    time: hhmm.optional(),
    end: isoDate.optional(),
    endTime: hhmm.optional(),
    title: nonEmpty,
    /** 구분 (예: 엔트리, 설명회, 응모, 인턴) */
    kind: nonEmpty,
    /** 공식 페이지 외 출처일 때 메모 (예: "キャリタス就活 게재 정보") */
    sourceNote: nonEmpty.optional(),
  })
  .superRefine((ev, ctx) => {
    if (ev.end !== undefined && ev.end < ev.date) {
      ctx.addIssue({ code: 'custom', path: ['end'], message: `end(${ev.end})가 date(${ev.date})보다 빠릅니다` });
    }
    if (
      ev.time !== undefined &&
      ev.endTime !== undefined &&
      (ev.end === undefined || ev.end === ev.date) &&
      ev.endTime < ev.time
    ) {
      ctx.addIssue({ code: 'custom', path: ['endTime'], message: `같은 날 일정인데 endTime(${ev.endTime})이 time(${ev.time})보다 빠릅니다` });
    }
  });

export const industryFileSchema = z
  .object({
    /** 마지막으로 공식 페이지를 확인한 날 (timezone 기준) */
    checkedAt: isoDate,
    /** 화면에 보이는 업계 이름 (예: "게임"). URL용 업계 id는 파일 이름 */
    industry: nonEmpty,
    /** 대상 졸업 연도 (예: 28) */
    targetYear: gradYear,
    /** 화면 표시용 (예: "28졸 (2028년 졸업)") */
    targetYearLabel: nonEmpty,
    /** 이 파일의 날짜·시각 기준 시간대 */
    timezone: z.enum(SUPPORTED_TIME_ZONES),
    companies: z.array(companySchema).min(1),
    events: z.array(eventSchema).default([]),
  })
  .superRefine((file, ctx) => {
    const seen = new Set<string>();
    file.companies.forEach((c, i) => {
      if (seen.has(c.id)) {
        ctx.addIssue({ code: 'custom', path: ['companies', i, 'id'], message: `기업 id "${c.id}"가 중복됩니다` });
      }
      seen.add(c.id);
    });
  });

export type Source = z.infer<typeof sourceSchema>;
export type Company = z.infer<typeof companySchema>;
export type CompanyEvent = z.infer<typeof eventSchema>;
export type IndustryFile = z.infer<typeof industryFileSchema>;
export type TimeZone = (typeof SUPPORTED_TIME_ZONES)[number];
