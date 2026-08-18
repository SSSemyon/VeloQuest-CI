-- VeloQuest catalog enrichment wave 10 (prepared while live SQL endpoint was unavailable).
-- Exact BMC 2024 archive product pages only. No wheel diameter or media URL is inferred.

update public.bike_catalog_models
set specs = specs || '{"frame_material":"01 Premium Carbon","frame":"Speedmachine 01 Premium Carbon; 142x12 mm thru-axle","fork":"Speedmachine 01 Premium Carbon; 100x12 mm thru-axle","drivetrain_brand":"SRAM","drivetrain":"SRAM Red AXS 2x12","rear_derailleur":"SRAM Red AXS","front_derailleur":"SRAM RED eTap AXS","cassette":"SRAM Red XG-1290 10-33T","crankset":"SRAM Red AXS 48/35T with power meter","bottom_bracket":"T47","brake_type":"hydraulic_disc","brakes":"SRAM S-900 Aero HRD DB-S-900-A1; Centerline XR Centerlock 160/160 mm","rims":"Zipp 858 NSW Tubeless Disc","hubs":"Zipp Cognition V2; Axial Clutch V2","tires":"Pirelli P-Zero Race SL TLR 28 mm","rear_axle":"142x12 mm thru-axle","front_axle":"100x12 mm thru-axle","max_tire_clearance_mm":30,"weight_kg":8.9,"spec_evidence":"official BMC 2024 Speedmachine 01 LTD archive technical overview"}'::jsonb,
    manufacturer_url = 'https://us.bmc-switzerland.com/collections/bike-archive/products/speedmachine-01-ltd-bikes-bmc-24-10627-001',
    evidence_checked_at = '2026-08-07'
where id = 'bmc-speedmachine-01-ltd-2024-us';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"01 Premium Carbon","frame":"Speedmachine 01 Premium Carbon; 142x12 mm thru-axle","fork":"Speedmachine 01 Premium Carbon; 100x12 mm thru-axle","drivetrain_brand":"SRAM","drivetrain":"SRAM Red AXS 2x12","rear_derailleur":"SRAM Red AXS","front_derailleur":"SRAM RED AXS","cassette":"SRAM Red XG-1290 10-33T","crankset":"SRAM Red AXS 48/35T with power meter","bottom_bracket":"T47","brake_type":"hydraulic_disc","brakes":"SRAM Red AXS ED-RED-E1; Paceline X Centerlock 160/160 mm","rims":"Zipp 858 NSW Tubeless Disc","hubs":"Zipp Cognition V2; Axial Clutch V2","tires":"Pirelli P-Zero Race SL TLR 28 mm","rear_axle":"142x12 mm thru-axle","front_axle":"100x12 mm thru-axle","max_tire_clearance_mm":30,"weight_kg":8.9,"spec_evidence":"official BMC 2024 Speedmachine 01 ONE archive technical overview"}'::jsonb,
    manufacturer_url = 'https://us.bmc-switzerland.com/collections/bike-archive/products/speedmachine-01-one-bikes-bmc-24-10627-004',
    evidence_checked_at = '2026-08-07'
where id = 'bmc-speedmachine-01-one-2024-us';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"01 Premium Carbon","frame":"Teammachine R 01 Premium Carbon; 12x142 mm thru-axle","fork":"Teammachine R 01 Premium Carbon; 12x100 mm thru-axle","drivetrain_brand":"SRAM","drivetrain":"SRAM Red AXS 2x12","rear_derailleur":"SRAM Red AXS","front_derailleur":"SRAM RED AXS","cassette":"SRAM Red XG-1290 10-30T","crankset":"SRAM Red AXS 48/35T with power meter","bottom_bracket":"PF86","brake_type":"hydraulic_disc","brakes":"SRAM Red AXS ED-RED-E1; Paceline X Centerlock 160/160 mm","rims":"DT Swiss ARC 1100 62 mm","hubs":"DT Swiss 180 Straightpull; Ratchet EXP 36; SINC ceramic bearings","tires":"Pirelli P-Zero Race SL TLR 26 mm","rear_axle":"12x142 mm thru-axle","front_axle":"12x100 mm thru-axle","max_tire_clearance_mm":30,"weight_kg":7.0,"spec_evidence":"official BMC 2024 Teammachine R 01 ONE archive technical overview"}'::jsonb,
    manufacturer_url = 'https://us.bmc-switzerland.com/collections/bike-archive/products/teammachine-r-01-one-bikes-bmc-24-10628-005',
    evidence_checked_at = '2026-08-07'
where id = 'bmc-teammachine-r-01-one-2024-us';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"carbon","frame":"Fourstroke LT Carbon; APS suspension; 120 mm travel; 12x148 Boost thru-axle","front_travel_mm":120,"rear_travel_mm":120,"suspension_brand":"FOX","fork":"FOX Float 34 SC Factory FIT4 Kashima 120 mm","rear_shock":"FOX Float DPS Factory Kashima EVOL LV","drivetrain_brand":"SRAM","drivetrain":"SRAM X0 Eagle Transmission 1x12","rear_derailleur":"SRAM X0 Eagle Transmission","cassette":"SRAM X0 Eagle Transmission XS-1295 10-52T","crankset":"SRAM X0 Eagle 32T","bottom_bracket":"PF92","brake_type":"hydraulic_disc","brakes":"SRAM G2 Ultimate; HS2 180/180 mm rotors","wheelset":"DT Swiss XRC 1501 30 mm internal","hubs":"DT Swiss 240 Straightpull; Ratchet EXP 36","tires":"Maxxis Rekon 2.4 in EXO TR","rear_axle":"12x148 Boost thru-axle","max_tire_clearance_mm":62,"weight_kg":11.6,"spec_evidence":"official BMC 2024 Fourstroke LT LTD archive technical overview"}'::jsonb,
    manufacturer_url = 'https://us.bmc-switzerland.com/collections/bike-archive/products/fourstroke-lt-ltd-bikes-bmc-24-10517-002',
    evidence_checked_at = '2026-08-07'
where id = 'bmc-fourstroke-lt-ltd-2024-global';

insert into public.bike_catalog_component_fitments
  (bike_id, component_id, fitment_type, evidence_url, evidence_checked_at, notes)
values
  ('bmc-fourstroke-lt-ltd-2024-global', 'sram-rd-x0-e-b1', 'factory_installed',
   'https://us.bmc-switzerland.com/collections/bike-archive/products/fourstroke-lt-ltd-bikes-bmc-24-10517-002', '2026-08-07',
   'BMC explicitly lists SRAM X0 Eagle Transmission rear derailleur.'),
  ('bmc-fourstroke-lt-ltd-2024-global', 'sram-cs-xs-1295-a1', 'factory_installed',
   'https://us.bmc-switzerland.com/collections/bike-archive/products/fourstroke-lt-ltd-bikes-bmc-24-10517-002', '2026-08-07',
   'BMC explicitly lists SRAM X0 Eagle Transmission XS-1295 cassette, 10-52T.')
on conflict (bike_id, component_id, fitment_type) do update set
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  notes = excluded.notes;
