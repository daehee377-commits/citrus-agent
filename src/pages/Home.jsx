import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchWeather } from '../api/client.js';
import WorkPill from '../components/WorkPill.jsx';

const fmtDate = (d) => `${Number(d.slice(4, 6))}/${Number(d.slice(6, 8))}`;

export default function Home() {
  const [today, setToday] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    fetchWeather('제주시').then((r) => setToday(r.days[0])).catch((e) => setErr(e.message));
  }, []);

  return (
    <>
      <section className="hero hero-photo p-4 p-md-5 mb-4">
        <p className="notice mb-2">제주 유기농 감귤 농가를 위한 AI 비서</p>
        <h1 className="display-6 mb-3">맑은 날엔 수확하고,<br />비 오는 날엔 포장하고,<br />팔 곳은 AI가 찾아드립니다.</h1>
        <p className="mb-4">날씨·도매시세·병해충을 확인하고, 제주와 서울의 카페·식당·마켓 중 감귤을 살 만한 곳과 첫 연락 문자까지 준비합니다.</p>
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <Link to="/agent" className="btn btn-citrus btn-lg"><i className="bi bi-chat-dots me-2" />판로 비서에게 물어보기</Link>
          <Link to="/today" className="btn btn-outline-dark btn-lg">오늘 현황 보기</Link>
          {today && (
            <span className="ms-md-3">
              오늘({fmtDate(today.date)}) 제주시: <WorkPill work={today.work} />
            </span>
          )}
          {err && <span className="notice">날씨를 불러오지 못했습니다.</span>}
        </div>
      </section>

      <div className="row g-3">
        {[
          ['citrus-3.jpg', '수확 일정', '강수확률 60% 이상이면 "포장 작업만"으로 알려 드려요. 비 오는 날은 천막 안 포장 작업입니다.'],
          ['citrus-4.jpg', '도매 시세', '서울가락시장 제주산 감귤을 품종별로, 10kg 박스 기준으로 보여 드려요. (도매 정산가, 참고용)'],
          ['citrus-7.jpg', '제주는 방문, 서울은 택배', '구매처 주소를 보고 샘플 전달 방문과 택배 발송 방식을 자동으로 나눠 제안해요.'],
        ].map(([img, title, desc]) => (
          <div className="col-md-4" key={title}>
            <div className="card-soft h-100 overflow-hidden">
              <img src={`/images/${img}`} alt="" className="card-photo" loading="lazy" />
              <div className="p-4">
                <h5>{title}</h5>
                <p className="notice mb-0">{desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
