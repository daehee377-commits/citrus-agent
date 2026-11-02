// get_travel_time 단독 실행 테스트: npm run test:osrm
// 아래 좌표는 테스트용 대략값(제주시청 부근 / 서귀포시청 부근)이다. 개인 주소가 아니다.
import { getTravelTime } from '../server/osrm.js';

const 제주시 = { lat: 33.4996, lng: 126.5312 };
const 서귀포시 = { lat: 33.2541, lng: 126.5601 };

const result = await getTravelTime({ from: 제주시, to: 서귀포시 });
console.log('제주시 → 서귀포시:', result);

// 잘못된 입력은 쉬운 한국어 오류가 나와야 한다
try { await getTravelTime({ from: 제주시 }); }
catch (e) { console.log('오류 안내 확인:', e.message); }
