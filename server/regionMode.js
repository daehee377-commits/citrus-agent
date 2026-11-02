// 구매처 주소로 "방문 모드(제주)"와 "배송 모드(그 외)"를 자동으로 나눈다.
// 지역 목록을 여기 한 곳에만 두어서, 나중에 전국으로 넓힐 때 이 파일만 고치면 된다.
// 주소의 맨 앞(시·도 위치)만 본다. 주소 중간에 '제주시장길' 같은 글자가 있는 서울 가게를 제주로 잘못 보지 않기 위해서다.
const VISIT_REGIONS = ['제주특별자치도', '제주시', '서귀포시']; // 직접 방문이 가능한 지역

export function getRegionMode(address = '') {
  const a = String(address).trim();
  if (!a) return { mode: 'unknown', label: '확인 필요', reason: '주소 정보가 없습니다.' };
  if (VISIT_REGIONS.some((r) => a.startsWith(r)))
    return { mode: 'visit', label: '방문 모드', reason: '제주 지역이라 직접 방문·샘플 전달이 가능합니다.' };
  // 주소의 첫 단어(시·도)를 지역 이름으로 쓴다. 예: "서울 성동구 ..." → 서울
  return { mode: 'delivery', label: '배송 모드', region: a.split(/\s+/)[0], reason: '제주 밖이라 택배 또는 화물 배송이 필요합니다.' };
}
