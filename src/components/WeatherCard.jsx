// 날짜별 날씨 카드: 하늘 사진 위에 날짜·날씨를 얹고, 아래에 기온·강수확률 막대·작업 판단을 보여 준다.
import WorkPill from './WorkPill.jsx';

const DAY = ['일', '월', '화', '수', '목', '금', '토'];
const SKY_PHOTO = { 맑음: 'sunny', 구름많음: 'partly', 흐림: 'cloudy' };

// 비 예보(강수확률 60% 이상 또는 비 시간대)면 비 사진, 아니면 하늘 상태 사진
const photoOf = (d) => (d.work === '포장 작업만' || d.rainHours > 0 ? 'rain' : SKY_PHOTO[d.sky] ?? 'partly');

function dateParts(ymd) {
  const y = Number(ymd.slice(0, 4)), m = Number(ymd.slice(4, 6)), day = Number(ymd.slice(6, 8));
  return { label: `${m}/${day}`, weekday: DAY[new Date(y, m - 1, day).getDay()] };
}

export default function WeatherCard({ day }) {
  const { label, weekday } = dateParts(day.date);
  const photo = photoOf(day);
  const rainy = day.work === '포장 작업만';
  const pop = day.maxPop ?? 0;
  const temp = day.tmx != null && day.tmn != null ? `${day.tmn}° ~ ${day.tmx}°` : day.tmx != null ? `최고 ${day.tmx}°` : day.tmn != null ? `최저 ${day.tmn}°` : '기온 정보 없음';

  return (
    <article className="wcard" aria-label={`${label} ${day.sky}, ${day.work}`}>
      <div className="wcard-photo" style={{ backgroundImage: `url(/images/weather-${photo}.jpg)` }}>
        <div className="wcard-date">{label}<span> {weekday}</span></div>
        <div className="wcard-sky">{rainy && day.sky !== '흐림' ? `${day.sky} · 비 예보` : day.sky}</div>
      </div>
      <div className="wcard-body">
        <div className="wcard-temp">{temp}</div>
        <div className="wcard-pop">
          <div className="d-flex justify-content-between notice"><span>강수확률</span><strong>{day.maxPop ?? '?'}%</strong></div>
          <div className="wbar" role="img" aria-label={`강수확률 ${pop}%`}><div className={`wbar-fill ${rainy ? 'is-rain' : ''}`} style={{ width: `${pop}%` }} /></div>
        </div>
        <WorkPill work={day.work} />
      </div>
    </article>
  );
}
