begin;

insert into public.garage_components
  (id, brand, model, category, display_name, specs, unlock_level, evidence_url, evidence_checked_at, enabled)
values
  (
    'shimano-rd-u6020-10', 'Shimano', 'RD-U6020-10', 'rear_derailleur', 'CUES RD-U6020-10',
    '{"speeds":10,"system":"CUES LINKGLIDE","drivetrain":"2x10","total_capacity_t":44,"largest_sprocket_t":39}'::jsonb,
    1, 'https://productinfo.shimano.com/en/product/RD-U6020-10', '2026-08-09', true
  ),
  (
    'shimano-cs-lg300-10', 'Shimano', 'CS-LG300-10', 'cassette', 'CUES CS-LG300-10 11-39T',
    '{"speeds":10,"system":"LINKGLIDE","range":"11-39T","compatible_chain":"LINKGLIDE / HG 11-speed"}'::jsonb,
    1, 'https://productinfo.shimano.com/en/product/CS-LG300-10', '2026-08-09', true
  ),
  (
    'shimano-cn-lg500', 'Shimano', 'CN-LG500', 'chain', 'LINKGLIDE CN-LG500',
    '{"system":"LINKGLIDE","speeds":[9,10,11],"e_bike_compatible":true}'::jsonb,
    1, 'https://productinfo.shimano.com/en/product/CN-LG500', '2026-08-09', true
  ),
  (
    'shimano-br-u6030-r', 'Shimano', 'BR-U6030-R', 'brake_caliper', 'CUES BR-U6030-R',
    '{"brake_type":"hydraulic_disc","position":"rear","series":"CUES","hose":"SM-BH59-JK-SSR"}'::jsonb,
    1, 'https://productinfo.shimano.com/en/product/BR-U6030-R', '2026-08-09', true
  )
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

insert into public.garage_compatibility
  (source_component_id, target_component_id, status, rule_summary, evidence_url, evidence_checked_at)
values
  (
    'shimano-rd-u6020-10', 'shimano-cs-lg300-10', 'compatible',
    'Shimano CUES 2x10 compatibility lists RD-U6020-10 with CS-LG300-10 11-39T.',
    'https://productinfo.shimano.com/en/compatibility/C-454', '2026-08-09'
  ),
  (
    'shimano-cs-lg300-10', 'shimano-cn-lg500', 'compatible',
    'Shimano CUES 2x10 compatibility lists CS-LG300-10 with CN-LG500.',
    'https://productinfo.shimano.com/en/compatibility/C-454', '2026-08-09'
  )
on conflict (source_component_id, target_component_id) do update set
  status = excluded.status,
  rule_summary = excluded.rule_summary,
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at;

insert into public.bike_catalog_component_fitments
  (bike_id, component_id, fitment_type, evidence_url, evidence_checked_at, notes)
values
  (
    'corratec-allroad-travel-eq-2026-global', 'shimano-rd-u6020-10', 'factory_installed',
    'https://www.corratec.com/en/Bike-Archive/Allroad-Travel-EQ-Bronze-Dark-Bronze-46.html', '2026-08-09',
    'Official Corratec exact build lists Shimano RD-U6020 CUES 10-speed.'
  ),
  (
    'corratec-allroad-travel-eq-2026-global', 'shimano-cs-lg300-10', 'factory_installed',
    'https://www.corratec.com/en/Bike-Archive/Allroad-Travel-EQ-Bronze-Dark-Bronze-46.html', '2026-08-09',
    'Official Corratec exact build lists Shimano CS-LG300-10 11-39T.'
  ),
  (
    'corratec-allroad-travel-eq-2026-global', 'shimano-cn-lg500', 'factory_installed',
    'https://www.corratec.com/en/Bike-Archive/Allroad-Travel-EQ-Bronze-Dark-Bronze-46.html', '2026-08-09',
    'Official Corratec exact build lists Shimano CN-LG500.'
  ),
  (
    'corratec-allroad-travel-eq-2026-global', 'shimano-br-u6030-r', 'factory_installed',
    'https://www.corratec.com/en/Bike-Archive/Allroad-Travel-EQ-Bronze-Dark-Bronze-46.html', '2026-08-09',
    'Official Corratec exact build lists rear Shimano BR-U6030 hydraulic brake.'
  ),
  (
    'corratec-revo-bow-ilink-sl-pro-2026-global', 'sram-rd-x0-e-b1', 'factory_installed',
    'https://www.corratec.com/en/Bike-Archive/Revo-Bow-iLink-SL-Pro-Grey-Black-Light-Grey-M.html', '2026-08-09',
    'Official Corratec exact build lists SRAM X0 Eagle AXS T-Type rear shifting.'
  ),
  (
    'corratec-revo-bow-ilink-sl-pro-2026-global', 'sram-cs-xs-1275-a1', 'factory_installed',
    'https://www.corratec.com/en/Bike-Archive/Revo-Bow-iLink-SL-Pro-Grey-Black-Light-Grey-M.html', '2026-08-09',
    'Official Corratec exact build lists SRAM XS-1275 T-Type 10-52T cassette.'
  )
on conflict (bike_id, component_id, fitment_type) do update set
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  notes = excluded.notes;

commit;
