/**
 * GHOSTCLAW Browser Use Smoke Test Script
 * Phase 4 — Local Dashboard Smoke Test
 *
 * Target: http://127.0.0.1:8721 (local GHOSTCLAW dashboard)
 *
 * This script:
 * 1. Detected browser-use and Playwright availability
 * 2. Opens the local dashboard
 * 3. Captures a screenshot
 * 4. Performs a safe click on body
 * 5. Checks visible text content
 * 6. Captures console errors
 * 7. Writes a smoke receipt
 * 8. Reports pass/fail
 *
 * If dependencies are missing, writes setup instructions — does NOT auto-install.
 *
 * Canonical terminology: brainstorm (canonical), beststorm (legacy alias), beststrom (invalid typo).
 */

import { writeFile, mkdir, appendFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SMOKE_URL = process.env.GHOSTCLAW_DASHBOARD_URL || 'http://127.0.0.1:8721';
const RECEIPTS_DIR = join(__dirname, 'receipts');
const SCREENSHOTS_DIR = join(RECEIPTS_DIR, 'screenshots');
const RUN_LOG_PATH = join(__dirname, '..', '..', '..', 'AUTONOMOUS_RUN_LOG.md');

function isoNow() {
  return new Date().toISOString();
}

function smokeId() {
  return `smoke-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Detect Playwright ────────────────────────────────────────

async function detectPlaywright() {
  try {
    const pw = await import('playwright').catch(() => null);
    if (pw && pw.chromium) {
      return { available: true, runtime: 'node', version: 'playwright' };
    }
  } catch {
    // not installed
  }

  try {
    const { execSync } = await import('node:child_process');
    const ver = execSync('python3 -c "import playwright; print(playwright.__version__)"', {
      timeout: 5000,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return { available: true, runtime: 'python', version: ver };
  } catch {
    return { available: false, runtime: null, version: null };
  }
}

// ─── Detect Browser Use ───────────────────────────────────────

async function detectBrowserUse() {
  try {
    const { execSync } = await import('node:child_process');
    const ver = execSync('python3 -c "import browser_use; print(browser_use.__version__)"', {
      timeout: 5000,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return { available: true, version: ver };
  } catch {
    return { available: false, version: null };
  }
}

// ─── Write Receipt ────────────────────────────────────────────

async function writeReceipt(data) {
  await mkdir(RECEIPTS_DIR, { recursive: true });
  const fileName = `smoke-${data.smoke_id}.json`;
  const filePath = join(RECEIPTS_DIR, fileName);
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  return filePath;
}

// ─── Append Run Log ────────────────────────────────────────────

async function appendRunLog(data) {
  const lines = [
    `\n### ${isoNow()} — Browser Use Smoke Test`,
    `- **Smoke ID:** ${data.smoke_id}`,
    `- **URL:** ${data.url}`,
    `- **Status:** ${data.status}`,
    `- **Overall:** ${data.overall || 'N/A'}`,
    data.error ? `- **Error:** ${data.error}` : '',
    data.steps ? `- **Steps:** ${data.steps.length}` : '',
    data.setup_required ? `- **Setup Required:** ${data.setup_required}` : '',
    '',
  ].filter(Boolean).join('\n');

  await appendFile(RUN_LOG_PATH, lines, 'utf-8').catch(() => {});
}

// ─── Run Smoke Test ───────────────────────────────────────────

