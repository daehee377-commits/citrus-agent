// get_weather 단독 실행 테스트: npm run test:weather  (키는 .env.local 에서 읽는다. 출력에 키는 나오지 않는다)
import { getWeather } from '../server/weather.js';
import { judgeHarvestDay } from '../server/harvestRules.js';

for (const place of ['제주시', '서귀포시']) {
  const days = await getWeather({ place });
  console.log(`\n[${place}]`);
  for (const d of days) {
    const j = judgeHarvestDay(d);
    console.log(`${d.date} ${d.sky} 기온 ${d.tmn ?? '?'}~${d.tmx ?? '?'}℃ → ${j.work} (${j.why})`);
  }
}
