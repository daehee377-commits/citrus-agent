// 확실한 질문은 AI가 도구를 고르기 전에 서버가 먼저 조회한다.
// 이유: 모델의 도구 선택은 매번 조금씩 달라서, 수확 질문에 시세 도구를 부르는 실수가 가끔 생겼다 (배포 환경 시험에서 3번 중 2번).
// 키워드가 분명한 질문만 미리 조회하고, 나머지는 평소처럼 AI가 고른다. 주제별 말투가 담긴 파일이라 topics 와 함께 바꾼다.

const WEATHER = /(수확|날씨|기온|예보|우천|비\s?(가|와|오|올|온|예보)|강수|따도|딸\s?수|포장\s?작업|작업\s?(가능|해도))/;
const MARKET = /(시세|가격|얼마|도매|경락|값)/;
// 판로 찾기·병해충 질문이면 날씨를 미리 조회하지 않는다 ("내일 방문할 카페" 같은 질문에서 날씨는 필요 없다)
const OTHER_TOPIC = /(카페|식당|펜션|마켓|매장|직매장|체험|구매처|판로|후보|문자|택배|배송|병|방제|증상|해충|궤양)/;

export function detectIntents(question) {
  const q = String(question ?? '');
  const out = [];
  const wantsWeather = WEATHER.test(q) && !OTHER_TOPIC.test(q);
  if (wantsWeather) out.push({ name: 'get_weather', args: { place: /서귀포|남원|표선|성산|안덕|대정|중문/.test(q) ? '서귀포시' : '제주시' } });
  if (MARKET.test(q) && !/(카페|식당|펜션|마켓|매장|문자|택배|배송|병|방제)/.test(q)) out.push({ name: 'get_market_price', args: {} });
  return out;
}
