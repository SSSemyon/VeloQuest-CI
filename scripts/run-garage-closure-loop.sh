#!/usr/bin/env bash
set -euo pipefail

BRANCH="${GARAGE_CLOSURE_BRANCH:-agent/release-closure-0.8.9}"
MAX_PASSES_RAW="${GARAGE_CLOSURE_MAX_PASSES:-8}"
if ! [[ "$MAX_PASSES_RAW" =~ ^[0-9]+$ ]] || [ "$MAX_PASSES_RAW" -lt 1 ]; then
  echo "GARAGE_CLOSURE_MAX_PASSES must be a positive integer" >&2
  exit 2
fi
MAX_PASSES="$MAX_PASSES_RAW"
if [ "$MAX_PASSES" -gt 12 ]; then MAX_PASSES=12; fi

WORK_HEAD="${WORK_HEAD:-$(git rev-parse HEAD)}"
mkdir -p catalog-harvester/manifests catalog-harvester/runs

git config user.name "VeloQuest Closure Bot"
git config user.email "veloquest-closure-bot@users.noreply.github.com"

json_count() {
  local file="$1"
  local expression="$2"
  node -e "const fs=require('fs'); const x=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); const n=(${expression}); process.stdout.write(String(Number(n)||0));" "$file"
}

closure_digest() {
  {
    for file in \
      catalog-harvester/enrichment-queue.json \
      catalog-harvester/compatibility-demand.json \
      catalog-harvester/evidence-deferrals.json; do
      if [ -f "$file" ]; then shasum -a 256 "$file"; fi
    done
    find supabase/schema -maxdepth 1 -type f -name 'catalog_enrichment_wave_*.sql' -print \
      | LC_ALL=C sort \
      | while IFS= read -r file; do shasum -a 256 "$file"; done
    find supabase/migrations -maxdepth 1 -type f -name '*.sql' -print \
      | LC_ALL=C sort \
      | while IFS= read -r file; do shasum -a 256 "$file"; done
  } | shasum -a 256 | awk '{print $1}'
}

stage_persistable_changes() {
  git add \
    catalog-harvester/enrichment-queue.json \
    catalog-harvester/compatibility-demand.json \
    catalog-harvester/evidence-deferrals.json \
    supabase/migrations
  for file in supabase/schema/catalog_enrichment_wave_*_auto_official_evidence_*.sql; do
    if [ -e "$file" ]; then git add "$file"; fi
  done
}

verify_pass() {
  npm test
  npm run check:catalog
  npm run check:garage
  npm run check:sql
  npm run check:migrations
}

persist_pass() {
  local pass="$1"
  stage_persistable_changes
  if git diff --cached --quiet; then
    echo "Garage pass $pass has no persisted changes."
    return 1
  fi

  git fetch origin "$BRANCH"
  local remote_head
  remote_head="$(git rev-parse "origin/$BRANCH")"
  if [ "$remote_head" != "$WORK_HEAD" ]; then
    echo "Canonical closure head advanced from $WORK_HEAD to $remote_head; refusing stale Garage write." >&2
    exit 3
  fi

  git commit -m "data: advance bounded Garage closure pass $pass"
  git push origin "HEAD:$BRANCH"
  WORK_HEAD="$(git rev-parse HEAD)"
  export WORK_HEAD
  echo "Persisted Garage pass $pass at $WORK_HEAD"
  return 0
}

rebuild_derived_state() {
  npm run build:garage:enrichment-queue
  npm run garage:compatibility:demand -- catalog-harvester/compatibility-demand.json catalog-harvester/enrichment-queue.json
  npm run garage:compatibility:manifest -- catalog-harvester/compatibility-demand.json catalog-harvester/manifests/component-compatibility.json 100
  npm run garage:manual-resolution -- catalog-harvester/manual-resolution-queue.json catalog-harvester/enrichment-queue.json catalog-harvester/evidence-deferrals.json catalog-harvester/manifests/component-compatibility.json
}

run_exact_product_path() {
  npm run garage:evidence:manifest -- catalog-harvester/manifests/self-hosted-product-evidence.json 100
  local candidates
  candidates="$(json_count catalog-harvester/manifests/self-hosted-product-evidence.json "x.entries?.length ?? 0")"
  echo "exact_product_candidates=$candidates"
  if [ "$candidates" -eq 0 ]; then return 0; fi

  npm run garage:evidence:extract -- catalog-harvester/manifests/self-hosted-product-evidence.json catalog-harvester/runs/garage-evidence-run.json
  local accepted
  accepted="$(json_count catalog-harvester/runs/garage-evidence-run.json "x.summary?.ok ?? 0")"
  echo "exact_product_accepted=$accepted"
  if [ "$accepted" -gt 0 ]; then
    npm run garage:evidence:materialize -- catalog-harvester/runs/garage-evidence-run.json catalog-harvester/enrichment-queue.json
  fi
}

