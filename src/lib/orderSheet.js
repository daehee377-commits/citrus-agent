// 택배 접수용 엑셀 표 만들기: 주문 현황판의 택배 주문(취소 제외)을 표로 바꾼다.
// 받는 분·연락처·주소 칸은 비워 둔다. 앱에는 개인정보를 저장하지 않으므로, 엑셀을 내려받은 뒤 내 컴퓨터에서 직접 채운다.
const HEAD = ['주문번호', '별칭', '10kg 상자 수', '택배사', '희망 발송일', '진행 상태', '받는 분', '연락처', '주소', '배송 메모'];
const WIDTHS = [11, 18, 13, 12, 13, 11, 14, 16, 36, 22];
const head = (v, fill = '#F28C1B') => ({ value: v, fontWeight: 'bold', backgroundColor: fill, textColor: '#FFFFFF', alignVertical: 'center' });
const orderNo = (n) => `A-${String(n).padStart(3, '0')}`;

export function ordersForCarrier(rows) {
  return (rows ?? []).filter((r) => r.mode === '택배' && r.status !== '취소').sort((a, b) => a.no - b.no);
}

export function buildOrderSheet(rows) {
  const list = ordersForCarrier(rows);
  const data = [
    HEAD.map((h, i) => head(h, i >= 6 ? '#3F7A3F' : '#F28C1B')), // 초록 머리글 = 직접 채울 칸
    ...list.map((r) => [orderNo(r.no), r.nick, r.qty, r.carrier, r.want_date ?? '', r.status, '', '', '', '']),
    [{ value: '합계', fontWeight: 'bold' }, '', { value: list.reduce((a, r) => a + r.qty, 0), fontWeight: 'bold' }, '', '', '', '', '', '', ''],
  ];
  return { data, columns: WIDTHS.map((width) => ({ width })), count: list.length };
}

export const sheetFileName = (d = new Date()) => `감귤_택배접수_${d.toISOString().slice(0, 10).replaceAll('-', '')}.xlsx`;
