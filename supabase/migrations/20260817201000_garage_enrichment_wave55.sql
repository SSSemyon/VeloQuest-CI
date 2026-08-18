-- VeloQuest Garage enrichment wave 55.
-- Russia-first Shimano canonicalization and evidence-backed recommendation outcomes.
-- Primary source of truth: current Shimano ProductInfo specifications checked 2026-08-17.
-- Rules are CONDITIONAL whenever the complete shifter/chain/freehub system is not
-- proven for the bike. `no_upgrade` is used only when an exact OEM cassette is
-- already at the rear-derailleur / Shimano-cassette published range ceiling.
-- Known RD-U6020-10 OEM conflicts are intentionally NOT canonicalized here.

begin;

insert into public.garage_components
  (id, brand, model, category, display_name, specs, unlock_level, evidence_url, evidence_checked_at, enabled)
values
  ('shimano-rd-u6000-10-context', 'Shimano', 'RD-U6000 10-speed configuration', 'rear_derailleur', 'Shimano CUES RD-U6000 · 10-speed',
   '{"speeds":10,"family":"CUES","chain":"LINKGLIDE / HG 11-speed","low_sprocket_published_range":"48-50T","configuration_scope":"bike exact-product evidence fixes this alias to 10-speed"}'::jsonb,
   1, 'https://productinfo.shimano.com/en/product/RD-U6000', '2026-08-17', true),
  ('shimano-rd-u6000-11-context', 'Shimano', 'RD-U6000 11-speed configuration', 'rear_derailleur', 'Shimano CUES RD-U6000 · 11-speed',
   '{"speeds":11,"family":"CUES","chain":"LINKGLIDE / HG 11-speed","low_sprocket_published_range":"48-50T","configuration_scope":"bike exact-product evidence fixes this alias to 11-speed"}'::jsonb,
   1, 'https://productinfo.shimano.com/en/product/RD-U6000', '2026-08-17', true),
  ('shimano-rd-u4000-9', 'Shimano', 'RD-U4000', 'rear_derailleur', 'Shimano CUES RD-U4000 · 9-speed',
   '{"speeds":9,"family":"CUES","chain":"LINKGLIDE / HG 11-speed","low_sprocket":"41-46T"}'::jsonb,
   1, 'https://productinfo.shimano.com/en/spec/lifestyle-active-rear-derailleur', '2026-08-17', true),
  ('shimano-rd-u3020-9', 'Shimano', 'RD-U3020', 'rear_derailleur', 'Shimano CUES RD-U3020 · 9-speed',
   '{"speeds":9,"family":"CUES","chain":"LINKGLIDE / HG 11-speed","low_sprocket":"36T"}'::jsonb,
   1, 'https://productinfo.shimano.com/en/product/RD-U3020', '2026-08-17', true),
  ('shimano-rd-u2000-8', 'Shimano', 'RD-U2000', 'rear_derailleur', 'Shimano ESSA RD-U2000 · 8-speed',
   '{"speeds":8,"family":"ESSA","chain":"HG 8/7/6-speed","low_sprocket":"45T"}'::jsonb,
   1, 'https://productinfo.shimano.com/en/product/RD-U2000', '2026-08-17', true),
  ('shimano-rd-m3100-sgs', 'Shimano', 'RD-M3100-SGS', 'rear_derailleur', 'Shimano Alivio RD-M3100-SGS · 9-speed',
   '{"speeds":9,"family":"Alivio","chain":"HG 9-speed","low_sprocket":"32-36T"}'::jsonb,
   1, 'https://productinfo.shimano.com/en/product/RD-M3100-SGS', '2026-08-17', true),
  ('shimano-rd-m3020-8', 'Shimano', 'RD-M3020-8', 'rear_derailleur', 'Shimano Acera RD-M3020-8 · 8/7-speed',
   '{"speeds":"8/7","family":"Acera","chain":"HG 8/7/6-speed","low_sprocket":"30-40T"}'::jsonb,
   1, 'https://productinfo.shimano.com/en/product/RD-M3020-8', '2026-08-17', true),

  ('shimano-cs-lg300-10-11-48', 'Shimano', 'CS-LG300-10 11-48T', 'cassette', 'Shimano CS-LG300-10 · 11-48T',
   '{"speeds":10,"range":"11-48T","type":"LINKGLIDE","chain":"LINKGLIDE / HG 11-speed","freehub":"HG spline M; follow compatibility chart"}'::jsonb,
   3, 'https://productinfo.shimano.com/en/spec/lifestyle-active-cassette', '2026-08-17', true),
  ('shimano-cs-lg400-10-11-43', 'Shimano', 'CS-LG400-10 11-43T', 'cassette', 'Shimano CS-LG400-10 · 11-43T',
   '{"speeds":10,"range":"11-43T","type":"LINKGLIDE","chain":"LINKGLIDE / HG 11-speed","freehub":"HG spline M; follow compatibility chart"}'::jsonb,
   3, 'https://productinfo.shimano.com/en/spec/lifestyle-active-cassette', '2026-08-17', true),
  ('shimano-cs-lg400-11-11-45', 'Shimano', 'CS-LG400-11 11-45T', 'cassette', 'Shimano CS-LG400-11 · 11-45T',
   '{"speeds":11,"range":"11-45T","type":"LINKGLIDE","chain":"LINKGLIDE / HG 11-speed","freehub":"HG spline M; follow compatibility chart"}'::jsonb,
   3, 'https://productinfo.shimano.com/en/spec/lifestyle-active-cassette', '2026-08-17', true),
  ('shimano-cs-lg400-11-11-50', 'Shimano', 'CS-LG400-11 11-50T', 'cassette', 'Shimano CS-LG400-11 · 11-50T',
   '{"speeds":11,"range":"11-50T","type":"LINKGLIDE","chain":"LINKGLIDE / HG 11-speed","freehub":"HG spline M; follow compatibility chart"}'::jsonb,
   3, 'https://productinfo.shimano.com/en/spec/lifestyle-active-cassette', '2026-08-17', true),
  ('shimano-cs-lg300-9-11-41', 'Shimano', 'CS-LG300-9 11-41T', 'cassette', 'Shimano CS-LG300-9 · 11-41T',
   '{"speeds":9,"range":"11-41T","type":"LINKGLIDE","chain":"LINKGLIDE / HG 11-speed","freehub":"HG spline M; follow compatibility chart"}'::jsonb,
   3, 'https://productinfo.shimano.com/en/product/CS-LG300-9', '2026-08-17', true),
  ('shimano-cs-lg300-9-11-46', 'Shimano', 'CS-LG300-9 11-46T', 'cassette', 'Shimano CS-LG300-9 · 11-46T',
   '{"speeds":9,"range":"11-46T","type":"LINKGLIDE","chain":"LINKGLIDE / HG 11-speed","freehub":"HG spline M; follow compatibility chart"}'::jsonb,
   3, 'https://productinfo.shimano.com/en/product/CS-LG300-9', '2026-08-17', true),
  ('shimano-cs-lg300-9-11-36', 'Shimano', 'CS-LG300-9 11-36T', 'cassette', 'Shimano CS-LG300-9 · 11-36T',
   '{"speeds":9,"range":"11-36T","type":"LINKGLIDE","chain":"LINKGLIDE / HG 11-speed","freehub":"HG spline M; follow compatibility chart"}'::jsonb,
   3, 'https://productinfo.shimano.com/en/product/CS-LG300-9', '2026-08-17', true),
  ('shimano-cs-hg400-8-11-45', 'Shimano', 'CS-HG400-8 11-45T', 'cassette', 'Shimano CS-HG400-8 · 11-45T',
   '{"speeds":8,"range":"11-45T","type":"HG","chain":"HG 8/7/6-speed","freehub":"HG spline M"}'::jsonb,
   3, 'https://productinfo.shimano.com/en/product/CS-HG400-8', '2026-08-17', true),
  ('shimano-cs-hg400-8-11-40', 'Shimano', 'CS-HG400-8 11-40T', 'cassette', 'Shimano CS-HG400-8 · 11-40T',
   '{"speeds":8,"range":"11-40T","type":"HG","chain":"HG 8/7/6-speed","freehub":"HG spline M"}'::jsonb,
   3, 'https://productinfo.shimano.com/en/product/CS-HG400-8', '2026-08-17', true)
