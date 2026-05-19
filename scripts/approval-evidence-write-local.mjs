const apiBase = process.env.DEV_CONTROL_API_BASE || "http://127.0.0.1:8711";
const mode = process.argv.includes("--write") ? "write" : "dry-run";

const body = mode === "write" ? { confirmLocalWrite: true } : { dryRun: true };

try {
  const response = await fetch(`${apiBase}/api/approval-evidence/write`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const payload = await response.json();

  if (!response.ok) {
    console.error(JSON.stringify(payload, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify(payload, null, 2));
} catch (error) {
  console.error(
    JSON.stringify(
      {
        status: "approval-evidence-write-failed",
        apiBase,
        mode,
        externalWrites: false,
        message: error.message
      },
      null,
      2
    )
  );
  process.exit(1);
}
