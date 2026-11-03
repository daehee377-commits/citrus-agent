// 제주 3D 모델 보기: Sketchfab 에 공개된 모델을 Sketchfab 공식 임베드로 보여 준다. 모델 파일을 내려받거나 복사해 두지 않는다.
// 사진 측량 모델이라 무거우므로 "열기"를 눌렀을 때만 불러온다. 제작자와 원본 주소를 항상 함께 표시한다.
import { useState } from 'react';

export const MODELS = [
  { id: '481d5941ca654a4795a895aff95e1659', name: '민오름', url: 'https://sketchfab.com/3d-models/minoreum-481d5941ca654a4795a895aff95e1659', note: '오름의 실제 모습을 사진으로 측량한 3D 모델' },
  { id: 'fb08adf4678d4db2a8ae9ad39be13aeb', name: '제주 세계자연유산센터', url: 'https://sketchfab.com/3d-models/fb08adf4678d4db2a8ae9ad39be13aeb', note: '거문오름 용암동굴계 방문 안내 시설' },
];
const AUTHOR = { name: 'META jeju', url: 'https://sketchfab.com/Hyun-seok.Jun' };

export default function SketchfabModels() {
  const [pick, setPick] = useState(0);
  const [open, setOpen] = useState(false);
  const m = MODELS[pick];
  return (
    <section className="card-soft p-3 mt-3" aria-label="제주 3D 모델">
      <h5 className="mb-1"><i className="bi bi-badge-3d me-2 text-warning" />제주 3D 모델</h5>
      <p className="notice mb-2">제주의 실제 장소를 사진으로 측량해 만든 3D 모델입니다. 마우스로 돌리고 확대해 보세요.</p>
      <div className="d-flex flex-wrap gap-2 mb-2">
        {MODELS.map((x, i) => (
          <button key={x.id} type="button" className={`btn btn-sm ${i === pick ? 'btn-leaf' : 'btn-outline-secondary'}`} onClick={() => { setPick(i); setOpen(false); }}>{x.name}</button>
        ))}
      </div>
      {open ? (
        <iframe key={m.id} title={`${m.name} 3D 모델`} className="sketchfab-frame" src={`https://sketchfab.com/models/${m.id}/embed?autostart=1&ui_infos=0`} allow="autoplay; fullscreen; xr-spatial-tracking" allowFullScreen loading="lazy" />
      ) : (
        <button type="button" className="btn btn-citrus" onClick={() => setOpen(true)}><i className="bi bi-play-circle me-1" />{m.name} 3D 모델 열기</button>
      )}
      <p className="notice mt-2 mb-0">{m.note} · 3D 모델 <a href={m.url} target="_blank" rel="noreferrer">{m.name}</a> by <a href={AUTHOR.url} target="_blank" rel="noreferrer">{AUTHOR.name}</a> on <a href="https://sketchfab.com" target="_blank" rel="noreferrer">Sketchfab</a></p>
    </section>
  );
}
