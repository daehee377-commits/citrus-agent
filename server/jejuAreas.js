// 제주 행정구역(시 → 읍·면·동) 목록. 이름만 담고, 좌표는 실행할 때 카카오 지도로 찾는다 (좌표를 지어내지 않기 위해).
export const JEJU_AREAS = {
  제주시: ['일도동', '이도동', '삼도동', '용담동', '건입동', '화북동', '삼양동', '봉개동', '아라동', '오라동', '연동', '노형동', '외도동', '이호동', '도두동', '도련동', '한림읍', '애월읍', '구좌읍', '조천읍', '한경면', '추자면', '우도면'],
  서귀포시: ['송산동', '정방동', '중앙동', '천지동', '효돈동', '영천동', '동홍동', '서홍동', '대륜동', '대천동', '중문동', '예래동', '대정읍', '남원읍', '성산읍', '안덕면', '표선면'],
};

// 동·읍·면 이름 → 소속 시
export const AREA_TO_CITY = Object.fromEntries(Object.entries(JEJU_AREAS).flatMap(([city, list]) => list.map((a) => [a, city])));

// 질문 속에 들어 있는 지역 이름을 찾는다 (예: "남원읍 수확 언제?" → 남원읍)
export function findAreaIn(text) {
  const t = String(text ?? '');
  const dong = Object.keys(AREA_TO_CITY).find((a) => t.includes(a));
  if (dong) return dong;
  if (t.includes('서귀포')) return '서귀포시';
  if (t.includes('제주시')) return '제주시';
  return null;
}
