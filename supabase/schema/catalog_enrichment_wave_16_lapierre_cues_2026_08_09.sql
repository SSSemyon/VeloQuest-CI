begin;

insert into public.garage_components
  (id, brand, model, category, display_name, specs, unlock_level, evidence_url, evidence_checked_at, enabled)
values
  (
    'shimano-rd-u3020-9', 'Shimano', 'RD-U3020-9', 'rear_derailleur', 'CUES RD-U3020 9-speed',
    '{"speeds":9,"system":"CUES LINKGLIDE","drivetrain":"2x9","largest_sprocket_t":36}'::jsonb,
    1, 'https://productinfo.shimano.com/en/lineup/cues-u4000-2x9', '2026-08-09', true
  ),
  (
    'shimano-cs-lg300-9', 'Shimano', 'CS-LG300-9', 'cassette', 'LINKGLIDE CS-LG300-9',
    '{"speeds":9,"system":"LINKGLIDE","compatible_chain":"LINKGLIDE / HG 11-speed","factory_fitment_range":"11-36T"}'::jsonb,
    1, 'https://bike.shimano.com/en-SG/products/components/pdp.P-CS-LG300-9.html', '2026-08-09', true
  ),
  (
    'kmc-eglide-ept-9-11', 'KMC', 'eGlide EPT 9-11s', 'chain', 'KMC eGlide EPT 9-11s',
    '{"speeds":[9,10,11],"coating":"EPT","e_bike_compatible":true}'::jsonb,
    1, 'https://lapierrebikes.com/en-int/products/e-explorer-55-llbub', '2026-08-09', true
  ),
  (
    'tektro-hd-m280', 'Tektro', 'HD-M280', 'brake_caliper', 'Tektro HD-M280',
    '{"brake_type":"hydraulic_disc","pistons":2,"factory_rotor_mm":203}'::jsonb,
    1, 'https://lapierrebikes.com/en-int/products/e-explorer-55-llbub', '2026-08-09', true
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
    'shimano-rd-u3020-9', 'shimano-cs-lg300-9', 'compatible',
    'Shimano CUES 2x9 lineup pairs RD-U3020 with CS-LG300-9; the compatibility chart limits this derailleur to the 11-36T cassette variant.',
    'https://productinfo.shimano.com/en/lineup/cues-u4000-2x9', '2026-08-09'
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
    'lapierre-e-explorer-5-5-low-2026-global', 'shimano-rd-u3020-9', 'factory_installed',
    'https://lapierrebikes.com/en-int/products/e-explorer-55-llbub', '2026-08-09',
    'Official exact Lapierre specification lists Shimano CUES RD-U3020-9.'
  ),
  (
    'lapierre-e-explorer-5-5-low-2026-global', 'shimano-cs-lg300-9', 'factory_installed',
    'https://lapierrebikes.com/en-int/products/e-explorer-55-llbub', '2026-08-09',
    'Official exact Lapierre specification lists Shimano CUES CS-LG300-9.'
  ),
  (
    'lapierre-e-explorer-5-5-low-2026-global', 'kmc-eglide-ept-9-11', 'factory_installed',
    'https://lapierrebikes.com/en-int/products/e-explorer-55-llbub', '2026-08-09',
    'Official exact Lapierre specification lists KMC eGlide EPT 9-11s.'
  ),
  (
    'lapierre-e-explorer-5-5-low-2026-global', 'tektro-hd-m280', 'factory_installed',
    'https://lapierrebikes.com/en-int/products/e-explorer-55-llbub', '2026-08-09',
    'Official exact Lapierre specification lists Tektro HD-M280 front and rear brakes.'
  ),
  (
    'lapierre-e-explorer-6-5-low-2026-global', 'shimano-rd-u3020-9', 'factory_installed',
    'https://lapierrebikes.com/en-int/products/e-explorer-65-llcub', '2026-08-09',
    'Official exact Lapierre specification lists Shimano CUES RD-U3020-9.'
  ),
  (
    'lapierre-e-explorer-6-5-low-2026-global', 'shimano-cs-lg300-9', 'factory_installed',
    'https://lapierrebikes.com/en-int/products/e-explorer-65-llcub', '2026-08-09',
    'Official exact Lapierre specification lists Shimano CUES CS-LG300-9.'
  ),
  (
    'lapierre-e-explorer-6-5-low-2026-global', 'kmc-eglide-ept-9-11', 'factory_installed',
    'https://lapierrebikes.com/en-int/products/e-explorer-65-llcub', '2026-08-09',
    'Official exact Lapierre specification lists KMC eGlide EPT 9-11s.'
  ),
  (
    'lapierre-e-explorer-6-5-low-2026-global', 'tektro-hd-m280', 'factory_installed',
    'https://lapierrebikes.com/en-int/products/e-explorer-65-llcub', '2026-08-09',
    'Official exact Lapierre specification lists Tektro HD-M280 front and rear brakes.'
  )
on conflict (bike_id, component_id, fitment_type) do update set
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  notes = excluded.notes;

commit;
