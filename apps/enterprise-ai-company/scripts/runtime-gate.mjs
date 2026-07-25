const runtimeApproved = process.env.SIRINX_ENTERPRISE_AI_COMPANY_RUNTIME_APPROVED === "1";

if (!runtimeApproved) {
  console.error(
    [
      "Enterprise AI Company runtime gate is closed.",
      "Set SIRINX_ENTERPRISE_AI_COMPANY_RUNTIME_APPROVED=1 only after install review.",
      "Provider calls, secrets, public output, deploy, and push remain separately gated.",
    ].join("\n"),
  );
  process.exit(1);
}

console.log("Enterprise AI Company runtime gate open for local startup only.");