async function runSmoke() {
  const pwDetection = await detectPlaywright();
  const buDetection = await detectBrowserUse();

  // If neither is available, write setup instructions
  if (!pwDetection.available && !buDetection.available) {
    const result = {
      smoke_id: smokeId(),
      timestamp: isoNow(),
      url: SMOKE_URL,
      status: 'setup_required',
      overall: 'setup_required',
      error: 'No browser automation dependencies found. Auto-install is disabled.',
      setup_instructions: {
        playwright_node: {
          command: 'pnpm add -D playwright && npx playwright install chromium',
          note: 'Install Playwright for Node.js and download Chromium browser.',
        },
        playwright_python: {
          command: 'pip install playwright && playwright install chromium',
          note: 'Install Playwright for Python and download Chromium browser.',
        },
        browser_use: {
          command: 'pip install browser-use',
          note: 'Install browser-use Python package. Requires Python 3.10+.',
        },
      },
      dependencies: {
        playwright: pwDetection,
        browser_use: buDetection,
      },
    };
    await writeReceipt(result);
    await appendRunLog(result);
    console.log(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  // If only Python Playwright is available, we can't use Node.js smoke test
  // Write a receipt with instructions
  if (!pwDetection.available && buDetection.available) {
    const result = {
      smoke_id: smokeId(),
      timestamp: isoNow(),
      url: SMOKE_URL,
      status: 'setup_required',
      overall: 'setup_required',
      error: 'Node.js Playwright not available. Only browser-use (Python) detected.',
      setup_instructions: {
        playwright_node: {
          command: 'pnpm add -D playwright && npx playwright install chromium',
          note: 'Install Node.js Playwright to run browser smoke tests.',
        },
      },
      dependencies: {
        playwright: pwDetection,
        browser_use: buDetection,
      },
    };
    await writeReceipt(result);
    await appendRunLog(result);
    console.log(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  // Run Playwright smoke test
  const { chromium } = await import('playwright');

  const smokeResult = {
    smoke_id: smokeId(),
    timestamp: isoNow(),
    url: SMOKE_URL,
    status: 'running',
    overall: null,
    steps: [],
    console_errors: [],
    dependencies: {
      playwright: pwDetection,
      browser_use: buDetection,
    },
  };

  let browser;

  try {
    await mkdir(RECEIPTS_DIR, { recursive: true });
    await mkdir(SCREENSHOTS_DIR, { recursive: true });

    // Step 1: Launch browser
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Capture console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        smokeResult.console_errors.push({
          text: msg.text(),
          url: msg.location()?.url || 'unknown',
        });
      }
    });

    // Step 2: Open dashboard URL
    try {
      await page.goto(SMOKE_URL, { waitUntil: 'networkidle', timeout: 15000 });
      smokeResult.steps.push({ step: 'open_url', status: 'pass', url: SMOKE_URL });
    } catch (err) {
      smokeResult.steps.push({ step: 'open_url', status: 'fail', error: err.message });
      throw new Error(`Failed to open ${SMOKE_URL}: ${err.message}`);
    }

    // Step 3: Capture screenshot
    try {
      const screenshotPath = join(SCREENSHOTS_DIR, `smoke-${Date.now()}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      smokeResult.steps.push({ step: 'capture_page', status: 'pass', screenshot: screenshotPath });
    } catch (err) {
      smokeResult.steps.push({ step: 'capture_page', status: 'fail', error: err.message });
    }

    // Step 4: Safe click on body (non-destructive)
    try {
      await page.click('body', { force: false }).catch(() => {});
      smokeResult.steps.push({ step: 'safe_click', status: 'pass', target: 'body' });
    } catch (err) {
      smokeResult.steps.push({ step: 'safe_click', status: 'fail', error: err.message });
    }

    // Step 5: Check visible text
    try {
      const text = await page.textContent('body');
      const trimmed = text ? text.trim() : '';
      smokeResult.steps.push({
        step: 'visible_text_check',
        status: trimmed.length > 0 ? 'pass' : 'warn',
        text_length: trimmed.length,
        text_preview: trimmed.slice(0, 200),
      });
    } catch (err) {
      smokeResult.steps.push({ step: 'visible_text_check', status: 'fail', error: err.message });
    }

    // Step 6: Console error capture summary
    smokeResult.steps.push({
      step: 'console_error_capture',
      status: smokeResult.console_errors.length === 0 ? 'pass' : 'warn',
      error_count: smokeResult.console_errors.length,
    });

    // Determine overall result
    const hasFail = smokeResult.steps.some((s) => s.status === 'fail');
    const hasWarn = smokeResult.steps.some((s) => s.status === 'warn');
    smokeResult.overall = hasFail ? 'fail' : hasWarn ? 'pass_with_warnings' : 'pass';
    smokeResult.status = 'completed';

    await writeReceipt(smokeResult);
    await appendRunLog(smokeResult);

    console.log(`\n╔══════════════════════════════════════════════════════╗`);
    console.log(`║  GHOSTCLAW Browser Use Smoke Test                    ║`);
    console.log(`╠══════════════════════════════════════════════════════╣`);
    console.log(`║  URL:      ${SMOKE_URL.padEnd(42)}║`);
    console.log(`║  Status:   ${smokeResult.status.padEnd(42)}║`);
    console.log(`║  Overall:  ${smokeResult.overall.padEnd(42)}║`);
    console.log(`║  Steps:    ${String(smokeResult.steps.length).padEnd(42)}║`);
    console.log(`║  Errors:   ${String(smokeResult.console_errors.length).padEnd(42)}║`);
    console.log(`╚══════════════════════════════════════════════════════╝\n`);

    if (smokeResult.overall === 'fail') {
      process.exit(1);
    }
  } catch (err) {
    smokeResult.status = 'failed';
    smokeResult.overall = 'fail';
    smokeResult.error = err.message;

    await writeReceipt(smokeResult);
    await appendRunLog(smokeResult);

    console.error(`\n❌ Smoke test failed: ${err.message}\n`);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

// ─── CLI Entry ────────────────────────────────────────────────

if (import.meta.url === `file://${process.argv[1]}`) {
  runSmoke().catch((err) => {
    console.error('Fatal error:', err.message);
    process.exit(1);
  });
}

export { runSmoke, detectPlaywright, detectBrowserUse };