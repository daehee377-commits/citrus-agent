// 감귤 퀴즈: 오늘의 실제 예보와 병해충 도감 사진으로 문제를 낸다. 점수는 이 브라우저에만 저장한다(개인정보 없음).
import { useEffect, useState } from 'react';
import { fetchWeather, fetchPest } from '../api/client.js';
import { buildRound, rankOf } from '../lib/quiz.js';
import { Loading, ErrorBox } from '../components/Status.jsx';

const BEST_KEY = 'citrus-quiz-best';
const readBest = () => { try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; } };
const saveBest = (n) => { try { localStorage.setItem(BEST_KEY, String(n)); } catch { /* 저장이 막혀도 게임은 계속된다 */ } };

export default function Quiz() {
  const [data, setData] = useState(null); // { days, pests }
  const [error, setError] = useState('');
  const [round, setRound] = useState([]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(readBest);

  // 날씨와 병해충 중 하나만 실패해도 나머지로 게임을 연다
  useEffect(() => {
    Promise.allSettled([fetchWeather('제주시'), fetchPest('')]).then(([w, p]) => {
      const d = { days: w.status === 'fulfilled' ? w.value.days : [], pests: p.status === 'fulfilled' ? p.value.items : [] };
      const q = buildRound(d);
      if (!q.length) { setError((w.reason ?? p.reason)?.message ?? '문제를 만들 데이터를 가져오지 못했습니다.'); return; }
      setData(d); setRound(q);
    });
  }, []);

  const q = round[i];
  const done = data && i >= round.length;

  const answer = (opt) => {
    if (picked) return;
    setPicked(opt);
    if (opt === q.answer) { setScore((s) => s + 1); setStreak((s) => s + 1); } else setStreak(0);
  };
  const next = () => {
    const last = i + 1 >= round.length;
    if (last) { const final = score; if (final > best) { setBest(final); saveBest(final); } }
    setI(i + 1); setPicked(null);
  };
  const again = () => { setRound(buildRound(data)); setI(0); setPicked(null); setScore(0); setStreak(0); };

  return (
    <>
      <h2 className="mb-1">감귤 퀴즈</h2>
      <p className="notice mb-3">오늘의 제주 예보와 농촌진흥청 병해충 도감 사진으로 문제를 냅니다. 문제와 정답은 모두 실제 공공데이터에서 나옵니다.</p>

      {error && <ErrorBox message={error} />}
      {!data && !error && <Loading text="문제를 만드는 중..." />}

      {q && (
        <div className="card-soft p-3 p-md-4">
          <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
            <span className="pill pill-unknown">{i + 1} / {round.length}</span>
            <span className="pill pill-ok"><i className="bi bi-check2-circle" />{score}점</span>
            {streak >= 2 && <span className="pill pill-rain"><i className="bi bi-fire" />{streak}연속 정답</span>}
            <span className="ms-auto notice">최고 {best}점</span>
          </div>

          <h4 className="mb-2">{q.title}</h4>
          {q.kind === 'weather' && <p className="mb-2">{q.facts.join(' · ')}</p>}
          {q.kind === 'pest' && <img src={q.image} alt="병 사진" referrerPolicy="no-referrer" className="quiz-photo mb-2" />}
          <p className="fw-bold mb-2">{q.prompt}</p>

          <div className="row g-2">
            {q.options.map((o) => {
              const ok = picked && o === q.answer, bad = picked === o && o !== q.answer;
              return (
                <div className="col-6" key={o}>
                  <button type="button" disabled={!!picked} onClick={() => answer(o)}
                    className={`btn w-100 py-2 ${ok ? 'btn-success' : bad ? 'btn-danger' : 'btn-outline-secondary'}`}>{o}</button>
                </div>
              );
            })}
          </div>

          {picked && (
            <div className="mt-3">
              <p className="mb-2">{picked === q.answer ? '🎉 정답입니다!' : '😅 아쉬워요.'} {q.explain}</p>
              <button type="button" className="btn btn-citrus" onClick={next}>{i + 1 >= round.length ? '결과 보기' : '다음 문제'}</button>
            </div>
          )}
        </div>
      )}

      {done && (() => {
        const r = rankOf(score, round.length);
        return (
          <div className="card-soft p-4 text-center">
            <div className="display-4">{r.emoji}</div>
            <h3 className="mb-1">{r.title}</h3>
            <p className="mb-3">{round.length}문제 중 <strong>{score}문제</strong>를 맞혔어요. (최고 {best}점)</p>
            <button type="button" className="btn btn-citrus" onClick={again}><i className="bi bi-arrow-repeat me-1" />다시 하기</button>
          </div>
        );
      })()}
    </>
  );
}
