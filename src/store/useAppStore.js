// 여러 페이지가 함께 쓰는 상태(Zustand): 사용자 구분용 임의 번호, 대화 내용, 남은 질문 수.
import { create } from 'zustand';

// 로그인이 없으므로 브라우저마다 임의 번호를 만들어 구분한다 (개인정보 아님)
function getSessionId() {
  try {
    let id = localStorage.getItem('citrus-session');
    if (!id) { id = crypto.randomUUID(); localStorage.setItem('citrus-session', id); }
    return id;
  } catch { return 'no-storage'; }
}

export const useAppStore = create((set) => ({
  sessionId: getSessionId(),
  messages: [], // { role: 'user' | 'assistant', content, tools?: [] }
  remaining: null, // 오늘 남은 질문 수 (서버가 알려 준다)
  addMessage: (m) => set((s) => ({ messages: [...s.messages, m] })),
  updateLast: (patch) => set((s) => ({ messages: s.messages.map((m, i) => (i === s.messages.length - 1 ? { ...m, ...patch } : m)) })),
  setRemaining: (n) => set({ remaining: n }),
  clearChat: () => set({ messages: [] }),
}));
