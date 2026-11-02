// GET /api/version — 지금 배포가 어느 커밋인지, 질문 분류 코드가 어떻게 판단하는지 알려 준다 (비밀 정보 없음)
import { detectIntents } from '../agent/router.js';

export default function handler(req, res) {
  const sample = (q) => detectIntents(q).map((i) => i.name);
  res.status(200).json({
    commit: (process.env.VERCEL_GIT_COMMIT_SHA ?? 'local').slice(0, 7),
    env: process.env.VERCEL_ENV ?? 'local',
    routing: {
      '요즘 감귤 시세 어때?': sample('요즘 감귤 시세 어때?'),
      '이번 주 수확 가능한 날이 언제야?': sample('이번 주 수확 가능한 날이 언제야?'),
      '서귀포 근처 카페 알려줘': sample('서귀포 근처 카페 알려줘'),
    },
  });
}
