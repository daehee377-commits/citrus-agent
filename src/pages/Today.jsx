import { useEffect, useState } from 'react';
import { fetchWeather, fetchPrice, fetchPest } from '../api/client.js';
import WeatherCard from '../components/WeatherCard.jsx';
import { Loading, ErrorBox } from '../components/Status.jsx';
import { JEJU_AREAS } from '../../server/jejuAreas.js'; // 이름 목록만 담긴 파일이라 브라우저에서 써도 안전하다

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
        <select className="form-select form-select-sm w-auto" value={place} onChange={(e) => setPlace(e.target.value)} aria-label="지역 선택">
          <option value="제주시">제주시 (전체)</option>
          <option value="서귀포시">서귀포시 (전체)</option>
          {Object.entries(JEJU_AREAS).map(([city, list]) => (
            <optgroup key={city} label={`${city} 읍·면·동`}>
              {list.map((a) => <option key={a} value={a}>{a}</option>)}
            </optgroup>
          ))}
        </select>
      </div>
      {state.loading && <Loading />}
      {state.error && <ErrorBox message={state.error} />}
      {state.days && (
        <>
          <div className="wgrid">
            {state.days.map((d) => <WeatherCard key={d.date} day={d} />)}
          </div>
          <p className="notice mt-3 mb-0">비가 오면 수확은 못 하고 천막 안 포장 작업만 합니다. 강수확률 60% 이상이면 비로 봅니다. 기온은 기상청이 값을 주지 않은 날에는 있는 값만 보여 줍니다. 예보는 5km 격자 단위라 이웃한 동은 같은 값이 나올 수 있습니다.</p>
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
          <div className="pgrid mb-3">
            {(list.items ?? list.diseases.map((n) => ({ name: n }))).map((it) => (
              <button key={it.name} className={`pcard ${detail?.name === it.name ? 'is-active' : ''}`} onClick={() => open(it.name)} aria-label={`${it.name} 보기`}>
                <span className="pthumb"><i className="bi bi-image" />{it.thumb && <img src={it.thumb} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}</span>
                <span className="pcard-name">{it.name}</span>
              </button>
            ))}
          </div>
          {busy && <Loading />}
          {detail && !busy && (
            <div>
              <h5>{detail.name}</h5>
              {detail.images?.length > 0 && (
                <div className="pgallery mb-3">
                  {detail.images.map((im, i) => (
                    <a key={i} href={im.url} target="_blank" rel="noreferrer noopener" className="pshot">
                      <img src={im.url} alt={im.title || `${detail.name} 사진`} loading="lazy" referrerPolicy="no-referrer" />
                      {im.title && <span>{im.title}</span>}
                    </a>
                  ))}
                </div>
              )}
              <p className="mb-2"><strong>증상</strong><br /><span style={{ whiteSpace: 'pre-line' }}>{detail.symptoms}</span></p>
              <p className="mb-2"><strong>방제 방법</strong><br /><span style={{ whiteSpace: 'pre-line' }}>{detail.prevention}</span></p>
              <p className="notice mb-0">{detail.note} 사진·내용 출처: {detail.source}</p>
            </div>
          )}
          {!detail && <p className="notice mb-0">병 사진을 눌러 증상·방제 방법과 병징 사진을 확인하세요. (총 {list.total}종 · 사진 출처: 농촌진흥청 국가농작물병해충관리시스템)</p>}
        </>
      )}
    </section>
  );
}

export default function Today() {
  return (
    <>
      <div className="banner-photo">
        <h2>오늘 현황</h2>
        <p className="notice mb-0">날씨·시세·병해충을 공공 데이터로 직접 확인합니다.</p>
      </div>
      <Weather />
      <Price />
      <Pest />
    </>
  );
}
