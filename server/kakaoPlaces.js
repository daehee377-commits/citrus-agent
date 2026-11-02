// 도구 1: search_places — 카카오 로컬 API 로 장소를 키워드 검색한다 (이름, 주소, 전화, 지도 링크).
// 주제와 무관한 일반 도구다. 무엇을 찾을지는 query(검색어)로 정한다.
const URL = 'https://dapi.kakao.com/v2/local/search/keyword.json';

export async function searchPlaces({ query, near, radius = 20000, size = 10 } = {}) {
  const key = process.env.KAKAO_REST_KEY;
  if (!key) throw new Error('카카오 키가 없습니다. .env.local 의 KAKAO_REST_KEY 를 확인해 주세요.');
  if (!query || !String(query).trim()) throw new Error('검색어(query)를 넣어 주세요.');

  const params = new URLSearchParams({ query: String(query).slice(0, 100), size: String(Math.min(size, 15)) });
  if (near) { // 기준 좌표가 있으면 가까운 순으로 찾는다
    params.set('x', String(near.lng)); params.set('y', String(near.lat));
    params.set('radius', String(radius)); params.set('sort', 'distance');
  }

  let r;
  try {
    r = await fetch(`${URL}?${params}`, { headers: { Authorization: `KakaoAK ${key}` }, signal: AbortSignal.timeout(10000) });
  } catch {
    throw new Error('카카오 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  }
  if (r.status === 401) throw new Error('카카오 키가 올바르지 않습니다. REST API 키를 다시 확인해 주세요.');
  if (r.status === 403) throw new Error('카카오맵 사용 설정이 꺼져 있습니다. 카카오 개발자 사이트의 앱 설정에서 카카오맵을 켜 주세요.');
  if (r.status === 429) throw new Error('카카오 무료 사용량을 넘었거나 요청이 너무 많습니다. 잠시 뒤에 다시 시도하거나 내일 다시 해 주세요.');
  if (!r.ok) throw new Error(`카카오 서버 오류 (HTTP ${r.status})`);

  const data = await r.json();
  return (data.documents ?? []).map((p) => ({
    name: p.place_name,
    category: p.category_name,
    address: p.road_address_name || p.address_name,
    phone: p.phone || '확인 필요',
    mapUrl: p.place_url,
    lat: Number(p.y), lng: Number(p.x),
    distanceM: p.distance ? Number(p.distance) : null,
  }));
}
