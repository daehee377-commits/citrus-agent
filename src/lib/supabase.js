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
  const { data, error } = await db(sessionId).from('favorites').select('id, place_name, mode, size, created_at').order('created_at', { ascending: false });
  fail(error);
  return data;
}

export async function addFavorite(sessionId, { name, mode, size }) {
  const { error } = await db(sessionId).from('favorites').insert({ session_id: sessionId, place_name: name, mode, size });
  fail(error);
}

export async function removeFavorite(sessionId, id) {
  const { error } = await db(sessionId).from('favorites').delete().eq('id', id);
  fail(error);
}
