// GET /api/weather?place=제주시 (또는 노형동, 남원읍 같은 제주의 읍·면·동) — 날짜별 날씨와 수확 가능 여부
import { getWeather } from '../server/weather.js';
import { judgeHarvestDay } from '../server/harvestRules.js';
import { AREA_TO_CITY } from '../server/jejuAreas.js';

export default async function handler(req, res) {
  try {
    const q = String(req.query?.place ?? '제주시');
    const place = q === '서귀포시' || AREA_TO_CITY[q] ? q : '제주시'; // 목록에 있는 지역만 받는다 (임의 문자열로 지도 검색을 부르지 못하게)
    res.status(200).json({ place, days: (await getWeather({ place })).map((d) => judgeHarvestDay(d)) });
  } catch (e) { res.status(502).json({ error: e.message }); }
}
