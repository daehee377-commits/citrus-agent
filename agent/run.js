// 에이전트 실행기: 질문을 받아 AI가 도구를 골라 부르고(최대 5번), 그 결과로 답하게 한다.
import { SystemMessage, HumanMessage, AIMessage, ToolMessage } from '@langchain/core/messages';
import { tools, toolsByName } from './tools.js';
import { createModel, LIMITS } from './model.js';
import { SYSTEM_PROMPT } from '../topics/citrus.js';
import { detectIntents } from './router.js';

// 모델 응답 content 는 글자이거나 조각 배열일 수 있어 글자로 통일한다
const text = (c) => (typeof c === 'string' ? c : Array.isArray(c) ? c.map((p) => p.text ?? '').join('') : String(c ?? ''));

export async function runAgent({ question, history = [], onTool = () => {}, onResult = () => {} }) {
  const q = String(question ?? '').trim();
  if (!q) throw new Error('질문을 입력해 주세요.');
  if (q.length > LIMITS.maxQuestionChars) throw new Error(`질문이 너무 깁니다. ${LIMITS.maxQuestionChars}자 이내로 줄여 주세요.`);

  const model = createModel();
  const withTools = model.bindTools(tools);
  const messages = [
    new SystemMessage(SYSTEM_PROMPT),
    ...history.slice(-6).map((m) => (m.role === 'user' ? new HumanMessage(String(m.content).slice(0, LIMITS.maxQuestionChars)) : new AIMessage(String(m.content).slice(0, 4000)))),
    new HumanMessage(q),
  ];

  const called = [];
  let calls = 0;

  // 날씨·시세처럼 질문만 보고 도구가 분명한 경우는 서버가 먼저 조회해서 질문 뒤에 붙여 준다
  const pre = [];
  for (const it of detectIntents(q)) {
    calls += 1; called.push(it.name); onTool(it.name, it.args);
    const out = String(await toolsByName[it.name].invoke(it.args));
    onResult(it.name, out);
    pre.push(`[서버가 미리 조회한 ${it.name} 결과]\n${out.slice(0, 6000)}`);
  }
  if (pre.length) messages[messages.length - 1] = new HumanMessage(`${q}\n\n${pre.join('\n\n')}\n(위 결과로 답하고, 같은 도구를 다시 부르지 않는다.)`);

  while (true) {
    const overLimit = calls >= LIMITS.maxToolCalls;
    const res = await (overLimit ? model : withTools).invoke(messages); // 한도를 넘으면 도구 없이 지금까지 모은 것으로 답하게 한다
    const toolCalls = overLimit ? [] : res.tool_calls ?? [];
    if (!toolCalls.length) {
      const answer = text(res.content).trim();
      return { answer: answer || '답변을 만들지 못했습니다. 질문을 조금 바꿔 다시 해 주세요.', toolCalls: called, limitReached: overLimit };
    }
    messages.push(res);
    for (const tc of toolCalls) {
      if (calls >= LIMITS.maxToolCalls) { messages.push(new ToolMessage({ content: '{"error":"도구 호출 한도(5번)를 넘었습니다."}', tool_call_id: tc.id, name: tc.name })); continue; }
      calls += 1;
      called.push(tc.name);
      onTool(tc.name, tc.args); // 화면에 "도구 호출 중: 이름" 을 보여 주기 위한 알림
      const t = toolsByName[tc.name];
      const out = t ? await t.invoke(tc.args) : '{"error":"알 수 없는 도구입니다."}';
      onResult(tc.name, String(out)); // 도구 결과를 서버가 가공해 화면에 보낼 수 있게 한다 (예: 저장 후보 버튼)
      messages.push(new ToolMessage({ content: String(out).slice(0, 12000), tool_call_id: tc.id, name: tc.name }));
    }
  }
}
