// 도구 6: get_delivery_guide — 제주 밖 구매처에 보낼 배송 방법을 안내한다. 외부 API 없이 내장 안내문을 쓴다.
// 배송비·소요일은 확인된 값이 없으므로 절대 숫자를 만들어 내지 않고 "확인 필요"로 둔다.
export function getDeliveryGuide({ region = '', size = '소량' } = {}) {
  const method = size === '대량'
    ? { name: '화물(팰릿) 배송', note: '박스 수가 많을 때 화물 업체 견적을 받아 진행' }
    : { name: '택배 발송', note: '10kg 박스 단위로 택배사에 접수' };
  return {
    region: region || '확인 필요',
    method: method.name,
    note: method.note,
    shippingCost: '확인 필요 (택배사·화물 업체 견적)',
    leadTime: '확인 필요 (택배사 안내 기준)',
    checklist: [
      '제주에서 육지로 보내는 택배의 도선료(추가 운임) 여부와 금액을 택배사에 확인',
      '감귤은 과일이라 포장 방식(완충재 등)과 파손·부패 시 처리 방식을 구매처와 미리 협의',
      '유기농 표시를 판매 문구에 쓸 때는 관할 기관 또는 인증기관에 확인 필요',
    ],
  };
}
