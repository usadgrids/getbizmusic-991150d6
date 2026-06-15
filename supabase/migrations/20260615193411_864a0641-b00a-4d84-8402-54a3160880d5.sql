
create policy "Anyone can upload ad images"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'ad-uploads');

create policy "Admins read ad images"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'ad-uploads' and public.has_role(auth.uid(), 'admin'));

create policy "Admins delete ad images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'ad-uploads' and public.has_role(auth.uid(), 'admin'));
