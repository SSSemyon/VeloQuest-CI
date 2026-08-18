-- VeloQuest catalog enrichment wave 38.
-- Completes one missing Garage core field (wheel_size) for exact first-party
-- product pages. Existing drivetrain/brakes/frame evidence is not rewritten.
-- No component compatibility, fitment or recommendation outcome is inferred.

begin;

update public.bike_catalog_models
set specs = specs || '{"wheel_size":"700C","wheel_size_evidence":"https://www.giant-bicycles.com/us/defy-advanced-2"}'::jsonb,
    evidence_checked_at = greatest(evidence_checked_at, '2026-08-17'::date)
where id = 'giant-defy-advanced-2-2026-us';

update public.bike_catalog_models
set specs = specs || '{"wheel_size":"700C","wheel_size_evidence":"https://www.cannondale.com/en-us/bikes/road/gravel/superx/superx-3/2025"}'::jsonb,
    evidence_checked_at = greatest(evidence_checked_at, '2026-08-17'::date)
where id = 'cannondale-superx-3-2025-us';

update public.bike_catalog_models
set specs = specs || '{"wheel_size":"29","wheel_size_evidence":"https://www.norco.com/bikes/mountain/trail/optic/25-optic-C2/"}'::jsonb,
    evidence_checked_at = greatest(evidence_checked_at, '2026-08-17'::date)
where id = 'norco-optic-c2-gen3-2025-global';

update public.bike_catalog_models
set specs = specs || '{"wheel_size":"700C","wheel_size_evidence":"https://www.specialized.com/us/en/crux-dsw-comp-sram-apex-xplr/p/4221802"}'::jsonb,
    evidence_checked_at = greatest(evidence_checked_at, '2026-08-17'::date)
where id = 'specialized-crux-dsw-comp-sram-apex-xplr-2025-global';

update public.bike_catalog_models
set specs = specs || '{"wheel_size":"700C","wheel_size_evidence":"https://www.specialized.com/us/en/crux-pro-sram-force-xplr-etap-axs/p/4223481"}'::jsonb,
    evidence_checked_at = greatest(evidence_checked_at, '2026-08-17'::date)
where id = 'specialized-crux-pro-2025-us';

update public.bike_catalog_models
set specs = specs || '{"wheel_size":"700C","wheel_size_evidence":"https://www.specialized.com/us/en/roubaix-sl8-comp-shimano-105-di2/p/4221823"}'::jsonb,
    evidence_checked_at = greatest(evidence_checked_at, '2026-08-17'::date)
where id = 'specialized-roubaix-sl8-comp-2025-us';

update public.bike_catalog_models
set specs = specs || '{"wheel_size":"700C","wheel_size_evidence":"https://www.specialized.com/us/en/tarmac-sl8-pro-shimano-ultegra-di2/p/4274935"}'::jsonb,
    evidence_checked_at = greatest(evidence_checked_at, '2026-08-17'::date)
where id = 'specialized-tarmac-sl8-pro-ultegra-2025-us';

commit;
