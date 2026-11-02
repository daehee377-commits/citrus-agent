// GET /api/weather?place=제주시 — 날짜별 날씨와 수확 가능 여부
import { getWeather } from '../server/weather.js';
import { judgeHarvestDay } from '../server/harvestRules.js';
export default async function handler(req, res) {
  try {
    const place = req.query?.place === '서귀포시' ? '서귀포시' : '제주시';
    res.status(200).json({ days: (await getWeather({ place })).map((d) => judgeHarvestDay(d)) });
  } catch (e) { res.status(502).json({ error: e.message }); }
}
