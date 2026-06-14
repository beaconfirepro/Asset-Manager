export type ScoringResult = "PASS" | "FAIL" | "INCONCLUSIVE";

type NumericCriterion = {
  field: string;
  kind: "numeric";
  min?: number;
  max?: number;
  required: boolean;
  label?: string;
};

type BoolCriterion = {
  field: string;
  kind: "boolean";
  mustBeTrue: boolean;
  required: boolean;
  label?: string;
};

type RatioCriterion = {
  field: string;
  compareField: string;
  kind: "ratio";
  minRatio: number;
  required: boolean;
  label?: string;
};

type Criterion = NumericCriterion | BoolCriterion | RatioCriterion;

type StandardTestCriteria = Record<string, Criterion[]>;

const NFPA_25_CRITERIA: StandardTestCriteria = {
  FLOW_TEST: [
    { field: "static_psi", kind: "numeric", min: 50, required: true, label: "Static pressure (min 50 PSI)" },
    { field: "residual_psi", kind: "numeric", min: 40, required: true, label: "Residual pressure (min 40 PSI)" },
    { field: "flow_gpm", kind: "numeric", min: 250, required: true, label: "Flow rate (min 250 GPM)" },
  ],
  PRESSURE_TEST: [
    { field: "test_pressure_psi", kind: "numeric", min: 200, required: true, label: "Test pressure (min 200 PSI)" },
    { field: "sustained_minutes", kind: "numeric", min: 2, required: false, label: "Sustained duration (min 2 min)" },
  ],
  VALVE_OPERATION: [
    { field: "fully_opens", kind: "boolean", mustBeTrue: true, required: true, label: "Valve fully opens" },
    { field: "fully_closes", kind: "boolean", mustBeTrue: true, required: true, label: "Valve fully closes" },
    { field: "no_leakage", kind: "boolean", mustBeTrue: true, required: true, label: "No leakage detected" },
  ],
};

const NFPA_72_CRITERIA: StandardTestCriteria = {
  SMOKE_DETECTOR_SENSITIVITY: [
    { field: "all_activated", kind: "boolean", mustBeTrue: true, required: true, label: "All detectors activated" },
    {
      field: "passed",
      compareField: "tested",
      kind: "ratio",
      minRatio: 1.0,
      required: false,
      label: "100% detectors passed sensitivity",
    },
  ],
  ALARM_VERIFICATION: [
    { field: "all_activated", kind: "boolean", mustBeTrue: true, required: true, label: "All alarms activated" },
    { field: "horn_strobes", kind: "boolean", mustBeTrue: true, required: true, label: "Horn/strobes functioning" },
  ],
  BATTERY_LOAD: [
    { field: "voltage_v", kind: "numeric", min: 24.0, required: true, label: "Battery voltage (min 24V)" },
    { field: "load_test_pass", kind: "boolean", mustBeTrue: true, required: true, label: "Load test passed" },
  ],
};

const NFPA_96_CRITERIA: StandardTestCriteria = {
  SUPPRESSION_DISCHARGE: [
    { field: "discharge_time_s", kind: "numeric", max: 30, required: true, label: "Discharge time (max 30 s)" },
    { field: "full_coverage", kind: "boolean", mustBeTrue: true, required: false, label: "Full cooking surface coverage" },
  ],
};

const NFPA_2001_CRITERIA: StandardTestCriteria = {
  SUPPRESSION_DISCHARGE: [
    { field: "concentration_pct", kind: "numeric", min: 5.0, required: true, label: "Agent concentration (min 5%)" },
    { field: "discharge_time_s", kind: "numeric", max: 10, required: true, label: "Discharge time (max 10 s)" },
  ],
};

const NFPA_110_CRITERIA: StandardTestCriteria = {
  BATTERY_LOAD: [
    { field: "voltage_v", kind: "numeric", min: 108, required: true, label: "Battery voltage (min 108V)" },
    { field: "transfer_time_ms", kind: "numeric", max: 10_000, required: false, label: "Transfer time (max 10 s)" },
  ],
};