on conflict (id) do update set
  brand=excluded.brand, model=excluded.model, category=excluded.category,
  display_name=excluded.display_name, specs=excluded.specs, unlock_level=excluded.unlock_level,
  evidence_url=excluded.evidence_url, evidence_checked_at=excluded.evidence_checked_at, enabled=true;

insert into public.garage_compatibility
  (source_component_id, target_component_id, status, rule_summary, evidence_url, evidence_checked_at, evidence_notes)
values
  ('shimano-rd-u6000-10-context','shimano-cs-lg300-10-11-48','conditional',
   'RD-U6000 in a proven 10-speed bike configuration can use the Shimano 10-speed LINKGLIDE 11-48T cassette only when the complete shifter, LINKGLIDE/HG 11-speed chain, and HG-spline freehub requirements are satisfied.',
   'https://productinfo.shimano.com/en/spec/lifestyle-active-cassette','2026-08-17','RD-U6000 supports 10/11 speeds; current Shimano cassette spec lists 10-speed LINKGLIDE up to 11-48T. Freehub and system-level compatibility must still be verified.'),
  ('shimano-rd-u6000-10-context','shimano-cs-lg400-10-11-43','conditional',
   'RD-U6000 in a proven 10-speed bike configuration can use Shimano CS-LG400-10 11-43T only when the complete 10-speed LINKGLIDE system and HG-spline freehub requirements are satisfied.',
   'https://productinfo.shimano.com/en/spec/lifestyle-active-cassette','2026-08-17','Conditional rather than compatible because the bike-level shifter, chain, and freehub combination is not universally proven.'),
  ('shimano-rd-u6000-11-context','shimano-cs-lg400-11-11-45','conditional',
   'RD-U6000 in a proven 11-speed configuration can use CS-LG400-11 11-45T only when the complete LINKGLIDE/HG 11-speed chain and HG-spline freehub requirements are satisfied.',
   'https://productinfo.shimano.com/en/spec/lifestyle-active-cassette','2026-08-17','Conditional system-level verdict; exact bike freehub and shifter remain mandatory checks.'),
  ('shimano-rd-u6000-11-context','shimano-cs-lg400-11-11-50','conditional',
   'RD-U6000 in a proven 11-speed configuration can use CS-LG400-11 11-50T only when the complete LINKGLIDE/HG 11-speed chain and HG-spline freehub requirements are satisfied.',
   'https://productinfo.shimano.com/en/spec/lifestyle-active-cassette','2026-08-17','Shimano lists CS-LG400-11 in 11-45T and 11-50T; bike-level freehub/shifter proof is still required.'),
  ('shimano-rd-u4000-9','shimano-cs-lg300-9-11-41','conditional',
   'RD-U4000 9-speed supports the Shimano 11-41T range only with the required LINKGLIDE/HG 11-speed chain and compatible HG-spline freehub.',
   'https://productinfo.shimano.com/en/product/CS-LG300-9','2026-08-17','RD-U4000 is a 9-speed CUES derailleur with published low-sprocket range through 46T; system requirements still apply.'),
  ('shimano-rd-u4000-9','shimano-cs-lg300-9-11-46','conditional',
   'RD-U4000 9-speed supports the Shimano 11-46T range only with the required LINKGLIDE/HG 11-speed chain and compatible HG-spline freehub.',
   'https://productinfo.shimano.com/en/product/CS-LG300-9','2026-08-17','11-46T is the largest CS-LG300-9 range listed by Shimano; bike-level system proof remains required.'),
  ('shimano-rd-u3020-9','shimano-cs-lg300-9-11-36','conditional',
   'RD-U3020 requires a 36T low sprocket in Shimano current ProductInfo; CS-LG300-9 11-36T remains conditional on the complete LINKGLIDE chain/shifter/freehub system.',
   'https://productinfo.shimano.com/en/product/RD-U3020','2026-08-17','RD-U3020 publishes max and min low sprocket as 36T.'),
  ('shimano-rd-u2000-8','shimano-cs-hg400-8-11-45','conditional',
   'ESSA RD-U2000 requires a 45T low sprocket; CS-HG400-8 11-45T is conditional on the complete 8-speed HG chain/shifter and HG-spline freehub system.',
   'https://productinfo.shimano.com/en/product/RD-U2000','2026-08-17','RD-U2000 publishes max and min low sprocket as 45T and HG 8/7/6-speed chain compatibility.'),
  ('shimano-rd-m3020-8','shimano-cs-hg400-8-11-40','conditional',
   'Acera RD-M3020-8 supports up to a 40T low sprocket; CS-HG400-8 11-40T is conditional on the complete HG 8-speed drivetrain and freehub configuration.',
   'https://productinfo.shimano.com/en/product/RD-M3020-8','2026-08-17','RD-M3020-8 publishes a 40T maximum low sprocket and HG 8/7/6-speed chain compatibility.'),
  ('shimano-rd-m6100-sgs','shimano-cs-m6100-12','conditional',
   'DEORE RD-M6100-SGS and CS-M6100-12 10-51T require a complete Shimano 12-speed HG system and MICRO SPLINE freehub; cassette replacement is not universally compatible at bike level.',
   'https://productinfo.shimano.com/en/product/CS-M6100-12','2026-08-17','Safety hardening: overrides the earlier component-only compatible verdict to conditional because CS-M6100-12 requires MICRO SPLINE and HG 12-speed system compatibility.')
