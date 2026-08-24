-- FODEL 1.0 — Stage 3 additions: reference numbers for new listings and
-- storage for uploaded photos. Run after 0001 and 0002, same way (SQL
-- Editor → paste → Run).

-- New listings created through the portal get the next number in sequence.
-- Starts past the seeded demo refs (up to 7118) so nothing collides.
create sequence property_ref_seq start 7200;

create function next_property_ref() returns text as $$
  select nextval('property_ref_seq')::text;
$$ language sql;

-- Real photo dimensions, known once sharp has processed an upload — used so
-- Astro's <Image> doesn't need to guess. The six seeded demo photos leave
-- these null; their dimensions come from the imported file itself.
alter table property_media add column width integer;
alter table property_media add column height integer;

-- Where uploaded photos live. Public bucket: property photos are meant to be
-- seen by anyone, same as today — the security question is who may ADD or
-- REMOVE one, which the policies below answer.
insert into storage.buckets (id, name, public)
values ('property-media', 'property-media', true)
on conflict (id) do nothing;

-- Objects are stored at "{property_id}/{file}", so storage.foldername(name)
-- gives back the owning property's id as the first path segment.
create policy "property_media_objects_read" on storage.objects
  for select using (bucket_id = 'property-media');

create policy "property_media_objects_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'property-media'
    and exists (
      select 1 from properties p
      where p.id::text = (storage.foldername(name))[1]
        and (p.owner_id = auth.uid() or is_admin())
    )
  );

create policy "property_media_objects_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'property-media'
    and exists (
      select 1 from properties p
      where p.id::text = (storage.foldername(name))[1]
        and (p.owner_id = auth.uid() or is_admin())
    )
  );
