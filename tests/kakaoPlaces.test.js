// search_places 단독 실행 테스트: npm run test:places  (키는 .env.local, 출력에 키는 나오지 않는다)
import { searchPlaces } from '../server/kakaoPlaces.js';

const 서귀포시 = { lat: 33.2541, lng: 126.5601 }; // 테스트용 대략 좌표(시청 부근, 개인 주소 아님)
const list = await searchPlaces({ query: '카페', near: 서귀포시, size: 5 });
console.log(`서귀포 근처 카페 ${list.length}곳`);
for (const p of list) console.log(`- ${p.name} | ${p.address} | ${p.phone} | ${p.distanceM}m`);
