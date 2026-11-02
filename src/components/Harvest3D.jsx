// 감귤 수확 애니메이션: 감귤나무의 열매를 따서 바구니에 담는다. 날씨 API가 "포장 작업만"(비 예보)이면 수확 대신 빗방울이 내리고 수확 버튼이 잠긴다.
// 열매를 눌러서 하나씩 따거나, "한 번에 수확"으로 차례로 날아가 담기는 것을 볼 수 있다. (three.js + @react-three/fiber)
import { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

const BASKET = new THREE.Vector3(2.4, 0.35, 1.2);
const FLIGHT = 0.9; // 열매가 바구니까지 날아가는 시간(초)

// 나무 둘레에 열매 자리를 고르게 뿌린다 (매번 같은 모양이 되도록 고정된 수식 사용)
const FRUITS = Array.from({ length: 16 }, (_, i) => {
  const a = i * 2.399963, h = 1.9 + ((i * 37) % 17) / 17 * 1.6, r = 0.95 + (((i * 13) % 7) / 7) * 0.5;
  return new THREE.Vector3(Math.cos(a) * r, h, Math.sin(a) * r);
});

function Fruit({ home, state, onPick }) {
  const ref = useRef();
  const t0 = useRef(null);
  useFrame(({ clock }) => {
    const m = ref.current; if (!m) return;
    if (state.status === 'picked') {
      if (t0.current == null) t0.current = clock.elapsedTime;
      const k = Math.min(1, (clock.elapsedTime - t0.current) / FLIGHT);
      const e = k * k * (3 - 2 * k);
      m.position.lerpVectors(home, BASKET, e);
      m.position.y += Math.sin(k * Math.PI) * 1.4; // 포물선으로 날아간다
      m.rotation.x += 0.12;
      if (k >= 1 && !state.landed) state.landed = true;
    } else { t0.current = null; m.position.copy(home); m.rotation.set(0, 0, 0); }
  });
  return (
    <mesh ref={ref} position={home} castShadow onClick={(e) => { e.stopPropagation(); onPick(); }} onPointerOver={() => { document.body.style.cursor = 'pointer'; }} onPointerOut={() => { document.body.style.cursor = ''; }}>
      <sphereGeometry args={[0.2, 20, 20]} />
      <meshStandardMaterial color="#F28C1B" roughness={0.55} />
    </mesh>
  );
}

function Tree() {
  return (
    <group>
      <mesh position={[0, 0.9, 0]} castShadow><cylinderGeometry args={[0.18, 0.28, 1.8, 12]} /><meshStandardMaterial color="#7A4B1E" /></mesh>
      <mesh position={[0, 2.7, 0]} castShadow><sphereGeometry args={[1.45, 24, 24]} /><meshStandardMaterial color="#4E8F45" roughness={0.9} /></mesh>
      <mesh position={[0.5, 3.4, 0.3]} castShadow><sphereGeometry args={[0.95, 20, 20]} /><meshStandardMaterial color="#5FA356" roughness={0.9} /></mesh>
    </group>
  );
}

function Basket({ count }) {
  const fill = Math.min(count, 12);
  return (
    <group position={[BASKET.x, 0, BASKET.z]}>
      <mesh position={[0, 0.3, 0]} castShadow><cylinderGeometry args={[0.55, 0.42, 0.6, 20, 1, true]} /><meshStandardMaterial color="#B98A4E" side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.42, 0.42, 0.04, 20]} /><meshStandardMaterial color="#8E6636" /></mesh>
      {Array.from({ length: fill }, (_, i) => (
        <mesh key={i} position={[Math.cos(i * 2.4) * 0.28, 0.2 + Math.floor(i / 5) * 0.2, Math.sin(i * 2.4) * 0.28]}>
          <sphereGeometry args={[0.18, 14, 14]} /><meshStandardMaterial color="#F28C1B" />
        </mesh>
      ))}
    </group>
  );
}

function Rain({ active }) {
  const ref = useRef();
  const N = 360;
  const positions = useMemo(() => {
    const a = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { a[i * 3] = (Math.random() - 0.5) * 10; a[i * 3 + 1] = Math.random() * 7; a[i * 3 + 2] = (Math.random() - 0.5) * 8; }
    return a;
  }, []);
  useFrame((_, dt) => {
    const attr = ref.current?.geometry.attributes.position; if (!attr) return;
    for (let i = 0; i < N; i++) { let y = attr.getY(i) - dt * 6; if (y < 0) y = 7; attr.setY(i, y); }
    attr.needsUpdate = true;
  });
  if (!active) return null;
  return (
    <points ref={ref}>
      <bufferGeometry><bufferAttribute attach="attributes-position" array={positions} count={N} itemSize={3} /></bufferGeometry>
      <pointsMaterial color="#6B9AD6" size={0.06} />
    </points>
  );
}

// 천막: 비 오는 날에는 천막 아래에서 포장 작업만 한다
function Tent({ show }) {
  if (!show) return null;
  return (
    <group position={[BASKET.x, 0, BASKET.z]}>
      <mesh position={[0, 1.7, 0]}><coneGeometry args={[1.4, 0.8, 4]} /><meshStandardMaterial color="#3F6FB5" /></mesh>
      {[[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.8, z]}><cylinderGeometry args={[0.04, 0.04, 1.6, 8]} /><meshStandardMaterial color="#6A5A48" /></mesh>
      ))}
    </group>
  );
}

export default function Harvest3D({ raining, picked, onPick, resetKey }) {
  const states = useRef(FRUITS.map(() => ({ status: 'tree', landed: false })));
  const [, force] = useState(0);
  useEffect(() => { states.current.forEach((s) => { s.status = 'tree'; s.landed = false; }); force((n) => n + 1); }, [resetKey]);

  const pick = (i) => {
    if (raining || states.current[i].status === 'picked') return;
    states.current[i].status = 'picked'; force((n) => n + 1); onPick(i);
  };
  // 부모가 "한 번에 수확"을 누르면 0.25초 간격으로 차례로 딴다
  useEffect(() => {
    if (!picked?.all || raining) return undefined;
    const timers = FRUITS.map((_, i) => setTimeout(() => pick(i), i * 250));
    return () => timers.forEach(clearTimeout);
  }, [picked?.all, picked?.stamp]); // eslint-disable-line react-hooks/exhaustive-deps

  const count = states.current.filter((s) => s.status === 'picked').length;
  return (
    <div role="img" aria-label="감귤나무에서 열매를 따서 바구니에 담는 3D 화면">
      <Canvas shadows dpr={[1, 1.5]} camera={{ position: [5.2, 3.6, 6.2], fov: 45 }} style={{ height: 460, borderRadius: '1.1rem' }}>
        <color attach="background" args={[raining ? '#B7C3D0' : '#CFE8F7']} />
        <ambientLight intensity={raining ? 0.7 : 0.9} />
        <directionalLight position={[5, 8, 4]} intensity={raining ? 0.8 : 1.6} castShadow />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><circleGeometry args={[7, 48]} /><meshStandardMaterial color={raining ? '#6E8F62' : '#7DB36B'} /></mesh>
        <Tree />
        {FRUITS.map((p, i) => <Fruit key={i} home={p} state={states.current[i]} onPick={() => pick(i)} />)}
        <Basket count={count} />
        <Tent show={raining} />
        <Rain active={raining} />
        <OrbitControls enablePan={false} minDistance={4} maxDistance={12} maxPolarAngle={Math.PI / 2.1} target={[0.8, 1.6, 0.5]} />
      </Canvas>
    </div>
  );
}

export const FRUIT_COUNT = FRUITS.length;
