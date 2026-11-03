// 모델 선택: 환경변수 한 줄로 두뇌를 바꾼다. 기본은 Gemini, Claude 키가 오면 MODEL_PROVIDER=anthropic 으로 바꾼다.
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatAnthropic } from '@langchain/anthropic';

export const LIMITS = { maxQuestionChars: 300, maxOutputTokens: 2048, maxToolCalls: 5 };

// MODEL_NAME 에 haiku 또는 sonnet 만 적어도 된다 (연습·테스트는 haiku, 발표·제출은 sonnet)
const CLAUDE_MODELS = { haiku: 'claude-haiku-5-5', sonnet: 'claude-sonnet-5-5' };

export function createModel() {
  const provider = process.env.MODEL_PROVIDER || 'gemini';
  if (provider === 'anthropic') {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('Claude 키가 없습니다. .env.local 의 ANTHROPIC_API_KEY 를 확인해 주세요.');
    if (!process.env.MODEL_NAME) throw new Error('Claude 모델 이름(MODEL_NAME)을 .env.local 에 적어 주세요. haiku 또는 sonnet 이라고 적으면 됩니다.');
    const name = CLAUDE_MODELS[process.env.MODEL_NAME] || process.env.MODEL_NAME;
    return new ChatAnthropic({ model: name, apiKey: process.env.ANTHROPIC_API_KEY, maxTokens: LIMITS.maxOutputTokens, temperature: 0.3 });
  }
  if (!process.env.GEMINI_API_KEY) throw new Error('Gemini 키가 없습니다. .env.local 의 GEMINI_API_KEY 를 확인해 주세요.');
  return new ChatGoogleGenerativeAI({
    model: process.env.MODEL_NAME || 'gemini-3.5-flash-lite',
    apiKey: process.env.GEMINI_API_KEY, maxOutputTokens: LIMITS.maxOutputTokens, temperature: 0.3,
  });
}
