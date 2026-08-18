-- VeloQuest catalog expansion wave 11 (prepared while Supabase MCP was unavailable).
-- Adds verified 2020+ bicycle models for three new catalog brands and deepens
-- evidence-backed Garage compatibility. All evidence URLs are first-party.
-- No remote image URL is guessed or copied from a third-party source.

-- Minimal backward-compatible category extension required for explicit upgrade
-- fitment. Existing component categories and rows remain unchanged.
alter table public.garage_components
  drop constraint if exists garage_components_category_check;
alter table public.garage_components
  add constraint garage_components_category_check check (category in (
    'rear_derailleur','front_derailleur','cassette','chain','crankset','chainring',
    'bottom_bracket','shifter','brake_caliper','brake_lever','brake_adapter','rotor','wheelset',
    'hub','tire','fork','rear_shock','seatpost','dropper_post','saddle','handlebar',
    'stem','pedal','e_bike_system','motor','battery','range_extender','controller'
  ));

insert into public.bike_catalog_models
  (id, brand, model, model_year, category, market, specs, manufacturer_url, evidence_checked_at)
values
  -- Kona: official 2025 lineup announcements explicitly identify these models.
  ('kona-honzo-esd-2025-global', 'Kona', 'Honzo ESD', 2025, 'trail_hardtail', 'global',
   '{"frame_material":"steel","model_year_evidence":"official Kona 2025 steel lineup names Honzo ESD"}'::jsonb,
   'https://konaworld.com/blogs/cog/fresh-looks-for-2025-new-colors-for-konas-steel-lineup', '2026-08-07'),
  ('kona-unit-x-2025-global', 'Kona', 'Unit X', 2025, 'bikepacking_hardtail', 'global',
   '{"frame_material":"steel","model_year_evidence":"official Kona 2025 steel lineup names Unit X"}'::jsonb,
   'https://konaworld.com/blogs/cog/fresh-looks-for-2025-new-colors-for-konas-steel-lineup', '2026-08-07'),
  ('kona-unit-2025-global', 'Kona', 'Unit', 2025, 'bikepacking_hardtail', 'global',
   '{"frame_material":"steel","model_year_evidence":"official Kona 2025 steel lineup names Unit"}'::jsonb,
   'https://konaworld.com/blogs/cog/fresh-looks-for-2025-new-colors-for-konas-steel-lineup', '2026-08-07'),
  ('kona-sutra-ltd-2025-global', 'Kona', 'Sutra LTD', 2025, 'adventure_touring', 'global',
   '{"frame_material":"steel","model_year_evidence":"official Kona 2025 steel lineup names Sutra LTD"}'::jsonb,
   'https://konaworld.com/blogs/cog/fresh-looks-for-2025-new-colors-for-konas-steel-lineup', '2026-08-07'),
  ('kona-sutra-2025-global', 'Kona', 'Sutra', 2025, 'adventure_touring', 'global',
   '{"frame_material":"steel","model_year_evidence":"official Kona 2025 steel lineup names Sutra"}'::jsonb,
   'https://konaworld.com/blogs/cog/fresh-looks-for-2025-new-colors-for-konas-steel-lineup', '2026-08-07'),
  ('kona-rove-2025-global', 'Kona', 'Rove', 2025, 'gravel', 'global',
   '{"frame_material":"steel","model_year_evidence":"official Kona 2025 steel lineup names Rove"}'::jsonb,
   'https://konaworld.com/blogs/cog/fresh-looks-for-2025-new-colors-for-konas-steel-lineup', '2026-08-07'),
  ('kona-rove-dl-2025-global', 'Kona', 'Rove DL', 2025, 'gravel', 'global',
   '{"frame_material":"steel","model_year_evidence":"official Kona 2025 steel lineup names Rove DL"}'::jsonb,
   'https://konaworld.com/blogs/cog/fresh-looks-for-2025-new-colors-for-konas-steel-lineup', '2026-08-07'),
  ('kona-rove-ltd-2025-global', 'Kona', 'Rove LTD', 2025, 'gravel', 'global',
   '{"frame_material":"steel","model_year_evidence":"official Kona 2025 steel lineup names Rove LTD"}'::jsonb,
   'https://konaworld.com/blogs/cog/fresh-looks-for-2025-new-colors-for-konas-steel-lineup', '2026-08-07'),
  ('kona-mahuna-2025-global', 'Kona', 'Mahuna', 2025, 'trail_hardtail', 'global',
   '{"frame_material":"aluminium","model_year_evidence":"official Kona 2025 alloy lineup names Mahuna"}'::jsonb,
   'https://konaworld.com/blogs/cog/fresh-looks-for-2025-new-colors-for-konas-alloy-lineup', '2026-08-07'),
  ('kona-rove-al-700-2025-global', 'Kona', 'Rove AL 700', 2025, 'gravel', 'global',
   '{"frame_material":"aluminium","model_year_evidence":"official Kona 2025 alloy lineup names Rove AL 700"}'::jsonb,
   'https://konaworld.com/blogs/cog/fresh-looks-for-2025-new-colors-for-konas-alloy-lineup', '2026-08-07'),
  ('kona-dew-e-2025-global', 'Kona', 'Dew-E', 2025, 'electric_urban', 'global',
   '{"frame_material":"aluminium","model_year_evidence":"official Kona 2025 alloy lineup names Dew-E"}'::jsonb,
   'https://konaworld.com/blogs/cog/fresh-looks-for-2025-new-colors-for-konas-alloy-lineup', '2026-08-07'),
  ('kona-dew-2025-global', 'Kona', 'Dew', 2025, 'urban', 'global',
   '{"frame_material":"aluminium","model_year_evidence":"official Kona 2025 alloy lineup names Dew"}'::jsonb,
   'https://konaworld.com/blogs/cog/fresh-looks-for-2025-new-colors-for-konas-alloy-lineup', '2026-08-07'),
  ('kona-dew-dl-2025-global', 'Kona', 'Dew DL', 2025, 'urban', 'global',
   '{"frame_material":"aluminium","model_year_evidence":"official Kona 2025 alloy lineup names Dew DL"}'::jsonb,
   'https://konaworld.com/blogs/cog/fresh-looks-for-2025-new-colors-for-konas-alloy-lineup', '2026-08-07'),
  ('kona-e-coco-2025-global', 'Kona', 'eCoco', 2025, 'electric_urban', 'global',
   '{"frame_material":"aluminium","model_year_evidence":"official Kona 2025 alloy lineup names eCoco"}'::jsonb,
   'https://konaworld.com/blogs/cog/fresh-looks-for-2025-new-colors-for-konas-alloy-lineup', '2026-08-07'),
  ('kona-coco-2025-global', 'Kona', 'Coco', 2025, 'urban', 'global',
   '{"frame_material":"aluminium","model_year_evidence":"official Kona 2025 alloy lineup names Coco"}'::jsonb,
   'https://konaworld.com/blogs/cog/fresh-looks-for-2025-new-colors-for-konas-alloy-lineup', '2026-08-07'),

  -- Ibis: official support/archive supplies year ranges and frame-level compatibility.
  ('ibis-ripmo-af-v1-udh-2025-global', 'Ibis', 'Ripmo AF V1 UDH', 2025, 'trail_full_suspension', 'global',
   '{"family_level":true,"frame_material":"aluminium","wheel_size":"29","front_travel_mm":160,"rear_travel_mm":147,"shock_size":"210x55 mm","rear_spacing":"148 Boost","seatpost_diameter_mm":31.6,"rear_brake_mount":"160 mm post mount","max_rear_rotor_mm":203,"bottom_bracket":"73 mm BSA threaded","chainline_mm":"52 or 55","udh_compatible":true,"max_tire_width_in":2.5,"max_chainring_teeth":34,"model_year_evidence":"official Ibis support page lists Ripmo AF V1 UDH for 2024-2025"}'::jsonb,
   'https://www.ibiscycles.com/bikes/past-models/ripmo-af-v1-udh', '2026-08-07'),
  ('ibis-ripley-af-v1-udh-2025-global', 'Ibis', 'Ripley AF V1 UDH', 2025, 'xc_trail_full_suspension', 'global',
   '{"family_level":true,"frame_material":"aluminium","wheel_size":"29","front_travel_mm":130,"rear_travel_mm":120,"shock_size":"190x45 mm","rear_spacing":"148 Boost","seatpost_diameter_mm":31.6,"rear_brake_mount":"160 mm post mount","max_rear_rotor_mm":203,"bottom_bracket":"73 mm BSA threaded","chainline_mm":"52 or 55","udh_compatible":true,"max_tire_width_in":2.6,"max_chainring_teeth":34,"coil_shock_compatible":false,"fork_travel_approved_mm":[120,130,140],"model_year_evidence":"official Ibis support page lists Ripley AF V1 UDH for 2024-2025"}'::jsonb,
   'https://www.ibiscycles.com/bikes/past-models/ripley-af-v1-udh', '2026-08-07'),
  ('ibis-oso-2024-global', 'Ibis', 'Oso', 2024, 'electric_enduro', 'global',
   '{"family_level":true,"wheel_size":"29","rear_travel_mm":155,"model_year_evidence":"official Ibis Past Models lists Oso for 2023-2024"}'::jsonb,
   'https://www.ibiscycles.com/bikes/past-models', '2026-08-07'),
  ('ibis-hakka-mx-2024-global', 'Ibis', 'Hakka MX', 2024, 'gravel', 'global',
   '{"family_level":true,"wheel_size":"27.5 / 700C","model_year_evidence":"official Ibis Past Models lists Hakka MX for 2022-2024"}'::jsonb,
   'https://www.ibiscycles.com/bikes/past-models', '2026-08-07'),
  ('ibis-ripley-v4s-2024-global', 'Ibis', 'Ripley V4S', 2024, 'xc_trail_full_suspension', 'global',
   '{"family_level":true,"wheel_size":"29","rear_travel_mm":120,"model_year_evidence":"official Ibis Past Models lists Ripley V4S for 2022-2024"}'::jsonb,
   'https://www.ibiscycles.com/bikes/past-models', '2026-08-07'),
  ('ibis-ripmo-v2s-2024-global', 'Ibis', 'Ripmo V2S', 2024, 'trail_full_suspension', 'global',
   '{"family_level":true,"wheel_size":"29","rear_travel_mm":147,"model_year_evidence":"official Ibis Past Models lists Ripmo V2S for 2022-2024"}'::jsonb,
   'https://www.ibiscycles.com/bikes/past-models', '2026-08-07'),
  ('ibis-exie-usa-2024-global', 'Ibis', 'Exie USA', 2024, 'xc_full_suspension', 'global',
   '{"family_level":true,"wheel_size":"29","rear_travel_mm":100,"model_year_evidence":"official Ibis Past Models lists Exie USA for 2023-2024"}'::jsonb,
   'https://www.ibiscycles.com/bikes/past-models', '2026-08-07'),

  -- Transition: official model-specific support pages include model years and compatibility dimensions.
  ('transition-sentinel-alloy-v3-2025-global', 'Transition', 'Sentinel Alloy V3', 2025, 'trail_full_suspension', 'global',
   '{"family_level":true,"frame_material":"aluminium","wheel_size":"29 / MX (XS 27.5)","front_travel_mm":160,"rear_travel_mm":150,"compatible_rear_travel_mm":160,"shock_size":"205x60 mm trunnion","compatible_shock_size":"205x65 mm trunnion","shock_hardware":"trunnion top / 30x8 mm bottom","fork_offset_mm":44,"bottom_bracket":"73 mm BSA threaded","chainline_mm":"52-55","rear_brake_mount":"180 mm post mount","max_rear_rotor_mm":223,"rear_axle":"12x148 UDH","udh_compatible":true,"max_chainring_teeth":34,"max_tire_size":"29x2.5","model_year_evidence":"official Transition Sentinel V3 support includes 2025 decal/specification and V3 released in 2024"}'::jsonb,
   'https://www.transitionbikes.com/Product-Support-By-Model-Version-Details/Sentinel-Alloy/126', '2026-08-07'),
  ('transition-spur-v1-2025-global', 'Transition', 'Spur V1', 2025, 'xc_trail_full_suspension', 'global',
   '{"family_level":true,"frame_material":"carbon","wheel_size":"29","front_travel_mm":120,"rear_travel_mm":120,"compatible_rear_travel_mm":100,"shock_size":"190x45 mm","compatible_shock_size":"190x37.5 mm","shock_hardware":"30x8 mm top / 25x8 mm bottom","fork_offset_mm":44,"bottom_bracket":"73 mm BSA threaded","chainline_mm":52,"rear_brake_mount":"160 mm post mount","max_rear_rotor_mm":180,"rear_spacing":"148 Boost","max_chainring_teeth":36,"max_tire_size":"29x2.4","model_year_evidence":"official Transition Spur support lists years produced 2020-2025"}'::jsonb,
   'https://www.transitionbikes.com/Product-Support-By-Model-Version-Details/Spur/17', '2026-08-07'),
  ('transition-patrol-carbon-2025-global', 'Transition', 'Patrol Carbon', 2025, 'enduro_full_suspension', 'global',
   '{"family_level":true,"frame_material":"carbon","wheel_size":"29 front / 27.5 rear","front_travel_mm":160,"rear_travel_mm":160,"compatible_front_travel_mm":170,"compatible_rear_travel_mm":170,"shock_size":"205x60 mm trunnion","compatible_shock_size":"205x65 mm trunnion","shock_hardware":"trunnion top / 30x8 mm bottom","fork_offset_mm":44,"bottom_bracket":"73 mm BSA threaded","chainline_mm":52,"rear_brake_mount":"180 mm post mount","max_rear_rotor_mm":223,"rear_axle":"12x148 UDH","udh_compatible":true,"max_chainring_teeth":34,"max_tire_size":"27.5x2.6","model_year_evidence":"official Transition Patrol Carbon support lists years produced 2022-2025 and 2025 graphics"}'::jsonb,
   'https://www.transitionbikes.com/Product-Support-By-Model-Version-Details/Patrol-Carbon/119', '2026-08-07'),
  ('transition-patrol-alloy-2025-global', 'Transition', 'Patrol Alloy', 2025, 'enduro_full_suspension', 'global',
   '{"family_level":true,"frame_material":"aluminium","wheel_size":"mixed","front_travel_mm":160,"rear_travel_mm":160,"model_year_evidence":"official Transition Patrol Alloy support lists years produced 2021-2025"}'::jsonb,
   'https://www.transitionbikes.com/Product-Support-By-Model-Version-Details/Patrol-Alloy/28', '2026-08-07'),
  ('transition-regulator-cx-2025-global', 'Transition', 'Regulator CX', 2025, 'electric_enduro', 'global',
   '{"family_level":true,"frame_material":"carbon","wheel_size":"29 front / 27.5 rear","front_travel_mm":160,"rear_travel_mm":150,"compatible_rear_travel_mm":160,"shock_size":"205x60 mm trunnion","compatible_shock_size":"205x65 mm trunnion","shock_hardware":"trunnion top / 30x8 mm bottom","fork_offset_mm":44,"chainline_mm":55,"rear_brake_mount":"180 mm post mount","max_rear_rotor_mm":223,"rear_axle":"12x148 UDH","udh_compatible":true,"max_chainring_teeth":34,"max_tire_size":"27.5x2.6","motor":"Bosch Performance Line CX BDU384Y","battery":"Bosch PowerTube 600","battery_wh":600,"range_extender":"Bosch PowerMore 250 compatible","model_year_evidence":"official Transition Regulator CX support identifies 2025-2026 and states released in 2025"}'::jsonb,
   'https://www.transitionbikes.com/Product-Support-By-Model-Version-Details/Regulator-CX/128', '2026-08-07'),
  ('transition-relay-alloy-2025-global', 'Transition', 'Relay Alloy', 2025, 'electric_enduro', 'global',
   '{"family_level":true,"frame_material":"aluminium","wheel_size":"29 (XS 27.5)","front_travel_mm":160,"rear_travel_mm":160,"compatible_rear_travel_mm":170,"shock_size":"205x60 mm","compatible_shock_size":"205x65 mm","shock_hardware":"trunnion top / 30x8 mm bottom","fork_offset_mm":44,"model_year_evidence":"official Transition Relay Alloy support lists years produced 2023-2026 and 2025 graphics"}'::jsonb,
   'https://www.transitionbikes.com/Product-Support-By-Model-Version-Details/Relay-Alloy/120', '2026-08-07'),
  ('transition-transam-29-2025-global', 'Transition', 'TransAM 29', 2025, 'trail_hardtail', 'global',
   '{"family_level":true,"wheel_size":"29","model_year_evidence":"official Transition TransAM 29 support lists years produced 2023-2025"}'::jsonb,
   'https://www.transitionbikes.com/Product-Support-By-Model-Version-Details/TransAM-29/32', '2026-08-07')
