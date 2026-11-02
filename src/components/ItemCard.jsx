// 공용 카드: 홈 기능 카드(photo), 내 후보(row), 공식 링크(link)를 모두 이 컴포넌트 하나로 그린다.
// href 가 있으면 새 탭 링크, 없으면 일반 카드. action 칸에 버튼 같은 것을 넣을 수 있다.
export default function ItemCard({ variant = 'row', image, icon, title, subtitle, badges = [], href, action }) {
  const text = (
    <>
      <strong className="ic-title">{title}</strong>
      {subtitle && <small className="ic-sub">{subtitle}</small>}
      {badges.length > 0 && <span className="ic-badges">{badges.map(([label, cls]) => <span key={label} className={`pill ${cls}`}>{label}</span>)}</span>}
    </>
  );

  if (variant === 'photo') {
    return (
      <div className="card-soft h-100 overflow-hidden">
        <img src={image} alt="" className="card-photo" loading="lazy" />
        <div className="p-4"><h5>{title}</h5><p className="notice mb-0">{subtitle}</p></div>
      </div>
    );
  }
  if (variant === 'link') {
    return (
      <a href={href} target="_blank" rel="noreferrer noopener" className="rlink">
        {icon && <i className={`bi bi-${icon}`} />}
        <span className="ic-text">{text}</span>
      </a>
    );
  }
  return (
    <div className="card-soft p-3 d-flex justify-content-between align-items-center gap-2">
      <div className="ic-text">{text}</div>
      {action}
    </div>
  );
}
