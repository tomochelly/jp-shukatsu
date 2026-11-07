/**
 * .ics UID. 일정 데이터의 id(events[].id) 기준이라, 날짜·제목이 바뀌어도
 * 같은 일정으로 인식돼 캘린더 앱에서 중복으로 쌓이지 않고 갱신된다.
 */
export const ICS_UID_DOMAIN = 'jp-shukatsu';
export const icsUid = (eventId: string) => `${eventId}@${ICS_UID_DOMAIN}`;
