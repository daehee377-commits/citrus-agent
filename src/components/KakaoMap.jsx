// 카카오(다음) 지도: 판로 비서가 찾은 가게들을 지도 위에 표시한다. JavaScript 키가 없으면 아무것도 그리지 않는다.
// 키는 브라우저에 들어가는 공개용이며, 카카오 개발자 사이트에 등록한 사이트 주소에서만 동작한다.
import { useEffect, useMemo, useRef, useState } from 'react';

const KEY = import.meta.env.VITE_KAKAO_JS_KEY;
export const kakaoMapReady = Boolean(KEY);

let loader;
function loadSdk() {
  if (window.kakao?.maps?.LatLng) return Promise.resolve(window.kakao);
  loader ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KEY}&autoload=false`;
    s.onload = () => window.kakao.maps.load(() => resolve(window.kakao));
    s.onerror = () => { loader = null; reject(new Error('카카오 지도를 불러오지 못했습니다. 키와 등록한 사이트 주소를 확인하세요.')); };
    document.head.appendChild(s);
  });
  return loader;
}

function MapBox({ pts, title }) {
  const box = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!kakaoMapReady || !pts.length || !box.current) return undefined;
    let cancelled = false;
    loadSdk().then((kakao) => {
      if (cancelled || !box.current) return;
      const map = new kakao.maps.Map(box.current, { center: new kakao.maps.LatLng(pts[0].lat, pts[0].lng), level: 5 });
      const bounds = new kakao.maps.LatLngBounds();
      pts.forEach((p) => {
        const pos = new kakao.maps.LatLng(p.lat, p.lng);
        bounds.extend(pos);
        new kakao.maps.Marker({ map, position: pos, title: p.name });
        const label = document.createElement('div');
        label.className = 'kmap-label';
        label.textContent = p.name; // 가게 이름은 글자로만 넣는다 (HTML 로 해석하지 않음)
        new kakao.maps.CustomOverlay({ map, position: pos, content: label, yAnchor: 2.3 });
      });
      if (pts.length > 1) map.setBounds(bounds);
    }).catch((e) => setError(e.message));
    return () => { cancelled = true; };
  }, [pts]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mt-3">
      <div className="notice mb-1"><i className="bi bi-geo-alt me-1" />{title} ({pts.length}곳, 카카오 지도)</div>
      {error ? <div className="text-danger notice">{error}</div> : <div ref={box} className="kmap" role="img" aria-label="찾은 가게들의 지도" />}
    </div>
  );
}

// 제주와 서울처럼 멀리 떨어진 가게는 한 지도에 담으면 점이 보이지 않으므로 지역별로 지도를 따로 그린다
export default function KakaoMap({ places = [] }) {
  const pts = useMemo(() => places.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng)), [places]);
  if (!kakaoMapReady || !pts.length) return null;
  const jeju = pts.filter((p) => p.lat < 34), other = pts.filter((p) => p.lat >= 34);
  return (
    <>
      {jeju.length > 0 && <MapBox pts={jeju} title="제주 지역" />}
      {other.length > 0 && <MapBox pts={other} title="제주 밖 지역" />}
    </>
  );
}