on conflict (source_component_id,target_component_id) do update set
  status=excluded.status, rule_summary=excluded.rule_summary, evidence_url=excluded.evidence_url,
  evidence_checked_at=excluded.evidence_checked_at, evidence_notes=excluded.evidence_notes;

insert into public.garage_component_aliases
(alias_component_id, canonical_component_id, evidence_url, evidence_checked_at, notes)
values
-- CUES RD-U6000, exact bike configuration proves 10-speed.
('oem-hagen-3-10-2026-rd','shimano-rd-u6000-10-context','https://hagen.bike/mtbthreeten2026','2026-08-17','Hagen exact page states RD-U6000 CUES 10 and 1x10 shifter.'),
('oem-hagen-4-10-2026-rd','shimano-rd-u6000-10-context','https://hagen.bike/mtbfourten2026','2026-08-17','Hagen exact page states RD-U6000 CUES 10.'),
('oem-hagen-5-10-2026-rd','shimano-rd-u6000-10-context','https://hagen.bike/mtbfivetencopper2026','2026-08-17','Hagen exact page states RD-U6000 CUES 10.'),
('oem-hagen-gr10-2026-rd','shimano-rd-u6000-10-context','https://hagen.bike/gr10_2026','2026-08-17','Hagen exact page states RD-U6000 with CUES 1x10 drop-bar controls.'),
('oem-hagen-hg10-2026-rd','shimano-rd-u6000-10-context','https://hagen.bike/hg10_2026','2026-08-17','Hagen exact page states RD-U6000 CUES 10.'),
('oem-hagen-q10-2026-rd','shimano-rd-u6000-10-context','https://hagen.bike/q10blackgem2026','2026-08-17','Hagen exact page states RD-U6000 CUES 10.'),
('oem-format-1313-29-2026-ru-rd','shimano-rd-u6000-10-context','https://www.format.bike/bike/1313-29-2/','2026-08-17','FORMAT exact page pairs CUES U6000 with a 10-speed LG400-10 cassette.'),
('oem-format-1412-29-2026-ru-rd','shimano-rd-u6000-10-context','https://www.format.bike/bike/1412-29-2/','2026-08-17','FORMAT exact page pairs CUES U6000 with a 10-speed LG400-10 cassette.'),
('oem-format-1212-29-2026-ru-rd','shimano-rd-u6000-10-context','https://www.format.bike/bike/1212-29/','2026-08-17','FORMAT exact page pairs CUES U6000 with a 10-speed LG400-10 cassette.'),
('oem-format-1213-29-2025-ru-rd','shimano-rd-u6000-10-context','https://www.format.bike/bike/1213-29/','2026-08-17','FORMAT exact page pairs CUES U6000 with a 10-speed LG400-10 cassette.'),
('oem-stinger-graphite-pro-29-2025-rd','shimano-rd-u6000-10-context','https://stingerbike.ru/catalog/velosipedy/gornye-velosipedy/gornyy-velosiped-graphite-pro-29-2025/','2026-08-17','Stinger exact product specification identifies CUES U6000 in a 1x10 drivetrain.'),
-- CUES RD-U6000, exact bike configuration proves 11-speed.
('oem-hagen-3-11-2026-rd','shimano-rd-u6000-11-context','https://hagen.bike/mtbthreeeleven2026','2026-08-17','Hagen exact page states RD-U6000 CUES 11.'),
('oem-hagen-4-11-2026-rd','shimano-rd-u6000-11-context','https://hagen.bike/mtbfoureleven2026','2026-08-17','Hagen exact page states RD-U6000 CUES 11.'),
('oem-hagen-5-11-2026-rd','shimano-rd-u6000-11-context','https://hagen.bike/mtbfiveelevenmetalcore2026','2026-08-17','Hagen exact page states RD-U6000 CUES 11.'),
('oem-hagen-gr11-2026-rd','shimano-rd-u6000-11-context','https://hagen.bike/gr11_2026','2026-08-17','Hagen exact page states RD-U6000 with CUES 1x11 drop-bar controls.'),
('oem-hagen-gr11-air-2026-rd','shimano-rd-u6000-11-context','https://hagen.bike/gr11air_2026','2026-08-17','Hagen exact page states RD-U6000 CUES 11.'),
('oem-format-2322-700c-2026-ru-rd','shimano-rd-u6000-11-context','https://www.format.bike/bike/2322-700s/','2026-08-17','FORMAT exact page pairs CUES U6000 with an 11-speed LG400-11 cassette.'),
('oem-stels-navigator-970-2025-rd','shimano-rd-u6000-11-context','https://stelsbicycle.ru/catalog/bicycle/gornye/navigator-970-29d-v010/','2026-08-17','STELS exact product page states CUES RD-U6000 in a 1x11 drivetrain.'),
-- CUES RD-U4000 9-speed.
('oem-hagen-5-9-2026-rd','shimano-rd-u4000-9','https://hagen.bike/mtbfivenine2026','2026-08-17','Hagen exact page states RD-U4000 CUES 9.'),
('oem-hagen-4-9-2026-rd','shimano-rd-u4000-9','https://hagen.bike/mtbfournine2026','2026-08-17','Hagen exact page states RD-U4000 CUES 9.'),
('oem-hagen-gr9-2026-rd','shimano-rd-u4000-9','https://hagen.bike/gr9_2026','2026-08-17','Hagen exact page states RD-U4000 CUES 9.'),
('oem-hagen-hg9-2026-rd','shimano-rd-u4000-9','https://hagen.bike/hg9_2026','2026-08-17','Hagen exact page states RD-U4000 CUES 9.'),
('oem-hagen-q9-2026-rd','shimano-rd-u4000-9','https://hagen.bike/q9pearlwhite2026','2026-08-17','Hagen exact page states RD-U4000 CUES 9.'),
('oem-format-1213-29-2026-ru-rd','shimano-rd-u4000-9','https://www.format.bike/bike/1213-29-2/','2026-08-17','FORMAT exact page states Shimano CUES U4000 with 9-speed LG300-9 cassette.'),
-- CUES RD-U3020 9-speed.
('oem-format-1314-plus-275-2026-ru-rd','shimano-rd-u3020-9','https://www.format.bike/bike/1314-plus-27-5-2/','2026-08-17','FORMAT exact page states CUES U3020 with 9-speed 11-36T cassette.'),
('oem-format-1413-29-2026-ru-rd','shimano-rd-u3020-9','https://www.format.bike/bike/1413-29-2/','2026-08-17','FORMAT exact page states CUES U3020 with 9-speed 11-36T cassette.'),
('oem-welt-ranger-1-0-2026-rd','shimano-rd-u3020-9','https://www.welt-bikes.com/ru/ru/vse-velosipedy/gornye/ranger1_2026?optionId=1087','2026-08-17','WELT exact page states RD-U3020 in a 1x9 drivetrain with 11-36T cassette.'),
-- ESSA RD-U2000 8-speed.
('oem-hagen-3-8-2026-rd','shimano-rd-u2000-8','https://hagen.bike/mtbthreeeight2026','2026-08-17','Hagen exact page states RD-U2000 ESSA 8.'),
('oem-hagen-4-8-2026-rd','shimano-rd-u2000-8','https://hagen.bike/mtbfoureight2026','2026-08-17','Hagen exact page states RD-U2000 ESSA 8.'),
('oem-hagen-gr8-2026-rd','shimano-rd-u2000-8','https://hagen.bike/gr8_2026','2026-08-17','Hagen exact page states RD-U2000 ESSA 8.'),
('oem-format-1443-700c-2026-ru-rd','shimano-rd-u2000-8','https://www.format.bike/bike/1443-700s/','2026-08-17','FORMAT exact page states ESSA U2000 with 8-speed 11-45T cassette.'),
('oem-welt-icon-1-0-2026-rd','shimano-rd-u2000-8','https://www.welt-bikes.com/ru/ru/vse-velosipedy/gornye/icon1_2026?optionId=1141','2026-08-17','WELT exact page states ESSA RD-U2000-GS 8-speed.'),
-- DEORE RD-M6100-SGS.
('oem-hagen-3-12-2026-rd','shimano-rd-m6100-sgs','https://hagen.bike/mtbthreetwelve2026','2026-08-17','Hagen exact page states RD-M6100 Deore 12.'),
('oem-hagen-5-12-2026-rd','shimano-rd-m6100-sgs','https://hagen.bike/mtbfivetwelve2026','2026-08-17','Hagen exact page states RD-M6100 Deore 12.'),
('oem-hagen-7-12-2026-rd','shimano-rd-m6100-sgs','https://hagen.bike/mtbseventwelve2026','2026-08-17','Hagen exact page states RD-M6100 Deore 12.'),
('oem-hagen-7-12r-2026-rd','shimano-rd-m6100-sgs','https://hagen.bike/mtbseventwelver2026','2026-08-17','Hagen exact page states RD-M6100 Deore 12.'),
('oem-format-1312-29-2026-ru-rd','shimano-rd-m6100-sgs','https://www.format.bike/bike/1312-29/','2026-08-17','FORMAT exact page states Deore M6100.'),
('oem-format-1122-29-2026-ru-rd','shimano-rd-m6100-sgs','https://www.format.bike/bike/1122-29/','2026-08-17','FORMAT exact page states Deore M6100 with Shimano 10-51T cassette.'),
('oem-welt-rambler-3-0-2026-rd','shimano-rd-m6100-sgs','https://www.welt-bikes.com/ru/ru/vse-velosipedy/gornye/Rambler_3.0_2026?optionId=1256','2026-08-17','WELT exact page states Deore RD-M6100 in a 1x12 drivetrain.'),
-- Alivio RD-M3100-SGS.
('oem-hagen-teen-pro-24-carbon-2026-rd','shimano-rd-m3100-sgs','https://hagen.bike/teenpro24carbon2026','2026-08-17','Hagen exact page states Alivio RD-M3100 9.'),
('oem-hagen-teen-pro-24-air-2026-rd','shimano-rd-m3100-sgs','https://hagen.bike/teenpro24air2026','2026-08-17','Hagen exact page states Alivio RD-M3100 9.'),
('oem-hagen-teen-pro-26-air-2026-rd','shimano-rd-m3100-sgs','https://hagen.bike/teenpro26air2026','2026-08-17','Hagen exact page states Alivio RD-M3100 9.'),
-- Acera RD-M3020-8.
('oem-hagen-1-8-2026-rd','shimano-rd-m3020-8','https://hagen.bike/mtboneeight2026','2026-08-17','Hagen exact page states Acera RD-M3020-8.'),
('oem-hagen-q8-2026-rd','shimano-rd-m3020-8','https://hagen.bike/q8ambercopper2026','2026-08-17','Hagen exact page states Acera RD-M3020-8.'),
('oem-format-1315-275-2025-ru-rd','shimano-rd-m3020-8','https://www.format.bike/bike/1315-27-5/','2026-08-17','FORMAT exact page states Acera M3020 with 11-40T cassette.'),
('oem-format-1413-29-2025-ru-rd','shimano-rd-m3020-8','https://www.format.bike/bike/1413-29/','2026-08-17','FORMAT exact page states Acera M3020 with 11-40T cassette.')
on conflict (alias_component_id) do update set
  canonical_component_id=excluded.canonical_component_id, evidence_url=excluded.evidence_url,
  evidence_checked_at=excluded.evidence_checked_at, notes=excluded.notes;

