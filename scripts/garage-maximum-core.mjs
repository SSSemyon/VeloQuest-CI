const LABELS = {
  photo: 'photo coverage',
  core_specs: 'core finder spec coverage',
  exact_fitment: 'exact fitment coverage',
  recommendation_outcome: 'recommendation/outcome coverage',
};

export function evaluateGarageMaximum(queue, catalogResult) {
  const failures = [];
  const current = queue?.current ?? {};
  const catalogModels = Number(catalogResult?.masterCatalog?.models ?? queue?.catalog_models) || 0;
  if (catalogModels < 1) failures.push('Garage catalog model count unavailable for 100% release gate');

  const required = Object.fromEntries(Object.keys(LABELS).map((metric) => [metric, catalogModels]));

  for (const metric of Object.keys(LABELS)) {
    const present = Number(current[metric]) || 0;
    const target = Number(required[metric]) || 0;
    if (present < target) failures.push(`${LABELS[metric]} ${present}/${target} below 100% release target`);
  }

  const compatibility = catalogResult?.compatibility ?? {};
  if ((Number(compatibility.incompatibleRules) || 0) < 1) failures.push('no evidence-backed incompatible rule');
  if ((Number(compatibility.conditionalRules) || 0) < 1) failures.push('no evidence-backed conditional rule');

  return {
    valid: failures.length === 0,
    failures,
    targetPercent: 100,
    catalogModels,
    current: {
      photo: Number(current.photo) || 0,
      core_specs: Number(current.core_specs) || 0,
      exact_fitment: Number(current.exact_fitment) || 0,
      recommendation_outcome: Number(current.recommendation_outcome) || 0,
    },
    required: {
      photo: Number(required.photo) || 0,
      core_specs: Number(required.core_specs) || 0,
      exact_fitment: Number(required.exact_fitment) || 0,
      recommendation_outcome: Number(required.recommendation_outcome) || 0,
    },
    conditionalRules: Number(compatibility.conditionalRules) || 0,
    incompatibleRules: Number(compatibility.incompatibleRules) || 0,
  };
}
