// 로딩·오류 표시 공통 조각
export function Loading({ text = '불러오는 중...' }) {
  return <div className="notice py-3"><i className="bi bi-arrow-repeat spin me-2" />{text}</div>;
}

export function ErrorBox({ message }) {
  return <div className="alert alert-warning mb-0"><i className="bi bi-exclamation-triangle me-2" />{message}</div>;
}
