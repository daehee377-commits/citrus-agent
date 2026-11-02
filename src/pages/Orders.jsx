// 주문 현황판: 별칭·방문/택배·상자 수·진행 상태만 저장한다. 이름·전화번호·주소·메모 칸은 일부러 만들지 않았다.
import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { supabaseReady, listOrders, addOrder, updateOrder, removeOrder } from '../lib/supabase.js';
import { Loading, ErrorBox } from '../components/Status.jsx';
import { buildOrderSheet, sheetFileName } from '../lib/orderSheet.js';

const STEPS = ['문의', '협의', '발송 준비', '발송', '완료'];
const CARRIERS = ['미정', '우체국', 'CJ대한통운', '한진', '롯데', '로젠'];
const STATUS_CLS = { 문의: 'pill-unknown', 협의: 'pill-unknown', '발송 준비': 'pill-rain', 발송: 'pill-rain', 완료: 'pill-ok', 취소: 'pill-cancel' };
const EMPTY = { nick: '', mode: '택배', qty: 1, carrier: '미정', want_date: '' };
const looksPersonal = (t) => /[0-9]{4,}|@/.test(t);

export default function Orders() {
  const sessionId = useAppStore((s) => s.sessionId);
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabaseReady) return;
    listOrders(sessionId).then(setRows).catch((e) => setError(e.message));
  }, [sessionId]);

  const live = useMemo(() => (rows ?? []).filter((r) => r.status !== '취소'), [rows]);
  const sheetCount = useMemo(() => buildOrderSheet(rows).count, [rows]);
  const summary = useMemo(() => ({
    boxes: live.reduce((a, r) => a + r.qty, 0),
    prep: live.filter((r) => r.status === '발송 준비').length,
    needCarrier: live.filter((r) => r.mode === '택배' && ['협의', '발송 준비'].includes(r.status) && r.carrier === '미정').length,
    cancelled: (rows ?? []).length - live.length,
  }), [live, rows]);

  async function run(fn) {
    setBusy(true); setError('');
    try { await fn(); } catch (e) { setError(e.message); }
    setBusy(false);
  }
  const replace = (r) => setRows((list) => list.map((x) => (x.id === r.id ? r : x)));

  const submit = (e) => {
    e.preventDefault();
    if (looksPersonal(form.nick)) { setError('별칭에는 전화번호처럼 숫자 4자리 이상이나 @ 를 쓸 수 없습니다. 연락처는 휴대폰에 따로 저장하세요.'); return; }
    run(async () => {
      const nextNo = Math.max(0, ...(rows ?? []).map((r) => r.no)) + 1;
      const row = await addOrder(sessionId, { ...form, nick: form.nick.trim(), qty: Number(form.qty) }, nextNo);
      setRows((list) => [row, ...list]); setForm(EMPTY);
    });
  };
  const more = (r) => {
    const n = Number(window.prompt(`${r.nick}: 추가로 주문한 상자 수를 입력하세요`, '1'));
    if (!Number.isInteger(n) || n < 1 || r.qty + n > 999) return;
    run(async () => replace(await updateOrder(sessionId, r.id, { qty: r.qty + n, extra: r.extra + n })));
  };
  const cancel = (r) => { if (window.confirm(`${r.nick} 주문을 취소할까요? (기록은 남고 합계에서 빠집니다)`)) run(async () => replace(await updateOrder(sessionId, r.id, { status: '취소' }))); };
  const setStatus = (r, status) => run(async () => replace(await updateOrder(sessionId, r.id, { status })));
  const setCarrier = (r, carrier) => run(async () => replace(await updateOrder(sessionId, r.id, { carrier })));
  // 엑셀 라이브러리는 버튼을 누를 때만 불러온다 (처음 화면이 무거워지지 않게)
  const exportXlsx = () => run(async () => {
    const { data, columns } = buildOrderSheet(rows);
    const { default: writeExcelFile } = await import('write-excel-file/browser');
    await writeExcelFile(data, { columns }).toFile(sheetFileName());
  });
  const remove = (r) => { if (window.confirm(`${r.nick} 기록을 완전히 지울까요?`)) run(async () => { await removeOrder(sessionId, r.id); setRows((l) => l.filter((x) => x.id !== r.id)); }); };

  return (
    <>
      <h2 className="mb-1">주문 현황판</h2>
      <p className="notice mb-3">누구에게 몇 상자를 보내는지, 어디까지 진행됐는지만 적습니다. <strong>이름·전화번호·주소·결제 정보는 입력하지 마세요.</strong> 연락처는 휴대폰에 같은 별칭으로 저장해 두고, 이 화면에서는 별칭과 주문 번호로만 구분합니다. 택배사에 보낼 때는 아래 "엑셀 저장"으로 내려받은 뒤, 받는 분·연락처·주소는 내 컴퓨터에서 직접 채우세요. 이 브라우저에서만 보입니다.</p>

      {!supabaseReady && <ErrorBox message="저장 기능이 아직 연결되지 않았습니다." />}
      {error && <ErrorBox message={error} />}

      <form className="card-soft p-3 mb-3" onSubmit={submit}>
        <div className="row g-2 align-items-end">
          <div className="col-12 col-md-3"><label className="form-label notice mb-0">별칭</label>
            <input className="form-control" required maxLength={30} placeholder="예: 성수동 카페 B" value={form.nick} onChange={(e) => setForm({ ...form, nick: e.target.value })} /></div>
          <div className="col-6 col-md-2"><label className="form-label notice mb-0">방법</label>
            <select className="form-select" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}><option>택배</option><option>방문</option></select></div>
          <div className="col-6 col-md-2"><label className="form-label notice mb-0">10kg 상자</label>
            <input className="form-control" type="number" min="1" max="999" required value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} /></div>
          <div className="col-6 col-md-2"><label className="form-label notice mb-0">택배사</label>
            <select className="form-select" value={form.carrier} disabled={form.mode === '방문'} onChange={(e) => setForm({ ...form, carrier: e.target.value })}>{CARRIERS.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div className="col-6 col-md-2"><label className="form-label notice mb-0">희망일</label>
            <input className="form-control" type="date" value={form.want_date} onChange={(e) => setForm({ ...form, want_date: e.target.value })} /></div>
          <div className="col-12 col-md-1 d-grid"><button className="btn btn-citrus" disabled={busy || !supabaseReady}><i className="bi bi-plus-lg" /> 추가</button></div>
        </div>
      </form>

      {supabaseReady && !rows && !error && <Loading />}
      {rows && (
        <>
          <div className="d-flex flex-wrap gap-2 mb-3">
            <span className="pill pill-ok"><i className="bi bi-box-seam" />총 {summary.boxes}상자</span>
            <span className="pill pill-rain"><i className="bi bi-truck" />발송 준비 {summary.prep}건</span>
            <span className="pill pill-unknown"><i className="bi bi-telephone" />택배사 연락 필요 {summary.needCarrier}건</span>
            <button type="button" className="btn btn-sm btn-outline-success ms-auto" disabled={busy || sheetCount === 0} onClick={exportXlsx} title="취소를 뺀 택배 주문을 엑셀 파일로 저장합니다"><i className="bi bi-file-earmark-excel me-1" />택배 접수용 엑셀 저장 ({sheetCount}건)</button>
            {summary.cancelled > 0 && <span className="pill pill-cancel"><i className="bi bi-x-circle" />취소 {summary.cancelled}건</span>}
          </div>
          {rows.length === 0 && <div className="card-soft p-4 text-center"><i className="bi bi-clipboard-check fs-1 text-warning" /><p className="mt-2 mb-0">아직 주문이 없습니다. 위에서 첫 주문을 추가해 보세요.</p></div>}
          <div className="row g-3">
            {rows.map((r) => {
              const off = r.status === '취소';
              return (
                <div className="col-md-6" key={r.id}>
                  <div className={`card-soft p-3 h-100 ${off ? 'order-off' : ''}`}>
                    <div className="d-flex justify-content-between align-items-start gap-2">
                      <div>
                        <div className="notice">주문 A-{String(r.no).padStart(3, '0')}</div>
                        <h5 className="mb-1">{r.nick}</h5>
                        <div>{r.mode} · <strong>{r.qty}상자</strong>{r.extra > 0 && <span className="notice"> (추가 주문 +{r.extra})</span>}{r.mode === '택배' && ` · ${r.carrier}`}{r.want_date && ` · 희망 ${r.want_date.slice(5).replace('-', '/')}`}</div>
                      </div>
                      <span className={`pill ${STATUS_CLS[r.status]}`}>{r.status}</span>
                    </div>
                    {!off && (
                      <>
                        <div className="d-flex flex-wrap gap-1 mt-2">
                          {STEPS.map((s) => <button key={s} type="button" disabled={busy} className={`btn btn-sm ${r.status === s ? 'btn-citrus' : 'btn-outline-secondary'}`} onClick={() => setStatus(r, s)}>{s}</button>)}
                        </div>
                        <div className="d-flex flex-wrap gap-2 mt-2 align-items-center">
                          {r.mode === '택배' && <select className="form-select form-select-sm w-auto" value={r.carrier} onChange={(e) => setCarrier(r, e.target.value)} aria-label="택배사">{CARRIERS.map((c) => <option key={c}>{c}</option>)}</select>}
                          <button type="button" className="btn btn-sm btn-outline-success" disabled={busy} onClick={() => more(r)}><i className="bi bi-plus-circle me-1" />추가 주문</button>
                          <button type="button" className="btn btn-sm btn-outline-danger ms-auto" disabled={busy} onClick={() => cancel(r)}><i className="bi bi-x-circle me-1" />주문 취소</button>
                        </div>
                      </>
                    )}
                    {off && (
                      <div className="d-flex gap-2 mt-2">
                        <button type="button" className="btn btn-sm btn-outline-secondary" disabled={busy} onClick={() => setStatus(r, '문의')}><i className="bi bi-arrow-counterclockwise me-1" />되살리기</button>
                        <button type="button" className="btn btn-sm btn-outline-danger ms-auto" disabled={busy} onClick={() => remove(r)}><i className="bi bi-trash me-1" />기록 삭제</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
