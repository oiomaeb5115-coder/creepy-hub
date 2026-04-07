create or replace function public.delete_account_data(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 該当ユーザーの投稿を削除（post_reports は post FK の CASCADE で自動削除）
  delete from public.post
  where user_id = p_user_id;

  -- 他ユーザーの投稿に対する報告・コメント・投票を削除
  delete from public.post_reports where user_id = p_user_id;
  delete from public.wiki_reports where user_id = p_user_id;
  delete from public.post_comments where user_id = p_user_id;
  delete from public.post_votes where user_id = p_user_id;

  -- login_attempts のクリーンアップ（プライバシー保護）
  delete from public.login_attempts
  where email = (select email from auth.users where id = p_user_id);

  update public.story_categories
  set created_by = null
  where created_by = p_user_id;

  update public.categories
  set created_by = null
  where created_by = p_user_id;

  update public.profiles
  set display_name = null,
      avatar_url = null,
      banner_url = null,
      bio = null,
      website_url = null,
      location = null,
      username = 'deleted_' || left(p_user_id::text, 8),
      is_public = false
  where id = p_user_id;
end;
$$;

revoke all on function public.delete_account_data(uuid) from public;
grant execute on function public.delete_account_data(uuid) to service_role;

create or replace function public.replace_wiki_page_categories(
  p_wiki_page_id bigint,
  p_category_ids jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_category_id bigint;
begin
  if p_category_ids is not null and jsonb_typeof(p_category_ids) <> 'array' then
    raise exception 'p_category_ids must be a JSON array';
  end if;

  delete from public.wiki_page_categories
  where wiki_page_id = p_wiki_page_id;

  if p_category_ids is null then
    return;
  end if;

  for v_category_id in
    select value::text::bigint
    from jsonb_array_elements(p_category_ids)
  loop
    if not exists (
      select 1
      from public.categories
      where id = v_category_id
    ) then
      raise exception 'category % does not exist', v_category_id;
    end if;

    insert into public.wiki_page_categories (wiki_page_id, category_id)
    values (p_wiki_page_id, v_category_id);
  end loop;
end;
$$;

revoke all on function public.replace_wiki_page_categories(bigint, jsonb) from public;
grant execute on function public.replace_wiki_page_categories(bigint, jsonb) to service_role;
