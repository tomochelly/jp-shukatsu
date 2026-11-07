/**
 * 요강의 전형 흐름 문장을 화면용 블록으로 나눈다.
 * - 마침표+공백 기준으로 문장을 나누고
 * - "→"가 있는 문장은 단계 목록으로 (앞에 "라벨:"이 있으면 그룹 이름으로)
 * - 나머지 문장은 그대로 문단
 */
export type FlowBlock =
  | { kind: 'steps'; label?: string; steps: string[] }
  | { kind: 'text'; text: string };

export function parseFlow(flow: string): FlowBlock[] {
  return flow
    .split(/(?<=\.)\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((sentence): FlowBlock => {
      if (!sentence.includes('→')) return { kind: 'text', text: sentence };
      const m = sentence.match(/^([^:：→]{1,20})[:：]\s*(.+)$/);
      const body = (m ? m[2]! : sentence).replace(/\.$/, '');
      const steps = body.split('→').map((s) => s.trim()).filter(Boolean);
      return m ? { kind: 'steps', label: m[1]!.trim(), steps } : { kind: 'steps', steps };
    });
}
