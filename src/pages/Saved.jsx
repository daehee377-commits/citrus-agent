// 내 후보: Supabase 에 저장한 판로 후보를 보여 준다 (새로고침해도 남는다). 개인정보 없는 정보만 저장한다.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore.js';
import { supabaseReady, listFavorites, removeFavorite } from '../lib/supabase.js';
import { Loading, ErrorBox } from '../components/Status.jsx';
import ItemCard from '../components/ItemCard.jsx';

export default function Saved() {
  const sessionId = useAppStore((s) => s.sessionId);
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!supabaseReady) return;
    listFavorites(sessionId).then(setRows).catch((e) => setError(e.message));
  }, [sessionId]);

  async function remove(id) {
    try { await removeFavorite(sessionId, id); setRows((r) => r.filter((x) => x.id !== id)); } catch (e) { setError(e.message); }
  }

  return (
    <>
      <h2 className="mb-1">내 후보</h2>
      <p className="notice mb-4">마음에 든 판로 후보를 저장해 두는 곳입니다. 장소명·방문/배송·규모만 저장하고, 주소·전화번호·메모는 저장하지 않습니다. 이 브라우저에서만 보입니다.</p>

      {!supabaseReady && <ErrorBox message="저장 기능이 아직 연결되지 않았습니다." />}
      {error && <ErrorBox message={error} />}
      {supabaseReady && !rows && !error && <Loading />}
      {rows && rows.length === 0 && (
        <div className="card-soft p-4 text-center">
          <i className="bi bi-bookmark-star fs-1 text-warning" />
          <p className="mt-2 mb-3">아직 저장한 후보가 없습니다.</p>
          <Link to="/agent" className="btn btn-citrus">판로 비서에게 물어보기</Link>
        </div>
      )}
      {rows && rows.length > 0 && (
        <div className="row g-3">
          {rows.map((r) => (
            <div className="col-md-6" key={r.id}>
              <ItemCard title={r.place_name} badges={[[r.mode, r.mode === '방문 모드' ? 'pill-ok' : 'pill-rain'], [r.size, 'pill-unknown']]}
                action={<button className="btn btn-sm btn-outline-secondary" onClick={() => remove(r.id)} title="삭제"><i className="bi bi-trash" /></button>} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
