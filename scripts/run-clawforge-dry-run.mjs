import { validateClawForgeDemoSpec } from "../packages/clawforge-adapter/src/validateDemoSpec.mjs";

const result = validateClawForgeDemoSpec();

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (!result.ok) {
  process.exitCode = 1;
}
