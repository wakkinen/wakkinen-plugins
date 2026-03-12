#!/usr/bin/env node
/**
 * pw-browser — Playwright-based browser CLI for AI agents (Windows-native)
 * Uses CDP (Chrome DevTools Protocol) for persistent browser across commands.
 * 
 * Commands:
 *   open <url>                  Launch browser + navigate (starts new session)
 *   navigate <url>              Navigate within existing session
 *   snapshot [-i]               Get page content (-i for interactive elements)
 *   click <selector|@eN>       Click element
 *   fill <selector|@eN> <text> Fill input field
 *   select <selector|@eN> <v>  Select dropdown option
 *   press <key>                Press keyboard key
 *   screenshot <path> [--annotate]  Save screenshot
 *   viewport <w> <h>           Set viewport size
 *   wait [networkidle|load]    Wait for page state
 *   console                    Show console log
 *   errors                     Show error log
 *   text <selector|@eN>        Get element text content
 *   url                        Get current URL
 *   close                      Kill browser + clean up
 */

const { chromium } = require('playwright');
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');

const STATE_FILE = path.join(process.env.TEMP || '/tmp', 'pw-browser-state.json');
const LOG_DIR = path.join(process.env.TEMP || '/tmp', 'pw-browser-logs');

// --- State management ---
function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { return null; }
}
function saveState(data) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(data));
}
function clearState() {
  try { fs.unlinkSync(STATE_FILE); } catch {}
}

// --- Log management ---
function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}
function appendLog(type, msg) {
  ensureLogDir();
  fs.appendFileSync(path.join(LOG_DIR, `${type}.log`), `[${new Date().toISOString()}] ${msg}\n`);
}
function readLog(type) {
  try { return fs.readFileSync(path.join(LOG_DIR, `${type}.log`), 'utf8'); } catch { return '(no entries)'; }
}
function clearLogs() {
  ensureLogDir();
  for (const f of ['console.log', 'errors.log']) {
    try { fs.writeFileSync(path.join(LOG_DIR, f), ''); } catch {}
  }
}

// --- Find free port ---
function findFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

// --- Resolve selector (supports @eN refs) ---
function resolveSelector(sel) {
  if (sel.startsWith('@e')) return `[data-pw-ref="${sel.slice(1)}"]`;
  return sel;
}

