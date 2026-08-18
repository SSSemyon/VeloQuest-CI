-- Release-quality normalization for archive rows that are intentionally
-- shallow but still need a stable finder category. Exact technical specs and
-- compatibility remain default-deny until first-party evidence is added.

update public.bike_catalog_models
set category = case
  when brand = 'FOCUS' and model ilike 'ATLAS%' then 'gravel'
  when brand = 'Marin' and model = 'Alcatraz' then 'dirt_jump'
  when brand = 'Marin' and model ilike 'Alpine Trail E%' then 'emtb_full_suspension'
  when brand = 'Marin' and model = 'El Roy' then 'trail_hardtail'
  when brand = 'Marin' and model ilike 'Rift Zone E%' then 'emtb_full_suspension'
  when brand = 'Marin' and model ilike 'Rift Zone Jr%' then 'youth_full_suspension'
  when brand = 'Marin' and model ilike 'Rift Zone%' then 'trail_full_suspension'
  when brand = 'Marin' and model ilike 'San Quentin 24%' then 'kids'
  when brand = 'Marin' and model ilike 'San Quentin%' then 'trail_hardtail'
  when brand = 'Marin' and model ilike 'Team Marin%' then 'xc_hardtail'
  when brand = 'Mondraker' and model ilike 'FOXY%' then 'trail_full_suspension'
  when brand = 'Mondraker' and model ilike any (array['CHASER%','CRAFTY%','CRUSHER%','DUNE%','LEVEL%','NEAT%']) then 'emtb_full_suspension'
  when brand = 'NS Bikes' and model ilike any (array['Clash%','Metropolis%','Movement%','Zircus%']) then 'dirt_jump'
  when brand = 'NS Bikes' and model = 'Crust' then 'gravel'
  when brand = 'NS Bikes' and model = 'Define' then 'trail_full_suspension'
  when brand = 'NS Bikes' and model ilike 'E-Fine%' then 'emtb_full_suspension'
  when brand = 'NS Bikes' and model = 'Eccentric' then 'trail_hardtail'
  when brand = 'NS Bikes' and model = 'Fuzz' then 'downhill'
  when brand = 'NS Bikes' and model = 'Nerd' then 'trail_full_suspension'
  when brand = 'NS Bikes' and model = 'Synonym' then 'xc_full_suspension'
  when brand = 'Polygon' and model ilike 'CASCADE%' then 'mountain'
  when brand = 'Propain' and model ilike 'Ekano%' then 'emtb_full_suspension'
  when brand = 'Propain' and model ilike 'Rage%' then 'downhill'
  when brand = 'Propain' and model ilike 'Spindrift%' then 'freeride_full_suspension'
  when brand = 'Propain' and model ilike 'Sresh%' then 'emtb_full_suspension'
  when brand = 'Propain' and model ilike 'Trickshot%' then 'dirt_jump'
  when brand = 'Propain' and model ilike 'Yuma%' then 'kids'
  when brand = 'Rocky Mountain' and model ilike 'Altitude%' then 'enduro_full_suspension'
  when brand = 'Rocky Mountain' and model = 'Flow' then 'dirt_jump'
  when brand = 'Rocky Mountain' and model ilike 'Flow Jr%' then 'kids'
  when brand = 'Rocky Mountain' and model ilike 'Soul%' then 'xc_hardtail'
  when brand = 'Specialized' and model ilike 'Allez Sprint%' then 'road_race'
  else category
end
where category is null or btrim(category) = '';

-- Older SQL waves already have an evidence-backed model_year column and an
-- official manufacturer page, but did not duplicate that fact inside specs.
-- Normalize the explicit field so all finder rows share one contract.
update public.bike_catalog_models
set specs = jsonb_set(
  coalesce(specs, '{}'::jsonb),
  '{model_year_evidence}',
  to_jsonb(model_year::text),
  true
)
where coalesce(btrim(specs ->> 'model_year_evidence'), '') = '';
