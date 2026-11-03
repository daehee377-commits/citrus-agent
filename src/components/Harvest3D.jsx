// 감귤 수확 애니메이션: 감귤나무의 열매를 따서 바구니에 담는다. 날씨 API가 "포장 작업만"(비 예보)이면 수확 대신 빗방울이 내리고 수확 버튼이 잠긴다.
// 열매를 눌러서 하나씩 따거나, "한 번에 수확"으로 차례로 날아가 담기는 것을 볼 수 있다. (three.js + @react-three/fiber)
import { useMemo, useRef, useState, useEffect, useLayoutEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Farmer } from './Figures.jsx';

const BASKET = new THREE.Vector3(3.1, 0.35, 1.3); // 컨테이너 자리. 나무(잎 반지름 1.3)와 천막 기둥이 겹치지 않게 나무에서 떨어뜨렸다
const FLIGHT = 0.9; // 열매가 상자까지 날아가는 시간(초)
const FRUIT_R = 0.16;
// 컨테이너 안 자리: 한 층에 6개(3×2), 층마다 조금씩 어긋나게 쌓고 가장자리 위로 수북이 올라온다. 딴 열매가 바닥에 떨어져 있지 않고 모두 컨테이너 안에 담긴다.
const SLOTS = Array.from({ length: 16 }, (_, i) => {
  const layer = Math.floor(i / 6), w = i % 6, col = w % 3, row = Math.floor(w / 3);
  return new THREE.Vector3(BASKET.x + (col - 1) * 0.34 + (layer % 2 ? 0.12 : 0), 0.7 + layer * 0.24, BASKET.z + (row - 0.5) * 0.34);
});

// 귤나무 수관(잎이 모인 둥근 부분)은 납작한 타원체다. 열매는 그 겉면에 매달려서 잎 사이로 튀어나와 보인다. (매번 같은 모양이 되도록 고정된 수식 사용)
const CANOPY = { cy: 1.75, rx: 1.3, ry: 0.95, rz: 1.3 };
const FRUITS = Array.from({ length: 16 }, (_, i) => {
  const a = i * 2.399963, h = CANOPY.cy - 0.55 + ((i * 37) % 17) / 17 * 1.0;
  const surface = CANOPY.rx * Math.sqrt(Math.max(0.05, 1 - ((h - CANOPY.cy) / CANOPY.ry) ** 2)); // 그 높이에서 수관 겉면의 반지름
  const r = surface * (1 + (((i * 13) % 7) / 7) * 0.06);
  return new THREE.Vector3(Math.cos(a) * r, h, Math.sin(a) * r);
});

function Fruit({ home, land, state, onPick }) {
  const ref = useRef();
  const t0 = useRef(null);
  useFrame(({ clock }) => {
    const m = ref.current; if (!m) return;
    if (state.status === 'picked') {
      if (t0.current == null) t0.current = clock.elapsedTime;
      const k = Math.min(1, (clock.elapsedTime - t0.current) / FLIGHT);
      const e = k * k * (3 - 2 * k);
      m.position.lerpVectors(home, land, e);
      m.position.y += Math.sin(k * Math.PI) * 1.4; // 포물선으로 날아간다
      m.rotation.x += 0.12;
      if (k >= 1 && !state.landed) state.landed = true;
    } else { t0.current = null; m.position.copy(home); m.rotation.set(0, 0, 0); }
  });
  return (
    <mesh ref={ref} position={home} castShadow onClick={(e) => { e.stopPropagation(); onPick(); }} onPointerOver={() => { document.body.style.cursor = 'pointer'; }} onPointerOut={() => { document.body.style.cursor = ''; }}>
      <sphereGeometry args={[FRUIT_R, 20, 20]} />
      <meshStandardMaterial color="#F28C1B" roughness={0.5} />
      <mesh position={[0, FRUIT_R, 0]} scale={[1, 0.45, 1]}><sphereGeometry args={[0.05, 8, 6]} /><meshStandardMaterial color="#3E7D2B" /></mesh>{/* 꼭지 */}
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
      sc.set(0.16 * size, 0.07 * size, 0.1 * size); m.compose(p, q, sc);
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
      <mesh position={[0, 0.5, 0]} castShadow><cylinderGeometry args={[0.13, 0.22, 1.0, 12]} /><meshStandardMaterial color="#6B4423" roughness={0.9} /></mesh>
      {[[0.35, 1.2, 0.08, -0.55], [-0.3, 1.25, -0.15, 0.6], [0.04, 1.25, 0.32, -0.3]].map(([x, y, z, rot], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[i === 2 ? 0.5 : 0.1, 0, rot]} castShadow><cylinderGeometry args={[0.05, 0.09, 0.7, 8]} /><meshStandardMaterial color="#6B4423" roughness={0.9} /></mesh>
      ))}
      <mesh position={CENTER} scale={[CANOPY.rx * 0.9, CANOPY.ry * 0.9, CANOPY.rz * 0.9]} castShadow><sphereGeometry args={[1, 20, 16]} /><meshStandardMaterial color="#2C5F25" roughness={0.9} /></mesh>
      <Leaves n={800} center={CENTER} rx={CANOPY.rx} ry={CANOPY.ry} rz={CANOPY.rz} seed={11} />
    </group>
  );
}

