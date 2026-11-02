// GET /api/retail — 감귤 소비자가(KAMIS 소매가격)
import { getRetailPrice } from '../server/retailPrice.js';
export default async function handler(req, res) {
  try { res.status(200).json(await getRetailPrice()); }
  catch (e) { res.status(502).json({ error: e.message }); }
}
