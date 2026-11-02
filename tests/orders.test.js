// 주문 현황판 점검: npm run test:orders  (임시 데이터를 만들고 마지막에 지운다. supabase/orders.sql 을 먼저 실행해야 한다)
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL, anon = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !anon) { console.log('Supabase 키가 없습니다.'); process.exit(1); }
const as = (sid) => createClient(url, anon, { global: { headers: { 'x-session-id': sid } } });
const A = 'test-orders-AAAAAAAA', B = 'test-orders-BBBBBBBB';
let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => { cond ? pass++ : fail++; console.log(`${cond ? '✅' : '❌'} ${name}${cond ? '' : ' ← ' + detail}`); };
const row = (sid, no, over = {}) => ({ session_id: sid, no, nick: '시험 카페', mode: '택배', qty: 5, ...over });

const probe = await as(A).from('citrus_orders').select('id').limit(1);
if (probe.error) { console.log('주문 테이블이 없습니다. supabase/orders.sql 을 Supabase SQL Editor 에서 먼저 실행하세요.'); process.exit(1); }
for (const s of [A, B]) await as(s).from('citrus_orders').delete().eq('session_id', s);

const add = await as(A).from('citrus_orders').insert(row(A, 1)).select().single();
ok('주문 추가', !add.error && add.data?.status === '문의' && add.data?.carrier === '미정', add.error?.message);
const more = await as(A).from('citrus_orders').update({ qty: 8, extra: 3 }).eq('id', add.data?.id).select().single();
ok('추가 주문(수량 증가)', !more.error && more.data?.qty === 8 && more.data?.extra === 3, more.error?.message);
const cancel = await as(A).from('citrus_orders').update({ status: '취소' }).eq('id', add.data?.id).select().single();
ok('주문 취소(상태 변경, 기록 유지)', !cancel.error && cancel.data?.status === '취소', cancel.error?.message);
const back = await as(A).from('citrus_orders').update({ status: '문의' }).eq('id', add.data?.id).select().single();
ok('취소 되살리기', !back.error && back.data?.status === '문의', back.error?.message);
const otherList = await as(B).from('citrus_orders').select('id');
ok('다른 세션에서는 내 주문이 안 보임', !otherList.error && otherList.data.length === 0, JSON.stringify(otherList.error ?? otherList.data));
const otherUpd = await as(B).from('citrus_orders').update({ status: '취소' }).eq('id', add.data?.id).select();
ok('다른 세션은 내 주문을 못 바꿈(바뀐 줄 0)', !otherUpd.error && otherUpd.data.length === 0, JSON.stringify(otherUpd.error ?? otherUpd.data));
const spoof = await as(B).from('citrus_orders').insert(row(A, 2));
ok('남의 세션 번호로 주문 만들기는 막힘', !!spoof.error, '막히지 않음');
const phone = await as(A).from('citrus_orders').insert(row(A, 3, { nick: '김씨 01012345678' }));
ok('별칭에 전화번호(숫자 4자리 이상)는 막힘', phone.error?.code === '23514', JSON.stringify(phone.error));
const mail = await as(A).from('citrus_orders').insert(row(A, 4, { nick: 'abc@mail' }));
ok('별칭에 @ 는 막힘', mail.error?.code === '23514', JSON.stringify(mail.error));
const badQty = await as(A).from('citrus_orders').insert(row(A, 5, { qty: 0 }));
ok('수량 0 은 막힘', !!badQty.error, '막히지 않음');
const badCarrier = await as(A).from('citrus_orders').insert(row(A, 6, { carrier: '아무택배' }));
ok('목록에 없는 택배사는 막힘', !!badCarrier.error, '막히지 않음');
const dup = await as(A).from('citrus_orders').insert(row(A, 1));
ok('같은 주문 번호 중복은 막힘', dup.error?.code === '23505', JSON.stringify(dup.error));
const del = await as(A).from('citrus_orders').delete().eq('id', add.data?.id).select();
ok('기록 삭제', !del.error && del.data.length === 1, JSON.stringify(del.error ?? del.data));

for (const s of [A, B]) await as(s).from('citrus_orders').delete().eq('session_id', s);
console.log(`\n결과: 통과 ${pass} / 실패 ${fail}`);
process.exitCode = fail ? 1 : 0;
