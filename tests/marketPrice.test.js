// get_market_price 단독 실행 테스트: npm run test:price  (키는 .env.local, 출력에 키는 나오지 않는다)
import { getMarketPrice } from '../server/marketPrice.js';

const r = await getMarketPrice();
console.log(`${r.market} ${r.date} 감귤 (산지: ${r.origin})`);
for (const i of r.items) {
  const box = i.box10Actual ? `10kg 실거래 ${i.box10Actual.price}원(${i.box10Actual.rows}건)` : '10kg 실거래 없음';
  const diff = i.changeVsPrev ? ` | 직전 거래일(${i.changeVsPrev.date}) 대비 kg당 ${i.changeVsPrev.perKgDiff >= 0 ? '+' : ''}${i.changeVsPrev.perKgDiff}원` : '';
  console.log(`- ${i.name}: kg당 ${i.perKgAvg}원 (${i.perKgLow}~${i.perKgHigh}), 10kg 환산 ${i.per10kgEstimate}원, ${box}, ${i.rows}건${diff}`);
}
console.log(r.note);