// --- Connect to existing browser via CDP ---
async function connectBrowser() {
  const state = loadState();
  if (!state?.cdpPort) {
    console.error('No browser session. Run: pw-browser open <url>');
    process.exit(1);
  }
  try {
    const browser = await chromium.connectOverCDP(`http://localhost:${state.cdpPort}`);
    const contexts = browser.contexts();
    const context = contexts[0];
    if (!context) throw new Error('No context');
    const pages = context.pages();
    const page = pages[0];
    if (!page) throw new Error('No page');
    return { browser, page };
  } catch (e) {
    console.error(`Browser session lost: ${e.message}. Run: pw-browser open <url>`);
    clearState();
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (!cmd) {
    console.log('Usage: pw-browser <command> [args...]');
    console.log('Commands: open, navigate, snapshot, click, fill, select, press, screenshot, viewport, wait, console, errors, text, url, close');
    process.exit(0);
  }

  // --- Commands that don't need a browser connection ---
  if (cmd === 'console') { console.log(readLog('console')); process.exit(0); }
  if (cmd === 'errors') { console.log(readLog('errors')); process.exit(0); }

  if (cmd === 'close') {
    const state = loadState();
    if (state?.pid) {
      try { process.kill(state.pid); } catch {}
    }
    if (state?.cdpPort) {
      try {
        const browser = await chromium.connectOverCDP(`http://localhost:${state.cdpPort}`);
        await browser.close();
      } catch {}
    }
    clearState();
    clearLogs();
    console.log('Browser session closed.');
    process.exit(0);
  }

  // --- OPEN: Launch Chrome with CDP ---
  if (cmd === 'open') {
    const url = args[1];
    if (!url) { console.error('Usage: pw-browser open <url>'); process.exit(1); }

    // Kill existing session
    const oldState = loadState();
    if (oldState?.pid) {
      try { process.kill(oldState.pid); } catch {}
    }
    clearState();
    clearLogs();

    // Find Chrome/Chromium executable from Playwright cache
    const pwBrowsersPath = path.join(process.env.LOCALAPPDATA, 'ms-playwright');
    let chromePath = '';
    if (fs.existsSync(pwBrowsersPath)) {
      const dirs = fs.readdirSync(pwBrowsersPath).filter(d => d.startsWith('chromium-')).sort().reverse();
      if (dirs.length > 0) {
        const tryPath = path.join(pwBrowsersPath, dirs[0], 'chrome-win', 'chrome.exe');
        if (fs.existsSync(tryPath)) chromePath = tryPath;
      }
    }
    if (!chromePath) {
      // Fallback: try common Chrome locations
      const candidates = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        path.join(process.env.LOCALAPPDATA, 'Google\\Chrome\\Application\\chrome.exe'),
      ];
      chromePath = candidates.find(p => fs.existsSync(p)) || '';
    }
    if (!chromePath) {
      console.error('Cannot find Chrome. Run: npx playwright install chromium');
      process.exit(1);
    }

    const cdpPort = await findFreePort();
    const userDataDir = path.join(process.env.TEMP, 'pw-browser-profile');

    // Launch Chrome as detached process with CDP enabled
    // Check for headed mode: --headed flag or PW_HEADED=1 env var
    const headed = args.includes('--headed') || process.env.PW_HEADED === '1';
    const chromeArgs = [
      `--remote-debugging-port=${cdpPort}`,
      ...(headed ? [] : ['--headless=new']),
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      `--user-data-dir=${userDataDir}`,
      `--window-size=1440,900`,
      url
    ];

    const child = spawn(chromePath, chromeArgs, {
      detached: true,
      stdio: 'ignore'
    });
    child.unref();

    // Wait for CDP to be ready
    let connected = false;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 500));
      try {
        const browser = await chromium.connectOverCDP(`http://localhost:${cdpPort}`);
        const contexts = browser.contexts();
        if (contexts.length > 0 && contexts[0].pages().length > 0) {
          const page = contexts[0].pages()[0];
          // Wait for navigation to complete
          await page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
          saveState({ cdpPort, pid: child.pid });
          console.log(`Opened: ${url}`);
          console.log(`Title: ${await page.title()}`);
          console.log(`URL: ${page.url()}`);
          console.log(`CDP port: ${cdpPort}`);
          await browser.close(); // disconnect client only
          connected = true;
          break;
        }
        await browser.close();
      } catch {}
    }

    if (!connected) {
      console.error('Failed to connect to browser. Timed out.');
      try { process.kill(child.pid); } catch {}
      process.exit(1);
    }
    process.exit(0);
  }

  // --- All other commands: connect to existing browser ---
  const { browser, page } = await connectBrowser();

  // Attach console/error listeners
  page.on('console', msg => appendLog('console', `[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => appendLog('errors', err.message));

  try {
    switch (cmd) {
      case 'navigate':
      case 'goto': {
        const url = args[1];
        if (!url) { console.error('Usage: pw-browser navigate <url>'); process.exit(1); }
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
        console.log(`Navigated: ${page.url()}`);
        console.log(`Title: ${await page.title()}`);
        break;
      }

      case 'snapshot': {
        if (args.includes('-i')) {
          const elements = await page.evaluate(() => {
            const sels = 'a, button, input, select, textarea, [role="button"], [role="link"], [role="tab"], [onclick], [tabindex]';
            return Array.from(document.querySelectorAll(sels)).map((el, i) => {
              const tag = el.tagName.toLowerCase();
              const type = el.getAttribute('type') || '';
              const text = (el.textContent || '').trim().substring(0, 80);
              const placeholder = el.getAttribute('placeholder') || '';
              const name = el.getAttribute('name') || '';
              const href = el.getAttribute('href') || '';
              const role = el.getAttribute('role') || '';
              el.setAttribute('data-pw-ref', `e${i + 1}`);
              return {
                ref: `@e${i + 1}`, tag, type, role,
                text: text || placeholder || name || href || '(empty)',
                visible: el.offsetParent !== null || el.tagName === 'INPUT'
              };
            }).filter(e => e.visible);
          });
          console.log(`Found ${elements.length} interactive elements:\n`);
          for (const el of elements) {
            const desc = [el.tag, el.type, el.role].filter(Boolean).join('/');
            console.log(`  ${el.ref}  [${desc}]  ${el.text}`);
          }
        } else {
          const text = await page.evaluate(() => document.body.innerText);
          console.log(text.substring(0, 8000));
        }
        break;
      }

      case 'click': {
        if (!args[1]) { console.error('Usage: pw-browser click <selector|@eN>'); process.exit(1); }
        const sel = resolveSelector(args[1]);
        await page.locator(sel).first().click({ timeout: 10000 });
        await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
        console.log(`Clicked: ${args[1]}`);
        break;
      }

      case 'fill': {
        const sel = resolveSelector(args[1]);
        const text = args.slice(2).join(' ');
        await page.locator(sel).first().fill(text, { timeout: 10000 });
        console.log(`Filled ${args[1]} with: ${text}`);
        break;
      }

      case 'select': {
        const sel = resolveSelector(args[1]);
        await page.locator(sel).first().selectOption(args[2], { timeout: 10000 });
        console.log(`Selected ${args[2]} in ${args[1]}`);
        break;
      }

      case 'press': {
        await page.keyboard.press(args[1]);
        console.log(`Pressed: ${args[1]}`);
        break;
      }

      case 'screenshot': {
        const filePath = args[1] || 'screenshot.png';
        const dir = path.dirname(filePath);
        if (dir && dir !== '.' && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        if (args.includes('--annotate')) {
          await page.evaluate(() => {
            document.querySelectorAll('[data-pw-ref]').forEach(el => {
              const num = el.getAttribute('data-pw-ref').replace('e', '');
              const label = document.createElement('div');
              label.className = 'pw-annotation';
              label.style.cssText = 'position:absolute;z-index:99999;background:red;color:white;font:bold 10px sans-serif;padding:1px 4px;border-radius:4px;pointer-events:none;';
              label.textContent = num;
              const rect = el.getBoundingClientRect();
              label.style.left = (rect.left + window.scrollX) + 'px';
              label.style.top = (rect.top + window.scrollY - 14) + 'px';
              document.body.appendChild(label);
            });
          });
        }
        await page.screenshot({ path: filePath, fullPage: false });
        console.log(`Screenshot saved: ${path.resolve(filePath)}`);
        if (args.includes('--annotate')) {
          await page.evaluate(() => document.querySelectorAll('.pw-annotation').forEach(el => el.remove()));
        }
        break;
      }

      case 'viewport': {
        const w = parseInt(args[1]), h = parseInt(args[2]);
        if (!w || !h) { console.error('Usage: pw-browser viewport <w> <h>'); process.exit(1); }
        await page.setViewportSize({ width: w, height: h });
        console.log(`Viewport: ${w}x${h}`);
        break;
      }

      case 'wait': {
        const state = args[1] || 'networkidle';
        await page.waitForLoadState(state, { timeout: 15000 }).catch(() => {});
        console.log(`Wait complete: ${state}`);
        break;
      }

      case 'text': {
        const sel = resolveSelector(args[1]);
        const text = await page.locator(sel).first().textContent({ timeout: 10000 });
        console.log(text?.trim() || '(empty)');
        break;
      }

      case 'url': {
        console.log(page.url());
        break;
      }

      default:
        console.error(`Unknown command: ${cmd}`);
        process.exit(1);
    }
  } finally {
    await browser.close(); // disconnect client, Chrome process stays
  }
}

main().catch(err => { console.error(`Error: ${err.message}`); process.exit(1); });
