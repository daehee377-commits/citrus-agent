// 지역 구분·구매처 유형·배송 안내 테스트: npm run test:region  (키 불필요)
import { getRegionMode } from '../server/regionMode.js';
import { getBuyerType } from '../server/buyerType.js';
import { getDeliveryGuide } from '../server/deliveryGuide.js';

const cases = [
  ['제주특별자치도 서귀포시 중앙로 105', '음식점 > 카페'],
  ['서울 성동구 성수동', '음식점 > 카페'],
  ['서울 마포구 합정동', '음식점 > 한식'],
  ['경기 성남시 분당구', '가정,생활 > 마트'],
  ['', '확인 불가 업종'],
];
for (const [addr, cat] of cases) {
  const m = getRegionMode(addr), t = getBuyerType(cat);
  console.log(`${addr || '(주소 없음)'} | ${cat} → ${m.label}, 규모 ${t}`);
}
console.log('\n배송 안내 예시:', JSON.stringify(getDeliveryGuide({ region: '서울', size: '소량' }), null, 1));
