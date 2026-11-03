// 3D 장면에 움직이는 그림을 더하는 부품: 귤을 따는 농부, 파도를 타는 서퍼, 하늘을 가로지르는 비행기.
// 모두 상자·원기둥·구 같은 기본 도형을 조립한 단순한 모양이고, useFrame 으로 매 프레임 자세를 바꿔 움직인다. (three.js + @react-three/fiber)
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

const smooth = (v) => { const k = Math.min(1, Math.max(0, v)); return k * k * (3 - 2 * k); };
const lerp = (a, b, k) => a + (b - a) * k;
const lerpAngle = (a, b, k) => { const d = ((((b - a + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI; return a + d * k; }; // 짧은 쪽으로 돌린다

// 사람 한 명(키 약 1.35): 다리·몸통·머리·모자·두 팔. 팔은 어깨를 축으로 돌릴 수 있게 그룹으로 만들고, 호출한 쪽이 ref 로 움직인다.
// 팔의 rotation.x: 0 = 아래로 늘어뜨림, -1.4 = 앞으로 뻗음, -2.6 = 앞쪽 위로 뻗음 (사람은 +z 방향을 본다)
export function Figure({ shirt = '#3F7A3F', pants = '#475A7A', skin = '#E8B48A', hat = 'straw', body, armL, armR, fruit }) {
  return (
    <group ref={body}>
      {[-0.08, 0.08].map((x) => <mesh key={x} position={[x, 0.3, 0]}><cylinderGeometry args={[0.07, 0.065, 0.6, 8]} /><meshStandardMaterial color={pants} /></mesh>)}
      {[-0.08, 0.08].map((x) => <mesh key={'s' + x} position={[x, 0.03, 0.04]}><boxGeometry args={[0.1, 0.06, 0.18]} /><meshStandardMaterial color="#2b2b2b" /></mesh>)}
      <mesh position={[0, 0.88, 0]}><cylinderGeometry args={[0.15, 0.17, 0.56, 10]} /><meshStandardMaterial color={shirt} /></mesh>
      <mesh position={[0, 1.27, 0]}><sphereGeometry args={[0.13, 14, 12]} /><meshStandardMaterial color={skin} /></mesh>
      {hat === 'straw' && (
        <group position={[0, 1.4, 0]}>
          <mesh><cylinderGeometry args={[0.3, 0.3, 0.025, 20]} /><meshStandardMaterial color="#E3C27A" /></mesh>
          <mesh position={[0, 0.05, 0]}><cylinderGeometry args={[0.13, 0.15, 0.1, 16]} /><meshStandardMaterial color="#E3C27A" /></mesh>
          <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.152, 0.152, 0.03, 16]} /><meshStandardMaterial color="#B8472F" /></mesh>
        </group>
      )}
      {[[armL, -0.22], [armR, 0.22]].map(([ref, x]) => (
        <group key={x} ref={ref} position={[x, 1.1, 0]}>
          <mesh position={[0, -0.26, 0]}><cylinderGeometry args={[0.045, 0.04, 0.52, 8]} /><meshStandardMaterial color={shirt} /></mesh>
          <mesh position={[0, -0.55, 0]}><sphereGeometry args={[0.055, 8, 6]} /><meshStandardMaterial color="#F2F2F2" /></mesh>{/* 장갑 */}
          {x > 0 && fruit && <mesh ref={fruit} visible={false} position={[0, -0.62, 0.05]}><sphereGeometry args={[0.075, 10, 8]} /><meshStandardMaterial color="#F28C1B" roughness={0.5} /></mesh>}
        </group>
      ))}
    </group>
  );
}

// 귤을 따는 농부. mode 'pick' 은 나무 쪽을 보고 팔을 뻗어 귤을 따서 → 컨테이너 쪽으로 돌아 담는 동작을 5초마다 되풀이한다.
// mode 'pack'(비 예보)은 컨테이너를 보고 서서 팔을 오르내리며 포장한다. yawTree·yawCrate 는 사람이 나무 쪽·컨테이너 쪽을 볼 때의 방향(라디안)이다.
export function Farmer({ mode = 'pick', position = [0, 0, 0], scale = 1, yawTree = -1.5, yawCrate = 0.5, phase = 0, shirt = '#3F7A3F', pants = '#475A7A' }) {
  const body = useRef(), armL = useRef(), armR = useRef(), fruit = useRef();
  useFrame(({ clock }) => {
    if (!body.current) return;
    const t = clock.elapsedTime + phase;
    if (mode === 'pack') {
      body.current.rotation.y = yawCrate;
      armR.current.rotation.x = -1.0 + 0.45 * Math.sin(t * 4); armL.current.rotation.x = -1.0 - 0.45 * Math.sin(t * 4);
      fruit.current.visible = false; return;
    }
    const ph = (t / 5) % 1;
    let yaw = yawTree, r = -0.4, show = false;
    if (ph < 0.35) { r = lerp(-0.4, -2.5, smooth(ph / 0.35)); } // 손을 위로 뻗는다
    else if (ph < 0.45) { r = -2.5 + 0.15 * Math.sin((ph - 0.35) * 60); show = ph > 0.4; } // 귤을 딴다
    else if (ph < 0.65) { const k = smooth((ph - 0.45) / 0.2); yaw = lerpAngle(yawTree, yawCrate, k); r = lerp(-2.5, -1.2, k); show = true; } // 컨테이너 쪽으로 돈다
    else if (ph < 0.8) { const k = smooth((ph - 0.65) / 0.15); yaw = yawCrate; r = lerp(-1.2, -0.9, k); show = ph < 0.75; } // 컨테이너에 담는다
    else { yaw = lerpAngle(yawCrate, yawTree, smooth((ph - 0.8) / 0.2)); r = lerp(-0.9, -0.4, smooth((ph - 0.8) / 0.2)); } // 다시 나무 쪽으로
    body.current.rotation.y = yaw; armR.current.rotation.x = r; armL.current.rotation.x = -0.3 + 0.12 * Math.sin(t * 2); fruit.current.visible = show;
  });
  return <group position={position} scale={scale}><Figure body={body} armL={armL} armR={armR} fruit={fruit} shirt={shirt} pants={pants} /></group>;
}

// 파도를 타는 서퍼. from→to 직선을 왔다 갔다 하며, 파도 높이(sample)에 맞춰 위아래로 흔들리고 파도의 기울기만큼 보드가 기운다.
// sample(x, z, t) → { y, dx, dz }: 그 자리의 바다 높이와 기울기. 지도에서는 바다 그림과 같은 식을 넘긴다.
export function Surfer({ from, to, sample, speed = 0.35, phase = 0, scale = 1, board = '#F2F2F2', suit = '#1F4E8C' }) {
  const root = useRef(), body = useRef(), armL = useRef(), armR = useRef();
  useFrame(({ clock }) => {
    if (!root.current) return;
    const t = clock.elapsedTime, dxv = to[0] - from[0], dzv = to[1] - from[1], len = Math.hypot(dxv, dzv);
    const s = (t * speed + phase) % (2 * len), back = s > len, along = back ? 2 * len - s : s, u = along / len, sign = back ? -1 : 1;
    const x = from[0] + dxv * u, z = from[1] + dzv * u, w = sample(x, z, t);
    const hx = (dxv / len) * sign, hz = (dzv / len) * sign;
    root.current.rotation.order = 'YXZ';
    root.current.position.set(x, w.y + 0.02, z);
    root.current.rotation.set(-(w.dx * hx + w.dz * hz) * 1.5, Math.atan2(hx, hz), (w.dx * hz - w.dz * hx) * 1.5);
    const sway = Math.sin(t * 2.2 + phase);
    armL.current.rotation.z = -1.25 + 0.18 * sway; armR.current.rotation.z = 1.25 + 0.18 * sway;
    body.current.rotation.z = 0.08 * sway;
  });
  return (
    <group ref={root} scale={scale}>
      <mesh><boxGeometry args={[0.16, 0.03, 0.8]} /><meshStandardMaterial color={board} roughness={0.4} /></mesh>
      <mesh position={[0, 0.002, 0.42]} scale={[1, 0.6, 0.5]}><sphereGeometry args={[0.08, 10, 8]} /><meshStandardMaterial color={board} roughness={0.4} /></mesh>{/* 보드 앞끝 */}
      <mesh position={[0, 0.0155, 0]}><boxGeometry args={[0.04, 0.003, 0.74]} /><meshStandardMaterial color="#E8553A" /></mesh>{/* 가운데 줄 */}
      <mesh position={[0, 0.002, -0.55]} scale={[1.4, 0.12, 2.4]}><sphereGeometry args={[0.1, 10, 6]} /><meshStandardMaterial color="#FFFFFF" transparent opacity={0.75} /></mesh>{/* 보드 뒤의 하얀 물보라 */}
      <group position={[0, 0.03, -0.02]} scale={0.3}><group scale={[1, 0.86, 1]} rotation={[0, Math.PI / 2, 0]}><Figure body={body} armL={armL} armR={armR} hat={null} shirt={suit} pants="#12264A" /></group></group>{/* 옆으로 서서 타는 자세 */}
    </group>
  );
}

// 하늘을 가로지르는 비행기: 같은 높이로 x 방향 끝에서 끝까지 천천히 날고, 끝에 닿으면 반대편에서 다시 나타난다.
// dir 1 = +x 쪽으로, -1 = -x 쪽으로. 특정 항공사 그림이 아니라 흰색 몸통에 파란 꼬리날개인 일반 여객기 모양이다.
export function Plane({ y = 3.4, z = -6.5, dir = 1, speed = 0.9, phase = 0, span = 17, scale = 1 }) {
  const root = useRef();
  useFrame(({ clock }) => {
    if (!root.current) return;
    const p = ((clock.elapsedTime * speed + phase) % (2 * span));
    root.current.position.set((dir > 0 ? -span + p : span - p), y + 0.12 * Math.sin(clock.elapsedTime * 0.7 + phase), z);
  });
  return (
    <group ref={root} rotation={[0, dir > 0 ? Math.PI / 2 : -Math.PI / 2, 0]} scale={scale}>
      <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.075, 0.075, 0.9, 12]} /><meshStandardMaterial color="#F7F9FB" roughness={0.4} /></mesh>
      <mesh position={[0, 0, 0.55]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[0.075, 0.22, 12]} /><meshStandardMaterial color="#F7F9FB" roughness={0.4} /></mesh>
      <mesh position={[0, 0.01, -0.57]} rotation={[-Math.PI / 2, 0, 0]}><coneGeometry args={[0.075, 0.26, 12]} /><meshStandardMaterial color="#F7F9FB" roughness={0.4} /></mesh>
      <mesh position={[0, 0.002, 0.08]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.0765, 0.0765, 0.04, 12]} /><meshStandardMaterial color="#1E5FAF" /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[s * 0.3, -0.02, 0.02]} rotation={[0, s * -0.4, s * 0.04]}><boxGeometry args={[0.6, 0.02, 0.2]} /><meshStandardMaterial color="#E9EEF3" /></mesh>)}
      {[-1, 1].map((s) => <mesh key={'e' + s} position={[s * 0.27, -0.075, 0.09]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.032, 0.032, 0.15, 8]} /><meshStandardMaterial color="#8E98A3" /></mesh>)}
      <mesh position={[0, 0.13, -0.47]} rotation={[-0.3, 0, 0]}><boxGeometry args={[0.02, 0.22, 0.16]} /><meshStandardMaterial color="#1E5FAF" /></mesh>
      {[-1, 1].map((s) => <mesh key={'t' + s} position={[s * 0.15, 0.02, -0.5]} rotation={[0, s * -0.3, 0]}><boxGeometry args={[0.3, 0.015, 0.1]} /><meshStandardMaterial color="#E9EEF3" /></mesh>)}
      <mesh position={[0, 0, -1.55]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.012, 0.03, 1.8, 6]} /><meshStandardMaterial color="#FFFFFF" transparent opacity={0.35} /></mesh>{/* 비행운 */}
    </group>
  );
}
