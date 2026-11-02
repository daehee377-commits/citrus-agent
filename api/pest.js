// GET /api/pest?name=궤양병 — 감귤 병 목록, 또는 병 이름을 주면 증상·방제
import { getPestInfo } from '../server/pestInfo.js';
export default async function handler(req, res) {
  try { res.status(200).json(await getPestInfo({ crop: '감귤', name: String(req.query?.name ?? '').slice(0, 30) })); }
  catch (e) { res.status(502).json({ error: e.message }); }
}
