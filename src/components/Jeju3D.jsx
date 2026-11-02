// 제주섬 3D: 한라산 + 제주시·서귀포시 핀. 날씨 API의 "수확 가능 / 포장 작업만"에 따라 핀 색과 모양이 바뀌고,
// 포장 작업만(비 예보)인 날에는 빗방울이 내린다. 마우스로 돌리고 확대할 수 있다. (three.js + @react-three/fiber)
import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';

const K = 16; // 위도·경도 1도를 3D 길이로 바꾸는 배율
const toXZ = (lat, lng) => [(lng - 126.55) * 0.84 * K, (33.34 - lat) * K]; // 0.84 = 제주 위도에서 경도 1도가 위도 1도보다 짧은 비율
const HALLA = toXZ(33.3617, 126.5292); // 한라산 백록담 부근
const PLACES = [
  { name: '제주시', pos: toXZ(33.4996, 126.5312), label: [0, 1.65, 0] },
  { name: '서귀포시', pos: toXZ(33.2541, 126.5601), label: [1.5, 1.15, 0.1] }, // 한라산을 가리지 않게 이름표를 옆으로
];

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

// 핀: 수확 가능이면 초록 핀 + 감귤 3개, 포장 작업만이면 파란 핀 + 천막(원뿔)
function Pin({ place, day }) {
  const [x, z] = place.pos;
  const ok = day?.work === '수확 가능';
  const color = !day ? '#999999' : ok ? '#2F6B3C' : '#4A7BB5';
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.04, 0.04, 1, 8]} /><meshStandardMaterial color="#5A4A3A" /></mesh>
      <mesh position={[0, 1.1, 0]}><sphereGeometry args={[0.24, 24, 24]} /><meshStandardMaterial color={color} /></mesh>
      {ok && [[0.45, 0.14, 0.2], [-0.4, 0.14, 0.3], [0.1, 0.14, -0.45]].map((p, i) => (
        <mesh key={i} position={p}><sphereGeometry args={[0.14, 16, 16]} /><meshStandardMaterial color="#F08A1C" /></mesh>
      ))}
      {day && !ok && <mesh position={[0.45, 0.25, 0.2]}><coneGeometry args={[0.32, 0.5, 4]} /><meshStandardMaterial color="#4A7BB5" /></mesh>}
      <Html position={place.label} center distanceFactor={9}>
        <div className="j3d-label"><strong>{place.name}</strong><span>{day ? `${day.work} · 강수 ${day.maxPop ?? '?'}%` : '불러오는 중'}</span></div>
      </Html>
    </group>
  );
}

export default function Jeju3D({ byPlace = {}, raining = false }) {
  return (
    <Canvas camera={{ position: [0, 6.2, 7.4], fov: 45 }} dpr={[1, 1.5]} style={{ height: 440, borderRadius: '1.1rem', background: raining ? '#a9bccd' : '#bfe6fb' }} aria-label="제주섬 3D 지도">
      <ambientLight intensity={raining ? 0.7 : 0.9} />
      <directionalLight position={[6, 10, 5]} intensity={raining ? 0.6 : 1.1} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]}><planeGeometry args={[40, 40]} /><meshStandardMaterial color={raining ? '#8fa8c0' : '#7cc8ee'} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.667, 1]}><circleGeometry args={[5.4, 64]} /><meshStandardMaterial color="#6aa84f" /></mesh>
      <mesh position={[HALLA[0], 0.75, HALLA[1]]}><coneGeometry args={[1.25, 1.5, 32]} /><meshStandardMaterial color="#8d6e63" /></mesh>
      <mesh position={[HALLA[0], 1.38, HALLA[1]]}><coneGeometry args={[0.3, 0.26, 32]} /><meshStandardMaterial color="#ffffff" /></mesh>
      <Html position={[HALLA[0], 1.9, HALLA[1]]} center distanceFactor={9}><div className="j3d-label j3d-halla"><strong>한라산</strong></div></Html>
      {PLACES.map((p) => <Pin key={p.name} place={p} day={byPlace[p.name]} />)}
      <Rain active={raining} />
      <OrbitControls enablePan={false} minDistance={5} maxDistance={16} maxPolarAngle={Math.PI / 2.15} />
    </Canvas>
  );
}