on conflict (id) do update set
  brand = excluded.brand,
  model = excluded.model,
  model_year = excluded.model_year,
  category = excluded.category,
  market = excluded.market,
  specs = excluded.specs,
  manufacturer_url = excluded.manufacturer_url,
  evidence_checked_at = excluded.evidence_checked_at,
  enabled = true;

-- Verified components needed by the new compatibility graph.
insert into public.garage_components
  (id, brand, model, category, display_name, specs, unlock_level, evidence_url, evidence_checked_at)
values
  ('dvo-jade-x-coil', 'DVO', 'Jade X', 'rear_shock', 'DVO Jade X Coil',
   '{"spring":"coil","product_family":"Jade X"}'::jsonb, 3,
   'https://dvosuspension.com/product/jade-x/', '2026-08-07'),
  ('bosch-performance-line-cx-bdu384y', 'Bosch', 'Performance Line CX BDU384Y', 'motor', 'Bosch Performance Line CX BDU384Y',
   '{"system":"Bosch smart system","model_code":"BDU384Y"}'::jsonb, 3,
   'https://www.bosch-ebike.com/us/products/performance-line-cx', '2026-08-07'),
  ('bosch-powertube-600', 'Bosch', 'PowerTube 600', 'battery', 'Bosch PowerTube 600',
   '{"system":"Bosch smart system","capacity_wh":600,"form_factor":"integrated"}'::jsonb, 3,
   'https://www.bosch-ebike.com/us/products/batteries/powertube-compacttube', '2026-08-07'),
  ('bosch-powermore-250', 'Bosch', 'PowerMore 250', 'range_extender', 'Bosch PowerMore 250',
   '{"system":"Bosch smart system","capacity_wh":250,"product_code":"BBP3625"}'::jsonb, 3,
   'https://www.bosch-ebike.com/us/products/batteries/powermore250', '2026-08-07'),
  ('shimano-sm-ma-f180p-p2', 'Shimano', 'SM-MA-F180P/P2', 'brake_adapter', 'Shimano SM-MA-F180P/P2 brake adapter',
   '{"mount":"post mount","application":"160 mm direct to 180 mm rotor"}'::jsonb, 3,
   'https://productinfo.shimano.com/en/compatibility/C-193', '2026-08-07'),
  ('shimano-sm-ma-f203p-p', 'Shimano', 'SM-MA-F203P/P', 'brake_adapter', 'Shimano SM-MA-F203P/P brake adapter',
   '{"mount":"post mount","application":"160 mm direct to 203 mm rotor"}'::jsonb, 3,
   'https://productinfo.shimano.com/en/compatibility/C-193', '2026-08-07')
