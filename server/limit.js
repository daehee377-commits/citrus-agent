// 사용량 제한: 사용자(세션·IP)별 하루 질문 횟수와 서비스 전체 하루 상한을 센다.
// 지금은 서버 메모리에 센다. 서버가 다시 시작되거나 여러 대로 나뉘면 숫자가 초기화될 수 있어 "대략적인 방어"다.
// (Supabase 연결 후 usage 테이블로 옮기면 더 정확해진다.)
export const DAILY_PER_USER = 20; // 사용자당 하루 질문 수 (확정)
export const DAILY_TOTAL = 300;   // 서비스 전체 하루 상한 (무료 한도 보호용 임시값, 한도 확인 후 조정)

const counts = new Map();
const today = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);

export function checkAndCount({ sessionId, ip }) {
  const day = today();
  for (const k of counts.keys()) if (!k.startsWith(day)) counts.delete(k); // 지난 날짜 정리
  const keys = { user: `${day}|s|${sessionId}`, ip: `${day}|i|${ip}`, all: `${day}|all` };
  const used = { user: counts.get(keys.user) ?? 0, ip: counts.get(keys.ip) ?? 0, all: counts.get(keys.all) ?? 0 };
  if (used.all >= DAILY_TOTAL) return { ok: false, reason: '오늘 이 서비스의 전체 사용량이 다 찼습니다. 내일 다시 이용해 주세요.' };
  if (used.user >= DAILY_PER_USER || used.ip >= DAILY_PER_USER) return { ok: false, reason: `하루 질문 ${DAILY_PER_USER}회를 모두 사용했습니다. 내일 다시 이용해 주세요.` };
  for (const k of Object.values(keys)) counts.set(k, (counts.get(k) ?? 0) + 1);
  return { ok: true, remaining: DAILY_PER_USER - used.user - 1 };
}
