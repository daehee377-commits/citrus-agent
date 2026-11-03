// 제주섬 3D: 해안선 + 한라산 + 제주시·서귀포시와 9개 읍·면 핀. 날씨 API의 "수확 가능 / 포장 작업만"에 따라 핀 색과 모양이 바뀌고,
// 포장 작업만(비 예보)인 날에는 빗방울이 내린다. 핀을 누르면 그 지역이 선택된다. 마우스로 돌리고 확대할 수 있다. (three.js + @react-three/fiber)
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import WorkPill from './WorkPill.jsx';
import { Farmer, Surfer, Plane, Gulls, VFlock } from './Figures.jsx';
import * as THREE from 'three';

const K = 16; // 위도·경도 1도를 3D 길이로 바꾸는 배율
const toXZ = (lat, lng) => [(lng - 126.55) * 0.84 * K, (33.34 - lat) * K]; // 0.84 = 제주 위도에서 경도 1도가 위도 1도보다 짧은 비율
const HALLA = toXZ(33.3617, 126.5292); // 한라산 백록담 부근

// 핀 위치는 각 시청·읍면사무소 부근의 대략적인 좌표다 (기상청 예보는 이 이름으로 조회한다)
export const PLACES = [
  { name: '제주시', lat: 33.4996, lng: 126.5312 },
  { name: '서귀포시', lat: 33.2541, lng: 126.5601 },
  { name: '한림읍', lat: 33.4137, lng: 126.2655 },
  { name: '애월읍', lat: 33.4631, lng: 126.3297 },
  { name: '조천읍', lat: 33.5444, lng: 126.6368 },
  { name: '구좌읍', lat: 33.5126, lng: 126.8606 },
  { name: '성산읍', lat: 33.4379, lng: 126.9164 },
  { name: '표선면', lat: 33.3259, lng: 126.8315 },
  { name: '남원읍', lat: 33.2795, lng: 126.7192 },
  { name: '안덕면', lat: 33.2577, lng: 126.3336 },
  { name: '대정읍', lat: 33.2237, lng: 126.2514 },
].map((p) => ({ ...p, pos: toXZ(p.lat, p.lng) }));

// 해안선(경도, 위도): 실제 모양을 단순화한 점 몇 개를 이은 것이다
const COAST = [[126.16, 33.31], [126.18, 33.37], [126.24, 33.42], [126.30, 33.47], [126.40, 33.51], [126.52, 33.52], [126.62, 33.55], [126.74, 33.56],
  [126.86, 33.56], [126.94, 33.50], [126.97, 33.43], [126.93, 33.35], [126.85, 33.30], [126.75, 33.25], [126.62, 33.22], [126.55, 33.23],
  [126.42, 33.23], [126.33, 33.22], [126.25, 33.20], [126.18, 33.24]];

// ── 실제 지형: 공개 고도 데이터(public/data/jeju-terrain.json)를 격자 메쉬로 만든다. 한라산·오름·해안선이 실제 높이로 나온다.
// 최저기온이 없는 날(오늘 오후 이후 발표)이 있어서 "?~19℃" 대신 "최고 19℃"로 쓴다
const temp = (d) => (d.tmn != null && d.tmx != null ? `${d.tmn}~${d.tmx}℃` : d.tmx != null ? `최고 ${d.tmx}℃` : d.tmn != null ? `최저 ${d.tmn}℃` : '정보 없음');
const HEIGHT_SCALE = 0.0011; // 높이를 2배쯤 과장해서 입체감을 낸다 (한라산 약 2 단위)
const SEA = -0.2;
const hc = (h) => (h > 1100 ? 1100 + (h - 1100) * 0.45 : h); // 높은 곳은 눌러서 한라산이 뾰족한 원뿔이 되지 않게 한다 (실제 정상부는 넓고 완만하다)
const yOf = (h) => (h > 0 ? 0.05 + hc(h) * HEIGHT_SCALE : SEA);
const STOPS = [[0, [0.50, 0.75, 0.39]], [200, [0.37, 0.62, 0.27]], [700, [0.28, 0.47, 0.22]], [1300, [0.55, 0.58, 0.30]], [1800, [0.50, 0.44, 0.34]]]; // 낮은 곳 연두 → 높은 곳 누런 풀밭 → 정상 암석 색
function colorOf(h) {
  for (let i = 1; i < STOPS.length; i++) if (h <= STOPS[i][0] || i === STOPS.length - 1) {
    const [h0, c0] = STOPS[i - 1], [h1, c1] = STOPS[i], k = Math.min(1, Math.max(0, (h - h0) / (h1 - h0)));
    return c0.map((v, j) => v + (c1[j] - v) * k);
  }
}
// 위도·경도의 고도(m): 이웃한 네 칸을 섞어서 구한다. 핀을 땅 위에 세울 때 쓴다.
function heightAt(t, lat, lng) {
  const fx = (lng - t.lng0) / (t.lng1 - t.lng0) * (t.cols - 1), fy = (t.lat1 - lat) / (t.lat1 - t.lat0) * (t.rows - 1);
  const c = Math.min(t.cols - 2, Math.max(0, Math.floor(fx))), r = Math.min(t.rows - 2, Math.max(0, Math.floor(fy)));
  const dx = Math.min(1, Math.max(0, fx - c)), dy = Math.min(1, Math.max(0, fy - r)), at = (rr, cc) => t.data[rr * t.cols + cc];
  return (at(r, c) * (1 - dx) + at(r, c + 1) * dx) * (1 - dy) + (at(r + 1, c) * (1 - dx) + at(r + 1, c + 1) * dx) * dy;
}

