// 퀴즈 문제 만들기 테스트: npm run test:quiz  (키 불필요)
import { weatherQuestions, pestQuestions, buildRound, rankOf, shuffle } from '../src/lib/quiz.js';

let fail = 0;
const ok = (name, cond) => { console.log(cond ? '통과' : '실패', '-', name); if (!cond) fail++; };
let seed = 7; const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; // 같은 결과가 나오는 난수

const days = [
  { date: '20261103', maxPop: 30, rainHours: 0, sky: '구름많음', work: '수확 가능', why: '강수확률 최대 30%' },
  { date: '20261104', maxPop: 60, rainHours: 5, sky: '흐림', work: '포장 작업만', why: '비 예보' },
  { date: '20261105', maxPop: null, work: '확인 필요', why: '' },
];
const w = weatherQuestions(days);
ok('날씨 문제는 확인 필요인 날을 뺀다', w.length === 2);
ok('날씨 정답은 날씨 API의 판단 그대로', w[0].answer === '수확 가능' && w[1].answer === '포장 작업만');
ok('날씨 보기는 2개', w.every((q) => q.options.length === 2 && q.options.includes(q.answer)));

const items = Array.from({ length: 10 }, (_, i) => ({ name: `병${i}`, thumb: i % 3 === 0 ? null : `https://x/${i}.jpg` }));
const p = pestQuestions(items, rng, 5);
ok('병해충 문제는 사진이 있는 병만', p.every((q) => q.image));
ok('병해충 보기는 4개, 정답 포함, 중복 없음', p.every((q) => q.options.length === 4 && q.options.includes(q.answer) && new Set(q.options).size === 4));
ok('병해충 문제 수는 최대 5개', p.length === 5);

ok('한 판에 두 종류가 섞인다', new Set(buildRound({ days, pests: items }, rng).map((q) => q.kind)).size === 2);
ok('날씨 데이터가 없어도 병해충만으로 진행', buildRound({ days: [], pests: items }, rng).every((q) => q.kind === 'pest'));
ok('병해충 데이터가 없어도 날씨만으로 진행', buildRound({ days, pests: [] }, rng).every((q) => q.kind === 'weather'));
ok('둘 다 없으면 빈 판', buildRound({ days: [], pests: [] }, rng).length === 0);
ok('섞어도 원본 목록은 그대로', (() => { const a = [1, 2, 3]; shuffle(a, rng); return a.join() === '1,2,3'; })());
ok('등급: 만점은 박사, 0점은 다시 도전', rankOf(10, 10).title === '감귤 농사 박사' && rankOf(0, 10).title === '다시 도전!');
ok('등급: 문제가 없으면 안내', rankOf(0, 0).emoji === '📡');

console.log(fail ? `\n실패 ${fail}건` : '\n모두 통과');
process.exit(fail ? 1 : 0);
