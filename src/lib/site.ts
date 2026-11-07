/** 사이트 전체 설정. 이름이 정해지면 여기만 바꾸면 된다. */
export const SITE = {
  name: '일본취준 다리',
  nameNote: '가칭',
  description:
    '일본에서 취업을 준비하는 한국인을 위한 정보 정리. 일본 취업 구조, 외국인 관점의 기업 정보, 채용 일정.',
  lang: 'ko',
  /** 일정·D-day·마감 판단의 기준 시간대 */
  timeZone: 'Asia/Tokyo',
} as const;

export type NavKey = 'home' | 'guides' | 'companies' | 'calendar';

export const NAV: ReadonlyArray<{ key: NavKey; href: string; label: string }> = [
  { key: 'home', href: '/', label: '홈' },
  { key: 'guides', href: '/guides/', label: '가이드' },
  { key: 'companies', href: '/companies/', label: '기업' },
  { key: 'calendar', href: '/calendar/', label: '캘린더' },
];

/** 현재 경로가 어느 메뉴에 속하는지 */
export function navKeyFor(pathname: string): NavKey | undefined {
  if (pathname === '/') return 'home';
  return NAV.find((n) => n.key !== 'home' && pathname.startsWith(n.href))?.key;
}

/** localStorage 키는 전부 여기서 관리 (버전 붙여서 나중에 마이그레이션 가능하게) */
export const STORAGE_KEYS = {
  theme: 'jpj:v1:theme',
  applications: 'jpj:v1:applications',
} as const;
