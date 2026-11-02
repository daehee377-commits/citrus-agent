// POST /api/chat — 질문을 받아 에이전트를 실행하고, 도구 호출 알림과 최종 답을 줄 단위 JSON(NDJSON)으로 흘려 보낸다.
import { runAgent } from '../agent/run.js';
import { checkAndCount } from '../server/limit.js';

// 사용자에게 보여 줄 오류 문구 (원문에 키나 내부 정보가 섞이지 않게 여기서 바꾼다)
function friendly(e) {
  const m = String(e?.message ?? e);
  if (/429|RESOURCE_EXHAUSTED|quota|rate/i.test(m)) return 'AI의 무료 사용량 한도에 걸렸습니다. 잠시(1~2분) 뒤 다시 시도해 주세요.';
  if (/503|overloaded|UNAVAILABLE/i.test(m)) return 'AI 서버가 바쁩니다. 잠시 뒤 다시 시도해 주세요.';
  if (/질문|입력/.test(m)) return m; // 우리가 만든 쉬운 한국어 안내는 그대로
  return '답변을 만드는 중 문제가 생겼습니다. 잠시 뒤 다시 시도해 주세요.';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST 로만 쓸 수 있습니다.' });
  const { question, history } = req.body ?? {};
  const ip = String(req.headers['x-forwarded-for'] ?? req.socket?.remoteAddress ?? 'unknown').split(',')[0].trim();
  const sessionId = String(req.headers['x-session-id'] ?? 'none').slice(0, 64);

  const q = String(question ?? '').trim();
  if (!q) return res.status(400).json({ error: '질문을 입력해 주세요.' });
  if (q.length > 300) return res.status(400).json({ error: '질문이 너무 깁니다. 300자 이내로 줄여 주세요.' });

  const limit = checkAndCount({ sessionId, ip });
  if (!limit.ok) return res.status(429).json({ error: limit.reason });

  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  const send = (o) => res.write(JSON.stringify(o) + '\n');
  const calls = []; // 호출 내역: { name, arg, count }
  const brief = (a = {}) => String(a.query ?? a.placeName ?? a.name ?? a.place ?? a.region ?? '').slice(0, 24); // originText 같은 개인정보성 값은 보여 주지 않는다
  const countOf = (out) => { try { const j = JSON.parse(out); return Array.isArray(j) ? j.length : Array.isArray(j.days) ? j.days.length : Array.isArray(j.items) ? j.items.length : Array.isArray(j.diseases) ? j.diseases.length : Array.isArray(j.reviews) ? j.reviews.length : null; } catch { return null; } };
  const places = new Map(); // 저장 버튼용 후보: 장소명·방문/배송 구분·규모만 보낸다 (주소·전화번호는 보내지 않는다)
  try {
    const r = await runAgent({
      question: q,
      history: Array.isArray(history) ? history : [],
      onTool: (name, args) => { calls.push({ name, arg: brief(args), count: null }); send({ type: 'tool', name, arg: brief(args) }); },
      onResult: (name, out) => {
        const last = [...calls].reverse().find((x) => x.name === name && x.count === null); if (last) last.count = countOf(out);
        if (name !== 'search_places') return;
        try {
          for (const p of JSON.parse(out)) if (p?.name && places.size < 10) places.set(p.name, { name: p.name, mode: p.regionMode ?? '확인 필요', size: p.buyerSize ?? '확인 필요' });
        } catch { /* 오류 응답이면 후보 없음 */ }
      },
    });
    send({ type: 'answer', answer: r.answer, toolCalls: r.toolCalls, calls, remaining: limit.remaining, places: [...places.values()] });
  } catch (e) {
    send({ type: 'error', message: friendly(e) });
  }
  res.end();
}
