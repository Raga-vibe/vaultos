/**
 * Network spike: SERV returns valid structured output over the wire.
 *
 * Confirms the parts of the SERV contract that cannot be checked offline:
 * the base URL, the model name, that response_format json_schema is honoured,
 * and that the result validates against our Zod schema.
 */

import {
  check,
  finish,
  heading,
  info,
  loadEnv,
  requireEnvOrFatal,
  value,
} from "./_report";
import { assessOpportunity } from "../lib/serv/assess";
import { getOpportunity } from "../lib/opportunities/source";
import { SERV_BASE_URL, SERV_MODEL } from "../lib/serv/client";

loadEnv();
heading("SPIKE: SERV structured output over the wire");
requireEnvOrFatal(["SERV_API_KEY"]);

value("base URL", SERV_BASE_URL);
value("model", SERV_MODEL);

const opportunity = getOpportunity("opp-stable-reserve");
if (!opportunity) {
  check(false, "seeded opportunity available");
  finish();
}

info("requesting assessment…");
const result = await assessOpportunity(opportunity, 1_000_000_000n);

if (!result.ok) {
  check(false, "SERV returned a schema-valid assessment", result.reason);
  if (result.raw !== null) {
    console.log(`\n  Raw response:\n  ${result.raw.slice(0, 2000)}`);
  }
  finish();
}

check(true, "SERV returned a schema-valid assessment");

const a = result.assessment;
value("risk", a.riskAssessment);
value("liquidity", a.liquidityAssessment);
value("recommended %", a.recommendedAllocationPercent);
value("uses leverage", a.usesLeverage);
value("confidence", a.confidence);
console.log(`\n  Summary: ${a.summary}`);
console.log(`  Rationale: ${a.rationale}`);
if (a.concerns.length > 0) {
  console.log(`  Concerns:`);
  for (const c of a.concerns) console.log(`    - ${c}`);
}

check(
  ["LOW", "MEDIUM", "HIGH"].includes(a.riskAssessment),
  "risk band is in vocabulary",
);
check(
  a.recommendedAllocationPercent >= 0 && a.recommendedAllocationPercent <= 100,
  "recommended allocation is within 0-100",
);
check(a.summary.trim().length > 0, "summary is non-empty");

info("");
info("Reminder: nothing above authorises anything. The policy engine does");
info("not read this assessment. See spike:serv-invalid.");

finish();
