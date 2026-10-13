-- =========================================================
-- Petit Colis Doux — base de données Supabase
-- Colle tout ce fichier dans Supabase → SQL Editor → Run.
-- On peut le relancer sans risque.
-- =========================================================

-- 1) La table des colis
create table if not exists public.packages (
  code        text primary key,
  to_name     text,
  from_name   text,
  message     text,
  attentions  jsonb not null default '[]'::jsonb,
  contents    jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  opened_at   timestamptz
);

-- Sécurité : personne ne lit ni n'écrit la table directement.
-- Tout passe par les 3 fonctions ci-dessous.
alter table public.packages enable row level security;
revoke all on public.packages from anon, authenticated;

-- 2) Créer un colis → renvoie un code court (ex. "k7x2p9m")
create or replace function public.create_package(
  p_to text, p_from text, p_message text, p_attentions jsonb, p_contents jsonb
) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_code text;
  alphabet constant text := 'abcdefghijkmnpqrstuvwxyz23456789';
  i int;
begin
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
      insert into public.packages (code, to_name, from_name, message, attentions, contents)
      values (v_code, left(p_to, 40), left(p_from, 40), left(p_message, 600),
              coalesce(p_attentions,'[]'), coalesce(p_contents,'[]'));
      return v_code;
    exception when unique_violation then
      -- code déjà pris : on en tire un autre
    end;
  end loop;
end $$;

-- 3) Lire un colis avec son code
create or replace function public.get_package(p_code text)
returns jsonb
language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'to', to_name, 'from', from_name, 'message', message,
    'attentions', attentions, 'contents', contents,
    'created_at', created_at, 'opened_at', opened_at)
  from public.packages where code = lower(p_code);
$$;

-- 4) Noter que le colis a été ouvert (la première fois seulement)
create or replace function public.mark_opened(p_code text)
returns void
language sql security definer set search_path = public as $$
  update public.packages set opened_at = now()
  where code = lower(p_code) and opened_at is null;
$$;

revoke all on function public.create_package(text,text,text,jsonb,jsonb) from public;
revoke all on function public.get_package(text) from public;
revoke all on function public.mark_opened(text) from public;
grant execute on function public.create_package(text,text,text,jsonb,jsonb) to anon, authenticated;
grant execute on function public.get_package(text) to anon, authenticated;
grant execute on function public.mark_opened(text) to anon, authenticated;

-- 5) Le dossier pour les photos, dessins, vocaux et vidéos
--    Public en lecture, 25 Mo max par fichier, seulement images/audio/vidéo.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('colis-media', 'colis-media', true, 26214400, array[
  'image/jpeg','image/png','image/webp',
  'audio/webm','audio/mp4','audio/mpeg','audio/ogg','audio/wav','audio/x-m4a','audio/aac',
  'video/mp4','video/webm','video/quicktime'
])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- N'importe qui peut déposer un fichier dans ce dossier (mais pas modifier ni supprimer).
drop policy if exists "colis: depot de fichiers" on storage.objects;
create policy "colis: depot de fichiers" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'colis-media');
