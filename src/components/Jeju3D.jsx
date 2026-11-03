// 제주섬 3D: 해안선 + 한라산 + 제주시·서귀포시와 9개 읍·면 핀. 날씨 API의 "수확 가능 / 포장 작업만"에 따라 핀 색과 모양이 바뀌고,
// 포장 작업만(비 예보)인 날에는 빗방울이 내린다. 핀을 누르면 그 지역이 선택된다. 마우스로 돌리고 확대할 수 있다. (three.js + @react-three/fiber)
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import WorkPill from './WorkPill.jsx';
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
const yOf = (h) => (h > 0 ? 0.05 + h * HEIGHT_SCALE : SEA);
const STOPS = [[0, [0.50, 0.75, 0.39]], [200, [0.37, 0.62, 0.27]], [700, [0.28, 0.47, 0.22]], [1300, [0.55, 0.42, 0.31]], [1800, [0.95, 0.95, 0.95]]]; // 낮은 곳 연두 → 높은 곳 갈색 → 꼭대기 흰색
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
    const { cols, rows } = t, stepLng = (t.lng1 - t.lng0) / (cols - 1), stepLat = (t.lat1 - t.lat0) / (rows - 1);
    const pos = new Float32Array(cols * rows * 3), col = new Float32Array(cols * rows * 3);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const h = t.data[r * cols + c], [x, z] = toXZ(t.lat1 - r * stepLat, t.lng0 + c * stepLng), i = (r * cols + c) * 3;
      pos.set([x, yOf(h), z], i); col.set(h > 0 ? colorOf(h) : [0.3, 0.5, 0.6], i);
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

// 핀: 수확 가능이면 초록 핀 + 감귤 3개, 포장 작업만이면 파란 핀 + 천막(원뿔), 예보를 못 가져온 곳은 회색. 선택된 핀은 노란 고리가 둘러싼다.
function Pin({ place, day, selected, onSelect, terrain }) {
  const [x, z] = place.pos;
  const y = terrain ? yOf(heightAt(terrain, place.lat, place.lng)) : 0.12; // 지형이 있으면 그 높이에 핀을 세운다
  const ok = day?.work === '수확 가능';
  const color = !day ? '#999999' : ok ? '#2F6B3C' : '#4A7BB5';
  const big = place.name === '제주시' || place.name === '서귀포시';
  return (
    <group position={[x, y, z]} scale={big ? 1 : 0.7} onClick={(e) => { e.stopPropagation(); onSelect(place.name); }}
      onPointerOver={() => { document.body.style.cursor = 'pointer'; }} onPointerOut={() => { document.body.style.cursor = ''; }}>
      <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.04, 0.04, 1, 8]} /><meshStandardMaterial color="#5A4A3A" /></mesh>
      <mesh position={[0, 1.1, 0]}><sphereGeometry args={[0.24, 24, 24]} /><meshStandardMaterial color={color} /></mesh>
      {selected && <mesh position={[0, 1.1, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.4, 0.05, 12, 32]} /><meshStandardMaterial color="#FFC83D" emissive="#FFC83D" emissiveIntensity={0.4} /></mesh>}
      {ok && [[0.45, 0.14, 0.2], [-0.4, 0.14, 0.3], [0.1, 0.14, -0.45]].map((p, i) => (
        <mesh key={i} position={p}><sphereGeometry args={[0.14, 16, 16]} /><meshStandardMaterial color="#F08A1C" /></mesh>
      ))}
      {day && !ok && <mesh position={[0.45, 0.25, 0.2]}><coneGeometry args={[0.32, 0.5, 4]} /><meshStandardMaterial color="#4A7BB5" /></mesh>}
      {/* 이름표도 눌러서 열 수 있다 (핀이 작아서 이름표를 누르는 사람이 많다). 선택되면 이름표 대신 날씨 카드가 열린다 */}
      {!selected && (
        <Html position={[0, 1.75, 0]} center distanceFactor={9}>
          <button type="button" className="j3d-label j3d-click" onClick={(e) => { e.stopPropagation(); onSelect(place.name); }}>
            <strong>{place.name}</strong><span>{!day ? '불러오는 중' : day.work === '수확 가능' ? '☀ 수확 가능' : '🌧 ' + day.work}</span>
          </button>
        </Html>
      )}
      {selected && (
        <Html position={[0, 2.2, 0]} center distanceFactor={9} zIndexRange={[20, 10]}>
          <div className="j3d-pop" style={{ transform: `translateX(${Math.max(-45, Math.min(45, -place.pos[0] * 9))}%)` }} role="dialog" aria-label={`${place.name} 날씨`}>
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
        </Html>
      )}
    </group>
  );
}

export default function Jeju3D({ byPlace = {}, raining = false, selected = '', onSelect = () => {} }) {
  // 지형 파일을 못 읽으면(null) 예전의 단순한 해안선 모양으로 보여 준다
  const [terrain, setTerrain] = useState(null);
  useEffect(() => { fetch('/data/jeju-terrain.json').then((r) => (r.ok ? r.json() : Promise.reject())).then(setTerrain).catch(() => {}); }, []);
  const peak = terrain ? yOf(1700) + 0.35 : 1.9;
  return (
    <Canvas camera={{ position: [0, 7.2, 8.6], fov: 45 }} dpr={[1, 1.5]} style={{ height: 480, borderRadius: '1.1rem', background: raining ? '#a9bccd' : '#bfe6fb' }} aria-label="제주섬 3D 지도">
      <Fit />
      <ambientLight intensity={raining ? 0.7 : 0.9} />
      <directionalLight position={[6, 10, 5]} intensity={raining ? 0.6 : 1.1} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]}><planeGeometry args={[40, 40]} /><meshStandardMaterial color={raining ? '#8fa8c0' : '#7cc8ee'} /></mesh>
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
