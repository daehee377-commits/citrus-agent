// 도구 5: get_market_price — 공영도매시장 정산 가격(한국농수산식품유통공사, 공공데이터포털)을 품종별로 요약한다.
// 코드로 정확히 거른다: 대분류 06(과일)+중분류 14(감귤), 산지코드 69로 시작(제주). 코드를 바꾸면 다른 농산물·지역에도 쓸 수 있다.
// 도매 정산가이며 소비자가가 아니다. 가장 최근 거래일(오늘 제외)과 그 직전 거래일을 찾아 변화도 보여 준다.
const BASE = 'https://apis.data.go.kr/B552845/katSale/trades';

const kst = (offsetDays) => new Date(Date.now() + 9 * 3600e3 - offsetDays * 86400e3).toISOString().slice(0, 10);
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };

async function fetchDay({ market, lclsf, mclsf, date, key }) {
  const params = new URLSearchParams({
    serviceKey: key, returnType: 'json', pageNo: '1', numOfRows: '1000',
    'cond[whsl_mrkt_cd::EQ]': market, 'cond[gds_lclsf_cd::EQ]': lclsf, 'cond[gds_mclsf_cd::EQ]': mclsf, 'cond[trd_clcln_ymd::EQ]': date,
  });
  let text;
  try {
    const r = await fetch(`${BASE}?${params}`, { signal: AbortSignal.timeout(15000) });
    text = await r.text();
  } catch { throw new Error('시세 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.'); }
  let data;
  try { data = JSON.parse(text); }
  catch {
    if (/SERVICE.?KEY|REGISTERED|LIMITED/i.test(text)) throw new Error('시세 API 인증키 문제이거나 오늘 호출 한도를 넘었습니다. 잠시 뒤 다시 해 보세요.');
    throw new Error('시세 응답을 읽지 못했습니다.');
  }
  const h = data?.response?.header;
  if (h?.resultCode && String(h.resultCode) !== '0' && h.resultCode !== '00') throw new Error(`시세 서버 오류 ${h.resultCode}: ${h.resultMsg}`);
  return data?.response?.body?.items?.item ?? [];
}

// 품종(소분류)별로 요약한다. 박스 크기가 달라 kg당 가격으로 맞추고, 10kg 박스로 실제 거래된 건은 따로 보여 준다.
function summarize(rows, { originPrefix, grade }) {
  const groups = {};
  for (const r of rows) {
    if (originPrefix && !String(r.plor_cd).startsWith(originPrefix)) continue; // 제주 산지코드(69…)만
    if (grade && r.grd_cd !== grade) continue;
    const kg = Number(r.unit_qty);
    if (!kg || String(r.unit_nm).trim() !== 'kg') continue;
    const g = (groups[r.gds_sclsf_nm] ??= { avg: [], low: [], high: [], box10: [] });
    const avg = Number(r.avgprc);
    g.avg.push(avg / kg);
    if (Number(r.lwprc) > 0) g.low.push(Number(r.lwprc) / kg); // 최저가 0 은 자료 오류로 보고 뺀다
    g.high.push(Number(r.hgprc) / kg);
    if (kg === 10) g.box10.push(avg); // 10kg 박스 실제 거래 평균가
  }
  return Object.fromEntries(Object.entries(groups).map(([name, g]) => [name, {
    name, rows: g.avg.length,
    perKgAvg: Math.round(median(g.avg)),
    perKgLow: g.low.length ? Math.round(Math.min(...g.low)) : null,
    perKgHigh: Math.round(Math.max(...g.high)),
    per10kgEstimate: Math.round(median(g.avg) * 10), // kg당 가격 × 10 (환산 추정)
    box10Actual: g.box10.length ? { price: Math.round(median(g.box10)), rows: g.box10.length } : null, // 실제 10kg 거래
  }]));
}

export async function getMarketPrice({ market = '110001', lclsf = '06', mclsf = '14', originPrefix = '69', grade = '' } = {}) {
  const key = process.env.DATA_GO_KR_KEY;
  if (!key) throw new Error('공공데이터포털 키가 없습니다. .env.local 의 DATA_GO_KR_KEY 를 확인해 주세요.');

  const days = []; // 거래가 있었던 최근 2일
  for (let back = 1; back <= 10 && days.length < 2; back++) {
    const date = kst(back);
    const rows = await fetchDay({ market, lclsf, mclsf, date, key });
    if (rows.length) days.push({ date, market: rows[0].whsl_mrkt_nm, summary: summarize(rows, { originPrefix, grade }) });
  }
  if (!days.length) throw new Error('최근 10일 안에 이 품목의 시세 자료를 찾지 못했습니다.');

  const [latest, prev] = days;
  const items = Object.values(latest.summary).map((it) => {
    const before = prev?.summary[it.name];
    return { ...it, changeVsPrev: before ? { date: prev.date, perKgDiff: it.perKgAvg - before.perKgAvg } : null };
  }).sort((a, b) => b.rows - a.rows); // 거래 건수가 많은(대표적인) 품종 먼저
  return {
    date: latest.date, market: latest.market, origin: originPrefix === '69' ? '제주' : originPrefix || '전체', items,
    note: '도매시장 정산가(원) 기준 참고용입니다. 소비자가·직거래가와 다르며, 유기농 등급 거래는 이 자료에서 확인되지 않았습니다.',
  };
}