function Terrain({ t, raining }) {
  const geo = useMemo(() => {
    const lv = craterLevels(t);
    const { cols, rows } = t, stepLng = (t.lng1 - t.lng0) / (cols - 1), stepLat = (t.lat1 - t.lat0) / (rows - 1);
    const pos = new Float32Array(cols * rows * 3), col = new Float32Array(cols * rows * 3);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const h = t.data[r * cols + c], [x, z] = toXZ(t.lat1 - r * stepLat, t.lng0 + c * stepLng), i = (r * cols + c) * 3;
      pos.set([x, craterY(x, z, yOf(h), lv), z], i);
      col.set(h > 0 ? summitColor(x, z, h) : [0.3, 0.5, 0.6], i);
    }
    const idx = [];
    for (let r = 0; r < rows - 1; r++) for (let c = 0; c < cols - 1; c++) {
      const a = r * cols + c, b = a + 1, d = a + cols, e = d + 1;
      idx.push(a, d, b, b, d, e); // 위에서 봤을 때 앞면이 위를 향하도록
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, [t]);
  return <mesh geometry={geo}><meshStandardMaterial vertexColors roughness={0.95} color={raining ? '#cfd8df' : '#ffffff'} /></mesh>;
}

function Island({ raining }) {
  const geo = useMemo(() => {
    const shape = new THREE.Shape(COAST.map(([lng, lat]) => new THREE.Vector2((lng - 126.55) * 0.84 * K, (lat - 33.34) * K)));
    return new THREE.ExtrudeGeometry(shape, { depth: 0.14, bevelEnabled: false });
  }, []);
  return <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}><meshStandardMaterial color={raining ? '#5f8f4a' : '#6aa84f'} /></mesh>;
}

