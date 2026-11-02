// 내 후보: Supabase 연결 후 즐겨찾기를 불러온다 (개인정보 없는 정보만 저장).
export default function Saved() {
  return (
    <>
      <h2 className="mb-1">내 후보</h2>
      <p className="notice mb-4">마음에 든 판로 후보를 저장해 두는 곳입니다. 장소명·지역·규모만 저장하고, 주소·전화번호·메모는 저장하지 않습니다.</p>
      <div className="card-soft p-4 text-center">
        <i className="bi bi-bookmark-star fs-1 text-warning" />
        <p className="mt-2 mb-0">저장 기능을 준비하고 있습니다.</p>
      </div>
    </>
  );
}
