// 에이전트 종합 테스트: npm run test:agent  (실제 AI·도구를 호출한다. 질문 수만큼 무료 한도를 쓴다)
import { runAgent } from '../agent/run.js';

const questions = process.argv.slice(2).length ? [process.argv.slice(2).join(' ')] : [
  '서귀포 근처에서 감귤을 직거래할 만한 카페나 펜션 알려줘.',
];
for (const q of questions) {
  console.log(`\n질문: ${q}`);
  const r = await runAgent({ question: q, onTool: (n) => console.log(`  도구 호출 중: ${n}`) });
  console.log(`호출한 도구: ${r.toolCalls.join(', ') || '(없음)'}${r.limitReached ? ' [한도 도달]' : ''}\n\n${r.answer}`);
}
