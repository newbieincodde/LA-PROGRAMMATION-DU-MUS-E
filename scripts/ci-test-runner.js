import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const PORT = 8088;
const CDP_PORT = 9229;

// Find Chrome Executable Cross-Platform
function findChrome() {
  if (process.env.CHROME_BIN && fs.existsSync(process.env.CHROME_BIN)) {
    return process.env.CHROME_BIN;
  }
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return 'google-chrome';
}

function delay(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

// Built-in Static File Server for CI
function startStaticServer() {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.woff2': 'font/woff2'
  };

  const server = http.createServer((req, res) => {
    let reqPath = decodeURI(req.url.split('?')[0]);
    if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

    const filePath = path.join(rootDir, reqPath);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.statusCode = 404;
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    fs.createReadStream(filePath).pipe(res);
  });

  return new Promise((resolve) => {
    server.listen(PORT, '127.0.0.1', () => {
      resolve(server);
    });
  });
}

class SimpleCDP {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
  }
  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = reject;
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const cb = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) cb.reject(msg.error);
          else cb.resolve(msg.result);
        }
      };
    });
  }
  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async eval(expr) {
    const res = await this.send('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(JSON.stringify(res.exceptionDetails));
    }
    return res.result ? res.result.value : undefined;
  }
}

async function run() {
  console.log('====================================================');
  console.log('CI/CD AUTOMATED QUALITY GATE RUNNER');
  console.log(`Port: ${PORT} | CDP Port: ${CDP_PORT}`);
  console.log('====================================================\n');

  const server = await startStaticServer();
  const chromePath = findChrome();
  console.log(`Using Chrome binary: ${chromePath}`);

  const chromeProc = spawn(chromePath, [
    `--remote-debugging-port=${CDP_PORT}`,
    '--headless=new',
    '--window-size=1440,900',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-extensions',
    `http://127.0.0.1:${PORT}/#home`
  ]);

  await delay(2500);

  let passed = 0;
  let failed = 0;

  function assert(cond, msg) {
    if (cond) {
      console.log(`[PASS] ${msg}`);
      passed++;
    } else {
      console.error(`[FAIL] ${msg}`);
      failed++;
    }
  }

  let cdp = null;
  try {
    const targets = await new Promise((res, rej) => {
      http.get(`http://127.0.0.1:${CDP_PORT}/json`, (r) => {
        let d = '';
        r.on('data', (c) => (d += c));
        r.on('end', () => res(JSON.parse(d)));
      }).on('error', rej);
    });

    const page = targets.find((t) => t.type === 'page');
    cdp = new SimpleCDP(page.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await delay(1200);

    // 1. Core DOM & Route Check
    const title = await cdp.eval('document.title');
    assert(title.includes('ÉTHÉRÉ Atelier'), 'Document title contains brand ÉTHÉRÉ Atelier');

    // 2. Collection Artworks Count
    const count = await cdp.eval('document.querySelectorAll("#editorial-grid .artwork-card").length');
    assert(count === 50, `Collection Archive loaded all 50 artworks (actual: ${count})`);

    // 3. Navigation to Room I
    await cdp.eval('window.navigateTo({ name: "room", param: "I" })');
    await delay(400);
    const roomTitle = await cdp.eval('document.title');
    assert(roomTitle.includes('Cánh I: Cổ Vật & Phù Điêu Đá'), 'Room I route updates title correctly');

    // 4. Navigation to Story
    await cdp.eval('window.navigateTo({ name: "story", param: "alchemy-polychromy" })');
    await delay(400);
    const storyTitle = await cdp.eval('document.title');
    assert(storyTitle.includes('Vết Tích Sắc Màu Thất Lạc'), 'Story route updates title correctly');

    // 5. Open Graph Meta Tags
    const ogSite = await cdp.eval('document.querySelector("meta[property=\'og:site_name\']")?.getAttribute("content")');
    assert(ogSite === 'ÉTHÉRÉ Atelier', 'Meta og:site_name is ÉTHÉRÉ Atelier');

    // 6. Language Switch to English
    await cdp.eval('document.querySelector(".utility-lang .lang-item[data-lang=\'en\']")?.click()');
    await delay(400);
    const lang = await cdp.eval('document.documentElement.lang');
    assert(lang === 'en', 'Language switches to English (html[lang="en"])');

  } catch (err) {
    console.error('CI Test Runner Error:', err);
    failed++;
  } finally {
    if (cdp?.ws) cdp.ws.close();
    chromeProc.kill('SIGTERM');
    server.close();
  }

  console.log(`\nCI Results: ${passed} Passed, ${failed} Failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
