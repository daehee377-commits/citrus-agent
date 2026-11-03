// 감귤 퀴즈 문제 만들기: 문제와 정답은 모두 실제 공공데이터(기상청 예보, 농촌진흥청 병해충 도감)에서 나온다.
// 지어낸 문제는 없다. rng 를 바꿔 끼울 수 있어서(기본 Math.random) 테스트에서 같은 결과를 만들 수 있다.
export const WEATHER_CHOICES = ['수확 가능', '포장 작업만'];

export function shuffle(list, rng = Math.random) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const dateLabel = (d) => `${Number(d.slice(4, 6))}월 ${Number(d.slice(6, 8))}일`;

// 날씨 문제: 예보 한 날을 보여 주고 "수확할 수 있는 날인가요?" (정답은 날씨 API가 판단한 값)
export function weatherQuestions(days = []) {
  return days
    .filter((d) => WEATHER_CHOICES.includes(d.work))
    .map((d) => ({
      kind: 'weather',
      title: `${dateLabel(d.date)} 제주시 예보`,
      facts: [`하늘: ${d.sky ?? '정보 없음'}`, `강수확률 최대 ${d.maxPop ?? '?'}%`, ...(d.rainHours ? [`비 오는 시간 ${d.rainHours}시간`] : [])],
      prompt: '이 날, 감귤을 수확할 수 있을까요?',
      options: WEATHER_CHOICES,
      answer: d.work,
      explain: d.why ?? '',
    }));
}

// 병해충 문제: 병 사진을 보여 주고 이름을 고른다 (사진이 있는 병만, 보기는 같은 도감의 다른 병 이름)
export function pestQuestions(items = [], rng = Math.random, count = 5) {
  const names = items.map((i) => i.name);
  const withPhoto = items.filter((i) => i.thumb);
  return shuffle(withPhoto, rng).slice(0, count).map((it) => {
    const wrong = shuffle(names.filter((n) => n !== it.name), rng).slice(0, 3);
    return {
      kind: 'pest',
      title: '이 감귤 병의 이름은?',
      image: it.thumb,
      prompt: '사진을 보고 병 이름을 골라 보세요.',
      options: shuffle([it.name, ...wrong], rng),
      answer: it.name,
      explain: `정답은 ${it.name}입니다. (농촌진흥청 병해충 도감 사진)`,
    };
  });
}

// 한 판: 날씨 문제와 병해충 문제를 섞는다. 둘 중 하나가 비어 있어도(데이터를 못 가져와도) 있는 것으로 진행한다.
export function buildRound({ days, pests }, rng = Math.random) {
  return shuffle([...weatherQuestions(days), ...pestQuestions(pests, rng)], rng);
}

export function rankOf(score, total) {
  if (!total) return { title: '문제를 불러오지 못했어요', emoji: '📡' };
  const r = score / total;
  if (r >= 0.9) return { title: '감귤 농사 박사', emoji: '🏆' };
  if (r >= 0.7) return { title: '수확철 베테랑', emoji: '🍊' };
  if (r >= 0.4) return { title: '초보 농부', emoji: '🌱' };
  return { title: '다시 도전!', emoji: '💪' };
}
