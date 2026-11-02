// 도구 2: get_weather — 기상청 단기예보(공공데이터포털)로 제주 날짜별 날씨를 가져온다.
// 장소(제주시/서귀포시)만 다루는 일반 도구다. "수확 가능 여부" 같은 농사 판단은 harvestRules.js 에 따로 있다.
import { searchPlaces } from './kakaoPlaces.js';
import { latLngToGrid } from './kmaGrid.js';
import { AREA_TO_CITY } from './jejuAreas.js';

const BASE = 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst';
const GRID = { '제주시': [53, 38], '서귀포시': [52, 33] }; // 기상청 격자 좌표(nx, ny)
const PTY = { 0: '없음', 1: '비', 2: '비/눈', 3: '눈', 4: '소나기' };
const SKY = { 1: '맑음', 3: '구름많음', 4: '흐림' };

// 발표시각: 02·05·08·11·14·17·20·23시 (발표 약 10분 뒤부터 조회 가능)
function baseDateTime() {
  const kst = new Date(Date.now() + 9 * 3600e3 - 15 * 60e3); // 한국시간, 15분 여유
  let h = [23, 20, 17, 14, 11, 8, 5, 2].find((x) => x <= kst.getUTCHours());
  let day = kst;
  if (h === undefined) { day = new Date(kst.getTime() - 24 * 3600e3); h = 23; }
  return {
    base_date: day.toISOString().slice(0, 10).replaceAll('-', ''),
    base_time: String(h).padStart(2, '0') + '00',
  };
}

// 읍·면·동 이름 → 격자: 카카오 지도로 좌표를 찾고 기상청 격자로 바꾼다. 같은 이름은 한 번만 찾도록 기억해 둔다.
const gridCache = new Map();
async function gridOfArea(place) {
  if (gridCache.has(place)) return gridCache.get(place);
  const city = AREA_TO_CITY[place];
  const [hit] = await searchPlaces({ query: `제주특별자치도 ${city} ${place}`, size: 1 });
  if (!hit || !String(hit.address).startsWith('제주특별자치도')) throw new Error(`'${place}'의 위치를 지도에서 찾지 못했습니다.`);
  const grid = latLngToGrid(hit.lat, hit.lng);
  gridCache.set(place, grid);
  return grid;
}

// place: '제주시' · '서귀포시' 또는 제주의 읍·면·동 이름(예: 노형동, 남원읍). 5km 격자 단위 예보라 이웃한 동은 같은 값이 나올 수 있다.
export async function getWeather({ place = '제주시' } = {}) {
  const key = process.env.DATA_GO_KR_KEY;
  if (!key) throw new Error('공공데이터포털 키가 없습니다. .env.local 의 DATA_GO_KR_KEY 를 확인해 주세요.');
  if (!GRID[place] && !AREA_TO_CITY[place]) // 모르는 장소를 제주시 날씨로 몰래 바꿔 돌려주면 잘못된 정보가 되므로 오류로 알린다
    throw new Error(`날씨는 제주시·서귀포시와 제주의 읍·면·동만 조회할 수 있습니다. ('${place}'는 지원하지 않습니다)`);
  const [nx, ny] = GRID[place] ?? (await gridOfArea(place));
  const params = new URLSearchParams({
    serviceKey: key, dataType: 'JSON', numOfRows: '1000', pageNo: '1',
    nx: String(nx), ny: String(ny), ...baseDateTime(),
  });

  let text;
  try {
    const r = await fetch(`${BASE}?${params}`, { signal: AbortSignal.timeout(15000) });
    text = await r.text();
  } catch {
    throw new Error('기상청 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  }

  let data;
  try { data = JSON.parse(text); }
  catch {
    // 키 문제는 JSON 이 아니라 XML 오류문으로 돌아온다
    if (/SERVICE.?KEY|REGISTERED|UNREGISTERED/i.test(text))
      throw new Error('인증키가 아직 등록되지 않았거나 틀렸습니다. 승인 직후라면 1~2시간 뒤에 다시 해 보세요. (Decoding 키인지도 확인)');
    throw new Error('기상청 응답을 읽지 못했습니다. (' + text.slice(0, 80).replace(/serviceKey=[^&\s]*/gi, '') + ')');
  }

  const header = data?.response?.header;
  if (header?.resultCode && header.resultCode !== '00')
    throw new Error(`기상청 오류 ${header.resultCode}: ${header.resultMsg}`);

  const items = data?.response?.body?.items?.item ?? [];
  // 날짜별로 모은다: 최고·최저기온, 최대 강수확률, 비/눈 예보 여부
  const days = {};
  for (const it of items) {
    const d = (days[it.fcstDate] ??= { date: it.fcstDate, maxPop: null, rainHours: 0, tmn: null, tmx: null, sky: {} });
    const v = Number(it.fcstValue);
    if (it.category === 'POP') d.maxPop = Math.max(d.maxPop ?? 0, v);
    if (it.category === 'PTY' && v > 0) d.rainHours += 1;
    if (it.category === 'TMN') d.tmn = v;
    if (it.category === 'TMX') d.tmx = v;
    if (it.category === 'SKY') d.sky[v] = (d.sky[v] ?? 0) + 1;
  }
  return Object.values(days).map((d) => {
    const topSky = Object.entries(d.sky).sort((a, b) => b[1] - a[1])[0]?.[0];
    return { place, date: d.date, maxPop: d.maxPop, rainHours: d.rainHours, tmn: d.tmn, tmx: d.tmx, sky: SKY[topSky] ?? '확인 필요' };
  });
}