run_archive_resolution_path() {
  npm run garage:urls:manifest -- catalog-harvester/manifests/product-url-resolution.json 100 catalog-harvester/enrichment-queue.json
  local candidates
  candidates="$(json_count catalog-harvester/manifests/product-url-resolution.json "x.entries?.length ?? 0")"
  echo "url_resolution_candidates=$candidates"
  if [ "$candidates" -eq 0 ]; then return 0; fi

  npm run garage:urls:resolve -- catalog-harvester/manifests/product-url-resolution.json catalog-harvester/runs/product-url-resolution.json
  npm run garage:urls:evidence-manifest -- catalog-harvester/runs/product-url-resolution.json catalog-harvester/manifests/resolved-product-evidence.json
  local resolved
  resolved="$(json_count catalog-harvester/manifests/resolved-product-evidence.json "x.entries?.length ?? 0")"
  echo "resolved_product_candidates=$resolved"
  if [ "$resolved" -eq 0 ]; then return 0; fi

  npm run garage:evidence:extract -- catalog-harvester/manifests/resolved-product-evidence.json catalog-harvester/runs/resolved-product-evidence-run.json
  local accepted
  accepted="$(json_count catalog-harvester/runs/resolved-product-evidence-run.json "x.summary?.ok ?? 0")"
  echo "resolved_product_accepted=$accepted"
  if [ "$accepted" -gt 0 ]; then
    npm run garage:evidence:materialize -- catalog-harvester/runs/resolved-product-evidence-run.json catalog-harvester/enrichment-queue.json
  fi
}

run_compatibility_path() {
  npm run garage:compatibility:demand -- catalog-harvester/compatibility-demand.json catalog-harvester/enrichment-queue.json
  npm run garage:compatibility:manifest -- catalog-harvester/compatibility-demand.json catalog-harvester/manifests/component-compatibility.json 100
  npm run garage:compatibility:resolve -- catalog-harvester/manifests/component-compatibility.json catalog-harvester/compatibility-demand.json catalog-harvester/runs/component-compatibility-run.json
  local resolved
  resolved="$(json_count catalog-harvester/runs/component-compatibility-run.json "x.summary?.resolved ?? 0")"
  echo "compatibility_sources_resolved=$resolved"
  if [ "$resolved" -gt 0 ]; then
    npm run garage:compatibility:materialize -- catalog-harvester/runs/component-compatibility-run.json
  fi
}

MAXIMUM_REACHED=false
for ((pass = 1; pass <= MAX_PASSES; pass++)); do
  echo "=== Garage closure pass $pass/$MAX_PASSES ==="
  rm -f \
    catalog-harvester/runs/garage-evidence-run.json \
    catalog-harvester/runs/product-url-resolution.json \
    catalog-harvester/runs/resolved-product-evidence-run.json \
    catalog-harvester/runs/component-compatibility-run.json

  rebuild_derived_state
  if npm run check:garage:maximum; then
    MAXIMUM_REACHED=true
    stage_persistable_changes
    if ! git diff --cached --quiet; then
      verify_pass
      if ! persist_pass "$pass"; then
        echo "Maximum reached with no additional persisted state to commit."
      fi
    fi
    break
  fi

  BEFORE_DIGEST="$(closure_digest)"

  run_exact_product_path
  npm run build:garage:enrichment-queue

  run_archive_resolution_path
  npm run build:garage:enrichment-queue

  run_compatibility_path

  npm run garage:evidence:deferrals -- \
    catalog-harvester/evidence-deferrals.json \
    catalog-harvester/runs/garage-evidence-run.json \
    catalog-harvester/runs/product-url-resolution.json \
    catalog-harvester/runs/resolved-product-evidence-run.json \
    catalog-harvester/runs/component-compatibility-run.json

  npm run build:supabase-migrations
  rebuild_derived_state
  AFTER_DIGEST="$(closure_digest)"

  if [ "$AFTER_DIGEST" = "$BEFORE_DIGEST" ]; then
    echo "No deterministic Garage progress in pass $pass; stopping bounded loop without weakening the 100-percent gate."
    break
  fi

  verify_pass
  if ! persist_pass "$pass"; then
    echo "No persisted Garage progress in pass $pass; stopping bounded loop."
    break
  fi

done

rebuild_derived_state
if npm run check:garage:maximum; then
  MAXIMUM_REACHED=true
fi

if [ "$MAXIMUM_REACHED" = true ]; then
  echo "Garage maximum acceptance reached at $WORK_HEAD"
else
  echo "Garage closure loop stopped before 100 percent; verified progress is preserved and remaining gaps stay blocking."
fi