insert into public.garage_recommendation_outcomes
  (bike_id, scope_key, outcome_type, title, notes, evidence_url, evidence_checked_at, enabled)
values
-- RD-U4000: 46T is the published maximum low sprocket.
('hagen-5-9-2026-ru','cassette_range','no_upgrade','Диапазон кассеты уже на пределе RD-U4000','Hagen указывает 11-46T на этой точной комплектации; Shimano RD-U4000 публикует максимальную большую звезду 46T. Увеличение диапазона кассеты выше 46T не подтверждено Shimano. OEM: https://hagen.bike/mtbfivenine2026','https://productinfo.shimano.com/en/spec/lifestyle-active-rear-derailleur','2026-08-17',true),
('hagen-4-9-2026-ru','cassette_range','no_upgrade','Диапазон кассеты уже на пределе RD-U4000','Hagen указывает 11-46T на этой точной комплектации; Shimano RD-U4000 публикует максимальную большую звезду 46T. Увеличение диапазона кассеты выше 46T не подтверждено Shimano. OEM: https://hagen.bike/mtbfournine2026','https://productinfo.shimano.com/en/spec/lifestyle-active-rear-derailleur','2026-08-17',true),
('hagen-gr9-2026-ru','cassette_range','no_upgrade','Диапазон кассеты уже на пределе RD-U4000','Hagen указывает 11-46T на этой точной комплектации; Shimano RD-U4000 публикует максимальную большую звезду 46T. Увеличение диапазона кассеты выше 46T не подтверждено Shimano. OEM: https://hagen.bike/gr9_2026','https://productinfo.shimano.com/en/spec/lifestyle-active-rear-derailleur','2026-08-17',true),
-- RD-U3020: Shimano publishes exactly 36T low sprocket.
('format-1314-plus-275-2026-ru','cassette_range','no_upgrade','Кассета уже соответствует пределу RD-U3020','FORMAT указывает 11-36T; Shimano RD-U3020 публикует 36T одновременно как минимальную и максимальную большую звезду. Больший диапазон не подтвержден. OEM: https://www.format.bike/bike/1314-plus-27-5-2/','https://productinfo.shimano.com/en/product/RD-U3020','2026-08-17',true),
('format-1413-29-2026-ru','cassette_range','no_upgrade','Кассета уже соответствует пределу RD-U3020','FORMAT указывает 11-36T; Shimano RD-U3020 публикует 36T одновременно как минимальную и максимальную большую звезду. Больший диапазон не подтвержден. OEM: https://www.format.bike/bike/1413-29-2/','https://productinfo.shimano.com/en/product/RD-U3020','2026-08-17',true),
('welt-ranger-1-0-2026-ru','cassette_range','no_upgrade','Кассета уже соответствует пределу RD-U3020','WELT указывает 11-36T; Shimano RD-U3020 публикует 36T одновременно как минимальную и максимальную большую звезду. Больший диапазон не подтвержден. OEM: https://www.welt-bikes.com/ru/ru/vse-velosipedy/gornye/ranger1_2026?optionId=1087','https://productinfo.shimano.com/en/product/RD-U3020','2026-08-17',true),
-- ESSA RD-U2000: Shimano publishes exactly 45T low sprocket.
('hagen-3-8-2026-ru','cassette_range','no_upgrade','45T уже является пределом ESSA RD-U2000','Точная комплектация Hagen использует 11-45T; Shimano RD-U2000 публикует 45T как минимальную и максимальную большую звезду. Более крупная кассета не подтверждена. OEM: https://hagen.bike/mtbthreeeight2026','https://productinfo.shimano.com/en/product/RD-U2000','2026-08-17',true),
('hagen-4-8-2026-ru','cassette_range','no_upgrade','45T уже является пределом ESSA RD-U2000','Точная комплектация Hagen использует 11-45T; Shimano RD-U2000 публикует 45T как минимальную и максимальную большую звезду. Более крупная кассета не подтверждена. OEM: https://hagen.bike/mtbfoureight2026','https://productinfo.shimano.com/en/product/RD-U2000','2026-08-17',true),
('hagen-gr8-2026-ru','cassette_range','no_upgrade','45T уже является пределом ESSA RD-U2000','Точная комплектация Hagen использует 11-45T; Shimano RD-U2000 публикует 45T как минимальную и максимальную большую звезду. Более крупная кассета не подтверждена. OEM: https://hagen.bike/gr8_2026','https://productinfo.shimano.com/en/product/RD-U2000','2026-08-17',true),
('format-1443-700c-2026-ru','cassette_range','no_upgrade','45T уже является пределом ESSA RD-U2000','FORMAT указывает 8-скоростную кассету 11-45T; Shimano RD-U2000 публикует 45T как минимальную и максимальную большую звезду. Более крупная кассета не подтверждена. OEM: https://www.format.bike/bike/1443-700s/','https://productinfo.shimano.com/en/product/RD-U2000','2026-08-17',true),
-- DEORE RD-M6100-SGS: exact Shimano system is already 10-51T, the published limit.
('hagen-5-12-2026-ru','cassette_range','no_upgrade','10-51T уже является пределом RD-M6100-SGS','Hagen указывает Shimano CS-M6100-12 10-51T; Shimano RD-M6100-SGS публикует 51T как минимальную и максимальную большую звезду и 10T как верхнюю. Более крупный диапазон не подтвержден. OEM: https://hagen.bike/mtbfivetwelve2026','https://productinfo.shimano.com/en/product/RD-M6100-SGS','2026-08-17',true),
('hagen-7-12-2026-ru','cassette_range','no_upgrade','10-51T уже является пределом RD-M6100-SGS','Hagen указывает Shimano CS-M6100-12 10-51T; Shimano RD-M6100-SGS публикует 51T как минимальную и максимальную большую звезду и 10T как верхнюю. Более крупный диапазон не подтвержден. OEM: https://hagen.bike/mtbseventwelve2026','https://productinfo.shimano.com/en/product/RD-M6100-SGS','2026-08-17',true),
('hagen-7-12r-2026-ru','cassette_range','no_upgrade','10-51T уже является пределом RD-M6100-SGS','Hagen указывает Shimano CS-M6100-12 10-51T; Shimano RD-M6100-SGS публикует 51T как минимальную и максимальную большую звезду и 10T как верхнюю. Более крупный диапазон не подтвержден. OEM: https://hagen.bike/mtbseventwelver2026','https://productinfo.shimano.com/en/product/RD-M6100-SGS','2026-08-17',true),
('format-1122-29-2026-ru','cassette_range','no_upgrade','10-51T уже является пределом RD-M6100-SGS','FORMAT указывает Shimano Deore M6100-12 10-51T; Shimano RD-M6100-SGS публикует 51T как минимальную и максимальную большую звезду. Более крупный диапазон не подтвержден. OEM: https://www.format.bike/bike/1122-29/','https://productinfo.shimano.com/en/product/RD-M6100-SGS','2026-08-17',true),
-- Alivio RD-M3100-SGS: 36T published maximum.
('hagen-teen-pro-24-carbon-2026-ru','cassette_range','no_upgrade','36T уже является пределом Alivio RD-M3100','Hagen указывает 9-скоростную кассету 11-36T; Shimano RD-M3100-SGS публикует максимальную большую звезду 36T. Увеличение диапазона не подтверждено. OEM: https://hagen.bike/teenpro24carbon2026','https://productinfo.shimano.com/en/product/RD-M3100-SGS','2026-08-17',true),
('hagen-teen-pro-24-air-2026-ru','cassette_range','no_upgrade','36T уже является пределом Alivio RD-M3100','Hagen указывает 9-скоростную кассету 11-36T; Shimano RD-M3100-SGS публикует максимальную большую звезду 36T. Увеличение диапазона не подтверждено. OEM: https://hagen.bike/teenpro24air2026','https://productinfo.shimano.com/en/product/RD-M3100-SGS','2026-08-17',true),
('hagen-teen-pro-26-air-2026-ru','cassette_range','no_upgrade','36T уже является пределом Alivio RD-M3100','Hagen указывает 9-скоростную кассету 11-36T; Shimano RD-M3100-SGS публикует максимальную большую звезду 36T. Увеличение диапазона не подтверждено. OEM: https://hagen.bike/teenpro26air2026','https://productinfo.shimano.com/en/product/RD-M3100-SGS','2026-08-17',true),
-- Acera RD-M3020-8: 40T published maximum.
('hagen-1-8-2026-ru','cassette_range','no_upgrade','40T уже является пределом Acera RD-M3020-8','Hagen указывает 8-скоростную кассету 11-40T; Shimano RD-M3020-8 публикует максимальную большую звезду 40T. Увеличение диапазона не подтверждено. OEM: https://hagen.bike/mtboneeight2026','https://productinfo.shimano.com/en/product/RD-M3020-8','2026-08-17',true),
('hagen-q8-2026-ru','cassette_range','no_upgrade','40T уже является пределом Acera RD-M3020-8','Hagen указывает 8-скоростную кассету 11-40T; Shimano RD-M3020-8 публикует максимальную большую звезду 40T. Увеличение диапазона не подтверждено. OEM: https://hagen.bike/q8ambercopper2026','https://productinfo.shimano.com/en/product/RD-M3020-8','2026-08-17',true),
('format-1315-275-2025-ru','cassette_range','no_upgrade','40T уже является пределом Acera RD-M3020-8','FORMAT указывает 8-скоростную кассету 11-40T; Shimano RD-M3020-8 публикует максимальную большую звезду 40T. Увеличение диапазона не подтверждено. OEM: https://www.format.bike/bike/1315-27-5/','https://productinfo.shimano.com/en/product/RD-M3020-8','2026-08-17',true),
('format-1413-29-2025-ru','cassette_range','no_upgrade','40T уже является пределом Acera RD-M3020-8','FORMAT указывает 8-скоростную кассету 11-40T; Shimano RD-M3020-8 публикует максимальную большую звезду 40T. Увеличение диапазона не подтверждено. OEM: https://www.format.bike/bike/1413-29/','https://productinfo.shimano.com/en/product/RD-M3020-8','2026-08-17',true),
-- RD-U6000 11-speed configurations already at the current 50T Shimano ceiling.
('hagen-3-11-2026-ru','cassette_range','no_upgrade','50T уже достигает опубликованного предела RD-U6000','Точная комплектация Hagen использует 11-скоростную кассету 11-50T; Shimano RD-U6000 публикует 50T как максимальную большую звезду. Более крупная кассета не подтверждена. OEM: https://hagen.bike/mtbthreeeleven2026','https://productinfo.shimano.com/en/product/RD-U6000','2026-08-17',true),
('hagen-4-11-2026-ru','cassette_range','no_upgrade','50T уже достигает опубликованного предела RD-U6000','Точная комплектация Hagen использует 11-скоростную кассету 11-50T; Shimano RD-U6000 публикует 50T как максимальную большую звезду. Более крупная кассета не подтверждена. OEM: https://hagen.bike/mtbfoureleven2026','https://productinfo.shimano.com/en/product/RD-U6000','2026-08-17',true),
('hagen-5-11-2026-ru','cassette_range','no_upgrade','50T уже достигает опубликованного предела RD-U6000','Hagen указывает Shimano CS-LG400-11 11-50T; Shimano RD-U6000 публикует 50T как максимальную большую звезду. Более крупная кассета не подтверждена. OEM: https://hagen.bike/mtbfiveelevenmetalcore2026','https://productinfo.shimano.com/en/product/RD-U6000','2026-08-17',true),
('hagen-gr11-2026-ru','cassette_range','no_upgrade','50T уже достигает опубликованного предела RD-U6000','Hagen указывает Shimano CS-LG400-11 11-50T; Shimano RD-U6000 публикует 50T как максимальную большую звезду. Более крупная кассета не подтверждена. OEM: https://hagen.bike/gr11_2026','https://productinfo.shimano.com/en/product/RD-U6000','2026-08-17',true),
('hagen-gr11-air-2026-ru','cassette_range','no_upgrade','50T уже достигает опубликованного предела RD-U6000','Hagen указывает Shimano CS-LG400-11 11-50T; Shimano RD-U6000 публикует 50T как максимальную большую звезду. Более крупная кассета не подтверждена. OEM: https://hagen.bike/gr11air_2026','https://productinfo.shimano.com/en/product/RD-U6000','2026-08-17',true),
-- 10-speed Shimano LINKGLIDE cassette catalog ceiling: 48T; limited to bikes with exact Shimano 11-48T cassette evidence.
('hagen-5-10-2026-ru','cassette_range_shimano_10sp','no_upgrade','В линейке Shimano 10-speed уже стоит максимальный 48T','Hagen указывает Shimano CS-LG300-10 11-48T. Текущая спецификация Shimano LINKGLIDE 10-speed перечисляет максимум 11-48T. Это no-upgrade только в рамках подтвержденной Shimano 10-speed экосистемы, не заявление о сторонних кассетах. OEM: https://hagen.bike/mtbfivetencopper2026','https://productinfo.shimano.com/en/spec/lifestyle-active-cassette','2026-08-17',true),
('hagen-gr10-2026-ru','cassette_range_shimano_10sp','no_upgrade','В линейке Shimano 10-speed уже стоит максимальный 48T','Hagen указывает Shimano CS-LG300-10 11-48T. Текущая спецификация Shimano LINKGLIDE 10-speed перечисляет максимум 11-48T. Это no-upgrade только в рамках подтвержденной Shimano 10-speed экосистемы, не заявление о сторонних кассетах. OEM: https://hagen.bike/gr10_2026','https://productinfo.shimano.com/en/spec/lifestyle-active-cassette','2026-08-17',true)
on conflict (bike_id,scope_key,outcome_type) do update set
  title=excluded.title, notes=excluded.notes, evidence_url=excluded.evidence_url,
  evidence_checked_at=excluded.evidence_checked_at, enabled=true;

commit;
