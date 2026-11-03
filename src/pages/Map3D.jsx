// 3D 지도: 제주시·서귀포시와 9개 읍·면의 기상청 예보에 따라 핀과 날씨가 바뀐다. 날짜 버튼으로 5일을 넘겨 보고, 핀을 눌러 지역별 상세를 본다.
import { useEffect, useState } from 'react';
import { fetchWeather } from '../api/client.js';
import Jeju3D, { PLACES } from '../components/Jeju3D.jsx';
import WorkPill from '../components/WorkPill.jsx';
import SketchfabModels from '../components/SketchfabModels.jsx';
import { Loading, ErrorBox } from '../components/Status.jsx';

const label = (d) => `${Number(d.slice(4, 6))}/${Number(d.slice(6, 8))}`;

export default function Map3D() {
  const [data, setData] = useState(null); // { 지역이름: 날짜별 예보 배열 }
  const [error, setError] = useState('');
  const [idx, setIdx] = useState(0);
  const [sel, setSel] = useState('제주시');

  // 한두 지역을 못 가져와도 나머지로 지도를 그린다 (못 가져온 핀은 회색)
  // 먼저 도착한 지역부터 바로 지도에 반영한다 (11곳이 모두 올 때까지 빈 화면으로 기다리지 않는다)
  const [pending, setPending] = useState(PLACES.length);
  useEffect(() => {
    let alive = true, failed = 0, firstError = '';
    PLACES.forEach((p) => {
      fetchWeather(p.name)
        .then((r) => { if (alive) setData((d) => ({ ...(d ?? {}), [p.name]: r.days })); })
        .catch((e) => { failed += 1; firstError ||= e.message; })
        .finally(() => { if (alive) { setPending((n) => n - 1); if (failed === PLACES.length) setError(firstError || '날씨를 불러오지 못했습니다.'); } });
    });
    return () => { alive = false; };
  }, []);

  const days = data?.['제주시'] ?? Object.values(data ?? {})[0] ?? [];
  const byPlace = data ? Object.fromEntries(Object.entries(data).map(([p, d]) => [p, d[idx]])) : {};
  const shown = Object.values(byPlace).filter(Boolean);
  const okCount = shown.filter((d) => d.work === '수확 가능').length;
  const rainCount = shown.filter((d) => d.work === '포장 작업만').length;
  const missing = pending > 0 ? 0 : PLACES.length - shown.length;
  const raining = rainCount > 0;
  const cur = byPlace[sel];

  return (
    <>
      <h2 className="mb-1">3D 날씨 지도</h2>
      <p className="notice mb-3">마우스로 돌리고 확대하고, 핀을 눌러 지역을 골라 보세요. 수확 가능한 날은 초록 핀과 감귤, 비 예보인 날은 파란 핀과 천막, 그리고 빗방울이 내립니다.</p>
      {error && <ErrorBox message={error} />}
      {!data && !error && <Loading text="제주 11개 지역의 날씨를 불러오는 중..." />}
      {data && (
        <>
          <div className="d-flex flex-wrap gap-2 mb-2">
            {days.map((d, i) => (
              <button key={d.date} className={`btn btn-sm ${i === idx ? 'btn-leaf' : 'btn-outline-secondary'}`} onClick={() => setIdx(i)}>
                {label(d.date)} {d.work === '포장 작업만' ? '🌧' : '☀'}
              </button>
            ))}
          </div>
          <div className="d-flex flex-wrap gap-2 mb-3">
            <span className="pill pill-ok"><i className="bi bi-basket" />수확 가능 {okCount}곳</span>
            <span className="pill pill-rain"><i className="bi bi-umbrella" />포장 작업만 {rainCount}곳</span>
            {pending > 0 && <span className="pill pill-unknown"><i className="bi bi-arrow-repeat" />{PLACES.length - pending}/{PLACES.length}곳 불러오는 중</span>}
            {missing > 0 &&<span className="pill pill-unknown"><i className="bi bi-question-circle" />예보 없음 {missing}곳</span>}
          </div>
          <Jeju3D byPlace={byPlace} raining={raining} selected={sel} onSelect={setSel} />
          <div className="card-soft p-3 mt-3">
            {cur ? (
              <>
                <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                  <h5 className="mb-0">{sel}</h5><span className="notice">{label(cur.date)}</span><WorkPill work={cur.work} />
                </div>
                <div>{cur.sky ?? '하늘 정보 없음'} · 기온 {cur.tmn ?? '?'}~{cur.tmx ?? '?'}℃ · 강수확률 최대 {cur.maxPop ?? '?'}%{cur.rainHours ? ` · 비 오는 시간 ${cur.rainHours}시간` : ''}</div>
                {cur.why && <div className="notice mt-1">{cur.why}</div>}
              </>
            ) : <div className="notice">{sel}의 예보를 가져오지 못했습니다. 다른 지역을 눌러 보세요.</div>}
          </div>
          <SketchfabModels />
          <p className="notice mt-2 mb-0">기상청 단기예보(5km 격자) · 지형: 공개 고도 자료(AWS Terrain Tiles, SRTM 등)로 만든 실제 높이이고 높이는 2배쯤 과장했습니다 · 핀 위치는 대략적인 위치입니다. 이웃한 지역은 같은 값이 나올 수 있습니다.</p>
        </>
      )}
    </>
  );
}
