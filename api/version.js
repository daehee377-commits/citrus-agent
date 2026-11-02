// GET /api/version — 지금 배포가 어느 커밋인지 알려 준다 (Vercel 이 배포 때 넣어 주는 값, 비밀 정보 아님)
export default function handler(req, res) {
  res.status(200).json({
    commit: (process.env.VERCEL_GIT_COMMIT_SHA ?? 'local').slice(0, 7),
    message: process.env.VERCEL_GIT_COMMIT_MESSAGE ?? '',
    env: process.env.VERCEL_ENV ?? 'local',
  });
}