// 배경 귤나무: 주변 과수원 느낌을 내는 작은 나무들. 열매는 장식이라 눌러도 반응이 없다.
function DecorTree({ x, z, s, seed }) {
  const c = useMemo(() => [0, CANOPY.cy, 0], []);
  const dots = useMemo(() => Array.from({ length: 9 }, (_, i) => {
    const a = (i + seed) * 2.399963, h = CANOPY.cy - 0.45 + ((i * 37 + seed) % 17) / 17 * 0.9;
    const sr = CANOPY.rx * Math.sqrt(Math.max(0.05, 1 - ((h - CANOPY.cy) / CANOPY.ry) ** 2));
    return [Math.cos(a) * sr, h, Math.sin(a) * sr];
  }), [seed]);
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.13, 0.22, 1.0, 8]} /><meshStandardMaterial color="#6B4423" /></mesh>
      <mesh position={c} scale={[CANOPY.rx * 0.9, CANOPY.ry * 0.9, CANOPY.rz * 0.9]}><sphereGeometry args={[1, 14, 10]} /><meshStandardMaterial color="#2C5F25" roughness={0.9} /></mesh>
      <Leaves n={300} center={c} rx={CANOPY.rx} ry={CANOPY.ry} rz={CANOPY.rz} seed={seed} />
      {dots.map((p, i) => <mesh key={i} position={p}><sphereGeometry args={[0.13, 10, 8]} /><meshStandardMaterial color="#F28C1B" roughness={0.5} /></mesh>)}
    </group>
  );
}
const DECOR = [[-4.6, -2.6, 0.7, 3], [-3.2, -5.2, 0.6, 5], [4.4, -4.3, 0.72, 7], [5.4, -1.2, 0.62, 9], [-5.2, 1.6, 0.66, 13], [0.8, -5.6, 0.58, 17]];

