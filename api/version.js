// GET /api/version — 지금 배포가 어느 커밋인지, 질문 분류 코드가 어떻게 판단하는지 알려 준다 (비밀 정보 없음)
import { detectIntents } from '../agent/router.js';

export default function handler(req, res) {
  const sample = (q) => detectIntents(q).map((i) => i.name);
  res.status(200).json({
    commit: (process.env.VERCEL_GIT_COMMIT_SHA ?? 'local').slice(0, 7),
    env: process.env.VERCEL_ENV ?? 'local',
    // 환경변수가 들어갔는지만 true/false 로 알려 준다 (값은 절대 내보내지 않는다)
    model: { provider: process.env.MODEL_PROVIDER || 'gemini', name: process.env.MODEL_NAME || '(기본값)' },
    keys: Object.fromEntries(['GEMINI_API_KEY', 'ANTHROPIC_API_KEY', 'DATA_GO_KR_KEY', 'KAKAO_REST_KEY', 'NCPMS_API_KEY', 'KAMIS_API_KEY', 'KAMIS_API_ID', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'].map((k) => [k, Boolean(process.env[k])])),
    routing: {
      '요즘 감귤 시세 어때?': sample('요즘 감귤 시세 어때?'),
      '이번 주 수확 가능한 날이 언제야?': sample('이번 주 수확 가능한 날이 언제야?'),
      '서귀포 근처 카페 알려줘': sample('서귀포 근처 카페 알려줘'),
    },
  });
}
