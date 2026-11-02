// 택배 접수용 엑셀 시험: npm run test:sheet  (실제로 .xlsx 를 만들어 다시 열어 본다)
import writeExcelFile from 'write-excel-file/node';
import { unzipSync, strFromU8 } from 'fflate';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildOrderSheet, ordersForCarrier, sheetFileName } from '../src/lib/orderSheet.js';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => { cond ? pass++ : fail++; console.log(`${cond ? '✅' : '❌'} ${name}${cond ? '' : ' ← ' + detail}`); };
const rows = [
  { no: 1, nick: '성수동 카페 B', mode: '택배', qty: 5, carrier: '우체국', want_date: '2026-11-12', status: '협의' },
  { no: 2, nick: '단골 3번', mode: '방문', qty: 2, carrier: '미정', want_date: null, status: '문의' },
  { no: 3, nick: '취소된 곳', mode: '택배', qty: 9, carrier: 'CJ대한통운', want_date: null, status: '취소' },
  { no: 4, nick: '서울 마켓', mode: '택배', qty: 3, carrier: '미정', want_date: null, status: '발송 준비' },
];
const list = ordersForCarrier(rows);
ok('택배 주문만, 취소 제외', list.length === 2 && list.every((r) => r.mode === '택배' && r.status !== '취소'), JSON.stringify(list.map((r) => r.no)));
const { data, columns, count } = buildOrderSheet(rows);
ok('표 크기: 머리글 + 2건 + 합계', data.length === 4 && count === 2, String(data.length));
ok('합계 상자 수 8', data.at(-1)[2].value === 8, JSON.stringify(data.at(-1)[2]));
ok('개인정보 칸(받는 분·연락처·주소)은 비어 있음', data[1].slice(6).every((v) => v === ''), JSON.stringify(data[1]));
ok('빈 목록도 오류 없이 표를 만듦', buildOrderSheet([]).data.length === 2);
ok('파일 이름 형식', /^감귤_택배접수_[0-9]{8}\.xlsx$/.test(sheetFileName(new Date('2026-11-12T00:00:00Z'))), sheetFileName());

const file = path.join(os.tmpdir(), 'orders-test.xlsx');
await writeExcelFile(data, { columns }).toFile(file);
const zip = unzipSync(new Uint8Array(fs.readFileSync(file)));
const names = Object.keys(zip);
ok('xlsx 파일이 만들어짐(zip 안에 시트 있음)', names.some((n) => n.includes('worksheets/sheet1.xml')), names.join(','));
const strings = strFromU8(zip['xl/sharedStrings.xml'] ?? new Uint8Array());
ok('시트에 별칭과 머리글이 들어감', ['성수동 카페 B', '서울 마켓', '받는 분', '택배사'].every((t) => strings.includes(t)), strings.slice(0, 200));
ok('취소된 주문은 들어가지 않음', !strings.includes('취소된 곳'));
fs.rmSync(file, { force: true });
console.log(`\n결과: 통과 ${pass} / 실패 ${fail}`);
process.exitCode = fail ? 1 : 0;