// 출렁이는 바다: 격자 평면의 높이를 사인 곡선 4개를 겹쳐 흔들고, 법선(빛이 닿는 방향)도 같은 식으로 계산해서 물결이 부드럽게 반짝인다.
// 땅에서 가까운 곳은 연한 청록, 먼 곳은 짙은 파랑으로 칠하고, 해안선 가까이에서는 흰 거품이 밀려왔다 사라진다. 비 오는 날은 파도가 더 크고 어둡다.
// 파도가 섬(땅의 가장 낮은 높이 0.05)을 덮지 않도록 진폭을 작게 잡았다. "동작 줄이기" 설정을 켠 사람에게는 멈춘 바다를 보여 준다.
const SEA_LEVEL = -0.09;
const WAVES = [[0.9, 0.3, 0.04, 1.4], [-0.4, 1.1, 0.03, 1.1], [1.6, -0.8, 0.018, 2.0], [0.5, 2.2, 0.01, 2.6]]; // [x방향, z방향, 높이, 속도]
// 그 자리·그 시각의 바다 높이와 기울기: 바다 그림(Sea)과 서퍼가 같은 식을 쓰므로 서퍼가 파도 위에 정확히 얹힌다.
function waveAt(x, z, t, k) {
  let h = 0, dx = 0, dz = 0;
  for (const w of WAVES) { const ph = w[0] * x + w[1] * z + w[3] * t, s = Math.sin(ph) * w[2] * k, c = Math.cos(ph) * w[2] * k; h += s; dx += c * w[0]; dz += c * w[1]; }
  return { y: SEA_LEVEL + h, dx, dz };
}
const SEA_STOPS = [[0, [0.56, 0.88, 0.85]], [4, [0.3, 0.72, 0.88]], [14, [0.2, 0.62, 0.88]], [40, [0.13, 0.46, 0.75]]]; // 땅에서의 거리(칸) → 색
function seaColor(d) {
  for (let i = 1; i < SEA_STOPS.length; i++) if (d <= SEA_STOPS[i][0] || i === SEA_STOPS.length - 1) {
    const [d0, c0] = SEA_STOPS[i - 1], [d1, c1] = SEA_STOPS[i], k = Math.min(1, Math.max(0, (d - d0) / (d1 - d0)));
    return c0.map((v, j) => v + (c1[j] - v) * k);
  }
}
// 각 칸이 가장 가까운 땅에서 몇 칸 떨어졌는지 (두 번 훑어서 구한다)
function landDistance(t) {
  const { cols, rows, data } = t, d = new Float32Array(cols * rows);
  for (let i = 0; i < d.length; i++) d[i] = data[i] > 0 ? 0 : 1e3;
  const at = (r, c) => (r < 0 || c < 0 || r >= rows || c >= cols ? 1e3 : d[r * cols + c]);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) d[r * cols + c] = Math.min(d[r * cols + c], at(r, c - 1) + 1, at(r - 1, c) + 1, at(r - 1, c - 1) + 1.4, at(r - 1, c + 1) + 1.4);
  for (let r = rows - 1; r >= 0; r--) for (let c = cols - 1; c >= 0; c--) d[r * cols + c] = Math.min(d[r * cols + c], at(r, c + 1) + 1, at(r + 1, c) + 1, at(r + 1, c + 1) + 1.4, at(r + 1, c - 1) + 1.4);
  return d;
}
function Sea({ raining, terrain }) {
  const { geo, base, state } = useMemo(() => {
    const g = new THREE.PlaneGeometry(36, 36, 140, 140);
    g.rotateX(-Math.PI / 2); // 눕힌다 (x, 0, z)
    const n = g.attributes.position.count;
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    return { geo: g, base: Float32Array.from(g.attributes.position.array), state: { dist: new Float32Array(n).fill(40), baseCol: new Float32Array(n * 3), foam: [] } };
  }, []);
  // 지형 파일이 도착하면 땅까지의 거리로 바다 색과 거품 자리를 정한다
  useEffect(() => {
    const ld = terrain ? landDistance(terrain) : null, n = geo.attributes.position.count, col = geo.attributes.color;
    const stepLng = terrain ? (terrain.lng1 - terrain.lng0) / (terrain.cols - 1) : 1, stepLat = terrain ? (terrain.lat1 - terrain.lat0) / (terrain.rows - 1) : 1;
    state.foam = [];
    for (let i = 0; i < n; i++) {
      const x = base[i * 3], z = base[i * 3 + 2];
      let d = 40;
      if (ld) {
        const c = Math.round((x / (0.84 * K) + 126.55 - terrain.lng0) / stepLng), r = Math.round((terrain.lat1 - (33.34 - z / K)) / stepLat);
        d = c < 0 || r < 0 || c >= terrain.cols || r >= terrain.rows ? 60 : ld[r * terrain.cols + c];
      }
      state.dist[i] = d;
      const rgb = seaColor(d);
      state.baseCol.set(rgb, i * 3); col.setXYZ(i, rgb[0], rgb[1], rgb[2]);
      if (d > 0 && d <= 3) state.foam.push(i);
    }
    col.needsUpdate = true;
  }, [terrain, geo, base, state]);
  const still = useMemo(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, []);
  useFrame(({ clock }) => {
    if (still) return;
    const t = clock.elapsedTime, k = raining ? 1.5 : 1, pos = geo.attributes.position, nor = geo.attributes.normal, col = geo.attributes.color;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3], z = base[i * 3 + 2];
      let h = 0, dx = 0, dz = 0;
      for (const w of WAVES) { const ph = w[0] * x + w[1] * z + w[3] * t, s = Math.sin(ph) * w[2] * k, c = Math.cos(ph) * w[2] * k; h += s; dx += c * w[0]; dz += c * w[1]; }
      pos.setY(i, h);
      const len = Math.hypot(dx, 1, dz); nor.setXYZ(i, -dx / len, 1 / len, -dz / len);
    }
    for (const i of state.foam) { // 거품: 해안에서 바깥으로 밀려 나갔다가 사라지는 흰 띠
      const f = Math.max(0, Math.sin(t * 1.8 - state.dist[i] * 1.7)) * (1 - state.dist[i] / 3.4) * 0.95;
      col.setXYZ(i, state.baseCol[i * 3] + (1 - state.baseCol[i * 3]) * f, state.baseCol[i * 3 + 1] + (1 - state.baseCol[i * 3 + 1]) * f, state.baseCol[i * 3 + 2] + (1 - state.baseCol[i * 3 + 2]) * f);
    }
    pos.needsUpdate = true; nor.needsUpdate = true; col.needsUpdate = true;
  });
  return <mesh geometry={geo} position={[0, SEA_LEVEL, 0]}><meshStandardMaterial vertexColors color={raining ? '#b4c1cd' : '#ffffff'} roughness={0.25} metalness={0.12} /></mesh>;
}