// 귤 컨테이너: 제주에서 쓰는 주황색 플라스틱 수확 상자. 옆면에 세로 환기 구멍이 두 줄, 양 끝에 은색 손잡이가 있고, 두 개를 포개어 쌓는다.
// 열매는 위 상자에 담기고 가장자리 위로 수북이 올라온다. (구멍 수백 개는 InstancedMesh 한 번에 그린다)
const CW = 1.25, CD = 0.8, CH = 0.5, CT = 0.04; // 상자 길이·폭·높이·벽 두께
function Crate({ y }) {
  const orange = '#F57F17', lip = '#FF9A2E';
  const slits = useRef();
  useLayoutEffect(() => {
    const m = new THREE.Matrix4(); let n = 0;
    const put = (x, yy, z, rotY) => { m.compose(new THREE.Vector3(x, yy, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotY, 0)), new THREE.Vector3(1, 1, 1)); slits.current.setMatrixAt(n++, m); };
    for (const row of [0.14, 0.36]) { // 두 줄
      for (let i = 0; i < 14; i++) { const x = -0.5 + i * (1.0 / 13); put(x, row, CD / 2, 0); put(x, row, -CD / 2, 0); } // 긴 옆면
      for (let i = 0; i < 8; i++) { const z = -0.28 + i * (0.56 / 7); put(CW / 2, row, z, Math.PI / 2); put(-CW / 2, row, z, Math.PI / 2); } // 짧은 옆면
    }
    slits.current.count = n; slits.current.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <group position={[0, y, 0]}>
      <mesh position={[0, CT / 2, 0]} castShadow><boxGeometry args={[CW, CT, CD]} /><meshStandardMaterial color={orange} roughness={0.5} /></mesh>
      {[-1, 1].map((s) => <mesh key={'z' + s} position={[0, CH / 2, s * (CD / 2 - CT / 2)]} castShadow><boxGeometry args={[CW, CH, CT]} /><meshStandardMaterial color={orange} roughness={0.5} /></mesh>)}
      {[-1, 1].map((s) => <mesh key={'x' + s} position={[s * (CW / 2 - CT / 2), CH / 2, 0]} castShadow><boxGeometry args={[CT, CH, CD]} /><meshStandardMaterial color={orange} roughness={0.5} /></mesh>)}
      {/* 윗가장자리 테두리 */}
      <mesh position={[0, CH - 0.015, 0]}><boxGeometry args={[CW + 0.04, 0.03, CD + 0.04]} /><meshStandardMaterial color={lip} roughness={0.5} /></mesh>
      <mesh position={[0, CH - 0.015, 0]}><boxGeometry args={[CW - 0.1, 0.034, CD - 0.1]} /><meshStandardMaterial color="#2b1a08" /></mesh>
      {/* 환기 구멍: 어두운 세로 홈 */}
      <instancedMesh ref={slits} args={[null, null, 80]}><boxGeometry args={[0.035, 0.14, 0.012]} /><meshStandardMaterial color="#6b2f00" /></instancedMesh>
      {/* 은색 손잡이 (양 끝) */}
      {[-1, 1].map((s) => (
        <group key={'h' + s} position={[s * (CW / 2 + 0.02), CH - 0.1, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}><boxGeometry args={[0.03, 0.34, 0.03]} /><meshStandardMaterial color="#C9CED3" metalness={0.85} roughness={0.25} /></mesh>
          {[-1, 1].map((q) => <mesh key={q} position={[s * -0.015, 0, q * 0.17]}><boxGeometry args={[0.05, 0.03, 0.03]} /><meshStandardMaterial color="#C9CED3" metalness={0.85} roughness={0.25} /></mesh>)}
        </group>
      ))}
    </group>
  );
}
function Basket() {
  return (
    <group position={[BASKET.x, 0, BASKET.z]}>
      <Crate y={0} />
      <Crate y={CH} />
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
// 비 오는 날의 천막: 컨테이너, 포장 작업을 하는 농부, 택배 박스까지 덮는 정사각 천막(기둥 네 개)
function Tent({ show }) {
  if (!show) return null;
  return (
    <group position={[BASKET.x, 0, BASKET.z]}>
      <mesh position={[0, 2.45, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[2.45, 0.9, 4]} /><meshStandardMaterial color="#3F6FB5" /></mesh>
      {[[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]].map(([x, z], i) => (
        <mesh key={i} position={[x, 1.0, z]}><cylinderGeometry args={[0.045, 0.045, 2.0, 8]} /><meshStandardMaterial color="#6A5A48" /></mesh>
      ))}
    </group>
  );
}

// 택배 박스: 갈색 골판지 상자. 윗면 가운데에 테이프, 앞면에 "제주 감귤" 스티커. open 이면 윗덮개 네 장이 바깥으로 젖혀져 있다.
const BW = 0.55, BH = 0.38, BD = 0.42;
function CardboardBox({ position, rotY = 0, open = false, fruitRefs }) {
  const card = '#C79A5B', flap = '#D8AE70';
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <mesh position={[0, BH / 2, 0]} castShadow><boxGeometry args={[BW, BH, BD]} /><meshStandardMaterial color={card} roughness={0.9} /></mesh>
      {!open && <mesh position={[0, BH + 0.002, 0]}><boxGeometry args={[0.1, 0.004, BD + 0.004]} /><meshStandardMaterial color="#EBDDB5" /></mesh>}
      {!open && <mesh position={[0, BH / 2, BD / 2 + 0.002]}><boxGeometry args={[0.1, BH + 0.004, 0.004]} /><meshStandardMaterial color="#EBDDB5" /></mesh>}
      <mesh position={[0.12, 0.17, BD / 2 + 0.003]}><boxGeometry args={[0.2, 0.13, 0.004]} /><meshStandardMaterial color="#FFFFFF" /></mesh>
      <mesh position={[0.12, 0.17, BD / 2 + 0.007]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.045, 0.045, 0.004, 14]} /><meshStandardMaterial color="#F28C1B" /></mesh>
      {open && (
        <>
          <mesh position={[0, BH - 0.02, 0]}><boxGeometry args={[BW - 0.04, 0.02, BD - 0.04]} /><meshStandardMaterial color="#3A2A18" /></mesh>
          {[[0, BH, -BD / 2, 0.9, 0, 0, BW, 0.2], [0, BH, BD / 2, -0.9, 0, 0, BW, 0.2]].map(([x, y, z, rx], i) => (
            <group key={i} position={[x, y, z]} rotation={[rx, 0, 0]}><mesh position={[0, 0, (i ? 1 : -1) * 0.1]}><boxGeometry args={[BW, 0.01, 0.2]} /><meshStandardMaterial color={flap} /></mesh></group>
          ))}
          {[[-BW / 2, 0.9], [BW / 2, -0.9]].map(([x, rz], i) => (
            <group key={'s' + i} position={[x, BH, 0]} rotation={[0, 0, -rz]}><mesh position={[(i ? 1 : -1) * 0.1, 0, 0]}><boxGeometry args={[0.2, 0.01, BD]} /><meshStandardMaterial color={flap} /></mesh></group>
          ))}
          {fruitRefs && [[-0.13, -0.08], [0.0, -0.08], [0.13, -0.08], [-0.13, 0.08], [0.0, 0.08], [0.13, 0.08]].map(([x, z], i) => (
            <mesh key={i} ref={(el) => { fruitRefs.current[i] = el; }} position={[x, BH - 0.1, z]} visible={false}><sphereGeometry args={[0.075, 10, 8]} /><meshStandardMaterial color="#F28C1B" roughness={0.5} /></mesh>
          ))}
        </>
      )}
    </group>
  );
}

// 비 오는 날의 포장 작업장: 농부가 컨테이너에서 귤을 집어 열린 택배 박스에 담고(담을 때마다 박스 속 귤이 늘어난다), 옆에는 포장을 끝낸 박스가 쌓여 있다.
function PackStation({ show }) {
  const fruitRefs = useRef([]);
  useFrame(({ clock }) => {
    const n = Math.floor((clock.elapsedTime + 1.25) / 5) % 6; // 농부가 한 번 담을 때마다(5초) 하나씩 늘고, 6개가 차면 비운다
    fruitRefs.current.forEach((m, i) => { if (m) m.visible = i < n; });
  });
  if (!show) return null;
  return (
    <group>
      <CardboardBox position={[BASKET.x - 1.1, 0, BASKET.z]} open fruitRefs={fruitRefs} rotY={0.1} />
      {[[0, 0.03], [0.38, -0.05], [0.76, 0.04]].map(([y, r], i) => <CardboardBox key={i} position={[BASKET.x + 1.15, y, BASKET.z]} rotY={r} />)}
      <Farmer mode="pick" reach={-1.2} position={[BASKET.x - 0.75, 0, BASKET.z - 0.65]} scale={1.15} yawTree={0.86} yawCrate={-0.49} />{/* 컨테이너에서 귤을 집어 박스에 담는 농부 */}
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

  return (
    <div role="img" aria-label="감귤나무에서 열매를 따서 바구니에 담는 3D 화면">
      <Canvas shadows dpr={[1, 1.5]} camera={{ position: [4.4, 2.7, 5.2], fov: 45 }} style={{ height: 460, borderRadius: '1.1rem' }}>
        <color attach="background" args={[raining ? '#B7C3D0' : '#CFE8F7']} />
        <ambientLight intensity={raining ? 0.7 : 0.9} />
        <directionalLight position={[5, 8, 4]} intensity={raining ? 0.8 : 1.6} castShadow />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><circleGeometry args={[7, 48]} /><meshStandardMaterial color={raining ? '#6E8F62' : '#7DB36B'} /></mesh>
        <Tree />
        {!raining && <Farmer mode="pick" position={[1.75, 0, 1.1]} scale={1.15} yawTree={-2.13} yawCrate={1.42} />}{/* 맑은 날: 나무의 귤을 따서 컨테이너에 담는 농부 */}
        <PackStation show={raining} />
        {DECOR.map(([x, z, s, seed]) => <DecorTree key={seed} x={x} z={z} s={s} seed={seed} />)}
        {FRUITS.map((p, i) => <Fruit key={i} home={p} land={SLOTS[i]} state={states.current[i]} onPick={() => pick(i)} />)}
        <Basket />
        <Tent show={raining} />
        <Rain active={raining} />
        <OrbitControls enablePan={false} minDistance={4} maxDistance={12} maxPolarAngle={Math.PI / 2.1} target={[1.4, 0.95, 0.6]} />
      </Canvas>
    </div>
  );
}

export const FRUIT_COUNT = FRUITS.length;
