import { useEffect, useState } from 'react';
import { fetchWeather, fetchPrice, fetchPest } from '../api/client.js';
import WorkPill from '../components/WorkPill.jsx';
import { Loading, ErrorBox } from '../components/Status.jsx';

const fmtDate = (d) => `${Number(d.slice(4, 6))}/${Number(d.slice(6, 8))}`;
const won = (n) => (n == null ? '-' : `${n.toLocaleString()}원`);

function Weather() {
  const [place, setPlace] = useState('제주시');
  const [state, setState] = useState({ loading: true });
  useEffect(() => {
    setState({ loading: true });
    fetchWeather(place).then((r) => setState({ days: r.days })).catch((e) => setState({ error: e.message }));
  }, [place]);

  return (
    <section className="card-soft p-4 mb-4">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <h4 className="mb-0"><i className="bi bi-cloud-sun me-2 text-warning" />수확 일정 (기상청 단기예보)</h4>
        <div className="btn-group">
          {['제주시', '서귀포시'].map((p) => (
            <button key={p} className={`btn btn-sm ${place === p ? 'btn-leaf' : 'btn-outline-secondary'}`} onClick={() => setPlace(p)}>{p}</button>
          ))}
        </div>
      </div>
      {state.loading && <Loading />}
      {state.error && <ErrorBox message={state.error} />}
      {state.days && (
        <>
          <div className="d-flex gap-3 overflow-auto pb-2">
            {state.days.map((d) => (
              <div className="day-card" key={d.date}>
                <div className="fw-bold">{fmtDate(d.date)}</div>
                <div className="notice">{d.sky} · {d.tmn ?? '?'}~{d.tmx ?? '?'}℃</div>
                <div className="notice mb-2">강수확률 최대 {d.maxPop ?? '?'}%</div>
                <WorkPill work={d.work} />
              </div>
            ))}
          </div>
          <p className="notice mt-2 mb-0">비가 오면 수확은 못 하고 천막 안 포장 작업만 합니다. 강수확률 60% 이상이면 비로 봅니다. 기온의 ?는 기상청이 값을 주지 않은 경우입니다.</p>
        </>
      )}
    </section>
  );
}

function Price() {
  const [state, setState] = useState({ loading: true });
  useEffect(() => { fetchPrice().then((r) => setState({ data: r })).catch((e) => setState({ error: e.message })); }, []);
  const d = state.data;
  return (
    <section className="card-soft p-4 mb-4">
      <h4><i className="bi bi-graph-up-arrow me-2 text-warning" />도매 시세 (공영도매시장 정산정보)</h4>
      {state.loading && <Loading />}
      {state.error && <ErrorBox message={state.error} />}
      {d && (
        <>
          <p className="notice">{d.market}시장 · {d.date} 거래 · 산지 {d.origin}</p>
          <div className="table-responsive">
            <table className="table align-middle mb-2">
              <thead><tr><th>품종</th><th className="text-end">kg당 (중앙값)</th><th className="text-end">10kg 환산(추정)</th><th className="text-end">10kg 실거래</th><th className="text-end">전 거래일 대비</th></tr></thead>
              <tbody>
                {d.items.map((i) => (
                  <tr key={i.name}>
                    <td className="fw-bold">{i.name} <span className="notice">({i.rows}건)</span></td>
                    <td className="text-end">{won(i.perKgAvg)}</td>
                    <td className="text-end">{won(i.per10kgEstimate)}</td>
                    <td className="text-end">{i.box10Actual ? `${won(i.box10Actual.price)} (${i.box10Actual.rows}건)` : '없음'}</td>
                    <td className={`text-end ${i.changeVsPrev?.perKgDiff > 0 ? 'text-danger' : 'text-primary'}`}>
                      {i.changeVsPrev ? `${i.changeVsPrev.perKgDiff > 0 ? '+' : ''}${i.changeVsPrev.perKgDiff.toLocaleString()}원/kg` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="notice mb-0">{d.note} 10kg 환산은 추정이며 실거래가 있으면 실거래를 우선하세요. 거래 건수가 1~2건이면 표본이 적습니다.</p>
        </>
      )}
    </section>
  );
}

function Pest() {
  const [list, setList] = useState(null);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { fetchPest().then(setList).catch((e) => setError(e.message)); }, []);

  async function open(name) {
    setBusy(true); setError('');
    try { setDetail(await fetchPest(name)); } catch (e) { setError(e.message); }
    setBusy(false);
  }

  return (
    <section className="card-soft p-4 mb-4">
      <h4><i className="bi bi-bug me-2 text-warning" />감귤 병해충 도감 (농촌진흥청)</h4>
      {!list && !error && <Loading />}
      {error && <ErrorBox message={error} />}
      {list && (
        <>
          <div className="d-flex flex-wrap gap-2 mb-3">
            {list.diseases.map((n) => (
              <button key={n} className={`btn btn-sm ${detail?.name === n ? 'btn-leaf' : 'btn-outline-secondary'}`} onClick={() => open(n)}>{n}</button>
            ))}
          </div>
          {busy && <Loading />}
          {detail && !busy && (
            <div>
              <h5>{detail.name}</h5>
              <p className="mb-2"><strong>증상</strong><br /><span style={{ whiteSpace: 'pre-line' }}>{detail.symptoms}</span></p>
              <p className="mb-2"><strong>방제 방법</strong><br /><span style={{ whiteSpace: 'pre-line' }}>{detail.prevention}</span></p>
              <p className="notice mb-0">{detail.note} 출처: {detail.source}</p>
            </div>
          )}
          {!detail && <p className="notice mb-0">병 이름을 눌러 증상과 방제 방법을 확인하세요. (총 {list.total}종)</p>}
        </>
      )}
    </section>
  );
}

export default function Today() {
  return (
    <>
      <h2 className="mb-1">오늘 현황</h2>
      <p className="notice mb-4">날씨·시세·병해충을 공공 데이터로 직접 확인합니다.</p>
      <Weather />
      <Price />
      <Pest />
    </>
  );
}
