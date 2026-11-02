// LangChain 도구 정의: server/ 의 일반 함수들을 "AI가 고를 수 있는 도구"로 포장한다.
// 도구 이름(search_places 등)은 고정이고, 주제별 판단(수확 규칙·감귤 근거 등)은 결과에 덧붙이는 정도만 한다.
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { searchPlaces } from '../server/kakaoPlaces.js';
import { searchBlogReviews } from '../server/blogReviews.js';
import { getTravelTime } from '../server/osrm.js';
import { getWeather } from '../server/weather.js';
import { getMarketPrice } from '../server/marketPrice.js';
import { getPestInfo } from '../server/pestInfo.js';
import { getDeliveryGuide } from '../server/deliveryGuide.js';
import { getRegionMode } from '../server/regionMode.js';
import { getBuyerType } from '../server/buyerType.js';
import { judgeHarvestDay } from '../server/harvestRules.js';
import { findCitrusEvidence } from '../server/citrusEvidence.js';

const json = (o) => JSON.stringify(o);
// 도구가 실패해도 대화가 끊기지 않도록, 오류를 문장으로 돌려 AI가 쉬운 말로 전하게 한다
const safe = (fn) => async (args) => { try { return json(await fn(args)); } catch (e) { return json({ error: e.message }); } };

export const searchPlacesTool = tool(safe(async ({ query, nearLat, nearLng }) => {
  const near = nearLat != null && nearLng != null ? { lat: nearLat, lng: nearLng } : undefined;
  const places = await searchPlaces({ query, near, size: 10 });
  return places.map((p) => ({ ...p, regionMode: getRegionMode(p.address).label, buyerSize: getBuyerType(p.category) }));
}), {
  name: 'search_places',
  description: '카카오 지도에서 잠재 구매처(카페, 식당, 펜션, 체험농장, 로컬푸드 매장, 과일가게 등)를 검색한다. 이름·주소·전화·지도 링크, 방문/배송 모드, 소량/중량/대량 참고 분류를 돌려준다. 지역을 검색어에 넣는다(예: "서귀포 카페", "서울 성수동 과일가게").',
  schema: z.object({
    query: z.string().describe('검색어. 지역과 업종을 함께 (예: 서귀포 카페)'),
    nearLat: z.number().optional().describe('기준 위도 (선택, 가까운 순 정렬용)'),
    nearLng: z.number().optional().describe('기준 경도 (선택)'),
  }),
});

export const searchBlogReviewsTool = tool(safe(async ({ placeName, area }) => {
  // 가게 이름이 들어 있는 글만 근거로 인정한다 (다른 가게 글이 근거로 섞이지 않게). 이름은 첫 단어만 비교해 '본점' 같은 꼬리를 무시한다.
  const key = placeName.trim().split(/\s+/)[0];
  const all = await searchBlogReviews({ query: `${placeName} ${area ?? ''} 감귤`.trim(), size: 10 });
  const about = all.filter((r) => `${r.title} ${r.snippet}`.includes(key));
  return {
    place: placeName, evidence: findCitrusEvidence(about), checkedReviews: about.length,
    reviews: about.slice(0, 3).map(({ title, blog, date, url }) => ({ title, blog, date, url })),
  };
}), {
  name: 'search_blog_reviews',
  description: '특정 가게의 블로그 후기를 검색해 감귤 메뉴·웰컴 과일·귤 활용 언급이 있는지 근거를 확인한다. 가게 이름이 들어 있는 글만 근거로 본다. 근거 있음/없음과 출처 주소를 준다. 없음은 이 검색 범위에서 못 찾았다는 뜻이다(checkedReviews 가 0이면 확인 못 함).',
  schema: z.object({
    placeName: z.string().describe('가게 이름 (search_places 결과의 name 그대로)'),
    area: z.string().optional().describe('지역 (예: 서귀포)'),
  }),
});

