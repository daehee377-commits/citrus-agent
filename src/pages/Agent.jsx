import { useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import { askAgent } from '../api/client.js';
import { useAppStore } from '../store/useAppStore.js';
import { supabaseReady, listFavorites, addFavorite } from '../lib/supabase.js';

const SUGGESTIONS = [
  '서귀포 근처에서 감귤을 직거래할 만한 카페나 펜션 알려줘',
  '제주시에서 로컬 식재료를 쓰는 식당 중 감귤 납품 가능성이 높은 곳은?',
  '체험농장이나 로컬푸드 매장 중 남원읍에서 가까운 곳 순서대로 알려줘',
  '서울 성수동 카페 중 감귤을 택배로 보내볼 만한 곳은?',
  '이번 주 수확 가능한 날이 언제야?',
  '궤양병은 어떻게 방제해?',
];

const TOOL_LABEL = {
  search_places: '장소 검색', search_blog_reviews: '후기 확인', get_travel_time: '이동시간 계산',
  get_weather: '날씨 확인', get_market_price: '시세 확인', get_pest_info: '병해충 확인', get_delivery_guide: '배송 안내',
};

// 찾은 후보 중 마음에 드는 곳을 "내 후보"에 저장하는 버튼들 (장소명·방문/배송·규모만 저장)
function SaveChips({ places, sessionId }) {
  const [saved, setSaved] = useState(new Set());
  const [msg, setMsg] = useState('');
  useEffect(() => {
    if (!supabaseReady) return;
    listFavorites(sessionId).then((rows) => setSaved(new Set(rows.map((r) => r.place_name)))).catch(() => {});
  }, [sessionId]);

  async function save(p) {
    setMsg('');
    try { await addFavorite(sessionId, p); setSaved((s) => new Set(s).add(p.name)); }
    catch (e) { setMsg(e.message); if (e.message.includes('이미')) setSaved((s) => new Set(s).add(p.name)); }
  }

  return (
    <div className="mt-3 pt-3 border-top">
      <div className="notice mb-2"><i className="bi bi-bookmark-star me-1" />마음에 드는 후보를 눌러 저장하세요 (장소명·방문/배송·규모만 저장)</div>
      <div className="d-flex flex-wrap gap-2">
        {places.map((p) => (
          <button key={p.name} className={`btn btn-sm ${saved.has(p.name) ? 'btn-leaf' : 'btn-outline-dark'}`} disabled={saved.has(p.name)} onClick={() => save(p)}>
            <i className={`bi bi-${saved.has(p.name) ? 'bookmark-check-fill' : 'bookmark-plus'} me-1`} />{p.name} <span className="opacity-75">· {p.mode.replace(' 모드', '')} · {p.size}</span>
          </button>
        ))}
      </div>
      {msg && <div className="text-danger notice mt-1">{msg}</div>}
    </div>
  );
}

export default function Agent() {
  const { sessionId, messages, remaining, addMessage, updateLast, setRemaining, clearChat } = useAppStore();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [liveTools, setLiveTools] = useState([]);
  const bottom = useRef(null);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, liveTools]);

  async function send(text) {
    const question = (text ?? input).trim();
    if (!question || busy) return;
    const history = messages.map((m) => ({ role: m.role, content: m.content })); // 이전 대화(대화 기억)
    setInput(''); setBusy(true); setLiveTools([]);
    addMessage({ role: 'user', content: question });
    try {
      await askAgent({
        question, history, sessionId,
        onEvent: (e) => {
          if (e.type === 'tool') setLiveTools((t) => [...t, e.name]);
          if (e.type === 'answer') { addMessage({ role: 'assistant', content: e.answer, tools: e.toolCalls, calls: e.calls, places: e.places }); setRemaining(e.remaining); }
          if (e.type === 'error') addMessage({ role: 'assistant', content: e.message, isError: true });
        },
      });
    } catch (e) {
      addMessage({ role: 'assistant', content: e.message, isError: true });
    }
    setBusy(false); setLiveTools([]);
  }

  return (
    <div className="chat-wrap">
      <div className="d-flex justify-content-between align-items-end mb-3 flex-wrap gap-2">
        <div>
          <h2 className="mb-1">판로 비서</h2>
          <p className="notice mb-0">AI가 필요한 도구를 스스로 골라 확인하고 답합니다.</p>
        </div>
        <div className="notice text-end">
          {remaining != null && <div>오늘 남은 질문 {remaining}회</div>}
          {messages.length > 0 && <button className="btn btn-link btn-sm p-0" onClick={clearChat}>대화 지우기</button>}
        </div>
      </div>

      {messages.length === 0 && (
        <div className="card-soft p-4 mb-3">
          <h6 className="mb-3">이렇게 물어보세요</h6>
          <div className="d-flex flex-column gap-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} className="btn btn-outline-dark text-start" onClick={() => send(s)} disabled={busy}>{s}</button>
            ))}
          </div>
        </div>
      )}

      <div className="d-flex flex-column gap-3 mb-3">
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role === 'user' ? 'bubble-user' : 'bubble-ai'}`}>
            {m.role === 'user' ? m.content : (
              <>
                {m.tools?.length > 0 && (
                  <div className="mb-2 d-flex flex-wrap gap-1">
                    <span className="notice me-1">호출한 도구</span>
                    {(m.calls?.length ? m.calls : m.tools.map((t) => ({ name: t }))).map((c, j) => <span key={j} className="pill pill-tool"><i className="bi bi-tools" />{TOOL_LABEL[c.name] ?? c.name}{c.arg ? ` · ${c.arg}` : ''}{c.count != null ? ` → ${c.count}건` : ''}</span>)}
                  </div>
                )}
                {m.isError ? <div className="text-danger"><i className="bi bi-exclamation-circle me-1" />{m.content}</div> : (
                  <Markdown components={{ a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer noopener">{children}</a> }}>{m.content}</Markdown>
                )}
                {supabaseReady && m.places?.length > 0 && <SaveChips places={m.places} sessionId={sessionId} />}
              </>
            )}
          </div>
        ))}
        {busy && (
          <div className="bubble bubble-ai">
            <i className="bi bi-arrow-repeat spin me-2" />
            {liveTools.length === 0 ? '생각하는 중...' : <>도구 호출 중: <strong>{TOOL_LABEL[liveTools.at(-1)] ?? liveTools.at(-1)}</strong> <span className="notice">({liveTools.length}번째)</span></>}
          </div>
        )}
        <div ref={bottom} />
      </div>

      <form className="card-soft p-3" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <div className="input-group">
          <input className="form-control" value={input} maxLength={300} onChange={(e) => setInput(e.target.value)}
            placeholder="예) 서귀포 근처 카페 중 감귤 납품할 만한 곳은?" disabled={busy} />
          <button className="btn btn-citrus" disabled={busy || !input.trim()}><i className="bi bi-send" /> 보내기</button>
        </div>
        <div className="notice mt-2">
          전화번호·정확한 주소 같은 <strong>개인정보는 입력하지 마세요</strong>. 출발지는 읍·면 단위로만 적어 주세요. 점수는 광고성 후기가 섞일 수 있는 참고용이며, 가격은 직접 정하세요. 유기농 문구는 인증기관 확인이 필요합니다. ({input.length}/300)
        </div>
      </form>
    </div>
  );
}
