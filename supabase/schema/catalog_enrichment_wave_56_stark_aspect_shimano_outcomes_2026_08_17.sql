-- VeloQuest Garage enrichment wave 56.
-- Russia-first STARK/Aspect canonical Shimano identities.
-- Reuses Wave55 fail-closed conditional component graph. Exact OEM identities
-- are retained; aliases only connect literal Shimano part numbers to canonical
-- components. RD-M5130 is added with a 43T-only conditional Shimano target.
-- No guessed cage/SKU identity and no manufacturer-approved bike-level upgrade.

begin;

insert into public.garage_components
(id,brand,model,category,display_name,specs,unlock_level,evidence_url,evidence_checked_at,enabled)
values
('shimano-rd-m5130-gs','Shimano','RD-M5130-GS','rear_derailleur','Shimano DEORE RD-M5130-GS · 10-speed',
 '{"speeds":10,"family":"Deore LINKGLIDE","chain":"LINKGLIDE / HG 11-speed","low_sprocket":"43T"}'::jsonb,
 1,'https://productinfo.shimano.com/en/spec/mtb-rear-derailleur','2026-08-17',true)
on conflict (id) do update set brand=excluded.brand,model=excluded.model,category=excluded.category,
 display_name=excluded.display_name,specs=excluded.specs,evidence_url=excluded.evidence_url,
 evidence_checked_at=excluded.evidence_checked_at,enabled=true;

insert into public.garage_compatibility
(source_component_id,target_component_id,status,rule_summary,evidence_url,evidence_checked_at,evidence_notes)
values
('shimano-rd-m5130-gs','shimano-cs-lg400-10-11-43','conditional',
 'RD-M5130-GS publishes 43T as both minimum and maximum low sprocket. CS-LG400-10 11-43T is conditional on the complete LINKGLIDE/HG 11-speed chain, 10-speed shifter, and HG-spline freehub system.',
 'https://productinfo.shimano.com/en/spec/mtb-rear-derailleur','2026-08-17',
 'Aspect Cobalt Pro exact OEM page lists RD-M5130 with an 11-46T third-party cassette, which exceeds Shimano current 43T product specification. The OEM record is preserved; this rule is a conservative Shimano-system replacement path, not a claim that the installed combination is invalid in all circumstances.')
on conflict (source_component_id,target_component_id) do update set status=excluded.status,
 rule_summary=excluded.rule_summary,evidence_url=excluded.evidence_url,
 evidence_checked_at=excluded.evidence_checked_at,evidence_notes=excluded.evidence_notes;

insert into public.garage_component_aliases
(alias_component_id,canonical_component_id,evidence_url,evidence_checked_at,notes)
values
-- STARK exact 2026 products.
('oem-stark-fat-26-3-hd-2026-rd','shimano-rd-u4000-9','https://shop.stark.ru/bikes/velosipedy/fetbayki/fat/fat-26-3-hd-2026/','2026-08-17','STARK exact page states Shimano CUES RD-U4000 and 9 speeds.'),
('oem-stark-router-29-3-hd-2026-rd','shimano-rd-u4000-9','https://shop.stark.ru/bikes/velosipedy/gornye/kross-kantri/router/router-29-3-hd-2026/','2026-08-17','STARK exact page states Shimano CUES RD-U4000, SL-U4000, CS-LG300-9 and 9 speeds.'),
('oem-stark-hunter-29-3-hd-2026-rd','shimano-rd-u4000-9','https://shop.stark.ru/bikes/velosipedy/gornye/trekking/hunter/hunter-29-3-hd-2026/','2026-08-17','STARK exact page states Shimano CUES RD-U4000 and 9-speed drivetrain.'),
('oem-stark-router-29-4-hd-2026-rd','shimano-rd-u6000-10-context','https://shop.stark.ru/bikes/velosipedy/gornye/kross-kantri/router/router-29-4-hd-2026/','2026-08-17','STARK exact page states Shimano CUES RD-U6000-10 and CS-LG300-10.'),
('oem-stark-gravel-t-2-2026-rd','shimano-rd-u2000-8','https://shop.stark.ru/bikes/velosipedy/graviynye/gravel/gravel-t-2-2026/','2026-08-17','STARK exact page states Shimano ESSA RD-U2000 in an 8-speed drivetrain.'),
-- Aspect exact 2026 products.
('oem-aspect-cobalt-29-2026-rd','shimano-rd-u3020-9','https://www.aspect-bikes.ru/catalog/aspect-cobalt-29/','2026-08-17','Aspect exact page states Shimano CUES RD-U3020 in a 1x9 drivetrain. Installed 11-40T cassette is preserved as OEM evidence; Shimano current RD-U3020 spec publishes 36T.'),
('oem-aspect-cobalt-elite-29-2026-rd','shimano-rd-m6100-sgs','https://www.aspect-bikes.ru/catalog/aspect-cobalt-elite-29/','2026-08-17','Aspect exact page states Shimano DEORE RD-M6100 1x12.'),
('oem-aspect-cobalt-expert-29-2026-rd','shimano-rd-m6100-sgs','https://www.aspect-bikes.ru/catalog/aspect-cobalt-expert-29/','2026-08-17','Aspect exact page states Shimano DEORE RD-M6100 1x12.'),
('oem-aspect-cobalt-pro-29-2026-rd','shimano-rd-m5130-gs','https://www.aspect-bikes.ru/catalog/aspect-cobalt-pro-29/','2026-08-17','Aspect exact page states Shimano Deore RD-M5130 in a 1x10 drivetrain. Shimano current ProductInfo identifies the canonical part as RD-M5130-GS; installed 11-46T cassette conflict is retained in rule evidence notes.')
on conflict (alias_component_id) do update set canonical_component_id=excluded.canonical_component_id,
 evidence_url=excluded.evidence_url,evidence_checked_at=excluded.evidence_checked_at,notes=excluded.notes;

commit;