on conflict (id) do update set
  brand = excluded.brand,
  model = excluded.model,
  category = excluded.category,
  display_name = excluded.display_name,
  specs = excluded.specs,
  unlock_level = excluded.unlock_level,
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  enabled = true;

-- Bike -> component fitment. Missing rows remain unknown/default-deny.
insert into public.bike_catalog_component_fitments
  (bike_id, component_id, fitment_type, evidence_url, evidence_checked_at, notes)
values
  ('ibis-ripmo-af-v1-udh-2025-global', 'dvo-jade-x-coil', 'manufacturer_approved',
   'https://www.ibiscycles.com/bikes/past-models/ripmo-af-v1-udh', '2026-08-07',
   'Ibis explicitly states that it specs and recommends the DVO Jade X Coil for Ripmo AF V1 UDH.'),
  ('ibis-ripmo-af-v1-udh-2025-global', 'shimano-sm-ma-f180p-p2', 'manufacturer_approved',
   'https://www.ibiscycles.com/bikes/past-models/ripmo-af-v1-udh', '2026-08-07',
   'Ibis explicitly provides Shimano SM-MA-F180P/P2 for a 180 mm rear rotor on the 160 mm post mount.'),
  ('ibis-ripmo-af-v1-udh-2025-global', 'shimano-sm-ma-f203p-p', 'manufacturer_approved',
   'https://www.ibiscycles.com/bikes/past-models/ripmo-af-v1-udh', '2026-08-07',
   'Ibis explicitly provides Shimano SM-MA-F203P/P for a 203 mm rear rotor on the 160 mm post mount.'),
  ('ibis-ripley-af-v1-udh-2025-global', 'shimano-sm-ma-f180p-p2', 'manufacturer_approved',
   'https://www.ibiscycles.com/bikes/past-models/ripley-af-v1-udh', '2026-08-07',
   'Ibis explicitly provides Shimano SM-MA-F180P/P2 for a 180 mm rear rotor.'),
  ('ibis-ripley-af-v1-udh-2025-global', 'shimano-sm-ma-f203p-p', 'manufacturer_approved',
   'https://www.ibiscycles.com/bikes/past-models/ripley-af-v1-udh', '2026-08-07',
   'Ibis explicitly provides Shimano SM-MA-F203P/P for a 203 mm rear rotor.'),
  ('transition-regulator-cx-2025-global', 'bosch-performance-line-cx-bdu384y', 'factory_installed',
   'https://www.transitionbikes.com/Product-Support-By-Model-Version-Details/Regulator-CX/128', '2026-08-07',
   'Transition explicitly lists Bosch Performance Line CX BDU38/BDU384Y as the drive unit.'),
  ('transition-regulator-cx-2025-global', 'bosch-powertube-600', 'factory_installed',
   'https://www.transitionbikes.com/Product-Support-By-Model-Version-Details/Regulator-CX/128', '2026-08-07',
   'Transition explicitly lists Bosch PowerTube 600 Wh as the battery.'),
  ('transition-regulator-cx-2025-global', 'bosch-powermore-250', 'manufacturer_approved',
   'https://www.transitionbikes.com/Product-Support-By-Model-Version-Details/Regulator-CX/128', '2026-08-07',
   'Transition explicitly marks the Bosch PowerMore 250 Wh range extender as compatible.')
on conflict (bike_id, component_id, fitment_type) do update set
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  notes = excluded.notes;

-- Component -> component compatibility, kept separate from bike fitment.
insert into public.garage_compatibility
  (source_component_id, target_component_id, status, rule_summary, evidence_url, evidence_checked_at)
values
  ('bosch-powertube-600', 'bosch-powermore-250', 'compatible',
   'Bosch states PowerMore 250 can be combined with smart-system batteries; final bike-level approval is still required.',
   'https://www.bosch-ebike.com/us/service/accessories-retrofitting', '2026-08-07')
on conflict (source_component_id, target_component_id) do update set
  status = excluded.status,
  rule_summary = excluded.rule_summary,
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at;
