create function public.complete_pin_change() returns void
language sql security definer set search_path = public as $$
  update public.profiles set must_change_pin = false where id = auth.uid();
$$;

revoke all on function public.complete_pin_change() from public, anon;
grant execute on function public.complete_pin_change() to authenticated;
