// 수확 체험: 날씨 API(기상청)의 "수확 가능 / 포장 작업만"에 따라 3D 감귤나무에서 열매를 딸 수 있는지가 정해진다.
import { useEffect, useState } from 'react';
import { fetchWeather } from '../api/client.js';
import Harvest3D, { FRUIT_COUNT } from '../components/Harvest3D.jsx';
import WorkPill from '../components/WorkPill.jsx';
import { Loading, ErrorBox } from '../components/Status.jsx';

const label = (d) => `${Number(d.slice(4, 6))}/${Number(d.slice(6, 8))}`;

export default function Harvest() {
  const [days, setDays] = useState(null);
  const [error, setError] = useState('');
  const [idx, setIdx] = useState(0);
  const [count, setCount] = useState(0);
  const [picked, setPicked] = useState(null);
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => { fetchWeather('제주시').then((r) => setDays(r.days)).catch((e) => setError(e.message)); }, []);

  const day = days?.[idx];
  const raining = day?.work === '포장 작업만';
  const reset = () => { setCount(0); setPicked(null); setResetKey((k) => k + 1); };
  const pickDay = (i) => { setIdx(i); reset(); };

  return (
    <>
      <h2 className="mb-1">3D 수확 체험</h2>
      <p className="notice mb-3">열매를 눌러 하나씩 따거나 &quot;한 번에 수확&quot;을 눌러 보세요. 날씨 API가 비 예보(강수확률 60% 이상)인 날에는 수확을 할 수 없고, 천막 아래에서 포장 작업만 합니다.</p>
      {error && <ErrorBox message={error} />}
      {!days && !error && <Loading text="날씨를 불러오는 중..." />}
      {days && (
        <>
          <div className="d-flex flex-wrap gap-2 mb-3">
            {days.map((d, i) => (
              <button key={d.date} className={`btn btn-sm ${i === idx ? 'btn-leaf' : 'btn-outline-secondary'}`} onClick={() => pickDay(i)}>
                {label(d.date)} {d.work === '포장 작업만' ? '🌧' : '☀'}
              </button>
            ))}
          </div>
          <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
            <WorkPill work={day.work} />
            <span className="notice">{day.why}</span>
            <span className="ms-auto fw-bold"><i className="bi bi-basket me-1 text-warning" />수확한 감귤 {count} / {FRUIT_COUNT}개</span>
          </div>
          <Harvest3D raining={raining} picked={picked} resetKey={resetKey} onPick={() => setCount((c) => c + 1)} />
          <div className="d-flex flex-wrap gap-2 mt-3">
            <button className="btn btn-citrus" disabled={raining || count >= FRUIT_COUNT} onClick={() => setPicked({ all: true, stamp: Date.now() })}><i className="bi bi-basket me-1" />한 번에 수확</button>
            <button className="btn btn-outline-secondary" onClick={reset}><i className="bi bi-arrow-counterclockwise me-1" />다시 열매 달기</button>
          </div>
          {raining && <p className="notice mt-2 mb-0">이 날은 비 예보라 수확하지 않습니다. 천막 안에서 포장 작업만 합니다.</p>}
          <p className="notice mt-2 mb-0">기상청 단기예보(제주시) 기준 · 나무와 열매는 단순화한 그림입니다.</p>
        </>
      )}
    </>
  );
}
