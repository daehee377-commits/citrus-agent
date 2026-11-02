// 도구 8: get_retail_price — 소비자가(소매가격). KAMIS(한국농수산식품유통공사 농산물유통정보) 오픈API 일별 품목별 소매 가격.
// 감귤(품목 415, 노지 01) 상품 등급(04), 제주 지역(3911)과 전국 평균을 함께 준다. 가격 단위는 KAMIS 코드표의 소매 단위(감귤 10개)를 따른다.
const BASE = 'http://www.kamis.or.kr/service/price/xml.do';
const kstDay = (offsetDays) => new Date(Date.now() + 9 * 3600e3 - offsetDays * 86400e3).toISOString().slice(0, 10);
const num = (s) => { const n = Number(String(s ?? '').replace(/,/g, '')); return Number.isFinite(n) && n > 0 ? n : null; };

async function fetchSeries(countryCode, key, id) {
  const params = new URLSearchParams({
    action: 'periodRetailProductList', p_productclscode: '01', p_startday: kstDay(14), p_endday: kstDay(0),
    p_itemcategorycode: '400', p_itemcode: '415', p_kindcode: '01', p_productrankcode: '04',
    p_countrycode: countryCode, p_convert_kg_yn: 'N', p_cert_key: key, p_cert_id: id, p_returntype: 'json',
  });
  let data;
  try { data = await (await fetch(`${BASE}?${params}`, { signal: AbortSignal.timeout(15000) })).json(); }
  catch { throw new Error('소비자가 서버(KAMIS)에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.'); }
  const code = data?.data?.error_code ?? data?.error_code;
  if (code && code !== '000') throw new Error(code === '001' ? '해당 기간에 소비자가 자료가 없습니다.' : `소비자가 조회가 거절되었습니다(코드 ${code}). 인증키를 확인하세요.`);
  const rows = (data?.data?.item ?? []).filter((r) => r.countyname === '평균' && num(r.price));
  return rows.map((r) => ({ date: r.regday, price: num(r.price) }));
}

export async function getRetailPrice() {
  const key = process.env.KAMIS_API_KEY, id = process.env.KAMIS_API_ID;
  if (!key || !id) throw new Error('소비자가 인증키가 설정되지 않았습니다.');
  const [jeju, nation] = await Promise.all([fetchSeries('3911', key, id), fetchSeries('', key, id)]);
  const last = (s) => s.at(-1) ?? null;
  const prev = (s) => (s.length > 1 ? s.at(-2) : null);
  const pack = (s) => ({ latest: last(s), previous: prev(s), diff: last(s) && prev(s) ? last(s).price - prev(s).price : null, history: s.slice(-7) });
  if (!last(jeju) && !last(nation)) throw new Error('최근 소비자가 자료가 없습니다.');
  return {
    item: '감귤(노지) 상품', unit: '원/10개 (KAMIS 소매 단위)', source: 'KAMIS 농산물유통정보 소매가격',
    jeju: pack(jeju), nation: pack(nation),
    note: '소비자가(소매점 판매가) 평균입니다. 유기농·직거래 가격과는 다를 수 있습니다.',
  };
}