export const getTravelTimeTool = tool(safe(async ({ originText, toLat, toLng }) => {
  // 출발지는 읍·면 단위 글자로 받아 좌표로 바꾼다. 저장하지 않고, 결과에는 "출발지 입력됨"으로만 표시한다.
  const [o] = await searchPlaces({ query: originText, size: 1 });
  if (!o) throw new Error('입력한 출발지를 지도에서 찾지 못했습니다. 읍·면 이름을 다시 확인해 주세요.');
  const r = await getTravelTime({ from: { lat: o.lat, lng: o.lng }, to: { lat: toLat, lng: toLng } });
  return { origin: '출발지 입력됨', ...r };
}), {
  name: 'get_travel_time',
  description: '제주 안에서 출발지에서 구매처까지 자동차 이동시간(분)과 거리(km)를 계산한다. 제주 지역(방문 모드) 구매처에만 쓴다. 서울 등 타 지역에는 쓰지 않는다.',
  schema: z.object({
    originText: z.string().describe('출발지 (읍·면 단위, 예: 남원읍)'),
    toLat: z.number().describe('도착지 위도'),
    toLng: z.number().describe('도착지 경도'),
  }),
});

export const getWeatherTool = tool(safe(async ({ place }) => {
  const days = await getWeather({ place });
  return days.map((d) => { const j = judgeHarvestDay(d); return { date: d.date, sky: d.sky, tmn: d.tmn, tmx: d.tmx, maxPop: d.maxPop, work: j.work, why: j.why }; });
}), {
  name: 'get_weather',
  description: '제주 농장 날씨 예보를 날짜별로 조회한다. 지역은 제주시·서귀포시 또는 제주의 읍·면·동 이름(예: 노형동, 남원읍, 중문동)을 쓴다. 비 예보에 따라 "수확 가능 / 포장 작업만 / 확인 필요"를 판단해 준다. 비가 오면 귤을 딸 수 없고 천막 안 포장만 가능하다.',
  schema: z.object({ place: z.string().describe('제주시·서귀포시 또는 제주의 읍·면·동 이름 (모르면 제주시)') }),
});

export const getMarketPriceTool = tool(safe(async () => getMarketPrice()), {
  name: 'get_market_price',
  description: '서울가락 도매시장의 제주산 감귤 최근 거래일 도매 시세를 품종별로 요약한다(kg당 가격, 10kg 환산 추정, 10kg 실거래, 직전 거래일 대비). 도매 정산가라 소비자가·직거래가와 다르다.',
  schema: z.object({}),
});

// 사진 주소는 화면용이라 AI 에게는 주지 않는다 (글자 수만 늘어난다)
export const getPestInfoTool = tool(safe(async ({ name }) => { const { items, images, ...text } = await getPestInfo({ crop: '감귤', name }); return text; }), {
  name: 'get_pest_info',
  description: '감귤에 발생하는 병 목록을 보거나, 병 이름을 주면 증상·발생 조건·방제 방법을 알려 준다. name 을 비우면 병 목록을 준다.',
  schema: z.object({ name: z.string().optional().describe('병 이름 (예: 궤양병). 비우면 목록') }),
});

export const getDeliveryGuideTool = tool(safe(async ({ region, size }) => getDeliveryGuide({ region, size })), {
  name: 'get_delivery_guide',
  description: '제주 밖(서울 등) 구매처에 보낼 배송 방법(택배/화물)과 확인할 점을 안내한다. 배송비와 소요일은 확인된 값이 없으므로 "확인 필요"로 나온다.',
  schema: z.object({
    region: z.string().describe('구매처 지역 (예: 서울)'),
    size: z.enum(['소량', '중량', '대량']).describe('구매처 규모 분류'),
  }),
});

export const tools = [searchPlacesTool, searchBlogReviewsTool, getTravelTimeTool, getWeatherTool, getMarketPriceTool, getPestInfoTool, getDeliveryGuideTool];
export const toolsByName = Object.fromEntries(tools.map((t) => [t.name, t]));
