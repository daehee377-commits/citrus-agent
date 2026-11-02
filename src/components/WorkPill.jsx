// 날짜별 작업 판단을 색깔 표지로 보여 준다: 수확 가능(초록) / 포장 작업만(파랑) / 확인 필요(회색)
const STYLE = {
  '수확 가능': ['pill-ok', 'basket'],
  '포장 작업만': ['pill-rain', 'umbrella'],
  '확인 필요': ['pill-unknown', 'question-circle'],
};

export default function WorkPill({ work }) {
  const [cls, icon] = STYLE[work] ?? STYLE['확인 필요'];
  return <span className={`pill ${cls}`}><i className={`bi bi-${icon}`} />{work}</span>;
}
