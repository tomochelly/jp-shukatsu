/** 트랙(지원자 상황) 정의. 홈의 "나는 어떤 경우?"와 트랙 배지에서 쓴다. */
export type TrackId = 'new' | 'direct' | 'career';

export interface Track {
  id: TrackId;
  label: string;
  /** 일본어 원문 병기 */
  labelJa?: string;
  description: string;
  /** active: 콘텐츠 있음 / wanted: 준비 중, 경험 공유 구함 */
  status: 'active' | 'wanted';
}

export const TRACKS: readonly Track[] = [
  {
    id: 'new',
    label: '신졸',
    labelJa: '新卒',
    description: '일본 대학·대학원 졸업 예정.',
    status: 'active',
  },
  {
    id: 'direct',
    label: '한국에서 바로',
    description: '한국 대학 졸업(예정) 후 일본 기업에 직접 지원.',
    status: 'wanted',
  },
  {
    id: 'career',
    label: '경력 이직',
    labelJa: '中途',
    description: '한국·일본에서 일한 경력으로 일본 기업에 이직.',
    status: 'wanted',
  },
];

export const trackById = (id: TrackId): Track => TRACKS.find((t) => t.id === id)!;
