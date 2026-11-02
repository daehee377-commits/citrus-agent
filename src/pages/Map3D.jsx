// 3D 지도: 날씨 API(제주시·서귀포시) 값에 따라 핀과 날씨가 바뀐다. 날짜 버튼으로 5일을 넘겨 볼 수 있다.
import { useEffect, useState } from 'react';
import { fetchWeather } from '../api/client.js';
import Jeju3D from '../components/Jeju3D.jsx';
import { Loading, ErrorBox } from '../components/Status.jsx';

const label = (d) => `${Number(d.slice(4, 6))}/${Number(d.slice(6, 8))}`;

export default function Map3D() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    Promise.all(['제주시', '서귀포시'].map((p) => fetchWeather(p).then((r) => [p, r.days])))
      .then((rows) => setData(Object.fromEntries(rows)))
      .catch((e) => setError(e.message));
  }, []);

  const days = data?.['제주시'] ?? [];
  const byPlace = data ? Object.fromEntries(Object.entries(data).map(([p, d]) => [p, d[idx]])) : {};
  const raining = Object.values(byPlace).some((d) => d?.work === '포장 작업만');

  return (
    <>
      <h2 className="mb-1">3D 날씨 지도</h2>
      <p className="notice mb-3">마우스로 돌리고 확대해 보세요. 날씨 API 값에 따라 핀이 바뀝니다. 수확 가능한 날은 초록 핀과 감귤, 비 예보인 날은 파란 핀과 천막, 그리고 빗방울이 내립니다.</p>
      {error && <ErrorBox message={error} />}
      {!data && !error && <Loading text="날씨를 불러오는 중..." />}
      {data && (
        <>
          <div className="d-flex flex-wrap gap-2 mb-3">
            {days.map((d, i) => (
              <button key={d.date} className={`btn btn-sm ${i === idx ? 'btn-leaf' : 'btn-outline-secondary'}`} onClick={() => setIdx(i)}>
                {label(d.date)} {d.work === '포장 작업만' ? '🌧' : '☀'}
              </button>
            ))}
          </div>
          <Jeju3D byPlace={byPlace} raining={raining} />
          <p className="notice mt-2 mb-0">기상청 단기예보 · 핀 위치는 제주시청·서귀포시청 부근, 한라산 모양은 단순화한 것입니다.</p>
        </>
      )}
    </>
  );
}