// 구름: 하늘 상태(맑음·구름많음·흐림)에 따라 개수가 달라지고, 비 오는 날은 회색 구름이 낀다. 섬 뒤쪽과 옆쪽 하늘에서 천천히 흘러간다.
// 섬 위(카메라와 섬 사이)는 비워 두어서 핀을 가리지 않는다.
const SKY_LEVEL = { 맑음: 0.15, 구름많음: 0.6, 흐림: 1 };
function Clouds({ level, raining }) {
  const refs = useRef([]);
  const clusters = useMemo(() => {
    let s = 7; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; // 매번 같은 구름 모양이 되도록 고정된 난수
    return Array.from({ length: 11 }, (_, i) => {
      const behind = i % 2 === 0;
      const c = {
        x: (rnd() - 0.5) * 30, y: 2.6 + rnd() * 2.2, z: behind ? -5 - rnd() * 9 : (rnd() < 0.5 ? -1 : 1) * (4 + rnd() * 3), side: !behind,
        speed: 0.12 + rnd() * 0.12,
        parts: Array.from({ length: 5 }, () => [(rnd() - 0.5) * 2.2, rnd() * 0.35, (rnd() - 0.5) * 1.0, 0.5 + rnd() * 0.45]),
      };
      return c.side ? { ...c, x: (c.x < 0 ? -1 : 1) * (8.5 + Math.abs(c.x) * 0.2) } : c; // 옆쪽 구름은 섬 바깥(|x|>8.5)에 둔다
    });
  }, []);
  const shown = Math.min(clusters.length, Math.round(2 + (raining ? 1 : level) * 9));
  useFrame((_, dt) => {
    refs.current.forEach((g, i) => { if (!g) return; g.position.x += clusters[i].speed * dt; if (g.position.x > 16) g.position.x = -16; });
  });
  const color = raining ? '#7d8893' : level > 0.8 ? '#cdd5dc' : '#ffffff';
  return clusters.slice(0, shown).map((c, i) => (
    <group key={i} ref={(el) => { refs.current[i] = el; }} position={[c.x, c.y, c.z]}>
      {c.parts.map((p, j) => <mesh key={j} position={[p[0], p[1], p[2]]} scale={[1.5, 0.62, 1]}><sphereGeometry args={[p[3], 14, 10]} /><meshStandardMaterial color={color} roughness={1} transparent opacity={0.93} /></mesh>)}
    </group>
  ));
}

