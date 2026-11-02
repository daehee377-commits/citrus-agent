// 오류·경계 상황 점검: npm run test:edge  (가짜 응답을 쓰므로 키·네트워크·호출 한도를 쓰지 않는다)
Object.assign(process.env, { DATA_GO_KR_KEY: 'dummy', KAKAO_REST_KEY: 'dummy', NCPMS_API_KEY: 'dummy' });
const { searchPlaces } = await import('../server/kakaoPlaces.js');
const { searchBlogReviews } = await import('../server/blogReviews.js');
const { getTravelTime } = await import('../server/osrm.js');
const { getWeather } = await import('../server/weather.js');
const { getMarketPrice } = await import('../server/marketPrice.js');
const { getPestInfo } = await import('../server/pestInfo.js');
const { judgeHarvestDay } = await import('../server/harvestRules.js');
const { findCitrusEvidence } = await import('../server/citrusEvidence.js');
const { getRegionMode } = await import('../server/regionMode.js');
const { getBuyerType } = await import('../server/buyerType.js');

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => { cond ? pass++ : fail++; console.log(`${cond ? '✅' : '❌'} ${name}${cond ? '' : ' ← ' + detail}`); };
const mock = (status, body) => { globalThis.fetch = async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status }); };
const boom = () => { globalThis.fetch = async () => { throw new Error('network'); }; };
async function msg(fn) { try { await fn(); return '(오류 없음)'; } catch (e) { return e.message; } }

// 1) 오류 안내 문구 (쉬운 한국어인지, 키가 노출되지 않는지)
for (const [code, word] of [[401, '올바르지'], [403, '설정'], [429, '사용량'], [500, '서버 오류']]) {
  mock(code, {}); const m = await msg(() => searchPlaces({ query: '카페' }));
  ok(`카카오 장소 ${code}`, m.includes(word), m);
}
mock(429, {}); ok('카카오 후기 429', (await msg(() => searchBlogReviews({ query: 'x' }))).includes('사용량'));
boom(); ok('카카오 연결 끊김', (await msg(() => searchPlaces({ query: 'x' }))).includes('연결하지 못했습니다'));
mock(429, {}); ok('OSRM 429', (await msg(() => getTravelTime({ from: { lat: 33, lng: 126 }, to: { lat: 33.1, lng: 126.1 } }))).includes('잠시'));
boom(); ok('OSRM 연결 끊김', (await msg(() => getTravelTime({ from: { lat: 33, lng: 126 }, to: { lat: 33.1, lng: 126.1 } }))).includes('연결하지 못했습니다'));
ok('OSRM 범위 밖 좌표', (await msg(() => getTravelTime({ from: { lat: 999, lng: 0 }, to: { lat: 0, lng: 0 } }))).includes('좌표'));

// 2) 기상청: 키 문제는 XML 오류문으로 온다
mock(200, '<OpenAPI_ServiceResponse><returnAuthMsg>SERVICE_KEY_IS_NOT_REGISTERED_ERROR</returnAuthMsg></OpenAPI_ServiceResponse>');
ok('기상청 키 미등록 안내', (await msg(() => getWeather({ place: '제주시' }))).includes('등록되지 않았거나'));
mock(200, { response: { header: { resultCode: '03', resultMsg: 'NO_DATA' } } });
ok('기상청 데이터 없음 코드', (await msg(() => getWeather({ place: '제주시' }))).includes('03'));
mock(200, { response: { header: { resultCode: '00' }, body: { items: { item: [] } } } });
ok('기상청 빈 응답은 빈 배열', JSON.stringify(await getWeather({ place: '제주시' })) === '[]');

// 3) 시세: 자료가 전혀 없을 때, 휴장일 건너뛰기
mock(200, { response: { header: { resultCode: '0' }, body: { items: { item: [] } } } });
ok('시세 10일간 자료 없음', (await msg(() => getMarketPrice())).includes('찾지 못했습니다'));
mock(200, 'html 오류 페이지'); ok('시세 비JSON 응답', (await msg(() => getMarketPrice())).includes('읽지 못했습니다'));

// 4) 병해충: XML 아닌 응답, 키 없음
mock(200, 'not xml'); ok('병해충 비XML 응답', (await msg(() => getPestInfo())).includes('읽지 못했습니다'));
const saved = process.env.NCPMS_API_KEY; delete process.env.NCPMS_API_KEY;
ok('병해충 키 없음 안내', (await msg(() => getPestInfo())).includes('NCPMS_API_KEY')); process.env.NCPMS_API_KEY = saved;

// 5) 수확 판단 경계값 (비 기준 60%)
const day = (maxPop, rainHours = 0) => ({ date: '20261104', maxPop, rainHours });
ok('강수확률 59% → 수확 가능', judgeHarvestDay(day(59)).work === '수확 가능');
ok('강수확률 60% → 포장만', judgeHarvestDay(day(60)).work === '포장 작업만');
ok('확률 낮아도 비 예보 시간 있으면 포장만', judgeHarvestDay(day(10, 2)).work === '포장 작업만');
ok('강수확률 없음 → 확인 필요', judgeHarvestDay(day(null)).work === '확인 필요');
ok('기준 바꾸기(40%)', judgeHarvestDay(day(50), { popThreshold: 40 }).work === '포장 작업만');

// 6) 후기 근거
ok('후기 근거 있음', findCitrusEvidence([{ title: '감귤 에이드 맛집', snippet: '', url: 'u', date: 'd' }]).status === '근거 있음');
ok('후기 없음 → 단정하지 않는 표현', findCitrusEvidence([{ title: '커피', snippet: '', url: 'u', date: 'd' }]).status.includes('검색 범위'));
ok('후기 0건', findCitrusEvidence([]).hits.length === 0);

// 7) 지역 판별 오판 가능성
ok('제주 주소 → 방문', getRegionMode('제주특별자치도 제주시 연동').mode === 'visit');
ok('서울 주소 → 배송', getRegionMode('서울 성동구 성수동').mode === 'delivery');
ok('서울인데 도로명에 제주시가 들어간 경우 → 배송', getRegionMode('서울 강남구 제주시장길 12').mode === 'delivery', getRegionMode('서울 강남구 제주시장길 12').label);
ok('서울인데 건물명에 서귀포가 들어간 경우 → 배송', getRegionMode('서울 마포구 서귀포시장빌딩').mode === 'delivery', getRegionMode('서울 마포구 서귀포시장빌딩').label);
ok('앞뒤 공백 주소', getRegionMode('  제주특별자치도 서귀포시 ').mode === 'visit');

// 8) 구매처 분류
ok('펜션 → 소량', getBuyerType('여행 > 숙박 > 펜션') === '소량');
ok('체험농장 → 중량', getBuyerType('여행 > 관광,명소 > 농장 > 체험') === '중량');
ok('농협 하나로마트 → 대량', getBuyerType('가정,생활 > 마트 > 농협하나로마트') === '대량');

console.log(`\n결과: 통과 ${pass} / 실패 ${fail}`);
process.exitCode = fail ? 1 : 0;
