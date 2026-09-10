// ─────────────────────────────────────────────────────────────────────────────
// CatalogOpenCodeGoCalculator.Constraint.ts
//
// Models excluded from catalog computations (e.g. deprecated, teaser, or
// otherwise non-purchaseable tiers). Add or remove names as needed.
// ─────────────────────────────────────────────────────────────────────────────

export const OPEN_CODE_GO_EXCLUDED_MODELS: readonly string[] = [
  "Muse Spark 1.3 Contributor",
  "Muse Spark 1.2 Contributor",
];

export function isModelExcluded(name: string): boolean {
  return OPEN_CODE_GO_EXCLUDED_MODELS.includes(name);
}

export function excludeOpenCodeGoModels<T extends { name: string }>(
  models: T[],
): T[] {
  return models.filter((model) => !isModelExcluded(model.name));
}