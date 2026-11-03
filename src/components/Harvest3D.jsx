// 감귤 수확 애니메이션: 감귤나무의 열매를 따서 바구니에 담는다. 날씨 API가 "포장 작업만"(비 예보)이면 수확 대신 빗방울이 내리고 수확 버튼이 잠긴다.
// 열매를 눌러서 하나씩 따거나, "한 번에 수확"으로 차례로 날아가 담기는 것을 볼 수 있다. (three.js + @react-three/fiber)
import { useMemo, useRef, useState, useEffect, useLayoutEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

const BASKET = new THREE.Vector3(2.4, 0.35, 1.2);
const FLIGHT = 0.9; // 열매가 바구니까지 날아가는 시간(초)

// 귤나무 수관(잎이 모인 둥근 부분)은 납작한 타원체다. 열매는 그 겉면에 매달려서 잎 사이로 튀어나와 보인다. (매번 같은 모양이 되도록 고정된 수식 사용)
const CANOPY = { cy: 2.55, rx: 1.55, ry: 1.25, rz: 1.55 };
const FRUITS = Array.from({ length: 16 }, (_, i) => {
  const a = i * 2.399963, h = 1.95 + ((i * 37) % 17) / 17 * 1.3;
  const surface = CANOPY.rx * Math.sqrt(Math.max(0.05, 1 - ((h - CANOPY.cy) / CANOPY.ry) ** 2)); // 그 높이에서 수관 겉면의 반지름
  const r = surface * (1 + (((i * 13) % 7) / 7) * 0.06);
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
      <meshStandardMaterial color="#F28C1B" roughness={0.5} />
      <mesh position={[0, 0.2, 0]} scale={[1, 0.45, 1]}><sphereGeometry args={[0.06, 8, 6]} /><meshStandardMaterial color="#3E7D2B" /></mesh>{/* 꼭지 */}
    </mesh>
  );
}

// 잎: 작은 타원체 수백 개를 수관 겉면에 흩뿌린다 (InstancedMesh 한 번에 그려서 가볍다). 잎마다 초록 농도를 조금씩 다르게 칠한다.
function Leaves({ n, center, rx, ry, rz, seed, size = 1 }) {
  const ref = useRef();
  useLayoutEffect(() => {
    let s = seed; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, k = Math.sqrt(1 - u * u), uy = u;
      const rad = 0.9 + 0.12 * rnd();
      p.set(center[0] + k * Math.cos(th) * rx * rad, center[1] + uy * ry * rad, center[2] + k * Math.sin(th) * rz * rad);
      e.set(rnd() * 3, rnd() * 3, rnd() * 3); q.setFromEuler(e);
      sc.set(0.19 * size, 0.08 * size, 0.12 * size); m.compose(p, q, sc);
      ref.current.setMatrixAt(i, m);
      c.setHSL(0.27 + 0.06 * rnd(), 0.55, 0.16 + 0.16 * rnd()); ref.current.setColorAt(i, c);
    }
    ref.current.instanceMatrix.needsUpdate = true; ref.current.instanceColor.needsUpdate = true;
  }, [n, seed, center, rx, ry, rz, size]);
  return <instancedMesh ref={ref} args={[null, null, n]} castShadow><sphereGeometry args={[1, 6, 4]} /><meshStandardMaterial roughness={0.55} /></instancedMesh>;
}
const CENTER = [0, CANOPY.cy, 0];

function Tree() {
  return (
    <group>
      {/* 줄기와 굵은 가지 세 개 */}
      <mesh position={[0, 0.7, 0]} castShadow><cylinderGeometry args={[0.16, 0.28, 1.5, 12]} /><meshStandardMaterial color="#6B4423" roughness={0.9} /></mesh>
      {[[0.45, 1.75, 0.1, -0.55], [-0.4, 1.8, -0.2, 0.6], [0.05, 1.8, 0.45, -0.3]].map(([x, y, z, rot], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[i === 2 ? 0.5 : 0.1, 0, rot]} castShadow><cylinderGeometry args={[0.07, 0.12, 1.0, 8]} /><meshStandardMaterial color="#6B4423" roughness={0.9} /></mesh>
      ))}
      <mesh position={CENTER} scale={[CANOPY.rx * 0.9, CANOPY.ry * 0.9, CANOPY.rz * 0.9]} castShadow><sphereGeometry args={[1, 20, 16]} /><meshStandardMaterial color="#2C5F25" roughness={0.9} /></mesh>
      <Leaves n={1100} center={CENTER} rx={CANOPY.rx} ry={CANOPY.ry} rz={CANOPY.rz} seed={11} />
    </group>
  );
}

// 배경 귤나무: 주변 과수원 느낌을 내는 작은 나무들. 열매는 장식이라 눌러도 반응이 없다.
function DecorTree({ x, z, s, seed }) {
  const c = useMemo(() => [0, CANOPY.cy, 0], []);
  const dots = useMemo(() => Array.from({ length: 9 }, (_, i) => {
    const a = (i + seed) * 2.399963, h = 2.0 + ((i * 37 + seed) % 17) / 17 * 1.2;
    const sr = CANOPY.rx * Math.sqrt(Math.max(0.05, 1 - ((h - CANOPY.cy) / CANOPY.ry) ** 2));
    return [Math.cos(a) * sr, h, Math.sin(a) * sr];
  }), [seed]);
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh position={[0, 0.7, 0]}><cylinderGeometry args={[0.16, 0.28, 1.5, 8]} /><meshStandardMaterial color="#6B4423" /></mesh>
      <mesh position={c} scale={[CANOPY.rx * 0.9, CANOPY.ry * 0.9, CANOPY.rz * 0.9]}><sphereGeometry args={[1, 14, 10]} /><meshStandardMaterial color="#2C5F25" roughness={0.9} /></mesh>
      <Leaves n={420} center={c} rx={CANOPY.rx} ry={CANOPY.ry} rz={CANOPY.rz} seed={seed} />
      {dots.map((p, i) => <mesh key={i} position={p}><sphereGeometry args={[0.17, 10, 8]} /><meshStandardMaterial color="#F28C1B" roughness={0.5} /></mesh>)}
    </group>
  );
}
const DECOR = [[-4.6, -2.6, 0.7, 3], [-3.2, -5.2, 0.6, 5], [4.4, -4.3, 0.72, 7], [5.4, -1.2, 0.62, 9], [-5.2, 1.6, 0.66, 13], [0.8, -5.6, 0.58, 17]];

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
        {DECOR.map(([x, z, s, seed]) => <DecorTree key={seed} x={x} z={z} s={s} seed={seed} />)}
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
