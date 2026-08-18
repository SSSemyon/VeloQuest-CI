-- SOURCE: supabase/schema/catalog_enrichment_wave_39_specialized_wheel_size_2026_08_17.sql
-- VeloQuest catalog enrichment wave 39.
-- Completes wheel_size only for exact Specialized 2025 product pages whose
-- remaining core Garage fields already have evidence. No component graph or
-- recommendation inference is added.

begin;

update public.bike_catalog_models
set specs = specs || '{"wheel_size":"700C","wheel_size_evidence":"https://www.specialized.com/us/en/diverge-comp-carbon-sram-apex-etap-axs/p/4223498"}'::jsonb,
    evidence_checked_at = greatest(evidence_checked_at, '2026-08-17'::date)
where id = 'specialized-diverge-comp-carbon-sram-apex-etap-axs-2025-global';

update public.bike_catalog_models
set specs = specs || '{"wheel_size":"700C","wheel_size_evidence":"https://www.specialized.com/us/en/roubaix-sl8-expert-sram-rival-etap-axs/p/4221821"}'::jsonb,
    evidence_checked_at = greatest(evidence_checked_at, '2026-08-17'::date)
where id = 'specialized-roubaix-sl8-expert-sram-rival-etap-axs-2025-global';

update public.bike_catalog_models
set specs = specs || '{"wheel_size":"700C","wheel_size_evidence":"https://www.specialized.com/us/en/tarmac-sl7-sport-shimano-105/p/4221542"}'::jsonb,
    evidence_checked_at = greatest(evidence_checked_at, '2026-08-17'::date)
where id = 'specialized-tarmac-sl7-sport-shimano-105-2025-global';

update public.bike_catalog_models
set specs = specs || '{"wheel_size":"700C","wheel_size_evidence":"https://www.specialized.com/us/en/tarmac-sl8-pro-sram-force-etap-axs/p/4221537"}'::jsonb,
    evidence_checked_at = greatest(evidence_checked_at, '2026-08-17'::date)
where id = 'specialized-tarmac-sl8-pro-sram-force-etap-axs-2025-global';

commit;
