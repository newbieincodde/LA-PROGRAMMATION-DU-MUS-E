import http from 'node:http';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const PORT = 9223;
const TARGET_URL = 'http://localhost:8000/index.html';
const TEMP_PROFILE = path.resolve('./temp_chrome_diag');

function findChromePath() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return 'chrome';
}

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 1;
    this.callbacks = new Map();
    this.events = [];
    this.consoleLogs = [];
    this.exceptions = [];
    this.failedRequests = [];
  }

  async connect() {
    const WsClass = globalThis.WebSocket;
    this.ws = new WsClass(this.wsUrl);

    return new Promise((resolve, reject) => {
      this.ws.onopen = () => resolve();
      this.ws.onerror = (e) => reject(e);
      this.ws.onmessage = (msg) => {
        const res = JSON.parse(msg.data);
        if (res.method === 'Runtime.consoleAPICalled') {
          const text = res.params.args.map((a) => a.value ?? a.description ?? JSON.stringify(a)).join(' ');
          this.consoleLogs.push({ type: res.params.type, text });
          if (res.params.type === 'error' || res.params.type === 'warn') {
            console.log(`[BROWSER ${res.params.type.toUpperCase()}]`, text);
          }
        }
        if (res.method === 'Runtime.exceptionThrown') {
          const desc = res.params.exceptionDetails.exception?.description || res.params.exceptionDetails.text;
          this.exceptions.push(desc);
          console.error('[BROWSER EXCEPTION]', desc);
        }
        if (res.method === 'Network.responseReceived') {
          if (res.params.response.status >= 400) {
            this.failedRequests.push({
              url: res.params.response.url,
              status: res.params.response.status,
              statusText: res.params.response.statusText
            });
            console.error(`[NETWORK ${res.params.response.status}]`, res.params.response.url);
          }
        }
        if (res.id && this.callbacks.has(res.id)) {
          const cb = this.callbacks.get(res.id);
          this.callbacks.delete(res.id);
          if (res.error) cb.reject(res.error);
          else cb.resolve(res.result);
        }
      };
    });
  }

  async send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval error: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result ? res.result.value : undefined;
  }

  async screenshot(filePath) {
    const res = await this.send('Page.captureScreenshot', { format: 'jpeg', quality: 80 });
    const buf = Buffer.from(res.data, 'base64');
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, buf);
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function main() {
  const chromePath = findChromePath();
  const chromeProc = spawn(chromePath, [
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${TEMP_PROFILE}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu-sandbox',
    '--window-size=1440,900',
    '--headless=new',
    TARGET_URL,
  ]);

  await new Promise((r) => setTimeout(r, 2000));

  try {
    const tabs = await fetchJson(`http://127.0.0.1:${PORT}/json`);
    const pageTab = tabs.find((t) => t.type === 'page' && t.url.includes('localhost:8000'));
    if (!pageTab) throw new Error('Could not find active target tab');

    const cdp = new CDPClient(pageTab.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Network.enable');

    console.log('Connected! Waiting 3s for initial page load and animations...');
    await new Promise((r) => setTimeout(r, 3000));

    // Capture initial state
    await cdp.screenshot('./diag_shots/01_initial_load.jpg');

    // Check preloader state
    const preloaderVisible = await cdp.eval(`
      const p = document.getElementById('preloader');
      p ? (getComputedStyle(p).display !== 'none' && getComputedStyle(p).opacity !== '0' && p.classList.contains('is-loaded') === false) : false
    `);
    console.log('Preloader still visible/blocking?', preloaderVisible);

    // Check errors so far
    console.log('Exceptions so far:', cdp.exceptions);
    console.log('Failed network requests so far:', cdp.failedRequests);

    // Check scroll position and scroll down step by step
    console.log('\n--- Scrolling down through home page ---');
    for (let scrollY = 0; scrollY <= 5000; scrollY += 800) {
      await cdp.eval(`window.scrollTo(0, ${scrollY}); if (window.__lenis) window.__lenis.scrollTo(${scrollY}, { immediate: true });`);
      await new Promise((r) => setTimeout(r, 300));
      const actualY = await cdp.eval('window.scrollY || window.pageYOffset');
      console.log(`Requested scroll: ${scrollY}, Actual window.scrollY: ${actualY}`);
      await cdp.screenshot(`./diag_shots/scroll_${scrollY}.jpg`);
    }

    // Check plaster wall section
    const plasterInfo = await cdp.eval(`(() => {
      const el = document.getElementById('home-plaster-wall');
      if (!el) return 'plaster wall not found';
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return {
        top: rect.top,
        height: rect.height,
        display: style.display,
        visibility: style.visibility,
        parentClass: el.parentElement ? el.parentElement.className : null
      };
    })()`);
    console.log('Plaster wall status:', plasterInfo);

    // Check horizontal chamber portals
    const portalsInfo = await cdp.eval(`(() => {
      const el = document.getElementById('home-chamber-portals');
      if (!el) return 'portals not found';
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      const track = el.querySelector('.chamber-portals-track');
      return {
        top: rect.top,
        height: rect.height,
        trackTransform: track ? getComputedStyle(track).transform : null,
        parentClass: el.parentElement ? el.parentElement.className : null
      };
    })()`);
    console.log('Portals status:', portalsInfo);

    // Test Navigation links
    console.log('\n--- Testing navigation items ---');
    const navItems = await cdp.eval(`
      Array.from(document.querySelectorAll('.louvre-nav-item, .nav-flyout-item')).map(el => ({
        text: el.innerText.trim(),
        href: el.getAttribute('href'),
        dataNav: el.getAttribute('data-nav')
      }))
    `);
    console.log(`Found ${navItems.length} nav items:`, navItems.slice(0, 10));

    // Test clicking on "Tác Phẩm" / Collection view
    console.log('\n--- Navigating to #collection ---');
    await cdp.eval('window.location.hash = "#collection"');
    await new Promise((r) => setTimeout(r, 1000));
    await cdp.screenshot('./diag_shots/02_collection_view.jpg');
    const collectionCards = await cdp.eval('document.querySelectorAll(".collection-card, .artwork-card").length');
    console.log(`Artworks rendered in collection: ${collectionCards}`);

    // Test clicking a card in collection
    console.log('\n--- Testing card click to open artwork detail / modal ---');
    const clickResult = await cdp.eval(`(() => {
      const firstCard = document.querySelector('.collection-card, .artwork-card');
      if (!firstCard) return 'No card found';
      const inspectBtn = firstCard.querySelector('.btn-card-inspect, .btn-launch-3d-relighting, a, button');
      if (inspectBtn) {
        inspectBtn.click();
        return 'Clicked inspectBtn: ' + (inspectBtn.textContent || inspectBtn.className);
      }
      firstCard.click();
      return 'Clicked card directly';
    })()`);
    console.log('Click result:', clickResult);
    await new Promise((r) => setTimeout(r, 1000));
    await cdp.screenshot('./diag_shots/03_after_card_click.jpg');
    const currentHash = await cdp.eval('window.location.hash');
    console.log('Current hash after click:', currentHash);

    // Test Room view #room/I
    console.log('\n--- Navigating to #room/I ---');
    await cdp.eval('window.location.hash = "#room/I"');
    await new Promise((r) => setTimeout(r, 1000));
    await cdp.screenshot('./diag_shots/04_room_I.jpg');
    const roomArtCount = await cdp.eval('document.querySelectorAll("#view-room .room-art-card").length');
    console.log(`Room I artwork cards rendered: ${roomArtCount}`);

    // Test Artwork Detail View #artwork/assyrian-winged-genie
    console.log('\n--- Navigating to #artwork/assyrian-winged-genie ---');
    await cdp.eval('window.location.hash = "#artwork/assyrian-winged-genie"');
    await new Promise((r) => setTimeout(r, 1500));
    await cdp.screenshot('./diag_shots/05_artwork_detail.jpg');
    const artworkTitle = await cdp.eval('document.querySelector("#view-artwork .artwork-hero-title")?.innerText');
    console.log('Artwork title in view:', artworkTitle);

    // Test Stories index #stories
    console.log('\n--- Navigating to #stories ---');
    await cdp.eval('window.location.hash = "#stories"');
    await new Promise((r) => setTimeout(r, 1000));
    await cdp.screenshot('./diag_shots/06_stories_index.jpg');

    // Test Story Detail #story/alchemy-polychromy
    console.log('\n--- Navigating to #story/alchemy-polychromy ---');
    await cdp.eval('window.location.hash = "#story/alchemy-polychromy"');
    await new Promise((r) => setTimeout(r, 2000));
    await cdp.screenshot('./diag_shots/07_story_detail.jpg');
    const stageMounted = await cdp.eval('Boolean(document.querySelector("#story-scrolly-stage canvas"))');
    console.log('3D stage mounted on story page?', stageMounted);

    // Test Curatorial View #curatorial
    console.log('\n--- Navigating to #curatorial ---');
    await cdp.eval('window.location.hash = "#curatorial"');
    await new Promise((r) => setTimeout(r, 1000));
    await cdp.screenshot('./diag_shots/08_curatorial.jpg');

    // Test Timeline View #timeline
    console.log('\n--- Navigating to #timeline ---');
    await cdp.eval('window.location.hash = "#timeline"');
    await new Promise((r) => setTimeout(r, 1000));
    await cdp.screenshot('./diag_shots/09_timeline.jpg');

    // Final recap of exceptions & failed requests
    console.log('\n================ DIAGNOSTIC SUMMARY ================');
    console.log(`Total Exceptions: ${cdp.exceptions.length}`);
    for (const ex of cdp.exceptions) {
      console.log(' - EXCEPTION:', ex);
    }
    console.log(`Total Failed Requests (>=400): ${cdp.failedRequests.length}`);
    for (const req of cdp.failedRequests) {
      console.log(` - FAILED: [${req.status}] ${req.url}`);
    }
    console.log(`Total Console Errors/Warnings: ${cdp.consoleLogs.filter(l => l.type === 'error').length} errors, ${cdp.consoleLogs.filter(l => l.type === 'warn').length} warnings`);
    for (const log of cdp.consoleLogs.filter(l => l.type === 'error')) {
      console.log(' - ERROR LOG:', log.text);
    }
    console.log('====================================================\n');

    cdp.close();
  } catch (err) {
    console.error('Fatal diagnostic error:', err);
  } finally {
    chromeProc.kill();
  }
}

main();
