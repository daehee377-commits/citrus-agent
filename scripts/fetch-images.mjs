// 감귤 사진을 Pixabay 에서 한 번만 내려받아 public/images 에 저장한다 (npm run images). 사이트 실행 중에는 Pixabay 를 부르지 않는다.
// Pixabay 이용 조건: 내려받아 직접 보관하는 방식은 허용, 실시간 연결(핫링크)은 지양. 출처는 public/images/credits.json 에 기록한다.
import { mkdir, writeFile } from 'node:fs/promises';

const key = process.env.PIXABAY_KEY;
if (!key) { console.error('PIXABAY_KEY 가 없습니다. .env.local 을 확인해 주세요.'); process.exit(1); }
const QUERIES = ['tangerine orchard', 'mandarin orange', 'citrus fruit tree', 'oranges basket harvest', 'jeju island'];
const PEOPLE = /(woman|man|men|girl|boy|child|people|person|portrait|face|baby|kid|couple|family|model|hand)/i; // 사람이 나온 사진은 쓰지 않는다

const found = new Map();
for (const q of QUERIES) {
  const url = `https://pixabay.com/api/?${new URLSearchParams({ key, q, image_type: 'photo', orientation: 'horizontal', safesearch: 'true', per_page: '12', order: 'popular' })}`;
  const r = await fetch(url);
  if (!r.ok) { console.error(`검색 실패(${q}): HTTP ${r.status}`); continue; }
  const data = await r.json();
  for (const h of data.hits ?? []) if (!found.has(h.id) && !PEOPLE.test(h.tags)) found.set(h.id, { query: q, id: h.id, tags: h.tags, user: h.user, page: h.pageURL, url: h.webformatURL, w: h.webformatWidth, h: h.webformatHeight });
}
const list = [...found.values()];
console.log(`후보 ${list.length}장 (사람 사진 제외)`);
for (const x of list.slice(0, 24)) console.log(`${x.id} | ${x.query} | ${x.tags} | ${x.user}`);
await mkdir('scratch', { recursive: true });
await writeFile('scratch/pixabay-candidates.json', JSON.stringify(list, null, 1));
