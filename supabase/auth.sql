-- 1) Chaque colis appartient au compte qui l'a créé
alter table public.packages
  add column if not exists owner uuid references auth.users(id) on delete set null;
create index if not exists packages_owner_idx on public.packages (owner, created_at desc);

-- 2) Créer un colis : il faut être connecté (max. 50 colis par jour et par compte)
create or replace function public.create_package(
  p_to text, p_from text, p_message text, p_attentions jsonb, p_contents jsonb
) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_code text;
  alphabet constant text := 'abcdefghijkmnpqrstuvwxyz23456789';
  i int;
begin
  if v_uid is null then
    raise exception 'connexion requise' using errcode = '28000';
  end if;
  if (select count(*) from public.packages
      where owner = v_uid and created_at > now() - interval '1 day') >= 50 then
    raise exception 'limite quotidienne atteinte';
  end if;
  if jsonb_typeof(coalesce(p_attentions,'[]')) <> 'array'
     or jsonb_typeof(coalesce(p_contents,'[]')) <> 'array' then
    raise exception 'format invalide';
  end if;
  if jsonb_array_length(coalesce(p_contents,'[]')) > 30
     or pg_column_size(coalesce(p_contents,'[]')) > 50000 then
    raise exception 'colis trop gros';
  end if;

  loop
    v_code := '';
    for i in 1..7 loop
      v_code := v_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    begin
      insert into public.packages (code, to_name, from_name, message, attentions, contents, owner)
      values (v_code, left(p_to, 40), left(p_from, 40), left(p_message, 600),
              coalesce(p_attentions,'[]'), coalesce(p_contents,'[]'), v_uid);
      return v_code;
    exception when unique_violation then
      -- code déjà pris : on en tire un autre
    end;
  end loop;
end $$;

-- 3) Mes colis (seulement ceux du compte connecté)
create or replace function public.my_packages()
returns table (code text, to_name text, created_at timestamptz, opened_at timestamptz)
language sql security definer set search_path = public stable as $$
  select p.code, p.to_name, p.created_at, p.opened_at
  from public.packages p
  where p.owner = auth.uid()
  order by p.created_at desc
  limit 100;
$$;

-- 4) Supprimer un de mes colis (le lien ne marchera plus)
create or replace function public.delete_package(p_code text)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return false; end if;
  delete from public.packages where code = lower(p_code) and owner = auth.uid();
  return found;
end $$;

-- 5) Qui a le droit d'appeler quoi
--    Créer / lister / supprimer : comptes connectés seulement.
--    Ouvrir un colis (get_package, mark_opened) : tout le monde, sans compte.
revoke all on function public.create_package(text,text,text,jsonb,jsonb) from public, anon;
revoke all on function public.my_packages() from public, anon;
revoke all on function public.delete_package(text) from public, anon;
grant execute on function public.create_package(text,text,text,jsonb,jsonb) to authenticated;
grant execute on function public.my_packages() to authenticated;
grant execute on function public.delete_package(text) to authenticated;

-- 6) Fichiers : seulement les comptes connectés, chacun dans son propre dossier
drop policy if exists "colis: depot de fichiers" on storage.objects;
drop policy if exists "colis: depot par les membres" on storage.objects;
create policy "colis: depot par les membres" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'colis-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );