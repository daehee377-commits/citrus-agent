// 제주섬 3D: 해안선 + 한라산 + 제주시·서귀포시와 9개 읍·면 핀. 날씨 API의 "수확 가능 / 포장 작업만"에 따라 핀 색과 모양이 바뀌고,
// 포장 작업만(비 예보)인 날에는 빗방울이 내린다. 핀을 누르면 그 지역이 선택된다. 마우스로 돌리고 확대할 수 있다. (three.js + @react-three/fiber)
import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
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

function Island({ raining }) {
  const geo = useMemo(() => {
    const shape = new THREE.Shape(COAST.map(([lng, lat]) => new THREE.Vector2((lng - 126.55) * 0.84 * K, (lat - 33.34) * K)));
    return new THREE.ExtrudeGeometry(shape, { depth: 0.14, bevelEnabled: false });
  }, []);
  return <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}><meshStandardMaterial color={raining ? '#5f8f4a' : '#6aa84f'} /></mesh>;
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
function Pin({ place, day, selected, onSelect }) {
  const [x, z] = place.pos;
  const ok = day?.work === '수확 가능';
  const color = !day ? '#999999' : ok ? '#2F6B3C' : '#4A7BB5';
  const big = place.name === '제주시' || place.name === '서귀포시';
  return (
    <group position={[x, 0.12, z]} scale={big ? 1 : 0.7} onClick={(e) => { e.stopPropagation(); onSelect(place.name); }}
      onPointerOver={() => { document.body.style.cursor = 'pointer'; }} onPointerOut={() => { document.body.style.cursor = ''; }}>
      <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.04, 0.04, 1, 8]} /><meshStandardMaterial color="#5A4A3A" /></mesh>
      <mesh position={[0, 1.1, 0]}><sphereGeometry args={[0.24, 24, 24]} /><meshStandardMaterial color={color} /></mesh>
      {selected && <mesh position={[0, 1.1, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.4, 0.05, 12, 32]} /><meshStandardMaterial color="#FFC83D" emissive="#FFC83D" emissiveIntensity={0.4} /></mesh>}
      {ok && [[0.45, 0.14, 0.2], [-0.4, 0.14, 0.3], [0.1, 0.14, -0.45]].map((p, i) => (
        <mesh key={i} position={p}><sphereGeometry args={[0.14, 16, 16]} /><meshStandardMaterial color="#F08A1C" /></mesh>
      ))}
      {day && !ok && <mesh position={[0.45, 0.25, 0.2]}><coneGeometry args={[0.32, 0.5, 4]} /><meshStandardMaterial color="#4A7BB5" /></mesh>}
      <Html position={[0, 1.75, 0]} center distanceFactor={9} style={{ pointerEvents: 'none' }}>
        <div className={`j3d-label ${selected ? 'j3d-sel' : ''}`}><strong>{place.name}</strong>{big && <span>{day ? `${day.work} · 강수 ${day.maxPop ?? '?'}%` : '불러오는 중'}</span>}</div>
      </Html>
    </group>
  );
}

export default function Jeju3D({ byPlace = {}, raining = false, selected = '', onSelect = () => {} }) {
  return (
    <Canvas camera={{ position: [0, 7.2, 8.6], fov: 45 }} dpr={[1, 1.5]} style={{ height: 480, borderRadius: '1.1rem', background: raining ? '#a9bccd' : '#bfe6fb' }} aria-label="제주섬 3D 지도">
      <ambientLight intensity={raining ? 0.7 : 0.9} />
      <directionalLight position={[6, 10, 5]} intensity={raining ? 0.6 : 1.1} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]}><planeGeometry args={[40, 40]} /><meshStandardMaterial color={raining ? '#8fa8c0' : '#7cc8ee'} /></mesh>
      <Island raining={raining} />
      <mesh position={[HALLA[0], 0.85, HALLA[1]]}><coneGeometry args={[1.25, 1.5, 32]} /><meshStandardMaterial color="#8d6e63" /></mesh>
      <mesh position={[HALLA[0], 1.48, HALLA[1]]}><coneGeometry args={[0.3, 0.26, 32]} /><meshStandardMaterial color="#ffffff" /></mesh>
      <Html position={[HALLA[0], 2.0, HALLA[1]]} center distanceFactor={9} style={{ pointerEvents: 'none' }}><div className="j3d-label j3d-halla"><strong>한라산</strong></div></Html>
      {PLACES.map((p) => <Pin key={p.name} place={p} day={byPlace[p.name]} selected={selected === p.name} onSelect={onSelect} />)}
      <Rain active={raining} />
      <OrbitControls enablePan={false} minDistance={5} maxDistance={17} maxPolarAngle={Math.PI / 2.15} />
    </Canvas>
  );
}
