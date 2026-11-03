// 모델 선택: 환경변수 한 줄로 두뇌를 바꾼다. 기본은 Gemini, Claude 키가 오면 MODEL_PROVIDER=anthropic 으로 바꾼다.
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatAnthropic } from '@langchain/anthropic';

export const LIMITS = { maxQuestionChars: 300, maxOutputTokens: 2048, maxToolCalls: 5 };

// MODEL_NAME 에 haiku 또는 sonnet 만 적어도 된다 (연습·테스트는 haiku, 발표·제출은 sonnet)
const CLAUDE_MODELS = { haiku: 'claude-haiku-5-5', sonnet: 'claude-sonnet-5-5' };

function build(provider, rawName) {
  if (provider === 'anthropic') {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('Claude 키가 없습니다. .env.local 의 ANTHROPIC_API_KEY 를 확인해 주세요.');
    if (!rawName) throw new Error('Claude 모델 이름(MODEL_NAME)을 .env.local 에 적어 주세요. haiku 또는 sonnet 이라고 적으면 됩니다.');
    return new ChatAnthropic({ model: CLAUDE_MODELS[rawName] || rawName, apiKey: process.env.ANTHROPIC_API_KEY, maxTokens: LIMITS.maxOutputTokens, temperature: 0.3 });
  }
  if (!process.env.GEMINI_API_KEY) throw new Error('Gemini 키가 없습니다. .env.local 의 GEMINI_API_KEY 를 확인해 주세요.');
  return new ChatGoogleGenerativeAI({
    model: rawName || 'gemini-3.5-flash-lite',
    apiKey: process.env.GEMINI_API_KEY, maxOutputTokens: LIMITS.maxOutputTokens, temperature: 0.3,
  });
}

export function createModel() {
  return build(process.env.MODEL_PROVIDER || 'gemini', process.env.MODEL_NAME);
}

// 예비 모델: 주 모델이 사용량 한도·서버 오류로 실패하면 순서대로 다음 모델로 다시 시도한다.
// MODEL_FALLBACK="gemini:gemini-3.5-flash,anthropic:haiku" 처럼 적으면 바꿀 수 있고, 적지 않으면 아래 기본값을 쓴다.
// 키가 없는 모델은 건너뛴다.
export function createFallbackModels() {
  const primary = process.env.MODEL_PROVIDER || 'gemini';
  const spec = process.env.MODEL_FALLBACK ?? (primary === 'anthropic' ? 'gemini:gemini-3.5-flash-lite' : 'gemini:gemini-3.5-flash');
  return spec.split(',').map((s) => s.trim()).filter(Boolean).flatMap((s) => {
    const [provider, name] = s.split(':');
    const sameAsPrimary = provider === primary && name === process.env.MODEL_NAME;
    if (sameAsPrimary) return [];
    try { return [build(provider, name)]; } catch { return []; }
  });
}
