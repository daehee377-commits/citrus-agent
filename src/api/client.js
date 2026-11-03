// 화면 → /api 호출 함수 모음. 비밀 키는 서버에만 있고 여기에는 없다.
async function getJson(url) {
  // 인터넷이 끊기거나 서버가 꺼져 있으면 브라우저가 영어 "Failed to fetch"를 던진다 → 쉬운 한국어로 바꾼다
  const r = await fetch(url).catch(() => { throw new Error('서버에 연결하지 못했습니다. 인터넷 연결을 확인하고 새로고침해 주세요.'); });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || '데이터를 가져오지 못했습니다.');
  return data;
}

export const fetchWeather = (place) => getJson(`/api/weather?place=${encodeURIComponent(place)}`);
export const fetchPrice = () => getJson('/api/price');
export const fetchRetail = () => getJson('/api/retail');
export const fetchPest = (name = '') => getJson(`/api/pest?name=${encodeURIComponent(name)}`);

// 채팅: 서버가 줄 단위 JSON 으로 "도구 호출 중" 알림과 최종 답을 흘려 보낸다
export async function askAgent({ question, history, sessionId, onEvent }) {
  const r = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Session-Id': sessionId },
    body: JSON.stringify({ question, history }),
  });
  if (!r.ok || !r.body) {
    const data = await r.json().catch(() => ({}));
    throw new Error(data.error || '서버에 연결하지 못했습니다.');
  }
  const reader = r.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (line) onEvent(JSON.parse(line));
    }
  }
}
