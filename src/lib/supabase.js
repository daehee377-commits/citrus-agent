// Supabase 연결: 개인정보 없는 즐겨찾기(장소명·방문/배송·규모)만 저장한다.
// 키가 없으면 저장 기능만 꺼지고 나머지 화면은 그대로 동작한다.
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseReady = Boolean(url && anon);

let client = null;
// 브라우저별 임의 번호를 헤더로 보내, 서버(RLS 정책)가 "내 것"만 읽고 쓰게 한다
function db(sessionId) {
  if (!supabaseReady) throw new Error('저장 기능이 아직 연결되지 않았습니다.');
  client ??= createClient(url, anon, { global: { headers: { 'x-session-id': sessionId } } });
  return client;
}

const fail = (error) => { if (error) throw new Error(error.code === '23505' ? '이미 저장한 후보입니다.' : '저장소와 통신하지 못했습니다. 잠시 뒤 다시 시도해 주세요.'); };

export async function listFavorites(sessionId) {
  const { data, error } = await db(sessionId).from('citrus_favorites').select('id, place_name, mode, size, created_at').order('created_at', { ascending: false });
  fail(error);
  return data;
}

export async function addFavorite(sessionId, { name, mode, size }) {
  const { error } = await db(sessionId).from('citrus_favorites').insert({ session_id: sessionId, place_name: name, mode, size });
  fail(error);
}

export async function removeFavorite(sessionId, id) {
  const { error } = await db(sessionId).from('citrus_favorites').delete().eq('id', id);
  fail(error);
}

// ── 주문·연락 현황판: 별칭·방문/택배·상자 수·상태만 저장한다 (개인정보 칸 없음) ──
const failOrder = (error) => {
  if (!error) return;
  if (error.code === '42P01' || error.code === 'PGRST205') throw new Error('주문 현황판 테이블이 아직 만들어지지 않았습니다. (supabase/orders.sql 실행 필요)');
  if (error.code === '23514') throw new Error('입력값을 확인해 주세요. 별칭에는 전화번호처럼 숫자 4자리 이상이나 @ 를 쓸 수 없습니다.');
  throw new Error('저장소와 통신하지 못했습니다. 잠시 뒤 다시 시도해 주세요.');
};
const ORDER_COLS = 'id, no, nick, mode, qty, extra, status, carrier, want_date, created_at';

export async function listOrders(sessionId) {
  const { data, error } = await db(sessionId).from('citrus_orders').select(ORDER_COLS).order('no', { ascending: false });
  failOrder(error);
  return data;
}

export async function addOrder(sessionId, order, nextNo) {
  const { data, error } = await db(sessionId).from('citrus_orders')
    .insert({ session_id: sessionId, no: nextNo, nick: order.nick, mode: order.mode, qty: order.qty, carrier: order.carrier, want_date: order.want_date || null })
    .select(ORDER_COLS).single();
  failOrder(error);
  return data;
}

export async function updateOrder(sessionId, id, patch) {
  const { data, error } = await db(sessionId).from('citrus_orders').update(patch).eq('id', id).select(ORDER_COLS).single();
  failOrder(error);
  return data;
}

export async function removeOrder(sessionId, id) {
  const { error } = await db(sessionId).from('citrus_orders').delete().eq('id', id);
  failOrder(error);
}
