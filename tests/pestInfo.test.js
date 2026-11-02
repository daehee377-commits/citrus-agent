// get_pest_info 단독 실행 테스트: npm run test:pest  (키는 .env.local, 출력에 키는 나오지 않는다)
import { getPestInfo } from '../server/pestInfo.js';

const list = await getPestInfo({ crop: '감귤' });
console.log(`감귤 병 ${list.total}종:`, list.diseases.slice(0, 8).join(', '), '...');
const d = await getPestInfo({ crop: '감귤', name: '궤양병' });
console.log(`\n[${d.name}]\n증상: ${d.symptoms.slice(0, 160)}...\n방제: ${d.prevention.slice(0, 160)}...\n${d.note}`);
const none = await getPestInfo({ crop: '감귤', name: '없는병이름' });
console.log('\n없는 병 질문 →', none.note);
