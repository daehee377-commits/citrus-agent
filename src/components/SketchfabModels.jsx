// 감귤 3D 모델 보기: Sketchfab 에 공개된 감귤류 모델을 Sketchfab 공식 임베드로 보여 준다. 모델 파일을 내려받거나 복사해 두지 않는다.
// 사진·모델이 무거울 수 있어서 "열기"를 눌렀을 때만 불러온다. 제작자·원본 주소·라이선스를 항상 함께 표시한다.
import { useState } from 'react';
import { MODELS } from '../lib/citrusModels.js';


export default function SketchfabModels() {
  const [pick, setPick] = useState(0);
  const [open, setOpen] = useState(false);
  const m = MODELS[pick];
  return (
    <section className="card-soft p-3 mt-3" aria-label="감귤 3D 모델">
      <h5 className="mb-1"><i className="bi bi-badge-3d me-2 text-warning" />감귤 3D 모델</h5>
      <p className="notice mb-2">감귤류는 종류가 많습니다. 한라봉부터 귤, 오렌지, 자몽, 금귤까지 골라서 마우스로 돌려 보세요. (제주 품종을 그대로 만든 모델은 아니고 같은 감귤류의 일반 모델입니다)</p>
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
      <p className="notice mt-2 mb-0">
        {m.note} · 3D 모델 <a href={m.url} target="_blank" rel="noreferrer">{m.name}</a> by <a href={m.profile} target="_blank" rel="noreferrer">{m.author}</a> on{' '}
        <a href="https://sketchfab.com" target="_blank" rel="noreferrer">Sketchfab</a> · 라이선스 <a href={m.licenseUrl} target="_blank" rel="noreferrer">{m.license}</a>
      </p>
    </section>
  );
}
