// 감귤 주제 전용: 후기 글에 감귤 관련 언급이 있는지 찾는다 (주제별 안내문 쪽, 도구와 분리).
// 글자 검색일 뿐이라 "언급 가능성"을 보는 것이다. 강도를 나누어 약한 근거를 센 근거처럼 보이지 않게 한다.
const SPECIFIC = ['귤 에이드', '귤에이드', '감귤 에이드', '청귤차', '귤차', '귤 주스', '귤주스', '감귤 주스', '감귤 케이크', '귤 케이크', '귤 타르트', '웰컴 과일', '웰컴과일', '웰컴 귤', '귤따기', '귤 따기', '귤 체험', '감귤 체험', '감귤 디저트', '한라봉', '천혜향', '레드향', '카라향'];
const GENERIC = ['감귤', '귤'];

// 해당 단어 앞뒤 글자 조금을 잘라 근거 문장처럼 보여 준다
const excerpt = (text, word) => { const i = text.indexOf(word); return i < 0 ? '' : text.slice(Math.max(0, i - 20), i + word.length + 25).replace(/\s+/g, ' '); };

export function findCitrusEvidence(reviews) {
  const hits = [];
  for (const rv of reviews) {
    const text = `${rv.title} ${rv.snippet}`;
    const specific = SPECIFIC.find((x) => text.includes(x));
    const word = specific ?? GENERIC.find((x) => text.includes(x));
    if (word) hits.push({ word, specific: !!specific, excerpt: excerpt(text, word), title: rv.title, url: rv.url, date: rv.date });
  }
  if (!hits.length) return { status: '근거 없음(검색 범위 내)', strength: '없음', hits: [] };
  // 강: 메뉴·체험처럼 구체적인 언급이 있거나 서로 다른 글 2건 이상. 약: 일반 단어가 한 글에서만.
  const strong = hits.some((h) => h.specific) || hits.length >= 2;
  return { status: '근거 있음', strength: strong ? '강' : '약', hits };
}
