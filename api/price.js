// GET /api/price — 서울가락 도매시장 제주산 감귤 시세
import { getMarketPrice } from '../server/marketPrice.js';
export default async function handler(req, res) {
  try { res.status(200).json(await getMarketPrice()); }
  catch (e) { res.status(502).json({ error: e.message }); }
}