// 한라산 정상과 백록담: 사진을 보면 정상은 뾰족한 원뿔이 아니라 넓고 평평한 봉우리이고, 백록담은 그 위의 넓은 분지다.
// 바닥은 풀밭이고 호수는 한쪽에 치우쳐 있으며, 서북쪽 가장자리는 높은 암벽이다. 지형 격자(약 280m)로는 이 모양이 안 보여서 정상 둘레를 직접 빚는다:
// ① 정상 둘레(PLATEAU_R)를 정상 높이로 눌러 평평하게 하고 ② 그 위에 분지(가장자리 CRATER_R, 평평한 바닥 FLOOR_R)를 파고 ③ 서북쪽 가장자리를 더 높게 올린다.
// 물은 평평한 바닥에 붙인다. 실제 크기(지름 약 500m)는 지도에서 너무 작아서 눈에 보이게 과장했다.
const PLATEAU_R = 0.8; // 평평하게 누르는 범위
const CRATER_R = 0.34; // 분지 가장자리 반지름(지도 단위)
const FLOOR_R = 0.2; // 평평한 바닥 반지름
const CRATER_DEPTH = 0.13;
const smooth = (v) => { const k = Math.min(1, Math.max(0, v)); return k * k * (3 - 2 * k); };
function craterLevels(t) {
  const sx = (t.lng1 - t.lng0) / (t.cols - 1), sy = (t.lat1 - t.lat0) / (t.rows - 1);
  let m = 0;
  for (let r = 0; r < t.rows; r++) for (let c = 0; c < t.cols; c++) {
    const [x, z] = toXZ(t.lat1 - r * sy, t.lng0 + c * sx);
    if (Math.hypot(x - HALLA[0], z - HALLA[1]) < 0.7 && t.data[r * t.cols + c] > m) m = t.data[r * t.cols + c];
  }
  const plateauY = yOf(m * 0.96), rimY = plateauY + 0.02;
  return { plateauY, rimY, floorY: rimY - CRATER_DEPTH };
}
// 서북쪽(지도에서 왼쪽 위)으로 얼마나 향했는지 0~1: 사진의 서북벽(높은 암벽) 방향
const northwest = (dx, dz, dd) => (dd > 0 ? Math.max(0, (-dx - dz) / (Math.SQRT2 * dd)) : 0);
function craterY(x, z, y, lv) {
  const dx = x - HALLA[0], dz = z - HALLA[1], dd = Math.hypot(dx, dz);
  if (dd >= PLATEAU_R) return y;
  const wP = smooth(1 - dd / PLATEAU_R) * 0.9, base = y * (1 - wP) + lv.plateauY * wP; // 정상부를 넓고 평평하게
  if (dd >= CRATER_R * 1.5) return base;
  const nw = northwest(dx, dz, dd), cliff = 0.07 * nw * nw; // 서북쪽 가장자리를 더 높게
  if (dd <= CRATER_R) { const k = smooth((dd - FLOOR_R) / (CRATER_R - FLOOR_R)); return lv.floorY + (lv.rimY + cliff - lv.floorY) * k; } // 평평한 바닥 → 벽 → 가장자리
  const w = smooth((dd - CRATER_R) / (CRATER_R * 0.5)); // 가장자리 바깥은 평평한 정상부와 이어 붙인다
  return (lv.rimY + cliff) * (1 - w) + base * w;
}
// 색: 바닥은 풀밭, 벽은 어두운 현무암, 서북벽은 회색 암벽
function summitColor(x, z, h) {
  const dx = x - HALLA[0], dz = z - HALLA[1], dd = Math.hypot(dx, dz);
  if (dd < FLOOR_R + 0.02) return [0.47, 0.64, 0.32];
  if (dd < CRATER_R * 1.12) return northwest(dx, dz, dd) > 0.5 ? [0.4, 0.37, 0.36] : [0.33, 0.29, 0.27];
  return colorOf(h);
}
function Crater({ t }) {
  const lv = useMemo(() => craterLevels(t), [t]);
  return (
    <group position={[HALLA[0], lv.floorY + 0.012, HALLA[1]]}>
      {/* 호수는 바닥 한가운데가 아니라 한쪽에 치우친 타원 (사진 참고) */}
      <mesh position={[-0.05, 0, 0.03]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.45, 0.95, 1]}><circleGeometry args={[0.095, 40]} /><meshStandardMaterial color="#2a7fb5" roughness={0.1} metalness={0.3} /></mesh>
      <Html position={[0.8, 0.55, 0.35]} center distanceFactor={9} style={{ pointerEvents: 'none' }}><div className="j3d-label j3d-halla"><strong>백록담</strong><span>분화구</span></div></Html>
    </group>
  );
}

