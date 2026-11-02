// 도구 7: get_pest_info — 국가농작물병해충관리시스템(NCPMS, 농촌진흥청)에서 작물의 병 목록과 증상·방제 정보를 가져온다.
// crop(작물)과 name(병 이름)만 바꾸면 다른 작물에도 쓸 수 있다. 키는 NCPMS 사이트에서 따로 받은 NCPMS_API_KEY 이다.
import { XMLParser } from 'fast-xml-parser';

const BASE = 'https://ncpms.rda.go.kr/npmsAPI/service';
const parser = new XMLParser();

// 안내문에 섞인 HTML 태그·줄바꿈 기호를 읽기 좋게 정리한다
const clean = (s) => String(s ?? '').replace(/<br\s*\/?>/gi, '\n').replace(/&#xD;|&amp;|<[^>]+>/g, (m) => (m === '&amp;' ? '&' : '')).replace(/\n\s*\n/g, '\n').trim();

async function call(params) {
  const key = process.env.NCPMS_API_KEY;
  if (!key) throw new Error('병해충 API 키가 없습니다. .env.local 의 NCPMS_API_KEY 를 확인해 주세요.');
  let text;
  try {
    const r = await fetch(`${BASE}?${new URLSearchParams({ apiKey: key, serviceType: 'AA001', ...params })}`, { signal: AbortSignal.timeout(15000) });
    text = await r.text();
  } catch { throw new Error('병해충 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.'); }
  const data = parser.parse(text);
  if (!data?.service) throw new Error('병해충 응답을 읽지 못했습니다. 키가 승인되었는지 확인해 주세요.');
  if (data.service.error) throw new Error(`병해충 서버 오류: ${data.service.error.errorMessage ?? data.service.error}`);
  return data.service;
}

// name 이 없으면 작물에 발생하는 병 목록, 있으면 그 병의 증상·발생 조건·방제 방법을 돌려준다.
export async function getPestInfo({ crop = '감귤', name = '' } = {}) {
  const list = await call({ serviceCode: 'SVC01', cropName: crop, displayCount: '100' });
  const items = list.list?.item ? [].concat(list.list.item) : [];
  if (!items.length) throw new Error(`'${crop}'에 대한 병 정보를 찾지 못했습니다.`);
  const names = items.map((i) => i.sickNameKor);
  if (!name) return { crop, total: names.length, diseases: names, source: '국가농작물병해충관리시스템(농촌진흥청)' };

  const hit = items.find((i) => String(i.sickNameKor).includes(name));
  if (!hit) return { crop, notFound: name, diseases: names, note: '이 이름의 병을 찾지 못했습니다. 목록에서 골라 주세요.' };
  const d = await call({ serviceCode: 'SVC05', sickKey: hit.sickKey });
  return {
    crop, name: d.sickNameKor, symptoms: clean(d.symptoms), developmentCondition: clean(d.developmentCondition),
    prevention: clean(d.preventionMethod),
    note: '약제 사용은 반드시 등록된 약제와 사용 기준을 농업기술센터 등에 확인하세요. 이 정보는 참고용입니다.',
    source: '국가농작물병해충관리시스템(농촌진흥청)',
  };
}
