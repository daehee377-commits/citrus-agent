// Supabase 저장·보안 규칙 점검: npm run test:supabase  (임시 데이터를 만들고 마지막에 지운다. 키는 출력하지 않는다)
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL, anon = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !anon) { console.log('Supabase 키가 없습니다.'); process.exit(1); }
const as = (sid) => createClient(url, anon, { global: { headers: { 'x-session-id': sid } } });
const A = 'test-session-AAAAAAAA', B = 'test-session-BBBBBBBB';
let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => { cond ? pass++ : fail++; console.log(`${cond ? '✅' : '❌'} ${name}${cond ? '' : ' ← ' + detail}`); };
const row = (sid, name = '시험카페', mode = '방문 모드', size = '소량') => ({ session_id: sid, place_name: name, mode, size });

// 이전 시험이 남겼을 수 있는 데이터를 먼저 지운다
for (const s of [A, B]) await as(s).from('citrus_favorites').delete().eq('session_id', s);

const ins = await as(A).from('citrus_favorites').insert(row(A));
ok('내 세션으로 저장', !ins.error, ins.error?.message);
const listA = await as(A).from('citrus_favorites').select('place_name');
ok('내 세션으로 불러오기', listA.data?.length === 1 && listA.data[0].place_name === '시험카페', JSON.stringify(listA.error ?? listA.data));
const listB = await as(B).from('citrus_favorites').select('place_name');
ok('다른 세션에서는 내 것이 안 보임', !listB.error && listB.data.length === 0, JSON.stringify(listB.error ?? listB.data));
const noHeader = await createClient(url, anon).from('citrus_favorites').select('place_name');
ok('세션 번호가 없으면 아무것도 안 보임', !noHeader.error && noHeader.data.length === 0, JSON.stringify(noHeader.error ?? noHeader.data));
const spoof = await as(B).from('citrus_favorites').insert(row(A, '남의이름으로저장'));
ok('남의 세션 번호로 저장 시도는 막힘', !!spoof.error, '막히지 않음');
const dup = await as(A).from('citrus_favorites').insert(row(A));
ok('같은 후보 중복 저장은 막힘', dup.error?.code === '23505', JSON.stringify(dup.error));
const badMode = await as(A).from('citrus_favorites').insert(row(A, '이상한후보', '아무말'));
ok('허용되지 않은 구분값은 막힘', !!badMode.error, '막히지 않음');
const upd = await as(A).from('citrus_favorites').update({ place_name: '바꿈' }).eq('session_id', A).select();
ok('수정은 막힘(바뀐 줄 0)', !upd.error && upd.data.length === 0, JSON.stringify(upd.error ?? upd.data));
const delB = await as(B).from('citrus_favorites').delete().eq('session_id', A).select();
ok('남의 것은 삭제 못 함', !delB.error && delB.data.length === 0, JSON.stringify(delB.error ?? delB.data));
const delA = await as(A).from('citrus_favorites').delete().eq('session_id', A).select();
ok('내 것은 삭제됨', !delA.error && delA.data.length === 1, JSON.stringify(delA.error ?? delA.data));
// 50개 상한
const many = Array.from({ length: 50 }, (_, i) => row(A, `상한시험${i}`));
const fill = await as(A).from('citrus_favorites').insert(many);
const over = await as(A).from('citrus_favorites').insert(row(A, '51번째'));
ok('50개까지 저장, 51번째는 막힘', !fill.error && !!over.error, JSON.stringify({ fill: fill.error, over: over.error }));
await as(A).from('citrus_favorites').delete().eq('session_id', A); // 시험 데이터 정리
const left = await as(A).from('citrus_favorites').select('id');
ok('시험 데이터 정리됨', left.data?.length === 0);

console.log(`\n결과: 통과 ${pass} / 실패 ${fail}`);
process.exitCode = fail ? 1 : 0;
