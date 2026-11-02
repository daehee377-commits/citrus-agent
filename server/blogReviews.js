// 도구 4: search_blog_reviews — 블로그 후기를 검색한다 (카카오 다음검색 API, 장소 검색과 같은 REST 키 사용, 카드 불필요).
// 원래 계획은 네이버 검색이었지만 카드 정보를 요구해서 카카오로 대체했다. 도구 이름은 그대로다.
// 주제와 무관한 일반 도구: 무엇을 찾을지는 query 로 정한다.
const URL = 'https://dapi.kakao.com/v2/search/blog';

export async function searchBlogReviews({ query, size = 10 } = {}) {
  const key = process.env.KAKAO_REST_KEY;
  if (!key) throw new Error('카카오 키가 없습니다. .env.local 의 KAKAO_REST_KEY 를 확인해 주세요.');
  if (!query || !String(query).trim()) throw new Error('검색어(query)를 넣어 주세요.');

  const params = new URLSearchParams({ query: String(query).slice(0, 100), size: String(Math.min(size, 20)), sort: 'accuracy' });
  let r;
  try {
    r = await fetch(`${URL}?${params}`, { headers: { Authorization: `KakaoAK ${key}` }, signal: AbortSignal.timeout(10000) });
  } catch {
    throw new Error('카카오 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  }
  if (r.status === 401) throw new Error('카카오 키가 올바르지 않습니다. REST API 키를 다시 확인해 주세요.');
  if (r.status === 403) throw new Error('카카오 검색 사용 설정이 꺼져 있을 수 있습니다. 앱 설정을 확인해 주세요.');
  if (r.status === 429) throw new Error('카카오 무료 사용량을 넘었거나 요청이 너무 많습니다. 잠시 뒤에 다시 시도해 주세요.');
  if (!r.ok) throw new Error(`카카오 서버 오류 (HTTP ${r.status})`);

  const data = await r.json();
  const strip = (s) => String(s ?? '').replace(/<[^>]+>/g, ''); // 검색어 강조 태그 제거
  return (data.documents ?? []).map((d) => ({
    title: strip(d.title), snippet: strip(d.contents), blog: d.blogname, url: d.url, date: (d.datetime ?? '').slice(0, 10),
  }));
}