export const CRITERIA_BY_STANDARD_CODE: Record<string, StandardTestCriteria> = {
  NFPA_25: NFPA_25_CRITERIA,
  NFPA_72: NFPA_72_CRITERIA,
  NFPA_96: NFPA_96_CRITERIA,
  NFPA_2001: NFPA_2001_CRITERIA,
  NFPA_110: NFPA_110_CRITERIA,
  NFPA_750: {},
};

export type ScoringOutcome = {
  result: ScoringResult;
  violations: string[];
  warnings: string[];
  criteriaApplied: boolean;
};

export function computeTestResult(
  standardCode: string | null | undefined,
  testType: string,
  readingsJson: string | null | undefined,
): ScoringOutcome {
  if (!standardCode || !readingsJson?.trim()) {
    return {
      result: "INCONCLUSIVE",
      violations: [],
      warnings: ["No compliance standard or readings — result requires inspector judgment"],
      criteriaApplied: false,
    };
  }

  let readings: Record<string, unknown>;
  try {
    readings = JSON.parse(readingsJson) as Record<string, unknown>;
  } catch {
    return {
      result: "INCONCLUSIVE",
      violations: ["Readings could not be parsed as JSON"],
      warnings: [],
      criteriaApplied: false,
    };
  }

  const standardCriteria = CRITERIA_BY_STANDARD_CODE[standardCode];
  if (!standardCriteria) {
    return {
      result: "INCONCLUSIVE",
      violations: [],
      warnings: [`No scoring criteria defined for ${standardCode} — result requires inspector judgment`],
      criteriaApplied: false,
    };
  }

  const criteria = standardCriteria[testType];
  if (!criteria || criteria.length === 0) {
    return {
      result: "INCONCLUSIVE",
      violations: [],
      warnings: [`No criteria for test type "${testType}" under ${standardCode} — result requires inspector judgment`],
      criteriaApplied: false,
    };
  }

  const violations: string[] = [];

  for (const c of criteria) {
    if (c.kind === "numeric") {
      const raw = readings[c.field];
      if (raw === undefined || raw === null) {
        if (c.required) violations.push(`Missing required reading: ${c.label ?? c.field}`);
        continue;
      }
      const v = Number(raw);
      if (isNaN(v)) {
        violations.push(`Non-numeric value for ${c.label ?? c.field}: ${String(raw)}`);
        continue;
      }
      if (c.min !== undefined && v < c.min) {
        violations.push(`${c.label ?? c.field} = ${v} (below minimum ${c.min})`);
      }
      if (c.max !== undefined && v > c.max) {
        violations.push(`${c.label ?? c.field} = ${v} (above maximum ${c.max})`);
      }
    } else if (c.kind === "boolean") {
      const raw = readings[c.field];
      if (raw === undefined || raw === null) {
        if (c.required) violations.push(`Missing required reading: ${c.label ?? c.field}`);
        continue;
      }
      const boolVal = raw === true || raw === 1 || raw === "true" || raw === "yes";
      if (c.mustBeTrue && !boolVal) {
        violations.push(`${c.label ?? c.field} must be true — got ${JSON.stringify(raw)}`);
      }
    } else if (c.kind === "ratio") {
      const numerator = Number(readings[c.field]);
      const denominator = Number(readings[c.compareField]);
      if (!isNaN(numerator) && !isNaN(denominator) && denominator > 0) {
        const ratio = numerator / denominator;
        if (ratio < c.minRatio) {
          violations.push(
            `${c.label ?? c.field} ratio ${(ratio * 100).toFixed(0)}% is below required ${(c.minRatio * 100).toFixed(0)}%`,
          );
        }
      }
    }
  }

  return {
    result: violations.length > 0 ? "FAIL" : "PASS",
    violations,
    warnings: [],
    criteriaApplied: true,
  };
}
