// 고른 사진만 내려받아 public/images 에 저장하고 출처를 credits.json 에 기록한다 (npm run images:download)
import { readFile, writeFile } from 'node:fs/promises';

const PICK = [4756275, 5366002, 3672676, 8886641, 3629140, 1117628, 3175021]; // 고른 Pixabay 사진 번호
const cands = JSON.parse(await readFile('scratch/pixabay-candidates.json', 'utf8'));
const credits = [];
let n = 0;
for (const id of PICK) {
  const c = cands.find((x) => x.id === id);
  if (!c) { console.log('후보에 없음', id); continue; }
  n += 1;
  const file = `citrus-${n}.jpg`;
  const r = await fetch(c.url);
  if (!r.ok) { console.log('다운로드 실패', id, r.status); continue; }
  const buf = Buffer.from(await r.arrayBuffer());
  await writeFile(`public/images/${file}`, buf);
  credits.push({ file, pixabayId: id, author: c.user, source: c.page, license: 'Pixabay Content License' });
  console.log(`${file} ← ${id} (${c.user}) ${Math.round(buf.length / 1024)}KB ${c.w}x${c.h}`);
}
await writeFile('public/images/credits.json', JSON.stringify(credits, null, 2));
