import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="text-center py-5">
      <h2>🍊 길을 잃었어요</h2>
      <p className="notice">찾으시는 페이지가 없습니다.</p>
      <Link to="/" className="btn btn-citrus">홈으로</Link>
    </div>
  );
}
