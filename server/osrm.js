// 도구 3: get_travel_time — 두 지점 사이 자동차 이동시간(분)과 거리(km)를 계산한다.
// OSRM 공개 데모 서버를 사용한다 (키 불필요). 데모 서버는 시연용이라 호출을 많이 하면 막힐 수 있다.
// 주제(감귤)와 무관하게 "좌표 → 좌표" 만 다루므로 다른 주제에서도 그대로 재사용할 수 있다.
const BASE = 'https://router.project-osrm.org/route/v1/driving';

// 위도(lat)·경도(lng)가 올바른 숫자인지 확인한다
function checkPoint(p, name) {
  if (!p || typeof p.lat !== 'number' || typeof p.lng !== 'number' ||
      Math.abs(p.lat) > 90 || Math.abs(p.lng) > 180) {
    throw new Error(`${name} 좌표가 올바르지 않습니다. { lat: 숫자, lng: 숫자 } 형태로 넣어 주세요.`);
  }
}

export async function getTravelTime({ from, to } = {}) {
  checkPoint(from, '출발지');
  checkPoint(to, '도착지');

  // OSRM 은 "경도,위도" 순서다 (위도,경도가 아님에 주의!)
  const url = `${BASE}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`;
  let r;
  try {
    r = await fetch(url, { signal: AbortSignal.timeout(10000) });
  } catch {
    throw new Error('이동시간 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  }
  if (r.status === 429) throw new Error('이동시간 서버가 요청이 많아 잠시 막았습니다. 잠시 후 다시 시도해 주세요.');
  if (!r.ok) throw new Error(`이동시간 서버 오류 (HTTP ${r.status})`);

  const data = await r.json();
  const route = data?.routes?.[0];
  if (data.code !== 'Ok' || !route) throw new Error('두 지점 사이의 길을 찾지 못했습니다.');
  return {
    minutes: Math.round(route.duration / 60),
    km: Math.round(route.distance / 100) / 10, // 소수 첫째 자리
  };
}
