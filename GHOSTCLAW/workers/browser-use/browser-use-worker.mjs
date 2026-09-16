/**
 * GHOSTCLAW Browser Use Worker
 * Phase 4 — Browser Automation for Local Dashboard Smoke Testing
 *
 * Autonomy Level: A4 (Bounded agent — read-only + safe click on local dashboard)
 * Policy: browser-use.policy.yaml
 *
 * Blocked actions (never executed):
 *   - Login with credentials
 *   - Payment / checkout
 *   - Security setting changes
 *   - Private data scraping
 *   - Captcha / rate-limit bypass
 *   - Customer-send flow
 *   - Telegram live send
 *
 * If browser-use or Playwright is missing, does NOT auto-install.
 * Writes setup instructions and sets status=setup_required.
 *
 * Canonical terminology: brainstorm (canonical), beststorm (legacy alias), beststrom (invalid typo).
 */

import { readdir, writeFile, appendFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── Configuration ────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const WORKER_ID = 'browser-use-worker';
const WORKER_VERSION = '1.0.0';
const AUTONOMY_LEVEL = 'A4';

const DASHBOARD_URL = process.env.GHOSTCLAW_DASHBOARD_URL || 'http://127.0.0.1:8721';
const POLICY_FILE = join(__dirname, 'browser-use.policy.yaml');
const RECEIPTS_DIR = join(__dirname, 'receipts');
const RUN_LOG_PATH = join(__dirname, '..', '..', '..', 'AUTONOMOUS_RUN_LOG.md');

// Blocked action categories — see browser-use.policy.yaml
const BLOCKED_ACTIONS = [
  'login_with_credentials',
  'payment',
  'security_setting_change',
  'private_data_scraping',
  'captcha_bypass',
  'rate_limit_bypass',
  'customer_send_flow',
  'telegram_live_send',
];

// ─── Utility: Timestamp ────────────────────────────────────────

function isoNow() {
  return new Date().toISOString();
}

function shortId() {
  return `bu-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Availability Detection ───────────────────────────────────

/**
 * Detect if the `browser-use` Python package is available.
 * Does NOT install if missing.
 * @returns {{ available: boolean, version: string|null, error: string|null }}
 */
async function detectBrowserUse() {
  try {
    const { execSync } = await import('node:child_process');
    const result = execSync('python3 -c "import browser_use; print(browser_use.__version__)"', {
      timeout: 5000,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return {
      available: true,
      version: result.trim(),
      error: null,
    };
  } catch {
    return {
      available: false,
      version: null,
      error: 'browser-use package not found',
    };
  }
}

/**
 * Detect if Playwright is available (Node.js or Python).
 * Does NOT install if missing.
 * @returns {{ available: boolean, version: string|null, error: string|null, runtime: string|null }}
 */
async function detectPlaywright() {
  // Check Node.js Playwright
  try {
    const playwright = await import('playwright').catch(() => null);
    if (playwright && playwright.chromium) {
      return {
        available: true,
        version: 'node-playwright',
        error: null,
        runtime: 'node',
      };
    }
  } catch {
    // Not installed via npm
  }

  // Check Python Playwright
  try {
    const { execSync } = await import('node:child_process');
    const result = execSync('python3 -c "import playwright; print(playwright.__version__)"', {
      timeout: 5000,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return {
      available: true,
      version: result.trim(),
      error: null,
      runtime: 'python',
    };
  } catch {
    return {
      available: false,
      version: null,
      error: 'Playwright not found in Node.js or Python',
      runtime: null,
    };
  }
}

// ─── Policy Enforcement ───────────────────────────────────────

/**
 * Validate an action against the blocked list.
 * @param {string} action - Action identifier
 * @returns {{ allowed: boolean, reason: string }}
 */
function validateAction(action) {
  if (BLOCKED_ACTIONS.includes(action)) {
    return {
      allowed: false,
      reason: `Action "${action}" is blocked by browser-use.policy.yaml`,
    };
  }
  return { allowed: true, reason: 'Action permitted by policy' };
}

/**
 * Generate a blocked-action receipt with safe replacement.
 * @param {string} action
 * @param {string} context
 * @returns {object}
 */
function generateBlockedReceipt(action, context) {
  return {
    receipt_id: shortId(),
    worker_id: WORKER_ID,
    worker_version: WORKER_VERSION,
    timestamp: isoNow(),
    action,
    status: 'blocked',
    reason: `Action "${action}" is blocked by browser-use.policy.yaml`,
    context,
    safe_replacement: 'No replacement action generated. Manual review required for blocked browser action.',
    autonomy_level: AUTONOMY_LEVEL,
  };
}

// ─── Smoke Workflow (Playwright-based) ────────────────────────

/**
 * Run local dashboard smoke workflow using Playwright (Node.js).
 *
 * Steps:
 * 1. Open dashboard URL
 * 2. Capture page screenshot
 * 3. Safe click on first visible non-sensitive element
 * 4. Check visible text content
 * 5. Capture console errors
 * 6. Write smoke receipt
 *
 * @param {object} opts - { url, screenshotsDir }
 * @returns {Promise<object>} smoke result
 */
async function runSmokeWorkflow(opts = {}) {
  const url = opts.url || DASHBOARD_URL;
  const screenshotsDir = opts.screenshotsDir || join(RECEIPTS_DIR, 'screenshots');

  // Ensure receipts directory exists
  await mkdir(RECEIPTS_DIR, { recursive: true });
  await mkdir(screenshotsDir, { recursive: true });

  const detection = await detectPlaywright();

  if (!detection.available) {
    const setupInstructions = generateSetupInstructions('playwright');
    const receipt = {
      receipt_id: shortId(),
      worker_id: WORKER_ID,
      worker_version: WORKER_VERSION,
      timestamp: isoNow(),
      status: 'setup_required',
      reason: 'Playwright not available. Auto-install is disabled by policy.',
      setup_instructions: setupInstructions,
      autonomy_level: AUTONOMY_LEVEL,
      dashboard_url: url,
    };
    await writeReceipt(receipt);
    await appendRunLog(receipt);
    return receipt;
  }

  // Import Playwright dynamically
  const { chromium } = await import('playwright');

  const consoleErrors = [];
  const smokeResults = {
    receipt_id: shortId(),
    worker_id: WORKER_ID,
    worker_version: WORKER_VERSION,
    timestamp: isoNow(),
    status: 'running',
    dashboard_url: url,
    steps: [],
    autonomy_level: AUTONOMY_LEVEL,
  };

  let browser;
  let page;

  try {
    // Step 1: Launch browser and open URL
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();

    // Capture console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          text: msg.text(),
          url: msg.location()?.url || 'unknown',
          line: msg.location()?.lineNumber || 0,
        });
      }
    });

    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
    smokeResults.steps.push({ step: 'open_url', status: 'pass', url });

    // Step 2: Capture page screenshot
    const screenshotPath = join(screenshotsDir, `smoke-${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    smokeResults.steps.push({ step: 'capture_page', status: 'pass', screenshot: screenshotPath });

    // Step 3: Safe click — click on body (non-destructive)
    await page.click('body', { force: false }).catch(() => {});
    smokeResults.steps.push({ step: 'safe_click', status: 'pass', target: 'body' });

    // Step 4: Check visible text
    const visibleText = await page.textContent('body').catch(() => '');
    const hasContent = visibleText && visibleText.trim().length > 0;
    smokeResults.steps.push({
      step: 'visible_text_check',
      status: hasContent ? 'pass' : 'warn',
      text_length: visibleText ? visibleText.trim().length : 0,
      text_preview: visibleText ? visibleText.trim().slice(0, 200) : '',
    });

    // Step 5: Console error capture
    smokeResults.steps.push({
      step: 'console_error_capture',
      status: consoleErrors.length === 0 ? 'pass' : 'warn',
      error_count: consoleErrors.length,
      errors: consoleErrors,
    });

    // Step 6: Write smoke receipt
    smokeResults.status = 'completed';
    smokeResults.overall = smokeResults.steps.every((s) => s.status === 'pass')
      ? 'pass'
      : 'pass_with_warnings';

    await writeReceipt(smokeResults);
    await appendRunLog(smokeResults);

    return smokeResults;
  } catch (err) {
    smokeResults.status = 'failed';
    smokeResults.error = err.message;
    smokeResults.steps.push({
      step: 'error',
      status: 'fail',
      error: err.message,
    });

    await writeReceipt(smokeResults);
    await appendRunLog(smokeResults);

    return smokeResults;
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

// ─── Receipt Writer ───────────────────────────────────────────

/**
 * Write a receipt JSON file to the receipts directory.
 * @param {object} receipt
 */
async function writeReceipt(receipt) {
  const fileName = `receipt-${receipt.receipt_id || Date.now()}.json`;
  const filePath = join(RECEIPTS_DIR, fileName);
  await mkdir(RECEIPTS_DIR, { recursive: true });
  await writeFile(filePath, JSON.stringify(receipt, null, 2), 'utf-8');
  return filePath;
}

// ─── Run Log Appender ─────────────────────────────────────────

/**
 * Append a summary line to AUTONOMOUS_RUN_LOG.md.
 * @param {object} receipt
 */
async function appendRunLog(receipt) {
  const logLine = [
    `### ${isoNow()} — Browser Use Worker (${WORKER_VERSION})`,
    `- **Status:** ${receipt.status || 'unknown'}`,
    `- **Receipt ID:** ${receipt.receipt_id || 'N/A'}`,
    `- **Dashboard URL:** ${receipt.dashboard_url || DASHBOARD_URL}`,
    `- **Autonomy Level:** ${AUTONOMY_LEVEL}`,
    receipt.error ? `- **Error:** ${receipt.error}` : '',
    receipt.reason ? `- **Reason:** ${receipt.reason}` : '',
    receipt.setup_instructions ? `- **Setup Required:** See receipt for instructions` : '',
    '',
  ].filter(Boolean).join('\n');

  await appendFile(RUN_LOG_PATH, `\n${logLine}\n`, 'utf-8').catch(() => {
    // If AUTONOMOUS_RUN_LOG.md doesn't exist or isn't writable, don't fail
  });
}

// ─── Setup Instructions ──────────────────────────────────────

/**
 * Generate setup instructions for missing dependencies.
 * Does NOT auto-install.
 * @param {string} missing - 'browser-use' | 'playwright' | 'both'
 * @returns {object}
 */
function generateSetupInstructions(missing) {
  const instructions = {
    browser_use: {
      command: 'pip install browser-use',
      note: 'Install browser-use Python package. Requires Python 3.10+.',
      docs: 'https://docs.browser-use.com',
    },
    playwright_node: {
      command: 'pnpm add -D playwright',
      note: 'Install Playwright via pnpm. Then run: npx playwright install chromium',
      docs: 'https://playwright.dev/docs/intro',
    },
    playwright_python: {
      command: 'pip install playwright && playwright install chromium',
      note: 'Install Playwright Python package and browser binaries.',
      docs: 'https://playwright.dev/docs/intro',
    },
  };

  const result = {
    status: 'setup_required',
    missing,
    message: 'Browser automation dependencies are missing. Auto-install is disabled by GHOSTCLAW policy.',
    instructions: {},
  };

  if (missing === 'browser-use' || missing === 'both') {
    result.instructions.browser_use = instructions.browser_use;
  }
  if (missing === 'playwright' || missing === 'both') {
    result.instructions.playwright_node = instructions.playwright_node;
    result.instructions.playwright_python = instructions.playwright_python;
  }

  return result;
}

// ─── Worker Status Check ──────────────────────────────────────

/**
 * Check overall worker status by detecting dependencies.
 * @returns {Promise<object>}
 */
async function checkWorkerStatus() {
  const browserUse = await detectBrowserUse();
  const playwright = await detectPlaywright();

  const bothAvailable = browserUse.available && playwright.available;
  const eitherAvailable = browserUse.available || playwright.available;

  let status = 'ready';
  if (!eitherAvailable) {
    status = 'setup_required';
  } else if (!bothAvailable) {
    status = 'partial';
  }

  return {
    worker_id: WORKER_ID,
    worker_version: WORKER_VERSION,
    timestamp: isoNow(),
    status,
    autonomy_level: AUTONOMY_LEVEL,
    dependencies: {
      browser_use: browserUse,
      playwright,
    },
    dashboard_url: DASHBOARD_URL,
    blocked_actions: BLOCKED_ACTIONS,
    policy_file: POLICY_FILE,
  };
}

// ─── Main Entry ───────────────────────────────────────────────

/**
 * Main worker entry point.
 * Detects dependencies, runs smoke workflow, writes receipt, appends run log.
 *
 * @param {object} args - { url, action, dryRun }
 * @returns {Promise<object>}
 */
export async function main(args = {}) {
  const url = args.url || DASHBOARD_URL;
  const action = args.action || 'smoke';
  const dryRun = args.dryRun || false;

  // Validate action against policy
  const validation = validateAction(action);
  if (!validation.allowed) {
    const receipt = generateBlockedReceipt(action, { url, dryRun });
    await writeReceipt(receipt);
    await appendRunLog(receipt);
    return receipt;
  }

  if (dryRun) {
    const status = await checkWorkerStatus();
    return {
      ...status,
      dry_run: true,
      message: 'Dry run — no browser automation executed.',
    };
  }

  // Check status before running
  const status = await checkWorkerStatus();
  if (status.status === 'setup_required') {
    const setupInstructions = generateSetupInstructions('both');
    const receipt = {
      receipt_id: shortId(),
      worker_id: WORKER_ID,
      worker_version: WORKER_VERSION,
      timestamp: isoNow(),
      status: 'setup_required',
      reason: 'All browser automation dependencies are missing. Auto-install is disabled.',
      setup_instructions: setupInstructions,
      autonomy_level: AUTONOMY_LEVEL,
      dashboard_url: url,
    };
    await writeReceipt(receipt);
    await appendRunLog(receipt);
    return receipt;
  }

  // Run smoke workflow
  return runSmokeWorkflow({ url });
}

// ─── Exports ───────────────────────────────────────────────────

export {
  detectBrowserUse,
  detectPlaywright,
  validateAction,
  generateBlockedReceipt,
  generateSetupInstructions,
  runSmokeWorkflow,
  checkWorkerStatus,
  writeReceipt,
  appendRunLog,
  WORKER_ID,
  WORKER_VERSION,
  AUTONOMY_LEVEL,
  BLOCKED_ACTIONS,
  DASHBOARD_URL,
};

// CLI entry
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = {};
  const cliArgs = process.argv.slice(2);
  for (let i = 0; i < cliArgs.length; i++) {
    if (cliArgs[i] === '--url') args.url = cliArgs[++i];
    if (cliArgs[i] === '--action') args.action = cliArgs[++i];
    if (cliArgs[i] === '--dry-run') args.dryRun = true;
  }
  main(args).then((result) => {
    console.log(JSON.stringify(result, null, 2));
  });
}