// 감귤 3D 모델 보기: Sketchfab 에 공개된 감귤류 모델을 Sketchfab 공식 임베드로 보여 준다. 모델 파일을 내려받거나 복사해 두지 않는다.
// 사진·모델이 무거울 수 있어서 "열기"를 눌렀을 때만 불러온다. 제작자·원본 주소·라이선스를 항상 함께 표시한다.
import { useState } from 'react';

export const MODELS = [
  { id: 'c84cd2208a3e4ed09fe3be4d0b9938ab', name: '한라봉', note: '제주의 대표 감귤류 과일 한라봉 모델',
    url: 'https://sketchfab.com/3d-models/hallabong-low-poly-c84cd2208a3e4ed09fe3be4d0b9938ab', author: 'hxjxnx', profile: 'https://sketchfab.com/hxjxnx00',
    license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/' },
  { id: 'fee0c845bb2e41618f3b0b7849bbf490', name: '귤(만다린)', note: '껍질을 벗긴 모습까지 있는 귤 모델',
    url: 'https://sketchfab.com/3d-models/mandarin-orange-fee0c845bb2e41618f3b0b7849bbf490', author: 'Megan Alcock', profile: 'https://sketchfab.com/citystreetlight', license: 'Sketchfab Standard', licenseUrl: 'https://sketchfab.com/licenses' },
  { id: '2b84a5c6ce6245e9a5de447e79ba9ad0', name: '열매 달린 귤나무', note: '열매가 달린 감귤류 나무 (제주 감귤 과수원의 나무를 떠올리는 일반 모델)',
    url: 'https://sketchfab.com/3d-models/orange-tree-with-fruits-3d-model-16m-2b84a5c6ce6245e9a5de447e79ba9ad0', author: 'cgaxis', profile: 'https://sketchfab.com/cgaxis', license: 'Sketchfab Standard', licenseUrl: 'https://sketchfab.com/licenses' },
];

export default function SketchfabModels() {
  const [pick, setPick] = useState(0);
  const [open, setOpen] = useState(false);
  const m = MODELS[pick];
  return (
    <section className="card-soft p-3 mt-3" aria-label="감귤 3D 모델">
      <h5 className="mb-1"><i className="bi bi-badge-3d me-2 text-warning" />감귤 3D 모델</h5>
      <p className="notice mb-2">제주 감귤과 같은 감귤류 3D 모델입니다. 마우스로 돌리고 확대해 보세요.</p>
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