// 귤 과수원: 감귤은 주로 바닷가에서 해발 수백 m 아래의 낮은 지대, 특히 서귀포 쪽에서 많이 재배된다. 그 지대에 귤나무(줄기 + 둥근 잎 + 주황 열매)를 흩뿌린다.
// 실제 과수원 위치가 아니라 재배지 분포를 짐작해서 그린 그림이다. 나무 700그루를 InstancedMesh 세 개(줄기·잎·열매)로 한 번에 그려서 가볍다.
const ORCHARD_N = 700;
function orchardSpots(t) {
  let s = 20261103; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; // 매번 같은 배치가 되도록 고정된 난수
  const out = [];
  for (let tries = 0; tries < 40000 && out.length < ORCHARD_N; tries++) {
    const lat = t.lat0 + rnd() * (t.lat1 - t.lat0), lng = t.lng0 + rnd() * (t.lng1 - t.lng0), h = heightAt(t, lat, lng);
    if (h < 15 || h > 450) continue; // 바닷가 바로 옆과 높은 산지는 뺀다
    const [x, z] = toXZ(lat, lng);
    if (Math.hypot(x - HALLA[0], z - HALLA[1]) < PLATEAU_R) continue; // 한라산 정상부에는 심지 않는다
    if (rnd() > (lat < 33.37 ? 1 : 0.35)) continue; // 남쪽(서귀포 쪽)을 더 촘촘하게
    out.push([x, yOf(h), z, 0.8 + rnd() * 0.5, rnd()]);
  }
  return out;
}
function Orchard({ t }) {
  const spots = useMemo(() => orchardSpots(t), [t]);
  const trunks = useRef(), crowns = useRef(), fruits = useRef();
  useLayoutEffect(() => {
    const m = new THREE.Matrix4(), c = new THREE.Color(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
    let f = 0;
    spots.forEach(([x, y, z, k, r], i) => {
      m.compose(new THREE.Vector3(x, y + 0.03 * k, z), q, new THREE.Vector3(k, k, k)); trunks.current.setMatrixAt(i, m);
      m.compose(new THREE.Vector3(x, y + 0.085 * k, z), q, new THREE.Vector3(0.085 * k, 0.062 * k, 0.085 * k)); crowns.current.setMatrixAt(i, m);
      c.setHSL(0.28 + 0.05 * r, 0.5, 0.2 + 0.1 * r); crowns.current.setColorAt(i, c);
      for (let j = 0; j < 3; j++) { // 열매 세 개를 잎 겉면에
        const a = (r * 6.28) + j * 2.1, rr = 0.08 * k;
        m.compose(new THREE.Vector3(x + Math.cos(a) * rr, y + (0.075 + 0.02 * j) * k, z + Math.sin(a) * rr), q, one);
        fruits.current.setMatrixAt(f++, m);
      }
    });
    for (const ref of [trunks, crowns, fruits]) ref.current.instanceMatrix.needsUpdate = true;
    crowns.current.instanceColor.needsUpdate = true;
  }, [spots]);
  return (
    <group>
      <instancedMesh ref={trunks} args={[null, null, spots.length]}><cylinderGeometry args={[0.009, 0.014, 0.06, 6]} /><meshStandardMaterial color="#6B4423" /></instancedMesh>
      <instancedMesh ref={crowns} args={[null, null, spots.length]}><sphereGeometry args={[1, 8, 6]} /><meshStandardMaterial roughness={0.8} /></instancedMesh>
      <instancedMesh ref={fruits} args={[null, null, spots.length * 3]}><sphereGeometry args={[0.02, 6, 5]} /><meshStandardMaterial color="#F28C1B" /></instancedMesh>
    </group>
  );
}

// 화면이 좁을수록(휴대폰) 카메라를 뒤로 물려서 섬 전체가 보이게 한다
function Fit() {
  const { camera, size } = useThree();
  useEffect(() => {
    const k = Math.max(1, 1.45 / (size.width / size.height));
    camera.position.set(0, 7.2 * k, 8.6 * k);
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height]);
  return null;
}

function Rain({ active }) {
  const ref = useRef();
  const N = 420;
  const positions = useMemo(() => {
    const a = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { a[i * 3] = (Math.random() - 0.5) * 12; a[i * 3 + 1] = Math.random() * 6; a[i * 3 + 2] = (Math.random() - 0.5) * 9; }
    return a;
  }, []);
  useFrame((_, dt) => {
    const attr = ref.current?.geometry.attributes.position;
    if (!attr) return;
    for (let i = 0; i < N; i++) { let y = attr.getY(i) - dt * 5; if (y < 0) y = 6; attr.setY(i, y); }
    attr.needsUpdate = true;
  });
  if (!active) return null;
  return (
    <points ref={ref}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
      <pointsMaterial color="#2f5f99" size={0.11} />
    </points>
  );
}

// 핀 = 귤 과수원 한 곳: 귤나무(열매가 가지에 붙어 있다) + 그 옆에 포개어 쌓은 귤 컨테이너(딴 귤이 담겨 있다). 땅에 떨어진 귤은 없다.
// 발판 색이 날씨 판단이다: 초록 = 수확 가능, 파랑 = 포장 작업만(컨테이너 위에 천막이 쳐진다), 회색 = 예보 없음. 선택된 핀은 노란 고리가 둘러싼다.
const CRATE_ORANGE = '#F57F17';
const CROWN_C = 0.36; // 잎 중심 높이
const PIN_FRUITS = Array.from({ length: 9 }, (_, i) => { // 잎 겉면에 매달린 열매 자리
  const az = i * 2.399963, phi = 0.45 + (((i * 5) % 7) / 7) * 1.05;
  return [Math.cos(az) * Math.sin(phi) * 0.255, CROWN_C + Math.cos(phi) * 0.187, Math.sin(az) * Math.sin(phi) * 0.255];
});
const CRATE_FRUITS = [[-0.08, 0.2, -0.04], [0, 0.2, 0.04], [0.08, 0.2, -0.04], [-0.04, 0.245, 0.02], [0.04, 0.245, -0.02], [0, 0.285, 0]]; // 컨테이너 안에 수북이 쌓인 귤
function Pin({ place, day, selected, onSelect, terrain }) {
  const [x, z] = place.pos;
  const y = terrain ? yOf(heightAt(terrain, place.lat, place.lng)) : 0.12; // 지형이 있으면 그 높이에 핀을 세운다
  const ok = day?.work === '수확 가능';
  const base = !day ? '#9AA0A6' : ok ? '#3E8E4E' : '#4A7BB5';
  const big = place.name === '제주시' || place.name === '서귀포시';
  return (
    <group position={[x, y, z]} scale={big ? 1 : 0.75} onClick={(e) => { e.stopPropagation(); onSelect(place.name); }}
      onPointerOver={() => { document.body.style.cursor = 'pointer'; }} onPointerOut={() => { document.body.style.cursor = ''; }}>
      {/* 발판 (날씨 판단 색) */}
      <mesh position={[0, 0.015, 0]}><cylinderGeometry args={[0.62, 0.62, 0.03, 32]} /><meshStandardMaterial color={base} roughness={0.8} /></mesh>
      {selected && <mesh position={[0, 0.04, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.64, 0.03, 10, 40]} /><meshStandardMaterial color="#FFC83D" emissive="#FFC83D" emissiveIntensity={0.5} /></mesh>}
      {/* 귤나무: 짧은 줄기 + 납작하고 둥근 잎 + 가지에 붙은 열매 */}
      <mesh position={[0, 0.14, 0]}><cylinderGeometry args={[0.035, 0.05, 0.24, 8]} /><meshStandardMaterial color="#6B4423" /></mesh>
      <mesh position={[0, CROWN_C, 0]} scale={[0.26, 0.19, 0.26]}><sphereGeometry args={[1, 18, 14]} /><meshStandardMaterial color="#2C5F25" roughness={0.9} /></mesh>
      {day && PIN_FRUITS.map((p, i) => <mesh key={i} position={p}><sphereGeometry args={[0.04, 10, 8]} /><meshStandardMaterial color="#F28C1B" roughness={0.5} /></mesh>)}
      {/* 날씨에 따라: 수확 가능이면 나무의 귤을 따서 컨테이너에 담고, 비 예보면 천막 아래에서 포장한다 */}
      {day && <Farmer mode={ok ? 'pick' : 'pack'} position={[0.3, 0, -0.22]} scale={0.3} yawTree={-0.97} yawCrate={0.3} phase={place.name.length * 0.7} />}
      {/* 귤 컨테이너 두 개를 포개어 쌓고, 위 컨테이너에 귤이 수북이 담긴다 */}
      <group position={[0.4, 0, 0.1]}>
        {[0.055, 0.165].map((cy) => (
          <group key={cy}>
            <mesh position={[0, cy, 0]}><boxGeometry args={[0.3, 0.11, 0.2]} /><meshStandardMaterial color={CRATE_ORANGE} roughness={0.5} /></mesh>
            <mesh position={[0, cy + 0.045, 0]}><boxGeometry args={[0.32, 0.025, 0.22]} /><meshStandardMaterial color="#FF9A2E" roughness={0.5} /></mesh>
            {[-1, 1].map((s) => <mesh key={s} position={[s * 0.158, cy + 0.02, 0]}><boxGeometry args={[0.02, 0.025, 0.09]} /><meshStandardMaterial color="#C9CED3" metalness={0.85} roughness={0.25} /></mesh>)}
          </group>
        ))}
        {day && CRATE_FRUITS.map((p, i) => <mesh key={i} position={p}><sphereGeometry args={[0.038, 10, 8]} /><meshStandardMaterial color="#F28C1B" roughness={0.5} /></mesh>)}
        {/* 비 예보(포장 작업만): 컨테이너 위에 천막 */}
        {day && !ok && (
          <group>
            {[[-0.2, -0.16], [0.2, -0.16], [-0.2, 0.16], [0.2, 0.16]].map(([px, pz]) => <mesh key={px + ',' + pz} position={[px, 0.22, pz]}><cylinderGeometry args={[0.008, 0.008, 0.44, 6]} /><meshStandardMaterial color="#6A5A48" /></mesh>)}
            <mesh position={[0, 0.5, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[0.36, 0.17, 4]} /><meshStandardMaterial color="#4A7BB5" /></mesh>
          </group>
        )}
      </group>
      {/* 이름표도 눌러서 열 수 있다 (핀이 작아서 이름표를 누르는 사람이 많다). 선택되면 이름표 자리에 날씨 카드가 열린다.
          Html 은 하나만 두고 안의 내용만 바꾼다 (Html 을 켰다 껐다 하면 React 오류가 난다) */}
      <Html position={[0, 0.95, 0]} center distanceFactor={9} zIndexRange={selected ? [20, 10] : [16, 0]}>
        {selected ? (
          <div className="j3d-pop" style={{ transform: `translate(${Math.max(-45, Math.min(45, -place.pos[0] * 9))}%, -30%)` }} role="dialog" aria-label={`${place.name} 날씨`}>
            <button type="button" className="j3d-close" aria-label="닫기" onClick={(e) => { e.stopPropagation(); onSelect(''); }}>×</button>
            <strong>{place.name}</strong>
            {day ? (
              <>
                <div className="j3d-pop-date">{Number(day.date.slice(4, 6))}월 {Number(day.date.slice(6, 8))}일</div>
                <div><WorkPill work={day.work} /></div>
                <ul>
                  <li>하늘 {day.sky ?? '정보 없음'}</li>
                  <li>기온 {temp(day)}</li>
                  <li>강수확률 최대 {day.maxPop ?? '?'}%</li>
                  {day.rainHours ? <li>비 오는 시간 {day.rainHours}시간</li> : null}
                </ul>
                {day.why && !day.why.startsWith('강수확률') && <div className="j3d-pop-why">{day.why}</div>}
              </>
            ) : <div>예보를 가져오지 못했습니다.</div>}
          </div>
        ) : (
          <button type="button" className="j3d-label j3d-click" onClick={(e) => { e.stopPropagation(); onSelect(place.name); }}>
            <strong>{place.name}</strong><span>{!day ? '불러오는 중' : day.work === '수확 가능' ? '☀ 수확 가능' : '🌧 ' + day.work}</span>
          </button>
        )}
      </Html>
    </group>
  );
}

export default function Jeju3D({ byPlace = {}, raining = false, selected = '', onSelect = () => {}, showTrees = true }) {
  // 지형 파일을 못 읽으면(null) 예전의 단순한 해안선 모양으로 보여 준다
  const [terrain, setTerrain] = useState(null);
  useEffect(() => { fetch('/data/jeju-terrain.json').then((r) => (r.ok ? r.json() : Promise.reject())).then(setTerrain).catch(() => {}); }, []);
  const peak = terrain ? yOf(1700) + 0.45 : 1.9;
  const sample = (x, z, t) => waveAt(x, z, t, raining ? 1.5 : 1); // 서퍼가 서 있는 자리의 바다 높이
  const skies = Object.values(byPlace).filter(Boolean).map((d) => SKY_LEVEL[d.sky]).filter((v) => v != null);
  const cloudLevel = skies.length ? skies.reduce((x, y) => x + y, 0) / skies.length : 0.4; // 11곳 하늘 상태의 평균
  return (
    <Canvas camera={{ position: [0, 7.2, 8.6], fov: 45 }} dpr={[1, 1.5]} style={{ height: 480, borderRadius: '1.1rem', background: raining ? '#a9bccd' : '#bfe6fb' }} aria-label="제주섬 3D 지도">
      <Fit />
      <ambientLight intensity={raining ? 0.7 : 0.9} />
      <directionalLight position={[6, 10, 5]} intensity={raining ? 0.6 : 1.1} />
      <Sea raining={raining} terrain={terrain} />
      <Clouds level={cloudLevel} raining={raining} />
      {/* 파도를 타는 서퍼 두 명(남쪽 바다와 동쪽 바다)과 하늘을 가로지르는 비행기 두 대. 크기는 눈에 보이게 과장했다 */}
      <Surfer from={toXZ(33.18, 126.33)} to={toXZ(33.18, 126.5)} sample={sample} phase={0} />
      <Surfer from={toXZ(33.37, 126.99)} to={toXZ(33.27, 126.99)} sample={sample} phase={3} board="#2A9D8F" suit="#B23A48" />
      <Plane y={3.3} z={-6.5} dir={1} phase={0} />
      <Plane y={4.2} z={-8.5} dir={-1} phase={17} scale={0.85} />
      {/* 날아다니는 새: 해안을 도는 갈매기 세 무리와 V자로 하늘을 가로지르는 새 한 무리 */}
      <Gulls center={toXZ(33.23, 126.55)} radius={2.1} y={1.15} n={5} />
      <Gulls center={toXZ(33.56, 126.45)} radius={1.7} y={1.3} n={4} phase={2} dir={-1} />
      <Gulls center={toXZ(33.4, 126.97)} radius={1.4} y={1.2} n={4} phase={4} />
      <VFlock y={2.6} z={-3.6} dir={1} speed={0.7} phase={5} />
      {terrain && <Crater t={terrain} />}
      {terrain && showTrees && <Orchard t={terrain} />}
      {terrain ? <Terrain t={terrain} raining={raining} /> : (
        <>
          <Island raining={raining} />
          <mesh position={[HALLA[0], 0.85, HALLA[1]]}><coneGeometry args={[1.25, 1.5, 32]} /><meshStandardMaterial color="#8d6e63" /></mesh>
          <mesh position={[HALLA[0], 1.48, HALLA[1]]}><coneGeometry args={[0.3, 0.26, 32]} /><meshStandardMaterial color="#ffffff" /></mesh>
        </>
      )}
      <Html position={[HALLA[0], peak + (terrain ? 0 : 0.1), HALLA[1]]} center distanceFactor={9} style={{ pointerEvents: 'none' }}><div className="j3d-label j3d-halla"><strong>한라산</strong></div></Html>
      {PLACES.map((p) => <Pin key={p.name} place={p} day={byPlace[p.name]} selected={selected === p.name} onSelect={onSelect} terrain={terrain} />)}
      <Rain active={raining} />
      <OrbitControls enablePan={false} minDistance={5} maxDistance={30} maxPolarAngle={Math.PI / 2.15} />
    </Canvas>
  );
}
