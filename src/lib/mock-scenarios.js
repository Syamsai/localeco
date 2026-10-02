export const DEFAULT_MOCK_SCENARIO = "success";

export const MOCK_SCENARIOS = [
  {
    value: DEFAULT_MOCK_SCENARIO,
    label: "Successful search",
    description: "Ten products with complete sustainability analysis.",
  },
  {
    value: "no_results",
    label: "No shopping results",
    description: "Shopping succeeds but returns no usable products.",
  },
  {
    value: "shopping_failure",
    label: "Shopping service failure",
    description: "The shopping provider is temporarily unavailable.",
  },
  {
    value: "analysis_failure",
    label: "Analysis unavailable",
    description: "Products load, but no sustainability analysis is available.",
  },
  {
    value: "partial_analysis",
    label: "Partial analysis",
    description: "Some products load without sustainability analysis.",
  },
  {
    value: "malformed_provider",
    label: "Malformed provider response",
    description: "Provider data fails contract validation.",
  },
];

const MOCK_SCENARIO_VALUES = new Set(
  MOCK_SCENARIOS.map((scenario) => scenario.value),
);

export function isMockScenario(value) {
  return typeof value === "string" && MOCK_SCENARIO_VALUES.has(value);
}
