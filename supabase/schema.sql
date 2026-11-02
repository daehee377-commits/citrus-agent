-- 감귤 수확철 비서: Supabase 테이블 (Supabase 대시보드 > SQL Editor 에 통째로 붙여 넣고 Run)
-- 저장하는 것: 마음에 든 판로 후보의 장소명·방문/배송 구분·규모뿐이다.
-- 저장하지 않는 것: 주소, 전화번호, 후기 내용, 링크, 농장 주소, 입력한 출발지, 메모.

create table if not exists public.citrus_favorites (
  id          uuid primary key default gen_random_uuid(),
  session_id  text not null check (char_length(session_id) between 8 and 64), -- 브라우저마다 만든 임의 번호 (로그인·개인정보 아님)
  place_name  text not null check (char_length(place_name) between 1 and 100),
  mode        text not null check (mode in ('방문 모드', '배송 모드', '확인 필요')),
  size        text not null check (size in ('소량', '중량', '대량', '확인 필요')),
  created_at  timestamptz not null default now(),
  unique (session_id, place_name)
);

alter table public.citrus_favorites enable row level security;

-- 브라우저가 보내는 x-session-id 헤더와 같은 줄만 읽고·쓰고·지울 수 있다 (남의 즐겨찾기는 보이지 않는다)
create or replace function public.request_session_id() returns text
language sql stable as $$
  select coalesce(current_setting('request.headers', true)::json ->> 'x-session-id', '')
$$;

drop policy if exists "own select" on public.citrus_favorites;
drop policy if exists "own insert" on public.citrus_favorites;
drop policy if exists "own delete" on public.citrus_favorites;

create policy "own select" on public.citrus_favorites for select
  using (session_id = public.request_session_id());

-- 한 세션이 저장할 수 있는 후보는 50개까지
create policy "own insert" on public.citrus_favorites for insert
  with check (
    session_id = public.request_session_id()
    and (select count(*) from public.citrus_favorites f where f.session_id = public.request_session_id()) < 50
  );

create policy "own delete" on public.citrus_favorites for delete
  using (session_id = public.request_session_id());

-- 수정(update)은 허용하지 않는다: 정책이 없으면 막힌다.
