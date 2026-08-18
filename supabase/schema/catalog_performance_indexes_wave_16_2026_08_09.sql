create index if not exists bike_catalog_component_fitments_component_idx
  on public.bike_catalog_component_fitments (component_id);

create index if not exists garage_compatibility_target_component_idx
  on public.garage_compatibility (target_component_id);
