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
  // 병마다 대표 사진(썸네일)이 함께 온다. 화면에서 바로 열 수 있게 https 주소로 바꾼다 (농촌진흥청 사진 서버만 허용)
  // 사진 파일 이름(imageFileName)이 없는 주소는 농촌진흥청의 '사진 없음' 대체 그림이라 사진이 없는 것으로 본다
  const photo = (u) => (/^https?:\/\/ncpms\.rda\.go\.kr\/.*imageFileName=[0-9a-f]{8}/.test(String(u)) ? String(u).replace(/^http:/, 'https:') : null);
  if (!name) return { crop, total: names.length, diseases: names, items: items.map((i) => ({ name: i.sickNameKor, thumb: photo(i.thumbImg) })), source: '국가농작물병해충관리시스템(농촌진흥청)' };

  const hit = items.find((i) => String(i.sickNameKor).includes(name));
  if (!hit) return { crop, notFound: name, diseases: names, note: '이 이름의 병을 찾지 못했습니다. 목록에서 골라 주세요.' };
  const d = await call({ serviceCode: 'SVC05', sickKey: hit.sickKey });
  return {
    crop, name: d.sickNameKor, symptoms: clean(d.symptoms), developmentCondition: clean(d.developmentCondition),
    prevention: clean(d.preventionMethod),
    // 병징 사진(잎·열매·가지 등) 최대 8장. 사진마다 "과실의 병징(열매)" 같은 설명이 붙어 있다.
    images: (d.imageList?.item ? [].concat(d.imageList.item) : []).map((x) => ({ url: photo(x.image), title: String(x.imageTitle ?? '') })).filter((x) => x.url).slice(0, 8),
    note: '약제 사용은 반드시 등록된 약제와 사용 기준을 농업기술센터 등에 확인하세요. 이 정보는 참고용입니다.',
    source: '국가농작물병해충관리시스템(농촌진흥청)',
  };
}
