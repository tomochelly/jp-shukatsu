import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFlow } from '../src/lib/flow.ts';

test('화살표 문장은 단계, 나머지는 문단', () => {
  const b = parseFlow('마이페이지 등록 → (일부 직종) 과제 → 면접 2~4회 → 내정. 1개 직종만 지원 가능. (27졸 기준, 2026-02-01 오픈)');
  assert.deepEqual(b, [
    { kind: 'steps', steps: ['마이페이지 등록', '(일부 직종) 과제', '면접 2~4회', '내정'] },
    { kind: 'text', text: '1개 직종만 지원 가능.' },
    { kind: 'text', text: '(27졸 기준, 2026-02-01 오픈)' },
  ]);
});

test('"라벨: A → B" 는 라벨 붙은 그룹', () => {
  const b = parseFlow('플래너: 서류(기획서·자기PR 동영상) → 선고회 → 최종. 총합직: 서류 → 인사면접.');
  assert.deepEqual(b, [
    { kind: 'steps', label: '플래너', steps: ['서류(기획서·자기PR 동영상)', '선고회', '최종'] },
    { kind: 'steps', label: '총합직', steps: ['서류', '인사면접'] },
  ]);
});

test('화살표가 없으면 문단만', () => {
  assert.deepEqual(parseFlow('선발 3종류: 특별선발 / 조기선발'), [{ kind: 'text', text: '선발 3종류: 특별선발 / 조기선발' }]);
});
