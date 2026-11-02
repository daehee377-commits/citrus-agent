// 업종(카카오 category_name)으로 구매 규모를 "소량/중량/대량"으로 나눈다.
// 업종 기준의 참고용 분류일 뿐, 실제 구매량은 아니다. 초기에는 소량·샘플 납품에 집중한다.
// 순서 중요: 카카오는 카페도 "음식점 > 카페"로 분류하므로 소량(카페 등)을 중량(음식점)보다 먼저 검사한다.
const RULES = [
  { size: '대량', words: ['마트', '슈퍼', '직매장', '농협', '하나로', '도매', '유통', '식자재'] },
  { size: '소량', words: ['카페', '커피', '디저트', '펜션', '민박', '숙박', '베이커리', '기념품'] },
  { size: '중량', words: ['음식점', '식당', '체험', '농장', '마켓', '과일', '청과', '로컬푸드', '시장'] },
];

export function getBuyerType(categoryName = '') {
  for (const r of RULES) if (r.words.some((w) => categoryName.includes(w))) return r.size;
  return '확인 필요';
}
