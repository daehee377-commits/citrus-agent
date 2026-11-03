// 제주도 지형(고도) 데이터 만들기: 공개 지형 타일(AWS Terrain Tiles, Terrarium 형식)을 받아 위도·경도 격자로 다시 뽑아 public/data/jeju-terrain.json 으로 저장한다.
// 한 번만 돌리면 되고, 결과 파일은 저장소에 들어 있다 (앱은 이 파일만 읽는다). 실행: node scripts/build-jeju-terrain.mjs
import { PNG } from 'pngjs';
import fs from 'node:fs';

const Z = 10, N = 2 ** Z;
const LNG0 = 126.10, LNG1 = 127.00, LAT0 = 33.10, LAT1 = 33.60, STEP = 0.003; // 격자 간격 약 280m
const tx = (lng) => ((lng + 180) / 360) * N;
const ty = (lat) => { const r = (lat * Math.PI) / 180; return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * N; };

const x0 = Math.floor(tx(LNG0)), x1 = Math.floor(tx(LNG1)), y0 = Math.floor(ty(LAT1)), y1 = Math.floor(ty(LAT0));
const tiles = new Map();
for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
  const r = await fetch(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${Z}/${x}/${y}.png`);
  if (!r.ok) throw new Error(`타일 ${x}/${y} 실패 ${r.status}`);
  const { data } = PNG.sync.read(Buffer.from(await r.arrayBuffer())); // 4바이트(RGBA)씩
  tiles.set(`${x}/${y}`, data);
}
const heightAtPx = (px, py) => { // 모자이크 위 한 픽셀의 고도(m)
  const x = Math.floor(px / 256), y = Math.floor(py / 256), d = tiles.get(`${x}/${y}`);
  if (!d) return 0;
  const i = ((Math.floor(py) - y * 256) * 256 + (Math.floor(px) - x * 256)) * 4;
  return d[i] * 256 + d[i + 1] + d[i + 2] / 256 - 32768;
};
const sample = (lat, lng) => { // 4개 픽셀을 섞어서(쌍선형) 부드럽게
  const px = tx(lng) * 256 - 0.5, py = ty(lat) * 256 - 0.5, fx = px - Math.floor(px), fy = py - Math.floor(py);
  const h = (a, b) => heightAtPx(Math.floor(px) + a, Math.floor(py) + b);
  return (h(0, 0) * (1 - fx) + h(1, 0) * fx) * (1 - fy) + (h(0, 1) * (1 - fx) + h(1, 1) * fx) * fy;
};

const cols = Math.round((LNG1 - LNG0) / STEP) + 1, rows = Math.round((LAT1 - LAT0) / STEP) + 1;
const data = [];
for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { // 북쪽 줄부터 차례로
  const h = sample(LAT1 - r * STEP, LNG0 + c * STEP);
  data.push(h > 0 ? Math.round(h) : 0); // 바다(0 이하)는 0으로
}
fs.mkdirSync('public/data', { recursive: true });
fs.writeFileSync('public/data/jeju-terrain.json', JSON.stringify({ lng0: LNG0, lng1: LNG1, lat0: LAT0, lat1: LAT1, cols, rows, unit: 'm', source: 'AWS Terrain Tiles (Terrarium, SRTM 등)', data }));
console.log(`저장: ${cols}x${rows}, 최고 ${Math.max(...data)}m, 육지 칸 ${data.filter((h) => h > 0).length}개`);
