SELECT setval(
  pg_get_serial_sequence('public.ads', 'ad_number'),
  GREATEST((SELECT COALESCE(MAX(ad_number), 0) FROM public.ads), 1),
  true
);