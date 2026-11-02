// 감귤 농사 현장 규칙 (주제별 안내문 쪽): 비가 오면 수확은 못 하고, 천막 안 포장 작업만 가능하다.
// 비로 볼 강수확률 기준(%)은 농가가 정한다 — 기본 60, 바꾸고 싶으면 popThreshold 로 넘긴다.
export function judgeHarvestDay(day, { popThreshold = 60 } = {}) {
  if (day.maxPop == null) return { ...day, work: '확인 필요', why: '강수확률 정보가 없습니다.' };
  if (day.rainHours > 0 || day.maxPop >= popThreshold)
    return { ...day, work: '포장 작업만', why: `비 예보(강수확률 최대 ${day.maxPop}%)라 수확은 어렵고 천막 안 포장만 가능` };
  return { ...day, work: '수확 가능', why: `강수확률 최대 ${day.maxPop}%` };
}
