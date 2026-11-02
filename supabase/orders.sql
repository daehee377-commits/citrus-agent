-- 주문·연락 현황판 테이블 (Supabase 대시보드 > SQL Editor 에 통째로 붙여 넣고 Run). schema.sql 을 먼저 실행한 뒤 이 파일을 실행한다.
-- 저장하는 것: 별칭, 방문/택배, 상자 수, 진행 상태, 택배사 이름(회사), 희망일.
-- 저장하지 않는 것: 이름, 전화번호, 주소, 결제 정보, 메모. (그런 칸 자체가 없고, 별칭에 숫자 4자리 이상과 @ 는 막는다)

create table if not exists public.citrus_orders (
  id          uuid primary key default gen_random_uuid(),
  session_id  text not null check (char_length(session_id) between 8 and 64),
  no          int  not null check (no between 1 and 9999),
  nick        text not null check (char_length(nick) between 1 and 30 and nick !~ '[0-9]{4,}' and nick !~ '@'),
  mode        text not null check (mode in ('방문', '택배')),
  qty         int  not null check (qty between 1 and 999),
  extra       int  not null default 0 check (extra between 0 and 999),
  status      text not null default '문의' check (status in ('문의', '협의', '발송 준비', '발송', '완료', '취소')),
  carrier     text not null default '미정' check (carrier in ('미정', '우체국', 'CJ대한통운', '한진', '롯데', '로젠')),
  want_date   date,
  created_at  timestamptz not null default now(),
  unique (session_id, no)
);

alter table public.citrus_orders enable row level security;

drop policy if exists "own select" on public.citrus_orders;
drop policy if exists "own insert" on public.citrus_orders;
drop policy if exists "own update" on public.citrus_orders;
drop policy if exists "own delete" on public.citrus_orders;

create policy "own select" on public.citrus_orders for select
  using (session_id = public.request_session_id());

-- 한 세션이 만들 수 있는 주문은 100건까지
create policy "own insert" on public.citrus_orders for insert
  with check (
    session_id = public.request_session_id()
    and (select count(*) from public.citrus_orders o where o.session_id = public.request_session_id()) < 100
  );

-- 내 주문의 수량·상태·택배사만 고칠 수 있다 (추가 주문, 취소)
create policy "own update" on public.citrus_orders for update
  using (session_id = public.request_session_id())
  with check (session_id = public.request_session_id());

create policy "own delete" on public.citrus_orders for delete
  using (session_id = public.request_session_id());
